
const jwt = require('jsonwebtoken');
const { ConfidentialClientApplication } = require('@azure/msal-node');

const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;

const msal = new ConfidentialClientApplication({
  auth: { clientId, clientSecret, authority: `https://login.microsoftonline.com/${tenantId}` }
});

const roles = require('../roles.json');

module.exports = async function (context, req) {
  try {
    const { ssoToken } = req.body || {};
    if (!ssoToken) { context.res = { status: 400, body: 'Missing ssoToken' }; return; }

    const decoded = jwt.decode(ssoToken, { complete: true });
    if (!decoded) { context.res = { status: 401, body: 'Invalid token' }; return; }

    let groupIds = [];
    try {
      const oboResult = await msal.acquireTokenOnBehalfOf({
        oboAssertion: ssoToken,
        scopes: [ 'https://graph.microsoft.com/.default' ]
      });
      const accessToken = oboResult.accessToken;
      const resp = await fetch('https://graph.microsoft.com/v1.0/me/transitiveMemberOf?$select=id', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        groupIds = (data.value || []).map(x => x.id).filter(Boolean);
      }
    } catch (e) {
      context.log('OBO/Graph error:', e.message);
    }

    const map = roles.groups || {};
    const customers = [];
    for (const gid of groupIds) {
      if (map[gid]) customers.push(map[gid]);
    }

    const unique = [];
    const seen = new Set();
    for (const c of customers) {
      const key = c.role + '|' + c.path;
      if (!seen.has(key)) { seen.add(key); unique.push(c); }
    }

    context.res = { status: 200, jsonBody: { user: { oid: decoded.payload.oid, upn: decoded.payload.preferred_username }, customers: unique } };
  } catch (e) {
    context.log.error(e);
    context.res = { status: 500, body: 'Internal error' };
  }
}

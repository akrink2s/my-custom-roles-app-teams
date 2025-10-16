# Teams SSO Drop-in Bundle (Azure Static Web Apps)

This bundle gives you a **new Teams tab app** with **Teams SSO** that routes users to customer workspaces based on Entra groups.

## Contents

```
/teams-app/            # Teams app package files
  manifest.json
  color.png
  outline.png
/frontend/
  index.html           # Landing page
  sso.js               # TeamsJS SSO client
/api/
  package.json
  /bootstrap/          # Azure Functions HTTP trigger (POST /api/bootstrap)
    function.json
    index.js
  roles.json           # Map Entra Group Object IDs -> customer routes
staticwebapp.config.json
```

## 1) Prereqs
- Azure Static Web App hosted at **https://jolly-sky-09eb7ff03.2.azurestaticapps.net/**
- Azure Functions (managed by SWA or separate) for `/api`
- Microsoft Entra ID admin permissions (to register app & consent Graph)

## 2) Create the Entra app (for SSO)
1. **Register a new app** (single-tenant recommended).
2. **Expose an API** → set **Application ID URI** to:
   ```
   api://0bfe30ac-133d-4e03-a00c-6b7f61bd03ac
   ```
3. **Add scope** `access_as_user` (enabled).
4. *(Optional)* **API permissions** → add **Microsoft Graph** delegated permissions (e.g., `User.Read`, `GroupMember.Read.All`), and **Grant admin consent**.
5. **Client secret** → create and save value.

> Teams SSO requires the Teams manifest `webApplicationInfo.resource` to **exactly match** the Application ID URI above; otherwise `getAuthToken()` fails with a resource mismatch error.  

## 3) Update Teams manifest
`/teams-app/manifest.json` is already filled with:
```json
"webApplicationInfo": {
  "id": "0bfe30ac-133d-4e03-a00c-6b7f61bd03ac",
  "resource": "api://0bfe30ac-133d-4e03-a00c-6b7f61bd03ac"
}
```
Confirm `validDomains` contains `jolly-sky-09eb7ff03.2.azurestaticapps.net`. Zip the three files in `/teams-app` and side‑load in **Teams → Apps → Upload a custom app**.

## 4) Configure Azure Functions environment
Set these app settings on your Functions app (or SWA managed functions):
```
AZURE_TENANT_ID=da532c9a-7613-4e84-99fd-0c807f6d60c8
AZURE_CLIENT_ID=0bfe30ac-133d-4e03-a00c-6b7f61bd03ac
AZURE_CLIENT_SECRET=<PUT_CLIENT_SECRET_HERE>
```

## 5) Map groups to customers
Edit `/api/roles.json` and put your **Entra group object IDs** for each customer. The backend uses **OBO** to call Graph `/me/transitiveMemberOf` and returns only the allowed customers.

## 6) SWA configuration
`staticwebapp.config.json` includes the CSP header required by Teams:
```json
{
  "globalHeaders": {
    "content-security-policy": "frame-ancestors https://teams.microsoft.com https://*.teams.microsoft.com https://*.cloud.microsoft"
  }
}
```
> Teams tabs are iframes; `frame-ancestors` must be an **HTTP header** (not a `<meta>` tag).

## 7) Deploy
- Deploy `frontend/` to your SWA.  
- Deploy `api/` to your Functions environment.  
- Upload the Teams app package from `/teams-app`.

## 8) Test
1. Open the tab in Teams.  
2. In DevTools (Ctrl+Alt+Shift+I), verify that `getAuthToken()` succeeds and `/api/bootstrap` returns customers.  
3. Try a user in different customer groups; the chooser should only show their own workspaces.

## Notes
- For production, add **JWT signature validation** against Entra JWKS before OBO.  
- Keep isolation at the **API layer**; treat static routes as shells and guard data requests with the bearer token.  

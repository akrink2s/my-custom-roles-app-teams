
(async () => {
  const status = document.getElementById('status');
  const chooser = document.getElementById('chooser');
  const grid = document.getElementById('grid');

  try {
    try { await microsoftTeams.app.initialize(); } catch {}

    const token = await microsoftTeams.authentication.getAuthToken();

    const res = await fetch('/api/bootstrap', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ssoToken: token })
    });

    if (!res.ok) throw new Error('bootstrap failed: ' + res.status);

    const { customers } = await res.json();

    if (Array.isArray(customers)) {
      if (customers.length === 1) {
        location.replace(customers[0].path);
        return;
      }
      if (customers.length > 1) {
        status.style.display = 'none';
        chooser.style.display = '';
        customers.forEach(c => {
          const card = document.createElement('div');
          card.className = 'card';
          card.innerHTML = `<h3 style="margin-top:0">${c.label}</h3>` +
                           `<a class="btn" href="${c.path}">Open</a>`;
          grid.appendChild(card);
        });
        return;
      }
    }

    status.innerHTML = '<strong>No access</strong><div class="muted">No customer role assigned. Contact support.</div>';
  } catch (e) {
    console.error(e);
    status.innerHTML = '<strong>Sign-in or consent needed</strong><div class="muted">Please close and re-open the tab, or contact your admin.</div>';
  }
})();

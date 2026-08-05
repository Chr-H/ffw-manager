// Hilfsfunktion: Fahrzeuge aus dem Speicher laden
function getVehicles() {
  return ladeDaten("fahrzeuge") || [];
}

function renderFahrzeugeView() {
  const container = document.getElementById('fahrzeuge-container');
  if (!container) return;

  const vehicles = getVehicles();

  let html = `
    <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
      <h2>🚒 Fuhrpark</h2>
      <button class="btn btn-primary" onclick="alert('Funktion in Kürze verfügbar')">+ Neues Fahrzeug</button>
    </div>
  `;

  if (!vehicles || vehicles.length === 0) {
    html += `<p style="text-align:center; color:#666;">Keine Fahrzeuge vorhanden.</p>`;
    container.innerHTML = html;
    return;
  }

  html += `<div class="card-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">`;

  vehicles.forEach(veh => {
    html += `
      <div class="card" style="border-left: 5px solid ${veh.status === 'Einsatzbereit' ? '#2e7d32' : '#c62828'}; background:#fff; padding:15px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
        <h3>${veh.name || 'Unbekanntes Fahrzeug'}</h3>
        <p><strong>Funkrufname:</strong> ${veh.callSign || '-'}</p>
        <p><strong>Kennzeichen:</strong> ${veh.licensePlate || '-'}</p>
        <p><strong>Status:</strong> <span class="badge">${veh.status || 'Einsatzbereit'}</span></p>
        <hr style="margin: 0.5rem 0; border: 0; border-top: 1px solid #ccc;">
        <p><small>📅 Nächste HU: ${veh.nextHU || '-'} | SP: ${veh.nextSP || '-'}</small></p>
        <p style="margin-top: 0.5rem; color: #555;"><small>${veh.description || ''}</small></p>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

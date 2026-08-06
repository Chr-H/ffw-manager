// ==========================================
// FFW Manager - Fuhrparkverwaltung (v1.0.0)
// ==========================================

function getVehicles() {
  return ladeDaten("fahrzeuge") || [];
}

function speichereFahrzeuge(fahrzeuge) {
  speichereDaten('fahrzeuge', fahrzeuge);
  document.dispatchEvent(new Event("fahrzeugeGeaendert"));
}

function renderFahrzeugeView() {
  const container = document.getElementById('fahrzeuge-container');
  if (!container) return;

  const vehicles = getVehicles();

  let html = `
    <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
      <h2>🚒 Fuhrparkverwaltung</h2>
      <button class="btn btn-primary" onclick="openVehicleModal()">+ Neues Fahrzeug</button>
    </div>
  `;

  if (!vehicles || vehicles.length === 0) {
    html += `<p style="text-align:center; color:#666; padding: 20px;">Keine Fahrzeuge vorhanden. Klicke oben auf "+ Neues Fahrzeug".</p>`;
  } else {
    html += `<div class="card-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">`;

    vehicles.forEach(veh => {
      const isEinsatzbereit = veh.status === 'Einsatzbereit';
      const statusColor = isEinsatzbereit ? '#2e7d32' : (veh.status === 'Wartung' ? '#f57c00' : '#c62828');

      html += `
        <div class="card" style="border-left: 5px solid ${statusColor}; background:#fff; padding:15px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1); position:relative;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <h3 style="margin:0 0 5px 0;">${veh.name || 'Unbekanntes Fahrzeug'}</h3>
            <div>
              <button class="btn btn-bearbeiten" title="Bearbeiten" onclick="openVehicleModal('${veh.id}')">✏️</button>
              <button class="btn btn-loeschen" title="Löschen" onclick="loescheFahrzeug('${veh.id}')">🗑️</button>
            </div>
          </div>
          <p style="margin:4px 0;"><strong>Funkrufname:</strong> ${veh.callSign || '-'}</p>
          <p style="margin:4px 0;"><strong>Kennzeichen:</strong> ${veh.licensePlate || '-'}</p>
          <p style="margin:4px 0;"><strong>Status:</strong> <span class="badge" style="background:${statusColor}; color:#fff; padding:2px 8px; border-radius:4px; font-size:0.85rem;">${veh.status || 'Einsatzbereit'}</span></p>
          <hr style="margin: 0.8rem 0; border: 0; border-top: 1px solid #eee;">
          <p style="margin:4px 0;"><small>📅 <strong>HU:</strong> ${veh.nextHU || 'Keine'} | <strong>SP:</strong> ${veh.nextSP || 'Keine'}</small></p>
          ${veh.description ? `<p style="margin-top: 0.5rem; color: #555; font-size:0.9rem;"><small>${veh.description}</small></p>` : ''}
        </div>
      `;
    });

    html += `</div>`;
  }

  container.innerHTML = html;
}

// Modal-Fenster zum Anlegen / Bearbeiten
function openVehicleModal(id = null) {
  let veh = { id: '', name: '', callSign: '', licensePlate: '', status: 'Einsatzbereit', nextHU: '', nextSP: '', description: '' };
  
  if (id) {
    const list = getVehicles();
    const found = list.find(v => v.id === id);
    if (found) veh = found;
  }

  const modalHtml = `
    <div id="vehicle-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
      <div style="background:#fff; padding:20px; border-radius:8px; width:90%; max-width:500px; max-height:90vh; overflow-y:auto;">
        <h3>${veh.id ? '✏️ Fahrzeug bearbeiten' : '➕ Neues Fahrzeug anlegen'}</h3>
        <form id="vehicle-form" onsubmit="saveVehicleFromModal(event, '${veh.id}')" style="display:flex; flex-direction:column; gap:10px; margin-top:15px;">
          <div>
            <label><strong>Fahrzeugbezeichnung *</strong></label>
            <input type="text" id="veh-name" value="${veh.name}" required style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. LF 20/16">
          </div>
          <div>
            <label><strong>Funkrufname</strong></label>
            <input type="text" id="veh-callSign" value="${veh.callSign}" style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. Florian Albertsried 40/1">
          </div>
          <div>
            <label><strong>Amtliches Kennzeichen</strong></label>
            <input type="text" id="veh-licensePlate" value="${veh.licensePlate}" style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. REG-FF 112">
          </div>
          <div>
            <label><strong>Status</strong></label>
            <select id="veh-status" style="width:100%; padding:8px; margin-top:4px;">
              <option value="Einsatzbereit" ${veh.status === 'Einsatzbereit' ? 'selected' : ''}>Einsatzbereit</option>
              <option value="Wartung" ${veh.status === 'Wartung' ? 'selected' : ''}>In Wartung / Werkstatt</option>
              <option value="Außer Dienst" ${veh.status === 'Außer Dienst' ? 'selected' : ''}>Außer Dienst</option>
            </select>
          </div>
          <div style="display:flex; gap:10px;">
            <div style="flex:1;">
              <label><strong>Nächste HU</strong></label>
              <input type="month" id="veh-nextHU" value="${veh.nextHU}" style="width:100%; padding:8px; margin-top:4px;">
            </div>
            <div style="flex:1;">
              <label><strong>Nächste SP</strong></label>
              <input type="month" id="veh-nextSP" value="${veh.nextSP}" style="width:100%; padding:8px; margin-top:4px;">
            </div>
          </div>
          <div>
            <label><strong>Bemerkungen / Ausstattung</strong></label>
            <textarea id="veh-description" style="width:100%; padding:8px; margin-top:4px;" rows="3">${veh.description}</textarea>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:15px;">
            <button type="button" class="btn" onclick="closeVehicleModal()" style="background:#ccc;">Abbrechen</button>
            <button type="submit" class="btn btn-primary">💾 Speichern</button>
          </div>
        </form>
      </div>
    </div>
  `;

  closeVehicleModal();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeVehicleModal() {
  const existingModal = document.getElementById('vehicle-modal');
  if (existingModal) existingModal.remove();
}

function saveVehicleFromModal(event, existingId) {
  event.preventDefault();

  const fahrzeuge = getVehicles();

  const newVeh = {
    id: existingId || "VEH-" + Date.now(),
    name: document.getElementById('veh-name').value.trim(),
    callSign: document.getElementById('veh-callSign').value.trim(),
    licensePlate: document.getElementById('veh-licensePlate').value.trim(),
    status: document.getElementById('veh-status').value,
    nextHU: document.getElementById('veh-nextHU').value,
    nextSP: document.getElementById('veh-nextSP').value,
    description: document.getElementById('veh-description').value.trim()
  };

  if (existingId) {
    const idx = fahrzeuge.findIndex(v => v.id === existingId);
    if (idx !== -1) fahrzeuge[idx] = newVeh;
  } else {
    fahrzeuge.push(newVeh);
  }

  speichereFahrzeuge(fahrzeuge);
  closeVehicleModal();
  renderFahrzeugeView();
}

function loescheFahrzeug(id) {
  if (!confirm("Möchtest du dieses Fahrzeug wirklich aus dem Fuhrpark löschen?")) return;

  const fahrzeuge = getVehicles().filter(v => v.id !== id);
  speichereFahrzeuge(fahrzeuge);
  renderFahrzeugeView();
}

document.addEventListener("DOMContentLoaded", () => {
  renderFahrzeugeView();
});
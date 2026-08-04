function renderFahrzeugeView() {
  const container = document.getElementById('main-content');
  const vehicles = getVehicles();

  let html = `
    <div class="view-header">
      <h2>🚒 Fuhrpark</h2>
      <button class="btn btn-primary" onclick="openAddVehicleModal()">+ Neues Fahrzeug</button>
    </div>
    
    <div class="card-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-top: 1rem;">
  `;

  vehicles.forEach(veh => {
    html += `
      <div class="card" style="border-left: 5px solid ${veh.status === 'Einsatzbereit' ? '#2e7d32' : '#c62828'};">
        <h3>${veh.name}</h3>
        <p><strong>Funkrufname:</strong> ${veh.callSign}</p>
        <p><strong>Kennzeichen:</strong> ${veh.licensePlate}</p>
        <p><strong>Status:</strong> <span class="badge">${veh.status}</span></p>
        <hr style="margin: 0.5rem 0; border: 0; border-top: 1px solid #ccc;">
        <p><small>📅 Nächste HU: ${veh.nextHU} | SP: ${veh.nextSP}</small></p>
        <p style="margin-top: 0.5rem; color: #555;"><small>${veh.description}</small></p>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}
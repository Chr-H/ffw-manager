// ==========================================
// FFW Manager - Fahrzeugverwaltung & Akten
// ==========================================

function renderFahrzeugeView() {
    const ziel = document.getElementById('seite-fahrzeuge');
    if (!ziel) return;

    // Lese- & Schreibrechte prüfen
    const darfSchreiben = typeof window.hatRecht === "function" 
        ? window.hatRecht('fahrzeuge_schreiben') 
        : false;

    const fahrzeuge = JSON.parse(localStorage.getItem('ffw_fahrzeuge')) || [];

    // Header & "Neues Fahrzeug"-Button nur bei Schreibrecht anzeigen
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>🚒 Fahrzeugübersicht</h2>
            ${darfSchreiben ? `
                <button onclick="oeffneFahrzeugModal()" style="background: #28a745; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    + Neues Fahrzeug anlegen
                </button>
            ` : `<span style="color: #666; font-style: italic;">🔒 Sie besitzen nur Leserechte für dieses Modul.</span>`}
        </div>

        <div style="background: white; border-radius: 8px; border: 1px solid #ddd; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                        <th style="padding: 12px 15px;">Funkrufname</th>
                        <th style="padding: 12px 15px;">Fahrzeugtyp</th>
                        <th style="padding: 12px 15px;">Kennzeichen</th>
                        <th style="padding: 12px 15px;">Baujahr</th>
                        <th style="padding: 12px 15px;">Status</th>
                        <th style="padding: 12px 15px;">Aktionen</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (fahrzeuge.length === 0) {
        html += `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #777;">Keine Fahrzeuge erfasst.</td></tr>`;
    } else {
        fahrzeuge.forEach(f => {
            const statusColor = f.status === 'Einsatzbereit' ? '#d4edda' : '#f8d7da';
            const statusTextColor = f.status === 'Einsatzbereit' ? '#155724' : '#721c24';

            html += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px 15px; font-weight: bold;">${f.funkrufname || f.name || '-'}</td>
                    <td style="padding: 12px 15px;">${f.typ || f.fahrzeugtyp || '-'}</td>
                    <td style="padding: 12px 15px;">${f.kennzeichen || '-'}</td>
                    <td style="padding: 12px 15px;">${f.baujahr || '-'}</td>
                    <td style="padding: 12px 15px;">
                        <span style="background: ${statusColor}; color: ${statusTextColor}; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">
                            ${f.status || 'Einsatzbereit'}
                        </span>
                    </td>
                    <td style="padding: 12px 15px; display: flex; gap: 6px;">
                        <button onclick="zeigeFahrzeugAkte('${f.id}')" style="background: #17a2b8; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                            📄 Akte
                        </button>
                        ${darfSchreiben ? `
                            <button onclick="bearbeiteFahrzeug('${f.id}')" style="background: #ffc107; color: #333; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                                ✏️ Bearbeiten
                            </button>
                            <button onclick="loescheFahrzeug('${f.id}')" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                                🗑️ Löschen
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
    }

    html += `
                </tbody>
            </table>
        </div>
        <div id="fahrzeug-akte-bereich" style="margin-top: 30px;"></div>
    `;

    ziel.innerHTML = html;
}

/**
 * Zeigt die digitale Fahrzeugakte unterhalb der Tabelle an
 */
function zeigeFahrzeugAkte(fahrzeugId) {
    const fahrzeuge = JSON.parse(localStorage.getItem('ffw_fahrzeuge')) || [];
    const geraete = JSON.parse(localStorage.getItem('ffw_geraete')) || [];
    const f = fahrzeuge.find(item => item.id === fahrzeugId);

    if (!f) {
        alert("Fahrzeug nicht gefunden!");
        return;
    }

    // Beladung / Zugewiesene Geräte filtern
    const beladung = geraete.filter(g => g.standort === f.funkrufname || g.fahrzeug === f.funkrufname);

    const bereich = document.getElementById('fahrzeug-akte-bereich');
    if (!bereich) return;

    bereich.innerHTML = `
        <div style="background: #fdfdfd; border: 2px solid #17a2b8; border-radius: 8px; padding: 25px; position: relative;">
            <button onclick="document.getElementById('fahrzeug-akte-bereich').innerHTML='';" style="position: absolute; top: 15px; right: 15px; background: #6c757d; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                ✖ Schließen
            </button>
            <h3 style="color: #17a2b8; margin-top: 0;">📁 Fahrzeugakte: ${f.funkrufname} (${f.typ || 'Unbekannt'})</h3>
            <hr style="border: 0; border-top: 1px solid #ccc; margin: 15px 0;">

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div><strong>Kennzeichen:</strong> ${f.kennzeichen || '-'}</div>
                <div><strong>Baujahr:</strong> ${f.baujahr || '-'}</div>
                <div><strong>Fahrgestell / Fahrgestellnr:</strong> ${f.fahrgestell || '-'}</div>
                <div><strong>Status:</strong> ${f.status || 'Einsatzbereit'}</div>
            </div>

            <h4>🧯 Verladene Geräte / Beladung (${beladung.length}):</h4>
            ${beladung.length === 0 
                ? '<p style="color: #777;">Diesem Fahrzeug sind aktuell keine Geräte im System zugewiesen.</p>'
                : `<ul style="margin-top: 10px; padding-left: 20px;">
                    ${beladung.map(g => `<li><strong>${g.bezeichnung || g.name}</strong> (Status: ${g.status || 'ok'})</li>`).join('')}
                   </ul>`
            }
        </div>
    `;

    bereich.scrollIntoView({ behavior: 'smooth' });
}

function loescheFahrzeug(id) {
    if (typeof window.hatRecht === "function" && !window.hatRecht('fahrzeuge_schreiben')) {
        alert("⚠️ Keine Berechtigung zum Löschen vorhanden!");
        return;
    }

    if (!confirm("Möchten Sie dieses Fahrzeug wirklich löschen?")) return;

    let fahrzeuge = JSON.parse(localStorage.getItem('ffw_fahrzeuge')) || [];
    fahrzeuge = fahrzeuge.filter(f => f.id !== id);
    localStorage.setItem('ffw_fahrzeuge', JSON.stringify(fahrzeuge));

    renderFahrzeugeView();
}

window.renderFahrzeugeView = renderFahrzeugeView;
window.zeigeFahrzeugAkte = zeigeFahrzeugAkte;
window.loescheFahrzeug = loescheFahrzeug;
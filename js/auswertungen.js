// ==========================================
// AUSWERTUNGEN-MODUL LOGIK (auswertungen.js)
// ==========================================

function initAuswertungenLayout() {
    const container = document.getElementById('seite-auswertungen');
    if (!container || container.querySelector('.auswertungen-container')) return;

    container.innerHTML = `
        <div class="module-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>📊 Auswertungen & Berichte</h2>
            <button class="btn btn-secondary" onclick="druckeListe('Auswertungsbericht', 'auswertungen-druckbereich')">🖨️ Bericht drucken</button>
        </div>

        <div id="auswertungen-druckbereich" class="auswertungen-container" style="display: flex; flex-direction: column; gap: 20px;">
            
            <!-- Kennzahlen Kacheln -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px;">
                <div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 5px solid #2196F3; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <small style="color: #666; font-weight: bold;">MANNSCHAFT</small>
                    <h2 id="rep-personal-anzahl" style="margin: 5px 0 0 0;">0</h2>
                    <span id="rep-personal-agt" style="font-size: 0.85em; color: #555;">0 Atemschutzträger</span>
                </div>
                <div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 5px solid #4CAF50; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <small style="color: #666; font-weight: bold;">GERÄTE & FAHRZEUGE</small>
                    <h2 id="rep-geraete-anzahl" style="margin: 5px 0 0 0;">0</h2>
                    <span id="rep-geraete-status" style="font-size: 0.85em; color: #555;">0 einsatzbereit</span>
                </div>
                <div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 5px solid #f44336; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <small style="color: #666; font-weight: bold;">PRÜFUNGEN Überfällig</small>
                    <h2 id="rep-pruef-ueberfaellig" style="margin: 5px 0 0 0; color: #d32f2f;">0</h2>
                    <span id="rep-pruef-faellig" style="font-size: 0.85em; color: #555;">0 in den nächsten 30 Tagen</span>
                </div>
            </div>

            <!-- Atemschutz-Überwachung (G26.3 Status) -->
            <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <h3 style="margin-top:0;">🧯 Atemschutzträger-Tauglichkeits-Spiegel (G26.3)</h3>
                <div id="rep-agt-liste" style="margin-top: 10px;">
                    <!-- Dynamische Tabelle -->
                </div>
            </div>

            <!-- Geräte & Prüfstatus Übersicht -->
            <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <h3 style="margin-top:0;">📋 Mängelliste / Nicht einsatzbereite Geräte & PSA</h3>
                <div id="rep-maengel-liste" style="margin-top: 10px;">
                    <!-- Dynamische Tabelle -->
                </div>
            </div>

        </div>
    `;
}

function rendereAuswertungen() {
    initAuswertungenLayout();

    const mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
    const geraete = JSON.parse(localStorage.getItem('ffw_geraete')) || [];
    const fahrzeuge = JSON.parse(localStorage.getItem('ffw_fahrzeuge')) || [];
    const psa = JSON.parse(localStorage.getItem('ffw_psa')) || [];
    const pruefungen = JSON.parse(localStorage.getItem('ffw_pruefungen')) || [];
    const heute = new Date();

    // 1. Kennzahlen
    const agtAnzahl = mitglieder.filter(m => m.funktionen && m.funktionen.includes('Atemschutzträger')).length;
    const geraeteEinsatzbereit = geraete.filter(g => g.status === 'einsatzbereit').length;
    
    const ueberfaelligCount = pruefungen.filter(p => new Date(p.datum) < heute && p.status !== 'erledigt').length;
    const in30Tagen = new Date();
    in30Tagen.setDate(heute.getDate() + 30);
    const faelligCount = pruefungen.filter(p => {
        const d = new Date(p.datum);
        return d >= heute && d <= in30Tagen && p.status !== 'erledigt';
    }).length;

    if (document.getElementById('rep-personal-anzahl')) document.getElementById('rep-personal-anzahl').textContent = mitglieder.length;
    if (document.getElementById('rep-personal-agt')) document.getElementById('rep-personal-agt').textContent = `${agtAnzahl} Atemschutzträger`;
    if (document.getElementById('rep-geraete-anzahl')) document.getElementById('rep-geraete-anzahl').textContent = geraete.length + fahrzeuge.length;
    if (document.getElementById('rep-geraete-status')) document.getElementById('rep-geraete-status').textContent = `${geraeteEinsatzbereit} Geräte einsatzbereit`;
    if (document.getElementById('rep-pruef-ueberfaellig')) document.getElementById('rep-pruef-ueberfaellig').textContent = ueberfaelligCount;
    if (document.getElementById('rep-pruef-faellig')) document.getElementById('rep-pruef-faellig').textContent = `${faelligCount} in den nächsten 30 Tagen`;

    // 2. AGT Tabelle
    const agtListe = mitglieder.filter(m => m.funktionen && m.funktionen.includes('Atemschutzträger'));
    const agtContainer = document.getElementById('rep-agt-liste');

    if (agtContainer) {
        if (agtListe.length === 0) {
            agtContainer.innerHTML = `<p style="color:#777;">Keine Atemschutzträger erfasst.</p>`;
        } else {
            agtContainer.innerHTML = `
                <table class="data-table" style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f4f4f4; text-align:left;">
                            <th style="padding:8px; border-bottom:2px solid #ddd;">Name</th>
                            <th style="padding:8px; border-bottom:2px solid #ddd;">Dienstgrad</th>
                            <th style="padding:8px; border-bottom:2px solid #ddd;">G26.3 Ablaufsdatum</th>
                            <th style="padding:8px; border-bottom:2px solid #ddd;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${agtListe.map(m => {
                            let statusText = "🟢 Gültig";
                            let bgColor = "#e8f5e9";
                            if (!m.g26datum || new Date(m.g26datum) < heute) {
                                statusText = "🔴 Abgelaufen / Keine Ausrüstung";
                                bgColor = "#ffebee";
                            } else if (new Date(m.g26datum) <= in30Tagen) {
                                statusText = "🟡 Fällig in Kürze";
                                bgColor = "#fff3e0";
                            }
                            return `
                                <tr style="border-bottom:1px solid #eee;">
                                    <td style="padding:8px;"><strong>${m.nachname}</strong>, ${m.vorname}</td>
                                    <td style="padding:8px;">${m.dienstgrad || '-'}</td>
                                    <td style="padding:8px;">${m.g26datum ? new Date(m.g26datum).toLocaleDateString('de-DE') : '-'}</td>
                                    <td style="padding:8px;"><span style="background:${bgColor}; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:0.85em;">${statusText}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }
    }

    // 3. Mängelliste (Defekte Geräte & PSA)
    const defekteGeraete = geraete.filter(g => g.status === 'defekt' || g.status === 'inaktiv');
    const defektePSA = psa.filter(p => p.status === 'defekt' || p.status === 'inaktiv');
    const maengelContainer = document.getElementById('rep-maengel-liste');

    if (maengelContainer) {
        const alleMaengel = [
            ...defekteGeraete.map(g => ({ typ: 'Gerät', bez: g.bezeichnung, id: g.inventarnummer || g.seriennummer, bem: g.bemerkung })),
            ...defektePSA.map(p => ({ typ: 'PSA', bez: `${p.traeger || 'Unbekannt'} - ${p.bezeichnung}`, id: p.seriennummer, bem: p.status }))
        ];

        if (alleMaengel.length === 0) {
            maengelContainer.innerHTML = `<p style="color:#2e7d32; font-weight:bold;">✅ Keine Mängel oder defekten Geräte gemeldet.</p>`;
        } else {
            maengelContainer.innerHTML = `
                <table class="data-table" style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f4f4f4; text-align:left;">
                            <th style="padding:8px; border-bottom:2px solid #ddd;">Typ</th>
                            <th style="padding:8px; border-bottom:2px solid #ddd;">Bezeichnung</th>
                            <th style="padding:8px; border-bottom:2px solid #ddd;">Kennung / ID</th>
                            <th style="padding:8px; border-bottom:2px solid #ddd;">Bemerkung</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${alleMaengel.map(m => `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:8px;">${m.typ}</td>
                                <td style="padding:8px;"><strong>${m.bez}</strong></td>
                                <td style="padding:8px;">${m.id || '-'}</td>
                                <td style="padding:8px; color:#c62828;">${m.bem || 'Defekt'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    }
}

window.initAuswertungenLayout = initAuswertungenLayout;
window.rendereAuswertungen = rendereAuswertungen;
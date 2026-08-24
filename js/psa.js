// ==========================================
// FFW Manager - PSA-Verwaltung mit Filter, PSA-Akte & Export/Import (v2.2.1)
// ==========================================

function getPSA() {
    const data = ladeDaten("psa");
    return Array.isArray(data) ? data : [];
}

function speicherePSA(psaListe) {
    const userString = localStorage.getItem('ffw_user') || sessionStorage.getItem('ffw_user');
    const u = userString ? JSON.parse(userString) : null;
    const rolle = (u && u.rolle) ? u.rolle.toLowerCase() : (localStorage.getItem('ffw_aktive_rolle') || 'gast');
    const darfSchreiben = (rolle === 'admin' || rolle === 'editor');

    if (!darfSchreiben) {
        alert("⚠️ Viewer haben keine Berechtigung, Änderungen zu speichern.");
        return;
    }

    speichereDaten('psa', psaListe);
    document.dispatchEvent(new Event("psaGeaendert"));
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatiereDatum(datumStr) {
    if (!datumStr) return '-';
    
    const parts = datumStr.split('-');
    let d;
    if (parts.length === 3) {
        d = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
        d = new Date(datumStr);
    }

    if (isNaN(d.getTime())) return '-';

    const heute = new Date();
    heute.setHours(0, 0, 0, 0);

    const formatted = d.toLocaleDateString("de-DE", {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    if (d < heute) {
        return `<strong style="color:#c62828;" title="Prüfung überfällig!">⚠️ ${formatted}</strong>`;
    }
    return formatted;
}

// 1. Hauptansicht rendern
function renderPSAView() {
    const container = document.getElementById('seite-psa') ||
                      document.getElementById('psa-container') || 
                      document.getElementById('psaContainer') || 
                      document.getElementById('psaListe') || 
                      document.getElementById('psa') || 
                      document.getElementById('main-content') || 
                      document.getElementById('content');

    if (!container) return;

    container.innerHTML = `
        <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:10px;">
            <h2>🧑‍🚒 PSA-Verwaltung</h2>
            
            <!-- Aktions-Buttons / Datensicherung -->
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn" onclick="exportPSACSV()" style="background:#17a2b8; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-weight:bold;">📄 Export CSV</button>
                <button class="btn" onclick="document.getElementById('psa-import-input').click()" style="background:#6c757d; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-weight:bold;">📥 Import CSV</button>
                <input type="file" id="psa-import-input" accept=".csv" style="display:none;" onchange="importPSACSV(event)">
                <button class="btn" onclick="exportPSAPDF()" style="background:#dc3545; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-weight:bold;">🖨️ PDF / Druck</button>
                <button class="btn btn-primary" onclick="openPSAModal()" style="background:#28a745; color:white; border:none; padding:8px 14px; border-radius:5px; cursor:pointer; font-weight:bold;">+ PSA anlegen</button>
            </div>
        </div>

        <!-- Filter- & Suchleiste -->
        <div style="display:flex; gap:10px; margin-bottom:1rem; flex-wrap:wrap; background:#fff; padding:12px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <div style="flex:2; min-width:200px;">
                <input type="text" id="psa-filter-suche" oninput="filterPSA()" placeholder="🔍 Suche nach Name, Spind, Ausrüstung, Hersteller..." style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
            </div>
            <div style="flex:1; min-width:150px;">
                <select id="psa-filter-status" onchange="filterPSA()" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                    <option value="">Alle Status anzeigen</option>
                    <option value="Einsatzbereit">🟢 Einsatzbereit</option>
                    <option value="In Reinigung">🧺 In Reinigung</option>
                    <option value="Defekt">🔴 Defekt</option>
                    <option value="Ausgemustert">⚪ Ausgemustert</option>
                </select>
            </div>
        </div>

        <!-- Tabelle -->
        <div style="overflow-x:auto;">
            <table class="tabelle" id="psa-tabelle-print" style="width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background:#b71c1c; color:white; text-align:left;">
                        <th style="padding:10px; text-align:center; min-width:110px;" class="no-print">Aktionen</th>
                        <th style="padding:10px;">Spind</th>
                        <th style="padding:10px;">Träger</th>
                        <th style="padding:10px;">Hersteller</th>
                        <th style="padding:10px;">Typ</th>
                        <th style="padding:10px;">Ausrüstung / Bezeichn.</th>
                        <th style="padding:10px;">Größe</th>
                        <th style="padding:10px;">Zubehör</th>
                        <th style="padding:10px;">Inv.- / Serien-Nr.</th>
                        <th style="padding:10px;">Nächste Prüfung</th>
                    </tr>
                </thead>
                <tbody id="psa-tabelle-body"></tbody>
            </table>
        </div>
    `;

    setTimeout(() => {
        filterPSA();
    }, 50);
}

// 2. Filter-Funktion & Tabellenbefüllung
function filterPSA() {
    let tbody = document.getElementById('psa-tabelle-body');
    if (!tbody) return;

    const safeStr = (str) => {
        if (!str && str !== 0) return '-';
        return escapeHtml(str);
    };

    let psaListe = [];
    try {
        psaListe = typeof getPSA === 'function' ? getPSA() : [];
    } catch(e) {
        console.error("Fehler beim Laden der PSA-Daten:", e);
    }

    const suchText = (document.getElementById('psa-filter-suche')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('psa-filter-status')?.value || '';

    const gefiltert = psaListe.filter(item => {
        if (!item) return false;
        const traeger = (item.traeger || item.name || '').toLowerCase();
        const spind = (item.spind || '').toLowerCase();
        const hersteller = (item.hersteller || '').toLowerCase();
        const typ = (item.typ || '').toLowerCase();
        const bezeichnung = (item.bezeichnung || '').toLowerCase();
        const seriennummer = (item.seriennummer || '').toLowerCase();
        const zubehoer = (item.zubehoer || '').toLowerCase();
        const status = item.status || 'Einsatzbereit';

        const passtText = !suchText || 
                          traeger.includes(suchText) || 
                          spind.includes(suchText) || 
                          hersteller.includes(suchText) || 
                          typ.includes(suchText) || 
                          bezeichnung.includes(suchText) || 
                          zubehoer.includes(suchText) || 
                          seriennummer.includes(suchText);

        const passtStatus = statusFilter === '' || status === statusFilter;

        return passtText && passtStatus;
    });

    if (gefiltert.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:#666;">Keine passenden PSA-Einträge gefunden.</td></tr>`;
        return;
    }

    let rowsHtml = '';
    gefiltert.forEach(item => {
        const itemId = item.id ? String(item.id).replace(/'/g, "\\'") : '';
        const datum = typeof formatiereDatum === 'function' ? formatiereDatum(item.naechstePruefung) : (item.naechstePruefung || '-');
        
        rowsHtml += `
            <tr style="border-bottom:1px solid #eee; cursor:pointer;" onclick="openPSAAkteModal('${itemId}')">
                <td style="padding:8px 10px; text-align:center; white-space:nowrap;" class="no-print" onclick="event.stopPropagation();">
                    <button class="btn btn-bearbeiten" title="Akte öffnen" onclick="openPSAAkteModal('${itemId}')" style="cursor:pointer; border:1px solid #ccc; background:#fff; border-radius:4px; padding:6px 8px; font-size:1rem;">📂</button>
                    <button class="btn btn-bearbeiten" title="Bearbeiten" onclick="openPSAModal('${itemId}')" style="cursor:pointer; border:1px solid #ccc; background:#fff; border-radius:4px; padding:6px 8px; font-size:1rem;">✏️</button>
                    <button class="btn btn-loeschen" title="Löschen" onclick="loeschePSA('${itemId}')" style="cursor:pointer; border:1px solid #ccc; background:#fff; border-radius:4px; padding:6px 8px; font-size:1rem;">🗑️</button>
                </td>
                <td style="padding:10px;"><strong>${item.spind ? '🚪 ' + safeStr(item.spind) : '-'}</strong></td>
                <td style="padding:10px; font-weight:bold;">${safeStr(item.traeger || item.name || 'Unbekannt')}</td>
                <td style="padding:10px;">${safeStr(item.hersteller)}</td>
                <td style="padding:10px;">${safeStr(item.typ)}</td>
                <td style="padding:10px;">${safeStr(item.bezeichnung)}</td>
                <td style="padding:10px;">${safeStr(item.groesse)}</td>
                <td style="padding:10px;">${safeStr(item.zubehoer)}</td>
                <td style="padding:10px;">${safeStr(item.seriennummer)}</td>
                <td style="padding:10px;">${safeStr(datum)}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
}

// 3. EXPORT & IMPORT FUNKTIONEN (Datensicherung)
function exportPSACSV() {
    const psaListe = getPSA();
    if (psaListe.length === 0) {
        alert("Keine PSA-Daten zum Exportieren vorhanden.");
        return;
    }

    const headers = ["ID", "Spind", "Traeger", "Hersteller", "Typ", "Bezeichnung", "Groesse", "Zubehoer", "Seriennummer", "AusgabeDatum", "NaechstePruefung", "Status"];
    let csvContent = "\uFEFF" + headers.join(";") + "\n"; // UTF-8 BOM für Excel

    psaListe.forEach(item => {
        const row = [
            `"${(item.id || '').replace(/"/g, '""')}"`,
            `"${(item.spind || '').replace(/"/g, '""')}"`,
            `"${(item.traeger || item.name || '').replace(/"/g, '""')}"`,
            `"${(item.hersteller || '').replace(/"/g, '""')}"`,
            `"${(item.typ || '').replace(/"/g, '""')}"`,
            `"${(item.bezeichnung || '').replace(/"/g, '""')}"`,
            `"${(item.groesse || '').replace(/"/g, '""')}"`,
            `"${(item.zubehoer || '').replace(/"/g, '""')}"`,
            `"${(item.seriennummer || '').replace(/"/g, '""')}"`,
            `"${(item.ausgabeDatum || '').replace(/"/g, '""')}"`,
            `"${(item.naechstePruefung || '').replace(/"/g, '""')}"`,
            `"${(item.status || 'Einsatzbereit').replace(/"/g, '""')}"`
        ];
        csvContent += row.join(";") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PSA_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importPSACSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split(/\r\n|\n/);
        if (lines.length < 2) {
            alert("Die Datei enthält keine gültigen Daten.");
            return;
        }

        const psaListe = getPSA();
        let importCount = 0;

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const cols = lines[i].split(';').map(col => col.replace(/^"|"$/g, '').trim());
            
            if (cols.length >= 5) {
                const newItem = {
                    id: cols[0] || ("PSA-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4)),
                    spind: cols[1] || '',
                    traeger: cols[2] || '',
                    name: cols[2] || '',
                    hersteller: cols[3] || '',
                    typ: cols[4] || '',
                    bezeichnung: cols[5] || '',
                    groesse: cols[6] || '',
                    zubehoer: cols[7] || '',
                    seriennummer: cols[8] || '',
                    ausgabeDatum: cols[9] || '',
                    naechstePruefung: cols[10] || '',
                    status: cols[11] || 'Einsatzbereit',
                    historie: []
                };

                const existingIdx = psaListe.findIndex(p => p.id === newItem.id);
                if (existingIdx !== -1) {
                    psaListe[existingIdx] = newItem;
                } else {
                    psaListe.push(newItem);
                }
                importCount++;
            }
        }

        speicherePSA(psaListe);
        filterPSA();
        alert(`Erfolgreich ${importCount} PSA-Einträge importiert/aktualisiert.`);
        event.target.value = '';
    };
    reader.readAsText(file);
}

function exportPSAPDF() {
    window.print();
}

// 4. PSA-Akte (Detailansicht)
function openPSAAkteModal(id) {
    const item = getPSA().find(p => p && p.id === id);
    if (!item) return;

    const safeId = escapeHtml(item.id);
    item.historie = Array.isArray(item.historie) ? item.historie : [];
    item.status = item.status || 'Einsatzbereit';

    let historieHtml = '';
    if (item.historie.length === 0) {
        historieHtml = '<p style="color:#777; font-style:italic;">Bisher keine Einträge in der Akte vorhanden.</p>';
    } else {
        historieHtml = '<ul style="list-style:none; padding:0; margin:0;">';
        item.historie.slice().reverse().forEach(h => {
            const histDatum = h.datum ? escapeHtml(new Date(h.datum).toLocaleDateString("de-DE")) : '-';
            historieHtml += `
                <li style="border-left:3px solid #1976D2; padding-left:10px; margin-bottom:10px; background:#f9f9f9; padding:8px; border-radius:0 4px 4px 0;">
                    <div style="font-size:0.85rem; color:#666;">📅 ${histDatum} - <strong>${escapeHtml(h.typ)}</strong> ${h.pruefer ? '(' + escapeHtml(h.pruefer) + ')' : ''}</div>
                    <div style="margin-top:2px;">${escapeHtml(h.bemerkung)}</div>
                </li>
            `;
        });
        historieHtml += '</ul>';
    }

    const modalHtml = `
        <div id="psa-akte-modal" class="psa-modal-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
            <div style="background:#fff; padding:20px; border-radius:8px; width:92%; max-width:650px; max-height:90vh; overflow-y:auto;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #ddd; padding-bottom:10px;">
                    <div>
                        <h2 style="margin:0;">📂 PSA-Akte: ${escapeHtml(item.bezeichnung)}</h2>
                        <p style="margin:5px 0 0 0; color:#555;">Träger: <strong>${escapeHtml(item.traeger || item.name)}</strong> | Spind: <strong>${escapeHtml(item.spind || 'Keiner')}</strong></p>
                    </div>
                    <button onclick="closePSAAkteModal()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">✖</button>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:15px 0; background:#f8f9fa; padding:12px; border-radius:6px;">
                    <div><strong>Größe:</strong> ${escapeHtml(item.groesse || '-')}</div>
                    <div><strong>Serien- / Inv.-Nr.:</strong> ${escapeHtml(item.seriennummer || '-')}</div>
                    <div><strong>Ausgabedatum:</strong> ${formatiereDatum(item.ausgabeDatum)}</div>
                    <div><strong>Nächste Prüfung:</strong> ${formatiereDatum(item.naechstePruefung)}</div>
                </div>

                <!-- Status Ändern -->
                <div style="margin-bottom:20px; background:#eef2f5; padding:12px; border-radius:6px;">
                    <label><strong>Aktueller Status:</strong></label>
                    <div style="display:flex; gap:10px; margin-top:5px;">
                        <select id="psa-status-select" style="flex:1; padding:8px;">
                            <option value="Einsatzbereit" ${item.status === 'Einsatzbereit' ? 'selected' : ''}>🟢 Einsatzbereit</option>
                            <option value="In Reinigung" ${item.status === 'In Reinigung' ? 'selected' : ''}>🧺 In Reinigung</option>
                            <option value="Defekt" ${item.status === 'Defekt' ? 'selected' : ''}>🔴 Defekt</option>
                            <option value="Ausgemustert" ${item.status === 'Ausgemustert' ? 'selected' : ''}>⚪ Ausgemustert</option>
                        </select>
                        <button class="btn btn-primary" onclick="speicherePSAStatus('${safeId}')" style="background:#0d6efd; color:#fff; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Status aktualisieren</button>
                    </div>
                </div>

                <!-- Neue Historie / Ereignis eintragen -->
                <details style="margin-bottom:20px; background:#fff; border:1px solid #ddd; padding:10px; border-radius:6px;">
                    <summary style="font-weight:bold; cursor:pointer;">➕ Neuer Eintrag (Reinigung, Prüfung, Defekt, etc.)</summary>
                    <form onsubmit="addPSAHistorieEintrag(event, '${safeId}')" style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
                        <div style="display:flex; gap:10px;">
                            <select id="hist-typ" style="flex:1; padding:6px;" required>
                                <option value="Reinigung / Wäsche">🧺 Reinigung / Wäsche</option>
                                <option value="Sichtprüfung">🔍 Sichtprüfung</option>
                                <option value="Reparatur">🛠️ Reparatur</option>
                                <option value="Mangel / Defekt">⚠️ Mangel / Defekt</option>
                                <option value="Sonstiges">📝 Sonstiges</option>
                            </select>
                            <input type="text" id="hist-pruefer" placeholder="Bearbeiter / Prüfer" style="flex:1; padding:6px;">
                        </div>
                        <textarea id="hist-bemerkung" placeholder="Bemerkung / Details zum Vorgang..." style="width:100%; padding:6px;" rows="2" required></textarea>
                        <button type="submit" class="btn btn-primary" style="align-self:flex-end; background:#0d6efd; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">Eintrag speichern</button>
                    </form>
                </details>

                <!-- Historie Liste -->
                <h3>📜 Verlaufs- & Pflegehistorie</h3>
                <div style="max-height:200px; overflow-y:auto; border:1px solid #eee; padding:10px; border-radius:6px;">
                    ${historieHtml}
                </div>

                <div style="text-align:right; margin-top:15px;">
                    <button class="btn" onclick="closePSAAkteModal()" style="background:#ccc; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">Schließen</button>
                </div>
            </div>
        </div>
    `;

    closePSAAkteModal();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closePSAAkteModal() {
    const existing = document.getElementById('psa-akte-modal');
    if (existing) existing.remove();
}

function speicherePSAStatus(id) {
    const psaListe = getPSA();
    const item = psaListe.find(p => p && p.id === id);
    if (!item) return;

    const neuerStatus = document.getElementById('psa-status-select').value;
    const alterStatus = item.status || 'Einsatzbereit';

    if (neuerStatus !== alterStatus) {
        item.status = neuerStatus;
        item.historie = Array.isArray(item.historie) ? item.historie : [];
        item.historie.push({
            datum: new Date().toISOString(),
            typ: 'Statusänderung',
            bemerkung: `Status geändert von "${alterStatus}" auf "${neuerStatus}".`,
            pruefer: 'System'
        });

        speicherePSA(psaListe);
        filterPSA();
        openPSAAkteModal(id);
    }
}

function addPSAHistorieEintrag(event, id) {
    event.preventDefault();
    const psaListe = getPSA();
    const item = psaListe.find(p => p && p.id === id);
    if (!item) return;

    item.historie = Array.isArray(item.historie) ? item.historie : [];
    item.historie.push({
        datum: new Date().toISOString(),
        typ: document.getElementById('hist-typ').value,
        pruefer: document.getElementById('hist-pruefer').value.trim(),
        bemerkung: document.getElementById('hist-bemerkung').value.trim()
    });

    speicherePSA(psaListe);
    filterPSA();
    openPSAAkteModal(id);
}

// 5. Modal zum Anlegen/Bearbeiten
function openPSAModal(id = null) {
    let item = { id: '', traeger: '', spind: '', hersteller: '', typ: '', bezeichnung: '', groesse: '', zubehoer: '', seriennummer: '', ausgabeDatum: '', naechstePruefung: '', status: 'Einsatzbereit' };

    if (id && id !== 'null' && id !== 'undefined') {
        const found = getPSA().find(p => p && p.id === id);
        if (found) item = found;
    }

    const safeId = escapeHtml(item.id);

    const modalHtml = `
        <div id="psa-modal" class="psa-modal-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
            <div style="background:#fff; padding:20px; border-radius:8px; width:90%; max-width:500px; max-height:90vh; overflow-y:auto;">
                <h3>${item.id ? '✏️ PSA bearbeiten' : '➕ PSA zuweisen / anlegen'}</h3>
                <form onsubmit="savePSAFromModal(event, '${safeId}')" style="display:flex; flex-direction:column; gap:10px; margin-top:15px;">
                    <div style="display:flex; gap:10px;">
                        <div style="flex:2;">
                            <label><strong>Name des Trägers *</strong></label>
                            <input type="text" id="psa-traeger" value="${escapeHtml(item.traeger || item.name)}" required style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. Max Mustermann">
                        </div>
                        <div style="flex:1;">
                            <label><strong>Spind-Nr.</strong></label>
                            <input type="text" id="psa-spind" value="${escapeHtml(item.spind)}" style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. 42">
                        </div>
                    </div>

                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label><strong>Hersteller</strong></label>
                            <input type="text" id="psa-hersteller" value="${escapeHtml(item.hersteller)}" style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. Rosenbauer">
                        </div>
                        <div style="flex:1;">
                            <label><strong>Typ / Modell</strong></label>
                            <input type="text" id="psa-typ" value="${escapeHtml(item.typ)}" style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. FIRE FIT II">
                        </div>
                    </div>

                    <div>
                        <label><strong>Ausrüstungsteil *</strong></label>
                        <input type="text" id="psa-bezeichnung" list="psa-ausruestung-liste" value="${escapeHtml(item.bezeichnung)}" required style="width:100%; padding:8px; margin-top:4px;" placeholder="Wählen oder eingeben...">
                        <datalist id="psa-ausruestung-liste">
                            <option value="Feuerwehrüberjacke">
                            <option value="Feuerwehrüberhose">
                            <option value="Feuerwehrhelm">
                            <option value="Feuerwehrstiefel">
                            <option value="Feuerwehrschutzhandschuhe">
                            <option value="Atemschutzmaske">
                            <option value="Feuerwehrhaltegurt">
                            <option value="Warnweste">
                            <option value="Dienstkleidung / Latzhose">
                        </datalist>
                    </div>

                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label><strong>Größe / Konfektion</strong></label>
                            <input type="text" id="psa-groesse" value="${escapeHtml(item.groesse)}" style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. 52/54 oder L">
                        </div>
                        <div style="flex:1;">
                            <label><strong>Serien- / Inventarnr.</strong></label>
                            <input type="text" id="psa-seriennummer" value="${escapeHtml(item.seriennummer)}" style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. PSA-102 (optional)">
                        </div>
                    </div>

                    <div>
                        <label><strong>Zubehör / Anbauteile</strong></label>
                        <input type="text" id="psa-zubehoer" value="${escapeHtml(item.zubehoer)}" style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. Nackenschutz, Helmleuchte">
                    </div>

                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label><strong>Ausgabedatum</strong></label>
                            <input type="date" id="psa-ausgabeDatum" value="${escapeHtml(item.ausgabeDatum)}" style="width:100%; padding:8px; margin-top:4px;">
                        </div>
                        <div style="flex:1;">
                            <label><strong>Nächste Prüfung</strong></label>
                            <input type="date" id="psa-naechstePruefung" value="${escapeHtml(item.naechstePruefung)}" style="width:100%; padding:8px; margin-top:4px;">
                        </div>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:15px;">
                        <button type="button" class="btn" onclick="closePSAModal()" style="background:#ccc; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">Abbrechen</button>
                        <button type="submit" class="btn btn-primary" style="background:#28a745; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">💾 Speichern</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    closePSAModal();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closePSAModal() {
    const existing = document.getElementById('psa-modal');
    if (existing) existing.remove();
}

function savePSAFromModal(event, existingId) {
    event.preventDefault();

    const psaListe = getPSA();
    const isEdit = Boolean(existingId && existingId !== 'null' && existingId !== 'undefined' && existingId.trim() !== '');
    const existingItem = isEdit ? (psaListe.find(p => p && p.id === existingId) || {}) : {};

    const traegerWert = document.getElementById('psa-traeger').value.trim();

    const newItem = {
        id: isEdit ? existingId : "PSA-" + Date.now(),
        traeger: traegerWert,
        name: traegerWert,
        spind: document.getElementById('psa-spind').value.trim(),
        hersteller: document.getElementById('psa-hersteller')?.value.trim() || '',
        typ: document.getElementById('psa-typ')?.value.trim() || '',
        bezeichnung: document.getElementById('psa-bezeichnung').value.trim(),
        kategorie: 'PSA',
        groesse: document.getElementById('psa-groesse').value.trim(),
        zubehoer: document.getElementById('psa-zubehoer')?.value.trim() || '',
        seriennummer: document.getElementById('psa-seriennummer').value.trim(),
        ausgabeDatum: document.getElementById('psa-ausgabeDatum').value,
        naechstePruefung: document.getElementById('psa-naechstePruefung').value,
        status: existingItem.status || 'Einsatzbereit',
        historie: Array.isArray(existingItem.historie) ? existingItem.historie : [],
        pruefungen: Array.isArray(existingItem.pruefungen) ? existingItem.pruefungen : []
    };

    if (isEdit) {
        const idx = psaListe.findIndex(p => p && p.id === existingId);
        if (idx !== -1) {
            psaListe[idx] = newItem;
        } else {
            psaListe.push(newItem);
        }
    } else {
        psaListe.push(newItem);
    }

    speicherePSA(psaListe);
    closePSAModal();
    renderPSAView();
}

function loeschePSA(id) {
    if (!confirm("Möchtest du diese PSA-Eintragung wirklich löschen?")) return;

    const psaListe = getPSA().filter(p => p && p.id !== id);
    speicherePSA(psaListe);
    renderPSAView();
}

// Globales Event für Keyboard Accessibility (Escape-Taste schließt Modale)
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closePSAModal();
        closePSAAkteModal();
    }
});

// Automatische Erkennung & Laden im DOM
const observer = new MutationObserver(() => {
    const tbody = document.getElementById('psa-tabelle-body');
    if (tbody && tbody.children.length === 0) {
        filterPSA();
    }
});
observer.observe(document.body, { childList: true, subtree: true });

function oeffnePSAModal(id = null) { openPSAModal(id); }
function ladePSA() { renderPSAView(); }

document.addEventListener("psaGeaendert", () => { filterPSA(); });
document.addEventListener("DOMContentLoaded", () => { renderPSAView(); });

// Globale Bereitstellung
window.renderPSAView = renderPSAView;
window.filterPSA = filterPSA;
window.openPSAModal = openPSAModal;
window.closePSAModal = closePSAModal;
window.savePSAFromModal = savePSAFromModal;
window.openPSAAkteModal = openPSAAkteModal;
window.closePSAAkteModal = closePSAAkteModal;
window.speicherePSAStatus = speicherePSAStatus;
window.addPSAHistorieEintrag = addPSAHistorieEintrag;
window.loeschePSA = loeschePSA;
window.exportPSACSV = exportPSACSV;
window.importPSACSV = importPSACSV;
window.exportPSAPDF = exportPSAPDF;
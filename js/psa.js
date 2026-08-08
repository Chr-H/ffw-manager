// ==========================================
// FFW Manager - PSA-Verwaltung mit Filter & PSA-Akte (v2.1.3)
// ==========================================

function getPSA() {
    const data = ladeDaten("psa");
    return Array.isArray(data) ? data : [];
}

function speicherePSA(psaListe) {
    speichereDaten('psa', psaListe);
    document.dispatchEvent(new Event("psaGeaendert"));
}

// Hilfsfunktion: Safe HTML Attribute & Text Escaping
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Hilfsfunktion: Datum formatieren & Überfälligkeit prüfen
function formatiereDatum(datumStr) {
    if (!datumStr) return '-';
    const d = new Date(datumStr);
    if (isNaN(d.getTime())) return '-';

    const heute = new Date();
    heute.setHours(0, 0, 0, 0);
    const formatted = d.toLocaleDateString("de-DE");

    if (d < heute) {
        return `<strong style="color:#c62828;" title="Prüfung überfällig!">⚠️ ${formatted}</strong>`;
    }
    return formatted;
}

// 1. Tabellenansicht mit Filterleiste rendern
function renderPSAView() {
    const container = document.getElementById('psa-container') || 
                      document.getElementById('psaContainer') || 
                      document.getElementById('psaListe') || 
                      document.getElementById('psa') || 
                      document.getElementById('main-content') || 
                      document.getElementById('content');

    if (!container) return;

    let html = `
        <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:10px;">
            <h2>🧑‍🚒 PSA-Verwaltung</h2>
            <button class="btn btn-primary" onclick="openPSAModal()">+ PSA ausgeben / anlegen</button>
        </div>

        <!-- Filter- & Suchleiste -->
        <div style="display:flex; gap:10px; margin-bottom:1rem; flex-wrap:wrap; background:#fff; padding:12px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <div style="flex:2; min-width:200px;">
                <input type="text" id="psa-filter-suche" oninput="filterPSA()" placeholder="🔍 Suche nach Name, Spind, Ausrüstung..." style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
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
            <table class="tabelle" style="width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background:#f4f6f8; text-align:left; border-bottom:2px solid #e0e0e0;">
                        <th style="padding:10px;">Aktionen</th>
                        <th style="padding:10px;">Spind</th>
                        <th style="padding:10px;">Träger</th>
                        <th style="padding:10px;">Ausrüstung</th>
                        <th style="padding:10px;">Größe</th>
                        <th style="padding:10px;">Status</th>
                        <th style="padding:10px;">Nächste Prüfung</th>
                    </tr>
                </thead>
                <tbody id="psa-tabelle-body">
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
    filterPSA();
}

// Live-Filterfunktion
function filterPSA() {
    let tbody = document.getElementById('psa-tabelle-body');
    
    if (!tbody) {
        renderPSAView();
        tbody = document.getElementById('psa-tabelle-body');
        if (!tbody) return;
    }

    const psaListe = getPSA();
    const SuchText = (document.getElementById('psa-filter-suche')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('psa-filter-status')?.value || '';

    const gefiltert = psaListe.filter(item => {
        if (!item) return false;
        const traeger = (item.traeger || item.name || '').toLowerCase();
        const spind = (item.spind || '').toLowerCase();
        const bezeichnung = (item.bezeichnung || '').toLowerCase();
        const seriennummer = (item.seriennummer || '').toLowerCase();
        const status = item.status || 'Einsatzbereit';

        const passtText = traeger.includes(SuchText) || 
                          spind.includes(SuchText) || 
                          bezeichnung.includes(SuchText) || 
                          seriennummer.includes(SuchText);

        const passtStatus = statusFilter === '' || status === statusFilter;

        return passtText && passtStatus;
    });

    if (gefiltert.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#666;">Keine passenden PSA-Einträge gefunden.</td></tr>`;
        return;
    }

    let rowsHtml = '';
    gefiltert.forEach(item => {
        const safeId = escapeHtml(item.id);
        const status = item.status || 'Einsatzbereit';
        
        let statusBadge = `<span style="background:#e8f5e9; color:#2e7d32; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.85rem;">🟢 Einsatzbereit</span>`;
        if (status === 'In Reinigung') {
            statusBadge = `<span style="background:#e3f2fd; color:#1565c0; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.85rem;">🧺 In Reinigung</span>`;
        } else if (status === 'Defekt') {
            statusBadge = `<span style="background:#ffebee; color:#c62828; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.85rem;">🔴 Defekt</span>`;
        } else if (status === 'Ausgemustert') {
            statusBadge = `<span style="background:#eee; color:#616161; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.85rem;">⚪ Ausgemustert</span>`;
        }

        rowsHtml += `
            <tr style="border-bottom:1px solid #eee; cursor:pointer;" onclick="openPSAAkteModal('${safeId}')">
                <td style="padding:8px 10px;" onclick="event.stopPropagation();">
                    <button class="btn btn-bearbeiten" title="Akte öffnen" onclick="openPSAAkteModal('${safeId}')">📂 Akte</button>
                    <button class="btn btn-bearbeiten" title="Bearbeiten" onclick="openPSAModal('${safeId}')">✏️</button>
                    <button class="btn btn-loeschen" title="Löschen" onclick="loeschePSA('${safeId}')">🗑️</button>
                </td>
                <td style="padding:10px;"><strong>${item.spind ? '🚪 ' + escapeHtml(item.spind) : '-'}</strong></td>
                <td style="padding:10px; font-weight:bold;">${escapeHtml(item.traeger || item.name || 'Unbekannt')}</td>
                <td style="padding:10px;">${escapeHtml(item.bezeichnung || '-')}</td>
                <td style="padding:10px;">${escapeHtml(item.groesse || '-')}</td>
                <td style="padding:10px;">${statusBadge}</td>
                <td style="padding:10px;">${formatiereDatum(item.naechstePruefung)}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
}

// 2. PSA-Akte (Detailansicht)
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
            const histDatum = h.datum ? new Date(h.datum).toLocaleDateString("de-DE") : '-';
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
        <div id="psa-akte-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
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
                        <button class="btn btn-primary" onclick="speicherePSAStatus('${safeId}')">Status aktualisieren</button>
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
                        <button type="submit" class="btn btn-primary" style="align-self:flex-end;">Eintrag speichern</button>
                    </form>
                </details>

                <!-- Historie Liste -->
                <h3>📜 Verlaufs- & Pflegehistorie</h3>
                <div style="max-height:200px; overflow-y:auto; border:1px solid #eee; padding:10px; border-radius:6px;">
                    ${historieHtml}
                </div>

                <div style="text-align:right; margin-top:15px;">
                    <button class="btn" onclick="closePSAAkteModal()" style="background:#ccc;">Schließen</button>
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

// 3. Modal zum Anlegen/Bearbeiten der Grunddaten
function openPSAModal(id = null) {
    let item = { id: '', traeger: '', spind: '', bezeichnung: '', groesse: '', seriennummer: '', ausgabeDatum: '', naechstePruefung: '', status: 'Einsatzbereit' };

    if (id && id !== 'null' && id !== 'undefined') {
        const found = getPSA().find(p => p && p.id === id);
        if (found) item = found;
    }

    const safeId = escapeHtml(item.id);

    const modalHtml = `
        <div id="psa-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
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
                            <input type="text" id="psa-seriennummer" value="${escapeHtml(item.seriennummer)}" style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. PSA-102">
                        </div>
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
                        <button type="button" class="btn" onclick="closePSAModal()" style="background:#ccc;">Abbrechen</button>
                        <button type="submit" class="btn btn-primary">💾 Speichern</button>
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
        bezeichnung: document.getElementById('psa-bezeichnung').value.trim(),
        kategorie: 'PSA',
        groesse: document.getElementById('psa-groesse').value.trim(),
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

// Aliase & Event-Listener
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
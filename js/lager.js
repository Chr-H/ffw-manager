// ==========================================
// FFW Manager - Lagerverwaltung (v1.1.0)
// ==========================================

function getLager() {
    return ladeDaten("lager") || [];
}

function speichereLager(lagerListe) {
    speichereDaten('lager', lagerListe);
    document.dispatchEvent(new Event("lagerGeaendert"));
}

// Hilfsfunktion: Escape von HTML-Sonderzeichen gegen XSS
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Hilfsfunktion: Datum formatierten
function formatiereDatum(datumStr) {
    if (!datumStr) return '-';
    const d = new Date(datumStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString("de-DE");
}

// 1. Tabellenansicht mit Such- & Filterleiste
function renderLagerView() {
    const container = document.getElementById('lager-container') || document.getElementById('lagerContainer') || document.getElementById('lagerListe');
    if (!container) return;

    let html = `
        <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:10px;">
            <h2>📦 Lagerverwaltung</h2>
            <button class="btn btn-primary" onclick="openLagerModal()">+ Material anlegen</button>
        </div>

        <!-- Filter- & Suchleiste -->
        <div style="display:flex; gap:10px; margin-bottom:1rem; flex-wrap:wrap; background:#fff; padding:12px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <div style="flex:2; min-width:200px;">
                <input type="text" id="lager-filter-suche" oninput="filterLager()" placeholder="🔍 Suche nach Artikel, Kategorie, Lagerort..." style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
            </div>
            <div style="flex:1; min-width:150px;">
                <select id="lager-filter-bestand" onchange="filterLager()" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                    <option value="">Alle Bestände anzeigen</option>
                    <option value="kritisch">⚠️ Mindestbestand unterschritten</option>
                    <option value="ok">🟢 Bestand ausreichend</option>
                </select>
            </div>
        </div>

        <!-- Tabelle -->
        <div style="overflow-x:auto;">
            <table class="tabelle" style="width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background:#f4f6f8; text-align:left; border-bottom:2px solid #e0e0e0;">
                        <th style="padding:10px;">Aktionen</th>
                        <th style="padding:10px;">Artikelbezeichnung</th>
                        <th style="padding:10px;">Kategorie</th>
                        <th style="padding:10px;">Lagerort</th>
                        <th style="padding:10px;">Bestand</th>
                        <th style="padding:10px;">Mindestbestand</th>
                        <th style="padding:10px;">Status</th>
                    </tr>
                </thead>
                <tbody id="lager-tabelle-body">
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
    filterLager();
}

// Live-Filterfunktion
function filterLager() {
    const tbody = document.getElementById('lager-tabelle-body');
    if (!tbody) return;

    const lagerListe = getLager();
    const SuchText = (document.getElementById('lager-filter-suche')?.value || '').toLowerCase().trim();
    const bestandFilter = document.getElementById('lager-filter-bestand')?.value || '';

    const gefiltert = lagerListe.filter(item => {
        const bezeichnung = (item.bezeichnung || '').toLowerCase();
        const kategorie = (item.kategorie || '').toLowerCase();
        const lagerort = (item.lagerort || '').toLowerCase();
        const artikelnr = (item.artikelnr || '').toLowerCase();

        const passtText = bezeichnung.includes(SuchText) || 
                          kategorie.includes(SuchText) || 
                          lagerort.includes(SuchText) ||
                          artikelnr.includes(SuchText);

        const istKritisch = Number(item.bestand || 0) <= Number(item.mindestbestand || 0);
        const passtBestand = bestandFilter === '' || 
                            (bestandFilter === 'kritisch' && istKritisch) || 
                            (bestandFilter === 'ok' && !istKritisch);

        return passtText && passtBestand;
    });

    if (gefiltert.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#666;">Keine passenden Lagerartikel gefunden.</td></tr>`;
        return;
    }

    let rowsHtml = '';
    gefiltert.forEach(item => {
        const bestand = Number(item.bestand || 0);
        const mindestbestand = Number(item.mindestbestand || 0);
        const einheit = escapeHtml(item.einheit || 'Stk.');

        const istKritisch = bestand <= mindestbestand;
        const statusBadge = istKritisch 
            ? `<span style="background:#ffebee; color:#c62828; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.85rem;">⚠️ Nachbestellen</span>`
            : `<span style="background:#e8f5e9; color:#2e7d32; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.85rem;">🟢 Ausreichend</span>`;

        const bestandStyle = istKritisch ? 'color:#c62828; font-weight:bold;' : 'font-weight:bold;';

        rowsHtml += `
            <tr style="border-bottom:1px solid #eee; cursor:pointer;" onclick="openLagerAkteModal('${item.id}')">
                <td style="padding:8px 10px;" onclick="event.stopPropagation();">
                    <button class="btn btn-bearbeiten" title="Akte öffnen" onclick="openLagerAkteModal('${item.id}')">📂 Akte</button>
                    <button class="btn btn-bearbeiten" title="Bearbeiten" onclick="openLagerModal('${item.id}')">✏️</button>
                    <button class="btn btn-loeschen" title="Löschen" onclick="loescheLagerItem('${item.id}')">🗑️</button>
                </td>
                <td style="padding:10px; font-weight:bold;">${escapeHtml(item.bezeichnung || 'Unbekannt')}</td>
                <td style="padding:10px;">${escapeHtml(item.kategorie || '-')}</td>
                <td style="padding:10px;">📍 ${escapeHtml(item.lagerort || '-')}</td>
                <td style="padding:10px; font-size:1.05rem; ${bestandStyle}">${bestand} ${einheit}</td>
                <td style="padding:10px; color:#666;">${mindestbestand} ${einheit}</td>
                <td style="padding:10px;">${statusBadge}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
}

// 2. Lager-Akte (Detailansicht mit Schnellbuchung & Historie)
function openLagerAkteModal(id) {
    const item = getLager().find(l => l.id === id);
    if (!item) return;

    item.historie = item.historie || [];
    const einheit = escapeHtml(item.einheit || 'Stk.');

    let historieHtml = '';
    if (item.historie.length === 0) {
        historieHtml = '<p style="color:#777; font-style:italic;">Bisher keine Buchungen vorhanden.</p>';
    } else {
        historieHtml = '<ul style="list-style:none; padding:0; margin:0;">';
        item.historie.slice().reverse().forEach(h => {
            const artColor = h.menge > 0 ? '#2e7d32' : '#c62828';
            const artSign = h.menge > 0 ? '+' : '';
            historieHtml += `
                <li style="border-left:3px solid ${artColor}; padding-left:10px; margin-bottom:10px; background:#f9f9f9; padding:8px; border-radius:0 4px 4px 0;">
                    <div style="display:flex; justify-content:space-between;">
                        <span style="font-size:0.85rem; color:#666;">📅 ${formatiereDatum(h.datum)} - <strong>${escapeHtml(h.bearbeiter || 'Unbekannt')}</strong></span>
                        <strong style="color:${artColor};">${artSign}${h.menge} ${einheit}</strong>
                    </div>
                    <div style="margin-top:2px;">${escapeHtml(h.bemerkung || 'Keine Bemerkung')}</div>
                </li>
            `;
        });
        historieHtml += '</ul>';
    }

    const modalHtml = `
        <div id="lager-akte-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
            <div style="background:#fff; padding:20px; border-radius:8px; width:92%; max-width:650px; max-height:90vh; overflow-y:auto;">
                
                <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #ddd; padding-bottom:10px;">
                    <div>
                        <h2 style="margin:0;">📦 Lagerakte: ${escapeHtml(item.bezeichnung)}</h2>
                        <p style="margin:5px 0 0 0; color:#555;">Kategorie: <strong>${escapeHtml(item.kategorie || 'Keine')}</strong> | Lagerort: <strong>${escapeHtml(item.lagerort || 'Nicht angegeben')}</strong></p>
                    </div>
                    <button onclick="closeLagerAkteModal()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">✖</button>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:15px 0; background:#f8f9fa; padding:12px; border-radius:6px;">
                    <div><strong>Aktueller Bestand:</strong> <span style="font-size:1.1rem; font-weight:bold;">${item.bestand || 0} ${einheit}</span></div>
                    <div><strong>Mindestbestand:</strong> ${item.mindestbestand || 0} ${einheit}</div>
                    <div><strong>Lieferant / Quelle:</strong> ${escapeHtml(item.lieferant || '-')}</div>
                    <div><strong>Artikel- / EAN-Nr.:</strong> ${escapeHtml(item.artikelnr || '-')}</div>
                </div>

                <!-- Schnellbuchung (Zugang / Abgang) -->
                <div style="margin-bottom:20px; background:#eef2f5; padding:12px; border-radius:6px;">
                    <label><strong>⚡ Schnellbuchung (Bestand ändern):</strong></label>
                    <form onsubmit="bucheLagerBestand(event, '${item.id}')" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
                        <div style="display:flex; gap:10px;">
                            <select id="buchung-art" style="width:120px; padding:6px;">
                                <option value="abgang">➖ Entnahme</option>
                                <option value="zugang">➕ Zugang</option>
                            </select>
                            <input type="number" id="buchung-menge" placeholder="Menge" min="0.01" step="any" required style="width:100px; padding:6px;">
                            <input type="text" id="buchung-bearbeiter" placeholder="Name / Handzeichen" style="flex:1; padding:6px;">
                        </div>
                        <input type="text" id="buchung-bemerkung" placeholder="Grund / Verwendungszweck (z. B. Übung, Einsatz 12)" style="width:100%; padding:6px;">
                        <button type="submit" class="btn btn-primary" style="align-self:flex-end;">Buchung durchführen</button>
                    </form>
                </div>

                <!-- Historie Liste -->
                <h3>📜 Buchungshistorie</h3>
                <div style="max-height:200px; overflow-y:auto; border:1px solid #eee; padding:10px; border-radius:6px;">
                    ${historieHtml}
                </div>

                <div style="text-align:right; margin-top:15px;">
                    <button class="btn" onclick="closeLagerAkteModal()" style="background:#ccc;">Schließen</button>
                </div>
            </div>
        </div>
    `;

    closeLagerAkteModal();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeLagerAkteModal() {
    const existing = document.getElementById('lager-akte-modal');
    if (existing) existing.remove();
}

// Bestand buchen
function bucheLagerBestand(event, id) {
    event.preventDefault();
    const lagerListe = getLager();
    const item = lagerListe.find(l => l.id === id);
    if (!item) return;

    const art = document.getElementById('buchung-art').value;
    const mengeInput = parseFloat(document.getElementById('buchung-menge').value) || 0;
    const bearbeiter = document.getElementById('buchung-bearbeiter').value.trim();
    const bemerkung = document.getElementById('buchung-bemerkung').value.trim();

    if (mengeInput <= 0) return;

    const effMenge = art === 'abgang' ? -mengeInput : mengeInput;
    const neuerBestand = Math.max(0, parseFloat(item.bestand || 0) + effMenge);

    item.bestand = neuerBestand;
    item.historie = item.historie || [];
    item.historie.push({
        datum: new Date().toISOString(),
        menge: effMenge,
        bearbeiter: bearbeiter || 'System',
        bemerkung: bemerkung || (art === 'zugang' ? 'Manueller Zugang' : 'Manuelle Entnahme')
    });

    speichereLager(lagerListe);
    filterLager();
    openLagerAkteModal(id);
}

// 3. Modal zum Anlegen/Bearbeiten von Lagerartikeln
function openLagerModal(id = null) {
    let item = { id: '', bezeichnung: '', kategorie: '', lagerort: '', bestand: 0, mindestbestand: 0, einheit: 'Stk.', lieferant: '', artikelnr: '' };

    if (id) {
        const found = getLager().find(l => l.id === id);
        if (found) item = found;
    }

    const modalHtml = `
        <div id="lager-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
            <div style="background:#fff; padding:20px; border-radius:8px; width:90%; max-width:500px; max-height:90vh; overflow-y:auto;">
                <h3>${item.id ? '✏️ Lagerartikel bearbeiten' : '➕ Neuer Lagerartikel'}</h3>
                <form onsubmit="saveLagerFromModal(event, '${item.id}')" style="display:flex; flex-direction:column; gap:10px; margin-top:15px;">
                    <div>
                        <label><strong>Artikelbezeichnung *</strong></label>
                        <input type="text" id="lager-bezeichnung" value="${escapeHtml(item.bezeichnung)}" required style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. Ölbindemittel, O2-Flasche, Schaummittel">
                    </div>
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label><strong>Kategorie</strong></label>
                            <input type="text" id="lager-kategorie" list="lager-kategorie-liste" value="${escapeHtml(item.kategorie)}" style="width:100%; padding:8px; margin-top:4px;" placeholder="Wählen oder eingeben...">
                            <datalist id="lager-kategorie-liste">
                                <option value="Verbrauchsmaterial">
                                <option value="Atemschutz">
                                <option value="Medizinisch">
                                <option value="Ölbeseitigung">
                                <option value="Schläuche / Armaturen">
                                <option value="Werkzeug">
                            </datalist>
                        </div>
                        <div style="flex:1;">
                            <label><strong>Lagerort</strong></label>
                            <input type="text" id="lager-lagerort" value="${escapeHtml(item.lagerort)}" style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. Regal A3, Fach 2">
                        </div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label><strong>Aktueller Bestand</strong></label>
                            <input type="number" step="any" id="lager-bestand" value="${item.bestand ?? 0}" style="width:100%; padding:8px; margin-top:4px;">
                        </div>
                        <div style="flex:1;">
                            <label><strong>Mindestbestand</strong></label>
                            <input type="number" step="any" id="lager-mindestbestand" value="${item.mindestbestand ?? 0}" style="width:100%; padding:8px; margin-top:4px;">
                        </div>
                        <div style="flex:1;">
                            <label><strong>Einheit</strong></label>
                            <select id="lager-einheit" style="width:100%; padding:8px; margin-top:4px;">
                                <option value="Stk." ${item.einheit === 'Stk.' ? 'selected' : ''}>Stk.</option>
                                <option value="Sack" ${item.einheit === 'Sack' ? 'selected' : ''}>Sack</option>
                                <option value="Kanister" ${item.einheit === 'Kanister' ? 'selected' : ''}>Kanister</option>
                                <option value="Liter" ${item.einheit === 'Liter' ? 'selected' : ''}>Liter</option>
                                <option value="Karton" ${item.einheit === 'Karton' ? 'selected' : ''}>Karton</option>
                                <option value="Pck." ${item.einheit === 'Pck.' ? 'selected' : ''}>Pck.</option>
                            </select>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label><strong>Lieferant / Bezugsquelle</strong></label>
                            <input type="text" id="lager-lieferant" value="${escapeHtml(item.lieferant)}" style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. Feuerwehrbedarf Mustermann">
                        </div>
                        <div style="flex:1;">
                            <label><strong>Artikel- / Inv.-Nr.</strong></label>
                            <input type="text" id="lager-artikelnr" value="${escapeHtml(item.artikelnr)}" style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. MAT-501">
                        </div>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:15px;">
                        <button type="button" class="btn" onclick="closeLagerModal()" style="background:#ccc;">Abbrechen</button>
                        <button type="submit" class="btn btn-primary">💾 Speichern</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    closeLagerModal();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeLagerModal() {
    const existing = document.getElementById('lager-modal');
    if (existing) existing.remove();
}

function saveLagerFromModal(event, existingId) {
    event.preventDefault();

    const lagerListe = getLager();
    const existingItem = lagerListe.find(l => l.id === existingId) || {};

    const newItem = {
        id: existingId || "LAGER-" + Date.now(),
        bezeichnung: document.getElementById('lager-bezeichnung').value.trim(),
        kategorie: document.getElementById('lager-kategorie').value.trim(),
        lagerort: document.getElementById('lager-lagerort').value.trim(),
        bestand: parseFloat(document.getElementById('lager-bestand').value) || 0,
        mindestbestand: parseFloat(document.getElementById('lager-mindestbestand').value) || 0,
        einheit: document.getElementById('lager-einheit').value,
        lieferant: document.getElementById('lager-lieferant').value.trim(),
        artikelnr: document.getElementById('lager-artikelnr').value.trim(),
        historie: existingItem.historie || []
    };

    if (existingId) {
        const idx = lagerListe.findIndex(l => l.id === existingId);
        if (idx !== -1) lagerListe[idx] = newItem;
    } else {
        lagerListe.push(newItem);
    }

    speichereLager(lagerListe);
    closeLagerModal();
    filterLager();
}

function loescheLagerItem(id) {
    if (!confirm("Möchtest du diesen Lagerartikel wirklich löschen?")) return;

    const lagerListe = getLager().filter(l => l.id !== id);
    speichereLager(lagerListe);
    filterLager();
}

// ==========================================
// ALIASE & KOMPATIBILITÄT
// ==========================================
function ladeLager() {
    renderLagerView();
}

document.addEventListener("DOMContentLoaded", () => {
    renderLagerView();
});
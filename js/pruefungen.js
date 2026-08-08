// ==========================================
// FFW Manager - Prüfungsverwaltung (v1.0.0)
// ==========================================

function getPruefungen() {
    return ladeDaten("pruefungen") || [];
}

function speicherePruefungen(liste) {
    speichereDaten('pruefungen', liste);
    document.dispatchEvent(new Event("pruefungenGeaendert"));
}

// 1. Hauptansicht für Prüfungen rendern
function renderPruefungenView() {
    const container = document.getElementById('pruefungen-container') || document.getElementById('pruefungenContainer') || document.getElementById('seite-pruefungen');
    if (!container) return;

    let html = `
        <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:10px;">
            <h2>📋 Prüfungsübersicht & Termine</h2>
            <button class="btn btn-primary" onclick="openPruefungModal()">+ Neue Prüfung anlegen</button>
        </div>

        <div style="display:flex; gap:10px; margin-bottom:1rem; flex-wrap:wrap; background:#fff; padding:12px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <div style="flex:2; min-width:200px;">
                <input type="text" id="pruefung-filter-suche" oninput="filterPruefungen()" placeholder="🔍 Suche nach Objekt, Prüfer, Art..." style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
            </div>
        </div>

        <div style="overflow-x:auto;">
            <table class="tabelle" style="width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background:#f4f6f8; text-align:left; border-bottom:2px solid #e0e0e0;">
                        <th style="padding:10px;">Aktionen</th>
                        <th style="padding:10px;">Gegenstand / Objekt</th>
                        <th style="padding:10px;">Prüfart</th>
                        <th style="padding:10px;">Prüfdatum</th>
                        <th style="padding:10px;">Nächste Prüfung</th>
                        <th style="padding:10px;">Prüfer</th>
                        <th style="padding:10px;">Ergebnis</th>
                    </tr>
                </thead>
                <tbody id="pruefungen-tabelle-body">
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
    filterPruefungen();
}

// 2. Filter- & Tabellenfunktion
function filterPruefungen() {
    const tbody = document.getElementById('pruefungen-tabelle-body');
    if (!tbody) return;

    const liste = getPruefungen();
    const suchText = (document.getElementById('pruefung-filter-suche')?.value || '').toLowerCase().trim();

    const gefiltert = liste.filter(item => {
        const objekt = (item.objekt || '').toLowerCase();
        const art = (item.art || '').toLowerCase();
        const pruefer = (item.pruefer || '').toLowerCase();
        return objekt.includes(suchText) || art.includes(suchText) || pruefer.includes(suchText);
    });

    if (gefiltert.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#666;">Keine Prüfungen eingetragen.</td></tr>`;
        return;
    }

    let rowsHtml = '';
    gefiltert.forEach(item => {
        let statusBadge = `<span style="background:#e8f5e9; color:#2e7d32; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.85rem;">🟢 Bestanden</span>`;
        if (item.ergebnis === 'Mängel') {
            statusBadge = `<span style="background:#fff3e0; color:#e65100; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.85rem;">⚠️ Mängel</span>`;
        } else if (item.ergebnis === 'Nicht bestanden') {
            statusBadge = `<span style="background:#ffebee; color:#c62828; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.85rem;">🔴 Nicht bestanden</span>`;
        }

        rowsHtml += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px 10px;">
                    <button class="btn btn-bearbeiten" title="Bearbeiten" onclick="openPruefungModal('${item.id}')">✏️</button>
                    <button class="btn btn-loeschen" title="Löschen" onclick="loeschePruefung('${item.id}')">🗑️</button>
                </td>
                <td style="padding:10px;"><strong>${item.objekt || '-'}</strong></td>
                <td style="padding:10px;">${item.art || '-'}</td>
                <td style="padding:10px;">${item.datum ? new Date(item.datum).toLocaleDateString("de-DE") : '-'}</td>
                <td style="padding:10px;">${item.naechstePruefung ? new Date(item.naechstePruefung).toLocaleDateString("de-DE") : '-'}</td>
                <td style="padding:10px;">${item.pruefer || '-'}</td>
                <td style="padding:10px;">${statusBadge}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
}

// 3. Modal für Prüfungen
function openPruefungModal(id = null) {
    let item = { id: '', objekt: '', art: 'Sichtprüfung', datum: new Date().toISOString().split('T')[0], naechstePruefung: '', pruefer: '', ergebnis: 'Bestanden', bemerkung: '' };

    if (id) {
        const found = getPruefungen().find(p => p.id === id);
        if (found) item = found;
    }

    const modalHtml = `
        <div id="pruefung-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
            <div style="background:#fff; padding:20px; border-radius:8px; width:90%; max-width:500px; max-height:90vh; overflow-y:auto;">
                <h3>${item.id ? '✏️ Prüfung bearbeiten' : '➕ Neue Prüfung eintragen'}</h3>
                <form onsubmit="savePruefungFromModal(event, '${item.id}')" style="display:flex; flex-direction:column; gap:10px; margin-top:15px;">
                    <div>
                        <label><strong>Gegenstand / Objekt *</strong></label>
                        <input type="text" id="pruef-objekt" value="${item.objekt || ''}" required style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. TS 8/8 oder Atemschutzmaske #12">
                    </div>
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label><strong>Prüfart</strong></label>
                            <select id="pruef-art" style="width:100%; padding:8px; margin-top:4px;">
                                <option value="Sichtprüfung" ${item.art === 'Sichtprüfung' ? 'selected' : ''}>Sichtprüfung</option>
                                <option value="Funktionsprüfung" ${item.art === 'Funktionsprüfung' ? 'selected' : ''}>Funktionsprüfung</option>
                                <option value="Jahresprüfung" ${item.art === 'Jahresprüfung' ? 'selected' : ''}>Jahresprüfung</option>
                                <option value="DGUV V3" ${item.art === 'DGUV V3' ? 'selected' : ''}>DGUV V3</option>
                            </select>
                        </div>
                        <div style="flex:1;">
                            <label><strong>Ergebnis</strong></label>
                            <select id="pruef-ergebnis" style="width:100%; padding:8px; margin-top:4px;">
                                <option value="Bestanden" ${item.ergebnis === 'Bestanden' ? 'selected' : ''}>🟢 Bestanden</option>
                                <option value="Mängel" ${item.ergebnis === 'Mängel' ? 'selected' : ''}>⚠️ Mängel</option>
                                <option value="Nicht bestanden" ${item.ergebnis === 'Nicht bestanden' ? 'selected' : ''}>🔴 Nicht bestanden</option>
                            </select>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label><strong>Prüfdatum</strong></label>
                            <input type="date" id="pruef-datum" value="${item.datum || ''}" required style="width:100%; padding:8px; margin-top:4px;">
                        </div>
                        <div style="flex:1;">
                            <label><strong>Nächste Prüfung</strong></label>
                            <input type="date" id="pruef-naechstePruefung" value="${item.naechstePruefung || ''}" style="width:100%; padding:8px; margin-top:4px;">
                        </div>
                    </div>
                    <div>
                        <label><strong>Prüfer / Sachkundiger</strong></label>
                        <input type="text" id="pruef-pruefer" value="${item.pruefer || ''}" style="width:100%; padding:8px; margin-top:4px;" placeholder="Name des Prüfers">
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:15px;">
                        <button type="button" class="btn" onclick="closePruefungModal()" style="background:#ccc;">Abbrechen</button>
                        <button type="submit" class="btn btn-primary">💾 Speichern</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    closePruefungModal();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closePruefungModal() {
    const existing = document.getElementById('pruefung-modal');
    if (existing) existing.remove();
}

function savePruefungFromModal(event, existingId) {
    event.preventDefault();

    const liste = getPruefungen();
    const newItem = {
        id: existingId || "PRUEF-" + Date.now(),
        objekt: document.getElementById('pruef-objekt').value.trim(),
        art: document.getElementById('pruef-art').value,
        ergebnis: document.getElementById('pruef-ergebnis').value,
        datum: document.getElementById('pruef-datum').value,
        naechstePruefung: document.getElementById('pruef-naechstePruefung').value,
        pruefer: document.getElementById('pruef-pruefer').value.trim()
    };

    if (existingId) {
        const idx = liste.findIndex(p => p.id === existingId);
        if (idx !== -1) liste[idx] = newItem;
    } else {
        liste.push(newItem);
    }

    speicherePruefungen(liste);
    closePruefungModal();
    filterPruefungen();
}

function loeschePruefung(id) {
    if (!confirm("Möchtest du diesen Prüfungseintrag wirklich löschen?")) return;
    const liste = getPruefungen().filter(p => p.id !== id);
    speicherePruefungen(liste);
    filterPruefungen();
}

// Aliase für app.js
function ladePruefungen() {
    renderPruefungenView();
}

function oeffnePruefungModal(id = null) {
    openPruefungModal(id);
}

document.addEventListener("DOMContentLoaded", () => {
    renderPruefungenView();
});
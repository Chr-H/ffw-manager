// ==========================================
// FFW Manager - Prüfungsverwaltung (v1.3.0 KORRIGIERT)
// ==========================================

/**
 * Aktuelle Benutzerrolle aus allen verfügbaren Quellen ermitteln
 */
function holePruefungUserRolle() {
    try {
        const user = JSON.parse(
            localStorage.getItem('ffw_aktiver_benutzer') || 
            localStorage.getItem('ffw_user') || 
            sessionStorage.getItem('ffw_user') || '{}'
        );
        const rolle = localStorage.getItem('ffw_aktive_rolle') || user.rolle || 'gast';
        return String(rolle).toLowerCase().trim();
    } catch (e) {
        return 'gast';
    }
}

/**
 * Leserechte prüfen (Gast = kein Zugriff; Viewer, Editor, Admin = Zugriff)
 */
function hatPruefungLeseRecht() {
    const rolle = holePruefungUserRolle();
    return ['viewer', 'editor', 'admin'].includes(rolle);
}

/**
 * Zentrale Rechteprüfung für Schreibrechte im Prüfungsmodul (nur Editor & Admin)
 */
function hatPruefungSchreibRecht() {
    if (typeof window.hatRecht === "function") {
        if (window.hatRecht('pruefungen_schreiben')) return true;
    }
    const rolle = holePruefungUserRolle();
    return ['editor', 'admin'].includes(rolle);
}

function getPruefungen() {
    // Falls Gast: Gar keine Prüfungsdaten zurückliefern
    if (!hatPruefungLeseRecht()) {
        return [];
    }
    const data = ladeDaten("pruefungen");
    return Array.isArray(data) ? data : [];
}

function speicherePruefungen(liste) {
    if (!hatPruefungSchreibRecht()) {
        alert("⚠️ Keine Berechtigung zum Speichern vorhanden!");
        return false;
    }
    speichereDaten('pruefungen', liste);
    document.dispatchEvent(new Event("pruefungenGeaendert"));
    return true;
}
// Safe HTML Escaping gegen XSS-Lücken
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Zeitzonen-sichere Datumsformatierung inkl. Überfälligkeitswarnung
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

// 1. Hauptansicht für Prüfungen rendern (MIT RECHTE-SCHUTZ)
function renderPruefungenView() {
    const container = document.getElementById('pruefungen-container') || 
                      document.getElementById('pruefungenContainer') || 
                      document.getElementById('seite-pruefungen') ||
                      document.getElementById('main-content') ||
                      document.getElementById('content');

    if (!container) return;

    // 1. GAST-CHECK: Gäste komplett aussperren
    if (!hatPruefungLeseRecht()) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: #fff; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-top: 20px;">
                <h2 style="color: #721c24;">🔒 Zugriff verweigert</h2>
                <p style="color: #721c24; margin-top: 10px;">
                    Als <strong>Gast</strong> hast du keine Berechtigung, die Prüfungsübersicht einzusehen.
                </p>
            </div>`;
        return;
    }

    const darfSchreiben = hatPruefungSchreibRecht();

    container.innerHTML = `
        <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:10px;">
            <h2>📋 Prüfungsübersicht & Termine</h2>
            <div style="display:flex; gap:10px; align-items:center;">
                <button class="btn btn-secondary" onclick="exportPruefungenCSV()">📊 CSV Export</button>
                ${darfSchreiben ? `
                    <button class="btn btn-primary" onclick="openPruefungModal()">+ Neue Prüfung anlegen</button>
                ` : `
                    <span style="color: #666; font-style: italic; font-size: 0.9em;">🔒 Schreibgeschützt (Viewer)</span>
                `}
            </div>
        </div>

        <!-- Filter- & Suchleiste -->
        <div style="display:flex; gap:10px; margin-bottom:1rem; flex-wrap:wrap; background:#fff; padding:12px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <div style="flex:2; min-width:200px;">
                <input type="text" id="pruefung-filter-suche" oninput="filterPruefungen()" placeholder="🔍 Suche nach Objekt, Prüfer, Art..." style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
            </div>
            <div style="flex:1; min-width:150px;">
                <select id="pruefung-filter-ergebnis" onchange="filterPruefungen()" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                    <option value="">Alle Ergebnisse anzeigen</option>
                    <option value="Bestanden">🟢 Bestanden</option>
                    <option value="Mängel">⚠️ Mängel</option>
                    <option value="Nicht bestanden">🔴 Nicht bestanden</option>
                </select>
            </div>
        </div>

        <!-- Tabelle -->
        <div style="overflow-x:auto;">
            <table class="tabelle" style="width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background:#f4f6f8; text-align:left; border-bottom:2px solid #e0e0e0;">
                        ${darfSchreiben ? `<th style="padding:10px;">Aktionen</th>` : ''}
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

    filterPruefungen();
}

// 2. Filter- & Tabellenfunktion
function filterPruefungen() {
    let tbody = document.getElementById('pruefungen-tabelle-body');
    if (!tbody) {
        renderPruefungenView();
        tbody = document.getElementById('pruefungen-tabelle-body');
        if (!tbody) return;
    }

    const darfSchreiben = hatPruefungSchreibRecht();
    const liste = getPruefungen();
    const suchText = (document.getElementById('pruefung-filter-suche')?.value || '').toLowerCase().trim();
    const ergebnisFilter = document.getElementById('pruefung-filter-ergebnis')?.value || '';

    const gefiltert = liste.filter(item => {
        if (!item) return false;

        const objekt = (item.objekt || '').toLowerCase();
        const art = (item.art || '').toLowerCase();
        const pruefer = (item.pruefer || '').toLowerCase();
        const ergebnis = item.ergebnis || 'Bestanden';

        const passtText = objekt.includes(suchText) || art.includes(suchText) || pruefer.includes(suchText);
        const passtErgebnis = ergebnisFilter === '' || ergebnis === ergebnisFilter;

        return passtText && passtErgebnis;
    });

    const spaltenAnzahl = darfSchreiben ? 7 : 6;

    if (gefiltert.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${spaltenAnzahl}" style="text-align:center; padding:20px; color:#666;">Keine passenden Prüfungen eingetragen.</td></tr>`;
        return;
    }

    let rowsHtml = '';
    gefiltert.forEach(item => {
        const safeId = escapeHtml(item.id);

        let statusBadge = `<span style="background:#e8f5e9; color:#2e7d32; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.85rem;">🟢 Bestanden</span>`;
        if (item.ergebnis === 'Mängel') {
            statusBadge = `<span style="background:#fff3e0; color:#e65100; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.85rem;">⚠️ Mängel</span>`;
        } else if (item.ergebnis === 'Nicht bestanden') {
            statusBadge = `<span style="background:#ffebee; color:#c62828; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.85rem;">🔴 Nicht bestanden</span>`;
        }

        rowsHtml += `
            <tr style="border-bottom:1px solid #eee;">
                ${darfSchreiben ? `
                    <td style="padding:8px 10px; white-space:nowrap;">
                        <button class="btn btn-bearbeiten" title="Bearbeiten" onclick="openPruefungModal('${safeId}')">✏️</button>
                        <button class="btn btn-loeschen" title="Löschen" onclick="loeschePruefung('${safeId}')">🗑️</button>
                    </td>
                ` : ''}
                <td style="padding:10px;"><strong>${escapeHtml(item.objekt || '-')}</strong></td>
                <td style="padding:10px;">${escapeHtml(item.art || '-')}</td>
                <td style="padding:10px;">${formatiereDatum(item.datum)}</td>
                <td style="padding:10px;">${formatiereDatum(item.naechstePruefung)}</td>
                <td style="padding:10px;">${escapeHtml(item.pruefer || '-')}</td>
                <td style="padding:10px;">${statusBadge}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
}

// 3. Modal für Prüfungen
function openPruefungModal(id = null) {
    if (!hatPruefungSchreibRecht()) {
        alert("⚠️ Sie besitzen nur Leserechte und können keine Prüfungen anlegen oder bearbeiten.");
        return;
    }

    let item = { 
        id: '', 
        geraetId: '',
        objekt: '', 
        art: 'Sichtprüfung', 
        datum: new Date().toISOString().split('T')[0], 
        naechstePruefung: '', 
        pruefer: '', 
        ergebnis: 'Bestanden' 
    };

    if (id && id !== 'null' && id !== 'undefined') {
        const found = getPruefungen().find(p => p && p.id === id);
        if (found) item = found;
    }

    const geraeteListe = typeof window.getGeraete === 'function' ? window.getGeraete() : (ladeDaten("geraete") || []);
    let geraeteOptions = '<option value="">-- Manuelle Eingabe / Kein Gerät --</option>';
    geraeteListe.forEach(g => {
        const sel = item.geraetId === g.id ? 'selected' : '';
        geraeteOptions += `<option value="${escapeHtml(g.id)}" ${sel}>${escapeHtml(g.inventarnummer)} - ${escapeHtml(g.bezeichnung)}</option>`;
    });

    const safeId = escapeHtml(item.id);

    const modalHtml = `
        <div id="pruefung-modal" class="psa-modal-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
            <div style="background:#fff; padding:20px; border-radius:8px; width:90%; max-width:500px; max-height:90vh; overflow-y:auto;">
                <h3>${item.id ? '✏️ Prüfung bearbeiten' : '➕ Neue Prüfung eintragen'}</h3>
                <form onsubmit="savePruefungFromModal(event, '${safeId}')" style="display:flex; flex-direction:column; gap:10px; margin-top:15px;">
                    
                    <div>
                        <label><strong>Verknüpftes Gerät (Optional)</strong></label>
                        <select id="pruef-geraetId" onchange="waehleGeraetAus(this.value)" style="width:100%; padding:8px; margin-top:4px;">
                            ${geraeteOptions}
                        </select>
                    </div>

                    <div>
                        <label><strong>Gegenstand / Objekt *</strong></label>
                        <input type="text" id="pruef-objekt" value="${escapeHtml(item.objekt)}" required style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. TS 8/8 oder Atemschutzmaske #12">
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
                            <label><strong>Prüfdatum *</strong></label>
                            <input type="date" id="pruef-datum" value="${escapeHtml(item.datum)}" required onchange="berechneAutoNaechstePruefung()" style="width:100%; padding:8px; margin-top:4px;">
                        </div>
                        <div style="flex:1;">
                            <label><strong>Nächste Prüfung</strong></label>
                            <input type="date" id="pruef-naechstePruefung" value="${escapeHtml(item.naechstePruefung)}" style="width:100%; padding:8px; margin-top:4px;">
                        </div>
                    </div>

                    <div>
                        <label><strong>Prüfer / Sachkundiger</strong></label>
                        <input type="text" id="pruef-pruefer" value="${escapeHtml(item.pruefer)}" style="width:100%; padding:8px; margin-top:4px;" placeholder="Name des Prüfers">
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

function waehleGeraetAus(geraetId) {
    if (!geraetId) return;
    const geraete = typeof window.getGeraete === 'function' ? window.getGeraete() : (ladeDaten("geraete") || []);
    const g = geraete.find(item => item.id === geraetId);
    if (g) {
        const objInput = document.getElementById('pruef-objekt');
        if (objInput) objInput.value = `${g.inventarnummer} - ${g.bezeichnung}`;
        berechneAutoNaechstePruefung();
    }
}

function berechneAutoNaechstePruefung() {
    const geraetId = document.getElementById('pruef-geraetId')?.value;
    const datumVal = document.getElementById('pruef-datum')?.value;
    const naechsteInput = document.getElementById('pruef-naechstePruefung');

    if (!datumVal || !naechsteInput) return;

    let intervallMonate = 12;
    if (geraetId) {
        const geraete = typeof window.getGeraete === 'function' ? window.getGeraete() : (ladeDaten("geraete") || []);
        const g = geraete.find(item => item.id === geraetId);
        if (g && g.pruefintervall) {
            intervallMonate = parseInt(g.pruefintervall);
        }
    }

    const teile = datumVal.split('-');
    if (teile.length === 3) {
        const d = new Date(parseInt(teile[0]), parseInt(teile[1]) - 1, parseInt(teile[2]));
        d.setMonth(d.getMonth() + intervallMonate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        naechsteInput.value = `${yyyy}-${mm}-${dd}`;
    }
}

function closePruefungModal() {
    const existing = document.getElementById('pruefung-modal');
    if (existing) existing.remove();
}

function savePruefungFromModal(event, existingId) {
    event.preventDefault();

    if (!hatPruefungSchreibRecht()) {
        alert("⚠️ Keine Berechtigung zum Speichern!");
        return;
    }

    const liste = getPruefungen();
    const isEdit = Boolean(existingId && existingId !== 'null' && existingId !== 'undefined' && existingId.trim() !== '');

    const geraetId = document.getElementById('pruef-geraetId').value;
    const newItem = {
        id: isEdit ? existingId : "PRUEF-" + Date.now(),
        geraetId: geraetId,
        objekt: document.getElementById('pruef-objekt').value.trim(),
        art: document.getElementById('pruef-art').value,
        ergebnis: document.getElementById('pruef-ergebnis').value,
        datum: document.getElementById('pruef-datum').value,
        naechstePruefung: document.getElementById('pruef-naechstePruefung').value,
        pruefer: document.getElementById('pruef-pruefer').value.trim()
    };

    if (isEdit) {
        const idx = liste.findIndex(p => p && p.id === existingId);
        if (idx !== -1) {
            liste[idx] = newItem;
        } else {
            liste.push(newItem);
        }
    } else {
        liste.push(newItem);
    }

    speicherePruefungen(liste);

    if (geraetId) {
        const geraete = typeof window.getGeraete === 'function' ? window.getGeraete() : (ladeDaten("geraete") || []);
        const gIdx = geraete.findIndex(g => g.id === geraetId);
        if (gIdx !== -1) {
            if (!geraete[gIdx].historie) geraete[gIdx].historie = [];
            geraete[gIdx].historie.push({
                datum: newItem.datum,
                ergebnis: `${newItem.art}: ${newItem.ergebnis}`,
                pruefer: newItem.pruefer || 'System'
            });
            geraete[gIdx].letztePruefung = newItem.datum;
            if (newItem.naechstePruefung) {
                geraete[gIdx].naechstePruefung = newItem.naechstePruefung;
            }
            if (typeof window.speichereGeraete === 'function') {
                window.speichereGeraete();
            } else {
                speichereDaten('geraete', geraete);
            }
        }
    }

    closePruefungModal();
    filterPruefungen();
}

function loeschePruefung(id) {
    if (!hatPruefungSchreibRecht()) {
        alert("⚠️ Keine Berechtigung zum Löschen vorhanden!");
        return;
    }

    if (!confirm("Möchtest du diesen Prüfungseintrag wirklich löschen?")) return;
    const liste = getPruefungen().filter(p => p && p.id !== id);
    speicherePruefungen(liste);
    filterPruefungen();
}

function exportPruefungenCSV() {
    const daten = getPruefungen();

    if (!Array.isArray(daten) || daten.length === 0) {
        alert("⚠️ Es wurden keine Prüfungsdaten zum Exportieren gefunden.");
        return;
    }

    const headers = ["ID", "Gegenstand/Objekt", "Prüfart", "Prüfdatum", "Nächste Prüfung", "Prüfer", "Ergebnis"];
    const rows = daten.map(p => [
        p.id || '',
        p.objekt || '',
        p.art || '',
        p.datum || '',
        p.naechstePruefung || '',
        p.pruefer || '',
        p.ergebnis || ''
    ]);

    const heute = new Date().toISOString().split('T')[0];

    if (typeof window.downloadCSV === "function") {
        window.downloadCSV(`Pruefungen_FFW_${heute}.csv`, headers, rows);
    } else {
        const csvLines = [headers.join(";")];
        rows.forEach(r => csvLines.push(r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")));
        const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Pruefungen_FFW_${heute}.csv`;
        link.click();
    }
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closePruefungModal();
    }
});

function ladePruefungen() {
    renderPruefungenView();
}

function oeffnePruefungModal(id = null) {
    openPruefungModal(id);
}

document.addEventListener("pruefungenGeaendert", () => { filterPruefungen(); });
document.addEventListener("DOMContentLoaded", () => { renderPruefungenView(); });

window.getPruefungen = getPruefungen;
window.speicherePruefungen = speicherePruefungen;
window.renderPruefungenView = renderPruefungenView;
window.filterPruefungen = filterPruefungen;
window.openPruefungModal = openPruefungModal;
window.oeffnePruefungModal = oeffnePruefungModal;
window.closePruefungModal = closePruefungModal;
window.savePruefungFromModal = savePruefungFromModal;
window.loeschePruefung = loeschePruefung;
window.ladePruefungen = ladePruefungen;
window.exportPruefungenCSV = exportPruefungenCSV;
window.waehleGeraetAus = waehleGeraetAus;
window.berechneAutoNaechstePruefung = berechneAutoNaechstePruefung;
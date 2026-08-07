// ==========================================
// FFW Manager - PSA-Verwaltung (v1.1.0)
// ==========================================

function getPSA() {
    return ladeDaten("psa") || [];
}

function speicherePSA(psaListe) {
    speichereDaten('psa', psaListe);
    document.dispatchEvent(new Event("psaGeaendert"));
}

function renderPSAView() {
    const container = document.getElementById('psa-container');
    if (!container) return;

    const psaListe = getPSA();

    let html = `
        <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <h2>🧑‍🚒 PSA-Verwaltung</h2>
            <button class="btn btn-primary" onclick="openPSAModal()">+ PSA ausgeben / anlegen</button>
        </div>
    `;

    if (!psaListe || psaListe.length === 0) {
        html += `<p style="text-align:center; color:#666; padding: 20px;">Keine Schutzausrüstung erfasst. Klicke oben auf "+ PSA ausgeben / anlegen".</p>`;
    } else {
        html += `<div class="card-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">`;

        psaListe.forEach(item => {
            html += `
                <div class="card" style="border-left: 5px solid #1976D2; background:#fff; padding:15px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <h3 style="margin:0 0 5px 0;">${item.traeger || 'Unbekannter Träger'}</h3>
                            ${item.spind ? `<span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:12px; font-size:0.85rem; font-weight:bold;">🚪 Spind: ${item.spind}</span>` : ''}
                        </div>
                        <div>
                            <button class="btn btn-bearbeiten" title="Bearbeiten" onclick="openPSAModal('${item.id}')">✏️</button>
                            <button class="btn btn-loeschen" title="Löschen" onclick="loeschePSA('${item.id}')">🗑️</button>
                        </div>
                    </div>
                    <div style="margin-top:10px;">
                        <p style="margin:4px 0;"><strong>Ausrüstung:</strong> ${item.bezeichnung || '-'}</p>
                        <p style="margin:4px 0;"><strong>Größe / Typ:</strong> ${item.groesse || '-'}</p>
                        <p style="margin:4px 0;"><strong>Serien-/Barcodenr.:</strong> ${item.seriennummer || '-'}</p>
                    </div>
                    <hr style="margin: 0.8rem 0; border: 0; border-top: 1px solid #eee;">
                    <p style="margin:4px 0;"><small>📅 <strong>Ausgegeben am:</strong> ${item.ausgabeDatum ? new Date(item.ausgabeDatum).toLocaleDateString("de-DE") : 'Unbekannt'}</small></p>
                    ${item.naechstePruefung ? `<p style="margin:4px 0;"><small>⚠️ <strong>Nächste Prüfung:</strong> ${new Date(item.naechstePruefung).toLocaleDateString("de-DE")}</small></p>` : ''}
                </div>
            `;
        });

        html += `</div>`;
    }

    container.innerHTML = html;
}

function openPSAModal(id = null) {
    let item = { id: '', traeger: '', spind: '', bezeichnung: '', groesse: '', seriennummer: '', ausgabeDatum: '', naechstePruefung: '' };

    if (id) {
        const found = getPSA().find(p => p.id === id);
        if (found) item = found;
    }

    const modalHtml = `
        <div id="psa-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;">
            <div style="background:#fff; padding:20px; border-radius:8px; width:90%; max-width:500px; max-height:90vh; overflow-y:auto;">
                <h3>${item.id ? '✏️ PSA bearbeiten' : '➕ PSA zuweisen / anlegen'}</h3>
                <form onsubmit="savePSAFromModal(event, '${item.id}')" style="display:flex; flex-direction:column; gap:10px; margin-top:15px;">
                    <div style="display:flex; gap:10px;">
                        <div style="flex:2;">
                            <label><strong>Name des Trägers *</strong></label>
                            <input type="text" id="psa-traeger" value="${item.traeger || ''}" required style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. Max Mustermann">
                        </div>
                        <div style="flex:1;">
                            <label><strong>Spind-Nr.</strong></label>
                            <input type="text" id="psa-spind" value="${item.spind || ''}" style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. 42">
                        </div>
                    </div>
                    <div>
                        <label><strong>Ausrüstungsteil *</strong></label>
                        <input type="text" id="psa-bezeichnung" list="psa-ausruestung-liste" value="${item.bezeichnung || ''}" required style="width:100%; padding:8px; margin-top:4px;" placeholder="Wählen oder eingeben...">
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
                            <input type="text" id="psa-groesse" value="${item.groesse || ''}" style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. 52/54 oder L">
                        </div>
                        <div style="flex:1;">
                            <label><strong>Serien- / Inventarnr.</strong></label>
                            <input type="text" id="psa-seriennummer" value="${item.seriennummer || ''}" style="width:100%; padding:8px; margin-top:4px;" placeholder="z. B. PSA-102">
                        </div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label><strong>Ausgabedatum</strong></label>
                            <input type="date" id="psa-ausgabeDatum" value="${item.ausgabeDatum || ''}" style="width:100%; padding:8px; margin-top:4px;">
                        </div>
                        <div style="flex:1;">
                            <label><strong>Nächste Prüfung</strong></label>
                            <input type="date" id="psa-naechstePruefung" value="${item.naechstePruefung || ''}" style="width:100%; padding:8px; margin-top:4px;">
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

    const newItem = {
        id: existingId || "PSA-" + Date.now(),
        traeger: document.getElementById('psa-traeger').value.trim(),
        spind: document.getElementById('psa-spind').value.trim(),
        bezeichnung: document.getElementById('psa-bezeichnung').value.trim(),
        groesse: document.getElementById('psa-groesse').value.trim(),
        seriennummer: document.getElementById('psa-seriennummer').value.trim(),
        ausgabeDatum: document.getElementById('psa-ausgabeDatum').value,
        naechstePruefung: document.getElementById('psa-naechstePruefung').value
    };

    if (existingId) {
        const idx = psaListe.findIndex(p => p.id === existingId);
        if (idx !== -1) psaListe[idx] = newItem;
    } else {
        psaListe.push(newItem);
    }

    speicherePSA(psaListe);
    closePSAModal();
    renderPSAView();
}

function loeschePSA(id) {
    if (!confirm("Möchtest du diese PSA-Eintragung wirklich löschen?")) return;

    const psaListe = getPSA().filter(p => p.id !== id);
    speicherePSA(psaListe);
    renderPSAView();
}

document.addEventListener("DOMContentLoaded", () => {
    renderPSAView();
});
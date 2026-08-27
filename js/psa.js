// ==========================================
// FFW Manager - PSA Verwaltung (v1.3.6 FINAL)
// ==========================================

let psaDaten = ladeDaten("psa") || [];

function holePSADaten() {
    psaDaten = ladeDaten("psa") || [];
    return psaDaten;
}

function speicherePSADaten(daten) {
    psaDaten = daten;
    speichereDaten("psa", daten);
    renderPSAView();
}

function escapeHtmlPSA(text) {
    if (!text) return '';
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ------------------------------------------
// MODAL LOGIK (Formular zum Anlegen & Bearbeiten)
// ------------------------------------------

function erstellePSAModalFallsNichtVorhanden() {
    if (document.getElementById('psaAkteModal')) return;

    const modalHTML = `
    <div id="psaAkteModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999;">
        <div style="max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ddd; padding-bottom:10px; margin-bottom:15px;">
                <h3 id="psaModalTitle" style="margin:0;">PSA bearbeiten</h3>
                <button type="button" onclick="schliessePSAModal()" style="border:none; background:none; font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>
            <form id="psaAkteForm" onsubmit="event.preventDefault(); speicherePSAItem();">
                <input type="hidden" id="psa-id">
                
                <div style="display:flex; gap:10px; margin-bottom:12px;">
                    <div style="flex:1;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">Spind-Nr.</label>
                        <input type="text" id="psa-spind" style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    </div>
                    <div style="flex:2;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">Träger (Name) *</label>
                        <input type="text" id="psa-traeger" required style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    </div>
                </div>

                <div style="display:flex; gap:10px; margin-bottom:12px;">
                    <div style="flex:1;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">Hersteller</label>
                        <input type="text" id="psa-hersteller" style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    </div>
                    <div style="flex:1;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">Typ</label>
                        <input type="text" id="psa-typ" style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    </div>
                </div>

                <div style="display:flex; gap:10px; margin-bottom:12px;">
                    <div style="flex:2;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">Ausrüstung / Bezeichnung *</label>
                        <input type="text" id="psa-bezeichnung" required style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    </div>
                    <div style="flex:1;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">Größe</label>
                        <input type="text" id="psa-groesse" style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    </div>
                </div>

                <div style="display:flex; gap:10px; margin-bottom:12px;">
                    <div style="flex:1;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">Inv.- / Serien-Nr.</label>
                        <input type="text" id="psa-seriennummer" style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    </div>
                    <div style="flex:1;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">Nächste Prüfung</label>
                        <input type="date" id="psa-naechstePruefung" style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    </div>
                </div>

                <div style="margin-bottom:15px;">
                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Zubehör</label>
                    <input type="text" id="psa-zubehoer" style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                </div>

                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button type="button" onclick="schliessePSAModal()" style="padding:8px 14px; background:#6c757d; color:#fff; border:none; border-radius:4px; cursor:pointer;">Abbrechen</button>
                    <button type="submit" style="padding:8px 14px; background:#28a745; color:#fff; border:none; border-radius:4px; cursor:pointer;">Speichern</button>
                </div>
            </form>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function openPSAModal(id = null) {
    erstellePSAModalFallsNichtVorhanden();

    const title = document.getElementById('psaModalTitle');
    if (id) {
        const item = holePSADaten().find(p => String(p.id) === String(id));
        if (item) {
            title.innerText = "PSA-Eintrag bearbeiten";
            document.getElementById('psa-id').value = item.id;
            document.getElementById('psa-spind').value = item.spind || '';
            document.getElementById('psa-traeger').value = item.traeger || '';
            document.getElementById('psa-hersteller').value = item.hersteller || '';
            document.getElementById('psa-typ').value = item.typ || '';
            document.getElementById('psa-bezeichnung').value = item.bezeichnung || '';
            document.getElementById('psa-groesse').value = item.groesse || '';
            document.getElementById('psa-seriennummer').value = item.seriennummer || '';
            document.getElementById('psa-naechstePruefung').value = item.naechstePruefung || '';
            document.getElementById('psa-zubehoer').value = item.zubehoer || '';
        }
    } else {
        title.innerText = "Neue PSA anlegen";
        document.getElementById('psaAkteForm').reset();
        document.getElementById('psa-id').value = '';
    }
    document.getElementById('psaAkteModal').style.display = 'block';
}

function schliessePSAModal() {
    const modal = document.getElementById('psaAkteModal');
    if (modal) modal.style.display = 'none';
}

function speicherePSAItem() {
    const traeger = document.getElementById('psa-traeger').value.trim();
    const bezeichnung = document.getElementById('psa-bezeichnung').value.trim();
    
    if (!traeger || !bezeichnung) {
        return alert("Träger und Bezeichnung sind Pflichtfelder!");
    }

    let liste = holePSADaten();
    const id = document.getElementById('psa-id').value;
    const itemData = {
        id: id || ('PSA_' + Date.now()),
        spind: document.getElementById('psa-spind').value.trim(),
        traeger: traeger,
        hersteller: document.getElementById('psa-hersteller').value.trim(),
        typ: document.getElementById('psa-typ').value.trim(),
        bezeichnung: bezeichnung,
        groesse: document.getElementById('psa-groesse').value.trim(),
        seriennummer: document.getElementById('psa-seriennummer').value.trim(),
        naechstePruefung: document.getElementById('psa-naechstePruefung').value,
        zubehoer: document.getElementById('psa-zubehoer').value.trim()
    };

    if (id) {
        const idx = liste.findIndex(p => String(p.id) === String(id));
        if (idx !== -1) liste[idx] = itemData;
    } else {
        liste.push(itemData);
    }

    speicherePSADaten(liste);
    schliessePSAModal();
}

function loeschePSAItem(id) {
    if (confirm("PSA-Eintrag wirklich löschen?")) {
        speicherePSADaten(holePSADaten().filter(p => String(p.id) !== String(id)));
    }
}

// ------------------------------------------
// RENDERING & EXPORT
// ------------------------------------------

function renderPSAView() {
    const tbody = document.getElementById("psa-table-body");
    if (!tbody) return;

    const daten = holePSADaten();
    const suche = (document.getElementById("suchePSA")?.value || '').toLowerCase();
    const filterStatus = document.getElementById("filterPSAStatus")?.value || '';

    const gefiltert = daten.filter(p => {
        const full = ((p.traeger || '') + ' ' + (p.spind || '') + ' ' + (p.bezeichnung || '') + ' ' + (p.seriennummer || '')).toLowerCase();
        const matchSuche = full.includes(suche);
        
        let matchStatus = true;
        if (filterStatus === 'fällig' && p.naechstePruefung) {
            matchStatus = new Date(p.naechstePruefung) < new Date();
        } else if (filterStatus === 'ok' && p.naechstePruefung) {
            matchStatus = new Date(p.naechstePruefung) >= new Date();
        }

        return matchSuche && matchStatus;
    });

    
    if (gefiltert.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:#888;">Keine PSA-Einträge vorhanden. Klicke auf <strong>"+ Neue PSA anlegen"</strong>.</td></tr>`;
        return;
    }

    tbody.innerHTML = gefiltert.map(p => {
        let pruefBadge = escapeHtmlPSA(p.naechstePruefung || '-');
        if (p.naechstePruefung) {
            if (new Date(p.naechstePruefung) < new Date()) {
                pruefBadge = `<span style="color:#dc3545; font-weight:bold;">🔴 ${p.naechstePruefung}</span>`;
            } else {
                pruefBadge = `<span style="color:#28a745; font-weight:bold;">🟢 ${p.naechstePruefung}</span>`;
            }
        }

        return `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px; text-align: center;">
                <button onclick="openPSAModal('${p.id}')" title="Bearbeiten" style="cursor:pointer; background:none; border:none; font-size:1rem;">✏️</button>
                <button onclick="loeschePSAItem('${p.id}')" title="Löschen" style="cursor:pointer; background:none; border:none; font-size:1rem; color:red;">🗑️</button>
            </td>
            <td style="padding: 8px; font-weight:bold;">${escapeHtmlPSA(p.spind || '-')}</td>
            <td style="padding: 8px; font-weight:bold;">${escapeHtmlPSA(p.traeger || '-')}</td>
            <td style="padding: 8px;">${escapeHtmlPSA(p.hersteller || '-')}</td>
            <td style="padding: 8px;">${escapeHtmlPSA(p.typ || '-')}</td>
            <td style="padding: 8px;">${escapeHtmlPSA(p.bezeichnung || '-')}</td>
            <td style="padding: 8px;">${escapeHtmlPSA(p.groesse || '-')}</td>
            <td style="padding: 8px;">${escapeHtmlPSA(p.zubehoer || '-')}</td>
            <td style="padding: 8px;">${escapeHtmlPSA(p.seriennummer || '-')}</td>
            <td style="padding: 8px;">${pruefBadge}</td>
        </tr>`;
    }).join('');
}

function exportPSACSV() {
    const daten = holePSADaten();
    if (!daten.length) return alert("Keine Daten zum Exportieren.");
    const headers = ["ID", "Spind", "Träger", "Hersteller", "Typ", "Bezeichnung", "Größe", "Zubehör", "Seriennummer", "Nächste Prüfung"];
    const rows = daten.map(p => [p.id, p.spind, p.traeger, p.hersteller, p.typ, p.bezeichnung, p.groesse, p.zubehoer, p.seriennummer, p.naechstePruefung]);
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `PSA_Liste_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function importPSACSV(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        let text = evt.target.result.replace(/^\uFEFF/, '');
        const zeilen = text.split(/\r\n|\n/).filter(Boolean);
        if (zeilen.length < 2) return;
        let meins = holePSADaten();
        const delim = zeilen[0].includes(';') ? ';' : ',';
        for (let i = 1; i < zeilen.length; i++) {
            const sp = zeilen[i].split(delim).map(s => s.replace(/^"|"$/g, '').trim());
            if (!sp[2] && !sp[5]) continue;
            meins.push({
                id: 'PSA_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                spind: sp[1] || '',
                traeger: sp[2] || '',
                hersteller: sp[3] || '',
                typ: sp[4] || '',
                bezeichnung: sp[5] || 'Unbenannt',
                groesse: sp[6] || '',
                zubehoer: sp[7] || '',
                seriennummer: sp[8] || '',
                naechstePruefung: sp[9] || ''
            });
        }
        speicherePSADaten(meins);
        alert("✅ PSA Import erfolgreich!");
    };
    reader.readAsText(file, 'UTF-8');
}

function exportPSAPDF() { window.print(); }

document.addEventListener("DOMContentLoaded", renderPSAView);
setTimeout(renderPSAView, 200);

// Globale Bereitstellung
window.renderPSAView = renderPSAView;
window.exportPSACSV = exportPSACSV;
window.importPSACSV = importPSACSV;
window.exportPSAPDF = exportPSAPDF;
window.openPSAModal = openPSAModal;
window.oeffnePSAModal = openPSAModal; // Alias für Kompatibilität mit altem HTML Button
window.schliessePSAModal = schliessePSAModal;
window.speicherePSAItem = speicherePSAItem;
window.loeschePSAItem = loeschePSAItem;
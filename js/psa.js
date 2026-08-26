// ==========================================
// FFW Manager - PSA Verwaltung (v1.3.5 FINAL)
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
// RENDERING
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

// ------------------------------------------
// EXPORT / IMPORT / MODAL STUBS
// ------------------------------------------

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
function openPSAModal(id = null) { alert("Modal-Logik für PSA öffnen (ID: " + id + ")"); }
function loeschePSAItem(id) {
    if (confirm("PSA-Eintrag wirklich löschen?")) {
        speicherePSADaten(holePSADaten().filter(p => String(p.id) !== String(id)));
    }
}

document.addEventListener("DOMContentLoaded", renderPSAView);
setTimeout(renderPSAView, 200);

window.renderPSAView = renderPSAView;
window.exportPSACSV = exportPSACSV;
window.importPSACSV = importPSACSV;
window.exportPSAPDF = exportPSAPDF;
window.openPSAModal = openPSAModal;
window.loeschePSAItem = loeschePSAItem;
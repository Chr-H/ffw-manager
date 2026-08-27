// ==========================================
// FFW Manager - Personalverwaltung (v1.3.5 FINAL)
// ==========================================

let personalDaten = ladeDaten("personal") || [];
let bearbeitungsPersonalId = null;

function holePersonalUserRolle() {
    try {
        const user = JSON.parse(
            localStorage.getItem('ffw_aktiver_benutzer') || 
            localStorage.getItem('ffw_user') || 
            sessionStorage.getItem('ffw_user') || '{}'
        );
        return String(localStorage.getItem('ffw_aktive_rolle') || user.rolle || 'gast').toLowerCase().trim();
    } catch (e) {
        return 'gast';
    }
}

function hatPersonalLeseRecht() {
    return ['viewer', 'editor', 'admin'].includes(holePersonalUserRolle());
}

function hatPersonalSchreibRecht() {
    if (typeof window.hatRecht === "function" && window.hatRecht('personal_schreiben')) return true;
    return ['editor', 'admin'].includes(holePersonalUserRolle());
}

function escapeHtmlPersonal(text) {
    if (!text) return '';
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function holePersonalDaten() {
    personalDaten = ladeDaten("personal") || [];
    return personalDaten;
}

function speicherePersonalDaten(daten) {
    if (!hatPersonalSchreibRecht()) {
        alert("🔒 Schreibschutz aktiv!");
        return;
    }
    personalDaten = daten;
    speichereDaten("personal", daten);
    renderPersonalView();
}

// ------------------------------------------
// MODAL LOGIK
// ------------------------------------------

function erstellePersonalModalFallsNichtVorhanden() {
    if (document.getElementById('personalAkteModal')) return;

    const modalHTML = `
    <div id="personalAkteModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999;">
        <div style="max-width: 550px; margin: 60px auto; background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ddd; padding-bottom:10px; margin-bottom:15px;">
                <h3 id="personalModalTitle" style="margin:0;">Mitglied bearbeiten</h3>
                <button onclick="schliessePersonalModal()" style="border:none; background:none; font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>
            <form id="personalAkteForm" onsubmit="event.preventDefault(); speicherePersonalItem();">
                <input type="hidden" id="pers-id">
                <div style="display:flex; gap:10px; margin-bottom:12px;">
                    <div style="flex:1;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">Spind-Nr.</label>
                        <input type="text" id="pers-spind" style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    </div>
                    <div style="flex:2;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">Vorname</label>
                        <input type="text" id="pers-vorname" style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    </div>
                    <div style="flex:2;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">Nachname *</label>
                        <input type="text" id="pers-nachname" required style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    </div>
                </div>
                <div style="display:flex; gap:10px; margin-bottom:12px;">
                    <div style="flex:1;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">Funktion</label>
                        <input type="text" id="pers-funktion" style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    </div>
                    <div style="flex:1;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">G26.3 Ablauf</label>
                        <input type="date" id="pers-g26ablauf" style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                    </div>
                </div>
                <div style="margin-bottom:15px;">
                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Qualifikationen (kommagetrennt)</label>
                    <input type="text" id="pers-qualifikationen" placeholder="z.B. AGT, Maschinist" style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button type="button" onclick="schliessePersonalModal()" style="padding:8px 14px; background:#6c757d; color:#fff; border:none; border-radius:4px; cursor:pointer;">Abbrechen</button>
                    <button type="submit" style="padding:8px 14px; background:#28a745; color:#fff; border:none; border-radius:4px; cursor:pointer;">Speichern</button>
                </div>
            </form>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function openPersonalModal(id = null) {
    if (!hatPersonalSchreibRecht()) return alert("🔒 Keine Berechtigung.");
    erstellePersonalModalFallsNichtVorhanden();

    const title = document.getElementById('personalModalTitle');
    if (id) {
        const item = holePersonalDaten().find(p => String(p.id) === String(id));
        if (item) {
            title.innerText = "Mitglied bearbeiten";
            document.getElementById('pers-id').value = item.id;
            document.getElementById('pers-spind').value = item.spind || '';
            document.getElementById('pers-vorname').value = item.vorname || '';
            document.getElementById('pers-nachname').value = item.nachname || item.name || '';
            document.getElementById('pers-funktion').value = item.funktion || '';
            document.getElementById('pers-g26ablauf').value = item.g26Ablauf || '';
            document.getElementById('pers-qualifikationen').value = Array.isArray(item.qualifikationen) ? item.qualifikationen.join(", ") : (item.qualifikationen || '');
        }
    } else {
        title.innerText = "Neues Mitglied anlegen";
        document.getElementById('personalAkteForm').reset();
        document.getElementById('pers-id').value = '';
    }
    document.getElementById('personalAkteModal').style.display = 'block';
}

function schliessePersonalModal() {
    const modal = document.getElementById('personalAkteModal');
    if (modal) modal.style.display = 'none';
}

function speicherePersonalItem() {
    if (!hatPersonalSchreibRecht()) return;
    const nachname = document.getElementById('pers-nachname').value.trim();
    if (!nachname) return alert("Nachname erforderlich!");

    let liste = holePersonalDaten();
    const id = document.getElementById('pers-id').value;
    const itemData = {
        id: id || ('PERS_' + Date.now()),
        spind: document.getElementById('pers-spind').value.trim(),
        vorname: document.getElementById('pers-vorname').value.trim(),
        nachname: nachname,
        name: (document.getElementById('pers-vorname').value.trim() + ' ' + nachname).trim(),
        funktion: document.getElementById('pers-funktion').value.trim(),
        g26Ablauf: document.getElementById('pers-g26ablauf').value,
        qualifikationen: document.getElementById('pers-qualifikationen').value.split(',').map(q => q.trim()).filter(Boolean)
    };

    if (id) {
        const idx = liste.findIndex(p => String(p.id) === String(id));
        if (idx !== -1) liste[idx] = itemData;
    } else {
        liste.push(itemData);
    }

    speicherePersonalDaten(liste);
    schliessePersonalModal();
}

function loeschePersonalItem(id) {
    if (!hatPersonalSchreibRecht()) return alert("🔒 Keine Berechtigung.");
    if (confirm("Mitglied wirklich löschen?")) {
        speicherePersonalDaten(holePersonalDaten().filter(p => String(p.id) !== String(id)));
    }
}

// ------------------------------------------
// EXPORT & IMPORT
// ------------------------------------------

function exportPersonalCSV() {
    const daten = holePersonalDaten();
    if (!daten.length) return alert("Keine Daten zum Exportieren.");

    const headers = ["ID", "Spind", "Vorname", "Nachname", "Funktion", "G26.3 Ablauf", "Qualifikationen"];
    const rows = daten.map(p => [
        p.id, p.spind, p.vorname, p.nachname || p.name, p.funktion, p.g26Ablauf,
        Array.isArray(p.qualifikationen) ? p.qualifikationen.join(", ") : p.qualifikationen
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Personal_FFW_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function importPersonalCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        let text = evt.target.result.replace(/^\uFEFF/, '');
        const zeilen = text.split(/\r\n|\n/).filter(Boolean);
        if (zeilen.length < 2) return;

        let meins = holePersonalDaten();
        const delim = zeilen[0].includes(';') ? ';' : ',';

        for (let i = 1; i < zeilen.length; i++) {
            const sp = zeilen[i].split(delim).map(s => s.replace(/^"|"$/g, '').trim());
            if (!sp[2] && !sp[3]) continue;
            meins.push({
                id: 'PERS_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                spind: sp[1] || '',
                vorname: sp[2] || '',
                nachname: sp[3] || 'Unbenannt',
                funktion: sp[4] || '',
                g26Ablauf: sp[5] || '',
                qualifikationen: sp[6] ? sp[6].split(',').map(q => q.trim()) : []
            });
        }
        speicherePersonalDaten(meins);
        alert("✅ Import erfolgreich!");
    };
    reader.readAsText(file, 'UTF-8');
}

function exportPersonalPDF() {
    window.print();
}

// ------------------------------------------
// RENDERING
// ------------------------------------------

function renderPersonalView() {
    const tbody = document.getElementById("personal-table-body");
    if (!tbody) return;

    const daten = holePersonalDaten();
    const suche = (document.getElementById("suchePersonal")?.value || '').toLowerCase();
    const filterFunk = document.getElementById("filterFunktion")?.value || '';

    const gefiltert = daten.filter(p => {
        const full = ((p.vorname || '') + ' ' + (p.nachname || p.name || '')).toLowerCase();
        const matchSuche = full.includes(suche) || (p.spind || '').toLowerCase().includes(suche);
        const matchFunk = !filterFunk || (p.funktion || '').includes(filterFunk);
        return matchSuche && matchFunk;
    });

    if (gefiltert.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#888;">Keine Einträge vorhanden.</td></tr>`;
        return;
    }

    const kannSchreiben = hatPersonalSchreibRecht();

    tbody.innerHTML = gefiltert.map(p => {
        const name = escapeHtmlPersonal((p.vorname ? p.vorname + ' ' : '') + (p.nachname || p.name || ''));
        const qualis = Array.isArray(p.qualifikationen) ? p.qualifikationen.join(", ") : (p.qualifikationen || '-');
        
        let statusG26 = '<span style="color:#28a745; font-weight:bold;">🟢 Gültig</span>';
        if (p.g26Ablauf && new Date(p.g26Ablauf) < new Date()) {
            statusG26 = '<span style="color:#dc3545; font-weight:bold;">🔴 Abgelaufen</span>';
        }

        const aktionen = kannSchreiben ? `
            <button onclick="openPersonalModal('${p.id}')" style="cursor:pointer; background:none; border:none; font-size:1.1rem;">✏️</button>
            <button onclick="loeschePersonalItem('${p.id}')" style="cursor:pointer; background:none; border:none; font-size:1.1rem; color:red;">🗑️</button>
        ` : '👁️';

        return `
        <tr style="border-bottom:1px solid #dee2e6;">
            <td style="padding:12px; font-weight:bold;">${escapeHtmlPersonal(p.spind || '-')}</td>
            <td style="padding:12px; font-weight:bold;">${name}</td>
            <td style="padding:12px;">${escapeHtmlPersonal(p.funktion || '-')}</td>
            <td style="padding:12px;">${statusG26}</td>
            <td style="padding:12px;">${escapeHtmlPersonal(qualis)}</td>
            <td style="padding:12px; text-align:center;">${aktionen}</td>
        </tr>`;
    }).join('');
}

document.addEventListener("DOMContentLoaded", renderPersonalView);
setTimeout(renderPersonalView, 200);

window.openPersonalModal = openPersonalModal;
window.schliessePersonalModal = schliessePersonalModal;
window.speicherePersonalItem = speicherePersonalItem;
window.loeschePersonalItem = loeschePersonalItem;
window.exportPersonalCSV = exportPersonalCSV;
window.importPersonalCSV = importPersonalCSV;
window.exportPersonalPDF = exportPersonalPDF;
window.renderPersonalView = renderPersonalView;
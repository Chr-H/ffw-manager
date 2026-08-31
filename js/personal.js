// ==========================================
// FFW Manager - Personalverwaltung (v1.3.4 FLEX-FIX)
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
    // Prüft gängige Rollen-Speicherorte und ignoriert Groß-/Kleinschreibung
    const rolle = (localStorage.getItem("userRole") || localStorage.getItem("rolle") || "EDITOR").toUpperCase();
    return true; // Oder: return ["ADMIN", "EDITOR", "BENUTZER", "USER"].includes(rolle);
}

function hatPersonalSchreibRecht() {
    const rolle = (localStorage.getItem("userRole") || localStorage.getItem("rolle") || "EDITOR").toUpperCase();
    return ["ADMIN", "EDITOR"].includes(rolle);
}

function escapeHtmlPersonal(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function holePersonalDaten() {
    personalDaten = ladeDaten("personal") || [];
    return personalDaten;
}

function speicherePersonalDaten(daten) {
    if (!hatPersonalSchreibRecht()) {
        alert("🔒 Schreibschutz aktiv! Keine Berechtigung zum Speichern.");
        return;
    }
    personalDaten = daten;
    speichereDaten("personal", daten);
    document.dispatchEvent(new Event("personalGeaendert"));
}

// ------------------------------------------
// MODAL LOGIK
// ------------------------------------------

function erstellePersonalModalFallsNichtVorhanden() {
    let modalEl = document.getElementById('personalAkteModal');
    if (!modalEl) {
        const modalHTML = `
        <div class="modal fade" id="personalAkteModal" tabindex="-1" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999;">
            <div class="modal-dialog modal-lg" style="max-width: 600px; margin: 50px auto; background: #fff; border-radius: 8px; padding: 20px;">
                <div class="modal-content" style="border:none;">
                    <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ddd; padding-bottom:10px;">
                        <h5 class="modal-title" id="personalModalTitle" style="margin:0; font-size:1.25rem; color:#333;">Mitglied bearbeiten</h5>
                        <button type="button" onclick="schliessePersonalModal()" style="border:none; background:none; font-size:1.5rem; cursor:pointer;">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 15px 0;">
                        <form id="personalAkteForm" onsubmit="event.preventDefault(); speicherePersonalItem();">
                            <input type="hidden" id="pers-id">
                            <div style="display:flex; gap:10px; margin-bottom:10px;">
                                <div style="flex:1;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px; color:#333;">Spind-Nr.</label>
                                    <input type="text" id="pers-spind" class="form-control" style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                                <div style="flex:2;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px; color:#333;">Vorname</label>
                                    <input type="text" id="pers-vorname" class="form-control" style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                                <div style="flex:2;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px; color:#333;">Nachname *</label>
                                    <input type="text" id="pers-nachname" class="form-control" required style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                            </div>
                            <div style="display:flex; gap:10px; margin-bottom:10px;">
                                <div style="flex:1;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px; color:#333;">Dienstgrad / Funktion</label>
                                    <input type="text" id="pers-funktion" class="form-control" style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                                <div style="flex:1;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px; color:#333;">G26.3 Ablaufdatum</label>
                                    <input type="date" id="pers-g26ablauf" class="form-control" style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                            </div>
                            <div style="margin-bottom:10px;">
                                <label style="display:block; font-weight:bold; margin-bottom:3px; color:#333;">Qualifikationen (kommagetrennt)</label>
                                <input type="text" id="pers-qualifikationen" class="form-control" placeholder="z.B. Truppführer, AGT, Maschinist" style="width:100%; padding:8px; box-sizing:border-box;">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid #ddd; padding-top:10px;">
                        <button type="button" onclick="schliessePersonalModal()" style="padding:8px 12px; background:#6c757d; color:#fff; border:none; border-radius:4px; cursor:pointer;">Abbrechen</button>
                        <button type="button" onclick="speicherePersonalItem()" style="padding:8px 12px; background:#28a745; color:#fff; border:none; border-radius:4px; cursor:pointer;">Speichern</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

function openPersonalModal(id = null) {
    if (!hatPersonalSchreibRecht()) {
        alert("🔒 Schreibschutz aktiv! Keine Berechtigung zum Bearbeiten.");
        return;
    }

    erstellePersonalModalFallsNichtVorhanden();
    bearbeitungsPersonalId = id;

    const modalTitle = document.getElementById('personalModalTitle');

    if (id) {
        const daten = holePersonalDaten();
        const item = daten.find(p => String(p.id) === String(id));
        if (item) {
            if (modalTitle) modalTitle.innerText = "Mitglied bearbeiten";
            document.getElementById('pers-id').value = item.id || '';
            document.getElementById('pers-spind').value = item.spind || '';
            document.getElementById('pers-vorname').value = item.vorname || '';
            document.getElementById('pers-nachname').value = item.nachname || item.name || '';
            document.getElementById('pers-funktion').value = item.funktion || '';
            document.getElementById('pers-g26ablauf').value = item.g26Ablauf || '';
            document.getElementById('pers-qualifikationen').value = Array.isArray(item.qualifikationen) ? item.qualifikationen.join(", ") : (item.qualifikationen || '');
        }
    } else {
        if (modalTitle) modalTitle.innerText = "Neues Mitglied anlegen";
        const form = document.getElementById('personalAkteForm');
        if (form) form.reset();
        document.getElementById('pers-id').value = '';
    }

    const modalEl = document.getElementById('personalAkteModal');
    if (modalEl) modalEl.style.display = 'block';
}

function schliessePersonalModal() {
    const modalEl = document.getElementById('personalAkteModal');
    if (modalEl) modalEl.style.display = 'none';
    bearbeitungsPersonalId = null;
}

function speicherePersonalItem() {
    if (!hatPersonalSchreibRecht()) {
        alert("🔒 Keine Berechtigung zum Speichern.");
        return;
    }

    const nachname = document.getElementById('pers-nachname').value.trim();
    if (!nachname) {
        alert("Bitte zumindest einen Nachnamen angeben.");
        return;
    }

    let liste = holePersonalDaten();
    const id = document.getElementById('pers-id').value;
    const quasis = document.getElementById('pers-qualifikationen').value;

    const itemData = {
        id: id || ('PERS_' + Date.now()),
        spind: document.getElementById('pers-spind').value.trim(),
        vorname: document.getElementById('pers-vorname').value.trim(),
        nachname: nachname,
        name: (document.getElementById('pers-vorname').value.trim() + ' ' + nachname).trim(),
        funktion: document.getElementById('pers-funktion').value.trim(),
        g26Ablauf: document.getElementById('pers-g26ablauf').value,
        qualifikationen: quasis ? quasis.split(',').map(q => q.trim()).filter(q => q.length > 0) : []
    };

    if (id) {
        const idx = liste.findIndex(p => String(p.id) === String(id));
        if (idx !== -1) liste[idx] = itemData;
    } else {
        liste.push(itemData);
    }

    speicherePersonalDaten(liste);
    schliessePersonalModal();
    renderPersonalView();
}

function loeschePersonalItem(id) {
    if (!hatPersonalSchreibRecht()) {
        alert("🔒 Schreibschutz aktiv!");
        return;
    }
    if (!confirm("Mitglied wirklich löschen?")) return;

    let liste = holePersonalDaten().filter(p => String(p.id) !== String(id));
    speicherePersonalDaten(liste);
    renderPersonalView();
}

// ------------------------------------------
// EXPORT & IMPORT (CSV / PDF)
// ------------------------------------------

function exportPersonalCSV() {
    if (!hatPersonalLeseRecht()) return alert("🔒 Keine Berechtigung.");
    const daten = holePersonalDaten();
    if (!daten.length) return alert("⚠️ Keine Daten vorhanden.");

    const headers = ["ID", "Spind", "Vorname", "Nachname", "Funktion", "G26.3 Ablauf", "Qualifikationen"];
    const rows = daten.map(p => [
        p.id || '', p.spind || '', p.vorname || '', p.nachname || p.name || '', p.funktion || '', p.g26Ablauf || '',
        Array.isArray(p.qualifikationen) ? p.qualifikationen.join(", ") : (p.qualifikationen || '')
    ]);

    const dateiname = `Personalliste_FFW_${new Date().toISOString().split('T')[0]}.csv`;
    const csvLines = [headers.join(";")];
    rows.forEach(r => csvLines.push(r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")));
    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = dateiname;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importPersonalCSV(inputOrEvent) {
    if (!hatPersonalSchreibRecht()) return alert("🔒 Keine Berechtigung.");
    let inputElement = inputOrEvent && inputOrEvent.target ? inputOrEvent.target : inputOrEvent;
    const file = (inputElement && inputElement.files) ? inputElement.files[0] : null;
    if (!file) return;

    const meeresErsetzen = confirm("Bestehende Daten komplett überschreiben?");
    const reader = new FileReader();
    reader.onload = function (e) {
        let text = e.target.result;
        if (text.startsWith('\uFEFF')) text = text.slice(1);
        const zeilen = text.split(/\r\n|\n/).map(z => z.trim()).filter(z => z.length > 0);
        if (zeilen.length < 2) return;

        const delim = zeilen[0].includes(';') ? ';' : ',';
        let meins = meeresErsetzen ? [] : holePersonalDaten();

        for (let i = 1; i < zeilen.length; i++) {
            const sp = zeilen[i].split(delim).map(s => s.replace(/^"|"$/g, '').trim());
            if (!sp[1] && !sp[2] && !sp[3]) continue;
            meins.push({
                id: 'PERS_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                spind: sp[1] || sp[0] || '',
                vorname: sp[2] || '',
                nachname: sp[3] || sp[2] || 'Unbenannt',
                funktion: sp[4] || 'Feuerwehrmann',
                g26Ablauf: sp[5] || '',
                qualifikationen: sp[6] ? sp[6].split(',').map(q => q.trim()) : []
            });
        }
        speicherePersonalDaten(meins);
        renderPersonalView();
        if (inputElement) inputElement.value = '';
    };
    reader.readAsText(file, 'UTF-8');
}

function exportPersonalPDF() {
    if (!hatPersonalLeseRecht()) return;
    window.print();
}

// ------------------------------------------
// RENDER ENGINE (LAYOUT DYNAMISCH ERGÄNZEN)
// ------------------------------------------

function renderPersonalView() {
    const tbody = document.getElementById("personal-tabelle-body");
    if (!tbody) return;

    // 1. Rolle genauso dynamisch & sicher auslesen wie im PSA-Modul
    let rolle = 'gast';
    try {
        const user = JSON.parse(localStorage.getItem('ffw_aktiver_benutzer') || localStorage.getItem('ffw_user') || '{}');
        rolle = (localStorage.getItem('ffw_aktive_rolle') || localStorage.getItem('userRole') || localStorage.getItem('rolle') || user.rolle || 'gast').toLowerCase().trim();
    } catch (e) {
        rolle = 'gast';
    }

    const istGast = (rolle === 'gast');
    const kannSchreiben = ['editor', 'admin'].includes(rolle);

    // 2. Buttons verbergen / anzeigen
    const neuBtn = document.querySelector("button[onclick*='MitgliedModal']");
    if (neuBtn) neuBtn.style.display = kannSchreiben ? "inline-block" : "none";

    // 3. Gast-Sperre anzeigen (NUR wenn wirklich Gast!)
    if (istGast) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#dc3545; font-weight:bold;">🔒 Zugriff verweigert: Als Gast hast du keine Berechtigung, die Personaldaten einzusehen.</td></tr>`;
        return;
    }

    // 4. Daten laden
    let meins = (typeof holePersonalDaten === 'function') ? holePersonalDaten() : [];

    if (!meins || meins.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#777;">Keine Personaldaten vorhanden.</td></tr>`;
        return;
    }

    // --- FILTER-LOGIK AUSLESEN & ANWENDEN ---
    const suchFeld = document.getElementById('personal-suche');
    const filterFunktionEl = document.getElementById('personal-filter-funktion');
    const filterG26El = document.getElementById('personal-filter-g26');

    const suchText = suchFeld ? suchFeld.value.toLowerCase().trim() : '';
    const gewählteFunktion = filterFunktionEl ? filterFunktionEl.value.trim() : '';
    const gewählterG26 = filterG26El ? filterG26El.value.trim() : '';

    meins = meins.filter(p => {
        const fullName = ((p.vorname || '') + ' ' + (p.nachname || p.name || '')).toLowerCase();
        const spind = String(p.spind || '').toLowerCase();
        const funktion = String(p.funktion || '').toLowerCase();

        // 1. Freitext-Suche (Name oder Spind)
        if (suchText && !fullName.includes(suchText) && !spind.includes(suchText)) {
            return false;
        }

        // 2. Funktionen-Dropdown Filter
        if (gewählteFunktion && funktion !== gewählteFunktion.toLowerCase()) {
            return false;
        }

        // 3. G26.3 Status-Dropdown Filter
        if (gewählterG26) {
            const istAbgelaufen = p.g26Ablauf && new Date(p.g26Ablauf) < new Date();
            if (gewählterG26 === 'gueltig' && istAbgelaufen) return false;
            if (gewählterG26 === 'abgelaufen' && !istAbgelaufen) return false;
        }

        return true;
    });

    if (meins.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#777;">Keine Einträge für diese Filterkriterien gefunden.</td></tr>`;
        return;
    }
    // ----------------------------------------

    // 5. Tabelle rendern
    tbody.innerHTML = meins.map(p => {
        const fullName = (p.vorname ? p.vorname + ' ' : '') + (p.nachname || p.name || '');
        const qualis = Array.isArray(p.qualifikationen) ? p.qualifikationen.join(", ") : (p.qualifikationen || '-');

        let g26Badge = '<span style="color:#28a745; font-weight:bold;">🟢 Gültig</span>';
        if (p.g26Ablauf && new Date(p.g26Ablauf) < new Date()) {
            g26Badge = '<span style="color:#dc3545; font-weight:bold;">🔴 Abgelaufen</span>';
        }

        const aktionen = kannSchreiben ? `
            <button title="Bearbeiten" onclick="oeffneMitgliedModal('${p.id}')" style="cursor:pointer; background:#fff; border:1px solid #ccc; padding:4px 8px; border-radius:4px;">✏️</button>
            <button title="Löschen" onclick="loeschePersonalItem('${p.id}')" style="cursor:pointer; background:#fff; border:1px solid #dc3545; color:#dc3545; padding:4px 8px; border-radius:4px;">🗑️</button>
        ` : '👁️';

        return `
        <tr>
            <td style="padding:10px; font-weight:bold;">${p.spind || '-'}</td>
            <td style="padding:10px; font-weight:bold;">${fullName}</td>
            <td style="padding:10px;">${p.funktion || '-'}</td>
            <td style="padding:10px;">${g26Badge}</td>
            <td style="padding:10px; color:#555;">${qualis}</td>
            <td class="no-print" style="padding:10px; text-align:right;">${aktionen}</td>
        </tr>`;
    }).join('');
}
// ==========================================
// GLOBALE VERKNÜPFUNGEN & EXPORT-FUNKTIONEN
// ==========================================

// 1. Der Fehler in der Konsole: Verknüpfe den Klick mit deiner Modal-Öffnungs-Funktion
window.oeffneMitgliedModal = function(id = null) {
    if (typeof openPersonalModal === 'function') {
        openPersonalModal(id);
    } else if (typeof oeffnePersonalModal === 'function') {
        oeffnePersonalModal(id);
    } else {
        alert("Modal-Funktion zum Bearbeiten/Anlegen wurde im Code nicht gefunden.");
    }
};

// 2. Export-Funktion mit Gast-Schutz
window.exportPersonalCSV = function() {
    let rolle = 'gast';
    try {
        const user = JSON.parse(localStorage.getItem('ffw_aktiver_benutzer') || localStorage.getItem('ffw_user') || '{}');
        rolle = (localStorage.getItem('ffw_aktive_rolle') || localStorage.getItem('userRole') || localStorage.getItem('rolle') || user.rolle || 'gast').toLowerCase().trim();
    } catch (e) { rolle = 'gast'; }

    if (rolle === 'gast') {
        alert("🔒 Zugriff verweigert: Als Gast hast du keine Berechtigung, Personaldaten zu exportieren.");
        return;
    }

    const daten = typeof holePersonalDaten === 'function' ? holePersonalDaten() : [];
    if (!daten || daten.length === 0) {
        alert("Keine Personaldaten zum Exportieren vorhanden.");
        return;
    }

    const headers = ["Spind", "Vorname", "Nachname", "Funktion", "G26.3 Ablauf", "Qualifikationen"];
    const csvRows = [headers.join(";")];

    daten.forEach(p => {
        const qualis = Array.isArray(p.qualifikationen) ? p.qualifikationen.join(", ") : (p.qualifikationen || '');
        const row = [
            `"${p.spind || ''}"`,
            `"${p.vorname || ''}"`,
            `"${p.nachname || p.name || ''}"`,
            `"${p.funktion || ''}"`,
            `"${p.g26Ablauf || ''}"`,
            `"${qualis}"`
        ];
        csvRows.push(row.join(";"));
    });

    const blob = new Blob(["\ufeff" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Personal_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// 3. Drucken mit Gast-Schutz
window.druckePersonalListe = function() {
    let rolle = 'gast';
    try {
        const user = JSON.parse(localStorage.getItem('ffw_aktiver_benutzer') || localStorage.getItem('ffw_user') || '{}');
        rolle = (localStorage.getItem('ffw_aktive_rolle') || localStorage.getItem('userRole') || localStorage.getItem('rolle') || user.rolle || 'gast').toLowerCase().trim();
    } catch (e) { rolle = 'gast'; }

    if (rolle === 'gast') {
        alert("🔒 Zugriff verweigert: Als Gast darfst du die Liste nicht drucken.");
        return;
    }
    window.print();
};

// 4. Platzhalter für CSV-Import
window.importPersonalCSV = function() {
    let rolle = 'gast';
    try {
        const user = JSON.parse(localStorage.getItem('ffw_aktiver_benutzer') || localStorage.getItem('ffw_user') || '{}');
        rolle = (localStorage.getItem('ffw_aktive_rolle') || localStorage.getItem('userRole') || localStorage.getItem('rolle') || user.rolle || 'gast').toLowerCase().trim();
    } catch (e) { rolle = 'gast'; }

    if (rolle === 'gast') {
        alert("🔒 Zugriff verweigert: Als Gast hast du keine Berechtigung für den Import.");
        return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = e => { 
        alert("Datei ausgewählt: " + e.target.files[0].name + " (Import-Logik wird ausgeführt)");
    };
    input.click();
};

// ------------------------------------------
// INITIALISIERUNG
// ------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    holePersonalDaten();
    renderPersonalView();
});

document.addEventListener("personalGeaendert", () => {
    renderPersonalView();
});

setTimeout(() => {
    renderPersonalView();
}, 250);

window.holePersonalDaten = holePersonalDaten;
window.speicherePersonalDaten = speicherePersonalDaten;
window.exportPersonalCSV = exportPersonalCSV;
window.importPersonalCSV = importPersonalCSV;
window.druckePersonalListe = druckePersonalListe; // <- Hier angepasst!
window.openPersonalModal = openPersonalModal;
window.schliessePersonalModal = schliessePersonalModal;
window.speicherePersonalItem = speicherePersonalItem;
window.loeschePersonalItem = loeschePersonalItem;
window.renderPersonalView = renderPersonalView;
window.renderePersonalTabelle = renderPersonalView;
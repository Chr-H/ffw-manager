// ==========================================
// FFW Manager - Personalverwaltung (v1.3.1 KORRIGIERT & VOLLSTÄNDIG)
// ==========================================

let personalDaten = ladeDaten("personal") || [];
let bearbeitungsPersonalId = null;

/**
 * Aktuelle Benutzerrolle aus allen verfügbaren Quellen ermitteln
 */
function holePersonalUserRolle() {
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

function hatPersonalLeseRecht() {
    const rolle = holePersonalUserRolle();
    return ['viewer', 'editor', 'admin'].includes(rolle);
}

function hatPersonalSchreibRecht() {
    if (typeof window.hatRecht === "function") {
        if (window.hatRecht('personal_schreiben')) return true;
    }
    const rolle = holePersonalUserRolle();
    return ['editor', 'admin'].includes(rolle);
}

function escapeHtmlPersonal(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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
// 1. IMPORT & EXPORT (CSV & PDF)
// ------------------------------------------

function exportPersonalCSV() {
    if (!hatPersonalLeseRecht()) {
        alert("🔒 Keine Berechtigung zum Exportieren.");
        return;
    }
    const daten = holePersonalDaten();
    if (!daten || daten.length === 0) {
        alert("⚠️ Keine Personaldaten zum Exportieren vorhanden.");
        return;
    }

    const headers = ["ID", "Spind", "Vorname", "Nachname", "Funktion", "G26.3 Status", "G26.3 Ablauf", "Qualifikationen", "Bemerkung"];
    const rows = daten.map(p => [
        p.id || '',
        p.spind || '',
        p.vorname || '',
        p.nachname || p.name || '',
        p.funktion || '',
        p.g26Status || '',
        p.g26Ablauf || '',
        Array.isArray(p.qualifikationen) ? p.qualifikationen.join(", ") : (p.qualifikationen || ''),
        p.bemerkung || ''
    ]);

    const heute = new Date().toISOString().split('T')[0];
    const dateiname = `Personalliste_FFW_${heute}.csv`;

    if (typeof window.downloadCSV === "function") {
        window.downloadCSV(dateiname, headers, rows);
    } else {
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
}

function importPersonalCSV(inputOrEvent) {
    if (!hatPersonalSchreibRecht()) {
        alert("🔒 Schreibschutz aktiv! Keine Berechtigung zum Importieren.");
        return;
    }

    let inputElement = inputOrEvent && inputOrEvent.target ? inputOrEvent.target : inputOrEvent;
    const file = (inputElement && inputElement.files) ? inputElement.files[0] : null;
    if (!file) return;

    const meeresErsetzen = confirm("Soll die bestehende Personalliste VOLLSTÄNDIG ÜBERSCHRIEBEN werden?\n\n[OK] = Überschreiben | [Abbrechen] = Zusammenführen");

    const reader = new FileReader();
    reader.onload = function (e) {
        let text = e.target.result;
        if (text.startsWith('\uFEFF')) text = text.slice(1);

        const zeilen = text.split(/\r\n|\n/).map(z => z.trim()).filter(z => z.length > 0);
        if (zeilen.length < 2) {
            alert("⚠️ Die CSV-Datei enthält keine verwertbaren Daten.");
            if (inputElement) inputElement.value = '';
            return;
        }

        const delim = zeilen[0].includes(';') ? ';' : ',';
        let meins = meeresErsetzen ? [] : holePersonalDaten();
        let hinzugefuegt = 0;

        for (let i = 1; i < zeilen.length; i++) {
            const sp = zeilen[i].split(delim).map(s => s.replace(/^"|"$/g, '').trim());
            if (!sp[1] && !sp[2] && !sp[3]) continue;

            const item = {
                id: 'PERS_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                spind: sp[1] || sp[0] || '',
                vorname: sp[2] || '',
                nachname: sp[3] || sp[2] || 'Unbenannt',
                funktion: sp[4] || 'Feuerwehrmann',
                g26Status: sp[5] || 'Keine',
                g26Ablauf: sp[6] || '',
                qualifikationen: sp[7] ? sp[7].split(',').map(q => q.trim()) : [],
                bemerkung: sp[8] || ''
            };

            meins.push(item);
            hinzugefuegt++;
        }

        speicherePersonalDaten(meins);
        renderPersonalView();
        if (inputElement) inputElement.value = '';
        alert(`✅ Import abgeschlossen: ${hinzugefuegt} Mitglieder verarbeitet.`);
    };

    reader.readAsText(file, 'UTF-8');
}

function exportPersonalPDF() {
    if (!hatPersonalLeseRecht()) {
        alert("🔒 Keine Berechtigung zum Exportieren.");
        return;
    }
    window.print();
}

// ------------------------------------------
// 2. MODAL & BEARBEITEN
// ------------------------------------------

function erstellePersonalModalFallsNichtVorhanden() {
    let modalEl = document.getElementById('personalAkteModal');
    if (!modalEl) {
        const modalHTML = `
        <div class="modal fade" id="personalAkteModal" tabindex="-1" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999;" aria-hidden="true">
            <div class="modal-dialog modal-lg" style="max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; padding: 20px;">
                <div class="modal-content" style="border:none;">
                    <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ddd; padding-bottom:10px;">
                        <h5 class="modal-title" id="personalModalTitle" style="margin:0; font-size:1.25rem;">Mitglied bearbeiten</h5>
                        <button type="button" onclick="schliessePersonalModal()" style="border:none; background:none; font-size:1.5rem; cursor:pointer;">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 15px 0;">
                        <form id="personalAkteForm" onsubmit="event.preventDefault(); speicherePersonalItem();">
                            <input type="hidden" id="pers-id">
                            <div style="display:flex; gap:10px; margin-bottom:10px;">
                                <div style="flex:1;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px;">Spind-Nr.</label>
                                    <input type="text" class="form-control" id="pers-spind" style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                                <div style="flex:2;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px;">Vorname</label>
                                    <input type="text" class="form-control" id="pers-vorname" style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                                <div style="flex:2;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px;">Nachname *</label>
                                    <input type="text" class="form-control" id="pers-nachname" required style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                            </div>
                            <div style="display:flex; gap:10px; margin-bottom:10px;">
                                <div style="flex:1;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px;">Dienstgrad / Funktion</label>
                                    <input type="text" class="form-control" id="pers-funktion" style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                                <div style="flex:1;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px;">G26.3 Ablaufdatum</label>
                                    <input type="date" class="form-control" id="pers-g26ablauf" style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                            </div>
                            <div style="margin-bottom:10px;">
                                <label style="display:block; font-weight:bold; margin-bottom:3px;">Qualifikationen (kommagetrennt)</label>
                                <input type="text" class="form-control" id="pers-qualifikationen" placeholder="z.B. AGT, Maschinist, Truppführer" style="width:100%; padding:8px; box-sizing:border-box;">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid #ddd; padding-top:10px;">
                        <button type="button" class="btn btn-secondary" onclick="schliessePersonalModal()" style="padding:8px 12px; background:#6c757d; color:#fff; border:none; border-radius:4px; cursor:pointer;">Abbrechen</button>
                        <button type="button" class="btn btn-success" onclick="speicherePersonalItem()" style="padding:8px 12px; background:#28a745; color:#fff; border:none; border-radius:4px; cursor:pointer;">Speichern</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

function openPersonalModal(id = null) {
    if (!hatPersonalSchreibRecht()) {
        alert("🔒 Schreibschutz aktiv! Keine Berechtigung.");
        return;
    }

    erstellePersonalModalFallsNichtVorhanden();
    bearbeitungsPersonalId = id;

    const modalTitle = document.getElementById('personalModalTitle');

    if (id) {
        const daten = holePersonalDaten();
        const item = daten.find(p => p.id === id);
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
        document.getElementById('personalAkteForm').reset();
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
        const idx = liste.findIndex(p => p.id === id);
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
        alert("🔒 Schreibschutz aktiv! Keine Berechtigung.");
        return;
    }
    if (!confirm("Mitglied wirklich löschen?")) return;

    let liste = holePersonalDaten().filter(p => p.id !== id);
    speicherePersonalDaten(liste);
    renderPersonalView();
}

// ------------------------------------------
// 3. ANZEIGE & RENDER-LOGIK
// ------------------------------------------

function renderPersonalView() {
    const container = document.getElementById('personal-container');
    if (!container) return;

    if (!hatPersonalLeseRecht()) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: #fff; border-radius: 8px;">
                <h2 style="color: #721c24;">🔒 Zugriff verweigert</h2>
                <p style="color: #721c24;">Als <strong>Gast</strong> hast du keine Berechtigung für die Personalverwaltung.</p>
            </div>`;
        return;
    }

    const kannSchreiben = hatPersonalSchreibRecht();
    const daten = holePersonalDaten();
    const sucheInput = document.getElementById('suchePersonal');
    const suche = sucheInput ? sucheInput.value.toLowerCase() : '';

    const gefiltert = daten.filter(p => {
        const full = ((p.vorname || '') + ' ' + (p.nachname || p.name || '')).toLowerCase();
        const spind = (p.spind || '').toLowerCase();
        const funk = (p.funktion || '').toLowerCase();
        return full.includes(suche) || spind.includes(suche) || funk.includes(suche);
    });

    let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; gap:10px; align-items:center;">
            <input type="text" id="suchePersonal" placeholder="🔍 Name, Spind..." oninput="renderPersonalView()" value="${escapeHtmlPersonal(suche)}" style="padding:8px; border-radius:4px; border:1px solid #ccc;">
            ${kannSchreiben ? `<button class="btn btn-primary" onclick="openPersonalModal()" style="padding:8px 12px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">➕ Neues Mitglied</button>` : ''}
        </div>
        <div style="display:flex; gap:5px;">
            <button onclick="exportPersonalCSV()" style="padding:6px 10px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;">📥 CSV Export</button>
            ${kannSchreiben ? `
                <label style="padding:6px 10px; background:#28a745; color:white; border-radius:4px; cursor:pointer; margin:0;">
                    📤 CSV Import <input type="file" accept=".csv" onchange="importPersonalCSV(event)" style="display:none;">
                </label>
            ` : ''}
            <button onclick="exportPersonalPDF()" style="padding:6px 10px; background:#17a2b8; color:white; border:none; border-radius:4px; cursor:pointer;">📄 PDF Export</button>
        </div>
    </div>

    <table class="table table-striped" style="width:100%; border-collapse: collapse; background:#fff;">
        <thead style="background:#343a40; color:#fff;">
            <tr>
                <th style="padding:10px; border:1px solid #dee2e6;">Spind</th>
                <th style="padding:10px; border:1px solid #dee2e6;">Name</th>
                <th style="padding:10px; border:1px solid #dee2e6;">Funktion</th>
                <th style="padding:10px; border:1px solid #dee2e6;">G26.3 Ablauf</th>
                <th style="padding:10px; border:1px solid #dee2e6;">Qualifikationen</th>
                <th style="padding:10px; border:1px solid #dee2e6; text-align:center;">Aktionen</th>
            </tr>
        </thead>
        <tbody>`;

    if (gefiltert.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center; padding:15px; color:#777;">Keine Mitglieder gefunden.</td></tr>`;
    } else {
        gefiltert.forEach(p => {
            const name = escapeHtmlPersonal((p.vorname ? p.vorname + ' ' : '') + (p.nachname || p.name || ''));
            const quasis = Array.isArray(p.qualifikationen) ? p.qualifikationen.join(", ") : (p.qualifikationen || '-');
            const safeId = escapeHtmlPersonal(p.id);

            const aktionenHTML = kannSchreiben ? `
                <button title="Bearbeiten" onclick="openPersonalModal('${safeId}')" style="cursor:pointer; background:none; border:none;">✏️</button>
                <button title="Löschen" onclick="loeschePersonalItem('${safeId}')" style="cursor:pointer; background:none; border:none;">🗑️</button>
            ` : `<span style="color:#777;">👁️</span>`;

            html += `
            <tr style="border-bottom:1px solid #dee2e6;">
                <td style="padding:8px; border:1px solid #dee2e6;"><strong>${escapeHtmlPersonal(p.spind || '-')}</strong></td>
                <td style="padding:8px; border:1px solid #dee2e6;"><strong>${name}</strong></td>
                <td style="padding:8px; border:1px solid #dee2e6;">${escapeHtmlPersonal(p.funktion || '-')}</td>
                <td style="padding:8px; border:1px solid #dee2e6;">${escapeHtmlPersonal(p.g26Ablauf || '-')}</td>
                <td style="padding:8px; border:1px solid #dee2e6;">${escapeHtmlPersonal(quasis)}</td>
                <td style="padding:8px; border:1px solid #dee2e6; text-align:center;">${aktionenHTML}</td>
            </tr>`;
        });
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ------------------------------------------
// EVENT LISTENER & EXPORTE
// ------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    holePersonalDaten();
    renderPersonalView();
});

document.addEventListener("personalGeaendert", () => {
    renderPersonalView();
});

window.holePersonalDaten = holePersonalDaten;
window.speicherePersonalDaten = speicherePersonalDaten;
window.exportPersonalCSV = exportPersonalCSV;
window.importPersonalCSV = importPersonalCSV;
window.exportPersonalPDF = exportPersonalPDF;
window.openPersonalModal = openPersonalModal;
window.schliessePersonalModal = schliessePersonalModal;
window.speicherePersonalItem = speicherePersonalItem;
window.loeschePersonalItem = loeschePersonalItem;
window.renderPersonalView = renderPersonalView;
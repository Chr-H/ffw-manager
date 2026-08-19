// ==========================================
// FFW Manager - Lagerverwaltung (v0.6.3)
// ==========================================

let lagerDaten = ladeDaten("lager") || [];
let bearbeitungsLagerId = null;

// Hilfsfunktion: Safe HTML Escaping gegen XSS-Lücken
function escapeHtmlLager(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function holeLagerDaten() {
    lagerDaten = ladeDaten("lager") || [];
    return lagerDaten;
}

function speichereLagerDaten(daten) {
    lagerDaten = daten;
    speichereDaten("lager", daten);
    document.dispatchEvent(new Event("lagerGeaendert"));
}

// ------------------------------------------
// 1. CSV-IMPORT & EXPORT LOGIK
// ------------------------------------------

function parseCSVLine(line, delimiter) {
    let values = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        let char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            values.push(cur.trim().replace(/^"|"$/g, ''));
            cur = '';
        } else {
            cur += char;
        }
    }
    values.push(cur.trim().replace(/^"|"$/g, ''));
    return values;
}

function importLagerCSV(inputOrEvent) {
    if (typeof istEditor === "function" && !istEditor()) {
        alert("🔒 Schreibschutz aktiv! Bitte melde dich an, um Daten zu importieren.");
        return;
    }

    let inputElement = inputOrEvent;
    if (inputOrEvent && inputOrEvent.target) {
        inputElement = inputOrEvent.target;
    }

    const file = (inputElement && inputElement.files) ? inputElement.files[0] : null;
    if (!file) return;

    // FRAGE: Soll der alte Bestand überschrieben werden?
    const meeresErsetzen = confirm(
        "Möchtest du den vorhandenen Lagerbestand KOMPLETT ÜBERSCHREIBEN?\n\n" +
        "• OK = Bisherigen Bestand löschen und nur die Datei-Artikel laden\n" +
        "• Abbrechen = Artikel zu bestehendem Bestand hinzufügen / aktualisieren"
    );

    const reader = new FileReader();
    reader.onload = function (e) {
        let text = e.target.result;
        
        if (text.startsWith('\uFEFF')) {
            text = text.slice(1);
        }

        const zeilen = text.split(/\r\n|\n/).map(z => z.trim()).filter(z => z.length > 0);
        if (zeilen.length < 2) {
            alert("⚠️ Die CSV-Datei enthält keine verwertbaren Daten.");
            if (inputElement) inputElement.value = '';
            return;
        }

        const delim = zeilen[0].includes(';') ? ';' : ',';

        // 1. Spalten-Indizes anhand der Kopfzeile exakt ermitteln
        const headerCols = parseCSVLine(zeilen[0].toLowerCase(), delim);
        
        const idxId = headerCols.findIndex(h => h === "id");
        const idxArtNr = headerCols.findIndex(h => h.includes("art") || h.includes("nummer") || h.includes("numme"));
        const idxHersteller = headerCols.findIndex(h => h.includes("herstell"));
        
        // Exakte Erkennung der Bezeichnung (schließt Spalten wie "Artikelnummer" aus)
        const idxBez = headerCols.findIndex(h => 
            h.includes("bezeichn") || 
            h.includes("name") || 
            h.includes("produkt") || 
            (h.includes("artikel") && !h.includes("numm"))
        );
        
        const idxKat = headerCols.findIndex(h => h.includes("kategori") || h.includes("kategorie"));
        const idxGroesse = headerCols.findIndex(h => h.includes("größ") || h.includes("groess") || h.includes("größe"));
        const idxZustand = headerCols.findIndex(h => h.includes("zustand"));
        const idxBestand = headerCols.findIndex(h => h === "bestand" || h.includes("ist"));
        const idxMindest = headerCols.findIndex(h => h.includes("mindest"));
        const idxSoll = headerCols.findIndex(h => h.includes("soll"));

        // Wenn 'Ersetzen' gewählt wurde, starten wir mit einem leeren Array
        let aktuelleListe = meeresErsetzen ? [] : (typeof holeLagerDaten === "function" ? holeLagerDaten() : (ladeDaten("lager") || []));
        let hinzugefuegt = 0;
        let geaendert = 0;

        for (let i = 1; i < zeilen.length; i++) {
            const spalten = parseCSVLine(zeilen[i], delim);

            const rawId = idxId !== -1 ? (spalten[idxId] || '').trim() : '';
            const artNr = idxArtNr !== -1 ? (spalten[idxArtNr] || '').trim() : '';
            
            // Fallback: Falls keine Bezeichnung-Spalte gefunden wurde, nimm Spalte 3 (Index 2)
            let bezeichnung = idxBez !== -1 ? (spalten[idxBez] || '').trim() : (spalten[2] || '').trim();

            // Zeile überspringen, wenn weder Art.-Nr. noch Bezeichnung da sind
            if (!artNr && !bezeichnung) continue;

            const hersteller = idxHersteller !== -1 ? (spalten[idxHersteller] || '').trim() : '';
            const kategorie = idxKat !== -1 ? (spalten[idxKat] || 'Sonstiges').trim() : 'Sonstiges';
            const groesse = idxGroesse !== -1 ? (spalten[idxGroesse] || '').trim() : '';
            const zustand = idxZustand !== -1 ? (spalten[idxZustand] || 'Neu').trim() : 'Neu';
            const bestand = idxBestand !== -1 ? (parseInt(spalten[idxBestand], 10) || 0) : 0;
            const mindestbestand = idxMindest !== -1 ? (parseInt(spalten[idxMindest], 10) || 0) : 0;
            const sollbestand = idxSoll !== -1 ? (parseInt(spalten[idxSoll], 10) || 0) : 0;

            let existingIndex = -1;
            if (!meeresErsetzen && (rawId || artNr)) {
                existingIndex = aktuelleListe.findIndex(l => {
                    const matchId = rawId !== '' && String(l.id).toLowerCase() === rawId.toLowerCase();
                    const matchArt = artNr !== '' && String(l.artikelnummer || l.artNr || '').toLowerCase() === artNr.toLowerCase();
                    return matchId || matchArt;
                });
            }

            const item = {
                id: existingIndex !== -1 ? aktuelleListe[existingIndex].id : (rawId || ('LAGER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4))),
                artikelnummer: artNr,
                hersteller: hersteller,
                bezeichnung: bezeichnung || artNr || 'Unbenannter Artikel',
                name: bezeichnung || artNr || 'Unbenannter Artikel',
                kategorie: kategorie,
                groesse: groesse,
                zustand: zustand,
                bestand: bestand,
                mindestbestand: mindestbestand,
                sollbestand: sollbestand
            };

            if (existingIndex !== -1) {
                aktuelleListe[existingIndex] = item;
                geaendert++;
            } else {
                aktuelleListe.push(item);
                hinzugefuegt++;
            }
        }

        // Speichern
        if (typeof speichereLagerDaten === "function") {
            speichereLagerDaten(aktuelleListe);
        } else if (typeof speichereDaten === "function") {
            speichereDaten("lager", aktuelleListe);
        }
        
        // Ansicht neu rendern
        if (typeof renderLagerView === "function") renderLagerView();
        else if (typeof filterLager === "function") filterLager();

        if (inputElement) inputElement.value = '';

        alert(`✅ Import erfolgreich!\n\n• ${hinzugefuegt} Artikel geladen\n• ${geaendert} Artikel aktualisiert`);
    };

    reader.onerror = function() {
        alert("❌ Fehler beim Lesen der CSV-Datei.");
        if (inputElement) inputElement.value = '';
    };

    reader.readAsText(file, 'UTF-8');
}

function exportLagerCSV() {
    const daten = typeof holeLagerDaten === "function" ? holeLagerDaten() : (ladeDaten("lager") || []);

    if (!Array.isArray(daten) || daten.length === 0) {
        alert("⚠️ Es wurden keine Lagerdaten zum Exportieren gefunden.");
        return;
    }

    // Saubere und einheitliche Spaltenreihenfolge
    const headers = [
        "ID", 
        "Artikelnummer", 
        "Bezeichnung", 
        "Hersteller", 
        "Kategorie", 
        "Größe", 
        "Zustand", 
        "Bestand", 
        "Mindestbestand", 
        "Sollbestand"
    ];

    const rows = daten.map(l => [
        l.id || '',
        l.artikelnummer || l.artNr || '',
        l.bezeichnung || l.name || '',
        l.hersteller || '',
        l.kategorie || '',
        l.groesse || '',
        l.zustand || 'Neu',
        l.bestand !== undefined ? l.bestand : 0,
        l.mindestbestand !== undefined ? l.mindestbestand : 0,
        l.sollbestand !== undefined ? l.sollbestand : 0
    ]);

    const heute = new Date().toISOString().split('T')[0];
    const dateiname = `Lagerliste_FFW_${heute}.csv`;
    
    if (typeof window.downloadCSV === "function") {
        window.downloadCSV(dateiname, headers, rows);
    } else {
        const csvLines = [headers.join(";")];
        rows.forEach(r => csvLines.push(r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")));
        
        const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", dateiname);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ------------------------------------------
// 2. MODAL & FORMULAR-HANDLING
// ------------------------------------------

function erstelleModalFallsNichtVorhanden() {
    let modalEl = document.getElementById('lagerAkteModal');
    
    if (modalEl && !document.getElementById('lager-bezeichnung')) {
        modalEl.remove();
        modalEl = null;
    }

    if (!modalEl) {
        const modalHTML = `
        <div class="modal fade" id="lagerAkteModal" tabindex="-1" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999;" aria-hidden="true">
            <div class="modal-dialog modal-lg" style="max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; padding: 20px;">
                <div class="modal-content" style="border:none;">
                    <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ddd; padding-bottom:10px;">
                        <h5 class="modal-title" id="lagerModalTitle" style="margin:0; font-size:1.25rem;">Artikel bearbeiten</h5>
                        <button type="button" class="btn-close" onclick="schliesseLagerModal()" style="border:none; background:none; font-size:1.5rem; cursor:pointer;">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 15px 0;">
                        <form id="lagerAkteForm" onsubmit="event.preventDefault(); speichereLagerItem();">
                            <input type="hidden" id="lager-id">
                            <div style="display:flex; gap:10px; margin-bottom:10px;">
                                <div style="flex:1;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px;">Artikelnummer</label>
                                    <input type="text" class="form-control" id="lager-artikelnummer" style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                                <div style="flex:1;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px;">Hersteller</label>
                                    <input type="text" class="form-control" id="lager-hersteller" style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                            </div>
                            <div style="margin-bottom:10px;">
                                <label style="display:block; font-weight:bold; margin-bottom:3px;">Bezeichnung *</label>
                                <input type="text" class="form-control" id="lager-bezeichnung" required style="width:100%; padding:8px; box-sizing:border-box;">
                            </div>
                            <div style="display:flex; gap:10px; margin-bottom:10px;">
                                <div style="flex:1;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px;">Kategorie</label>
                                    <input type="text" class="form-control" id="lager-kategorie" style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                                <div style="flex:1;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px;">Größe</label>
                                    <input type="text" class="form-control" id="lager-groesse" style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                                <div style="flex:1;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px;">Zustand</label>
                                    <select class="form-select" id="lager-zustand" style="width:100%; padding:8px; box-sizing:border-box;">
                                        <option value="Neu">Neu</option>
                                        <option value="Gebraucht">Gebraucht</option>
                                    </select>
                                </div>
                            </div>
                            <div style="display:flex; gap:10px; margin-bottom:10px;">
                                <div style="flex:1;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px;">Bestand</label>
                                    <input type="number" class="form-control" id="lager-bestand" value="0" style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                                <div style="flex:1;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px;">Mindestbestand</label>
                                    <input type="number" class="form-control" id="lager-mindestbestand" value="0" style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                                <div style="flex:1;">
                                    <label style="display:block; font-weight:bold; margin-bottom:3px;">Sollbestand</label>
                                    <input type="number" class="form-control" id="lager-sollbestand" value="0" style="width:100%; padding:8px; box-sizing:border-box;">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid #ddd; padding-top:10px;">
                        <button type="button" class="btn btn-secondary" onclick="schliesseLagerModal()" style="padding:8px 12px; background:#6c757d; color:#fff; border:none; border-radius:4px; cursor:pointer;">Abbrechen</button>
                        <button type="button" class="btn btn-success" onclick="speichereLagerItem()" style="padding:8px 12px; background:#28a745; color:#fff; border:none; border-radius:4px; cursor:pointer;">Speichern</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

function openLagerAkteModal(id = null) {
    if (typeof istEditor === "function" && !istEditor()) {
        alert("🔒 Schreibschutz aktiv! Bitte melde dich an, um Artikel zu verwalten.");
        return;
    }

    erstelleModalFallsNichtVorhanden();

    bearbeitungsLagerId = id;
    const modalTitle = document.getElementById('lagerModalTitle');
    
    if (id) {
        const daten = holeLagerDaten();
        const item = daten.find(l => l.id === id);
        if (item) {
            if (modalTitle) modalTitle.innerText = "Artikel bearbeiten";
            document.getElementById('lager-id').value = item.id || '';
            document.getElementById('lager-artikelnummer').value = item.artikelnummer || '';
            document.getElementById('lager-hersteller').value = item.hersteller || '';
            document.getElementById('lager-bezeichnung').value = item.bezeichnung || item.name || '';
            document.getElementById('lager-kategorie').value = item.kategorie || '';
            document.getElementById('lager-groesse').value = item.groesse || '';
            document.getElementById('lager-zustand').value = item.zustand || 'Neu';
            document.getElementById('lager-bestand').value = item.bestand || 0;
            document.getElementById('lager-mindestbestand').value = item.mindestbestand || 0;
            document.getElementById('lager-sollbestand').value = item.sollbestand || 0;
        }
    } else {
        if (modalTitle) modalTitle.innerText = "Neuen Artikel anlegen";
        document.getElementById('lagerAkteForm').reset();
        document.getElementById('lager-id').value = '';
    }

    const modalEl = document.getElementById('lagerAkteModal');
    if (modalEl) {
        modalEl.style.display = 'block';
        modalEl.classList.add('show');
    }
}

function schliesseLagerModal() {
    const modalEl = document.getElementById('lagerAkteModal');
    if (modalEl) {
        modalEl.style.display = 'none';
        modalEl.classList.remove('show');
    }
    bearbeitungsLagerId = null;
}

function speichereLagerItem() {
    const bezeichnung = document.getElementById('lager-bezeichnung').value.trim();
    if (!bezeichnung) {
        alert("Bitte eine Bezeichnung eingeben.");
        return;
    }

    let liste = holeLagerDaten();
    const id = document.getElementById('lager-id').value;

    const itemData = {
        id: id || ('LAGER_' + Date.now()),
        artikelnummer: document.getElementById('lager-artikelnummer').value.trim(),
        hersteller: document.getElementById('lager-hersteller').value.trim(),
        bezeichnung: bezeichnung,
        name: bezeichnung,
        kategorie: document.getElementById('lager-kategorie').value.trim(),
        groesse: document.getElementById('lager-groesse').value.trim(),
        zustand: document.getElementById('lager-zustand').value,
        bestand: parseInt(document.getElementById('lager-bestand').value, 10) || 0,
        mindestbestand: parseInt(document.getElementById('lager-mindestbestand').value, 10) || 0,
        sollbestand: parseInt(document.getElementById('lager-sollbestand').value, 10) || 0
    };

    if (id) {
        const index = liste.findIndex(l => l.id === id);
        if (index !== -1) liste[index] = itemData;
    } else {
        liste.push(itemData);
    }

    speichereLagerDaten(liste);
    schliesseLagerModal();
    renderLagerView();
}

function loescheLagerItem(id) {
    if (typeof istEditor === "function" && !istEditor()) {
        alert("🔒 Schreibschutz aktiv!");
        return;
    }

    if (!confirm("Artikel wirklich löschen?")) return;

    let liste = holeLagerDaten().filter(l => l.id !== id);
    speichereLagerDaten(liste);
    renderLagerView();
}

// ------------------------------------------
// 3. ANZEIGE & RENDER-LOGIK
// ------------------------------------------

function renderLagerView() {
    const container = document.getElementById('lager-container');
    if (!container) return;

    const daten = holeLagerDaten();
    const sucheInput = document.getElementById('sucheLager');
    const suche = sucheInput ? sucheInput.value.toLowerCase() : '';

    const gefiltert = daten.filter(item => {
        const bez = (item.bezeichnung || item.name || '').toLowerCase();
        const art = (item.artikelnummer || '').toLowerCase();
        const kat = (item.kategorie || '').toLowerCase();
        return bez.includes(suche) || art.includes(suche) || kat.includes(suche);
    });

    let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
        <input type="text" id="sucheLager" placeholder="🔍 Artikel suchen..." oninput="renderLagerView()" value="${escapeHtmlLager(suche)}" style="padding:8px; border-radius:4px; border:1px solid #ccc; max-width:300px;">
        <button class="btn btn-primary" onclick="openLagerAkteModal()" style="padding:8px 12px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">➕ Artikel anlegen</button>
    </div>
    <table class="table table-striped table-hover" style="width:100%; border-collapse: collapse; background:#fff;">
        <thead style="background:#343a40; color:#fff;">
            <tr>
                <th style="padding:10px; border:1px solid #dee2e6;">Aktionen</th>
                <th style="padding:10px; border:1px solid #dee2e6;">Art.-Nr.</th>
                <th style="padding:10px; border:1px solid #dee2e6;">Bezeichnung</th>
                <th style="padding:10px; border:1px solid #dee2e6;">Kategorie</th>
                <th style="padding:10px; border:1px solid #dee2e6;">Größe</th>
                <th style="padding:10px; border:1px solid #dee2e6;">Zustand</th>
                <th style="padding:10px; border:1px solid #dee2e6;">Bestand / Soll</th>
                <th style="padding:10px; border:1px solid #dee2e6;">Status</th>
            </tr>
        </thead>
        <tbody>`;

    if (gefiltert.length === 0) {
        html += `<tr><td colspan="8" style="text-align:center; padding:15px; color:#777;">Keine Artikel im Lager vorhanden.</td></tr>`;
    } else {
        gefiltert.forEach(item => {
            const best = item.bestand || 0;
            const mind = item.mindestbestand || 0;
            
            let statusBadge = '<span style="background:#28a745; color:white; padding:3px 8px; border-radius:4px; font-size:0.85em;">O.K.</span>';
            if (best === 0) {
                statusBadge = '<span style="background:#dc3545; color:white; padding:3px 8px; border-radius:4px; font-size:0.85em;">Leer</span>';
            } else if (best <= mind) {
                statusBadge = '<span style="background:#ffc107; color:black; padding:3px 8px; border-radius:4px; font-size:0.85em;">Nachbestellen</span>';
            }

            const safeId = escapeHtmlLager(item.id);

            html += `
            <tr style="border-bottom:1px solid #dee2e6;">
                <td style="padding:8px; border:1px solid #dee2e6; text-align:center;">
                    <button class="btn btn-sm" title="Bearbeiten" onclick="openLagerAkteModal('${safeId}')" style="cursor:pointer; background:none; border:none;">✏️</button>
                    <button class="btn btn-sm" title="Löschen" onclick="loescheLagerItem('${safeId}')" style="cursor:pointer; background:none; border:none;">🗑️</button>
                </td>
                <td style="padding:8px; border:1px solid #dee2e6;"><strong>${escapeHtmlLager(item.artikelnummer || '-')}</strong></td>
                <td style="padding:8px; border:1px solid #dee2e6;">${escapeHtmlLager(item.bezeichnung || item.name || '-')}</td>
                <td style="padding:8px; border:1px solid #dee2e6;">${escapeHtmlLager(item.kategorie || '-')}</td>
                <td style="padding:8px; border:1px solid #dee2e6;">${escapeHtmlLager(item.groesse || '-')}</td>
                <td style="padding:8px; border:1px solid #dee2e6;">${escapeHtmlLager(item.zustand || 'Neu')}</td>
                <td style="padding:8px; border:1px solid #dee2e6;"><strong>${best}</strong> / <small style="color:#6c757d;">Soll: ${item.sollbestand || 0}</small></td>
                <td style="padding:8px; border:1px solid #dee2e6; text-align:center;">${statusBadge}</td>
            </tr>`;
        });
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ------------------------------------------
// EVENT LISTENER & FREIGABEN
// ------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    holeLagerDaten();
    renderLagerView();
});

document.addEventListener("lagerGeaendert", () => {
    renderLagerView();
});

// Globale Schnittstellen für HTML-Event-Handler
window.holeLagerDaten = holeLagerDaten;
window.speichereLagerDaten = speichereLagerDaten;
window.importLagerCSV = importLagerCSV;
window.exportLagerCSV = exportLagerCSV;
window.openLagerAkteModal = openLagerAkteModal;
window.schliesseLagerModal = schliesseLagerModal;
window.speichereLagerItem = speichereLagerItem;
window.loescheLagerItem = loescheLagerItem;
window.renderLagerView = renderLagerView;
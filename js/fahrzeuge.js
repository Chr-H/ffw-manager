// ==========================================
// FFW Manager - Fahrzeugverwaltung & Akte
// ==========================================

let aktuellesFahrzeugId = null;

// 1. Tabelle auf der linken Seite rendern
function renderFahrzeugeView() {
    const tbody = document.getElementById('fahrzeugeListe');
    if (!tbody) return;

    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    tbody.innerHTML = '';

    if (fahrzeuge.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:#777;">Keine Fahrzeuge vorhanden.</td></tr>`;
        return;
    }

    fahrzeuge.forEach(f => {
        const tr = document.createElement('tr');
        
        let statusBadge = '🟢 Einsatzbereit';
        if (f.status === 'Wartung') statusBadge = '🟡 Wartung';
        if (f.status === 'Defekt') statusBadge = '🔴 Defekt';

        tr.innerHTML = `
            <td class="no-print">
                <button onclick="oeffneFahrzeugAkte('${f.id}')" title="Fahrzeugakte / Abteile öffnen" style="padding:4px 8px; cursor:pointer;">👁️</button>
                <button onclick="loescheFahrzeug('${f.id}')" title="Fahrzeug löschen" style="padding:4px 8px; cursor:pointer; background:#dc3545; color:white; border:none; border-radius:3px;">🗑️</button>
            </td>
            <td><strong>${f.callSign || f.name || '-'}</strong></td>
            <td>${f.typ || '-'}</td>
            <td>${f.licensePlate || f.kennzeichen || '-'}</td>
            <td>${f.nextHU || f.tuev || '-'}</td>
            <td>${statusBadge}</td>
        `;

        tbody.appendChild(tr);
    });
}

// 2. Neues Fahrzeug über das obere Formular speichern
function neuesFahrzeugSpeichern() {
    const funkruf = document.getElementById('fz-funkruf')?.value;
    const kennzeichen = document.getElementById('fz-kennzeichen')?.value;
    const typ = document.getElementById('fz-typ')?.value;
    const baujahr = document.getElementById('fz-baujahr')?.value;
    const tuev = document.getElementById('fz-tuev')?.value;
    const sp = document.getElementById('fz-sp')?.value;
    const status = document.getElementById('fz-status')?.value || 'Einsatzbereit';

    if (!funkruf && !typ) {
        alert('Bitte mindestens einen Funkrufnamen oder Fahrzeugtyp eingeben!');
        return;
    }

    const neuesFahrzeug = {
        id: 'VEH-' + Date.now(),
        callSign: funkruf,
        name: funkruf || typ,
        kennzeichen: kennzeichen,
        licensePlate: kennzeichen,
        typ: typ,
        baujahr: baujahr,
        tuev: tuev,
        nextHU: tuev,
        sp: sp,
        nextSP: sp,
        status: status,
        abteile: [
            { name: 'G1 (Geräteraum 1)', inhalt: '' },
            { name: 'G2 (Geräteraum 2)', inhalt: '' },
            { name: 'GR (Geräteraum Heck)', inhalt: '' }
        ]
    };

    let fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    fahrzeuge.push(neuesFahrzeug);

    if (typeof speichereDaten === 'function') {
        speichereDaten('fahrzeuge', fahrzeuge);
    }

    // Felder zurücksetzen
    ['fz-funkruf', 'fz-kennzeichen', 'fz-typ', 'fz-baujahr', 'fz-tuev', 'fz-sp'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    renderFahrzeugeView();
    oeffneFahrzeugAkte(neuesFahrzeug.id);

    if (typeof aktualisiereDashboard === 'function') {
        aktualisiereDashboard();
    }
}

// 3. Rechte Seite: Fahrzeugakte & Geräteabteile rendern
// ==========================================
// GRAFISCHE FAHRZEUGAKTE & EXPORT (ERSETZTER BLOCK)
// ==========================================

function oeffneFahrzeugAkte(id) {
    aktuellesFahrzeugId = id;
    const container = document.getElementById('fahrzeugAkteContainer');
    if (!container) return;

    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => x.id === id);

    if (!f) {
        container.innerHTML = `<h2>📋 Fahrzeugakte</h2><p style="color:#777;">Fahrzeug nicht gefunden.</p>`;
        return;
    }

    if (!f.abteile) {
        f.abteile = [
            { name: 'G1 (Geräteraum 1)', pos: 'Links', inhalt: '' },
            { name: 'G2 (Geräteraum 2)', pos: 'Rechts', inhalt: '' },
            { name: 'GR (Geräteraum Heck)', pos: 'Heck', inhalt: '' }
        ];
    }

    // GRAFISCHE DARSTELLUNG DER GERÄTERÄUME (Grid / Kacheln)
    let abteileHTML = f.abteile.map((a, index) => {
        let badgeColor = "#0d6efd";
        if (a.pos === "Links") badgeColor = "#198754";
        if (a.pos === "Rechts") badgeColor = "#fd7e14";
        if (a.pos === "Heck") badgeColor = "#6f42c1";

        return `
            <div class="abteil-kachel" style="background:#ffffff; border:2px solid #cbd5e1; border-top:5px solid ${badgeColor}; border-radius:8px; padding:12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="background:${badgeColor}; color:white; font-size:0.7em; padding:2px 6px; border-radius:3px; font-weight:bold; text-transform:uppercase;">${a.pos || 'Allgemein'}</span>
                    <button type="button" onclick="entferneAbteil(${index})" style="background:#dc3545; color:white; border:none; border-radius:3px; padding:2px 6px; cursor:pointer;" title="Löschen">✕</button>
                </div>
                <div>
                    <input type="text" value="${a.name || ''}" onchange="updateAbteilName(${index}, this.value)" style="font-weight:bold; width:100%; padding:4px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;" placeholder="Geräteraum Name">
                </div>
                <div style="display:flex; gap:5px; align-items:center;">
                    <label style="font-size:0.75em; font-weight:bold;">Seite:</label>
                    <select onchange="updateAbteilPos(${index}, this.value)" style="font-size:0.8em; padding:2px;">
                        <option value="Links" ${a.pos === 'Links' ? 'selected' : ''}>⬅️ Links (G1/G3/G5)</option>
                        <option value="Rechts" ${a.pos === 'Rechts' ? 'selected' : ''}>➡️ Rechts (G2/G4/G6)</option>
                        <option value="Heck" ${a.pos === 'Heck' ? 'selected' : ''}>⬇️ Heck (GR)</option>
                        <option value="Dach" ${a.pos === 'Dach' ? 'selected' : ''}>⬆️ Dach</option>
                    </select>
                </div>
                <textarea onchange="updateAbteilInhalt(${index}, this.value)" style="width:100%; height:75px; padding:6px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px; font-family:sans-serif; resize:vertical;" placeholder="Beladung / Geräte...">${a.inhalt || ''}</textarea>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #eee; padding-bottom:10px; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
            <h2>📋 Fahrzeugakte: ${f.callSign || f.name}</h2>
            <div style="display:flex; gap:8px;">
                <button onclick="druckeFahrzeugAkte()" style="background:#17a2b8; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">🖨️ Akte PDF / Drucken</button>
                <button onclick="speichereAkte()" style="background:#2e7d32; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">💾 Speichern</button>
            </div>
        </div>

        <!-- STAMMDATEN -->
        <div style="background:#f0f4f8; padding:12px; border-radius:6px; margin-bottom:15px; border:1px solid #cbd5e1;">
            <h3 style="margin-top:0; margin-bottom:10px; font-size:1.05em;">✏️ Stammdaten</h3>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:10px;">
                <div>
                    <label style="font-size:0.8em; font-weight:bold; display:block;">Funkrufname / Name:</label>
                    <input type="text" id="akte-callSign" value="${f.callSign || f.name || ''}" style="width:100%; padding:5px; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:0.8em; font-weight:bold; display:block;">Fahrzeugtyp:</label>
                    <input type="text" id="akte-typ" value="${f.typ || ''}" style="width:100%; padding:5px; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:0.8em; font-weight:bold; display:block;">Amtl. Kennzeichen:</label>
                    <input type="text" id="akte-kennzeichen" value="${f.kennzeichen || f.licensePlate || ''}" style="width:100%; padding:5px; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:0.8em; font-weight:bold; display:block;">Baujahr:</label>
                    <input type="number" id="akte-baujahr" value="${f.baujahr || ''}" style="width:100%; padding:5px; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:0.8em; font-weight:bold; display:block;">TÜV / HU Datum:</label>
                    <input type="date" id="akte-tuev" value="${f.tuev || f.nextHU || ''}" style="width:100%; padding:5px; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:0.8em; font-weight:bold; display:block;">SP Datum:</label>
                    <input type="date" id="akte-sp" value="${f.sp || f.nextSP || ''}" style="width:100%; padding:5px; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:0.8em; font-weight:bold; display:block;">Status:</label>
                    <select id="akte-status" style="width:100%; padding:5px; box-sizing:border-box;">
                        <option value="Einsatzbereit" ${f.status === 'Einsatzbereit' ? 'selected' : ''}>🟢 Einsatzbereit</option>
                        <option value="Wartung" ${f.status === 'Wartung' ? 'selected' : ''}>🟡 Wartung</option>
                        <option value="Defekt" ${f.status === 'Defekt' ? 'selected' : ''}>🔴 Defekt</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- GRAFISCHER GERÄTERAUM-RASTER -->
        <h3 style="margin-bottom:8px; font-size:1.05em;">📦 Geräteräume & Beladung</h3>
        <div id="abteile-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:15px; margin-bottom:12px;">
            ${abteileHTML}
        </div>
        <button type="button" onclick="fuegeAbteilHinzu()" style="background:#6c757d; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">+ Geräteraum hinzufügen</button>
    `;
}

// ZUSÄTZLICH DIREKT DARUNTER EINFÜGEN:
function updateAbteilPos(index, pos) {
    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => x.id === aktuellesFahrzeugId);
    if (f && f.abteile && f.abteile[index]) {
        f.abteile[index].pos = pos;
        if (typeof speichereDaten === 'function') speichereDaten('fahrzeuge', fahrzeuge);
        oeffneFahrzeugAkte(aktuellesFahrzeugId);
    }
}

function druckeFahrzeugAkte() {
    if (!aktuellesFahrzeugId) return;

    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => x.id === aktuellesFahrzeugId);

    if (!f) return;

    const printWindow = window.open('', '_blank');
    
    let abteilePrintHTML = (f.abteile || []).map(a => `
        <div style="border:1px solid #333; border-radius:4px; padding:10px; margin-bottom:10px; page-break-inside: avoid;">
            <div style="font-weight:bold; background:#eee; padding:4px 8px; margin:-10px -10px 8px -10px; border-bottom:1px solid #333; display:flex; justify-content:space-between;">
                <span>${a.name || 'Geräteraum'}</span>
                <span>[${a.pos || 'Allgemein'}]</span>
            </div>
            <div style="white-space: pre-wrap; font-family: monospace; font-size: 0.9em;">${a.inhalt || 'Keine Beladung eingetragen.'}</div>
        </div>
    `).join('');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Fahrzeugakte - ${f.callSign || f.name}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
                h1 { border-bottom: 2px solid #000; padding-bottom: 5px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
                .box { border: 1px solid #ccc; padding: 8px; border-radius: 4px; }
                @media print {
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>📋 Fahrzeugakte: ${f.callSign || f.name}</h1>
            <div class="grid">
                <div class="box"><strong>Fahrzeugtyp:</strong> ${f.typ || '-'}</div>
                <div class="box"><strong>Kennzeichen:</strong> ${f.kennzeichen || f.licensePlate || '-'}</div>
                <div class="box"><strong>Baujahr:</strong> ${f.baujahr || '-'}</div>
                <div class="box"><strong>Status:</strong> ${f.status || 'Einsatzbereit'}</div>
                <div class="box"><strong>Nächste HU / TÜV:</strong> ${f.tuev || f.nextHU || '-'}</div>
                <div class="box"><strong>Nächste SP:</strong> ${f.sp || f.nextSP || '-'}</div>
            </div>

            <h2>📦 Beladung / Geräteraum-Übersicht</h2>
            ${abteilePrintHTML}

            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
}


// 4. Hilfsfunktionen für Geräteabteile
function updateAbteilName(index, name) {
    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => x.id === aktuellesFahrzeugId);
    if (f && f.abteile && f.abteile[index]) {
        f.abteile[index].name = name;
    }
}

function updateAbteilInhalt(index, inhalt) {
    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => x.id === aktuellesFahrzeugId);
    if (f && f.abteile && f.abteile[index]) {
        f.abteile[index].inhalt = inhalt;
    }
}

function fuegeAbteilHinzu() {
    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => x.id === aktuellesFahrzeugId);
    if (f) {
        if (!f.abteile) f.abteile = [];
        f.abteile.push({ name: 'Neues Abteil', inhalt: '' });
        if (typeof speichereDaten === 'function') speichereDaten('fahrzeuge', fahrzeuge);
        oeffneFahrzeugAkte(aktuellesFahrzeugId);
    }
}

function entferneAbteil(index) {
    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => x.id === aktuellesFahrzeugId);
    if (f && f.abteile) {
        f.abteile.splice(index, 1);
        if (typeof speichereDaten === 'function') speichereDaten('fahrzeuge', fahrzeuge);
        oeffneFahrzeugAkte(aktuellesFahrzeugId);
    }
}

function speichereAkte() {
    if (!aktuellesFahrzeugId) return;

    let fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => x.id === aktuellesFahrzeugId);

    if (f) {
        f.callSign = document.getElementById('akte-callSign')?.value || f.callSign;
        f.name = f.callSign;
        f.typ = document.getElementById('akte-typ')?.value || f.typ;
        f.kennzeichen = document.getElementById('akte-kennzeichen')?.value || f.kennzeichen;
        f.licensePlate = f.kennzeichen;
        f.baujahr = document.getElementById('akte-baujahr')?.value || f.baujahr;
        f.tuev = document.getElementById('akte-tuev')?.value || f.tuev;
        f.nextHU = f.tuev;
        f.sp = document.getElementById('akte-sp')?.value || f.sp;
        f.nextSP = f.sp;
        f.status = document.getElementById('akte-status')?.value || f.status;

        if (typeof speichereDaten === 'function') {
            speichereDaten('fahrzeuge', fahrzeuge);
        }

        renderFahrzeugeView();
        if (typeof aktualisiereDashboard === 'function') {
            aktualisiereDashboard();
        }

        alert('Stammdaten und Geräteabteile erfolgreich gespeichert!');
    }
}

// 5. Löschen-Funktion
function loescheFahrzeug(id) {
    if (confirm('Möchtest du dieses Fahrzeug wirklich löschen?')) {
        let fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
        fahrzeuge = fahrzeuge.filter(x => x.id !== id);

        if (typeof speichereDaten === 'function') {
            speichereDaten('fahrzeuge', fahrzeuge);
        }

        renderFahrzeugeView();
        
        const container = document.getElementById('fahrzeugAkteContainer');
        if (container) {
            container.innerHTML = `
                <h2>📋 Fahrzeugakte</h2>
                <p style="color:#777;">Bitte links ein Fahrzeug auswählen (👁️ klicken).</p>
            `;
        }

        if (typeof aktualisiereDashboard === 'function') {
            aktualisiereDashboard();
        }
    }
}

// ==========================================
// 6. EXPORT FUNKTION (CSV)
// ==========================================
function exportFahrzeugeCSV() {
    try {
        const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
        if (!fahrzeuge || fahrzeuge.length === 0) {
            alert('⚠️ Keine Fahrzeuge zum Exportieren vorhanden.');
            return;
        }

        const headers = ["ID", "Funkrufname", "Fahrzeugtyp", "Kennzeichen", "Baujahr", "TUEV / HU", "SP", "Status"];
        let csvContent = headers.map(h => `"${h}"`).join(";") + "\r\n";

        fahrzeuge.forEach(f => {
            const row = [
                f.id || "",
                f.callSign || f.name || "",
                f.typ || "",
                f.licensePlate || f.kennzeichen || "",
                f.baujahr || "",
                f.nextHU || f.tuev || "",
                f.nextSP || f.sp || "",
                f.status || "Einsatzbereit"
            ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(";");

            csvContent += row + "\r\n";
        });

        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const datum = new Date().toISOString().slice(0, 10);
        
        link.setAttribute("href", url);
        link.setAttribute("download", `Fahrzeuge_Export_${datum}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (err) {
        alert("❌ Fehler beim Exportieren:\n" + err.message);
    }
}

// ==========================================
// 7. IMPORT FUNKTION (CSV)
// ==========================================
function importFahrzeugeCSV(inputOrEvent) {
    try {
        let inputElement = inputOrEvent;
        if (inputOrEvent && inputOrEvent.target) inputElement = inputOrEvent.target;

        const file = (inputElement && inputElement.files) ? inputElement.files[0] : null;
        if (!file) return;

        const meeresErsetzen = confirm(
            "Möchtest du die Fahrzeuge KOMPLETT ÜBERSCHREIBEN?\n\n" +
            "• OK = Bisherige Fahrzeuge löschen\n" +
            "• Abbrechen = Neue Fahrzeuge ergänzen/aktualisieren"
        );

        let fahrzeuge = meeresErsetzen ? [] : (typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : []);

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let text = e.target.result;
                if (text.charCodeAt(0) === 0xFEFF) text = text.substr(1);

                const zeilen = text.split(/\r\n|\n/).filter(z => z.trim() !== "");
                if (zeilen.length < 2) {
                    alert("Die Datei enthält keine Daten.");
                    return;
                }

                const trenner = zeilen[0].includes(";") ? ";" : ",";
                const headers = zeilen[0].split(trenner).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

                const findIdx = (...kw) => headers.findIndex(h => kw.some(k => h.includes(k)));

                const idxId = findIdx("id");
                const idxFunkruf = findIdx("funkruf", "name", "callsign");
                const idxTyp = findIdx("typ", "modell");
                const idxKennzeichen = findIdx("kennzeichen", "license");
                const idxBaujahr = findIdx("baujahr", "jahr");
                const idxTuev = findIdx("tüv", "tuev", "hu");
                const idxSp = findIdx("sp");
                const idxStatus = findIdx("status");

                let neu = 0;
                let aktualisiert = 0;

                for (let i = 1; i < zeilen.length; i++) {
                    const spalten = zeilen[i]
                        .split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                        .map(s => s.replace(/^"|"$/g, '').trim());

                    if (spalten.length === 0 || spalten.every(s => s === "")) continue;

                    const id = idxId !== -1 ? spalten[idxId] : "";
                    const funkruf = idxFunkruf !== -1 ? spalten[idxFunkruf] : "";
                    const typ = idxTyp !== -1 ? spalten[idxTyp] : "";
                    const kennzeichen = idxKennzeichen !== -1 ? spalten[idxKennzeichen] : "";
                    const baujahr = idxBaujahr !== -1 ? spalten[idxBaujahr] : "";
                    const tuev = idxTuev !== -1 ? spalten[idxTuev] : "";
                    const sp = idxSp !== -1 ? spalten[idxSp] : "";
                    const status = idxStatus !== -1 ? spalten[idxStatus] : "Einsatzbereit";

                    if (!funkruf && !typ && !kennzeichen) continue;

                    // Existentes Fahrzeug suchen
                    let matchIndex = -1;
                    if (!meeresErsetzen) {
                        matchIndex = fahrzeuge.findIndex(f => 
                            (id && f.id === id) || 
                            (funkruf && (f.callSign || f.name || '').toLowerCase() === funkruf.toLowerCase())
                        );
                    }

                    const fzObject = {
                        id: matchIndex !== -1 ? fahrzeuge[matchIndex].id : (id || 'VEH-' + Date.now() + '_' + i),
                        callSign: funkruf,
                        name: funkruf || typ,
                        typ: typ,
                        kennzeichen: kennzeichen,
                        licensePlate: kennzeichen,
                        baujahr: baujahr,
                        tuev: tuev,
                        nextHU: tuev,
                        sp: sp,
                        nextSP: sp,
                        status: status || 'Einsatzbereit',
                        abteile: matchIndex !== -1 ? (fahrzeuge[matchIndex].abteile || []) : [
                            { name: 'G1 (Geräteraum 1)', inhalt: '' },
                            { name: 'G2 (Geräteraum 2)', inhalt: '' },
                            { name: 'GR (Geräteraum Heck)', inhalt: '' }
                        ]
                    };

                    if (matchIndex !== -1) {
                        fahrzeuge[matchIndex] = fzObject;
                        aktualisiert++;
                    } else {
                        fahrzeuge.push(fzObject);
                        neu++;
                    }
                }

                if (typeof speichereDaten === 'function') {
                    speichereDaten('fahrzeuge', fahrzeuge);
                }

                renderFahrzeugeView();
                if (typeof aktualisiereDashboard === 'function') aktualisiereDashboard();

                alert(`✅ Fahrzeug-Import erfolgreich!\n\n• ${neu} neu hinzugefügt\n• ${aktualisiert} aktualisiert`);
                if (inputElement) inputElement.value = '';

            } catch (err) {
                alert("Fehler beim Verarbeiten der CSV-Datei:\n" + err.message);
            }
        };

        reader.readAsText(file, "UTF-8");

    } catch (err) {
        alert("Fehler beim Starten des Imports:\n" + err.message);
    }
}

// Global registrieren
window.renderFahrzeugeView = renderFahrzeugeView;
window.neuesFahrzeugSpeichern = neuesFahrzeugSpeichern;
window.oeffneFahrzeugAkte = oeffneFahrzeugAkte;
window.fuegeAbteilHinzu = fuegeAbteilHinzu;
window.entferneAbteil = entferneAbteil;
window.updateAbteilName = updateAbteilName;
window.updateAbteilInhalt = updateAbteilInhalt;
window.speichereAkte = speichereAkte;
window.loescheFahrzeug = loescheFahrzeug;
window.exportFahrzeugeCSV = exportFahrzeugeCSV;
window.importFahrzeugeCSV = importFahrzeugeCSV;
window.druckeFahrzeugAkte = druckeFahrzeugAkte;
window.updateAbteilPos = updateAbteilPos;

document.addEventListener('DOMContentLoaded', () => {
    renderFahrzeugeView();
});
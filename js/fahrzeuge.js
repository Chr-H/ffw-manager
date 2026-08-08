// Globale Variable für das aktuell ausgewählte Fahrzeug
let aktuellesFahrzeugId = null;

// Initiales Rendern der Übersicht
function renderFahrzeugeView() {
    ladeFahrzeugTabelle();
}

// Fahrzeugliste laden & anzeigen
function ladeFahrzeugTabelle() {
    const fahrzeuge = typeof ladeDaten === "function" ? (ladeDaten("fahrzeuge") || []) : [];
    const tbody = document.getElementById("fahrzeugeListe");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (fahrzeuge.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#777;">Keine Fahrzeuge vorhanden.</td></tr>`;
        return;
    }

    fahrzeuge.forEach(fz => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="no-print">
                <button title="Akte öffnen" onclick="oeffneFahrzeugAkte('${fz.id}')">👁️</button>
                <button title="Löschen" onclick="loescheFahrzeug('${fz.id}')">🗑️</button>
            </td>
            <td><strong>${fz.funkrufname || '-'}</strong></td>
            <td>${fz.typ || '-'}</td>
            <td>${fz.kennzeichen || '-'}</td>
            <td>${fz.tuev || '-'}</td>
            <td>${fz.status || 'Einsatzbereit'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Neues Fahrzeug im Speicher ablegen
function neuesFahrzeugSpeichern() {
    const funkruf = document.getElementById("fz-funkruf").value.trim();
    const kennzeichen = document.getElementById("fz-kennzeichen").value.trim();
    const typ = document.getElementById("fz-typ").value.trim();
    const baujahr = document.getElementById("fz-baujahr").value;
    const tuev = document.getElementById("fz-tuev").value;
    const sp = document.getElementById("fz-sp").value;
    const status = document.getElementById("fz-status").value;

    if (!funkruf) {
        alert("Bitte mindestens den Funkrufnamen angeben.");
        return;
    }

    const fahrzeuge = typeof ladeDaten === "function" ? (ladeDaten("fahrzeuge") || []) : [];
    
    const neuesFZ = {
        id: 'fz_' + Date.now(),
        funkrufname: funkruf,
        kennzeichen: kennzeichen,
        typ: typ,
        baujahr: baujahr,
        tuev: tuev,
        sp: sp,
        status: status,
        beladung: [],      // Array für Zuweisungen (z. B. { fach: "G1", geraet: "Stromerzeuger" })
        wartungen: [],     // Array für Historie/Reparaturen
        pruefplan: []      // Array für Beladungsprüfungen
    };

    fahrzeuge.push(neuesFZ);
    if (typeof speichereDaten === "function") speichereDaten("fahrzeuge", fahrzeuge);

    // Formular zurücksetzen & Liste neu laden
    document.getElementById("fz-funkruf").value = "";
    document.getElementById("fz-kennzeichen").value = "";
    document.getElementById("fz-typ").value = "";
    document.getElementById("fz-baujahr").value = "";
    document.getElementById("fz-tuev").value = "";
    document.getElementById("fz-sp").value = "";

    ladeFahrzeugTabelle();
    oeffneFahrzeugAkte(neuesFZ.id);
}

// Öffnet die Detail-Akte mit Reiter-Navigation
function oeffneFahrzeugAkte(fzId) {
    aktuellesFahrzeugId = fzId;
    const fahrzeuge = typeof ladeDaten === "function" ? (ladeDaten("fahrzeuge") || []) : [];
    const fz = fahrzeuge.find(item => item.id === fzId);

    const container = document.getElementById("fahrzeugAkteContainer");
    if (!container || !fz) return;

    container.innerHTML = `
        <div style="border-bottom: 2px solid #ddd; padding-bottom:10px; margin-bottom:15px;">
            <h2 style="margin:0;">🚒 ${fz.funkrufname}</h2>
            <small style="color:#666;">${fz.typ || 'Fahrzeug'} | ${fz.kennzeichen || 'Kein Kennzeichen'}</small>
        </div>

        <!-- Reiter / Tabs Navigation -->
        <div style="display:flex; gap:5px; margin-bottom:15px; border-bottom:1px solid #ccc;" class="no-print">
            <button class="btn" style="border-radius:4px 4px 0 0;" onclick="wechselFahrzeugTab('stammdaten')">📋 Stammdaten</button>
            <button class="btn" style="border-radius:4px 4px 0 0;" onclick="wechselFahrzeugTab('beladung')">📦 Beladung / Raum</button>
            <button class="btn" style="border-radius:4px 4px 0 0;" onclick="wechselFahrzeugTab('pruefplan')">📊 Prüfplan</button>
            <button class="btn" style="border-radius:4px 4px 0 0;" onclick="wechselFahrzeugTab('wartung')">🛠️ Wartung & Mängel</button>
        </div>

        <!-- Tab Inhaltsbereiche -->
        <div id="tab-fz-content"></div>
    `;

    wechselFahrzeugTab('stammdaten');
}

// Umschalten der Tabs in der Akte
function wechselFahrzeugTab(tabName) {
    const fahrzeuge = typeof ladeDaten === "function" ? (ladeDaten("fahrzeuge") || []) : [];
    const fz = fahrzeuge.find(item => item.id === aktuellesFahrzeugId);
    const content = document.getElementById("tab-fz-content");
    if (!content || !fz) return;

    if (tabName === 'stammdaten') {
        content.innerHTML = `
            <h3>Stammdaten & Termine</h3>
            <p><strong>Baujahr:</strong> ${fz.baujahr || 'Nicht angegeben'}</p>
            <p><strong>Nächster TÜV / HU:</strong> ${fz.tuev || 'Kein Datum'}</p>
            <p><strong>Nächste SP:</strong> ${fz.sp || 'Kein Datum'}</p>
            <p><strong>Status:</strong> ${fz.status}</p>
        `;
    } 
    else if (tabName === 'beladung') {
        let beladungHTML = (fz.beladung || []).map((b, idx) => `
            <tr>
                <td><strong>${b.raum}</strong></td>
                <td>${b.gegenstand}</td>
                <td class="no-print"><button onclick="entferneBeladung(${idx})">🗑️</button></td>
            </tr>
        `).join("");

        content.innerHTML = `
            <h3>Lageplan & Geräte-Zuordnung</h3>
            <div style="display:flex; gap:5px; margin-bottom:15px;" class="no-print">
                <select id="fz-raum-select">
                    <option value="Kabine">Mannschaftskabine</option>
                    <option value="G1">Geräteraum G1 (Links Vorne)</option>
                    <option value="G2">Geräteraum G2 (Rechts Vorne)</option>
                    <option value="G3">Geräteraum G3 (Links Mitte)</option>
                    <option value="G4">Geräteraum G4 (Rechts Mitte)</option>
                    <option value="G5">Geräteraum G5 (Links Hinten)</option>
                    <option value="G6">Geräteraum G6 (Rechts Hinten)</option>
                    <option value="GR">Geräteraum GR (Heck)</option>
                    <option value="Dach">Dachbeladung</option>
                </select>
                <input id="fz-geraet-input" type="text" placeholder="Gerät / Gegenstand">
                <button onclick="fuegeBeladungHinzu()">➕ Zuordnen</button>
            </div>
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#f2f2f2;"><th>Lagerort</th><th>Gegenstand</th><th class="no-print"></th></tr>
                </thead>
                <tbody>${beladungHTML || '<tr><td colspan="3">Noch keine Beladung eingetragen.</td></tr>'}</tbody>
            </table>
        `;
    }
    else if (tabName === 'pruefplan') {
        content.innerHTML = `
            <h3>Prüfplan der Beladung</h3>
            <p><small>Wiederkehrende Funktionskontrollen (z. B. Stromerzeuger Probelauf, Kettensäge).</small></p>
            <button onclick="alert('Funktion in Kürze verfügbar')">➕ Prüfpunkt hinzufügen</button>
        `;
    }
    else if (tabName === 'wartung') {
        let wartungHTML = (fz.wartungen || []).map(w => `
            <div style="border-left:3px solid #007bff; padding-left:8px; margin-bottom:10px;">
                <small>${w.datum}</small> - <strong>${w.titel}</strong>
                <br><span style="font-size:0.9em; color:#555;">${w.beschreibung}</span>
            </div>
        `).join("");

        content.innerHTML = `
            <h3>Wartung & Reparaturhistorie</h3>
            <div style="display:flex; flex-direction:column; gap:5px; margin-bottom:15px;" class="no-print">
                <input id="fz-w-titel" type="text" placeholder="Titel (z. B. Ölwechsel, Kundendienst)">
                <textarea id="fz-w-beschr" placeholder="Beschreibung / Werkstatt / Mangelbehebung"></textarea>
                <button onclick="fuegeWartungHinzu()">➕ Eintrag speichern</button>
            </div>
            <div>${wartungHTML || '<p style="color:#777;">Keine Wartungseinträge vorhanden.</p>'}</div>
        `;
    }
}

// Beladung hinzufügen
function fuegeBeladungHinzu() {
    const raum = document.getElementById("fz-raum-select").value;
    const gegenstand = document.getElementById("fz-geraet-input").value.trim();
    if (!gegenstand) return;

    const fahrzeuge = ladeDaten("fahrzeuge") || [];
    const fz = fahrzeuge.find(item => item.id === aktuellesFahrzeugId);
    if (!fz) return;

    if (!fz.beladung) fz.beladung = [];
    fz.beladung.push({ raum, gegenstand });

    speichereDaten("fahrzeuge", fahrzeuge);
    wechselFahrzeugTab('beladung');
}

// Beladung entfernen
function entferneBeladung(index) {
    const fahrzeuge = ladeDaten("fahrzeuge") || [];
    const fz = fahrzeuge.find(item => item.id === aktuellesFahrzeugId);
    if (!fz || !fz.beladung) return;

    fz.beladung.splice(index, 1);
    speichereDaten("fahrzeuge", fahrzeuge);
    wechselFahrzeugTab('beladung');
}

// Wartungseintrag hinzufügen
function fuegeWartungHinzu() {
    const titel = document.getElementById("fz-w-titel").value.trim();
    const beschreibung = document.getElementById("fz-w-beschr").value.trim();
    if (!titel) return;

    const fahrzeuge = ladeDaten("fahrzeuge") || [];
    const fz = fahrzeuge.find(item => item.id === aktuellesFahrzeugId);
    if (!fz) return;

    if (!fz.wartungen) fz.wartungen = [];
    fz.wartungen.unshift({
        datum: new Date().toLocaleDateString('de-DE'),
        titel,
        beschreibung
    });

    speichereDaten("fahrzeuge", fahrzeuge);
    wechselFahrzeugTab('wartung');
}

// Fahrzeug löschen
function loescheFahrzeug(fzId) {
    if (!confirm("Fahrzeug wirklich löschen?")) return;
    let fahrzeuge = ladeDaten("fahrzeuge") || [];
    fahrzeuge = fahrzeuge.filter(item => item.id !== fzId);
    speichereDaten("fahrzeuge", fahrzeuge);
    
    document.getElementById("fahrzeugAkteContainer").innerHTML = `
        <h2>📋 Fahrzeugakte</h2>
        <p style="color:#777;">Bitte links ein Fahrzeug auswählen (👁️ klicken).</p>
    `;
    ladeFahrzeugTabelle();
}

// CSV Export
function exportFahrzeugeCSV() {
    const daten = ladeDaten("fahrzeuge") || [];
    if (daten.length === 0) {
        alert("Keine Fahrzeugdaten vorhanden.");
        return;
    }
    const headers = ["Funkrufname", "Typ", "Kennzeichen", "Baujahr", "TÜV", "SP", "Status"];
    const rows = daten.map(f => [f.funkrufname, f.typ, f.kennzeichen, f.baujahr, f.tuev, f.sp, f.status]);
    
    if (typeof downloadCSV === "function") {
        downloadCSV(`Fahrzeugliste_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    }
}
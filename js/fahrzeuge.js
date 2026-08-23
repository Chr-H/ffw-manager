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
                <button onclick="oeffneFahrzeugAkte('${f.id}')" title="Fahrzeugakte öffnen" style="padding:4px 8px; cursor:pointer;">👁️</button>
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

// 2. Neues Fahrzeug speichern
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
        historie: []
    };

    let fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    fahrzeuge.push(neuesFahrzeug);

    if (typeof speichereDaten === 'function') {
        speichereDaten('fahrzeuge', fahrzeuge);
    }

    // Felder leeren
    ['fz-funkruf', 'fz-kennzeichen', 'fz-typ', 'fz-baujahr', 'fz-tuev', 'fz-sp'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    renderFahrzeugeView();
    oeffneFahrzeugAkte(neuesFahrzeug.id);

    if (typeof aktualisiereDashboard === 'function') aktualisiereDashboard();
}

// 3. Fahrzeugakte öffnen & Template befüllen
function oeffneFahrzeugAkte(id) {
    aktuellesFahrzeugId = id;
    const container = document.getElementById('fahrzeugAkteContainer');
    const template = document.getElementById('fahrzeugAkteTemplate');
    if (!container || !template) return;

    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => x.id === id);

    if (!f) {
        container.innerHTML = `<h2>📋 Fahrzeugakte</h2><p style="color:#777;">Fahrzeug nicht gefunden.</p>`;
        return;
    }

    // Template in den Container klonen
    container.innerHTML = '';
    const clone = template.content.cloneNode(true);
    container.appendChild(clone);

    // Akte-Titel setzen
    const akteTitel = document.getElementById('akte-titel');
    const akteSubtitel = document.getElementById('akte-subtitel');
    if (akteTitel) akteTitel.textContent = `📋 Fahrzeugakte: ${f.callSign || f.name}`;
    if (akteSubtitel) akteSubtitel.textContent = `${f.typ || ''} | Kennzeichen: ${f.kennzeichen || f.licensePlate || '-'} | Status: ${f.status || 'Einsatzbereit'}`;

    // Historie rendern
    renderHistorieListe(f);
}

// 4. Geräteraum-Ausrüstung filtern (Klick auf Grafik)
function zeigeGeraeteAusRaum(raumKuerzel) {
    if (!aktuellesFahrzeugId) {
        alert("Bitte zuerst ein Fahrzeug auswählen.");
        return;
    }

    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => x.id === aktuellesFahrzeugId);
    const fzgName = f ? (f.callSign || f.name) : "";

    // Lade Geräte
    const alleGeraete = typeof ladeDaten === 'function' ? ladeDaten('geraete') : [];

    // Filter nach Fahrzeugname und Geräteraum
    const gefundeneGeraete = alleGeraete.filter(g => {
        const st = (g.standort || "").toUpperCase();
        return (fzgName === "" || st.includes(fzgName.toUpperCase())) && st.includes(raumKuerzel.toUpperCase());
    });

    if (gefundeneGeraete.length === 0) {
        alert(`ℹ️ Für Raum ${raumKuerzel} wurden beim Fahrzeug ${fzgName} keine speziell zugeordneten Geräte gefunden.\n(Tipp: Trage beim Gerät z.B. "${fzgName} ${raumKuerzel}" als Standort ein)`);
        return;
    }

    let listeText = `📦 Beladung in ${raumKuerzel} (${fzgName}):\n\n`;
    gefundeneGeraete.forEach(g => {
        listeText += `• ${g.bezeichnung || g.name} (Inv-Nr: ${g.inventarnummer || 'keine'})\n`;
    });

    alert(listeText);
}

// 5. Historie-Einträge verwalten
function speichereHistorieEintrag() {
    if (!aktuellesFahrzeugId) return;

    const typ = document.getElementById('hist-typ')?.value || 'Sonstiges';
    const datum = document.getElementById('hist-datum')?.value || new Date().toISOString().split('T')[0];
    const titel = document.getElementById('hist-titel')?.value.trim();
    const beschreibung = document.getElementById('hist-beschreibung')?.value.trim();
    const kosten = parseFloat(document.getElementById('hist-kosten')?.value) || 0;

    if (!titel) {
        alert('Bitte gib mindestens einen Titel für den Historie-Eintrag ein!');
        return;
    }

    let fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => x.id === aktuellesFahrzeugId);

    if (f) {
        if (!f.historie) f.historie = [];

        f.historie.unshift({
            id: 'HIST-' + Date.now(),
            typ: typ,
            datum: datum,
            titel: titel,
            beschreibung: beschreibung,
            kosten: kosten
        });

        if (typeof speichereDaten === 'function') speichereDaten('fahrzeuge', fahrzeuge);

        // Formular zurücksetzen
        document.getElementById('hist-titel').value = '';
        document.getElementById('hist-beschreibung').value = '';
        document.getElementById('hist-kosten').value = '';

        renderHistorieListe(f);
    }
}

function renderHistorieListe(fahrzeug) {
    const listContainer = document.getElementById('historieListe');
    if (!listContainer) return;

    if (!fahrzeug.historie || fahrzeug.historie.length === 0) {
        listContainer.innerHTML = `<p style="color:#777; font-style:italic; margin-top:5px;">Keine Historien-Einträge vorhanden.</p>`;
        return;
    }

    listContainer.innerHTML = fahrzeug.historie.map((e, idx) => `
        <div style="background:#fff; border:1px solid #ddd; border-left:4px solid #0d6efd; padding:8px 12px; margin-bottom:8px; border-radius:4px; font-size:0.9em;">
            <div style="display:flex; justify-content:space-between; font-weight:bold; margin-bottom:3px;">
                <span>${e.typ} - ${e.titel}</span>
                <span style="color:#666; font-size:0.85em;">${e.datum}</span>
            </div>
            ${e.beschreibung ? `<div style="color:#444; margin-bottom:4px;">${e.beschreibung}</div>` : ''}
            <div style="display:flex; justify-content:space-between; align-items:center; color:#666; font-size:0.8em;">
                <span>Kosten: ${e.kosten ? e.kosten.toFixed(2) + ' €' : '0.00 €'}</span>
                <button type="button" onclick="loescheHistorieEintrag(${idx})" style="background:none; border:none; color:#dc3545; cursor:pointer; font-weight:bold;">🗑️ Löschen</button>
            </div>
        </div>
    `).join('');
}

function loescheHistorieEintrag(index) {
    if (!aktuellesFahrzeugId) return;

    let fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => x.id === aktuellesFahrzeugId);

    if (f && f.historie && f.historie[index]) {
        f.historie.splice(index, 1);
        if (typeof speichereDaten === 'function') speichereDaten('fahrzeuge', fahrzeuge);
        renderHistorieListe(f);
    }
}

// 6. Löschen & CSV
function loescheFahrzeug(id) {
    if (confirm('Möchtest du dieses Fahrzeug wirklich löschen?')) {
        let fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
        fahrzeuge = fahrzeuge.filter(x => x.id !== id);

        if (typeof speichereDaten === 'function') speichereDaten('fahrzeuge', fahrzeuge);

        renderFahrzeugeView();

        const container = document.getElementById('fahrzeugAkteContainer');
        if (container) {
            container.innerHTML = `
                <h2>📋 Fahrzeugakte</h2>
                <p style="color:#777;">Bitte links ein Fahrzeug auswählen (👁️ klicken).</p>
            `;
        }

        if (typeof aktualisiereDashboard === 'function') aktualisiereDashboard();
    }
}

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
        
        link.setAttribute("href", url);
        link.setAttribute("download", `Fahrzeuge_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err) {
        alert("❌ Fehler beim Exportieren:\n" + err.message);
    }
}

function importFahrzeugeCSV(inputOrEvent) {
    try {
        let inputElement = inputOrEvent?.target || inputOrEvent;
        const file = inputElement?.files ? inputElement.files[0] : null;
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let text = e.target.result;
                if (text.charCodeAt(0) === 0xFEFF) text = text.substr(1);

                const zeilen = text.split(/\r\n|\n/).filter(z => z.trim() !== "");
                if (zeilen.length < 2) return alert("Die Datei enthält keine Daten.");

                let fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];

                for (let i = 1; i < zeilen.length; i++) {
                    const spalten = zeilen[i].split(";").map(s => s.replace(/^"|"$/g, '').trim());
                    if (spalten.length < 2) continue;

                    fahrzeuge.push({
                        id: spalten[0] || 'VEH-' + Date.now() + '_' + i,
                        callSign: spalten[1],
                        name: spalten[1],
                        typ: spalten[2],
                        kennzeichen: spalten[3],
                        baujahr: spalten[4],
                        tuev: spalten[5],
                        sp: spalten[6],
                        status: spalten[7] || 'Einsatzbereit',
                        historie: []
                    });
                }

                if (typeof speichereDaten === 'function') speichereDaten('fahrzeuge', fahrzeuge);
                renderFahrzeugeView();
                alert("✅ Fahrzeuge erfolgreich importiert!");
            } catch (err) {
                alert("Fehler beim Lesen der CSV: " + err.message);
            }
        };
        reader.readAsText(file, "UTF-8");
    } catch (err) {
        alert("Fehler beim Import: " + err.message);
    }
}
// CSV-Export für die Historie/Reparaturen eines einzelnen Fahrzeugs
function exportFahrzeugHistorieCSV(fahrzeugId) {
    const daten = typeof holeFahrzeugDaten === "function" ? holeFahrzeugDaten() : (ladeDaten("fahrzeuge") || []);
    const fahrzeug = daten.find(f => f.id === fahrzeugId);

    if (!fahrzeug) {
        alert("⚠️ Fahrzeug nicht gefunden.");
        return;
    }

    // Historie-Array aus dem Fahrzeugobjekt auslesen (je nach Ihrer Datenstruktur historie/reparaturen/pruefungen)
    const historie = fahrzeug.historie || fahrzeug.reparaturen || fahrzeug.wartungen || [];

    if (!Array.isArray(historie) || historie.length === 0) {
        alert("⚠️ Keine Historie/Reparaturen für dieses Fahrzeug vorhanden.");
        return;
    }

    const headers = [
        "Datum", 
        "Kategorie / Typ", 
        "Beschreibung / Maßnahme", 
        "Durchgeführt von / Werkstatt", 
        "Kosten (€)", 
        "Kilometerstand", 
        "Status"
    ];

    const rows = historie.map(h => [
        h.datum || '',
        h.typ || h.kategorie || 'Reparatur',
        h.beschreibung || h.tätigkeit || '',
        h.werkstatt || h.durchgefuehrtVon || '',
        h.kosten || '0',
        h.kmStand || h.kilometer || '',
        h.status || 'Erledigt'
    ]);

    const fzgName = (fahrzeug.name || fahrzeug.funkrufname || 'Fahrzeug').replace(/[^a-zA-Z0-9_-]/g, '_');
    const heute = new Date().toISOString().split('T')[0];
    const dateiname = `Akte_${fzgName}_Historie_${heute}.csv`;

    const csvLines = [headers.join(";")];
    rows.forEach(r => csvLines.push(r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")));

    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.style.display = "none";
    link.download = dateiname;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}
// Vollständige Einzel-Fahrzeugakte als Druck/PDF erzeugen
// Vollständige Einzel-Fahrzeugakte als Druck/PDF erzeugen
function druckeEinzelFahrzeugAkte(fahrzeugId) {
    const daten = typeof holeFahrzeugDaten === "function" ? holeFahrzeugDaten() : (ladeDaten("fahrzeuge") || []);
    const f = daten.find(item => item.id === fahrzeugId);

    if (!f) {
        alert("⚠️ Fahrzeugakte nicht gefunden.");
        return;
    }

    const historie = f.historie || f.reparaturen || f.wartungen || [];
    const heute = new Date().toLocaleDateString('de-DE');

    let historieHtml = '';
    if (historie.length === 0) {
        historieHtml = `<tr><td colspan="4" style="text-align:center; color:#777;">Keine Reparaturen oder Wartungen eingetragen.</td></tr>`;
    } else {
        historie.forEach(h => {
            historieHtml += `
            <tr>
                <td>${h.datum || '-'}</td>
                <td><strong>${h.typ || 'Allgemein'}</strong> - ${h.titel || ''}</td>
                <td>${h.beschreibung || '-'}</td>
                <td>${h.kosten ? Number(h.kosten).toFixed(2) + ' €' : '0.00 €'}</td>
            </tr>`;
        });
    }

    const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <title>Fahrzeugakte - ${f.callSign || f.name}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #222; }
            .header { border-bottom: 3px solid #b22222; padding-bottom: 10px; margin-bottom: 20px; }
            h1 { margin: 0; color: #b22222; font-size: 1.8em; }
            .subtitle { font-size: 1.1em; color: #555; margin-top: 5px; }
            .grid { display: flex; gap: 20px; margin-bottom: 25px; }
            .box { flex: 1; border: 1px solid #ddd; padding: 12px; background: #f9f9f9; border-radius: 4px; }
            .box h3 { margin-top: 0; font-size: 1em; border-bottom: 1px solid #ccc; padding-bottom: 5px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 0.85em; }
            th { background-color: #eee; }
            .footer { margin-top: 30px; font-size: 0.8em; color: #777; text-align: right; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🚒 Fahrzeugakte: ${f.callSign || f.name || 'Unbekannt'}</h1>
            <div class="subtitle">FFW Albertsried | Stand: ${heute}</div>
        </div>

        <div class="grid">
            <div class="box">
                <h3>Stammdaten</h3>
                <strong>Typ:</strong> ${f.typ || '-'}<br>
                <strong>Kennzeichen:</strong> ${f.licensePlate || f.kennzeichen || '-'}<br>
                <strong>Baujahr:</strong> ${f.baujahr || '-'}
            </div>
            <div class="box">
                <h3>Prüftermine & Status</h3>
                <strong>Nächste HU / TÜV:</strong> ${f.nextHU || f.tuev || '-'}<br>
                <strong>Nächste SP:</strong> ${f.nextSP || f.sp || '-'}<br>
                <strong>Status:</strong> ${f.status || 'Einsatzbereit'}
            </div>
        </div>

        <h3>Reparatur- & Wartungshistorie</h3>
        <table>
            <thead>
                <tr>
                    <th style="width: 15%;">Datum</th>
                    <th style="width: 30%;">Kategorie & Titel</th>
                    <th>Beschreibung / Maßnahme</th>
                    <th style="width: 15%;">Kosten</th>
                </tr>
            </thead>
            <tbody>
                ${historieHtml}
            </tbody>
        </table>

        <div class="footer">Gedruckt am ${heute} über FFW Manager</div>
    </body>
    </html>`;

    const druckFenster = window.open('', '_blank');
    druckFenster.document.write(html);
    druckFenster.document.close();
    
    setTimeout(() => {
        druckFenster.focus();
        druckFenster.print();
    }, 250);
}
// Wrapper-Funktionen zur Behebung der Namensabweichungen:

function exportFahrzeugEinzelnCSV() {
    if (!aktuellesFahrzeugId) {
        alert("⚠️ Bitte zuerst ein Fahrzeug auswählen.");
        return;
    }
    exportFahrzeugHistorieCSV(aktuellesFahrzeugId);
}

function druckeFahrzeugAkte() {
    if (!aktuellesFahrzeugId) {
        alert("⚠️ Bitte zuerst ein Fahrzeug auswählen.");
        return;
    }
    druckeEinzelFahrzeugAkte(aktuellesFahrzeugId);
}



// Global registrieren
window.renderFahrzeugeView = renderFahrzeugeView;
window.neuesFahrzeugSpeichern = neuesFahrzeugSpeichern;
window.oeffneFahrzeugAkte = oeffneFahrzeugAkte;
window.zeigeGeraeteAusRaum = zeigeGeraeteAusRaum;
window.speichereHistorieEintrag = speichereHistorieEintrag;
window.loescheHistorieEintrag = loescheHistorieEintrag;
window.loescheFahrzeug = loescheFahrzeug;
window.exportFahrzeugeCSV = exportFahrzeugeCSV;
window.importFahrzeugeCSV = importFahrzeugeCSV;
window.exportFahrzeugHistorieCSV = exportFahrzeugHistorieCSV;
window.druckeEinzelFahrzeugAkte = druckeEinzelFahrzeugAkte;
window.druckeFahrzeugAkte = druckeFahrzeugAkte;


document.addEventListener('DOMContentLoaded', () => {
    renderFahrzeugeView();
});
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

document.addEventListener('DOMContentLoaded', () => {
    renderFahrzeugeView();
});
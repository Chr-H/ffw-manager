// ==========================================
// FFW Manager - Fahrzeugverwaltung & Akte
// ==========================================

let aktuellesFahrzeugId = null;

// Hilfsfunktion: Sicheres Speichern inklusive Cloud-Sync
// Direktes Speichern in LocalStorage und Firebase
function speichereUndSynchronisiere(fahrzeuge) {
    // Direkt die globale speichereDaten-Funktion aus der storage.js aufrufen
    if (typeof speichereDaten === 'function') {
        speichereDaten('fahrzeuge', fahrzeuge);
    } else {
        localStorage.setItem('ffw_fahrzeuge', JSON.stringify(fahrzeuge));
        if (typeof window.db !== 'undefined' && window.db !== null) {
            window.db.collection('ffw_data').doc('fahrzeuge').set({
                eintraege: fahrzeuge,
                aktualisiertAm: new Date().toISOString()
            });
        }
    }
}

// 1. Tabelle auf der linken Seite rendern
function renderFahrzeugeView() {
    const tbody = document.getElementById('fahrzeugeListe');
    if (!tbody) return;

    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    tbody.innerHTML = '';

    if (!Array.isArray(fahrzeuge) || fahrzeuge.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:#777;">Keine Fahrzeuge vorhanden.</td></tr>`;
        return;
    }

    fahrzeuge.forEach(f => {
        if (!f.id) f.id = 'VEH-' + Math.random().toString(36).substr(2, 9);

        const tr = document.createElement('tr');
        
        let statusBadge = '🟢 Einsatzbereit';
        if (f.status === 'Wartung') statusBadge = '🟡 Wartung';
        if (f.status === 'Defekt') statusBadge = '🔴 Defekt';

        tr.innerHTML = `
            <td class="no-print">
                <button onclick="oeffneFahrzeugAkte('${f.id}')" title="Fahrzeugakte öffnen" style="padding:4px 8px; cursor:pointer;">👁️</button>
                <button onclick="bearbeiteFahrzeug('${f.id}')" title="Fahrzeug bearbeiten" style="padding:4px 8px; cursor:pointer;">✏️</button>
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

// 2. Neues Fahrzeug speichern oder bestehendes aktualisieren
function neuesFahrzeugSpeichern() {
    try {
        const funkrufInput = document.getElementById('fz-funkruf');
        const kennzeichenInput = document.getElementById('fz-kennzeichen');
        const typInput = document.getElementById('fz-typ');
        const baujahrInput = document.getElementById('fz-baujahr');
        const tuevInput = document.getElementById('fz-tuev');
        const spInput = document.getElementById('fz-sp');
        const statusInput = document.getElementById('fz-status');

        const funkruf = funkrufInput ? funkrufInput.value.trim() : '';
        const kennzeichen = kennzeichenInput ? kennzeichenInput.value.trim() : '';
        const typ = typInput ? typInput.value.trim() : '';
        const baujahr = baujahrInput ? baujahrInput.value : '';
        const tuev = tuevInput ? tuevInput.value : '';
        const sp = spInput ? spInput.value : '';
        const status = statusInput ? statusInput.value : 'Einsatzbereit';

        if (!funkruf && !typ) {
            alert('Bitte mindestens einen Funkrufnamen oder Fahrzeugtyp eingeben!');
            return;
        }

        let fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
        if (!Array.isArray(fahrzeuge)) fahrzeuge = [];

        const editId = funkrufInput ? funkrufInput.dataset.editId : null;

        if (editId) {
            // Bearbeiten
            const idx = fahrzeuge.findIndex(x => String(x.id) === String(editId));
            if (idx !== -1) {
                fahrzeuge[idx] = {
                    ...fahrzeuge[idx],
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
                    status: status
                };
            }
            if (funkrufInput) delete funkrufInput.dataset.editId;
        } else {
            // Neu anlegen
            const neuesFahrzeug = {
                id: 'VEH-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
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
            fahrzeuge.push(neuesFahrzeug);
            aktuellesFahrzeugId = neuesFahrzeug.id;
        }

        // Speichern & Synchronisieren
        if (typeof speichereFahrzeugeData === 'function') {
    speichereFahrzeugeData(fahrzeuge);
} else if (typeof speichereDaten === 'function') {
    speichereDaten('fahrzeuge', fahrzeuge);
} else {
    localStorage.setItem('ffw_fahrzeuge', JSON.stringify(fahrzeuge));
}


        // Formular leeren
        if (funkrufInput) funkrufInput.value = '';
        if (kennzeichenInput) kennzeichenInput.value = '';
        if (typInput) typInput.value = '';
        if (baujahrInput) baujahrInput.value = '';
        if (tuevInput) tuevInput.value = '';
        if (spInput) spInput.value = '';
        if (statusInput) statusInput.value = 'Einsatzbereit';

        renderFahrzeugeView();
        if (aktuellesFahrzeugId) oeffneFahrzeugAkte(aktuellesFahrzeugId);
        if (typeof aktualisiereDashboard === 'function') aktualisiereDashboard();

    } catch (err) {
        alert('Fehler beim Speichern: ' + err.message);
        console.error(err);
    }
}

// Fahrzeug in Formular laden zum Bearbeiten
function bearbeiteFahrzeug(id) {
    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => String(x.id) === String(id));
    if (!f) return;

    const funkrufEl = document.getElementById('fz-funkruf');
    if (funkrufEl) {
        funkrufEl.value = f.callSign || f.name || '';
        funkrufEl.dataset.editId = f.id;
    }

    if (document.getElementById('fz-kennzeichen')) document.getElementById('fz-kennzeichen').value = f.licensePlate || f.kennzeichen || '';
    if (document.getElementById('fz-typ')) document.getElementById('fz-typ').value = f.typ || '';
    if (document.getElementById('fz-baujahr')) document.getElementById('fz-baujahr').value = f.baujahr || '';
    if (document.getElementById('fz-tuev')) document.getElementById('fz-tuev').value = f.nextHU || f.tuev || '';
    if (document.getElementById('fz-sp')) document.getElementById('fz-sp').value = f.nextSP || f.sp || '';
    if (document.getElementById('fz-status')) document.getElementById('fz-status').value = f.status || 'Einsatzbereit';
}

// 3. Fahrzeugakte öffnen
function oeffneFahrzeugAkte(id) {
    aktuellesFahrzeugId = id;
    const container = document.getElementById('fahrzeugAkteContainer');
    const template = document.getElementById('fahrzeugAkteTemplate');
    if (!container || !template) return;

    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => String(x.id) === String(id));

    if (!f) {
        container.innerHTML = `<h2>📋 Fahrzeugakte</h2><p style="color:#777;">Fahrzeug nicht gefunden.</p>`;
        return;
    }

    container.innerHTML = '';
    const clone = template.content.cloneNode(true);
    container.appendChild(clone);

    const akteTitel = document.getElementById('akte-titel');
    const akteSubtitel = document.getElementById('akte-subtitel');
    if (akteTitel) akteTitel.textContent = `📋 Fahrzeugakte: ${f.callSign || f.name}`;
    if (akteSubtitel) akteSubtitel.textContent = `${f.typ || ''} | Kennzeichen: ${f.kennzeichen || f.licensePlate || '-'} | Status: ${f.status || 'Einsatzbereit'}`;

    renderHistorieListe(f);
    
    // NEU: Dokumentenliste für dieses Fahrzeug laden und anzeigen
    renderFahrzeugDokumenteListe(f);
}

// 4. Geräteraum-Ausrüstung filtern
function zeigeGeraeteAusRaum(raumKuerzel) {
    if (!aktuellesFahrzeugId) {
        alert("Bitte zuerst ein Fahrzeug auswählen.");
        return;
    }

    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => String(x.id) === String(aktuellesFahrzeugId));
    const fzgName = f ? (f.callSign || f.name) : "";

    const alleGeraete = typeof ladeDaten === 'function' ? ladeDaten('geraete') : [];

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
    const f = fahrzeuge.find(x => String(x.id) === String(aktuellesFahrzeugId));

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

        speichereUndSynchronisiere(fahrzeuge);

        if (document.getElementById('hist-titel')) document.getElementById('hist-titel').value = '';
        if (document.getElementById('hist-beschreibung')) document.getElementById('hist-beschreibung').value = '';
        if (document.getElementById('hist-kosten')) document.getElementById('hist-kosten').value = '';

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
    const f = fahrzeuge.find(x => String(x.id) === String(aktuellesFahrzeugId));

    if (f && f.historie && f.historie[index]) {
        f.historie.splice(index, 1);
        speichereUndSynchronisiere(fahrzeuge);
        renderHistorieListe(f);
    }
}
// 6. Dokumente und Cloud-Links für Fahrzeuge verwalten
function speichereFahrzeugDokument() {
    if (!aktuellesFahrzeugId) return;

    const titelInput = document.getElementById('fzg-dok-titel');
    const linkInput = document.getElementById('fzg-dok-link');
    const fileInput = document.getElementById('fzg-dok-file');

    const titel = titelInput ? titelInput.value.trim() : '';
    const link = linkInput ? linkInput.value.trim() : '';
    const file = fileInput && fileInput.files.length > 0 ? fileInput.files[0] : null;

    if (!titel) {
        alert('Bitte gib einen Titel für das Dokument an.');
        return;
    }

    if (!link && !file) {
        alert('Bitte gib entweder einen Cloud-Link ein oder wähle eine Datei zum Hochladen aus.');
        return;
    }

    let fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const fIndex = fahrzeuge.findIndex(x => String(x.id) === String(aktuellesFahrzeugId));
    if (fIndex === -1) return;

    if (!fahrzeuge[fIndex].dokumente) {
        fahrzeuge[fIndex].dokumente = [];
    }

    const speichereEintrag = (datenUrl = '') => {
        fahrzeuge[fIndex].dokumente.push({
            id: 'DOK-' + Date.now(),
            titel: titel,
            link: link || '',
            dateiDaten: datenUrl,
            dateiName: file ? file.name : ''
        });

        // Nutzt deinen vorhandenen Speicher- und Synchronisationsmechanismus
        if (typeof speichereUndSynchronisiere === 'function') {
            speichereUndSynchronisiere(fahrzeuge);
        }

        if (titelInput) titelInput.value = '';
        if (linkInput) linkInput.value = '';
        if (fileInput) fileInput.value = '';

        renderFahrzeugDokumenteListe(fahrzeuge[fIndex]);
    };

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            speichereEintrag(e.target.result);
        };
        reader.readAsDataURL(file);
    } else {
        speichereEintrag('');
    }
}

function renderFahrzeugDokumenteListe(fahrzeug) {
    const listeContainer = document.getElementById('fzgDokumenteListe');
    if (!listeContainer) return;

    if (!fahrzeug.dokumente || fahrzeug.dokumente.length === 0) {
        listeContainer.innerHTML = `<span style="color:#777; font-style:italic;">Keine Dokumente hinterlegt.</span>`;
        return;
    }

    let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
    fahrzeug.dokumente.forEach(dok => {
        html += `<li style="display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 5px;">
            <div>
                <strong>${dok.titel}</strong> `;
                
        if (dok.link) {
            html += `<a href="${dok.link}" target="_blank" class="btn btn-sm btn-link" style="margin-left: 5px;">🔗 Cloud-Link öffnen</a>`;
        }
        if (dok.dateiDaten) {
            html += `<a href="${dok.dateiDaten}" download="${dok.dateiName || 'dokument'}" class="btn btn-sm btn-link" style="margin-left: 5px;">📥 Datei herunterladen (${dok.dateiName || 'Anhang'})</a>`;
        }

        html += `</div>
            <button type="button" class="btn btn-sm btn-danger" onclick="loescheFahrzeugDokument('${dok.id}')" style="background: #dc3545; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer;">Löschen</button>
        </li>`;
    });
    html += '</ul>';

    listeContainer.innerHTML = html;
}

function loescheFahrzeugDokument(dokId) {
    if (!aktuellesFahrzeugId) return;
    if (!confirm('Möchtest du diesen Eintrag wirklich löschen?')) return;

    let fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const fIndex = fahrzeuge.findIndex(x => String(x.id) === String(aktuellesFahrzeugId));
    if (fIndex === -1) return;

    fahrzeuge[fIndex].dokumente = fahrzeuge[fIndex].dokumente.filter(d => String(d.id) !== String(dokId));

    if (typeof speichereUndSynchronisiere === 'function') {
        speichereUndSynchronisiere(fahrzeuge);
    }

    renderFahrzeugDokumenteListe(fahrzeuge[fIndex]);
}

// 7. Löschen & CSV
function loescheFahrzeug(id) {
    if (confirm('Möchtest du dieses Fahrzeug wirklich löschen?')) {
        let fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
        fahrzeuge = fahrzeuge.filter(x => String(x.id) !== String(id));

        speichereUndSynchronisiere(fahrzeuge);

        if (aktuellesFahrzeugId === id) {
            aktuellesFahrzeugId = null;
        }

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
                        id: spalten[0] || 'VEH-' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
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

                speichereUndSynchronisiere(fahrzeuge);
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

function exportFahrzeugHistorieCSV(fahrzeugId) {
    const daten = typeof ladeDaten === 'function' ? ladeDaten("fahrzeuge") : [];
    const fahrzeug = daten.find(f => String(f.id) === String(fahrzeugId));

    if (!fahrzeug) {
        alert("⚠️ Fahrzeug nicht gefunden.");
        return;
    }

    const historie = fahrzeug.historie || [];

    if (!Array.isArray(historie) || historie.length === 0) {
        alert("⚠️ Keine Historie für dieses Fahrzeug vorhanden.");
        return;
    }

    const headers = ["Datum", "Kategorie / Typ", "Titel", "Beschreibung", "Kosten (€)"];
    const rows = historie.map(h => [
        h.datum || '',
        h.typ || 'Sonstiges',
        h.titel || '',
        h.beschreibung || '',
        h.kosten || '0'
    ]);

    const fzgName = (fahrzeug.name || fahrzeug.callSign || 'Fahrzeug').replace(/[^a-zA-Z0-9_-]/g, '_');
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

function druckeEinzelFahrzeugAkte() {
    let idDrucken = window.aktuellesFahrzeugId;

    if (!idDrucken) {
        const titelElement = document.getElementById('akte-titel');
        const daten = typeof ladeDaten === 'function' ? ladeDaten("fahrzeuge") : [];
        if (titelElement && titelElement.innerText && titelElement.innerText !== '-') {
            const fzg = daten.find(item => titelElement.innerText.includes(item.funkruf || item.callSign || item.name));
            if (fzg) idDrucken = fzg.id;
        }
    }

    if (!idDrucken) {
        alert("⚠️ Bitte wähle zuerst links in der Tabelle ein Fahrzeug über das Auge (👁️) aus.");
        return;
    }

    const daten = typeof ladeDaten === 'function' ? ladeDaten("fahrzeuge") : [];
    const f = daten.find(item => String(item.id) === String(idDrucken));

    if (!f) {
        alert("⚠️ Fahrzeugakte in den Daten nicht gefunden.");
        return;
    }

    const historie = f.historie || [];
    const heute = new Date().toLocaleDateString('de-DE');
    const fzgName = f ? (f.callSign || f.name || f.funkruf || "") : "";

    // 1. Reparatur-Historie aufbauen
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

    // 2. Geräteräume GR1 bis GR8 über den Standort-Filter auslesen
    const raeumeListe = ['GR1', 'GR2', 'GR3', 'GR4', 'GR5', 'GR6', 'GR7', 'GR8'];
    let gRaumHtml = '';
    let orteGefunden = 0;
    const alleGeraete = typeof ladeDaten === 'function' ? ladeDaten('geraete') : [];

    raeumeListe.forEach(raum => {
        const gefundeneGeraete = alleGeraete.filter(g => {
            const st = (g.standort || "").toUpperCase();
            return (fzgName === "" || st.includes(fzgName.toUpperCase())) && st.includes(raum.toUpperCase());
        });

        if (gefundeneGeraete.length > 0) {
            orteGefunden++;
            let inhaltText = gefundeneGeraete.map(g => {
                const bez = g.bezeichnung || g.name || 'Gerät';
                const inv = g.inventarnummer ? `(Inv-Nr: ${g.inventarnummer})` : 'keine';
                return `• ${bez} ${inv}`;
            }).join('<br>');

            gRaumHtml += `
            <tr>
                <td style="width: 18%; font-weight: bold; background: #eee; text-align: center; vertical-align: top;">${raum}</td>
                <td style="vertical-align: top;">${inhaltText}</td>
            </tr>`;
        }
    });

    if (orteGefunden === 0) {
        gRaumHtml = `<tr><td colspan="2" style="text-align:center; color:#777;">Keine spezifische Geräteraum-Beladung für ${fzgName} gefunden.</td></tr>`;
    }

    const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <title>Fahrzeugakte - ${fzgName}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #222; }
            .top-bar { display: flex; align-items: center; gap: 15px; border-bottom: 2px solid #b22222; padding-bottom: 10px; margin-bottom: 15px; }
            .logo { width: 45px; height: auto; }
            .brand-title { font-size: 1.4em; font-weight: bold; color: #111; }
            .header { margin-bottom: 20px; }
            h1 { margin: 0; color: #b22222; font-size: 1.5em; }
            .subtitle { font-size: 0.95em; color: #555; margin-top: 3px; }
            .grid { display: flex; gap: 20px; margin-bottom: 20px; }
            .box { flex: 1; border: 1px solid #ddd; padding: 12px; background: #f9f9f9; border-radius: 4px; }
            .box h3 { margin-top: 0; font-size: 0.95em; border-bottom: 1px solid #ccc; padding-bottom: 5px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 0.85em; }
            th { background-color: #eee; }
            .section-title { font-size: 1.1em; color: #b22222; border-bottom: 1px solid #b22222; padding-bottom: 4px; margin-top: 25px; margin-bottom: 10px; font-weight: bold; }
            
            /* Schema Box Styles */
            .schema-container { border: 1px solid #ccc; padding: 15px; background: #fff; border-radius: 4px; margin-bottom: 25px; }
            .schema-grid { display: grid; grid-template-columns: 1fr 40px 2fr 1fr; grid-template-rows: repeat(3, auto); gap: 6px; text-align: center; font-size: 0.8em; }
            .s-box { border: 1px solid #444; padding: 8px; background: #fdfdfd; border-radius: 3px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
            .s-dach { border: 1px solid #444; padding: 8px; background: #fdfdfd; border-radius: 3px; text-align: center; margin-top: 6px; font-weight: bold; }
            
            .footer { margin-top: 30px; font-size: 0.8em; color: #777; text-align: right; }
        </style>
    </head>
    <body>
        <div class="top-bar">
            <!-- Logo (Falls Pfad greift oder Platzhalter) -->
            <img src="logo.png" onerror="this.style.display='none'" class="logo" alt="Logo">
            <div class="brand-title">Freiwillige Feuerwehr Albertsried</div>
        </div>

        <div class="header">
            <h1>🚒 Fahrzeugakte: ${fzgName}</h1>
            <div class="subtitle">FFW Albertsried | Stand: ${heute}</div>
        </div>

        <div class="grid">
            <div class="box">
                <h3>Stammdaten</h3>
                <strong>Typ:</strong> ${f.typ || '-'}<br>
                <strong>Kennzeichen:</strong> ${f.kennzeichen || f.licensePlate || '-'}<br>
                <strong>Baujahr:</strong> ${f.baujahr || '-'}
            </div>
            <div class="box">
                <h3>Prüftermine & Status</h3>
                <strong>Nächste HU / TÜV:</strong> ${f.tuev || f.nextHU || '-'}<br>
                <strong>Nächste SP:</strong> ${f.sp || f.nextSP || '-'}<br>
                <strong>Status:</strong> ${f.status || 'Einsatzbereit'}
            </div>
        </div>

        <!-- Geräteraum-Schema Grafische Ansicht -->
        <div class="schema-container">
            <h3 style="margin-top:0; font-size:0.95em; color:#333; border-bottom:1px solid #ccc; padding-bottom:5px;">Geräteraum-Belegungsplan</h3>
            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px;">
                <div style="display: flex; gap: 6px;">
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                        <div class="s-box" style="min-height: 50px;"><strong>GR7</strong><br><small>Gruppenführer</small></div>
                        <div class="s-box" style="min-height: 50px;"><strong>GR6</strong><br><small>Maschinist</small></div>
                    </div>
                    <div class="s-box" style="width: 40px; writing-mode: vertical-rl; text-orientation: sideways; font-size: 0.75em;">GR5 Kabine</div>
                    <div style="flex: 2; display: flex; flex-direction: column; gap: 6px;">
                        <div class="s-box"><strong>GR1</strong><br><small>rechts</small></div>
                        <div style="display: flex; gap: 6px;">
                            <div class="s-box" style="flex: 2;"><strong>GR4</strong><br><small>Mitte</small></div>
                            <div class="s-box" style="flex: 1;"><strong>GR3</strong><br><small>hinten</small></div>
                        </div>
                        <div class="s-box"><strong>GR2</strong><br><small>links</small></div>
                    </div>
                </div>
                <div class="s-dach">GR8 Aussen/DACH</div>
            </div>
        </div>

        <div class="section-title">Geräteräume & Beladungsübersicht (GR1 - GR8)</div>
        <table>
            <tbody>
                ${gRaumHtml}
            </tbody>
        </table>

        <div class="section-title">Reparatur- & Wartungshistorie</div>
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
window.bearbeiteFahrzeug = bearbeiteFahrzeug;
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
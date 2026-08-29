// ==========================================
// FFW Manager - Geräteverwaltung (v0.6.7)
// ==========================================

let geraete = ladeDaten("geraete") || [];
let bearbeitungsId = null;

// Hilfsfunktion: Safe HTML Escaping gegen XSS-Lücken
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Hilfsfunktion: Datums-String (YYYY-MM-DD) ohne Zeitzonen-Versatz formatieren
function formatiereDatum(datumStr) {
    if (!datumStr) return "Keine Angabe";
    const teile = datumStr.split('-');
    if (teile.length !== 3) return datumStr;
    return `${teile[2]}.${teile[1]}.${teile[0]}`;
}

// Hilfsfunktion: Aktuellen Benutzer-String für Protokollierung abrufen
function hohleBenutzerProtokollText() {
    if (typeof aktuellerBenutzer !== "undefined" && aktuellerBenutzer && aktuellerBenutzer.rolle !== "gast") {
        const name = aktuellerBenutzer.name || aktuellerBenutzer.email || "Benutzer";
        return `${name} (${aktuellerBenutzer.rolle.toUpperCase()})`;
    }
    return "Unbekannt / Admin";
}

// Hilfsfunktion: Parst CSV-Zeilen unter Berücksichtigung von Anführungszeichen
function parseCSVLine(text, delimiter = ';') {
    const pattern = new RegExp(
        "(\\" + delimiter + "|\\r?\\n|\\r|^)" +
        "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
        "([^\"\\" + delimiter + "\\r\\n]*))",
        "gi"
    );
    const result = [];
    let matches = null;
    while ((matches = pattern.exec(text))) {
        const matchedDelimiter = matches[1];
        if (matchedDelimiter.length && matchedDelimiter !== delimiter) {
            break;
        }
        let matchedValue;
        if (matches[2]) {
            matchedValue = matches[2].replace(new RegExp("\"\"", "g"), "\"");
        } else {
            matchedValue = matches[3];
        }
        result.push(matchedValue || '');
    }
    return result;
}

function ladeGeraete() {
    geraete = ladeDaten("geraete") || [];
    return geraete;
}

// Sichere Schnittstelle für externe Exporte
function getGeraete() {
    return ladeGeraete();
}

function speichereGeraete() {
    speichereDaten('geraete', geraete);
    document.dispatchEvent(new Event("geraeteGeaendert"));
}

function berechneNaechstePruefung(datumStr, intervallMonate) {
    if (!datumStr || !intervallMonate || intervallMonate <= 0) return null;
    const teile = datumStr.split('-');
    if (teile.length !== 3) return null;

    const d = new Date(parseInt(teile[0]), parseInt(teile[1]) - 1, parseInt(teile[2]));
    if (isNaN(d.getTime())) return null;

    d.setMonth(d.getMonth() + parseInt(intervallMonate));
    
    const jahr = d.getFullYear();
    const monat = String(d.getMonth() + 1).padStart(2, '0');
    const tag = String(d.getDate()).padStart(2, '0');
    
    return `${jahr}-${monat}-${tag}`;
}

function neuesGeraet() {
    if (typeof istEditor === "function" && !istEditor()) {
        alert("🔒 Schreibschutz aktiv! Bitte melde dich an, um Geräte anzulegen oder zu bearbeiten.");
        return;
    }

    const elInv = document.getElementById("inventar");
    const elBez = document.getElementById("bezeichnung");
    const elKat = document.getElementById("kategorie");
    const elHer = document.getElementById("hersteller");
    const elStat = document.getElementById("status");
    const elSta = document.getElementById("standort") || document.getElementById("geraet-standort");
    const elErst = document.getElementById("erstinbetriebnahme");
    const elLpz = document.getElementById("letztePruefung");
    const elInt = document.getElementById("pruefintervall");

    const inventar = elInv ? elInv.value.trim() : "";
    const bezeichnung = elBez ? elBez.value.trim() : "";
    const kategorie = elKat ? elKat.value : "";
    const hersteller = elHer ? elHer.value.trim() : "";
    const status = elStat ? elStat.value : "Einsatzbereit";
    const standort = elSta ? elSta.value : "";
    const erstinbetriebnahme = elErst ? elErst.value : "";
    const letztePruefung = elLpz ? elLpz.value : "";
    const pruefintervall = elInt ? elInt.value : "12";

    if (!inventar || !bezeichnung || !kategorie) {
        alert("Bitte mindestens Inventarnummer, Bezeichnung und Kategorie ausfüllen.");
        return;
    }

    geraete = ladeDaten("geraete") || [];

    const vorhanden = geraete.find(g => 
        (g.inventarnummer || "").trim().toLowerCase() === inventar.toLowerCase() && 
        g.id !== bearbeitungsId
    );

    if (vorhanden) {
        alert("Diese Inventarnummer existiert bereits!");
        return;
    }

    const naechstePruefung = berechneNaechstePruefung(letztePruefung, pruefintervall);
    const protokollUser = hohleBenutzerProtokollText();
    const jetztZeitstempel = `${new Date().toLocaleDateString("de-DE")} um ${new Date().toLocaleTimeString("de-DE", {hour: '2-digit', minute:'2-digit'})}`;

    if (bearbeitungsId !== null) {
        const index = geraete.findIndex(g => g.id === bearbeitungsId);
        if (index !== -1) {
            geraete[index] = {
                ...geraete[index],
                inventarnummer: inventar,
                bezeichnung: bezeichnung,
                kategorie: kategorie,
                hersteller: hersteller,
                status: status,
                standort: standort,
                erstinbetriebnahme: erstinbetriebnahme,
                letztePruefung: letztePruefung,
                pruefintervall: parseInt(pruefintervall),
                naechstePruefung: naechstePruefung,
                bearbeitetVon: `${protokollUser} (am ${jetztZeitstempel})`
            };
        }
    } else {
        const neuesG = {
            id: "GER-" + Date.now(),
            inventarnummer: inventar,
            bezeichnung: bezeichnung,
            kategorie: kategorie,
            hersteller: hersteller,
            status: status,
            standort: standort,
            erstinbetriebnahme: erstinbetriebnahme,
            letztePruefung: letztePruefung,
            pruefintervall: parseInt(pruefintervall),
            naechstePruefung: naechstePruefung,
            historie: letztePruefung ? [{ datum: letztePruefung, ergebnis: "Ohne Mängel", pruefart: "Initialprüfung", pruefer: protokollUser }] : [],
            erstellt: jetztZeitstempel,
            erstelltVon: `${protokollUser} (am ${jetztZeitstempel})`,
            bearbeitetVon: `${protokollUser} (am ${jetztZeitstempel})`
        };
        geraete.push(neuesG);
    }

    speichereGeraete();
    resetFormular();
    filterGeraete();
}

function resetFormular() {
    bearbeitungsId = null;
    const felder = ["inventar", "bezeichnung", "hersteller", "kategorie", "standort", "geraet-standort", "erstinbetriebnahme", "letztePruefung"];
    felder.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = "";
    });
    
    if (document.getElementById("status")) document.getElementById("status").value = "Einsatzbereit";
    if (document.getElementById("pruefintervall")) document.getElementById("pruefintervall").value = "12";

    const btn = document.querySelector(".geraete-form button") || document.querySelector("button[onclick='neuesGeraet()']");
    if (btn) btn.innerHTML = "➕ Gerät speichern";
}

function filterGeraete() {
    geraete = ladeDaten("geraete") || [];

    const elSuche = document.getElementById("sucheGeraet");
    const elKat = document.getElementById("filterKategorie");
    const elStat = document.getElementById("filterStatus");

    const suchbegriff = elSuche ? elSuche.value.toLowerCase() : "";
    const kategorie = elKat ? elKat.value : "";
    let status = elStat ? elStat.value : "";

    // Dashboard-Filter aus dem localStorage holen
    const dashboardFilter = localStorage.getItem('aktiverDashboardFilter');

    // Wenn der Nutzer manuell ein Dropdown oder die Suche bedient, löschen wir den Dashboard-Filter aufheben
    // (Ausnahme: Die Funktion wurde frisch durch den Klick aufgerufen)
    
    const heute = new Date();
    heute.setHours(0, 0, 0, 0);

    const in30Tagen = new Date(heute);
    in30Tagen.setDate(heute.getDate() + 30);

    const gefiltert = geraete.filter(g => {
        const bez = (g.bezeichnung || "").toLowerCase();
        const inv = (g.inventarnummer || "").toLowerCase();
        const std = (g.standort || "").toLowerCase();

        const sucheOK = bez.includes(suchbegriff) || inv.includes(suchbegriff) || std.includes(suchbegriff);
        const kategorieOK = kategorie === "" || g.kategorie === kategorie;
        
        let statusOK = true;

        // Wenn ein Dashboard-Filter aktiv ist und der Nutzer nicht manuell gefiltert hat
        if (dashboardFilter && !suchbegriff && kategorie === "") {
            if (dashboardFilter === 'ueberfaellig') {
                if (!g.naechstePruefung) return false;
                const d = new Date(g.naechstePruefung);
                d.setHours(0, 0, 0, 0);
                statusOK = (d < heute);
            } else if (dashboardFilter === 'faellig') {
                if (!g.naechstePruefung) return false;
                const d = new Date(g.naechstePruefung);
                d.setHours(0, 0, 0, 0);
                statusOK = (d >= heute && d <= in30Tagen);
            } else if (dashboardFilter === 'Einsatzbereit') {
                statusOK = (!g.status || g.status.toLowerCase() === 'einsatzbereit' || g.status === 'Aktiv');
            } else if (dashboardFilter === 'inaktiv') {
                statusOK = (g.status && (g.status.toLowerCase() === 'defekt' || g.status.toLowerCase() === 'inaktiv' || g.status === 'Ausgemustert'));
            }
        } else {
            // Sobald der Nutzer etwas tippt oder das Dropdown ändert, greift der normale Filter
            if (dashboardFilter) {
                localStorage.removeItem('aktiverDashboardFilter');
            }
            
            if (status === "FAELLIG") {
                if (!g.naechstePruefung) return false;
                const d = new Date(g.naechstePruefung);
                d.setHours(0, 0, 0, 0);
                statusOK = (d < heute);
            } else if (status !== "") {
                statusOK = g.status === status;
            }
        }

        return sucheOK && kategorieOK && statusOK;
    });

    zeigeGefilterteGeraete(gefiltert);
}

function zeigeGefilterteGeraete(liste) {
    const ausgabe = document.getElementById("geraeteListe");
    if (!ausgabe) return;

    ausgabe.innerHTML = "";

    if (!liste || liste.length === 0) {
        ausgabe.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">Keine Geräte vorhanden</td></tr>`;
        return;
    }

    let html = "";
    liste.forEach(g => {
        let statusClass = "";
        switch (g.status) {
            case "Einsatzbereit": statusClass = "status-gruen"; break;
            case "Wartung": statusClass = "status-gelb"; break;
            case "Defekt": statusClass = "status-rot"; break;
            case "Außer Dienst": statusClass = "status-grau"; break;
        }

        const safeId = escapeHtml(g.id);

        html += `
        <tr>
            <td style="white-space: nowrap;">
                <button class="btn btn-details" title="Details / Akte" onclick="zeigeGeraeteDetails('${safeId}')">👁️</button>
                <button class="btn btn-bearbeiten" title="Bearbeiten" onclick="bearbeiteGeraet('${safeId}')">✏️</button>
                <button class="btn btn-loeschen" title="Löschen" onclick="loescheGeraet('${safeId}')">🗑️</button>
            </td>
            <td><strong>${escapeHtml(g.inventarnummer || '-')}</strong></td>
            <td>${escapeHtml(g.bezeichnung || '-')}</td>
            <td>${escapeHtml(g.kategorie || '-')}</td>
            <td>${escapeHtml(g.hersteller || "-")}</td>
            <td class="${statusClass}">${escapeHtml(g.status || 'Einsatzbereit')}</td>
        </tr>`;
    });

    ausgabe.innerHTML = html;
}

function zeigeGeraeteDetails(id) {
    geraete = ladeDaten("geraete") || [];
    const g = geraete.find(item => item.id === id);
    const detailsContainer = document.getElementById("geraeteDetails");

    if (!g || !detailsContainer) return;

    const naechstePruefFormatted = formatiereDatum(g.naechstePruefung);
    const inbetriebnahmeFormatted = formatiereDatum(g.erstinbetriebnahme);

    const historie = g.historie || [];
    let historieHtml = "";

    if (historie.length === 0) {
        historieHtml = `<li><small style="color:#777;">Bisher keine Prüfungen protokolliert.</small></li>`;
    } else {
        historie.slice().reverse().forEach(h => {
            const hDatum = formatiereDatum(h.datum);
            const ergColor = h.ergebnis === "Ohne Mängel" ? "#2e7d32" : (h.ergebnis === "Geringe Mängel" ? "#f57c00" : "#d32f2f");
            
            historieHtml += `
                <li style="margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 6px;">
                    <div><strong>📅 ${hDatum}</strong> – <span style="color:${ergColor}; font-weight:bold;">${escapeHtml(h.ergebnis || 'Geprüft')}</span></div>
                    <div style="font-size: 0.85rem; color: #444;"><strong>Art:</strong> ${escapeHtml(h.pruefart || 'Regelprüfung')} | <strong>Prüfer:</strong> ${escapeHtml(h.pruefer || 'Unbekannt')}</div>
                    ${h.bemerkung ? `<div style="font-size: 0.85rem; background:#fff8e1; padding:3px 6px; border-radius:3px; margin-top:2px;">📝 <em>${escapeHtml(h.bemerkung)}</em></div>` : ''}
                </li>
            `;
        });
    }

    const heuteISO = new Date().toISOString().split('T')[0];
    const safeId = escapeHtml(g.id);

    detailsContainer.innerHTML = `
        <h2>📋 Geräteakte</h2>
        <h3 style="color:#B71C1C; margin-top:5px;">${escapeHtml(g.bezeichnung)}</h3>
        <hr style="margin:10px 0;">
        <p><strong>Inventarnummer:</strong> ${escapeHtml(g.inventarnummer)}</p>
        <p><strong>Kategorie:</strong> ${escapeHtml(g.kategorie)}</p>
        <p><strong>Hersteller:</strong> ${escapeHtml(g.hersteller || "-")}</p>
        <p><strong>Standort:</strong> ${escapeHtml(g.standort || "-")}</p>
        <p><strong>Erstinbetriebnahme:</strong> ${inbetriebnahmeFormatted}</p>
        <p><strong>Status:</strong> ${escapeHtml(g.status)}</p>
        <p><strong>Nächste Prüfung:</strong> <span style="color:#B71C1C; font-weight:bold;">${naechstePruefFormatted}</span></p>
        
        <div style="font-size: 0.8rem; color: #555; background: #f8f9fa; border-left: 3px solid #007bff; padding: 6px 8px; margin: 10px 0;">
            <div><strong>Erstellt von:</strong> ${escapeHtml(g.erstelltVon || 'Unbekannt (Altbestand)')}</div>
            <div><strong>Zuletzt bearbeitet:</strong> ${escapeHtml(g.bearbeitetVon || ' Keine Änderungen')}</div>
        </div>

        <hr style="margin:15px 0;">
        <h4>📜 Prüfhistorie & Protokolle</h4>
        <ul style="list-style:none; padding-left:0; margin:10px 0; max-height: 200px; overflow-y: auto;">
            ${historieHtml}
        </ul>

        <div style="background:#f8f9fa; padding:12px; border:1px solid #ddd; border-radius:6px; margin-top:10px;">
            <strong style="font-size:0.95rem; display:block; margin-bottom:8px;">📝 Neue Prüfung / Protokoll eintragen</strong>
            
            <label style="font-size:0.8rem;">Prüfdatum:</label>
            <input type="date" id="neuesPruefDatum" value="${heuteISO}" style="width:100%; margin-bottom:6px; padding:4px;">
            
            <label style="font-size:0.8rem;">Prüfungsart (z. B. DGUV Leiterprüfung):</label>
            <select id="neuesPruefArt" style="width:100%; margin-bottom:6px; padding:4px;">
                <option value="Sicht- und Funktionsprüfung">Sicht- und Funktionsprüfung</option>
                <option value="Sichtprüfung">Sichtprüfung</option>
                <option value="Druckprüfung">Druckprüfung</option>
                <option value="Jahresprüfung (DGUV / Leiter)">Jahresprüfung (DGUV / Leiter)</option>
                <option value="Belastungsprüfung">Belastungsprüfung</option>
                <option value="Elektrische Prüfung (DGUV V3)">Elektrische Prüfung (DGUV V3)</option>
            </select>

            <label style="font-size:0.8rem;">Ergebnis:</label>
            <select id="neuesPruefErgebnis" style="width:100%; margin-bottom:6px; padding:4px;">
                <option value="Ohne Mängel">🟢 Ohne Mängel (Einsatzbereit)</option>
                <option value="Geringe Mängel">🟡 Geringe Mängel (Einsatzbereit)</option>
                <option value="Schwere Mängel / Gesperrt">🔴 Schwere Mängel (Außer Dienst)</option>
            </select>

            <label style="font-size:0.8rem;">Prüfer Name:</label>
            <input type="text" id="prueferName" placeholder="Name des Prüfers" style="width:100%; margin-bottom:6px; padding:4px;">

            <label style="font-size:0.8rem;">Mängel & Anmerkungen:</label>
            <textarea id="neuesPruefBemerkung" placeholder="z. B. Leichte Kratzer am Holm, Sichtprüfung i. O." style="width:100%; height:50px; margin-bottom:6px; padding:4px;"></textarea>

            <button class="btn btn-primary" style="width:100%; margin-top:6px;" onclick="fuegePruefungHinzu('${safeId}')">💾 Prüfung speichern</button>
        </div>
    `;
}

function fuegePruefungHinzu(id) {
    if (typeof istEditor === "function" && !istEditor()) {
        alert("🔒 Schreibschutz aktiv! Bitte melde dich an, um Prüfungen zu protokollieren.");
        return;
    }

    const elDatum = document.getElementById("neuesPruefDatum");
    const elArt = document.getElementById("neuesPruefArt");
    const elErgebnis = document.getElementById("neuesPruefErgebnis");
    const elPruefer = document.getElementById("prueferName");
    const elBemerkung = document.getElementById("neuesPruefBemerkung");

    const datum = elDatum ? elDatum.value : "";
    const pruefart = elArt ? elArt.value : "Sichtprüfung";
    const ergebnis = elErgebnis ? elErgebnis.value : "Ohne Mängel";
    let pruefer = elPruefer ? elPruefer.value.trim() : "";
    const bemerkung = elBemerkung ? elBemerkung.value.trim() : "";
    
    if (!pruefer) {
        pruefer = hohleBenutzerProtokollText();
    }

    if (!datum) {
        alert("Bitte ein Prüfdatum angeben.");
        return;
    }

    geraete = ladeDaten("geraete") || [];
    const index = geraete.findIndex(g => g.id === id);

    if (index !== -1) {
        const g = geraete[index];
        if (!g.historie) g.historie = [];

        g.historie.push({
            datum: datum,
            pruefart: pruefart,
            ergebnis: ergebnis,
            pruefer: pruefer,
            bemerkung: bemerkung
        });

        const protokollUser = hohleBenutzerProtokollText();
        const jetztZeitstempel = `${new Date().toLocaleDateString("de-DE")} um ${new Date().toLocaleTimeString("de-DE", {hour: '2-digit', minute:'2-digit'})}`;

        g.letztePruefung = datum;
        g.naechstePruefung = berechneNaechstePruefung(datum, g.pruefintervall || 12);
        
        if (ergebnis === "Schwere Mängel / Gesperrt") {
            g.status = "Defekt";
        }

        g.bearbeitetVon = `${protokollUser} (Prüfung am ${jetztZeitstempel})`;

        speichereGeraete();
        filterGeraete();
        zeigeGeraeteDetails(id);
    }
}

function bearbeiteGeraet(id) {
    if (typeof istEditor === "function" && !istEditor()) {
        alert("🔒 Schreibschutz aktiv! Bitte melde dich an, um Geräte zu bearbeiten.");
        return;
    }

    const g = geraete.find(item => item.id === id);
    if (!g) return;

    bearbeitungsId = id;

    if (document.getElementById("inventar")) document.getElementById("inventar").value = g.inventarnummer || "";
    if (document.getElementById("bezeichnung")) document.getElementById("bezeichnung").value = g.bezeichnung || "";
    if (document.getElementById("kategorie")) document.getElementById("kategorie").value = g.kategorie || "";
    if (document.getElementById("hersteller")) document.getElementById("hersteller").value = g.hersteller || "";
    if (document.getElementById("status")) document.getElementById("status").value = g.status || "Einsatzbereit";
    
    const elSta = document.getElementById("standort") || document.getElementById("geraet-standort");
    if (elSta) elSta.value = g.standort || "";

    if (document.getElementById("erstinbetriebnahme")) document.getElementById("erstinbetriebnahme").value = g.erstinbetriebnahme || "";
    if (document.getElementById("letztePruefung")) document.getElementById("letztePruefung").value = g.letztePruefung || "";
    if (document.getElementById("pruefintervall")) document.getElementById("pruefintervall").value = g.pruefintervall || "12";

    const btn = document.querySelector(".geraete-form button") || document.querySelector("button[onclick='neuesGeraet()']");
    if (btn) btn.innerHTML = "💾 Änderungen speichern";

    // Pragmatische Lösung: Sanftes Scrollen direkt zum Formular
    const zielFormular = document.querySelector(".geraete-form") || document.getElementById("inventar");
    if (zielFormular) {
        zielFormular.scrollIntoView({ behavior: "smooth", block: "center" });
        zielFormular.classList.add("highlight-form");
        setTimeout(() => zielFormular.classList.remove("highlight-form"), 1500);
    }
}

function loescheGeraet(id) {
    if (typeof istEditor === "function" && !istEditor()) {
        alert("🔒 Schreibschutz aktiv! Bitte melde dich an, um Geräte zu löschen.");
        return;
    }

    if (!confirm("Soll dieses Gerät wirklich gelöscht werden?")) return;

    geraete = geraete.filter(g => g.id !== id);
    speichereGeraete();
    filterGeraete();

    const detailsContainer = document.getElementById("geraeteDetails");
    if (detailsContainer) {
        detailsContainer.innerHTML = `<p>Bitte links ein Gerät auswählen.</p>`;
    }
}

// ------------------------------------------
// GERÄTE CSV-EXPORT
// ------------------------------------------
function exportGeraeteCSV() {
    let daten = window.geraeteDaten || [];
    
    if ((!daten || daten.length === 0) && typeof ladeDaten === "function") {
        daten = ladeDaten("geraete") || ladeDaten("ffw_geraete") || [];
    }

    if ((!daten || daten.length === 0) && typeof ladeGeraete === "function") {
        daten = ladeGeraete() || [];
    }

    if (!Array.isArray(daten) || daten.length === 0) {
        alert("⚠️ Es wurden keine Gerätedaten zum Exportieren gefunden.");
        return;
    }

    const headers = [
        "ID", 
        "Inventarnummer", 
        "Bezeichnung", 
        "Kategorie / Typ", 
        "Hersteller", 
        "Fahrzeug / Standort", 
        "Status", 
        "Nächste Prüfung", 
        "Bemerkung"
    ];

    const rows = daten.map(g => [
        g.id || '',
        g.inventarnummer || g.inventar || g.seriennummer || '',
        g.bezeichnung || g.name || '',
        g.kategorie || g.typ || '',
        g.hersteller || '',
        g.standort || g.fahrzeug || '',
        g.status || 'Einsatzbereit',
        g.naechstePruefung || g.pruefdatum || '',
        g.bemerkung || g.notiz || ''
    ]);

    const csvLines = [headers.join(";")];
    rows.forEach(r => {
        csvLines.push(r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    });

    // Dateiname mit heutigem Datum im Format YYYY-MM-DD
    const heute = new Date().toISOString().split('T')[0];
    const dateiname = `Geraeteliste_FFW_${heute}.csv`;

    // Blob explizit als text/csv mit UTF-8 BOM definieren
    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
    
    // Robuste Download-Ausführung
    if (navigator.msSaveBlob) { 
        // Für ältere Edge/IE Browser
        navigator.msSaveBlob(blob, dateiname);
    } else {
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.href = url;
        link.style.display = "none";
        link.download = dateiname; // Zwingt den Browser zur Namens- und Endungsvorgabe
        
        document.body.appendChild(link);
        link.click();
        
        // Timeout stellt sicher, dass der Browser den Download abgeschlossen hat, bevor der Link entfernt wird
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    }
}

// ------------------------------------------
// CSV-IMPORT (Intelligente Spaltenerkennung)
// ------------------------------------------
function importGeraeteCSV(inputElement) {
    try {
        if (typeof istEditor === "function" && !istEditor()) {
            alert("🔒 Schreibschutz aktiv! Bitte melde dich an, um Daten zu importieren.");
            if (inputElement && inputElement.target) inputElement.target.value = "";
            else if (inputElement) inputElement.value = "";
            return;
        }

        let el = inputElement;
        if (inputElement && inputElement.target) el = inputElement.target;

        const file = (el && el.files) ? el.files[0] : null;
        if (!file) {
            alert("⚠️ Keine Datei ausgewählt.");
            return;
        }

        const moechteErsetzen = confirm(
            "Möchtest du die vorhandene Geräteliste KOMPLETT ÜBERSCHREIBEN?\n\n" +
            "• OK = Bisherige Geräte löschen und nur neue laden\n" +
            "• Abbrechen = Neue Geräte zur bestehenden Liste hinzufügen / aktualisieren"
        );

        let geraeteDaten = [];
        if (!moechteErsetzen) {
            if (typeof ladeGeraete === "function") {
                geraeteDaten = ladeGeraete() || [];
            } else if (typeof ladeDaten === "function") {
                geraeteDaten = ladeDaten("geraete") || [];
            } else {
                const raw = localStorage.getItem("geraete") || "[]";
                try { geraeteDaten = JSON.parse(raw); } catch(e) { geraeteDaten = []; }
            }
        }

        const reader = new FileReader();
        
        reader.onerror = function() {
            alert("❌ Fehler beim Lesen der Datei.");
            if (el) el.value = "";
        };

        reader.onload = function(e) {
            try {
                let text = e.target.result;
                if (text.charCodeAt(0) === 0xFEFF) text = text.substr(1);

                const zeilen = text.split(/\r\n|\n/).filter(z => z.trim() !== "");
                if (zeilen.length < 2) {
                    alert("⚠️ Die CSV-Datei enthält keine verwertbaren Datenzeilen.");
                    if (el) el.value = "";
                    return;
                }

                const trenner = zeilen[0].includes(";") ? ";" : ",";
                const rawHeaders = zeilen[0].split(trenner).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

                const findIndex = (...keywords) => {
                    return rawHeaders.findIndex(h => {
                        const cleanH = h.replace(/[^a-z0-9]/g, '');
                        return keywords.some(kw => cleanH.includes(kw.toLowerCase().replace(/[^a-z0-9]/g, '')));
                    });
                };

                const idxId = findIndex("id");
                const idxInv = findIndex("inventarnummer", "invnr", "inv", "seriennummer");
                const idxBez = findIndex("bezeichnung", "name", "gerät");
                const idxKat = findIndex("kategorie", "typ", "kat");
                const idxHersteller = findIndex("hersteller");
                const idxStandort = findIndex("standort", "fahrzeug");
                const idxStatus = findIndex("status");
                const idxLetzte = findIndex("letzte", "letztepruefung");
                const idxIntervall = findIndex("intervall", "prüfintervall");
                const idxNaechste = findIndex("naechste", "nächste", "fälligkeit");
                const idxBemerkung = findIndex("bemerkung", "notiz");

                let aktualisiert = 0;
                let neuHinzugefuegt = 0;

                for (let i = 1; i < zeilen.length; i++) {
                    const werte = zeilen[i]
                        .split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                        .map(w => w.replace(/^"|"$/g, '').trim());

                    if (werte.length === 0 || werte.every(v => v === "")) continue;

                    const rawId = idxId !== -1 ? werte[idxId] : "";
                    const invNr = idxInv !== -1 ? werte[idxInv] : "";
                    const bez = idxBez !== -1 ? werte[idxBez] : "";

                    if (!bez && !invNr) continue;

                    let targetIndex = -1;
                    if (!moechteErsetzen) {
                        targetIndex = geraeteDaten.findIndex(g => {
                            if (!g) return false;
                            const matchId = rawId && String(g.id).toLowerCase() === rawId.toLowerCase();
                            const matchInv = invNr && String(g.inventarnummer || g.seriennummer || "").toLowerCase() === invNr.toLowerCase();
                            return matchId || matchInv;
                        });
                    }

                    const neuesGeraet = {
                        id: (targetIndex !== -1) ? geraeteDaten[targetIndex].id : (rawId || `GER_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`),
                        inventarnummer: invNr,
                        bezeichnung: bez,
                        kategorie: idxKat !== -1 ? werte[idxKat] : "Sonstiges",
                        hersteller: idxHersteller !== -1 ? werte[idxHersteller] : "",
                        standort: idxStandort !== -1 ? werte[idxStandort] : "",
                        status: idxStatus !== -1 ? werte[idxStatus] : "Einsatzbereit",
                        letztePruefung: idxLetzte !== -1 ? werte[idxLetzte] : "",
                        pruefintervall: idxIntervall !== -1 ? (parseInt(werte[idxIntervall]) || 12) : 12,
                        naechstePruefung: idxNaechste !== -1 ? werte[idxNaechste] : "",
                        bemerkung: idxBemerkung !== -1 ? werte[idxBemerkung] : ""
                    };

                    if (targetIndex !== -1) {
                        geraeteDaten[targetIndex] = neuesGeraet;
                        aktualisiert++;
                    } else {
                        geraeteDaten.push(neuesGeraet);
                        neuHinzugefuegt++;
                    }
                }

                if (typeof speichereGeraete === "function") speichereGeraete(geraeteDaten);
                if (typeof speichereDaten === "function") speichereDaten("geraete", geraeteDaten);
                
                localStorage.setItem("geraete", JSON.stringify(geraeteDaten));
                localStorage.setItem("ffw_geraete", JSON.stringify(geraeteDaten));

                if (typeof renderGeraeteView === "function") renderGeraeteView();
                if (typeof renderGeraete === "function") renderGeraete();
                if (typeof ladeGeraete === "function") ladeGeraete();

                window.dispatchEvent(new Event("geraeteGeaendert"));

                alert(`✅ Geräte-Import erfolgreich!\n\n• ${neuHinzugefuegt} Geräte neu hinzugefügt\n• ${aktualisiert} Geräte aktualisiert`);
                if (el) el.value = "";

            } catch (err) {
                alert("❌ Fehler beim Verarbeiten der CSV-Datei:\n" + err.message);
                if (el) el.value = "";
            }
        };

        reader.readAsText(file, "UTF-8");

    } catch (err) {
        alert("❌ Fehler beim Starten des Imports:\n" + err.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    ladeGeraete();
    filterGeraete();
});

document.addEventListener("geraeteGeaendert", () => {
    filterGeraete();
});

// Schnittstellen für Navigation & Dashboard
function renderGeraeteView() {
    filterGeraete();
}

function filtereGeraeteNachDashboard(filterTyp) {
    if (typeof zeigeSeite === 'function') {
        zeigeSeite('geraete');
    }
    
    const elStat = document.getElementById("filterStatus");
    if (elStat) {
        if (filterTyp === 'faellig') {
            elStat.value = 'FAELLIG';
        } else if (filterTyp === 'wartung') {
            elStat.value = 'Wartung';
        } else if (filterTyp === 'defekt') {
            elStat.value = 'Defekt';
        } else {
            elStat.value = '';
        }
    }
    
    filterGeraete();
}

// Globale Freigaben
window.getGeraete = getGeraete;
window.ladeGeraete = ladeGeraete;
window.speichereGeraete = speichereGeraete;
window.neuesGeraet = neuesGeraet;
window.resetFormular = resetFormular;
window.filterGeraete = filterGeraete;
window.zeigeGeraeteDetails = zeigeGeraeteDetails;
window.fuegePruefungHinzu = fuegePruefungHinzu;
window.bearbeiteGeraet = bearbeiteGeraet;
window.loescheGeraet = loescheGeraet;
window.exportGeraeteCSV = exportGeraeteCSV;
window.importGeraeteCSV = importGeraeteCSV;
window.renderGeraeteView = renderGeraeteView;
window.filtereGeraeteNachDashboard = filtereGeraeteNachDashboard;
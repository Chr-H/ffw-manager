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
function abbrechenGeraetBearbeitung() {
    // Alle Eingabefelder im Geräteformular leeren
    const formInputs = document.querySelectorAll('.geraete-form input, .geraete-form select, .geraete-form textarea');
    formInputs.forEach(input => {
        if (input.type === 'file' || input.type === 'url') {
            input.value = '';
        } else if (input.tagName === 'SELECT') {
            input.selectedIndex = 0;
        } else {
            input.value = '';
        }
    });

    // Bearbeitungs-ID zurücksetzen (sowohl bearbeitungsId als auch window.aktiveGeraeteId abdecken)
    if (typeof bearbeitungsId !== 'undefined') {
        bearbeitungsId = null;
    }
    if (typeof window.aktiveGeraeteId !== 'undefined') {
        window.aktiveGeraeteId = null;
    }

    // Speichern-Button wieder auf "Neu anlegen" zurücksetzen
    const hauptBtn = document.querySelector(".geraete-form button") || document.querySelector("button[onclick*='neuesGeraet']");
    if (hauptBtn) {
        hauptBtn.innerHTML = "➕ Gerät speichern";
        hauptBtn.setAttribute("onclick", "neuesGeraet()");
    }

    // Cloud-Link und Link-Titel explizit leeren
    const elCloud = document.getElementById("geraet-cloudlink");
    const elTitel = document.getElementById("geraet-linktitel");
    if (elCloud) elCloud.value = "";
    if (elTitel) elTitel.value = "";

    // Link-Vorschau-Container verstecken
    const linkAnzeige = document.getElementById("geraet-link-anzeige-container");
    if (linkAnzeige) linkAnzeige.style.display = "none";

    // Alle Datei-Inputs explizit leeren
    const dateiInputs = document.querySelectorAll('.geraete-form input[type="file"]');
    dateiInputs.forEach(input => {
        input.value = "";
    });
    // Temporären Dateispeicher ebenfalls aufräumen
    window.aktiveGerateDatei = null;
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
function neuesGeraet(uebergebeneId = null) {
    if (uebergebeneId) {
        bearbeitungsId = uebergebeneId;
    }
    
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
    const elAblauf = document.getElementById("ablaufdatum");
    const elDetails = document.getElementById("geraet-details");
    const elCloud = document.getElementById("geraet-cloudlink");
    const elLinkTitel = document.getElementById("geraet-linktitel");
    const elDatei = document.getElementById("geraet-datei");

    const inventar = elInv ? elInv.value.trim() : "";
    const bezeichnung = elBez ? elBez.value.trim() : "";
    const kategorie = elKat ? elKat.value : "";
    const hersteller = elHer ? elHer.value.trim() : "";
    const status = elStat ? elStat.value : "Einsatzbereit";
    const standort = elSta ? elSta.value : "";
    const erstinbetriebnahme = elErst ? elErst.value : "";
    const letztePruefung = elLpz ? elLpz.value : "";
    const pruefintervall = elInt ? elInt.value : "12";
    const ablaufdatum = elAblauf ? elAblauf.value : "";
    const details = elDetails ? elDetails.value.trim() : "";
    const cloudlink = elCloud ? elCloud.value.trim() : "";
    const linktitel = elLinkTitel ? elLinkTitel.value.trim() : "";
    const dateiObj = elDatei && elDatei.files.length > 0 ? elDatei.files[0] : null;

    if (!inventar || !bezeichnung || !kategorie) {
        alert("Bitte mindestens Inventarnummer, Bezeichnung und Kategorie ausfüllen.");
        return;
    }

    if (dateiObj) {
        const reader = new FileReader();
        reader.onload = function(e) {
            speichereGerateDaten({
                name: dateiObj.name,
                inhalt: e.target.result,
                titel: linktitel || dateiObj.name
            });
        };
        reader.readAsDataURL(dateiObj);
        return;
    }

    speichereGerateDaten({
        name: window.aktiveGerateDatei ? window.aktiveGerateDatei.name : "",
        inhalt: window.aktiveGerateDatei ? window.aktiveGerateDatei.inhalt : "",
        titel: linktitel
    });

    function speichereGerateDaten(dateiDaten) {
        let geraeteListe = ladeDaten("geraete") || [];

        if (bearbeitungsId === null) {
            const existierendesGerät = geraeteListe.find(g => (g.inventarnummer || "").trim().toLowerCase() === inventar.toLowerCase());
            if (existierendesGerät) {
                bearbeitungsId = existierendesGerät.id;
            }
        }

        const vorhanden = geraeteListe.find(g => 
            (g.inventarnummer || "").trim().toLowerCase() === inventar.toLowerCase() && 
            g.id !== bearbeitungsId
        );

        if (vorhanden) {
            alert("Diese Inventarnummer existiert bereits bei einem anderen Gerät!");
            return;
        }

        const naechstePruefung = berechneNaechstePruefung(letztePruefung, pruefintervall);
        const protokollUser = hohleBenutzerProtokollText();
        const jetztZeitstempel = `${new Date().toLocaleDateString("de-DE")} um ${new Date().toLocaleTimeString("de-DE", {hour: '2-digit', minute:'2-digit'})}`;

        if (bearbeitungsId !== null) {
            const index = geraeteListe.findIndex(g => String(g.id) === String(bearbeitungsId));
            if (index !== -1) {
                const altesGerat = geraeteListe[index];
                geraeteListe[index] = {
                    ...altesGerat,
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
                    ablaufdatum: ablaufdatum,
                    details: details,
                    // ➔ Hier wird der Link absolut sicher erhalten, falls das Feld leer war
                    cloudlink: cloudlink !== "" ? cloudlink : (altesGerat.cloudlink || ""),
                    linktitel: linktitel !== "" ? linktitel : (dateiDaten.titel || altesGerat.linktitel || ""),
                    // ➔ Datei wird erhalten oder aktualisiert
                    dateiName: dateiDaten.name || altesGerat.dateiName || "",
                    dateiInhalt: dateiDaten.inhalt || altesGerat.dateiInhalt || "",
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
                ablaufdatum: ablaufdatum,
                details: details,
                cloudlink: cloudlink,
                linktitel: dateiDaten.titel || linktitel,
                dateiName: dateiDaten.name || "",
                dateiInhalt: dateiDaten.inhalt || "",
                historie: letztePruefung ? [{ datum: letztePruefung, ergebnis: "Ohne Mängel", pruefart: "Initialprüfung", pruefer: protokollUser }] : [],
                erstellt: jetztZeitstempel,
                erstelltVon: `${protokollUser} (am ${jetztZeitstempel})`,
                bearbeitetVon: `${protokollUser} (am ${jetztZeitstempel})`
            };
            geraeteListe.push(neuesG);
        }

        geraete = geraeteListe;
        speichereGeraete();
        resetFormular();

        bearbeitungsId = null;
        const hauptBtn = document.querySelector(".geraete-form button") || document.querySelector("button[onclick*='neuesGeraet']");
        if (hauptBtn) {
            hauptBtn.innerHTML = "➕ Gerät speichern";
            hauptBtn.setAttribute("onclick", "neuesGeraet()");
        }

        if (elCloud) elCloud.value = "";
        if (elLinkTitel) elLinkTitel.value = "";

        const dateiInputs = document.querySelectorAll('.geraete-form input[type="file"]');
        dateiInputs.forEach(input => { input.value = ""; });

        const linkAnzeige = document.getElementById("geraet-link-anzeige-container");
        if (linkAnzeige) linkAnzeige.style.display = "none";
        window.aktiveGerateDatei = null;

        filterGeraete();
    }
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
    if (document.getElementById("ablaufdatum")) document.getElementById("ablaufdatum").value = "";
    if (document.getElementById("geraet-details")) document.getElementById("geraet-details").value = "";

    const btn = document.querySelector(".geraete-form button") || document.querySelector("button[onclick='neuesGeraet()']");
    if (btn) btn.innerHTML = "➕ Gerät speichern";
    const elCloud = document.getElementById("geraet-cloudlink");
    if (elCloud) elCloud.value = "";
}

function filterGeraete() {
    geraete = ladeDaten("geraete") || [];

    const elSuche = document.getElementById("sucheGeraet");
    const elKat = document.getElementById("filterKategorie");
    const elStat = document.getElementById("filterStatus");

    const suchbegriff = elSuche ? elSuche.value.toLowerCase() : "";
    const kategorie = elKat ? elKat.value : "";
    let status = elStat ? elStat.value : "";

    const dashboardFilter = localStorage.getItem('aktiverDashboardFilter');

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
            if (dashboardFilter) {
                localStorage.removeItem('aktiverDashboardFilter');
            }
            
            if (status === "ueberfaellig") {
                if (!g.naechstePruefung) return false;
                const d = new Date(g.naechstePruefung);
                d.setHours(0, 0, 0, 0);
                statusOK = (d < heute);
            } else if (status === "faellig") {
                if (!g.naechstePruefung) return false;
                const d = new Date(g.naechstePruefung);
                d.setHours(0, 0, 0, 0);
                statusOK = (d >= heute && d <= in30Tagen);
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
                <button class="btn btn-details" title="Geräte-Akte öffnen" onclick="oeffneGeraeteAkteModal('${safeId}')">📄</button>
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

// ------------------------------------------
// SCHRITT 3: MODAL-LOGIK FÜR DIE GERÄTE-AKTE
// ------------------------------------------
window.oeffneGeraeteAkteModal = function(id) {
    const geraeteListe = (typeof ladeDaten === 'function') ? ladeDaten('geraete') : [];
    const g = geraeteListe.find(item => String(item.id) === String(id));
    if (!g) {
        alert("⚠️ Gerät nicht gefunden.");
        return;
    }

    const naechstePruefFormatted = formatiereDatum(g.naechstePruefung);
    const ablaufDatumFormatted = g.ablaufdatum ? formatiereDatum(g.ablaufdatum) : 'Kein Ablaufdatum';

    const stammdatenDiv = document.getElementById('geraete-akte-stammdaten');
    if (stammdatenDiv) {
        stammdatenDiv.innerHTML = `
            <strong>Bezeichnung:</strong> ${escapeHtml(g.bezeichnung || g.name || '-')}<br>
            <strong>Inventarnummer:</strong> ${escapeHtml(g.inventarnummer || g.seriennummer || '-')}&nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Kategorie:</strong> ${escapeHtml(g.kategorie || g.typ || '-')}&nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Hersteller:</strong> ${escapeHtml(g.hersteller || '-')}<br>
            <strong>Standort:</strong> ${escapeHtml(g.standort || '-')}&nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Status:</strong> ${escapeHtml(g.status || 'Einsatzbereit')}&nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Nächste Prüfung:</strong> <span style="color:#B71C1C; font-weight:bold;">${naechstePruefFormatted}</span><br>
            <strong>Ablaufdatum:</strong> <span style="color:${g.ablaufdatum ? '#d32f2f' : '#333'}; font-weight:bold;">${ablaufDatumFormatted}</span>
            ${g.details ? `<div style="margin-top: 6px;"><strong>Details / Spezifikation:</strong> ${escapeHtml(g.details)}</div>` : ''}
            <div style="font-size: 0.8rem; color: #555; background: #fff; border-left: 3px solid #007bff; padding: 6px 8px; margin-top: 8px;">
                <div><strong>Erstellt von:</strong> ${escapeHtml(g.erstelltVon || 'Unbekannt')}</div>
                <div><strong>Zuletzt bearbeitet:</strong> ${escapeHtml(g.bearbeitetVon || 'Keine Änderungen')}</div>
            </div>
        `;
    }

    const titelEl = document.getElementById('geraete-akte-titel');
    if (titelEl) {
        titelEl.textContent = `🛠️ Geräte-Akte: ${escapeHtml(g.bezeichnung || g.name || 'Details')}`;
    }

    window.aktiveGeraeteAktenId = id;
    rendereGeraeteHistorieModal(g);

    // Formularfelder für neues Protokoll zurücksetzen / vorbelegen
    const heuteISO = new Date().toISOString().split('T')[0];
    const datumInput = document.getElementById('geraete-protokoll-datum');
    if (datumInput) datumInput.value = heuteISO;

    const artInput = document.getElementById('geraete-protokoll-art');
    if (artInput) artInput.value = 'Funktionsprüfung';

    const ergebnisInput = document.getElementById('geraete-protokoll-ergebnis');
    if (ergebnisInput) ergebnisInput.value = 'bestanden';

    const bemerkungInput = document.getElementById('geraete-protokoll-bemerkung');
    if (bemerkungInput) bemerkungInput.value = '';

    const modal = document.getElementById('geraete-akte-modal');
    if (modal) modal.style.display = 'flex';
};

window.speichereGeraeteProtokoll = function() {
    if (typeof window.aktiveGeraeteAktenId === 'undefined' || !window.aktiveGeraeteAktenId) {
        alert("⚠️ Kein Gerät ausgewählt.");
        return;
    }

    const artEl = document.getElementById('geraete-protokoll-art');
    const datumEl = document.getElementById('geraete-protokoll-datum');
    const ergebnisEl = document.getElementById('geraete-protokoll-ergebnis');
    const bemerkungEl = document.getElementById('geraete-protokoll-bemerkung');

    const art = artEl ? artEl.value : 'Sichtprüfung';
    const datum = datumEl ? datumEl.value : new Date().toISOString().split('T')[0];
    const ergebnis = ergebnisEl ? ergebnisEl.value : 'bestanden';
    const bemerkung = bemerkungEl ? bemerkungEl.value.trim() : '';

    let geraeteListe = (typeof ladeDaten === 'function') ? ladeDaten('geraete') : [];
    let g = geraeteListe.find(item => String(item.id) === String(window.aktiveGeraeteAktenId));

    if (g) {
        if (!g.pruefprotokolle) g.pruefprotokolle = [];

        g.pruefprotokolle.push({
            id: 'PP_' + Date.now(),
            art: art,
            datum: datum,
            ergebnis: ergebnis,
            bemerkung: bemerkung,
            erstelltAm: new Date().toISOString()
        });

        // Optional: Gerätestatus automatisch auf 'Defekt' setzen, falls Prüfung gescheitert
        if (ergebnis === 'gesperrt') {
            g.status = 'Gesperrt / Defekt';
        }

        if (typeof speichereDaten === 'function') {
            speichereDaten('geraete', geraeteListe);
        }

        // Formular nach dem Speichern leeren
        if (bemerkungEl) bemerkungEl.value = '';

        // Ansicht der Gerätehistorie sofort aktualisieren
        if (typeof rendereGeraeteHistorieModal === 'function') {
            rendereGeraeteHistorieModal(g);
        }
    }
};

function rendereGeraeteHistorieModal(g) {
    const listeDiv = document.getElementById('geraete-akte-historie-liste');
    if (!listeDiv) return;

    const historie = g.historie || g.protokolle || [];
    if (historie.length === 0) {
        listeDiv.innerHTML = `<p class="text-muted text-center m-0" style="font-size: 0.9em; padding: 10px;">Bisher keine Prüfungen protokolliert.</p>`;
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 6px;">';
    historie.slice().reverse().forEach((h, index) => {
        const echterIndex = historie.length - 1 - index;
        const hDatum = formatiereDatum(h.datum);
        const ergColor = h.ergebnis === "Ohne Mängel" ? "#2e7d32" : (h.ergebnis === "Geringe Mängel" ? "#f57c00" : "#d32f2f");
        
        html += `
            <div style="background: #fff; border: 1px solid #ddd; padding: 8px; border-radius: 4px; font-size: 0.9em;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 2px;">
                    <span>📅 ${hDatum} (${escapeHtml(h.pruefart || 'Regelprüfung')})</span>
                    <span style="color:${ergColor};">${escapeHtml(h.ergebnis || 'Geprüft')}</span>
                </div>
                <div style="font-size: 0.85rem; color: #444;"><strong>Prüfer:</strong> ${escapeHtml(h.pruefer || 'Unbekannt')}</div>
                ${h.bemerkung ? `<div style="font-size: 0.85rem; background:#fff8e1; padding:3px 6px; border-radius:3px; margin-top:2px;">📝 <em>${escapeHtml(h.bemerkung)}</em></div>` : ''}
                <div style="text-align: right; margin-top: 4px;">
                    <button type="button" class="btn btn-sm btn-outline-danger" style="font-size: 0.75em; padding: 1px 6px;" onclick="loescheGeraeteProtokollModal('${g.id}', ${echterIndex})">Löschen</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    listeDiv.innerHTML = html;
}

function speichereGeraeteProtokollModal() {
    const id = window.aktiveGeraeteAktenId;
    if (!id) return;

    if (typeof istEditor === "function" && !istEditor()) {
        alert("🔒 Schreibschutz aktiv! Bitte melde dich an, um Prüfungen zu protokollieren.");
        return;
    }

    const datum = document.getElementById('geraete-protokoll-datum').value;
    const pruefartEl = document.getElementById('geraete-protokoll-art');
    const pruefart = pruefartEl ? pruefartEl.value : 'Sichtprüfung';
    const ergebnis = document.getElementById('geraete-protokoll-ergebnis').value;
    const prueferInputEl = document.getElementById('geraete-protokoll-pruefer');
    const prueferInput = prueferInputEl ? prueferInputEl.value.trim() : '';
    const bemerkung = document.getElementById('geraete-protokoll-bemerkung').value.trim();

    if (!datum) {
        alert("Bitte ein Prüfdatum angeben.");
        return;
    }

    let geraeteListe = (typeof ladeDaten === 'function') ? ladeDaten('geraete') : [];
    const index = geraeteListe.findIndex(g => String(g.id) === String(id));
    if (index === -1) return;

    const g = geraeteListe[index];
    if (!g.historie) g.historie = g.protokolle || [];

    const protokollUser = (typeof hohleBenutzerProtokollText === 'function') ? hohleBenutzerProtokollText() : 'Unbekannt';
    const pruefer = prueferInput || protokollUser;

    g.historie.push({
        datum: datum,
        pruefart: pruefart,
        ergebnis: ergebnis,
        pruefer: pruefer,
        bemerkung: bemerkung
    });

    const jetztZeitstempel = `${new Date().toLocaleDateString("de-DE")} um ${new Date().toLocaleTimeString("de-DE", {hour: '2-digit', minute:'2-digit'})}`;

    g.letztePruefung = datum;
    if (typeof berechneNaechstePruefung === 'function') {
        g.naechstePruefung = berechneNaechstePruefung(datum, g.pruefintervall || 12);
    }
    
    // Status anpassen, wenn das Ergebnis auf Defekt/Gesperrt steht
    if (ergebnis === "Schwere Mängel / Gesperrt" || ergebnis === "gesperrt") {
        g.status = "Defekt";
    }

    g.bearbeitetVon = `${protokollUser} (Prüfung am ${jetztZeitstempel})`;

    if (typeof window.speichereDaten === 'function') {
        window.speichereDaten('geraete', geraeteListe);
    } else {
        localStorage.setItem('geraete', JSON.stringify(geraeteListe));
        localStorage.setItem('ffw_geraete', JSON.stringify(geraeteListe));
    }

    if (document.getElementById('geraete-protokoll-bemerkung')) document.getElementById('geraete-protokoll-bemerkung').value = '';
    if (document.getElementById('geraete-protokoll-pruefer')) document.getElementById('geraete-protokoll-pruefer').value = '';
    
    if (typeof filterGeraete === 'function') filterGeraete();
    oeffneGeraeteAkteModal(id);
}

function loescheGeraeteProtokollModal(geraetId, protokollIndex) {
    if (typeof istEditor === "function" && !istEditor()) {
        alert("🔒 Schreibschutz aktiv!");
        return;
    }

    if (!confirm("Diesen Protokolleintrag wirklich löschen?")) return;

    let geraeteListe = (typeof ladeDaten === 'function') ? ladeDaten('geraete') : [];
    const index = geraeteListe.findIndex(g => String(g.id) === String(geraetId));

    if (index >= 0) {
        const hist = geraeteListe[index].historie || geraeteListe[index].protokolle;
        if (hist) {
            hist.splice(protokollIndex, 1);
            
            if (typeof window.speichereDaten === 'function') {
                window.speichereDaten('geraete', geraeteListe);
            } else {
                localStorage.setItem('geraete', JSON.stringify(geraeteListe));
                localStorage.setItem('ffw_geraete', JSON.stringify(geraeteListe));
            }

            filterGeraete();
            oeffneGeraeteAkteModal(geraetId);
        }
    }
}

window.speichereGeraeteProtokollModal = speichereGeraeteProtokollModal;
window.loescheGeraeteProtokollModal = loescheGeraeteProtokollModal;

function bearbeiteGeraet(id) {
    if (typeof istEditor === "function" && !istEditor()) {
        alert("🔒 Schreibschutz aktiv! Bitte melde dich an, um Geräte zu bearbeiten.");
        return;
    }

    const geraete = typeof ladeDaten === 'function' ? ladeDaten('geraete') : [];
    const g = geraete.find(item => String(item.id) === String(id));
    if (!g) return;

    bearbeitungsId = id;

    if (document.getElementById("inventar")) document.getElementById("inventar").value = g.inventarnummer || g.seriennummer || "";
    if (document.getElementById("bezeichnung")) document.getElementById("bezeichnung").value = g.bezeichnung || g.name || "";
    if (document.getElementById("kategorie")) document.getElementById("kategorie").value = g.kategorie || g.typ || "";
    if (document.getElementById("hersteller")) document.getElementById("hersteller").value = g.hersteller || "";
    if (document.getElementById("status")) document.getElementById("status").value = g.status || "Einsatzbereit";
    if (document.getElementById("ablaufdatum")) document.getElementById("ablaufdatum").value = g.ablaufdatum || "";
    if (document.getElementById("geraet-details")) document.getElementById("geraet-details").value = g.details || "";
    
    // Cloud-Link & Link-Titel mitladen
    if (document.getElementById("geraet-cloudlink")) document.getElementById("geraet-cloudlink").value = g.cloudlink || g.link || "";
    if (document.getElementById("geraet-linktitel")) document.getElementById("geraet-linktitel").value = g.linktitel || "";

    // ➔ Datei für den Zwischenspeicher registrieren (falls vorhanden)
    if (g.dateiInhalt) {
        window.aktiveGerateDatei = {
            name: g.dateiName || "Datei",
            inhalt: g.dateiInhalt
        };
    } else {
        window.aktiveGerateDatei = null;
    }

    // ➔ Ansicht für Datei und/oder Link aktualisieren
    const linkAnzeige = document.getElementById("geraet-link-anzeige-container");
    const hatDatei = !!g.dateiInhalt;
    const hatLink = !!(g.cloudlink || g.link);

    if (hatDatei || hatLink) {
        if (typeof aktualisiereGerateLinkAnsicht === 'function') {
            if (hatDatei) {
                aktualisiereGerateLinkAnsicht(g.linktitel || g.dateiName || "Hochgeladene Datei", g.dateiInhalt, true);
            } else {
                aktualisiereGerateLinkAnsicht(g.linktitel || "Cloud-Link", g.cloudlink || g.link, false);
            }
        }
    } else {
        if (linkAnzeige) linkAnzeige.style.display = "none";
    }

    const elSta = document.getElementById("standort") || document.getElementById("geraet-standort");
    if (elSta) elSta.value = g.standort || "";

    if (document.getElementById("erstinbetriebnahme")) document.getElementById("erstinbetriebnahme").value = g.erstinbetriebnahme || "";
    if (document.getElementById("letztePruefung")) document.getElementById("letztePruefung").value = g.letztePruefung || "";
    if (document.getElementById("pruefintervall")) document.getElementById("pruefintervall").value = g.pruefintervall || "12";

    const hauptBtn = document.querySelector(".geraete-form button") || document.querySelector("button[onclick*='neuesGeraet']");
    if (hauptBtn) {
        hauptBtn.innerHTML = "💾 Änderungen speichern";
        hauptBtn.setAttribute("onclick", `neuesGeraet('${id}')`);
    }

    const zielFormular = document.querySelector(".geraete-form") || document.getElementById("inventar");
    if (zielFormular) {
        zielFormular.scrollIntoView({ behavior: "smooth", block: "start" });
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

    const heute = new Date().toISOString().split('T')[0];
    const dateiname = `Geraeteliste_FFW_${heute}.csv`;

    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
    
    if (navigator.msSaveBlob) { 
        navigator.msSaveBlob(blob, dateiname);
    } else {
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

// ------------------------------------------
// Schnittstellen für Navigation & Dashboard
// ------------------------------------------
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
function druckeGeräteBericht() {
    // 1. Alle drei Filter-Werte aus der Benutzeroberfläche auslesen
    const sucheInput = document.getElementById('sucheGeraet');
    const katSelect = document.getElementById('filterKategorie');
    const statusSelect = document.getElementById('filterStatus');

    const suchText = sucheInput ? sucheInput.value.toLowerCase().trim() : '';
    const gewaehlteKategorie = katSelect ? katSelect.value : '';
    const gewaehlterStatus = statusSelect ? statusSelect.value : '';

    // 2. Alle Geräte aus dem Speicher laden
    let geraete = typeof ladeDaten === 'function' ? ladeDaten('geraete') : [];

    // 3. Filter exakt so anwenden wie in der Ansicht
    geraete = geraete.filter(g => {
        // Suchtext-Prüfung (Inventarnummer, Bezeichnung, Hersteller, Standort, Kategorie)
        const gesamterInhalt = `${g.inventarnummer || ''} ${g.bezeichnung || ''} ${g.hersteller || ''} ${g.standort || ''} ${g.kategorie || ''} ${g.details || ''}`.toLowerCase();
        const passtSuchtext = suchText === '' || gesamterInhalt.includes(suchText);

        // Kategorie-Prüfung
        const passtKategorie = gewaehlteKategorie === '' || g.kategorie === gewaehlteKategorie;

        // Status-Prüfung (berücksichtigt auch Spezialfilter wie 'ueberfaellig' oder 'faellig' falls vorhanden)
        let passtStatus = true;
        if (gewaehlterStatus !== '') {
            if (gewaehlterStatus === 'ueberfaellig') {
                // Hier greift deine Logik für überfällige Prüfungen, falls als Status-Filter gewählt
                passtStatus = (g.status === 'Defekt') || (g.ablaufdatum && new Date(g.ablaufdatum) < new Date());
            } else {
                passtStatus = (g.status === gewaehlterStatus);
            }
        }

        return passtSuchtext && passtKategorie && passtStatus;
    });

    if (geraete.length === 0) {
        alert("⚠️ Keine Geräte gefunden, die den aktuellen Filtereinstellungen entsprechen.");
        return;
    }

    const heute = new Date().toLocaleDateString('de-DE');

    // 4. Tabellenzeilen für den Druck generieren
    let zeilenHtml = '';
    geraete.forEach((g, index) => {
        zeilenHtml += `
        <tr>
            <td style="text-align: center; color: #555;">${index + 1}</td>
            <td><strong>${g.bezeichnung || '-'}</strong></td>
            <td>${g.inventarnummer || '-'}</td>
            <td>${g.kategorie || '-'}</td>
            <td>${g.hersteller || '-'}</td>
            <td>${g.standort || '-'}</td>
            <td>${g.status || 'Einsatzbereit'}</td>
        </tr>`;
    });

    // 5. Zusammenstellung des professionellen HTML-Dokuments (im Stil der Fahrzeugakte)
    const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <title>Geräteliste - FFW Albertsried</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #222; }
            .top-bar { display: flex; align-items: center; gap: 15px; border-bottom: 2px solid #b22222; padding-bottom: 10px; margin-bottom: 15px; }
            .logo { width: 45px; height: auto; }
            .brand-title { font-size: 1.4em; font-weight: bold; color: #111; }
            .header { margin-bottom: 20px; }
            h1 { margin: 0; color: #b22222; font-size: 1.5em; }
            .subtitle { font-size: 0.95em; color: #555; margin-top: 3px; }
            .filter-info { background: #f2f2f2; padding: 8px 12px; border-radius: 4px; font-size: 0.9em; margin-bottom: 15px; color: #444; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 0.85em; }
            th { background-color: #eee; color: #111; }
            .footer { margin-top: 30px; font-size: 0.8em; color: #777; text-align: right; }
        </style>
    </head>
    <body>
        <div class="top-bar">
            <img src="logo.png" onerror="this.style.display='none'" class="logo" alt="Logo">
            <div class="brand-title">Freiwillige Feuerwehr Albertsried</div>
        </div>

        <div class="header">
            <h1>🛠️ Geräte- und Inventarliste</h1>
            <div class="subtitle">FFW Albertsried | Stand: ${heute}</div>
        </div>

        <div class="filter-info">
            Aktive Filter: 
            ${suchText ? `Suche: "${suchText}" | ` : ''}
            ${gewaehlteKategorie ? `Kategorie: "${gewaehlteKategorie}" | ` : 'Alle Kategorien | '}
            ${gewaehlterStatus ? `Status: "${gewaehlterStatus}"` : 'Alle Status'} 
            <strong>(${geraete.length} Treffer)</strong>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 5%; text-align: center;">#</th>
                    <th style="width: 25%;">Bezeichnung</th>
                    <th style="width: 15%;">Inv.-Nr.</th>
                    <th style="width: 15%;">Kategorie</th>
                    <th style="width: 15%;">Hersteller</th>
                    <th style="width: 15%;">Standort</th>
                    <th style="width: 10%;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${zeilenHtml}
            </tbody>
        </table>

        <div class="footer">Gedruckt am ${heute} über FFW Manager</div>
    </body>
    </html>`;

    // 6. Ausgabefenster öffnen und drucken
    const druckFenster = window.open('', '_blank');
    druckFenster.document.write(html);
    druckFenster.document.close();
    
    setTimeout(() => {
        druckFenster.focus();
        druckFenster.print();
    }, 250);
}
// Hilfsfunktion zum Hinzufügen / Aktualisieren des Links oder der Datei in der Maske
function fuegeGerateLinkHinzu() {
    const titelInput = document.getElementById("geraet-linktitel");
    const linkInput = document.getElementById("geraet-cloudlink");
    const dateiInput = document.getElementById("geraet-datei");
    
    const titel = titelInput ? titelInput.value.trim() : "";
    const url = linkInput ? linkInput.value.trim() : "";
    const datei = dateiInput && dateiInput.files.length > 0 ? dateiInput.files[0] : null;

    if (!url && !datei) {
        alert("Bitte gib entweder einen Cloud-Link ein oder wähle eine Datei zum Hochladen aus.");
        return;
    }

    // Wenn eine Datei ausgewählt wurde, konvertieren wir sie für den Speicher
    if (datei) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const dateiInhalt = e.target.result; // Base64-String der Datei
            const dateiName = datei.name;

            // Im Zwischenspeicher/Dataset für das aktuelle Gerät hinterlegen
            window.aktiveGerateDatei = {
                name: dateiName,
                inhalt: dateiInhalt,
                titel: titel || dateiName
            };

            aktualisiereGerateLinkAnsicht(titel || dateiName, dateiInhalt, true);
        };
        reader.readAsDataURL(datei);
    } else {
        // Fall: Nur Cloud-Link
        window.aktiveGerateDatei = null;
        aktualisiereGerateLinkAnsicht(titel || "Dokument / Unterlage", url, false);
    }
}
// Zeigt Link und Datei getrennt voneinander mit eigenen Beschriftungen an
function aktualisiereGerateLinkAnsicht(titel, ziel, istDatei = false) {
    const container = document.getElementById("geraet-link-anzeige-container");
    if (!container) return;

    const aktuellerLink = document.getElementById("geraet-cloudlink")?.value || "";
    const hatDatei = (window.aktiveGerateDatei && window.aktiveGerateDatei.inhalt) || (istDatei && ziel);
    const hatLink = !!aktuellerLink;

    if (!hatDatei && !hatLink) {
        container.style.display = "none";
        return;
    }

    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.flexWrap = "wrap";
    container.style.gap = "10px";

    let htmlInhalt = "";

    // 1. Datei-Anzeige (verwendet den echten Dateinamen)
    if (hatDatei) {
        const dateiName = (window.aktiveGerateDatei ? window.aktiveGerateDatei.name : null) || "Hochgeladene Datei";
        const dateiInhalt = (window.aktiveGerateDatei ? window.aktiveGerateDatei.inhalt : null) || (istDatei ? ziel : "");
        htmlInhalt += `
            <div style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; background: #fff; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;">
                <span>📎</span>
                <a href="${dateiInhalt}" download="${dateiName}" target="_blank" style="color: #0056b3; text-decoration: underline;" title="Datei öffnen">
                    ${dateiName}
                </a>
                <button type="button" onclick="loescheGerateDatei()" style="background: #dc3545; color: white; border: none; border-radius: 3px; width: 20px; height: 20px; cursor: pointer; font-size: 0.7rem; line-height: 1;" title="Datei entfernen">✕</button>
            </div>
        `;
    }

    // 2. Link-Anzeige (verwendet fest "Cloud-Link" oder den Link selbst zur Unterscheidung)
    if (hatLink) {
        // Kürzt die URL etwas ab für die Anzeige, falls kein Extratitel da ist
        let linkAnzeigeText = "Cloud-Link öffnen";
        try {
            const urlObj = new URL(aktuellerLink);
            linkAnzeigeText = "🔗 " + urlObj.hostname; // Zeigt z.B. "magentacloud.de"
        } catch (e) {
            linkAnzeigeText = "🔗 Cloud-Link";
        }

        htmlInhalt += `
            <div style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; background: #fff; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;">
                <a href="${aktuellerLink}" target="_blank" style="color: #0056b3; text-decoration: underline;" title="${aktuellerLink}">
                    ${linkAnzeigeText}
                </a>
                <button type="button" onclick="loescheGerateLink()" style="background: #dc3545; color: white; border: none; border-radius: 3px; width: 20px; height: 20px; cursor: pointer; font-size: 0.7rem; line-height: 1;" title="Link entfernen">✕</button>
            </div>
        `;
    }

    container.innerHTML = htmlInhalt;
}

// Dauerhaftes Löschen der Datei für das aktuelle Bearbeitungs- oder Neugerät
function loescheGerateDatei() {
    window.aktiveGerateDatei = null;
    const fileInput = document.getElementById("geraet-datei");
    if (fileInput) fileInput.value = "";

    // Wenn wir in einem bestehenden Gerät sind (bearbeitungsId gesetzt), direkt in der DB löschen
    if (typeof bearbeitungsId !== 'undefined' && bearbeitungsId !== null) {
        let geraeteListe = ladeDaten("geraete") || [];
        const index = geraeteListe.findIndex(g => String(g.id) === String(bearbeitungsId));
        if (index !== -1) {
            geraeteListe[index].dateiName = "";
            geraeteListe[index].dateiInhalt = "";
            geraete = geraeteListe;
            speichereGeraete();
        }
    }

    // Ansicht aktualisieren (prüfen, ob der Link noch da ist)
    const linkVal = document.getElementById("geraet-cloudlink")?.value || "";
    if (linkVal) {
        aktualisiereGerateLinkAnsicht("", linkVal, false);
    } else {
        const container = document.getElementById("geraet-link-anzeige-container");
        if (container) container.style.display = "none";
    }
}

// Dauerhaftes Löschen des Links für das aktuelle Bearbeitungs- oder Neugerät
function loescheGerateLink() {
    const cloudInput = document.getElementById("geraet-cloudlink");
    const titelInput = document.getElementById("geraet-linktitel");
    if (cloudInput) cloudInput.value = "";
    if (titelInput) titelInput.value = "";

    // Wenn wir in einem bestehenden Gerät sind, direkt in der DB löschen
    if (typeof bearbeitungsId !== 'undefined' && bearbeitungsId !== null) {
        let geraeteListe = ladeDaten("geraete") || [];
        const index = geraeteListe.findIndex(g => String(g.id) === String(bearbeitungsId));
        if (index !== -1) {
            geraeteListe[index].cloudlink = "";
            geraeteListe[index].linktitel = "";
            geraete = geraeteListe;
            speichereGeraete();
        }
    }

    // Ansicht aktualisieren (prüfen, ob die Datei noch da ist)
    if (window.aktiveGerateDatei && window.aktiveGerateDatei.inhalt) {
        aktualisiereGerateLinkAnsicht(window.aktiveGerateDatei.name, window.aktiveGerateDatei.inhalt, true);
    } else {
        const container = document.getElementById("geraet-link-anzeige-container");
        if (container) container.style.display = "none";
    }
}
function exportiereGerateAkteAlsPDF(id) {
    const geraete = typeof ladeDaten === 'function' ? ladeDaten('geraete') : [];
    const g = geraete.find(item => String(item.id) === String(id));
    if (!g) {
        alert("Gerät nicht gefunden.");
        return;
    }

    // Ein neues, temporäres Fenster für den sauberen Druck-/PDF-Inhalt öffnen
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    // HTML-Inhalt für die PDF-Ansicht aufbauen
    const htmlInhalt = `
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <title>Geräteakte - ${g.inventarnummer}</title>
            <style>
                body { font-family: Arial, sans-serif; color: #333; line-height: 1.4; padding: 20px; font-size: 14px; }
                h1 { color: #0056b3; border-bottom: 2px solid #0056b3; padding-bottom: 5px; font-size: 20px; }
                .section { margin-bottom: 15px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
                .label { font-weight: bold; color: #555; }
                .box { background: #f8f9fa; border: 1px solid #ddd; padding: 10px; border-radius: 4px; margin-top: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 12px; }
                th { background: #f1f1f1; }
                @media print {
                    body { padding: 0; }
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>Geräteakte: ${g.bezeichnung || 'Unbenannt'}</h1>
            
            <div class="grid">
                <div><span class="label">Inventarnummer:</span> ${g.inventarnummer || '-'}</div>
                <div><span class="label">Status:</span> ${g.status || '-'}</div>
                <div><span class="label">Kategorie:</span> ${g.kategorie || '-'}</div>
                <div><span class="label">Hersteller:</span> ${g.hersteller || '-'}</div>
                <div><span class="label">Standort:</span> ${g.standort || '-'}</div>
                <div><span class="label">Erstinbetriebnahme:</span> ${g.erstinbetriebnahme || '-'}</div>
            </div>

            <div class="grid">
                <div><span class="label">Letzte Prüfung:</span> ${g.letztePruefung || '-'}</div>
                <div><span class="label">Nächste Prüfung:</span> ${g.naechstePruefung || '-'}</div>
                <div><span class="label">Prüfintervall:</span> ${g.pruefintervall ? g.pruefintervall + ' Monate' : '-'}</div>
                <div><span class="label">Ablaufdatum:</span> ${g.ablaufdatum || '-'}</div>
            </div>

            ${g.details ? `<div class="section"><span class="label">Details / Sonstiges:</span><div class="box">${g.details}</div></div>` : ''}

            <div class="section">
                <span class="label">Verknüpfungen & Dokumente:</span>
                <div class="box">
                    ${g.cloudlink ? `<div><strong>Cloud-Link (${g.linktitel || 'Link'}):</strong> <a href="${g.cloudlink}" target="_blank">${g.cloudlink}</a></div>` : ''}
                    ${g.dateiName ? `<div><strong>Hochgeladene Datei:</strong> ${g.dateiName}</div>` : ''}
                    {!g.cloudlink && !g.dateiName ? 'Keine Dokumente oder Links hinterlegt.' : ''}
                </div>
            </div>

            ${g.historie && g.historie.length > 0 ? `
                <div class="section">
                    <span class="label">Prüf- und Änderungshistorie:</span>
                    <table>
                        <thead>
                            <tr>
                               <th>Datum</th>
                               <th>Prüfart</th>
                               <th>Ergebnis</th>
                               <th>Prüfer</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${g.historie.map(h => `
                                <tr>
                                    <td>${h.datum || '-'}</td>
                                    <td>${h.pruefart || '-'}</td>
                                    <td>${h.ergebnis || '-'}</td>
                                    <td>${h.pruefer || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            <div style="margin-top: 30px; text-align: center;">
                <button onclick="window.print()" style="background: #28a745; color: white; border: none; padding: 10px 20px; font-size: 16px; border-radius: 4px; cursor: pointer;">🖨️ PDF speichern / Drucken</button>
            </div>
            
            <script>
                // Optional direkt den Dialog öffnen, sobald geladen
                window.onload = function() {
                    setTimeout(() => window.print(), 500);
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlInhalt);
    printWindow.document.close();
}

// Globale Freigaben (inklusive der neuen Modal-Funktionen)
window.getGeraete = getGeraete;
window.ladeGeraete = ladeGeraete;
window.speichereGeraete = speichereGeraete;
window.neuesGeraet = neuesGeraet;
window.resetFormular = resetFormular;
window.filterGeraete = filterGeraete;
window.bearbeiteGeraet = bearbeiteGeraet;
window.loescheGeraet = loescheGeraet;
window.exportGeraeteCSV = exportGeraeteCSV;
window.importGeraeteCSV = importGeraeteCSV;
window.renderGeraeteView = renderGeraeteView;
window.filtereGeraeteNachDashboard = filtereGeraeteNachDashboard;
window.oeffneGeraeteAkteModal = oeffneGeraeteAkteModal;
window.speichereGeraeteProtokollModal = speichereGeraeteProtokollModal;
window.loescheGeraeteProtokollModal = loescheGeraeteProtokollModal;
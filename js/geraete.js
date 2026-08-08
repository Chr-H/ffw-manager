// ==========================================
// FFW Manager - Geräteverwaltung (v0.6.2)
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
    const elInv = document.getElementById("inventar");
    const elBez = document.getElementById("bezeichnung");
    const elKat = document.getElementById("kategorie");
    const elHer = document.getElementById("hersteller");
    const elStat = document.getElementById("status");
    const elSta = document.getElementById("standort");
    const elErst = document.getElementById("erstinbetriebnahme");
    const elLpz = document.getElementById("letztePruefung");
    const elInt = document.getElementById("pruefintervall");

    const inventar = elInv ? elInv.value.trim() : "";
    const bezeichnung = elBez ? elBez.value.trim() : "";
    const kategorie = elKat ? elKat.value : "";
    const hersteller = elHer ? elHer.value.trim() : "";
    const status = elStat ? elStat.value : "Einsatzbereit";
    const standort = elSta ? elSta.value.trim() : "";
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
                naechstePruefung: naechstePruefung
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
            historie: letztePruefung ? [{ datum: letztePruefung, ergebnis: "Initialprüfung", pruefer: "System" }] : [],
            erstellt: new Date().toLocaleDateString("de-DE")
        };
        geraete.push(neuesG);
    }

    speichereGeraete();
    resetFormular();
    filterGeraete();
}

function resetFormular() {
    bearbeitungsId = null;
    const felder = ["inventar", "bezeichnung", "hersteller", "kategorie", "standort", "erstinbetriebnahme", "letztePruefung"];
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
    const status = elStat ? elStat.value : "";

    const heute = new Date().toISOString().split('T')[0];

    const gefiltert = geraete.filter(g => {
        const bez = (g.bezeichnung || "").toLowerCase();
        const inv = (g.inventarnummer || "").toLowerCase();

        const sucheOK = bez.includes(suchbegriff) || inv.includes(suchbegriff);
        const kategorieOK = kategorie === "" || g.kategorie === kategorie;
        
        let statusOK = true;
        if (status === "FAELLIG") {
            statusOK = g.naechstePruefung && g.naechstePruefung <= heute;
        } else if (status !== "") {
            statusOK = g.status === status;
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
            historieHtml += `
                <li style="margin-bottom: 6px; border-bottom: 1px dotted #ccc; padding-bottom: 4px;">
                    <strong>📅 ${hDatum}</strong> - <span style="color:#2e7d32;">${escapeHtml(h.ergebnis || 'Geprüft')}</span>
                    <br><small>Prüfer: ${escapeHtml(h.pruefer || 'Unbekannt')} ${h.bemerkung ? '| Note: ' + escapeHtml(h.bemerkung) : ''}</small>
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
        
        <hr style="margin:15px 0;">
        <h4>📜 Prüfhistorie</h4>
        <ul style="list-style:none; padding-left:0; margin:10px 0; max-height: 180px; overflow-y: auto;">
            ${historieHtml}
        </ul>

        <div style="background:#f5f5f5; padding:10px; border-radius:6px; margin-top:10px;">
            <strong style="font-size:0.9rem;">+ Neue Prüfung eintragen</strong>
            <input type="date" id="neuesPruefDatum" value="${heuteISO}" style="width:100%; margin:4px 0; padding:4px;">
            <input type="text" id="prueferName" placeholder="Prüfer Name" style="width:100%; margin:4px 0; padding:4px;">
            <button class="btn btn-primary" style="width:100%; margin-top:6px;" onclick="fuegePruefungHinzu('${safeId}')">Prüfung protokollieren</button>
        </div>
    `;
}

function fuegePruefungHinzu(id) {
    const elDatum = document.getElementById("neuesPruefDatum");
    const elPruefer = document.getElementById("prueferName");

    const datum = elDatum ? elDatum.value : "";
    const pruefer = elPruefer ? elPruefer.value.trim() : "Unbekannt";

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
            ergebnis: "Erfolgreich geprüft",
            pruefer: pruefer
        });

        g.letztePruefung = datum;
        g.naechstePruefung = berechneNaechstePruefung(datum, g.pruefintervall || 12);

        speichereGeraete();
        filterGeraete();
        zeigeGeraeteDetails(id);
    }
}

function bearbeiteGeraet(id) {
    const g = geraete.find(item => item.id === id);
    if (!g) return;

    bearbeitungsId = id;

    if (document.getElementById("inventar")) document.getElementById("inventar").value = g.inventarnummer || "";
    if (document.getElementById("bezeichnung")) document.getElementById("bezeichnung").value = g.bezeichnung || "";
    if (document.getElementById("kategorie")) document.getElementById("kategorie").value = g.kategorie || "";
    if (document.getElementById("hersteller")) document.getElementById("hersteller").value = g.hersteller || "";
    if (document.getElementById("status")) document.getElementById("status").value = g.status || "Einsatzbereit";
    if (document.getElementById("standort")) document.getElementById("standort").value = g.standort || "";
    if (document.getElementById("erstinbetriebnahme")) document.getElementById("erstinbetriebnahme").value = g.erstinbetriebnahme || "";
    if (document.getElementById("letztePruefung")) document.getElementById("letztePruefung").value = g.letztePruefung || "";
    if (document.getElementById("pruefintervall")) document.getElementById("pruefintervall").value = g.pruefintervall || "12";

    const btn = document.querySelector(".geraete-form button") || document.querySelector("button[onclick='neuesGeraet()']");
    if (btn) btn.innerHTML = "💾 Änderungen speichern";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function loescheGeraet(id) {
    if (!confirm("Soll dieses Gerät wirklich gelöscht werden?")) return;

    geraete = geraete.filter(g => g.id !== id);
    speichereGeraete();
    filterGeraete();

    const detailsContainer = document.getElementById("geraeteDetails");
    if (detailsContainer) {
        detailsContainer.innerHTML = `<p>Bitte links ein Gerät auswählen.</p>`;
    }
}

// Direct CSV Export direkt im Modul
function exportGeraeteCSV() {
    const daten = getGeraete();

    if (!Array.isArray(daten) || daten.length === 0) {
        alert("⚠️ Es wurden keine Gerätedaten zum Exportieren gefunden.");
        return;
    }

    const headers = ["ID", "Inventarnummer", "Bezeichnung", "Kategorie", "Hersteller", "Standort", "Status", "Letzte Prüfung", "Nächste Prüfung"];
    const rows = daten.map(g => [
        g.id || '',
        g.inventarnummer || '',
        g.bezeichnung || '',
        g.kategorie || '',
        g.hersteller || '',
        g.standort || '',
        g.status || '',
        g.letztePruefung || '',
        g.naechstePruefung || ''
    ]);

    const heute = new Date().toISOString().split('T')[0];
    
    if (typeof window.downloadCSV === "function") {
        window.downloadCSV(`Geraeteliste_FFW_${heute}.csv`, headers, rows);
    } else {
        // Fallback falls downloadCSV nicht global vorhanden ist
        const csvLines = [headers.join(";")];
        rows.forEach(r => csvLines.push(r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")));
        const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Geraeteliste_FFW_${heute}.csv`;
        link.click();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    ladeGeraete();
    filterGeraete();
});

document.addEventListener("geraeteGeaendert", () => {
    filterGeraete();
});

// ==========================================
// Schnittstellen für Navigation & Dashboard
// ==========================================

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
window.renderGeraeteView = renderGeraeteView;
window.filtereGeraeteNachDashboard = filtereGeraeteNachDashboard;
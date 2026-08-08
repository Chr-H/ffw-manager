// ==========================================
// FFW Manager - Geräteverwaltung (v0.6.0)
// ==========================================

let geraete = ladeDaten("geraete") || [];
let bearbeitungsId = null;

function ladeGeraete() {
    geraete = ladeDaten("geraete") || [];
    return geraete;
}

function speichereGeraete() {
    speichereDaten('geraete', geraete);
    document.dispatchEvent(new Event("geraeteGeaendert"));
}

function berechneNaechstePruefung(datumStr, intervallMonate) {
    if (!datumStr || !intervallMonate || intervallMonate <= 0) return null;
    const d = new Date(datumStr);
    if (isNaN(d.getTime())) return null;
    d.setMonth(d.getMonth() + parseInt(intervallMonate));
    return d.toISOString().split('T')[0];
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

    const gefiltert = geraete.filter(g => {
        const bez = (g.bezeichnung || "").toLowerCase();
        const inv = (g.inventarnummer || "").toLowerCase();

        const sucheOK = bez.includes(suchbegriff) || inv.includes(suchbegriff);
        const kategorieOK = kategorie === "" || g.kategorie === kategorie;
        const statusOK = status === "" || g.status === status;

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

    liste.forEach(g => {
        let statusClass = "";
        switch (g.status) {
            case "Einsatzbereit": statusClass = "status-gruen"; break;
            case "Wartung": statusClass = "status-gelb"; break;
            case "Defekt": statusClass = "status-rot"; break;
            case "Außer Dienst": statusClass = "status-grau"; break;
        }

        // Buttons stehen JETZT in der ersten Spalte (links)
        ausgabe.innerHTML += `
        <tr>
            <td style="white-space: nowrap;">
                <button class="btn btn-details" title="Details / Akte" onclick="zeigeGeraeteDetails('${g.id}')">👁️</button>
                <button class="btn btn-bearbeiten" title="Bearbeiten" onclick="bearbeiteGeraet('${g.id}')">✏️</button>
                <button class="btn btn-loeschen" title="Löschen" onclick="loescheGeraet('${g.id}')">🗑️</button>
            </td>
            <td><strong>${g.inventarnummer || '-'}</strong></td>
            <td>${g.bezeichnung || '-'}</td>
            <td>${g.kategorie || '-'}</td>
            <td>${g.hersteller || "-"}</td>
            <td class="${statusClass}">${g.status || 'Einsatzbereit'}</td>
        </tr>`;
    });
}

function zeigeGeraeteDetails(id) {
    geraete = ladeDaten("geraete") || [];
    const g = geraete.find(item => item.id === id);
    const detailsContainer = document.getElementById("geraeteDetails");

    if (!g || !detailsContainer) return;

    const naechstePruefFormatted = g.naechstePruefung 
        ? new Date(g.naechstePruefung).toLocaleDateString("de-DE") 
        : "Keine Angabe";

    const letztePruefFormatted = g.letztePruefung 
        ? new Date(g.letztePruefung).toLocaleDateString("de-DE") 
        : "Keine Angabe";

    const inbetriebnahmeFormatted = g.erstinbetriebnahme 
        ? new Date(g.erstinbetriebnahme).toLocaleDateString("de-DE") 
        : "Nicht erfasst";

    // Prüfhistorie auflisten
    const historie = g.historie || [];
    let historieHtml = "";

    if (historie.length === 0) {
        historieHtml = `<li><small style="color:#777;">Bisher keine Prüfungen protokolliert.</small></li>`;
    } else {
        historie.slice().reverse().forEach(h => {
            const hDatum = h.datum ? new Date(h.datum).toLocaleDateString("de-DE") : "-";
            historieHtml += `
                <li style="margin-bottom: 6px; border-bottom: 1px dotted #ccc; padding-bottom: 4px;">
                    <strong>📅 ${hDatum}</strong> - <span style="color:#2e7d32;">${h.ergebnis || 'Geprüft'}</span>
                    <br><small>Prüfer: ${h.pruefer || 'Unbekannt'} ${h.bemerkung ? '| Note: ' + h.bemerkung : ''}</small>
                </li>
            `;
        });
    }

    detailsContainer.innerHTML = `
        <h2>📋 Geräteakte</h2>
        <h3 style="color:#B71C1C; margin-top:5px;">${g.bezeichnung}</h3>
        <hr style="margin:10px 0;">
        <p><strong>Inventarnummer:</strong> ${g.inventarnummer}</p>
        <p><strong>Kategorie:</strong> ${g.kategorie}</p>
        <p><strong>Hersteller:</strong> ${g.hersteller || "-"}</p>
        <p><strong>Standort:</strong> ${g.standort || "-"}</p>
        <p><strong>Erstinbetriebnahme:</strong> ${inbetriebnahmeFormatted}</p>
        <p><strong>Status:</strong> ${g.status}</p>
        <p><strong>Nächste Prüfung:</strong> <span style="color:#B71C1C; font-weight:bold;">${naechstePruefFormatted}</span></p>
        
        <hr style="margin:15px 0;">
        <h4>📜 Prüfhistorie</h4>
        <ul style="list-style:none; padding-left:0; margin:10px 0; max-height: 180px; overflow-y: auto;">
            ${historieHtml}
        </ul>

        <div style="background:#f5f5f5; padding:10px; border-radius:6px; margin-top:10px;">
            <strong style="font-size:0.9rem;">+ Neue Prüfung eintragen</strong>
            <input type="date" id="neuesPruefDatum" value="${new Date().toISOString().split('T')[0]}" style="width:100%; margin:4px 0; padding:4px;">
            <input type="text" id="prueferName" placeholder="Prüfer Name" style="width:100%; margin:4px 0; padding:4px;">
            <button class="btn btn-primary" style="width:100%; margin-top:6px;" onclick="fuegePruefungHinzu('${g.id}')">Prüfung protokollieren</button>
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

document.addEventListener("DOMContentLoaded", () => {
    ladeGeraete();
    filterGeraete();
});
// ==========================================
// Schnittstellen für Navigation & Dashboard
// ==========================================

// Alias-Funktion für den Aufruf aus app.js (zeigeSeite)
function renderGeraeteView() {
    filterGeraete();
}

// Ermöglicht das Filtern der Geräte direkt beim Klick auf Dashboard-Kacheln
function filtereGeraeteNachDashboard(filterTyp) {
    if (typeof zeigeSeite === 'function') {
        zeigeSeite('geraete');
    }
    
    const elStat = document.getElementById("filterStatus");
    if (elStat) {
        if (filterTyp === 'faellig' || filterTyp === 'wartung') {
            elStat.value = 'Wartung';
        } else if (filterTyp === 'defekt') {
            elStat.value = 'Defekt';
        } else {
            elStat.value = '';
        }
    }
    
    filterGeraete();
}
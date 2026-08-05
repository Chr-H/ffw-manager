// ==========================================
// FFW Manager - Geräteverwaltung (v0.5.1)
// ==========================================

let geraete = ladeDaten("geraete") || [];
let bearbeitungsId = null;

// ==========================================
// 1. Laden & Speichern
// ==========================================
function ladeGeraete() {
    geraete = ladeDaten("geraete") || [];
    return geraete;
}

function speichereGeraete() {
    speichereDaten('geraete', geraete);
    document.dispatchEvent(new Event("geraeteGeaendert"));
}

// Wird automatisch von Firebase aufgerufen, sobald neue Cloud-Daten eintreffen
function zeigeGeraete() {
    function zeigeGeraete() {
    geraete = ladeDaten("geraete") || [];
    filterGeraete(); // <-- Rendert die HTML-Tabelle neu
}

// ==========================================
// 2. Hilfsfunktion: Nächste Prüfung berechnen
// ==========================================
function berechneNaechstePruefung(datumStr, intervallMonate) {
    if (!datumStr || !intervallMonate || intervallMonate <= 0) return null;
    const d = new Date(datumStr);
    if (isNaN(d.getTime())) return null;
    
    d.setMonth(d.getMonth() + parseInt(intervallMonate));
    return d.toISOString().split('T')[0]; // Format: YYYY-MM-DD
}

// ==========================================
// 3. Neues Gerät speichern / bearbeiten
// ==========================================
function neuesGeraet() {
    const inventar = document.getElementById("inventar")?.value.trim() || "";
    const bezeichnung = document.getElementById("bezeichnung")?.value.trim() || "";
    const kategorie = document.getElementById("kategorie")?.value || "";
    const hersteller = document.getElementById("hersteller")?.value.trim() || "";
    const status = document.getElementById("status")?.value || "Einsatzbereit";
    const standort = document.getElementById("standort")?.value.trim() || "";
    const letztePruefung = document.getElementById("letztePruefung")?.value || "";
    const pruefintervall = document.getElementById("pruefintervall")?.value || "12";

    if (!inventar || !bezeichnung || !kategorie) {
        alert("Bitte mindestens Inventarnummer, Bezeichnung und Kategorie ausfüllen.");
        return;
    }

    // Aktuellste Daten aus dem Speicher laden
    geraete = ladeDaten("geraete") || [];

    // Duplikatsprüfung
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
        // Bearbeiten
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
                letztePruefung: letztePruefung,
                pruefintervall: parseInt(pruefintervall),
                naechstePruefung: naechstePruefung
            };
        }
    } else {
        // Neues Gerät anlegen
        const neuesG = {
            id: "GER-" + Date.now(),
            inventarnummer: inventar,
            bezeichnung: bezeichnung,
            kategorie: kategorie,
            hersteller: hersteller,
            status: status,
            standort: standort,
            letztePruefung: letztePruefung,
            pruefintervall: parseInt(pruefintervall),
            naechstePruefung: naechstePruefung,
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
    const felder = ["inventar", "bezeichnung", "hersteller", "kategorie", "standort", "letztePruefung"];
    felder.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = "";
    });
    
    if (document.getElementById("status")) document.getElementById("status").value = "Einsatzbereit";
    if (document.getElementById("pruefintervall")) document.getElementById("pruefintervall").value = "12";

    const btn = document.querySelector(".geraete-form button") || document.querySelector("button[onclick='neuesGeraet()']");
    if (btn) btn.innerHTML = "➕ Gerät speichern";
}

// ==========================================
// 4. Anzeige & Filter
// ==========================================
function filterGeraete() {
    geraete = ladeDaten("geraete") || [];

    const suchbegriff = (document.getElementById("sucheGeraet")?.value || "").toLowerCase();
    const kategorie = document.getElementById("filterKategorie")?.value || "";
    const status = document.getElementById("filterStatus")?.value || "";

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

        ausgabe.innerHTML += `
        <tr>
            <td><strong>${g.inventarnummer || '-'}</strong></td>
            <td>${g.bezeichnung || '-'}</td>
            <td>${g.kategorie || '-'}</td>
            <td>${g.hersteller || "-"}</td>
            <td class="${statusClass}">${g.status || 'Einsatzbereit'}</td>
            <td>
                <button class="btn btn-details" title="Details" onclick="zeigeGeraeteDetails('${g.id}')">👁️</button>
                <button class="btn btn-bearbeiten" title="Bearbeiten" onclick="bearbeiteGeraet('${g.id}')">✏️</button>
                <button class="btn btn-loeschen" title="Löschen" onclick="loescheGeraet('${g.id}')">🗑️</button>
            </td>
        </tr>`;
    });
}

// ==========================================
// 5. Details & Bearbeiten
// ==========================================
function zeigeGeraeteDetails(id) {
    const g = geraete.find(item => item.id === id);
    const detailsContainer = document.getElementById("geraeteDetails");

    if (!g || !detailsContainer) return;

    const naechstePruefFormatted = g.naechstePruefung 
        ? new Date(g.naechstePruefung).toLocaleDateString("de-DE") 
        : "Keine Angabe";

    const letztePruefFormatted = g.letztePruefung 
        ? new Date(g.letztePruefung).toLocaleDateString("de-DE") 
        : "Keine Angabe";

    detailsContainer.innerHTML = `
        <h2>📋 Geräteakte</h2>
        <h3 style="color:#B71C1C; margin-top:5px;">${g.bezeichnung}</h3>
        <hr style="margin:10px 0;">
        <p><strong>Inventarnummer:</strong> ${g.inventarnummer}</p>
        <p><strong>Kategorie:</strong> ${g.kategorie}</p>
        <p><strong>Hersteller:</strong> ${g.hersteller || "-"}</p>
        <p><strong>Standort:</strong> ${g.standort || "-"}</p>
        <p><strong>Status:</strong> ${g.status}</p>
        <p><strong>Letzte Prüfung:</strong> ${letztePruefFormatted}</p>
        <p><strong>Nächste Prüfung:</strong> <span style="color:#B71C1C; font-weight:bold;">${naechstePruefFormatted}</span></p>
        <p><strong>Erstellt am:</strong> ${g.erstellt || "-"}</p>
    `;
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

    const detailsContainer = document.getElementById("geraeteDetails") || document.getElementById("geraeteDetailsInhalt");
    if (detailsContainer) {
        detailsContainer.innerHTML = `<p>Bitte links ein Gerät auswählen.</p>`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    ladeGeraete();
    filterGeraete();
});
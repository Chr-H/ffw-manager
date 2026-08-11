// ==========================================
// 1. PSA IMPORT & EXPORT
// ==========================================

function importPSACSV(inputElement) {
    try {
        const file = inputElement.files[0];
        if (!file) return;

        // Bestand laden
        if (typeof ladeDaten === "function") {
            window.psaDaten = ladeDaten("psa") || ladeDaten("ffw_psa") || window.psaDaten;
        }

        if (!window.psaDaten || !Array.isArray(window.psaDaten)) {
            const gespeichert = localStorage.getItem("psa") || localStorage.getItem("ffw_psa");
            window.psaDaten = gespeichert ? JSON.parse(gespeichert) : [];
        }

        const reader = new FileReader();
        reader.onerror = function() { alert("Fehler beim Lesen der Datei."); };

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
                const rawHeaders = zeilen[0].split(trenner).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

                // Hilfsfunktion: Spaltenindex anhand von Schlüsselwörtern finden (Tolerant für Umlaut-Fehler)
                const findIndex = (...keywords) => {
                    return rawHeaders.findIndex(h => {
                        const cleanH = h.replace(/[^a-z0-9]/g, '');
                        return keywords.some(kw => cleanH.includes(kw.toLowerCase().replace(/[^a-z0-9]/g, '')));
                    });
                };

                const idxSpind = findIndex("spind");
                const idxTraeger = findIndex("traeger", "träger", "person", "name");
                const idxAusruestung = findIndex("ausruestung", "ausrüstung", "bezeichnung", "bekleidung", "teil");
                const idxGroesse = findIndex("groesse", "größe");
                const idxSeriennummer = findIndex("seriennummer", "sn");
                const idxAusgabe = findIndex("ausgabedatum", "ausgabe");
                const idxPruefung = findIndex("naechstepruefung", "prüfung");
                const idxStatus = findIndex("status");

                let aktualisiert = 0;
                let neuHinzugefuegt = 0;
                const bereitsGematcht = new Set();

                for (let i = 1; i < zeilen.length; i++) {
                    const werte = zeilen[i]
                        .split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                        .map(w => w.replace(/^"|"$/g, '').trim());

                    if (werte.length === 0 || werte.every(v => v === "")) continue;

                    // Werte flexibel ermitteln (mit Fallback auf Standard-Indices)
                    const spind = idxSpind !== -1 ? werte[idxSpind] : (idxSpind === -1 && rawHeaders.length >= 8 ? werte[0] : "");
                    const traeger = idxTraeger !== -1 ? werte[idxTraeger] : werte[idxSpind !== -1 ? 1 : 0] || "";
                    const bezeichnung = idxAusruestung !== -1 ? werte[idxAusruestung] : werte[idxSpind !== -1 ? 2 : 1] || "";
                    const groesse = idxGroesse !== -1 ? werte[idxGroesse] : werte[idxSpind !== -1 ? 3 : 2] || "";
                    const seriennummer = idxSeriennummer !== -1 ? werte[idxSeriennummer] : werte[idxSpind !== -1 ? 4 : 3] || "";
                    const ausgabeDatum = idxAusgabe !== -1 ? werte[idxAusgabe] : werte[idxSpind !== -1 ? 5 : 4] || "";
                    const naechstePruefung = idxPruefung !== -1 ? werte[idxPruefung] : werte[idxSpind !== -1 ? 6 : 5] || "";
                    const status = idxStatus !== -1 ? werte[idxStatus] : werte[idxSpind !== -1 ? 7 : 6] || "Einsatzbereit";

                    if (!traeger && !bezeichnung && !seriennummer) continue;

                    let index = -1;

                    // Match 1: Über Seriennummer
                    if (seriennummer) {
                        index = window.psaDaten.findIndex((p, idx) => {
                            if (!p || bereitsGematcht.has(idx)) return false;
                            const pSn = String(p.seriennummer || p.sn || "").trim().toLowerCase();
                            return pSn && pSn === seriennummer.toLowerCase();
                        });
                    }

                    // Match 2: Über Träger + Bezeichnung
                    if (index === -1 && traeger && bezeichnung) {
                        index = window.psaDaten.findIndex((p, idx) => {
                            if (!p || bereitsGematcht.has(idx)) return false;
                            const pTraeger = String(p.traeger || p.name || "").trim().toLowerCase();
                            const pBekl = String(p.bezeichnung || p.bekleidung || p.ausruestung || "").trim().toLowerCase();
                            return pTraeger === traeger.toLowerCase() && pBekl === bezeichnung.toLowerCase();
                        });
                    }

                    const bestehend = (index !== -1 && window.psaDaten[index]) ? window.psaDaten[index] : null;

                    // WICHTIG: Alle Varianten abspeichern, damit psa.js v2.1.4 alles findet!
                    const sauberePSA = {
                        id: String((bestehend && bestehend.id) ? bestehend.id : `PSA-${Date.now()}_${i}`),
                        spind: String(spind || (bestehend && bestehend.spind ? bestehend.spind : "")),
                        traeger: String(traeger || (bestehend && bestehend.traeger ? bestehend.traeger : "")),
                        name: String(traeger || (bestehend && bestehend.name ? bestehend.name : "")),
                        bezeichnung: String(bezeichnung || (bestehend && bestehend.bezeichnung ? bestehend.bezeichnung : "")),
                        ausruestung: String(bezeichnung || (bestehend && bestehend.ausruestung ? bestehend.ausruestung : "")),
                        bekleidung: String(bezeichnung || (bestehend && bestehend.bekleidung ? bestehend.bekleidung : "")),
                        groesse: String(groesse || (bestehend && bestehend.groesse ? bestehend.groesse : "")),
                        seriennummer: String(seriennummer || (bestehend && bestehend.seriennummer ? bestehend.seriennummer : "")),
                        ausgabeDatum: String(ausgabeDatum || (bestehend && bestehend.ausgabeDatum ? bestehend.ausgabeDatum : "")),
                        ausgabedatum: String(ausgabeDatum || (bestehend && bestehend.ausgabedatum ? bestehend.ausgabedatum : "")),
                        naechstePruefung: String(naechstePruefung || (bestehend && bestehend.naechstePruefung ? bestehend.naechstePruefung : "")),
                        status: String(status || "Einsatzbereit"),
                        historie: bestehend && Array.isArray(bestehend.historie) ? bestehend.historie : []
                    };

                    if (index !== -1) {
                        bereitsGematcht.add(index);
                        window.psaDaten[index] = { ...window.psaDaten[index], ...sauberePSA };
                        aktualisiert++;
                    } else {
                        window.psaDaten.push(sauberePSA);
                        bereitsGematcht.add(window.psaDaten.length - 1);
                        neuHinzugefuegt++;
                    }
                }

                // Daten abspeichern
                if (typeof speicherePSA === "function") speicherePSA(window.psaDaten);
                else if (typeof speichereDaten === "function") speichereDaten("psa", window.psaDaten);

                localStorage.setItem("psa", JSON.stringify(window.psaDaten));
                localStorage.setItem("ffw_psa", JSON.stringify(window.psaDaten));

                if (typeof renderPSAView === "function") renderPSAView();
                else if (typeof filterPSA === "function") filterPSA();

                alert(`PSA-Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Einträge hinzugefügt\n- ${aktualisiert} bestehende Einträge aktualisiert`);
                inputElement.value = "";
            } catch (err) {
                alert("Fehler beim PSA-Import:\n" + err.message);
            }
        };

        reader.readAsText(file, "UTF-8");
    } catch (err) {
        alert("Fehler beim Starten des PSA-Imports:\n" + err.message);
    }
}
window.exportPSACSV = function() {
    let psaDaten = window.psaDaten || [];
    if (typeof ladeDaten === "function") {
        psaDaten = ladeDaten("psa") || ladeDaten("ffw_psa") || psaDaten;
    }
    if (!psaDaten || !psaDaten.length) {
        const gespeicherte = localStorage.getItem("psa") || localStorage.getItem("ffw_psa");
        if (gespeicherte) try { psaDaten = JSON.parse(gespeicherte); } catch(e){}
    }

    if (!psaDaten || !psaDaten.length) {
        alert("Keine PSA-Daten zum Exportieren vorhanden.");
        return;
    }

    // Exakte Kopfzeile für sauberen Excel-Import
    const headers = ["Spind", "Träger", "Ausrüstung", "Größe", "Seriennummer", "Ausgabedatum", "Nächste Prüfung", "Status"];
    let csvContent = "\uFEFF" + headers.join(";") + "\n";

    psaDaten.forEach(item => {
        if (!item) return;

        // Abfangen aller möglichen Varianten (psa.js v2.1.4 Kompatibilität)
        const spind = String(item.spind || "").replace(/"/g, '""');
        const traeger = String(item.traeger || item.name || "").replace(/"/g, '""');
        const ausruestung = String(item.bezeichnung || item.ausruestung || item.bekleidung || "").replace(/"/g, '""');
        const groesse = String(item.groesse || "").replace(/"/g, '""');
        const seriennummer = String(item.seriennummer || item.sn || "").replace(/"/g, '""');
        const ausgabedatum = String(item.ausgabeDatum || item.ausgabedatum || item.datum || "").replace(/"/g, '""');
        const naechstePruefung = String(item.naechstePruefung || item.pruefung || "").replace(/"/g, '""');
        const status = String(item.status || "Einsatzbereit").replace(/"/g, '""');

        const zeile = [
            `"${spind}"`,
            `"${traeger}"`,
            `"${ausruestung}"`,
            `"${groesse}"`,
            `"${seriennummer}"`,
            `"${ausgabedatum}"`,
            `"${naechstePruefung}"`,
            `"${status}"`
        ].join(";");

        csvContent += zeile + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `PSA_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ==========================================
// 2. GERÄTE IMPORT
// ==========================================

function importGeraeteCSV(inputElement) {
    try {
        const file = inputElement.files[0];
        if (!file) return;

        if (typeof ladeDaten === "function") {
            window.geraeteDaten = ladeDaten("geraete") || ladeDaten("ffw_geraete") || window.geraeteDaten;
        }

        if (!window.geraeteDaten || !Array.isArray(window.geraeteDaten)) {
            const gespeichert = localStorage.getItem("geraete") || localStorage.getItem("ffw_geraete");
            window.geraeteDaten = gespeichert ? JSON.parse(gespeicherte) : [];
        }

        const reader = new FileReader();
        reader.onerror = function() { alert("Fehler beim Lesen der Datei."); };

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
                const rawHeaders = zeilen[0].split(trenner).map(h => 
                    h.replace(/^"|"$/g, '').trim().toLowerCase().replace(/,,/g, 'ä').replace(/á/g, 'ß')
                );

                let aktualisiert = 0;
                let neuHinzugefuegt = 0;
                const bereitsGematcht = new Set();

                for (let i = 1; i < zeilen.length; i++) {
                    const werte = zeilen[i]
                        .split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                        .map(w => w.replace(/^"|"$/g, '').trim().replace(/,,/g, 'ä').replace(/á/g, 'ß'));

                    if (werte.length === 0 || werte.every(v => v === "")) continue;

                    let gObj = {};
                    rawHeaders.forEach((header, idx) => { gObj[header] = werte[idx] || ""; });

                    const csvId = (werte[0] && String(werte[0]).startsWith("GER-") ? werte[0] : (gObj["id"] || werte[0] || "")).trim();
                    const bezeichnung = (werte[1] || gObj["bezeichnung"] || gObj["name"] || "").trim();
                    const kategorie = (werte[2] || gObj["kategorie / ty"] || gObj["kategorie"] || "").trim();
                    const standort = (werte[3] || gObj["fahrzeug / sta"] || gObj["fahrzeug"] || gObj["standort"] || "").trim();
                    const status = (werte[4] || gObj["status"] || "Einsatzbereit").trim();
                    const pruefung = (werte[5] || gObj["nächste prüfung"] || gObj["n,,chste prfun"] || "").trim();
                    const invNummer = (werte[6] || gObj["seriennumme"] || gObj["seriennummer"] || gObj["inv.-nr."] || gObj["inventar"] || "").trim();
                    const bemerkung = (werte[7] || gObj["bemerkung"] || "").trim();

                    if (!bezeichnung && !invNummer && !csvId) continue;

                    let index = -1;

                    if (invNummer) {
                        index = window.geraeteDaten.findIndex((g, idx) => {
                            if (!g || bereitsGematcht.has(idx)) return false;
                            const gInv = String(g.inventar || g.inventarnummer || g.seriennummer || "").trim().toLowerCase();
                            if (gInv && gInv === invNummer.toLowerCase()) return true;
                            const n1 = parseInt(invNummer, 10);
                            const n2 = parseInt(gInv, 10);
                            return !isNaN(n1) && !isNaN(n2) && n1 === n2;
                        });
                    }

                    if (index === -1 && csvId) {
                        index = window.geraeteDaten.findIndex((g, idx) => {
                            if (!g || bereitsGematcht.has(idx)) return false;
                            return String(g.id || "").trim().toLowerCase() === csvId.toLowerCase();
                        });
                    }

                    if (index === -1 && bezeichnung && invNummer) {
                        index = window.geraeteDaten.findIndex((g, idx) => {
                            if (!g || bereitsGematcht.has(idx)) return false;
                            const gBezeich = String(g.bezeichnung || "").trim().toLowerCase();
                            const gStandort = String(g.standort || g.fahrzeug || "").trim().toLowerCase();
                            return gBezeich === bezeichnung.toLowerCase() && gStandort === standort.toLowerCase();
                        });
                    }

                    const bestehend = (index !== -1 && window.geraeteDaten[index]) ? window.geraeteDaten[index] : null;

                    const finaleId = csvId || (bestehend && bestehend.id ? bestehend.id : `GER-${Date.now()}_${i}_${Math.floor(Math.random()*1000)}`);
                    const finaleInv = invNummer || (bestehend && (bestehend.inventar || bestehend.seriennummer) ? (bestehend.inventar || bestehend.seriennummer) : "");

                    const sauberesGeraet = {
                        id: String(finaleId || ""),
                        inventar: String(finaleInv || ""),
                        inventarnummer: String(finaleInv || ""),
                        seriennummer: String(finaleInv || ""),
                        bezeichnung: String(bezeichnung || (bestehend && bestehend.bezeichnung ? bestehend.bezeichnung : "Unbekannt")),
                        kategorie: String(kategorie || (bestehend && bestehend.kategorie ? bestehend.kategorie : "")),
                        hersteller: String(bestehend && bestehend.hersteller ? bestehend.hersteller : ""),
                        standort: String(standort || (bestehend && bestehend.standort ? bestehend.standort : "")),
                        status: String(status || "Einsatzbereit"),
                        naechstePruefung: String(pruefung || (bestehend && bestehend.naechstePruefung ? bestehend.naechstePruefung : "")),
                        bemerkung: String(bemerkung || (bestehend && bestehend.bemerkung ? bestehend.bemerkung : ""))
                    };

                    if (index !== -1) {
                        bereitsGematcht.add(index);
                        window.geraeteDaten[index] = { ...window.geraeteDaten[index], ...sauberesGeraet };
                        aktualisiert++;
                    } else {
                        window.geraeteDaten.push(sauberesGeraet);
                        bereitsGematcht.add(window.geraeteDaten.length - 1);
                        neuHinzugefuegt++;
                    }
                }

                window.geraeteDaten = window.geraeteDaten.map(g => {
                    const sanitized = {};
                    Object.keys(g || {}).forEach(key => { sanitized[key] = g[key] === undefined ? "" : g[key]; });
                    return sanitized;
                });

                if (typeof speichereGeraete === "function") speichereGeraete();
                if (typeof speichereDaten === "function") speichereDaten("geraete", window.geraeteDaten);

                localStorage.setItem("geraete", JSON.stringify(window.geraeteDaten));
                localStorage.setItem("ffw_geraete", JSON.stringify(window.geraeteDaten));

                if (typeof filterGeraete === "function") filterGeraete();
                else if (typeof renderGeraeteListe === "function") renderGeraeteListe();

                alert(`Geräte-Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Geräte hinzugefügt\n- ${aktualisiert} bestehende Geräte aktualisiert`);
                inputElement.value = "";
            } catch (err) {
                alert("Fehler bei Geräte-CSV:\n" + err.message);
            }
        };

        reader.readAsText(file, "UTF-8");
    } catch (err) {
        alert("Fehler beim Geräte-Import:\n" + err.message);
    }
}
// ==========================================
// LAGERLISTE - EXPORT & IMPORT LOGIK
// ==========================================

// 1. Export-Funktion
// ==========================================
// LAGERLISTE - EXPORT & IMPORT (Inkl. Größe)
// ==========================================

// 1. Export-Funktion
function exportLagerCSV() {
    let daten = typeof ladeDaten === "function" ? ladeDaten("lager") : null;
    
    if (!daten || !daten.length) {
        const gespeicherte = localStorage.getItem("lager") || localStorage.getItem("ffw_lager");
        if (gespeicherte) try { daten = JSON.parse(gespeicherte); } catch(e){}
    }

    if (!daten || daten.length === 0) {
        alert("Keine Lager-Daten zum Exportieren vorhanden!");
        return;
    }

    const headers = ["Kategorie", "Bezeichnung", "Größe", "Bestand", "Soll-Bestand", "Einheit", "Lagerort", "Status"];

    const rows = daten.map(item => [
        item.kategorie || "",
        item.bezeichnung || item.name || item.artikel || "",
        item.groesse || item.größe || "",
        item.bestand !== undefined ? item.bestand : (item.menge || 0),
        item.sollbestand !== undefined ? item.sollbestand : (item.soll || 0),
        item.einheit || "Stk",
        item.lagerort || item.ort || "",
        item.status || "In Ordnung"
    ]);

    if (typeof downloadCSV === "function") {
        downloadCSV(`Lager_Export_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    } else {
        let csvContent = "\uFEFF" + headers.join(";") + "\n";
        rows.forEach(r => {
            csvContent += r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";") + "\n";
        });
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Lager_Export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }
}

// 2. Import-Funktion
function importLagerCSV(inputElement) {
    try {
        const file = inputElement.files[0];
        if (!file) return;

        let lagerDaten = (typeof ladeDaten === "function" ? ladeDaten("lager") : null) || [];
        if (!lagerDaten.length) {
            const gespeicherte = localStorage.getItem("lager") || localStorage.getItem("ffw_lager");
            if (gespeicherte) try { lagerDaten = JSON.parse(gespeicherte); } catch(e){}
        }

        const reader = new FileReader();
        reader.onerror = function() { alert("Fehler beim Lesen der Datei."); };

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
                const rawHeaders = zeilen[0].split(trenner).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

                // Tolerante Spaltenindex-Suche
                const findIndex = (...keywords) => {
                    return rawHeaders.findIndex(h => {
                        const cleanH = h.replace(/[^a-z0-9]/g, '');
                        return keywords.some(kw => cleanH.includes(kw.toLowerCase().replace(/[^a-z0-9]/g, '')));
                    });
                };

                const idxKat = findIndex("kategorie", "kat");
                const idxBez = findIndex("bezeichnung", "name", "artikel", "gegenstand");
                const idxGroesse = findIndex("groesse", "größe", "gr");
                const idxBestand = findIndex("bestand", "menge", "ist");
                const idxSoll = findIndex("soll", "mindest");
                const idxEinheit = findIndex("einheit");
                const idxOrt = findIndex("lagerort", "ort", "fach");
                const idxStatus = findIndex("status");

                let aktualisiert = 0;
                let neuHinzugefuegt = 0;

                for (let i = 1; i < zeilen.length; i++) {
                    const werte = zeilen[i]
                        .split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                        .map(w => w.replace(/^"|"$/g, '').trim());

                    if (werte.length === 0 || werte.every(v => v === "")) continue;

                    const kategorie = idxKat !== -1 ? werte[idxKat] : werte[0] || "";
                    const bezeichnung = idxBez !== -1 ? werte[idxBez] : werte[1] || "";
                    const groesse = idxGroesse !== -1 ? werte[idxGroesse] : (rawHeaders.length >= 8 ? werte[2] : "");
                    
                    // Bei 8 Spalten rutschen die folgenden Werte um 1 nach rechts:
                    const offset = rawHeaders.length >= 8 ? 1 : 0;
                    const bestand = idxBestand !== -1 ? werte[idxBestand] : werte[2 + offset] || "0";
                    const sollbestand = idxSoll !== -1 ? werte[idxSoll] : werte[3 + offset] || "0";
                    const einheit = idxEinheit !== -1 ? werte[idxEinheit] : werte[4 + offset] || "Stk";
                    const lagerort = idxOrt !== -1 ? werte[idxOrt] : werte[5 + offset] || "";
                    const status = idxStatus !== -1 ? werte[idxStatus] : werte[6 + offset] || "In Ordnung";

                    if (!bezeichnung) continue;

                    // Match über BEZEICHNUNG UND GRÖSSE (verhindert das Überschreiben gleichnamiger Artikel)
                    const index = lagerDaten.findIndex(item => {
                        if (!item) return false;
                        const itemBez = String(item.bezeichnung || item.name || "").trim().toLowerCase();
                        const itemGr = String(item.groesse || item.größe || "").trim().toLowerCase();
                        return itemBez === bezeichnung.toLowerCase() && itemGr === groesse.toLowerCase();
                    });

                    const neuesItem = {
                        id: index !== -1 ? lagerDaten[index].id : `LAGER-${Date.now()}_${i}`,
                        kategorie: kategorie || (index !== -1 ? lagerDaten[index].kategorie : "Ausrüstung"),
                        bezeichnung: bezeichnung,
                        name: bezeichnung,
                        groesse: groesse,
                        größe: groesse,
                        bestand: isNaN(parseInt(bestand)) ? 0 : parseInt(bestand),
                        sollbestand: isNaN(parseInt(sollbestand)) ? 0 : parseInt(sollbestand),
                        einheit: einheit || "Stk",
                        lagerort: lagerort || (index !== -1 ? lagerDaten[index].lagerort : ""),
                        status: status || "In Ordnung"
                    };

                    if (index !== -1) {
                        lagerDaten[index] = { ...lagerDaten[index], ...neuesItem };
                        aktualisiert++;
                    } else {
                        lagerDaten.push(neuesItem);
                        neuHinzugefuegt++;
                    }
                }

                // Speichern & View aktualisieren
                if (typeof speichereDaten === "function") speichereDaten("lager", lagerDaten);
                if (typeof speichereLager === "function") speichereLager(lagerDaten);

                localStorage.setItem("lager", JSON.stringify(lagerDaten));
                localStorage.setItem("ffw_lager", JSON.stringify(lagerDaten));

                if (typeof renderLagerView === "function") renderLagerView();
                else if (typeof renderLager === "function") renderLager();

                alert(`Lager-Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Artikel hinzugefügt\n- ${aktualisiert} bestehende Artikel aktualisiert`);
                inputElement.value = "";
            } catch (err) {
                alert("Fehler beim Lager-Import:\n" + err.message);
            }
        };

        reader.readAsText(file, "UTF-8");
    } catch (err) {
        alert("Fehler beim Starten des Lager-Imports:\n" + err.message);
    }
}

window.exportLagerCSV = exportLagerCSV;
window.importLagerCSV = importLagerCSV;

// 2. Import-Funktion
function importLagerCSV(inputElement) {
    try {
        const file = inputElement.files[0];
        if (!file) return;

        let lagerDaten = (typeof ladeDaten === "function" ? ladeDaten("lager") : null) || [];
        if (!lagerDaten.length) {
            const gespeicherte = localStorage.getItem("lager") || localStorage.getItem("ffw_lager");
            if (gespeicherte) try { lagerDaten = JSON.parse(gespeicherte); } catch(e){}
        }

        const reader = new FileReader();
        reader.onerror = function() { alert("Fehler beim Lesen der Datei."); };

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
                const rawHeaders = zeilen[0].split(trenner).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

                // Tolerante Spaltenindex-Suche
                const findIndex = (...keywords) => {
                    return rawHeaders.findIndex(h => {
                        const cleanH = h.replace(/[^a-z0-9]/g, '');
                        return keywords.some(kw => cleanH.includes(kw.toLowerCase().replace(/[^a-z0-9]/g, '')));
                    });
                };

                const idxKat = findIndex("kategorie", "kat");
                const idxBez = findIndex("bezeichnung", "name", "artikel", "gegenstand");
                const idxBestand = findIndex("bestand", "menge", "ist");
                const idxSoll = findIndex("soll", "mindest");
                const idxEinheit = findIndex("einheit");
                const idxOrt = findIndex("lagerort", "ort", "fach");
                const idxStatus = findIndex("status");

                let aktualisiert = 0;
                let neuHinzugefuegt = 0;

                for (let i = 1; i < zeilen.length; i++) {
                    const werte = zeilen[i]
                        .split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                        .map(w => w.replace(/^"|"$/g, '').trim());

                    if (werte.length === 0 || werte.every(v => v === "")) continue;

                    const kategorie = idxKat !== -1 ? werte[idxKat] : werte[0] || "";
                    const bezeichnung = idxBez !== -1 ? werte[idxBez] : werte[1] || "";
                    const bestand = idxBestand !== -1 ? werte[idxBestand] : werte[2] || "0";
                    const sollbestand = idxSoll !== -1 ? werte[idxSoll] : werte[3] || "0";
                    const einheit = idxEinheit !== -1 ? werte[idxEinheit] : werte[4] || "Stk";
                    const lagerort = idxOrt !== -1 ? werte[idxOrt] : werte[5] || "";
                    const status = idxStatus !== -1 ? werte[idxStatus] : werte[6] || "In Ordnung";

                    if (!bezeichnung) continue;

                    // Abgleich mit bestehendem Artikel
                    const index = lagerDaten.findIndex(item => 
                        item && (item.bezeichnung || item.name || "").trim().toLowerCase() === bezeichnung.toLowerCase()
                    );

                    const neuesItem = {
                        id: index !== -1 ? lagerDaten[index].id : `LAGER-${Date.now()}_${i}`,
                        kategorie: kategorie || (index !== -1 ? lagerDaten[index].kategorie : "Ausrüstung"),
                        bezeichnung: bezeichnung,
                        name: bezeichnung,
                        bestand: isNaN(parseInt(bestand)) ? 0 : parseInt(bestand),
                        sollbestand: isNaN(parseInt(sollbestand)) ? 0 : parseInt(sollbestand),
                        einheit: einheit || "Stk",
                        lagerort: lagerort || (index !== -1 ? lagerDaten[index].lagerort : ""),
                        status: status || "In Ordnung"
                    };

                    if (index !== -1) {
                        lagerDaten[index] = { ...lagerDaten[index], ...neuesItem };
                        aktualisiert++;
                    } else {
                        lagerDaten.push(neuesItem);
                        neuHinzugefuegt++;
                    }
                }

                // Speichern & View aktualisieren
                if (typeof speichereDaten === "function") speichereDaten("lager", lagerDaten);
                if (typeof speichereLager === "function") speichereLager(lagerDaten);

                localStorage.setItem("lager", JSON.stringify(lagerDaten));
                localStorage.setItem("ffw_lager", JSON.stringify(lagerDaten));

                if (typeof renderLagerView === "function") renderLagerView();
                else if (typeof renderLager === "function") renderLager();

                alert(`Lager-Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Artikel hinzugefügt\n- ${aktualisiert} bestehende Artikel aktualisiert`);
                inputElement.value = "";
            } catch (err) {
                alert("Fehler beim Lager-Import:\n" + err.message);
            }
        };

        reader.readAsText(file, "UTF-8");
    } catch (err) {
        alert("Fehler beim Starten des Lager-Imports:\n" + err.message);
    }
}

// Global verfügbar machen
window.exportLagerCSV = exportLagerCSV;
window.importLagerCSV = importLagerCSV;
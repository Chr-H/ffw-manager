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
                const headers = zeilen[0].split(trenner).map(h => 
                    h.replace(/^"|"$/g, '').trim().toLowerCase()
                );

                // Erkennen, ob Spind in der Datei existiert
                const hatSpindSpalte = headers.some(h => h.includes("spind"));

                let aktualisiert = 0;
                let neuHinzugefuegt = 0;
                const bereitsGematcht = new Set();

                for (let i = 1; i < zeilen.length; i++) {
                    const werte = zeilen[i]
                        .split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                        .map(w => w.replace(/^"|"$/g, '').trim());

                    if (werte.length === 0 || werte.every(v => v === "")) continue;

                    let spind = "", traeger = "", bekleidung = "", groesse = "", seriennummer = "", ausgabedatum = "", pruefung = "", status = "";

                    if (hatSpindSpalte) {
                        spind = werte[0] || "";
                        traeger = werte[1] || "";
                        bekleidung = werte[2] || "";
                        groesse = werte[3] || "";
                        seriennummer = werte[4] || "";
                        ausgabedatum = werte[5] || "";
                        pruefung = werte[6] || "";
                        status = werte[7] || "Einsatzbereit";
                    } else {
                        // Altes Format ohne Spind-Spalte
                        traeger = werte[0] || "";
                        bekleidung = werte[1] || "";
                        groesse = werte[2] || "";
                        seriennummer = werte[3] || "";
                        ausgabedatum = werte[4] || "";
                        pruefung = werte[5] || "";
                        status = werte[6] || "Einsatzbereit";
                    }

                    if (!traeger && !bekleidung && !seriennummer) continue;

                    let index = -1;

                    // Match 1: Über Seriennummer
                    if (seriennummer) {
                        index = window.psaDaten.findIndex((p, idx) => {
                            if (!p || bereitsGematcht.has(idx)) return false;
                            const pSn = String(p.seriennummer || p.sn || "").trim().toLowerCase();
                            return pSn && pSn === seriennummer.toLowerCase();
                        });
                    }

                    // Match 2: Über Träger + Bekleidung
                    if (index === -1 && traeger && bekleidung) {
                        index = window.psaDaten.findIndex((p, idx) => {
                            if (!p || bereitsGematcht.has(idx)) return false;
                            const pTraeger = String(p.traeger || p.name || "").trim().toLowerCase();
                            const pBekl = String(p.bekleidung || p.ausruestung || "").trim().toLowerCase();
                            return pTraeger === traeger.toLowerCase() && pBekl === bekleidung.toLowerCase();
                        });
                    }

                    const bestehend = (index !== -1 && window.psaDaten[index]) ? window.psaDaten[index] : null;

                    const sauberePSA = {
                        id: String((bestehend && bestehend.id) ? bestehend.id : `PSA-${Date.now()}_${i}`),
                        spind: String(spind || (bestehend && bestehend.spind ? bestehend.spind : "")),
                        traeger: String(traeger || (bestehend && bestehend.traeger ? bestehend.traeger : "")),
                        name: String(traeger || (bestehend && bestehend.name ? bestehend.name : "")),
                        bekleidung: String(bekleidung || (bestehend && bestehend.bekleidung ? bestehend.bekleidung : "")),
                        ausruestung: String(bekleidung || (bestehend && bestehend.ausruestung ? bestehend.ausruestung : "")),
                        groesse: String(groesse || (bestehend && bestehend.groesse ? bestehend.groesse : "")),
                        seriennummer: String(seriennummer || (bestehend && bestehend.seriennummer ? bestehend.seriennummer : "")),
                        ausgabedatum: String(ausgabedatum || (bestehend && bestehend.ausgabedatum ? bestehend.ausgabedatum : "")),
                        naechstePruefung: String(pruefung || (bestehend && bestehend.naechstePruefung ? bestehend.naechstePruefung : "")),
                        status: String(status || "Einsatzbereit")
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

                // Absicherung für Firebase
                window.psaDaten = window.psaDaten.map(p => {
                    const sanitized = {};
                    Object.keys(p || {}).forEach(key => { sanitized[key] = p[key] === undefined ? "" : p[key]; });
                    return sanitized;
                });

                // Speichern
                if (typeof speicherePSA === "function") speicherePSA();
                if (typeof speichereDaten === "function") speichereDaten("psa", window.psaDaten);

                localStorage.setItem("psa", JSON.stringify(window.psaDaten));
                localStorage.setItem("ffw_psa", JSON.stringify(window.psaDaten));

                if (typeof filterPSA === "function") filterPSA();
                else if (typeof renderPSAListe === "function") renderPSAListe();

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

function exportPSACSV() {
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

    // Genau die Spaltenüberschriften, die deine App zeigt
    const headers = ["Spind", "Träger", "Ausrüstung", "Größe", "Seriennummer", "Ausgabedatum", "Nächste Prüfung", "Status"];
    let csvContent = "\uFEFF" + headers.join(";") + "\n";

    psaDaten.forEach(item => {
        const spind = String(item.spind || "").replace(/"/g, '""');
        const traeger = String(item.traeger || item.name || item.traegerName || "").replace(/"/g, '""');
        const ausruestung = String(item.bekleidung || item.ausruestung || "").replace(/"/g, '""');
        const groesse = String(item.groesse || "").replace(/"/g, '""');
        const seriennummer = String(item.seriennummer || item.sn || "").replace(/"/g, '""');
        const ausgabedatum = String(item.ausgabedatum || item.datum || "").replace(/"/g, '""');
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
}

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
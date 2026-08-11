function importGeraeteCSV(inputElement) {
    try {
        const file = inputElement.files[0];
        if (!file) return;

        // 1. Bestand aus Speicher / Firebase-Array laden
        if (typeof ladeDaten === "function") {
            window.geraeteDaten = ladeDaten("geraete") || ladeDaten("ffw_geraete") || window.geraeteDaten;
        }

        if (!window.geraeteDaten || !Array.isArray(window.geraeteDaten)) {
            const gespeichert = localStorage.getItem("geraete") || localStorage.getItem("ffw_geraete");
            window.geraeteDaten = gespeichert ? JSON.parse(gespeichert) : [];
        }

        const reader = new FileReader();
        reader.onerror = function() {
            alert("Fehler beim Lesen der Datei.");
        };

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

                    // Match 1: Über Inv.-Nr. / Seriennummer (falls vorhanden)
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

                    // Match 2: Über exakte ID (falls vergeben)
                    if (index === -1 && csvId) {
                        index = window.geraeteDaten.findIndex((g, idx) => {
                            if (!g || bereitsGematcht.has(idx)) return false;
                            return String(g.id || "").trim().toLowerCase() === csvId.toLowerCase();
                        });
                    }

                    // Match 3: Über Bezeichnung UND Standort (nur wenn Inv.-Nr vorhanden ist)
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
                        // Neu hinzugefügtes Gerät sofort sperren, damit die nächste Pumpe es nicht überschreibt
                        bereitsGematcht.add(window.geraeteDaten.length - 1);
                        neuHinzugefuegt++;
                    }
                }

                // Absicherung für Firebase (keine 'undefined' Werte)
                window.geraeteDaten = window.geraeteDaten.map(g => {
                    const sanitized = {};
                    Object.keys(g || {}).forEach(key => {
                        sanitized[key] = g[key] === undefined ? "" : g[key];
                    });
                    return sanitized;
                });

                // Speichern & UI aktualisieren
                if (typeof speichereGeraete === "function") speichereGeraete();
                if (typeof speichereDaten === "function") speichereDaten("geraete", window.geraeteDaten);
                
                localStorage.setItem("geraete", JSON.stringify(window.geraeteDaten));
                localStorage.setItem("ffw_geraete", JSON.stringify(window.geraeteDaten));

                if (typeof filterGeraete === "function") filterGeraete();
                else if (typeof renderGeraeteListe === "function") renderGeraeteListe();

                alert(`Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Geräte hinzugefügt\n- ${aktualisiert} bestehende Geräte aktualisiert`);
                inputElement.value = "";
            } catch (err) {
                console.error("Import-Fehler:", err);
                alert("Fehler bei der CSV-Verarbeitung:\n" + err.message);
            }
        };

        reader.readAsText(file, "UTF-8");
    } catch (err) {
        console.error("Import-Funktions-Fehler:", err);
        alert("Fehler beim Starten des Imports:\n" + err.message);
    }
}
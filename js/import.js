function importGeraeteCSV(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    // 1. ZWINGEND: Bestand aus LocalStorage/Funktion vor dem Import laden
    if (typeof ladeDaten === "function") {
        window.geraeteDaten = ladeDaten("geraete") || ladeDaten("ffw_geraete") || window.geraeteDaten;
    }
    
    if (!window.geraeteDaten || !Array.isArray(window.geraeteDaten) || window.geraeteDaten.length === 0) {
        const gespeichert = localStorage.getItem("geraete") || localStorage.getItem("ffw_geraete") || localStorage.getItem("geraeteDaten");
        if (gespeichert) {
            try { window.geraeteDaten = JSON.parse(gespeichert); } catch(e) {}
        }
    }

    if (!Array.isArray(window.geraeteDaten)) {
        window.geraeteDaten = [];
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        let text = e.target.result;
        
        if (text.charCodeAt(0) === 0xFEFF) {
            text = text.substr(1);
        }

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

            const csvId = (werte[0] && werte[0].startsWith("GER-") ? werte[0] : (gObj["id"] || werte[0] || "")).trim();
            const bezeichnung = (werte[1] || gObj["bezeichnung"] || gObj["name"] || "").trim();
            const kategorie = (werte[2] || gObj["kategorie / ty"] || gObj["kategorie"] || "").trim();
            const standort = (werte[3] || gObj["fahrzeug / sta"] || gObj["fahrzeug"] || gObj["standort"] || "").trim();
            const status = (werte[4] || gObj["status"] || "Einsatzbereit").trim();
            const pruefung = (werte[5] || gObj["nächste prüfung"] || gObj["n,,chste prfun"] || "").trim();
            const invNummer = (werte[6] || gObj["seriennumme"] || gObj["seriennummer"] || gObj["inv.-nr."] || gObj["inventar"] || "").trim();
            const bemerkung = (werte[7] || gObj["bemerkung"] || "").trim();

            if (!bezeichnung && !invNummer && !csvId) continue;

            let index = -1;

            // Match über Bezeichnung (z. B. "Steckleiter", "TS") oder Inv.-Nr. (z. B. "3", "A17")
            if (invNummer) {
                index = window.geraeteDaten.findIndex((g, idx) => {
                    if (bereitsGematcht.has(idx)) return false;
                    const gInv = String(g.inventar || g.inventarnummer || g.seriennummer || "").trim().toLowerCase();
                    if (gInv && gInv === invNummer.toLowerCase()) return true;
                    
                    const n1 = parseInt(invNummer, 10);
                    const n2 = parseInt(gInv, 10);
                    return !isNaN(n1) && !isNaN(n2) && n1 === n2;
                });
            }

            if (index === -1 && bezeichnung) {
                index = window.geraeteDaten.findIndex((g, idx) => {
                    if (bereitsGematcht.has(idx)) return false;
                    const gBezeich = String(g.bezeichnung || "").trim().toLowerCase();
                    return gBezeich === bezeichnung.toLowerCase();
                });
            }

            const bestehend = index !== -1 ? window.geraeteDaten[index] : null;

            const finaleId = csvId || (bestehend ? bestehend.id : `GER-${Date.now()}_${i}`);
            const finaleInv = invNummer || (bestehend ? (bestehend.inventar || bestehend.seriennummer) : `AUTO-${i}`);

            const sauberesGeraet = {
                id: finaleId,
                inventar: finaleInv,
                inventarnummer: finaleInv,
                seriennummer: finaleInv,
                bezeichnung: bezeichnung || (bestehend ? bestehend.bezeichnung : "Unbekannt"),
                kategorie: kategorie || (bestehend ? bestehend.kategorie : ""),
                hersteller: bestehend ? (bestehend.hersteller || "") : "",
                standort: standort || (bestehend ? bestehend.standort : ""),
                status: status || "Einsatzbereit",
                naechstePruefung: pruefung || (bestehend ? bestehend.naechstePruefung : ""),
                bemerkung: bemerkung || (bestehend ? bestehend.bemerkung : "")
            };

            if (index !== -1) {
                bereitsGematcht.add(index);
                window.geraeteDaten[index] = { ...window.geraeteDaten[index], ...sauberesGeraet };
                aktualisiert++;
            } else {
                window.geraeteDaten.push(sauberesGeraet);
                neuHinzugefuegt++;
            }
        }

        // Dauerhaft in allen LocalStorage-Schlüsseln sichern
        if (typeof speichereGeraete === "function") speichereGeraete();
        if (typeof speichereDaten === "function") speichereDaten("geraete", window.geraeteDaten);
        localStorage.setItem("geraete", JSON.stringify(window.geraeteDaten));
        localStorage.setItem("ffw_geraete", JSON.stringify(window.geraeteDaten));

        if (typeof filterGeraete === "function") filterGeraete();
        else if (typeof renderGeraeteListe === "function") renderGeraeteListe();

        alert(`Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Geräte hinzugefügt\n- ${aktualisiert} bestehende Geräte aktualisiert`);
        inputElement.value = "";
    };

    reader.readAsText(file, "UTF-8");
}
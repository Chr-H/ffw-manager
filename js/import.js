function importGeraeteCSV(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        let text = e.target.result;
        
        // UTF-8 BOM entfernen
        if (text.charCodeAt(0) === 0xFEFF) {
            text = text.substr(1);
        }

        const zeilen = text.split(/\r\n|\n/).filter(z => z.trim() !== "");
        if (zeilen.length < 2) {
            alert("Die Datei enthält keine Daten.");
            return;
        }

        // Trennzeichen ermitteln (Semicolon oder Komma)
        const trenner = zeilen[0].includes(";") ? ";" : ",";
        
        // Headerzeile analysieren
        const rawHeaders = zeilen[0].split(trenner).map(h => {
            let s = h.replace(/^"|"$/g, '').trim().toLowerCase();
            return s.replace(/,,/g, 'ä').replace(/á/g, 'ß');
        });

        let aktualisiert = 0;
        let neuHinzugefuegt = 0;

        if (!window.geraeteDaten) window.geraeteDaten = [];

        for (let i = 1; i < zeilen.length; i++) {
            const werte = zeilen[i]
                .split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                .map(w => w.replace(/^"|"$/g, '').trim().replace(/,,/g, 'ä').replace(/á/g, 'ß'));

            if (werte.length === 0 || werte.every(v => v === "")) continue;

            let gObj = {};
            rawHeaders.forEach((header, index) => {
                gObj[header] = werte[index] || "";
            });

            // 1. Auslesen über feste Spalten-Indizes (schützt vor Excel-Header-Fehlern)
            const indexId = werte[0] || "";
            const indexBezeichnung = werte[1] || "";
            const indexKategorie = werte[2] || "";
            const indexStandort = werte[3] || "";
            const indexStatus = werte[4] || "";
            const indexPruefung = werte[5] || "";
            const indexInvNr = werte[6] || "";
            const indexBemerkung = werte[7] || "";

            // Werte ermitteln
            const csvId = (indexId.startsWith("GER-") ? indexId : (gObj["id"] || indexId)).trim();
            const bezeichnung = (indexBezeichnung || gObj["bezeichnung"] || gObj["name"] || "").trim();
            const invNummer = (indexInvNr || gObj["seriennumme"] || gObj["seriennummer"] || gObj["inv.-nr."] || gObj["inventar"] || "").trim();
            const kategorie = (indexKategorie || gObj["kategorie / ty"] || gObj["kategorie"] || "").trim();
            const standort = (indexStandort || gObj["fahrzeug / sta"] || gObj["fahrzeug"] || gObj["standort"] || "").trim();
            const status = (indexStatus || gObj["status"] || "Einsatzbereit").trim();
            const pruefung = (indexPruefung || gObj["nächste prüfung"] || gObj["n,,chste prfun"] || "").trim();
            const bemerkung = (indexBemerkung || gObj["bemerkung"] || "").trim();

            if (!bezeichnung && !invNummer && !csvId) continue;

            // 2. Abgleich (inkl. Zahlenvergleich für Excel "1" vs "001")
            const index = window.geraeteDaten.findIndex(g => {
                const gId = String(g.id || "").trim().toLowerCase();
                const gInv = String(g.inventar || g.inventarnummer || g.seriennummer || "").trim().toLowerCase();
                const gBezeich = String(g.bezeichnung || "").trim().toLowerCase();
                const gStandort = String(g.standort || g.fahrzeug || "").trim().toLowerCase();

                // Match 1: Exakte ID
                if (csvId && gId && csvId.toLowerCase() === gId) return true;

                // Match 2: Inv.-Nr. / Seriennummer (Text- und Zahlenvergleich)
                if (invNummer && gInv) {
                    if (invNummer.toLowerCase() === gInv) return true;
                    const numCsv = parseInt(invNummer, 10);
                    const numG = parseInt(gInv, 10);
                    if (!isNaN(numCsv) && !isNaN(numG) && numCsv === numG) return true;
                }

                // Match 3: Fallback auf Bezeichnung + Standort
                if (bezeichnung && gBezeich === bezeichnung.toLowerCase() && standort && gStandort === standort.toLowerCase()) return true;

                return false;
            });

            // 3. Objekt zusammenstellen
            const bestehendesGeraet = index !== -1 ? window.geraeteDaten[index] : null;

            const finaleId = csvId || (bestehendesGeraet ? bestehendesGeraet.id : `GER-${Date.now()}${i}`);
            const finaleInvNr = (bestehendesGeraet && bestehendesGeraet.inventar) 
                ? bestehendesGeraet.inventar 
                : (invNummer || `AUTO-${i}`);

            const sauberesGeraet = {
                id: finaleId,
                inventar: finaleInvNr,
                inventarnummer: finaleInvNr,
                seriennummer: finaleInvNr,
                bezeichnung: bezeichnung || (bestehendesGeraet ? bestehendesGeraet.bezeichnung : "Unbekannt"),
                kategorie: kategorie || (bestehendesGeraet ? bestehendesGeraet.kategorie : ""),
                hersteller: bestehendesGeraet ? (bestehendesGeraet.hersteller || "") : "",
                standort: standort || (bestehendesGeraet ? bestehendesGeraet.standort : ""),
                status: status || "Einsatzbereit",
                naechstePruefung: pruefung || (bestehendesGeraet ? bestehendesGeraet.naechstePruefung : ""),
                bemerkung: bemerkung || (bestehendesGeraet ? bestehendesGeraet.bemerkung : "")
            };

            if (index !== -1) {
                // UPDATE
                window.geraeteDaten[index] = { ...window.geraeteDaten[index], ...sauberesGeraet };
                aktualisiert++;
            } else {
                // NEU
                window.geraeteDaten.push(sauberesGeraet);
                neuHinzugefuegt++;
            }
        }

        // Filter zurücksetzen & UI aktualisieren
        if (document.getElementById("sucheGeraet")) document.getElementById("sucheGeraet").value = "";
        if (document.getElementById("filterKategorie")) document.getElementById("filterKategorie").value = "";
        if (document.getElementById("filterStatus")) document.getElementById("filterStatus").value = "";

        if (typeof speichereGeraete === "function") speichereGeraete();
        if (typeof filterGeraete === "function") filterGeraete();
        else if (typeof renderGeraeteListe === "function") renderGeraeteListe();

        alert(`Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Geräte hinzugefügt\n- ${aktualisiert} bestehende Geräte aktualisiert`);
        
        inputElement.value = "";
    };

    reader.readAsText(file, "UTF-8");
}
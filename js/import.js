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

        const trenner = zeilen[0].includes(";") ? ";" : ",";
        
        // Kopfzeile säubern (ohne aggressive Regex, nur Kleinbuchstaben & Trim)
        const rawHeaders = zeilen[0].split(trenner).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

        let aktualisiert = 0;
        let neuHinzugefuegt = 0;

        // Sicherstellen, dass das Arbeits-Array existiert
        if (!window.geraeteDaten) window.geraeteDaten = [];

        for (let i = 1; i < zeilen.length; i++) {
            const werte = zeilen[i]
                .split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                .map(w => w.replace(/^"|"$/g, '').trim());

            let gObj = {};
            rawHeaders.forEach((header, index) => {
                gObj[header] = werte[index] || "";
            });

            // Flexibles Auslesen der Spalten
            const invNr = (gObj["inventar"] || gObj["inventarnummer"] || gObj["inv.-nr."] || gObj["invnr"] || gObj["id"] || "").trim();
            if (!invNr) continue;

            const bezeichnung = gObj["bezeichnung"] || gObj["name"] || gObj["geraet"] || "Unbekannt";

            const sauberesGeraet = {
                inventar: invNr,
                bezeichnung: bezeichnung,
                kategorie: gObj["kategorie"] || gObj["kat"] || "",
                hersteller: gObj["hersteller"] || "",
                standort: gObj["standort"] || gObj["ort"] || "",
                erstinbetriebnahme: gObj["erstinbetriebnahme"] || gObj["baujahr"] || "",
                letztePruefung: gObj["letztepruefung"] || gObj["letzte prüfung"] || gObj["pruefung"] || "",
                pruefintervall: gObj["pruefintervall"] || "12",
                status: gObj["status"] || "Einsatzbereit"
            };

            // Eindeutiger Abgleich der Inventarnummer (Typ-unabhängig als String)
            const index = window.geraeteDaten.findIndex(
                g => String(g.inventar || "").trim().toLowerCase() === invNr.toLowerCase()
            );

            if (index !== -1) {
                // UPDATE: Vorhandenen Eintrag überschreiben/ergänzen
                window.geraeteDaten[index] = { ...window.geraeteDaten[index], ...sauberesGeraet };
                aktualisiert++;
            } else {
                // NEU: Hinzufügen
                window.geraeteDaten.push(sauberesGeraet);
                neuHinzugefuegt++;
            }
        }

        // 1. Suche & Filter zurücksetzen
        if (document.getElementById("sucheGeraet")) document.getElementById("sucheGeraet").value = "";
        if (document.getElementById("filterKategorie")) document.getElementById("filterKategorie").value = "";
        if (document.getElementById("filterStatus")) document.getElementById("filterStatus").value = "";

        // 2. In Firebase / LocalStorage speichern
        if (typeof speichereGeraete === "function") {
            speichereGeraete();
        }

        // 3. UI direkt neu zeichnen
        if (typeof renderGeraeteListe === "function") {
            renderGeraeteListe();
        } else if (typeof filterGeraete === "function") {
            filterGeraete();
        }

        alert(`Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Geräte hinzugefügt\n- ${aktualisiert} bestehende Geräte aktualisiert`);
        
        inputElement.value = "";
    };

    reader.readAsText(file, "UTF-8");
}
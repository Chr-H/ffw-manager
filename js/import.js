function importGeraeteCSV(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        let text = e.target.result;
        
        // UTF-8 BOM entfernen falls vorhanden
        if (text.charCodeAt(0) === 0xFEFF) {
            text = text.substr(1);
        }

        const zeilen = text.split(/\r\n|\n/).filter(z => z.trim() !== "");
        
        if (zeilen.length < 2) {
            alert("Die Datei enthält keine Daten oder nur eine Kopfzeile.");
            return;
        }

        const trenner = zeilen[0].includes(";") ? ";" : ",";
        
        // Kopfzeile säubern und vereinheitlichen
        const headers = zeilen[0]
            .split(trenner)
            .map(h => h.replace(/^"|"$/g, '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

        let aktualisiert = 0;
        let neuHinzugefuegt = 0;

        // Globale Datenstruktur sicherstellen
        if (!window.geraeteDaten) window.geraeteDaten = [];

        for (let i = 1; i < zeilen.length; i++) {
            const werte = zeilen[i]
                .split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                .map(w => w.replace(/^"|"$/g, '').trim());

            let gObj = {};
            headers.forEach((header, index) => {
                gObj[header] = werte[index] || "";
            });

            // Inventarnummer ermitteln
            const invNr = (gObj["inventar"] || gObj["inventarnummer"] || gObj["invnr"] || gObj["id"] || "").trim();
            if (!invNr) continue; // Zeilen ohne Inventarnummer überspringen

            const sauberesGeraet = {
                inventar: invNr,
                bezeichnung: gObj["bezeichnung"] || gObj["name"] || "Unbekannt",
                kategorie: gObj["kategorie"] || gObj["kat"] || "",
                hersteller: gObj["hersteller"] || "",
                standort: gObj["standort"] || gObj["ort"] || "",
                erstinbetriebnahme: gObj["erstinbetriebnahme"] || gObj["baujahr"] || "",
                letztePruefung: gObj["letztepruefung"] || gObj["pruefung"] || "",
                pruefintervall: gObj["pruefintervall"] || "12",
                status: gObj["status"] || "Einsatzbereit"
            };

            // Abgleich mit bestehenden Daten
            const index = window.geraeteDaten.findIndex(
                g => String(g.inventar || "").trim().toLowerCase() === invNr.toLowerCase()
            );

            if (index !== -1) {
                // UPDATE: Vorhandenes Gerät aktualisieren
                window.geraeteDaten[index] = { ...window.geraeteDaten[index], ...sauberesGeraet };
                aktualisiert++;
            } else {
                // NEU: Hinzufügen
                window.geraeteDaten.push(sauberesGeraet);
                neuHinzugefuegt++;
            }
        }

        // 1. Suche & Filter im Formular zurücksetzen
        if (document.getElementById("sucheGeraet")) document.getElementById("sucheGeraet").value = "";
        if (document.getElementById("filterKategorie")) document.getElementById("filterKategorie").value = "";
        if (document.getElementById("filterStatus")) document.getElementById("filterStatus").value = "";

        // 2. Speicher-Funktion aufrufen (schreibt in LocalStorage / Firebase)
        if (typeof speichereGeraete === "function") {
            speichereGeraete();
        }

        // 3. UI direkt aus dem Arbeitsspeicher neu zeichnen (OHNE ladeGeraete)
        if (typeof filterGeraete === "function") {
            filterGeraete();
        } else if (typeof renderGeraete === "function") {
            renderGeraete();
        }

        alert(`Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Geräte hinzugefügt\n- ${aktualisiert} bestehende Geräte aktualisiert`);
        
        inputElement.value = "";
    };

    reader.readAsText(file, "UTF-8");
}
function importGeraeteCSV(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        // Zeilen um Zeilenumbrüche bereinigen
        const zeilen = text.split(/\r\n|\n/).filter(z => z.trim() !== "");
        
        if (zeilen.length < 2) {
            alert("Die Datei enthält keine Daten oder nur eine Kopfzeile.");
            return;
        }

        // Trennzeichen ermitteln (Semikolon oder Komma)
        const trenner = zeilen[0].includes(";") ? ";" : ",";
        
        // Headings einlesen, Anführungszeichen & Steuerzeichen entfernen
        const headers = zeilen[0]
            .split(trenner)
            .map(h => h.replace(/^"|"$/g, '').trim().toLowerCase().replace(/[^a-z0-0äöüß]/g, ''));

        let aktualisiert = 0;
        let neuHinzugefuegt = 0;

        if (!window.geraeteDaten) window.geraeteDaten = [];

        for (let i = 1; i < zeilen.length; i++) {
            // Zeile in Spalten aufteilen (auch mit Maskierung)
            const werte = zeilen[i]
                .split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                .map(w => w.replace(/^"|"$/g, '').trim());

            let geraetObj = {};
            headers.forEach((header, index) => {
                geraetObj[header] = werte[index] || "";
            });

            // Flexibles Suchen nach der Inventarnummer / ID
            const invNr = geraetObj["inventar"] || 
                          geraetObj["inventarnummer"] || 
                          geraetObj["invnr"] || 
                          geraetObj["id"] || 
                          `AUTO-${Date.now()}-${i}`; // Fallback, falls keine Nummer da ist

            // Bezeichnungen flexibel zuordnen
            const bezeichnung = geraetObj["bezeichnung"] || geraetObj["name"] || geraetObj["geraet"] || "Unbekanntes Gerät";

            const sauberesGeraet = {
                inventar: String(invNr).trim(),
                bezeichnung: bezeichnung,
                kategorie: geraetObj["kategorie"] || geraetObj["kat"] || "",
                hersteller: geraetObj["hersteller"] || "",
                standort: geraetObj["standort"] || geraetObj["ort"] || "",
                erstinbetriebnahme: geraetObj["erstinbetriebnahme"] || geraetObj["baujahr"] || "",
                letztePruefung: geraetObj["letztepruefung"] || geraetObj["pruefung"] || "",
                pruefintervall: geraetObj["pruefintervall"] || "12",
                status: geraetObj["status"] || "Einsatzbereit"
            };

            // Prüfen ob bereits vorhanden
            const existierenderIndex = window.geraeteDaten.findIndex(
                g => String(g.inventar).trim().toLowerCase() === String(invNr).trim().toLowerCase()
            );

            if (existierenderIndex !== -1) {
                window.geraeteDaten[existierenderIndex] = { 
                    ...window.geraeteDaten[existierenderIndex], 
                    ...sauberesGeraet 
                };
                aktualisiert++;
            } else {
                window.geraeteDaten.push(sauberesGeraet);
                neuHinzugefuegt++;
            }
        }

        // Speichern & Ansicht aktualisieren
        // 1. Eingabefelder der Suche/Filter zurücksetzen (damit neue Geräte nicht unsichtbar gefiltert werden)
        if (document.getElementById("sucheGeraet")) document.getElementById("sucheGeraet").value = "";
        if (document.getElementById("filterKategorie")) document.getElementById("filterKategorie").value = "";
        if (document.getElementById("filterStatus")) document.getElementById("filterStatus").value = "";

        // 2. Daten speichern
        if (typeof speichereGeraete === "function") speichereGeraete();

        // 3. Ansicht & Tabelle erzwingen neu zu laden
        if (typeof ladeGeraete === "function") ladeGeraete();
        if (typeof renderGeraete === "function") renderGeraete();
        if (typeof filterGeraete === "function") filterGeraete();

        alert(`Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Geräte hinzugefügt\n- ${aktualisiert} bestehende Geräte aktualisiert`);
        
        inputElement.value = "";
    };

    reader.readAsText(file, "UTF-8");
}
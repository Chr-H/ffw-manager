// =========================================
// CSV EXPORT (Geraete)
// =========================================
function exportGeraeteCSV() {
    // 1. Hole alle Geräte aus dem Speicher/Cloud
    const geraete = window.geraeteDaten || [];
    
    if (geraete.length === 0) {
        alert("Keine Geräte zum Exportieren vorhanden.");
        return;
    }

    // 2. Feste Headings definieren
    const headers = ["inventar", "bezeichnung", "kategorie", "hersteller", "standort", "erstinbetriebnahme", "letztePruefung", "pruefintervall", "status"];
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // UTF-8 BOM für Excel
    csvContent += headers.join(";") + "\r\n";

    // 3. Zeilen zusammenbauen
    geraete.forEach(g => {
        const row = headers.map(header => {
            let val = g[header] || "";
            // Anführungszeichen maskieren und Maskierung für Semikolons
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        });
        csvContent += row.join(";") + "\r\n";
    });

    // 4. Download anstoßen
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FFW_Geraete_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// =========================================
// CSV IMPORT (Geraete) - mit Update/Merge-Funktion
// =========================================
function importGeraeteCSV(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const zeilen = text.split(/\r\n|\n/);
        
        if (zeilen.length < 2) {
            alert("Die Datei enthält keine Daten.");
            return;
        }

        // Trennzeichen ermitteln (Semikolon oder Komma)
        const trenner = zeilen[0].includes(";") ? ";" : ",";
        
        // Header einlesen und säubern (Anführungszeichen entfernen)
        const headers = zeilen[0].split(trenner).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

        let aktualisiert = 0;
        let neuHinzugefuegt = 0;

        // Sicherstellen, dass die Datenstruktur existiert
        if (!window.geraeteDaten) window.geraeteDaten = [];

        for (let i = 1; i < zeilen.length; i++) {
            if (!zeilen[i].trim()) continue; // Leere Zeilen überspringen

            // Spalten splitten (berücksichtigt Anführungszeichen)
            const werte = zeilen[i].split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                                   .map(w => w.replace(/^"|"$/g, '').trim());

            let geraetObj = {};
            headers.forEach((header, index) => {
                geraetObj[header] = werte[index] || "";
            });

            // Pflichtfeld Inventarnummer prüfen
            const invNr = geraetObj["inventar"] || geraetObj["inventarnummer"] || geraetObj["inv.-nr."];
            if (!invNr) continue; 

            // Standardisiertes Objekt aufbauen
            const sauberesGeraet = {
                inventar: invNr,
                bezeichnung: geraetObj["bezeichnung"] || "Unbekannt",
                kategorie: geraetObj["kategorie"] || "",
                hersteller: geraetObj["hersteller"] || "",
                standort: geraetObj["standort"] || "",
                erstinbetriebnahme: geraetObj["erstinbetriebnahme"] || "",
                letztePruefung: geraetObj["letztepruefung"] || "",
                pruefintervall: geraetObj["pruefintervall"] || "12",
                status: geraetObj["status"] || "Einsatzbereit"
            };

            // Prüfen, ob das Gerät bereits existiert
            const existierenderIndex = window.geraeteDaten.findIndex(g => String(g.inventar).trim() === String(invNr).trim());

            if (existierenderIndex !== -1) {
                // UPDATE: Bestehendes Gerät überschreiben
                window.geraeteDaten[existierenderIndex] = { ...window.geraeteDaten[existierenderIndex], ...sauberesGeraet };
                aktualisiert++;
            } else {
                // NEU: Hinzufügen
                window.geraeteDaten.push(sauberesGeraet);
                neuHinzugefuegt++;
            }
        }

        // Speichern in LocalStorage / Firebase
        if (typeof speichereGeraete === "function") {
            speichereGeraete();
        }

        // Anzeige aktualisieren
        if (typeof filterGeraete === "function") {
            filterGeraete();
        }

        alert(`Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Geräte hinzugefügt\n- ${aktualisiert} bestehende Geräte aktualisiert`);
        
        // Input-Feld zurücksetzen
        inputElement.value = "";
    };

    reader.readAsText(file, "UTF-8");
}
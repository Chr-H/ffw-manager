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
        
        // Spaltenköpfe flexibel säubern
        const headers = zeilen[0].split(trenner).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

        let aktualisiert = 0;
        let neuHinzugefuegt = 0;

        if (!window.geraeteDaten) window.geraeteDaten = [];

        for (let i = 1; i < zeilen.length; i++) {
            const werte = zeilen[i]
                .split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                .map(w => w.replace(/^"|"$/g, '').trim());

            let gObj = {};
            headers.forEach((header, index) => {
                gObj[header] = werte[index] || "";
            });

            // Flexibles Auslesen passend zu deiner CSV
            const csvId = (gObj["id"] || gObj["inventar"] || gObj["inventarnummer"] || "").trim();
            const seriennummer = (gObj["seriennumme"] || gObj["seriennummer"] || gObj["inv.-nr."] || "").trim();
            const bezeichnung = gObj["bezeichnung"] || gObj["name"] || "Unbekannt";

            // Wichtig: Match über ID ODER Seriennummer/Inventarnummer
            const index = window.geraeteDaten.findIndex(g => {
                const gInv = String(g.inventar || "").trim().toLowerCase();
                const gId = String(g.id || "").trim().toLowerCase();
                
                return (csvId && gId === csvId.toLowerCase()) || 
                       (csvId && gInv === csvId.toLowerCase()) ||
                       (seriennummer && gInv === seriennummer.toLowerCase());
            });

            // Vorbereitung des Ziel-Objekts
            const sauberesGeraet = {
                id: csvId || (index !== -1 ? window.geraeteDaten[index].id : `GER-${Date.now()}${i}`),
                inventar: csvId || seriennummer || `AUTO-${i}`,
                bezeichnung: bezeichnung,
                kategorie: gObj["kategorie / ty"] || gObj["kategorie"] || "",
                standort: gObj["fahrzeug / sta"] || gObj["standort"] || "",
                status: gObj["status"] || "Einsatzbereit",
                seriennummer: seriennummer,
                bemerkung: gObj["bemerkung"] || ""
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

        // Filter zurücksetzen
        if (document.getElementById("sucheGeraet")) document.getElementById("sucheGeraet").value = "";
        if (document.getElementById("filterKategorie")) document.getElementById("filterKategorie").value = "";
        if (document.getElementById("filterStatus")) document.getElementById("filterStatus").value = "";

        // Speichern
        if (typeof speichereGeraete === "function") speichereGeraete();

        // UI-Update
        if (typeof renderGeraeteListe === "function") renderGeraeteListe();
        if (typeof filterGeraete === "function") filterGeraete();

        alert(`Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Geräte hinzugefügt\n- ${aktualisiert} bestehende Geräte aktualisiert`);
        
        inputElement.value = "";
    };

    reader.readAsText(file, "UTF-8");
}
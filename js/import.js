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
        
        // Spaltenköpfe säubern & kaputte Umlaute korrigieren
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

            let gObj = {};
            rawHeaders.forEach((header, index) => {
                gObj[header] = werte[index] || "";
            });

            // 1. IDs und Inventarnummern flexibel aus allen Spaltenvarianten auslesen
            const csvId = (gObj["id"] || "").trim();
            const invNummer = (gObj["seriennumme"] || gObj["seriennummer"] || gObj["inv.-nr."] || gObj["inventar"] || gObj["inventarnummer"] || "").trim();
            const bezeichnung = gObj["bezeichnung"] || gObj["name"] || "Unbekannt";

            if (!csvId && !invNummer && !bezeichnung) continue;

            // 2. Abgleich mit bestehenden Daten (Sucht in ALLEN Datensatz-Feldern)
            const index = window.geraeteDaten.findIndex(g => {
                const gId = String(g.id || "").trim().toLowerCase();
                const gInv = String(g.inventar || g.inventarnummer || g.seriennummer || "").trim().toLowerCase();
                
                return (csvId && gId === csvId.toLowerCase()) || 
                       (invNummer && gInv === invNummer.toLowerCase());
            });

            // 3. Eindeutige IDs sicherstellen
            const finaleId = csvId || (index !== -1 && window.geraeteDaten[index].id ? window.geraeteDaten[index].id : `GER-${Date.now()}${i}`);
            const finaleInvNr = invNummer || (index !== -1 ? (window.geraeteDaten[index].inventar || window.geraeteDaten[index].seriennummer) : `AUTO-${i}`);

            // 4. Einheitliches Geräte-Objekt erstellen
            const sauberesGeraet = {
                id: finaleId,
                inventar: finaleInvNr,
                inventarnummer: finaleInvNr,
                seriennummer: finaleInvNr,
                bezeichnung: bezeichnung,
                kategorie: gObj["kategorie / ty"] || gObj["kategorie"] || gObj["typ"] || "",
                hersteller: gObj["hersteller"] || gObj["herst."] || "",
                standort: gObj["fahrzeug / sta"] || gObj["fahrzeug"] || gObj["standort"] || "",
                status: gObj["status"] || "Einsatzbereit",
                naechstePruefung: gObj["nächste prüfung"] || gObj["n,,chste prfun"] || gObj["pruefdatum"] || "",
                bemerkung: gObj["bemerkung"] || gObj["notiz"] || ""
            };

            if (index !== -1) {
                // UPDATE: Vorhandenes Gerät aktualisieren
                window.geraeteDaten[index] = { ...window.geraeteDaten[index], ...sauberesGeraet };
                aktualisiert++;
            } else {
                // NEU: Neues Gerät hinzufügen
                window.geraeteDaten.push(sauberesGeraet);
                neuHinzugefuegt++;
            }
        }

        // Filter & UI zurücksetzen
        if (document.getElementById("sucheGeraet")) document.getElementById("sucheGeraet").value = "";
        if (document.getElementById("filterKategorie")) document.getElementById("filterKategorie").value = "";
        if (document.getElementById("filterStatus")) document.getElementById("filterStatus").value = "";

        // Speichern & Aktualisieren
        if (typeof speichereGeraete === "function") speichereGeraete();
        if (typeof filterGeraete === "function") filterGeraete();
        else if (typeof renderGeraeteListe === "function") renderGeraeteListe();

        alert(`Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Geräte hinzugefügt\n- ${aktualisiert} bestehende Geräte aktualisiert`);
        
        inputElement.value = "";
    };

    reader.readAsText(file, "UTF-8");
}
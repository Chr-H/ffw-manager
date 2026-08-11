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
        
        // 1. Spaltenköpfe säubern & kaputte Excel-Umlaute/Sonderzeichen reparieren
        const rawHeaders = zeilen[0].split(trenner).map(h => {
            let s = h.replace(/^"|"$/g, '').trim().toLowerCase();
            s = s.replace(/,,/g, 'ä').replace(/á/g, 'ß'); // Behebt "N,,chste", "Schl,,uche", "Auáer"
            return s;
        });

        let aktualisiert = 0;
        let neuHinzugefuegt = 0;

        if (!window.geraeteDaten) window.geraeteDaten = [];

        for (let i = 1; i < zeilen.length; i++) {
            const werte = zeilen[i]
                .split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                .map(w => w.replace(/^"|"$/g, '').trim());

            let gObj = {};
            rawHeaders.forEach((header, index) => {
                // Wert ebenfalls von kaputten Umlauten bereinigen
                let val = werte[index] || "";
                val = val.replace(/,,/g, 'ä').replace(/á/g, 'ß');
                gObj[header] = val;
            });

            // 2. Werte flexibel aus allen möglichen Header-Varianten auslesen
            const csvId = (gObj["id"] || "").trim();
            
            // Die kurze Inventarnummer steht in deiner CSV unter "seriennumme" oder "seriennummer"
            const invNummer = (gObj["seriennumme"] || gObj["seriennummer"] || gObj["inv.-nr."] || gObj["inventar"] || "").trim();
            const bezeichnung = gObj["bezeichnung"] || gObj["name"] || "Unbekannt";

            // Abgleich über ID ODER über die kurze Inventarnummer
            const index = window.geraeteDaten.findIndex(g => {
                const gId = String(g.id || "").trim().toLowerCase();
                const gInv = String(g.inventar || "").trim().toLowerCase();
                
                return (csvId && gId === csvId.toLowerCase()) || 
                       (invNummer && gInv === invNummer.toLowerCase());
            });

            // 3. Wenn keine ID da ist (z. B. neue Zeilen 8 & 9), zwingend eine neue erzeugen!
            const finaleId = csvId || (index !== -1 && window.geraeteDaten[index].id ? window.geraeteDaten[index].id : `GER-${Date.now()}${i}`);
            const finaleInvNr = invNummer || (csvId ? csvId : `AUTO-${i}`);

            const sauberesGeraet = {
                id: finaleId,
                inventar: finaleInvNr,
                bezeichnung: bezeichnung,
                kategorie: gObj["kategorie / ty"] || gObj["kategorie"] || "",
                standort: gObj["fahrzeug / sta"] || gObj["standort"] || "",
                status: gObj["status"] || "Einsatzbereit",
                letztePruefung: gObj["nächste prüfung"] || gObj["n,,chste prfun"] || gObj["pruefung"] || "",
                bemerkung: gObj["bemerkung"] || ""
            };

            if (index !== -1) {
                // UPDATE
                window.geraeteDaten[index] = { ...window.geraeteDaten[index], ...sauberesGeraet };
                aktualisiert++;
            } else {
                // NEU HINZUFÜGEN
                window.geraeteDaten.push(sauberesGeraet);
                neuHinzugefuegt++;
            }
        }

        // 4. Suche/Filter in der Benutzeroberfläche zurücksetzen
        if (document.getElementById("sucheGeraet")) document.getElementById("sucheGeraet").value = "";
        if (document.getElementById("filterKategorie")) document.getElementById("filterKategorie").value = "";
        if (document.getElementById("filterStatus")) document.getElementById("filterStatus").value = "";

        // 5. In Firebase / LocalStorage dauerhaft speichern
        if (typeof speichereGeraete === "function") {
            speichereGeraete();
        }

        // 6. Tabelle direkt im Browser neu anzeigen
        if (typeof filterGeraete === "function") {
            filterGeraete();
        } else if (typeof renderGeraeteListe === "function") {
            renderGeraeteListe();
        }

        alert(`Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Geräte hinzugefügt\n- ${aktualisiert} bestehende Geräte aktualisiert`);
        
        inputElement.value = "";
    };

    reader.readAsText(file, "UTF-8");
}
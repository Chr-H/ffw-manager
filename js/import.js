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
        
        // Spaltenköpfe säubern & Excel-Sonderzeichen reparieren
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

            // Auslesen aller möglichen Spaltenbezeichnungen aus Excel
            const csvId = (gObj["id"] || "").trim();
            const invNummer = (gObj["seriennumme"] || gObj["seriennummer"] || gObj["inv.-nr."] || gObj["inventar"] || gObj["inventarnummer"] || "").trim();
            const bezeichnung = (gObj["bezeichnung"] || gObj["name"] || "").trim();
            const kategorie = (gObj["kategorie / ty"] || gObj["kategorie"] || gObj["typ"] || "").trim();
            const standort = (gObj["fahrzeug / sta"] || gObj["fahrzeug"] || gObj["standort"] || "").trim();

            if (!bezeichnung && !invNummer && !csvId) continue;

            // --- 3-STUFIGER ABGLEICH GEGEN DUPLETTEN ---
            const index = window.geraeteDaten.findIndex(g => {
                const gId = String(g.id || "").trim().toLowerCase();
                const gInv = String(g.inventar || g.inventarnummer || g.seriennummer || "").trim().toLowerCase();
                const gBezeich = String(g.bezeichnung || "").trim().toLowerCase();
                const gStandort = String(g.standort || g.fahrzeug || "").trim().toLowerCase();

                // 1. Stufe: Exakter ID-Match
                if (csvId && gId && csvId.toLowerCase() === gId) return true;

                // 2. Stufe: Exakter Inv.-Nr. / Seriennummer Match
                if (invNummer && gInv && invNummer.toLowerCase() === gInv) return true;

                // 3. Stufe: Fallback auf Kombination aus Bezeichnung + Standort (falls IDs/Nummern fehlen)
                if (bezeichnung && gBezeich === bezeichnung.toLowerCase() && standort && gStandort === standort.toLowerCase()) return true;

                return false;
            });

            // IDs und Inventarnummern konsolidieren
            const finaleId = csvId || (index !== -1 && window.geraeteDaten[index].id ? window.geraeteDaten[index].id : `GER-${Date.now()}${i}`);
            const finaleInvNr = invNummer || (index !== -1 ? (window.geraeteDaten[index].inventar || window.geraeteDaten[index].seriennummer) : `AUTO-${i}`);

            const sauberesGeraet = {
                id: finaleId,
                inventar: finaleInvNr,
                inventarnummer: finaleInvNr,
                seriennummer: finaleInvNr,
                bezeichnung: bezeichnung || "Unbekannt",
                kategorie: kategorie,
                hersteller: gObj["hersteller"] || gObj["herst."] || (index !== -1 ? window.geraeteDaten[index].hersteller : ""),
                standort: standort,
                status: gObj["status"] || "Einsatzbereit",
                naechstePruefung: gObj["nächste prüfung"] || gObj["n,,chste prfun"] || gObj["pruefdatum"] || "",
                bemerkung: gObj["bemerkung"] || gObj["notiz"] || ""
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

        // Speichern & Anzeigen
        if (typeof speichereGeraete === "function") speichereGeraete();
        if (typeof filterGeraete === "function") filterGeraete();
        else if (typeof renderGeraeteListe === "function") renderGeraeteListe();

        alert(`Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Geräte hinzugefügt\n- ${aktualisiert} bestehende Geräte aktualisiert`);
        
        inputElement.value = "";
    };

    reader.readAsText(file, "UTF-8");
}
function importLagerCSV(inputElement) {
    try {
        // 0. Schreibschutz-Prüfung
        if (typeof istEditor === "function" && !istEditor()) {
            alert("🔒 Schreibschutz aktiv! Bitte melde dich an, um Daten zu importieren.");
            return;
        }

        // Falls ein Event übergeben wurde (z.B. event.target)
        let el = inputElement;
        if (inputElement && inputElement.target) el = inputElement.target;

        const file = (el && el.files) ? el.files[0] : null;
        if (!file) return;

        // 1. Nachfragen, ob der Bestand ERSETZT oder ERGÄNZT werden soll
        const moechteErsetzen = confirm(
            "Möchtest du den vorhandenen Lagerbestand KOMPLETT ÜBERSCHREIBEN?\n\n" +
            "• OK = Bisherigen Bestand löschen und nur die neuen Artikel laden\n" +
            "• Abbrechen = Artikel zum bestehenden Bestand hinzufügen / aktualisieren"
        );

        // Datenbestand laden oder leeren
        let lagerDaten = [];
        if (!moechteErsetzen) {
            if (typeof getLager === "function") {
                lagerDaten = getLager() || [];
            } else {
                const raw = localStorage.getItem("lager") || localStorage.getItem("lager_daten") || "[]";
                try { lagerDaten = JSON.parse(raw); } catch(e) { lagerDaten = []; }
            }
        }

        const reader = new FileReader();
        reader.onerror = function() { alert("Fehler beim Lesen der Datei."); };

        reader.onload = function(e) {
            try {
                let text = e.target.result;
                if (text.charCodeAt(0) === 0xFEFF) text = text.substr(1);

                const zeilen = text.split(/\r\n|\n/).filter(z => z.trim() !== "");
                if (zeilen.length < 2) {
                    alert("Die Datei enthält keine verwertbaren Daten.");
                    if (el) el.value = "";
                    return;
                }

                // Trennzeichen ermitteln (; oder ,)
                const trenner = zeilen[0].includes(";") ? ";" : ",";
                const rawHeaders = zeilen[0].split(trenner).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

                const findIndex = (...keywords) => {
                    return rawHeaders.findIndex(h => {
                        const cleanH = h.replace(/[^a-z0-9]/g, '');
                        return keywords.some(kw => cleanH.includes(kw.toLowerCase().replace(/[^a-z0-9]/g, '')));
                    });
                };

                // SPALTEN-MAPPING
                const idxId = findIndex("id");
                const idxArtNr = findIndex("artikelnumme", "artikelnummer", "artnr", "artikelnr");
                let idxBez = rawHeaders.findIndex(h => h.includes("bezeichn") || h.includes("name") || (h.includes("artikel") && !h.includes("numm")));
                const idxHersteller = findIndex("hersteller", "herstell");
                const idxKat = findIndex("kategorie", "kat");
                const idxGroesse = findIndex("groesse", "größe", "gr");
                const idxZustand = findIndex("zustand");
                const idxBestand = findIndex("bestand", "menge", "ist");
                const idxSoll = findIndex("mindest", "soll");

                // Fallbacks falls Spaltennamen abweichen (Starre Positionszuweisung)
                const finalArtNr = idxArtNr !== -1 ? idxArtNr : 1;
                const finalBez = idxBez !== -1 ? idxBez : 2;

                let aktualisiert = 0;
                let neuHinzugefuegt = 0;

                for (let i = 1; i < zeilen.length; i++) {
                    const werte = zeilen[i]
                        .split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                        .map(w => w.replace(/^"|"$/g, '').trim());

                    if (werte.length === 0 || werte.every(v => v === "")) continue;

                    const rawId = idxId !== -1 ? werte[idxId] : "";
                    const artNr = werte[finalArtNr] || "";
                    const bezeichnung = werte[finalBez] || "";

                    if (!artNr && !bezeichnung) continue;

                    const hersteller = idxHersteller !== -1 ? werte[idxHersteller] : "";
                    const kategorie = idxKat !== -1 ? werte[idxKat] : "Sonstiges";
                    const groesse = idxGroesse !== -1 ? werte[idxGroesse] : "";
                    const zustand = idxZustand !== -1 ? werte[idxZustand] : "Neu";
                    const parsedBestand = parseFloat((idxBestand !== -1 ? werte[idxBestand] : "0").replace(',', '.')) || 0;
                    const parsedMindest = parseFloat((idxSoll !== -1 ? werte[idxSoll] : "0").replace(',', '.')) || 0;

                    // Suche nach bestehendem Artikel
                    let targetIndex = -1;
                    if (!moechteErsetzen) {
                        targetIndex = lagerDaten.findIndex(item => {
                            if (!item) return false;
                            const matchId = rawId && String(item.id).toLowerCase() === rawId.toLowerCase();
                            const matchArt = artNr && String(item.artikelnummer || item.artNr || "").toLowerCase() === artNr.toLowerCase();
                            return matchId || matchArt;
                        });
                    }

                    const neuesItem = {
                        id: (targetIndex !== -1) ? lagerDaten[targetIndex].id : (rawId || `LAGER_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`),
                        artikelnummer: artNr,
                        artNr: artNr,
                        bezeichnung: bezeichnung,
                        name: bezeichnung,
                        hersteller: hersteller,
                        kategorie: kategorie || "Sonstiges",
                        groesse: groesse,
                        größe: groesse,
                        zustand: zustand,
                        bestand: parsedBestand,
                        menge: parsedBestand,
                        mindestbestand: parsedMindest,
                        sollbestand: parsedMindest
                    };

                    if (targetIndex !== -1) {
                        lagerDaten[targetIndex] = neuesItem;
                        aktualisiert++;
                    } else {
                        lagerDaten.push(neuesItem);
                        neuHinzugefuegt++;
                    }
                }

                // 2. Speicher-Mechanismen auslösen
                if (typeof speichereLager === "function") speichereLager(lagerDaten);
                if (typeof speichereLagerDaten === "function") speichereLagerDaten(lagerDaten);
                if (typeof speichereDaten === "function") speichereDaten("lager", lagerDaten);
                
                localStorage.setItem("lager", JSON.stringify(lagerDaten));
                localStorage.setItem("lager_daten", JSON.stringify(lagerDaten));

                // 3. Ansicht neu laden
                if (typeof filterLager === "function") filterLager();
                if (typeof renderLagerView === "function") renderLagerView();
                if (typeof renderLager === "function") renderLager();
                if (typeof ladeLager === "function") ladeLager();

                window.dispatchEvent(new Event("lagerGeaendert"));
                window.dispatchEvent(new Event("storage"));

                alert(`✅ Lager-Import erfolgreich!\n\n• ${neuHinzugefuegt} neue Artikel hinzugefügt\n• ${aktualisiert} bestehende Artikel aktualisiert`);
                if (el) el.value = "";

            } catch (err) {
                alert("Fehler beim Lager-Import:\n" + err.message);
                if (el) el.value = "";
            }
        };

        reader.readAsText(file, "UTF-8");
    } catch (err) {
        alert("Fehler beim Starten des Lager-Imports:\n" + err.message);
    }
}
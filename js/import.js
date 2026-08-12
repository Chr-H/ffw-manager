function importLagerCSV(inputElement) {
    try {
        const file = inputElement.files[0];
        if (!file) return;

        // 1. Daten aus bestehenden Funktionen oder direkt aus localStorage laden
        let lagerDaten = [];
        if (typeof getLager === "function") {
            lagerDaten = getLager() || [];
        } else {
            const raw = localStorage.getItem("lager") || localStorage.getItem("lager_daten") || "[]";
            try { lagerDaten = JSON.parse(raw); } catch(e) { lagerDaten = []; }
        }

        const reader = new FileReader();
        reader.onerror = function() { alert("Fehler beim Lesen der Datei."); };

        reader.onload = function(e) {
            try {
                let text = e.target.result;
                if (text.charCodeAt(0) === 0xFEFF) text = text.substr(1);

                const zeilen = text.split(/\r\n|\n/).filter(z => z.trim() !== "");
                if (zeilen.length < 2) {
                    alert("Die Datei enthält keine Daten.");
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

                const idxKat = findIndex("kategorie", "kat");
                const idxBez = findIndex("bezeichnung", "name", "artikel");
                const idxGroesse = findIndex("groesse", "größe", "gr");
                const idxBestand = findIndex("bestand", "menge");
                const idxSoll = findIndex("mindest", "soll");
                const idxEinheit = findIndex("einheit");
                const idxOrt = findIndex("lagerort", "ort");

                let aktualisiert = 0;
                let neuHinzugefuegt = 0;

                for (let i = 1; i < zeilen.length; i++) {
                    const werte = zeilen[i]
                        .split(new RegExp(`${trenner}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
                        .map(w => w.replace(/^"|"$/g, '').trim());

                    if (werte.length === 0 || werte.every(v => v === "")) continue;

                    const kategorie = idxKat !== -1 ? werte[idxKat] : "";
                    const bezeichnung = idxBez !== -1 ? werte[idxBez] : "";
                    const groesse = idxGroesse !== -1 ? werte[idxGroesse] : "";
                    const bestand = idxBestand !== -1 ? werte[idxBestand] : "0";
                    const mindestbestand = idxSoll !== -1 ? werte[idxSoll] : "0";
                    const einheit = idxEinheit !== -1 ? werte[idxEinheit] : "Stk.";
                    const lagerort = idxOrt !== -1 ? werte[idxOrt] : "";

                    if (!bezeichnung) continue;

                    const parsedBestand = parseFloat(bestand.replace(',', '.')) || 0;
                    const parsedMindest = parseFloat(mindestbestand.replace(',', '.')) || 0;

                    // Suche nach exakt gleichem Artikel (Bezeichnung UND Größe)
                    const index = lagerDaten.findIndex(item => {
                        if (!item) return false;
                        const itemBez = String(item.bezeichnung || item.name || "").trim().toLowerCase();
                        const itemGr = String(item.groesse || item.größe || "").trim().toLowerCase();
                        return itemBez === bezeichnung.toLowerCase() && itemGr === groesse.toLowerCase();
                    });

                    // Suche nach Artikel OHNE Größe (falls aus alter Liste ohne Größe aktualisiert werden soll)
                    const indexOhneGroesse = (index === -1 && groesse) ? lagerDaten.findIndex(item => {
                        if (!item) return false;
                        const itemBez = String(item.bezeichnung || item.name || "").trim().toLowerCase();
                        const itemGr = String(item.groesse || item.größe || "").trim();
                        return itemBez === bezeichnung.toLowerCase() && (itemGr === "" || itemGr === "-");
                    }) : -1;

                    const targetIndex = index !== -1 ? index : indexOhneGroesse;

                    const neuesItem = {
                        id: targetIndex !== -1 ? lagerDaten[targetIndex].id : `LAGER_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
                        bezeichnung: bezeichnung,
                        name: bezeichnung,
                        kategorie: kategorie || (targetIndex !== -1 ? lagerDaten[targetIndex].kategorie : ""),
                        groesse: groesse,
                        größe: groesse,
                        bestand: parsedBestand,
                        menge: parsedBestand,
                        mindestbestand: parsedMindest,
                        sollbestand: parsedMindest,
                        einheit: einheit || "Stk.",
                        lagerort: lagerort || (targetIndex !== -1 ? lagerDaten[targetIndex].lagerort : ""),
                        ort: lagerort || (targetIndex !== -1 ? lagerDaten[targetIndex].lagerort : ""),
                        historie: targetIndex !== -1 ? (lagerDaten[targetIndex].historie || []) : []
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
                if (typeof speichereLager === "function") {
                    speichereLager(lagerDaten);
                }
                if (typeof speichereDaten === "function") {
                    speichereDaten("lager", lagerDaten);
                }
                
                // Redundantes Speichern direkt in LocalStorage (sichert alle üblichen Schluessel)
                localStorage.setItem("lager", JSON.stringify(lagerDaten));
                localStorage.setItem("lager_daten", JSON.stringify(lagerDaten));

                // 3. Ansicht neu laden und Custom-Events auslösen
                if (typeof filterLager === "function") filterLager();
                if (typeof renderLagerView === "function") renderLagerView();
                if (typeof renderLager === "function") renderLager();
                if (typeof ladeLager === "function") ladeLager();

                // Falls eure App auf ein Change-Event reagiert
                window.dispatchEvent(new Event("lagerGeaendert"));
                window.dispatchEvent(new Event("storage"));

                alert(`Lager-Import erfolgreich!\n\n- ${neuHinzugefuegt} neue Artikel hinzugefügt\n- ${aktualisiert} bestehende Artikel aktualisiert`);
                inputElement.value = "";
                
                // Seite / Tabelle zur Sicherheit neu rendern
                setTimeout(() => {
                    if (typeof filterLager === "function") filterLager();
                }, 100);

            } catch (err) {
                alert("Fehler beim Lager-Import:\n" + err.message);
            }
        };

        reader.readAsText(file, "UTF-8");
    } catch (err) {
        alert("Fehler beim Starten des Lager-Imports:\n" + err.message);
    }
}
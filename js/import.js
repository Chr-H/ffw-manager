/**
 * FFW Manager - Universal CSV Import Module
 * Liest CSV-Dateien (Semikolon- oder Komma-getrennt) ein und speichert sie in der Datenbank.
 */

// Hilfsfunktion zum Parsen von CSV-Zeilen mit Anführungszeichen & Trennzeichen
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    // Erkenne Trennzeichen (; oder ,)
    const firstLine = lines[0];
    const delimiter = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';

    const parseLine = (line) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                result.push(cur.trim());
                cur = '';
            } else {
                cur += char;
            }
        }
        result.push(cur.trim());
        return result;
    };

    return lines.map(parseLine);
}

// Allgemeine Import-Steuerung
function handleCSVImport(inputElement, moduleName, mappingFn) {
    const file = inputElement.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const rawData = parseCSV(e.target.result);
            if (rawData.length < 2) {
                alert("Die CSV-Datei enthält keine Datenzeilen außer der Kopfzeile.");
                return;
            }

            // Kopfzeile überspringen (Zeile 0)
            const rows = rawData.slice(1);
            const bestehendeDaten = typeof ladeDaten === "function" ? (ladeDaten(moduleName) || []) : [];
            const neueEintraege = [];

            rows.forEach((row, idx) => {
                const item = mappingFn(row, idx);
                if (item) {
                    neueEintraege.push(item);
                }
            });

            if (neueEintraege.length === 0) {
                alert("Es konnten keine gültigen Datensätze aus der CSV gelesen werden.");
                return;
            }

            const zusammengefuegt = [...bestehendeDaten, ...neueEintraege];
            
            if (typeof speichereDaten === "function") {
                speichereDaten(moduleName, zusammengefuegt);
                alert(`✅ Erfolg: ${neueEintraege.length} Datensätze wurden erfolgreich in '${moduleName}' importiert.`);
                
                // UI Views aktualisieren
                if (moduleName === 'geraete' && typeof filterGeraete === 'function') filterGeraete();
                if (moduleName === 'fahrzeuge' && typeof ladeFahrzeugTabelle === 'function') ladeFahrzeugTabelle();
                if (moduleName === 'psa' && typeof filterPSA === 'function') filterPSA();
                if (moduleName === 'lager' && typeof ladeLagerTabelle === 'function') ladeLagerTabelle();
            } else {
                alert("Fehler: Speicherfunktion steht nicht zur Verfügung.");
            }
        } catch (err) {
            console.error("CSV Import Fehler:", err);
            alert("Fehler beim Lesen der CSV-Datei. Bitte prüfen Sie das Dateiformat.");
        } finally {
            inputElement.value = ""; // Input zurücksetzen
        }
    };

    // ISO-8859-1 sorgt für korrekte deutsche Umlaute bei Excel-CSVs
    reader.readAsText(file, 'ISO-8859-1');
}

// 1. Import Geräte
// Spaltenerwartung: Inv-Nr | Bezeichnung | Kategorie | Hersteller | Standort | Baujahr | Status | Nächste Prüfung
function importGeraeteCSV(input) {
    handleCSVImport(input, 'geraete', (col, idx) => {
        if (!col[0] && !col[1]) return null;
        return {
            id: 'ger_' + Date.now() + '_' + idx,
            invNr: col[0] || ('INV-' + (Date.now() + idx)),
            bezeichnung: col[1] || 'Unbekanntes Gerät',
            kategorie: col[2] || 'Sonstiges',
            hersteller: col[3] || '-',
            standort: col[4] || '-',
            baujahr: col[5] || '',
            status: col[6] || 'Einsatzbereit',
            naechstePruefung: col[7] || ''
        };
    });
}

// 2. Import Fahrzeuge
// Spaltenerwartung: Funkrufname | Typ | Kennzeichen | Baujahr | TÜV | SP | Status
function importFahrzeugeCSV(input) {
    handleCSVImport(input, 'fahrzeuge', (col, idx) => {
        if (!col[0]) return null;
        return {
            id: 'fz_' + Date.now() + '_' + idx,
            funkrufname: col[0],
            typ: col[1] || '-',
            kennzeichen: col[2] || '-',
            baujahr: col[3] || '',
            tuev: col[4] || '',
            sp: col[5] || '',
            status: col[6] || 'Einsatzbereit',
            beladung: [],
            wartungen: [],
            pruefplan: []
        };
    });
}

// 3. Import PSA
// Spaltenerwartung: Träger / Name | Artikel | Größe | Seriennummer | Ausgegeben Am | Status
function importPSACSV(input) {
    handleCSVImport(input, 'psa', (col, idx) => {
        if (!col[0] && !col[1]) return null;
        return {
            id: 'psa_' + Date.now() + '_' + idx,
            traeger: col[0] || 'Unbekannt',
            artikel: col[1] || 'PSA Gegenstand',
            groesse: col[2] || '-',
            seriennummer: col[3] || '-',
            ausgegebenAm: col[4] || '',
            status: col[5] || 'Einsatzbereit'
        };
    });
}

// 4. Import Lager
// Spaltenerwartung: Artikelname | Kategorie | Bestand | Mindestbestand | Einheit | Lagerort
function importLagerCSV(input) {
    handleCSVImport(input, 'lager', (col, idx) => {
        if (!col[0]) return null;
        return {
            id: 'lag_' + Date.now() + '_' + idx,
            artikel: col[0],
            kategorie: col[1] || 'Verbrauchsmaterial',
            bestand: parseInt(col[2]) || 0,
            mindestbestand: parseInt(col[3]) || 0,
            einheit: col[4] || 'Stk.',
            lagerort: col[5] || '-'
        };
    });
}

// Globale Bereitstellung
window.importGeraeteCSV = importGeraeteCSV;
window.importFahrzeugeCSV = importFahrzeugeCSV;
window.importPSACSV = importPSACSV;
window.importLagerCSV = importLagerCSV;
// ==========================================
// FFW Manager - Hauptanwendung & Navigation
// ==========================================

function zeigeSeite(seitenId) {
    // 1. Alle Ansichten ausblenden
    const sektionen = document.querySelectorAll('.seite-ansicht');
    sektionen.forEach(sec => sec.style.display = 'none');

    // 2. Gewünschte Ansicht einblenden
    const id = seitenId.startsWith('seite-') ? seitenId : 'seite-' + seitenId;
    const zielSektion = document.getElementById(id);

    if (zielSektion) {
        zielSektion.style.display = 'block';
    } else {
        console.warn(`Sektion mit ID "${id}" wurde nicht gefunden.`);
        return;
    }

    // 3. Beim Seitenwechsel das jeweilige Modul neu rendern / aktualisieren
    const modul = seitenId.replace('seite-', '');

    switch (modul) {
        case 'dashboard':
            if (typeof aktualisiereDashboard === 'function') aktualisiereDashboard();
            break;

        case 'geraete':
            if (typeof renderGeraeteView === 'function') renderGeraeteView();
            else if (typeof filterGeraete === 'function') filterGeraete();
            break;

        case 'fahrzeuge':
            if (typeof renderFahrzeugeView === 'function') renderFahrzeugeView();
            break;

        case 'psa':
            if (typeof renderPSAView === 'function') renderPSAView();
            else if (typeof ladePSA === 'function') ladePSA();
            else if (typeof filterPSA === 'function') filterPSA();
            break;

        case 'lager':
            if (typeof renderLagerView === 'function') renderLagerView();
            else if (typeof ladeLager === 'function') ladeLager();
            break;

        case 'pruefungen':
            if (typeof renderPruefungenView === 'function') renderPruefungenView();
            else if (typeof ladePruefungen === 'function') ladePruefungen();
            break;

        default:
            console.log(`Navigation zu '${modul}' ausgeführt.`);
            break;
    }
}

// ==========================================
// Universelle Export- & Hilfsfunktionen (CSV / Excel)
// ==========================================

/**
 * Universeller CSV-Download mit UTF-8-BOM für korrekte Umlaute in MS Excel
 */
function downloadCSV(filename, headers, rows) {
    if (!rows || rows.length === 0) {
        alert("⚠️ Keine Daten zum Exportieren vorhanden.");
        return;
    }

    const csvLines = [];
    csvLines.push(headers.join(";"));

    rows.forEach(row => {
        const escapedRow = row.map(val => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        });
        csvLines.push(escapedRow.join(";"));
    });

    // \uFEFF erzwingt UTF-8 in Excel
    const csvContent = "\uFEFF" + csvLines.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export-Funktion für Prüfungen
 */
function exportPruefungenCSV() {
    let daten = [];
    
    if (typeof getPruefungen === "function") {
        daten = getPruefungen();
    } 
    if ((!daten || daten.length === 0) && typeof ladeDaten === "function") {
        daten = ladeDaten("pruefungen") || ladeDaten("ffw_pruefungen") || [];
    }
    if (!daten || daten.length === 0) {
        try {
            const raw = localStorage.getItem("pruefungen") || localStorage.getItem("ffw_pruefungen");
            if (raw) daten = JSON.parse(raw);
        } catch (e) {
            console.error("Fehler beim Lesen aus localStorage:", e);
        }
    }

    if (!Array.isArray(daten) || daten.length === 0) {
        alert("⚠️ Es wurden keine Prüfungsdaten zum Exportieren gefunden.");
        return;
    }

    const headers = ["ID", "Gegenstand / Objekt", "Prüfart", "Prüfdatum", "Nächste Prüfung", "Prüfer", "Ergebnis"];
    const rows = daten.map(item => [
        item.id || '',
        item.objekt || item.bezeichnung || '',
        item.art || '',
        item.datum || '',
        item.naechstePruefung || '',
        item.pruefer || '',
        item.ergebnis || 'Bestanden'
    ]);

    const heute = new Date().toISOString().split('T')[0];
    downloadCSV(`Pruefungen_FFW_${heute}.csv`, headers, rows);
}

/**
 * Export-Funktion für Geräte
 */
function exportGeraeteCSV() {
    let daten = [];
    
    if (typeof getGeraete === "function") {
        daten = getGeraete();
    }
    if ((!daten || daten.length === 0) && typeof ladeDaten === "function") {
        daten = ladeDaten("geraete") || ladeDaten("ffw_geraete") || [];
    }
    if (!daten || daten.length === 0) {
        try {
            const raw = localStorage.getItem("geraete") || localStorage.getItem("ffw_geraete");
            if (raw) daten = JSON.parse(raw);
        } catch (e) {
            console.error("Fehler beim Lesen aus localStorage:", e);
        }
    }

    if (!Array.isArray(daten) || daten.length === 0) {
        alert("⚠️ Es wurden keine Gerätedaten zum Exportieren gefunden.");
        return;
    }

    const headers = ["ID", "Bezeichnung", "Kategorie / Typ", "Fahrzeug / Standort", "Status", "Nächste Prüfung", "Seriennummer", "Bemerkung"];
    const rows = daten.map(g => [
        g.id || '',
        g.bezeichnung || g.name || '',
        g.kategorie || g.typ || '',
        g.standort || g.fahrzeug || '',
        g.status || '',
        g.naechstePruefung || g.pruefdatum || '',
        g.seriennummer || g.inventarnummer || '',
        g.bemerkung || g.notiz || ''
    ]);

    const heute = new Date().toISOString().split('T')[0];
    downloadCSV(`Geraeteliste_FFW_${heute}.csv`, headers, rows);
}

// ==========================================
// Druck- & PDF-Exportfunktionen
// ==========================================

function druckeListe(titel, tabelleId) {
    const tabelle = document.getElementById(tabelleId);
    
    if (!tabelle) {
        alert("Keine Daten zum Drucken vorhanden!");
        return;
    }

    const druckFenster = window.open('', '', 'width=900,height=700');
    const datum = new Date().toLocaleDateString('de-DE');

    druckFenster.document.write(`
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <title>${titel}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                .header { border-bottom: 2px solid #b30000; padding-bottom: 10px; margin-bottom: 20px; }
                .header h1 { margin: 0; color: #b30000; font-size: 20pt; }
                .header p { margin: 5px 0 0 0; font-size: 10pt; color: #666; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                .footer { margin-top: 60px; display: flex; justify-content: space-between; font-size: 10pt; }
                .unterschrift-linie { border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Freiwillige Feuerwehr – ${titel}</h1>
                <p>Erstellt am: ${datum}</p>
            </div>

            ${tabelle.outerHTML}

            <div class="footer">
                <div class="unterschrift-linie">Datum / Ort</div>
                <div class="unterschrift-linie">Unterschrift Prüfer / Gerätewart</div>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    window.close();
                };
            <\/script>
        </body>
        </html>
    `);

    druckFenster.document.close();
}

// Globale Freigabe
window.downloadCSV = downloadCSV;
window.exportPruefungenCSV = exportPruefungenCSV;
window.exportGeraeteCSV = exportGeraeteCSV;
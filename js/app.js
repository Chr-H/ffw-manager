// ==========================================
// FFW Manager - Hauptanwendung & Navigation
// ==========================================

/**
 * Navigationsfunktion zum Umschalten der Seiten
 */
function zeigeSeite(seiteId) {
    if (!seiteId) return;

    // 1. Parameter bereinigen (falls 'seite-benutzer' statt 'benutzer' übergeben wurde)
    const modul = seiteId.replace('seite-', '');

    // 2. Rechte-Prüfung vorschalten
    if (typeof window.pruefeSeitenZugriff === "function") {
        if (!window.pruefeSeitenZugriff(modul)) {
            return; // bricht ab, wenn keine Berechtigung vorliegt
        }
    }

    // 3. Alle Seiten ausblenden
    document.querySelectorAll('.seite-ansicht').forEach(s => {
        s.style.display = 'none';
    });

    // 4. Zielseite einblenden
    const ziel = document.getElementById('seite-' + modul);
    if (ziel) {
        ziel.style.display = 'block';
    } else {
        console.warn(`Seite mit ID 'seite-${modul}' wurde nicht gefunden.`);
        return;
    }

    // 5. Modul-spezifisches Rendern / Aktualisieren ausführen
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

        case 'benutzer':
            if (typeof renderBenutzerVerwaltung === 'function') renderBenutzerVerwaltung();
            break;

        default:
            console.log(`Navigation zu '${modul}' ausgeführt.`);
            break;
    }
}

// Explizit global verfügbar machen für HTML inline onclicks
window.zeigeSeite = zeigeSeite;


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
    URL.revokeObjectURL(url);
}

/**
 * Export-Funktion für Geräte
 */
function exportGeraeteCSV() {
    let daten = window.geraeteDaten || [];
    
    if ((!daten || daten.length === 0) && typeof ladeDaten === "function") {
        daten = ladeDaten("geraete") || ladeDaten("ffw_geraete") || [];
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
        g.inventar || g.seriennummer || g.inventarnummer || '',
        g.bemerkung || g.notiz || ''
    ]);

    const heute = new Date().toISOString().split('T')[0];
    downloadCSV(`Geraeteliste_FFW_${heute}.csv`, headers, rows);
}

/**
 * Export-Funktion für PSA
 */
function exportPSACSV() {
    const daten = typeof ladeDaten === "function" ? ladeDaten("psa") : [];
    if (!daten || daten.length === 0) {
        alert("⚠️ Keine PSA-Daten zum Exportieren vorhanden!");
        return;
    }

    const headers = ["Spind", "Träger", "Ausrüstung", "Größe", "Seriennummer", "Ausgabedatum", "Nächste Prüfung", "Status"];
    
    const rows = daten.map(p => [
        p.spind || "",
        p.traeger || p.name || "",
        p.bezeichnung || p.ausruestung || p.teil || "",
        p.groesse || "",
        p.seriennummer || "",
        p.ausgabeDatum || p.ausgabedatum || "",
        p.naechstePruefung || "",
        p.status || "Einsatzbereit"
    ]);

    downloadCSV(`PSA_Export_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

/**
 * Export-Funktion für Prüfungen
 */
function exportPruefungenCSV() {
    const geraete = typeof ladeDaten === "function" ? ladeDaten("geraete") : [];
    const psa = typeof ladeDaten === "function" ? ladeDaten("psa") : [];
    
    const allePruefungen = [
        ...geraete.map(g => ({ typ: 'Gerät', bez: g.bezeichnung, id: g.inventarnummer || g.seriennummer, datum: g.naechstePruefung, status: g.status })),
        ...psa.map(p => ({ typ: 'PSA', bez: `${p.traeger || p.person || 'Unbekannt'} - ${p.bezeichnung || p.teil}`, id: p.seriennummer, datum: p.naechstePruefung, status: p.status }))
    ];

    if (allePruefungen.length === 0) {
        alert("⚠️ Keine Prüfdaten zum Exportieren vorhanden!");
        return;
    }

    const headers = ["Typ", "Bezeichnung / Inhaber", "ID / Kennung", "Nächste Prüfung", "Status"];
    const rows = allePruefungen.map(p => [p.typ, p.bez, p.id, p.datum, p.status]);
    downloadCSV(`Pruefungen_Export_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}


// ==========================================
// Druck- & PDF-Exportfunktionen
// ==========================================

function druckeListe(titel, elementId) {
    const el = document.getElementById(elementId);
    if (!el) {
        alert("Fehler: Element mit ID '" + elementId + "' wurde nicht gefunden!");
        return;
    }

    let tabelle = el.tagName === "TABLE" ? el : el.querySelector("table");

    if (!tabelle || tabelle.rows.length <= 1) {
        alert("Keine Daten zum Drucken vorhanden!");
        return;
    }

    const druckKopie = tabelle.cloneNode(true);

    // Aktions-Spalten & no-print aus Druckkopie entfernen
    druckKopie.querySelectorAll('tr').forEach(row => {
        Array.from(row.cells).forEach(cell => {
            if (cell.querySelector('button') || cell.classList.contains('no-print')) {
                cell.remove();
            }
        });
    });

    druckKopie.querySelectorAll('.no-print').forEach(node => node.remove());

    const druckFenster = window.open('', '_blank', 'width=900,height=650');
    druckFenster.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${titel}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                h1 { font-size: 18pt; margin-bottom: 5px; }
                p { font-size: 10pt; color: #666; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; font-size: 10pt; }
                th { background-color: #f2f2f2; font-weight: bold; }
                tr:nth-child(even) { background-color: #fafafa; }
                @page { size: auto; margin: 15mm; }
            </style>
        </head>
        <body>
            <h1>Freiwillige Feuerwehr Albertsried - ${titel}</h1>
            <p>Erstellt am: ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')} Uhr</p>
            ${druckKopie.outerHTML}
        </body>
        </html>
    `);

    druckFenster.document.close();
    druckFenster.focus();
    setTimeout(() => {
        druckFenster.print();
        druckFenster.close();
    }, 300);
}


// ==========================================
// Automatischer PWA Installations-Prompt
// ==========================================

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Standard-Verhalten des Browsers verhindern
    e.preventDefault();
    deferredPrompt = e;

    // Kurze Verzögerung, damit die Seite sauber geladen ist
    setTimeout(() => {
        if (deferredPrompt) {
            // Nativen Installations-Dialog direkt aufrufen
            deferredPrompt.prompt();

            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('App-Installation akzeptiert.');
                }
                deferredPrompt = null;
            });
        }
    }, 1000); // 1 Sekunde nach Seitenaufruf
});
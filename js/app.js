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
            alert("⚠️ Sie besitzen keine Berechtigung für dieses Modul.");
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

        case 'personal':
            if (typeof initPersonalLayout === 'function') initPersonalLayout();
            if (typeof renderePersonalTabelle === 'function') renderePersonalTabelle();
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

        case 'einstellungen':
            if (typeof initEinstellungenLayout === 'function') initEinstellungenLayout();
            break;

        case 'auswertungen':
            if (typeof initAuswertungenLayout === 'function') initAuswertungenLayout();
            break;

        case 'zulassung':
            initZulassungLayout();
            break;

        default:
            console.log(`Navigation zu '${modul}' ausgeführt.`);
            break;
    }
}

// Explizit global verfügbar machen für HTML inline onclicks
window.zeigeSeite = zeigeSeite;

/**
 * Platzhalter für Module, die sich noch in Entwicklung befinden
 */
function zeigInEntwicklung(modulName) {
    const zielId = 'seite-' + modulName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const el = document.getElementById(zielId);

    if (el && !el.querySelector('.dev-notice')) {
        el.innerHTML = `
            <div class="dev-notice" style="text-align: center; padding: 50px 20px; background: #fff; border-radius: 8px; border: 1px dashed #ccc; margin-top: 20px;">
                <span style="font-size: 3rem;">🚧</span>
                <h2 style="margin-top: 10px;">${modulName}</h2>
                <p style="color: #666; font-size: 1.1em;">Dieses Modul befindet sich aktuell in Entwicklung und steht in Kürze zur Verfügung.</p>
            </div>
        `;
    }
}
window.zeigInEntwicklung = zeigInEntwicklung;


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
            return '"' + str + '"';
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
// PWA Installations-Prompt (Sauber per Nutzer-Klick)
// ==========================================

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Standard-Banner des Browsers verhindern
    e.preventDefault();
    deferredPrompt = e;

    // Optional: Hier einen eigenen "App installieren"-Button in der UI einblenden
    const installBtn = document.getElementById('btn-app-installieren');
    if (installBtn) {
        installBtn.style.display = 'block';
    }
});

/**
 * Diese Funktion wird aufgerufen, wenn der Nutzer auf "App installieren" klickt
 */
function installiereApp() {
    if (!deferredPrompt) {
        alert("Die App ist bereits installiert oder wird von diesem Browser nicht unterstützt.");
        return;
    }

    deferredPrompt.prompt();

    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('App-Installation akzeptiert.');
        }
        deferredPrompt = null;
    });
}

window.installiereApp = installiereApp;


// ==========================================
// Dashboard-Logik & Kennzahlen
// ==========================================

/**
 * Aktualisiert die Statuszahlen auf dem Dashboard
 */
function aktualisiereDashboard() {
    const geraete = JSON.parse(localStorage.getItem('ffw_geraete')) || [];
    const mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
    const fahrzeuge = JSON.parse(localStorage.getItem('ffw_fahrzeuge')) || [];
    const lager = JSON.parse(localStorage.getItem('ffw_lager')) || [];
    const psa = JSON.parse(localStorage.getItem('ffw_psa')) || [];
    const pruefungen = JSON.parse(localStorage.getItem('ffw_pruefungen')) || [];

    const heute = new Date();
    
    const ueberfaellig = pruefungen.filter(p => new Date(p.datum) < heute && p.status !== 'erledigt').length;
    
    const in30Tagen = new Date();
    in30Tagen.setDate(heute.getDate() + 30);
    const faellig = pruefungen.filter(p => {
        const d = new Date(p.datum);
        return d >= heute && d <= in30Tagen && p.status !== 'erledigt';
    }).length;

    const einsatzbereitCount = geraete.filter(g => g.status === 'einsatzbereit').length;
    const defektCount = geraete.filter(g => g.status === 'defekt' || g.status === 'inaktiv').length;

    setTileValue('stat-pruefungen-ueberfaellig', `${ueberfaellig} überfällig`);
    setTileValue('stat-wartung-faellig', `${faellig} fällig`);
    setTileValue('stat-einsatzbereit', `${einsatzbereitCount} Geräte einsatzbereit`);
    setTileValue('stat-defekt', `${defektCount} inaktiv`);

    setTileValue('stat-modul-geraete', `${geraete.length} Geräte`);
    setTileValue('stat-modul-fahrzeuge', `${fahrzeuge.length} Fahrzeuge`);
    setTileValue('stat-modul-psa', `${psa.length} Personen`);
    setTileValue('stat-modul-pruefungen', `${faellig + ueberfaellig} fällig`);
    setTileValue('stat-modul-lager', `${lager.length} Artikel`);
    setTileValue('stat-modul-personal', `${mitglieder.length} Mitglieder`);
}

window.updateDashboard = aktualisiereDashboard;
window.aktualisiereDashboard = aktualisiereDashboard;

function setTileValue(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = text;
}

document.addEventListener('DOMContentLoaded', () => {
    aktualisiereDashboard();
});


// ==========================================
// Modul: Zulassung beantragen (NEU VORHANDEN)
// ==========================================

function initZulassungLayout() {
    const ziel = document.getElementById('seite-zulassung');
    if (!ziel) return;

    const darfBeantragen = typeof window.hatRecht === "function" 
        ? window.hatRecht('zulassung_beantragen') 
        : true;

    ziel.innerHTML = `
        <h2>📋 Zulassung / Antrag stellen</h2>
        <p style="color: #666; margin-bottom: 20px;">Reichen Sie hier Anträge für neue Berechtigungen, Geräte oder Zugänge ein.</p>

        <div style="background: #fff; padding: 25px; border-radius: 8px; border: 1px solid #ddd; max-width: 600px;">
            <form onsubmit="beantrageZulassungForm(event)">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 5px;">Name des Antragstellers:</label>
                    <input type="text" id="antrag-name" required placeholder="Max Mustermann" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 5px;">Art des Antrags:</label>
                    <select id="antrag-art" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="Systemzugang">Systemzugang erweitern</option>
                        <option value="Geräteübernahme">Neue Geräteübernahme</option>
                        <option value="PSA-Anforderung">PSA Ausrüstungsanforderung</option>
                        <option value="Sonstiges">Sonstiges</option>
                    </select>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 5px;">Begründung / Anmerkung:</label>
                    <textarea id="antrag-grund" rows="4" required placeholder="Bitte begründen Sie Ihren Antrag..." style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"></textarea>
                </div>

                ${darfBeantragen 
                    ? `<button type="submit" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">📩 Antrag kostenfrei einreichen</button>`
                    : `<p style="color: #c00; font-weight: bold;">⚠️ Sie besitzen keine Berechtigung, einen Antrag zu stellen.</p>`
                }
            </form>
        </div>
    `;
}

function beantrageZulassungForm(event) {
    event.preventDefault();

    if (typeof window.hatRecht === "function" && !window.hatRecht('zulassung_beantragen')) {
        alert("⚠️ Sie besitzen keine Berechtigung, einen Zulassungsantrag zu stellen.");
        return;
    }

    const name = document.getElementById('antrag-name').value;
    const art = document.getElementById('antrag-art').value;
    const grund = document.getElementById('antrag-grund').value;

    const antraege = JSON.parse(localStorage.getItem('ffw_antraege')) || [];
    antraege.push({
        id: 'antrag_' + Date.now(),
        datum: new Date().toISOString(),
        name,
        art,
        grund,
        status: 'Ausstehend'
    });

    localStorage.setItem('ffw_antraege', JSON.stringify(antraege));

    alert("✅ Antrag erfolgreich eingereicht! Ein Administrator wird Ihre Anfrage prüfen.");
    initZulassungLayout(); // Formular zurücksetzen
}

window.initZulassungLayout = initZulassungLayout;
window.beantrageZulassungForm = beantrageZulassungForm;


// ==========================================
// Modul: Einstellungen Render-Logik & Speicher
// ==========================================

function initEinstellungenLayout() {
    const ziel = document.getElementById('seite-einstellungen');
    if (!ziel) return;

    const darfBearbeiten = typeof window.pruefeSeitenZugriff === "function" 
        ? window.pruefeSeitenZugriff('einstellungen_schreiben') 
        : true;

    const e = JSON.parse(localStorage.getItem('ffw_einstellungen')) || {
        wehrName: 'Freiwillige Feuerwehr Albertsried',
        wachenNummer: '101',
        adresse: 'Feuerwehrstraße 1, 12345 Albertsried',
        ansprechpartner: 'Kommandant Max Mustermann',
        vorlaufTagePruefung: 30,
        vorlaufTageWartung: 14
    };

    const readonlyAttr = darfBearbeiten ? '' : 'disabled';
    const speicherButtonHTML = darfBearbeiten 
        ? `<button onclick="speichereEinstellungen()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">💾 Einstellungen speichern</button>`
        : `<p style="color: #c00; font-weight: bold; margin-top: 10px;">⚠️ Sie besitzen keine Berechtigung, die Stammdaten zu verändern.</p>`;

    ziel.innerHTML = `
        <h2>⚙️ Einstellungen</h2>
        <div style="display: grid; gap: 20px; max-width: 800px; margin-top: 20px;">
            
            <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <h3>🏢 Feuerwehr Stammdaten</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
                    <label style="grid-column: span 2;">Name der Wehr:
                        <input type="text" id="cfg-wehr-name" value="${e.wehrName}" ${readonlyAttr} style="width: 100%; padding: 8px; margin-top: 4px;">
                    </label>
                    <label>Wachen-Nummer:
                        <input type="text" id="cfg-wachen-nummer" value="${e.wachenNummer}" ${readonlyAttr} style="width: 100%; padding: 8px; margin-top: 4px;">
                    </label>
                    <label>Ansprechpartner:
                        <input type="text" id="cfg-ansprechpartner" value="${e.ansprechpartner}" ${readonlyAttr} style="width: 100%; padding: 8px; margin-top: 4px;">
                    </label>
                    <label style="grid-column: span 2;">Adresse / Standort:
                        <input type="text" id="cfg-adresse" value="${e.adresse}" ${readonlyAttr} style="width: 100%; padding: 8px; margin-top: 4px;">
                    </label>
                </div>
            </div>

            <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <h3>🔔 Vorlaufzeiten & Erinnerungen</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
                    <label>Erinnerung Prüfungen (Tage vorher):
                        <input type="number" id="cfg-vorlauf-pruefung" value="${e.vorlaufTagePruefung}" ${readonlyAttr} style="width: 100%; padding: 8px; margin-top: 4px;">
                    </label>
                    <label>Erinnerung Wartungen (Tage vorher):
                        <input type="number" id="cfg-vorlauf-wartung" value="${e.vorlaufTageWartung}" ${readonlyAttr} style="width: 100%; padding: 8px; margin-top: 4px;">
                    </label>
                </div>
                ${speicherButtonHTML}
            </div>

            <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <h3>💾 System-Backup (JSON)</h3>
                <p style="color: #666; font-size: 0.9em;">Exportiert die Systemdaten basierend auf Ihren aktuellen Benutzerrechten.</p>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button onclick="exportiereSystemBackupGesichert()" style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Backup herunterladen (JSON)</button>
                </div>
            </div>

        </div>
    `;
}


// ==========================================
// Modul: Auswertungen Render-Logik
// ==========================================

function initAuswertungenLayout() {
    const ziel = document.getElementById('seite-auswertungen');
    if (!ziel) return;

    const darfLesen = (modul) => {
        if (typeof window.pruefeSeitenZugriff === "function") {
            return window.pruefeSeitenZugriff(modul);
        }
        return true;
    };

    const geraete = darfLesen('geraete') ? (JSON.parse(localStorage.getItem('ffw_geraete')) || []) : [];
    const mitglieder = darfLesen('personal') ? (JSON.parse(localStorage.getItem('ffw_mitglieder')) || []) : [];
    const psa = darfLesen('psa') ? (JSON.parse(localStorage.getItem('ffw_psa')) || []) : [];
    const fahrzeuge = darfLesen('fahrzeuge') ? (JSON.parse(localStorage.getItem('ffw_fahrzeuge')) || []) : [];
    const pruefungen = darfLesen('pruefungen') ? (JSON.parse(localStorage.getItem('ffw_pruefungen')) || []) : [];

    const heute = new Date();
    const ueberfaellig = pruefungen.filter(p => new Date(p.datum) < heute && p.status !== 'erledigt').length;
    const einsatzbereit = geraete.filter(g => g.status === 'einsatzbereit').length;
    const defekt = geraete.filter(g => g.status === 'defekt' || g.status === 'inaktiv').length;

    ziel.innerHTML = `
        <h2>📊 Auswertungen & Kennzahlen</h2>
        <p style="color: #666; margin-bottom: 20px;">Systemweite Übersicht zum aktuellen Status der Feuerwehr.</p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 15px;">
            
            <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <h3>🚒 Geräte-Status</h3>
                <p><strong>Einsatzbereit:</strong> ${einsatzbereit}</p>
                <p><strong>Defekt / Inaktiv:</strong> ${defekt}</p>
                <p><strong>Gesamtanzahl:</strong> ${geraete.length}</p>
            </div>

            <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <h3>📋 Prüfungs-Status</h3>
                <p><strong>Überfällige Prüfungen:</strong> <span style="color: ${ueberfaellig > 0 ? '#c00' : '#28a745'}; font-weight: bold;">${ueberfaellig}</span></p>
                <p><strong>Gesamte Einträge:</strong> ${pruefungen.length}</p>
            </div>

            <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <h3>🥾 PSA & Ausrüstung</h3>
                <p><strong>Zugewiesene Ausrüstung:</strong> ${darfLesen('psa') ? psa.length + ' Teile' : '🔒 Keine Berechtigung'}</p>
            </div>

            <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <h3>👥 Personal & Fahrzeuge</h3>
                <p><strong>Mitglieder:</strong> ${darfLesen('personal') ? mitglieder.length : '🔒 Keine Berechtigung'}</p>
                <p><strong>Fahrzeuge:</strong> ${fahrzeuge.length}</p>
            </div>

        </div>
    `;
}

function speichereEinstellungen() {
    if (typeof window.pruefeSeitenZugriff === "function" && !window.pruefeSeitenZugriff('einstellungen_schreiben')) {
        alert("⚠️ Keine Berechtigung zum Speichern vorhanden.");
        return;
    }

    const neueEinstellungen = {
        wehrName: document.getElementById('cfg-wehr-name').value,
        wachenNummer: document.getElementById('cfg-wachen-nummer').value,
        ansprechpartner: document.getElementById('cfg-ansprechpartner').value,
        adresse: document.getElementById('cfg-adresse').value,
        vorlaufTagePruefung: parseInt(document.getElementById('cfg-vorlauf-pruefung').value, 10) || 30,
        vorlaufTageWartung: parseInt(document.getElementById('cfg-vorlauf-wartung').value, 10) || 14
    };

    localStorage.setItem('ffw_einstellungen', JSON.stringify(neueEinstellungen));
    alert("✅ Einstellungen erfolgreich gespeichert!");
}

function exportiereSystemBackupGesichert() {
    const darfLesen = (modul) => {
        if (typeof window.pruefeSeitenZugriff === "function") {
            return window.pruefeSeitenZugriff(modul);
        }
        return true;
    };

    const backupData = {
        exportiertAm: new Date().toISOString(),
        einstellungen: JSON.parse(localStorage.getItem('ffw_einstellungen')) || {}
    };

    if (darfLesen('geraete')) backupData.geraete = JSON.parse(localStorage.getItem('ffw_geraete')) || [];
    if (darfLesen('fahrzeuge')) backupData.fahrzeuge = JSON.parse(localStorage.getItem('ffw_fahrzeuge')) || [];
    if (darfLesen('lager')) backupData.lager = JSON.parse(localStorage.getItem('ffw_lager')) || [];
    if (darfLesen('pruefungen')) backupData.pruefungen = JSON.parse(localStorage.getItem('ffw_pruefungen')) || [];
    
    if (darfLesen('personal')) {
        backupData.mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
    } else {
        console.warn("Personal-Export übersprungen (keine Lese-Berechtigung).");
    }

    if (darfLesen('psa')) {
        backupData.psa = JSON.parse(localStorage.getItem('ffw_psa')) || [];
    } else {
        console.warn("PSA-Export übersprungen (keine Lese-Berechtigung).");
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `FFW_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
}


// ==========================================
// Rollen- & Rechte-System (Korrigiert)
// ==========================================

const ROLLEN_CONFIG = {
    admin: {
        seiten: ['dashboard', 'personal', 'geraete', 'fahrzeuge', 'psa', 'lager', 'pruefungen', 'benutzer', 'einstellungen', 'auswertungen', 'zulassung'],
        schreibrechte: ['*']
    },
    editor: {
        seiten: ['dashboard', 'personal', 'geraete', 'fahrzeuge', 'psa', 'lager', 'pruefungen', 'auswertungen', 'zulassung'],
        schreibrechte: ['geraete_schreiben', 'fahrzeuge_schreiben', 'psa_schreiben', 'lager_schreiben', 'pruefungen_schreiben', 'zulassung_beantragen']
    },
    viewer: {
        seiten: ['dashboard', 'personal', 'geraete', 'fahrzeuge', 'psa', 'lager', 'pruefungen', 'auswertungen'],
        schreibrechte: []
    },
    gast: {
        // Gast hat nun Zugriff auf Dashboard, Geräte, Fahrzeuge und das Zulassungsformular
        seiten: ['dashboard', 'geraete', 'zulassung', 'fahrzeuge'],
        // Explizites Recht, Anträge einzureichen
        schreibrechte: ['zulassung_beantragen']
    }
};

/**
 * Robustere Rollenabfrage (prüft sowohl 'rolle' als auch 'role')
 */
function holeAktuelleRolle() {
    const user = JSON.parse(localStorage.getItem('ffw_aktiver_benutzer')) || {};
    // Unterstützt sowohl user.rolle als auch user.role (Groß-/Kleinschreibung ignoriert)
    const rolle = (user.rolle || user.role || 'gast').toLowerCase();
    
    // Fallback-Schutz: Falls Rolle ungültig ist, nutze gast
    return ROLLEN_CONFIG[rolle] ? rolle : 'gast';
}

function hatRecht(recht) {
    const rolle = holeAktuelleRolle();
    const rechteDef = ROLLEN_CONFIG[rolle];

    // Admin / Vollzugriff
    if (rechteDef.schreibrechte.includes('*')) return true;

    // Seiten- oder Schreibrecht vorhanden?
    return rechteDef.seiten.includes(recht) || rechteDef.schreibrechte.includes(recht);
}

window.holeAktuelleRolle = holeAktuelleRolle;
window.pruefeSeitenZugriff = hatRecht;
window.hatRecht = hatRecht;
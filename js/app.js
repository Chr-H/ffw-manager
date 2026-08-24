// ==========================================
// FFW Manager - Hauptanwendung & Navigation
// ==========================================

/**
 * Navigationsfunktion zum Umschalten der Seiten
 */
function zeigeSeite(seiteId) {
    if (!seiteId) return;

    // 1. Parameter bereinigen
    const modul = seiteId.replace(/^seite-/, '');

    // 2. Rechte-Prüfung vorschalten
    if (typeof window.pruefeSeitenZugriff === "function") {
        if (!window.pruefeSeitenZugriff(modul)) {
            alert("⚠️ Sie besitzen keine Berechtigung für dieses Modul.");
            return;
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
            if (typeof initZulassungLayout === 'function') initZulassungLayout();
            break;

        default:
            console.log(`Navigation zu '${modul}' ausgeführt.`);
            break;
    }
}

window.zeigeSeite = zeigeSeite;

/**
 * Platzhalter für Module in Entwicklung
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
// Universelle Export- & Hilfsfunktionen (CSV / Excel / LocalStorage)
// ==========================================

function ladeDaten(key) {
    try {
        const daten = localStorage.getItem('ffw_' + key);
        return daten ? JSON.parse(daten) : [];
    } catch (e) {
        console.error(`Fehler beim Laden von ffw_${key}:`, e);
        return [];
    }
}

function speichereDaten(key, daten) {
    try {
        localStorage.setItem('ffw_' + key, JSON.stringify(daten));
        if (typeof aktualisiereDashboard === 'function') {
            aktualisiereDashboard();
        }
    } catch (e) {
        console.error(`Fehler beim Speichern von ffw_${key}:`, e);
    }
}

window.ladeDaten = ladeDaten;
window.speichereDaten = speichereDaten;

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

function exportPSACSV() {
    const daten = ladeDaten("psa");
    if (!daten || daten.length === 0) {
        alert("⚠️ Keine PSA-Daten zum Exportieren vorhanden!");
        return;
    }

    // Erweiterter Header
    const headers = ["Spind", "Träger", "Hersteller", "Typ", "Ausrüstung", "Größe", "Zubehör", "Seriennummer / Inv-Nr", "Ausgabedatum", "Nächste Prüfung", "Status"];
    
    const rows = daten.map(p => [
        p.spind || "",
        p.traeger || p.name || "",
        p.hersteller || "-",
        p.typ || "-",
        p.bezeichnung || p.ausruestung || p.teil || "",
        p.groesse || "",
        p.zubehoer || "-",
        p.seriennummer || p.inventarnummer || "-", // Bricht ohne Nr. nicht mehr ab
        p.ausgabeDatum || p.ausgabedatum || "",
        p.naechstePruefung || "",
        p.status || "Einsatzbereit"
    ]);

    downloadCSV(`PSA_Export_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

function exportPruefungenCSV() {
    const geraete = ladeDaten("geraete");
    const psa = ladeDaten("psa");
    
    const allePruefungen = [
        ...geraete.map(g => ({ typ: 'Gerät', bez: g.bezeichnung || 'Gerät', id: g.inventarnummer || g.seriennummer || '-', datum: g.naechstePruefung, status: g.status })),
        ...psa.map(p => ({ typ: 'PSA', bez: `${p.traeger || p.person || 'Unbekannt'} - ${p.bezeichnung || p.teil}`, id: p.seriennummer || '-', datum: p.naechstePruefung, status: p.status }))
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

    druckKopie.querySelectorAll('tr').forEach(row => {
        Array.from(row.cells).forEach(cell => {
            if (cell.querySelector('button') || cell.classList.contains('no-print')) {
                cell.remove();
            }
        });
    });

    druckKopie.querySelectorAll('.no-print').forEach(node => node.remove());

    const druckFenster = window.open('', '_blank', 'width=900,height=650');
    if (!druckFenster) {
        alert("Pop-up wurde vom Browser blockiert. Bitte erlauben Sie Pop-ups für diese Seite.");
        return;
    }

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
// PWA Installations-Prompt
// ==========================================

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    const installBtn = document.getElementById('btn-app-installieren');
    if (installBtn) {
        installBtn.style.display = 'block';
    }
});

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

function aktualisiereDashboard() {
    try {
        const geraete = ladeDaten('geraete');
        const mitglieder = ladeDaten('personal');
        const fahrzeuge = ladeDaten('fahrzeuge');
        const lager = ladeDaten('lager');
        const psa = ladeDaten('psa');
        const pruefungen = ladeDaten('pruefungen');

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
    } catch (e) {
        console.error("Fehler beim Aktualisieren des Dashboards:", e);
    }
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
// Modul: Zulassung beantragen
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

    const antraege = ladeDaten('antraege');
    antraege.push({
        id: 'antrag_' + Date.now(),
        datum: new Date().toISOString(),
        name,
        art,
        grund,
        status: 'Ausstehend'
    });

    speichereDaten('antraege', antraege);

    alert("✅ Antrag erfolgreich eingereicht! Ein Administrator wird Ihre Anfrage prüfen.");
    initZulassungLayout();
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

    if (darfLesen('geraete')) backupData.geraete = ladeDaten('geraete');
    if (darfLesen('fahrzeuge')) backupData.fahrzeuge = ladeDaten('fahrzeuge');
    if (darfLesen('lager')) backupData.lager = ladeDaten('lager');
    if (darfLesen('pruefungen')) backupData.pruefungen = ladeDaten('pruefungen');
    if (darfLesen('personal')) backupData.personal = ladeDaten('personal');
    if (darfLesen('psa')) backupData.psa = ladeDaten('psa');

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `FFW_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
}

window.speichereEinstellungen = speichereEinstellungen;
window.exportiereSystemBackupGesichert = exportiereSystemBackupGesichert;


// ==========================================
// Firebase-Anbindung
// ==========================================

if (typeof firebase !== 'undefined') {
    const firebaseConfig = {
        apiKey: "AIzaSyA8toPLitz2AUXz9f0m-h_WCqsK-g_PNyk",
        authDomain: "ffw-albertsried.firebaseapp.com",
        projectId: "ffw-albertsried",
        storageBucket: "ffw-albertsried.appspot.com",
        messagingSenderId: "45591494617",
        appId: "1:45591494617:web:46ddf894c840871212e3c8"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.firestore();

    db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Offline-Speicher: Mehrere Tabs geöffnet.');
            } else if (err.code === 'unimplemented') {
                console.warn('Browser unterstützt keinen Offline-Speicher.');
            }
        });

    window.db = db;
} else {
    console.warn("Firebase JS-SDK wurde nicht geladen. Lokale Speicherung wird verwendet.");
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

    const geraete = darfLesen('geraete') ? ladeDaten('geraete') : [];
    const mitglieder = darfLesen('personal') ? ladeDaten('personal') : [];
    const psa = darfLesen('psa') ? ladeDaten('psa') : [];
    const fahrzeuge = darfLesen('fahrzeuge') ? ladeDaten('fahrzeuge') : [];
    const pruefungen = darfLesen('pruefungen') ? ladeDaten('pruefungen') : [];

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

window.initAuswertungenLayout = initAuswertungenLayout;


// ==========================================
// Rollen-, Rechte- & Authentifizierungs-System
// ==========================================

const ROLLEN_CONFIG = {
    admin: {
        seiten: ['dashboard', 'personal', 'geraete', 'fahrzeuge', 'psa', 'lager', 'pruefungen', 'benutzer', 'einstellungen', 'auswertungen', 'zulassung'],
        schreibrechte: ['*']
    },
    editor: {
        seiten: ['dashboard', 'personal', 'geraete', 'fahrzeuge', 'psa', 'lager', 'pruefungen', 'auswertungen', 'zulassung'],
        schreibrechte: ['geraete_schreiben', 'fahrzeuge_schreiben', 'psa_schreiben', 'lager_schreiben', 'pruefungen_schreiben', 'zulassung_beantragen', 'personal_schreiben', 'einstellungen_schreiben']
    },
    viewer: {
        seiten: ['dashboard', 'personal', 'geraete', 'fahrzeuge', 'psa', 'lager', 'pruefungen', 'auswertungen'],
        schreibrechte: []
    },
    gast: {
        seiten: ['dashboard', 'geraete', 'zulassung', 'fahrzeuge'],
        schreibrechte: ['zulassung_beantragen']
    }
};

function holeAktuelleRolle() {
    let user = null;
    try {
        const rawUser = localStorage.getItem('ffw_aktiver_benutzer') || localStorage.getItem('ffw_user');
        if (rawUser) {
            user = JSON.parse(rawUser);
        }
    } catch (e) {
        console.error("Fehler beim Lesen des Benutzers aus dem localStorage:", e);
    }

    if (!user) {
        return 'gast';
    }

    const rolle = String(user.rolle || user.role || 'gast').toLowerCase().trim();
    return ROLLEN_CONFIG[rolle] ? rolle : 'gast';
}

function hatRecht(recht) {
    const rolle = holeAktuelleRolle();
    const rechteDef = ROLLEN_CONFIG[rolle];

    if (!rechteDef) return false;

    if (rechteDef.schreibrechte && rechteDef.schreibrechte.includes('*')) {
        return true;
    }

    const hatSeitenRecht = rechteDef.seiten && rechteDef.seiten.includes(recht);
    const hatSchreibRecht = rechteDef.schreibrechte && rechteDef.schreibrechte.includes(recht);

    return hatSeitenRecht || hatSchreibRecht;
}

function anmeldenBenutzer(benutzerdaten) {
    if (!benutzerdaten || !benutzerdaten.rolle) {
        console.error("Ungültige Benutzerdaten übergeben.");
        return;
    }
    
    localStorage.setItem('ffw_aktiver_benutzer', JSON.stringify(benutzerdaten));
    localStorage.removeItem('ffw_user');
    location.reload();
}

function abmelden() {
    localStorage.removeItem('ffw_aktiver_benutzer');
    localStorage.removeItem('ffw_user');
    sessionStorage.clear();
    location.reload();
}

window.holeAktuelleRolle = holeAktuelleRolle;
window.hatRecht = hatRecht;
window.anmeldenBenutzer = anmeldenBenutzer;
window.abmelden = abmelden;
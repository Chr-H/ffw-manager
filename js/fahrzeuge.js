// ==========================================
// Modul: Fahrzeuge (fahrzeuge.js)
// ==========================================

// Initialer / Lokaler Datenspeicher
let fahrzeugeDaten = [];

/**
 * Hilfsfunktion zum Laden der Fahrzeugdaten aus LocalStorage
 */
function ladeFahrzeugDaten() {
    fahrzeugeDaten = JSON.parse(localStorage.getItem('ffw_fahrzeuge')) || [
        {
            id: 'f1',
            funkrufname: 'Florian Albertsried 40/1',
            typ: 'LF 10',
            kennzeichen: 'REG-FW 101',
            baujahr: '2018',
            status: 'Einsatzbereit',
            bemerkung: 'Erstangriffsfahrzeug'
        },
        {
            id: 'f2',
            funkrufname: 'Florian Albertsried 11/1',
            typ: 'MZF',
            kennzeichen: 'REG-FW 111',
            baujahr: '2015',
            status: 'Einsatzbereit',
            bemerkung: 'Mannschaftstransport & Einsatzleitung'
        }
    ];
    return fahrzeugeDaten;
}

/**
 * Hilfsfunktion zum Speichern der Fahrzeugdaten in LocalStorage
 */
function speichereFahrzeugDaten() {
    localStorage.setItem('ffw_fahrzeuge', JSON.stringify(fahrzeugeDaten));
    if (typeof window.aktualisiereDashboard === 'function') {
        window.aktualisiereDashboard();
    }
}

/**
 * Haupt-Renderfunktion für die Fahrzeug-Ansicht
 */
function renderFahrzeugeView() {
    const ziel = document.getElementById('seite-fahrzeuge');
    if (!ziel) return;

    // Prüfen, ob der Benutzer Schreibrechte besitzt (Gast/Viewer haben keine 'fahrzeuge_schreiben' Rechte)
    const kannSchreiben = typeof window.hatRecht === 'function' ? window.hatRecht('fahrzeuge_schreiben') : false;

    const daten = ladeFahrzeugDaten();

    // HTML-Aktionsbereich für neue Fahrzeuge
    const erstelleButtonHTML = kannSchreiben 
        ? `<button onclick="oeffneFahrzeugModal()" style="padding: 10px 15px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">➕ Neues Fahrzeug anlegen</button>`
        : `<p style="color: #666; font-style: italic;">🔒 Sie besitzen nur Leserechte für dieses Modul.</p>`;

    // Tabellenzeilen generieren
    const zeilenHTML = daten.map(f => {
        const aktionsButtons = kannSchreiben ? `
            <button onclick="bearbeiteFahrzeug('${f.id}')" style="padding: 5px 10px; background: #ffc107; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px;">✏️ Bearbeiten</button>
            <button onclick="loescheFahrzeug('${f.id}')" style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">🗑️ Löschen</button>
        ` : `<span style="color: #999;">Keine Aktionen</span>`;

        return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>${f.funkrufname}</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${f.typ}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${f.kennzeichen || '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${f.baujahr || '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                    <span style="padding: 3px 8px; border-radius: 12px; font-size: 0.85em; background: ${f.status === 'Einsatzbereit' ? '#d4edda' : '#f8d7da'}; color: ${f.status === 'Einsatzbereit' ? '#155724' : '#721c24'}; font-weight: bold;">
                        ${f.status}
                    </span>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${f.bemerkung || ''}</td>
                <td class="no-print" style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${aktionsButtons}</td>
            </tr>
        `;
    }).join('');

    ziel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>🚒 Fahrzeugübersicht</h2>
            <div>${erstelleButtonHTML}</div>
        </div>

        <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="background: #f8f9fa; border-bottom: 2px solid #ddd;">
                        <th style="padding: 10px;">Funkrufname</th>
                        <th style="padding: 10px;">Fahrzeugtyp</th>
                        <th style="padding: 10px;">Kennzeichen</th>
                        <th style="padding: 10px;">Baujahr</th>
                        <th style="padding: 10px;">Status</th>
                        <th style="padding: 10px;">Bemerkung</th>
                        <th class="no-print" style="padding: 10px; text-align: right;">Aktionen</th>
                    </tr>
                </thead>
                <tbody>
                    ${daten.length > 0 ? zeilenHTML : '<tr><td colspan="7" style="padding: 20px; text-align: center; color: #777;">Keine Fahrzeuge vorhanden.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Fahrzeug löschen (Geschützt)
 */
function loescheFahrzeug(id) {
    if (typeof window.hatRecht === 'function' && !window.hatRecht('fahrzeuge_schreiben')) {
        alert("⚠️ Sie besitzen keine Berechtigung, Fahrzeuge zu löschen.");
        return;
    }

    if (confirm("Möchten Sie dieses Fahrzeug wirklich löschen?")) {
        fahrzeugeDaten = fahrzeugeDaten.filter(f => f.id !== id);
        speichereFahrzeugDaten();
        renderFahrzeugeView();
    }
}

/**
 * Modal zum Erstellen/Bearbeiten öffnen (Geschützt)
 */
function oeffneFahrzeugModal(id = null) {
    if (typeof window.hatRecht === 'function' && !window.hatRecht('fahrzeuge_schreiben')) {
        alert("⚠️ Sie besitzen keine Berechtigung, Fahrzeuge zu bearbeiten oder neu anzulegen.");
        return;
    }

    const fahrzeug = id ? fahrzeugeDaten.find(f => f.id === id) : { id: '', funkrufname: '', typ: '', kennzeichen: '', baujahr: '', status: 'Einsatzbereit', bemerkung: '' };

    const funkrufname = prompt("Funkrufname:", fahrzeug.funkrufname);
    if (funkrufname === null) return; // Abbrechen gedrückt

    const typ = prompt("Fahrzeugtyp (z.B. LF 10, MZF):", fahrzeug.typ) || '';
    const kennzeichen = prompt("Kennzeichen:", fahrzeug.kennzeichen) || '';
    const baujahr = prompt("Baujahr:", fahrzeug.baujahr) || '';
    const bemerkung = prompt("Bemerkung:", fahrzeug.bemerkung) || '';

    if (id) {
        // Bearbeiten
        const idx = fahrzeugeDaten.findIndex(f => f.id === id);
        if (idx !== -1) {
            fahrzeugeDaten[idx] = { ...fahrzeugeDaten[idx], funkrufname, typ, kennzeichen, baujahr, bemerkung };
        }
    } else {
        // Neu anlegen
        const neuesFahrzeug = {
            id: 'f_' + Date.now(),
            funkrufname,
            typ,
            kennzeichen,
            baujahr,
            status: 'Einsatzbereit',
            bemerkung
        };
        fahrzeugeDaten.push(neuesFahrzeug);
    }

    speichereFahrzeugDaten();
    renderFahrzeugeView();
}

/**
 * Alias-Funktion für Bearbeiten
 */
function bearbeiteFahrzeug(id) {
    oeffneFahrzeugModal(id);
}

// Global verfügbar machen
window.renderFahrzeugeView = renderFahrzeugeView;
window.loescheFahrzeug = loescheFahrzeug;
window.bearbeiteFahrzeug = bearbeiteFahrzeug;
window.oeffneFahrzeugModal = oeffneFahrzeugModal;
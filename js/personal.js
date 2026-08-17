// ==========================================
// PERSONAL-MODUL LOGIK (personal.js)
// ==========================================

/**
 * Erzeugt das HTML-Grundgerüst im Container #seite-personal
 */
function initPersonalLayout() {
    const container = document.getElementById('seite-personal');
    if (!container) return;

    if (container.querySelector('.table-container')) return;

    container.innerHTML = `
        <div class="module-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
            <h2>👥 Personalverwaltung</h2>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="btn btn-secondary" onclick="exportPersonalCSV()" title="Als CSV für Excel exportieren">📊 CSV Export</button>
                <button class="btn btn-secondary" onclick="exportPersonalJSON()" title="Als JSON-Datei sichern">💾 Backup (JSON)</button>
                <button class="btn btn-secondary" onclick="document.getElementById('import-personal-file').click()" title="JSON-Sicherung wiederherstellen">📂 Import</button>
                <input type="file" id="import-personal-file" accept=".json" style="display: none;" onchange="importPersonalJSON(event)">
                <button class="btn btn-primary" onclick="oeffneMitgliedModal()">➕ Neues Mitglied</button>
            </div>
        </div>

        <!-- Such- und Filterleiste -->
        <div class="filter-bar" style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
            <input type="text" id="personal-suche" placeholder="🔍 Name, Dienstgrad, Bemerkung..." oninput="renderePersonalTabelle()" style="flex: 1; min-width: 200px; padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
            <select id="personal-filter-funktion" onchange="renderePersonalTabelle()" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
                <option value="">Alle Funktionen</option>
                <option value="Kommandant">Kommandant/in</option>
                <option value="Gruppenführer">Gruppenführer/in</option>
                <option value="Maschinist">Maschinist/in</option>
                <option value="Atemschutzträger">Atemschutzträger/in</option>
                <option value="Gerätewart">Gerätewart/in</option>
                <option value="Jugendwart">Jugendwart/in</option>
            </select>
            <select id="personal-filter-g26" onchange="renderePersonalTabelle()" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
                <option value="">G26.3 Status (Alle)</option>
                <option value="gueltig">G26.3 Gültig</option>
                <option value="abgelaufen">G26.3 Fällig / Abgelaufen</option>
            </select>
        </div>

        <!-- Tabelle der Mitglieder -->
        <div class="table-container" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f4f4f4; text-align: left;">
                        <th style="padding: 10px; border-bottom: 2px solid #ddd;">Name</th>
                        <th style="padding: 10px; border-bottom: 2px solid #ddd;">Dienstgrad</th>
                        <th style="padding: 10px; border-bottom: 2px solid #ddd;">Funktionen</th>
                        <th style="padding: 10px; border-bottom: 2px solid #ddd;">G26.3 (Atemschutz)</th>
                        <th style="padding: 10px; border-bottom: 2px solid #ddd;">Lehrgänge</th>
                        <th style="padding: 10px; border-bottom: 2px solid #ddd;">Bemerkung</th>
                        <th style="padding: 10px; border-bottom: 2px solid #ddd;">Aktionen</th>
                    </tr>
                </thead>
                <tbody id="personal-tabelle-body">
                    <!-- Dynamischer Inhalt -->
                </tbody>
            </table>
        </div>

        <!-- MODAL: Mitglied anlegen / bearbeiten -->
        <div id="modal-mitglied" class="modal" style="display: none; position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: #fff; padding: 20px; border-radius: 8px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; color: #333;">
                <h3 id="modal-mitglied-titel">Neues Mitglied anlegen</h3>
                <form id="form-mitglied" onsubmit="speichereMitglied(event)">
                    <input type="hidden" id="mitglied-id">

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                        <div>
                            <label>Vorname *</label>
                            <input type="text" id="mitglied-vorname" required style="width: 100%; padding: 8px; margin-top: 4px; box-sizing: border-box;">
                        </div>
                        <div>
                            <label>Nachname *</label>
                            <input type="text" id="mitglied-nachname" required style="width: 100%; padding: 8px; margin-top: 4px; box-sizing: border-box;">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                        <div>
                            <label>Dienstgrad</label>
                            <select id="mitglied-dienstgrad" style="width: 100%; padding: 8px; margin-top: 4px; box-sizing: border-box;">
                                <option value="Feuerwehranwärter/in">Feuerwehranwärter/in</option>
                                <option value="Feuerwehrmann / -frau">Feuerwehrmann / -frau</option>
                                <option value="Oberfeuerwehrmann / -frau">Oberfeuerwehrmann / -frau</option>
                                <option value="Hauptfeuerwehrmann / -frau">Hauptfeuerwehrmann / -frau</option>
                                <option value="Löschmeister/in">Löschmeister/in</option>
                                <option value="Oberlöschmeister/in">Oberlöschmeister/in</option>
                                <option value="Hauptlöschmeister/in">Hauptlöschmeister/in</option>
                                <option value="Brandmeister/in">Brandmeister/in</option>
                                <option value="Oberbrandmeister/in">Oberbrandmeister/in</option>
                                <option value="Hauptbrandmeister/in">Hauptbrandmeister/in</option>
                            </select>
                        </div>
                        <div>
                            <label>Eintrittsdatum</label>
                            <input type="date" id="mitglied-eintritt" style="width: 100%; padding: 8px; margin-top: 4px; box-sizing: border-box;">
                        </div>
                    </div>

                    <div style="margin-top: 15px;">
                        <label><strong>Funktionen (Mehrfachauswahl):</strong></label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; background: #f9f9f9; padding: 10px; border-radius: 6px; border: 1px solid #eee;">
                            <label><input type="checkbox" class="cb-funktion" value="Kommandant"> Kommandant/in</label>
                            <label><input type="checkbox" class="cb-funktion" value="Gruppenführer"> Gruppenführer/in</label>
                            <label><input type="checkbox" class="cb-funktion" value="Maschinist"> Maschinist/in</label>
                            <label><input type="checkbox" class="cb-funktion" value="Atemschutzträger"> Atemschutzträger/in</label>
                            <label><input type="checkbox" class="cb-funktion" value="Gerätewart"> Gerätewart/in</label>
                            <label><input type="checkbox" class="cb-funktion" value="Jugendwart"> Jugendwart/in</label>
                            <label><input type="checkbox" class="cb-funktion" value="Atemschutzgerätewart"> Atemschutzgerätewart/in</label>
                            <label><input type="checkbox" class="cb-funktion" value="Sicherheitsbeauftragter"> Sicherheitsbeauftragter/in</label>
                        </div>
                    </div>

                    <div style="margin-top: 15px; background: #fff8e1; padding: 10px; border-radius: 6px; border: 1px solid #ffe0b2;">
                        <label><strong>🧯 Atemschutz (G26.3 Tauglichkeit):</strong></label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 6px;">
                            <div>
                                <label>G26.3 Gültig bis:</label>
                                <input type="date" id="mitglied-g26datum" style="width: 100%; padding: 8px; margin-top: 4px; box-sizing: border-box;">
                            </div>
                            <div>
                                <label>Letzte Übung/Einsatz:</label>
                                <input type="date" id="mitglied-atemschutzuebung" style="width: 100%; padding: 8px; margin-top: 4px; box-sizing: border-box;">
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 15px;">
                        <label><strong>Absolvierte Lehrgänge (Kommagetrennt):</strong></label>
                        <input type="text" id="mitglied-lehrgaenge" placeholder="z. B. MTA, AGT, Maschinist, GF" style="width: 100%; padding: 8px; margin-top: 4px; box-sizing: border-box;">
                    </div>

                    <!-- Kommentarfeld / Notizen -->
                    <div style="margin-top: 15px;">
                        <label><strong>Kommentar / Bemerkungen:</strong></label>
                        <textarea id="mitglied-kommentar" rows="3" placeholder="Führerscheinklassen, Notizen, Besondere Ausbildungen etc." style="width: 100%; padding: 8px; margin-top: 4px; box-sizing: border-box; border-radius: 4px; border: 1px solid #ccc; font-family: inherit;"></textarea>
                    </div>

                    <div style="margin-top: 20px; text-align: right; display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" onclick="schliesseMitgliedModal()">Abbrechen</button>
                        <button type="submit" class="btn btn-primary">Speichern</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

/**
 * Rendert die Mitglieder in die HTML-Tabelle
 */
function renderePersonalTabelle() {
    initPersonalLayout();

    const tbody = document.getElementById('personal-tabelle-body');
    if (!tbody) return;

    const mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
    const suche = (document.getElementById('personal-suche')?.value || '').toLowerCase();
    const filterFunktion = document.getElementById('personal-filter-funktion')?.value || '';
    const filterG26 = document.getElementById('personal-filter-g26')?.value || '';

    const heute = new Date();

    const gefiltert = mitglieder.filter(m => {
        const fullText = `${m.vorname} ${m.nachname} ${m.dienstgrad} ${m.kommentar || ''}`.toLowerCase();
        const matchesSuche = fullText.includes(suche);
        const matchesFunktion = filterFunktion === '' || (m.funktionen && m.funktionen.includes(filterFunktion));

        let matchesG26 = true;
        if (filterG26 === 'gueltig') {
            matchesG26 = m.g26datum && new Date(m.g26datum) >= heute;
        } else if (filterG26 === 'abgelaufen') {
            matchesG26 = !m.g26datum || new Date(m.g26datum) < heute;
        }

        return matchesSuche && matchesFunktion && matchesG26;
    });

    if (gefiltert.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 15px; color: #777;">Keine Mitglieder gefunden.</td></tr>`;
        return;
    }

    tbody.innerHTML = gefiltert.map(m => {
        let g26Badge = '<span style="color: #888;">N/A</span>';
        if (m.g26datum) {
            const g26Date = new Date(m.g26datum);
            const in30Tagen = new Date();
            in30Tagen.setDate(heute.getDate() + 30);
            const dateFormatted = g26Date.toLocaleDateString('de-DE');

            if (g26Date < heute) {
                g26Badge = `<span style="background: #ffebee; color: #c62828; padding: 4px 8px; border-radius: 4px; font-weight: bold;">🔴 Abgelaufen (${dateFormatted})</span>`;
            } else if (g26Date <= in30Tagen) {
                g26Badge = `<span style="background: #fff3e0; color: #ef6c00; padding: 4px 8px; border-radius: 4px; font-weight: bold;">🟡 Fällig (${dateFormatted})</span>`;
            } else {
                g26Badge = `<span style="background: #e8f5e9; color: #2e7d32; padding: 4px 8px; border-radius: 4px;">🟢 Gültig (${dateFormatted})</span>`;
            }
        }

        const funktionenBadges = (m.funktionen || []).map(f => 
            `<span style="background: #e1f5fe; color: #0277bd; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; margin-right: 4px; display: inline-block; margin-bottom: 2px;">${f}</span>`
        ).join('') || '<span style="color:#aaa;">Keine</span>';

        const lehrgaengeStr = m.lehrgaenge ? m.lehrgaenge : '-';
        const kommentarStr = m.kommentar ? `<span title="${m.kommentar}">💬 ${m.kommentar.length > 25 ? m.kommentar.substring(0, 25) + '...' : m.kommentar}</span>` : '-';

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;"><strong>${m.nachname}</strong>, ${m.vorname}</td>
                <td style="padding: 10px;">${m.dienstgrad || '-'}</td>
                <td style="padding: 10px;">${funktionenBadges}</td>
                <td style="padding: 10px;">${g26Badge}</td>
                <td style="padding: 10px; font-size: 0.9em; color: #444;">${lehrgaengeStr}</td>
                <td style="padding: 10px; font-size: 0.85em; color: #666;">${kommentarStr}</td>
                <td style="padding: 10px;">
                    <button class="btn btn-sm" onclick="bearbeiteMitglied('${m.id}')" title="Bearbeiten">✏️</button>
                    <button class="btn btn-sm" onclick="loescheMitglied('${m.id}')" title="Löschen" style="color: red;">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Öffnet das Modal
 */
function oeffneMitgliedModal(mitgliedId = null) {
    initPersonalLayout();

    const modal = document.getElementById('modal-mitglied');
    const form = document.getElementById('form-mitglied');
    if (!modal || !form) return;

    form.reset();
    document.querySelectorAll('.cb-funktion').forEach(cb => cb.checked = false);

    if (mitgliedId) {
        const mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
        const m = mitglieder.find(x => x.id === mitgliedId);
        if (m) {
            document.getElementById('modal-mitglied-titel').textContent = 'Mitglied bearbeiten';
            document.getElementById('mitglied-id').value = m.id;
            document.getElementById('mitglied-vorname').value = m.vorname || '';
            document.getElementById('mitglied-nachname').value = m.nachname || '';
            document.getElementById('mitglied-dienstgrad').value = m.dienstgrad || 'Feuerwehrmann / -frau';
            document.getElementById('mitglied-eintritt').value = m.eintritt || '';
            document.getElementById('mitglied-g26datum').value = m.g26datum || '';
            document.getElementById('mitglied-atemschutzuebung').value = m.atemschutzuebung || '';
            document.getElementById('mitglied-lehrgaenge').value = m.lehrgaenge || '';
            document.getElementById('mitglied-kommentar').value = m.kommentar || '';

            if (m.funktionen && Array.isArray(m.funktionen)) {
                document.querySelectorAll('.cb-funktion').forEach(cb => {
                    if (m.funktionen.includes(cb.value)) cb.checked = true;
                });
            }
        }
    } else {
        document.getElementById('modal-mitglied-titel').textContent = 'Neues Mitglied anlegen';
        document.getElementById('mitglied-id').value = '';
    }

    modal.style.display = 'flex';
}

function schliesseMitgliedModal() {
    const modal = document.getElementById('modal-mitglied');
    if (modal) modal.style.display = 'none';
}

/**
 * Speichert das Mitglied
 */
function speichereMitglied(event) {
    event.preventDefault();

    const id = document.getElementById('mitglied-id').value || 'm_' + Date.now();
    const vorname = document.getElementById('mitglied-vorname').value;
    const nachname = document.getElementById('mitglied-nachname').value;
    const dienstgrad = document.getElementById('mitglied-dienstgrad').value;
    const eintritt = document.getElementById('mitglied-eintritt').value;
    const g26datum = document.getElementById('mitglied-g26datum').value;
    const atemschutzuebung = document.getElementById('mitglied-atemschutzuebung').value;
    const lehrgaenge = document.getElementById('mitglied-lehrgaenge').value;
    const kommentar = document.getElementById('mitglied-kommentar').value;

    const funktionen = [];
    document.querySelectorAll('.cb-funktion:checked').forEach(cb => {
        funktionen.push(cb.value);
    });

    const neuesMitglied = {
        id, vorname, nachname, dienstgrad, eintritt,
        g26datum, atemschutzuebung, lehrgaenge, kommentar, funktionen
    };

    let mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
    const index = mitglieder.findIndex(m => m.id === id);

    if (index >= 0) {
        mitglieder[index] = neuesMitglied;
    } else {
        mitglieder.push(neuesMitglied);
    }

    localStorage.setItem('ffw_mitglieder', JSON.stringify(mitglieder));
    schliesseMitgliedModal();
    renderePersonalTabelle();
    if (typeof updateDashboard === 'function') updateDashboard();
}

/**
 * Löscht ein Mitglied
 */
function loescheMitglied(id) {
    if (!confirm('Möchtest du dieses Mitglied wirklich löschen?')) return;

    let mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
    mitglieder = mitglieder.filter(m => m.id !== id);
    localStorage.setItem('ffw_mitglieder', JSON.stringify(mitglieder));

    renderePersonalTabelle();
    if (typeof updateDashboard === 'function') updateDashboard();
}

function bearbeiteMitglied(id) {
    oeffneMitgliedModal(id);
}

// ==========================================
// Export & Import Funktionen
// ==========================================

/**
 * Exportiert die Personalakte als CSV (mit UTF-8 BOM für Excel)
 */
function exportPersonalCSV() {
    const mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];

    if (mitglieder.length === 0) {
        alert("⚠️ Keine Personaldaten zum Exportieren vorhanden.");
        return;
    }

    const headers = ["ID", "Nachname", "Vorname", "Dienstgrad", "Eintritt", "Funktionen", "G26.3 Datum", "Atemschutz Übung", "Lehrgänge", "Kommentar"];
    
    const rows = mitglieder.map(m => [
        m.id || '',
        m.nachname || '',
        m.vorname || '',
        m.dienstgrad || '',
        m.eintritt || '',
        (m.funktionen || []).join(', '),
        m.g26datum || '',
        m.atemschutzuebung || '',
        m.lehrgaenge || '',
        m.kommentar || ''
    ]);

    if (typeof downloadCSV === 'function') {
        downloadCSV(`Personalakte_FFW_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    } else {
        const csvLines = [headers.join(";")];
        rows.forEach(r => csvLines.push(r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")));
        const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Personalakte_FFW_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }
}

/**
 * Exportiert Personaldaten als JSON-Sicherungsdatei
 */
function exportPersonalJSON() {
    const mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mitglieder, null, 2));
    const link = document.createElement("a");
    link.href = dataStr;
    link.download = `Personal_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

/**
 * Importiert Personaldaten aus einer JSON-Sicherungsdatei
 */
function importPersonalJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importDaten = JSON.parse(e.target.result);
            if (!Array.isArray(importDaten)) {
                alert("⚠️ Ungültiges Dateiformat. Es wird eine JSON-Liste erwartet.");
                return;
            }

            if (confirm(`Möchtest du ${importDaten.length} Mitglieder importieren und bestehende Daten ersetzen?`)) {
                localStorage.setItem('ffw_mitglieder', JSON.stringify(importDaten));
                renderePersonalTabelle();
                if (typeof updateDashboard === 'function') updateDashboard();
                alert("✅ Personaldaten erfolgreich importiert!");
            }
        } catch (err) {
            alert("❌ Fehler beim Einlesen der Datei: " + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
}

// Global verfügbar machen
window.initPersonalLayout = initPersonalLayout;
window.renderePersonalTabelle = renderePersonalTabelle;
window.oeffneMitgliedModal = oeffneMitgliedModal;
window.schliesseMitgliedModal = schliesseMitgliedModal;
window.speichereMitglied = speichereMitglied;
window.loescheMitglied = loescheMitglied;
window.bearbeiteMitglied = bearbeiteMitglied;
window.exportPersonalCSV = exportPersonalCSV;
window.exportPersonalJSON = exportPersonalJSON;
window.importPersonalJSON = importPersonalJSON;
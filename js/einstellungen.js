// ==========================================
// EINSTELLUNGEN-MODUL LOGIK (einstellungen.js)
// ==========================================

function initEinstellungenLayout() {
    const container = document.getElementById('seite-einstellungen');
    if (!container || container.querySelector('.einstellungen-grid')) return;

    container.innerHTML = `
        <div class="module-header" style="margin-bottom: 20px;">
            <h2>⚙️ Systemeinstellungen & Datenverwaltung</h2>
        </div>

        <div class="einstellungen-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
            
            <!-- Stammdaten der Feuerwehr -->
            <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <h3>🚒 Stammdaten der Wehr</h3>
                <form id="form-einstellungen" onsubmit="speichereEinstellungen(event)">
                    <div style="margin-bottom: 12px;">
                        <label style="display:block; margin-bottom: 4px; font-weight: bold;">Name der Feuerwehr</label>
                        <input type="text" id="cfg-wehrname" placeholder="z. B. Freiwillige Feuerwehr Musterstadt" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label style="display:block; margin-bottom: 4px; font-weight: bold;">Kommandant / Leitung</label>
                        <input type="text" id="cfg-kommandant" placeholder="Max Mustermann" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label style="display:block; margin-bottom: 4px; font-weight: bold;">E-Mail Kontakadresse</label>
                        <input type="email" id="cfg-email" placeholder="info@feuerwehr-musterstadt.de" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label style="display:block; margin-bottom: 4px; font-weight: bold;">Erinnerungsvorlauf Prüfungen (Tage)</label>
                        <input type="number" id="cfg-pruefintervall" value="30" min="1" max="90" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <button type="submit" class="btn btn-primary" style="margin-top: 10px;">💾 Stammdaten speichern</button>
                </form>
            </div>

            <!-- Gesamtsystem Backup & Restore -->
            <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <h3>💾 Daten-Backup & Wiederherstellung</h3>
                <p style="font-size: 0.9em; color: #666; margin-bottom: 15px;">Sichere alle Datenbankinhalte (Personal, Geräte, Fahrzeuge, PSA, Lager, Prüfungen) in einer Datei.</p>
                
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button class="btn btn-secondary" onclick="exportGesamtBackup()" style="padding: 10px; text-align: left;">
                        📥 <strong>Vollständiges Backup herunterladen (JSON)</strong>
                    </button>
                    
                    <button class="btn btn-secondary" onclick="document.getElementById('import-backup-file').click()" style="padding: 10px; text-align: left;">
                        📤 <strong>Backup wiederherstellen (JSON)</strong>
                    </button>
                    <input type="file" id="import-backup-file" accept=".json" style="display: none;" onchange="importGesamtBackup(event)">
                    
                    <hr style="margin: 15px 0; border: 0; border-top: 1px solid #eee;">
                    
                    <button class="btn" onclick="systemZuruecksetzen()" style="background: #ffebee; color: #c62828; border: 1px solid #ef9a9a; padding: 10px; text-align: left;">
                        ⚠️ <strong>System-Daten komplett zurücksetzen</strong>
                    </button>
                </div>
            </div>

        </div>
    `;
}

function ladeEinstellungen() {
    initEinstellungenLayout();
    const config = JSON.parse(localStorage.getItem('ffw_config')) || {};
    
    if (document.getElementById('cfg-wehrname')) document.getElementById('cfg-wehrname').value = config.wehrname || '';
    if (document.getElementById('cfg-kommandant')) document.getElementById('cfg-kommandant').value = config.kommandant || '';
    if (document.getElementById('cfg-email')) document.getElementById('cfg-email').value = config.email || '';
    if (document.getElementById('cfg-pruefintervall')) document.getElementById('cfg-pruefintervall').value = config.pruefintervall || 30;
}

function speichereEinstellungen(e) {
    e.preventDefault();
    const config = {
        wehrname: document.getElementById('cfg-wehrname').value,
        kommandant: document.getElementById('cfg-kommandant').value,
        email: document.getElementById('cfg-email').value,
        pruefintervall: document.getElementById('cfg-pruefintervall').value
    };

    localStorage.setItem('ffw_config', JSON.stringify(config));
    alert('✅ Einstellungen erfolgreich gespeichert!');
}

function exportGesamtBackup() {
    const backupData = {
        version: "1.0",
        exportDatum: new Date().toISOString(),
        config: JSON.parse(localStorage.getItem('ffw_config')) || {},
        mitglieder: JSON.parse(localStorage.getItem('ffw_mitglieder')) || [],
        geraete: JSON.parse(localStorage.getItem('ffw_geraete')) || [],
        fahrzeuge: JSON.parse(localStorage.getItem('ffw_fahrzeuge')) || [],
        psa: JSON.parse(localStorage.getItem('ffw_psa')) || [],
        lager: JSON.parse(localStorage.getItem('ffw_lager')) || [],
        pruefungen: JSON.parse(localStorage.getItem('ffw_pruefungen')) || []
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `FFW_Manager_Gesamtbackup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function importGesamtBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm("⚠️ ACHTUNG: Möchtest du das Gesamtbackup einspielen? Alle aktuellen Daten werden überschrieben!")) {
                if (data.config) localStorage.setItem('ffw_config', JSON.stringify(data.config));
                if (data.mitglieder) localStorage.setItem('ffw_mitglieder', JSON.stringify(data.mitglieder));
                if (data.geraete) localStorage.setItem('ffw_geraete', JSON.stringify(data.geraete));
                if (data.fahrzeuge) localStorage.setItem('ffw_fahrzeuge', JSON.stringify(data.fahrzeuge));
                if (data.psa) localStorage.setItem('ffw_psa', JSON.stringify(data.psa));
                if (data.lager) localStorage.setItem('ffw_lager', JSON.stringify(data.lager));
                if (data.pruefungen) localStorage.setItem('ffw_pruefungen', JSON.stringify(data.pruefungen));

                alert("✅ Wiederherstellung erfolgreich abgeschlossen!");
                location.reload();
            }
        } catch (err) {
            alert("❌ Fehler beim Einlesen des Backups: " + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function systemZuruecksetzen() {
    const eingabe = prompt("⚠️ ACHTUNG! Dies löscht ALLE Daten in der Anwendung!\n\nTippe 'LÖSCHEN' ein, um fortzufahren:");
    if (eingabe === 'LÖSCHEN') {
        localStorage.clear();
        alert("System wurde auf den Werkszustand zurückgesetzt.");
        location.reload();
    }
}

window.initEinstellungenLayout = initEinstellungenLayout;
window.ladeEinstellungen = ladeEinstellungen;
window.speichereEinstellungen = speichereEinstellungen;
window.exportGesamtBackup = exportGesamtBackup;
window.importGesamtBackup = importGesamtBackup;
window.systemZuruecksetzen = systemZuruecksetzen;
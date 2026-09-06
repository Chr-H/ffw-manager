// ==========================================
// FFW Manager - Vollständiges JSON-Backup & Restore (v1.0)
// ==========================================

const BACKUP_SCHLUESSEL = [
    'geraete', 
    'fahrzeuge', 
    'kategorien', 
    'psa', 
    'lager', 
    'pruefungen', 
    'personal'
];

/**
 * Erstellt ein vollständiges JSON-Backup aller lokalen Daten inklusive aller verschachtelten Strukturen (Historien, Akten etc.).
 */
function erstelleVollstaendigesBackup() {
    try {
        const gesamtBackup = {
            version: "6.2.9-stabil",
            erstelltAm: new Date().toISOString(),
            daten: {}
        };

        // Alle bekannten Schlüssel aus dem localStorage auslesen
        BACKUP_SCHLUESSEL.forEach(schluessel => {
            // Nutzen der bereits vorhandenen ladeDaten-Funktion aus storage.js
            if (typeof window.ladeDaten === 'function') {
                gesamtBackup.daten[schluessel] = window.ladeDaten(schluessel);
            } else {
                // Fallback direkt auf localStorage, falls storage.js noch nicht geladen sein sollte
                const roh = localStorage.getItem('ffw_' + schluessel);
                try {
                    gesamtBackup.daten[schluessel] = roh ? JSON.parse(roh) : [];
                } catch (e) {
                    gesamtBackup.daten[schluessel] = [];
                }
            }
        });

        // Als JSON-Datei zum Download anbieten
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gesamtBackup, null, 2));
        const downloadAnchor = document.createElement('a');
        const datumStr = new Date().toISOString().slice(0, 10);
        
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `ffw_komplett_backup_${datumStr}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        console.log("✅ Vollständiges Backup erfolgreich erstellt und heruntergeladen.");
        alert("Das vollständige Backup wurde erfolgreich erstellt und heruntergeladen!");
    } catch (fehler) {
        console.error("❌ Fehler beim Erstellen des Komplett-Backups:", fehler);
        alert("Fehler beim Erstellen des Backups: " + fehler.message);
    }
}

/**
 * Liest eine JSON-Backup-Datei ein, validiert sie und schreibt sie in den localStorage & Firebase zurück.
 * @param {Event} event - Das Change-Event des Datei-Input-Felds
 */
function ladeVollstaendigesBackup(event) {
    const datei = event.target.files[0];
    if (!datei) return;

    constleser = new FileReader();
    konverterLesen(datei, leser);
}

function konverterLesen(datei, leser) {
    leser.onload = function(e) {
        try {
            const backupInhalt = JSON.parse(e.target.result);

            // Validierung der Grundstruktur
            if (!backupInhalt || !backupInhalt.daten || typeof backupInhalt.daten !== 'object') {
                throw new Error("Ungültiges Backup-Dateiformat. Die Datei enthält keine gültigen FFW-Manager-Daten.");
            }

            const sicherheitsFrage = confirm("ACHTUNG: Beim Wiederherstellen eines Backups werden die aktuell vorhandenen lokalen Daten überschrieben! Möchtest du fortfahren?");
            if (!sicherheitsFrage) {
                // Input zurücksetzen
                document.getElementById('backupFileInput').value = '';
                return;
            }

            // Daten abspeichern
            BACKUP_SCHLUESSEL.forEach(schluessel => {
                if (backupInhalt.daten[schluessel] && Array.isArray(backupInhalt.daten[schluessel])) {
                    const datenPaket = backupInhalt.daten[schluessel];
                    
                    // Nutzen der zentralen speichereDaten-Funktion (schreibt lokal UND synchronisiert mit Firebase!)
                    if (typeof window.speichereDaten === 'function') {
                        window.speichereDaten(schluessel, datenPaket);
                    } else {
                        localStorage.setItem('ffw_' + schluessel, JSON.stringify(datenPaket));
                    }
                }
            });

            console.log("✅ Backup erfolgreich wiederhergestellt.");
            alert("Backup wurde erfolgreich eingelesen und wiederhergestellt! Die Seite wird nun neu geladen.");
            
            // Seite neu laden, damit alle Ansichten die neuen Daten sauber einlesen
            window.location.reload();

        } catch (fehler) {
            console.error("❌ Fehler beim Einlesen des Backups:", fehler);
            alert("Fehler beim Wiederherstellen: " + fehler.message);
        }
    };
    leser.readAsText(datei);
}

// Globale Freigaben für andere Skripte
window.erstelleVollstaendigesBackup = erstelleVollstaendigesBackup;
window.ladeVollstaendigesBackup = ladeVollstaendigesBackup;
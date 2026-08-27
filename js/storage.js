// ==========================================
// FFW Manager - Speicher & Cloud-Sync (v1.8 Korrigiert & Stabil)
// ==========================================

// 1. Daten aus dem Speicher laden (Fallback auf LocalStorage)
function ladeDaten(schluessel) {
    const lokal = localStorage.getItem('ffw_' + schluessel);
    try {
        const parsed = JSON.parse(lokal);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error(`Fehler beim Lesen von ffw_${schluessel}:`, e);
        return [];
    }
}

// Personal-Helper
function ladePersonalData() { return ladeDaten('personal'); }
function speicherePersonalData(daten) { return speichereDaten('personal', daten); }

function speichereMitgliedData(mitglied) {
    let alle = ladePersonalData();
    const index = alle.findIndex(m => String(m.id) === String(mitglied.id));
    if (index >= 0) alle[index] = mitglied;
    else alle.push(mitglied);
    return speicherePersonalData(alle);
}

function loescheMitgliedData(id) {
    let alle = ladePersonalData();
    alle = alle.filter(m => String(m.id) !== String(id));
    return speicherePersonalData(alle);
}

// PSA-Helper
function ladePsaData() { return ladeDaten('psa'); }
function speicherePsaData(daten) { return speichereDaten('psa', daten); }

function speicherePsaEintrag(psaItem) {
    let alle = ladePsaData();
    const index = alle.findIndex(p => String(p.id) === String(psaItem.id));
    if (index >= 0) alle[index] = psaItem;
    else alle.push(psaItem);
    return speicherePsaData(alle);
}

function loeschePsaEintrag(id) {
    let alle = ladePsaData();
    alle = alle.filter(p => String(p.id) !== String(id));
    return speicherePsaData(alle);
}

// Fahrzeug-Helper (Neu hinzugefügt für Konsistenz)
function ladeFahrzeugeData() { return ladeDaten('fahrzeuge'); }
function speichereFahrzeugeData(daten) { return speichereDaten('fahrzeuge', daten); }

// 2. Daten lokal & in Firebase Cloud speichern (Robuste Version)
function speichereDaten(schluessel, daten) {
    const bereinigteDaten = Array.isArray(daten) ? daten : [];
    
    // 1. IMMER sofort im Browser speichern
    localStorage.setItem('ffw_' + schluessel, JSON.stringify(bereinigteDaten));

    // 2. In Firebase speichern mit automatischer Wartefunktion, falls db noch lädt
    const versucheSpeichern = (versuch = 1) => {
        if (typeof window.db !== 'undefined' && window.db !== null) {
            window.db.collection('ffw_data').doc(schluessel).set({
                eintraege: bereinigteDaten,
                aktualisiertAm: new Date().toISOString()
            })
            .then(() => {
                console.log(`[Cloud Sync] ${schluessel} erfolgreich in Firebase gespeichert.`);
            })
            .catch(err => {
                console.error(`❌ Firebase Speicherfehler bei ${schluessel}:`, err);
            });
        } else if (versuch < 5) {
            // Falls Firebase noch nicht geladen ist, 0.5 Sekunden warten und nochmal versuchen
            setTimeout(() => versucheSpeichern(versuch + 1), 500);
        } else {
            console.error(`❌ Konnte ${schluessel} nicht in Firebase speichern: window.db ist nicht verfügbar.`);
        }
    };

    versucheSpeichern();
    return true;
}

let cloudSyncGestartet = false;

// 3. Live-Synchronisation mit Firebase (mit Schutz vor Überschreiben)
function starteCloudSync() {
    console.log("Cloud-Sync ist testweise deaktiviert.");
}

// 4. Initialisierung
document.addEventListener("DOMContentLoaded", () => {
    starteCloudSync();
});

// Globale Freigaben
window.ladeDaten = ladeDaten;
window.speichereDaten = speichereDaten;
window.ladePersonalData = ladePersonalData;
window.speicherePersonalData = speicherePersonalData;
window.speichereMitgliedData = speichereMitgliedData;
window.loescheMitgliedData = loescheMitgliedData;
window.ladePsaData = ladePsaData;
window.speicherePsaData = speicherePsaData;
window.speicherePsaEintrag = speicherePsaEintrag;
window.loeschePsaEintrag = loeschePsaEintrag;
window.ladeFahrzeugeData = ladeFahrzeugeData;
window.speichereFahrzeugeData = speichereFahrzeugeData;
window.starteCloudSync = starteCloudSync;
// ==========================================
// FFW Manager - Speicher & Cloud-Sync (v1.3 Repariert)
// ==========================================

// 1. Daten aus dem Speicher laden (Fallback auf LocalStorage)
function ladeDaten(schluessel) {
    const lokal = localStorage.getItem('ffw_' + schluessel);
    try {
        const parsed = JSON.parse(lokal);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

// Spezifische Helper-Funktionen für Personal
function ladePersonalData() {
    return ladeDaten('personal');
}

function speicherePersonalData(daten) {
    speichereDaten('personal', daten);
}

function speichereMitgliedData(mitglied) {
    let alle = ladePersonalData();
    const index = alle.findIndex(m => m.id === mitglied.id);
    if (index >= 0) {
        alle[index] = mitglied;
    } else {
        alle.push(mitglied);
    }
    speicherePersonalData(alle);
}

function loescheMitgliedData(id) {
    let alle = ladePersonalData();
    alle = alle.filter(m => m.id !== id);
    speicherePersonalData(alle);
}

// 2. Daten lokal & in Firebase Cloud speichern
function speichereDaten(schluessel, daten) {
    const bereinigteDaten = Array.isArray(daten) ? daten : [];
    
    // Immer ZUERST lokal im Browser sichern (Verhindert Datenverlust)
    localStorage.setItem('ffw_' + schluessel, JSON.stringify(bereinigteDaten));

    // In Firebase Cloud speichern
    if (typeof db !== 'undefined' && db !== null) {
        db.collection('ffw_data').doc(schluessel).set({
            eintraege: bereinigteDaten,
            aktualisiertAm: new Date().toISOString()
        })
        .then(() => console.log(`[Cloud] ${schluessel} erfolgreich hochgeladen.`))
        .catch(err => {
            console.error(`Firebase Speicherfehler bei ${schluessel}:`, err);
            // Keine störenden Alerts bei temporären Verbindungsproblemen
        });
    }
}

let cloudSyncGestartet = false;

// 3. Live-Synchronisation mit Firebase (Sicher gegen 400er Fehler & Überschreiben)
function starteCloudSync() {
    if (typeof db === 'undefined' || db === null) return;
    if (cloudSyncGestartet) return; 
    cloudSyncGestartet = true;

    const sammlungen = ['geraete', 'fahrzeuge', 'kategorien', 'psa', 'lager', 'pruefungen', 'personal'];

    sammlungen.forEach(schluessel => {
        db.collection('ffw_data').doc(schluessel)
            .onSnapshot(
                (doc) => {
                    // NUR aktualisieren, wenn das Dokument in Firestore WIRKLICH Daten enthält
                    if (doc.exists && doc.data() && Array.isArray(doc.data().eintraege)) {
                        const cloudDaten = doc.data().eintraege;
                        
                        // Wenn Cloud leer ist, aber lokal Daten da sind, NICHT überschreiben!
                        const lokaleDaten = ladeDaten(schluessel);
                        if (cloudDaten.length === 0 && lokaleDaten.length > 0) {
                            console.warn(`[Cloud Sync] Cloud-Dokument für ${schluessel} ist leer. Lokale Daten werden geschützt.`);
                            return;
                        }

                        // 1. Im lokalen Speicher ablegen
                        localStorage.setItem('ffw_' + schluessel, JSON.stringify(cloudDaten));
                        
                        // 2. Live-Aktualisierung der UI-Ansichten
                        switch (schluessel) {
                            case 'geraete':
                                if (typeof filterGeraete === 'function') filterGeraete();
                                else if (typeof renderGeraeteView === 'function') renderGeraeteView();
                                break;
                            case 'fahrzeuge':
                                if (typeof renderFahrzeugeView === 'function') renderFahrzeugeView();
                                break;
                            case 'psa':
                                if (typeof renderPSAView === 'function') renderPSAView();
                                else if (typeof filterPSA === 'function') filterPSA();
                                break;
                            case 'lager':
                                if (typeof renderLagerView === 'function') renderLagerView();
                                else if (typeof ladeLager === 'function') ladeLager();
                                break;
                            case 'pruefungen':
                                if (typeof renderPruefungenView === 'function') renderPruefungenView();
                                else if (typeof filterPruefungen === 'function') filterPruefungen();
                                break;
                            case 'personal':
                                if (typeof renderePersonalTabelle === 'function') renderePersonalTabelle();
                                break;
                        }

                        if (typeof aktualisiereDashboard === 'function') {
                            aktualisiereDashboard();
                        }
                    }
                }, 
                (err) => {
                    // Fängt den 400 Bad Request Fehler ab, ohne dass die App abstürzt
                    console.error(`Cloud-Sync Stream-Fehler bei ${schluessel}:`, err);
                }
            );
    });
}

// 4. Initialisierung & Testdaten
document.addEventListener("DOMContentLoaded", () => {
    starteCloudSync();

    // Standard-Fahrzeug anlegen, falls Speicher leer ist
    const vorhandeneFahrzeuge = ladeDaten("fahrzeuge");
    if (!vorhandeneFahrzeuge || vorhandeneFahrzeuge.length === 0) {
        speichereDaten('fahrzeuge', [
            {
                id: "VEH-1",
                name: "LF 20/16",
                callSign: "Florian Musterstadt 40/1",
                licensePlate: "M-FF 112",
                status: "Einsatzbereit",
                nextHU: "2026-10",
                nextSP: "2027-04",
                description: "Löschgruppenfahrzeug mit 2000l Tank"
            }
        ]);
    }

    // Standard-Personal anlegen, falls Speicher leer ist
    const vorhandenesPersonal = ladeDaten("personal");
    if (!vorhandenesPersonal || vorhandenesPersonal.length === 0) {
        speichereDaten('personal', [
            {
                id: "PERS-1",
                spind: "01",
                vorname: "Max",
                nachname: "Mustermann",
                dienstgrad: "Hauptfeuerwehrmann",
                funktionen: ["Atemschutzgeräteträger", "Maschinist"],
                g26datum: "2027-05-15",
                lehrgaenge: "Truppführer, AGT, Maschinist",
                bemerkung: "Zugführer II. Zug"
            }
        ]);
    }

    setTimeout(() => {
        if (typeof db === 'undefined' || db === null) {
            console.warn("Achtung: Firebase ist nicht verbunden!");
        }
    }, 2000);
});
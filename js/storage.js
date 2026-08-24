// ==========================================
// FFW Manager - Speicher & Cloud-Sync (v1.4 Repariert)
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
function ladePersonalData() { return ladeDaten('personal'); }
function speicherePersonalData(daten) { speichereDaten('personal', daten); }

function speichereMitgliedData(mitglied) {
    let alle = ladePersonalData();
    const index = alle.findIndex(m => m.id === mitglied.id);
    if (index >= 0) alle[index] = mitglied;
    else alle.push(mitglied);
    speicherePersonalData(alle);
}

function loescheMitgliedData(id) {
    let alle = ladePersonalData();
    alle = alle.filter(m => m.id !== id);
    speicherePersonalData(alle);
}

// Spezifische Helper-Funktionen für PSA
function ladePsaData() { return ladeDaten('psa'); }
function speicherePsaData(daten) { speichereDaten('psa', daten); }

function speicherePsaEintrag(psaItem) {
    let alle = ladePsaData();
    const index = alle.findIndex(p => p.id === psaItem.id);
    if (index >= 0) alle[index] = psaItem;
    else alle.push(psaItem);
    speicherePsaData(alle);
}

function loeschePsaEintrag(id) {
    let alle = ladePsaData();
    alle = alle.filter(p => p.id !== id);
    speicherePsaData(alle);
}

// 2. Daten lokal & in Firebase Cloud speichern
function speichereDaten(schluessel, daten) {
    const bereinigteDaten = Array.isArray(daten) ? daten : [];
    
    // Immer ZUERST lokal sichern
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
        });
    }
}

let cloudSyncGestartet = false;

// 3. Live-Synchronisation mit Firebase (Sicher gegen Überschreiben lokaler Neuerungen)
function starteCloudSync() {
    if (typeof db === 'undefined' || db === null) return;
    if (cloudSyncGestartet) return; 
    cloudSyncGestartet = true;

    const sammlungen = ['geraete', 'fahrzeuge', 'kategorien', 'psa', 'lager', 'pruefungen', 'personal'];

    sammlungen.forEach(schluessel => {
        db.collection('ffw_data').doc(schluessel)
            .onSnapshot(
                (doc) => {
                    // Ignoriere Snapshots, die durch eigene lokale Änderungen ausgelöst wurden (Pending Writes)
                    if (doc.metadata && doc.metadata.hasPendingWrites) {
                        return;
                    }

                    if (doc.exists && doc.data() && Array.isArray(doc.data().eintraege)) {
                        const cloudDaten = doc.data().eintraege;
                        const lokaleDaten = ladeDaten(schluessel);

                        // Wenn Cloud weniger Daten hat als lokal (und lokal nicht leer ist), Schutzgreifung
                        if (cloudDaten.length === 0 && lokaleDaten.length > 0) {
                            console.warn(`[Cloud Sync] Cloud-Dokument für ${schluessel} ist leer. Lokale Daten werden geschützt.`);
                            return;
                        }

                        // Im lokalen Speicher ablegen
                        localStorage.setItem('ffw_' + schluessel, JSON.stringify(cloudDaten));
                        
                        // Live-Aktualisierung der UI-Ansichten
                        switch (schluessel) {
                            case 'psa':
                                if (typeof renderPSAView === 'function') renderPSAView();
                                else if (typeof filterPSA === 'function') filterPSA();
                                else if (typeof ladePsaTabelle === 'function') ladePsaTabelle();
                                break;
                            case 'geraete':
                                if (typeof filterGeraete === 'function') filterGeraete();
                                else if (typeof renderGeraeteView === 'function') renderGeraeteView();
                                break;
                            case 'fahrzeuge':
                                if (typeof renderFahrzeugeView === 'function') renderFahrzeugeView();
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
                    console.error(`Cloud-Sync Stream-Fehler bei ${schluessel}:`, err);
                }
            );
    });
}

// 4. Initialisierung
document.addEventListener("DOMContentLoaded", () => {
    starteCloudSync();
});

// Globale Freigaben
window.ladeDaten = ladeDaten;
window.speichereDaten = speichereDaten;
window.ladePsaData = ladePsaData;
window.speicherePsaData = speicherePsaData;
window.speicherePsaEintrag = speicherePsaEintrag;
window.loeschePsaEintrag = loeschePsaEintrag;
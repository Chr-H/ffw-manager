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

// 2. Daten lokal & in Firebase Cloud speichern
function speichereDaten(schluessel, daten) {
    const bereinigteDaten = Array.isArray(daten) ? daten : [];
    
    // 1. IMMER sofort im Browser speichern
    localStorage.setItem('ffw_' + schluessel, JSON.stringify(bereinigteDaten));

    // 2. In Firebase Cloud speichern (falls verknüpft)
    if (typeof window.db !== 'undefined' && window.db !== null) {
        window.db.collection('ffw_data').doc(schluessel).set({
            eintraege: bereinigteDaten,
            aktualisiertAm: new Date().toISOString()
        })
        .then(() => {
            console.log(`[Cloud Sync] ${schluessel} erfolgreich hochgeladen.`);
        })
        .catch(err => {
            console.error(`❌ Firebase Speicherfehler bei ${schluessel}:`, err);
            alert("Fehler beim Cloud-Speichern: " + err.message); // <--- Das fängt den Fehler ab!
        });
    }

    return true;
}

let cloudSyncGestartet = false;

// 3. Live-Synchronisation mit Firebase (mit Schutz vor Überschreiben)
function starteCloudSync() {
    if (typeof window.db === 'undefined' || window.db === null) return;
    if (cloudSyncGestartet) return; 
    cloudSyncGestartet = true;

    const sammlungen = ['geraete', 'fahrzeuge', 'kategorien', 'psa', 'lager', 'pruefungen', 'personal'];

    sammlungen.forEach(schluessel => {
        window.db.collection('ffw_data').doc(schluessel)
            .onSnapshot(
                (doc) => {
                    // Eigene lokale Schreiboperationen ignorieren
                    if (doc.metadata && doc.metadata.hasPendingWrites) return;

                    if (doc.exists && doc.data() && Array.isArray(doc.data().eintraege)) {
                        const cloudDaten = doc.data().eintraege;
                        const lokaleDaten = ladeDaten(schluessel);

                        // SCHUTZ: Wenn Cloud leer ist, aber wir lokal Daten haben -> nicht überschreiben!
                        if (cloudDaten.length === 0 && lokaleDaten.length > 0) {
                            console.warn(`[Cloud Sync] Ignoriere leere Cloud-Daten für '${schluessel}', da lokale Daten existieren.`);
                            // Lokale Daten hochladen um Cloud zu reparieren
                            speichereDaten(schluessel, lokaleDaten);
                            return;
                        }

                        // Daten synchronisieren und UI anpassen
                        localStorage.setItem('ffw_' + schluessel, JSON.stringify(cloudDaten));
                        
                        switch (schluessel) {
                            case 'psa':
                                if (typeof window.renderPSAView === 'function') window.renderPSAView();
                                else if (typeof window.filterPSA === 'function') window.filterPSA();
                                document.dispatchEvent(new Event("psaGeaendert"));
                                break;
                            case 'geraete':
                                if (typeof window.filterGeraete === 'function') window.filterGeraete();
                                else if (typeof window.renderGeraeteView === 'function') window.renderGeraeteView();
                                break;
                            case 'fahrzeuge':
                                if (typeof window.renderFahrzeugeView === 'function') window.renderFahrzeugeView();
                                break;
                            case 'lager':
                                if (typeof window.renderLagerView === 'function') window.renderLagerView();
                                else if (typeof window.ladeLager === 'function') window.ladeLager();
                                break;
                            case 'pruefungen':
                                if (typeof window.renderPruefungenView === 'function') window.renderPruefungenView();
                                else if (typeof window.filterPruefungen === 'function') window.filterPruefungen();
                                break;
                            case 'personal':
                                if (typeof window.renderePersonalTabelle === 'function') window.renderePersonalTabelle();
                                break;
                        }

                        if (typeof window.aktualisiereDashboard === 'function') {
                            window.aktualisiereDashboard();
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
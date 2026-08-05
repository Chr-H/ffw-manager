// Daten aus Firebase laden
function ladeDaten(schluessel) {
  // Wenn Daten lokal bereits gecacht/vorgehalten werden:
  const lokal = localStorage.getItem('ffw_' + schluessel);
  return lokal ? JSON.parse(lokal) : [];
}

// Daten in Firebase & Lokal speichern
function speichereDaten(schluessel, daten) {
  // 1. Lokal sichern
  localStorage.setItem('ffw_' + schluessel, JSON.stringify(daten));

  // 2. In Firebase Firestore Cloud speichern
  if (typeof db !== 'undefined') {
    db.collection('ffw_data').doc(schluessel).set({
      eintraege: daten,
      aktualisiertAm: new Date().toISOString()
    }).catch(err => console.error("Fehler beim Cloud-Speichern:", err));
  }
}

// Live-Synchronisation von Firebase aktivieren
function starteCloudSync() {
  if (typeof db === 'undefined') return;

  const sammlungen = ['geraete', 'fahrzeuge', 'kategorien'];

  sammlungen.forEach(schluessel => {
    db.collection('ffw_data').doc(schluessel)
      .onSnapshot((doc) => {
        if (doc.exists && doc.data().eintraege) {
          const cloudDaten = doc.data().eintraege;
          localStorage.setItem('ffw_' + schluessel, JSON.stringify(cloudDaten));
          
          // Ansichten aktualisieren, wenn neue Daten aus der Cloud eintreffen
          if (schluessel === 'geraete' && typeof filterGeraete === 'function') {
            filterGeraete();
          }
          if (schluessel === 'fahrzeuge' && typeof renderFahrzeugeView === 'function') {
            renderFahrzeugeView();
          }
          if (typeof aktualisiereDashboard === 'function') {
            aktualisiereDashboard();
          }
        }
      }, err => console.error("Cloud-Sync Fehler:", err));
  });
}

// Starte Sync, sobald die Seite geladen ist
document.addEventListener('DOMContentLoaded', starteCloudSync);
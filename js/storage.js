// Daten aus dem Speicher laden
function ladeDaten(schluessel) {
  const lokal = localStorage.getItem('ffw_' + schluessel);
  try {
    const parsed = JSON.parse(lokal);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// Daten in Firebase & Lokal speichern
function speichereDaten(schluessel, daten) {
  const bereinigteDaten = Array.isArray(daten) ? daten : [];
  
  // 1. Lokal sichern
  localStorage.setItem('ffw_' + schluessel, JSON.stringify(bereinigteDaten));

  // 2. In Firebase Cloud speichern
  if (typeof db !== 'undefined') {
    db.collection('ffw_data').doc(schluessel).set({
      eintraege: bereinigteDaten,
      aktualisiertAm: new Date().toISOString()
    }).catch(err => console.error("Fehler beim Cloud-Speichern:", err));
  }
}

// Live-Synchronisation mit Firebase
function starteCloudSync() {
  if (typeof db === 'undefined') return;

  const sammlungen = ['geraete', 'fahrzeuge', 'kategorien'];

  sammlungen.forEach(schluessel => {
    db.collection('ffw_data').doc(schluessel)
      .onSnapshot((doc) => {
        if (doc.exists && doc.data().eintraege) {
          const cloudDaten = doc.data().eintraege;
          localStorage.setItem('ffw_' + schluessel, JSON.stringify(cloudDaten));
          
          // Ansichten und Events auslösen
          document.dispatchEvent(new CustomEvent('geraeteGeaendert'));
          
          if (schluessel === 'geraete') {
            if (typeof zeigeGeraete === 'function') zeigeGeraete();
            if (typeof filterGeraete === 'function') filterGeraete();
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

document.addEventListener('DOMContentLoaded', starteCloudSync);
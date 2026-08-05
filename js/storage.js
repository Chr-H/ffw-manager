// 1. Daten aus dem Speicher laden
function ladeDaten(schluessel) {
  const lokal = localStorage.getItem('ffw_' + schluessel);
  try {
    const parsed = JSON.parse(lokal);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// 2. Daten lokal & in Firebase Cloud speichern
function speichereDaten(schluessel, daten) {
  const bereinigteDaten = Array.isArray(daten) ? daten : [];
  
  // Lokal sichern
  localStorage.setItem('ffw_' + schluessel, JSON.stringify(bereinigteDaten));

  // In Firebase Cloud speichern
  if (typeof db !== 'undefined' && db !== null) {
    db.collection('ffw_data').doc(schluessel).set({
      eintraege: bereinigteDaten,
      aktualisiertAm: new Date().toISOString()
    })
    .then(() => console.log(`[Cloud] ${schluessel} erfolgreich hochgeladen.`))
    .catch(err => {
      console.error("Firebase Speicherfehler:", err);
      alert("Fehler beim Cloud-Speichern: " + err.message);
    });
  }
}

// 3. Live-Synchronisation mit Firebase
function starteCloudSync() {
  if (typeof db === 'undefined' || db === null) return;

  const sammlungen = ['geraete', 'fahrzeuge', 'kategorien'];

  sammlungen.forEach(schluessel => {
    db.collection('ffw_data').doc(schluessel)
      .onSnapshot((doc) => {
        if (doc.exists && doc.data().eintraege) {
          const cloudDaten = doc.data().eintraege;
          
          // 1. Lokalen Speicher aktualisieren
          localStorage.setItem('ffw_' + schluessel, JSON.stringify(cloudDaten));
          
          // 2. Globale Variablen in den Skripten aktualisieren (WICHTIG für Smartphone!)
          if (schluessel === 'geraete') {
            if (typeof window.geraete !== 'undefined') window.geraete = cloudDaten;
            if (typeof geraete !== 'undefined') geraete = cloudDaten;
            if (typeof zeigeGeraete === 'function') zeigeGeraete();
            if (typeof filterGeraete === 'function') filterGeraete();
          }
          
          if (schluessel === 'fahrzeuge') {
            if (typeof window.fahrzeuge !== 'undefined') window.fahrzeuge = cloudDaten;
            if (typeof fahrzeuge !== 'undefined') fahrzeuge = cloudDaten;
            if (typeof renderFahrzeugeView === 'function') renderFahrzeugeView();
          }

          if (typeof aktualisiereDashboard === 'function') {
            aktualisiereDashboard();
          }
        }
      }, err => {
        console.error("Cloud-Sync Fehler:", err);
      });
  });
}

// 4. Diagnose & Start nach Seitenaufbau
document.addEventListener("DOMContentLoaded", () => {
  // Sync sofort starten
  starteCloudSync();

  // Diagnose-Check nach 1 Sekunde
  setTimeout(() => {
    if (typeof db === 'undefined' || db === null) {
      alert("Achtung: Firebase ist nicht verbunden! Prüfe die API-Schlüssel in deiner index.html.");
    }
  }, 1000);
});
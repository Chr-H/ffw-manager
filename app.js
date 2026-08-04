// ==========================================
// FFW Manager - Hauptlogik & Dashboard (v0.5.1 Fix)
// ==========================================

const heute = new Date();
const datumStr = heute.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
});

const feld = document.getElementById("heute");
if (feld) feld.innerHTML = "Heute ist " + datumStr;

function aktualisiereDashboard() {
    if (typeof ladeDaten !== 'function') return;

    const geraete = ladeDaten('geraete') || [];

    // 1. Modul-Kacheln Counters
    const cardGeraete = document.querySelector('.cards .card:nth-child(1) p');
    if (cardGeraete) cardGeraete.textContent = `${geraete.length} Geräte`;

    let defektCount = 0;
    let wartungCount = 0;
    let einsatzbereitCount = 0;
    let ausserDienstCount = 0;
    let ueberfaelligCount = 0;
    let demnaechstFaelligCount = 0;

    const jetzt = new Date();
    const in30Tagen = new Date();
    in30Tagen.setDate(jetzt.getDate() + 30);

    geraete.forEach(g => {
        const s = (g.status || '').toLowerCase();
        if (s.includes('einsatz')) einsatzbereitCount++;
        else if (s.includes('wart')) wartungCount++;
        else if (s.includes('defekt')) defektCount++;
        else if (s.includes('au')) ausserDienstCount++;

        // Prüffristen ermitteln
        if (g.naechstePruefung) {
            const pDatum = new Date(g.naechstePruefung);
            if (pDatum < jetzt) {
                ueberfaelligCount++;
            } else if (pDatum <= in30Tagen) {
                demnaechstFaelligCount++;
            }
        }
    });

    // 2. Status-Karten oben korrigieren
    const statusCards = document.querySelectorAll('.status-card');
    if (statusCards.length >= 4) {
        // Karte 1: Prüfungen (überfällig)
        statusCards[0].querySelector('h3').textContent = "🔴 Prüfungen";
        statusCards[0].querySelector('p').textContent = `${ueberfaelligCount} überfällig`;

        // Karte 2: Demnächst fällig
        statusCards[1].querySelector('h3').textContent = "🟡 Demnächst fällig";
        statusCards[1].querySelector('p').textContent = `${demnaechstFaelligCount} Prüfungen`;

        // Karte 3: Geräte / Fahrzeuge Status
        statusCards[2].querySelector('h3').textContent = "🟢 Einsatzbereit";
        statusCards[2].querySelector('p').textContent = `${einsatzbereitCount} Geräte einsatzbereit`;

        // Karte 4: Außer Dienst / Defekt
        statusCards[3].querySelector('h3').textContent = "⚫ Nicht einsatzbereit";
        statusCards[3].querySelector('p').textContent = `${defektCount + ausserDienstCount} (Defekt/Außer Dienst)`;
    }
}

document.addEventListener('DOMContentLoaded', aktualisiereDashboard);
document.addEventListener('geraeteGeaendert', aktualisiereDashboard);

// ==========================================
// SPA Seitenumschaltung (Navigation)
// ==========================================
function zeigeSeite(seitenId) {
    // Alle Seiten ausblenden
    const seiten = document.querySelectorAll('.seite-ansicht');
    seiten.forEach(s => s.style.display = 'none');

    // Gewählte Seite anzeigen
    const zielSeite = document.getElementById('seite-' + seitenId);
    if (zielSeite) {
        zielSeite.style.display = 'block';
    } else {
        console.warn('Seite nicht gefunden: ' + seitenId);
    }

    // Bei Wechsel zum Dashboard Daten aktualisieren
    if (seitenId === 'dashboard') {
        aktualisiereDashboard();
    }
}
// ==========================================
// SPA Seitenumschaltung & Filter-Verknüpfung
// ==========================================
function zeigeSeite(seitenId) {
    const seiten = document.querySelectorAll('.seite-ansicht');
    seiten.forEach(s => s.style.display = 'none');

    const zielSeite = document.getElementById('seite-' + seitenId);
    if (zielSeite) {
        zielSeite.style.display = 'block';
    }

    if (seitenId === 'dashboard') {
        aktualisiereDashboard();
    }
}

function filtereGeraeteNachDashboard(modus) {
    // 1. Zur Geräte-Seite wechseln
    zeigeSeite('geraete');

    const filterStatus = document.getElementById('filterStatus');
    const suchInput = document.getElementById('sucheGeraet');

    if (suchInput) suchInput.value = ""; // Suchfeld leeren

    if (modus === 'ueberfaellig') {
        // Filter auf überfällige Fristen setzen
        if (filterStatus) filterStatus.value = "";
        
        const jetzt = new Date();
        const gefiltert = (ladeDaten('geraete') || []).filter(g => {
            return g.naechstePruefung && new Date(g.naechstePruefung) < jetzt;
        });
        
        if (typeof zeigeGefilterteGeraete === 'function') {
            zeigeGefilterteGeraete(gefiltert);
        }
    } else if (modus === 'inaktiv') {
        // Filtert Defekt & Außer Dienst
        if (filterStatus) filterStatus.value = "";
        
        const gefiltert = (ladeDaten('geraete') || []).filter(g => {
            const s = (g.status || '').toLowerCase();
            return s.includes('defekt') || s.includes('au');
        });
        
        if (typeof zeigeGefilterteGeraete === 'function') {
            zeigeGefilterteGeraete(gefiltert);
        }
    } else {
        // Exakter Status-Filter (Einsatzbereit / Wartung)
        if (filterStatus) filterStatus.value = modus;
        if (typeof filterGeraete === 'function') {
            filterGeraete();
        }
    }
}
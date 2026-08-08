// ==========================================
// FFW Manager - Hauptanwendung & Navigation
// ==========================================

function zeigeSeite(seitenId) {
    // 1. Alle Ansichten ausblenden
    const sektionen = document.querySelectorAll('.seite-ansicht');
    sektionen.forEach(sec => sec.style.display = 'none');

    // 2. Gewünschte Ansicht einblenden
    // Beachtet sowohl 'psa' als auch 'seite-psa' als Übergabewert
    const id = seitenId.startsWith('seite-') ? seitenId : 'seite-' + seitenId;
    const zielSektion = document.getElementById(id);

    if (zielSektion) {
        zielSektion.style.display = 'block';
    } else {
        console.warn(`Sektion mit ID "${id}" wurde nicht gefunden.`);
        return;
    }

    // 3. Beim Seitenwechsel das jeweilige Modul neu rendern / aktualisieren
    const modul = seitenId.replace('seite-', '');

    switch (modul) {
        case 'dashboard':
            if (typeof aktualisiereDashboard === 'function') aktualisiereDashboard();
            break;

        case 'geraete':
            if (typeof renderGeraeteView === 'function') renderGeraeteView();
            else if (typeof filterGeraete === 'function') filterGeraete();
            break;

        case 'fahrzeuge':
            if (typeof renderFahrzeugeView === 'function') renderFahrzeugeView();
            break;

        case 'psa':
            if (typeof renderPSAView === 'function') renderPSAView();
            else if (typeof ladePSA === 'function') ladePSA();
            else if (typeof filterPSA === 'function') filterPSA();
            break;

        case 'lager':
            if (typeof renderLagerView === 'function') renderLagerView();
            else if (typeof ladeLager === 'function') ladeLager();
            break;

        case 'pruefungen':
            if (typeof renderPruefungenView === 'function') renderPruefungenView();
            else if (typeof ladePruefungen === 'function') ladePruefungen();
            break;

        default:
            console.log(`Navigation zu '${modul}' ausgeführt.`);
            break;
    }
}
// ==========================================
// FFW Manager - Hauptanwendung & Navigation
// ==========================================

function zeigeSeite(seitenName) {
    // 1. Suche zuerst nach der ID mit Präfix "seite-" (z.B. "seite-geraete" oder "seite-psa")
    let zielSeite = document.getElementById('seite-' + seitenName) || document.getElementById(seitenName);

    // Sicherheitsprüfung: Falls Seite nicht existiert, in Konsole warnen
    if (!zielSeite) {
        console.error("Seite '" + seitenName + "' wurde im HTML nicht gefunden!");
        return;
    }

    // 2. Alle Seitenbereiche ausblenden
    const alleSeiten = document.querySelectorAll('.seite-ansicht, [id^="seite-"]');
    alleSeiten.forEach(seite => {
        seite.style.display = 'none';
    });

    // 3. Gewählte Seite einblenden
    zielSeite.style.display = 'block';

    // 4. Daten-Render-Funktionen beim Seitenwechsel auslösen
    if ((seitenName === 'psa' || seitenName === 'seite-psa') && typeof renderPSAView === 'function') {
        renderPSAView();
    }
    if ((seitenName === 'lager' || seitenName === 'seite-lager') && typeof renderLagerView === 'function') {
        renderLagerView();
    }
    if ((seitenName === 'geraete' || seitenName === 'seite-geraete') && typeof renderGeraeteView === 'function') {
        renderGeraeteView();
    }
    if ((seitenName === 'fahrzeuge' || seitenName === 'seite-fahrzeuge') && typeof renderFahrzeugeView === 'function') {
        renderFahrzeugeView();
    }
    if ((seitenName === 'pruefungen' || seitenName === 'seite-pruefungen') && typeof renderPruefungenView === 'function') {
    renderPruefungenView();
    }
    // 4. Daten-Render-Funktionen beim Seitenwechsel auslösen
    if (seitenName === 'psa' || seitenName === 'seite-psa') {
        if (typeof renderPSAView === 'function') renderPSAView();
        else if (typeof ladePSA === 'function') ladePSA();
        else if (typeof filterPSA === 'function') filterPSA();
    }
    if (seitenName === 'lager' || seitenName === 'seite-lager') {
        if (typeof renderLagerView === 'function') renderLagerView();
    }
    if (seitenName === 'geraete' || seitenName === 'seite-geraete') {
        if (typeof renderGeraeteView === 'function') renderGeraeteView();
        else if (typeof filterGeraete === 'function') filterGeraete();
    }
    if (seitenName === 'fahrzeuge' || seitenName === 'seite-fahrzeuge') {
        if (typeof renderFahrzeugeView === 'function') renderFahrzeugeView();
    }
    if (seitenName === 'pruefungen' || seitenName === 'seite-pruefungen') {
        if (typeof renderPruefungenView === 'function') renderPruefungenView();
        else if (typeof ladePruefungen === 'function') ladePruefungen();
    }
}
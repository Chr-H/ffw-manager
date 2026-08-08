// ==========================================
// FFW Manager - Hauptanwendung & Navigation
// ==========================================

function zeigeSeite(seitenName) {
    // 0. Name bereinigen (entfernt "seite-", falls es mitübergeben wurde)
    const pureName = seitenName.replace(/^seite-/, '');

    // 1. Suche nach Element (z. B. "seite-geraete" oder "geraete")
    const zielSeite = document.getElementById('seite-' + pureName) || document.getElementById(pureName);

    // Sicherheitsprüfung
    if (!zielSeite) {
        console.error(`Seite '${seitenName}' wurde im HTML nicht gefunden!`);
        return;
    }

    // 2. Alle Seitenbereiche ausblenden
    const alleSeiten = document.querySelectorAll('.seite-ansicht, [id^="seite-"]');
    alleSeiten.forEach(seite => {
        seite.style.display = 'none';
    });

    // 3. Gewählte Seite einblenden
    zielSeite.style.display = 'block';

    // 4. Aktiven Navigations-Button hervorheben (falls Nav-Klassen genutzt werden)
    document.querySelectorAll('.nav-link, .nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick')?.includes(pureName)) {
            btn.classList.add('active');
        }
    });

    // 5. Daten-Render-Funktionen beim Seitenwechsel ausführen (sauber per switch)
    switch (pureName) {
        case 'psa':
            if (typeof renderPSAView === 'function') renderPSAView();
            else if (typeof ladePSA === 'function') ladePSA();
            else if (typeof filterPSA === 'function') filterPSA();
            break;

        case 'lager':
            if (typeof renderLagerView === 'function') renderLagerView();
            else if (typeof ladeLager === 'function') ladeLager();
            break;

        case 'geraete':
            if (typeof renderGeraeteView === 'function') renderGeraeteView();
            else if (typeof filterGeraete === 'function') filterGeraete();
            break;

        case 'fahrzeuge':
            if (typeof renderFahrzeugeView === 'function') renderFahrzeugeView();
            break;

        case 'pruefungen':
            if (typeof renderPruefungenView === 'function') renderPruefungenView();
            else if (typeof ladePruefungen === 'function') ladePruefungen();
            break;

        default:
            console.log(`Navigation zu '${pureName}' ausgeführt.`);
            break;
    }
}
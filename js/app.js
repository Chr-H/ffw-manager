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
    // Sucht sowohl nach .seite-ansicht als auch nach Elementen mit IDs, die mit 'seite-' beginnen
    const alleSeiten = document.querySelectorAll('.seite-ansicht, [id^="seite-"]');
    alleSeiten.forEach(seite => {
        seite.style.display = 'none';
    });

    // 3. Gewählte Seite einblenden
    zielSeite.style.display = 'block';

    // 4. Ansichten beim Umschalten aktualisieren
    if ((seitenName === 'psa' || seitenName === 'seite-psa') && typeof renderPSAView === 'function') {
        renderPSAView();
    }
    if ((seitenName === 'fahrzeuge' || seitenName === 'seite-fahrzeuge') && typeof renderFahrzeugeView === 'function') {
        renderFahrzeugeView();
    }
    if ((seitenName === 'geraete' || seitenName === 'seite-geraete') && typeof filterGeraete === 'function') {
        filterGeraete();
    }
    if ((seitenName === 'lager' || seitenName === 'seite-lager') && typeof renderLagerView === 'function') {
        renderLagerView();
    }
}
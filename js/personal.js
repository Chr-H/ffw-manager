// js/personal.js

// 1. Hauptfunktion: Personal-Tabelle & Dashboard-Statistik rendern
function renderePersonalTabelle() {
    const tbody = document.getElementById('personal-tabelle-body');

    // Daten laden (per Hilfsfunktion aus storage.js oder globalem Array)
    let mitglieder = [];
    if (typeof ladePersonalData === 'function') {
        mitglieder = ladePersonalData();
    } else if (window.personalDaten) {
        mitglieder = window.personalDaten;
    }

    // --- DASHBOARD-ZÄHLER AKTUALISIEREN ---
    const statElem = document.getElementById('stat-modul-personal');
    if (statElem) {
        statElem.innerText = `${mitglieder.length} Mitglieder`;
    }

    if (!tbody) return;

    // Filter-Werte abgreifen
    const suche = (document.getElementById('personal-suche')?.value || '').toLowerCase();
    const filterFunktion = document.getElementById('personal-filter-funktion')?.value || '';
    const filterG26 = document.getElementById('personal-filter-g26')?.value || '';

    // Filterung anwenden
    const gefiltert = mitglieder.filter(m => {
        const nameMatch = `${m.vorname || ''} ${m.nachname || ''}`.toLowerCase().includes(suche) ||
                          (m.spind || '').toLowerCase().includes(suche) ||
                          (m.dienstgrad || '').toLowerCase().includes(suche);

        const funktionMatch = !filterFunktion || (m.funktionen && m.funktionen.includes(filterFunktion));

        let g26Match = true;
        if (filterG26 === 'gueltig') {
            g26Match = m.g26datum && new Date(m.g26datum) >= new Date();
        } else if (filterG26 === 'abgelaufen') {
            g26Match = !m.g26datum || new Date(m.g26datum) < new Date();
        }

        return nameMatch && funktionMatch && g26Match;
    });

    tbody.innerHTML = '';

    if (gefiltert.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#777; padding:15px;">Keine Mitglieder gefunden.</td></tr>`;
        return;
    }

    // Zeilen generieren (8 Spalten gemäß <thead> in index.html)
    gefiltert.forEach(m => {
        const tr = document.createElement('tr');

        // Funktionen als Badges
        const funktionenHTML = (m.funktionen && m.funktionen.length > 0)
            ? m.funktionen.map(f => `<span class="badge" style="background:#e3f2fd; color:#0d47a1; padding:3px 6px; border-radius:4px; font-size:0.85em; margin-right:4px; display:inline-block;">${f}</span>`).join('')
            : '-';

        // G26 Status
        let g26HTML = '-';
        if (m.g26datum) {
            const datum = new Date(m.g26datum);
            const istGueltig = datum >= new Date();
            const datumStr = datum.toLocaleDateString('de-DE');
            g26HTML = istGueltig 
                ? `<span style="color:#2e7d32; font-weight:bold;">🟢 ${datumStr}</span>`
                : `<span style="color:#c62828; font-weight:bold;">🔴 ${datumStr}</span>`;
        }

        tr.innerHTML = `
            <td><strong>${m.spind || '-'}</strong></td>
            <td><strong>${m.vorname || ''} ${m.nachname || ''}</strong></td>
            <td>${m.dienstgrad || '-'}</td>
            <td>${funktionenHTML}</td>
            <td>${g26HTML}</td>
            <td>${m.lehrgaenge || '-'}</td>
            <td>${m.bemerkung || '-'}</td>
            <td>
                <button onclick="bearbeiteMitglied('${m.id}')" style="padding:4px 8px; cursor:pointer;">✏️</button>
                <button onclick="loescheMitglied('${m.id}')" style="padding:4px 8px; cursor:pointer; background:#dc3545; color:white; border:none; border-radius:3px;">🗑️</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// 2. Modal-Steuerung & Aktionen
function oeffneMitgliedModal(mitgliedId = null) {
    const modal = document.getElementById('mitglied-modal');
    const form = document.getElementById('mitglied-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('mitglied-id').value = '';

    if (mitgliedId) {
        let mitglieder = typeof ladePersonalData === 'function' ? ladePersonalData() : [];
        const m = mitglieder.find(x => x.id === mitgliedId);
        if (m) {
            document.getElementById('mitglied-id').value = m.id;
            document.getElementById('mitglied-spind').value = m.spind || '';
            document.getElementById('mitglied-vorname').value = m.vorname || '';
            document.getElementById('mitglied-nachname').value = m.nachname || '';
            document.getElementById('mitglied-dienstgrad').value = m.dienstgrad || '';
            document.getElementById('mitglied-g26datum').value = m.g26datum || '';
            document.getElementById('mitglied-lehrgaenge').value = m.lehrgaenge || '';
            document.getElementById('mitglied-bemerkung').value = m.bemerkung || '';

            // Checkboxen setzen
            const cbs = document.querySelectorAll('.cb-funktion');
            cbs.forEach(cb => {
                cb.checked = m.funktionen && m.funktionen.includes(cb.value);
            });
        }
    }

    modal.style.display = 'flex';
}

function schliesseMitgliedModal() {
    const modal = document.getElementById('mitglied-modal');
    if (modal) modal.style.display = 'none';
}

function speichereMitglied(e) {
    e.preventDefault();

    const id = document.getElementById('mitglied-id').value || 'pers_' + Date.now();
    const ausgewaehlteFunktionen = Array.from(document.querySelectorAll('.cb-funktion:checked')).map(cb => cb.value);

    const mitgliedData = {
        id: id,
        spind: document.getElementById('mitglied-spind').value,
        vorname: document.getElementById('mitglied-vorname').value,
        nachname: document.getElementById('mitglied-nachname').value,
        dienstgrad: document.getElementById('mitglied-dienstgrad').value,
        g26datum: document.getElementById('mitglied-g26datum').value,
        lehrgaenge: document.getElementById('mitglied-lehrgaenge').value,
        bemerkung: document.getElementById('mitglied-bemerkung').value,
        funktionen: ausgewaehlteFunktionen
    };

    if (typeof speichereMitgliedData === 'function') {
        speichereMitgliedData(mitgliedData);
    }

    schliesseMitgliedModal();
    renderePersonalTabelle();
}

function loescheMitglied(id) {
    if (confirm('Möchtest du dieses Mitglied wirklich löschen?')) {
        if (typeof loescheMitgliedData === 'function') {
            loescheMitgliedData(id);
        }
        renderePersonalTabelle();
    }
}

function bearbeiteMitglied(id) {
    oeffneMitgliedModal(id);
}

// Global verfügbar machen
window.renderePersonalTabelle = renderePersonalTabelle;
window.oeffneMitgliedModal = oeffneMitgliedModal;
window.schliesseMitgliedModal = schliesseMitgliedModal;
window.speichereMitglied = speichereMitglied;
window.bearbeiteMitglied = bearbeiteMitglied;
window.loescheMitglied = loescheMitglied;

// Beim Initialisieren der Seite einmal ausführen
document.addEventListener('DOMContentLoaded', () => {
    renderePersonalTabelle();
});
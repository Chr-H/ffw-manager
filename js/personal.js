// ==========================================
// FFW Manager - Personalverwaltung
// ==========================================

// js/personal.js

// 1. Personal-Tabelle rendern
function renderePersonalTabelle() {
    const tbody = document.getElementById('personal-tabelle-body');
    if (!tbody) return;

    const suche = (document.getElementById('personal-suche')?.value || '').toLowerCase();
    const filterFunktion = document.getElementById('personal-filter-funktion')?.value || '';
    const filterG26 = document.getElementById('personal-filter-g26')?.value || '';

    // Daten aus LocalStorage / Globalem Speicher laden
    let mitglieder = typeof ladePersonalData === 'function' ? ladePersonalData() : [];

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
        let g26HTML = 'N/A';
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
            <td><strong>${m.nachname || ''}</strong>, ${m.vorname || ''}</td>
            <td>${m.dienstgrad || '-'}</td>
            <td>${funktionenHTML}</td>
            <td>${g26HTML}</td>
            <td>${m.lehrgaenge || '-'}</td>
            <td>${m.bemerkung || '-'}</td>
            <td>
                <button type="button" class="btn btn-sm btn-secondary" onclick="editierMitglied('${m.id}')" title="Bearbeiten">✏️</button>
                <button type="button" class="btn btn-sm btn-danger" onclick="loescheMitglied('${m.id}')" title="Löschen">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 2. Modal öffnen & Formular leeren/befüllen
function oeffneMitgliedModal(id = null) {
    const modal = document.getElementById('mitglied-modal');
    const form = document.getElementById('mitglied-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('mitglied-id').value = '';

    if (id) {
        let mitglieder = typeof ladePersonalData === 'function' ? ladePersonalData() : [];
        const m = mitglieder.find(x => x.id === id);
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

function editierMitglied(id) {
    oeffneMitgliedModal(id);
}

// 3. Mitglied speichern
function speichereMitglied(e) {
    e.preventDefault();

    const id = document.getElementById('mitglied-id').value || 'pers_' + Date.now();
    const spind = document.getElementById('mitglied-spind')?.value.trim() || '';
    const vorname = document.getElementById('mitglied-vorname')?.value.trim() || '';
    const nachname = document.getElementById('mitglied-nachname')?.value.trim() || '';
    const dienstgrad = document.getElementById('mitglied-dienstgrad')?.value.trim() || '';
    const g26datum = document.getElementById('mitglied-g26datum')?.value || '';
    const lehrgaenge = document.getElementById('mitglied-lehrgaenge')?.value.trim() || '';
    const bemerkung = document.getElementById('mitglied-bemerkung')?.value.trim() || '';

    const funktionen = [];
    document.querySelectorAll('.cb-funktion:checked').forEach(cb => {
        funktionen.push(cb.value);
    });

    const mitgliedObj = {
        id,
        spind,
        vorname,
        nachname,
        dienstgrad,
        g26datum,
        lehrgaenge,
        bemerkung,
        funktionen,
        updatedAt: new Date().toISOString()
    };

    // Daten direkt aus LocalStorage holen zur Vermeidung von Schnittstellen-Fehlern
    let mitglieder = [];
    try {
        const raw = localStorage.getItem('ffw_personal');
        mitglieder = raw ? JSON.parse(raw) : [];
    } catch (err) {
        mitglieder = [];
    }

    const index = mitglieder.findIndex(x => x.id === id);
    if (index >= 0) {
        mitglieder[index] = mitgliedObj;
    } else {
        mitglieder.push(mitgliedObj);
    }

    // In LocalStorage speichern
    localStorage.setItem('ffw_personal', JSON.stringify(mitglieder));

    // Falls globale Speicherfunktion existiert, ebenfalls aufrufen
    if (typeof speicherePersonalData === 'function') {
        speicherePersonalData(mitglieder);
    }

    // Modal schließen & Tabelle sofort neu zeichnen
    schliesseMitgliedModal();
    renderePersonalTabelle();
}

// 4. Mitglied löschen
function loescheMitglied(id) {
    if (!confirm('Soll dieses Mitglied wirklich gelöscht werden?')) return;

    let mitglieder = typeof ladePersonalData === 'function' ? ladePersonalData() : [];
    mitglieder = mitglieder.filter(x => x.id !== id);

    if (typeof speicherePersonalData === 'function') {
        speicherePersonalData(mitglieder);
    } else {
        localStorage.setItem('ffw_personal', JSON.stringify(mitglieder));
    }

    renderePersonalTabelle();
}

// Initialer Aufruf bei Seitenload
document.addEventListener('DOMContentLoaded', () => {
    renderePersonalTabelle();
});
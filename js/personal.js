// ==========================================
// PERSONAL-MODUL LOGIK (personal.js)
// ==========================================

function renderePersonalTabelle() {
    const tbody = document.getElementById('personal-tabelle-body');
    if (!tbody) return;

    const mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
    const suche = (document.getElementById('personal-suche')?.value || '').toLowerCase();
    const filterFunktion = document.getElementById('personal-filter-funktion')?.value || '';
    const filterG26 = document.getElementById('personal-filter-g26')?.value || '';

    const heute = new Date();

    const gefiltert = mitglieder.filter(m => {
        const fullName = `${m.vorname} ${m.nachname} ${m.dienstgrad}`.toLowerCase();
        const matchesSuche = fullName.includes(suche);
        const matchesFunktion = filterFunktion === '' || (m.funktionen && m.funktionen.includes(filterFunktion));

        let matchesG26 = true;
        if (filterG26 === 'gueltig') {
            matchesG26 = m.g26datum && new Date(m.g26datum) >= heute;
        } else if (filterG26 === 'abgelaufen') {
            matchesG26 = !m.g26datum || new Date(m.g26datum) < heute;
        }

        return matchesSuche && matchesFunktion && matchesG26;
    });

    if (gefiltert.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 15px; color: #777;">Keine Mitglieder gefunden.</td></tr>`;
        return;
    }

    tbody.innerHTML = gefiltert.map(m => {
        let g26Badge = '<span style="color: #888;">N/A</span>';
        if (m.g26datum) {
            const g26Date = new Date(m.g26datum);
            const in30Tagen = new Date();
            in30Tagen.setDate(heute.getDate() + 30);
            const dateFormatted = g26Date.toLocaleDateString('de-DE');

            if (g26Date < heute) {
                g26Badge = `<span style="background: #ffebee; color: #c62828; padding: 4px 8px; border-radius: 4px; font-weight: bold;">🔴 Abgelaufen (${dateFormatted})</span>`;
            } else if (g26Date <= in30Tagen) {
                g26Badge = `<span style="background: #fff3e0; color: #ef6c00; padding: 4px 8px; border-radius: 4px; font-weight: bold;">🟡 Fällig (${dateFormatted})</span>`;
            } else {
                g26Badge = `<span style="background: #e8f5e9; color: #2e7d32; padding: 4px 8px; border-radius: 4px;">🟢 Gültig (${dateFormatted})</span>`;
            }
        }

        const funktionenBadges = (m.funktionen || []).map(f => 
            `<span style="background: #e1f5fe; color: #0277bd; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; margin-right: 4px; display: inline-block; margin-bottom: 2px;">${f}</span>`
        ).join('') || '<span style="color:#aaa;">Keine</span>';

        const lehrgaengeStr = m.lehrgaenge ? m.lehrgaenge : '-';

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;"><strong>${m.nachname}</strong>, ${m.vorname}</td>
                <td style="padding: 10px;">${m.dienstgrad || '-'}</td>
                <td style="padding: 10px;">${funktionenBadges}</td>
                <td style="padding: 10px;">${g26Badge}</td>
                <td style="padding: 10px; font-size: 0.9em; color: #444;">${lehrgaengeStr}</td>
                <td style="padding: 10px;">
                    <button class="btn btn-sm" onclick="bearbeiteMitglied('${m.id}')" title="Bearbeiten">✏️</button>
                    <button class="btn btn-sm" onclick="loescheMitglied('${m.id}')" title="Löschen" style="color: red;">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function oeffneMitgliedModal(mitgliedId = null) {
    const modal = document.getElementById('modal-mitglied');
    const form = document.getElementById('form-mitglied');
    if (!modal || !form) return;

    form.reset();
    document.querySelectorAll('.cb-funktion').forEach(cb => cb.checked = false);

    if (mitgliedId) {
        const mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
        const m = mitglieder.find(x => x.id === mitgliedId);
        if (m) {
            document.getElementById('modal-mitglied-titel').textContent = 'Mitglied bearbeiten';
            document.getElementById('mitglied-id').value = m.id;
            document.getElementById('mitglied-vorname').value = m.vorname || '';
            document.getElementById('mitglied-nachname').value = m.nachname || '';
            document.getElementById('mitglied-dienstgrad').value = m.dienstgrad || 'Feuerwehrmann / -frau';
            document.getElementById('mitglied-eintritt').value = m.eintritt || '';
            document.getElementById('mitglied-g26datum').value = m.g26datum || '';
            document.getElementById('mitglied-atemschutzuebung').value = m.atemschutzuebung || '';
            document.getElementById('mitglied-lehrgaenge').value = m.lehrgaenge || '';

            if (m.funktionen && Array.isArray(m.funktionen)) {
                document.querySelectorAll('.cb-funktion').forEach(cb => {
                    if (m.funktionen.includes(cb.value)) cb.checked = true;
                });
            }
        }
    } else {
        document.getElementById('modal-mitglied-titel').textContent = 'Neues Mitglied anlegen';
        document.getElementById('mitglied-id').value = '';
    }

    modal.style.display = 'flex';
}

function schliesseMitgliedModal() {
    const modal = document.getElementById('modal-mitglied');
    if (modal) modal.style.display = 'none';
}

function speichereMitglied(event) {
    event.preventDefault();

    const id = document.getElementById('mitglied-id').value || 'm_' + Date.now();
    const vorname = document.getElementById('mitglied-vorname').value;
    const nachname = document.getElementById('mitglied-nachname').value;
    const dienstgrad = document.getElementById('mitglied-dienstgrad').value;
    const eintritt = document.getElementById('mitglied-eintritt').value;
    const g26datum = document.getElementById('mitglied-g26datum').value;
    const atemschutzuebung = document.getElementById('mitglied-atemschutzuebung').value;
    const lehrgaenge = document.getElementById('mitglied-lehrgaenge').value;

    const funktionen = [];
    document.querySelectorAll('.cb-funktion:checked').forEach(cb => {
        funktionen.push(cb.value);
    });

    const neuesMitglied = {
        id, vorname, nachname, dienstgrad, eintritt,
        g26datum, atemschutzuebung, lehrgaenge, funktionen
    };

    let mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
    const index = mitglieder.findIndex(m => m.id === id);

    if (index >= 0) {
        mitglieder[index] = neuesMitglied;
    } else {
        mitglieder.push(neuesMitglied);
    }

    localStorage.setItem('ffw_mitglieder', JSON.stringify(mitglieder));
    schliesseMitgliedModal();
    renderePersonalTabelle();
    if (typeof updateDashboard === 'function') updateDashboard();
}

function loescheMitglied(id) {
    if (!confirm('Möchtest du dieses Mitglied wirklich löschen?')) return;

    let mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
    mitglieder = mitglieder.filter(m => m.id !== id);
    localStorage.setItem('ffw_mitglieder', JSON.stringify(mitglieder));

    renderePersonalTabelle();
    if (typeof updateDashboard === 'function') updateDashboard();
}

function bearbeiteMitglied(id) {
    oeffneMitgliedModal(id);
}

// Funktionen für Onclick global erreichbar machen
window.renderePersonalTabelle = renderePersonalTabelle;
window.oeffneMitgliedModal = oeffneMitgliedModal;
window.schliesseMitgliedModal = schliesseMitgliedModal;
window.speichereMitglied = speichereMitglied;
window.loescheMitglied = loescheMitglied;
window.bearbeiteMitglied = bearbeiteMitglied;
// ==========================================
// FFW Manager - Personalverwaltung
// ==========================================

/**
 * Hilfsfunktion: Prüft Schreibrechte für das Personalmodul
 */
function hatPersonalSchreibRecht() {
    // 1. Priorität: Globale Rechtematrix
    if (typeof window.hatRecht === "function") {
        if (window.hatRecht('personal_schreiben')) return true;
    }
    // 2. Priorität: Direktes Auslesen der aktiven Rolle aus dem Storage
    const userString = localStorage.getItem('ffw_user') || sessionStorage.getItem('ffw_user');
    if (userString) {
        try {
            const u = JSON.parse(userString);
            const rolle = (u.rolle || '').toLowerCase();
            return rolle === 'admin' || rolle === 'editor';
        } catch (e) {
            console.error("Fehler beim Parsen der Rolle:", e);
        }
    }
    const aktiveRolle = localStorage.getItem('ffw_aktive_rolle') || 'gast';
    return aktiveRolle === 'admin' || aktiveRolle === 'editor';
}

/**
 * Initialisiert das Layout und startet den Daten-Sync
 */
function initPersonalLayout() {
    startePersonalEchtzeitSync();
}

/**
 * Echtzeit-Abfrage der Personaldaten (Firebase mit LocalStorage Fallback)
 */
function startePersonalEchtzeitSync() {
    const tbody = document.getElementById('personal-tabelle-body');
    if (!tbody) return;

    if (window.db) {
        window.db.collection('mitglieder').onSnapshot((snapshot) => {
            const mitglieder = [];
            snapshot.forEach(doc => {
                mitglieder.push({ id: doc.id, ...doc.data() });
            });
            localStorage.setItem('ffw_mitglieder', JSON.stringify(mitglieder));
            renderePersonalTabelle(mitglieder);
        }, (error) => {
            console.warn("Firebase-Fehler, schalte auf LocalStorage um:", error);
            ladeLokalePersonalDaten();
        });
    } else {
        ladeLokalePersonalDaten();
    }
}

/**
 * Lade-Fallback für LocalStorage
 */
function ladeLokalePersonalDaten() {
    try {
        const lokaleDaten = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
        renderePersonalTabelle(lokaleDaten);
    } catch (e) {
        console.error("Fehler beim Lesen aus dem LocalStorage:", e);
        renderePersonalTabelle([]);
    }
}

/**
 * Rendern der Personaltabelle
 */
function renderePersonalTabelle(mitgliederInput) {
    const tbody = document.getElementById('personal-tabelle-body');
    if (!tbody) return;

    let mitglieder = mitgliederInput;
    if (!Array.isArray(mitglieder)) {
        try {
            mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
        } catch (e) {
            mitglieder = [];
        }
    }

    const darfSchreiben = hatPersonalSchreibRecht();

    const suche = (document.getElementById('personal-suche')?.value || '').toLowerCase();
    const filterFunktion = document.getElementById('personal-filter-funktion')?.value || '';
    const filterG26 = document.getElementById('personal-filter-g26')?.value || '';
    const heute = new Date();

    const gefiltert = mitglieder.filter(m => {
        const fullText = `${m.vorname || ''} ${m.nachname || ''} ${m.dienstgrad || ''} ${m.kommentar || ''}`.toLowerCase();
        const matchesSuche = fullText.includes(suche);
        const matchesFunktion = filterFunktion === '' || (Array.isArray(m.funktionen) && m.funktionen.includes(filterFunktion));

        let matchesG26 = true;
        if (filterG26 === 'gueltig') {
            matchesG26 = m.g26datum && new Date(m.g26datum) >= heute;
        } else if (filterG26 === 'abgelaufen') {
            matchesG26 = !m.g26datum || new Date(m.g26datum) < heute;
        }

        return matchesSuche && matchesFunktion && matchesG26;
    });

    if (gefiltert.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${darfSchreiben ? 7 : 6}" style="text-align:center; padding: 15px; color: #777;">Keine Mitglieder gefunden.</td></tr>`;
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

        const funktionenBadges = (Array.isArray(m.funktionen) ? m.funktionen : []).map(f => 
            `<span style="background: #e1f5fe; color: #0277bd; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; margin-right: 4px; display: inline-block;">${f}</span>`
        ).join('') || '<span style="color:#aaa;">Keine</span>';

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;"><strong>${m.nachname || ''}</strong>, ${m.vorname || ''}</td>
                <td style="padding: 10px;">${m.dienstgrad || '-'}</td>
                <td style="padding: 10px;">${funktionenBadges}</td>
                <td style="padding: 10px;">${g26Badge}</td>
                <td style="padding: 10px; font-size: 0.9em; color: #444;">${m.lehrgaenge || '-'}</td>
                <td style="padding: 10px; font-size: 0.85em; color: #666;">${m.kommentar || '-'}</td>
                ${darfSchreiben ? `
                    <td style="padding: 10px;">
                        <button class="btn btn-sm" onclick="bearbeiteMitglied('${m.id}')" title="Bearbeiten">✏️</button>
                        <button class="btn btn-sm" onclick="loescheMitglied('${m.id}')" style="color: red;" title="Löschen">🗑️</button>
                    </td>
                ` : ''}
            </tr>
        `;
    }).join('');
}

/**
 * Mitglied Speichern
 */
function speichereMitglied(event) {
    if (event) event.preventDefault();

    if (!hatPersonalSchreibRecht()) {
        alert("⚠️ Sie besitzen keine Berechtigung, Personaldaten zu bearbeiten.");
        return;
    }

    const getVal = (id) => document.getElementById(id)?.value || '';

    const id = getVal('mitglied-id');
    const mitgliedDaten = {
        vorname: getVal('mitglied-vorname'),
        nachname: getVal('mitglied-nachname'),
        dienstgrad: getVal('mitglied-dienstgrad'),
        eintritt: getVal('mitglied-eintritt'),
        g26datum: getVal('mitglied-g26datum'),
        atemschutzuebung: getVal('mitglied-atemschutzuebung'),
        lehrgaenge: getVal('mitglied-lehrgaenge'),
        kommentar: getVal('mitglied-kommentar'),
        funktionen: Array.from(document.querySelectorAll('.cb-funktion:checked')).map(cb => cb.value)
    };

    if (window.db) {
        mitgliedDaten.aktualisiertAm = typeof firebase !== 'undefined' && firebase.firestore?.FieldValue 
            ? firebase.firestore.FieldValue.serverTimestamp() 
            : new Date().toISOString();

        if (id) {
            window.db.collection('mitglieder').doc(id).update(mitgliedDaten)
                .then(() => schliesseMitgliedModal())
                .catch(err => alert("Fehler beim Aktualisieren: " + err.message));
        } else {
            window.db.collection('mitglieder').add(mitgliedDaten)
                .then(() => schliesseMitgliedModal())
                .catch(err => alert("Fehler beim Anlegen: " + err.message));
        }
    } else {
        let mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
        if (id) {
            const index = mitglieder.findIndex(m => m.id === id);
            if (index !== -1) {
                mitglieder[index] = { ...mitglieder[index], ...mitgliedDaten, id };
            }
        } else {
            const neueId = 'local_' + Date.now();
            mitglieder.push({ ...mitgliedDaten, id: neueId });
        }
        localStorage.setItem('ffw_mitglieder', JSON.stringify(mitglieder));
        schliesseMitgliedModal();
        ladeLokalePersonalDaten();
    }
}

/**
 * Mitglied zum Bearbeiten ins Modal laden
 */
function bearbeiteMitglied(id) {
    if (!hatPersonalSchreibRecht()) {
        alert("⚠️ Sie besitzen keine Berechtigung zum Bearbeiten.");
        return;
    }

    let mitglieder = [];
    try {
        mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
    } catch (e) {
        mitglieder = [];
    }

    const m = mitglieder.find(item => item.id === id);
    if (!m) return;

    setVal('mitglied-id', m.id);
    setVal('mitglied-vorname', m.vorname);
    setVal('mitglied-nachname', m.nachname);
    setVal('mitglied-dienstgrad', m.dienstgrad);
    setVal('mitglied-eintritt', m.eintritt);
    setVal('mitglied-g26datum', m.g26datum);
    setVal('mitglied-atemschutzuebung', m.atemschutzuebung);
    setVal('mitglied-lehrgaenge', m.lehrgaenge);
    setVal('mitglied-kommentar', m.kommentar);

    document.querySelectorAll('.cb-funktion').forEach(cb => {
        cb.checked = Array.isArray(m.funktionen) && m.funktionen.includes(cb.value);
    });

    oeffneMitgliedModal();
}

/**
 * Mitglied Löschen
 */
function loescheMitglied(id) {
    if (!hatPersonalSchreibRecht()) {
        alert("⚠️ Sie besitzen keine Berechtigung, Personaldaten zu löschen.");
        return;
    }

    if (!confirm('Möchtest du dieses Mitglied wirklich löschen?')) return;

    if (window.db) {
        window.db.collection('mitglieder').doc(id).delete()
            .catch(err => alert("Fehler beim Löschen: " + err.message));
    } else {
        let mitglieder = JSON.parse(localStorage.getItem('ffw_mitglieder')) || [];
        mitglieder = mitglieder.filter(m => m.id !== id);
        localStorage.setItem('ffw_mitglieder', JSON.stringify(mitglieder));
        ladeLokalePersonalDaten();
    }
}

// Modal-Hilfsfunktionen
function oeffneMitgliedModal() {
    const modal = document.getElementById('mitglied-modal');
    if (modal) modal.style.display = 'block';
}

function schliesseMitgliedModal() {
    const modal = document.getElementById('mitglied-modal');
    if (modal) modal.style.display = 'none';
    const form = document.getElementById('mitglied-form');
    if (form) form.reset();
    setVal('mitglied-id', '');
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}

// Globale Bereitstellung
window.initPersonalLayout = initPersonalLayout;
window.startePersonalEchtzeitSync = startePersonalEchtzeitSync;
window.renderePersonalTabelle = renderePersonalTabelle;
window.speichereMitglied = speichereMitglied;
window.bearbeiteMitglied = bearbeiteMitglied;
window.loescheMitglied = loescheMitglied;
window.oeffneMitgliedModal = oeffneMitgliedModal;
window.schliesseMitgliedModal = schliesseMitgliedModal;
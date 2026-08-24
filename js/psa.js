// ==========================================
// PSA-Verwaltung Modul (ffw-manager)
// ==========================================

// 1. PSA-Daten laden (Fallback auf LocalStorage & storage.js)
function ladePSA() {
    if (typeof ladePsaData === 'function') {
        return ladePsaData();
    }
    const daten = localStorage.getItem('ffw_psa') || localStorage.getItem('ffw_psa_daten');
    try {
        return daten ? JSON.parse(daten) : [];
    } catch (e) {
        console.error("Fehler beim Laden der PSA-Daten:", e);
        return [];
    }
}

// 2. PSA-Daten speichern (Mit aktiver Berechtigungsprüfung)
function speicherePSA(psaListe) {
    // BERECHTIGUNGSPRÜFUNG: Bleibt strikt erhalten
    const darfSchreiben = (typeof istEditor === 'function') ? istEditor() : true;

    if (!darfSchreiben) {
        alert("⚠️ Keine Berechtigung zum Speichern.");
        return false;
    }

    try {
        const bereinigteDaten = Array.isArray(psaListe) ? psaListe : [];

        // Nutzung der zentralen storage.js Speicherfunktion (Lokal + Firebase Cloud)
        if (typeof speichereDaten === 'function') {
            speichereDaten('psa', bereinigteDaten);
        } else if (typeof speicherePsaData === 'function') {
            speicherePsaData(bereinigteDaten);
        } else {
            localStorage.setItem('ffw_psa', JSON.stringify(bereinigteDaten));
            localStorage.setItem('ffw_psa_daten', JSON.stringify(bereinigteDaten));
        }

        // Event auslösen für UI-Updates
        document.dispatchEvent(new Event("psaGeaendert"));
        return true;
    } catch (e) {
        console.error("PSA Speicherfehler:", e);
        alert("❌ Fehler beim Speichern der PSA-Daten.");
        return false;
    }
}

// 3. PSA filtern und Tabelle rendern
function filterPSA() {
    const sucheInput = document.getElementById('psa-suche');
    const statusSelect = document.getElementById('psa-status-filter');
    const tbody = document.getElementById('psa-tabelle-body');

    if (!tbody) return;

    const suchbegriff = sucheInput ? sucheInput.value.toLowerCase().trim() : '';
    const statusFilter = statusSelect ? statusSelect.value : 'alle';

    const allePSA = ladePSA();

    const gefiltert = allePSA.filter(item => {
        const trefferSuche = !suchbegriff || 
            (item.traeger && item.traeger.toLowerCase().includes(suchbegriff)) ||
            (item.spind && String(item.spind).toLowerCase().includes(suchbegriff)) ||
            (item.bezeichnung && item.bezeichnung.toLowerCase().includes(suchbegriff)) ||
            (item.hersteller && item.hersteller.toLowerCase().includes(suchbegriff)) ||
            (item.typ && item.typ.toLowerCase().includes(suchbegriff));

        const trefferStatus = (statusFilter === 'alle') || (item.status === statusFilter);

        return trefferSuche && trefferStatus;
    });

    renderePSATabelle(gefiltert);
}

// 4. HTML-Tabelle aufbauen
function renderePSATabelle(liste) {
    const tbody = document.getElementById('psa-tabelle-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (liste.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-3">Keine PSA-Einträge gefunden.</td></tr>`;
        return;
    }

    const kannBearbeiten = (typeof istEditor === 'function') ? istEditor() : true;

    liste.forEach(item => {
        const tr = document.createElement('tr');
        
        const aktionsButtons = kannBearbeiten ? `
            <button class="btn btn-sm btn-outline-primary me-1" onclick="oeffnePSAModal('${item.id}')" title="Bearbeiten">✏️</button>
            <button class="btn btn-sm btn-outline-danger" onclick="loeschePSAEintragModal('${item.id}')" title="Löschen">🗑️</button>
        ` : `<span class="text-muted">Nur Lesezugriff</span>`;

        // Passend zur Tabellenstruktur im Screenshot (Aktionen am Ende!):
        tr.innerHTML = `
            <td>${item.spind || '-'}</td>
            <td><strong>${item.traeger || 'Unbekannt'}</strong></td>
            <td>${item.hersteller || '-'}</td>
            <td>${item.typ || '-'}</td>
            <td>${item.bezeichnung || '-'}</td>
            <td>${item.groesse || '-'}</td>
            <td>${item.zubehoer || '-'}</td>
            <td>${item.seriennummer || '-'}</td>
            <td>${item.naechstePruefung || '-'}</td>
            <td>${aktionsButtons}</td>
        `;
        tbody.appendChild(tr);
    });
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'Aktiv': return 'bg-success';
        case 'In Prüfung': return 'bg-warning text-dark';
        case 'Ausgemustert': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// 5. Modal-Aktionen (Erstellen / Bearbeiten / Speichern)
function oeffnePSAModal(id = null) {
    if (typeof istEditor === 'function' && !istEditor()) {
        alert("⚠️ Keine Berechtigung zum Bearbeiten.");
        return;
    }

    const modal = document.getElementById('psa-modal');
    const form = document.getElementById('psa-form');
    if (!modal || !form) return;

    form.reset();

    if (id) {
        const allePSA = ladePSA();
        const eintrag = allePSA.find(p => String(p.id) === String(id));
        if (eintrag) {
            document.getElementById('psa-id').value = eintrag.id;
            document.getElementById('psa-traeger').value = eintrag.traeger || '';
            document.getElementById('psa-spind').value = eintrag.spind || '';
            document.getElementById('psa-hersteller').value = eintrag.hersteller || '';
            document.getElementById('psa-typ').value = eintrag.typ || '';
            document.getElementById('psa-bezeichnung').value = eintrag.bezeichnung || '';
            document.getElementById('psa-status').value = eintrag.status || 'Aktiv';
        }
    } else {
        document.getElementById('psa-id').value = 'psa_' + Date.now();
    }

    // Event-Handler für das Formular-Submit setzen
    form.onsubmit = function(e) {
        e.preventDefault();
        savePSAFromModal();
    };

    // Modal anzeigen (Bootstrap Fallback)
    if (window.bootstrap && bootstrap.Modal) {
        const bsModal = bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal);
        bsModal.show();
    } else {
        modal.style.display = 'block';
    }
}

function savePSAFromModal() {
    const id = document.getElementById('psa-id').value;
    const traeger = document.getElementById('psa-traeger').value.trim();
    const spind = document.getElementById('psa-spind').value.trim();
    const hersteller = document.getElementById('psa-hersteller').value.trim();
    const typ = document.getElementById('psa-typ').value.trim();
    const bezeichnung = document.getElementById('psa-bezeichnung').value.trim();
    const status = document.getElementById('psa-status').value;

    if (!traeger) {
        alert("Bitte geben Sie einen Träger an.");
        return;
    }

    let allePSA = ladePSA();
    const me = allePSA.findIndex(p => String(p.id) === String(id));

    const neuerEintrag = { id, traeger, spind, hersteller, typ, bezeichnung, status, geaendertAm: new Date().toISOString() };

    if (me >= 0) {
        allePSA[me] = neuerEintrag;
    } else {
        allePSA.push(neuerEintrag);
    }

    if (speicherePSA(allePSA)) {
        // Modal schliessen
        const modal = document.getElementById('psa-modal');
        if (window.bootstrap && bootstrap.Modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        } else if (modal) {
            modal.style.display = 'none';
        }
        filterPSA();
    }
}

function loeschePSAEintragModal(id) {
    if (typeof istEditor === 'function' && !istEditor()) {
        alert("⚠️ Keine Berechtigung zum Löschen.");
        return;
    }

    if (confirm("Möchten Sie diesen PSA-Eintrag wirklich löschen?")) {
        let allePSA = ladePSA();
        allePSA = allePSA.filter(p => String(p.id) !== String(id));
        if (speicherePSA(allePSA)) {
            filterPSA();
        }
    }
}

// 6. Observer für dynamische UI-Loads & Global Event Listener
document.addEventListener("DOMContentLoaded", () => {
    filterPSA();

    const sucheInput = document.getElementById('psa-suche');
    const statusSelect = document.getElementById('psa-status-filter');

    if (sucheInput) sucheInput.addEventListener('input', filterPSA);
    if (statusSelect) statusSelect.addEventListener('change', filterPSA);
});

document.addEventListener("psaGeaendert", () => {
    filterPSA();
});

// Vollständiger MutationObserver
const observer = new MutationObserver(() => {
    const tbody = document.getElementById('psa-tabelle-body');
    if (tbody && tbody.children.length === 0) {
        filterPSA();
    }
});

observer.observe(document.body, { childList: true, subtree: true });

// Globale Freigaben
window.ladePSA = ladePSA;
window.speicherePSA = speicherePSA;
window.filterPSA = filterPSA;
window.oeffnePSAModal = oeffnePSAModal;
window.savePSAFromModal = savePSAFromModal;
window.loeschePSAEintragModal = loeschePSAEintragModal;
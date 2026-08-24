// ==========================================
// PSA-Verwaltung Modul (ffw-manager)
// ==========================================

// 1. PSA-Daten laden (Fallback auf LocalStorage & storage.js)
function ladePSA() {
    if (typeof window.ladePsaData === 'function') {
        return window.ladePsaData();
    }
    
    // Nutzen der zentralen Hilfsfunktion aus app.js / storage.js
    if (typeof window.ladeDaten === 'function') {
        const d = window.ladeDaten('psa');
        if (d && d.length > 0) return d;
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
    // BERECHTIGUNGSPRÜFUNG: Nutzt zentrales hatRecht() oder Fallback auf istEditor()
    const darfSchreiben = (typeof window.hatRecht === 'function') 
        ? window.hatRecht('psa_schreiben') 
        : ((typeof window.istEditor === 'function') ? window.istEditor() : true);

    if (!darfSchreiben) {
        alert("⚠️ Keine Berechtigung zum Speichern.");
        return false;
    }

    try {
        const bereinigteDaten = Array.isArray(psaListe) ? psaListe : [];

        // Nutzung der zentralen Speicherfunktion (Lokal + Firebase Cloud)
        if (typeof window.speichereDaten === 'function') {
            window.speichereDaten('psa', bereinigteDaten);
        } else if (typeof window.speicherePsaData === 'function') {
            window.speicherePsaData(bereinigteDaten);
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

// 3. Hauptansicht Rendern & Filtern
function renderPSAView() {
    filterPSA();
}

function filterPSA() {
    const sucheInput = document.getElementById('psa-suche');
    const statusSelect = document.getElementById('psa-status-filter');
    const tbody = document.getElementById('psa-tabelle-body');

    if (!tbody) return;

    const suchbegriff = sucheInput ? sucheInput.value.toLowerCase().trim() : '';
    const statusFilter = statusSelect ? statusSelect.value : 'alle';

    const allePSA = ladePSA();

    const gefiltert = allePSA.filter(item => {
        const traegerText = item.traeger || item.name || '';
        const bezeichnungText = item.bezeichnung || item.ausruestung || '';
        
        const trefferSuche = !suchbegriff || 
            (traegerText.toLowerCase().includes(suchbegriff)) ||
            (item.spind && String(item.spind).toLowerCase().includes(suchbegriff)) ||
            (bezeichnungText.toLowerCase().includes(suchbegriff)) ||
            (item.hersteller && item.hersteller.toLowerCase().includes(suchbegriff)) ||
            (item.seriennummer && item.seriennummer.toLowerCase().includes(suchbegriff)) ||
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

    if (!liste || liste.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-3">Keine PSA-Einträge gefunden.</td></tr>`;
        return;
    }

    // Rechteprüfung
    const kannBearbeiten = (typeof window.hatRecht === 'function')
        ? window.hatRecht('psa_schreiben')
        : ((typeof window.istEditor === 'function') ? window.istEditor() : true);

    liste.forEach(item => {
        const tr = document.createElement('tr');
        
        const akteBtn = `<button class="btn btn-sm btn-outline-info me-1" onclick="oeffnePSAAkteModal('${item.id}')" title="Akte / Details">📄</button>`;
        const editBtns = kannBearbeiten ? `
            <button class="btn btn-sm btn-outline-primary me-1" onclick="oeffnePSAModal('${item.id}')" title="Bearbeiten">✏️</button>
            <button class="btn btn-sm btn-outline-danger" onclick="loeschePSAEintragModal('${item.id}')" title="Löschen">🗑️</button>
        ` : `<span class="text-muted ms-1">Nur Lesezugriff</span>`;

        const aktionsButtons = `${akteBtn}${editBtns}`;

        tr.innerHTML = `
            <td>${aktionsButtons}</td>
            <td>${item.spind || '-'}</td>
            <td><strong>${item.traeger || item.name || 'Unbekannt'}</strong></td>
            <td>${item.hersteller || '-'}</td>
            <td>${item.typ || '-'}</td>
            <td>${item.bezeichnung || item.ausruestung || '-'}</td>
            <td>${item.groesse || '-'}</td>
            <td>${item.zubehoer || '-'}</td>
            <td>${item.seriennummer || item.inventarnummer || '-'}</td>
            <td>${item.naechstePruefung || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'Aktiv': 
        case 'Einsatzbereit': return 'bg-success';
        case 'In Prüfung': 
        case 'Wartung': return 'bg-warning text-dark';
        case 'Ausgemustert': 
        case 'Defekt': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Global verfügbare Hilfsfunktion für den Akte-Button
window.oeffnePSAAkteModal = function(id) {
    if (typeof window.zeigPSADetails === 'function') {
        window.zeigPSADetails(id);
    } else if (typeof window.oeffneAkte === 'function') {
        window.oeffneAkte('psa', id);
    } else {
        console.log("Akte-Funktionsaufruf für ID:", id);
    }
};

// Hilfsfunktion zum sicheren Auslesen/Setzen von Formularwerten
function getInputValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function setInputValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}

// 5. Modal-Aktionen (Erstellen / Bearbeiten / Speichern)
function oeffnePSAModal(id = null) {
    const darfBearbeiten = (typeof window.hatRecht === 'function')
        ? window.hatRecht('psa_schreiben')
        : ((typeof window.istEditor === 'function') ? window.istEditor() : true);

    if (!darfBearbeiten) {
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
            setInputValue('psa-id', eintrag.id);
            setInputValue('psa-traeger', eintrag.traeger || eintrag.name);
            setInputValue('psa-spind', eintrag.spind);
            setInputValue('psa-hersteller', eintrag.hersteller);
            setInputValue('psa-typ', eintrag.typ);
            setInputValue('psa-bezeichnung', eintrag.bezeichnung || eintrag.ausruestung);
            setInputValue('psa-groesse', eintrag.groesse);
            setInputValue('psa-zubehoer', eintrag.zubehoer);
            setInputValue('psa-seriennummer', eintrag.seriennummer || eintrag.inventarnummer);
            setInputValue('psa-naechstePruefung', eintrag.naechstePruefung);
            setInputValue('psa-status', eintrag.status || 'Aktiv');
        }
    } else {
        setInputValue('psa-id', 'psa_' + Date.now());
    }

    form.onsubmit = function(e) {
        e.preventDefault();
        savePSAFromModal();
    };

    if (window.bootstrap && bootstrap.Modal) {
        const bsModal = bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal);
        bsModal.show();
    } else {
        modal.style.display = 'block';
    }
}

function savePSAFromModal() {
    const id = getInputValue('psa-id');
    const traeger = getInputValue('psa-traeger');
    const spind = getInputValue('psa-spind');
    const hersteller = getInputValue('psa-hersteller');
    const typ = getInputValue('psa-typ');
    const bezeichnung = getInputValue('psa-bezeichnung');
    const groesse = getInputValue('psa-groesse');
    const zubehoer = getInputValue('psa-zubehoer');
    const seriennummer = getInputValue('psa-seriennummer');
    const naechstePruefung = getInputValue('psa-naechstePruefung');
    const status = getInputValue('psa-status') || 'Aktiv';

    if (!traeger) {
        alert("Bitte geben Sie einen Träger an.");
        return;
    }

    let allePSA = ladePSA();
    const index = allePSA.findIndex(p => String(p.id) === String(id));

    const neuerEintrag = {
        id,
        traeger,
        spind,
        hersteller,
        typ,
        bezeichnung,
        groesse,
        zubehoer,
        seriennummer,
        naechstePruefung,
        status,
        geaendertAm: new Date().toISOString()
    };

    if (index >= 0) {
        allePSA[index] = { ...allePSA[index], ...neuerEintrag };
    } else {
        allePSA.push(neuerEintrag);
    }

    if (speicherePSA(allePSA)) {
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
    const darfLöschen = (typeof window.hatRecht === 'function')
        ? window.hatRecht('psa_schreiben')
        : ((typeof window.istEditor === 'function') ? window.istEditor() : true);

    if (!darfLöschen) {
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

// 6. Event Listener & Initialisierung
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

// Globale Freigaben
window.ladePSA = ladePSA;
window.speicherePSA = speicherePSA;
window.renderPSAView = renderPSAView;
window.filterPSA = filterPSA;
window.renderePSATabelle = renderePSATabelle;
window.oeffnePSAModal = oeffnePSAModal;
window.savePSAFromModal = savePSAFromModal;
window.loeschePSAEintragModal = loeschePSAEintragModal;
// ==========================================
// PSA-Verwaltung Modul (ffw-manager) - KORRIGIERT & RECHTEGEPRÜFT
// ==========================================

// Hilfsfunktion: Aktuelle Benutzerrolle aus allen Quellen sicher ermitteln
function holePSAUserRolle() {
    try {
        const user = JSON.parse(localStorage.getItem('ffw_aktiver_benutzer') || localStorage.getItem('ffw_user') || '{}');
        const rolle = localStorage.getItem('ffw_aktive_rolle') || user.rolle || 'gast';
        return String(rolle).toLowerCase().trim();
    } catch (e) {
        return 'gast';
    }
}

// Prüfe Leserechte (gast = kein Zugriff, viewer/editor/admin = Zugriff)
function hatPSALeserechte() {
    const rolle = holePSAUserRolle();
    return ['viewer', 'editor', 'admin'].includes(rolle);
}

// Sichere Hilfsfunktion für Schreibrechte (nur editor & admin)
function hatPSASchreibrechte() {
    if (typeof window.hatRecht === 'function') {
        return window.hatRecht('psa_schreiben');
    }
    if (typeof window.istEditor === 'function') {
        return window.istEditor();
    }
    const rolle = holePSAUserRolle();
    return ['editor', 'admin'].includes(rolle);
}

// 1. PSA-Daten laden
function ladePSA() {
    if (typeof window.ladePsaData === 'function') return window.ladePsaData();
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

// 2. PSA-Daten speichern (KORRIGIERT)
function speicherePSA(psaListe) {
    if (!hatPSASchreibrechte()) {
        alert("⚠️ Keine Berechtigung zum Speichern.");
        return false;
    }

    try {
        const bereinigteDaten = Array.isArray(psaListe) ? psaListe : [];

        // 1. Primär: Zentrale Speicherfunktion nutzen
        if (typeof window.speichereDaten === 'function') {
            window.speichereDaten('psa', bereinigteDaten);
        } else if (typeof window.speicherePsaData === 'function') {
            window.speicherePsaData(bereinigteDaten);
        }

        // 2. Immer auch lokal zur Sicherheit ablegen (Fallback)
        localStorage.setItem('ffw_psa', JSON.stringify(bereinigteDaten));
        localStorage.setItem('ffw_psa_daten', JSON.stringify(bereinigteDaten));

        document.dispatchEvent(new Event("psaGeaendert"));
        
        // WICHTIG: Explizit true zurückgeben!
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

// 4. HTML-Tabelle aufbauen mit Rechteschutz
function renderePSATabelle(liste) {
    const tbody = document.getElementById('psa-tabelle-body');
    const neuBtn = document.getElementById('btn-neues-psa') || document.getElementById('btn-psa-neu');
    if (!tbody) return;

    tbody.innerHTML = '';

    // 1. GAST-CHECK: Gäste sehen absolut keine Inhalte
    if (!hatPSALeserechte()) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-danger py-4" style="background-color: #f8d7da;">
                    🔒 <strong>Zugriff verweigert:</strong> Als Gast hast du keine Berechtigung, die PSA-Daten einzusehen.
                </td>
            </tr>`;
        if (neuBtn) neuBtn.style.display = 'none';
        return;
    }

    const kannBearbeiten = hatPSASchreibrechte();

    // 2. VIEWER-CHECK: "Neues PSA"-Button ein-/ausblenden
    if (neuBtn) {
        neuBtn.style.display = kannBearbeiten ? 'inline-block' : 'none';
    }

    if (!liste || liste.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-3">Keine PSA-Einträge gefunden.</td></tr>`;
        return;
    }

    liste.forEach(item => {
        const tr = document.createElement('tr');
        
        const akteBtn = `<button class="btn btn-sm btn-outline-info me-1" onclick="window.oeffnePSAAkteModal('${item.id}')" title="Akte / Details">📄</button>`;
        const editBtns = kannBearbeiten ? `
            <button class="btn btn-sm btn-outline-primary me-1" onclick="window.oeffnePSAModal('${item.id}')" title="Bearbeiten">✏️</button>
            <button class="btn btn-sm btn-outline-danger" onclick="window.loeschePSAEintragModal('${item.id}')" title="Löschen">🗑️</button>
        ` : `<span class="text-muted ms-1" style="font-size: 0.85em;">👁️ Nur Lesezugriff</span>`;

        tr.innerHTML = `
            <td>${akteBtn}${editBtns}</td>
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

// Global verfügbare Hilfsfunktion für den Akte-Button
window.oeffnePSAAkteModal = function(id) {
    if (typeof window.zeigPSADetails === 'function') {
        window.zeigPSADetails(id);
    } else if (typeof window.oeffneAkte === 'function') {
        window.oeffneAkte('psa', id);
    } else {
        alert("Details-Ansicht für Akte (ID: " + id + ") wird vorbereitet.");
    }
};

function getInputValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function setInputValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}

// 5. Modal-Aktionen
function oeffnePSAModal(id = null) {
    if (!hatPSASchreibrechte()) {
        alert("⚠️ Keine Berechtigung zum Bearbeiten.");
        return;
    }

    const modal = document.getElementById('psa-modal');
    const form = document.getElementById('psa-form');
    if (!modal) {
        alert("Fehler: PSA-Modal (HTML) wurde nicht gefunden.");
        return;
    }

    if (form) form.reset();

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

    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();
            savePSAFromModal();
        };
    }

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

    if (!traeger) {
        alert("Bitte geben Sie einen Träger an.");
        return;
    }

    let allePSA = ladePSA();
    const index = allePSA.findIndex(p => String(p.id) === String(id));

    const neuerEintrag = {
        id,
        traeger,
        spind: getInputValue('psa-spind'),
        hersteller: getInputValue('psa-hersteller'),
        typ: getInputValue('psa-typ'),
        bezeichnung: getInputValue('psa-bezeichnung'),
        groesse: getInputValue('psa-groesse'),
        zubehoer: getInputValue('psa-zubehoer'),
        seriennummer: getInputValue('psa-seriennummer'),
        naechstePruefung: getInputValue('psa-naechstePruefung'),
        status: getInputValue('psa-status') || 'Aktiv',
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
    if (!hatPSASchreibrechte()) {
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
    const neuBtn = document.getElementById('btn-neues-psa') || document.getElementById('btn-psa-neu');

    if (sucheInput) sucheInput.addEventListener('input', filterPSA);
    if (statusSelect) statusSelect.addEventListener('change', filterPSA);
    
    // Automatisches Verknüpfen des "Neues PSA anlegen"-Buttons
    if (neuBtn) {
        neuBtn.addEventListener('click', () => oeffnePSAModal());
    }
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
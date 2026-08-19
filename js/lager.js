/* ==========================================
   Lager-Verwaltung (lager.js) - Vollständige Reparatur-Version
   ========================================== */

(function () {
    'use strict';

    // ------------------------------------------
    // Speicher-Mechanismen (Firebase / LocalStorage)
    // ------------------------------------------
    function holeLagerDaten() {
        if (typeof ladeDaten === 'function') {
            try {
                const d = ladeDaten('lager');
                if (d && Array.isArray(d)) return d;
            } catch (e) {
                console.warn("ladeDaten('lager') fehlgeschlagen:", e);
            }
        }
        try {
            const local = localStorage.getItem('lager');
            if (local) return JSON.parse(local) || [];
        } catch (e) {
            console.error("Fehler beim Laden aus LocalStorage:", e);
        }
        return [];
    }

    function speichereLagerDaten(daten) {
        if (typeof speichereDaten === 'function') {
            try {
                speichereDaten('lager', daten);
            } catch (e) {
                console.warn("speichereDaten('lager') fehlgeschlagen:", e);
            }
        }
        try {
            localStorage.setItem('lager', JSON.stringify(daten));
        } catch (e) {
            console.error("Fehler beim Speichern in LocalStorage:", e);
        }
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function findeLagerContainer() {
        const ids = [
            'lager-tabelle', 'lager-liste', 'lager-table', 
            'lager-content', 'lager-container', 'lagerContainer', 
            'content', 'main-content'
        ];
        for (let id of ids) {
            const el = document.getElementById(id);
            if (el) return el;
        }
        return document.querySelector('.lager-container') || document.querySelector('main');
    }

    // ------------------------------------------
    // Sicheres Einblend-System für Modals (Eingabemaske)
    // ------------------------------------------
    function erstelleModalFallsNichtVorhanden() {
        if (document.getElementById('lagerAkteModal')) return;

        const modalHTML = `
        <div class="modal fade" id="lagerAkteModal" tabindex="-1" style="display:none;" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="lagerModalTitle">Artikel bearbeiten</h5>
                        <button type="button" class="btn-close btn-close-white" onclick="schliesseLagerModal()"></button>
                    </div>
                    <div class="modal-body">
                        <form id="lagerAkteForm" onsubmit="event.preventDefault(); speichereLagerItem();">
                            <input type="hidden" id="lager-id">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Artikelnummer</label>
                                    <input type="text" class="form-control" id="lager-artikelnummer">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Hersteller</label>
                                    <input type="text" class="form-control" id="lager-hersteller" placeholder="z. B. HAIX, Rosenbauer">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Bezeichnung / Name *</label>
                                <input type="text" class="form-control" id="lager-bezeichnung" required placeholder="z. B. Feuerwehrstiefel">
                            </div>
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Kategorie</label>
                                    <input type="text" class="form-control" id="lager-kategorie" placeholder="z. B. PSA">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Größe</label>
                                    <input type="text" class="form-control" id="lager-groesse" placeholder="z. B. 42, XL">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Zustand</label>
                                    <select class="form-select" id="lager-zustand">
                                        <option value="Neu">Neu</option>
                                        <option value="Gebraucht">Gebraucht</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Bestand</label>
                                    <input type="number" class="form-control" id="lager-bestand" value="0" min="0">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Mindestbestand</label>
                                    <input type="number" class="form-control" id="lager-mindestbestand" value="0" min="0">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Sollbestand</label>
                                    <input type="number" class="form-control" id="lager-sollbestand" value="0" min="0">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="schliesseLagerModal()">Abbrechen</button>
                        <button type="button" class="btn btn-success" onclick="speichereLagerItem()">Speichern</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    function zeigeModal() {
        erstelleModalFallsNichtVorhanden();
        const modalEl = document.getElementById('lagerAkteModal');
        
        if (window.bootstrap && window.bootstrap.Modal) {
            let instance = bootstrap.Modal.getInstance(modalEl);
            if (!instance) instance = new bootstrap.Modal(modalEl);
            instance.show();
            return;
        }

        // Fallback ohne Bootstrap JS
        modalEl.style.display = 'block';
        modalEl.classList.add('show');
        document.body.classList.add('modal-open');

        let backdrop = document.getElementById('custom-modal-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'custom-modal-backdrop';
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
        }
    }

    function schliesseLagerModal() {
        const modalEl = document.getElementById('lagerAkteModal');
        if (!modalEl) return;

        if (window.bootstrap && window.bootstrap.Modal) {
            const instance = bootstrap.Modal.getInstance(modalEl);
            if (instance) instance.hide();
        }

        modalEl.style.display = 'none';
        modalEl.classList.remove('show');
        document.body.classList.remove('modal-open');

        const backdrop = document.getElementById('custom-modal-backdrop');
        if (backdrop) backdrop.remove();
    }

    // ------------------------------------------
    // Artikel anlegen / bearbeiten öffnen
    // ------------------------------------------
    function openLagerAkteModal(id = null) {
        erstelleModalFallsNichtVorhanden();

        const lager = holeLagerDaten();
        const item = id ? lager.find(i => String(i.id) === String(id)) : null;

        document.getElementById('lagerModalTitle').innerText = item ? 'Artikel bearbeiten' : 'Neuer Artikel';
        document.getElementById('lager-id').value = item ? item.id : '';
        document.getElementById('lager-artikelnummer').value = item ? (item.artikelnummer || '') : '';
        document.getElementById('lager-hersteller').value = item ? (item.hersteller || '') : '';
        document.getElementById('lager-bezeichnung').value = item ? (item.bezeichnung || item.name || '') : '';
        document.getElementById('lager-kategorie').value = item ? (item.kategorie || '') : '';
        document.getElementById('lager-groesse').value = item ? (item.groesse || item.größe || '') : '';
        document.getElementById('lager-zustand').value = item ? (item.zustand || 'Neu') : 'Neu';
        document.getElementById('lager-bestand').value = item ? (item.bestand ?? item.menge ?? 0) : 0;
        document.getElementById('lager-mindestbestand').value = item ? (item.mindestbestand ?? item.mindestmenge ?? 0) : 0;
        document.getElementById('lager-sollbestand').value = item ? (item.sollbestand ?? 0) : 0;

        zeigeModal();
    }

    // ------------------------------------------
    // Hauptfunktion: Tabelle Rendern
    // ------------------------------------------
    function renderLagerView() {
        const container = findeLagerContainer();
        if (!container) return;

        const lager = holeLagerDaten();

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3 mt-2">
                <button class="btn btn-primary" onclick="openLagerAkteModal()">
                    ➕ Artikel hinzufügen
                </button>
                <div>
                    <small class="text-muted">Anzahl Artikel: <strong>${lager.length}</strong></small>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="table table-striped table-hover align-middle">
                    <thead class="table-dark">
                        <tr>
                            <th>Artikel-Nr.</th>
                            <th>Bezeichnung</th>
                            <th>Hersteller</th>
                            <th>Kategorie</th>
                            <th>Größe</th>
                            <th>Zustand</th>
                            <th>Bestand</th>
                            <th>Mindestbestand</th>
                            <th>Sollbestand</th>
                            <th>Status</th>
                            <th class="text-end">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (lager.length === 0) {
            html += `<tr><td colspan="11" class="text-center text-muted py-4">Keine Artikel im Lager vorhanden. Nutzen Sie den Button oben oder den CSV-Import.</td></tr>`;
        } else {
            lager.forEach(item => {
                const bestand = parseInt(item.bestand ?? item.menge ?? 0, 10);
                const mindestbestand = parseInt(item.mindestbestand ?? item.mindestmenge ?? 0, 10);
                const sollbestand = parseInt(item.sollbestand ?? 0, 10);
                const zustand = item.zustand || 'Neu';

                let statusBadge = '<span class="badge bg-success">OK</span>';
                if (mindestbestand > 0 && bestand <= mindestbestand) {
                    statusBadge = '<span class="badge bg-danger">Kritisch</span>';
                } else if (sollbestand > 0 && bestand < sollbestand) {
                    statusBadge = '<span class="badge bg-warning text-dark">Nachbestellen</span>';
                }

                let zustandBadge = zustand === 'Gebraucht' 
                    ? '<span class="badge bg-secondary">Gebraucht</span>' 
                    : '<span class="badge bg-info text-dark">Neu</span>';

                html += `
                    <tr>
                        <td>${escapeHtml(item.artikelnummer || '-')}</td>
                        <td><strong>${escapeHtml(item.bezeichnung || item.name || '')}</strong></td>
                        <td>${escapeHtml(item.hersteller || '-')}</td>
                        <td>${escapeHtml(item.kategorie || '-')}</td>
                        <td>${escapeHtml(item.groesse || item.größe || '-')}</td>
                        <td>${zustandBadge}</td>
                        <td><strong>${bestand}</strong></td>
                        <td>${mindestbestand}</td>
                        <td>${sollbestand}</td>
                        <td>${statusBadge}</td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="openLagerAkteModal('${item.id}')" title="Bearbeiten">
                                ✏️ Bearbeiten
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="loescheLagerItem('${item.id}')" title="Löschen">
                                🗑️
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    // ------------------------------------------
    // Speichern & Löschen
    // ------------------------------------------
    function speichereLagerItem() {
        const id = document.getElementById('lager-id').value;
        const bezeichnung = document.getElementById('lager-bezeichnung').value.trim();

        if (!bezeichnung) {
            alert('Bitte geben Sie eine Bezeichnung ein.');
            return;
        }

        let lager = holeLagerDaten();

        const newItem = {
            id: id || ('LAGER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)),
            artikelnummer: document.getElementById('lager-artikelnummer').value.trim(),
            hersteller: document.getElementById('lager-hersteller').value.trim(),
            bezeichnung: bezeichnung,
            name: bezeichnung,
            kategorie: document.getElementById('lager-kategorie').value.trim(),
            groesse: document.getElementById('lager-groesse').value.trim(),
            zustand: document.getElementById('lager-zustand').value,
            bestand: parseInt(document.getElementById('lager-bestand').value, 10) || 0,
            mindestbestand: parseInt(document.getElementById('lager-mindestbestand').value, 10) || 0,
            sollbestand: parseInt(document.getElementById('lager-sollbestand').value, 10) || 0
        };

        if (id) {
            const index = lager.findIndex(i => String(i.id) === String(id));
            if (index !== -1) lager[index] = newItem;
            else lager.push(newItem);
        } else {
            lager.push(newItem);
        }

        speichereLagerDaten(lager);
        schliesseLagerModal();
        renderLagerView();
    }

    function loescheLagerItem(id) {
        if (!confirm('Möchten Sie diesen Artikel wirklich löschen?')) return;
        let lager = holeLagerDaten();
        lager = lager.filter(item => String(item.id) !== String(id));
        speichereLagerDaten(lager);
        renderLagerView();
    }

    // ------------------------------------------
    // FEHLERFREIER CSV IMPORT & EXPORT
    // ------------------------------------------
    function importLagerCSV(event) {
        const file = event.target ? event.target.files[0] : null;
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result;
            const zeilen = text.split(/\r\n|\n/);
            if (zeilen.length < 2) {
                alert('Die CSV-Datei enthält keine Daten.');
                return;
            }

            let lagerListe = holeLagerDaten();
            let hinzugefuegt = 0;
            let geaendert = 0;

            for (let i = 1; i < zeilen.length; i++) {
                const zeile = zeilen[i].trim();
                if (!zeile) continue;

                const spalten = zeile.split(';');
                if (spalten.length >= 4) {
                    const rawId = spalten[0] ? spalten[0].trim() : '';
                    const artikelnummer = spalten[1] ? spalten[1].trim() : '';
                    const hersteller = spalten[2] ? spalten[2].trim() : '';
                    const bezeichnung = spalten[3] ? spalten[3].trim() : '';

                    if (!bezeichnung) continue; // Überspringe Zeilen ohne Bezeichnung

                    const kategorie = spalten[4] ? spalten[4].trim() : '';
                    const groesse = spalten[5] ? spalten[5].trim() : '';
                    const zustand = (spalten[6] && spalten[6].trim().toLowerCase() === 'gebraucht') ? 'Gebraucht' : 'Neu';
                    const bestand = parseInt(spalten[7], 10) || 0;
                    const mindestbestand = parseInt(spalten[8], 10) || 0;
                    const sollbestand = parseInt(spalten[9], 10) || 0;

                    let existingIndex = -1;
                    if (rawId) {
                        existingIndex = lagerListe.findIndex(l => String(l.id) === String(rawId));
                    }

                    // Falls keine ID da ist, erstelle eine neue eindeutige ID
                    const id = rawId || ('LAGER_IMPORT_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 4));

                    const item = {
                        id, artikelnummer, hersteller, bezeichnung, name: bezeichnung,
                        kategorie, groesse, zustand, bestand, mindestbestand, sollbestand
                    };

                    if (existingIndex !== -1) {
                        lagerListe[existingIndex] = item;
                        geaendert++;
                    } else {
                        lagerListe.push(item);
                        hinzugefuegt++;
                    }
                }
            }

            speichereLagerDaten(lagerListe);
            if (event.target) event.target.value = '';
            renderLagerView();
            alert(`Import abgeschlossen!\n- ${hinzugefuegt} neue Artikel hinzugefügt\n- ${geaendert} bestehende Artikel aktualisiert`);
        };

        reader.readAsText(file, 'UTF-8');
    }

    function exportLagerCSV() {
        const lager = holeLagerDaten();
        if (lager.length === 0) {
            alert('Keine Lagerdaten zum Exportieren vorhanden.');
            return;
        }

        let csv = 'ID;Artikelnummer;Hersteller;Bezeichnung;Kategorie;Groesse;Zustand;Bestand;Mindestbestand;Sollbestand\n';
        lager.forEach(item => {
            const id = item.id || '';
            const artNr = (item.artikelnummer || '').replace(/;/g, ',');
            const hersteller = (item.hersteller || '').replace(/;/g, ',');
            const bez = (item.bezeichnung || item.name || '').replace(/;/g, ',');
            const kat = (item.kategorie || '').replace(/;/g, ',');
            const groesse = (item.groesse || item.größe || '').replace(/;/g, ',');
            const zustand = item.zustand || 'Neu';
            const bestand = item.bestand ?? item.menge ?? 0;
            const mindest = item.mindestbestand ?? item.mindestmenge ?? 0;
            const soll = item.sollbestand ?? 0;

            csv += `${id};${artNr};${hersteller};${bez};${kat};${groesse};${zustand};${bestand};${mindest};${soll}\n`;
        });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `lagerbestand_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    function druckeLagerListe() {
        window.print();
    }

    // ------------------------------------------
    // Globale Verknüpfungen (alle gängigen Namen)
    // ------------------------------------------
    window.ladeLager = renderLagerView;
    window.renderLagerView = renderLagerView;
    window.openLagerAkteModal = openLagerAkteModal;
    window.openLagerModal = openLagerAkteModal;
    window.neuerLagerArtikel = openLagerAkteModal;
    window.schliesseLagerModal = schliesseLagerModal;
    window.speichereLagerItem = speichereLagerItem;
    window.loescheLagerItem = loescheLagerItem;
    window.exportLagerCSV = exportLagerCSV;
    window.importLagerCSV = importLagerCSV;
    window.druckeLagerListe = druckeLagerListe;

    // Automatischer Aufruf
    document.addEventListener('DOMContentLoaded', renderLagerView);

})();
/* ==========================================
   Lager-Verwaltung (lager.js) - Vollständige Version
   Inkl. herstellerunabhängiger Modal-Steuerung
   ========================================== */

(function () {
    'use strict';

    // ------------------------------------------
    // Hilfsfunktionen für Speicherzugriff
    // ------------------------------------------
    function holeLagerDaten() {
        if (typeof ladeDaten === 'function') {
            const d = ladeDaten('lager');
            if (d && Array.isArray(d)) return d;
        }
        try {
            const local = localStorage.getItem('lager');
            if (local) return JSON.parse(local) || [];
        } catch (e) {
            console.error("Fehler beim Laden der Lagerdaten:", e);
        }
        return [];
    }

    function speichereLagerDaten(daten) {
        if (typeof speichereDaten === 'function') {
            speichereDaten('lager', daten);
        } else {
            localStorage.setItem('lager', JSON.stringify(daten));
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
        const moeglicheIDs = [
            'lager-tabelle',
            'lager-liste',
            'lager-table',
            'lager-content',
            'lager-container',
            'lagerContainer',
            'content'
        ];
        for (let id of moeglicheIDs) {
            const el = document.getElementById(id);
            if (el) return el;
        }
        return document.querySelector('.lager-container') || document.querySelector('#content');
    }

    // ------------------------------------------
    // Sichere Modal-Steuerung (Funktioniert IMMER)
    // ------------------------------------------
    function zeigeModal(modalEl) {
        if (!modalEl) return;
        
        // 1. Versuche Bootstrap 5
        if (window.bootstrap && window.bootstrap.Modal) {
            let instance = bootstrap.Modal.getInstance(modalEl);
            if (!instance) instance = new bootstrap.Modal(modalEl);
            instance.show();
            return;
        }
        // 2. Versuche jQuery / Bootstrap 4
        if (window.jQuery && typeof window.jQuery(modalEl).modal === 'function') {
            window.jQuery(modalEl).modal('show');
            return;
        }
        // 3. Reines JavaScript Fallback (ohne externe Bibliotheken)
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

    function schliesseModal(modalEl) {
        if (!modalEl) return;

        if (window.bootstrap && window.bootstrap.Modal) {
            const instance = bootstrap.Modal.getInstance(modalEl);
            if (instance) instance.hide();
        }
        if (window.jQuery && typeof window.jQuery(modalEl).modal === 'function') {
            window.jQuery(modalEl).modal('hide');
        }

        modalEl.style.display = 'none';
        modalEl.classList.remove('show');
        document.body.classList.remove('modal-open');

        const backdrop = document.getElementById('custom-modal-backdrop');
        if (backdrop) backdrop.remove();
    }

    // ------------------------------------------
    // Hauptfunktion: Rendering der Lager-Tabelle
    // ------------------------------------------
    function renderLagerView() {
        const container = findeLagerContainer();
        if (!container) return;

        const lager = holeLagerDaten();

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3 mt-2">
                <button class="btn btn-primary" onclick="openLagerAkteModal()">
                    <i class="bi bi-plus-lg"></i> + Artikel hinzufügen
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
            html += `<tr><td colspan="11" class="text-center text-muted py-4">Keine Artikel im Lager vorhanden.</td></tr>`;
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
    // Modal anzeigen (Erstellen / Bearbeiten)
    // ------------------------------------------
    function openLagerAkteModal(id = null) {
        const lager = holeLagerDaten();
        const item = id ? lager.find(i => String(i.id) === String(id)) : null;
        const modalTitle = item ? 'Artikel bearbeiten' : 'Neuer Artikel';
        
        let modalEl = document.getElementById('lagerAkteModal');
        if (!modalEl) {
            const modalHTML = `
            <div class="modal fade" id="lagerAkteModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="lagerModalTitle"></h5>
                            <button type="button" class="btn-close" onclick="schliesseLagerModal()" aria-label="Schließen"></button>
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
                                        <input type="text" class="form-control" id="lager-hersteller" placeholder="z. B. Rosenbauer, Weber">
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Bezeichnung / Name *</label>
                                    <input type="text" class="form-control" id="lager-bezeichnung" required>
                                </div>
                                <div class="row">
                                    <div class="col-md-4 mb-3">
                                        <label class="form-label">Kategorie</label>
                                        <input type="text" class="form-control" id="lager-kategorie">
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label class="form-label">Größe</label>
                                        <input type="text" class="form-control" id="lager-groesse">
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
                            <button type="button" class="btn btn-primary" onclick="speichereLagerItem()">Speichern</button>
                        </div>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modalEl = document.getElementById('lagerAkteModal');
        }

        document.getElementById('lagerModalTitle').innerText = modalTitle;
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

        zeigeModal(modalEl);
    }

    function schliesseLagerModal() {
        const modalEl = document.getElementById('lagerAkteModal');
        schliesseModal(modalEl);
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
            id: id || Date.now().toString(),
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
    // CSV Export, Import & Drucken
    // ------------------------------------------
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

    function importLagerCSV(event) {
        const file = event.target ? event.target.files[0] : null;
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result;
            const zeilen = text.split(/\r\n|\n/);
            if (zeilen.length < 2) return;

            let lagerListe = holeLagerDaten();
            let importKount = 0;

            for (let i = 1; i < zeilen.length; i++) {
                const zeile = zeilen[i].trim();
                if (!zeile) continue;

                const spalten = zeile.split(';');
                if (spalten.length >= 3) {
                    const id = spalten[0] ? spalten[0].trim() : Date.now().toString() + '_' + i;
                    const artikelnummer = spalten[1] ? spalten[1].trim() : '';
                    const hersteller = spalten[2] ? spalten[2].trim() : '';
                    const bezeichnung = spalten[3] ? spalten[3].trim() : '';

                    if (!bezeichnung) continue;

                    const kategorie = spalten[4] ? spalten[4].trim() : '';
                    const groesse = spalten[5] ? spalten[5].trim() : '';
                    const zustand = (spalten[6] && spalten[6].trim().toLowerCase() === 'gebraucht') ? 'Gebraucht' : 'Neu';
                    const bestand = parseInt(spalten[7], 10) || 0;
                    const mindestbestand = parseInt(spalten[8], 10) || 0;
                    const sollbestand = parseInt(spalten[9], 10) || 0;

                    const item = {
                        id, artikelnummer, hersteller, bezeichnung, name: bezeichnung,
                        kategorie, groesse, zustand, bestand, mindestbestand, sollbestand
                    };

                    const index = lagerListe.findIndex(l => String(l.id) === String(id));
                    if (index !== -1) lagerListe[index] = item;
                    else lagerListe.push(item);
                    importKount++;
                }
            }

            speichereLagerDaten(lagerListe);
            if (event.target) event.target.value = '';
            renderLagerView();
            alert(`${importKount} Artikel erfolgreich importiert/aktualisiert.`);
        };

        reader.readAsText(file, 'UTF-8');
    }

    function druckeLagerListe() {
        window.print();
    }

    // ------------------------------------------
    // Alle Funktionsnamen global registrieren
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
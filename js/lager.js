/* ==========================================
   Lager-Verwaltung (lager.js) - Korrigierte Version
   ========================================== */

(function () {
    'use strict';

    // ------------------------------------------
    // Hilfsfunktionen für Speicherzugriff
    // ------------------------------------------
    function holeLagerDaten() {
        if (typeof ladeDaten === 'function') {
            return ladeDaten('lager') || [];
        }
        try {
            return JSON.parse(localStorage.getItem('lager')) || [];
        } catch (e) {
            console.error("Fehler beim Laden der Lagerdaten:", e);
            return [];
        }
    }

    function speichereLagerDaten(daten) {
        if (typeof speichereDaten === 'function') {
            speichereDaten('lager', daten);
        } else {
            localStorage.setItem('lager', JSON.stringify(daten));
        }
    }

    // ------------------------------------------
    // Hauptfunktion: Rendering der Lager-Ansicht
    // ------------------------------------------
    function renderLagerView() {
        const container = document.getElementById('lager-content') || document.getElementById('content');
        if (!container) return;

        const lager = holeLagerDaten();

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h2>Lagerbestand</h2>
                <div>
                    <button class="btn btn-primary me-2" onclick="openLagerAkteModal()">
                        <i class="bi bi-plus-lg"></i> Artikel hinzufügen
                    </button>
                    <button class="btn btn-outline-secondary me-2" onclick="exportLagerCSV()">
                        <i class="bi bi-download"></i> CSV Export
                    </button>
                    <button class="btn btn-outline-secondary" onclick="document.getElementById('lager-csv-input').click()">
                        <i class="bi bi-upload"></i> CSV Import
                    </button>
                    <input type="file" id="lager-csv-input" accept=".csv" style="display:none" onchange="importLagerCSV(event)">
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="table table-striped table-hover align-middle">
                    <thead class="table-dark">
                        <tr>
                            <th>Artikelnummer</th>
                            <th>Bezeichnung</th>
                            <th>Kategorie</th>
                            <th>Größe</th>
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
            html += `<tr><td colspan="9" class="text-center text-muted py-4">Keine Artikel im Lager vorhanden.</td></tr>`;
        } else {
            lager.forEach(item => {
                const bestand = parseInt(item.bestand || item.menge || 0, 10);
                const mindestbestand = parseInt(item.mindestbestand || item.mindestmenge || 0, 10);
                const sollbestand = parseInt(item.sollbestand || 0, 10);

                let statusBadge = '<span class="badge bg-success">OK</span>';
                if (mindestbestand > 0 && bestand <= mindestbestand) {
                    statusBadge = '<span class="badge bg-danger">Kritisch</span>';
                } else if (sollbestand > 0 && bestand < sollbestand) {
                    statusBadge = '<span class="badge bg-warning text-dark">Nachbestellen</span>';
                }

                html += `
                    <tr>
                        <td>${escapeHtml(item.artikelnummer || '-')}</td>
                        <td><strong>${escapeHtml(item.bezeichnung || item.name || '')}</strong></td>
                        <td>${escapeHtml(item.kategorie || '-')}</td>
                        <td>${escapeHtml(item.groesse || item.größe || '-')}</td>
                        <td>${bestand}</td>
                        <td>${mindestbestand}</td>
                        <td>${sollbestand}</td>
                        <td>${statusBadge}</td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="openLagerAkteModal('${item.id}')" title="Bearbeiten">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="loescheLagerItem('${item.id}')" title="Löschen">
                                <i class="bi bi-trash"></i>
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

    // Hilfsfunktion gegen XSS
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ------------------------------------------
    // Modal zum Erstellen/Bearbeiten
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
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
                        </div>
                        <div class="modal-body">
                            <form id="lagerAkteForm">
                                <input type="hidden" id="lager-id">
                                <div class="mb-3">
                                    <label class="form-label">Artikelnummer</label>
                                    <input type="text" class="form-control" id="lager-artikelnummer">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Bezeichnung / Name *</label>
                                    <input type="text" class="form-control" id="lager-bezeichnung" required>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Kategorie</label>
                                        <input type="text" class="form-control" id="lager-kategorie">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Größe</label>
                                        <input type="text" class="form-control" id="lager-groesse">
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
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
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
        document.getElementById('lager-bezeichnung').value = item ? (item.bezeichnung || item.name || '') : '';
        document.getElementById('lager-kategorie').value = item ? (item.kategorie || '') : '';
        document.getElementById('lager-groesse').value = item ? (item.groesse || item.größe || '') : '';
        document.getElementById('lager-bestand').value = item ? (item.bestand ?? item.menge ?? 0) : 0;
        document.getElementById('lager-mindestbestand').value = item ? (item.mindestbestand ?? item.mindestmenge ?? 0) : 0;
        document.getElementById('lager-sollbestand').value = item ? (item.sollbestand ?? 0) : 0;

        const bsModal = new bootstrap.Modal(modalEl);
        bsModal.show();
    }

    // ------------------------------------------
    // Speichern eines Artikels
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
            bezeichnung: bezeichnung,
            name: bezeichnung,
            kategorie: document.getElementById('lager-kategorie').value.trim(),
            groesse: document.getElementById('lager-groesse').value.trim(),
            bestand: parseInt(document.getElementById('lager-bestand').value, 10) || 0,
            mindestbestand: parseInt(document.getElementById('lager-mindestbestand').value, 10) || 0,
            sollbestand: parseInt(document.getElementById('lager-sollbestand').value, 10) || 0
        };

        if (id) {
            const index = lager.findIndex(i => String(i.id) === String(id));
            if (index !== -1) {
                lager[index] = newItem;
            } else {
                lager.push(newItem);
            }
        } else {
            lager.push(newItem);
        }

        speichereLagerDaten(lager);

        const modalEl = document.getElementById('lagerAkteModal');
        if (modalEl) {
            const bsModal = bootstrap.Modal.getInstance(modalEl);
            if (bsModal) bsModal.hide();
        }

        renderLagerView();
    }

    // ------------------------------------------
    // Löschen eines Artikels
    // ------------------------------------------
    function loescheLagerItem(id) {
        if (!confirm('Möchten Sie diesen Artikel wirklich löschen?')) return;

        let lager = holeLagerDaten();
        lager = lager.filter(item => String(item.id) !== String(id));
        speichereLagerDaten(lager);
        renderLagerView();
    }

    // ------------------------------------------
    // CSV Export
    // ------------------------------------------
    function exportLagerCSV() {
        const lager = holeLagerDaten();
        if (lager.length === 0) {
            alert('Keine Lagerdaten zum Exportieren vorhanden.');
            return;
        }

        let csv = 'ID;Artikelnummer;Bezeichnung;Kategorie;Groesse;Bestand;Mindestbestand;Sollbestand\n';

        lager.forEach(item => {
            const id = item.id || '';
            const artNr = (item.artikelnummer || '').replace(/;/g, ',');
            const bez = (item.bezeichnung || item.name || '').replace(/;/g, ',');
            const kat = (item.kategorie || '').replace(/;/g, ',');
            const groesse = (item.groesse || item.größe || '').replace(/;/g, ',');
            const bestand = item.bestand ?? item.menge ?? 0;
            const mindest = item.mindestbestand ?? item.mindestmenge ?? 0;
            const soll = item.sollbestand ?? 0;

            csv += `${id};${artNr};${bez};${kat};${groesse};${bestand};${mindest};${soll}\n`;
        });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `lagerbestand_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    // ------------------------------------------
    // CSV Import
    // ------------------------------------------
    function importLagerCSV(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result;
            const zeilen = text.split(/\r\n|\n/);
            if (zeilen.length < 2) {
                alert('Die CSV-Datei enthält keine verwertbaren Daten.');
                return;
            }

            let lagerListe = holeLagerDaten();
            let importKount = 0;

            for (let i = 1; i < zeilen.length; i++) {
                const zeile = zeilen[i].trim();
                if (!zeile) continue;

                const spalten = zeile.split(';');
                if (spalten.length >= 3) {
                    const id = spalten[0] ? spalten[0].trim() : Date.now().toString() + '_' + i;
                    const artikelnummer = spalten[1] ? spalten[1].trim() : '';
                    const bezeichnung = spalten[2] ? spalten[2].trim() : '';

                    if (!bezeichnung) continue;

                    const kategorie = spalten[3] ? spalten[3].trim() : '';
                    const groesse = spalten[4] ? spalten[4].trim() : '';
                    const bestand = parseInt(spalten[5], 10) || 0;
                    const mindestbestand = parseInt(spalten[6], 10) || 0;
                    const sollbestand = parseInt(spalten[7], 10) || 0;

                    const item = {
                        id,
                        artikelnummer,
                        bezeichnung,
                        name: bezeichnung,
                        kategorie,
                        groesse,
                        bestand,
                        mindestbestand,
                        sollbestand
                    };

                    const index = lagerListe.findIndex(l => String(l.id) === String(id));
                    if (index !== -1) {
                        lagerListe[index] = item;
                    } else {
                        lagerListe.push(item);
                    }
                    importKount++;
                }
            }

            speichereLagerDaten(lagerListe);
            event.target.value = '';
            renderLagerView();
            alert(`${importKount} Artikel erfolgreich importiert/aktualisiert.`);
        };

        reader.readAsText(file, 'UTF-8');
    }

    // Globale Funktionen registrieren
    window.ladeLager = function() { renderLagerView(); };
    window.renderLagerView = renderLagerView;
    window.openLagerAkteModal = openLagerAkteModal;
    window.speichereLagerItem = speichereLagerItem;
    window.loescheLagerItem = loescheLagerItem;
    window.exportLagerCSV = exportLagerCSV;
    window.importLagerCSV = importLagerCSV;

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('lager-content') || document.getElementById('content')) {
            renderLagerView();
        }
    });

})();
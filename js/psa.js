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
    const traegerSelect = document.getElementById('psa-traeger-filter');
    const spindSelect = document.getElementById('psa-spind-filter');
    const statusSelect = document.getElementById('psa-status-filter');
    const tbody = document.getElementById('psa-tabelle-body');

    if (!tbody) return;

    const suchbegriff = sucheInput ? sucheInput.value.toLowerCase().trim() : '';
    const traegerFilter = traegerSelect ? traegerSelect.value : 'alle';
    const spindFilter = spindSelect ? spindSelect.value : 'alle';
    const statusFilter = statusSelect ? statusSelect.value : 'alle';

    const allePSA = ladePSA();

    aktualisiereFilterDropdowns(allePSA, traegerFilter, spindFilter);

    const gefiltert = allePSA.filter(item => {
        const traegerText = item.traeger || item.name || '';
        const spindText = String(item.spind || '').trim();
        const bezeichnungText = item.bezeichnung || item.ausruestung || '';
        
        const trefferSuche = !suchbegriff || 
            (traegerText.toLowerCase().includes(suchbegriff)) ||
            (spindText.toLowerCase().includes(suchbegriff)) ||
            (bezeichnungText.toLowerCase().includes(suchbegriff)) ||
            (item.hersteller && item.hersteller.toLowerCase().includes(suchbegriff)) ||
            (item.seriennummer && item.seriennummer.toLowerCase().includes(suchbegriff)) ||
            (item.typ && item.typ.toLowerCase().includes(suchbegriff));

        // --- HIER DEN BLOCK EINSETZEN ---
        let trefferTraeger = (traegerFilter === 'alle');
        if (!trefferTraeger) {
            if (traegerFilter === '') {
                trefferTraeger = (!traegerText || traegerText === '-- Kein Träger / Frei --');
            } else {
                const mitglieder = typeof ladeDaten === 'function' ? ladeDaten('personal') : [];
                const gewaehltesMitglied = mitglieder.find(m => 
                    String(m.id) === String(traegerFilter) || 
                    `${m.vorname} ${m.nachname}` === traegerFilter || 
                    `${m.nachname}, ${m.vorname}` === traegerFilter
                );
                
                const gefundenerName = gewaehltesMitglied ? `${gewaehltesMitglied.nachname}, ${gewaehltesMitglied.vorname}` : '';
                
                trefferTraeger = (traegerText === traegerFilter) || 
                                 (item.traegerId && String(item.traegerId) === String(traegerFilter)) ||
                                 (gefundenerName && traegerText.toLowerCase() === gefundenerName.toLowerCase());
            }
        }
        // ---------------------------------

        const trefferSpind = (spindFilter === 'alle') || (spindText === spindFilter);
        const trefferStatus = (statusFilter === 'alle') || (item.status === statusFilter);

        return trefferSuche && trefferTraeger && trefferSpind && trefferStatus;
    });

    renderePSATabelle(gefiltert);
}

function aktualisiereFilterDropdowns(daten, aktuellerTraeger, aktuellerSpind) {
    const traegerSelect = document.getElementById('psa-traeger-filter');
    const spindSelect = document.getElementById('psa-spind-filter');

    // 1. Träger-Filter direkt aus dem Personal-Modul befüllen
    if (traegerSelect && traegerSelect.options.length <= 1) {
        const mitglieder = typeof ladeDaten === 'function' ? ladeDaten('personal') : [];
        
        let html = '<option value="alle">Alle Träger / Personen</option>';
        html += '<option value="">-- Kein Träger / Frei --</option>';
        
        mitglieder.forEach(m => {
            const identifier = m.id || `${m.vorname} ${m.nachname}`;
            const anzeigeName = `${m.nachname}, ${m.vorname}`;
            html += `<option value="${identifier}">${anzeigeName}</option>`;
        });

        traegerSelect.innerHTML = html;
        traegerSelect.value = aktuellerTraeger;
    }

    // 2. Spind-Filter wie gewohnt aus den Daten aufbauen
    if (spindSelect && spindSelect.options.length <= 1) {
        const spindSet = [...new Set(daten.map(item => String(item.spind || '').trim()).filter(s => s !== '' && s !== '-'))].sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
        spindSelect.innerHTML = '<option value="alle">Alle Spinde</option>' + 
            spindSet.map(s => `<option value="${s}">Spind ${s}</option>`).join('');
        spindSelect.value = aktuellerSpind;
    }
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

// ==========================================
// 8. PSA-AKTEN & PROTOKOLL-FUNKTIONEN
// ==========================================

// Global verfügbare Funktion zum Öffnen der PSA-Akte inklusive Datenbefüllung
window.oeffnePSAAkteModal = function(id) {
    const allePSA = ladePSA();
    const eintrag = allePSA.find(p => String(p.id) === String(id));
    
    if (!eintrag) {
        alert("⚠️ PSA-Eintrag nicht gefunden.");
        return;
    }

    // 1. Stammdaten im Modal anzeigen
    const stammdatenDiv = document.getElementById('psa-akte-stammdaten');
    if (stammdatenDiv) {
        stammdatenDiv.innerHTML = `
            <strong>Träger:</strong> ${eintrag.traeger || eintrag.name || 'Unbekannt'}<br>
            <strong>Spind:</strong> ${eintrag.spind || '-'}&nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Hersteller:</strong> ${eintrag.hersteller || '-'}&nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Typ:</strong> ${eintrag.typ || '-'}<br>
            <strong>Bezeichnung:</strong> ${eintrag.bezeichnung || eintrag.ausruestung || '-'}&nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Größe:</strong> ${eintrag.groesse || '-'}<br>
            <strong>Seriennummer:</strong> ${eintrag.seriennummer || eintrag.inventarnummer || '-'}&nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Nächste Prüfung:</strong> ${eintrag.naechstePruefung || '-'}
        `;
    }

    // Modal-Titel anpassen
    const titelEl = document.getElementById('psa-akte-titel');
    if (titelEl) {
        titelEl.textContent = `🛡️ PSA-Akte: ${eintrag.bezeichnung || eintrag.ausruestung || 'Details'} (${eintrag.seriennummer || id})`;
    }

    // Aktuelle ID im Formular für Protokolle hinterlegen (falls benötigt)
    window.aktivePsaAktenId = id;

    // 2. Historie / Protokolle laden und anzeigen
    renderePSAHistorie(eintrag);

    // 3. Datum des neuen Protokolls auf heute voreinstellen
    const datumInput = document.getElementById('psa-protokoll-datum');
    if (datumInput) {
        datumInput.value = new Date().toISOString().split('T')[0];
    }

    // 4. Modal anzeigen (Bootstrap oder Fallback)
    const modal = document.getElementById('psa-akte-modal');
    if (modal) {
        if (window.bootstrap && bootstrap.Modal) {
            const bsModal = bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal);
            bsModal.show();
        } else {
            modal.style.display = 'flex';
        }
    }
};

// Historie-Einträge in der Akte rendern
function renderePSAHistorie(eintrag) {
    const historieListeDiv = document.getElementById('psa-akte-historie-liste');
    if (!historieListeDiv) return;

    const protokolle = eintrag.protokolle || [];

    if (protokolle.length === 0) {
        historieListeDiv.innerHTML = `<p class="text-muted text-center m-0" style="font-size: 0.9em;">Keine Prüfungen oder Waschkarten hinterlegt.</p>`;
        return;
    }

    let html = '<div style="display: flex; flexDirection: column; gap: 6px;">';
    protokolle.forEach((p, index) => {
        let badgeColor = '#28a745'; // Grün
        if (p.ergebnis && p.ergebnis.includes('Geringe')) badgeColor = '#ffc107'; // Gelb
        if (p.ergebnis && (p.ergebnis.includes('Gesperrt') || p.ergebnis.includes('Defekt'))) badgeColor = '#dc3545'; // Rot

        html += `
            <div style="background: #fff; border: 1px solid #ddd; border-left: 4px solid ${badgeColor}; padding: 8px; border-radius: 4px; font-size: 0.9em;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 2px;">
                    <span>${p.art} (${p.datum})</span>
                    <span style="font-size: 0.85em; color: #555;">${p.ergebnis || ''}</span>
                </div>
                <div style="color: #333; margin-bottom: 4px;">${p.bemerkung || 'Keine Details angegeben.'}</div>
                <div style="text-align: right;">
                    <button type="button" class="btn btn-sm btn-outline-danger" style="font-size: 0.75em; padding: 1px 6px;" onclick="loeschePSAProtokoll('${eintrag.id}', ${index})">Löschen</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    historieListeDiv.innerHTML = html;
}

// Neues Protokoll / Prüfung / Waschkarte speichern
function speicherePSAProtokoll() {
    if (!hatPSASchreibrechte()) {
        alert("⚠️ Keine Berechtigung zum Speichern von Protokollen.");
        return;
    }

    const id = window.aktivePsaAktenId;
    if (!id) return;

    const datum = getInputValue('psa-protokoll-datum');
    const art = getInputValue('psa-protokoll-art');
    const ergebnis = getInputValue('psa-protokoll-ergebnis');
    const bemerkung = getInputValue('psa-protokoll-bemerkung');

    if (!datum) {
        alert("Bitte ein Datum angeben.");
        return;
    }

    let allePSA = ladePSA();
    const index = allePSA.findIndex(p => String(p.id) === String(id));

    if (index < 0) return;

    if (!allePSA[index].protokolle) {
        allePSA[index].protokolle = [];
    }

    // Neues Protokoll an den Anfang der Liste setzen
    allePSA[index].protokolle.unshift({
        datum,
        art,
        ergebnis,
        bemerkung,
        erstelltAm: new Date().toISOString()
    });

    if (speicherePSA(allePSA)) {
        // Eingabefeld für Bemerkung leeren
        const bemEl = document.getElementById('psa-protokoll-bemerkung');
        if (bemEl) bemEl.value = '';

        // Akte direkt aktualisieren
        oeffnePSAAkteModal(id);
    }
}

// Einzelnes Protokoll löschen
function loeschePSAProtokoll(psaId, protokollIndex) {
    if (!hatPSASchreibrechte()) {
        alert("⚠️ Keine Berechtigung zum Löschen.");
        return;
    }

    if (!confirm("Möchten Sie diesen Eintrag wirklich löschen?")) return;

    let allePSA = ladePSA();
    const index = allePSA.findIndex(p => String(p.id) === String(psaId));

    if (index >= 0 && allePSA[index].protokolle) {
        allePSA[index].protokolle.splice(protokollIndex, 1);
        if (speicherePSA(allePSA)) {
            oeffnePSAAkteModal(psaId);
        }
    }
}

function getInputValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function setInputValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}
function ladePersonalDropdown(selektorId, ausgewaehlt = '') {
    const selectEl = document.getElementById(selektorId);
    if (!selectEl) return;

    // Versucht die Mitglieder aus dem Personal-Modul zu laden
    const mitglieder = typeof ladeDaten === 'function' ? ladeDaten('personal') : [];
    
    // Option für "Keine Zuweisung" (erlaubt PSA ohne Personal)
    let html = '<option value="">-- Kein Träger / Frei --</option>';
    
    mitglieder.forEach(m => {
        const identifier = m.id || `${m.vorname} ${m.nachname}`;
        const anzeigeName = `${m.nachname}, ${m.vorname} (${m.dienstgrad || 'Mitglied'})`;
        const selected = String(identifier) === String(ausgewaehlt) ? 'selected' : '';
        html += `<option value="${identifier}" ${selected}>${anzeigeName}</option>`;
    });

    selectEl.innerHTML = html;
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

    // 1. Ermitteln, welcher Träger beim Bearbeiten ausgewählt war (falls ID übergeben)
    let aktuellerTraeger = '';
    if (id) {
        const allePSA = ladePSA();
        const eintrag = allePSA.find(p => String(p.id) === String(id));
        if (eintrag) {
            const rohTraeger = eintrag.traeger || eintrag.mitgliedId || eintrag.name || '';
            
            // Abgleich mit Personal-Daten, damit bestehende Namen oder IDs im Dropdown korrekt erkannt werden
            const mitglieder = typeof ladeDaten === 'function' ? ladeDaten('personal') : [];
            const gefundenesMitglied = mitglieder.find(m => 
                String(m.id) === String(rohTraeger) || 
                `${m.nachname}, ${m.vorname}` === rohTraeger || 
                `${m.vorname} ${m.nachname}` === rohTraeger
            );
            
            aktuellerTraeger = gefundenesMitglied ? gefundenesMitglied.id : rohTraeger;
            
            // Restliche Felder befüllen
            setInputValue('psa-id', eintrag.id);
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
    // 2. Dropdown mit Personal befüllen und den aktuellen Träger selektieren
    ladePersonalDropdown('psa-traeger', aktuellerTraeger);

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
    const traegerId = getInputValue('psa-traeger'); // Das ist jetzt die ID oder der Name aus dem Select
    const seriennummer = getInputValue('psa-seriennummer');

    // Optional: Wenn eine ID übergeben wurde, den echten Namen aus dem Personal-Modul ermitteln
    let traegerName = traegerId;
    if (traegerId) {
        const mitglieder = typeof ladeDaten === 'function' ? ladeDaten('personal') : [];
        const gefundenesMitglied = mitglieder.find(m => String(m.id) === String(traegerId));
        if (gefundenesMitglied) {
            // Name im Format "Nachname, Vorname" oder "Vorname Nachname" zusammenbauen
            traegerName = `${gefundenesMitglied.nachname}, ${gefundenesMitglied.vorname}`;
        }
    }

    if (!traegerId) {
        alert("Bitte geben Sie einen Träger an.");
        return;
    }

    let allePSA = ladePSA();
    const index = allePSA.findIndex(p => String(p.id) === String(id));

    // PRÜFUNG: Doppelte Serien- / Inventarnummer abfangen
    if (seriennummer && seriennummer !== '') {
        const doppelt = allePSA.some((p, i) => {
            if (index >= 0 && i === index) return false;
            const vorhandeneNummer = p.seriennummer || p.inventarnummer || '';
            return kohärentePruefungNummer(vorhandeneNummer, seriennummer);
        });

        if (doppelt) {
            alert(`⚠️ Die Serien- / Inventarnummer "${seriennummer}" ist bereits in der PSA-Verwaltung vergeben!`);
            return;
        }
    }

    const neuerEintrag = {
        id,
        traeger: traegerName, // <--- Hier speichern wir jetzt den Klarnamen statt der ID!
        traegerId: traegerId, // <--- (Optional) Die ID für interne Verknüpfungen separat sichern
        spind: getInputValue('psa-spind'),
        hersteller: getInputValue('psa-hersteller'),
        typ: getInputValue('psa-typ'),
        bezeichnung: getInputValue('psa-bezeichnung'),
        groesse: getInputValue('psa-groesse'),
        zubehoer: getInputValue('psa-zubehoer'),
        seriennummer: seriennummer,
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

// Interne Hilfsfunktion für den Nummernvergleich (Groß-/Kleinschreibung ignorieren)
function kohärentePruefungNummer(num1, num2) {
    if (!num1 || !num2) return false;
    return String(num1).toLowerCase().trim() === String(num2).toLowerCase().trim();
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
    const traegerSelect = document.getElementById('psa-traeger-filter');
    const spindSelect = document.getElementById('psa-spind-filter');
    const statusSelect = document.getElementById('psa-status-filter');
    const neuBtn = document.getElementById('btn-neues-psa') || document.getElementById('btn-psa-neu');

    if (sucheInput) sucheInput.addEventListener('input', filterPSA);
    if (traegerSelect) traegerSelect.addEventListener('change', filterPSA);
    if (spindSelect) spindSelect.addEventListener('change', filterPSA);
    if (statusSelect) statusSelect.addEventListener('change', filterPSA);
    
    // Automatisches Verknüpfen des "Neues PSA anlegen"-Buttons
    if (neuBtn) {
        neuBtn.addEventListener('click', () => oeffnePSAModal());
    }
});

document.addEventListener("psaGeaendert", () => {
    filterPSA();
});
// ==========================================
// 7. EXPORT-FUNKTIONEN (INKLUSIVE GAST-SPERRE)
// ==========================================

function exportPSA() {
    // Gast-Prüfung: Blockiert Gäste sofort beim Klick
    if (!hatPSALeserechte()) {
        alert("🔒 Zugriff verweigert: Als Gast hast du keine Berechtigung, PSA-Daten zu exportieren.");
        return;
    }

    const daten = ladePSA();
    if (!daten || daten.length === 0) {
        alert("Keine Daten zum Exportieren vorhanden.");
        return;
    }

    // CSV-Header und Spalten definieren
    const headers = ["Spind", "Traeger", "Hersteller", "Typ", "Bezeichnung", "Groesse", "Zubehoer", "Seriennummer", "NaechstePruefung", "Status"];
    const csvRows = [headers.join(";")];

    daten.forEach(item => {
        const row = [
            `"${item.spind || ''}"`,
            `"${item.traeger || item.name || ''}"`,
            `"${item.hersteller || ''}"`,
            `"${item.typ || ''}"`,
            `"${item.bezeichnung || item.ausruestung || ''}"`,
            `"${item.groesse || ''}"`,
            `"${item.zubehoer || ''}"`,
            `"${item.seriennummer || item.inventarnummer || ''}"`,
            `"${item.naechstePruefung || ''}"`,
            `"${item.status || 'Aktiv'}"`
        ];
        csvRows.push(row.join(";"));
    });

    // CSV-Datei erzeugen und Download auslösen
    const blob = new Blob(["\ufeff" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PSA_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Gleiche Schutzlogik für den Druck / PDF-Export
function druckePSAListe() {
    if (!hatPSALeserechte()) {
        alert("🔒 Zugriff verweigert: Als Gast hast du keine Berechtigung, die PSA-Liste zu drucken.");
        return;
    }
    window.print();
}

// Globale Freigaben für das HTML
window.exportPSA = exportPSA;
window.exportPSACSV = exportPSA;
window.druckePSAListe = druckePSAListe;
// Globale Freigaben
window.ladePSA = ladePSA;
window.speicherePSA = speicherePSA;
window.renderPSAView = renderPSAView;
window.filterPSA = filterPSA;
window.renderePSATabelle = renderePSATabelle;
window.oeffnePSAModal = oeffnePSAModal;
window.savePSAFromModal = savePSAFromModal;
window.loeschePSAEintragModal = loeschePSAEintragModal;
// Globale Freigabe für das neue Protokoll
window.speicherePSAProtokoll = speicherePSAProtokoll;
window.loeschePSAProtokoll = loeschePSAProtokoll;
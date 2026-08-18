// ==========================================
// FFW Manager - Fahrzeugverwaltung & Akte
// ==========================================

let aktuellesFahrzeugId = null;

// 1. Tabelle auf der linken Seite rendern
function renderFahrzeugeView() {
    const tbody = document.getElementById('fahrzeugeListe');
    if (!tbody) return;

    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    tbody.innerHTML = '';

    if (fahrzeuge.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:#777;">Keine Fahrzeuge vorhanden.</td></tr>`;
        return;
    }

    fahrzeuge.forEach(f => {
        const tr = document.createElement('tr');
        
        let statusBadge = '🟢 Einsatzbereit';
        if (f.status === 'Wartung') statusBadge = '🟡 Wartung';
        if (f.status === 'Defekt') statusBadge = '🔴 Defekt';

        tr.innerHTML = `
            <td class="no-print">
                <button onclick="oeffneFahrzeugAkte('${f.id}')" title="Fahrzeugakte / Abteile öffnen" style="padding:4px 8px; cursor:pointer;">👁️</button>
                <button onclick="loescheFahrzeug('${f.id}')" title="Fahrzeug löschen" style="padding:4px 8px; cursor:pointer; background:#dc3545; color:white; border:none; border-radius:3px;">🗑️</button>
            </td>
            <td><strong>${f.callSign || f.name || '-'}</strong></td>
            <td>${f.typ || '-'}</td>
            <td>${f.licensePlate || f.kennzeichen || '-'}</td>
            <td>${f.nextHU || f.tuev || '-'}</td>
            <td>${statusBadge}</td>
        `;

        tbody.appendChild(tr);
    });
}

// 2. Neues Fahrzeug über das obere Formular speichern
function neuesFahrzeugSpeichern() {
    const funkruf = document.getElementById('fz-funkruf')?.value;
    const kennzeichen = document.getElementById('fz-kennzeichen')?.value;
    const typ = document.getElementById('fz-typ')?.value;
    const baujahr = document.getElementById('fz-baujahr')?.value;
    const tuev = document.getElementById('fz-tuev')?.value;
    const sp = document.getElementById('fz-sp')?.value;
    const status = document.getElementById('fz-status')?.value || 'Einsatzbereit';

    if (!funkruf && !typ) {
        alert('Bitte mindestens einen Funkrufnamen oder Fahrzeugtyp eingeben!');
        return;
    }

    const neuesFahrzeug = {
        id: 'VEH-' + Date.now(),
        callSign: funkruf,
        name: funkruf || typ,
        kennzeichen: kennzeichen,
        licensePlate: kennzeichen,
        typ: typ,
        baujahr: baujahr,
        tuev: tuev,
        nextHU: tuev,
        sp: sp,
        nextSP: sp,
        status: status,
        abteile: [
            { name: 'G1 (Geräteraum 1)', inhalt: '' },
            { name: 'G2 (Geräteraum 2)', inhalt: '' },
            { name: 'GR (Geräteraum Heck)', inhalt: '' }
        ]
    };

    let fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    fahrzeuge.push(neuesFahrzeug);

    if (typeof speichereDaten === 'function') {
        speichereDaten('fahrzeuge', fahrzeuge);
    }

    // Felder zurücksetzen
    ['fz-funkruf', 'fz-kennzeichen', 'fz-typ', 'fz-baujahr', 'fz-tuev', 'fz-sp'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    renderFahrzeugeView();
    oeffneFahrzeugAkte(neuesFahrzeug.id);

    if (typeof aktualisiereDashboard === 'function') {
        aktualisiereDashboard();
    }
}

// 3. Rechte Seite: Fahrzeugakte & Geräteabteile rendern
function oeffneFahrzeugAkte(id) {
    aktuellesFahrzeugId = id;
    const container = document.getElementById('fahrzeugAkteContainer');
    if (!container) return;

    const fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
    const f = fahrzeuge.find(x => x.id === id);

    if (!f) {
        container.innerHTML = `<h2>📋 Fahrzeugakte</h2><p style="color:#777;">Fahrzeug nicht gefunden.</p>`;
        return;
    }

    if (!f.abteile) {
        f.abteile = [
            { name: 'G1', inhalt: '' },
            { name: 'G2', inhalt: '' },
            { name: 'GR', inhalt: '' }
        ];
    }

    let abteileHTML = f.abteile.map((a, index) => `
        <div style="background:#f8f9fa; padding:10px; border-radius:6px; margin-bottom:10px; border:1px solid #ddd;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <input type="text" value="${a.name || ''}" onchange="updateAbteilName(${index}, this.value)" style="font-weight:bold; width:60%; padding:4px;" placeholder="Abteil Name (z.B. G1)">
                <button type="button" onclick="entferneAbteil(${index})" style="background:#dc3545; color:white; border:none; border-radius:3px; padding:2px 6px; cursor:pointer;">✕</button>
            </div>
            <textarea onchange="updateAbteilInhalt(${index}, this.value)" style="width:100%; height:50px; padding:4px; box-sizing:border-box;" placeholder="Beladung / Geräte in diesem Abteil...">${a.inhalt || ''}</textarea>
        </div>
    `).join('');

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #eee; padding-bottom:10px; margin-bottom:15px;">
            <h2>📋 ${f.callSign || f.typ || 'Fahrzeugakte'}</h2>
            <button onclick="speichereAkte()" style="background:#2e7d32; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">💾 Akte Speichern</button>
        </div>

        <div style="margin-bottom:15px; font-size:0.9em; color:#555;">
            <p><strong>Kennzeichen:</strong> ${f.kennzeichen || f.licensePlate || '-'}</p>
            <p><strong>Typ:</strong> ${f.typ || '-'}</p>
            <p><strong>Baujahr:</strong> ${f.baujahr || '-'}</p>
            <p><strong>TÜV/HU:</strong> ${f.tuev || f.nextHU || '-'} | <strong>SP:</strong> ${f.sp || f.nextSP || '-'}</p>
        </div>

        <h3>📦 Geräteabteile / Geräteräume</h3>
        <div id="abteile-liste-container" style="margin-top:10px;">
            ${abteileHTML}
        </div>
        <button type="button" onclick="fuegeAbteilHinzu()" style="background:#6c757d; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; margin-top:5px;">+ Abteil hinzufügen</button>
    `;
}

// 4. Hilfsfunktionen für Geräteabteile
function updateAbteilName(index, name) {
    const fahrzeuge = ladeDaten('fahrzeuge');
    const f = fahrzeuge.find(x => x.id === aktuellesFahrzeugId);
    if (f && f.abteile[index]) {
        f.abteile[index].name = name;
    }
}

function updateAbteilInhalt(index, inhalt) {
    const fahrzeuge = ladeDaten('fahrzeuge');
    const f = fahrzeuge.find(x => x.id === aktuellesFahrzeugId);
    if (f && f.abteile[index]) {
        f.abteile[index].inhalt = inhalt;
    }
}

function fuegeAbteilHinzu() {
    const fahrzeuge = ladeDaten('fahrzeuge');
    const f = fahrzeuge.find(x => x.id === aktuellesFahrzeugId);
    if (f) {
        if (!f.abteile) f.abteile = [];
        f.abteile.push({ name: 'Neues Abteil', inhalt: '' });
        speichereDaten('fahrzeuge', fahrzeuge);
        oeffneFahrzeugAkte(aktuellesFahrzeugId);
    }
}

function entferneAbteil(index) {
    const fahrzeuge = ladeDaten('fahrzeuge');
    const f = fahrzeuge.find(x => x.id === aktuellesFahrzeugId);
    if (f && f.abteile) {
        f.abteile.splice(index, 1);
        speichereDaten('fahrzeuge', fahrzeuge);
        oeffneFahrzeugAkte(aktuellesFahrzeugId);
    }
}

function speichereAkte() {
    const fahrzeuge = ladeDaten('fahrzeuge');
    if (typeof speichereDaten === 'function') {
        speichereDaten('fahrzeuge', fahrzeuge);
        alert('Fahrzeugakte und Geräteabteile erfolgreich gespeichert!');
    }
}

// 5. Löschen-Funktion
function loescheFahrzeug(id) {
    if (confirm('Möchtest du dieses Fahrzeug wirklich löschen?')) {
        let fahrzeuge = typeof ladeDaten === 'function' ? ladeDaten('fahrzeuge') : [];
        fahrzeuge = fahrzeuge.filter(x => x.id !== id);

        if (typeof speichereDaten === 'function') {
            speichereDaten('fahrzeuge', fahrzeuge);
        }

        renderFahrzeugeView();
        
        document.getElementById('fahrzeugAkteContainer').innerHTML = `
            <h2>📋 Fahrzeugakte</h2>
            <p style="color:#777;">Bitte links ein Fahrzeug auswählen (👁️ klicken).</p>
        `;

        if (typeof aktualisiereDashboard === 'function') {
            aktualisiereDashboard();
        }
    }
}

// Global registrieren
window.renderFahrzeugeView = renderFahrzeugeView;
window.neuesFahrzeugSpeichern = neuesFahrzeugSpeichern;
window.oeffneFahrzeugAkte = oeffneFahrzeugAkte;
window.fuegeAbteilHinzu = fuegeAbteilHinzu;
window.entferneAbteil = entferneAbteil;
window.updateAbteilName = updateAbteilName;
window.updateAbteilInhalt = updateAbteilInhalt;
window.speichereAkte = speichereAkte;
window.loescheFahrzeug = loescheFahrzeug;

document.addEventListener('DOMContentLoaded', () => {
    renderFahrzeugeView();
});
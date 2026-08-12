// ==========================================
// BENUTZER- & RECHTEVERWALTUNG (benutzer.js)
// ==========================================

// Hilfsfunktion: Benutzerliste aus LocalStorage laden
function getBenutzerListe() {
    const raw = localStorage.getItem("benutzer_liste");
    if (!raw) {
        // Initialer Standard-Admin, falls System neu ist
        const defaultAdmin = [{
            id: "USR-ADMIN-1",
            name: "Administrator",
            email: "admin@feuerwehr.de",
            rolle: "admin",
            status: "active",
            beantragtAm: new Date().toLocaleDateString("de-DE")
        }];
        localStorage.setItem("benutzer_liste", JSON.stringify(defaultAdmin));
        return defaultAdmin;
    }
    try { return JSON.parse(raw); } catch(e) { return []; }
}

function speichereBenutzerListe(liste) {
    localStorage.setItem("benutzer_liste", JSON.stringify(liste));
    window.dispatchEvent(new Event("benutzerGeaendert"));
}

// Aktuell angemeldeter Benutzer
function getAktuellerBenutzer() {
    const raw = localStorage.getItem("aktueller_benutzer");
    if (raw) {
        try { return JSON.parse(raw); } catch(e){}
    }
    // Standardmäßig als Admin zum Testen, sonst null
    return { name: "Admin", email: "admin@feuerwehr.de", rolle: "admin", status: "active" };
}

// --- RECHTE-PRÜFUNGEN ---
function istAdmin() {
    const u = getAktuellerBenutzer();
    return u && u.status === "active" && u.rolle === "admin";
}

function hatSchreibrecht() {
    const u = getAktuellerBenutzer();
    return u && u.status === "active" && (u.rolle === "admin" || u.rolle === "editor");
}

function hatLeserecht() {
    const u = getAktuellerBenutzer();
    return u && u.status === "active" && ["admin", "editor", "viewer"].includes(u.rolle);
}

// --- ZUGANG BEANTRAGEN (Nutzersicht) ---
function beantrageZugang(event) {
    if (event) event.preventDefault();
    
    const name = document.getElementById("reqName").value.trim();
    const email = document.getElementById("reqEmail").value.trim().toLowerCase();
    const wunschRolle = document.getElementById("reqWunschRolle").value;

    let benutzer = getBenutzerListe();

    const existiert = benutzer.find(b => b.email === email);
    if (existiert) {
        if (existiert.status === "pending") {
            alert("Für diese E-Mail liegt bereits eine ausstehende Anfrage vor. Bitte warte auf die Freigabe durch den Admin.");
        } else {
            alert("Ein Benutzer mit dieser E-Mail existiert bereits.");
        }
        return;
    }

    const neueAnfrage = {
        id: `USR-${Date.now()}`,
        name: name,
        email: email,
        wunschRolle: wunschRolle,
        rolle: "pending",
        status: "pending",
        beantragtAm: new Date().toLocaleDateString("de-DE") + " " + new Date().toLocaleTimeString("de-DE")
    };

    benutzer.push(neueAnfrage);
    speichereBenutzerListe(benutzer);

    document.getElementById("requestAccessForm").reset();
    document.getElementById("requestStatusMessage").innerHTML = `
        <div style="background: #d4edda; color: #155724; padding: 10px; border-radius: 4px;">
            ✅ Deine Anfrage wurde erfolgreich übermittelt! Ein Administrator muss deinen Zugang erst freischalten.
        </div>
    `;

    // Falls Admin die Seite offen hat, Ansicht aktualisieren
    if (typeof renderBenutzerVerwaltung === "function") {
        renderBenutzerVerwaltung();
    }
}

// --- ADMIN-DASHBOARD: ANFRAGEN VERWALTEN & RECHTE VERGEBEN ---
function renderBenutzerVerwaltung() {
    const container = document.getElementById("benutzer-verwaltung-container");
    if (!container) return;

    if (!istAdmin()) {
        container.innerHTML = `<div style="background:#f8d7da; color:#721c24; padding:10px; border-radius:4px;">❌ Zugriff verweigert. Nur Administratoren können Rechte vergeben.</div>`;
        return;
    }

    const benutzer = getBenutzerListe();
    const anfragen = benutzer.filter(b => b.status === "pending");
    const aktive = benutzer.filter(b => b.status === "active");

    let html = `<h2>🔐 Benutzer- & Rechteverwaltung</h2>`;

    // 1. Offene Anträge
    html += `<h3>Offene Anträge (${anfragen.length})</h3>`;
    if (anfragen.length === 0) {
        html += `<p><em>Keine offenen Anträge vorhanden.</em></p>`;
    } else {
        html += `
        <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="border-bottom: 2px solid #ccc; text-align: left; background:#f5f5f5;">
                    <th style="padding:8px;">Name</th>
                    <th style="padding:8px;">E-Mail</th>
                    <th style="padding:8px;">Gewünschte Rolle</th>
                    <th style="padding:8px;">Datum</th>
                    <th style="padding:8px;">Aktion / Rolle zuweisen</th>
                </tr>
            </thead>
            <tbody>`;
        
        anfragen.forEach(a => {
            html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding:8px;"><strong>${a.name}</strong></td>
                <td style="padding:8px;">${a.email}</td>
                <td style="padding:8px;">${a.wunschRolle === 'editor' ? 'Schreibrechte' : 'Leserechte'}</td>
                <td style="padding:8px;">${a.beantragtAm}</td>
                <td style="padding:8px;">
                    <select id="role-select-${a.id}" style="padding:4px;">
                        <option value="viewer" ${a.wunschRolle === 'viewer' ? 'selected' : ''}>Leserechte (Viewer)</option>
                        <option value="editor" ${a.wunschRolle === 'editor' ? 'selected' : ''}>Schreibrechte (Editor)</option>
                        <option value="admin">Administrator</option>
                    </select>
                    <button onclick="freischaltenBenutzer('${a.id}')" style="background:#28a745; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px;">Freischalten</button>
                    <button onclick="ablehnenBenutzer('${a.id}')" style="background:#dc3545; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px;">Ablehnen</button>
                </td>
            </tr>`;
        });
        html += `</tbody></table>`;
    }

    // 2. Aktive Benutzer
    html += `<h3>Aktive Benutzer (${aktive.length})</h3>`;
    html += `
    <table style="width:100%; border-collapse: collapse;">
        <thead>
            <tr style="border-bottom: 2px solid #ccc; text-align: left; background:#f5f5f5;">
                <th style="padding:8px;">Name</th>
                <th style="padding:8px;">E-Mail</th>
                <th style="padding:8px;">Aktuelle Rolle</th>
                <th style="padding:8px;">Rolle ändern</th>
            </tr>
        </thead>
        <tbody>`;

    aktive.forEach(b => {
        html += `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding:8px;"><strong>${b.name}</strong></td>
            <td style="padding:8px;">${b.email}</td>
            <td style="padding:8px;"><span style="background:#e2e3e5; padding:3px 8px; border-radius:4px;">${b.rolle.toUpperCase()}</span></td>
            <td style="padding:8px;">
                <select onchange="aendereRolle('${b.id}', this.value)" style="padding:4px;">
                    <option value="viewer" ${b.rolle === 'viewer' ? 'selected' : ''}>Leserechte</option>
                    <option value="editor" ${b.rolle === 'editor' ? 'selected' : ''}>Schreibrechte</option>
                    <option value="admin" ${b.rolle === 'admin' ? 'selected' : ''}>Administrator</option>
                </select>
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// Admin-Aktionen
function freischaltenBenutzer(id) {
    let benutzer = getBenutzerListe();
    const index = benutzer.findIndex(b => b.id === id);
    if (index !== -1) {
        const gewaehlteRolle = document.getElementById(`role-select-${id}`).value;
        benutzer[index].rolle = gewaehlteRolle;
        benutzer[index].status = "active";
        speichereBenutzerListe(benutzer);
        alert(`Zugang für ${benutzer[index].name} wurde als "${gewaehlteRolle}" freigeschaltet!`);
        renderBenutzerVerwaltung();
    }
}

function ablehnenBenutzer(id) {
    if (!confirm("Möchtest du diesen Antrag wirklich ablehnen?")) return;
    let benutzer = getBenutzerListe();
    benutzer = benutzer.filter(b => b.id !== id);
    speichereBenutzerListe(benutzer);
    renderBenutzerVerwaltung();
}

function aendereRolle(id, neueRolle) {
    let benutzer = getBenutzerListe();
    const index = benutzer.findIndex(b => b.id === id);
    if (index !== -1) {
        benutzer[index].rolle = neueRolle;
        speichereBenutzerListe(benutzer);
        alert(`Rolle für ${benutzer[index].name} auf "${neueRolle}" geändert.`);
        renderBenutzerVerwaltung();
    }
}

// Beim Laden der Seite Admin-Tabelle automatisch anzeigen (falls Admin eingeloggt)
document.addEventListener("DOMContentLoaded", () => {
    if (typeof renderBenutzerVerwaltung === "function") {
        renderBenutzerVerwaltung();
    }
});
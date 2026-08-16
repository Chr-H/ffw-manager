// ==========================================
// RECHTE- & BENUTZERSTEUERUNG (v0.7.0)
// ==========================================

// Master-Admin E-Mail festlegen
const MASTER_ADMIN_EMAIL = "christian.holmer@arcor.de"; 

// Aktueller Status in der Sitzung
let aktuellerBenutzer = JSON.parse(sessionStorage.getItem('ffw_user')) || {
    name: "",
    email: "",
    rolle: "gast"
};

// Prüffunktionen für Berechtigungen
function istAdmin() {
    return aktuellerBenutzer.rolle === 'admin' || aktuellerBenutzer.email === MASTER_ADMIN_EMAIL;
}

function istEditor() {
    return istAdmin() || aktuellerBenutzer.rolle === 'editor';
}

function hatZugriffAufSensibleDaten() {
    return istEditor();
}

// UI ANPASSEN
function aktualisiereModulSichtbarkeit() {
    const sensibleModule = ['psa', 'personal', 'benutzer'];
    
    sensibleModule.forEach(modulId => {
        const navEintrag = document.querySelector(`li[onclick*="'${modulId}'"]`);
        const dashboardCard = document.querySelector(`.card[onclick*="'${modulId}'"]`);
        
        if (!hatZugriffAufSensibleDaten()) {
            if (navEintrag) navEintrag.style.opacity = "0.4";
            if (dashboardCard) dashboardCard.style.opacity = "0.4";
        } else {
            if (navEintrag) navEintrag.style.opacity = "1";
            if (dashboardCard) dashboardCard.style.opacity = "1";
        }
    });

    renderLoginStatusHeader();
}

// SEITEN-ZUGRIFFS-SCHUTZ
function pruefeSeitenZugriff(seiteId) {
    const geschuetzteSeiten = ['psa', 'personal', 'benutzer'];
    
    if (geschuetzteSeiten.includes(seiteId) && !hatZugriffAufSensibleDaten()) {
        zeigePinModal(seiteId);
        return false;
    }
    return true;
}

// ANMELDUNG MIT INDIVIDUELLER PIN / BENUTZERNAME
function zeigePinModal(zielSeite) {
    const emailOderName = prompt("👤 Bitte Benutzername oder E-Mail-Adresse eingeben:");
    if (!emailOderName) return;

    const pin = prompt("🔐 Bitte deine persönliche PIN eingeben:");
    if (!pin) return;

    if (window.db) {
        db.collection('benutzer')
            .get()
            .then(snapshot => {
                let treffer = null;
                const eingabeKennung = emailOderName.trim().toLowerCase();
                const eingabePin = pin.trim();

                snapshot.forEach(doc => {
                    const d = doc.data();
                    const userEmail = (d.email || "").trim().toLowerCase();
                    const userName = (d.name || "").trim().toLowerCase();
                    const userPin = String(d.pin || "").trim();

                    if ((userEmail === eingabeKennung || userName === eingabeKennung) && userPin === eingabePin) {
                        treffer = { id: doc.id, ...d };
                    }
                });

                if (treffer) {
                    aktuellerBenutzer = {
                        name: treffer.name,
                        email: treffer.email,
                        rolle: treffer.rolle || 'viewer'
                    };
                    
                    sessionStorage.setItem('ffw_user', JSON.stringify(aktuellerBenutzer));
                    alert(`Willkommen, ${treffer.name}!\nErfolgreich angemeldet als ${treffer.rolle.toUpperCase()}.`);
                    
                    aktualisiereModulSichtbarkeit();
                    if (zielSeite && zielSeite !== 'dashboard') {
                        zeigeSeite(zielSeite);
                    } else {
                        zeigeSeite('dashboard');
                    }
                } else {
                    alert("❌ Ungültige Kombination aus Benutzername/E-Mail und PIN oder Konto noch nicht freigeschaltet!");
                }
            })
            .catch(err => alert("Fehler beim Login: " + err.message));
    } else {
        alert("⚠️ Keine Datenbankverbindung verfügbar!");
    }
}

// ZUGANGS-ANTRAG SENDEN
function beantrageZugang(e) {
    if (e) e.preventDefault();
    
    const name = document.getElementById('reqName').value.trim();
    const email = document.getElementById('reqEmail').value.trim();
    const pin = document.getElementById('reqPin').value.trim();
    const wunschRolle = document.getElementById('reqWunschRolle').value;

    if (!name || !email || !pin) {
        alert("Bitte Name, E-Mail und PIN vollständig ausfüllen!");
        return;
    }

    if (window.db) {
        db.collection('zugangsanfragen').add({
            name: name,
            email: email,
            pin: pin,
            wunschRolle: wunschRolle,
            status: 'ausstehend',
            datum: new Date().toISOString()
        }).then(() => {
            const statusMsg = document.getElementById('requestStatusMessage');
            if (statusMsg) {
                statusMsg.style.color = "green";
                statusMsg.innerText = "Antrag erfolgreich gesendet! Der Admin muss deinen Zugang freischalten.";
            }
            
            document.getElementById('reqName').value = "";
            document.getElementById('reqEmail').value = "";
            document.getElementById('reqPin').value = "";
        }).catch(err => {
            alert("Fehler beim Absenden: " + err.message);
        });
    }
}

// RENDER-FUNKTION FÜR DEN BENUTZERBEREICH
function renderBenutzerVerwaltung() {
    aktualisiereModulSichtbarkeit();
    if (istAdmin()) {
        ladeZugangsanfragen();
    }
}

// ANTRÄGE IM ADMIN-PANEL ANZEIGEN & VERWALTEN
function ladeZugangsanfragen() {
    const container = document.getElementById("benutzer-verwaltung-container");
    if (!container || !window.db) return;

    db.collection('zugangsanfragen').where('status', '==', 'ausstehend').get()
        .then(snapshot => {
            if (snapshot.empty) {
                container.innerHTML = "<h3>Offene Zugangsanträge</h3><p>Keine offenen Anträge vorhanden.</p>";
                return;
            }

            let html = `<h3>Offene Zugangsanträge (${snapshot.size})</h3>
            <table class="table" style="width:100%; border-collapse: collapse; margin-top:10px;">
                <thead>
                    <tr style="background:#f2f2f2; text-align:left;">
                        <th style="padding:8px;">Name</th>
                        <th style="padding:8px;">E-Mail</th>
                        <th style="padding:8px;">Gewünschte Rolle</th>
                        <th style="padding:8px;">Aktion</th>
                    </tr>
                </thead>
                <tbody>`;

            snapshot.forEach(doc => {
                const d = doc.data();
                html += `
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding:8px;"><strong>${d.name || '-'}</strong></td>
                    <td style="padding:8px;">${d.email || '-'}</td>
                    <td style="padding:8px;">${d.wunschRolle || 'viewer'}</td>
                    <td style="padding:8px;">
                        <button class="btn btn-primary" style="background:#28a745; border:none; padding:5px 10px; color:#fff; border-radius:3px; cursor:pointer;" onclick="genehmigeAntrag('${doc.id}', '${d.name}', '${d.email}', '${d.pin}', '${d.wunschRolle}')">✅ Freischalten</button>
                        <button class="btn btn-danger" style="background:#dc3545; border:none; padding:5px 10px; color:#fff; border-radius:3px; cursor:pointer;" onclick="lehneAntragAb('${doc.id}')">❌ Ablehnen</button>
                    </td>
                </tr>`;
            });

            html += "</tbody></table>";
            container.innerHTML = html;
        })
        .catch(err => {
            console.error("Fehler beim Laden der Anträge: ", err);
        });
}

function genehmigeAntrag(requestId, name, email, pin, rolle) {
    if (!confirm(`Soll der Zugang für ${name} als ${rolle.toUpperCase()} freigeschaltet werden?`)) return;

    if (window.db) {
        db.collection('benutzer').add({
            name: name,
            email: email,
            pin: pin,
            rolle: rolle,
            erstelltAm: new Date().toISOString()
        }).then(() => {
            return db.collection('zugangsanfragen').doc(requestId).update({ status: 'genehmigt' });
        }).then(() => {
            alert(`Zugang für ${name} wurde erfolgreich aktiviert!`);
            ladeZugangsanfragen();
        }).catch(err => alert("Fehler bei der Freischaltung: " + err.message));
    }
}

function lehneAntragAb(requestId) {
    if (!confirm("Soll dieser Antrag wirklich abgelehnt werden?")) return;

    if (window.db) {
        db.collection('zugangsanfragen').doc(requestId).update({ status: 'abgelehnt' })
            .then(() => {
                alert("Antrag wurde abgelehnt.");
                ladeZugangsanfragen();
            })
            .catch(err => alert("Fehler beim Ablehnen: " + err.message));
    }
}

// HEADER STATUSZEILE RENDEREN
function renderLoginStatusHeader() {
    let headerRight = document.querySelector('.feuerwehr');
    if (!headerRight) return;
    
    const statusText = istEditor() 
        ? `👤 ${aktuellerBenutzer.name || 'Angemeldet'} (${aktuellerBenutzer.rolle.toUpperCase()}) <a href="#" onclick="abmelden()" style="color:#fff; margin-left:10px; font-size:12px;">[Abmelden]</a>`
        : `🔒 Tablet-Modus (Gast) <a href="#" onclick="zeigePinModal('dashboard')" style="color:#fff; margin-left:10px; font-size:12px;">[Anmelden]</a>`;
        
    headerRight.innerHTML = `Freiwillige Feuerwehr Albertsried <br><small style="font-size:12px; opacity:0.9;">${statusText}</small>`;
}

function abmelden() {
    sessionStorage.removeItem('ffw_user');
    aktuellerBenutzer = { name: "", email: "", rolle: "gast" };
    aktualisiereModulSichtbarkeit();
    zeigeSeite('dashboard');
}

// ------------------------------------------
// AUTOMATISCHE SPERRE BEI INAKTIVITÄT (5 MIN)
// ------------------------------------------
let inaktivitaetsTimer;

function starteInaktivitaetsTimer() {
    clearTimeout(inaktivitaetsTimer);
    inaktivitaetsTimer = setTimeout(() => {
        if (istEditor()) {
            abmelden();
            alert("⏱️ Das Tablet wurde wegen Inaktivität automatisch gesperrt.");
        }
    }, 5 * 60 * 1000);
}

// Timer bei jeder Bildschirm-Interaktion zurücksetzen
['click', 'touchstart', 'mousemove', 'keydown'].forEach(event => {
    document.addEventListener(event, starteInaktivitaetsTimer);
});

// Globale Freigaben für HTML-Events
window.istAdmin = istAdmin;
window.istEditor = istEditor;
window.hatZugriffAufSensibleDaten = hatZugriffAufSensibleDaten;
window.aktualisiereModulSichtbarkeit = aktualisiereModulSichtbarkeit;
window.pruefeSeitenZugriff = pruefeSeitenZugriff;
window.zeigePinModal = zeigePinModal;
window.beantrageZugang = beantrageZugang;
window.renderBenutzerVerwaltung = renderBenutzerVerwaltung;
window.abmelden = abmelden;
window.genehmigeAntrag = genehmigeAntrag;
window.lehneAntragAb = lehneAntragAb;
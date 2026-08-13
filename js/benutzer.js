// ==========================================
// RECHTE- & BENUTZERSTEUERUNG (Variante 2)
// ==========================================

// Master-Admin E-Mail festlegen
const MASTER_ADMIN_EMAIL = "deine-echte-admin-email@feuerwehr.de"; 

// Aktueller Status in der Sitzung (sessionStorage gelöscht beim Schließen der App)
let aktuellerBenutzer = JSON.parse(sessionStorage.getItem('ffw_user')) || {
    email: "",
    rolle: "gast",
    pin: ""
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

// PIN / PASSWORT ABFRAGE (MODAL)
function zeigePinModal(zielSeite) {
    const pin = prompt("🔐 Geschützter Bereich! Bitte PIN oder Passwort eingeben:");
    if (!pin) return;

    if (window.db) {
        db.collection('benutzer').where('pin', '==', pin).get()
            .then(snapshot => {
                if (!snapshot.empty) {
                    const userData = snapshot.docs[0].data();
                    aktuellerBenutzer = {
                        email: userData.email,
                        rolle: userData.rolle,
                        name: userData.name
                    };
                    sessionStorage.setItem('ffw_user', JSON.stringify(aktuellerBenutzer));
                    alert(`Willkommen, ${userData.name}!`);
                    aktualisiereModulSichtbarkeit();
                    if (zielSeite && zielSeite !== 'dashboard') zeigeSeite(zielSeite);
                } else if (pin === "1122") { // Notfall-PIN für Haupt-Admin
                    aktuellerBenutzer = { email: MASTER_ADMIN_EMAIL, rolle: 'admin', name: 'Admin' };
                    sessionStorage.setItem('ffw_user', JSON.stringify(aktuellerBenutzer));
                    aktualisiereModulSichtbarkeit();
                    if (zielSeite && zielSeite !== 'dashboard') zeigeSeite(zielSeite);
                } else {
                    alert("❌ Falsche PIN / Passwort!");
                }
            })
            .catch(err => alert("Fehler bei der PIN-Prüfung: " + err.message));
    } else {
        if (pin === "1122") {
            aktuellerBenutzer = { email: MASTER_ADMIN_EMAIL, rolle: 'admin', name: 'Admin' };
            sessionStorage.setItem('ffw_user', JSON.stringify(aktuellerBenutzer));
            aktualisiereModulSichtbarkeit();
            if (zielSeite && zielSeite !== 'dashboard') zeigeSeite(zielSeite);
        } else {
            alert("❌ Falsche PIN / Passwort!");
        }
    }
}

// Header-Statusanzeige
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
    aktuellerBenutzer = { email: "", rolle: "gast", pin: "" };
    aktualisiereModulSichtbarkeit();
    zeigeSeite('dashboard');
}

// ------------------------------------------
// AUTOMATISCHE SPERRE BEI INAKTIVITÄT (5 MIN)
// ------------------------------------------
let inaktivitaetsTimer;

function starteInaktivitaetsTimer() {
    clearTimeout(inaktivitaetsTimer);
    // 5 Minuten = 300.000 ms
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

function beantrageZugang(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('reqName').value;
    const email = document.getElementById('reqEmail').value;
    const wunschRolle = document.getElementById('reqWunschRolle').value;

    if (window.db) {
        db.collection('zugangsanfragen').add({
            name: name,
            email: email,
            wunschRolle: wunschRolle,
            status: 'ausstehend',
            datum: new Date().toISOString()
        }).then(() => {
            document.getElementById('requestStatusMessage').innerText = "Antrag erfolgreich gesendet!";
        }).catch(err => {
            alert("Fehler beim Absenden: " + err.message);
        });
    }
}

function renderBenutzerVerwaltung() {
    aktualisiereModulSichtbarkeit();
}
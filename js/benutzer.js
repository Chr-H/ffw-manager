// ==========================================
// RECHTE- & BENUTZERSTEUERUNG (Variante 2)
// ==========================================

// Master-Admin E-Mail festlegen (Sicherheits-Fallback)
const MASTER_ADMIN_EMAIL = "deine-echte-admin-email@feuerwehr.de"; 

// Aktueller Status in der Sitzung
let aktuellerBenutzer = JSON.parse(localStorage.getItem('ffw_user')) || {
    email: "",
    rolle: "gast", // gast, editor, admin
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
    return istEditor(); // Nur Editoren & Admins sehen PSA & Personal
}

// ------------------------------------------
// UI ANPASSEN (Module sperren / freischalten)
// ------------------------------------------
function aktualisiereModulSichtbarkeit() {
    const sensibleModule = ['psa', 'personal', 'benutzer'];
    
    sensibleModule.forEach(modulId => {
        const navEintrag = document.querySelector(`li[onclick*="'${modulId}'"]`);
        const dashboardCard = document.querySelector(`.card[onclick*="'${modulId}'"]`);
        
        if (!hatZugriffAufSensibleDaten()) {
            // Für Gäste / Unangemeldete ausblenden oder sperren
            if (navEintrag) navEintrag.style.opacity = "0.4";
            if (dashboardCard) dashboardCard.style.opacity = "0.4";
        } else {
            if (navEintrag) navEintrag.style.opacity = "1";
            if (dashboardCard) dashboardCard.style.opacity = "1";
        }
    });

    // Login/Status-Anzeige im Header aktualisieren
    renderLoginStatusHeader();
}

// ------------------------------------------
// SEITEN-ZUGRIFFS-SCHUTZ (In zeigeSeite einbinden)
// ------------------------------------------
function pruefeSeitenZugriff(seiteId) {
    const geschuetzteSeiten = ['psa', 'personal', 'benutzer'];
    
    if (geschuetzteSeiten.includes(seiteId) && !hatZugriffAufSensibleDaten()) {
        zeigePinModal(seiteId);
        return false; // Zugriff vorerst verweigern
    }
    return true; // Zugriff erlaubt
}

// ------------------------------------------
// PIN / PASSWORT ABFRAGE (MODAL)
// ------------------------------------------
function zeigePinModal(zielSeite) {
    const pin = prompt("🔐 Geschützter Bereich! Bitte PIN oder Passwort eingeben:");
    if (!pin) return;

    // In Firestore nach passendem User mit dieser PIN/Passwort suchen
    db.collection('benutzer').where('pin', '==', pin).get()
        .then(snapshot => {
            if (!snapshot.empty) {
                const userData = snapshot.docs[0].data();
                aktuellerBenutzer = {
                    email: userData.email,
                    rolle: userData.rolle,
                    name: userData.name
                };
                localStorage.setItem('ffw_user', JSON.stringify(aktuellerBenutzer));
                alert(`Willkommen, ${userData.name}!`);
                aktualisiereModulSichtbarkeit();
                zeigeSeite(zielSeite);
            } else if (pin === "1122") { // Standard-Admin-Emergency PIN
                aktuellerBenutzer = { email: MASTER_ADMIN_EMAIL, rolle: 'admin', name: 'Admin' };
                localStorage.setItem('ffw_user', JSON.stringify(aktuellerBenutzer));
                aktualisiereModulSichtbarkeit();
                zeigeSeite(zielSeite);
            } else {
                alert("❌ Falsche PIN / Passwort!");
            }
        })
        .catch(err => alert("Fehler bei der PIN-Prüfung: " + err.message));
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
    localStorage.removeItem('ffw_user');
    aktuellerBenutzer = { email: "", rolle: "gast", pin: "" };
    aktualisiereModulSichtbarkeit();
    zeigeSeite('dashboard');
    alert("Erfolgreich abgemeldet. Das Tablet ist wieder im geschützten Gast-Modus.");
}
// ==========================================
// RECHTE- & BENUTZERSTEUERUNG (v0.7.4 - Bereinigt)
// ==========================================

const MASTER_ADMIN_EMAIL = "christian.holmer@arcor.de"; 

// Aktueller Status in der Sitzung
let aktuellerBenutzer = JSON.parse(sessionStorage.getItem('ffw_user')) || {
    name: "",
    email: "",
    rolle: "gast"
};

// Prüffunktionen für Berechtigungen
function istAdmin() {
    if (!aktuellerBenutzer) return false;
    const r = (aktuellerBenutzer.rolle || "").toLowerCase();
    const e = (aktuellerBenutzer.email || "").toLowerCase();
    return r === 'admin' || e === MASTER_ADMIN_EMAIL.toLowerCase();
}

function istEditor() {
    if (!aktuellerBenutzer) return false;
    const r = (aktuellerBenutzer.rolle || "").toLowerCase();
    return istAdmin() || r === 'editor';
}

function hatZugriffAufSensibleDaten() {
    return istEditor();
}

// UI ANPASSEN
function aktualisiereModulSichtbarkeit() {
    const sensibleModule = ['psa', 'personal']; 
    
    sensibleModule.forEach(modulId => {
        const navBtn = document.querySelector(`button[onclick*="'${modulId}'"]`);
        const dashboardCard = document.querySelector(`.card[onclick*="'${modulId}'"]`);
        
        if (!hatZugriffAufSensibleDaten()) {
            if (navBtn) navBtn.style.opacity = "0.4";
            if (dashboardCard) dashboardCard.style.opacity = "0.4";
        } else {
            if (navBtn) navBtn.style.opacity = "1";
            if (dashboardCard) dashboardCard.style.opacity = "1";
        }
    });

    renderLoginStatusHeader();
}

// SEITEN-ZUGRIFFS-SCHUTZ
function pruefeSeitenZugriff(seiteId) {
    const geschuetzteSeiten = ['psa', 'personal']; 
    
    if (geschuetzteSeiten.includes(seiteId) && !hatZugriffAufSensibleDaten()) {
        zeigePinModal(seiteId);
        return false;
    }
    return true;
}

// ANMELDUNG MIT PIN / BENUTZERNAME
function zeigePinModal(zielSeite) {
    const emailOderName = prompt("👤 Bitte Benutzername oder E-Mail-Adresse eingeben:");
    if (!emailOderName) return;

    const pin = prompt("🔐 Bitte deine persönliche PIN eingeben:");
    if (!pin) return;

    if (window.db) {
        db.collection('benutzer').get().then(snapshot => {
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
                    rolle: (treffer.rolle || 'viewer').toLowerCase()
                };
                
                // Sowohl sessionStorage als auch localStorage abdecken
                const userString = JSON.stringify(aktuellerBenutzer);
                sessionStorage.setItem('ffw_user', userString);
                localStorage.setItem('ffw_user', userString);
                localStorage.setItem('ffw_aktiver_benutzer', userString);

                alert(`Willkommen, ${treffer.name}!\nErfolgreich angemeldet als ${aktuellerBenutzer.rolle.toUpperCase()}.`);
                
                aktualisiereModulSichtbarkeit();
                if (typeof zeigeSeite === 'function') {
                    zeigeSeite(zielSeite && zielSeite !== 'dashboard' ? zielSeite : 'dashboard');
                }
            } else {
                alert("❌ Ungültige Kombination aus Benutzername/E-Mail und PIN!");
            }
        }).catch(err => alert("Fehler beim Login: " + err.message));
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
    const wunschRolle = document.getElementById('reqWunschRolle').value.toLowerCase();

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
    
    const regForm = document.getElementById("registration-form-container");
    const adminContainer = document.getElementById("benutzer-verwaltung-container");

    if (istAdmin()) {
        if (regForm) regForm.style.display = "none"; 
        
        if (adminContainer) {
            adminContainer.style.display = "block";
            ladeAdminAnsicht();
        }
    } else {
        if (regForm) regForm.style.display = "block";
        
        if (adminContainer) {
            adminContainer.style.display = "none";
            adminContainer.innerHTML = "";
        }
    }
}

// LÄDT ANTRÄGE & KAMERADEN
function ladeAdminAnsicht() {
    const container = document.getElementById("benutzer-verwaltung-container");
    if (!container || !window.db) return;

    container.innerHTML = `
        <div id="zugangsanfragen-bereich" style="margin-bottom: 30px;">
            <p>⌛ Lade offene Zugangsanträge...</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #ccc; margin: 20px 0;">
        <div id="aktive-benutzer-bereich">
            <p>⌛ Lade freigeschaltete Kameraden...</p>
        </div>
    `;

    ladeZugangsanfragen();
    ladeAktiveBenutzer();
}

// 1. OFFENE ZUGANGSANTRÄGE LADEN
function ladeZugangsanfragen() {
    const ziel = document.getElementById("zugangsanfragen-bereich");
    if (!ziel || !window.db) return;

    db.collection('zugangsanfragen').where('status', '==', 'ausstehend').get()
        .then(snapshot => {
            let html = `<h3>Offene Zugangsanträge (${snapshot.size})</h3>`;
            
            if (snapshot.empty) {
                html += "<p style='color:#666;'>Keine offenen Anträge vorhanden.</p>";
            } else {
                html += `
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
                        <td style="padding:8px;">${(d.wunschRolle || 'viewer').toUpperCase()}</td>
                        <td style="padding:8px;">
                            <button style="background:#28a745; color:#fff; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;" onclick="genehmigeAntrag('${doc.id}', '${d.name}', '${d.email}', '${d.pin}', '${d.wunschRolle}')">✅ Freischalten</button>
                            <button style="background:#dc3545; color:#fff; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;" onclick="lehneAntragAb('${doc.id}')">❌ Ablehnen</button>
                        </td>
                    </tr>`;
                });

                html += "</tbody></table>";
            }
            ziel.innerHTML = html;
        })
        .catch(err => {
            if (ziel) ziel.innerHTML = `<p style="color:red;">Fehler beim Laden der Anträge: ${err.message}</p>`;
        });
}

// FREISCHALTEN
function genehmigeAntrag(requestId, name, email, pin, rolle) {
    if (!confirm(`Soll der Zugang für ${name} als ${(rolle || 'viewer').toUpperCase()} freigeschaltet werden?`)) return;

    if (window.db) {
        const cleanEmail = email.trim().toLowerCase();

        db.collection('benutzer').get().then(snapshot => {
            let bestehenderUserDoc = null;

            snapshot.forEach(doc => {
                if ((doc.data().email || "").trim().toLowerCase() === cleanEmail) {
                    bestehenderUserDoc = doc;
                }
            });

            if (bestehenderUserDoc) {
                return db.collection('benutzer').doc(bestehenderUserDoc.id).update({
                    name: name,
                    pin: pin,
                    rolle: (rolle || 'viewer').toLowerCase(),
                    aktualisiertAm: new Date().toISOString()
                });
            } else {
                return db.collection('benutzer').add({
                    name: name,
                    email: email,
                    pin: pin,
                    rolle: (rolle || 'viewer').toLowerCase(),
                    erstelltAm: new Date().toISOString()
                });
            }
        })
        .then(() => {
            return db.collection('zugangsanfragen').doc(requestId).update({ status: 'genehmigt' });
        })
        .then(() => {
            alert(`Zugang für ${name} wurde erfolgreich aktiviert!`);
            ladeAdminAnsicht();
        })
        .catch(err => alert("Fehler bei der Freischaltung: " + err.message));
    }
}

// ABLEHNEN
function lehneAntragAb(requestId) {
    if (!confirm("Soll dieser Antrag wirklich abgelehnt werden?")) return;

    if (window.db) {
        db.collection('zugangsanfragen').doc(requestId).update({ status: 'abgelehnt' })
            .then(() => {
                alert("Antrag wurde abgelehnt.");
                ladeAdminAnsicht();
            })
            .catch(err => alert("Fehler beim Ablehnen: " + err.message));
    }
}

// 2. FREIGESCHALTETE KAMERADEN VERWALTEN
function ladeAktiveBenutzer() {
    const ziel = document.getElementById("aktive-benutzer-bereich");
    if (!ziel || !window.db) return;

    db.collection('benutzer').get()
        .then(snapshot => {
            let html = `<h3>Freigeschaltete Kameraden (${snapshot.size})</h3>`;
            
            if (snapshot.empty) {
                html += "<p style='color:#666;'>Keine aktiven Benutzer in der Datenbank vorhanden.</p>";
            } else {
                html += `
                <table class="table" style="width:100%; border-collapse: collapse; margin-top:10px;">
                    <thead>
                        <tr style="background:#f2f2f2; text-align:left;">
                            <th style="padding:8px;">Name</th>
                            <th style="padding:8px;">E-Mail</th>
                            <th style="padding:8px;">Rolle / Recht</th>
                            <th style="padding:8px;">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>`;

                snapshot.forEach(doc => {
                    const d = doc.data();
                    const currentRole = (d.rolle || 'viewer').toLowerCase();

                    html += `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding:8px;"><strong>${d.name || '-'}</strong></td>
                        <td style="padding:8px;">${d.email || '-'}</td>
                        <td style="padding:8px;">
                            <select onchange="aendereBenutzerRolle('${doc.id}', this.value)" style="padding:5px; border-radius:3px; font-weight:bold;">
                                <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Admin</option>
                                <option value="editor" ${currentRole === 'editor' ? 'selected' : ''}>Editor</option>
                                <option value="viewer" ${currentRole === 'viewer' ? 'selected' : ''}>Viewer (Gast)</option>
                            </select>
                        </td>
                        <td style="padding:8px;">
                            <button style="background:#ffc107; color:#000; border:none; padding:5px 10px; border-radius:3px; cursor:pointer; margin-right:5px; font-weight:bold;" 
                                    onclick="pinZuruecksetzen('${doc.id}', '${d.name}')">
                                🔑 PIN ändern
                            </button>
                            <button style="background:#dc3545; color:#fff; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;" 
                                    onclick="loescheBenutzer('${doc.id}', '${d.name}')">
                                🗑️ Rechte entziehen
                            </button>
                        </td>
                    </tr>`;
                });

                html += "</tbody></table>";
            }
            ziel.innerHTML = html;
        })
        .catch(err => {
            if (ziel) ziel.innerHTML = `<p style="color:red;">Fehler beim Laden der Kameraden: ${err.message}</p>`;
        });
}

// PIN DURCH ADMIN ZURÜCKSETZEN
function pinZuruecksetzen(userId, benutzerName) {
    const neuePin = prompt(`🔑 Neue 4- bis 6-stellige PIN für ${benutzerName} eingeben:`);
    if (neuePin === null) return;

    const sauberePin = neuePin.trim();
    if (sauberePin.length < 4 || sauberePin.length > 6 || isNaN(sauberePin)) {
        alert("⚠️ Die PIN muss eine Zahl mit 4 bis 6 Ziffern sein!");
        return;
    }

    if (window.db) {
        db.collection('benutzer').doc(userId).update({ pin: sauberePin })
            .then(() => alert(`✅ PIN für ${benutzerName} erfolgreich geändert!`))
            .catch(err => alert("Fehler beim Ändern der PIN: " + err.message));
    }
}

// ROLLE BEARBEITEN
function aendereBenutzerRolle(userId, neueRolle) {
    if (!window.db) return;

    db.collection('benutzer').doc(userId).update({ rolle: neueRolle.toLowerCase() })
        .then(() => {
            alert("✅ Rolle erfolgreich aktualisiert!");
            ladeAktiveBenutzer();
        })
        .catch(err => alert("Fehler beim Aktualisieren: " + err.message));
}

// BENUTZER LÖSCHEN
function loescheBenutzer(userId, name) {
    if (!confirm(`Möchtest du dem Kameraden ${name} wirklich alle Rechte entziehen?`)) return;
    if (!window.db) return;

    db.collection('benutzer').doc(userId).delete()
        .then(() => {
            alert(`Zugang für ${name} wurde gelöscht.`);
            ladeAdminAnsicht();
        })
        .catch(err => alert("Fehler beim Löschen: " + err.message));
}

// HEADER STATUSZEILE
function renderLoginStatusHeader() {
    let headerRight = document.querySelector('.feuerwehr');
    if (!headerRight) return;
    
    const statusText = istEditor() 
        ? `👤 ${aktuellerBenutzer.name || 'Angemeldet'} (${(aktuellerBenutzer.rolle || 'admin').toUpperCase()}) <a href="javascript:void(0)" onclick="abmelden()" style="color:#fff; margin-left:10px; font-size:12px;">[Abmelden]</a>`
        : `🔒 Tablet-Modus (Gast) <a href="javascript:void(0)" onclick="zeigePinModal('dashboard')" style="color:#fff; margin-left:10px; font-size:12px;">[Anmelden]</a>`;
        
    headerRight.innerHTML = `Freiwillige Feuerwehr Albertsried <br><small style="font-size:12px; opacity:0.9;">${statusText}</small>`;
}

// ABMELDEN
function abmelden() {
    sessionStorage.removeItem('ffw_user');
    localStorage.removeItem('ffw_user');
    localStorage.removeItem('ffw_aktiver_benutzer');
    aktuellerBenutzer = { name: "", email: "", rolle: "gast" };
    
    aktualisiereModulSichtbarkeit();
    if (typeof zeigeSeite === 'function') {
        zeigeSeite('dashboard');
    }
}

// AUTOMATISCHE SPERRE BEI INAKTIVITÄT (5 MIN)
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

['click', 'touchstart', 'mousemove', 'keydown'].forEach(event => {
    document.addEventListener(event, starteInaktivitaetsTimer);
});

// GLOBALE FREIGABEN
window.istAdmin = istAdmin;
window.istEditor = istEditor;
window.hatZugriffAufSensibleDaten = hatZugriffAufSensibleDaten;
window.aktualisiereModulSichtbarkeit = aktualisiereModulSichtbarkeit;
window.pruefeSeitenZugriff = pruefeSeitenZugriff;
window.zeigePinModal = zeigePinModal;
window.beantrageZugang = beantrageZugang;
window.renderBenutzerVerwaltung = renderBenutzerVerwaltung;
window.ladeAdminAnsicht = ladeAdminAnsicht;
window.genehmigeAntrag = genehmigeAntrag;
window.lehneAntragAb = lehneAntragAb;
window.ladeAktiveBenutzer = ladeAktiveBenutzer;
window.pinZuruecksetzen = pinZuruecksetzen;
window.aendereBenutzerRolle = aendereBenutzerRolle;
window.loescheBenutzer = loescheBenutzer;
window.abmelden = abmelden;
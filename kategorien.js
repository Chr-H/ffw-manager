// ==========================================
// FFW Manager - Kategorien
// ==========================================

let kategorien = [];


// Kategorien laden

function ladeKategorien(){

    kategorien = [

        {
            id: "KAT-001",
            name: "Pumpen"
        },

        {
            id: "KAT-002",
            name: "Schläuche"
        },

        {
            id: "KAT-003",
            name: "Leitern"
        },

        {
            id: "KAT-004",
            name: "Atemschutz"
        },

        {
            id: "KAT-005",
            name: "Stromversorgung"
        },

        {
            id: "KAT-006",
            name: "Rettungsgeräte"
        },

        {
            id: "KAT-007",
            name: "Sonstiges"
        }

    ];

}


// Auswahlfeld füllen

// ==========================================
// Kategorien anzeigen
// ==========================================

function zeigeKategorien(){

    const formular =
        document.getElementById("kategorie");

    const filter =
        document.getElementById("filterKategorie");


    // Formular zurücksetzen

    if(formular){

        formular.innerHTML = `
            <option value="">
                Kategorie auswählen
            </option>
        `;

    }


    // Filter zurücksetzen

    if(filter){

        filter.innerHTML = `
            <option value="">
                Alle Kategorien
            </option>
        `;

    }


    // Beide Dropdowns füllen

    kategorien.forEach(function(k){

        if(formular){

            formular.innerHTML += `
                <option value="${k.name}">
                    ${k.name}
                </option>
            `;

        }


        if(filter){

            filter.innerHTML += `
                <option value="${k.name}">
                    ${k.name}
                </option>
            `;

        }

    });

}


// Start

document.addEventListener(
    "DOMContentLoaded",
    function(){

        ladeKategorien();

        zeigeKategorien();

    }
);
// ==========================================
// FFW Manager - Zentrale Datenspeicherung
// ==========================================


function speichereDaten(name, daten){

    localStorage.setItem(
        name,
        JSON.stringify(daten)
    );

}



function ladeDaten(name){

    const daten = localStorage.getItem(name);


    if(daten){

        return JSON.parse(daten);

    }


    return [];

}
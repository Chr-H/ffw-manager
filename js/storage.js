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
// Initiales Fahrzeug-Array
const INITIAL_VEHICLES = [
  {
    id: 'veh-1',
    callSign: 'Florian Musterstadt 40/1',
    name: 'HLF 20',
    licensePlate: 'M-FF 112',
    status: 'Einsatzbereit',
    nextHU: '2027-05',
    nextSP: '2026-11',
    description: 'Hilfeleistungslöschgruppenfahrzeug mit 2000l Wasser'
  }
];

// Laden der Fahrzeuge aus dem LocalStorage
function getVehicles() {
  const data = localStorage.getItem('ffw_vehicles');
  return data ? JSON.parse(data) : INITIAL_VEHICLES;
}

// Speichern der Fahrzeuge
function saveVehicles(vehicles) {
  localStorage.setItem('ffw_vehicles', JSON.stringify(vehicles));
}
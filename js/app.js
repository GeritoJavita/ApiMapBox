let map, searchManager;
let pushpins = [];

const bogotaCenter = new Microsoft.Maps.Location(4.711, -74.072);

// 10 puntos de interés en Bogotá
const puntos = [
  { title: "Monserrate", desc: "Santuario icónico con vista de la ciudad.", loc: new Microsoft.Maps.Location(4.605, -74.056) },
  { title: "Plaza de Bolívar", desc: "Plaza principal con edificios históricos.", loc: new Microsoft.Maps.Location(4.598, -74.077) },
  { title: "Museo del Oro", desc: "Famoso museo con colección precolombina.", loc: new Microsoft.Maps.Location(4.601, -74.072) },
  { title: "Jardín Botánico", desc: "Espacio natural y educativo de Bogotá.", loc: new Microsoft.Maps.Location(4.663, -74.094) },
  { title: "Parque Simón Bolívar", desc: "Parque urbano más grande de la ciudad.", loc: new Microsoft.Maps.Location(4.658, -74.094) },
  { title: "Usaquén", desc: "Barrio colonial con gastronomía y ferias.", loc: new Microsoft.Maps.Location(4.709, -74.036) },
  { title: "Zona T", desc: "Área famosa por bares, restaurantes y vida nocturna.", loc: new Microsoft.Maps.Location(4.667, -74.055) },
  { title: "Museo Botero", desc: "Colección de arte del maestro Fernando Botero.", loc: new Microsoft.Maps.Location(4.602, -74.070) },
  { title: "Parque de la 93", desc: "Zona gastronómica y cultural al norte de Bogotá.", loc: new Microsoft.Maps.Location(4.676, -74.048) },
  { title: "Biblioteca Virgilio Barco", desc: "Arquitectura de Rogelio Salmona y espacio cultural.", loc: new Microsoft.Maps.Location(4.648, -74.093) }
];

// Callback inicial
function GetMap() {
  map = new Microsoft.Maps.Map("#map", {
    center: bogotaCenter,
    zoom: 12,
    mapTypeId: Microsoft.Maps.MapTypeId.road
  });

  // Cerrar info al hacer clic en mapa
  Microsoft.Maps.Events.addHandler(map, "click", () => hideInfoBox());

  // Botón cerrar
  document.getElementById("btn-close").addEventListener("click", hideInfoBox);

  // Búsqueda
  document.getElementById("btn-search").addEventListener("click", () => {
    const q = document.getElementById("search-input").value;
    if (q) geocodeQuery(q);
  });

  // Mostrar puntos de interés al inicio
  showAllPoints();
}

function addPushpin({ title, desc, loc }) {
  const pin = new Microsoft.Maps.Pushpin(loc, { title });
  pin.metadata = { title, description: desc };
  Microsoft.Maps.Events.addHandler(pin, "click", e => showInfoBox(e.target.metadata, loc));
  map.entities.push(pin);
  pushpins.push(pin);
}

function showAllPoints() {
  map.entities.clear();
  pushpins = [];
  puntos.forEach(p => addPushpin(p));
  const locations = puntos.map(p => p.loc);
  const bounds = Microsoft.Maps.LocationRect.fromLocations(locations);
  map.setView({ bounds, padding: 50 });
}

function showInfoBox(data, loc) {
  document.getElementById("info-title").innerText = data.title;
  document.getElementById("info-description").innerText = data.description;
  document.getElementById("info-box").classList.remove("hidden");
  map.setView({ center: loc, zoom: 15 });
}

function hideInfoBox() {
  document.getElementById("info-box").classList.add("hidden");
}

// Funciones de control
function setMapType(type) {
  if (type === "road") map.setView({ mapTypeId: Microsoft.Maps.MapTypeId.road });
  if (type === "aerial") map.setView({ mapTypeId: Microsoft.Maps.MapTypeId.aerial });
  if (type === "grayscale") map.setView({ mapTypeId: Microsoft.Maps.MapTypeId.grayscale });
}
function resetCenter() { map.setView({ center: bogotaCenter, zoom: 12 }); }
function zoomIn() { map.setView({ zoom: map.getZoom() + 1 }); }
function zoomOut() { map.setView({ zoom: map.getZoom() - 1 }); }

// Geocodificación
function geocodeQuery(query) {
  if (!searchManager) {
    Microsoft.Maps.loadModule("Microsoft.Maps.Search", () => {
      searchManager = new Microsoft.Maps.Search.SearchManager(map);
      geocodeQuery(query);
    });
  } else {
    searchManager.geocode({
      where: query,
      callback: r => {
        if (r && r.results && r.results.length > 0) {
          const res = r.results[0];
          addPushpin({ title: res.name, desc: res.address.formattedAddress, loc: res.location });
          map.setView({ center: res.location, zoom: 14 });
        } else alert("No se encontró resultado.");
      },
      errorCallback: e => alert("Error en búsqueda: " + e)
    });
  }
}

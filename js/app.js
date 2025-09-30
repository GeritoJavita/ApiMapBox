mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94ZGllZ28wMTYiLCJhIjoiY21nNXJteXF2MDg2ZjJqcTRhaXRnbXM4ZyJ9.fQ-ZdM9lekGoKReBp5x40Q';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-74.08175, 4.60971], // Bogotá centro
  zoom: 12
});

// --- 10 puntos de interés en Bogotá ---
const puntosInteres = [
  { coords: [-74.0555, 4.6056], nombre: "Plaza de Bolívar" },
  { coords: [-74.0672, 4.6016], nombre: "Museo del Oro" },
  { coords: [-74.0561, 4.6019], nombre: "Museo Botero" },
  { coords: [-74.0565, 4.5981], nombre: "Chorro de Quevedo" },
  { coords: [-74.0589, 4.6050], nombre: "Catedral Primada" },
  { coords: [-74.0617, 4.6101], nombre: "Monserrate (acceso)" },
  { coords: [-74.0942, 4.6584], nombre: "Parque Simón Bolívar" },
  { coords: [-74.0935, 4.6812], nombre: "Jardín Botánico" },
  { coords: [-74.0429, 4.6935], nombre: "Zona T (Zona Rosa)" },
  { coords: [-74.0467, 4.7001], nombre: "Parque de la 93" }
];

puntosInteres.forEach(p => {
  new mapboxgl.Marker()
    .setLngLat(p.coords)
    .setPopup(new mapboxgl.Popup().setHTML(`<b>${p.nombre}</b>`))
    .addTo(map);
});

// --- Funcionalidades extra ---
function zoomIn() {
  map.zoomIn();
}

function zoomOut() {
  map.zoomOut();
}

function goToLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      map.flyTo({
        center: [pos.coords.longitude, pos.coords.latitude],
        zoom: 14
      });

      new mapboxgl.Marker({ color: "red" })
        .setLngLat([pos.coords.longitude, pos.coords.latitude])
        .setPopup(new mapboxgl.Popup().setHTML("<b>Estás aquí</b>"))
        .addTo(map);
    });
  } else {
    alert("La geolocalización no está disponible en este navegador.");
  }
}

let isSatellite = false;
function toggleStyle() {
  if (isSatellite) {
    map.setStyle('mapbox://styles/mapbox/streets-v12');
  } else {
    map.setStyle('mapbox://styles/mapbox/satellite-v9');
  }
  isSatellite = !isSatellite;
}

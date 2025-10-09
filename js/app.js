/* app.js — Mapa interactivo con POIs + buscador global + modo agregar marcador */

mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94ZGllZ28wMTYiLCJhIjoiY21nNXJteXF2MDg2ZjJqcTRhaXRnbXM4ZyJ9.fQ-ZdM9lekGoKReBp5x40Q';

// === MAPA BASE ===
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-74.0721, 4.7110], // Bogotá
  zoom: 12
});

map.addControl(new mapboxgl.NavigationControl(), 'top-right');

// === POIs Bogotá ===
const POIS = [
  { id: 'monserrate', title: 'Cerro de Monserrate', category: 'viewpoint', coords: [-74.05639, 4.60583], desc: 'Mirador icónico con iglesia y teleférico.' },
  { id: 'plaza-bolivar', title: 'Plaza de Bolívar', category: 'plaza', coords: [-74.07600, 4.59815], desc: 'Plaza principal del centro histórico.' },
  { id: 'museo-oro', title: 'Museo del Oro', category: 'museum', coords: [-74.07200, 4.60192], desc: 'Gran colección precolombina de oro.' },
  { id: 'museo-botero', title: 'Museo Botero', category: 'museum', coords: [-74.07323, 4.59665], desc: 'Colección de Fernando Botero y arte internacional.' },
  { id: 'chorro-quevedo', title: 'Chorro de Quevedo', category: 'plaza', coords: [-74.069693, 4.597726], desc: 'Plazoleta histórica en La Candelaria.' },
  { id: 'catedral', title: 'Catedral Primada', category: 'church', coords: [-74.07515, 4.597842], desc: 'Catedral frente a la Plaza de Bolívar.' },
  { id: 'parque-simon', title: 'Parque Simón Bolívar', category: 'park', coords: [-74.09389, 4.65806], desc: 'El parque metropolitano más grande de Bogotá.' },
  { id: 'jardin-botanico', title: 'Jardín Botánico', category: 'garden', coords: [-74.100198, 4.668211], desc: 'Jardín Botánico José Celestino Mutis.' },
  { id: 'parque-93', title: 'Parque de la 93', category: 'park', coords: [-74.04835, 4.67677], desc: 'Zona gastronómica y de eventos.' },
  { id: 'usaquen', title: 'Plaza de Usaquén', category: 'neighborhood', coords: [-74.03106, 4.69682], desc: 'Zona colonial con mercado y restaurantes.' }
];

const ICONS = {
  viewpoint: '⛰️', plaza: '🏛️', museum: '🏺', church: '⛪', park: '🌳', garden: '🌿', neighborhood: '🏘️'
};

let markers = [];
const listEl = document.getElementById('poi-list');
const searchInput = document.getElementById('poi-search');

// === Funciones básicas de POIs ===
function createMarker(poi){
  const el = document.createElement('div');
  el.className = 'marker-mini';
  el.textContent = ICONS[poi.category] || '📍';

  const popup = new mapboxgl.Popup({ offset: 14 })
    .setHTML(`<strong>${poi.title}</strong><p>${poi.desc}</p>`);

  const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat(poi.coords)
    .setPopup(popup)
    .addTo(map);

  return { id: poi.id, marker, popup, poi };
}

function loadPOIs(){
  markers.forEach(m => m.marker.remove());
  markers = [];
  POIS.forEach(p => markers.push(createMarker(p)));
  renderPOIList(POIS);
}

function renderPOIList(items){
  listEl.innerHTML = '';
  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'poi-item';
    li.innerHTML = `
      <div class="marker-mini">${ICONS[item.category] || '📍'}</div>
      <div class="poi-info">
        <h4>${item.title}</h4>
        <p>${item.desc}</p>
      </div>
      <div class="poi-actions">
        <button data-id="${item.id}" class="btn-go">Ir</button>
        <button data-id="${item.id}" class="btn-info ghost">Info</button>
      </div>`;
    listEl.appendChild(li);
  });
}

function flyToPOI(id){
  const m = markers.find(x => x.id === id);
  if(!m) return;
  map.flyTo({ center: m.poi.coords, zoom: 15, speed: 0.9 });
  m.popup.addTo(map);
}

listEl.addEventListener('click', (e) => {
  if(e.target.classList.contains('btn-go')) flyToPOI(e.target.dataset.id);
  if(e.target.classList.contains('btn-info')) markers.find(x => x.id === e.target.dataset.id)?.popup.addTo(map);
});

// === Buscador global (Mapbox Geocoding API) ===
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  if(!query) return;

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=5`;
      const res = await fetch(url);
      const data = await res.json();

      // Limpiar lista lateral y mostrar resultados
      listEl.innerHTML = '';
      data.features.forEach(f => {
        const [lng, lat] = f.center;
        const li = document.createElement('li');
        li.className = 'poi-item';
        li.innerHTML = `
          <div class="marker-mini">📍</div>
          <div class="poi-info">
            <h4>${f.text}</h4>
            <p>${f.place_name}</p>
          </div>`;
        li.addEventListener('click', () => {
          map.flyTo({ center: [lng, lat], zoom: 14 });
          new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map)
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>${f.text}</strong><p>${f.place_name}</p>`))
            .togglePopup();
        });
        listEl.appendChild(li);
      });
    } catch (err) {
      console.error('Error al buscar:', err);
    }
  }, 400); // evita spam de peticiones
});

// === Botón Mostrar todos los POIs ===
document.getElementById('btn-fit').addEventListener('click', () => {
  const locs = POIS.map(p => p.coords);
  const bounds = locs.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(locs[0], locs[0]));
  map.fitBounds(bounds, { padding: 60 });
});

// === Geolocalizar usuario ===
document.getElementById('locate').addEventListener('click', () => {
  if(!navigator.geolocation) return alert('Geolocalización no soportada.');
  navigator.geolocation.getCurrentPosition(pos => {
    const userCoords = [pos.coords.longitude, pos.coords.latitude];
    if(window._userMarker) window._userMarker.remove();
    window._userMarker = new mapboxgl.Marker({ color: '#ff7b00' }).setLngLat(userCoords).addTo(map);
    map.flyTo({ center: userCoords, zoom: 14 });
  });
});

// === Cambiar estilo ===
document.getElementById('style-select').addEventListener('change', e => {
  map.setStyle('mapbox://styles/' + e.target.value);
});

// === Sidebar toggle ===
document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
  const sb = document.getElementById('sidebar');
  sb.style.display = (sb.style.display === 'none') ? 'flex' : 'none';
});

// === Modo agregar marcador manual ===
let addMarkerMode = false;
const addBtn = document.createElement('button');
addBtn.textContent = '🖊️ Agregar marcador';
addBtn.style.position = 'absolute';
addBtn.style.top = '10px';
addBtn.style.right = '10px';
addBtn.style.zIndex = '999';
document.body.appendChild(addBtn);

addBtn.addEventListener('click', () => {
  addMarkerMode = !addMarkerMode;
  addBtn.style.background = addMarkerMode ? '#4ade80' : '';
  addBtn.textContent = addMarkerMode ? '🖊️ Click en el mapa...' : '🖊️ Agregar marcador';
});

// Solo agrega marcador si el modo está activado
map.on('click', (e) => {
  if(!addMarkerMode) return;
  const coords = [e.lngLat.lng, e.lngLat.lat];
  new mapboxgl.Marker({ draggable: true })
    .setLngLat(coords)
    .setPopup(new mapboxgl.Popup().setHTML(`<strong>Marcador nuevo</strong><br>${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}`))
    .addTo(map)
    .togglePopup();
  addMarkerMode = false;
  addBtn.textContent = '🖊️ Agregar marcador';
  addBtn.style.background = '';
});

// === Cargar POIs iniciales ===
map.on('load', () => {
  loadPOIs();
  const bounds = POIS.reduce((b, p) => b.extend(p.coords), new mapboxgl.LngLatBounds(POIS[0].coords, POIS[0].coords));
  map.fitBounds(bounds, { padding: 80 });
});

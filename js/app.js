/* app.js — Mapbox improved UI + 10 POIs Bogotá
   Nota: reemplaza mapboxgl.accessToken si lo deseas.
*/
mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94ZGllZ28wMTYiLCJhIjoiY21nNXJteXF2MDg2ZjJqcTRhaXRnbXM4ZyJ9.fQ-ZdM9lekGoKReBp5x40Q';

// Inicializa mapa
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-74.0721, 4.7110], // Bogotá (lng, lat)
  zoom: 12,
  projection: 'mercator'
});

// Añade controles nativos
map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

// Datos corregidos: 10 POIs Bogotá (lng, lat)
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

// Emoji por categoría (se usan dentro del marcador)
const ICONS = {
  viewpoint: '⛰️',
  plaza: '🏛️',
  museum: '🏺',
  church: '⛪',
  park: '🌳',
  garden: '🌿',
  neighborhood: '🏘️'
};

let markers = []; // guardamos referencias
const listEl = document.getElementById('poi-list');
const searchInput = document.getElementById('poi-search');

// Crea los marcadores con icono personalizado y popup
function createMarker(poi){
  const el = document.createElement('div');
  el.className = 'marker-mini';
  el.title = poi.title;
  el.textContent = ICONS[poi.category] || '📍';

  const popup = new mapboxgl.Popup({ offset: 14, className: 'custom-popup' })
    .setHTML(`<strong>${poi.title}</strong><p style="margin:6px 0 0;color:#334155">${poi.desc}</p>`);

  const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat(poi.coords)
    .setPopup(popup)
    .addTo(map);

  // al hacer click en el div también abrimos popup (útil en móviles)
  el.addEventListener('click', () => {
    popup.addTo(map);
  });

  return { id: poi.id, marker, popup, poi };
}

// Rellena la lista lateral
function renderPOIList(items){
  listEl.innerHTML = '';
  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'poi-item';
    li.setAttribute('data-id', item.id);

    const icon = document.createElement('div'); icon.className = 'marker-mini'; icon.textContent = ICONS[item.category] || '📍';
    const info = document.createElement('div'); info.className = 'poi-info';
    const h4 = document.createElement('h4'); h4.textContent = item.title;
    const p = document.createElement('p'); p.textContent = item.desc;

    info.appendChild(h4); info.appendChild(p);

    const actions = document.createElement('div'); actions.className = 'poi-actions';
    const btnGo = document.createElement('button'); btnGo.textContent = 'Ir';
    const btnInfo = document.createElement('button'); btnInfo.textContent = 'Info'; btnInfo.className = 'ghost';

    // Ir => centrar y abrir popup
    btnGo.addEventListener('click', () => {
      flyToPOI(item.id);
    });

    btnInfo.addEventListener('click', () => {
      openPopup(item.id);
    });

    actions.appendChild(btnGo);
    actions.appendChild(btnInfo);

    li.appendChild(icon);
    li.appendChild(info);
    li.appendChild(actions);

    listEl.appendChild(li);
  });
}

// Añade marcadores al mapa y a la lista
function loadPOIs(){
  // limpiar
  markers.forEach(m => m.marker.remove());
  markers = [];

  POIS.forEach(p => {
    const m = createMarker(p);
    markers.push(m);
  });

  renderPOIList(POIS);
}

// Fly to por id
function flyToPOI(id){
  const m = markers.find(x => x.id === id);
  if(!m) return;
  map.flyTo({ center: m.poi.coords, zoom: 15, speed: 0.9 });
  m.popup.addTo(map);
}

// Abrir popup por id
function openPopup(id){
  const m = markers.find(x => x.id === id);
  if(!m) return;
  m.popup.addTo(map);
  map.setCenter(m.poi.coords);
  map.setZoom(15);
}

// Buscar / filtrar
searchInput.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  const filtered = POIS.filter(p => p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
  renderPOIList(filtered);

  // opcional: esconder marcadores no coincidentes
  markers.forEach(m => {
    const visible = filtered.some(fp => fp.id === m.id);
    if(visible) m.marker.getElement().style.display = 'flex';
    else m.marker.getElement().style.display = 'none';
  });
});

// Mostrar todos (fit bounds)
document.getElementById('btn-fit').addEventListener('click', () => {
  const locs = POIS.map(p => p.coords);
  const bounds = locs.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(locs[0], locs[0]));
  map.fitBounds(bounds, { padding: 60 });
});

// Geolocalizar usuario
document.getElementById('locate').addEventListener('click', () => {
  if(!navigator.geolocation) { alert('Geolocalización no soportada.'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const userCoords = [pos.coords.longitude, pos.coords.latitude];
    // marcador de usuario
    const el = document.createElement('div');
    el.className = 'marker-mini';
    el.style.background = '#ffeedd';
    el.textContent = '📍';
    // remove existing user marker si existe
    if(window._userMarker) window._userMarker.remove();
    window._userMarker = new mapboxgl.Marker({ element: el }).setLngLat(userCoords).addTo(map);
    map.flyTo({ center: userCoords, zoom: 14 });
  }, (err) => {
    alert('No se pudo obtener la ubicación: ' + (err.message || err.code));
  });
});

// Zoom controls
document.getElementById('zoom-in').addEventListener('click', () => map.zoomIn());
document.getElementById('zoom-out').addEventListener('click', () => map.zoomOut());

// Cambiar estilo desde select
document.getElementById('style-select').addEventListener('change', (e) => {
  const val = e.target.value;
  map.setStyle('mapbox://styles/' + val);
  // Cuando se cambia de estilo, Mapbox puede resetear algunos elementos; reafirmamos los markers cuando el estilo termine de cargar.
  map.once('style.load', () => {
    // Los markers DOM no se pierden normalmente, pero reafirmamos la referencia.
    // No es necesario volver a crear marcadores porque usamos Marker con elementos DOM.
  });
});

// Toggle sidebar (móvil)
document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
  const sb = document.getElementById('sidebar');
  const expanded = sb.style.display !== 'none';
  sb.style.display = expanded ? 'none' : 'flex';
  document.getElementById('btn-toggle-sidebar').innerText = expanded ? '◀' : '✕';
});

// Inicializamos cuando el mapa carga
map.on('load', () => {
  loadPOIs();
  // Ajuste inicial para cubrir los POI
  const locs = POIS.map(p => p.coords);
  const bounds = locs.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(locs[0], locs[0]));
  map.fitBounds(bounds, { padding: 80 });
});

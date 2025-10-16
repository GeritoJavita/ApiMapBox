// === CONFIGURACIÓN ===
mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94ZGllZ28wMTYiLCJhIjoiY21nNXJteXF2MDg2ZjJqcTRhaXRnbXM4ZyJ9.fQ-ZdM9lekGoKReBp5x40Q';

// Puntos de interés base
const DEFAULT_POIS = [
  { id: 'monserrate', title: 'Cerro de Monserrate', category: 'viewpoint', coords: [-74.05639, 4.60583], desc: 'Mirador icónico con iglesia y teleférico.' },
  { id: 'plaza-bolivar', title: 'Plaza de Bolívar', category: 'plaza', coords: [-74.07600, 4.59815], desc: 'Plaza principal del centro histórico.' },
  { id: 'museo-oro', title: 'Museo del Oro', category: 'museum', coords: [-74.07200, 4.60192], desc: 'Colección precolombina de oro.' },
  { id: 'parque-simon', title: 'Parque Simón Bolívar', category: 'park', coords: [-74.09389, 4.65806], desc: 'El parque más grande de Bogotá.' },
];

const ICONS = { viewpoint: '⛰️', plaza: '🏛️', museum: '🏺', park: '🌳', user: '📍' };

// Estado general
let POIS = [];
let markers = [];
let addMode = false;
let editingId = null;

// Referencias DOM
const listEl = document.getElementById('poi-list');
const searchEl = document.getElementById('poi-search');
const modal = document.getElementById('modal');
const mTitle = document.getElementById('m-title');
const mDesc = document.getElementById('m-desc');
const mSave = document.getElementById('m-save');
const mCancel = document.getElementById('m-cancel');

// === MAPA ===
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-74.0721, 4.7110],
  zoom: 12,
});
map.addControl(new mapboxgl.NavigationControl(), 'top-right');

// === FUNCIONES PRINCIPALES ===
function loadSaved() {
  try {
    const data = JSON.parse(localStorage.getItem('pois_v2'));
    POIS = Array.isArray(data) ? data : DEFAULT_POIS.slice();
  } catch {
    POIS = DEFAULT_POIS.slice();
  }
}

function savePOIs() {
  localStorage.setItem('pois_v2', JSON.stringify(POIS));
}

function createMarker(poi) {
  const el = document.createElement('div');
  el.className = 'marker-mini';
  el.textContent = ICONS[poi.category] || '📍';

  const popupHTML = `
    <strong>${poi.title}</strong>
    <p class="muted">${poi.desc || ''}</p>
    <div style="margin-top:8px;">
      <button class="chip" onclick="editPOI('${poi.id}')">Editar</button>
      <button class="chip" onclick="deletePOI('${poi.id}')">Eliminar</button>
    </div>
  `;

  const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat(poi.coords)
    .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(popupHTML))
    .addTo(map);

  return { id: poi.id, marker, poi };
}

function renderMarkers() {
  markers.forEach(m => m.marker.remove());
  markers = POIS.map(createMarker);
  renderList();
}

function renderList() {
  listEl.innerHTML = '';
  POIS.forEach(p => {
    const li = document.createElement('li');
    li.className = 'poi-item';
    li.innerHTML = `
      <div class="marker-mini">${ICONS[p.category] || '📍'}</div>
      <div class="poi-info"><h4>${p.title}</h4><p>${p.desc}</p></div>
      <div class="poi-actions">
        <button class="btn-go" data-id="${p.id}">Ir</button>
      </div>`;
    listEl.appendChild(li);
  });
}

listEl.addEventListener('click', e => {
  if (e.target.classList.contains('btn-go')) {
    const id = e.target.dataset.id;
    const poi = POIS.find(p => p.id === id);
    if (poi) map.flyTo({ center: poi.coords, zoom: 15 });
  }
});

// === BUSCAR ===
searchEl.addEventListener('input', async e => {
  const q = e.target.value.trim();
  if (!q) return renderList();
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${mapboxgl.accessToken}&limit=5`;
    const res = await fetch(url);
    const data = await res.json();
    listEl.innerHTML = '';
    data.features.forEach(f => {
      const li = document.createElement('li');
      li.className = 'poi-item';
      li.innerHTML = `<div class="marker-mini">📍</div><div class="poi-info"><h4>${f.text}</h4><p>${f.place_name}</p></div>`;
      li.onclick = () => {
        const [lng, lat] = f.center;
        map.flyTo({ center: [lng, lat], zoom: 14 });
        new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map).setPopup(new mapboxgl.Popup().setText(f.place_name)).togglePopup();
      };
      listEl.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
});

// === BOTONES ===
document.getElementById('btn-fit').onclick = () => {
  const bounds = new mapboxgl.LngLatBounds();
  POIS.forEach(p => bounds.extend(p.coords));
  map.fitBounds(bounds, { padding: 80 });
};

document.getElementById('locate').onclick = () => {
  navigator.geolocation?.getCurrentPosition(pos => {
    const coords = [pos.coords.longitude, pos.coords.latitude];
    map.flyTo({ center: coords, zoom: 14 });
    new mapboxgl.Marker({ color: '#ff7b00' }).setLngLat(coords).addTo(map);
  });
};

document.getElementById('style-select').onchange = e =>
  map.setStyle('mapbox://styles/' + e.target.value);

document.getElementById('btn-toggle-sidebar').onclick = () => {
  const sb = document.getElementById('sidebar');
  sb.style.display = sb.style.display === 'none' ? 'flex' : 'none';
};

// === AGREGAR MARCADORES ===
const addBtn = document.createElement('button');
addBtn.textContent = '🖊️ Agregar marcador';
addBtn.className = 'chip';
addBtn.style.position = 'absolute';
addBtn.style.top = '10px';
addBtn.style.right = '10px';
addBtn.style.zIndex = 999;
document.body.appendChild(addBtn);

addBtn.onclick = () => {
  addMode = !addMode;
  addBtn.style.background = addMode ? '#4ade80' : '';
  addBtn.textContent = addMode ? '🖊️ Click en el mapa...' : '🖊️ Agregar marcador';
};

map.on('click', e => {
  if (!addMode) return;
  const title = prompt('Título del marcador:', 'Nuevo lugar');
  if (!title) return;
  const desc = prompt('Descripción:', '');
  const poi = {
    id: 'user_' + Date.now(),
    title,
    desc,
    category: 'user',
    coords: [e.lngLat.lng, e.lngLat.lat],
  };
  POIS.push(poi);
  savePOIs();
  renderMarkers();
  addMode = false;
  addBtn.style.background = '';
  addBtn.textContent = '🖊️ Agregar marcador';
});

// === EDITAR Y ELIMINAR ===
window.editPOI = id => {
  const poi = POIS.find(p => p.id === id);
  if (!poi) return;
  editingId = id;
  mTitle.value = poi.title;
  mDesc.value = poi.desc;
  modal.classList.add('open');
};

window.deletePOI = id => {
  if (!confirm('¿Eliminar marcador?')) return;
  POIS = POIS.filter(p => p.id !== id);
  savePOIs();
  renderMarkers();
};

mCancel.onclick = () => modal.classList.remove('open');

mSave.onclick = () => {
  const idx = POIS.findIndex(p => p.id === editingId);
  if (idx === -1) return;
  POIS[idx].title = mTitle.value;
  POIS[idx].desc = mDesc.value;
  savePOIs();
  renderMarkers();
  modal.classList.remove('open');
};

// === EXPORTAR / IMPORTAR ===
document.getElementById('btn-export').onclick = () => {
  const blob = new Blob([JSON.stringify(POIS, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mis_pois.json';
  a.click();
  URL.revokeObjectURL(url);
};

document.getElementById('btn-import').onclick = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data)) {
          POIS = data;
          savePOIs();
          renderMarkers();
          alert('Importado correctamente');
        }
      } catch {
        alert('Archivo inválido');
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

// === INICIO ===
map.on('load', () => {
  loadSaved();
  renderMarkers();
});

// === CONFIG ===
  mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94ZGllZ28wMTYiLCJhIjoiY21nNXJteXF2MDg2ZjJqcTRhaXRnbXM4ZyJ9.fQ-ZdM9lekGoKReBp5x40Q';

  const DEFAULT_POIS = [
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

  const ICONS = { viewpoint: '⛰️', plaza: '🏛️', museum: '🏺', church: '⛪', park: '🌳', garden: '🌿', neighborhood: '🏘️' };

  // Estado
  let POIS = [];
  let markers = []; // {id, marker, popup, poi}
  let activeFilters = new Set();
  let addMarkerMode = false;
  let measureMode = false;
  let measurePoints = [];
  let routeLayerId = 'route-line';

  // DOM refs
  const listEl = document.getElementById('poi-list');
  const searchInput = document.getElementById('poi-search');
  const filtersEl = document.getElementById('filters');
  const modal = document.getElementById('modal');
  const mTitle = document.getElementById('m-title');
  const mDesc = document.getElementById('m-desc');
  const mSave = document.getElementById('m-save');
  const mCancel = document.getElementById('m-cancel');

  // === MAP ===
  const map = new mapboxgl.Map({ container: 'map', style: 'mapbox://styles/mapbox/streets-v12', center: [-74.0721,4.7110], zoom:12 });
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  // restore POIs from localStorage if any
  // Carga los POIs guardados desde localStorage.
  // - Intenta leer la clave 'my_pois_v1' y parsearla como JSON.
  // - Si existe y es válido, asigna el contenido a la variable global POIS.
  // - Si no existe o hay un error de parseo, restaura la lista por defecto (DEFAULT_POIS).
  // Esto permite persistir marcadores entre sesiones del navegador.
  function loadSavedPOIs(){
    try{
      const raw = localStorage.getItem('my_pois_v1');
      if(raw) POIS = JSON.parse(raw);
      else POIS = DEFAULT_POIS.slice();
    }catch(e){ POIS = DEFAULT_POIS.slice(); }
  }

  // Guarda el arreglo global POIS en localStorage bajo la clave 'my_pois_v1'.
  // Se utiliza JSON.stringify para serializar los objetos antes de almacenarlos.
  function savePOIs(){ localStorage.setItem('my_pois_v1', JSON.stringify(POIS)); }

  // Marker creation with edit/delete actions
  // Crea un marcador (Marker) y su Popup asociado para un POI dado.
  // - Construye el elemento DOM del marcador (ícono según categoría).
  // - Crea un popup con título, descripción y botones de acción: Ruta, Editar y Eliminar.
  // - Añade el marker al mapa y lo hace arrastrable (draggable).
  // - Al terminar de arrastrar, actualiza las coordenadas del POI en POIS y persiste los cambios.
  // Devuelve un objeto con { id, marker, popup, poi } para almacenarlo en la lista de marcadores.
  function createMarker(poi){
    const el = document.createElement('div'); el.className = 'marker-mini'; el.textContent = ICONS[poi.category] || '📍';

    // Contenido del popup con título y descripción
    const popupNode = document.createElement('div');
    popupNode.innerHTML = `<strong>${poi.title}</strong><p class="muted">${poi.desc || ''}</p>`;
    const actions = document.createElement('div'); actions.style.marginTop='8px';

    // Botón para calcular y mostrar la ruta hasta este POI
    const btnRoute = document.createElement('button'); btnRoute.textContent='Ruta'; btnRoute.className='chip'; btnRoute.style.marginRight='6px';
    btnRoute.addEventListener('click', ()=> routeTo(poi.coords));

    // Botón para abrir el modal de edición
    const btnEdit = document.createElement('button'); btnEdit.textContent='Editar'; btnEdit.className='chip'; btnEdit.style.marginRight='6px';
    btnEdit.addEventListener('click', ()=> openEditModal(poi.id));

    // Botón para eliminar el POI (pide confirmación)
    const btnDelete = document.createElement('button'); btnDelete.textContent='Eliminar'; btnDelete.className='chip';
    btnDelete.addEventListener('click', ()=>{
      if(!confirm('Eliminar marcador?')) return; removePOI(poi.id);
    });

    actions.appendChild(btnRoute); actions.appendChild(btnEdit); actions.appendChild(btnDelete);
    popupNode.appendChild(actions);

    const popup = new mapboxgl.Popup({ offset:14 }).setDOMContent(popupNode);
    const marker = new mapboxgl.Marker({ element:el, anchor:'bottom', draggable:true })
      .setLngLat(poi.coords)
      .setPopup(popup)
      .addTo(map);

    // Al soltar el marker arrastrado, actualizar las coordenadas en POIS y guardar
    marker.on('dragend', ()=>{
      const lngLat = marker.getLngLat();
      const idx = POIS.findIndex(x=>x.id===poi.id);
      if(idx>-1){ POIS[idx].coords = [lngLat.lng, lngLat.lat]; savePOIs(); }
    });

    return { id: poi.id, marker, popup, poi };
  }

  // Elimina todos los marcadores actualmente visibles y vuelve a crearlos
  // a partir del arreglo POIS. También actualiza la lista lateral llamando
  // a renderPOIList.
  function loadPOIsOnMap(){
    // remove existing
    markers.forEach(m=>m.marker.remove()); markers = [];
    POIS.forEach(p=> markers.push(createMarker(p)));
    renderPOIList(POIS);
  }

  // Renderiza la lista lateral de POIs.
  // - Filtra por activeFilters si hay filtros activos.
  // - Por cada POI crea un elemento con icono, título, descripción y botones 'Ir' e 'Info'.
  // - Los botones están enlazados por delegación de eventos en listEl.
  function renderPOIList(items){
    listEl.innerHTML='';
    items.forEach(item=>{
      if(activeFilters.size && !activeFilters.has(item.category)) return;
      const li = document.createElement('li'); li.className='poi-item';
      li.innerHTML = `\n        <div class="marker-mini">${ICONS[item.category]||'📍'}</div>\n        <div class="poi-info"><h4>${item.title}</h4><p>${item.desc||''}</p></div>\n        <div class="poi-actions">\n          <button data-id="${item.id}" class="btn-go">Ir</button>\n          <button data-id="${item.id}" class="btn-info ghost">Info</button>\n        </div>`;
      listEl.appendChild(li);
    });
  }

  // Delegación de eventos para los botones dentro de la lista lateral:
  // - 'Ir' centra el mapa en el POI correspondiente.
  // - 'Info' abre el popup del marcador correspondiente.
  listEl.addEventListener('click', (e)=>{
    if(e.target.classList.contains('btn-go')) flyToPOI(e.target.dataset.id);
    if(e.target.classList.contains('btn-info')) markers.find(x=>x.id===e.target.dataset.id)?.popup.addTo(map);
  });

  // Centra el mapa en el POI identificado por 'id' y abre su popup.
  // Utiliza map.flyTo para una transición suave y fija un zoom cercano.
  function flyToPOI(id){ const m = markers.find(x=>x.id===id); if(!m) return; map.flyTo({ center:m.poi.coords, zoom:15, speed:0.9 }); m.popup.addTo(map); }

  // Filters UI
  // Genera la UI de filtros a partir de las categorías únicas presentes en POIS.
  // Al hacer click en un chip se alterna el filtro correspondiente en el Set activeFilters
  // y se vuelve a renderizar la lista lateral.
  function renderFilters(){
    const cats = Array.from(new Set(POIS.map(p=>p.category)));
    filtersEl.innerHTML='';
    cats.forEach(cat=>{
      const btn = document.createElement('button'); btn.className='chip'; btn.textContent = `${ICONS[cat]||'📍'} ${cat}`;
      btn.addEventListener('click', ()=>{
        if(activeFilters.has(cat)){ activeFilters.delete(cat); btn.classList.remove('active'); }
        else{ activeFilters.add(cat); btn.classList.add('active'); }
        renderPOIList(POIS);
      });
      filtersEl.appendChild(btn);
    });
  }

  // Buscador (geocoding simple + autocompletado)
  let searchTimeout;
  // Control del input de búsqueda con debounce y llamada al servicio de Geocoding de Mapbox.
  // - Al escribir espera 300ms (debounce) y solicita resultados limitados cerca del centro del mapa.
  // - Mapea cada resultado a un elemento en la lista; al pulsarlo centra el mapa y coloca un marcador temporal.
  searchInput.addEventListener('input',(e)=>{
    const q = e.target.value.trim(); if(!q) { renderPOIList(POIS); return; }
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async ()=>{
      try{
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${mapboxgl.accessToken}&limit=6&proximity=${map.getCenter().lng},${map.getCenter().lat}`;
        const res = await fetch(url); const data = await res.json();
        listEl.innerHTML='';
        data.features.forEach(f=>{
          const [lng,lat] = f.center; const li = document.createElement('li'); li.className='poi-item';
          li.innerHTML = `\n            <div class="marker-mini">📍</div>\n            <div class="poi-info"><h4>${f.text}</h4><p>${f.place_name}</p></div>`;
          li.addEventListener('click', ()=>{
            map.flyTo({ center:[lng,lat], zoom:14 });
            new mapboxgl.Marker().setLngLat([lng,lat]).addTo(map).setPopup(new mapboxgl.Popup().setHTML(`<strong>${f.text}</strong><p>${f.place_name}</p>`)).togglePopup();
          });
          listEl.appendChild(li);
        });
      }catch(err){ console.error('buscar',err);}    
    },300);
  });

  // Fit all button
  document.getElementById('btn-fit').addEventListener('click', ()=>{
    const locs = POIS.map(p=>p.coords);
    const bounds = locs.reduce((b,c)=>b.extend(c), new mapboxgl.LngLatBounds(locs[0], locs[0]));
    map.fitBounds(bounds, { padding: 80 });
  });

  // Geolocate
  document.getElementById('locate').addEventListener('click', ()=>{
    // Solicita la posición del usuario y coloca un marcador (si se obtiene).
    if(!navigator.geolocation) return alert('Geolocalización no soportada.');
    navigator.geolocation.getCurrentPosition(pos=>{
      const userCoords = [pos.coords.longitude, pos.coords.latitude];
      if(window._userMarker) window._userMarker.remove();
      window._userMarker = new mapboxgl.Marker({ color:'#ff7b00' }).setLngLat(userCoords).addTo(map);
      map.flyTo({ center:userCoords, zoom:14 });
    });
  });

  // Style select
  document.getElementById('style-select').addEventListener('change', e=> map.setStyle('mapbox://styles/'+e.target.value));

  // Sidebar toggle
  document.getElementById('btn-toggle-sidebar').addEventListener('click', ()=>{
    const sb = document.getElementById('sidebar'); sb.style.display = (sb.style.display==='none') ? 'flex' : 'none';
  });

  // Agregar marcador manual (click)
  const addBtn = document.createElement('button'); addBtn.textContent='🖊️ Agregar marcador'; addBtn.style.position='absolute'; addBtn.style.top='10px'; addBtn.style.right='10px'; addBtn.style.zIndex='999'; document.body.appendChild(addBtn);
  addBtn.addEventListener('click', ()=>{ addMarkerMode = !addMarkerMode; addBtn.style.background = addMarkerMode ? '#4ade80' : ''; addBtn.textContent = addMarkerMode ? '🖊️ Click en el mapa...' : '🖊️ Agregar marcador'; });

  // Click sobre el mapa:
  // - Si está en modo de medición (measureMode), añade un punto y redibuja la línea de medida.
  // - Si está en modo 'agregar marcador' (addMarkerMode), solicita título/descripcion y crea un nuevo POI.
  map.on('click', (e)=>{
    if(measureMode){
      measurePoints.push([e.lngLat.lng, e.lngLat.lat]); drawMeasure(); return;
    }
    if(!addMarkerMode) return;
    const coords = [e.lngLat.lng, e.lngLat.lat];
    const id = 'user_' + Date.now();
    const title = prompt('Título del marcador','Marcador nuevo') || 'Marcador nuevo';
    const desc = prompt('Descripción','') || '';
    const newPoi = { id, title, category:'user', coords, desc };
    POIS.push(newPoi); savePOIs(); loadPOIsOnMap(); addMarkerMode=false; addBtn.textContent='🖊️ Agregar marcador'; addBtn.style.background='';
  });

  // Elimina un POI por su id: actualiza POIS, persiste y recarga los marcadores en el mapa.
  function removePOI(id){ POIS = POIS.filter(p=>p.id!==id); savePOIs(); loadPOIsOnMap(); }

  // Modal de edición:
  // - openEditModal(id): abre el modal y carga los datos del POI seleccionado en los campos.
  // - mCancel: cierra el modal sin guardar.
  // - mSave: guarda los cambios en POIS, persiste y recarga la vista.
  let editingId = null;
  function openEditModal(id){ editingId = id; const poi = POIS.find(p=>p.id===id); if(!poi) return; mTitle.value = poi.title; mDesc.value = poi.desc||''; modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); }
  mCancel.addEventListener('click', ()=>{ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); editingId=null; });
  mSave.addEventListener('click', ()=>{
    if(!editingId) return; const idx = POIS.findIndex(p=>p.id===editingId); if(idx===-1) return; POIS[idx].title = mTitle.value; POIS[idx].desc = mDesc.value; savePOIs(); loadPOIsOnMap(); modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); editingId=null;
  });

  // Exporta e importa marcadores como archivo JSON.
  // - Export: descarga un archivo llamado 'mis_pois.json' con el contenido de POIS.
  // - Import: permite seleccionar un archivo JSON, valida que sea un arreglo y lo carga como POIS.
  document.getElementById('btn-export').addEventListener('click', ()=>{
    const data = JSON.stringify(POIS, null, 2); const blob = new Blob([data],{type:'application/json'}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='mis_pois.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
  document.getElementById('btn-import').addEventListener('click', ()=>{
    const input = document.createElement('input'); input.type='file'; input.accept='application/json'; input.onchange = ()=>{
      const f = input.files[0]; if(!f) return; const reader = new FileReader(); reader.onload = ()=>{ try{ const arr = JSON.parse(reader.result); if(Array.isArray(arr)){ POIS = arr; savePOIs(); loadPOIsOnMap(); renderFilters(); alert('Importado correctamente'); }else alert('Archivo inválido'); }catch(e){ alert('Error al leer archivo'); } }; reader.readAsText(f);
    }; input.click();
  });

  // Compartir la vista actual del mapa: construye una URL con parámetros lng/lat/z y la copia al portapapeles.
  document.getElementById('btn-share').addEventListener('click', ()=>{
    const c = map.getCenter(); const z = map.getZoom(); const url = `${location.origin}${location.pathname}?lng=${c.lng.toFixed(5)}&lat=${c.lat.toFixed(5)}&z=${z.toFixed(2)}`;
    navigator.clipboard?.writeText(url).then(()=> alert('Enlace copiado al portapapeles'), ()=> prompt('Copia manualmente:',url));
  });

  // Analiza parámetros de la URL (?lng=&lat=&z=) y ajusta la vista inicial del mapa si están presentes.
  function parseURLView(){ const params = new URLSearchParams(location.search); const lng = parseFloat(params.get('lng')); const lat = parseFloat(params.get('lat')); const z = parseFloat(params.get('z')); if(!isNaN(lng)&&!isNaN(lat)) map.setCenter([lng,lat]); if(!isNaN(z)) map.setZoom(z);
  }

  // Herramienta de medición: permite añadir puntos en el mapa y mostrar la distancia acumulada.
  document.getElementById('btn-measure').addEventListener('click', ()=>{
    measureMode = !measureMode; measurePoints = []; document.getElementById('btn-measure').classList.toggle('active', measureMode);
    if(!measureMode) { removeMeasure(); }
  });
  function drawMeasure(){ removeMeasure(); if(measurePoints.length<1) return; const id='measure-line'; map.addSource(id,{ type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates:measurePoints }}});
    map.addLayer({ id:id, type:'line', source:id, paint:{ 'line-width':3, 'line-color':'#ff7b00' }});
    // añade una etiqueta con la distancia total (km) en el último punto
    const dist = turfLength(measurePoints); const last = measurePoints[measurePoints.length-1]; const el = document.createElement('div'); el.className='marker-mini'; el.textContent = dist + ' km'; const m = new mapboxgl.Marker({ element:el, anchor:'bottom' }).setLngLat(last).addTo(map); m._measure = true; // flag
  }
  function removeMeasure(){ try{ if(map.getLayer('measure-line')) map.removeLayer('measure-line'); if(map.getSource('measure-line')) map.removeSource('measure-line'); }catch(e){} // remove measure markers
    document.querySelectorAll('.mapboxgl-marker').forEach(n=>{ if(n._measure) n.remove(); });
  }

  // Calcula la longitud acumulada de una línea definida por coordenadas (km).
  // Implementación simple que suma distancias entre pares contiguos usando la fórmula de Haversine.
  function turfLength(coords){ if(coords.length<2) return '0.00'; let total=0; for(let i=1;i<coords.length;i++){ total += haversine(coords[i-1], coords[i]); } return total.toFixed(2); }
  // Haversine: distancia entre dos puntos geográficos en kilómetros.
  function haversine(a,b){ const R=6371; const toR = Math.PI/180; const dlat=(b[1]-a[1])*toR; const dlng=(b[0]-a[0])*toR; const lat1=a[1]*toR; const lat2=b[1]*toR; const sinDlat=Math.sin(dlat/2); const sinDlng=Math.sin(dlng/2); const h = sinDlat*sinDlat + Math.cos(lat1)*Math.cos(lat2)*sinDlng*sinDlng; return 2*R*Math.asin(Math.sqrt(h)); }

  // Calcula y dibuja una ruta desde la ubicación actual del usuario hasta destCoords
  // usando la API de Directions de Mapbox (aquí configurada con 'driving').
  // - Requiere permiso de geolocalización.
  // - Dibuja la línea de ruta en el mapa y ajusta los bounds para que sea visible.
  async function routeTo(destCoords){ if(!navigator.geolocation) return alert('Activa geolocalización para rutas'); navigator.geolocation.getCurrentPosition(async pos=>{
    const start = [pos.coords.longitude, pos.coords.latitude]; const end = destCoords;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;
    try{ const res = await fetch(url); const data = await res.json(); if(!data.routes||!data.routes.length) return alert('No route found'); const geom = data.routes[0].geometry; // draw
      if(map.getLayer(routeLayerId)) map.removeLayer(routeLayerId); if(map.getSource(routeLayerId)) map.removeSource(routeLayerId);
      map.addSource(routeLayerId,{ type:'geojson', data:{ type:'Feature', geometry: geom }});
      map.addLayer({ id:routeLayerId, type:'line', source:routeLayerId, paint:{ 'line-width':6, 'line-color':'#3b82f6' }});
      map.fitBounds(geom.coordinates.reduce((b,c)=>b.extend(c), new mapboxgl.LngLatBounds(geom.coordinates[0], geom.coordinates[0])),{ padding:60 });
    }catch(e){ console.error(e); alert('Error al calcular ruta'); }
  }, ()=>alert('No se obtuvo ubicación'));
  }

  // Helpers pequeños
  // generateId: genera un id a partir del título (sanitizado) y un sufijo con timestamp
  function generateId(title){ return title.toLowerCase().replace(/[^a-z0-9]+/g,'_')+'_'+Date.now(); }

  // Export current markers as geojson?

  // Keyboard shortcuts
  window.addEventListener('keydown',(e)=>{
    if(e.key === '/') { e.preventDefault(); searchInput.focus(); }
    if(e.key === 'f') { document.getElementById('btn-fit').click(); }
  });

  // init
  map.on('load', ()=>{
    // Inicialización principal: cargar POIs, parsear URL, renderizar marcadores y filtros.
    loadSavedPOIs(); parseURLView(); loadPOIsOnMap(); renderFilters();
    // Ajusta bounds iniciales al conjunto de POIs si es posible
    try{ const locs = POIS.map(p=>p.coords); const bounds = locs.reduce((b,p)=>b.extend(p), new mapboxgl.LngLatBounds(locs[0], locs[0])); map.fitBounds(bounds, { padding:80 }); }catch(e){}
  });

  // Save on unload
  window.addEventListener('beforeunload', ()=> savePOIs());

  // small polyfill: ensure mapboxgl.Popup().setDOMContent exists in this environment - it does.

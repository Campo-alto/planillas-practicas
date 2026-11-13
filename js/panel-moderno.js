/* ============================= PANEL DEL ADMINISTRADOR · DISEÑO MODERNO (Campoalto) =============================
   Capa visual sobre el panel que ya existe (panel-admin.js + guia.js): no cambia ninguna función ni permiso.
   · Barra lateral con las secciones que tu rol puede usar (con el número de pendientes de cada una) y «Ayuda».
   · «Acciones prioritarias»: resume los pendientes en Urgente / En proceso / Al día (salen de «Pendientes por proceso»).
   · Catálogo de funciones con buscador (Ctrl+K o ⌘K) y secciones que muestran 4 tarjetas con «Ver más».
   Se carga DESPUÉS de panel-admin.js y guia.js, junto con panel-moderno.css. Si falta alguno de los dos, el panel se ve como antes. */
(function(){
  if(typeof showScreen !== 'function') return;
  const SIN_BARRA = ['screen-home', 'screen-admin-login', 'screen-reset-password'];
  const e = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const SVG = d => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
  const IC = {
    dash: SVG('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>'),
    estudiantes: SVG('<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.2c2.4.2 4 1.7 4.5 4.3"/>'),
    empresas: SVG('<path d="M4 20V5.5L13 3v17"/><path d="M13 9h7v11"/><path d="M7.5 8.5h2M7.5 12h2M7.5 15.5h2M16 13h1M16 16.5h1"/><path d="M3 20h18"/>'),
    supervisores: SVG('<path d="M3.5 4v16h17"/><path d="M7 15l3.6-4 3 2.8L20 7"/>'),
    practica: SVG('<circle cx="12" cy="12" r="3.1"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>'),
    seguridad: SVG('<path d="M12 3 4.5 6v5.5c0 4.4 3 7.6 7.5 9.5 4.5-1.9 7.5-5.1 7.5-9.5V6L12 3Z"/><path d="m9 12 2.2 2.2L15.5 10"/>'),
    informes: SVG('<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>'),
    comunicacion: SVG('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6.5L20.5 7"/>'),
    chat: SVG('<path d="M4 5.5h16v10.5H9.5L5.5 20v-4H4Z"/><path d="M8 9.5h8M8 12.5h5"/>'),
    ayuda: SVG('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.9"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>')
  };
  const ICO_URG = SVG('<circle cx="12" cy="12" r="9.5"/><path d="M12 7v6"/><circle cx="12" cy="16.6" r=".7" fill="#fff"/>');
  const ICO_PRO = SVG('<circle cx="12" cy="12" r="9.5"/><path d="m10 8.5 5 3.5-5 3.5Z" fill="#fff"/>');
  const ICO_OK = SVG('<circle cx="12" cy="12" r="9.5"/><path d="m7.8 12.3 3 3 5.6-6"/>');
  const ESTRELLA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2 6.3 20.3l1.2-6.4L2.8 9.5l6.4-.8L12 2.8Z"/></svg>';
  const LUPA = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>';

  // Qué pendientes son urgentes (la institución los tiene detenidos) y cuáles son de seguimiento
  const URGENTES = ['Solicitudes de acceso', 'Solicitudes de práctica', 'Inscripciones por verificar', 'Empresas por aprobar', 'Solicitudes de aprendices por aprobar',
                    'Aprendices por confirmar', 'Cartas de fechas por definir', 'Cartas de convenio por enviar', 'Estudiantes por formalizar'];
  const EMOJI = { 'Solicitudes de acceso':'📨', 'Solicitudes de práctica':'📂', 'Inscripciones por verificar':'🧾', 'Empresas por aprobar':'🏢', 'Solicitudes de aprendices por aprobar':'📝',
                  'Aprendices por confirmar':'🤝', 'Cartas de fechas por definir':'📅', 'Cartas de convenio por enviar':'✉️', 'Estudiantes por formalizar':'🎓',
                  'Notas por subir al sistema':'📤', 'Empresas por confirmar':'✅', 'Estudiantes esperando supervisor':'🧭', 'Cambios de empresa':'🔄', 'Inasistencias por revisar':'🩺' };
  const expandidas = new Set();
  let activo = 'dash', chips = [], vista = null;   // vista = sección abierta por separado desde la barra lateral (null = panel completo)

  const enHub = () => { const h = document.getElementById('screen-admin-hub'); return !!(h && h.classList.contains('active')); };
  const valorBusca = () => String((document.getElementById('pmBuscar') || {}).value || '').trim();
  const hayBuscador = () => !!valorBusca();

  /* ---------- Barra lateral ---------- */
  function crearBarra(){
    if(document.getElementById('pmSide')) return;
    const logo = document.querySelector('.brand-logo');
    const n = document.createElement('nav'); n.id = 'pmSide'; n.setAttribute('aria-label', 'Secciones del panel');
    n.innerHTML = '<div class="pm-logo">' + (logo ? '<img src="' + e(logo.getAttribute('src')) + '" alt="Campoalto" width="150" height="39">' : '<b>Campoalto</b>') + '</div>' +
      '<div class="pm-logo-sub">Educación para el Trabajo y el Desarrollo Humano</div>' +
      '<div class="pm-user"><div class="pm-av" id="pmAv">A</div><div><div class="pm-un" id="pmUn">Administrador</div><div class="pm-ue"><span class="pm-on"></span>En línea</div></div></div>' +
      '<div class="pm-nav" id="pmNav"></div><div class="pm-fill"></div>' +
      '<button type="button" class="pm-it" onclick="pmAyuda()">' + IC.ayuda + '<span class="t">Ayuda</span></button><div class="pm-pie">Planillas de prácticas · PPS-GAA-F-006</div>';
    document.body.appendChild(n);
  }
  function sumaSeccion(sec){
    let s = 0; sec.querySelectorAll('.fn-badge .sa-badge').forEach(b=>{ s += Number(String(b.textContent).replace(/\D/g, '')) || 0; }); return s;
  }
  function pintarBarra(){
    crearBarra();
    const nav = document.getElementById('pmNav'); if(!nav) return;
    const grupos = (typeof window.pgGrupos === 'function' ? window.pgGrupos() : []).filter(g=>document.getElementById('grupoSec-' + g.id));
    const total = chips.reduce((a, c)=>a + c.n, 0);
    const it = (id, ico, txt, num) => '<button type="button" class="pm-it' + (activo === id ? ' act' : '') + '" onclick="pmIr(\'' + id + '\')"' + (activo === id ? ' aria-current="page"' : '') + '>' + ico + '<span class="t">' + e(txt) + '</span>' + (num ? '<span class="pm-n" title="Pendientes">' + num + '</span>' : '') + '</button>';
    const chat = (typeof window.chatPuede === 'function' && window.chatPuede())
      ? '<button type="button" class="pm-it" onclick="abrirChat()">' + IC.chat + '<span class="t">Mensajes</span><span class="pm-n" id="pmChatN" style="' + (window.chatNoLeidos ? '' : 'display:none') + '" title="Mensajes sin leer">' + (window.chatNoLeidos > 99 ? '99+' : (window.chatNoLeidos || 0)) + '</span></button>' : '';
    nav.innerHTML = it('dash', IC.dash, 'Panel', total) + grupos.map(g=>it(g.id, IC[g.id] || IC.practica, g.titulo, sumaSeccion(document.getElementById('grupoSec-' + g.id)))).join('') + chat;
    // nombre de quien entró
    try{
      const rol = (typeof ROL_NOMBRES !== 'undefined' && typeof permAdmin !== 'undefined' && permAdmin.rol) ? ROL_NOMBRES[permAdmin.rol] : 'Administrador';
      const un = document.getElementById('pmUn'); if(un) un.textContent = rol || 'Administrador';
      if(typeof sb !== 'undefined' && sb && sb.auth && !pintarBarra.mail){
        pintarBarra.mail = 1;
        sb.auth.getSession().then(r=>{ const m = r && r.data && r.data.session && r.data.session.user && r.data.session.user.email; if(m){ const av = document.getElementById('pmAv'); if(av) av.textContent = m.charAt(0).toUpperCase(); const un2 = document.getElementById('pmUn'); if(un2) un2.title = m; } }).catch(()=>{});
      }
    }catch(_){}
  }
  window.pmIr = function(id){
    activo = id; vista = id === 'dash' ? null : id;
    const bi = document.getElementById('pmBuscar'); if(bi && bi.value){ bi.value = ''; if(typeof pgFiltrar === 'function') pgFiltrar(''); document.body.classList.remove('pm-buscando'); }
    const ir = () => { aplicarVista(); window.scrollTo({ top:0, behavior:'smooth' }); pintarBarra(); };
    if(!enHub()){ showScreen('screen-admin-hub'); setTimeout(ir, 350); } else ir();
  };
  // Muestra SOLO las funciones de la sección elegida (o el panel completo si vista es null)
  function aplicarVista(){
    document.body.classList.toggle('pm-vista', !!vista);
    document.querySelectorAll('#grupoGrid .fn-seccion').forEach(sec=>{ sec.classList.toggle('pm-oculta', !!vista && sec.id !== 'grupoSec-' + vista); });
    const grid = document.getElementById('grupoGrid'); if(!grid) return;
    let mig = grid.querySelector('.pm-mig');
    const buscando = hayBuscador();
    document.body.classList.toggle('pm-buscando', buscando);
    let migHtml = '';
    if(vista){
      const g = (typeof window.pgGrupos === 'function' ? window.pgGrupos() : []).find(x=>x.id === vista);
      if(!g || !document.getElementById('grupoSec-' + vista)){ vista = null; activo = 'dash'; return aplicarVista(); }   // la sección ya no está disponible para este rol
      migHtml = '<button type="button" onclick="pmIr(\'dash\')">← Volver al panel</button><span>/</span><b>' + e(g.titulo) + '</b>';
    } else if(buscando){
      migHtml = '<button type="button" onclick="pmLimpiar()">← Volver al panel</button><span>/</span><b>Resultados de la búsqueda</b>';
    }
    if(migHtml){ if(!mig){ mig = document.createElement('div'); mig.className = 'pm-mig'; grid.insertBefore(mig, grid.firstChild); } if(mig.innerHTML !== migHtml) mig.innerHTML = migHtml; }
    else if(mig) mig.remove();
    pmCortas();
  }
  window.pmAyuda = function(){
    if(document.getElementById('pmAyuda')) return;
    const m = document.createElement('div'); m.id = 'pmAyuda'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="caja"><h3>¿Cómo se usa el panel?</h3><ul>' +
      '<li><b>Acciones prioritarias:</b> lo que está esperando que lo atiendas. Pulsa una fila y te lleva a esa función.</li>' +
      '<li><b>Barra lateral:</b> salta a una sección. El número rojo indica cuántos pendientes tiene.</li>' +
      '<li><b>Catálogo de funciones:</b> todas tus funciones, agrupadas. Usa «Ver más» para mostrar todas las de una sección.</li>' +
      '<li><b>Buscar:</b> escribe en el buscador o pulsa <kbd>Ctrl</kbd> + <kbd>K</kbd> (en Mac <kbd>⌘</kbd> + <kbd>K</kbd>).</li>' +
      '<li>Solo ves las funciones que tu rol tiene habilitadas.</li></ul>' +
      '<p style="font-size:13.5px;margin:0 0 14px;">¿Dudas? Escribe a <b>asistentedepracticas@campoalto.edu.co</b>.</p>' +
      '<div style="text-align:right;"><button class="primary" type="button" onclick="pmAyudaCerrar()">Entendido</button></div></div>';
    m.addEventListener('click', ev=>{ if(ev.target === m) pmAyudaCerrar(); });
    document.body.appendChild(m);
  };
  window.pmAyudaCerrar = function(){ const m = document.getElementById('pmAyuda'); if(m) m.remove(); };

  /* ---------- Acciones prioritarias ---------- */
  function leerChips(){
    return [...document.querySelectorAll('#gdPend .gd-chip')].map((b, i)=>({ i, n: Number((b.querySelector('b') || {}).textContent) || 0, t: ((b.querySelector('span') || {}).textContent || '').trim() }));
  }
  window.pmChip = function(i){ const b = document.querySelectorAll('#gdPend .gd-chip')[i]; if(b) b.click(); };
  function filaHtml(c){ return '<button type="button" class="pm-fila" onclick="pmChip(' + c.i + ')"><span class="ic">' + (EMOJI[c.t] || '📌') + '<span class="nb">' + c.n + '</span></span><span class="tx">' + e(c.t) + '</span><span class="go" aria-hidden="true">›</span></button>'; }
  function pintarResumen(){
    const hub = document.getElementById('screen-admin-hub'); if(!hub) return;
    let host = document.getElementById('pmResumen');
    if(!host){
      host = document.createElement('div'); host.id = 'pmResumen';
      const ref = document.getElementById('gdPend') || hub.querySelector('h2'); if(ref) ref.insertAdjacentElement('afterend', host); else hub.insertBefore(host, hub.firstChild);
      host.innerHTML = '<div class="pm-banner">' + ESTRELLA + '<span>Acciones prioritarias</span></div><div class="pm-cols"><div class="pm-carga">Cargando tus pendientes…</div></div>';
    }
    chips = leerChips();
    if(!document.getElementById('gdPend')) { pintarBarra(); return; }          // aún no llegaron los datos
    const urg = chips.filter(c=>c.n > 0 && URGENTES.indexOf(c.t) >= 0), pro = chips.filter(c=>c.n > 0 && URGENTES.indexOf(c.t) < 0), ok = chips.filter(c=>c.n === 0);
    const total = chips.reduce((a, c)=>a + c.n, 0);
    const vacioCol = txt => '<div class="pm-vacio"><span>' + txt + '</span></div>';
    host.innerHTML = '<div class="pm-banner">' + ESTRELLA + '<span>' + (total ? 'Tienes <b>' + total + '</b> ' + (total === 1 ? 'acción prioritaria' : 'acciones prioritarias') : 'No tienes acciones prioritarias') + '</span>' +
        '<small>Se actualiza sola cada minuto</small></div>' +
      '<div class="pm-cols">' +
      '<section class="pm-col urg" aria-label="Urgente"><h3>' + ICO_URG + '<span>Urgente <small>· Requiere acción inmediata</small></span></h3>' + (urg.length ? '<div class="pm-lista">' + urg.map(filaHtml).join('') + '</div>' : vacioCol('Nada urgente por ahora.')) + '</section>' +
      '<section class="pm-col pro" aria-label="En proceso"><h3>' + ICO_PRO + '<span>En proceso <small>· Seguimiento activo</small></span></h3>' + (pro.length ? '<div class="pm-lista">' + pro.map(filaHtml).join('') + '</div>' : vacioCol('Nada en seguimiento por ahora.')) + '</section>' +
      '<section class="pm-col ok" aria-label="Completado"><h3>' + ICO_OK + '<span>Completado <small>/ Al día</small></span></h3>' +
        '<div class="pm-vacio"><span class="chk">' + SVG('<path d="m5 12.5 4.5 4.5L19 7.5"/>') + '</span>' +
        (total ? '<b>' + ok.length + ' ' + (ok.length === 1 ? 'proceso al día' : 'procesos al día') + '</b>' + (ok.length ? '<div class="pm-aldia">' + ok.slice(0, 6).map(c=>'<span>' + e(c.t) + '</span>').join('') + '</div>' : '')
               : '<b>Sin acciones pendientes</b><span>¡Excelente trabajo!</span>') + '</div></section></div>';
    pintarBarra();
  }

  /* ---------- Catálogo ---------- */
  window.pmVerMas = function(id){ if(expandidas.has(id)) expandidas.delete(id); else expandidas.add(id); pmCortas(); };
  function pmCortas(){
    const buscando = hayBuscador();
    document.querySelectorAll('#grupoGrid .fn-seccion').forEach(sec=>{
      const id = sec.id.replace('grupoSec-', ''), n = sec.querySelectorAll('.fn-card').length;
      const larga = n > 4, abierta = expandidas.has(id) || buscando || vista === id;
      sec.classList.toggle('pm-corta', larga && !abierta);
      let b = sec.querySelector('.pm-vermas');
      if(larga && !buscando && !vista){
        if(!b){ b = document.createElement('button'); b.type = 'button'; b.className = 'pm-vermas'; b.onclick = ()=>pmVerMas(id); sec.querySelector('.fn-sec-cab').appendChild(b); }
        b.textContent = abierta ? 'Ver menos ↑' : 'Ver más (' + (n - 4) + ') →'; b.setAttribute('aria-expanded', abierta ? 'true' : 'false');
      } else if(b) b.remove();
    });
  }
  function mejorarCatalogo(){
    if(!document.getElementById('grupoGrid')) return;
    crearTop(); aplicarVista(); pintarBarra();
  }
  /* Buscador del panel (arriba): al escribir se muestran, de todo el catálogo, solo las funciones que coinciden */
  function crearTop(){
    if(document.getElementById('pmTop')) return;
    const hub = document.getElementById('screen-admin-hub'); if(!hub) return;
    const t = document.createElement('div'); t.id = 'pmTop';
    t.innerHTML = '<div class="pm-bus"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>' +
      '<input type="search" id="pmBuscar" placeholder="Busca una función… (ej. correo, empresa, notas)" autocomplete="off" aria-label="Buscar una función" oninput="pmBuscar(this.value)">' +
      '<span class="pm-kbd" aria-hidden="true">' + (/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? '⌘ K' : 'Ctrl K') + '</span></div>';
    const h2 = hub.querySelector('h2'); if(h2) h2.insertAdjacentElement('afterend', t); else hub.insertBefore(t, hub.firstChild);
  }
  window.pmBuscar = function(v){
    if(vista){ vista = null; activo = 'dash'; }
    if(typeof pgFiltrar === 'function') pgFiltrar(v);
    aplicarVista(); pintarBarra(); pmCortas();
  };
  window.pmLimpiar = function(){ const i = document.getElementById('pmBuscar'); if(i) i.value = ''; pmBuscar(''); };

  /* ---------- Campana de notificaciones (🔔): la misma de siempre, ahora arriba a la derecha ---------- */
  function crearCampana(){
    if(document.getElementById('pmCampana')) return;
    const top = document.querySelector('.topbar'); if(!top) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'pmCampana'; b.setAttribute('aria-label', 'Notificaciones');
    b.innerHTML = SVG('<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.6 2H4.4Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>') + '<span class="pm-cn" style="display:none"></span>';
    b.onclick = () => { if(typeof ntAbrir === 'function') ntAbrir(); };
    top.appendChild(b);
  }
  function espejoCampana(){
    crearCampana();
    const b = document.getElementById('pmCampana'); if(!b) return;
    const f = document.getElementById('ntBell');                       // la campana original (queda oculta en este diseño)
    const visible = !!f && f.style.display !== 'none';
    b.classList.toggle('on', visible);
    const sp = f && f.querySelector('span'), n = sp ? String(sp.textContent).trim() : '';
    const c = b.querySelector('.pm-cn'); if(c){ c.textContent = n; c.style.display = n ? '' : 'none'; }
    b.setAttribute('aria-label', n ? 'Notificaciones: ' + n + ' sin leer' : 'Notificaciones');
  }
  if(typeof ntPintarBell === 'function'){ const _n = ntPintarBell; ntPintarBell = function(){ const r = _n.apply(this, arguments); try{ espejoCampana(); }catch(_){} return r; }; }
  setInterval(espejoCampana, 2000);
  // El panel vuelve a pintar las tarjetas cada vez que se muestra o llegan los permisos: se reaplica el diseño
  (function(){
    const g = document.getElementById('grupoGrid'); if(!g || typeof MutationObserver === 'undefined') return;
    new MutationObserver(()=>{ mejorarCatalogo(); }).observe(g, { childList:true });
  })();
  if(typeof window.pgFiltrar === 'function'){ const _f = window.pgFiltrar; window.pgFiltrar = function(){ if(vista && hayBuscador()){ vista = null; activo = 'dash'; aplicarVista(); pintarBarra(); } const r = _f.apply(this, arguments); pmCortas(); return r; }; }
  document.addEventListener('keydown', ev=>{
    if((ev.ctrlKey || ev.metaKey) && String(ev.key).toLowerCase() === 'k' && enHub()){ const i = document.getElementById('pmBuscar'); if(i){ ev.preventDefault(); window.scrollTo({ top:0, behavior:'smooth' }); i.focus(); i.select(); } }
    if(ev.key === 'Escape') pmAyudaCerrar();
  });

  /* ---------- Enganche con el panel existente ---------- */
  const _show = showScreen;
  showScreen = function(id){
    const r = _show.apply(this, arguments);
    const conBarra = SIN_BARRA.indexOf(id) < 0 && !!document.getElementById(id);
    document.body.classList.toggle('pm-side', conBarra);
    document.body.classList.toggle('pm-on', id === 'screen-admin-hub');
    if(SIN_BARRA.indexOf(id) >= 0){ vista = null; activo = 'dash'; }
    if(conBarra){ if(id !== 'screen-admin-hub') activo = ''; else activo = vista || 'dash'; pintarBarra(); }
    if(id === 'screen-admin-hub'){ pintarResumen(); mejorarCatalogo(); }
    return r;
  };
  if(typeof gdPendientes === 'function'){
    const _g = gdPendientes;
    gdPendientes = async function(){ const r = await _g.apply(this, arguments); try{ pintarResumen(); }catch(err){ console.error(err); } return r; };
  }
  // si el panel ya estaba abierto al cargar este archivo
  try{ const h = document.getElementById('screen-admin-hub'); if(h && h.classList.contains('active')) showScreen('screen-admin-hub'); }catch(_){}
})();

/* ---- Respaldo de estilos: si panel-moderno-todo.css no cargó (archivo no subido o en otra carpeta), el diseño se inyecta desde aquí ---- */
(function(){ try{ if(getComputedStyle(document.documentElement).getPropertyValue('--pm-w').trim()) return; const st = document.createElement('style'); st.id = 'pmRespaldoCss'; st.textContent = "/* ============================= PANEL DEL ADMINISTRADOR \u00b7 DISE\u00d1O MODERNO (Campoalto) =============================\n   Se carga DESPU\u00c9S de styles.css. Solo cambia la apariencia: barra lateral, resumen de acciones prioritarias y cat\u00e1logo de funciones.\n   Si este archivo no est\u00e1, el panel se ve como antes. */\n:root{\n  --pm-side:#0B3D3D; --pm-side2:#0A5A62; --pm-w:248px;\n  --pm-urg1:#B23A2E; --pm-urg2:#D24E3E; --pm-pro1:#C25A17; --pm-pro2:#D96F25; --pm-ok1:#1B7F55; --pm-ok2:#2A9A6B;\n}\n\n/* ---------- Barra lateral ---------- */\n#pmSide{display:none;}\nbody.pm-side #pmSide{\n  display:flex; flex-direction:column; gap:6px; position:fixed; z-index:40; left:0; top:0; bottom:0; width:var(--pm-w); padding:16px 12px 14px;\n  background:linear-gradient(190deg,var(--pm-side) 0%,#0A4A50 55%,var(--pm-side2) 100%); color:#fff; overflow-y:auto;\n  box-shadow:4px 0 18px rgba(11,61,61,.18);\n}\n#pmSide .pm-logo{background:#fff;border-radius:12px;padding:10px 12px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;}\n#pmSide .pm-logo img{max-width:100%;height:auto;display:block;}\n#pmSide .pm-logo-sub{font-size:10.5px;line-height:1.25;text-align:center;color:#cfe3e3;margin:2px 4px 10px;}\n#pmSide .pm-user{display:flex;gap:10px;align-items:center;padding:10px 8px;margin:0 0 8px;border-bottom:1px solid rgba(255,255,255,.14);}\n#pmSide .pm-av{width:40px;height:40px;border-radius:50%;background:#fff;color:var(--pm-side);display:flex;align-items:center;justify-content:center;font:700 17px/1 'Inter',system-ui,sans-serif;flex:none;}\n#pmSide .pm-un{font-weight:700;font-size:14px;line-height:1.2;}\n#pmSide .pm-ue{font-size:11.5px;color:#cfe3e3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px;}\n#pmSide .pm-on{display:inline-block;width:8px;height:8px;border-radius:50%;background:#4ADE80;margin-right:5px;}\n#pmSide .pm-nav{display:flex;flex-direction:column;gap:3px;}\n#pmSide .pm-it{display:flex;align-items:center;gap:11px;width:100%;text-align:left;border:0;background:transparent;color:#EAF4F4;font:600 14.5px/1.2 'Inter',system-ui,sans-serif;padding:11px 12px;border-radius:11px;cursor:pointer;border-left:4px solid transparent;transition:background .12s;}\n#pmSide .pm-it:hover{background:rgba(255,255,255,.10);}\n#pmSide .pm-it:focus-visible{outline:2px solid #fff;outline-offset:1px;}\n#pmSide .pm-it.act{background:rgba(255,255,255,.17);border-left-color:#F29A52;color:#fff;}\n#pmSide .pm-it svg{width:21px;height:21px;flex:none;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}\n#pmSide .pm-it span.t{flex:1;}\n#pmSide .pm-n{min-width:24px;height:22px;padding:0 7px;border-radius:11px;background:#C75B16;color:#fff;font:700 12px/22px 'Inter',system-ui,sans-serif;text-align:center;}\n#pmSide .pm-fill{flex:1;min-height:12px;}\n#pmSide .pm-pie{font-size:10.5px;color:#a9c9c9;text-align:center;padding:8px 4px 0;}\n\nbody.pm-side .app{max-width:1340px;margin:0 0 0 var(--pm-w);padding:16px 30px 80px;}\nbody.pm-side .topbar .brand{display:none;}\nbody.pm-side .topbar{justify-content:flex-end;min-height:0;padding-top:0;padding-bottom:0;}\nbody.pm-side .topbar-actions{margin-left:auto;}\n\n/* ---------- Encabezado del panel ---------- */\nbody.pm-on #screen-admin-hub > .helptext{display:none;}\nbody.pm-on #screen-admin-hub > .linkbtn{font-weight:600;color:var(--teal-dark);}\nbody.pm-on #screen-admin-hub > h2{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin:8px 0 14px;font-size:30px;line-height:1.15;font-style:italic;color:var(--deep);}\nbody.pm-on #screen-admin-hub > h2 .rol-chip{margin:0;font-style:normal;background:#E3F1F2;color:var(--teal-dark);border-color:#BFDDE0;font-size:12.5px;padding:7px 13px;}\nbody.pm-on #gdPend{display:none;}\n\n/* ---------- Acciones prioritarias ---------- */\n#pmResumen{margin:0 0 22px;}\n.pm-banner{display:flex;align-items:center;gap:12px;background:linear-gradient(100deg,var(--pm-side) 0%,#0F6A74 70%,#14808A 100%);color:#fff;border-radius:18px 18px 0 0;padding:14px 22px;font:700 24px/1.2 'Zilla Slab',Georgia,serif;}\n.pm-banner svg{width:30px;height:30px;fill:#FFD28A;stroke:none;flex:none;}\n.pm-banner b{color:#FFC27A;font-size:34px;margin:0 2px;}\n.pm-banner small{font:500 13px/1.3 'Inter',system-ui,sans-serif;color:#cfe8e8;margin-left:auto;text-align:right;}\n.pm-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;background:#fff;border:1px solid var(--line);border-top:0;border-radius:0 0 18px 18px;padding:14px;box-shadow:0 6px 22px rgba(11,61,61,.08);}\n.pm-col{border-radius:14px;overflow:hidden;display:flex;flex-direction:column;min-height:210px;border:1px solid rgba(0,0,0,.05);}\n.pm-col h3{margin:0;padding:13px 16px;color:#fff;font:700 15.5px/1.25 'Inter',system-ui,sans-serif;display:flex;align-items:center;gap:10px;}\n.pm-col h3 svg{width:22px;height:22px;flex:none;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}\n.pm-col h3 small{font-weight:500;opacity:.92;}\n.pm-col.urg{background:#FDEEEC;} .pm-col.urg h3{background:linear-gradient(90deg,var(--pm-urg1),var(--pm-urg2));}\n.pm-col.pro{background:#FFF3E5;} .pm-col.pro h3{background:linear-gradient(90deg,var(--pm-pro1),var(--pm-pro2));}\n.pm-col.ok{background:#E8F5EE;} .pm-col.ok h3{background:linear-gradient(90deg,var(--pm-ok1),var(--pm-ok2));}\n.pm-lista{display:flex;flex-direction:column;gap:9px;padding:12px;}\n.pm-fila{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:12px;padding:10px 12px;cursor:pointer;font:600 14px/1.25 'Inter',system-ui,sans-serif;color:var(--ink);box-shadow:0 1px 2px rgba(20,20,20,.05);transition:transform .12s,box-shadow .12s;}\n.pm-fila:hover,.pm-fila:focus-visible{transform:translateY(-1px);box-shadow:0 6px 16px rgba(11,61,61,.13);outline:none;}\n.pm-fila .ic{position:relative;font-size:26px;line-height:1;flex:none;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:#F6F1E7;}\n.pm-fila .nb{position:absolute;top:-7px;right:-9px;min-width:22px;height:22px;padding:0 5px;border-radius:11px;color:#fff;font:700 12px/22px 'Inter',system-ui,sans-serif;text-align:center;border:2px solid #fff;}\n.pm-col.urg .nb{background:#C0392B;} .pm-col.pro .nb{background:#C25A17;}\n.pm-fila .tx{flex:1;}\n.pm-fila .go{color:var(--muted);font-size:22px;line-height:1;}\n.pm-vacio{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:16px 14px;gap:4px;color:#5C5A52;font-size:13.5px;}\n.pm-vacio .chk{width:78px;height:78px;border-radius:50%;background:linear-gradient(135deg,var(--pm-ok1),#35B27F);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(27,127,85,.28);margin-bottom:6px;}\n.pm-vacio .chk svg{width:44px;height:44px;stroke:#fff;fill:none;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round;}\n.pm-vacio b{font:700 17px/1.2 'Inter',system-ui,sans-serif;color:var(--ink);}\n.pm-aldia{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:8px;}\n.pm-aldia span{background:#fff;border:1px solid #BFE0CF;border-radius:999px;padding:4px 10px;font-size:12px;color:#17603F;}\n.pm-carga{padding:22px;text-align:center;color:var(--muted);grid-column:1/-1;}\n\n/* ---------- Cat\u00e1logo de funciones ---------- */\nbody.pm-on #grupoGrid{display:flex;flex-direction:column;gap:16px;}\n.pm-cat-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}\n.pm-cat-head h3{margin:0;font:700 26px/1.1 'Zilla Slab',Georgia,serif;font-style:italic;color:var(--deep);display:flex;align-items:center;gap:10px;}\n.pm-cat-head h3 svg{width:28px;height:28px;stroke:var(--teal);fill:none;stroke-width:2;}\nbody.pm-on .fn-buscar{position:relative;margin:0;flex:0 1 420px;min-width:240px;}\nbody.pm-on .fn-buscar input{width:100%;border:1.5px solid #B9D5D8;border-radius:14px;padding:12px 78px 12px 16px;font:500 15px/1.2 'Inter',system-ui,sans-serif;background:#fff;box-shadow:0 2px 8px rgba(11,61,61,.07);}\nbody.pm-on .fn-buscar input:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px rgba(14,124,134,.18);}\n.pm-kbd{position:absolute;right:10px;top:50%;transform:translateY(-50%);font:600 12px/1 'Inter',system-ui,sans-serif;color:#4A6568;background:#EAF1F2;border:1px solid #CFDDDF;border-radius:8px;padding:6px 8px;pointer-events:none;}\nbody.pm-on .fn-seccion{margin:0;border-radius:18px;padding:12px 14px 16px;border:1px solid rgba(0,0,0,.05);background:#EEF4F4;}\nbody.pm-on #grupoSec-estudiantes{background:#E4F1F2;} body.pm-on #grupoSec-empresas{background:#FDF0E3;} body.pm-on #grupoSec-supervisores{background:#E8F0EC;}\nbody.pm-on #grupoSec-practica{background:#F4EFE3;} body.pm-on #grupoSec-seguridad{background:#EEE9F6;} body.pm-on #grupoSec-informes{background:#E6EEF8;} body.pm-on #grupoSec-comunicacion{background:#FBEAE7;}\nbody.pm-on .fn-sec-cab{display:flex;align-items:center;gap:10px;margin:0 0 10px;}\nbody.pm-on .fn-sec-cab h3{margin:0;font:700 21px/1.15 'Zilla Slab',Georgia,serif;font-style:italic;color:var(--deep);}\nbody.pm-on .fn-sec-cab p{margin:1px 0 0;font-size:12.5px;color:#5C6B6B;}\nbody.pm-on .fn-sec-ico{width:38px;height:38px;border-radius:11px;background:#fff !important;display:flex;align-items:center;justify-content:center;font-size:21px;box-shadow:0 1px 3px rgba(0,0,0,.08);flex:none;}\n.pm-vermas{margin-left:auto;border:0;background:transparent;color:var(--teal-dark);font:700 14px/1 'Inter',system-ui,sans-serif;cursor:pointer;padding:8px 6px;border-radius:8px;white-space:nowrap;}\n.pm-vermas:hover{text-decoration:underline;} .pm-vermas:focus-visible{outline:2px solid var(--teal);}\nbody.pm-on .fn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:12px;}\nbody.pm-on .fn-seccion.pm-corta .fn-card:nth-child(n+5){display:none;}\nbody.pm-on .fn-card{position:relative;flex-direction:row;align-items:center;gap:12px;background:#fff;border:1px solid rgba(0,0,0,.07);border-left:1px solid rgba(0,0,0,.07);border-radius:14px;padding:14px 34px 14px 14px;min-height:92px;box-shadow:0 1px 3px rgba(20,20,20,.06);}\nbody.pm-on .fn-card:hover,body.pm-on .fn-card:focus-visible{border-color:var(--teal);box-shadow:0 8px 20px rgba(11,61,61,.14);}\nbody.pm-on .fn-ico{width:46px;height:46px;border-radius:13px;font-size:24px;display:flex;align-items:center;justify-content:center;flex:none;background:#E4F1F2;}\nbody.pm-on .fn-card.empresa .fn-ico{background:#FCEBDD;} body.pm-on .fn-card.supervisor .fn-ico{background:#E4ECEB;} body.pm-on .fn-card.administrador .fn-ico{background:#EEE8F6;}\nbody.pm-on .fn-tit{font:700 14.5px/1.25 'Inter',system-ui,sans-serif;color:var(--ink);display:block;}\nbody.pm-on .fn-paso{display:inline-block;margin:0 6px 4px 0;padding:3px 9px;border-radius:999px;background:#DDEBF7;color:#1E4F7A;font:700 10.5px/1.2 'Inter',system-ui,sans-serif;letter-spacing:.03em;text-transform:uppercase;}\nbody.pm-on .fn-desc{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12.5px;line-height:1.35;color:#5E625F;margin-top:3px;}\nbody.pm-on .fn-go{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:24px;color:#8AA3A5;}\nbody.pm-on .fn-badge{position:absolute;top:-8px;right:-6px;}\nbody.pm-on .fn-badge .sa-badge{min-width:26px;height:26px;line-height:26px;font-size:13px;border:2px solid #fff;border-radius:13px;box-shadow:0 2px 6px rgba(192,57,43,.35);}\n\n/* ---------- Panel central: solo el resumen; las funciones aparecen al elegir una secci\u00f3n o al buscar ---------- */\nbody.pm-on:not(.pm-vista):not(.pm-buscando) #grupoGrid{display:none;}\nbody.pm-buscando #pmResumen{display:none;}\nbody.pm-on .fn-buscar{display:none;}\n#pmTop{margin:0 0 16px;}\n.pm-bus{position:relative;max-width:560px;}\n.pm-bus svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:20px;height:20px;stroke:#5B8A8F;fill:none;stroke-width:2;stroke-linecap:round;pointer-events:none;}\n.pm-bus input{width:100%;border:1.5px solid #B9D5D8;border-radius:14px;padding:12px 78px 12px 44px;font:500 15px/1.2 'Inter',system-ui,sans-serif;background:#fff;box-shadow:0 2px 8px rgba(11,61,61,.07);}\n.pm-bus input:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px rgba(14,124,134,.18);}\nbody:not(.pm-on) #pmTop{display:none;}\n/* Campana de notificaciones (arriba a la derecha) */\n#pmCampana{display:none;position:relative;width:46px;height:46px;border-radius:50%;border:1px solid #BFDDE0;background:#fff;color:var(--teal-dark);cursor:pointer;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(11,61,61,.12);margin-left:12px;}\n#pmCampana svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}\n#pmCampana:hover{background:#E3F1F2;} #pmCampana:focus-visible{outline:2px solid var(--teal);outline-offset:2px;}\nbody.pm-side #pmCampana.on{display:flex;}\n#pmCampana .pm-cn{position:absolute;top:-6px;right:-6px;min-width:22px;height:22px;padding:0 5px;border-radius:11px;background:#C0392B;color:#fff;font:700 12px/22px 'Inter',system-ui,sans-serif;text-align:center;border:2px solid #fff;}\nbody.pm-side #ntBell{display:none !important;}\n\n/* ---------- Secci\u00f3n abierta por separado (desde la barra lateral) ---------- */\nbody.pm-vista #pmResumen{display:none;}\nbody.pm-vista .fn-seccion.pm-oculta{display:none !important;}\n.pm-mig{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:15px;color:var(--muted);margin:2px 0 -4px;}\n.pm-mig button{border:1px solid #BFDDE0;background:#fff;color:var(--teal-dark);font:700 13.5px/1 'Inter',system-ui,sans-serif;padding:9px 14px;border-radius:999px;cursor:pointer;}\n.pm-mig button:hover{background:#E3F1F2;} .pm-mig button:focus-visible{outline:2px solid var(--teal);}\n.pm-mig b{font:700 26px/1.1 'Zilla Slab',Georgia,serif;font-style:italic;color:var(--deep);}\nbody.pm-vista .fn-seccion:not(.pm-oculta){padding-top:16px;}\nbody.pm-vista .fn-seccion:not(.pm-oculta) .fn-sec-cab h3{display:none;}\n\n/* ---------- Ayuda ---------- */\n#pmAyuda{position:fixed;inset:0;z-index:2100;background:rgba(10,30,32,.55);display:flex;align-items:center;justify-content:center;padding:16px;}\n#pmAyuda .caja{background:#fff;border-radius:16px;max-width:520px;width:100%;padding:22px 24px;box-shadow:0 20px 50px rgba(0,0,0,.3);max-height:88vh;overflow:auto;}\n#pmAyuda h3{margin:0 0 8px;font:700 22px/1.2 'Zilla Slab',Georgia,serif;color:var(--deep);}\n#pmAyuda ul{margin:8px 0 14px 18px;padding:0;font-size:14px;line-height:1.5;}\n#pmAyuda kbd{background:#EAF1F2;border:1px solid #CFDDDF;border-radius:6px;padding:1px 6px;font-size:12px;}\n\n/* ---------- Pantallas medianas y celulares ---------- */\n@media (max-width:1180px){ .pm-cols{grid-template-columns:1fr;} .pm-col{min-height:0;} }\n@media (max-width:900px){\n  body.pm-side #pmSide{position:fixed;top:0;left:0;right:0;bottom:auto;width:auto;height:56px;flex-direction:row;align-items:center;gap:6px;padding:6px 8px;overflow-x:auto;box-shadow:0 4px 16px rgba(11,61,61,.22);}\n  #pmSide .pm-logo,#pmSide .pm-logo-sub,#pmSide .pm-user,#pmSide .pm-fill,#pmSide .pm-pie{display:none;}\n  #pmSide .pm-nav{flex-direction:row;gap:4px;} #pmSide .pm-it{white-space:nowrap;padding:9px 12px;width:auto;border-left:0;border-bottom:3px solid transparent;}\n  #pmSide .pm-it.act{border-bottom-color:#F29A52;}\n  body.pm-side .app{margin:0;padding:68px 14px 40px;max-width:920px;}\n  body.pm-side .topbar .brand{display:flex;}\n  body.pm-on #screen-admin-hub > h2{font-size:24px;}\n  .pm-banner{font-size:19px;padding:12px 14px;flex-wrap:wrap;} .pm-banner b{font-size:28px;} .pm-banner small{margin-left:0;text-align:left;width:100%;}\n  .pm-cat-head h3{font-size:22px;} body.pm-on .fn-buscar{flex-basis:100%;}\n  body.pm-on .fn-grid{grid-template-columns:1fr;}\n}\n@media (prefers-reduced-motion:reduce){ .pm-fila,.fn-card,#pmSide .pm-it{transition:none !important;} }\n@media print{ #pmSide{display:none !important;} body.pm-side .app{margin:0;max-width:none;} }\n"; document.head.appendChild(st); }catch(_){} })();

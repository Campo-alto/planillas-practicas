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
  let activo = 'dash', chips = [];

  const enHub = () => { const h = document.getElementById('screen-admin-hub'); return !!(h && h.classList.contains('active')); };
  const hayBuscador = () => !!((document.getElementById('fnBuscar') || {}).value || '').trim();

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
    nav.innerHTML = it('dash', IC.dash, 'Panel', total) + grupos.map(g=>it(g.id, IC[g.id] || IC.practica, g.titulo, sumaSeccion(document.getElementById('grupoSec-' + g.id)))).join('');
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
    activo = id;
    const ir = () => {
      if(id === 'dash'){ window.scrollTo({ top:0, behavior:'smooth' }); }
      else { const s = document.getElementById('grupoSec-' + id); if(s){ expandidas.add(id); pmCortas(); s.scrollIntoView({ behavior:'smooth', block:'start' }); } }
      pintarBarra();
    };
    if(!enHub()){ showScreen('screen-admin-hub'); setTimeout(ir, 350); } else ir();
  };
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
      const larga = n > 4, abierta = expandidas.has(id) || buscando;
      sec.classList.toggle('pm-corta', larga && !abierta);
      let b = sec.querySelector('.pm-vermas');
      if(larga && !buscando){
        if(!b){ b = document.createElement('button'); b.type = 'button'; b.className = 'pm-vermas'; b.onclick = ()=>pmVerMas(id); sec.querySelector('.fn-sec-cab').appendChild(b); }
        b.textContent = abierta ? 'Ver menos ↑' : 'Ver más (' + (n - 4) + ') →'; b.setAttribute('aria-expanded', abierta ? 'true' : 'false');
      } else if(b) b.remove();
    });
  }
  function mejorarCatalogo(){
    const grid = document.getElementById('grupoGrid'); if(!grid) return;
    const bus = grid.querySelector('.fn-buscar');
    if(bus && !grid.querySelector('.pm-cat-head')){
      const head = document.createElement('div'); head.className = 'pm-cat-head'; head.innerHTML = '<h3>' + LUPA + 'Catálogo de funciones</h3>';
      grid.insertBefore(head, grid.firstChild); head.appendChild(bus);
    }
    const inp = document.getElementById('fnBuscar');
    if(inp){
      inp.placeholder = 'Busca una función… (ej. correo, empresa)';
      if(!inp.parentElement.querySelector('.pm-kbd')){ const k = document.createElement('span'); k.className = 'pm-kbd'; k.setAttribute('aria-hidden', 'true'); k.textContent = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? '⌘ K' : 'Ctrl K'; inp.parentElement.appendChild(k); }
    }
    pmCortas(); pintarBarra();
  }
  // El panel vuelve a pintar las tarjetas cada vez que se muestra o llegan los permisos: se reaplica el diseño
  (function(){
    const g = document.getElementById('grupoGrid'); if(!g || typeof MutationObserver === 'undefined') return;
    new MutationObserver(()=>{ mejorarCatalogo(); }).observe(g, { childList:true });
  })();
  if(typeof window.pgFiltrar === 'function'){ const _f = window.pgFiltrar; window.pgFiltrar = function(){ const r = _f.apply(this, arguments); pmCortas(); return r; }; }
  document.addEventListener('keydown', ev=>{
    if((ev.ctrlKey || ev.metaKey) && String(ev.key).toLowerCase() === 'k' && enHub()){ const i = document.getElementById('fnBuscar'); if(i){ ev.preventDefault(); i.scrollIntoView({ behavior:'smooth', block:'center' }); i.focus(); i.select(); } }
    if(ev.key === 'Escape') pmAyudaCerrar();
  });

  /* ---------- Enganche con el panel existente ---------- */
  const _show = showScreen;
  showScreen = function(id){
    const r = _show.apply(this, arguments);
    const conBarra = SIN_BARRA.indexOf(id) < 0 && !!document.getElementById(id);
    document.body.classList.toggle('pm-side', conBarra);
    document.body.classList.toggle('pm-on', id === 'screen-admin-hub');
    if(conBarra){ if(id !== 'screen-admin-hub') activo = ''; else if(!activo) activo = 'dash'; pintarBarra(); }
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

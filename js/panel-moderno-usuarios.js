/* ============================= DISEÑO MODERNO · ESTUDIANTE, EMPRESA Y SUPERVISOR =============================
   Mismo estilo del panel de administrador (menú lateral Campoalto, campana arriba a la derecha, resumen Urgente / En proceso /
   Completado), pero sobre las pantallas que ya existen. NO cambia ninguna función, permiso ni dato: solo reorganiza lo que se ve.
   · Estudiante: cada pestaña pasa al menú lateral; «Mi ruta» muestra el resumen.
   · Empresa y supervisor: cada recuadro de la pantalla pasa al menú lateral y se abre solo.
   Se carga al final, con panel-moderno.css y panel-moderno-usuarios.css. Si falta alguno, todo se ve como antes. */
(function(){
  if(typeof showScreen !== 'function') return;
  const PANTALLAS = ['screen-estudiante', 'screen-empresa', 'screen-supervisor', 'screen-lookup', 'screen-ca-panel'];
  const e = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const EMO = [[/ruta/i, '🧭'], [/datos|perfil|hoja de vida/i, '🪪'], [/asign|cupo|lugar|empresa/i, '📍'], [/nota|competen/i, '📝'], [/control|firma|cumpl/i, '✍️'],
               [/solicitud|postul|oferta/i, '📂'], [/contrato|convenio/i, '🤝'], [/carta/i, '✉️'], [/planilla/i, '📋'], [/visita|supervis/i, '🧭'], [/buscar|estudiante/i, '🔎'],
               [/inasist|asistencia|cambio/i, '🩺'], [/concepto/i, '🏢']];
  const emoji = t => { const m = EMO.find(x=>x[0].test(t)); return m ? m[1] : '📌'; };
  let sel = '';            // título de la sección abierta (se conserva entre repintados)
  let ult = '';            // pantalla en la que se pintó por última vez

  const pantallaActiva = () => { const a = document.querySelector('.screen.active'); return (a && PANTALLAS.indexOf(a.id) >= 0 && typeof state !== 'undefined' && state && state.token) ? a : null; };
  const rolTxt = () => (typeof roleLabel === 'function' ? roleLabel(state.role || state.pendingRole) : '') || (state.caMode ? 'Empresa' : 'Usuario');
  const nombreUsuario = () => (state.record && state.record.nombre) ? state.record.nombre : (state.currentUserNombre || rolTxt());

  /* ---------- Menú lateral ---------- */
  function crearBarra(){
    if(document.getElementById('pmSide')) return;
    const logo = document.querySelector('.brand-logo');
    const n = document.createElement('nav'); n.id = 'pmSide'; n.setAttribute('aria-label', 'Secciones');
    n.innerHTML = '<div class="pm-logo">' + (logo ? '<img src="' + e(logo.getAttribute('src')) + '" alt="Campoalto" width="150" height="39">' : '<b>Campoalto</b>') + '</div>' +
      '<div class="pm-logo-sub">Educación para el Trabajo y el Desarrollo Humano</div>' +
      '<div class="pm-user"><div class="pm-av" id="pmAv">U</div><div><div class="pm-un" id="pmUn">Usuario</div><div class="pm-ue"><span class="pm-on"></span><span id="pmRol">En línea</span></div></div></div>' +
      '<div class="pm-nav" id="pmNav"></div><div class="pm-fill"></div>' +
      '<button type="button" class="pm-it" onclick="pmuAyuda()"><span class="pmu-emo">❔</span><span class="t">Ayuda</span></button><div class="pm-pie">Planillas de prácticas · PPS-GAA-F-006</div>';
    document.body.appendChild(n);
  }
  function secciones(pant){
    const r = [];
    if(pant.id === 'screen-estudiante'){
      document.querySelectorAll('#estTabs .tab').forEach(b=>r.push({ t: b.textContent.trim(), activo: b.classList.contains('active'), abrir: ()=>b.click(), tab: true }));
      return r;
    }
    if(pant.id === 'screen-ca-panel'){                       // empresa de contrato de aprendizaje: «Mi ruta» + sus pestañas
      const ruta = document.getElementById('gdRutaEmp');
      if(ruta) r.push({ t: '🧭 Mi ruta', el: ruta });
      Array.from(pant.children).filter(x=>x.classList.contains('tabs')).forEach(bar=>bar.querySelectorAll('.tab').forEach(b=>r.push({ t: b.textContent.trim(), activo: b.classList.contains('active'), abrir: ()=>b.click(), tab: true })));
      return r;
    }
    Array.from(pant.children).forEach((c, i)=>{
      if(!c.classList.contains('card') || c.style.display === 'none' || c.classList.contains('pmu-mio')) return;
      const sb2 = c.querySelector('.section-bar'), h = c.querySelector('h2, h3');
      let t = sb2 ? sb2.textContent.trim() : (h ? h.textContent.trim() : '');
      if(!t && /DatosGenerales/i.test(c.id)) t = 'Datos del estudiante';
      if(!t && c.querySelector('#lookupDoc')) t = 'Buscar estudiante';
      if(!t || !c.textContent.trim()) return;
      r.push({ t, el: c });
    });
    return r;
  }
  function pintar(){
    const pant = pantallaActiva();
    const cl = document.body.classList;
    if(!pant){ cl.remove('pm-side', 'pm-u'); document.querySelectorAll('.pmu-oculta').forEach(x=>x.classList.remove('pmu-oculta')); ult = ''; return; }
    crearBarra(); cl.add('pm-side', 'pm-u');
    const ss = secciones(pant);
    if(pant.id !== ult){ ult = pant.id; sel = ''; }
    if(!ss.some(s=>s.t === sel)){ const a = ss.find(s=>s.activo); sel = (pant.id === 'screen-ca-panel' && ss.length && !ss[0].tab) ? ss[0].t : (a ? a.t : (ss.length ? ss[0].t : '')); }
    if(pant.id === 'screen-ca-panel'){                       // con «Mi ruta» se ve la ruta; con una pestaña, su contenido
      const rr = document.getElementById('gdRutaEmp'), bd = document.getElementById('caEmpBody'), enRuta = sel === '🧭 Mi ruta';
      if(rr) rr.classList.toggle('pmu-oculta', !enRuta); if(bd) bd.classList.toggle('pmu-oculta', enRuta);
    }
    // mostrar solo la sección elegida (estudiante: lo hace su propia pestaña)
    if(pant.id !== 'screen-estudiante' && pant.id !== 'screen-ca-panel') ss.forEach(s=>s.el.classList.toggle('pmu-oculta', s.t !== sel));
    const nom = nombreUsuario(); const un = document.getElementById('pmUn'), av = document.getElementById('pmAv'), ro = document.getElementById('pmRol');
    if(un) un.textContent = nom; if(av) av.textContent = (String(nom).trim()[0] || 'U').toUpperCase(); if(ro) ro.textContent = rolTxt() + ' · En línea';
    const nav = document.getElementById('pmNav');
    nav.innerHTML = ss.map((s, i)=>'<button type="button" class="pm-it' + (s.t === sel ? ' act' : '') + '" data-i="' + i + '"><span class="pmu-emo">' + emoji(s.t) + '</span><span class="t">' + e(s.t.replace(/^[^\wÁÉÍÓÚáéíóúñÑ]+/, '')) + '</span></button>').join('');
    nav.querySelectorAll('.pm-it').forEach(b=>b.onclick = ()=>{ const s = ss[Number(b.dataset.i)]; if(!s) return; sel = s.t; if(s.abrir) s.abrir(); pintar(); window.scrollTo(0, 0); });
    resumenRuta(pant);
    espejoCampana();
  }

  /* ---------- Resumen Urgente / En proceso / Completado (desde «Mi ruta») ---------- */
  function resumenRuta(pant){
    pant.querySelectorAll('.card').forEach(host=>{
      const lista = host.querySelector('.gd-lista'); if(!lista || host.style.display === 'none') return;
      host.classList.add('pmu-ruta');
      const pasos = Array.from(lista.querySelectorAll('.gd-paso')).map(li=>({
        e: li.classList.contains('gd-foco') ? 'foco' : li.classList.contains('gd-hecho') ? 'hecho' : 'otro',
        t: (li.querySelector('.gd-tit') || {}).textContent || '', d: (li.querySelector('.gd-det') || {}).textContent || '',
        go: li.querySelector('.gd-btn') }));
      const foco = host.querySelector('.gd-next button');
      const fila = (p, ic, urg)=>'<button type="button" class="pm-fila' + ((p.go || (urg && foco)) ? '' : ' nolink') + '" data-k="' + e(p.t) + '"><span class="ic">' + ic + '</span><span class="tx"><b>' + e(p.t) + '</b><small>' + e(p.d) + '</small></span>' + ((p.go || (urg && foco)) ? '<span class="go" aria-hidden="true">›</span>' : '') + '</button>';
      const urg = pasos.filter(p=>p.e === 'foco'), pro = pasos.filter(p=>p.e === 'otro'), ok = pasos.filter(p=>p.e === 'hecho');
      const col = (cls, tit, arr, ic, vacio, urgente)=>'<div class="pm-col ' + cls + '"><h3>' + tit + ' <small>(' + arr.length + ')</small></h3>' +
        (arr.length ? '<div class="pm-lista">' + arr.map(p=>fila(p, ic, urgente)).join('') + '</div>' : '<div class="pm-vacio"><b>' + vacio + '</b></div>') + '</div>';
      let box = host.querySelector('#pmuRes');
      if(!box){ box = document.createElement('div'); box.id = 'pmuRes'; box.className = 'pmu-mio'; host.insertBefore(box, host.firstChild); }
      const tit = (host.querySelector('.section-bar') || {}).textContent || 'Mi ruta';
      const html = '<div class="pmu-titulo">' + e(tit) + '</div><div class="pm-banner">' + ((urg.length || !pasos.length) ? 'Tu <b>siguiente paso</b> está listo' : '🎉 ¡Todo al día!') + '<small>' + ok.length + ' de ' + pasos.length + ' pasos completados</small></div>' +
        '<div class="pm-cols">' + col('urg', 'Urgente', urg, '👉', 'Nada urgente', true) + col('pro', 'En proceso', pro, '⏳', 'Sin pasos en espera', false) + col('ok', 'Completado', ok, '✔️', 'Aún no hay pasos completos', false) + '</div>';
      if(box.dataset.h !== html){
        box.dataset.h = html; box.innerHTML = html;
        box.querySelectorAll('.pm-fila').forEach(b=>{
          const p = pasos.find(x=>x.t === b.dataset.k); if(!p) return;
          const btn = p.e === 'foco' ? foco : p.go; if(btn) b.onclick = ()=>btn.click();
        });
      }
    });
  }

  /* ---------- Ayuda ---------- */
  window.pmuAyuda = function(){
    if(document.getElementById('pmAyuda')) return;
    const m = document.createElement('div'); m.id = 'pmAyuda'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="caja"><h3>¿Necesitas ayuda?</h3><ul><li>Usa el <b>menú de la izquierda</b> para moverte entre las secciones.</li>' +
      '<li>En <b>Mi ruta</b> ves tu siguiente paso y lo que ya completaste.</li><li>La campana 🔔 de arriba te avisa de novedades.</li>' +
      '<li>Si tienes una duda, escríbenos desde el botón 💬 o al correo asistentedepracticas@campoalto.edu.co.</li></ul>' +
      '<div style="text-align:right;"><button class="primary" type="button" onclick="pmAyudaCerrar()">Entendido</button></div></div>';
    m.addEventListener('click', ev=>{ if(ev.target === m) pmAyudaCerrar(); });
    document.body.appendChild(m);
  };
  window.pmAyudaCerrar = function(){ const m = document.getElementById('pmAyuda'); if(m) m.remove(); };
  document.addEventListener('keydown', ev=>{ if(ev.key === 'Escape') window.pmAyudaCerrar(); });

  /* ---------- Campana arriba a la derecha (refleja la campana original) ---------- */
  function espejoCampana(){
    if(!document.body.classList.contains('pm-u')) return;
    const top = document.querySelector('.topbar'); if(!top) return;
    let b = document.getElementById('pmCampana');
    if(!b){
      b = document.createElement('button'); b.type = 'button'; b.id = 'pmCampana'; b.setAttribute('aria-label', 'Notificaciones');
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.6 2H4.4Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg><span class="pm-cn" style="display:none"></span>';
      b.onclick = ()=>{ if(typeof ntAbrir === 'function') ntAbrir(); }; top.appendChild(b);
    }
    const f = document.getElementById('ntBell'); const visible = !!f && f.style.display !== 'none';
    b.classList.toggle('on', visible);
    const sp = f && f.querySelector('span'), n = sp ? String(sp.textContent).trim() : '';
    const c = b.querySelector('.pm-cn'); if(c){ c.textContent = n; c.style.display = n ? '' : 'none'; }
  }

  /* ---------- Cuándo repintar ---------- */
  let t = null; const prog = ()=>{ clearTimeout(t); t = setTimeout(()=>{ try{ pintar(); }catch(err){ console.error(err); } }, 220); };
  const _show = showScreen;
  showScreen = function(){ const r = _show.apply(this, arguments); prog(); setTimeout(prog, 900); return r; };
  if(typeof showEstTab === 'function'){ const _t = showEstTab; showEstTab = function(){ const r = _t.apply(this, arguments); prog(); return r; }; }
  if(typeof MutationObserver !== 'undefined'){
    new MutationObserver(muts=>{
      if(!document.body.classList.contains('pm-u') && !pantallaActiva()) return;
      if(muts.every(m=>Array.from(m.addedNodes).concat(Array.from(m.removedNodes)).every(n=>n.nodeType !== 1 || n.id === 'pmuRes' || n.classList.contains('pmu-mio') || n.id === 'pmCampana' || n.id === 'pmSide'))) return;
      prog();
    }).observe(document.querySelector('.app') || document.body, { childList:true, subtree:true });
  }
  setInterval(()=>{ if(document.body.classList.contains('pm-u')) espejoCampana(); }, 2000);
  window.addEventListener('resize', ()=>{});
  prog();
})();

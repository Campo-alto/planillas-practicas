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
      '<button type="button" class="pm-it" onclick="pmuManual()"><span class="pmu-emo">📘</span><span class="t">Manual</span></button><button type="button" class="pm-it" onclick="pmuAyuda()"><span class="pmu-emo">❔</span><span class="t">Ayuda</span></button><div class="pm-pie">Planillas de prácticas · PPS-GAA-F-006</div>';
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

  /* ---------- Manual (abre la modalidad que corresponde) ---------- */
  window.pmuManual = function(){
    let m = 'pnr'; try{
      const a = document.querySelector('.screen.active'), md = String((state.record && state.record.modalidad) || '').toLowerCase();
      if(a && a.id === 'screen-ca-panel') m = 'ca';
      else if(a && a.id === 'screen-supervisor') m = 'rlp';
      else if(/contrato/.test(md)) m = 'ca'; else if(/rap|aprendizajes/.test(md)) m = 'rap'; else if(/rlp|lugar/.test(md)) m = 'rlp';
    }catch(_){}
    window.open('manual.html#' + m, '_blank', 'noopener');
  };
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

/* ---- Respaldo de estilos: si panel-moderno-todo.css no cargó (archivo no subido o en otra carpeta), el diseño se inyecta desde aquí ---- */
(function(){ try{ if(getComputedStyle(document.documentElement).getPropertyValue('--pm-w').trim()) return; const st = document.createElement('style'); st.id = 'pmRespaldoCss'; st.textContent = "/* ============================= PANEL DEL ADMINISTRADOR \u00b7 DISE\u00d1O MODERNO (Campoalto) =============================\n   Se carga DESPU\u00c9S de styles.css. Solo cambia la apariencia: barra lateral, resumen de acciones prioritarias y cat\u00e1logo de funciones.\n   Si este archivo no est\u00e1, el panel se ve como antes. */\n:root{\n  --pm-side:#0B3D3D; --pm-side2:#0A5A62; --pm-w:248px;\n  --pm-urg1:#B23A2E; --pm-urg2:#D24E3E; --pm-pro1:#C25A17; --pm-pro2:#D96F25; --pm-ok1:#1B7F55; --pm-ok2:#2A9A6B;\n}\n\n/* ---------- Barra lateral ---------- */\n#pmSide{display:none;}\nbody.pm-side #pmSide{\n  display:flex; flex-direction:column; gap:6px; position:fixed; z-index:40; left:0; top:0; bottom:0; width:var(--pm-w); padding:16px 12px 14px;\n  background:linear-gradient(190deg,var(--pm-side) 0%,#0A4A50 55%,var(--pm-side2) 100%); color:#fff; overflow-y:auto;\n  box-shadow:4px 0 18px rgba(11,61,61,.18);\n}\n#pmSide .pm-logo{background:#fff;border-radius:12px;padding:10px 12px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;}\n#pmSide .pm-logo img{max-width:100%;height:auto;display:block;}\n#pmSide .pm-logo-sub{font-size:10.5px;line-height:1.25;text-align:center;color:#cfe3e3;margin:2px 4px 10px;}\n#pmSide .pm-user{display:flex;gap:10px;align-items:center;padding:10px 8px;margin:0 0 8px;border-bottom:1px solid rgba(255,255,255,.14);}\n#pmSide .pm-av{width:40px;height:40px;border-radius:50%;background:#fff;color:var(--pm-side);display:flex;align-items:center;justify-content:center;font:700 17px/1 'Inter',system-ui,sans-serif;flex:none;}\n#pmSide .pm-un{font-weight:700;font-size:14px;line-height:1.2;}\n#pmSide .pm-ue{font-size:11.5px;color:#cfe3e3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px;}\n#pmSide .pm-on{display:inline-block;width:8px;height:8px;border-radius:50%;background:#4ADE80;margin-right:5px;}\n#pmSide .pm-nav{display:flex;flex-direction:column;gap:3px;}\n#pmSide .pm-it{display:flex;align-items:center;gap:11px;width:100%;text-align:left;border:0;background:transparent;color:#EAF4F4;font:600 14.5px/1.2 'Inter',system-ui,sans-serif;padding:11px 12px;border-radius:11px;cursor:pointer;border-left:4px solid transparent;transition:background .12s;}\n#pmSide .pm-it:hover{background:rgba(255,255,255,.10);}\n#pmSide .pm-it:focus-visible{outline:2px solid #fff;outline-offset:1px;}\n#pmSide .pm-it.act{background:rgba(255,255,255,.17);border-left-color:#F29A52;color:#fff;}\n#pmSide .pm-it svg{width:21px;height:21px;flex:none;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}\n#pmSide .pm-it span.t{flex:1;}\n#pmSide .pm-n{min-width:24px;height:22px;padding:0 7px;border-radius:11px;background:#C75B16;color:#fff;font:700 12px/22px 'Inter',system-ui,sans-serif;text-align:center;}\n#pmSide .pm-fill{flex:1;min-height:12px;}\n#pmSide .pm-pie{font-size:10.5px;color:#a9c9c9;text-align:center;padding:8px 4px 0;}\n\nbody.pm-side .app{max-width:1340px;margin:0 0 0 var(--pm-w);padding:16px 30px 80px;}\nbody.pm-side .topbar .brand{display:none;}\nbody.pm-side .topbar{justify-content:flex-end;min-height:0;padding-top:0;padding-bottom:0;}\nbody.pm-side .topbar-actions{margin-left:auto;}\n\n/* ---------- Encabezado del panel ---------- */\nbody.pm-on #screen-admin-hub > .helptext{display:none;}\nbody.pm-on #screen-admin-hub > .linkbtn{font-weight:600;color:var(--teal-dark);}\nbody.pm-on #screen-admin-hub > h2{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin:8px 0 14px;font-size:30px;line-height:1.15;font-style:italic;color:var(--deep);}\nbody.pm-on #screen-admin-hub > h2 .rol-chip{margin:0;font-style:normal;background:#E3F1F2;color:var(--teal-dark);border-color:#BFDDE0;font-size:12.5px;padding:7px 13px;}\nbody.pm-on #gdPend{display:none;}\n\n/* ---------- Acciones prioritarias ---------- */\n#pmResumen{margin:0 0 22px;}\n.pm-banner{display:flex;align-items:center;gap:12px;background:linear-gradient(100deg,var(--pm-side) 0%,#0F6A74 70%,#14808A 100%);color:#fff;border-radius:18px 18px 0 0;padding:14px 22px;font:700 24px/1.2 'Zilla Slab',Georgia,serif;}\n.pm-banner svg{width:30px;height:30px;fill:#FFD28A;stroke:none;flex:none;}\n.pm-banner b{color:#FFC27A;font-size:34px;margin:0 2px;}\n.pm-banner small{font:500 13px/1.3 'Inter',system-ui,sans-serif;color:#cfe8e8;margin-left:auto;text-align:right;}\n.pm-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;background:#fff;border:1px solid var(--line);border-top:0;border-radius:0 0 18px 18px;padding:14px;box-shadow:0 6px 22px rgba(11,61,61,.08);}\n.pm-col{border-radius:14px;overflow:hidden;display:flex;flex-direction:column;min-height:210px;border:1px solid rgba(0,0,0,.05);}\n.pm-col h3{margin:0;padding:13px 16px;color:#fff;font:700 15.5px/1.25 'Inter',system-ui,sans-serif;display:flex;align-items:center;gap:10px;}\n.pm-col h3 svg{width:22px;height:22px;flex:none;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}\n.pm-col h3 small{font-weight:500;opacity:.92;}\n.pm-col.urg{background:#FDEEEC;} .pm-col.urg h3{background:linear-gradient(90deg,var(--pm-urg1),var(--pm-urg2));}\n.pm-col.pro{background:#FFF3E5;} .pm-col.pro h3{background:linear-gradient(90deg,var(--pm-pro1),var(--pm-pro2));}\n.pm-col.ok{background:#E8F5EE;} .pm-col.ok h3{background:linear-gradient(90deg,var(--pm-ok1),var(--pm-ok2));}\n.pm-lista{display:flex;flex-direction:column;gap:9px;padding:12px;}\n.pm-fila{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:12px;padding:10px 12px;cursor:pointer;font:600 14px/1.25 'Inter',system-ui,sans-serif;color:var(--ink);box-shadow:0 1px 2px rgba(20,20,20,.05);transition:transform .12s,box-shadow .12s;}\n.pm-fila:hover,.pm-fila:focus-visible{transform:translateY(-1px);box-shadow:0 6px 16px rgba(11,61,61,.13);outline:none;}\n.pm-fila .ic{position:relative;font-size:26px;line-height:1;flex:none;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:#F6F1E7;}\n.pm-fila .nb{position:absolute;top:-7px;right:-9px;min-width:22px;height:22px;padding:0 5px;border-radius:11px;color:#fff;font:700 12px/22px 'Inter',system-ui,sans-serif;text-align:center;border:2px solid #fff;}\n.pm-col.urg .nb{background:#C0392B;} .pm-col.pro .nb{background:#C25A17;}\n.pm-fila .tx{flex:1;}\n.pm-fila .go{color:var(--muted);font-size:22px;line-height:1;}\n.pm-vacio{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:16px 14px;gap:4px;color:#5C5A52;font-size:13.5px;}\n.pm-vacio .chk{width:78px;height:78px;border-radius:50%;background:linear-gradient(135deg,var(--pm-ok1),#35B27F);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(27,127,85,.28);margin-bottom:6px;}\n.pm-vacio .chk svg{width:44px;height:44px;stroke:#fff;fill:none;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round;}\n.pm-vacio b{font:700 17px/1.2 'Inter',system-ui,sans-serif;color:var(--ink);}\n.pm-aldia{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:8px;}\n.pm-aldia span{background:#fff;border:1px solid #BFE0CF;border-radius:999px;padding:4px 10px;font-size:12px;color:#17603F;}\n.pm-carga{padding:22px;text-align:center;color:var(--muted);grid-column:1/-1;}\n\n/* ---------- Cat\u00e1logo de funciones ---------- */\nbody.pm-on #grupoGrid{display:flex;flex-direction:column;gap:16px;}\n.pm-cat-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}\n.pm-cat-head h3{margin:0;font:700 26px/1.1 'Zilla Slab',Georgia,serif;font-style:italic;color:var(--deep);display:flex;align-items:center;gap:10px;}\n.pm-cat-head h3 svg{width:28px;height:28px;stroke:var(--teal);fill:none;stroke-width:2;}\nbody.pm-on .fn-buscar{position:relative;margin:0;flex:0 1 420px;min-width:240px;}\nbody.pm-on .fn-buscar input{width:100%;border:1.5px solid #B9D5D8;border-radius:14px;padding:12px 78px 12px 16px;font:500 15px/1.2 'Inter',system-ui,sans-serif;background:#fff;box-shadow:0 2px 8px rgba(11,61,61,.07);}\nbody.pm-on .fn-buscar input:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px rgba(14,124,134,.18);}\n.pm-kbd{position:absolute;right:10px;top:50%;transform:translateY(-50%);font:600 12px/1 'Inter',system-ui,sans-serif;color:#4A6568;background:#EAF1F2;border:1px solid #CFDDDF;border-radius:8px;padding:6px 8px;pointer-events:none;}\nbody.pm-on .fn-seccion{margin:0;border-radius:18px;padding:12px 14px 16px;border:1px solid rgba(0,0,0,.05);background:#EEF4F4;}\nbody.pm-on #grupoSec-estudiantes{background:#E4F1F2;} body.pm-on #grupoSec-empresas{background:#FDF0E3;} body.pm-on #grupoSec-supervisores{background:#E8F0EC;}\nbody.pm-on #grupoSec-practica{background:#F4EFE3;} body.pm-on #grupoSec-seguridad{background:#EEE9F6;} body.pm-on #grupoSec-informes{background:#E6EEF8;} body.pm-on #grupoSec-comunicacion{background:#FBEAE7;}\nbody.pm-on .fn-sec-cab{display:flex;align-items:center;gap:10px;margin:0 0 10px;}\nbody.pm-on .fn-sec-cab h3{margin:0;font:700 21px/1.15 'Zilla Slab',Georgia,serif;font-style:italic;color:var(--deep);}\nbody.pm-on .fn-sec-cab p{margin:1px 0 0;font-size:12.5px;color:#5C6B6B;}\nbody.pm-on .fn-sec-ico{width:38px;height:38px;border-radius:11px;background:#fff !important;display:flex;align-items:center;justify-content:center;font-size:21px;box-shadow:0 1px 3px rgba(0,0,0,.08);flex:none;}\n.pm-vermas{margin-left:auto;border:0;background:transparent;color:var(--teal-dark);font:700 14px/1 'Inter',system-ui,sans-serif;cursor:pointer;padding:8px 6px;border-radius:8px;white-space:nowrap;}\n.pm-vermas:hover{text-decoration:underline;} .pm-vermas:focus-visible{outline:2px solid var(--teal);}\nbody.pm-on .fn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:12px;}\nbody.pm-on .fn-seccion.pm-corta .fn-card:nth-child(n+5){display:none;}\nbody.pm-on .fn-card{position:relative;flex-direction:row;align-items:center;gap:12px;background:#fff;border:1px solid rgba(0,0,0,.07);border-left:1px solid rgba(0,0,0,.07);border-radius:14px;padding:14px 34px 14px 14px;min-height:92px;box-shadow:0 1px 3px rgba(20,20,20,.06);}\nbody.pm-on .fn-card:hover,body.pm-on .fn-card:focus-visible{border-color:var(--teal);box-shadow:0 8px 20px rgba(11,61,61,.14);}\nbody.pm-on .fn-ico{width:46px;height:46px;border-radius:13px;font-size:24px;display:flex;align-items:center;justify-content:center;flex:none;background:#E4F1F2;}\nbody.pm-on .fn-card.empresa .fn-ico{background:#FCEBDD;} body.pm-on .fn-card.supervisor .fn-ico{background:#E4ECEB;} body.pm-on .fn-card.administrador .fn-ico{background:#EEE8F6;}\nbody.pm-on .fn-tit{font:700 14.5px/1.25 'Inter',system-ui,sans-serif;color:var(--ink);display:block;}\nbody.pm-on .fn-paso{display:inline-block;margin:0 6px 4px 0;padding:3px 9px;border-radius:999px;background:#DDEBF7;color:#1E4F7A;font:700 10.5px/1.2 'Inter',system-ui,sans-serif;letter-spacing:.03em;text-transform:uppercase;}\nbody.pm-on .fn-desc{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12.5px;line-height:1.35;color:#5E625F;margin-top:3px;}\nbody.pm-on .fn-go{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:24px;color:#8AA3A5;}\nbody.pm-on .fn-badge{position:absolute;top:-8px;right:-6px;}\nbody.pm-on .fn-badge .sa-badge{min-width:26px;height:26px;line-height:26px;font-size:13px;border:2px solid #fff;border-radius:13px;box-shadow:0 2px 6px rgba(192,57,43,.35);}\n\n/* ---------- Panel central: solo el resumen; las funciones aparecen al elegir una secci\u00f3n o al buscar ---------- */\nbody.pm-on:not(.pm-vista):not(.pm-buscando) #grupoGrid{display:none;}\nbody.pm-buscando #pmResumen{display:none;}\nbody.pm-on .fn-buscar{display:none;}\n#pmTop{margin:0 0 16px;}\n.pm-bus{position:relative;max-width:560px;}\n.pm-bus svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:20px;height:20px;stroke:#5B8A8F;fill:none;stroke-width:2;stroke-linecap:round;pointer-events:none;}\n.pm-bus input{width:100%;border:1.5px solid #B9D5D8;border-radius:14px;padding:12px 78px 12px 44px;font:500 15px/1.2 'Inter',system-ui,sans-serif;background:#fff;box-shadow:0 2px 8px rgba(11,61,61,.07);}\n.pm-bus input:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px rgba(14,124,134,.18);}\nbody:not(.pm-on) #pmTop{display:none;}\n/* Campana de notificaciones (arriba a la derecha) */\n#pmCampana{display:none;position:relative;width:46px;height:46px;border-radius:50%;border:1px solid #BFDDE0;background:#fff;color:var(--teal-dark);cursor:pointer;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(11,61,61,.12);margin-left:12px;}\n#pmCampana svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}\n#pmCampana:hover{background:#E3F1F2;} #pmCampana:focus-visible{outline:2px solid var(--teal);outline-offset:2px;}\nbody.pm-side #pmCampana.on{display:flex;}\n#pmCampana .pm-cn{position:absolute;top:-6px;right:-6px;min-width:22px;height:22px;padding:0 5px;border-radius:11px;background:#C0392B;color:#fff;font:700 12px/22px 'Inter',system-ui,sans-serif;text-align:center;border:2px solid #fff;}\nbody.pm-side #ntBell{display:none !important;}\n\n/* ---------- Secci\u00f3n abierta por separado (desde la barra lateral) ---------- */\nbody.pm-vista #pmResumen{display:none;}\nbody.pm-vista .fn-seccion.pm-oculta{display:none !important;}\n.pm-mig{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:15px;color:var(--muted);margin:2px 0 -4px;}\n.pm-mig button{border:1px solid #BFDDE0;background:#fff;color:var(--teal-dark);font:700 13.5px/1 'Inter',system-ui,sans-serif;padding:9px 14px;border-radius:999px;cursor:pointer;}\n.pm-mig button:hover{background:#E3F1F2;} .pm-mig button:focus-visible{outline:2px solid var(--teal);}\n.pm-mig b{font:700 26px/1.1 'Zilla Slab',Georgia,serif;font-style:italic;color:var(--deep);}\nbody.pm-vista .fn-seccion:not(.pm-oculta){padding-top:16px;}\nbody.pm-vista .fn-seccion:not(.pm-oculta) .fn-sec-cab h3{display:none;}\n\n/* ---------- Ayuda ---------- */\n#pmAyuda{position:fixed;inset:0;z-index:2100;background:rgba(10,30,32,.55);display:flex;align-items:center;justify-content:center;padding:16px;}\n#pmAyuda .caja{background:#fff;border-radius:16px;max-width:520px;width:100%;padding:22px 24px;box-shadow:0 20px 50px rgba(0,0,0,.3);max-height:88vh;overflow:auto;}\n#pmAyuda h3{margin:0 0 8px;font:700 22px/1.2 'Zilla Slab',Georgia,serif;color:var(--deep);}\n#pmAyuda ul{margin:8px 0 14px 18px;padding:0;font-size:14px;line-height:1.5;}\n#pmAyuda kbd{background:#EAF1F2;border:1px solid #CFDDDF;border-radius:6px;padding:1px 6px;font-size:12px;}\n\n/* ---------- Pantallas medianas y celulares ---------- */\n@media (max-width:1180px){ .pm-cols{grid-template-columns:1fr;} .pm-col{min-height:0;} }\n@media (max-width:900px){\n  body.pm-side #pmSide{position:fixed;top:0;left:0;right:0;bottom:auto;width:auto;height:56px;flex-direction:row;align-items:center;gap:6px;padding:6px 8px;overflow-x:auto;box-shadow:0 4px 16px rgba(11,61,61,.22);}\n  #pmSide .pm-logo,#pmSide .pm-logo-sub,#pmSide .pm-user,#pmSide .pm-fill,#pmSide .pm-pie{display:none;}\n  #pmSide .pm-nav{flex-direction:row;gap:4px;} #pmSide .pm-it{white-space:nowrap;padding:9px 12px;width:auto;border-left:0;border-bottom:3px solid transparent;}\n  #pmSide .pm-it.act{border-bottom-color:#F29A52;}\n  body.pm-side .app{margin:0;padding:68px 14px 40px;max-width:920px;}\n  body.pm-side .topbar .brand{display:flex;}\n  body.pm-on #screen-admin-hub > h2{font-size:24px;}\n  .pm-banner{font-size:19px;padding:12px 14px;flex-wrap:wrap;} .pm-banner b{font-size:28px;} .pm-banner small{margin-left:0;text-align:left;width:100%;}\n  .pm-cat-head h3{font-size:22px;} body.pm-on .fn-buscar{flex-basis:100%;}\n  body.pm-on .fn-grid{grid-template-columns:1fr;}\n}\n@media (prefers-reduced-motion:reduce){ .pm-fila,.fn-card,#pmSide .pm-it{transition:none !important;} }\n@media print{ #pmSide{display:none !important;} body.pm-side .app{margin:0;max-width:none;} }\n/* Dise\u00f1o moderno para estudiante, empresa y supervisor (mismo estilo del panel de administrador).\n   Se carga DESPU\u00c9S de styles.css y panel-moderno.css. Si no est\u00e1, las pantallas se ven como antes. */\nbody.pm-u #estTabs,body.pm-u #screen-ca-panel > .tabs{display:none;}\n.pmu-oculta{display:none !important;}\n#pmSide .pmu-emo{width:22px;text-align:center;font-size:18px;line-height:1;flex:none;}\n#pmSide .pm-nav{min-height:0;}\nbody.pm-u .status-strip{border-radius:14px;}\n#pmuRes{margin:0 0 18px;}\n.pmu-ruta .gd-lista,.pmu-ruta .gd-next,.pmu-ruta .gd-prog,.pmu-ruta > .section-bar{display:none;}\nbody.pm-u .pm-fila .tx small{display:block;color:var(--muted);font-size:12.5px;line-height:1.3;margin-top:2px;font-weight:400;}\nbody.pm-u .pm-fila.nolink{cursor:default;} body.pm-u .pm-fila.nolink:hover{transform:none;box-shadow:none;}\n.pmu-titulo{margin:2px 0 14px;font:700 28px/1.15 'Zilla Slab',Georgia,serif;font-style:italic;color:var(--deep);}\n@media (max-width:900px){\n  body.pm-u #pmSide .pm-nav{overflow-x:auto;max-width:100%;}\n  body.pm-u #pmSide .pm-it .pmu-emo{font-size:17px;}\n  .pmu-titulo{font-size:22px;}\n}\nbody.pm-u .screen.active .card:empty{display:none}\n"; document.head.appendChild(st); }catch(_){} })();

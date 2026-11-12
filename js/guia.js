/* ============================= RUTA GUIADA («Mi ruta») =============================
   Una sola pantalla que, según la modalidad y el momento en que va cada persona, muestra TODOS los pasos en orden,
   cuáles ya están hechos, cuál es el actual y un botón para ir directo a hacerlo.
   · Estudiante: pestaña «Mi ruta» (primera). · Empresa de contrato de aprendizaje: recuadro sobre sus pestañas.
   · Institución: panel «Pendientes por proceso» al inicio del panel de administración (requiere guia-ruta-etapa35.sql). */
const gdE = t => (typeof esc === 'function' ? esc(t) : String(t == null ? '' : t).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
const gdCA = m => /contrato.*aprendizaje/i.test(m || '');

/* paso: { t: título, d: detalle, e: 'hecho'|'actual'|'espera'|'pend', go: onclick, b: texto del botón } */
function gdPintar(pasos, titulo){
  // el primer paso que no está hecho es el actual
  let marcado = false;
  const ps = pasos.map(p=>{ const q = Object.assign({}, p); if(q.e === 'hecho') return q; if(!marcado){ marcado = true; if(q.e !== 'espera') q.e = 'actual'; q.foco = true; } else if(q.e !== 'espera') q.e = 'pend'; return q; });
  const hechos = ps.filter(p=>p.e === 'hecho').length, foco = ps.find(p=>p.foco);
  let h = '<div class="section-bar teal">' + gdE(titulo) + '</div>';
  h += '<div class="gd-prog"><div class="gd-prog-bar"><span style="width:' + Math.round(hechos * 100 / ps.length) + '%"></span></div><div class="gd-prog-txt">' + hechos + ' de ' + ps.length + ' pasos completados</div></div>';
  if(foco){
    h += '<div class="gd-next"><div class="gd-next-lbl">' + (foco.e === 'espera' ? '⏳ En espera' : '👉 Tu siguiente paso') + '</div><div class="gd-next-tit">' + gdE(foco.t) + '</div><div class="gd-next-det">' + gdE(foco.d || '') + '</div>' +
         (foco.go ? '<button class="primary" type="button" onclick="' + foco.go + '">' + gdE(foco.b || 'Ir a este paso') + '</button>' : '') + '</div>';
  } else h += '<div class="gd-next gd-ok"><div class="gd-next-tit">🎉 ¡Completaste todos los pasos!</div></div>';
  h += '<ol class="gd-lista">' + ps.map((p, i)=>'<li class="gd-paso gd-' + p.e + (p.foco ? ' gd-foco' : '') + '"><span class="gd-num">' + (p.e === 'hecho' ? '✔' : (i + 1)) + '</span><div class="gd-cuerpo"><div class="gd-tit">' + gdE(p.t) + '</div>' + (p.d ? '<div class="gd-det">' + gdE(p.d) + '</div>' : '') +
        (p.go && !p.foco && p.e !== 'pend' ? '<button class="ghost gd-btn" type="button" onclick="' + p.go + '">' + gdE(p.e === 'hecho' ? 'Ver' : (p.b || 'Abrir')) + '</button>' : '') + '</div></li>').join('') + '</ol>';
  return h;
}

/* ---------------- ESTUDIANTE ---------------- */
let gdRutaIniciada = '';
async function gdRutaEstudiante(){
  const el = document.getElementById('estRutaCard'); const rec = state.record; if(!el || !rec) return;
  el.innerHTML = '<div class="section-bar teal">Mi ruta</div><p class="helptext">Cargando tu ruta…</p>';
  const call = async (fn, a)=>{ try{ const r = await sb.rpc(fn, a || { p_token: state.token }); return r.error ? null : r.data; }catch(_){ return null; } };
  const [pr, conv] = await Promise.all([call('est_pr_estado'), call('est_convenio_estado')]);
  const esCA = gdCA(rec.modalidad) || !!conv;
  const ca = esCA ? await call('ca_mi_estado') : null;
  const asigData = (!esCA && rec.modalidad) ? await call('mis_cupos') : null;
  const sol = pr && pr.solicitud, mod = rec.modalidad;
  const ir = t => "showEstTab('" + t + "')";
  const pasos = [];
  // 1 · Solicitud de práctica
  let s1 = { t:'Solicitud de práctica', go: ir('sp'), b:'Abrir mi solicitud' };
  if(mod || (sol && sol.estado === 'aprobada')){ s1.e = 'hecho'; s1.d = 'Modalidad: ' + (mod || sol.modalidad); }
  else if(sol && sol.estado === 'enviada'){ s1.e = 'espera'; s1.d = 'Tu solicitud está en revisión por la institución.'; }
  else if(sol && sol.estado === 'devuelta'){ s1.e = 'actual'; s1.d = 'La institución la devolvió: corrige lo que indica y vuelve a enviarla.'; s1.b = 'Corregir solicitud'; }
  else if(sol && sol.estado === 'rechazada'){ s1.e = 'actual'; s1.d = 'Tu solicitud no fue aprobada. Revisa la observación o comunícate con la institución.'; }
  else { s1.e = 'actual'; s1.d = 'Elige tu modalidad de práctica, llena tus datos y adjunta los documentos en PDF.'; s1.b = 'Empezar mi solicitud'; }
  pasos.push(s1);
  const insc = ca && ca.inscripcion, post = ca && ca.postulacion;
  if(conv){
    const ok = conv.estado;
    pasos.push({ t:'Preinscripción al convenio', e:'hecho', d: 'Estás vinculado a ' + conv.empresa + ' (convenio «' + conv.nombre + '»).' });
    pasos.push({ t:'Completar tu hoja de vida', e: insc && insc.hv_completa ? 'hecho' : 'actual', d: insc && insc.hv_completa ? 'Hoja de vida completa.' : 'Es obligatoria para formalizar tu contrato.', go: ir('ca'), b:'Llenar mi hoja de vida' });
    pasos.push({ t:'Carta de fechas', e: ok === 'preinscrito' ? 'espera' : 'hecho', d: ok === 'preinscrito' ? 'La institución la prepara y la envía a la empresa y a tu correo.' : 'Enviada a tu correo y a la empresa.' });
    pasos.push({ t:'Formalización del contrato', e: ok === 'formalizado' ? 'hecho' : 'espera', d: ok === 'formalizado' ? 'Contrato formalizado: tus planillas están habilitadas.' : 'Cuando firmes el contrato, la institución lo formaliza y se habilitan tus planillas.' });
  } else if(esCA){
    pasos.push({ t:'Inscripción al proceso de contrato de aprendizaje', e: insc ? 'hecho' : 'actual', d: insc ? 'Inscrito.' : 'Inscríbete para que la institución verifique tus pagos.', go: ir('ca'), b:'Inscribirme' });
    const est = insc && insc.estado;
    pasos.push({ t:'Verificación de pagos (institución)', e: (est === 'apto' || est === 'contratado') ? 'hecho' : (est === 'pendiente' ? 'espera' : 'actual'), d: est === 'no_apto' ? 'La institución te marcó como no apto: ' + ((insc && insc.observacion) || 'comunícate con ella.') : (est === 'apto' || est === 'contratado') ? 'Eres apto.' : 'La institución verifica que tengas al día los pagos.', go: ir('ca'), b:'Ver estado' });
    pasos.push({ t:'Hoja de vida', e: insc && insc.hv_completa ? 'hecho' : 'actual', d: insc && insc.hv_completa ? 'Hoja de vida completa.' : 'Disponible cuando eres apto. Es obligatoria para postularte.', go: ir('ca'), b:'Llenar mi hoja de vida' });
    const contratado = est === 'contratado', selec = post && post.estado === 'seleccionado';
    pasos.push({ t:'Postulación y entrevistas', e: (contratado || selec) ? 'hecho' : 'actual', d: post && !selec ? 'Tu proceso con ' + post.empresa + ' («' + post.cargo + '») está ' + (post.estado === 'entrevista' ? 'en entrevista.' : 'postulado.') + (post.puede_decidir ? ' Ya puedes decidir si esperas o rechazas.' : '') : (contratado || selec) ? 'Fuiste seleccionado.' : 'Elige una oferta de tu programa y postúlate.', go: ir('ca'), b: post ? 'Ver mi proceso' : 'Ver ofertas' });
    pasos.push({ t:'Carta de fechas y confirmación de contratación', e: contratado ? 'hecho' : (selec ? 'espera' : 'pend'), d: contratado ? 'Contratación confirmada.' : selec ? 'Fuiste seleccionado por ' + post.empresa + '. La institución define tus fechas y confirma el contrato.' : 'Se activa cuando una empresa te selecciona.' });
  } else if(mod && asigData && asigData.aplica){
    const a = asigData.asignacion;
    pasos.push({ t:'Lugar de práctica asignado', e: a ? 'hecho' : 'actual', d: a ? 'Empresa: ' + a.empresa : (asigData.ventana && asigData.ventana.abierta ? 'La elección de cupos está abierta: elige tu empresa.' : 'Espera a que se abra la elección de cupos o te asignen un lugar.'), go: ir('asig'), b:'Elegir mi empresa' });
  }
  // Práctica en curso (notas y firmas)
  if(mod){
    const meses = typeof mesesPorModalidad === 'function' ? mesesPorModalidad(mod) : 6; let cal = 0, firm = 0;
    for(let i = 0; i < meses; i++){ if(COMPETENCIAS.some(c=>(rec.competencias[c.key] || [])[i])) cal++; if(rec.meses[i] && rec.meses[i].firmaEstudiante) firm++; }
    const habil = (!esCA) || (insc && insc.estado === 'contratado') || (conv && conv.estado === 'formalizado');
    pasos.push({ t:'Práctica en curso: notas y firmas', e: (cal && firm >= cal && cal === meses) ? 'hecho' : (habil ? 'actual' : 'pend'),
      d: habil ? 'Meses calificados por la empresa: ' + cal + ' de ' + meses + ' · Meses firmados por ti: ' + firm + '.' : 'Se habilita cuando tu contratación esté confirmada.', go: ir(cal > firm ? 'control' : 'notas'), b: cal > firm ? 'Revisar y firmar' : 'Ver mis notas' });
  }
  el.innerHTML = gdPintar(pasos, 'Mi ruta · ' + (mod || 'Práctica'));
}
(function(){
  if(typeof organizarPestanasEstudiante !== 'function') return;
  const _cards = cardsEstudiante;
  cardsEstudiante = function(){ const c = _cards(); const e = document.getElementById('estRutaCard'); if(e) c.ruta = e; return c; };
  const _org = organizarPestanasEstudiante;
  organizarPestanasEstudiante = function(){
    if(!document.getElementById('estRutaCard')){
      const host = document.getElementById('estDatosGenerales'); const card = host ? (host.classList.contains('card') ? host : host.closest('.card')) : null;
      if(card){ const d = document.createElement('div'); d.className = 'card'; d.id = 'estRutaCard'; card.insertAdjacentElement('beforebegin', d); }
    }
    _org();
    const bar = document.getElementById('estTabs');
    if(bar && document.getElementById('estRutaCard') && !document.getElementById('estTab-ruta')){
      const b = document.createElement('button'); b.className = 'tab'; b.id = 'estTab-ruta'; b.textContent = '🧭 Mi ruta'; b.onclick = ()=>showEstTab('ruta'); bar.insertBefore(b, bar.firstChild);
    }
    const doc = state.record && state.record.documento;
    if(doc && gdRutaIniciada !== doc){ gdRutaIniciada = doc; estTabActual = 'ruta'; }
    showEstTab(estTabActual);
  };
  const _show = showEstTab;
  showEstTab = function(tab){ _show(tab); if(tab === 'ruta') gdRutaEstudiante(); };
})();

/* ---------------- EMPRESA DE CONTRATO DE APRENDIZAJE ---------------- */
async function gdRutaEmpresa(){
  const host = document.getElementById('gdRutaEmp'); if(!host || !caEmp) return;
  const e = caEmp.empresa, of = caEmp.ofertas || [];
  let procs = []; try{ procs = (await caRpc('ca_emp_procesos', { p_token: state.token })) || []; }catch(_){}
  const n = (...es) => procs.filter(p=>es.includes(p.estado)).length;
  const ir = t => "caEmpIr('" + t + "')";
  const aprob = of.filter(o=>o.estado === 'aprobada'), pend = of.filter(o=>o.estado === 'pendiente');
  const pasos = [
    { t:'Registro aprobado por la institución', e: e.estado === 'aprobada' ? 'hecho' : 'espera', d: e.estado === 'aprobada' ? 'Tu empresa está aprobada.' : (e.estado === 'rechazada' ? 'No fue aprobada: ' + (e.observacion || 'comunícate con la institución.') : 'La institución verifica que aparezcas en la plataforma del SENA.') },
    { t:'Crear tu solicitud de aprendices', e: of.length ? 'hecho' : 'actual', d: of.length ? 'Tienes ' + of.length + ' solicitud(es).' : 'Indica cargo, programa, cupos, horario y funciones.', go: ir('ofertas') + ';caIrAlFormulario()', b:'Ir al formulario' },
    { t:'Aprobación de tu solicitud (institución)', e: aprob.length ? 'hecho' : (pend.length ? 'espera' : 'pend'), d: aprob.length ? aprob.length + ' solicitud(es) aprobada(s): ya la ven los estudiantes.' : (pend.length ? 'La institución verifica que las funciones correspondan al programa.' : 'Se activa cuando envías tu solicitud.') },
    { t:'Candidatos y entrevistas', e: (n('seleccionado', 'contratado')) ? 'hecho' : (aprob.length ? 'actual' : 'pend'), d: n('postulado', 'entrevista') ? 'Tienes ' + n('postulado', 'entrevista') + ' proceso(s) activo(s): entrevista y decide.' : 'Revisa candidatos aptos o espera las postulaciones.', go: ir(n('postulado', 'entrevista') ? 'proc' : 'cand'), b: n('postulado', 'entrevista') ? 'Ver procesos' : 'Ver candidatos' },
    { t:'Selección y carta de fechas', e: n('contratado') ? 'hecho' : (n('seleccionado') ? 'espera' : 'pend'), d: n('seleccionado') ? n('seleccionado') + ' aprendiz(ces) seleccionado(s): solicita la carta de fechas; la institución confirma la contratación.' : 'Cuando selecciones a un aprendiz, solicita su carta de fechas.', go: ir('proc'), b:'Ir a procesos' },
    { t:'Calificar las planillas', e: n('contratado') ? 'actual' : 'pend', d: n('contratado') ? n('contratado') + ' aprendiz(ces) contratado(s): asigna las notas de cada mes.' : 'Se habilita cuando la institución confirma la contratación.', go: ir('plan'), b:'Calificar aprendices' }
  ];
  host.innerHTML = gdPintar(pasos, 'Mi ruta · Contrato de aprendizaje');
}
(function(){
  if(typeof caPintarPanel !== 'function') return;
  const _p = caPintarPanel;
  caPintarPanel = async function(){
    await _p.apply(this, arguments);
    const scr = document.getElementById('screen-ca-panel'); if(!scr) return;
    let h = document.getElementById('gdRutaEmp');
    if(!h){ h = document.createElement('div'); h.id = 'gdRutaEmp'; h.className = 'card gd-caja'; const tabs = scr.querySelector('.tabs'); if(tabs) tabs.insertAdjacentElement('beforebegin', h); else scr.appendChild(h); }
    gdRutaEmpresa();
  };
})();

/* ---------------- INSTITUCIÓN: pendientes por proceso ---------------- */
const GD_PROCESOS = [
  { n:'1 · Acceso y solicitud', it:[ ['solicitudes_acceso', 'Solicitudes de acceso', 'admin_solicitudes_pendientes'], ['solicitudes_practica', 'Solicitudes de práctica', 'admin_sol_pr_pendientes'] ] },
  { n:'2 · Contrato de aprendizaje', it:[ ['ca_inscripciones', 'Inscripciones por verificar', null, 'Contrato de aprendizaje'], ['ca_empresas', 'Empresas por aprobar', null, 'Empresas de contrato de aprendizaje'], ['ca_ofertas', 'Solicitudes de aprendices por aprobar', null, 'Solicitudes de aprendices'], ['ca_confirmar', 'Aprendices por confirmar', null, 'Contrato de aprendizaje'], ['ca_cartas', 'Cartas de fechas por definir', null, 'Contrato de aprendizaje'] ] },
  { n:'3 · Convenios', it:[ ['convenio_cartas', 'Cartas de convenio por enviar', null, 'Contrato de aprendizaje · Convenio'], ['convenio_formalizar', 'Estudiantes por formalizar', null, 'Contrato de aprendizaje · Convenio'] ] },
  { n:'4 · Prácticas y seguimiento', it:[ ['notas_subir', 'Notas por subir al sistema', 'admin_notas_por_subir_n', 'Notas por subir al sistema'], ['lugares', 'Empresas por confirmar', 'admin_lugares_pendientes'], ['visitas', 'Estudiantes esperando supervisor', 'admin_visitas_pendientes', 'Visitas por asignar'], ['cambios', 'Cambios de empresa', 'admin_cambios_pendientes'], ['asistencia', 'Inasistencias por revisar', 'admin_asis_pendientes', 'Inasistencias reportadas'] ] }
];
async function gdPendientes(){
  const hub = document.getElementById('screen-admin-hub'); if(!hub) return;
  if(typeof permAdmin !== 'undefined' && !permAdmin.listo){ setTimeout(gdPendientes, 1500); return; }   // espera a conocer los permisos del rol
  let box = document.getElementById('gdPend');
  if(!box){ box = document.createElement('div'); box.id = 'gdPend'; box.className = 'card gd-caja'; const h2 = hub.querySelector('h2'); if(h2) h2.insertAdjacentElement('afterend', box); else hub.insertBefore(box, hub.firstChild); }
  const ex = {}; try{ const r = await sb.rpc('admin_ruta_pendientes'); if(!r.error && r.data) Object.assign(ex, r.data); }catch(_){}
  const vals = {};
  await Promise.all(GD_PROCESOS.flatMap(p=>p.it).map(async it=>{
    if(it[2]){ try{ const r = await sb.rpc(it[2]); vals[it[0]] = r.error ? null : r.data; }catch(_){ vals[it[0]] = null; } } else vals[it[0]] = ex[it[0]];
  }));
  // numerito rojo en las tarjetas del panel que tienen algo pendiente
  const poner = (titulo, n, tip)=>{ const c = [...document.querySelectorAll('.fn-card')].find(x=>x.getAttribute('data-fn') === titulo); const sl = c && c.querySelector('.fn-badge'); if(sl) sl.innerHTML = n ? '<span class="sa-badge" title="' + tip + '">' + n + '</span>' : ''; };
  const v = k => Number(vals[k]) || 0;
  poner('Empresas de contrato de aprendizaje', v('ca_empresas'), 'Empresas esperando aprobación');
  poner('Solicitudes de aprendices', v('ca_ofertas'), 'Solicitudes esperando aprobación');
  poner('Contrato de aprendizaje', v('ca_inscripciones') + v('ca_confirmar') + v('ca_cartas'), 'Inscripciones, confirmaciones y cartas por atender');
  poner('Contrato de aprendizaje · Convenio', v('convenio_cartas') + v('convenio_formalizar'), 'Cartas por enviar y estudiantes por formalizar');
  // SEGURIDAD DE LA VISTA: un pendiente solo se muestra si la tarjeta de su función es visible para este rol (si no la ve, tampoco ve el pendiente)
  const tarjetaVisible = i=>{ const t = i[3] || i[1]; return [...document.querySelectorAll('.fn-card')].some(x=>{ const d = x.getAttribute('data-fn') || ''; return d === t || d.indexOf(t) === 0; }); };
  const grupos = GD_PROCESOS.map(p=>({ n:p.n, it:p.it.filter(i=>vals[i[0]] !== null && vals[i[0]] !== undefined && tarjetaVisible(i)) })).filter(g=>g.it.length);
  const total = grupos.reduce((a, g)=>a + g.it.reduce((b, i)=>b + (Number(vals[i[0]]) || 0), 0), 0);
  box.innerHTML = '<div class="section-bar teal">Pendientes por proceso</div><p class="helptext">' + (total ? 'Tienes <b>' + total + '</b> pendiente(s). Están en el orden en que ocurren los procesos; pulsa uno para atenderlo.' : '🎉 No hay pendientes por atender.') + '</p>' +
    grupos.map(g=>'<div class="gd-grupo"><div class="gd-grupo-t">' + gdE(g.n) + '</div><div class="gd-chips">' + g.it.map(i=>{ const v = Number(vals[i[0]]) || 0; return '<button type="button" class="gd-chip ' + (v ? 'on' : '') + '" onclick="gdAbrirFn(\'' + gdE(i[3] || i[1]).replace(/'/g, '&#39;') + '\')"><b>' + v + '</b><span>' + gdE(i[1]) + '</span></button>'; }).join('') + '</div></div>').join('');
}
function gdAbrirFn(titulo){
  const c = [...document.querySelectorAll('.fn-card')].find(x=>x.getAttribute('data-fn') === titulo) || [...document.querySelectorAll('.fn-card')].find(x=>(x.getAttribute('data-fn') || '').indexOf(titulo) === 0);
  if(c) c.click(); else if(typeof toast === 'function') toast('Esa función no está habilitada para tu rol', true);
}
(function(){
  if(typeof showScreen !== 'function') return;
  const _s = showScreen;
  showScreen = function(id){ const r = _s.apply(this, arguments); if(id === 'screen-admin-hub' && typeof sb !== 'undefined' && sb) setTimeout(()=>{ try{ gdPendientes(); }catch(_){} }, 600); return r; };
})();
setInterval(()=>{ const hub = document.getElementById('screen-admin-hub'); if(hub && hub.classList.contains('active') && typeof sb !== 'undefined' && sb) gdPendientes(); }, 60000);

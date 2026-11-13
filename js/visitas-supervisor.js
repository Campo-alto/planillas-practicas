/* ============================= MIS VISITAS ASIGNADAS (supervisor) =============================
   Al entrar como supervisor se ve la lista de estudiantes que el supervisor general le asignó. Mientras una visita está a su cargo,
   ningún otro supervisor puede abrir a ese estudiante (lo impone la base de datos). Al terminar, «Finalizar seguimiento» la cierra.
   Requiere visitas-supervisor-general-etapa25.sql. */
let svVisitas = [], svFechas = {}, svDisp = [], svPerms = null;
/* Funciones habilitadas al rol «Supervisor» en Roles y permisos (null = aún no se sabe; antes de la etapa 54 todo está permitido salvo el reporte).
   Esto solo ordena lo que se VE: la base de datos rechaza cualquier función sin permiso (rol-supervisor-etapa54.sql). */
function svPuede(m){ return svPerms === null ? (m !== 'supv_reporte' && m.indexOf('supa_') !== 0) : svPerms.indexOf(m) >= 0; }
async function svPermisos(){
  if(typeof state === 'undefined' || !state.token){ return; }
  const { data, error } = await sb.rpc('sup_mis_permisos', { p_token: state.token });
  if(error){ svPerms = /PGRST202|42883|Could not find the function|does not exist/i.test(String(error.message) + ' ' + String(error.code)) ? null : []; }
  else svPerms = data || [];
}

function svTarjeta(){
  let c = document.getElementById('svVisitasCard');
  if(!c){
    const lk = document.getElementById('screen-lookup'); if(!lk) return null;
    c = document.createElement('div'); c.className = 'card'; c.id = 'svVisitasCard';
    const form = lk.querySelector('.card'); form.parentNode.insertBefore(c, form.nextSibling);
  }
  return c;
}
async function svCargar(){
  if(typeof state === 'undefined' || state.role !== 'supervisor' || !state.token) return;
  const c = svTarjeta(); if(!c) return;
  c.style.display = 'block';
  c.innerHTML = '<div class="section-bar deep">Mis visitas asignadas</div><p style="color:var(--muted)">Cargando…</p>';
  const { data, error } = await sb.rpc('sup_mis_visitas', { p_token: state.token });
  if(error){ c.innerHTML = '<div class="section-bar deep">Mis visitas asignadas</div><p style="color:var(--muted);font-size:13px;">No se pudo cargar la lista (' + esc(error.message) + ').</p>'; return; }
  svVisitas = data || [];
  svFechas = {}; try{ const r = await sb.rpc('sup_visitas_fechas', { p_token: state.token }); (r.data || []).forEach(x=>{ (svFechas[x.documento] = svFechas[x.documento] || {})[x.visita] = x; }); }catch(_){}
  const f = iso => new Date(iso).toLocaleDateString('es-CO', { timeZone:'America/Bogota', day:'2-digit', month:'2-digit', year:'numeric' });
  const etq = l => !l ? '' : ({ pendiente:'<span class="cor-est cor-pendiente">Falta tu concepto</span>', apto:'<span class="cor-est cor-enviado">Lugar apto</span>', confirmada:'<span class="cor-est cor-enviado">Lugar apto · empresa con acceso</span>' }[l.estado] || '');
  c.innerHTML = '<div class="section-bar deep">Mis visitas asignadas</div>' + (svVisitas.length
    ? '<p class="helptext">Estos estudiantes están bajo tu responsabilidad: ningún otro supervisor puede ver su información mientras la visita esté asignada a ti. En RLP y RAP, después de visitar el lugar debes registrar tu <b>concepto</b>: si es apto la empresa recibe su acceso; si no, el estudiante podrá elegir otro lugar.</p><div class="cupos-wrap"><table class="cupos-table"><thead><tr><th>Estudiante</th><th>Modalidad</th><th>Lugar de prácticas</th><th>Asignada y fechas de visita</th><th></th></tr></thead><tbody>' +
      svVisitas.map((v,i)=>{ const l = v.lugar; return `<tr><td><b>${esc(v.nombre || '')}</b><br><span class="aud-ref">Doc. ${esc(v.documento)}</span>${v.nota ? '<br><i>' + esc(v.nota) + '</i>' : ''}</td>
        <td>${esc(v.modalidad)}</td>
        <td>${l ? '<b>' + esc(l.nombre) + '</b>' + (l.intento > 1 ? ' <span class="aud-ref">(lugar n.º ' + l.intento + ')</span>' : '') + '<br><span class="aud-ref">' + esc([l.direccion, l.ciudad].filter(Boolean).join(', ') || '—') + '<br>Contacto: ' + esc(l.contacto || '—') + (l.telefono ? ' · ' + esc(l.telefono) : '') + '</span><br>' + etq(l) + (l.observaciones ? '<br><i>' + esc(l.observaciones) + '</i>' : '') : esc(v.sitio || '—')}</td>
        <td class="aud-nw">${f(v.asignada)}<br>${svFechasHtml(v.documento)}</td>
        <td>${svPuede('supv_registrar') || svPuede('supv_mis_visitas') ? `<button class="primary" onclick="svAbrir(${i})">Abrir</button>` : ''} ${svPuede('supv_fechas') ? `<button class="ghost" onclick="svFechaModal('${esc(v.documento)}', null)">📅 ${svEsRap(v.modalidad) ? 'Fecha de la reunión' : 'Fecha de visita'}</button>` : ''} ${svPuede('supv_registrar') && l && l.estado === 'pendiente' ? `<button class="primary" onclick="svConcepto(${i})">Concepto del lugar</button>` : ''} ${svPuede('supv_registrar') ? `<button class="ghost" onclick="svFinalizar(${i})">Finalizar seguimiento</button>` : ''}</td></tr>`; }).join('') + '</tbody></table></div>'
    : '<p style="color:var(--muted);font-size:13.5px;">No tienes visitas asignadas por ahora. Cuando el supervisor general te asigne una, la verás aquí y recibirás un correo.</p>');
}
/* Concepto sobre el lugar de prácticas, después de visitarlo */
function svConcepto(i){
  const v = svVisitas[i], l = v.lugar;
  const prev = document.getElementById('svModal'); if(prev) prev.remove();
  const m = document.createElement('div'); m.id = 'svModal'; m.className = 'cor-modal';
  m.innerHTML = `<div class="cor-caja" role="dialog" aria-modal="true" style="max-width:600px;">
    <h3 style="margin:0 0 4px;">Concepto del lugar de prácticas</h3>
    <p class="helptext" style="margin:0 0 8px;"><b>${esc(l.nombre)}</b> · ${esc(v.nombre)} (Doc. ${esc(v.documento)})</p>
    <div class="field"><label>¿El lugar es apto para la práctica del estudiante? *</label>
      <select id="svConc" onchange="svConcCambio()"><option value="">Elegir…</option><option value="apto">✔ Apto</option><option value="condiciones">⚠ Apto con condiciones</option><option value="no_apto">✖ No apto</option></select></div>
    <div class="field"><label>Fecha de la visita</label><input type="date" id="svFecha" value="${new Date().toLocaleDateString('en-CA', { timeZone:'America/Bogota' })}"></div>
    <div class="field"><label id="svObsEt">Observaciones</label><textarea id="svObs" rows="4" maxlength="800" style="width:100%;"></textarea></div>
    <div id="svAviso" class="note-box" style="display:none;"></div>
    <div id="svMsg" style="margin-top:6px;font-size:13px;"></div>
    <div class="actions-row" style="justify-content:flex-end;margin-top:10px;"><button class="ghost" onclick="document.getElementById('svModal').remove()">Cancelar</button><button class="primary" id="svGuardar" onclick="svEnviarConcepto(${i})">Registrar concepto</button></div></div>`;
  document.body.appendChild(m);
}
function svConcCambio(){
  const c = document.getElementById('svConc').value, a = document.getElementById('svAviso'), et = document.getElementById('svObsEt');
  et.textContent = c === 'no_apto' ? 'Motivo por el que NO es apto *' : (c === 'condiciones' ? 'Condiciones que debe cumplir *' : 'Observaciones');
  a.style.display = c ? 'block' : 'none';
  a.textContent = c === 'no_apto' ? 'El estudiante recibirá el motivo y podrá elegir otro lugar (si ya agotó su límite, el caso pasa a coordinación).'
    : 'La empresa recibirá su usuario y contraseña para calificar a este estudiante.';
}
async function svEnviarConcepto(i){
  const v = svVisitas[i], c = document.getElementById('svConc').value, obs = document.getElementById('svObs').value.trim(), msg = document.getElementById('svMsg');
  if(!c){ msg.innerHTML = '<span style="color:var(--danger)">Elige el concepto.</span>'; return; }
  if(c !== 'apto' && obs.length < 5){ msg.innerHTML = '<span style="color:var(--danger)">Escribe ' + (c === 'no_apto' ? 'el motivo' : 'las condiciones') + '.</span>'; return; }
  if(!confirm('¿Registrar el lugar como ' + ({ apto:'APTO', condiciones:'APTO CON CONDICIONES', no_apto:'NO APTO' }[c]) + '? No se puede cambiar después.')) return;
  document.getElementById('svGuardar').disabled = true;
  const { data, error } = await sb.rpc('sup_lugar_concepto', { p_token: state.token, p_documento: v.documento, p_concepto: c, p_obs: obs, p_fecha: document.getElementById('svFecha').value || null });
  if(error){ document.getElementById('svGuardar').disabled = false; msg.innerHTML = '<span style="color:var(--danger)">' + esc(error.message) + '</span>'; return; }
  document.getElementById('svModal').remove();
  try{ sb.functions.invoke('enviar-correo', { body:{ action:'notificar_solicitud' } }).then(()=>{}, ()=>{}); }catch(_){}   // envía los avisos en cola (estudiante / encargado)
  toast(data.resultado === 'apto' ? 'Concepto registrado: lugar apto. El asistente creará el acceso de la empresa.'
      : data.resultado === 'no_apto' ? 'Concepto registrado: el estudiante podrá elegir otro lugar.' : 'Concepto registrado: el caso pasó a coordinación.');
  svCargar();
}

/* ---- Fechas de visita concretadas con el estudiante (1.ª y 2.ª) ---- */
/* RAP: una sola reunión; en ella se llenan las dos visitas */
function svEsRap(m){ return /previos|\brap\b/i.test(String(m || '')); }
function svModDoc(doc){ const v = svVisitas.find(x=>x.documento === doc) || svDisp.find(x=>x.documento === doc) || {}; return v.modalidad || ''; }
function svFmtFecha(x){ if(!x) return ''; const p = String(x.fecha).slice(0,10).split('-'); return p[2] + '/' + p[1] + '/' + p[0] + (x.hora ? ' ' + esc(x.hora) : ''); }
function svFechasHtml(doc){
  const f = svFechas[doc] || {};
  if(svEsRap(svModDoc(doc))) return '<span class="aud-ref">Reunión única: ' + (f[1] ? '<b>' + svFmtFecha(f[1]) + '</b>' : 'sin fecha') + '<br>(se llenan las 2 visitas)</span>';
  return '<span class="aud-ref">Visita 1: ' + (f[1] ? '<b>' + svFmtFecha(f[1]) + '</b>' : 'sin fecha') + '<br>Visita 2: ' + (f[2] ? '<b>' + svFmtFecha(f[2]) + '</b>' : 'sin fecha') + '</span>';
}
// doc: documento del estudiante · tomar: datos del estudiante si aún no está a mi cargo (lo toma al guardar)
function svFechaModal(doc, tomar){
  const f = svFechas[doc] || {}; const nombre = tomar ? tomar.nombre : ((svVisitas.find(v=>v.documento === doc) || {}).nombre || doc);
  const rap = svEsRap(tomar ? tomar.modalidad : svModDoc(doc));
  const sug = rap ? 1 : (tomar ? (tomar.hecha1 ? 2 : 1) : (f[1] ? 2 : 1));
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone:'America/Bogota' });
  const prev = document.getElementById('svModal'); if(prev) prev.remove();
  const m = document.createElement('div'); m.id = 'svModal'; m.className = 'cor-modal';
  m.innerHTML = `<div class="cor-caja" role="dialog" aria-modal="true" style="max-width:520px;">
    <h3 style="margin:0 0 4px;">${tomar ? (rap ? 'Tomar estudiante y programar la reunión' : 'Tomar estudiante y programar visita') : (rap ? 'Fecha de la reunión' : 'Fecha de la visita')}</h3>
    <p class="helptext" style="margin:0 0 8px;"><b>${esc(nombre)}</b> (Doc. ${esc(doc)})${tomar ? '<br>Al guardar, el estudiante queda <b>a tu cargo</b> y bloqueado para los demás supervisores.' : ''}<br>Escribe la fecha que <b>concretaste con el estudiante</b>. Él recibirá un correo con la fecha.</p>
    <div class="field-row">
      ${rap ? `<input type="hidden" id="svVisita" value="1"><div class="field" style="grid-column:1/-1;flex:1 1 100%;width:100%;"><div class="note-box" style="margin:0;">En <b>RAP</b> hay <b>una sola reunión</b>: en ella se llenan las dos visitas. Esta fecha queda para ambas.</div></div>` : `<div class="field"><label>Visita *</label><select id="svVisita" onchange="svVisitaCambio('${esc(doc)}')"><option value="1"${sug === 1 ? ' selected' : ''}>Visita 1</option><option value="2"${sug === 2 ? ' selected' : ''}>Visita 2</option></select></div>`}
      <div class="field"><label>Fecha *</label><input type="date" id="svFechaV" min="${hoy}"></div>
      <div class="field"><label>Hora (opcional)</label><input type="time" id="svHoraV"></div>
    </div>
    <div id="svMsg" style="margin-top:6px;font-size:13px;"></div>
    <div class="actions-row" style="justify-content:flex-end;margin-top:10px;"><button class="ghost" onclick="document.getElementById('svModal').remove()">Cancelar</button><button class="primary" id="svGuardarF" onclick="svGuardarFecha('${esc(doc)}', ${tomar ? 'true' : 'false'})">${tomar ? 'Tomar y programar' : 'Guardar y avisar al estudiante'}</button></div></div>`;
  document.body.appendChild(m); svVisitaCambio(doc);
}
function svVisitaCambio(doc){
  const n = Number(document.getElementById('svVisita').value), x = (svFechas[doc] || {})[n];
  document.getElementById('svFechaV').value = x ? String(x.fecha).slice(0,10) : ''; document.getElementById('svHoraV').value = x ? (x.hora || '') : '';
}
async function svGuardarFecha(doc, tomar){
  const msg = document.getElementById('svMsg'), fecha = document.getElementById('svFechaV').value, hora = document.getElementById('svHoraV').value, visita = Number(document.getElementById('svVisita').value);
  if(!fecha){ msg.innerHTML = '<span style="color:var(--danger)">Escribe la fecha que concretaste con el estudiante.</span>'; return; }
  const btn = document.getElementById('svGuardarF'); btn.disabled = true;
  const { data, error } = await sb.rpc(tomar ? 'sup_visita_tomar' : 'sup_visita_fecha', { p_token: state.token, p_documento: doc, p_visita: visita, p_fecha: fecha, p_hora: hora || '' });
  if(error){ btn.disabled = false; msg.innerHTML = '<span style="color:var(--danger)">' + esc(error.message) + (/does not exist|Could not find/i.test(error.message) ? ' (¿ejecutaste visitas-fechas-etapa42.sql?)' : '') + '</span>'; if(tomar) svDisponibles(); return; }
  document.getElementById('svModal').remove();
  if(!data.aviso_correo){ toast((data.unica ? 'Reunión programada' : 'Visita ' + visita + ' programada') + ', pero el estudiante no tiene un correo válido: avísale tú.', true); svCargar(); return; }
  // El aviso por correo queda en cola; la plataforma te pregunta «¿Enviar el correo ahora?» (js/correos-pregunta.js)
  toast((data.unica ? 'Reunión programada (vale para las dos visitas)' : 'Visita ' + visita + ' programada') + '. El aviso al estudiante está listo para enviar.');
  svCargar();
}

/* ---- Lista de estudiantes disponibles: el supervisor toma uno y concreta la fecha ---- */
function svTarjetaDisp(){
  let c = document.getElementById('svDispCard');
  if(!c){ const a = svTarjeta(); if(!a) return null; c = document.createElement('div'); c.className = 'card'; c.id = 'svDispCard'; a.parentNode.insertBefore(c, a.nextSibling); }
  return c;
}
async function svDisponibles(){
  if(typeof state === 'undefined' || state.role !== 'supervisor' || !state.token) return;
  const c = svTarjetaDisp(); if(!c) return; c.style.display = 'block';
  const q = (document.getElementById('svDispQ') || {}).value || '';
  if(!document.getElementById('svDispQ')) c.innerHTML = '<div class="section-bar teal">Estudiantes disponibles para visita</div><p class="helptext">Estos estudiantes aún no tienen supervisor. Comunícate con el estudiante, acuerden la fecha de la <b>visita 1 o 2</b> y pulsa «Tomar y programar»: quedará a tu cargo (bloqueado para los demás supervisores) y recibirá un correo con la fecha.</p><div class="lista-top"><input type="search" id="svDispQ" class="lista-busca" placeholder="🔎 Buscar por nombre o documento…" oninput="clearTimeout(window._svT);window._svT=setTimeout(svDisponibles,350)"></div><div id="svDispLista"><p style="color:var(--muted)">Cargando…</p></div>';
  const { data, error } = await sb.rpc('sup_estudiantes_disponibles', { p_token: state.token, p_texto: q || null });
  const l = document.getElementById('svDispLista'); if(!l) return;
  if(error){ l.innerHTML = '<p style="color:var(--muted);font-size:13px;">No se pudo cargar la lista (' + esc(error.message) + ')' + (/does not exist|Could not find/i.test(error.message) ? ' ¿Ejecutaste visitas-fechas-etapa42.sql?' : '') + '</p>'; return; }
  svDisp = data || [];
  l.innerHTML = !svDisp.length ? '<p style="color:var(--muted);font-size:13.5px;">No hay estudiantes disponibles' + (q ? ' con esa búsqueda' : ' por ahora') + '.</p>' :
    '<div class="cupos-wrap"><table class="cupos-table"><thead><tr><th>Estudiante</th><th>Contacto</th><th>Modalidad / programa</th><th>Lugar de prácticas</th><th>Visitas</th><th></th></tr></thead><tbody>' +
    svDisp.map((e,i)=>`<tr><td><b>${esc(e.nombre || '')}</b><br><span class="aud-ref">Doc. ${esc(e.documento)}</span></td>
      <td><span class="aud-ref">${esc(e.telefono || '—')}<br>${esc(e.correo || '—')}</span></td><td>${esc(e.modalidad || '—')}<br><span class="aud-ref">${esc(e.programa || '')}</span></td><td>${esc(e.sitio || '—')}</td>
      <td class="aud-nw">${svEsRap(e.modalidad) ? `<span class="aud-ref">Reunión única: ${e.hecha1 && e.hecha2 ? '✔ hecha' : (e.fecha1 ? svFmtFecha({ fecha:e.fecha1 }) : 'pendiente')}</span>` : `<span class="aud-ref">V1: ${e.hecha1 ? '✔ hecha' : (e.fecha1 ? svFmtFecha({ fecha:e.fecha1 }) : 'pendiente')}<br>V2: ${e.hecha2 ? '✔ hecha' : (e.fecha2 ? svFmtFecha({ fecha:e.fecha2 }) : 'pendiente')}</span>`}</td>
      <td><button class="primary" onclick="svTomar(${i})">Tomar y programar</button></td></tr>`).join('') + '</tbody></table></div>';
}
function svTomar(i){ const e = svDisp[i]; if(e) svFechaModal(e.documento, e); }
(function(){ const _c = svCargar; svCargar = async function(){ const r = await _c.apply(this, arguments); try{ svDisponibles(); }catch(_){} return r; }; })();

function svAbrir(i){ document.getElementById('lookupDoc').value = svVisitas[i].documento; doLookup(); }
async function svFinalizar(i){
  const v = svVisitas[i];
  if(!confirm('¿Finalizar el seguimiento de ' + v.nombre + '?\nEl estudiante quedará liberado: ya no figurará en tu lista.')) return;
  const { error } = await sb.rpc('sup_visita_finalizar', { p_token: state.token, p_documento: v.documento });
  if(error){ toast(error.message, true); return; }
  toast('Seguimiento finalizado'); svCargar();
}
(function(){
  if(typeof goRole !== 'function') return;
  const _go = goRole;
  goRole = function(role){
    const r = _go.apply(this, arguments);
    const c = document.getElementById('svVisitasCard');
    if(role === 'supervisor') setTimeout(svCargar, 0); else if(c) c.style.display = 'none';
    return r;
  };
})();


/* ---- Rol «Supervisor» (etapa 54): oculta lo que el administrador no habilitó y ofrece el reporte de visitas (solo lectura) ---- */
(function(){
  const _dis = svDisponibles;
  svDisponibles = async function(){
    const c = document.getElementById('svDispCard');
    if(!svPuede('supv_disponibles')){ if(c) c.style.display = 'none'; return; }
    return _dis.apply(this, arguments);
  };
  const _car = svCargar;
  svCargar = async function(){
    if(typeof state === 'undefined' || state.role !== 'supervisor' || !state.token) return;
    await svPermisos();
    const lk = document.querySelector('#screen-lookup .card'); if(lk) lk.style.display = svPuede('supv_consultar') ? '' : 'none';
    if(!svPuede('supv_mis_visitas')){
      const c = svTarjeta(); if(c) c.style.display = 'none';
      try{ await svDisponibles(); }catch(_){}
    } else {
      await _car.apply(this, arguments);
    }
    svReporteTarjeta();
    const nada = ['supv_mis_visitas', 'supv_disponibles', 'supv_consultar', 'supv_reporte'].every(m=>!svPuede(m));
    let av = document.getElementById('svSinPermisos');
    if(nada){
      if(!av){ av = document.createElement('div'); av.id = 'svSinPermisos'; av.className = 'note-box'; const l = document.getElementById('screen-lookup'); if(l) l.appendChild(av); }
      av.textContent = 'Tu rol de supervisor no tiene funciones habilitadas por ahora. Pídele al administrador que las habilite en «Roles y permisos».'; av.style.display = '';
    } else if(av) av.style.display = 'none';
  };
})();

// Al entrar con otro rol (la pantalla de búsqueda es la misma) se esconde todo lo del supervisor y se devuelve la búsqueda
(function(){
  if(typeof goRole !== 'function') return;
  const _go = goRole;
  goRole = function(role){
    const r = _go.apply(this, arguments);
    if(role !== 'supervisor'){
      ['svReporteCard', 'svSinPermisos', 'svDispCard'].forEach(id=>{ const e = document.getElementById(id); if(e) e.style.display = 'none'; });
      const lk = document.querySelector('#screen-lookup .card'); if(lk) lk.style.display = '';
    }
    return r;
  };
})();

let svRepDatos = [];
function svReporteTarjeta(){
  let c = document.getElementById('svReporteCard');
  if(!svPuede('supv_reporte')){ if(c) c.style.display = 'none'; return; }
  if(!c){
    const lk = document.getElementById('screen-lookup'); if(!lk) return;
    c = document.createElement('div'); c.className = 'card'; c.id = 'svReporteCard'; lk.appendChild(c);
    c.innerHTML = '<div class="section-bar deep">Reporte de visitas</div><p class="helptext">Consulta, solo para lectura, las visitas asignadas a todos los supervisores. No incluye datos de contacto de los estudiantes.</p><div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="svReporteCargar()">Ver / actualizar el reporte</button></div><div id="svReporteLista"></div>';
  }
  c.style.display = 'block';
}
async function svReporteCargar(){
  const l = document.getElementById('svReporteLista'); if(!l) return;
  l.innerHTML = '<p style="color:var(--muted)">Cargando…</p>';
  const { data, error } = await sb.rpc('sup_reporte_visitas', { p_token: state.token });
  if(error){ l.innerHTML = '<p style="color:var(--danger);font-size:13px;">' + esc(error.message) + '</p>'; return; }
  svRepDatos = data || []; svReportePintar();
}
function svReportePintar(){
  const l = document.getElementById('svReporteLista'); if(!l) return;
  const q = ((document.getElementById('svRepQ') || {}).value || '').toLowerCase();
  const fil = svRepDatos.filter(r=>!q || [r.documento, r.nombre, r.supervisor, r.sitio, r.modalidad].join(' ').toLowerCase().indexOf(q) >= 0);
  const f = x => x ? String(x).slice(0,10).split('-').reverse().join('/') : '—';
  const v = (fecha, hecha) => hecha ? '✔ hecha' : f(fecha);
  l.innerHTML = '<div class="lista-top"><input type="search" id="svRepQ" class="lista-busca" placeholder="🔎 Buscar por estudiante, supervisor o lugar…" value="' + esc(q) + '" oninput="svReportePintar()"></div>' +
    (fil.length ? '<div class="cupos-wrap"><table class="cupos-table"><thead><tr><th>Estudiante</th><th>Modalidad / programa</th><th>Lugar</th><th>Supervisor</th><th>Visita 1</th><th>Visita 2</th><th>Estado</th></tr></thead><tbody>' +
      fil.map(r=>'<tr><td><b>' + esc(r.nombre || '') + '</b><br><span class="aud-ref">Doc. ' + esc(r.documento) + '</span></td><td>' + esc(r.modalidad || '—') + '<br><span class="aud-ref">' + esc(r.programa || '') + '</span></td><td>' + esc(r.sitio || '—') + '</td><td>' + esc(r.supervisor || '—') + '</td><td>' + v(r.fecha1, r.hecha1) + '</td><td>' + v(r.fecha2, r.hecha2) + '</td><td>' + (r.estado === 'activa' ? 'En seguimiento' : 'Finalizada') + '</td></tr>').join('') + '</tbody></table></div>'
      : '<p style="color:var(--muted);font-size:13.5px;">No hay visitas para mostrar.</p>');
}

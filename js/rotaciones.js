/* ===== SIGUIENTE PRÁCTICA (rotaciones): el estudiante pide su próxima práctica y solo renueva los documentos marcados como «renovables» ===== */
const rtE = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RT_JORN = ['Mañana', 'Tarde', 'Noche', 'Sábado', 'Domingo', 'Entre semana'];
const rtTam = b => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const rtFecha = iso => iso ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
function rtChip(e){ const m = { pendiente: ['En revisión', 'cor-pendiente'], ok: ['Aprobado', 'cor-ok'], rechazado: ['Devuelto', 'cor-no'], enviada: ['En revisión', 'cor-pendiente'], devuelta: ['Devuelta', 'cor-no'], borrador: ['Borrador', 'cor-pendiente'], aprobada: ['Aprobada', 'cor-ok'], rechazada: ['Rechazada', 'cor-no'] }[e] || [e, '']; return '<span class="cor-est ' + m[1] + '">' + m[0] + '</span>'; }

/* ---------------- ESTUDIANTE ---------------- */
let rtEst = null;
async function rtCargarEstudiante(){
  if(!sb || !state || state.role !== 'estudiante' || !state.token) return;
  const sc = document.getElementById('screen-estudiante'); if(!sc) return;
  const { data, error } = await sb.rpc('est_rot_estado', { p_token: state.token });
  let box = document.getElementById('rotCard');
  if(error || !data || !data.aplica){ if(box) box.remove(); return; }       // sin rotaciones en su modalidad (o aún no se ejecutó la etapa 71): no se muestra nada
  rtEst = data;
  if(!box){ box = document.createElement('div'); box.id = 'rotCard'; box.className = 'card pf-exento'; sc.insertAdjacentElement('afterbegin', box); }
  rtPintarEstudiante(box);
}
function rtPintarEstudiante(box){
  const e = rtEst, sol = e.solicitud;
  let h = `<div class="section-bar deep">🔁 Siguiente práctica (${e.siguiente} de ${e.maximo})</div>`;
  if(!sol){
    if(e.puede){
      h += `<p class="helptext">Tu práctica ${e.rotacion_actual} está finalizada. Puedes solicitar la siguiente: <b>no tienes que volver a subir todos tus documentos</b>, solo los que vencen o cambian. Cuando la institución la apruebe, ingresas de nuevo y eliges tu nuevo sitio entre los cupos disponibles.</p>
        <div class="actions-row" style="justify-content:flex-start;"><button class="primary" onclick="rtSolicitar()">Solicitar siguiente práctica</button></div>`;
    } else if(e.elige_sitio) h += '<div class="asig-ok">✅ Tu siguiente práctica fue aprobada. Elige tu nuevo sitio de práctica entre los cupos disponibles (más abajo, en «Asignación»).</div>';
    else h += `<p class="helptext">${rtE(e.motivo || '')}</p>`;
  } else {
    const ab = sol.estado === 'borrador' || sol.estado === 'devuelta';
    h += `<p class="helptext">Práctica ${sol.numero} · ${rtChip(sol.estado)}${sol.enviada_en ? ' · enviada ' + rtFecha(sol.enviada_en) : ''}</p>`;
    if(sol.observacion) h += `<div class="note-box"><b>Para corregir:</b> ${rtE(sol.observacion)}</div>`;
    if(sol.estado === 'enviada') h += '<p class="helptext">Tu solicitud está en revisión. Te avisaremos por correo cuando tenga respuesta.</p>';
    if(sol.estado === 'rechazada') h += '<p class="helptext">Tu solicitud no fue aprobada. Si quieres, puedes enviar una nueva.</p>' + (e.puede ? `<div class="actions-row" style="justify-content:flex-start;"><button class="primary" onclick="rtSolicitar()">Solicitar de nuevo</button></div>` : '');
    if(ab || sol.estado === 'enviada'){
      const docs = e.documentos || [];
      h += '<div class="section-bar" style="margin-top:10px;">Documentos por renovar</div>' + (e.requisitos.length ? '' : '<p class="helptext">No tienes documentos por renovar: solo envía tu solicitud.</p>');
      h += e.requisitos.map(r => { const d = docs.find(x => x.requisito_id === r.id);
        return `<div class="field" style="border-bottom:1px solid var(--line,#eee);padding:8px 0;"><b>${rtE(r.nombre)}</b> <span class="aud-ref">${r.obligatorio ? 'Obligatorio' : 'Opcional'} · PDF, máx. ${rtE(r.max_mb)} MB</span>
          ${r.descripcion ? '<div class="helptext">' + rtE(r.descripcion) + '</div>' : ''}
          ${d ? `<div>📄 ${rtE(d.nombre_archivo)} (${rtTam(d.tamano)}) ${rtChip(d.estado)}${d.observacion ? '<div class="helptext" style="color:var(--danger)">' + rtE(d.observacion) + '</div>' : ''}</div>` : '<div class="helptext" style="color:var(--danger)">Falta subirlo</div>'}
          ${ab && !(d && d.estado === 'ok') ? `<input type="file" accept="application/pdf,.pdf" onchange="rtSubir('${rtE(r.id)}', ${Number(r.max_mb) || 2}, this)">${d ? `<button class="ghost" style="margin-left:6px;" onclick="rtQuitar('${rtE(r.id)}')">Quitar</button>` : ''}` : ''}</div>`; }).join('');
      if(ab) h += `<div class="actions-row" style="justify-content:flex-start;gap:8px;"><button class="primary" onclick="rtEnviar()">Enviar a revisión</button>${sol.estado === 'borrador' ? '<button class="danger" onclick="rtCancelar()">Cancelar</button>' : ''}</div>`;
    }
  }
  box.innerHTML = h + '<div id="rtMsg" class="helptext"></div>';
}
async function rtLlamar(fn, args, okMsg){
  const { data, error } = await sb.rpc(fn, Object.assign({ p_token: state.token }, args || {}));
  if(error){ toast(error.message, true); return null; }
  if(okMsg) toast(okMsg); await rtCargarEstudiante(); return data || true;
}
const rtSolicitar = () => rtLlamar('est_rot_solicitar', {}, 'Solicitud creada: sube tus documentos y envíala');
async function rtEnviar(){ if(!confirm('¿Enviar tu solicitud de siguiente práctica a revisión?')) return; rtLlamar('est_rot_enviar', {}, 'Solicitud enviada'); }
async function rtCancelar(){ if(confirm('¿Cancelar este borrador?')) rtLlamar('est_rot_cancelar', {}, 'Borrador cancelado'); }
const rtQuitar = id => rtLlamar('est_rot_quitar', { p_requisito: id }, 'Documento quitado');
function rtLeerB64(file){ return new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1] || ''); f.onerror = () => rej(new Error('No se pudo leer el archivo')); f.readAsDataURL(file); }); }
async function rtSubir(id, maxMb, input){
  const f = input.files && input.files[0]; if(!f) return;
  if(!/\.pdf$/i.test(f.name)){ toast('El archivo debe ser un PDF', true); input.value = ''; return; }
  if(f.size > maxMb * 1048576){ toast('El archivo supera el peso máximo de ' + maxMb + ' MB', true); input.value = ''; return; }
  try{ await rtLlamar('est_rot_subir', { p_requisito: id, p_nombre: f.name, p_base64: await rtLeerB64(f) }, 'Documento subido'); }catch(e){ toast(e.message, true); }
}
(function(){
  if(typeof renderEstudiante !== 'function') return;
  const o = renderEstudiante;
  renderEstudiante = function(){ const r = o.apply(this, arguments); try{ setTimeout(rtCargarEstudiante, 80); }catch(_){} return r; };
})();

/* ---------------- ADMINISTRADOR ---------------- */
let rtAdmDet = null;
function rtPantalla(id){ let el = document.getElementById(id); if(!el){ const ref = document.getElementById('screen-admin-hub') || document.querySelector('.screen'); if(!ref) return null; el = document.createElement('div'); el.className = 'screen'; el.id = id; ref.parentNode.appendChild(el); } return el; }
async function abrirRotaciones(estado){
  if(!requireSupabase()) return;
  const el = rtPantalla('screen-admin-rot'); if(!el) return;
  estado = estado === undefined ? 'enviada' : estado;
  el.innerHTML = '<p class="helptext">Cargando…</p>'; showScreen('screen-admin-rot');
  const [{ data, error }, cfg] = await Promise.all([sb.rpc('admin_rot_lista', { p_estado: estado }), sb.rpc('admin_rot_config')]);
  if(error){ el.innerHTML = '<button class="linkbtn" onclick="abrirSolicitudesPractica()">← Volver</button><p style="color:var(--danger)">' + rtE(error.message) + ' (¿ejecutaste rotaciones-etapa71.sql?)</p>'; return; }
  const filas = (data.filas || []).map(x => `<tr><td>${rtE(x.documento)}</td><td><b>${rtE(x.nombre)}</b><div class="aud-ref">${rtE(x.programa || '')} · ${rtE(x.modalidad || '')}</div></td><td>Práctica ${x.numero}</td><td>${rtChip(x.estado)}</td><td>${rtFecha(x.enviada_en)}</td><td><button class="ghost" onclick="rtDetalle('${rtE(x.id)}')">Revisar</button></td></tr>`).join('');
  const r = data.resumen || {};
  const conf = ((cfg && cfg.data) || []).map(m => `<div style="padding:8px 0;border-bottom:1px solid var(--line,#eee);"><b>${rtE(m.nombre)}</b> · ${m.meses} mes(es) ·
      Prácticas seguidas: <select onchange="rtRotaciones('${rtE(m.id)}', this.value)">${[1, 2, 3, 4].map(n => `<option value="${n}" ${n === m.rotaciones ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <div class="helptext" style="margin:4px 0 0;">Documentos que se vuelven a pedir (renovables): ${m.requisitos.length ? m.requisitos.map(q => `<label style="margin-right:12px;white-space:nowrap;"><input type="checkbox" ${q.renovable ? 'checked' : ''} onchange="rtRenovable('${rtE(q.id)}', this.checked)"> ${rtE(q.nombre)}</label>`).join('') : '<i>sin documentos</i>'}</div></div>`).join('');
  el.innerHTML = `<button class="linkbtn" onclick="abrirSolicitudesPractica()">← Volver a Solicitudes de práctica</button>
    <h2 style="margin:12px 0 4px;">Siguientes prácticas</h2>
    <p class="helptext" style="text-align:justify;">Estudiantes cuya práctica terminó y piden la siguiente (p. ej. Enfermería cada 2 meses). Solo renuevan los documentos que marques como <b>renovables</b>. Al aprobar: se libera la asignación anterior, la práctica vuelve a quedar activa, los meses anteriores se bloquean y el estudiante <b>entra y elige su nuevo sitio entre los cupos disponibles</b> (con sus fechas).</p>
    <div class="card"><div class="aud-filtros"><div class="field"><label>Estado</label><select onchange="abrirRotaciones(this.value)">${[['enviada', 'En revisión (' + (r.enviada || 0) + ')'], ['devuelta', 'Devueltas (' + (r.devuelta || 0) + ')'], ['aprobada', 'Aprobadas'], ['rechazada', 'Rechazadas'], ['', 'Todas']].map(o => `<option value="${o[0]}" ${o[0] === estado ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div></div>
      <div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Documento</th><th>Estudiante</th><th>Práctica</th><th>Estado</th><th>Enviada</th><th></th></tr></thead><tbody>${filas || '<tr><td colspan="6">No hay solicitudes en este estado.</td></tr>'}</tbody></table></div></div>
    <div class="card"><div class="section-bar deep">Configuración</div>${conf || '<p class="helptext">Sin modalidades.</p>'}</div>`;
}
async function rtRotaciones(id, n){ const { error } = await sb.rpc('admin_modalidad_rotaciones', { p_id: id, p_n: Number(n) }); if(error) toast(error.message, true); else toast('Guardado'); abrirRotaciones(); }
async function rtRenovable(id, v){ const { error } = await sb.rpc('admin_requisito_renovable', { p_id: id, p_valor: !!v }); if(error){ toast(error.message, true); abrirRotaciones(); } else toast(v ? 'Se volverá a pedir en la siguiente práctica' : 'Ya no se volverá a pedir'); }
async function rtDetalle(id){
  const el = rtPantalla('screen-admin-rot-det'); if(!el) return;
  el.innerHTML = '<p class="helptext">Cargando…</p>'; showScreen('screen-admin-rot-det');
  const { data, error } = await sb.rpc('admin_rot_detalle', { p_id: id });
  if(error){ el.innerHTML = '<button class="linkbtn" onclick="abrirRotaciones()">← Volver</button><p style="color:var(--danger)">' + rtE(error.message) + '</p>'; return; }
  rtAdmDet = data; rtPintarDetalle();
}
function rtPintarDetalle(){
  const el = document.getElementById('screen-admin-rot-det'), d = rtAdmDet; if(!el || !d) return;
  const s = d.solicitud, e = d.estudiante, rev = s.estado === 'enviada';
  const docs = d.requisitos.map(r => { const x = r.doc;
    return `<tr><td><b>${rtE(r.nombre)}</b></td><td>${x ? rtE(x.nombre_archivo) + '<div class="aud-ref">' + rtTam(x.tamano) + ' · ' + rtFecha(x.subido_en) + '</div>' : '<span style="color:var(--danger)">' + (r.obligatorio ? 'Falta' : 'No subido') + '</span>'}</td>
      <td>${x ? rtChip(x.estado) + (x.observacion ? '<div class="aud-ref">' + rtE(x.observacion) + '</div>' : '') : ''}</td>
      <td class="aud-nw">${x ? `<button class="ghost" style="padding:5px 10px;font-size:12px;" onclick="rtVerDoc('${rtE(s.id)}','${rtE(r.id)}')">👁 Vista previa</button>${rev ? ` <button class="primary" style="padding:5px 10px;font-size:12px;" onclick="rtMarcar('${rtE(r.id)}','ok')">✔</button> <button class="danger" style="padding:5px 10px;font-size:12px;" onclick="rtMarcar('${rtE(r.id)}','rechazado')">✖</button>` : ''}` : ''}</td></tr>`; }).join('');
  el.innerHTML = `<button class="linkbtn" onclick="abrirRotaciones()">← Volver a la bandeja</button>
    <h2 style="margin:12px 0 4px;">${rtE(e.nombre || s.documento)} · práctica ${s.numero} ${rtChip(s.estado)}</h2>
    <p class="helptext">Documento ${rtE(s.documento)} · ${rtE(e.correo || 'sin correo')} · ${rtE(e.programa || '')} · ${rtE(e.modalidad || '')} · Práctica actual: ${e.rotacion_actual}${e.fecha_fin ? ' (terminó ' + rtE(String(e.fecha_fin).slice(0, 10)) + ')' : ''}</p>
    ${s.observacion ? `<div class="note-box"><b>Observación:</b> ${rtE(s.observacion)}</div>` : ''}
    <div class="card"><div class="section-bar deep">Documentos renovados</div><div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Documento</th><th>Archivo</th><th>Revisión</th><th></th></tr></thead><tbody>${docs || '<tr><td colspan="4">Esta modalidad no tiene documentos renovables.</td></tr>'}</tbody></table></div></div>
    ${rev ? `<div class="actions-row" style="justify-content:flex-start;gap:8px;flex-wrap:wrap;"><button class="primary" onclick="rtResolver('aprobar')">Aprobar</button><button class="ghost" onclick="rtResolver('devolver')">Devolver para corregir</button><button class="danger" onclick="rtResolver('rechazar')">Rechazar</button></div>` : ''}`;
}
async function rtVerDoc(id, req){
  const nombre = (rtAdmDet.requisitos.find(r => r.id === req) || {}).nombre || 'Documento';
  if(typeof spaVisorPdf === 'function') return spaVisorPdf(nombre, () => sb.rpc('admin_rot_doc', { p_id: id, p_requisito: req }));
  toast('Falta js/solicitudes-practica.js (vista previa)', true);
}
async function rtMarcar(req, estado){
  let obs = '';
  if(estado === 'rechazado'){ obs = prompt('¿Por qué devuelves este documento? (el estudiante lo verá)', ''); if(obs === null) return; if(!obs.trim()){ toast('Escribe el motivo', true); return; } }
  const { error } = await sb.rpc('admin_rot_revisar', { p_id: rtAdmDet.solicitud.id, p_requisito: req, p_estado: estado, p_obs: obs });
  if(error){ toast(error.message, true); return; }
  rtDetalle(rtAdmDet.solicitud.id);
}
async function rtResolver(accion){
  const s = rtAdmDet.solicitud, nombre = rtAdmDet.estudiante.nombre || s.documento; let obs = '';
  if(accion === 'aprobar' && !confirm('¿Aprobar la práctica ' + s.numero + ' de ' + nombre + '?\nSe libera su asignación anterior y la práctica vuelve a quedar activa. El estudiante entrará a elegir un cupo disponible.')) return;
  if(accion === 'devolver'){ obs = prompt('¿Qué debe corregir el estudiante? (se le avisará por correo)', ''); if(obs === null) return; }
  if(accion === 'rechazar'){ obs = prompt('Motivo del rechazo (se le avisará por correo):', ''); if(obs === null) return; if(!obs.trim()){ toast('Escribe el motivo', true); return; } }
  const { error } = await sb.rpc('admin_rot_resolver', { p_id: s.id, p_accion: accion, p_obs: obs });
  if(error){ toast(error.message, true); return; }
  toast(accion === 'aprobar' ? 'Aprobada. El estudiante ya puede entrar a elegir su nuevo sitio.' : accion === 'devolver' ? 'Devuelta al estudiante' : 'Rechazada');
  abrirRotaciones();
}
(function(){
  if(typeof abrirSolicitudesPractica !== 'function') return;
  const o = abrirSolicitudesPractica;
  abrirSolicitudesPractica = async function(){
    const r = await o.apply(this, arguments);
    const el = document.getElementById('screen-admin-solprac');
    if(el && !document.getElementById('rtBtn')){ const b = document.createElement('div'); b.id = 'rtBtn'; b.style.margin = '8px 0'; b.innerHTML = '<button class="ghost" onclick="abrirRotaciones()">🔁 Siguientes prácticas (rotaciones)</button>'; const h = el.querySelector('h2'); if(h) h.insertAdjacentElement('afterend', b); }
    return r;
  };
})();

/* ============================= MIS VISITAS ASIGNADAS (supervisor) =============================
   Al entrar como supervisor se ve la lista de estudiantes que el supervisor general le asignó. Mientras una visita está a su cargo,
   ningún otro supervisor puede abrir a ese estudiante (lo impone la base de datos). Al terminar, «Finalizar seguimiento» la cierra.
   Requiere visitas-supervisor-general-etapa25.sql. */
let svVisitas = [], svFechas = {}, svDisp = [];

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
        <td><button class="primary" onclick="svAbrir(${i})">Abrir</button> <button class="ghost" onclick="svFechaModal('${esc(v.documento)}', null)">📅 Fecha de visita</button> ${l && l.estado === 'pendiente' ? `<button class="primary" onclick="svConcepto(${i})">Concepto del lugar</button>` : ''} <button class="ghost" onclick="svFinalizar(${i})">Finalizar seguimiento</button></td></tr>`; }).join('') + '</tbody></table></div>'
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
function svFmtFecha(x){ if(!x) return ''; const p = String(x.fecha).slice(0,10).split('-'); return p[2] + '/' + p[1] + '/' + p[0] + (x.hora ? ' ' + esc(x.hora) : ''); }
function svFechasHtml(doc){
  const f = svFechas[doc] || {};
  return '<span class="aud-ref">Visita 1: ' + (f[1] ? '<b>' + svFmtFecha(f[1]) + '</b>' : 'sin fecha') + '<br>Visita 2: ' + (f[2] ? '<b>' + svFmtFecha(f[2]) + '</b>' : 'sin fecha') + '</span>';
}
// doc: documento del estudiante · tomar: datos del estudiante si aún no está a mi cargo (lo toma al guardar)
function svFechaModal(doc, tomar){
  const f = svFechas[doc] || {}; const nombre = tomar ? tomar.nombre : ((svVisitas.find(v=>v.documento === doc) || {}).nombre || doc);
  const sug = tomar ? (tomar.hecha1 ? 2 : 1) : (f[1] ? 2 : 1);
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone:'America/Bogota' });
  const prev = document.getElementById('svModal'); if(prev) prev.remove();
  const m = document.createElement('div'); m.id = 'svModal'; m.className = 'cor-modal';
  m.innerHTML = `<div class="cor-caja" role="dialog" aria-modal="true" style="max-width:520px;">
    <h3 style="margin:0 0 4px;">${tomar ? 'Tomar estudiante y programar visita' : 'Fecha de la visita'}</h3>
    <p class="helptext" style="margin:0 0 8px;"><b>${esc(nombre)}</b> (Doc. ${esc(doc)})${tomar ? '<br>Al guardar, el estudiante queda <b>a tu cargo</b> y bloqueado para los demás supervisores.' : ''}<br>Escribe la fecha que <b>concretaste con el estudiante</b>. Él recibirá un correo con la fecha.</p>
    <div class="field-row">
      <div class="field"><label>Visita *</label><select id="svVisita" onchange="svVisitaCambio('${esc(doc)}')"><option value="1"${sug === 1 ? ' selected' : ''}>Visita 1</option><option value="2"${sug === 2 ? ' selected' : ''}>Visita 2</option></select></div>
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
  try{ sb.functions.invoke('enviar-correo', { body:{ action:'notificar_solicitud' } }).then(()=>{}, ()=>{}); }catch(_){}   // envía el correo al estudiante
  toast(data.aviso_correo ? '✉ Visita ' + visita + ' programada. Se avisó al estudiante por correo.' : 'Visita programada, pero el estudiante no tiene un correo válido: avísale tú.', !data.aviso_correo);
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
      <td class="aud-nw"><span class="aud-ref">V1: ${e.hecha1 ? '✔ hecha' : (e.fecha1 ? svFmtFecha({ fecha:e.fecha1 }) : 'pendiente')}<br>V2: ${e.hecha2 ? '✔ hecha' : (e.fecha2 ? svFmtFecha({ fecha:e.fecha2 }) : 'pendiente')}</span></td>
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

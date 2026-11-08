/* ============================= CAMBIO DE EMPRESA =============================
   Estudiante: pestaña «Asistencia y cambio» → pide el cambio de empresa con su motivo (aplica a todas las modalidades).
   Administración: bandeja «Cambios de empresa». El supervisor general y el asistente ven la solicitud y pueden dar su opinión;
   quien tenga el permiso de estudiantes registrados la aprueba o la rechaza. Al aprobar: si el estudiante tenía un cupo, queda libre;
   si era un lugar de RLP/RAP, vuelve a pedir uno nuevo (el acceso de la empresa anterior se quita); en otros casos queda para hacerlo a mano.
   Requiere cambio-empresa-asistencia-etapa31.sql. Los correos al estudiante salen solos (sin redesplegar nada). */
const CE_ET = { pendiente:['En revisión','cor-pendiente'], aprobada:['Aprobada','cor-enviado'], rechazada:['No aprobada','cor-error'], cancelada:['Cancelada','cor-pendiente'] };

/* ---------------- Estudiante ---------------- */
async function ceEstCargar(){
  const caja = document.getElementById('ceEstCaja'); if(!caja) return;
  const { data, error } = await sb.rpc('est_cambio_estado', { p_token: state.token });
  if(error){ caja.innerHTML = '<p style="color:var(--danger)">' + esc(error.message) + ' (¿ejecutaste cambio-empresa-asistencia-etapa31.sql?)</p>'; return; }
  const pend = (data.solicitudes || []).find(s=>s.estado === 'pendiente');
  caja.innerHTML = `<p class="helptext" style="text-align:justify;">${data.empresa ? 'Tu empresa actual: <b>' + esc(data.empresa) + '</b>. ' : ''}Si necesitas cambiar de empresa o de lugar de práctica, envía tu solicitud con el motivo. El equipo de prácticas la revisa y te responde por correo y aquí.</p>
    ${data.puede_solicitar ? `<div class="field"><label>¿Por qué necesitas el cambio? *</label><textarea id="ceMotivo" rows="3" maxlength="1500" placeholder="Explica el motivo con claridad (mínimo 15 caracteres)"></textarea></div>
      <div class="actions-row" style="justify-content:flex-start;"><button class="primary" onclick="ceEstSolicitar()">Solicitar cambio de empresa</button><span id="ceMsg"></span></div>`
    : pend ? '<div class="note-box">Tu solicitud está <b>en revisión</b>. Te avisaremos cuando tenga respuesta.</div><div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="ceEstCancelar()">Cancelar mi solicitud</button></div>'
    : '<div class="note-box">Para pedir el cambio primero necesitas tener una modalidad de práctica activa.</div>'}
    ${(data.solicitudes || []).length ? '<div class="subhead">Mis solicitudes</div><div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Fecha</th><th>Empresa</th><th>Motivo</th><th>Estado</th><th>Respuesta</th></tr></thead><tbody>' + data.solicitudes.map(s=>{ const e = CE_ET[s.estado] || [s.estado, '']; return `<tr><td class="aud-nw">${asisFechaCorta(s.creado)}</td><td>${s.empresa ? esc(s.empresa) : '—'}</td><td>${esc(s.motivo)}</td><td><span class="cor-est ${e[1]}">${e[0]}</span></td><td>${s.respuesta ? esc(s.respuesta) : '—'}</td></tr>`; }).join('') + '</tbody></table></div>' : ''}`;
}
async function ceEstSolicitar(){
  const m = document.getElementById('ceMotivo').value.trim(); const msg = document.getElementById('ceMsg');
  if(m.length < 15){ msg.innerHTML = '<span style="color:var(--danger)">Cuéntanos el motivo con un poco más de detalle.</span>'; return; }
  if(!confirm('¿Enviar la solicitud de cambio de empresa?')) return;
  const { error } = await sb.rpc('est_cambio_solicitar', { p_token: state.token, p_motivo: m });
  if(error){ msg.innerHTML = '<span style="color:var(--danger)">' + esc(error.message) + '</span>'; return; }
  toast('Solicitud enviada'); ceEstCargar();
}
async function ceEstCancelar(){
  if(!confirm('¿Cancelar tu solicitud de cambio?')) return;
  const { error } = await sb.rpc('est_cambio_cancelar', { p_token: state.token });
  if(error){ toast(error.message, true); return; }
  toast('Solicitud cancelada'); ceEstCargar();
}

/* Pestaña nueva en la vista del estudiante */
(function(){
  if(typeof cardsEstudiante !== 'function' || typeof organizarPestanasEstudiante !== 'function') return;
  const _c = cardsEstudiante, _o = organizarPestanasEstudiante, _s = showEstTab;
  cardsEstudiante = function(){ const c = _c.apply(this, arguments); const e = document.getElementById('estAsisCard'); if(e) c.asistencia = e; return c; };
  organizarPestanasEstudiante = function(){
    let card = document.getElementById('estAsisCard');
    if(!card){
      const ref = _c().control; if(!ref) return _o.apply(this, arguments);
      card = document.createElement('div'); card.className = 'card'; card.id = 'estAsisCard'; card.style.display = 'none';
      card.innerHTML = '<div class="section-bar teal">Asistencia y cambio de empresa</div><div class="subhead">Cambio de empresa</div><div id="ceEstCaja"><p style="color:var(--muted)">Cargando…</p></div><div class="subhead" style="margin-top:22px;">Asistencia a la práctica</div><div id="asisEstCont"></div><div class="subhead" style="margin-top:22px;">Actas de comité</div><div id="actasCaja-est"></div>';
      ref.insertAdjacentElement('afterend', card);
    }
    const r = _o.apply(this, arguments);
    const bar = document.getElementById('estTabs');
    if(bar && !document.getElementById('estTab-asistencia')){
      const b = document.createElement('button'); b.className = 'tab'; b.id = 'estTab-asistencia'; b.textContent = 'Asistencia y cambio'; b.onclick = ()=>showEstTab('asistencia'); bar.appendChild(b);
      showEstTab(estTabActual);
    }
    return r;
  };
  showEstTab = function(tab){
    _s.apply(this, arguments);
    if(tab === 'asistencia' && state.token){ ceEstCargar(); const c = document.getElementById('asisEstCont'); if(c && typeof asisPintar === 'function') asisPintar(c, 'est'); if(typeof actasMiLista === 'function') actasMiLista('est'); }
  };
})();

/* ---------------- Administración ---------------- */
let ceAdmEstado = 'pendiente', ceAdmFilas = [];
async function abrirCambiosEmpresa(){
  if(!requireSupabase()) return;
  const el = spaPantalla('screen-admin-cambios'); if(!el) return;
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Cambios de empresa</h2>
    <p class="helptext" style="text-align:justify;">Solicitudes de los estudiantes (de cualquier modalidad) para cambiar de empresa o de lugar de práctica. El <b>supervisor general</b> y el asistente pueden dar su <b>opinión</b>; quien tiene el permiso de estudiantes registrados <b>aprueba o rechaza</b>. Al aprobar, al estudiante le llega un correo.</p>
    <div class="card"><div class="aud-filtros">
      <div class="field"><label>Ver</label><select id="ceAdmEstado" onchange="ceAdmEstado=this.value;ceAdmCargar()">${Object.keys(CE_ET).map(k=>`<option value="${k}"${k === ceAdmEstado ? ' selected' : ''}>${CE_ET[k][0]}</option>`).join('')}</select></div>
      <div class="field aud-ancho"><label>Buscar (estudiante, documento o empresa)</label><input type="search" id="ceAdmTexto" maxlength="80" onkeydown="if(event.key==='Enter')ceAdmCargar()"></div></div>
      <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="ceAdmCargar()">Consultar</button></div>
      <div id="ceAdmLista"><p style="color:var(--muted)">Cargando…</p></div></div>`;
  showScreen('screen-admin-cambios'); ceAdmCargar();
}
async function ceAdmCargar(){
  const t = document.getElementById('ceAdmLista'); if(!t) return;
  const { data, error } = await sb.rpc('admin_cambios_lista', { p_estado: ceAdmEstado, p_texto: document.getElementById('ceAdmTexto').value.trim() || null });
  if(error){ t.innerHTML = '<p style="color:var(--danger)">' + esc(error.message) + ' (¿ejecutaste cambio-empresa-asistencia-etapa31.sql?)</p>'; return; }
  ceAdmFilas = data || [];
  if(!ceAdmFilas.length){ t.innerHTML = '<p style="color:var(--muted);font-size:13.5px;">No hay solicitudes.</p>'; return; }
  t.innerHTML = '<div class="lista-cuenta">' + ceAdmFilas.length + ' solicitud(es)</div><div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Solicitada</th><th>Estudiante</th><th>Modalidad</th><th>Empresa actual / supervisor</th><th>Motivo</th><th>Opinión</th><th>Estado</th><th></th></tr></thead><tbody>' + ceAdmFilas.map((f,i)=>{
    const e = CE_ET[f.estado] || [f.estado, '']; const pend = f.estado === 'pendiente';
    return `<tr><td class="aud-nw">${asisFechaCorta(f.creado)}</td><td><b>${esc(f.estudiante)}</b><br><span class="aud-ref">Doc. ${esc(f.documento)} · ${esc(f.programa || '')}</span></td><td>${esc(f.modalidad)}</td>
      <td>${f.empresa ? esc(f.empresa) : '<span style="color:var(--muted)">Sin empresa registrada</span>'}${f.supervisor ? '<br><span class="aud-ref">Supervisor: ' + esc(f.supervisor) + '</span>' : ''}</td>
      <td>${esc(f.motivo)}</td><td>${f.opinion ? esc(f.opinion) + '<br><span class="aud-ref">' + esc(f.opinion_por) + '</span>' : '—'}</td>
      <td><span class="cor-est ${e[1]}">${e[0]}</span>${f.respuesta ? '<br>' + esc(f.respuesta) + '<br><span class="aud-ref">' + esc(f.resuelta_por) + '</span>' : ''}</td>
      <td class="aud-nw">${pend ? `<button class="ghost" onclick="ceAdmOpinar(${i})">Opinar</button>${f.puede_resolver ? ` <button class="primary" onclick="ceAdmResolver(${i},'aprobar')">✔ Aprobar</button> <button class="danger" onclick="ceAdmResolver(${i},'rechazar')">✖ Rechazar</button>` : ''}` : ''}</td></tr>`; }).join('') + '</tbody></table></div>';
}
async function ceAdmOpinar(i){
  const op = prompt('Tu opinión sobre este cambio de empresa:', ceAdmFilas[i].opinion || ''); if(op === null) return;
  const { error } = await sb.rpc('admin_cambio_opinar', { p_id: ceAdmFilas[i].id, p_opinion: op });
  if(error){ toast(error.message, true); return; }
  toast('Opinión guardada'); ceAdmCargar();
}
async function ceAdmResolver(i, accion){
  const f = ceAdmFilas[i]; let obs = '', meses = null;
  if(accion === 'rechazar'){ obs = prompt('Motivo del rechazo (se le enviará a ' + f.estudiante + '):', ''); if(obs === null) return; if(!obs.trim()){ toast('Escribe el motivo', true); return; } }
  else {
    obs = prompt('Indicación para ' + f.estudiante + ' (opcional):', '') ; if(obs === null) return;
    if(f.asignacion_id){ const m = prompt('¿Cuántos meses le quedan por hacer en la nueva empresa? (0 a 12; vacío = sin definir)', ''); if(m === null) return; if(m.trim() !== ''){ meses = parseInt(m, 10); if(isNaN(meses) || meses < 0 || meses > 12){ toast('Meses inválidos', true); return; } } }
    if(!confirm('¿Aprobar el cambio de ' + f.estudiante + '?' + (f.asignacion_id ? ' Quedará libre de su empresa actual.' : ''))) return;
  }
  const { data, error } = await sb.rpc('admin_cambio_resolver', { p_id: f.id, p_accion: accion, p_obs: obs.trim(), p_meses: meses });
  if(error){ toast(error.message, true); return; }
  try{ sb.functions.invoke('enviar-correo', { body:{ action:'notificar_solicitud' } }).then(()=>{}, ()=>{}); }catch(_){}
  toast(accion === 'rechazar' ? 'Solicitud rechazada; se avisó al estudiante' : data.automatico === 'manual' ? 'Aprobada. Este caso no tiene cupo ni lugar automático: inactívalo desde su ficha si corresponde.' : 'Aprobada; el estudiante ya puede elegir otra empresa');
  ceAdmCargar(); if(window.pgMarcarPendientes) window.pgMarcarPendientes();
}

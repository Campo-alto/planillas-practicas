/* ============================= INASISTENCIAS REPORTADAS (administración) =============================
   Bandeja del asistente: revisa lo que reportaron estudiantes y empresas (fechas, motivo y PDF de soporte) y decide si queda
   «justificada» o «no justificada». Al decidir, el estudiante recibe un correo. Exporta a Excel y PDF. Requiere cambio-empresa-asistencia-etapa31.sql. */
let iaEstado = 'pendiente', iaFilas = [];
const IA_ESTADOS = { pendiente:'En revisión', justificada:'Justificadas', no_justificada:'No justificadas', todas:'Todas' };

async function abrirInasistencias(){
  if(!requireSupabase()) return;
  const el = spaPantalla('screen-admin-inasis'); if(!el) return;
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Inasistencias reportadas</h2>
    <p class="helptext" style="text-align:justify;">Reportes de inasistencia que envían los <b>estudiantes</b> y las <b>empresas</b>, con sus soportes en PDF (incapacidades, citas, etc.). Revisa cada uno y márcalo <b>justificado</b> o <b>no justificado</b>; el estudiante recibe un correo con la decisión.</p>
    <div class="card"><div class="aud-filtros">
      <div class="field"><label>Ver</label><select id="iaEstado" onchange="iaEstado=this.value;iaCargar()">${Object.keys(IA_ESTADOS).map(k=>`<option value="${k}"${k === iaEstado ? ' selected' : ''}>${IA_ESTADOS[k]}</option>`).join('')}</select></div>
      <div class="field aud-ancho"><label>Buscar (estudiante o documento)</label><input type="search" id="iaTexto" maxlength="80" onkeydown="if(event.key==='Enter')iaCargar()"></div></div>
      <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="iaCargar()">Consultar</button><button class="ghost" onclick="iaExportar('xlsx')">⬇ Excel</button><button class="ghost" onclick="iaExportar('pdf')">⬇ PDF</button></div>
      <div id="iaLista"><p style="color:var(--muted)">Cargando…</p></div></div>`;
  showScreen('screen-admin-inasis'); iaCargar();
}
async function iaCargar(){
  const t = document.getElementById('iaLista'); if(!t) return;
  const { data, error } = await sb.rpc('admin_asis_lista', { p_estado: iaEstado, p_texto: document.getElementById('iaTexto').value.trim() || null });
  if(error){ t.innerHTML = '<p style="color:var(--danger)">' + esc(error.message) + ' (¿ejecutaste cambio-empresa-asistencia-etapa31.sql?)</p>'; return; }
  iaFilas = data || [];
  if(!iaFilas.length){ t.innerHTML = '<p style="color:var(--muted);font-size:13.5px;">No hay inasistencias con ese filtro.</p>'; return; }
  t.innerHTML = '<div class="lista-cuenta">' + iaFilas.length + ' reporte(s)</div><div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Estudiante</th><th>Programa · Modalidad</th><th>Empresa</th><th>Fecha(s)</th><th>Tipo</th><th>Motivo</th><th>Reportó</th><th>Soportes (vista previa)</th><th>Estado</th><th></th></tr></thead><tbody>' + iaFilas.map((f,i)=>{ const e = ASIS_EST[f.estado] || [f.estado, ''];
    return `<tr><td><b>${esc(f.estudiante)}</b><br><span class="aud-ref">Doc. ${esc(f.documento)}</span></td><td>${esc(f.programa || '—')}<br><span class="aud-ref">${esc(f.modalidad || '')}</span></td><td>${f.empresa ? esc(f.empresa) : '—'}</td>
      <td class="aud-nw"><b>${asisFechaCorta(f.desde)}${f.hasta !== f.desde ? '<br>→ ' + asisFechaCorta(f.hasta) : ''}</b></td><td>${esc(ASIS_TIPOS[f.tipo] || f.tipo)}</td><td>${esc(f.motivo)}</td>
      <td>${f.reportado_por === 'empresa' ? 'Empresa' : 'Estudiante'}<br><span class="aud-ref">${esc(f.reportante)}</span></td>
      <td>${f.docs.length ? f.docs.map((d,j)=>`<a href="#" onclick="iaVerDoc(${i},${j});return false;">📎 ${esc(d.nombre)}</a>`).join('<br>') : '<span style="color:var(--muted)">Sin soportes</span>'}</td>
      <td><span class="cor-est ${e[1]}">${e[0]}</span>${f.estado !== 'pendiente' ? '<br><span class="aud-ref">' + esc(f.resuelta_por || '') + '</span>' + (f.observacion ? '<br>' + esc(f.observacion) : '') : ''}</td>
      <td class="aud-nw">${f.estado === 'pendiente' ? `<button class="primary" onclick="iaResolver(${i},'justificada')">✔ Justificar</button> <button class="danger" onclick="iaResolver(${i},'no_justificada')">✖ No justificar</button>` : ''}</td></tr>`; }).join('') + '</tbody></table></div>';
}
function iaVerDoc(i, j){   // vista previa dentro de la página, sin descargar
  const f = iaFilas[i], d = f.docs[j];
  return spaVisorPdf(d.nombre + ' · ' + f.estudiante, ()=>sb.rpc('admin_asis_doc', { p_id: f.id, p_doc: d.id }));
}
async function iaResolver(i, estado){
  const f = iaFilas[i];
  let obs = prompt(estado === 'justificada' ? 'Observación para ' + f.estudiante + ' (opcional). Al aceptar se justifica y se le envía un correo:' : 'Motivo por el que NO se justifica (se le enviará a ' + f.estudiante + '):', '');
  if(obs === null) return; obs = obs.trim();
  if(estado === 'no_justificada' && obs.length < 3){ toast('Escribe el motivo por el que no se justifica', true); return; }
  const { error } = await sb.rpc('admin_asis_resolver', { p_id: f.id, p_estado: estado, p_obs: obs });
  if(error){ toast(error.message, true); return; }
  try{ sb.functions.invoke('enviar-correo', { body:{ action:'notificar_solicitud' } }).then(()=>{}, ()=>{}); }catch(_){}
  toast('Decisión registrada; se avisó al estudiante'); iaCargar(); setTimeout(pgBadgesAsis, 300);
}
function iaExportar(formato){
  if(!iaFilas.length){ toast('No hay inasistencias para exportar', true); return; }
  const head = ['Estudiante','Documento','Programa','Empresa','Desde','Hasta','Tipo','Motivo','Reportó','Soportes','Estado','Observación'];
  const rows = iaFilas.map(f=>[f.estudiante, f.documento, f.programa || '', f.empresa || '', asisFechaCorta(f.desde), asisFechaCorta(f.hasta), ASIS_TIPOS[f.tipo] || f.tipo, f.motivo, f.reportado_por, f.docs.length, (ASIS_EST[f.estado] || [f.estado])[0], f.observacion || '']);
  if(formato === 'pdf') pdfTablaDescargar({ titulo:'Inasistencias reportadas', archivo:'inasistencias', head, rows });
  else ieDescargarXlsx('inasistencias', head, rows, 'Inasistencias', 'Inasistencias reportadas');
}

/* Números en las tarjetas del panel */
async function pgBadgesAsis(){
  if(typeof sb === 'undefined' || !sb) return;
  for(const [fn, titulo] of [['admin_asis_pendientes', 'Inasistencias reportadas'], ['admin_cambios_pendientes', 'Cambios de empresa']]){
    try{
      const { data, error } = await sb.rpc(fn); if(error || !data) continue;
      const b = [...document.querySelectorAll('.fn-card')].find(c=>c.getAttribute('data-fn') === titulo); const sl = b && b.querySelector('.fn-badge');
      if(sl) sl.innerHTML = '<span class="sa-badge" title="Pendientes de revisión">' + data + '</span>';
    }catch(_){}
  }
}
(function(){
  if(typeof showScreen !== 'function') return;
  const _show = showScreen;
  showScreen = function(id){ _show(id); if(id === 'screen-admin-hub') setTimeout(pgBadgesAsis, 900); };
})();

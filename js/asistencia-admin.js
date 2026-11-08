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
  t.innerHTML = iaFilas.map((f,i)=>{ const e = ASIS_EST[f.estado] || [f.estado, ''];
    return `<div class="ec-card"><div class="ec-head"><b>${esc(f.estudiante)}</b> <span class="aud-ref">Doc. ${esc(f.documento)} · ${esc(f.programa || '')} · ${esc(f.modalidad || '')}</span> <span class="cor-est ${e[1]}">${e[0]}</span></div>
      <div class="helptext">📅 <b>${asisFechaCorta(f.desde)}${f.hasta !== f.desde ? ' → ' + asisFechaCorta(f.hasta) : ''}</b> · ${esc(ASIS_TIPOS[f.tipo] || f.tipo)} · Reportó ${f.reportado_por === 'empresa' ? 'la empresa' : 'el estudiante'} (${esc(f.reportante)})${f.empresa ? ' · 🏢 ' + esc(f.empresa) : ''}</div>
      <div class="note-box">${esc(f.motivo)}</div>
      <div class="helptext">${f.docs.length ? '📎 ' + f.docs.map((d,j)=>`<a href="#" onclick="iaVerDoc(${i},${j});return false;">${esc(d.nombre)}</a> (${Math.round(d.tamano / 1024)} KB)`).join(' · ') : 'Sin soportes anexados'}</div>
      ${f.estado === 'pendiente' ? `<div class="field"><label>Observación (obligatoria si no se justifica)</label><input id="iaObs-${i}" maxlength="500"></div>
        <div class="actions-row" style="justify-content:flex-start;"><button class="primary" onclick="iaResolver(${i},'justificada')">✔ Justificar</button><button class="danger" onclick="iaResolver(${i},'no_justificada')">✖ No justificar</button></div>`
      : `<div class="helptext">Decidió: ${esc(f.resuelta_por || '')}${f.observacion ? ' · ' + esc(f.observacion) : ''}</div>`}</div>`; }).join('');
}
async function iaVerDoc(i, j){
  const f = iaFilas[i], d = f.docs[j];
  const { data, error } = await sb.rpc('admin_asis_doc', { p_id: f.id, p_doc: d.id });
  if(error){ toast(error.message, true); return; }
  const bin = atob(data.base64), bytes = new Uint8Array(bin.length); for(let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
  const url = URL.createObjectURL(new Blob([bytes], { type:'application/pdf' }));
  const w = window.open(url, '_blank'); if(!w){ const a = document.createElement('a'); a.href = url; a.download = data.nombre_archivo || 'soporte.pdf'; a.click(); }
  setTimeout(()=>URL.revokeObjectURL(url), 60000);
}
async function iaResolver(i, estado){
  const f = iaFilas[i]; const obs = document.getElementById('iaObs-' + i).value.trim();
  if(estado === 'no_justificada' && obs.length < 3){ toast('Escribe el motivo por el que no se justifica', true); return; }
  if(!confirm((estado === 'justificada' ? '¿Justificar' : '¿Marcar como NO justificada') + ' la inasistencia de ' + f.estudiante + '? Se le enviará un correo.')) return;
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

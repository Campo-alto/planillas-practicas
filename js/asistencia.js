/* ============================= ASISTENCIA A LA PRÁCTICA (reporte de inasistencias) =============================
   El estudiante y la empresa pueden reportar una inasistencia: fechas, tipo, motivo y soportes en PDF (incapacidades, citas, etc.).
   El asistente la revisa en el panel y la marca «justificada» o «no justificada»; el estudiante recibe un correo con la decisión.
   Requiere cambio-empresa-asistencia-etapa31.sql. Funciona en la vista del estudiante (pestaña «Asistencia y cambio») y en la de la empresa. */
const ASIS_TIPOS = { incapacidad:'Incapacidad médica', cita_medica:'Cita médica', calamidad:'Calamidad doméstica', permiso:'Permiso', otro:'Otro motivo' };
const ASIS_EST = { pendiente:['En revisión','cor-pendiente'], justificada:['Justificada','cor-enviado'], no_justificada:['No justificada','cor-error'] };
let asisFiles = { est:[], emp:[] };

function asisFechaCorta(d){ if(!d) return ''; const p = String(d).slice(0,10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(d); }
function asisHoy(delta){ const d = new Date(); d.setDate(d.getDate() + (delta || 0)); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function asisLeerB64(file){
  return new Promise((ok, mal)=>{ const r = new FileReader(); r.onerror = ()=>mal(new Error('No se pudo leer el archivo'));
    r.onload = ()=>{ const s = String(r.result || ''); ok(s.slice(s.indexOf(',') + 1)); }; r.readAsDataURL(file); });
}
function asisMsg(m, html, ok){ const e = document.getElementById('asMsg-' + m); if(e) e.innerHTML = html ? '<span style="color:' + (ok ? 'var(--teal-dark)' : 'var(--danger)') + '">' + html + '</span>' : ''; }
function asisRpc(m, nombre, args){
  if(m === 'est') return sb.rpc('est_asis_' + nombre, Object.assign({ p_token: state.token }, args || {}));
  return sb.rpc('emp_asis_' + nombre, Object.assign({ p_token: state.token, p_documento: state.documento }, args || {}));
}

function asisFormHtml(m){
  return `<div class="ec-card">
    <div class="subhead" style="margin-top:0;">Reportar una inasistencia${m === 'emp' ? ' de este estudiante' : ''}</div>
    <div class="field-row">
      <div class="field"><label>Tipo *</label><select id="asTipo-${m}">${Object.keys(ASIS_TIPOS).map(k=>`<option value="${k}">${ASIS_TIPOS[k]}</option>`).join('')}</select></div>
      <div class="field"><label>Desde *</label><input type="date" id="asDesde-${m}" value="${asisHoy(0)}" min="${asisHoy(-120)}" max="${asisHoy(60)}"></div>
      <div class="field"><label>Hasta (si fue más de un día)</label><input type="date" id="asHasta-${m}" min="${asisHoy(-120)}" max="${asisHoy(60)}"></div>
    </div>
    <div class="field"><label>¿Qué ocurrió? *</label><textarea id="asMotivo-${m}" rows="3" maxlength="1000" placeholder="Cuenta brevemente el motivo de la inasistencia"></textarea></div>
    <div class="field"><label>Soportes en PDF (incapacidad, cita, constancia…) — máx. 5 archivos de 5 MB</label>
      <input type="file" id="asArch-${m}" accept="application/pdf,.pdf" multiple onchange="asisElegir('${m}', this)">
      <div id="asNombres-${m}" class="helptext" style="margin-top:4px;"></div></div>
    <div class="actions-row" style="justify-content:flex-start;"><button class="primary" id="asEnviar-${m}" onclick="asisEnviar('${m}')">Enviar reporte</button><span id="asMsg-${m}"></span></div>
  </div>`;
}
function asisElegir(m, input){
  const nuevos = Array.from(input.files || []); input.value = '';
  for(const f of nuevos){
    if(!/\.pdf$/i.test(f.name)){ asisMsg(m, 'Solo se aceptan archivos PDF: ' + esc(f.name)); continue; }
    if(f.size > 5 * 1048576){ asisMsg(m, esc(f.name) + ' supera los 5 MB'); continue; }
    if(asisFiles[m].length >= 5){ asisMsg(m, 'Máximo 5 documentos por reporte'); break; }
    asisFiles[m].push(f);
  }
  asisNombres(m);
}
function asisNombres(m){
  const e = document.getElementById('asNombres-' + m); if(!e) return;
  e.innerHTML = asisFiles[m].map((f,i)=>'📄 ' + esc(f.name) + ' <a href="#" onclick="asisQuitarArch(\'' + m + '\',' + i + ');return false;" style="color:var(--danger)">quitar</a>').join('<br>');
}
function asisQuitarArch(m, i){ asisFiles[m].splice(i, 1); asisNombres(m); }

async function asisEnviar(m){
  const btn = document.getElementById('asEnviar-' + m); asisMsg(m, '');
  const datos = { tipo: document.getElementById('asTipo-' + m).value, desde: document.getElementById('asDesde-' + m).value, hasta: document.getElementById('asHasta-' + m).value || '', motivo: document.getElementById('asMotivo-' + m).value.trim() };
  if(!datos.desde) return asisMsg(m, 'Indica la fecha de la inasistencia');
  if(datos.motivo.length < 5) return asisMsg(m, 'Cuenta brevemente qué ocurrió');
  if(datos.tipo === 'incapacidad' && !asisFiles[m].length && !confirm('Elegiste «Incapacidad médica» pero no anexaste el PDF de la incapacidad. ¿Enviar el reporte sin soporte?')) return;
  btn.disabled = true;
  const r = await asisRpc(m, 'reportar', { p_datos: datos });
  if(r.error){ btn.disabled = false; return asisMsg(m, esc(r.error.message)); }
  const id = r.data.id; let fallos = [];
  for(const f of asisFiles[m]){
    try{ const b64 = await asisLeerB64(f); const s = await asisRpc(m, 'subir', { p_id: id, p_nombre: f.name, p_base64: b64 }); if(s.error) fallos.push(f.name + ': ' + s.error.message); }
    catch(e){ fallos.push(f.name + ': ' + e.message); }
  }
  asisFiles[m] = []; btn.disabled = false;
  toast(fallos.length ? 'Reporte enviado, pero algunos PDF no se pudieron anexar' : 'Reporte de inasistencia enviado', !!fallos.length);
  await asisCargar(m);
  if(fallos.length) asisMsg(m, esc(fallos.join(' · ')));
}
async function asisCargar(m){
  const caja = document.getElementById('asisCaja-' + m); if(!caja) return;
  const { data, error } = await asisRpc(m, 'lista');
  const items = (data && data.items) || [];
  const lista = error ? '<p style="color:var(--danger)">' + esc(error.message) + ' (¿ejecutaste cambio-empresa-asistencia-etapa31.sql?)</p>'
    : !items.length ? '<p style="color:var(--muted);font-size:13.5px;">No hay inasistencias reportadas.</p>'
    : '<div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Fecha</th><th>Tipo</th><th>Motivo</th><th>Reportó</th><th>Soportes</th><th>Estado</th><th>Respuesta</th><th></th></tr></thead><tbody>' + items.map(i=>{ const e = ASIS_EST[i.estado] || [i.estado, ''];
        return `<tr><td class="aud-nw"><b>${asisFechaCorta(i.desde)}${i.hasta !== i.desde ? '<br>→ ' + asisFechaCorta(i.hasta) : ''}</b></td><td>${esc(ASIS_TIPOS[i.tipo] || i.tipo)}</td><td>${esc(i.motivo)}</td>
          <td>${i.reportado_por === 'empresa' ? 'Empresa' : 'Estudiante'}</td><td>${i.docs.length ? i.docs.map(d=>'📎 ' + esc(d.nombre)).join('<br>') : '<span style="color:var(--muted)">Sin soportes</span>'}</td>
          <td><span class="cor-est ${e[1]}">${e[0]}</span></td><td>${i.observacion ? esc(i.observacion) : '—'}</td>
          <td>${i.estado === 'pendiente' && m === 'est' && i.reportado_por === 'estudiante' ? `<button class="ghost" onclick="asisEliminar('${i.id}')">Quitar</button>` : ''}</td></tr>`; }).join('') + '</tbody></table></div>';
  caja.innerHTML = '<div class="subhead">Inasistencias reportadas</div>' + lista;
}
async function asisEliminar(id){
  if(!confirm('¿Quitar este reporte? Se borrarán también los PDF anexados.')) return;
  const { error } = await asisRpc('est', 'eliminar', { p_id: id });
  if(error){ toast(error.message, true); return; }
  toast('Reporte quitado'); asisCargar('est');
}
function asisPintar(contenedor, m){
  contenedor.innerHTML = asisFormHtml(m) + '<div id="asisCaja-' + m + '"><p style="color:var(--muted)">Cargando…</p></div>';
  asisFiles[m] = [];
  asisCargar(m);
}

/* ---- Vista de la empresa: tarjeta debajo de las planillas mensuales ---- */
function asisEmpresaMontar(){
  const pantalla = document.getElementById('screen-empresa'); if(!pantalla || !state.documento) return;
  let card = document.getElementById('empAsisCard');
  if(!card){ card = document.createElement('div'); card.className = 'card'; card.id = 'empAsisCard'; pantalla.appendChild(card); }
  card.innerHTML = '<div class="section-bar teal">Asistencia a la práctica</div><p class="helptext" style="margin-top:-4px;">Reporta si el estudiante faltó (incapacidad, permiso, calamidad…) y anexa los soportes en PDF. El asistente de prácticas lo revisará.</p><div id="empAsisCont"></div>';
  asisPintar(document.getElementById('empAsisCont'), 'emp');
}
(function(){
  if(typeof renderEmpresa !== 'function') return;
  const _r = renderEmpresa;
  let ultimo = null;
  renderEmpresa = function(){
    const r = _r.apply(this, arguments);
    try{ if(ultimo !== state.documento || !document.getElementById('empAsisCard')){ ultimo = state.documento; asisEmpresaMontar(); } }catch(e){ console.error(e); }
    return r;
  };
})();

/* ============================= SUSPENSIÓN («congelación») DE LA PRÁCTICA =============================
   Cuando un estudiante tiene una incapacidad larga (más de un mes), una licencia de maternidad u otra novedad, la administración
   suspende su práctica y sube el soporte en PDF. Mientras está suspendida queda congelada (no se cambian notas, firmas ni datos) y NO se
   finaliza sola, así no avanza hacia la certificación ni la graduación. Al levantarla, la fecha final se corre los días suspendidos.
   Requiere suspension-practica-etapa75.sql. Permiso: «Estudiantes registrados». Todo se valida en el servidor. */
const susE = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const susF = f => { if(!f) return ''; const p = String(f).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : f; };
const SUS_TIPOS = { incapacidad: 'Incapacidad larga', licencia_maternidad: 'Licencia de maternidad', otra: 'Otra novedad' };
const susHoy = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);   // fecha de Bogotá
function susLeerB64(file){ return new Promise((ok, mal) => { const r = new FileReader(); r.onerror = () => mal(new Error('No se pudo leer el archivo')); r.onload = () => { const t = String(r.result || ''); ok(t.slice(t.indexOf(',') + 1)); }; r.readAsDataURL(file); }); }
function susCerrarModal(){ const m = document.getElementById('susModal'); if(m) m.remove(); }
function susModal(html){
  susCerrarModal();
  const m = document.createElement('div'); m.id = 'susModal'; m.className = 'cor-modal';
  m.innerHTML = '<div class="cor-caja" role="dialog" aria-modal="true" style="max-width:560px;">' + html + '</div>';
  m.addEventListener('click', e => { if(e.target === m) susCerrarModal(); });
  document.body.appendChild(m); return m;
}
function susVerSoporte(id){ return spaVisorPdf('Soporte de la suspensión', () => sb.rpc('admin_suspension_doc', { p_id: id })); }

/* ---------- Ficha del estudiante (administrador) ---------- */
async function susFichaPintar(){
  const box = document.getElementById('admResumen'); if(!box || !state || !state.record) return;
  let d = null;
  try{ const r = await sb.rpc('admin_suspension_estado', { p_documento: state.documento }); if(r.error) return; d = r.data; }catch(_){ return; }
  if(!d) return;
  let w = document.getElementById('susFicha');
  if(!w){ w = document.createElement('div'); w.id = 'susFicha'; box.insertAdjacentElement('beforebegin', w); }
  const v = d.vigente;
  const hist = (d.historial || []).filter(h => h.estado === 'levantada');
  const histHtml = hist.length ? '<details style="margin-top:8px;"><summary style="cursor:pointer;font-weight:600;">Historial de suspensiones (' + hist.length + ')</summary>' +
    hist.map(h => '<div class="aud-ref" style="margin:6px 0;">' + susE(SUS_TIPOS[h.tipo] || h.tipo) + ' · del ' + susE(susF(h.fecha_inicio)) + ' al ' + susE(susF(h.fecha_reintegro)) + ' (' + h.dias + ' días) · «' + susE(h.motivo) + '»' +
      (h.con_soporte ? ' · <a href="#" onclick="susVerSoporte(\'' + h.id + '\');return false;">ver soporte</a>' : '') + '</div>').join('') + '</details>' : '';
  if(v){
    const vencida = v.fecha_prevista && v.fecha_prevista < susHoy();
    w.innerHTML = '<div class="card" style="margin:10px 0;border-left:4px solid #C98A1B;background:#FFF8EA;">' +
      '<b>⏸ Práctica SUSPENDIDA (congelada)</b> <span class="aud-ref">' + susE(SUS_TIPOS[v.tipo] || v.tipo) + '</span>' +
      '<p class="helptext" style="margin:6px 0;">Desde el <b>' + susE(susF(v.fecha_inicio)) + '</b> (' + v.dias + ' días)' +
      (v.fecha_prevista ? ' · regreso previsto: <b' + (vencida ? ' style="color:#B24A4A;"' : '') + '>' + susE(susF(v.fecha_prevista)) + '</b>' + (vencida ? ' (ya pasó: confirma si regresó)' : '') : '') +
      '<br>Motivo: «' + susE(v.motivo) + '» · registró ' + susE(v.creado_por) + '.<br>Mientras esté suspendida nadie puede cambiar notas, firmas ni datos, y no se finaliza sola. Al levantarla, la fecha final se corre los días suspendidos.</p>' +
      '<div class="actions-row" style="justify-content:flex-start;">' + (v.con_soporte ? '<button class="ghost" onclick="susVerSoporte(\'' + v.id + '\')">📄 Ver soporte</button>' : '') +
      '<button class="primary" onclick="susAbrirLevantar(\'' + v.id + '\')">▶ Levantar suspensión</button></div>' + histHtml + '</div>';
  }else{
    const total = d.dias_total || 0;
    w.innerHTML = '<div class="card" style="margin:10px 0;"><b>⏸ Suspensión de la práctica</b>' +
      '<p class="helptext" style="margin:6px 0;">Si el estudiante tiene una <b>incapacidad de más de un mes</b>, una <b>licencia de maternidad</b> u otra novedad, suspende su práctica: queda congelada y no se finaliza ni certifica.' +
      (total ? ' Días ya suspendidos antes: <b>' + total + '</b>.' : '') + '</p>' +
      '<button class="ghost" onclick="susAbrirCrear()">⏸ Suspender práctica</button>' + histHtml + '</div>';
  }
}

function susAbrirCrear(){
  if(!state || !state.documento) return;
  const m = susModal('<h3 style="margin:0 0 4px;">Suspender la práctica</h3>' +
    '<p class="helptext" style="margin:0 0 10px;">La práctica quedará <b>congelada</b>: nadie podrá cambiar notas, firmas ni datos y no se finalizará sola. El estudiante recibirá un aviso. El soporte es un dato de salud: solo lo ve el personal autorizado.</p>' +
    '<div class="field"><label>Tipo de novedad *</label><select id="sus-tipo" onchange="susTipoCambio()"><option value="incapacidad">Incapacidad larga (más de un mes)</option><option value="licencia_maternidad">Licencia de maternidad</option><option value="otra">Otra novedad</option></select></div>' +
    '<div class="field-row"><div class="field"><label>Desde (fecha de inicio) *</label><input type="date" id="sus-ini" max="' + susHoy() + '" value="' + susHoy() + '"></div>' +
    '<div class="field"><label>Regreso previsto (opcional)</label><input type="date" id="sus-pre"></div></div>' +
    '<div class="field"><label>Detalle *</label><input id="sus-mot" maxlength="400" placeholder="Ej.: Incapacidad por 60 días, desde el 10 de noviembre"></div>' +
    '<div class="field"><label id="sus-pdf-et">Soporte en PDF (incapacidad o licencia) *</label><input type="file" id="sus-pdf" accept="application/pdf,.pdf"><div class="aud-ref">PDF de máximo 3 MB.</div></div>' +
    '<div id="susMsg" style="min-height:18px;margin:6px 0;"></div>' +
    '<div class="actions-row"><button class="ghost" onclick="susCerrarModal()">Cancelar</button><button class="primary" id="susOk" onclick="susCrear()">Suspender práctica</button></div>');
  susTipoCambio(m);
}
function susTipoCambio(){ const t = document.getElementById('sus-tipo'), l = document.getElementById('sus-pdf-et'); if(t && l) l.textContent = t.value === 'otra' ? 'Soporte en PDF (opcional)' : 'Soporte en PDF (incapacidad o licencia) *'; }
function susMsg(t, ok){ const m = document.getElementById('susMsg'); if(m) m.innerHTML = '<span style="color:' + (ok ? '#2E7D4F' : 'var(--danger)') + '">' + susE(t) + '</span>'; }
async function susCrear(){
  const tipo = document.getElementById('sus-tipo').value, ini = document.getElementById('sus-ini').value, pre = document.getElementById('sus-pre').value,
        mot = document.getElementById('sus-mot').value.trim(), f = document.getElementById('sus-pdf').files[0], btn = document.getElementById('susOk');
  if(!ini){ susMsg('Escribe la fecha de inicio.'); return; }
  if(ini > susHoy()){ susMsg('La fecha de inicio no puede ser futura: regístrala cuando comience.'); return; }
  if(pre && pre < ini){ susMsg('El regreso previsto no puede ser anterior al inicio.'); return; }
  if(mot.length < 5){ susMsg('Escribe el detalle (mínimo 5 letras).'); return; }
  if(tipo !== 'otra' && !f){ susMsg('Sube el soporte en PDF.'); return; }
  if(f && (!/\.pdf$/i.test(f.name) || f.size > 3 * 1048576)){ susMsg('El soporte debe ser un PDF de máximo 3 MB.'); return; }
  btn.disabled = true; susMsg('Guardando…', true);
  try{
    const args = { p_documento: state.documento, p_tipo: tipo, p_inicio: ini, p_prevista: pre || null, p_motivo: mot, p_nombre: f ? f.name : null, p_base64: f ? await susLeerB64(f) : null };
    const { error } = await sb.rpc('admin_suspension_crear', args);
    if(error) throw new Error(error.message);
    susCerrarModal(); toast('Práctica suspendida'); susFichaPintar(); if(typeof pfAdminPintar === 'function') pfAdminPintar();
  }catch(e){ btn.disabled = false; susMsg(e.message + (/does not exist|Could not find/i.test(e.message) ? ' (¿ejecutaste suspension-practica-etapa75.sql?)' : '')); }
}
function susAbrirLevantar(id){
  susModal('<h3 style="margin:0 0 4px;">Levantar la suspensión</h3>' +
    '<p class="helptext" style="margin:0 0 10px;">La práctica se reactiva y su <b>fecha final se corre</b> tantos días como duró la suspensión. El estudiante recibirá un aviso.</p>' +
    '<div class="field"><label>Fecha de regreso *</label><input type="date" id="sus-reg" max="' + susHoy() + '" value="' + susHoy() + '"></div>' +
    '<div class="field"><label>Motivo / observación *</label><input id="sus-lmot" maxlength="300" placeholder="Ej.: Terminó la incapacidad y regresó a la empresa"></div>' +
    '<div id="susMsg" style="min-height:18px;margin:6px 0;"></div>' +
    '<div class="actions-row"><button class="ghost" onclick="susCerrarModal()">Cancelar</button><button class="primary" id="susOk" onclick="susLevantar(\'' + id + '\')">Levantar suspensión</button></div>');
}
async function susLevantar(id){
  const reg = document.getElementById('sus-reg').value, mot = document.getElementById('sus-lmot').value.trim(), btn = document.getElementById('susOk');
  if(!reg){ susMsg('Escribe la fecha de regreso.'); return; }
  if(mot.length < 5){ susMsg('Escribe el motivo (mínimo 5 letras).'); return; }
  btn.disabled = true;
  const { error } = await sb.rpc('admin_suspension_levantar', { p_id: id, p_reintegro: reg, p_motivo: mot });
  if(error){ btn.disabled = false; susMsg(error.message); return; }
  susCerrarModal(); toast('Suspensión levantada: la práctica se reactivó');
  susFichaPintar(); if(typeof pfAdminPintar === 'function') pfAdminPintar();
}
if(typeof renderAdministrador === 'function'){
  const susO = renderAdministrador;
  renderAdministrador = async function(){ const r = await susO.apply(this, arguments); susFichaPintar(); return r; };
}

/* ---------- Lista general: Prácticas suspendidas ---------- */
let susFiltro = 'vigente';
function susPantalla(){
  let el = document.getElementById('screen-admin-suspensiones');
  if(!el){
    const ref = document.getElementById('screen-admin-hub') || document.querySelector('.screen'); if(!ref) return null;
    el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-suspensiones'; ref.parentNode.appendChild(el);
  }
  return el;
}
async function abrirSuspensiones(){
  if(!requireSupabase()) return;
  const el = susPantalla(); if(!el) return;
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Prácticas suspendidas</h2>
    <p class="helptext" style="text-align:justify;">Estudiantes cuya práctica está <b>congelada</b> por una incapacidad larga, una licencia de maternidad u otra novedad. Mientras estén aquí no se finalizan ni avanzan hacia la certificación. Para suspender o levantar, abre la ficha del estudiante en <b>Estudiantes registrados</b>.</p>
    <div class="card"><div class="field" style="max-width:240px;"><label>Mostrar</label><select id="susFiltro" onchange="susFiltro=this.value;susListar()"><option value="vigente">Suspendidas ahora</option><option value="todas">Todas (con historial)</option></select></div>
    <div id="susLista" style="margin-top:10px;"><p style="color:var(--muted)">Cargando…</p></div></div>`;
  document.getElementById('susFiltro').value = susFiltro;
  showScreen('screen-admin-suspensiones'); susListar();
}
async function susListar(){
  const c = document.getElementById('susLista'); if(!c) return;
  const { data, error } = await sb.rpc('admin_suspensiones_lista', { p_estado: susFiltro });
  if(error){ c.innerHTML = '<p style="color:var(--danger)">' + susE(error.message) + ' (¿ejecutaste suspension-practica-etapa75.sql?)</p>'; return; }
  const L = data || [];
  if(!L.length){ c.innerHTML = '<p class="helptext">No hay prácticas suspendidas.</p>'; return; }
  c.innerHTML = '<div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Estudiante</th><th>Motivo</th><th>Desde</th><th>Regreso previsto</th><th>Días</th><th>Estado</th><th></th></tr></thead><tbody>' +
    L.map(x => `<tr><td><b>${susE(x.nombre)}</b><br><span class="aud-ref">Doc. ${susE(x.documento)} · ${susE(x.programa || '')}</span></td>
      <td>${susE(SUS_TIPOS[x.tipo] || x.tipo)}<div class="aud-ref">${susE(x.motivo)}</div></td><td class="aud-nw">${susE(susF(x.fecha_inicio))}</td>
      <td class="aud-nw">${x.fecha_prevista ? susE(susF(x.fecha_prevista)) : '—'}${x.vencida ? '<div class="aud-ref" style="color:#B24A4A;">Ya pasó: confirma si regresó</div>' : ''}</td>
      <td class="aud-nw">${x.dias}</td><td>${x.estado === 'vigente' ? '<span class="chip" style="background:#FFF0CC;color:#7A5200;">Suspendida</span>' : '<span class="chip" style="background:#E3F0EE;color:#14403B;">Levantada ' + susE(susF(x.fecha_reintegro)) + '</span>'}</td>
      <td>${x.con_soporte ? '<button class="ghost" onclick="susVerSoporte(\'' + x.id + '\')">📄 Soporte</button>' : ''}</td></tr>`).join('') + '</tbody></table></div>';
}

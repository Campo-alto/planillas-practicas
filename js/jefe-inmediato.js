/* ============================= JEFE INMEDIATO DEL ESTUDIANTE =============================
   Ficha con nombre, cargo, teléfono y correo del jefe inmediato, para que la institución coordine las visitas y supervisiones.
   Se pide cuando las planillas del estudiante se habilitan. La diligencia el ESTUDIANTE o la EMPRESA: el primero que la llene bloquea al otro.
   Si nadie la diligencia, ambos ven un aviso y reciben una notificación; la administración tiene una lista con quienes faltan.
   Requiere jefe-inmediato-etapa76.sql. Todo se valida en el servidor. */
const jiE = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jiQuien = { estudiante: 'el estudiante', empresa: 'la empresa', administrador: 'la institución' };
function jiTel(t){ const d = String(t || '').replace(/[^0-9+]/g, ''); return d.length >= 7 ? d : ''; }
/* Líneas de contacto con enlaces para llamar o escribir (se usa también en las pantallas de supervisor y de visitas) */
function jiContactoHtml(j){
  if(!j) return '<span class="aud-ref" style="color:#B24A4A;">Jefe inmediato: sin registrar</span>';
  const tel = jiTel(j.telefono), mail = /^[^@\s<>"']+@[^@\s<>"']+\.[^@\s<>"']+$/.test(j.correo || '') ? j.correo : '';
  return '<span class="aud-ref">Jefe inmediato: <b>' + jiE(j.nombre) + '</b>' + (j.cargo ? ' (' + jiE(j.cargo) + ')' : '') +
    (j.telefono ? '<br>📞 ' + (tel ? '<a href="tel:' + tel + '">' + jiE(j.telefono) + '</a>' : jiE(j.telefono)) : '') +
    (mail ? '<br>✉️ <a href="mailto:' + jiE(mail) + '">' + jiE(mail) + '</a>' : '') + '</span>';
}
function jiFormHtml(j, pref, alGuardar){
  return '<div class="field-row"><div class="field"><label>Nombre completo del jefe inmediato *</label><input id="' + pref + '-nom" maxlength="120" value="' + jiE(j ? j.nombre : '') + '"></div>' +
    '<div class="field"><label>Cargo</label><input id="' + pref + '-car" maxlength="100" value="' + jiE(j ? j.cargo : '') + '" placeholder="Ej.: Coordinador de enfermería"></div></div>' +
    '<div class="field-row"><div class="field"><label>Teléfono o celular</label><input id="' + pref + '-tel" maxlength="30" inputmode="tel" value="' + jiE(j ? j.telefono : '') + '" placeholder="Ej.: 310 123 4567"></div>' +
    '<div class="field"><label>Correo electrónico</label><input id="' + pref + '-cor" type="email" maxlength="160" value="' + jiE(j ? j.correo : '') + '"></div></div>' +
    '<div class="aud-ref">Escribe al menos un teléfono o un correo. Se usará solo para coordinar las visitas de supervisión.</div>' +
    '<div id="' + pref + '-msg" style="min-height:18px;margin:6px 0;"></div>' +
    '<button class="primary" id="' + pref + '-ok" onclick="' + alGuardar + '">Guardar jefe inmediato</button>';
}
function jiLeer(pref){ const v = id => (document.getElementById(pref + '-' + id) || { value: '' }).value.trim(); return { nombre: v('nom'), cargo: v('car'), telefono: v('tel'), correo: v('cor') }; }
function jiMsg(pref, t, ok){ const m = document.getElementById(pref + '-msg'); if(m) m.innerHTML = '<span style="color:' + (ok ? '#2E7D4F' : 'var(--danger)') + '">' + jiE(t) + '</span>'; }
function jiValidar(d){
  if(d.nombre.length < 3) return 'Escribe el nombre completo del jefe inmediato.';
  if(!d.telefono && !d.correo) return 'Escribe al menos un teléfono o un correo.';
  if(d.telefono && (!/^[0-9+()\-\s.]{7,30}$/.test(d.telefono) || d.telefono.replace(/\D/g, '').length < 7)) return 'El teléfono no es válido (mínimo 7 números).';
  if(d.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.correo)) return 'El correo no es válido.';
  return '';
}

/* ---------- Estudiante y empresa ---------- */
let jiDoc = '';
async function jiPintar(anclaId){
  try{
    if(!sb || !state || !state.token || (state.role !== 'estudiante' && state.role !== 'empresa')) return;
    const ancla = document.getElementById(anclaId); if(!ancla) return;
    const doc = state.role === 'estudiante' ? state.documento : (state.record && state.record.documento) || state.documento; if(!doc) return;
    jiDoc = doc;
    const r = await sb.rpc('jefe_estado', { p_token: state.token, p_documento: doc });
    if(r.error || !r.data) return;                       // sin el SQL de la etapa 76 simplemente no aparece
    const d = r.data;
    let w = document.getElementById('jiCard');
    if(!d.habilitado){ if(w) w.remove(); return; }
    if(!w){ w = document.createElement('div'); w.id = 'jiCard'; ancla.insertAdjacentElement('afterend', w); }
    const j = d.jefe;
    let h = '';
    if(!j){
      h = '<div class="card" style="margin:12px 0;border-left:4px solid #C98A1B;background:#FFF8EA;"><b>👤 Falta registrar el jefe inmediato</b>' +
        '<p class="helptext" style="margin:6px 0 10px;">Necesitamos sus datos para coordinar con él las <b>visitas de supervisión</b>. ' +
        (state.role === 'estudiante' ? 'Puedes diligenciarlo tú o la empresa; quien lo haga primero lo deja listo para el otro.' : 'Puede diligenciarlo la empresa o el estudiante; quien lo haga primero lo deja listo para el otro.') + '</p>' +
        jiFormHtml(null, 'jiF', 'jiGuardar()') + '</div>';
    }else{
      h = '<div class="card" style="margin:12px 0;"><b>👤 Jefe inmediato</b> <span class="aud-ref">diligenciado por ' + jiE(jiQuien[j.diligenciado_por] || '') + '</span>' +
        '<p style="margin:6px 0;">' + jiContactoHtml(j) + '</p>' +
        (d.puede_editar ? '<button class="ghost" onclick="document.getElementById(\'jiEdit\').style.display=\'block\';this.style.display=\'none\'">Corregir datos</button>' +
          '<div id="jiEdit" style="display:none;margin-top:8px;">' + jiFormHtml(j, 'jiF', 'jiGuardar()') + '</div>'
          : '<p class="helptext" style="margin:6px 0 0;">🔒 ' + jiE(d.mensaje || '') + '</p>') + '</div>';
    }
    w.innerHTML = h;
  }catch(_){}
}
async function jiGuardar(){
  const d = jiLeer('jiF'), e = jiValidar(d); if(e){ jiMsg('jiF', e); return; }
  const b = document.getElementById('jiF-ok'); if(b) b.disabled = true; jiMsg('jiF', 'Guardando…', true);
  const { error } = await sb.rpc('jefe_guardar', { p_token: state.token, p_documento: jiDoc, p_nombre: d.nombre, p_cargo: d.cargo, p_telefono: d.telefono, p_correo: d.correo });
  if(error){ if(b) b.disabled = false; jiMsg('jiF', error.message); return; }
  toast('Jefe inmediato guardado');
  jiPintar(state.role === 'estudiante' ? 'estDatosGenerales' : 'empDatosGenerales');
}
if(typeof renderEstudiante === 'function'){ const o = renderEstudiante; renderEstudiante = function(){ const r = o.apply(this, arguments); jiPintar('estDatosGenerales'); return r; }; }
if(typeof renderEmpresa === 'function'){ const o2 = renderEmpresa; renderEmpresa = function(){ const r = o2.apply(this, arguments); if(state.role === 'empresa') jiPintar('empDatosGenerales'); return r; }; }

/* ---------- Administrador: ficha del estudiante ---------- */
async function jiFichaPintar(){
  const box = document.getElementById('admResumen'); if(!box || !state || !state.record) return;
  let d; try{ const r = await sb.rpc('admin_jefe_get', { p_documento: state.documento }); if(r.error) return; d = r.data; }catch(_){ return; }
  if(!d || !d.habilitado) { const x = document.getElementById('jiFicha'); if(x) x.remove(); return; }
  let w = document.getElementById('jiFicha');
  if(!w){ w = document.createElement('div'); w.id = 'jiFicha'; box.insertAdjacentElement('beforebegin', w); }
  const j = d.jefe;
  w.innerHTML = '<div class="card" style="margin:10px 0;' + (j ? '' : 'border-left:4px solid #C98A1B;background:#FFF8EA;') + '"><b>👤 Jefe inmediato</b> ' +
    (j ? '<span class="aud-ref">diligenciado por ' + jiE(jiQuien[j.diligenciado_por] || '') + '</span><p style="margin:6px 0;">' + jiContactoHtml(j) + '</p>' : '<p class="helptext" style="margin:6px 0;">Aún no lo han registrado el estudiante ni la empresa. Puedes diligenciarlo tú.</p>') +
    '<button class="ghost" onclick="document.getElementById(\'jiAdm\').style.display=\'block\';this.style.display=\'none\'">' + (j ? 'Corregir datos' : 'Registrar jefe inmediato') + '</button>' +
    '<div id="jiAdm" style="display:none;margin-top:8px;">' + jiFormHtml(j, 'jiA', 'jiAdmGuardar()') + '</div></div>';
}
async function jiAdmGuardar(){
  const d = jiLeer('jiA'), e = jiValidar(d); if(e){ jiMsg('jiA', e); return; }
  const b = document.getElementById('jiA-ok'); if(b) b.disabled = true;
  const { error } = await sb.rpc('admin_jefe_guardar', { p_documento: state.documento, p_nombre: d.nombre, p_cargo: d.cargo, p_telefono: d.telefono, p_correo: d.correo });
  if(error){ if(b) b.disabled = false; jiMsg('jiA', error.message); return; }
  toast('Jefe inmediato guardado'); jiFichaPintar();
}
if(typeof renderAdministrador === 'function'){ const o3 = renderAdministrador; renderAdministrador = async function(){ const r = await o3.apply(this, arguments); jiFichaPintar(); return r; }; }

/* ---------- Administrador: lista general ---------- */
let jiFiltro = 'faltan', jiLista = [];
function jiPantalla(){
  let el = document.getElementById('screen-admin-jefes');
  if(!el){ const ref = document.getElementById('screen-admin-hub') || document.querySelector('.screen'); if(!ref) return null; el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-jefes'; ref.parentNode.appendChild(el); }
  return el;
}
async function abrirJefes(){
  if(!requireSupabase()) return;
  const el = jiPantalla(); if(!el) return;
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Jefes inmediatos</h2>
    <p class="helptext" style="text-align:justify;">Contacto del jefe inmediato de cada estudiante con las planillas habilitadas, para coordinar las visitas y supervisiones. Lo diligencia el estudiante o la empresa (el primero bloquea al otro) y tú puedes completarlo o corregirlo desde la ficha del estudiante.</p>
    <div class="card"><div class="field-row"><div class="field" style="max-width:240px;"><label>Mostrar</label><select id="jiFiltro" onchange="jiFiltro=this.value;jiListar()"><option value="faltan">Los que faltan</option><option value="todos">Todos</option></select></div>
    <div class="field"><label>Buscar</label><input id="jiBuscar" placeholder="Nombre, documento o jefe" oninput="clearTimeout(window.__jiT);window.__jiT=setTimeout(jiListar,350)"></div></div>
    <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="jiRecordar()">✉️ Enviar recordatorio a los que faltan</button></div>
    <div id="jiLista" style="margin-top:10px;"><p style="color:var(--muted)">Cargando…</p></div></div>`;
  document.getElementById('jiFiltro').value = jiFiltro;
  showScreen('screen-admin-jefes'); jiListar();
}
async function jiListar(){
  const c = document.getElementById('jiLista'); if(!c) return;
  const q = (document.getElementById('jiBuscar') || { value: '' }).value.trim();
  const { data, error } = await sb.rpc('admin_jefes_lista', { p_filtro: jiFiltro, p_texto: q || null });
  if(error){ c.innerHTML = '<p style="color:var(--danger)">' + jiE(error.message) + ' (¿ejecutaste jefe-inmediato-etapa76.sql?)</p>'; return; }
  jiLista = data || [];
  if(!jiLista.length){ c.innerHTML = '<p class="helptext">' + (jiFiltro === 'faltan' ? 'No falta ningún jefe inmediato. 🎉' : 'No hay registros.') + '</p>'; return; }
  c.innerHTML = '<div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Estudiante</th><th>Modalidad</th><th>Jefe inmediato</th><th>Diligenciado por</th></tr></thead><tbody>' +
    jiLista.map(x => '<tr><td><b>' + jiE(x.nombre) + '</b><br><span class="aud-ref">Doc. ' + jiE(x.documento) + '</span></td><td>' + jiE(x.modalidad || '') + '</td><td>' +
      (x.jefe ? jiContactoHtml({ nombre: x.jefe, cargo: x.cargo, telefono: x.telefono, correo: x.correo }) : '<span class="cor-est cor-pendiente">Falta</span>') +
      '</td><td>' + (x.diligenciado_por ? jiE(jiQuien[x.diligenciado_por] || '') : '—') + '</td></tr>').join('') + '</tbody></table></div>';
}
async function jiRecordar(){
  if(!confirm('¿Enviar un recordatorio por correo a los estudiantes (y empresas) que aún no han diligenciado el jefe inmediato? Se envía como máximo uno por semana a cada persona.')) return;
  const { data, error } = await sb.rpc('admin_jefes_recordar');
  if(error){ toast(error.message, true); return; }
  toast(data ? 'Recordatorios en cola: ' + data + ' correo(s)' : 'No había correos nuevos por enviar');
}

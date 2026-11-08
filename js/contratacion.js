/* ============================= CONTRATO DE APRENDIZAJE =============================
   Fase 1 ESTUDIANTE: inscripción → verificación de pagos (institución) → hoja de vida → postulación.
   Fase 2 EMPRESA:    registro/ingreso → solicitudes (ofertas) → candidatos → entrevistas.
   Fase 3 INSTITUCIÓN: verifica pagos, aprueba empresas (SENA) y ofertas (funciones del programa), confirma contratación.
   Toda la lógica y las reglas de seguridad viven en la base de datos (SQL etapas 9A–9F). */

const CA_DIAS_DECISION = 3;
function caFmt(d){ if(!d) return '—'; const x = new Date(d); return isNaN(x) ? '—' : x.toLocaleDateString('es-CO') + ' ' + x.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}); }
async function caRpc(fn, args){
  if(!requireSupabase()) throw new Error('Sin conexión');
  const { data, error } = await sb.rpc(fn, args||{});
  if(error) throw new Error(error.message);
  return data;
}
const CA_ESTADO_TXT = { pendiente:'Pendiente', apto:'Apto', no_apto:'No apto', contratado:'Contratado', aprobada:'Aprobada', rechazada:'Rechazada', cerrada:'Cerrada',
  postulado:'Postulado', entrevista:'En entrevista', seleccionado:'Seleccionado (espera confirmación)', rechazada_estudiante:'Rechazada por el estudiante', descartada_empresa:'Descartada por la empresa' };
function caChip(e){ const c = {aprobada:'ok',apto:'ok',contratado:'ok',seleccionado:'ok',entrevista:'low',postulado:'low',pendiente:'low',no_apto:'no',rechazada:'no',rechazada_estudiante:'no',descartada_empresa:'no',cerrada:'low'}[e]||'low';
  return `<span class="ca-chip ca-${c}">${esc(CA_ESTADO_TXT[e]||e)}</span>`; }
function caScreen(id, html){
  let el = document.getElementById(id);
  if(!el){ const any = document.querySelector('.screen'); if(!any) return null; el = document.createElement('div'); el.className = 'screen'; el.id = id; any.parentNode.appendChild(el); }
  el.innerHTML = html; return el;
}
function caMsg(id, txt, ok){ const e = document.getElementById(id); if(e) e.innerHTML = txt ? `<span style="color:var(${ok?'--teal-dark':'--danger'})">${esc(txt)}</span>` : ''; }
function caLista(arr){ return arr || []; }

/* ======================================================================== */
/* FASE 1 · ESTUDIANTE                                                        */
/* ======================================================================== */
let caEst = null, caHv = { formacion:[], experiencia:[] }, caHvEditando = false;

(function(){
  if(typeof organizarPestanasEstudiante !== 'function') return;
  const _cards = cardsEstudiante;
  cardsEstudiante = function(){ const c = _cards(); const e = document.getElementById('estCaCard'); if(e) c.ca = e; return c; };
  const _org = organizarPestanasEstudiante;
  organizarPestanasEstudiante = function(){
    const rec = state.record;
    if(rec && _ca_modalidad(rec.modalidad)){
      if(!document.getElementById('estCaCard')){
        const last = document.getElementById('estMonthTabs'); const host = last ? last.closest('.card') : null;
        if(host){ const d = document.createElement('div'); d.className = 'card'; d.id = 'estCaCard'; host.insertAdjacentElement('afterend', d); }
      }
    }
    _org();
    const bar = document.getElementById('estTabs');
    if(bar && document.getElementById('estCaCard') && !document.getElementById('estTab-ca')){
      const b = document.createElement('button'); b.className = 'tab'; b.id = 'estTab-ca'; b.textContent = 'Contrato de aprendizaje';
      b.onclick = ()=>showEstTab('ca'); bar.appendChild(b);
    }
    // "Asignación de práctica no remunerada" solo aplica a Prácticas No Remuneradas: en otras modalidades se oculta
    if(rec && estNoPNR(rec)){ const t = document.getElementById('estTab-asig'); if(t) t.remove(); if(estTabActual==='asig') estTabActual = _ca_modalidad(rec.modalidad) ? 'ca' : 'datos'; }
    showEstTab(estTabActual);
  };
  const _show = showEstTab;
  showEstTab = function(tab){ if(tab === 'asig' && state.record && estNoPNR(state.record)) tab = _ca_modalidad(state.record.modalidad) ? 'ca' : 'datos'; _show(tab); if(tab === 'ca') caCargarEstudiante(); };
})();
function estNoPNR(rec){ return !!(rec && rec.modalidad && typeof esModalidadPNR==='function' && !esModalidadPNR(rec.modalidad)); }
function _ca_modalidad(m){ return /contrato.*aprendizaje/i.test(m||''); }

async function caCargarEstudiante(){
  const el = document.getElementById('estCaCard'); if(!el) return;
  el.innerHTML = '<p class="helptext">Cargando…</p>';
  try{ caEst = await caRpc('ca_mi_estado', { p_token: state.token }); }
  catch(e){ el.innerHTML = `<p style="color:var(--danger)">${esc(e.message)}</p>`; return; }
  caRenderEstudiante();
}

function caRenderEstudiante(){
  const el = document.getElementById('estCaCard'); const d = caEst;
  let h = '<div class="section-bar teal">Contrato de aprendizaje</div>';
  if(!d || !d.aplica){ el.innerHTML = h + '<p class="helptext">Esta sección es solo para estudiantes de la modalidad contrato de aprendizaje.</p>'; return; }
  const i = d.inscripcion;
  const pasos = ['Inscripción','Verificación de pagos','Hoja de vida','Postulación y entrevistas'];
  const paso = !i ? 0 : (i.estado==='pendiente' || i.estado==='no_apto') ? 1 : (!i.hv_completa ? 2 : 3);
  h += `<div class="ca-pasos">${pasos.map((p,k)=>`<div class="ca-paso ${k<paso?'hecho':k===paso?'actual':''}"><b>${k+1}</b><span>${p}</span></div>`).join('')}</div>`;
  if(!i){
    h += `<p class="helptext">Inscríbete para que la institución verifique que tienes al día los pagos de tu semestre de prácticas y confirme si eres apto para iniciar el proceso de contrato de aprendizaje.</p>
          <div class="actions-row"><button class="primary" onclick="caInscribirme()">Inscribirme al proceso</button></div>`;
  } else if(i.estado==='pendiente'){
    h += `<div class="note-box">⏳ Tu inscripción está en revisión: la institución está verificando tus pagos. Cuando te declaren apto podrás diligenciar tu hoja de vida.</div>`;
  } else if(i.estado==='no_apto'){
    h += `<div class="note-box" style="background:#FBEAE7;border-color:#F0C4BD;color:#8F2A20;">No fuiste declarado apto por ahora.${i.observacion?' <b>Observación:</b> '+esc(i.observacion):''} Comunícate con la institución.</div>`;
  } else if(i.estado==='contratado'){
    h += `<div class="note-box" style="background:#EAF6F0;border-color:#BFE3D0;color:#1E6B4A;">🎉 ¡Tu contrato de aprendizaje fue confirmado por la institución!</div>`;
  } else {
    h += `<div class="note-box" style="background:#EAF6F0;border-color:#BFE3D0;color:#1E6B4A;">✅ La institución te declaró <b>apto</b>${i.pagos?' (pagos verificados)':''}. ${i.hv_completa?'Tu hoja de vida está lista para que las empresas la vean.':'Ahora completa tu hoja de vida para que las empresas puedan tomarte.'}</div>`;
    if(!i.hv_completa || caHvEditando) h += caHvForm(i.hv);
    else h += `<div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="caEditarHv()">Editar mi hoja de vida</button></div>` + caProcesoEstudiante(d);
  }
  if(d.historial && d.historial.length){
    h += `<div class="subhead" style="margin-top:18px;">Historial</div><div class="cupos-wrap"><table class="cupos-table" style="min-width:480px"><thead><tr><th>Empresa</th><th>Cargo</th><th>Resultado</th><th>Fecha</th></tr></thead><tbody>${d.historial.map(x=>`<tr><td>${esc(x.empresa)}</td><td>${esc(x.cargo)}</td><td>${caChip(x.estado)}</td><td>${caFmt(x.fecha)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  el.innerHTML = h;
}
async function caInscribirme(){
  try{ await caRpc('ca_inscribirse', { p_token: state.token }); toast('Inscripción enviada'); caCargarEstudiante(); }catch(e){ toast(e.message, true); }
}

/* ---- hoja de vida ---- */
function caEditarHv(){ caHvEditando = true; caRenderEstudiante(); }
function caHvForm(hv){
  hv = hv || {};
  caHv.formacion = (hv.formacion && hv.formacion.length ? hv.formacion : [{titulo:'',institucion:'',anio:''}]).map(x=>({...x}));
  caHv.experiencia = (hv.experiencia||[]).map(x=>({...x}));
  caHv.cursos = (hv.cursos||[]).map(x=>({...x}));
  return `<div class="subhead" style="margin-top:14px;">Mi hoja de vida (la ven las empresas SIN tu nombre, documento ni contacto hasta que te llamen a entrevista)</div>
    <div class="field-row">
      <div class="field"><label>Teléfono *</label><input id="hv-tel" maxlength="30" value="${escapeAttr(hv.telefono||state.record.telefono||'')}"></div>
      <div class="field"><label>Ciudad *</label><input id="hv-ciudad" maxlength="80" value="${escapeAttr(hv.ciudad||'')}"></div>
      <div class="field"><label>Disponibilidad</label><input id="hv-disp" maxlength="200" placeholder="Ej. Inmediata, jornada mañana" value="${escapeAttr(hv.disponibilidad||'')}"></div>
    </div>
    <div class="field"><label>Perfil profesional * (mínimo 30 caracteres)</label><textarea id="hv-perfil" maxlength="1200" rows="3">${esc(hv.perfil||'')}</textarea></div>
    <div class="field"><label>Habilidades y competencias *</label><textarea id="hv-hab" maxlength="600" rows="2">${esc(hv.habilidades||'')}</textarea></div>
    <div class="field-row">
      <div class="field"><label>Idiomas</label><input id="hv-idi" maxlength="200" placeholder="Ej. Inglés básico (A2)" value="${escapeAttr(hv.idiomas||'')}"></div>
      <div class="field"><label>Herramientas y ofimática</label><input id="hv-her" maxlength="300" placeholder="Ej. Excel, Word, software contable" value="${escapeAttr(hv.herramientas||'')}"></div></div>
    <div class="field"><label>Logros o reconocimientos (opcional)</label><textarea id="hv-logros" maxlength="600" rows="2">${esc(hv.logros||'')}</textarea></div>
    <div class="subhead">Formación académica * (mínimo 1)</div><div id="hv-form"></div>
    <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="caHvAgregar('formacion')">+ Agregar formación</button></div>
    <div class="subhead">Cursos y certificaciones (opcional)</div><div id="hv-cur"></div>
    <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="caHvAgregar('cursos')">+ Agregar curso</button></div>
    <div class="subhead">Experiencia (opcional)</div><div id="hv-exp"></div>
    <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="caHvAgregar('experiencia')">+ Agregar experiencia</button></div>
    <div id="hvMsg" style="margin:8px 0;font-size:13px;"></div>
    <div class="actions-row"><button class="primary" onclick="caGuardarHv()">Guardar hoja de vida</button>${caHvEditando?'<button class="ghost" onclick="caHvEditando=false;caRenderEstudiante()">Cancelar</button>':''}</div>`;
}
function caHvPintar(){
  const f = document.getElementById('hv-form'), x = document.getElementById('hv-exp'), cu = document.getElementById('hv-cur'); if(!f||!x) return;
  if(cu) cu.innerHTML = (caHv.cursos||[]).map((r,k)=>`<div class="field-row ca-fila">
    <div class="field"><label>Curso / certificación</label><input maxlength="150" value="${escapeAttr(r.titulo)}" oninput="caHv.cursos[${k}].titulo=this.value"></div>
    <div class="field"><label>Institución</label><input maxlength="150" value="${escapeAttr(r.institucion)}" oninput="caHv.cursos[${k}].institucion=this.value"></div>
    <div class="field" style="max-width:110px"><label>Año</label><input maxlength="10" value="${escapeAttr(r.anio)}" oninput="caHv.cursos[${k}].anio=this.value"></div>
    <button class="danger cp-del" onclick="caHvQuitar('cursos',${k})">Quitar</button></div>`).join('');
  f.innerHTML = caHv.formacion.map((r,k)=>`<div class="field-row ca-fila">
    <div class="field"><label>Título / programa</label><input maxlength="150" value="${escapeAttr(r.titulo)}" oninput="caHv.formacion[${k}].titulo=this.value"></div>
    <div class="field"><label>Institución</label><input maxlength="150" value="${escapeAttr(r.institucion)}" oninput="caHv.formacion[${k}].institucion=this.value"></div>
    <div class="field" style="max-width:110px"><label>Año</label><input maxlength="10" value="${escapeAttr(r.anio)}" oninput="caHv.formacion[${k}].anio=this.value"></div>
    <button class="danger cp-del" onclick="caHvQuitar('formacion',${k})">Quitar</button></div>`).join('');
  x.innerHTML = caHv.experiencia.map((r,k)=>`<div class="field-row ca-fila">
    <div class="field"><label>Cargo</label><input maxlength="150" value="${escapeAttr(r.cargo)}" oninput="caHv.experiencia[${k}].cargo=this.value"></div>
    <div class="field"><label>Empresa</label><input maxlength="150" value="${escapeAttr(r.empresa)}" oninput="caHv.experiencia[${k}].empresa=this.value"></div>
    <div class="field"><label>Periodo</label><input maxlength="60" value="${escapeAttr(r.periodo)}" oninput="caHv.experiencia[${k}].periodo=this.value"></div>
    <div class="field"><label>Descripción</label><input maxlength="400" value="${escapeAttr(r.descripcion)}" oninput="caHv.experiencia[${k}].descripcion=this.value"></div>
    <button class="danger cp-del" onclick="caHvQuitar('experiencia',${k})">Quitar</button></div>`).join('');
}
function caHvAgregar(t){ if(caHv[t].length>=10){ toast('Máximo 10 registros', true); return; } caHv[t].push(t==='experiencia'?{cargo:'',empresa:'',periodo:'',descripcion:''}:{titulo:'',institucion:'',anio:''}); caHvPintar(); }
function caHvQuitar(t,k){ caHv[t].splice(k,1); caHvPintar(); }
async function caGuardarHv(){
  const hv = { telefono: val('hv-tel'), ciudad: val('hv-ciudad'), disponibilidad: val('hv-disp'), perfil: val('hv-perfil'), habilidades: val('hv-hab'), idiomas: val('hv-idi'), herramientas: val('hv-her'), logros: val('hv-logros'),
               cursos: (caHv.cursos||[]).filter(r=>(r.titulo||'').trim()), formacion: caHv.formacion.filter(r=>(r.titulo||'').trim()), experiencia: caHv.experiencia.filter(r=>(r.cargo||'').trim()) };
  try{ const r = await caRpc('ca_guardar_hv', { p_token: state.token, p_hv: hv });
    toast(r && r.completa ? 'Hoja de vida completa: ya puedes postularte' : 'Guardada, pero falta completar los campos obligatorios (*)', !(r&&r.completa));
    caHvEditando = !(r && r.completa); await caCargarEstudiante();
  }catch(e){ caMsg('hvMsg', e.message); }
}
// el <script> dentro de innerHTML no se ejecuta: pintar tras renderizar
(function(){ const _r = caRenderEstudiante; caRenderEstudiante = function(){ _r(); caHvPintar(); }; })();

/* ---- proceso activo / ofertas ---- */
function caProcesoEstudiante(d){
  let h = '';
  const p = d.postulacion;
  if(p){
    h += `<div class="subhead" style="margin-top:14px;">Mi proceso actual</div>
      <div class="ficha-wrap"><table class="ficha-table"><tbody>
        <tr><th>Empresa</th><td>${esc(p.empresa)}</td><th>Cargo</th><td>${esc(p.cargo)}</td></tr>
        <tr><th>Estado</th><td>${caChip(p.estado)}</td><th>Desde</th><td>${caFmt(p.desde)}</td></tr>
        <tr><th>Ciudad / jornada</th><td>${esc(p.ciudad||'—')} · ${esc(p.jornada||'—')}</td><th>Próxima decisión</th><td>${p.estado==='seleccionado'?'—':caFmt(p.proxima_decision)}</td></tr>
        <tr><th>Funciones</th><td colspan="3">${esc(p.funciones)}</td></tr></tbody></table></div>`;
    if(p.estado==='seleccionado') h += `<div class="note-box">La empresa te seleccionó. Falta la confirmación de la institución.</div>`;
    else if(p.puede_decidir) h += `<div class="note-box">Han pasado ${CA_DIAS_DECISION} días. Puedes <b>seguir esperando</b> a que la empresa avance, o <b>rechazar</b> esta oferta para postularte a otra (no podrás volver a esta empresa).</div>
      <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="caDecidir('${p.id}','esperar')">⏳ Seguir esperando ${CA_DIAS_DECISION} días</button><button class="danger" onclick="caDecidir('${p.id}','rechazar')">✖ Rechazar y buscar otra oferta</button></div>`;
    else h += `<p class="helptext">Podrás decidir si sigues esperando o rechazas esta oferta a partir del <b>${caFmt(p.proxima_decision)}</b>.</p>`;
    return h;
  }
  const of = d.ofertas || [];
  h += `<div class="subhead" style="margin-top:14px;">Ofertas disponibles para tu programa</div>`;
  if(!of.length) return h + '<p class="helptext">Por ahora no hay ofertas aprobadas para tu programa. Las empresas también pueden llamarte a entrevista.</p>';
  h += `<div class="cupos-wrap"><table class="cupos-table" style="min-width:760px"><thead><tr><th>Empresa</th><th>Cargo</th><th>Funciones</th><th>Ciudad</th><th>Jornada</th><th class="cp-c">Cupos</th><th></th></tr></thead><tbody>${of.map(o=>`<tr>
    <td class="cp-prog"><b>${esc(o.empresa)}</b></td><td>${esc(o.cargo)}</td><td style="max-width:320px">${esc(o.funciones)}</td><td>${esc(o.ciudad||'—')}</td><td>${esc(o.jornada||'—')}</td><td class="cp-c">${o.cupos}</td>
    <td><button class="primary" style="padding:6px 12px" onclick="caPostular('${o.id}')">Postularme</button></td></tr>`).join('')}</tbody></table></div>`;
  return h;
}
async function caPostular(id){ if(!confirm('¿Postularte a esta oferta? Solo puedes tener un proceso activo a la vez.')) return;
  try{ await caRpc('ca_postular', { p_token: state.token, p_oferta: id }); toast('Postulación enviada'); caCargarEstudiante(); }catch(e){ toast(e.message, true); } }
async function caDecidir(id, accion){
  if(accion==='rechazar' && !confirm('Si rechazas esta oferta NO podrás volver a postularte a esta empresa. ¿Continuar?')) return;
  try{ await caRpc('ca_decidir', { p_token: state.token, p_post: id, p_accion: accion }); toast(accion==='esperar'?'Seguirás esperando ' + CA_DIAS_DECISION + ' días más':'Oferta rechazada'); caCargarEstudiante(); }catch(e){ toast(e.message, true); }
}

/* ======================================================================== */
/* FASE 2 · EMPRESA                                                           */
/* ======================================================================== */
(function(){
  if(typeof goRoleLogin !== 'function') return;
  const _g = goRoleLogin;
  goRoleLogin = function(role){
    _g(role);
    if(role === 'empresa' && !document.getElementById('caLinks')){
      const scr = document.getElementById('screen-role-login'); if(!scr) return;
      const d = document.createElement('div'); d.id = 'caLinks'; d.className = 'card'; d.style.marginTop = '14px';
      d.innerHTML = `<div class="subhead" style="margin-top:0">¿Empresa de contrato de aprendizaje?</div>
        <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="caGoLogin()">Ingresar</button><button class="ghost" onclick="caGoRegistro()">Registrar mi empresa</button></div>`;
      scr.appendChild(d);
    }
  };
})();
function caVolverLoginEmpresa(){ if(typeof goHome==='function') goHome(); else showScreen('screen-role-login'); }

function caGoLogin(){
  caScreen('screen-ca-login', `<button class="linkbtn" onclick="caVolverLoginEmpresa()">← Volver</button>
    <div class="card" style="max-width:460px;margin:14px auto"><div class="section-bar teal">Empresa de contrato de aprendizaje · Ingreso</div>
      <div class="field"><label>Correo</label><input id="caEmail" type="email" autocomplete="username"></div>
      <div class="field"><label>Contraseña</label><input id="caPass" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')caLogin()"></div>
      <div id="caLoginMsg" style="margin:8px 0;font-size:13px;"></div>
      <div class="actions-row"><button class="primary" onclick="caLogin()">Ingresar</button><button class="ghost" onclick="caGoRegistro()">Registrar mi empresa</button></div></div>`);
  if(typeof initPwToggles==='function') initPwToggles();
  showScreen('screen-ca-login');
}
async function caLogin(){
  const email = val('caEmail'), pass = document.getElementById('caPass').value;
  if(!email || !pass){ caMsg('caLoginMsg','Escribe correo y contraseña.'); return; }
  try{
    const data = await caRpc('login_role_account', { p_email: email, p_password: pass });
    if(data && data.role === 'empresa' && data.token){   // es una empresa de prácticas (no contrato de aprendizaje): la llevamos a su acceso
      state.token = data.token; state.role = 'empresa'; state.pendingRole = 'empresa';
      state.currentUserNombre = data.nombre || ''; state.currentUserEmail = data.email || email;
      document.getElementById('caPass').value = ''; goRole('empresa'); return;
    }
    if(!data || data.role !== 'empresa_ca'){ caMsg('caLoginMsg','Correo o contraseña incorrectos.'); return; }
    state.token = data.token; state.role = 'empresa_ca'; state.pendingRole = 'empresa_ca';
    state.currentUserNombre = data.nombre || ''; state.currentUserEmail = data.email || email;
    document.getElementById('caPass').value = '';
    caEmpTab = 'plan';          // al ingresar: directo a buscar al aprendiz y asignar notas
    caAbrirPanel();
  }catch(e){ caMsg('caLoginMsg', e.message); }
}
function caGoRegistro(){
  caScreen('screen-ca-registro', `<button class="linkbtn" onclick="caVolverLoginEmpresa()">← Volver</button>
    <div class="card" style="max-width:720px;margin:14px auto"><div class="section-bar teal">Registro de empresa · Contrato de aprendizaje</div>
      <p class="helptext">Tu registro quedará <b>pendiente</b> hasta que la institución verifique que la empresa aparece en la plataforma del SENA. Después podrás publicar tus solicitudes de aprendices.</p>
      <div class="field-row">
        <div class="field"><label>Razón social *</label><input id="rgRazon" maxlength="160"></div>
        <div class="field"><label>NIT * (con dígito de verificación)</label><input id="rgNit" maxlength="20" placeholder="900123456-7"></div>
        <div class="field"><label>Persona de contacto</label><input id="rgContacto" maxlength="120"></div>
        <div class="field"><label>Teléfono</label><input id="rgTel" maxlength="40"></div>
        <div class="field"><label>Ciudad</label><input id="rgCiudad" maxlength="80"></div>
        <div class="field"><label>Dirección</label><input id="rgDir" maxlength="160"></div>
        <div class="field"><label>Sitio web</label><input id="rgWeb" maxlength="160"></div>
        <div class="field"><label>Correo de acceso *</label><input id="rgEmail" type="email" maxlength="120" autocomplete="username"></div>
        <div class="field"><label>Contraseña * (mínimo 8)</label><input id="rgPass" type="password" maxlength="100" autocomplete="new-password"></div>
      </div>
      <label class="lista-chk" style="margin:8px 0"><input type="checkbox" id="rgAcepto"> Autorizo el tratamiento de los datos de la empresa y me comprometo a usar la información de los estudiantes solo para el proceso de selección (Ley 1581 de 2012).</label>
      <div id="rgMsg" style="margin:8px 0;font-size:13px;"></div>
      <div class="actions-row"><button class="primary" onclick="caRegistrar()">Enviar registro</button></div></div>`);
  if(typeof initPwToggles==='function') initPwToggles();
  showScreen('screen-ca-registro');
}
async function caRegistrar(){
  if(!document.getElementById('rgAcepto').checked){ caMsg('rgMsg','Debes aceptar el tratamiento de datos.'); return; }
  try{
    await caRpc('ca_registrar_empresa', { p_email: val('rgEmail'), p_password: document.getElementById('rgPass').value, p_razon: val('rgRazon'), p_nit: val('rgNit'),
      p_contacto: val('rgContacto'), p_telefono: val('rgTel'), p_direccion: val('rgDir'), p_ciudad: val('rgCiudad'), p_sitio: val('rgWeb') });
    caMsg('rgMsg','Registro enviado. La institución lo revisará; cuando lo apruebe podrás ingresar con tu correo y contraseña.', true);
    document.getElementById('rgPass').value = '';
  }catch(e){ caMsg('rgMsg', e.message); }
}

let caEmp = null, caEmpTab = 'ofertas', caEmpProcesos = [], caEmpCand = null;
async function caAbrirPanel(){
  try{ caEmp = await caRpc('ca_emp_mi', { p_token: state.token }); }
  catch(e){ toast(e.message, true); caSalir(); return; }
  caPintarPanel();
}
function caSalir(){ state.caMode = false; if(sb && state.token){ sb.rpc('role_logout', { p_token: state.token }); } if(typeof _ssClear==='function') _ssClear(); state.token = null; state.role = null; state.pendingRole = null; goHome(); }
async function caPintarPanel(){
  const e = caEmp.empresa, aprobada = e.estado === 'aprobada';
  const aviso = aprobada ? '' : `<div class="note-box" style="margin-bottom:12px;">${e.estado==='pendiente'?'⏳ Tu empresa está pendiente de aprobación: la institución verifica que aparezca en la plataforma del SENA.':'✖ Tu empresa no fue aprobada.'}${e.observacion?' <b>Observación:</b> '+esc(e.observacion):''}</div>`;
  caScreen('screen-ca-panel', `<div class="status-strip"><div class="who">Empresa <b>${esc(e.razon_social)}</b> · NIT ${esc(e.nit)} · ${caChip(e.estado)}</div>
      <div class="actions"><button class="danger" onclick="caSalir()">Cerrar sesión</button></div></div>${aviso}
    <div class="tabs"><button class="tab ${caEmpTab==='ofertas'?'active':''}" onclick="caEmpIr('ofertas')">Mis solicitudes</button>
      <button class="tab ${caEmpTab==='cand'?'active':''}" onclick="caEmpIr('cand')">Candidatos</button>
      <button class="tab ${caEmpTab==='proc'?'active':''}" onclick="caEmpIr('proc')">Procesos</button>
      <button class="tab ${caEmpTab==='plan'?'active':''}" onclick="caEmpIr('plan')">Planillas de calificaciones</button></div>
    <div class="card" id="caEmpBody"></div>`);
  showScreen('screen-ca-panel');
  if(caEmpTab==='ofertas') caPintarOfertas(); else if(caEmpTab==='cand') caPintarCandidatos(); else if(caEmpTab==='plan') await caPintarPlanillas(); else await caPintarProcesos();
}
function caEmpIr(t){ caEmpTab = t; caPintarPanel(); }

async function caPintarOfertas(){
  const body = document.getElementById('caEmpBody'); const aprobada = caEmp.empresa.estado==='aprobada';
  await loadProgramas();
  const progs = (programasCache||[]).map(p=>`<option value="${escapeAttr(p.nombre)}">${esc(p.nombre)}</option>`).join('');
  let h = '<div class="section-bar teal">Solicitudes de aprendices</div>';
  if(aprobada) h += `<div class="subhead">Nueva solicitud</div><div class="field-row">
      <div class="field"><label>Cargo *</label><input id="ofCargo" maxlength="120"></div>
      <div class="field"><label>Programa de formación *</label><select id="ofProg"><option value="">Selecciona…</option>${progs}</select></div>
      <div class="field" style="max-width:110px"><label>Cupos *</label><input id="ofCupos" type="number" min="1" max="200" value="1"></div>
      <div class="field"><label>Ciudad</label><input id="ofCiudad" maxlength="80"></div></div>
    <div class="field"><label>Días de la jornada * (marca los que aplican)</label>
      <div class="ca-dias">${CA_DIAS.map(d=>`<label class="ca-dia"><input type="checkbox" class="ofDia" value="${d}"><span>${d}</span></label>`).join('')}</div>
      <div class="actions-row" style="justify-content:flex-start;margin:4px 0 0"><button type="button" class="ghost cp-del" onclick="caDiasSel('lv')">Lunes a viernes</button><button type="button" class="ghost cp-del" onclick="caDiasSel('ls')">Lunes a sábado</button><button type="button" class="ghost cp-del" onclick="caDiasSel('')">Limpiar</button></div></div>
    <div class="field-row">
      <div class="field" style="max-width:170px"><label>Hora de inicio *</label><input id="ofHi" type="time" value="08:00"></div>
      <div class="field" style="max-width:170px"><label>Hora de fin *</label><input id="ofHf" type="time" value="17:00"></div>
      <div class="field"><label>Nota del horario (opcional)</label><input id="ofNota" maxlength="80" placeholder="Ej. 1 hora de almuerzo"></div></div>
    <div class="field"><label>Funciones que desempeñará el aprendiz * (la institución verificará que correspondan al programa)</label><textarea id="ofFunc" rows="3" maxlength="2000"></textarea></div>
    <div id="ofMsg" style="margin:6px 0;font-size:13px;"></div><div class="actions-row"><button class="primary" onclick="caCrearOferta()">Enviar solicitud a la institución</button></div>`;
  const of = caEmp.ofertas || [];
  h += `<div class="subhead" style="margin-top:16px;">Mis solicitudes</div>` + (of.length ? `<div class="cupos-wrap"><table class="cupos-table" style="min-width:760px"><thead><tr><th>Cargo</th><th>Programa</th><th>Funciones</th><th>Días y horario</th><th class="cp-c">Cupos</th><th class="cp-c">Contratados</th><th>Estado</th><th>Observación</th></tr></thead><tbody>${of.map(o=>`<tr><td><b>${esc(o.cargo)}</b></td><td>${esc(o.programa)}</td><td style="max-width:300px">${esc(o.funciones)}</td><td>${esc(o.jornada||'—')}</td><td class="cp-c">${o.cupos}</td><td class="cp-c">${o.contratados}</td><td>${caChip(o.estado)}</td><td>${esc(o.observacion||'')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="helptext">Aún no has creado solicitudes.</p>');
  body.innerHTML = h;
}
const CA_DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
function caDiasSel(modo){ document.querySelectorAll('.ofDia').forEach(c=>{ c.checked = modo==='lv' ? CA_DIAS.slice(0,5).includes(c.value) : modo==='ls' ? CA_DIAS.slice(0,6).includes(c.value) : false; }); }
async function caCrearOferta(){
  try{ await caRpc('ca_emp_crear_oferta', { p_token: state.token, p_cargo: val('ofCargo'), p_programa: val('ofProg'), p_funciones: val('ofFunc'), p_cupos: parseInt(val('ofCupos'),10),
      p_dias: [...document.querySelectorAll('.ofDia:checked')].map(x=>x.value).join(','), p_hora_ini: val('ofHi'), p_hora_fin: val('ofHf'), p_nota: val('ofNota'), p_ciudad: val('ofCiudad') });
    toast('Solicitud enviada: queda pendiente de aprobación'); caAbrirPanel();
  }catch(e){ caMsg('ofMsg', e.message); }
}

// Ficha vertical tipo formulario: una fila por dato (etiqueta a la izquierda, valor a la derecha)
function caFila(t, v){ return (v===undefined || v===null || v==='') ? '' : `<div class="ca-f"><dt>${t}</dt><dd>${v}</dd></div>`; }
function caFicha(titulo, chip, filas, acciones){
  return `<div class="ca-form"><div class="ca-form-head"><b>${titulo}</b>${chip||''}</div><dl class="ca-form-body">${filas.join('')}</dl>${acciones?`<div class="ca-acc ca-form-acc">${acciones}</div>`:''}</div>`;
}
function caCandCard(c, acciones, meta){
  meta = meta || {};
  const f = (c.formacion||[]).map(x=>`${esc(x.titulo)}${x.institucion?' · '+esc(x.institucion):''}${x.anio?' ('+esc(x.anio)+')':''}`).join('<br>');
  const x = (c.experiencia||[]).map(y=>`${esc(y.cargo)}${y.empresa?' · '+esc(y.empresa):''}${y.periodo?' ('+esc(y.periodo)+')':''}${y.descripcion?': '+esc(y.descripcion):''}`).join('<br>');
  const cu = (c.cursos||[]).map(y=>esc(y.titulo)+(y.institucion?' · '+esc(y.institucion):'')+(y.anio?' ('+esc(y.anio)+')':'')).join('<br>');
  const contacto = `✉ ${esc(c.correo||'—')}<br>☎ ${esc(c.telefono||'—')}`;
  const filas = [
    caFila('Nombre completo', c.nombre ? '<b>'+esc(c.nombre)+'</b>' : 'Candidato'),
    caFila('Documento', c.documento ? esc(c.documento) : ''),
    caFila('Semestre', esc(c.semestre||'—')), caFila('Ciudad', esc(c.ciudad||'—')),
    caFila('Solicitud', meta.solicitud ? esc(meta.solicitud) : ''), caFila('Origen', meta.origen || ''), caFila('Fecha', meta.fecha || ''),
    caFila('Datos de contacto', contacto), caFila('Carta de fechas', meta.carta || ''),
    caFila('Perfil', esc(c.perfil||'')), caFila('Habilidades', esc(c.habilidades||'—')), caFila('Disponibilidad', esc(c.disponibilidad||'—')),
    caFila('Idiomas', esc(c.idiomas||'')), caFila('Herramientas', esc(c.herramientas||'')),
    caFila('Formación', f||'—'), caFila('Experiencia', x||'—'), caFila('Cursos y certificaciones', cu), caFila('Logros', esc(c.logros||''))];
  return caFicha(c.nombre ? esc(c.nombre) : 'Candidato', meta.chip || `<span class="cupo-jor">Semestre ${esc(c.semestre||'—')}</span>`, filas, acciones);
}
async function caPintarCandidatos(){
  const body = document.getElementById('caEmpBody');
  const aprob = (caEmp.ofertas||[]).filter(o=>o.estado==='aprobada');
  if(caEmp.empresa.estado!=='aprobada' || !aprob.length){ body.innerHTML = '<div class="section-bar teal">Candidatos</div><p class="helptext">Cuando la institución apruebe una de tus solicitudes podrás ver aquí los estudiantes aptos de ese programa y llamarlos a entrevista.</p>'; return; }
  body.innerHTML = `<div class="section-bar teal">Candidatos disponibles</div><div class="field" style="max-width:520px"><label>Solicitud</label><select id="caOfSel" onchange="caCargarCand()">${aprob.map(o=>`<option value="${o.id}">${esc(o.cargo)} — ${esc(o.programa)}</option>`).join('')}</select></div><div id="caCandList"></div>`;
  caCargarCand();
}
async function caCargarCand(){
  const el = document.getElementById('caCandList'); const id = document.getElementById('caOfSel').value; el.innerHTML = '<p class="helptext">Cargando…</p>';
  try{ const list = await caRpc('ca_emp_candidatos', { p_token: state.token, p_oferta: id });
    if(list.length){ el.innerHTML = `<p class="helptext">${list.length} candidato(s) disponible(s). Ves su nombre, correo, teléfono y hoja de vida.</p>` + list.map(c=>caCandCard(c, `<button class="primary" onclick="caTomar('${id}','${c.id}')">Llamar a entrevista</button>`)).join(''); return; }
    let inf = null; try{ inf = await caRpc('ca_emp_candidatos_info', { p_token: state.token, p_oferta: id }); }catch(_){}
    el.innerHTML = `<div class="note-box"><b>Todavía no hay candidatos para esta solicitud.</b> Un estudiante aparece aquí cuando: se inscribió, la institución lo declaró <b>apto</b>, completó su <b>hoja de vida</b>, es del <b>mismo programa</b> de la solicitud y no está en otro proceso.${inf ? `<br><br>Estudiantes del programa — inscritos: <b>${inf.inscritos}</b> · aptos: <b>${inf.aptos}</b> · con hoja de vida completa: <b>${inf.con_hv}</b> · ya en otro proceso: <b>${inf.en_proceso}</b>.` : ''}<br>Los estudiantes también pueden postularse solos a tu solicitud: esos aparecen en la pestaña <b>Procesos</b>.</div>`;
  }catch(e){ el.innerHTML = `<p style="color:var(--danger)">${esc(e.message)}</p>`; }
}
async function caTomar(of, cand){ try{ await caRpc('ca_emp_tomar', { p_token: state.token, p_oferta: of, p_candidato: cand }); toast('Candidato llamado a entrevista'); caCargarCand(); }catch(e){ toast(e.message, true); caCargarCand(); } }
async function caPintarProcesos(){
  const body = document.getElementById('caEmpBody'); body.innerHTML = '<p class="helptext">Cargando…</p>';
  try{ caEmpProcesos = await caRpc('ca_emp_procesos', { p_token: state.token }); }catch(e){ body.innerHTML = `<p style="color:var(--danger)">${esc(e.message)}</p>`; return; }
  caCartasEmp = {}; caCartasOk = true;
  try{ (await caRpc('ca_emp_cartas', { p_token: state.token })).forEach(c=>{ caCartasEmp[c.post] = c; }); }catch(e){ caCartasOk = false; }
  const cerrados = ['rechazada_estudiante','descartada_empresa'];
  const act = caEmpProcesos.filter(p=>!cerrados.includes(p.estado)), cer = caEmpProcesos.filter(p=>cerrados.includes(p.estado));
  const btn = p => {
    const a = [];
    if(p.estado==='postulado') a.push(`<button class="primary" onclick="caAccion('${p.id}','entrevista')">Llamar a entrevista</button>`);
    if(p.estado==='entrevista') a.push(`<button class="primary" onclick="caAccion('${p.id}','seleccionar')">Seleccionar</button>`);
    if(['postulado','entrevista','seleccionado'].includes(p.estado)) a.push(`<button class="danger" onclick="caAccion('${p.id}','descartar')">Descartar</button>`);
    return a.join(' '); };
  const ficha = (p, abiertos)=> caCandCard(p, abiertos ? btn(p) : '', { carta: caCartaEmpHtml(p), solicitud: p.oferta, origen: p.origen==='estudiante'?'Se postuló':'La empresa lo llamó', fecha: caFmt(p.desde), chip: caChip(p.estado) });
  body.innerHTML = '<div class="section-bar teal">Procesos</div>' +
    (act.length ? `<p class="helptext" style="margin:4px 0">${act.length} proceso(s) activo(s)</p><div class="ca-fichas">${act.map(p=>ficha(p,true)).join('')}</div>` : '<p class="helptext">No hay procesos activos.</p>') +
    (cer.length ? `<div class="subhead" style="margin-top:16px;">Cerrados</div><div class="ca-fichas ca-cerrada">${cer.map(p=>ficha(p,false)).join('')}</div>` : '');
}
let caPlanLista = [], caPlanQ = '';
async function caPintarPlanillas(){
  const body = document.getElementById('caEmpBody');
  body.innerHTML = '<p class="helptext">Cargando…</p>';
  try{ caPlanLista = await caRpc('ca_emp_planillas', { p_token: state.token }); }
  catch(e){ body.innerHTML = `<p style="color:var(--danger)">${esc(e.message)}</p>`; return; }
  caPlanQ = '';
  body.innerHTML = `<div class="section-bar teal">Planillas de calificaciones de tus aprendices</div><p class="helptext">Se habilitan cuando la institución confirma la contratación del estudiante. Aquí calificas las competencias y diligencias el control mensual, igual que las demás empresas.</p>
    ${caPlanLista.length ? `<div class="field" style="max-width:420px"><label>Buscar por documento, nombre, programa o cargo</label><input id="caPlanBuscar" type="search" placeholder="Escribe para filtrar…" oninput="caPlanFiltrar(this.value)" autocomplete="off"></div>` : ''}
    <div id="caPlanTabla"></div>`;
  caPlanTabla();
}
function caPlanFiltrar(v){ caPlanQ = v; caPlanTabla(); }
function caPlanTabla(){
  const box = document.getElementById('caPlanTabla'); if(!box) return;
  const norm = t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const q = norm(caPlanQ).trim();
  const L = q ? caPlanLista.filter(x=>norm([x.documento,x.nombre,x.programa,x.cargo].join(' ')).includes(q)) : caPlanLista;
  if(!caPlanLista.length){ box.innerHTML = '<p class="helptext">Aún no tienes aprendices contratados. Cuando la institución confirme una contratación, aparecerá aquí con su planilla habilitada.</p>'; return; }
  if(!L.length){ box.innerHTML = '<p class="helptext">Ningún aprendiz coincide con la búsqueda.</p>'; return; }
  box.innerHTML = `<p class="helptext" style="margin:4px 0">${L.length} de ${caPlanLista.length} aprendiz(ces)</p><div class="cupos-wrap"><table class="cupos-table" style="min-width:700px"><thead><tr><th>N.º de documento</th><th>Nombre</th><th>Programa</th><th>Cargo</th><th>Contratado desde</th><th></th></tr></thead><tbody>${L.map(x=>`<tr><td>${esc(x.documento)}</td><td class="cp-prog"><b>${esc(x.nombre)}</b></td><td>${esc(x.programa||'—')}</td><td>${esc(x.cargo||'—')}</td><td>${caFmt(x.desde)}</td><td><button class="primary cp-del" onclick="caAbrirPlanilla('${escapeAttr(x.documento)}')">Abrir planilla</button></td></tr>`).join('')}</tbody></table></div>`;
}
// abre la planilla reutilizando la pantalla de empresa (el servidor valida que el estudiante sea de esta empresa)
async function caAbrirPlanilla(doc){
  state.caMode = true; state.role = 'empresa'; state.pendingRole = 'empresa'; state.documento = doc; state.empMonth = state.empMonth||0;
  const rec = await getRecord(doc);
  if(!rec){ state.caMode = false; state.role = 'empresa_ca'; state.pendingRole = 'empresa_ca'; toast('No se pudo abrir la planilla de este estudiante', true); return; }
  state.record = rec; state.isNewRecord = false;
  renderEmpresa();
}
function caVolverPanel(tab){ state.caMode = false; state.role = 'empresa_ca'; state.pendingRole = 'empresa_ca'; state.documento = null; state.record = null; caEmpTab = tab || 'plan'; caAbrirPanel(); }
(function(){
  if(typeof switchStudent === 'function'){ const _sw = switchStudent; switchStudent = function(role){ if(state.caMode) return caVolverPanel('plan'); return _sw.apply(this, arguments); }; }
  if(typeof roleLogout === 'function'){ const _rl = roleLogout; roleLogout = function(){ if(state.caMode) return caSalir(); return _rl.apply(this, arguments); }; }
})();
async function caAccion(id, a){
  if(a==='descartar' && !confirm('¿Descartar a este candidato? No podrás volver a tomarlo.')) return;
  try{ await caRpc('ca_emp_accion', { p_token: state.token, p_post: id, p_accion: a }); toast('Listo'); caPintarProcesos(); }catch(e){ toast(e.message, true); }
}
// recargar la sesión de empresa de contrato de aprendizaje tras actualizar la página
window.addEventListener('load', async ()=>{
  try{
    const s = JSON.parse(sessionStorage.getItem('cai_sesion_v1')||'null');
    if(s && s.role==='empresa_ca' && s.token && document.getElementById('screen-role-login') && document.getElementById('screen-empresa') && !state.token){
      state.token = s.token; state.role = 'empresa_ca'; state.pendingRole = 'empresa_ca'; state.currentUserEmail = s.email||'';
      if(s.screen==='screen-empresa' && s.documento && s.ca){ state.empMonth = s.empMonth||0; await caAbrirPlanilla(s.documento); if(!state.caMode){ await caAbrirPanel(); } }
      else await caAbrirPanel();
    }
  }catch(e){}
});

/* ======================================================================== */
/* FASE 3 · INSTITUCIÓN (administrador)                                       */
/* ======================================================================== */
(function(){
  const grid = document.querySelector('#screen-admin-hub .role-grid');
  if(grid && !document.getElementById('caHubCard')){
    const c = document.createElement('div'); c.className = 'role-card empresa'; c.id = 'caHubCard'; c.onclick = caAbrirAdmin;
    c.innerHTML = '<div class="icon">🤝</div><h3>Contrato de aprendizaje</h3><p>Verificar pagos, aprobar empresas y solicitudes, y confirmar contrataciones.</p>';
    grid.appendChild(c);
  }
})();
let caAdmTab = 'ins', caAdmData = {};
// Cada pestaña pertenece a una función con su permiso (roles-permisos-etapa18.sql)
const CA_TAB_PERMISO = { ins:'est_contrato', emp:'emp_ca', ofe:'emp_solicitudes', pro:'est_contrato' };
function caTabPermitida(k){ return typeof puede !== 'function' || puede(CA_TAB_PERMISO[k]); }
async function caAbrirAdmin(){ caAdmTab = ['ins','pro','emp','ofe'].find(caTabPermitida) || 'ins'; await caAdmPintar(); }
async function caAdmPintar(){
  const tabs = [['ins','Inscripciones'],['emp','Empresas'],['ofe','Solicitudes'],['pro','Procesos']].filter(([k])=>caTabPermitida(k));
  if(!caTabPermitida(caAdmTab) && tabs.length) caAdmTab = tabs[0][0];
  caScreen('screen-admin-ca', `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Contrato de aprendizaje</h2><p class="helptext">Tres fases: estudiante → empresa → institución. Aquí validas pagos, empresas (plataforma SENA), funciones del programa y confirmas la contratación.</p>
    <div class="tabs">${tabs.map(([k,t])=>`<button class="tab ${caAdmTab===k?'active':''}" onclick="caAdmTab='${k}';caAdmPintar()">${t}</button>`).join('')}</div><div class="card" id="caAdmBody"><p class="helptext">Cargando…</p></div>`);
  showScreen('screen-admin-ca');
  const fn = { ins:'admin_ca_inscripciones', emp:'admin_ca_empresas', ofe:'admin_ca_ofertas', pro:'admin_ca_postulaciones' }[caAdmTab];
  if(caAdmTab==='pro'){ caCartasAdm = {}; try{ (await caRpc('admin_ca_cartas')).forEach(c=>{ caCartasAdm[c.post] = c; }); }catch(_){} }
  try{ caAdmData[caAdmTab] = await caRpc(fn); }catch(e){ document.getElementById('caAdmBody').innerHTML = `<p style="color:var(--danger)">${esc(e.message)}</p>`; return; }
  ({ ins:caAdmIns, emp:caAdmEmp, ofe:caAdmOfe, pro:caAdmPro })[caAdmTab]();
  if(caAdmTab==='emp') caAdmSinAcceso();
}
function caExpBar(){ return `<div class="lista-acc" style="margin:0 0 8px;justify-content:flex-end"><button class="ghost" onclick="caAdmExportar('xlsx')">⬇ Excel</button><button class="ghost" onclick="caAdmExportar('pdf')">⬇ PDF</button></div>`; }
function caAdmExportar(f){
  const L = caAdmData[caAdmTab] || []; if(!L.length){ toast('No hay datos para exportar', true); return; }
  const defs = {
    ins:{ t:'Contrato de aprendizaje - Inscripciones', a:'ca-inscripciones', h:['Documento','Nombre','Programa','Semestre','Estado','Pagos verificados','Hoja de vida','Observación'], r:x=>[x.documento,x.nombre,x.programa,x.semestre,CA_ESTADO_TXT[x.estado],x.pagos?'Sí':'No',x.hv_completa?'Completa':'Pendiente',x.observacion] },
    emp:{ t:'Contrato de aprendizaje - Empresas', a:'ca-empresas', h:['Razón social','NIT','Contacto','Correo','Teléfono','Ciudad','Origen','Estado','SENA','Ficha en Empresas','Contratados'], r:x=>[x.razon_social,x.nit,x.contacto,x.email,x.telefono,x.ciudad,x.origen,CA_ESTADO_TXT[x.estado],x.sena?'Sí':'No',x.ficha||'',x.contratados] },
    ofe:{ t:'Contrato de aprendizaje - Solicitudes', a:'ca-solicitudes', h:['Empresa','Cargo','Programa','Cupos','Ciudad','Jornada','Estado','Funciones'], r:x=>[x.empresa,x.cargo,x.programa,x.cupos,x.ciudad,x.jornada,CA_ESTADO_TXT[x.estado],x.funciones] },
    pro:{ t:'Contrato de aprendizaje - Procesos', a:'ca-procesos', h:['Documento','Estudiante','Programa','Empresa','Cargo','Origen','Estado'], r:x=>[x.documento,x.nombre,x.programa,x.empresa,x.cargo,x.origen,CA_ESTADO_TXT[x.estado]] } }[caAdmTab];
  const rows = L.map(defs.r);
  if(f==='pdf') pdfTablaDescargar({ titulo: defs.t, archivo: defs.a, head: defs.h, rows }); else ieDescargarXlsx(defs.a, defs.h, rows, 'Datos', defs.t);
}
function caAdmInfo(id){ return document.getElementById(id); }

function caAdmIns(){
  const L = caAdmData.ins; const b = caAdmInfo('caAdmBody');
  if(!L.length){ b.innerHTML = '<p class="helptext">Todavía no hay inscripciones.</p>'; return; }
  b.innerHTML = caExpBar() + `<div class="cupos-wrap"><table class="cupos-table ca-tabla" style="min-width:700px"><thead><tr><th>Estudiante</th><th>Programa</th><th class="cp-c">Sem.</th><th>Pagos verificados</th><th>Decisión</th><th>Observación</th><th class="cp-c">Hoja de vida</th><th></th></tr></thead><tbody>${L.map(x=>`<tr>
    <td class="cp-prog"><b>${esc(x.nombre)}</b><br><small>${esc(x.documento)}</small></td><td>${esc(x.programa||'—')}</td><td class="cp-c">${esc(x.semestre||'—')}</td>
    <td><label class="lista-chk"><input type="checkbox" id="ins-p-${x.documento}" ${x.pagos?'checked':''} ${x.estado==='contratado'?'disabled':''}> Pagos al día</label></td>
    <td>${x.estado==='contratado'?caChip('contratado'):`<select class="cp-in" id="ins-e-${x.documento}"><option value="pendiente" ${x.estado==='pendiente'?'selected':''}>Pendiente</option><option value="apto" ${x.estado==='apto'?'selected':''}>Apto</option><option value="no_apto" ${x.estado==='no_apto'?'selected':''}>No apto</option></select>`}</td>
    <td><input class="cp-in cp-txt" id="ins-o-${x.documento}" maxlength="500" value="${escapeAttr(x.observacion||'')}" ${x.estado==='contratado'?'disabled':''}></td>
    <td class="cp-c">${x.hv_completa?'<span class="cupo-chip cupo-ok">Completa</span>':'<span class="cupo-chip cupo-low">Pendiente</span>'}</td>
    <td><div class="ca-acc-col">${x.estado==='contratado'?'':`<button class="primary cp-del" onclick="caAdmVerificar('${x.documento}')">Guardar</button>`}<button class="ghost cp-del" style="color:var(--danger)" onclick="caAdmEliminar('inscripcion','${x.documento}',${x.estado==='contratado'})">🗑 Eliminar</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
async function caAdmVerificar(doc){
  try{ await caRpc('admin_ca_verificar', { p_documento: doc, p_estado: caAdmInfo('ins-e-'+doc).value, p_pagos: caAdmInfo('ins-p-'+doc).checked, p_obs: caAdmInfo('ins-o-'+doc).value });
    toast('Verificación guardada'); caAdmPintar(); }catch(e){ toast(e.message, true); }
}

function caAdmEmp(){
  const L = caAdmData.emp; const b = caAdmInfo('caAdmBody');
  const form = `<details class="ca-det"><summary>+ Crear empresa con su cuenta de acceso</summary><div class="field-row">
    <div class="field"><label>Razón social *</label><input id="ne-razon" maxlength="160"></div><div class="field"><label>NIT *</label><input id="ne-nit" maxlength="20"></div>
    <div class="field"><label>Correo de acceso *</label><input id="ne-email" type="email"></div><div class="field"><label>Contraseña * (8+)</label><input id="ne-pass" type="password" autocomplete="new-password"></div>
    <div class="field"><label>Contacto</label><input id="ne-cont" maxlength="120"></div><div class="field"><label>Teléfono</label><input id="ne-tel" maxlength="40"></div>
    <div class="field"><label>Ciudad</label><input id="ne-ciu" maxlength="80"></div><div class="field"><label>Dirección</label><input id="ne-dir" maxlength="160"></div></div>
    <label class="lista-chk"><input type="checkbox" id="ne-sena"> Verificada en la plataforma del SENA (queda aprobada)</label>
    <div id="neMsg" style="margin:6px 0;font-size:13px;"></div><div class="actions-row"><button class="primary" onclick="caAdmCrearEmpresa()">Guardar empresa</button></div></details>`;
  const masivo = `<details class="ca-det"><summary>⇪ Importar / exportar empresas en bloque (Excel)</summary>
    <p class="helptext">Descarga la plantilla, llénala con todas las empresas y súbela. Si dejas la contraseña vacía en una empresa nueva, se genera y recibes un Excel con las credenciales. Se enlazan solas con el módulo <b>Empresas</b> por NIT o nombre.</p>
    <div class="actions-row" style="justify-content:flex-start;flex-wrap:wrap"><button class="ghost" onclick="ieDescargarPlantilla('ca_empresas')">📄 Plantilla</button>
      <button class="ghost" onclick="ieExportar('ca_empresas','xlsx')">⬇ Exportar Excel completo</button><button class="ghost" onclick="caAdmPintar()">↻ Actualizar lista</button></div>
    <div style="margin-top:10px"><label style="font-size:13px;font-weight:600">Importar desde Excel (.xlsx):</label><br><input type="file" accept=".xlsx,.xls,.csv" onchange="ieLeerArchivo('ca_empresas', this)" style="margin-top:6px"></div>
    <div id="iePrev-ca_empresas" style="margin-top:10px;font-size:13.5px"></div></details>
    <div id="caSinAcceso"></div>`;
  b.innerHTML = caExpBar() + masivo + form + (L.length ? `<div class="cupos-wrap"><table class="cupos-table ca-tabla" style="min-width:700px"><thead><tr><th>Empresa</th><th>Contacto</th><th>Origen</th><th>Estado</th><th>Plataforma SENA y observación</th><th></th></tr></thead><tbody>${L.map(x=>`<tr>
    <td class="cp-prog"><b>${esc(x.razon_social)}</b><br><small>NIT ${esc(x.nit)} · ${esc(x.ciudad||'')}</small><br><small>${x.ficha?'🔗 Enlazada con Empresas: '+esc(x.ficha):'Sin enlazar a Empresas (se enlaza al aprobarla)'}</small><br><small>${x.ofertas} solicitud(es) · ${x.contratados} contratado(s)</small></td><td>${esc(x.contacto||'—')}<br><small>${esc(x.email)} ${esc(x.telefono||'')}</small></td><td>${x.origen==='autoregistro'?'Se registró sola':'Creada por la institución'}</td><td>${caChip(x.estado)}</td>
    <td><label class="lista-chk"><input type="checkbox" id="em-s-${x.id}" ${x.sena?'checked':''}> En plataforma SENA</label><input class="cp-in" style="margin-top:6px" placeholder="Observación" id="em-o-${x.id}" maxlength="500" value="${escapeAttr(x.observacion||'')}"></td>
    <td><div class="ca-acc-col"><button class="primary cp-del" onclick="caAdmEmpEstado('${x.id}','aprobada')">Aprobar</button><button class="danger cp-del" onclick="caAdmEmpEstado('${x.id}','rechazada')">Rechazar</button><button class="ghost cp-del" style="color:var(--danger)" onclick="caAdmEmpEliminar('${x.id}', ${x.contratados})">🗑 Eliminar</button></div></td></tr>`).join('')}</tbody></table></div>` : '<p class="helptext">No hay empresas registradas.</p>');
}
async function caAdmSinAcceso(){
  const box = caAdmInfo('caSinAcceso'); if(!box) return;
  try{
    const L = await caRpc('admin_ca_sin_acceso'); window._caSinAcc = L;
    if(!L.length){ box.innerHTML = ''; return; }
    box.innerHTML = `<div class="note-box" style="margin:10px 0"><b>${L.length} empresa(s) del módulo Empresas con categoría "contrato de aprendizaje" aún no tienen acceso al portal:</b>
      <div class="cupos-wrap"><table class="cupos-table" style="min-width:520px"><tbody>${L.map((x,i)=>`<tr><td class="cp-prog"><b>${esc(x.nombre)}</b><br><small>NIT ${esc(x.nit||'—')} · ${esc(x.ciudad||'')}</small></td><td><button class="primary cp-del" onclick="caAdmPrecargar(${i})">Crear acceso</button></td></tr>`).join('')}</tbody></table></div></div>`;
  }catch(e){ box.innerHTML = ''; }
}
function caAdmPrecargar(i){
  const x = (window._caSinAcc||[])[i]; if(!x) return;
  const set = (id,v)=>{ const el = caAdmInfo(id); if(el) el.value = v||''; };
  set('ne-razon',x.nombre); set('ne-nit',x.nit); set('ne-email',x.correo); set('ne-cont',x.contacto); set('ne-tel',x.telefono); set('ne-ciu',x.ciudad); set('ne-dir',x.direccion);
  set('ne-pass', typeof generarClaveLocal==='function' ? generarClaveLocal() : '');
  const d = caAdmInfo('ne-razon').closest('details'); if(d){ d.open = true; d.scrollIntoView({ behavior:'smooth', block:'center' }); }
  toast('Datos cargados: completa el correo si falta y guarda. Anota la contraseña generada.');
}
async function caAdmEliminar(tipo, id, contratado){
  const d = {
    inscripcion: { rpc:'admin_ca_eliminar_inscripcion', arg:{ p_doc:id }, msg:'¿Eliminar esta inscripción?\n\nSe borran también su hoja de vida y sus postulaciones. El estudiante podrá inscribirse de nuevo.', bloq: contratado ? 'Está contratado: primero quita la contratación en la pestaña Procesos.' : '' },
    oferta:      { rpc:'admin_ca_eliminar_oferta', arg:{ p_id:id }, msg:'¿Eliminar esta solicitud?\n\nSe borran también las postulaciones que tenga en curso.', bloq:'' },
    proceso:     { rpc:'admin_ca_eliminar_postulacion', arg:{ p_id:id }, msg: contratado ? '¿Quitar la contratación de este estudiante?\n\nVuelve a quedar "apto", la solicitud se reabre y la empresa pierde el acceso a su planilla (las notas ya guardadas se conservan).' : '¿Eliminar este proceso?', bloq:'' } }[tipo];
  if(d.bloq){ toast(d.bloq, true); return; }
  if(!confirm(d.msg + '\n\nNo se puede deshacer.')) return;
  try{ await caRpc(d.rpc, d.arg); toast('Eliminado'); caAdmPintar(); }catch(e){ toast(e.message, true); }
}
async function caAdmEmpEliminar(id, contratados){
  if(contratados > 0){ toast('Tiene estudiantes contratados: no se puede eliminar. Usa Rechazar para bloquear su acceso.', true); return; }
  if(!confirm('¿Eliminar esta empresa del portal de contrato de aprendizaje?\n\nSe borran su acceso, sus solicitudes y los procesos en curso. La ficha en el módulo Empresas se conserva. No se puede deshacer.')) return;
  try{ await caRpc('admin_ca_eliminar_empresa', { p_id: id }); toast('Empresa eliminada'); caAdmPintar(); }catch(e){ toast(e.message, true); }
}
async function caAdmEmpEstado(id, estado){
  try{ await caRpc('admin_ca_empresa_estado', { p_id: id, p_estado: estado, p_sena: caAdmInfo('em-s-'+id).checked, p_obs: caAdmInfo('em-o-'+id).value }); toast('Empresa ' + (estado==='aprobada'?'aprobada':'rechazada')); caAdmPintar(); }catch(e){ toast(e.message, true); }
}
async function caAdmCrearEmpresa(){
  try{ await caRpc('admin_ca_guardar_empresa', { p_email: val('ne-email'), p_password: caAdmInfo('ne-pass').value, p_razon: val('ne-razon'), p_nit: val('ne-nit'), p_contacto: val('ne-cont'), p_telefono: val('ne-tel'), p_direccion: val('ne-dir'), p_ciudad: val('ne-ciu'), p_sitio: '', p_sena: caAdmInfo('ne-sena').checked });
    toast('Empresa guardada'); caAdmPintar(); }catch(e){ caMsg('neMsg', e.message); }
}

function caAdmOfe(){
  const L = caAdmData.ofe; const b = caAdmInfo('caAdmBody');
  if(!L.length){ b.innerHTML = '<p class="helptext">Aún no hay solicitudes de empresas.</p>'; return; }
  b.innerHTML = caExpBar() + `<div class="cupos-wrap"><table class="cupos-table ca-tabla" style="min-width:700px"><thead><tr><th>Empresa</th><th>Cargo / programa</th><th>Funciones</th><th class="cp-c">Cupos</th><th>Estado</th><th>Verificación y observación</th><th></th></tr></thead><tbody>${L.map(x=>`<tr>
    <td class="cp-prog"><b>${esc(x.empresa)}</b><br>${caChip(x.empresa_estado)}</td><td><b>${esc(x.cargo)}</b><br><small>${esc(x.programa)}</small></td><td style="max-width:300px">${esc(x.funciones)}</td><td class="cp-c">${x.cupos}</td><td>${caChip(x.estado)}</td>
    <td><label class="lista-chk"><input type="checkbox" id="of-f-${x.id}" ${x.funciones_ok?'checked':''}> Funciones corresponden al programa</label><input class="cp-in" style="margin-top:6px" placeholder="Observación" id="of-o-${x.id}" maxlength="500" value="${escapeAttr(x.observacion||'')}"></td>
    <td><div class="ca-acc-col"><button class="primary cp-del" onclick="caAdmOfEstado('${x.id}','aprobada')">Aprobar</button><button class="danger cp-del" onclick="caAdmOfEstado('${x.id}','rechazada')">Rechazar</button><button class="ghost cp-del" onclick="caAdmOfEstado('${x.id}','cerrada')">Cerrar</button><button class="ghost cp-del" style="color:var(--danger)" onclick="caAdmEliminar('oferta','${x.id}',false)">🗑 Eliminar</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
async function caAdmOfEstado(id, estado){
  try{ await caRpc('admin_ca_oferta_estado', { p_id: id, p_estado: estado, p_funciones_ok: caAdmInfo('of-f-'+id).checked, p_obs: caAdmInfo('of-o-'+id).value }); toast('Solicitud actualizada'); caAdmPintar(); }catch(e){ toast(e.message, true); }
}

function caAdmPro(){
  const L = caAdmData.pro; const b = caAdmInfo('caAdmBody');
  if(!L.length){ b.innerHTML = '<p class="helptext">Aún no hay postulaciones.</p>'; return; }
  const sel = L.filter(x=>x.estado==='seleccionado').length;
  b.innerHTML = caExpBar() + (sel ? `<div class="note-box" style="margin-bottom:10px">📋 <b>${sel}</b> estudiante(s) seleccionado(s) por la empresa esperan tu confirmación.</div>` : '') +
    `<div class="ca-fichas">${L.map(x=>caFicha(esc(x.nombre), caChip(x.estado), [
      caFila('Estudiante', '<b>'+esc(x.nombre)+'</b>'), caFila('Documento', esc(x.documento)), caFila('Programa', esc(x.programa||'—')),
      caFila('Empresa', esc(x.empresa)), caFila('Cargo', esc(x.cargo)),
      caFila('Origen', x.origen==='estudiante'?'Se postuló':'La empresa lo llamó'), caFila('Fecha', caFmt(x.desde)), caFila('Carta de fechas', caCartaAdmHtml(x))],
      (x.estado==='seleccionado'?`<button class="primary" onclick="caAdmConfirmar('${x.id}')">Confirmar contratación</button> `:'') +
      `<button class="ghost" style="color:var(--danger)" onclick="caAdmEliminar('proceso','${x.id}',${x.estado==='contratado'})">🗑 ${x.estado==='contratado'?'Quitar contratación':'Eliminar'}</button>`)).join('')}</div>`;
}
async function caAdmConfirmar(id){ if(!confirm('¿Confirmar la contratación de este estudiante? Se cerrará su proceso como contratado.')) return;
  try{ await caRpc('admin_ca_confirmar', { p_post: id }); toast('Contratación confirmada'); caAdmPintar(); }catch(e){ toast(e.message, true); } }

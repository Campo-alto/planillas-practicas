/* ============================= SOLICITUD DE PRÁCTICA (lado del estudiante) =============================
   Al ingresar, el estudiante que aún no tiene modalidad ve las modalidades disponibles, elige una, llena sus datos y
   sube cada documento en PDF por separado (cada uno con su peso máximo). La solicitud llega al encargado, que la revisa.
   · Contrato de aprendizaje: solo se llenan los datos y se sigue con su formulario de inscripción.
   · Las modalidades, los documentos y los pesos los configura la institución (Administración → Documentos por modalidad).
   Seguridad: la base de datos valida todo otra vez (que sea un PDF real, el peso, que el documento sea de tu modalidad
   y que solo veas tus archivos). Requiere solicitud-practica-etapa24.sql. */

let spEst = null, spSel = null, spEditando = false;

(function(){
  if(typeof organizarPestanasEstudiante !== 'function') return;
  const _cards = cardsEstudiante;
  cardsEstudiante = function(){ const c = _cards(); const e = document.getElementById('estSpCard'); if(e) c.sp = e; return c; };
  const _org = organizarPestanasEstudiante;
  organizarPestanasEstudiante = function(){
    if(!document.getElementById('estSpCard')){
      const last = document.getElementById('estMonthTabs'); const host = last ? last.closest('.card') : null;
      if(host){ const d = document.createElement('div'); d.className = 'card'; d.id = 'estSpCard'; host.insertAdjacentElement('afterend', d); }
    }
    _org();
    const bar = document.getElementById('estTabs');
    if(bar && document.getElementById('estSpCard') && !document.getElementById('estTab-sp')){
      const b = document.createElement('button'); b.className = 'tab'; b.id = 'estTab-sp'; b.textContent = 'Solicitud de práctica';
      b.onclick = ()=>showEstTab('sp');
      if(state.record && !state.record.modalidad) bar.insertBefore(b, bar.firstChild); else bar.appendChild(b);
    }
    // el estudiante que aún no tiene modalidad entra directo a elegirla (solo la primera vez de la sesión)
    if(state.record && !state.record.modalidad && !state.spInicial){ state.spInicial = true; estTabActual = 'sp'; }
    showEstTab(estTabActual);
  };
  const _show = showEstTab;
  showEstTab = function(tab){ _show(tab); if(tab === 'sp') spCargar(); };
})();

const SP_JORNADAS = ['Mañana','Tarde','Noche','Sábado','Domingo','Entre semana'];
function spMsg(t, ok){ const e = document.getElementById('spMsg'); if(e) e.innerHTML = t ? `<span style="color:var(${ok ? '--teal-dark' : '--danger'})">${esc(t)}</span>` : ''; }
function spFmtTam(b){ return b >= 1048576 ? (b/1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b/1024)) + ' KB'; }
function spChip(e){
  const m = { ok:['cor-enviado','Aprobado'], rechazado:['cor-error','Devuelto'], pendiente:['cor-pendiente','Por revisar'],
              borrador:['cor-pendiente','Borrador'], enviada:['cor-pendiente','En revisión'], devuelta:['cor-error','Devuelta'],
              aprobada:['cor-enviado','Aprobada'], rechazada:['cor-error','Rechazada'] }[e] || ['cor-pendiente', e];
  return `<span class="cor-est ${m[0]}">${m[1]}</span>`;
}
function spLabel(k){ return { programa:'Programa', sede:'Sede', semestre:'Semestre', periodo:'Periodo académico', jornada:'Jornada', telefono:'Teléfono',
  lugar_nombre:'Lugar de prácticas', lugar_direccion:'Dirección', lugar_ciudad:'Ciudad', lugar_contacto:'Contacto', lugar_telefono:'Teléfono del contacto', lugar_correo:'Correo del contacto',
  exp_entidad:'Empresa o entidad', exp_cargo:'Cargo', exp_tiempo:'Tiempo de experiencia', exp_contacto:'Jefe o contacto', exp_telefono:'Teléfono del contacto', exp_correo:'Correo del contacto' }[k] || k; }

async function spCargar(){
  const el = document.getElementById('estSpCard'); if(!el) return;
  el.innerHTML = '<p class="helptext">Cargando…</p>';
  try{ if(typeof loadProgramas === 'function') await loadProgramas(); }catch(e){ console.warn(e); }
  const { data, error } = await sb.rpc('est_pr_estado', { p_token: state.token });
  if(error){ el.innerHTML = '<p style="color:var(--danger)">' + esc(error.message) + ' (¿ya se ejecutó solicitud-practica-etapa24.sql?)</p>'; return; }
  spEst = data; spEditando = false; spRender();
}

function spResumenDatos(d){
  const ks = Object.keys(d || {}); if(!ks.length) return '';
  return '<dl class="sp-datos">' + ks.map(k=>`<div><dt>${esc(spLabel(k))}</dt><dd>${esc(d[k])}</dd></div>`).join('') + '</dl>';
}

function spRender(){
  const el = document.getElementById('estSpCard'); const e = spEst; if(!el || !e) return;
  const sol = e.solicitud;
  let h = '<div class="section-bar teal">Solicitud de práctica</div>';
  const abierta = sol && ['borrador','enviada','devuelta'].includes(sol.estado);

  if(e.modalidad_actual){
    h += `<div class="note-box" style="background:#EAF6F0;border-color:#BFE3D0;color:#1E6B4A;">✅ Tu modalidad de práctica es: <b>${esc(e.modalidad_actual)}</b>.</div>`;
    if(sol && sol.estado === 'aprobada') h += `<p class="helptext">Tu solicitud fue aprobada${sol.resuelta_en ? ' el ' + esc(new Date(sol.resuelta_en).toLocaleDateString('es-CO')) : ''}. Sigue con tu planilla y las demás secciones.</p>` + spResumenDatos(sol.datos);
    h += '<p class="helptext">Si necesitas cambiar de modalidad, comunícate con la institución.</p>';
    el.innerHTML = h; return;
  }

  if(abierta && !spEditando){
    const mod = (e.modalidades || []).find(m=>m.id === sol.modalidad_id) || { requisitos:[], tipo:'general' };
    h += `<div class="sp-cab"><div><b>${esc(sol.modalidad)}</b></div>${spChip(sol.estado)}</div>`;
    if(sol.estado === 'devuelta') h += `<div class="note-box" style="background:#FBEAE7;border-color:#F0C4BD;color:#8F2A20;"><b>Tu solicitud fue devuelta.</b> ${sol.observacion ? esc(sol.observacion) : 'Corrige lo indicado y envíala de nuevo.'}</div>`;
    if(sol.estado === 'enviada') h += '<div class="note-box">⏳ Tu solicitud está en revisión. Te avisaremos por correo cuando tenga respuesta; también puedes volver a consultar aquí.</div>';
    if(sol.estado === 'borrador') h += '<div class="note-box">Sube cada documento en un PDF separado. Cuando estén todos los obligatorios, envía tu solicitud a revisión.</div>';
    h += '<div class="subhead" style="margin-top:12px;">Tus datos</div>' + spResumenDatos(sol.datos);
    if(sol.estado !== 'enviada') h += '<div class="actions-row" style="justify-content:flex-start;margin:6px 0 0;"><button class="ghost" onclick="spEditar()">Editar mis datos</button></div>';

    const docs = {}; (e.documentos || []).forEach(d=>{ docs[d.requisito_id] = d; });
    const reqs = mod.requisitos || [];
    const editable = sol.estado === 'borrador' || sol.estado === 'devuelta';
    if(reqs.length){
      const oblig = reqs.filter(r=>r.obligatorio), listos = oblig.filter(r=>docs[r.id]).length;
      h += `<div class="subhead" style="margin-top:16px;">Documentos (PDF) · ${listos} de ${oblig.length} obligatorios cargados</div><div class="sp-docs">`;
      h += reqs.map(r=>{
        const d = docs[r.id];
        const bloqueado = d && d.estado === 'ok';
        return `<div class="sp-doc ${d ? 'sp-ok' : ''}">
          <div class="sp-doc-t"><span class="sp-ic">${d ? (d.estado === 'rechazado' ? '✖' : '✔') : '☐'}</span>
            <div><b>${esc(r.nombre)}</b> <span class="aud-ref">${r.obligatorio ? 'Obligatorio' : 'Opcional'} · PDF de hasta ${esc(r.max_mb)} MB</span>
            ${r.descripcion ? `<div class="aud-ref">${esc(r.descripcion)}</div>` : ''}</div></div>
          <div class="sp-doc-a">
            ${d ? `<div class="aud-ref">${esc(d.nombre_archivo)} · ${spFmtTam(d.tamano)} ${spChip(d.estado)}</div>${d.estado === 'rechazado' && d.observacion ? `<div class="aud-ref" style="color:var(--danger);">Motivo: ${esc(d.observacion)}</div>` : ''}` : ''}
            ${editable && !bloqueado ? `<label class="ghost sp-subir">${d ? 'Reemplazar' : 'Subir PDF'}<input type="file" accept="application/pdf,.pdf" style="display:none;" onchange="spSubir('${esc(r.id)}', ${Number(r.max_mb)}, this)"></label>
              ${d ? `<button class="ghost" style="padding:5px 10px;font-size:12px;" onclick="spQuitar('${esc(r.id)}')">Quitar</button>` : ''}` : ''}
          </div></div>`;
      }).join('') + '</div>';
    } else if(sol.estado !== 'enviada'){
      h += '<p class="helptext">Esta modalidad no tiene documentos configurados.</p>';
    }
    h += '<div id="spMsg" style="margin:10px 0;font-size:13.5px;"></div>';
    if(editable){
      h += '<div class="actions-row" style="justify-content:flex-start;"><button class="primary" id="spEnviar" onclick="spEnviar()">Enviar solicitud a revisión</button>' +
           (sol.estado === 'borrador' ? '<button class="ghost" onclick="spCancelar()">Cancelar y elegir otra modalidad</button>' : '') + '</div>';
    } else {
      h += '<div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="spCargar()">Actualizar estado</button></div>';
    }
    el.innerHTML = h; return;
  }

  // elegir modalidad + llenar datos (o editar los datos de una solicitud abierta)
  const mods = e.modalidades || [];
  if(sol && sol.estado === 'rechazada') h += `<div class="note-box" style="background:#FBEAE7;border-color:#F0C4BD;color:#8F2A20;">Tu solicitud anterior (${esc(sol.modalidad)}) fue rechazada.${sol.observacion ? ' <b>Motivo:</b> ' + esc(sol.observacion) : ''} Puedes enviar una nueva.</div>`;
  if(!spSel) spSel = abierta ? sol.modalidad_id : null;
  if(abierta && spEditando) spSel = sol.modalidad_id;
  const dato = Object.assign({}, e.datos_estudiante || {}, abierta ? (sol.datos || {}) : {});
  if(!abierta) h += '<p class="helptext" style="text-align:justify;">Elige la modalidad de práctica que necesitas. Después llenarás tus datos y, según la modalidad, subirás tus documentos en PDF.</p>';
  if(!abierta){
    h += '<div class="sp-mods">' + mods.map(m=>`<label class="sp-mod ${spSel === m.id ? 'sel' : ''}" onclick="spElegir('${esc(m.id)}')">
        <input type="radio" name="spMod" ${spSel === m.id ? 'checked' : ''}><div><b>${esc(m.nombre)}</b>
        <div class="aud-ref">${m.tipo === 'contrato' ? 'Solo llenas el formulario de solicitud.' : (m.requisitos.length ? 'Documentos: ' + m.requisitos.map(r=>esc(r.nombre)).join(', ') + '.' : 'Sin documentos.')}</div></div></label>`).join('') + '</div>';
    if(!mods.length) h += '<p class="helptext">Por ahora no hay modalidades disponibles. Comunícate con la institución.</p>';
  }
  const m = mods.find(x=>x.id === spSel);
  if(m){
    h += `<div class="subhead" style="margin-top:14px;">Tus datos · ${esc(m.nombre)}</div><div class="field-row">
      ${typeof renderAreaProgramaSelects === 'function' ? renderAreaProgramaSelects('sp', dato.programa || '') : ''}
      <div class="field"><label>Sede *</label><input id="sp-sede" maxlength="80" value="${escapeAttr(dato.sede || '')}"></div>
      <div class="field"><label>Semestre *</label><input id="sp-semestre" maxlength="20" value="${escapeAttr(dato.semestre || '')}"></div>
      <div class="field"><label>Periodo académico *</label><input id="sp-periodo" maxlength="30" placeholder="Ej. 2026-2" value="${escapeAttr(dato.periodo || '')}"></div>
      <div class="field"><label>Jornada en que solicitas el cupo *</label><select id="sp-jornada"><option value="">Selecciona…</option>${SP_JORNADAS.map(j=>`<option value="${esc(j)}" ${dato.jornada === j ? 'selected' : ''}>${esc(j)}</option>`).join('')}</select></div>
      <div class="field"><label>Teléfono</label><input id="sp-telefono" inputmode="tel" maxlength="20" value="${escapeAttr(dato.telefono || '')}"></div>
    </div>`;
    if(m.tipo === 'rlp') h += `<div class="subhead" style="margin-top:10px;">Lugar donde harás la práctica (el que tú conseguiste)</div><div class="field-row">
      <div class="field"><label>Nombre de la empresa o lugar *</label><input id="sp-lugar_nombre" maxlength="150" value="${escapeAttr(dato.lugar_nombre || '')}"></div>
      <div class="field"><label>Dirección *</label><input id="sp-lugar_direccion" maxlength="150" value="${escapeAttr(dato.lugar_direccion || '')}"></div>
      <div class="field"><label>Ciudad</label><input id="sp-lugar_ciudad" maxlength="80" value="${escapeAttr(dato.lugar_ciudad || '')}"></div>
      <div class="field"><label>Persona de contacto *</label><input id="sp-lugar_contacto" maxlength="120" value="${escapeAttr(dato.lugar_contacto || '')}"></div>
      <div class="field"><label>Teléfono del contacto</label><input id="sp-lugar_telefono" inputmode="tel" maxlength="30" value="${escapeAttr(dato.lugar_telefono || '')}"></div>
      <div class="field"><label>Correo del contacto</label><input id="sp-lugar_correo" type="email" maxlength="120" value="${escapeAttr(dato.lugar_correo || '')}"></div></div>`;
    if(m.tipo === 'rap') h += `<div class="subhead" style="margin-top:10px;">Experiencia previa que quieres que te reconozcan</div><div class="field-row">
      <div class="field"><label>Empresa o entidad *</label><input id="sp-exp_entidad" maxlength="150" value="${escapeAttr(dato.exp_entidad || '')}"></div>
      <div class="field"><label>Cargo que desempeñaste *</label><input id="sp-exp_cargo" maxlength="100" value="${escapeAttr(dato.exp_cargo || '')}"></div>
      <div class="field"><label>Tiempo de experiencia *</label><input id="sp-exp_tiempo" maxlength="60" placeholder="Ej. 2 años y 3 meses" value="${escapeAttr(dato.exp_tiempo || '')}"></div>
      <div class="field"><label>Jefe o contacto</label><input id="sp-exp_contacto" maxlength="120" value="${escapeAttr(dato.exp_contacto || '')}"></div>
      <div class="field"><label>Teléfono del contacto</label><input id="sp-exp_telefono" inputmode="tel" maxlength="30" value="${escapeAttr(dato.exp_telefono || '')}"></div>
      <div class="field"><label>Correo del contacto</label><input id="sp-exp_correo" type="email" maxlength="120" value="${escapeAttr(dato.exp_correo || '')}"></div></div>`;
    h += '<div id="spMsg" style="margin:10px 0;font-size:13.5px;"></div>';
    h += `<div class="actions-row" style="justify-content:flex-start;"><button class="primary" id="spGuardar" onclick="spGuardar()">${m.tipo === 'contrato' ? 'Elegir esta modalidad' : 'Guardar y continuar a los documentos'}</button>` +
         (abierta ? '<button class="ghost" onclick="spCargar()">Cancelar</button>' : '') + '</div>';
  }
  el.innerHTML = h;
}
function spElegir(id){ spSel = id; spRender(); }
function spEditar(){ spEditando = true; spRender(); }

function spLeerDatos(){
  const g = id => ((document.getElementById(id) || {}).value || '').trim();
  const d = { programa: g('sp-programa'), sede: g('sp-sede'), semestre: g('sp-semestre'), periodo: g('sp-periodo'), jornada: g('sp-jornada'), telefono: g('sp-telefono') };
  ['lugar_nombre','lugar_direccion','lugar_ciudad','lugar_contacto','lugar_telefono','lugar_correo','exp_entidad','exp_cargo','exp_tiempo','exp_contacto','exp_telefono','exp_correo']
    .forEach(k=>{ const e = document.getElementById('sp-' + k); if(e) d[k] = e.value.trim(); });
  return d;
}
async function spGuardar(){
  const m = (spEst.modalidades || []).find(x=>x.id === spSel); if(!m) return;
  const d = spLeerDatos();
  if(!d.programa) return spMsg('Elige tu programa.');
  if(!d.sede || !d.semestre || !d.periodo) return spMsg('Completa sede, semestre y periodo académico.');
  if(!d.jornada) return spMsg('Elige la jornada en que solicitas el cupo.');
  if(m.tipo === 'contrato' && !confirm('¿Elegir «' + m.nombre + '»? Después de elegirla solo la institución puede cambiarla.')) return;
  const b = document.getElementById('spGuardar'); b.disabled = true; spMsg('Guardando…', true);
  const { data, error } = await sb.rpc('est_pr_guardar', { p_token: state.token, p_modalidad_id: m.id, p_datos: d });
  if(error){ b.disabled = false; return spMsg(error.message); }
  if(data && data.directo){
    toast('Modalidad elegida. Continúa con tu inscripción de contrato de aprendizaje.');
    state.spInicial = true; estTabActual = 'datos';
    if(typeof entrarEstudiante === 'function') await entrarEstudiante();
    return;
  }
  spSel = null; await spCargar();
}
async function spCancelar(){
  if(!confirm('¿Cancelar esta solicitud y elegir otra modalidad? Se borrarán los documentos que subiste.')) return;
  const { error } = await sb.rpc('est_pr_cancelar', { p_token: state.token });
  if(error) return spMsg(error.message);
  spSel = null; await spCargar();
}
function spALeerBase64(file){
  return new Promise((ok, mal)=>{ const r = new FileReader(); r.onerror = ()=>mal(new Error('No se pudo leer el archivo'));
    r.onload = ()=>{ const s = String(r.result || ''); ok(s.slice(s.indexOf(',') + 1)); }; r.readAsDataURL(file); });
}
async function spSubir(reqId, maxMb, input){
  const f = input.files && input.files[0]; input.value = '';
  if(!f) return;
  if(!/\.pdf$/i.test(f.name) || (f.type && f.type !== 'application/pdf')) return spMsg('El archivo debe ser un PDF.');
  if(f.size > maxMb * 1048576) return spMsg('«' + f.name + '» pesa ' + spFmtTam(f.size) + ' y el máximo para este documento es ' + maxMb + ' MB.');
  if(f.size < 100) return spMsg('El archivo está vacío.');
  spMsg('Subiendo «' + f.name + '»…', true);
  try{
    const b64 = await spALeerBase64(f);
    const { error } = await sb.rpc('est_pr_subir', { p_token: state.token, p_requisito: reqId, p_nombre: f.name, p_base64: b64 });
    if(error) return spMsg(error.message);
    toast('Documento cargado');
    await spCargar();
  }catch(e){ spMsg(e.message || 'No se pudo subir el archivo'); }
}
async function spQuitar(reqId){
  if(!confirm('¿Quitar este documento?')) return;
  const { error } = await sb.rpc('est_pr_quitar', { p_token: state.token, p_requisito: reqId });
  if(error) return spMsg(error.message);
  await spCargar();
}
async function spEnviar(){
  if(!confirm('¿Enviar tu solicitud a revisión? Después no podrás cambiar los documentos hasta que te respondan.')) return;
  const b = document.getElementById('spEnviar'); b.disabled = true; spMsg('Enviando…', true);
  const { error } = await sb.rpc('est_pr_enviar', { p_token: state.token });
  if(error){ b.disabled = false; return spMsg(error.message); }
  try{ sb.functions.invoke('enviar-correo', { body:{ action:'notificar_solicitud' } }).then(()=>{}, ()=>{}); }catch(_){}   // avisa al encargado
  toast('Solicitud enviada a revisión');
  await spCargar();
}

/* ============================= CORREOS AUTOMÁTICOS =============================
   • Envía por correo (Gmail / Google Workspace): claves de acceso, cartas de presentación y planillas en PDF.
   • Pantalla «Correos automáticos» (solo administrador): interruptores de avisos y recordatorios, prueba de envío y bitácora.
   El envío real lo hace la Edge Function «enviar-correo» (la contraseña del correo vive solo allí, nunca en esta página).
   Requiere correos-etapa21.sql y publicar esa función (ver GUIA-CORREOS.md). */

const COR_TIPOS = { clave:'Clave de acceso', aviso:'Aviso', recordatorio:'Recordatorio', carta:'Carta', planilla:'Planilla', prueba:'Prueba' };
const COR_ESTADOS = { pendiente:'Pendiente', enviado:'Enviado', error:'Con error' };
let corPagina = 0, corTotal = 0, corFiltro = { estado:'', texto:'' }, corCfg = null;
const COR_POR_PAG = 50;

function corEmailOk(s){ return /^[^@\s,;<>"]+@[^@\s,;<>"]+\.[^@\s,;<>"]+$/.test(String(s || '').trim()); }
function corUrl(){ return location.origin + '/'; }

async function correoInvocar(body){
  if(!requireSupabase()) throw new Error('Sin conexión con la base de datos');
  const { data, error } = await sb.functions.invoke('enviar-correo', { body });
  if(error){
    let m = error.message;
    try{ if(error.context && error.context.json){ const j = await error.context.json(); if(j && j.error) m = j.error; } }catch(_){}
    if(/Failed to send|fetch|NetworkError/i.test(m)) m = 'No se pudo contactar la función de correo. ¿Ya la publicaste en Supabase? (ver GUIA-CORREOS.md)';
    throw new Error(m);
  }
  if(data && data.error) throw new Error(data.error);
  return data;
}
// Envía en bloques de 50 y devuelve { enviados, errores }
async function correoEnviarItems(tipo, items, adjunto){
  let enviados = 0, errores = [];
  for(let i = 0; i < items.length; i += 50){
    const r = await correoInvocar({ action:'enviar', tipo, items: items.slice(i, i + 50), adjunto: adjunto || undefined });
    enviados += r.enviados || 0; errores = errores.concat(r.errores || []);
  }
  return { enviados, errores };
}
function correoResultado(r){
  if(!r.errores.length){ toast('✉ ' + r.enviados + ' correo(s) enviado(s)'); return; }
  toast(r.enviados + ' enviado(s), ' + r.errores.length + ' con error: ' + r.errores[0].to + ' — ' + r.errores[0].error, true);
}
function corBase64(bytes){
  let s = ''; const n = 0x8000;
  for(let i = 0; i < bytes.length; i += n) s += String.fromCharCode.apply(null, bytes.subarray(i, i + n));
  return btoa(s);
}

/* ---------- Ventana para elegir destinatarios (cartas y planillas) ---------- */
function correoDialogo(o){
  const prev = document.getElementById('corModal'); if(prev) prev.remove();
  const m = document.createElement('div'); m.id = 'corModal'; m.className = 'cor-modal';
  const ops = (o.opciones || []).filter(x=>corEmailOk(x.correo));
  m.innerHTML = `<div class="cor-caja" role="dialog" aria-modal="true">
    <h3 style="margin:0 0 8px;">${esc(o.titulo)}</h3>
    <div class="field"><label>Enviar a</label>
      ${ops.map((x,i)=>`<label class="cor-op"><input type="checkbox" class="corSel" value="${esc(x.correo)}" ${i===0?'checked':''}> ${esc(x.etiqueta)}: <b>${esc(x.correo)}</b></label>`).join('') || '<div class="helptext">No hay correos registrados; escribe uno abajo.</div>'}
      <input type="email" id="corOtro" maxlength="160" placeholder="Otro correo (opcional)" autocomplete="off" style="margin-top:6px;">
    </div>
    <div class="field"><label>Asunto</label><input id="corAsunto" maxlength="150" value="${esc(o.asunto)}"></div>
    <div class="field"><label>Mensaje</label><textarea id="corTexto" rows="7" maxlength="4000">${esc(o.texto)}</textarea></div>
    ${o.adjuntoNombre ? '<div class="helptext">📎 Se adjuntará: ' + esc(o.adjuntoNombre) + '</div>' : ''}
    <div id="corMsg" style="font-size:13px;margin:8px 0;"></div>
    <div class="actions-row" style="justify-content:flex-end;"><button class="ghost" id="corCancel">Cancelar</button><button class="primary" id="corEnviar">✉ Enviar</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector('#corCancel').onclick = ()=>m.remove();
  m.addEventListener('click', e=>{ if(e.target === m) m.remove(); });
  m.querySelector('#corEnviar').onclick = async ()=>{
    const msg = m.querySelector('#corMsg');
    const para = [...m.querySelectorAll('.corSel:checked')].map(x=>x.value);
    const otro = m.querySelector('#corOtro').value.trim(); if(otro) para.push(otro);
    const unicos = [...new Set(para.map(x=>x.toLowerCase()))];
    if(!unicos.length){ msg.innerHTML = '<span style="color:var(--danger)">Elige o escribe al menos un correo.</span>'; return; }
    const mal = unicos.find(x=>!corEmailOk(x)); if(mal){ msg.innerHTML = '<span style="color:var(--danger)">Correo inválido: ' + esc(mal) + '</span>'; return; }
    const asunto = m.querySelector('#corAsunto').value.trim(), texto = m.querySelector('#corTexto').value;
    if(!asunto || !texto.trim()){ msg.innerHTML = '<span style="color:var(--danger)">Escribe el asunto y el mensaje.</span>'; return; }
    const b = m.querySelector('#corEnviar'); b.disabled = true; msg.innerHTML = '<span style="color:var(--muted)">Enviando…</span>';
    try{
      const r = await correoEnviarItems(o.tipo, unicos.map(to=>({ to, asunto, texto })), o.adjunto);
      if(r.errores.length){ msg.innerHTML = '<span style="color:var(--danger)">' + esc(r.errores[0].to + ': ' + r.errores[0].error) + '</span>'; b.disabled = false; return; }
      m.remove(); correoResultado(r);
    }catch(e){ msg.innerHTML = '<span style="color:var(--danger)">' + esc(e.message) + '</span>'; b.disabled = false; }
  };
}

/* ---------- Carta de presentación y planilla (desde la ficha del estudiante) ---------- */
async function correoEnviarCarta(){
  if(!state.record){ toast('Abre primero un estudiante', true); return; }
  if(typeof PDFLib === 'undefined'){ toast('No cargó la librería de PDF (revisa tu conexión).', true); return; }
  const { data, error } = await sb.rpc('admin_carta_datos', { p_documento: state.documento });
  if(error){ toast(typeof errMsg === 'function' ? errMsg(error) : error.message, true); return; }
  if(!data){ toast('El estudiante no tiene empresa asignada', true); return; }
  if((!data.fecha_inicio || !data.fecha_fin || !data.horario) && !confirm('Falta definir fechas u horario del cupo. ¿Preparar la carta de todos modos?')) return;
  try{
    const bytes = await generarCartaPdf(Object.assign({ fecha: new Date() }, datosCarta(state.record, data)));
    const r = state.record, nombre = 'carta-presentacion-' + r.documento + '.pdf';
    correoDialogo({
      tipo:'carta', titulo:'Enviar carta de presentación por correo',
      opciones:[{ etiqueta:'Estudiante', correo:r.correo }, { etiqueta:'Empresa', correo:data.correo || data.empresa_correo || '' }],
      asunto:'Carta de presentación - ' + (r.nombre || r.documento),
      texto:'Cordial saludo,\n\nAdjuntamos la carta de presentación de ' + (r.nombre || 'el estudiante') + ' para su práctica en ' + (data.empresa || 'la empresa') + '.\n\nQuedamos atentos a cualquier inquietud.\n\nPolitécnico Campoalto',
      adjunto:{ nombre, base64: corBase64(bytes) }, adjuntoNombre: nombre });
  }catch(e){ console.error(e); toast('No se pudo preparar la carta: ' + e.message, true); }
}
async function correoEnviarPlanilla(){
  const r = state.record;
  if(!r){ toast('Abre primero un estudiante', true); return; }
  toast('Preparando la planilla…');
  const bytes = await new Promise(ok=>{
    window._pdfCapturar = ok;
    Promise.resolve(downloadPdf()).then(()=>{ if(window._pdfCapturar){ window._pdfCapturar = null; ok(null); } });
  });
  if(!bytes) return;
  const nombre = 'planilla-' + r.documento + '.pdf';
  correoDialogo({
    tipo:'planilla', titulo:'Enviar planilla por correo',
    opciones:[{ etiqueta:'Estudiante', correo:r.correo }],
    asunto:'Planilla de prácticas - ' + (r.nombre || r.documento),
    texto:'Cordial saludo,\n\nAdjuntamos la planilla de evaluación de prácticas de ' + (r.nombre || 'el estudiante') + '.\n\nPolitécnico Campoalto',
    adjunto:{ nombre, base64: corBase64(bytes) }, adjuntoNombre: nombre });
}

/* ---------- Claves de acceso ---------- */
function corTextoClave(nombre, usuario, clave, quien){
  return 'Hola ' + (nombre || '') + ',\n\nYa tienes acceso a la plataforma de Asignación de prácticas del Politécnico Campoalto.\n\n' +
    'Ingresa en: ' + corUrl() + '\nUsuario: ' + usuario + '\nContraseña temporal: ' + clave + '\n\n' +
    (quien === 'estudiante' ? 'Al ingresar por primera vez el sistema te pedirá cambiarla.' : 'Te recomendamos cambiarla después de ingresar.') +
    '\nNo compartas esta información. Si no esperabas este mensaje, ignóralo.\n\nPolitécnico Campoalto';
}
async function correoEnviarClaves(lista){          // lista: [{ correo, nombre, usuario, clave, quien }]
  const items = lista.filter(x=>corEmailOk(x.correo)).map(x=>({ to:x.correo, asunto:'Tu acceso a la plataforma de prácticas', texto: corTextoClave(x.nombre, x.usuario, x.clave, x.quien) }));
  if(!items.length){ toast('Ninguno tiene un correo válido', true); return; }
  try{ correoResultado(await correoEnviarItems('clave', items)); }catch(e){ toast(e.message, true); }
}
function correoOfrecerClaveEstudiante(doc, clave){
  const box = document.getElementById('admEstPwMsg'); if(!box) return;
  const rec = state.record || {}, d = document.createElement('div'); d.style.marginTop = '8px';
  if(!corEmailOk(rec.correo)){ d.innerHTML = '<span class="helptext">El estudiante no tiene correo registrado: entrégale la clave en persona.</span>'; }
  else {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.textContent = '✉ Enviar por correo a ' + rec.correo;
    b.onclick = async ()=>{ b.disabled = true; await correoEnviarClaves([{ correo:rec.correo, nombre:rec.nombre, usuario:doc, clave, quien:'estudiante' }]); b.disabled = false; };
    d.appendChild(b);
  }
  box.appendChild(d);
}
async function correoOfrecerClavesLote(data){       // data: [{ documento, nombre, clave }]
  try{
    const docs = data.map(r=>r.documento), correos = {};
    for(let i = 0; i < docs.length; i += 150){
      const { data: rows } = await sb.from('students').select('documento,correo').in('documento', docs.slice(i, i + 150));
      (rows || []).forEach(r=>{ correos[r.documento] = r.correo; });
    }
    const lista = data.filter(r=>corEmailOk(correos[r.documento])).map(r=>({ correo:correos[r.documento], nombre:r.nombre, usuario:r.documento, clave:r.clave, quien:'estudiante' }));
    if(!lista.length) return;
    if(!confirm(lista.length + ' de ' + data.length + ' estudiantes tienen correo registrado.\n¿Enviarles ahora su usuario y clave temporal por correo?')) return;
    toast('Enviando correos… no cierres la página');
    await correoEnviarClaves(lista);
  }catch(e){ console.error(e); toast('No se pudieron enviar los correos: ' + e.message, true); }
}
async function correoOfrecerClaveCuenta(email, nombre, quien, clave){
  if(!corEmailOk(email) || !clave) return;
  if(!confirm('¿Enviar el usuario y la contraseña por correo a ' + email + '?')) return;
  await correoEnviarClaves([{ correo:email, nombre, usuario:email, clave, quien }]);
}

/* ---------- Pantalla «Correos automáticos» (solo administrador) ---------- */
function corPantalla(){
  let el = document.getElementById('screen-admin-correos');
  if(!el){
    const ref = document.getElementById('screen-admin-hub') || document.querySelector('.screen'); if(!ref) return null;
    el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-correos'; ref.parentNode.appendChild(el);
  }
  return el;
}
async function abrirCorreos(){
  if(!requireSupabase()) return;
  const el = corPantalla(); if(!el) return;
  el.innerHTML = '<p style="color:var(--muted)">Cargando…</p>'; showScreen('screen-admin-correos');
  const { data, error } = await sb.rpc('admin_correos_config_get');
  if(error){
    el.innerHTML = '<button class="linkbtn" onclick="showScreen(\'screen-admin-hub\')">← Volver al panel</button><p style="color:var(--danger)">No se pudo cargar: ' + esc(error.message) + ' (¿ejecutaste correos-etapa21.sql?)</p>'; return;
  }
  corCfg = data; corFiltro = { estado:'', texto:'' }; corPagina = 0;
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Correos automáticos</h2>
    <p class="helptext" style="text-align:justify;">Aquí se controlan los correos que envía la plataforma y se ve quién recibió qué. Las claves, cartas y planillas se envían desde la ficha de cada estudiante o al crear un usuario; los <b>avisos</b> y <b>recordatorios</b> salen solos cuando están activados. Las claves nunca quedan guardadas en la bitácora.</p>
    <div class="card"><div class="section-bar deep">Configuración</div>
      <label class="cor-op"><input type="checkbox" id="corHab" ${corCfg.habilitado ? 'checked' : ''}> <b>Activar los correos automáticos</b> (interruptor general de avisos y recordatorios)</label>
      <label class="cor-op"><input type="checkbox" id="corAviso" ${corCfg.aviso_asignacion ? 'checked' : ''}> Avisar al estudiante y a la empresa cuando se asigna un cupo</label>
      <label class="cor-op"><input type="checkbox" id="corRec" ${corCfg.recordatorio_activo ? 'checked' : ''}> Recordar a las empresas las calificaciones pendientes, cada
        <input type="number" id="corDias" min="1" max="60" value="${corCfg.recordatorio_dias}" style="width:70px;display:inline-block;"> día(s)</label>
      <div class="field" style="max-width:340px;"><label>Nombre del remitente</label><input id="corNom" maxlength="80" value="${esc(corCfg.remitente_nombre)}"></div>
      <div class="field" style="max-width:340px;"><label>Correo del encargado de solicitudes de acceso</label><input id="corEnc" type="email" maxlength="160" placeholder="Recibe un aviso por cada solicitud nueva" value="${esc(corCfg.correo_encargado || '')}"></div>
      <div class="actions-row" style="justify-content:flex-start;flex-wrap:wrap;">
        <button class="primary" onclick="corGuardar()">Guardar configuración</button>
        <button class="ghost" onclick="corPrueba()">✉ Enviar correo de prueba</button>
        <button class="ghost" onclick="corProcesar()">▶ Enviar pendientes ahora</button>
      </div><div id="corCfgMsg" style="font-size:13px;margin-top:8px;"></div></div>
    <div class="card"><div class="section-bar deep">Bitácora de correos</div>
      <div id="corResumen" class="lista-cuenta"></div>
      <div class="aud-filtros">
        <div class="field"><label>Estado</label><select id="corEstado" onchange="corConsultar(true)"><option value="">Todos</option><option value="pendiente">Pendientes</option><option value="enviado">Enviados</option><option value="error">Con error</option></select></div>
        <div class="field aud-ancho"><label>Buscar (correo o asunto)</label><input type="search" id="corTexto" maxlength="80" onkeydown="if(event.key==='Enter')corConsultar(true)"></div>
      </div>
      <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="corConsultar(true)">Consultar</button></div>
      <div id="corTabla" style="margin-top:10px;"></div><div id="corPager"></div></div>`;
  corConsultar(true);
}
async function corGuardar(){
  const msg = document.getElementById('corCfgMsg');
  const { error } = await sb.rpc('admin_correos_config_set', {
    p_habilitado: document.getElementById('corHab').checked, p_aviso_asignacion: document.getElementById('corAviso').checked,
    p_recordatorio_activo: document.getElementById('corRec').checked, p_recordatorio_dias: parseInt(document.getElementById('corDias').value, 10) || 7,
    p_remitente: document.getElementById('corNom').value });
  let err2 = null;
  if(!error){ const r2 = await sb.rpc('admin_correos_encargado_set', { p_correo: (document.getElementById('corEnc') || {}).value || '' }); err2 = r2.error; }
  const e = error || err2;
  msg.innerHTML = e ? '<span style="color:var(--danger)">' + esc(e.message) + '</span>' : '<span style="color:var(--teal-dark)">Configuración guardada.</span>';
}
async function corPrueba(){
  const msg = document.getElementById('corCfgMsg');
  const para = prompt('¿A qué correo enviar la prueba?', '');
  if(!para) return;
  if(!corEmailOk(para)){ msg.innerHTML = '<span style="color:var(--danger)">Correo inválido.</span>'; return; }
  msg.innerHTML = '<span style="color:var(--muted)">Enviando…</span>';
  try{
    const r = await correoEnviarItems('prueba', [{ to:para.trim(), asunto:'Prueba de correo - Asignación de prácticas', texto:'Este es un correo de prueba de la plataforma de Asignación de prácticas.\n\nSi lo recibiste, el envío está funcionando.' }]);
    msg.innerHTML = r.errores.length ? '<span style="color:var(--danger)">' + esc(r.errores[0].error) + '</span>' : '<span style="color:var(--teal-dark)">Prueba enviada a ' + esc(para) + '.</span>';
    corConsultar(true);
  }catch(e){ msg.innerHTML = '<span style="color:var(--danger)">' + esc(e.message) + '</span>'; }
}
async function corProcesar(){
  const msg = document.getElementById('corCfgMsg');
  msg.innerHTML = '<span style="color:var(--muted)">Procesando…</span>';
  try{
    const r = await correoInvocar({ action:'procesar', generar:true });
    msg.innerHTML = '<span style="color:var(--teal-dark)">Listo: ' + (r.generados||0) + ' recordatorio(s) generado(s), ' + (r.enviados||0) + ' enviado(s), ' + (r.fallidos||0) + ' con error.' + (r.quedan ? ' Quedan más por enviar: vuelve a pulsar.' : '') + '</span>';
    corConsultar(true);
  }catch(e){ msg.innerHTML = '<span style="color:var(--danger)">' + esc(e.message) + '</span>'; }
}
async function corConsultar(reiniciar){
  if(reiniciar){ corPagina = 0; corFiltro = { estado:(document.getElementById('corEstado')||{}).value || '', texto:((document.getElementById('corTexto')||{}).value || '').trim() }; }
  const t = document.getElementById('corTabla'); if(!t) return;
  const { data, error } = await sb.rpc('admin_correos_lista', { p_estado: corFiltro.estado || null, p_texto: corFiltro.texto || null, p_limite: COR_POR_PAG, p_offset: corPagina * COR_POR_PAG });
  if(error){ t.innerHTML = '<p style="color:var(--danger)">' + esc(error.message) + '</p>'; return; }
  corTotal = data.total || 0; const rs = data.resumen || {};
  document.getElementById('corResumen').textContent = (rs.enviado||0) + ' enviados · ' + (rs.pendiente||0) + ' pendientes · ' + (rs.error||0) + ' con error';
  if(!data.filas.length){ t.innerHTML = '<p style="color:var(--muted);font-size:13.5px;">No hay correos con estos filtros.</p>'; document.getElementById('corPager').innerHTML = ''; return; }
  const f = iso => iso ? new Date(iso).toLocaleString('es-CO', { timeZone:'America/Bogota', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:false }) : '—';
  t.innerHTML = '<div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Fecha</th><th>Tipo</th><th>Para</th><th>Asunto</th><th>Estado</th><th>Enviado por</th><th></th></tr></thead><tbody>' +
    data.filas.map(c=>`<tr><td class="aud-nw">${f(c.creado)}</td><td>${esc(COR_TIPOS[c.tipo] || c.tipo)}</td><td>${esc(c.destinatario)}</td><td>${esc(c.asunto)}</td>
      <td><span class="cor-est cor-${esc(c.estado)}">${esc(COR_ESTADOS[c.estado] || c.estado)}</span>${c.error ? '<div class="aud-ref">' + esc(c.error) + '</div>' : ''}</td>
      <td>${esc(c.por || '')}</td><td>${c.reintentable ? '<button class="ghost aud-ver" onclick="corReintentar(' + c.id + ')">Reintentar</button>' : ''}</td></tr>`).join('') + '</tbody></table></div>';
  const pags = Math.ceil(corTotal / COR_POR_PAG);
  document.getElementById('corPager').innerHTML = pags > 1 ? `<div class="actions-row" style="justify-content:space-between;margin-top:10px;">
    <button class="ghost" ${corPagina === 0 ? 'disabled' : ''} onclick="corPagina--;corConsultar(false)">← Anterior</button><span class="helptext" style="margin:0">Página ${corPagina + 1} de ${pags}</span>
    <button class="ghost" ${corPagina >= pags - 1 ? 'disabled' : ''} onclick="corPagina++;corConsultar(false)">Siguiente →</button></div>` : '';
}
async function corReintentar(id){
  const { error } = await sb.rpc('admin_correo_reintentar', { p_id: id });
  if(error){ toast(error.message, true); return; }
  await corProcesar();
}

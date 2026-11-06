/* ============================= SOLICITUDES DE PRÁCTICA (encargado) + DOCUMENTOS POR MODALIDAD =============================
   1) Bandeja: las solicitudes que envían los estudiantes (modalidad + datos + documentos en PDF). Se revisa cada documento
      (✔ aprobado / ✖ devuelto con motivo) y se APRUEBA (la modalidad y los datos pasan al estudiante), se DEVUELVE para que
      corrija o se RECHAZA. En cada caso el estudiante recibe un correo.
   2) Documentos por modalidad: la lista de documentos que debe subir el estudiante en cada modalidad, si es obligatorio
      y el peso máximo de cada PDF.
   Requiere solicitud-practica-etapa24.sql. Para los correos: correos-etapa21.sql y la función «enviar-correo». */

let spaEstado = 'enviada', spaFilas = [], spaDet = null;

function spaPantalla(id){
  let el = document.getElementById(id);
  if(!el){
    const ref = document.getElementById('screen-admin-hub') || document.querySelector('.screen'); if(!ref) return null;
    el = document.createElement('div'); el.className = 'screen'; el.id = id; ref.parentNode.appendChild(el);
  }
  return el;
}
const spaF = iso => iso ? new Date(iso).toLocaleString('es-CO', { timeZone:'America/Bogota', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:false }) : '—';
const spaTam = b => b >= 1048576 ? (b/1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b/1024)) + ' KB';
function spaChip(e){
  const m = { ok:['cor-enviado','Aprobado'], rechazado:['cor-error','Devuelto'], pendiente:['cor-pendiente','Por revisar'],
              borrador:['cor-pendiente','Borrador'], enviada:['cor-pendiente','En revisión'], devuelta:['cor-error','Devuelta'],
              aprobada:['cor-enviado','Aprobada'], rechazada:['cor-error','Rechazada'] }[e] || ['cor-pendiente', e];
  return `<span class="cor-est ${m[0]}">${m[1]}</span>`;
}
const SPA_ETQ = { programa:'Programa', sede:'Sede', semestre:'Semestre', periodo:'Periodo', jornada:'Jornada', telefono:'Teléfono',
  lugar_nombre:'Lugar de prácticas', lugar_direccion:'Dirección', lugar_ciudad:'Ciudad', lugar_contacto:'Contacto', lugar_telefono:'Tel. contacto', lugar_correo:'Correo contacto',
  exp_entidad:'Empresa / entidad', exp_cargo:'Cargo', exp_tiempo:'Tiempo de experiencia', exp_contacto:'Jefe / contacto', exp_telefono:'Tel. contacto', exp_correo:'Correo contacto' };

/* ---------------------------------------------------------------- BANDEJA */
async function abrirSolicitudesPractica(){
  if(!requireSupabase()) return;
  const el = spaPantalla('screen-admin-solprac'); if(!el) return;
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Solicitudes de práctica</h2>
    <p class="helptext" style="text-align:justify;">Aquí llegan las solicitudes de los estudiantes con su modalidad, sus datos y sus documentos en PDF. Revisa cada documento y luego <b>aprueba</b> (el estudiante queda con su modalidad y sigue con su planilla), <b>devuelve</b> para que corrija o <b>rechaza</b>.</p>
    <div class="card">
      <div class="aud-filtros">
        <div class="field"><label>Estado</label><select id="spaEstado" onchange="spaConsultar()"><option value="enviada">En revisión</option><option value="devuelta">Devueltas</option><option value="borrador">En borrador</option><option value="aprobada">Aprobadas</option><option value="rechazada">Rechazadas</option><option value="">Todas</option></select></div>
        <div class="field aud-ancho"><label>Buscar (documento, nombre o modalidad)</label><input type="search" id="spaTexto" maxlength="80" onkeydown="if(event.key==='Enter')spaConsultar()"></div>
      </div>
      <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="spaConsultar()">Consultar</button></div>
      <div id="spaResumen" class="lista-cuenta" style="margin-top:10px;"></div>
      <div id="spaTabla"><p style="color:var(--muted)">Cargando…</p></div>
    </div>`;
  showScreen('screen-admin-solprac');
  spaConsultar();
}
async function spaConsultar(){
  const t = document.getElementById('spaTabla'); if(!t) return;
  spaEstado = document.getElementById('spaEstado').value; const q = document.getElementById('spaTexto').value.trim();
  const { data, error } = await sb.rpc('admin_sol_pr_lista', { p_estado: spaEstado || null, p_texto: q || null, p_limite: 200, p_offset: 0 });
  if(error){ t.innerHTML = '<p style="color:var(--danger)">' + esc(error.message) + ' (¿ejecutaste solicitud-practica-etapa24.sql?)</p>'; return; }
  spaFilas = data.filas || []; const r = data.resumen || {};
  document.getElementById('spaResumen').textContent = (r.enviada||0) + ' en revisión · ' + (r.devuelta||0) + ' devueltas · ' + (r.aprobada||0) + ' aprobadas · ' + (r.rechazada||0) + ' rechazadas · ' + (r.borrador||0) + ' en borrador';
  if(!spaFilas.length){ t.innerHTML = '<p style="color:var(--muted);font-size:13.5px;">No hay solicitudes con estos filtros.</p>'; return; }
  t.innerHTML = '<div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Enviada</th><th>Estudiante</th><th>Modalidad</th><th>Documentos</th><th>Estado</th><th></th></tr></thead><tbody>' +
    spaFilas.map(s=>`<tr><td class="aud-nw">${spaF(s.enviada_en || s.creado)}</td>
      <td><b>${esc(s.nombre || '')}</b><br><span class="aud-ref">Doc. ${esc(s.documento)}</span></td>
      <td>${esc(s.modalidad)}</td>
      <td class="aud-nw">${s.subidos} subidos · ${s.requeridos} obligatorios</td>
      <td>${spaChip(s.estado)}${s.resuelta_por ? '<div class="aud-ref">' + esc(s.resuelta_por) + ' · ' + spaF(s.resuelta_en) + '</div>' : ''}</td>
      <td class="aud-nw"><button class="primary" style="padding:5px 10px;font-size:12px;" onclick="spaDetalle('${esc(s.id)}')">${s.estado === 'enviada' ? 'Revisar' : 'Ver'}</button></td></tr>`).join('') + '</tbody></table></div>';
}

/* ---------------------------------------------------------------- DETALLE / REVISIÓN */
async function spaDetalle(id){
  const el = spaPantalla('screen-admin-solprac-det'); if(!el) return;
  el.innerHTML = '<p class="helptext">Cargando…</p>'; showScreen('screen-admin-solprac-det');
  const { data, error } = await sb.rpc('admin_sol_pr_detalle', { p_id: id });
  if(error){ el.innerHTML = '<button class="linkbtn" onclick="abrirSolicitudesPractica()">← Volver</button><p style="color:var(--danger)">' + esc(error.message) + '</p>'; return; }
  spaDet = data; spaPintarDetalle();
}
function spaPintarDetalle(){
  const el = document.getElementById('screen-admin-solprac-det'), d = spaDet; if(!el || !d) return;
  const s = d.solicitud, e = d.estudiante, rev = s.estado === 'enviada';
  const datos = Object.keys(s.datos || {}).map(k=>`<div><dt>${esc(SPA_ETQ[k] || k)}</dt><dd>${esc(s.datos[k])}</dd></div>`).join('');
  const docs = d.requisitos.map(r=>{
    const x = r.doc;
    return `<tr><td><b>${esc(r.nombre)}</b><div class="aud-ref">${r.obligatorio ? 'Obligatorio' : 'Opcional'} · máx. ${esc(r.max_mb)} MB</div></td>
      <td>${x ? esc(x.nombre_archivo) + '<div class="aud-ref">' + spaTam(x.tamano) + ' · ' + spaF(x.subido_en) + '</div>' : '<span style="color:var(--danger)">' + (r.obligatorio ? 'Falta' : 'No subido') + '</span>'}</td>
      <td>${x ? spaChip(x.estado) + (x.observacion ? '<div class="aud-ref">' + esc(x.observacion) + '</div>' : '') : ''}</td>
      <td class="aud-nw">${x ? `<button class="ghost" style="padding:5px 10px;font-size:12px;" onclick="spaVerDoc('${esc(s.id)}','${esc(r.id)}')">👁 Vista previa</button>
        ${rev ? `<button class="primary" style="padding:5px 10px;font-size:12px;" title="Aprobar documento" onclick="spaMarcar('${esc(r.id)}','ok')">✔</button>
        <button class="danger" style="padding:5px 10px;font-size:12px;" title="Devolver documento" onclick="spaMarcar('${esc(r.id)}','rechazado')">✖</button>` : ''}` : ''}</td></tr>`;
  }).join('');
  el.innerHTML = `<button class="linkbtn" onclick="abrirSolicitudesPractica()">← Volver a la bandeja</button>
    <h2 style="margin:12px 0 4px;">${esc(e.nombre || s.documento)} · ${spaChip(s.estado)}</h2>
    <p class="helptext">Documento ${esc(s.documento)} · ${esc(e.correo || 'sin correo')} · Modalidad solicitada: <b>${esc(s.modalidad)}</b>${s.enviada_en ? ' · Enviada ' + spaF(s.enviada_en) : ''}</p>
    ${s.observacion ? `<div class="note-box"><b>Observación:</b> ${esc(s.observacion)}</div>` : ''}
    <div class="card"><div class="section-bar deep">Datos del estudiante</div><dl class="sp-datos">${datos || '<p class="helptext">Sin datos.</p>'}</dl></div>
    <div class="card"><div class="section-bar deep">Documentos</div>
      <div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Documento</th><th>Archivo</th><th>Revisión</th><th></th></tr></thead><tbody>${docs || '<tr><td colspan="4">Esta modalidad no tiene documentos.</td></tr>'}</tbody></table></div>
      ${rev ? '<p class="helptext" style="margin-top:8px;">Marca ✔ (aprobado) o ✖ (devuelto, con motivo) en cada documento. Luego resuelve la solicitud.</p>' : ''}</div>
    ${rev ? `<div class="actions-row" style="justify-content:flex-start;gap:8px;flex-wrap:wrap;">
      <button class="primary" onclick="spaResolver('aprobar')">Aprobar solicitud</button>
      <button class="ghost" onclick="spaResolver('devolver')">Devolver para corregir</button>
      <button class="danger" onclick="spaResolver('rechazar')">Rechazar</button></div>` : ''}`;
}
/* Vista previa dentro de la plataforma (se dibuja en pantalla; sin botón de descargar ni imprimir) */
const SPA_PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const SPA_PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let spaPdfListo = null;
function spaCargarPdfJs(){
  if(window.pdfjsLib) return Promise.resolve();
  if(spaPdfListo) return spaPdfListo;
  spaPdfListo = new Promise((ok, mal)=>{
    const sc = document.createElement('script'); sc.src = SPA_PDFJS; sc.crossOrigin = 'anonymous';
    sc.onload = ()=>{
      try{
        // el motor del visor se carga desde un archivo local temporal para evitar bloqueos entre dominios
        const w = URL.createObjectURL(new Blob(["importScripts('" + SPA_PDFJS_WORKER + "');"], { type:'text/javascript' }));
        pdfjsLib.GlobalWorkerOptions.workerSrc = w; ok();
      }catch(e){ mal(e); }
    };
    sc.onerror = ()=>{ spaPdfListo = null; mal(new Error('No se pudo cargar el visor de PDF (¿sin internet o bloqueado?)')); };
    document.head.appendChild(sc);
  });
  return spaPdfListo;
}
function spaCerrarVisor(){
  const v = document.getElementById('spaVisor'); if(v) v.remove();
  document.removeEventListener('keydown', spaTeclaVisor);
  document.body.style.overflow = '';
}
function spaTeclaVisor(e){ if(e.key === 'Escape') spaCerrarVisor(); if((e.ctrlKey || e.metaKey) && ['s','p'].includes((e.key || '').toLowerCase())) e.preventDefault(); }
async function spaVerDoc(id, req){
  spaCerrarVisor();
  const nombre = (spaDet.requisitos.find(r=>r.id === req) || {}).nombre || 'Documento';
  const v = document.createElement('div'); v.id = 'spaVisor'; v.className = 'spa-visor';
  v.innerHTML = `<div class="spa-visor-bar"><b>${esc(nombre)}</b><span class="aud-ref" id="spaVisorInfo" style="color:#cfe;">Cargando…</span>
      <button class="ghost" onclick="spaCerrarVisor()">✕ Cerrar</button></div><div class="spa-visor-cuerpo" id="spaVisorCuerpo" oncontextmenu="return false"></div>`;
  document.body.appendChild(v); document.body.style.overflow = 'hidden'; document.addEventListener('keydown', spaTeclaVisor);
  const cuerpo = document.getElementById('spaVisorCuerpo'), info = document.getElementById('spaVisorInfo');
  try{
    const [{ data, error }] = await Promise.all([sb.rpc('admin_sol_pr_doc', { p_id: id, p_requisito: req }), spaCargarPdfJs()]);
    if(error) throw new Error(error.message);
    const bin = atob(data.base64), bytes = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const total = Math.min(pdf.numPages, 40);
    info.textContent = (data.nombre_archivo || '') + ' · ' + total + (total === 1 ? ' página' : ' páginas') + (pdf.numPages > 40 ? ' (se muestran 40)' : '');
    cuerpo.innerHTML = '';
    const ancho = Math.min(cuerpo.clientWidth - 24, 900), dpr = Math.min(window.devicePixelRatio || 1, 2);
    for(let n = 1; n <= total; n++){
      if(!document.getElementById('spaVisor')) return;          // se cerró mientras cargaba
      const pag = await pdf.getPage(n), base = pag.getViewport({ scale: 1 }), sc = ancho / base.width, vp = pag.getViewport({ scale: sc * dpr });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; c.style.width = (vp.width / dpr) + 'px'; c.style.height = (vp.height / dpr) + 'px';
      cuerpo.appendChild(c);
      await pag.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    }
  }catch(e){ cuerpo.innerHTML = '<p style="color:#fff;padding:20px;">No se pudo mostrar el documento: ' + esc(e.message || 'error') + '</p>'; info.textContent = ''; }
}
async function spaMarcar(req, estado){
  let obs = '';
  if(estado === 'rechazado'){ obs = prompt('¿Por qué devuelves este documento? (el estudiante lo verá)', ''); if(obs === null) return; if(!obs.trim()){ toast('Escribe el motivo', true); return; } }
  const { error } = await sb.rpc('admin_sol_pr_revisar', { p_id: spaDet.solicitud.id, p_requisito: req, p_estado: estado, p_obs: obs });
  if(error){ toast(error.message, true); return; }
  await spaDetalle(spaDet.solicitud.id);
}
async function spaEnviarCorreo(to, asunto, texto){
  if(!to) return 'El estudiante no tiene correo registrado.';
  if(typeof correoEnviarItems !== 'function') return 'El envío de correos no está instalado (falta correos.js).';
  try{ const r = await correoEnviarItems('solicitud', [{ to, asunto, texto }]); return r.errores.length ? r.errores[0].error : null; }
  catch(e){ return e.message; }
}
async function spaResolver(accion){
  const s = spaDet.solicitud, nombre = spaDet.estudiante.nombre || s.documento;
  let obs = '';
  if(accion === 'aprobar'){ if(!confirm('¿Aprobar la solicitud de ' + nombre + '?\nEl estudiante quedará con la modalidad «' + s.modalidad + '» y se le avisará por correo.')) return; }
  if(accion === 'devolver'){ obs = prompt('¿Qué debe corregir el estudiante? (se le enviará por correo)', ''); if(obs === null) return; }
  if(accion === 'rechazar'){ obs = prompt('Motivo del rechazo (se le enviará por correo):', ''); if(obs === null) return; if(!obs.trim()){ toast('Escribe el motivo', true); return; } }
  const { data, error } = await sb.rpc('admin_sol_pr_resolver', { p_id: s.id, p_accion: accion, p_obs: obs });
  if(error){ toast(error.message, true); return; }
  let asunto, texto;
  const firma = '\n\nPolitécnico Campoalto';
  if(accion === 'aprobar'){
    asunto = 'Tu solicitud de práctica fue aprobada';
    texto = 'Hola ' + data.nombre + ',\n\nTu solicitud de práctica fue APROBADA. Modalidad: ' + data.modalidad + '.\n\n' +
      (/rap|aprendizajes previos|homologaci/i.test(data.modalidad) ? 'Se te enviará tu planilla y se coordinará la reunión con el supervisor y la empresa para calificar tu experiencia.' :
       /rlp|lugar de pr|validaci/i.test(data.modalidad) ? 'Tu planilla quedó asociada al lugar de prácticas que indicaste; continúa con ella en la plataforma.' : 'Ingresa a la plataforma para continuar con tu práctica.') + firma;
  } else if(accion === 'devolver'){
    asunto = 'Tu solicitud de práctica necesita correcciones';
    texto = 'Hola ' + data.nombre + ',\n\nRevisamos tu solicitud de práctica (' + data.modalidad + ') y necesita correcciones.' +
      (data.observacion ? '\n\nIndicaciones: ' + data.observacion : '') + (data.devueltos && data.devueltos.length ? '\n\nDocumentos devueltos:\n- ' + data.devueltos.join('\n- ') : '') +
      '\n\nIngresa a la plataforma, corrige y envíala de nuevo.' + firma;
  } else {
    asunto = 'Respuesta a tu solicitud de práctica';
    texto = 'Hola ' + data.nombre + ',\n\nTu solicitud de práctica (' + data.modalidad + ') no pudo ser aprobada.\n\nMotivo: ' + data.observacion + '\n\nPuedes enviar una nueva solicitud desde la plataforma o comunicarte con la institución.' + firma;
  }
  const fallo = await spaEnviarCorreo(data.correo, asunto, texto);
  toast(fallo ? 'Listo, pero no se pudo enviar el correo al estudiante: ' + fallo : (accion === 'aprobar' ? 'Solicitud aprobada y estudiante notificado' : accion === 'devolver' ? 'Solicitud devuelta y estudiante notificado' : 'Solicitud rechazada y estudiante notificado'), !!fallo);
  abrirSolicitudesPractica();
}

/* Marca en el panel cuántas solicitudes de práctica esperan revisión */
(function(){
  if(typeof showScreen !== 'function') return;
  const _show = showScreen;
  showScreen = function(id){
    _show(id);
    if(id === 'screen-admin-hub' && typeof sb !== 'undefined' && sb) setTimeout(spaMarcarPendientes, 500);
  };
})();
async function spaMarcarPendientes(){
  try{
    const { data, error } = await sb.rpc('admin_sol_pr_pendientes');
    if(error || !data) return;
    const chip = [...document.querySelectorAll('.grupo-chip')].find(c=>c.title === 'Abrir Solicitudes de práctica');
    if(chip && !chip.querySelector('.sa-badge')) chip.insertAdjacentHTML('beforeend', ' <span class="sa-badge">' + data + '</span>');
  }catch(_){}
}

/* ---------------------------------------------------------------- DOCUMENTOS POR MODALIDAD */
let dmDatos = [];
async function abrirDocsModalidad(){
  if(!requireSupabase()) return;
  const el = spaPantalla('screen-admin-docmod'); if(!el) return;
  el.innerHTML = '<button class="linkbtn" onclick="showScreen(\'screen-admin-hub\')">← Volver al panel</button><h2 style="margin:12px 0 4px;">Documentos por modalidad</h2><p class="helptext">Cargando…</p>';
  showScreen('screen-admin-docmod');
  await dmPintar();
}
async function dmPintar(){
  const el = document.getElementById('screen-admin-docmod'); if(!el) return;
  const { data, error } = await sb.rpc('admin_modalidades_docs');
  if(error){ el.innerHTML = '<button class="linkbtn" onclick="showScreen(\'screen-admin-hub\')">← Volver al panel</button><p style="color:var(--danger)">' + esc(error.message) + ' (¿ejecutaste solicitud-practica-etapa24.sql?)</p>'; return; }
  dmDatos = data || [];
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Documentos por modalidad</h2>
    <p class="helptext" style="text-align:justify;">Define qué documentos (todos en PDF, cada uno por separado) debe subir el estudiante en cada modalidad, si es <b>obligatorio</b> y el <b>peso máximo</b> de cada archivo (0,1 a 5 MB). Si quitas un documento que ya tiene archivos subidos, solo se desactiva (no se pierde nada). Contrato de aprendizaje no pide documentos: solo el formulario. Desmarca «Disponible» para ocultar una modalidad a los estudiantes (por ejemplo, las de Enfermería, que asigna la institución).</p>` +
    dmDatos.map((m, mi)=>`<div class="card"><div class="section-bar deep">${esc(m.nombre)}</div>
      <label style="display:block;margin:4px 0 10px;font-size:13.5px;"><input type="checkbox" ${m.solicitable ? 'checked' : ''} onchange="dmSolicitable('${esc(m.id)}', this.checked)"> Disponible para que el estudiante la elija</label>
      ${m.tipo === 'contrato' ? '<p class="helptext">Esta modalidad solo pide el formulario de solicitud; no requiere documentos.</p>' : ''}
      <div class="cupos-wrap"><table class="cupos-table" style="min-width:760px"><thead><tr><th>Documento</th><th>Indicación para el estudiante</th><th>Obligatorio</th><th>Peso máx. (MB)</th><th>Orden</th><th>Activo</th><th></th></tr></thead><tbody>` +
      m.requisitos.map(r=>`<tr>
        <td><input id="dm-${esc(r.id)}-n" maxlength="120" value="${escapeAttr(r.nombre)}" style="min-width:180px;"></td>
        <td><input id="dm-${esc(r.id)}-d" maxlength="300" value="${escapeAttr(r.descripcion)}" style="min-width:200px;"></td>
        <td style="text-align:center;"><input type="checkbox" id="dm-${esc(r.id)}-o" ${r.obligatorio ? 'checked' : ''}></td>
        <td><input type="number" id="dm-${esc(r.id)}-m" min="0.1" max="5" step="0.1" value="${esc(r.max_mb)}" style="width:80px;"></td>
        <td><input type="number" id="dm-${esc(r.id)}-r" min="0" max="99" value="${esc(r.orden)}" style="width:60px;"></td>
        <td style="text-align:center;"><input type="checkbox" id="dm-${esc(r.id)}-a" ${r.activo ? 'checked' : ''}></td>
        <td class="aud-nw"><button class="primary" style="padding:5px 10px;font-size:12px;" onclick="dmGuardar('${esc(r.id)}','${esc(m.id)}')">Guardar</button>
          <button class="danger" style="padding:5px 10px;font-size:12px;" onclick="dmEliminar('${esc(r.id)}')">Quitar</button></td></tr>`).join('') +
      `<tr style="background:var(--bg-soft,#f6f5ef);"><td><input id="dmN-${mi}-n" maxlength="120" placeholder="Nuevo documento…" style="min-width:180px;"></td>
        <td><input id="dmN-${mi}-d" maxlength="300" placeholder="Indicación (opcional)" style="min-width:200px;"></td>
        <td style="text-align:center;"><input type="checkbox" id="dmN-${mi}-o" checked></td>
        <td><input type="number" id="dmN-${mi}-m" min="0.1" max="5" step="0.1" value="2" style="width:80px;"></td>
        <td></td><td></td>
        <td><button class="primary" style="padding:5px 10px;font-size:12px;" onclick="dmAgregar(${mi})">Agregar</button></td></tr>` +
      '</tbody></table></div></div>').join('');
}
async function dmSolicitable(id, v){
  const { error } = await sb.rpc('admin_modalidad_solicitable', { p_id: id, p_valor: !!v });
  toast(error ? error.message : (v ? 'Modalidad disponible para los estudiantes' : 'Modalidad oculta para los estudiantes'), !!error);
  if(error) dmPintar();
}
async function dmGuardar(rid, mid){
  const g = s => document.getElementById('dm-' + rid + '-' + s);
  const mb = parseFloat(String(g('m').value).replace(',', '.'));
  if(isNaN(mb) || mb < 0.1 || mb > 5){ toast('El peso máximo debe estar entre 0,1 y 5 MB', true); return; }
  const { error } = await sb.rpc('admin_requisito_guardar', { p_id: rid, p_modalidad_id: mid, p_nombre: g('n').value, p_descripcion: g('d').value,
    p_obligatorio: g('o').checked, p_max_mb: mb, p_orden: parseInt(g('r').value || '0', 10), p_activo: g('a').checked });
  toast(error ? error.message : 'Documento guardado', !!error);
}
async function dmAgregar(mi){
  const m = dmDatos[mi]; const g = s => document.getElementById('dmN-' + mi + '-' + s);
  const mb = parseFloat(String(g('m').value).replace(',', '.'));
  if(isNaN(mb) || mb < 0.1 || mb > 5){ toast('El peso máximo debe estar entre 0,1 y 5 MB', true); return; }
  const { error } = await sb.rpc('admin_requisito_guardar', { p_id: null, p_modalidad_id: m.id, p_nombre: g('n').value, p_descripcion: g('d').value,
    p_obligatorio: g('o').checked, p_max_mb: mb, p_orden: null, p_activo: true });
  if(error){ toast(error.message, true); return; }
  toast('Documento agregado'); dmPintar();
}
async function dmEliminar(rid){
  if(!confirm('¿Quitar este documento de la lista? Si ya hay archivos subidos solo se desactivará.')) return;
  const { data, error } = await sb.rpc('admin_requisito_eliminar', { p_id: rid });
  if(error){ toast(error.message, true); return; }
  toast(data && data.desactivado ? 'Ya tenía archivos: se desactivó (no se perdió nada)' : 'Documento eliminado'); dmPintar();
}

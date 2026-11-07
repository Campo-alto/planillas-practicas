/* ============================= EMPRESAS POR CONFIRMAR (RLP / RAP) =============================
   En RLP y RAP la empresa la consigue el estudiante: no está registrada y no tiene usuario para registrar la nota.
   Cuando el asistente aprueba la solicitud, el lugar llega aquí. Quien confirma revisa los datos, los corrige si hace falta y pulsa
   «Confirmar y crear acceso»: se crea el usuario de la empresa (correo + contraseña temporal), se vincula SOLO a ese estudiante y se le
   envía el correo. Si no se puede confirmar, «Devolver» avisa al estudiante.
   Requiere empresas-confirmar-etapa28.sql. Correos: función «enviar-correo» (tipos «clave» y «solicitud», sin redesplegar). */

let ecEstado = 'apto', ecFilas = [];
const EC_ET = { apto:'Aptos: crear acceso', coordinacion:'En coordinación', pendiente:'Esperando visita', confirmada:'Con acceso creado', no_apto:'No aptos (otro lugar)', devuelta:'Devueltos', descartada:'Cerrados' };
let ecMax = 3;

async function abrirEmpresasConfirmar(estado){
  if(!requireSupabase()) return;
  if(estado) ecEstado = estado;
  const el = spaPantalla('screen-admin-empconf'); if(!el) return;
  try{ const c = await sb.rpc('admin_lugares_config'); if(c.data) ecMax = c.data.max_lugares; }catch(_){}
  const esAdmin = typeof permAdmin !== 'undefined' && permAdmin && permAdmin.total;
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Empresas por confirmar</h2>
    <p class="helptext" style="text-align:justify;">En <b>RLP</b> y <b>RAP</b> la empresa la consigue el estudiante. El proceso es: <b>1)</b> se aprueba la solicitud → <b>2)</b> el supervisor visita el lugar y dice si es <b>apto</b> →
    <b>3)</b> recién entonces aquí se <b>crea el usuario y la contraseña</b> de la empresa y se le envía por correo (solo podrá ver y calificar a ese estudiante). Si el lugar <b>no es apto</b>, el estudiante elige otro; al llegar al límite de lugares —o en RAP— el caso pasa a <b>coordinación</b>.</p>
    <div class="card">
      <div class="aud-filtros">
        <div class="field"><label>Ver</label><select id="ecEstado" onchange="ecEstado=this.value;ecConsultar()">${Object.keys(EC_ET).map(k=>`<option value="${k}"${k === ecEstado ? ' selected' : ''}>${EC_ET[k]}</option>`).join('')}</select></div>
        <div class="field aud-ancho"><label>Buscar (empresa, estudiante o documento)</label><input type="search" id="ecTexto" maxlength="80" onkeydown="if(event.key==='Enter')ecConsultar()"></div>
        <div class="field"><label>Límite de lugares por estudiante</label><span style="display:flex;gap:6px;align-items:center;"><input type="number" id="ecMax" min="1" max="10" value="${ecMax}" style="width:70px;"${esAdmin ? '' : ' disabled title="Solo el administrador lo puede cambiar"'}>${esAdmin ? '<button class="ghost" onclick="ecGuardarMax()">Guardar</button>' : ''}</span></div>
      </div>
      <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="ecConsultar()">Consultar</button></div>
      <div id="ecLista"><p style="color:var(--muted)">Cargando…</p></div>
    </div>`;
  showScreen('screen-admin-empconf');
  ecConsultar();
}
async function ecGuardarMax(){
  const n = parseInt(document.getElementById('ecMax').value, 10);
  const { data, error } = await sb.rpc('admin_lugares_config_guardar', { p_max: n });
  if(error){ toast(error.message, true); return; }
  ecMax = data.max_lugares; toast('Límite guardado: ' + ecMax + ' lugares por estudiante');
}
async function ecConsultar(){
  const t = document.getElementById('ecLista'); if(!t) return;
  const { data, error } = await sb.rpc('admin_lugares_lista', { p_estado: ecEstado, p_texto: document.getElementById('ecTexto').value.trim() || null });
  if(error){ t.innerHTML = '<p style="color:var(--danger)">' + esc(error.message) + ' (¿ejecutaste lugar-apto-etapa29.sql?)</p>'; return; }
  ecFilas = data || [];
  if(!ecFilas.length){ t.innerHTML = '<p style="color:var(--muted);font-size:13.5px;">' + (ecEstado === 'apto' ? 'No hay lugares aptos esperando que crees el acceso de la empresa.' : 'No hay registros.') + '</p>'; return; }
  const CONC = { apto:'✔ Apto', condiciones:'⚠ Apto con condiciones', no_apto:'✖ No apto' };
  t.innerHTML = ecFilas.map((f,i)=>{
    const editable = f.estado === 'pendiente' || f.estado === 'apto';
    const campo = (k, et, ph)=>`<div class="field"><label>${et}</label><input id="ec-${k}-${i}" maxlength="${k === 'direccion' || k === 'nombre' ? 150 : 120}" value="${esc(f[k] || '')}" placeholder="${ph || ''}"${editable ? '' : ' readonly'}></div>`;
    const c = f.concepto;
    const acc = f.estado === 'apto' ? `<button class="primary" onclick="ecConfirmar(${i})">✔ Crear acceso y enviar correo</button><button class="ghost" onclick="ecGuardarDatos(${i})">Guardar datos</button><button class="danger" onclick="ecDevolver(${i})">Devolver al estudiante</button>`
      : f.estado === 'pendiente' ? `<button class="ghost" onclick="ecGuardarDatos(${i})">Guardar datos</button><button class="danger" onclick="ecDevolver(${i})">Devolver al estudiante</button>`
      : f.estado === 'coordinacion' ? `<button class="primary" onclick="ecCoord(${i},'otra_oportunidad')">Dar otra oportunidad</button><button class="danger" onclick="ecCoord(${i},'cerrar')">Cerrar el caso</button>` : '';
    return `<div class="ec-card">
      <div class="ec-head"><b>${esc(f.estudiante || '')}</b> <span class="aud-ref">Doc. ${esc(f.documento)} · ${esc(f.modalidad || '')}</span>
        <span class="cor-est ${f.estado === 'confirmada' || f.estado === 'apto' ? 'cor-enviado' : 'cor-pendiente'}">${EC_ET[f.estado]}</span>
        <span class="aud-ref">Lugar n.º ${f.intento} · no aptos: ${f.no_aptos} de ${f.maximo}</span></div>
      ${c ? `<div class="note-box"><b>Concepto del supervisor (${esc(c.supervisor)}, ${esc(c.fecha)}):</b> ${esc(CONC[c.concepto] || c.concepto)}${c.observaciones ? ' — ' + esc(c.observaciones) : ''}</div>` : (f.estado === 'pendiente' ? '<div class="helptext">Esperando que el supervisor visite el lugar y dé su concepto. Aún no se puede crear el acceso de la empresa.</div>' : '')}
      <div class="field-row">${campo('nombre','Empresa o lugar *')}${campo('contacto','Persona de contacto *')}${campo('correo','Correo (será el usuario) *','empresa@correo.com')}
        ${campo('telefono','Teléfono')}${campo('direccion','Dirección')}${campo('ciudad','Ciudad')}${campo('nit','NIT (opcional)')}</div>
      ${f.estado === 'devuelta' || f.estado === 'descartada' ? `<div class="note-box"><b>Motivo:</b> ${esc(f.observacion || '')}</div>` : ''}
      ${f.estado === 'confirmada' ? `<div class="helptext">Acceso creado por ${esc(f.resuelta_por || '')} · la empresa tiene acceso a ${f.estudiantes_vinculados} estudiante(s).</div>` : ''}
      <div class="actions-row" style="justify-content:flex-start;">${acc}</div></div>`;
  }).join('');
}
async function ecGuardarDatos(i){
  const { error } = await sb.rpc('admin_lugar_datos', { p_id: ecFilas[i].id, p_datos: ecLeer(i) });
  if(error){ toast(error.message, true); return; }
  toast('Datos guardados');
}
async function ecCoord(i, accion){
  const f = ecFilas[i];
  const obs = prompt(accion === 'cerrar' ? 'Motivo del cierre (se le enviará a ' + f.estudiante + '):' : 'Indicaciones para ' + f.estudiante + ' (por ejemplo, qué debe presentar):', '');
  if(obs === null) return;
  if(!obs.trim()){ toast('Escribe la decisión', true); return; }
  const { error } = await sb.rpc('admin_lugar_coordinacion', { p_id: f.id, p_accion: accion, p_obs: obs });
  if(error){ toast(error.message, true); return; }
  try{ sb.functions.invoke('enviar-correo', { body:{ action:'notificar_solicitud' } }).then(()=>{}, ()=>{}); }catch(_){}
  toast(accion === 'cerrar' ? 'Caso cerrado. Se avisó al estudiante.' : 'Se le dio otra oportunidad. Se avisó al estudiante.');
  ecConsultar();
}
function ecLeer(i){ const v = k=>document.getElementById('ec-' + k + '-' + i).value.trim(); return { nombre:v('nombre'), contacto:v('contacto'), correo:v('correo'), telefono:v('telefono'), direccion:v('direccion'), ciudad:v('ciudad'), nit:v('nit') }; }

async function ecConfirmar(i){
  const f = ecFilas[i], d = ecLeer(i);
  if(!d.nombre || !d.contacto){ toast('Escribe el nombre de la empresa y la persona de contacto', true); return; }
  if(!corEmailOk(d.correo)){ toast('Escribe un correo válido: será el usuario de la empresa', true); return; }
  if(!confirm('El supervisor declaró este lugar como apto.\n¿Crear el acceso de «' + d.nombre + '» con el correo ' + d.correo + '?\nPodrá ver y calificar solo a ' + f.estudiante + '.')) return;
  const { data, error } = await sb.rpc('admin_lugar_confirmar', { p_id: f.id, p_datos: d });
  if(error){ toast(error.message, true); return; }
  const url = typeof corUrl === 'function' ? corUrl() : location.origin;
  const est = data.estudiante;
  const texto = 'Hola ' + data.empresa.contacto + ',\n\n' + est.nombre + ' (documento ' + est.documento + ') hará su práctica en ' + data.empresa.nombre + ' y el Politécnico Campoalto te necesita para registrar su calificación.\n\n' +
    'Ingresa en: ' + url + '\nElige «Empresa».\nUsuario: ' + data.empresa.correo + '\n' +
    (data.nueva ? 'Contraseña temporal: ' + data.clave + '\n\nTe recomendamos cambiarla después de ingresar.' : 'Contraseña: la misma que ya usas (tu usuario ya existía).') +
    '\n\nUna vez dentro, escribe el documento del estudiante (' + est.documento + ') para abrir su planilla. Solo podrás ver a los estudiantes que hacen su práctica en tu empresa.\nNo compartas esta información. Si no esperabas este mensaje, ignóralo.\n\nPolitécnico Campoalto';
  let fallo = null;
  try{ const r = await correoEnviarItems('clave', [{ to: data.empresa.correo, asunto: 'Acceso a la plataforma de prácticas - ' + est.nombre, texto }]); if(r && r.errores && r.errores.length) fallo = r.errores[0].error || r.errores[0]; }
  catch(e){ fallo = e.message; }
  ecMostrarClave(data, fallo, texto);
  ecConsultar();
}
function ecMostrarClave(data, fallo, texto){
  const prev = document.getElementById('ecModal'); if(prev) prev.remove();
  const m = document.createElement('div'); m.id = 'ecModal'; m.className = 'cor-modal';
  m.innerHTML = `<div class="cor-caja" role="dialog" aria-modal="true" style="max-width:560px;">
    <h3 style="margin:0 0 6px;">✔ Empresa confirmada</h3>
    <p style="margin:0 0 8px;"><b>${esc(data.empresa.nombre)}</b> ya puede registrar la nota de <b>${esc(data.estudiante.nombre)}</b>.</p>
    <div class="note-box" style="${fallo ? '' : 'background:#EAF6F0;border-color:#BFE3D0;color:#1E6B4A;'}">${fallo ? '⚠ No se pudo enviar el correo (' + esc(String(fallo)) + '). Entrégale estos datos por otro medio.' : '✉ Se envió el correo con el acceso a ' + esc(data.empresa.correo) + '.'}</div>
    <div style="margin:10px 0;font-size:14px;">Usuario: <b>${esc(data.empresa.correo)}</b><br>${data.nueva ? 'Contraseña temporal: <b style="font-family:monospace;font-size:16px;">' + esc(data.clave) + '</b><br><span class="helptext">Se muestra solo ahora; no se vuelve a ver.</span>' : '<span class="helptext">La empresa ya tenía usuario: conserva su contraseña.</span>'}</div>
    <div class="actions-row" style="justify-content:flex-end;"><button class="ghost" id="ecCopiar">Copiar mensaje</button><button class="primary" onclick="document.getElementById('ecModal').remove()">Listo</button></div></div>`;
  document.body.appendChild(m);
  document.getElementById('ecCopiar').onclick = ()=>{ try{ navigator.clipboard.writeText(texto); toast('Mensaje copiado'); }catch(_){ toast('No se pudo copiar', true); } };
}
async function ecDevolver(i){
  const f = ecFilas[i];
  const obs = prompt('¿Por qué no se puede confirmar «' + (f.nombre || 'esta empresa') + '»? Se le enviará este motivo a ' + f.estudiante + ':', '');
  if(obs === null) return;
  if(!obs.trim()){ toast('Escribe el motivo', true); return; }
  const { data, error } = await sb.rpc('admin_lugar_devolver', { p_id: f.id, p_obs: obs });
  if(error){ toast(error.message, true); return; }
  let fallo = null;
  if(data.estudiante && data.estudiante.correo){
    fallo = await spaEnviarCorreo(data.estudiante.correo, 'Revisa los datos de tu lugar de prácticas',
      'Hola ' + data.estudiante.nombre + ',\n\nNo pudimos confirmar el lugar de prácticas «' + (data.lugar || '') + '».\nMotivo: ' + obs.trim() +
      '\n\nComunícate con la coordinación de prácticas del Politécnico Campoalto para entregar los datos correctos de la empresa (nombre, persona de contacto y correo).\n\nPolitécnico Campoalto');
  }
  toast(fallo ? 'Devuelta, pero no se pudo avisar por correo: ' + fallo : 'Devuelta. Se avisó al estudiante.', !!fallo);
  ecConsultar();
}
async function ecReabrir(i){
  const { error } = await sb.rpc('admin_lugar_reabrir', { p_id: ecFilas[i].id });
  if(error){ toast(error.message, true); return; }
  abrirEmpresasConfirmar('pendiente');
}

/* Número de empresas por confirmar en la tarjeta del panel */
async function ecMarcarPendientes(){
  try{
    const { data, error } = await sb.rpc('admin_lugares_pendientes');
    if(error || !data) return;
    const c = [...document.querySelectorAll('.fn-card')].find(x=>x.getAttribute('data-fn') === 'Empresas por confirmar');
    const sl = c && c.querySelector('.fn-badge');
    if(sl) sl.innerHTML = '<span class="sa-badge" title="Empresas esperando confirmación">' + data + '</span>';
  }catch(_){}
}
(function(){
  if(typeof showScreen !== 'function') return;
  const _show = showScreen;
  showScreen = function(id){
    _show(id);
    if(id === 'screen-admin-hub' && typeof sb !== 'undefined' && sb) setTimeout(ecMarcarPendientes, 800);
  };
})();

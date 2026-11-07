/* ============================= SOLICITUDES DE ACCESO (bandeja del encargado) =============================
   Aquí llegan las solicitudes de los estudiantes. Al APROBAR se crea el estudiante (si no existía), se genera una
   contraseña temporal y se le envía por correo su usuario y contraseña. Al RECHAZAR se le avisa con el motivo.
   La contraseña se muestra una sola vez en pantalla y viaja solo en ese correo: nunca se guarda en claro.
   Requiere solicitudes-acceso-etapa23.sql. Para el correo, correos-etapa21.sql y la función «enviar-correo». */

let saEstado = 'pendiente', saTexto = '', saFilas = [];

function saPantalla(){
  let el = document.getElementById('screen-admin-solicitudes');
  if(!el){
    const ref = document.getElementById('screen-admin-hub') || document.querySelector('.screen'); if(!ref) return null;
    el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-solicitudes'; ref.parentNode.appendChild(el);
  }
  return el;
}
async function abrirSolicitudes(){
  if(!requireSupabase()) return;
  const el = saPantalla(); if(!el) return;
  saEstado = 'pendiente'; saTexto = '';
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Solicitudes de acceso de estudiantes</h2>
    <p class="helptext" style="text-align:justify;">Los estudiantes piden su usuario desde el ingreso. Al <b>aprobar</b> se crea su acceso y se le envía por correo su usuario y una contraseña temporal (deberá cambiarla al ingresar). Al <b>rechazar</b> se le avisa el motivo.</p>
    <div class="card">
      <div class="aud-filtros">
        <div class="field"><label>Estado</label><select id="saEstado" onchange="saConsultar()"><option value="pendiente">Pendientes</option><option value="aprobada">Aprobadas</option><option value="rechazada">Rechazadas</option><option value="">Todas</option></select></div>
        <div class="field aud-ancho"><label>Buscar (documento, nombre o correo)</label><input type="search" id="saTexto" maxlength="80" onkeydown="if(event.key==='Enter')saConsultar()"></div>
      </div>
      <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="saConsultar()">Consultar</button></div>
      <div id="saResumen" class="lista-cuenta" style="margin-top:10px;"></div>
      <div id="saTabla"><p style="color:var(--muted)">Cargando…</p></div>
    </div>`;
  showScreen('screen-admin-solicitudes');
  saConsultar();
}
async function saConsultar(){
  const t = document.getElementById('saTabla'); if(!t) return;
  saEstado = document.getElementById('saEstado').value; saTexto = document.getElementById('saTexto').value.trim();
  const { data, error } = await sb.rpc('admin_solicitudes_lista', { p_estado: saEstado || null, p_texto: saTexto || null, p_limite: 200, p_offset: 0 });
  if(error){ t.innerHTML = '<p style="color:var(--danger)">' + esc(error.message) + ' (¿ejecutaste solicitudes-acceso-etapa23.sql?)</p>'; return; }
  saFilas = data.filas || []; const r = data.resumen || {};
  document.getElementById('saResumen').textContent = (r.pendiente||0) + ' pendientes · ' + (r.aprobada||0) + ' aprobadas · ' + (r.rechazada||0) + ' rechazadas' + (data.total > saFilas.length ? ' · mostrando ' + saFilas.length + ' de ' + data.total : '');
  if(!saFilas.length){ t.innerHTML = '<p style="color:var(--muted);font-size:13.5px;">No hay solicitudes con estos filtros.</p>'; return; }
  const f = iso => iso ? new Date(iso).toLocaleString('es-CO', { timeZone:'America/Bogota', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:false }) : '—';
  t.innerHTML = '<div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Fecha</th><th>Estudiante</th><th>Correo / teléfono</th><th>Programa</th><th>Estado</th><th></th></tr></thead><tbody>' +
    saFilas.map((s,i)=>{
      const aviso = s.estado === 'pendiente' && s.ya_existe ? '<div class="aud-ref" style="color:#8A5A00;">Ya existe en la plataforma' + (s.tiene_acceso ? ' y ya tiene acceso' : '') + (s.correo_actual && s.correo_actual.toLowerCase() !== s.correo.toLowerCase() ? ' · correo registrado: ' + esc(s.correo_actual) : '') + '</div>' : '';
      const est = s.estado === 'aprobada' ? '<span class="cor-est cor-enviado">Aprobada</span>' : s.estado === 'rechazada' ? '<span class="cor-est cor-error">Rechazada</span>' : '<span class="cor-est cor-pendiente">Pendiente</span>';
      const det = [s.sede && 'Sede: ' + s.sede, s.semestre && 'Semestre: ' + s.semestre, s.modalidad && 'Modalidad: ' + s.modalidad, s.periodo && 'Periodo: ' + s.periodo, s.jornada && 'Jornada: ' + s.jornada].filter(Boolean).join(' · ');
      return `<tr><td class="aud-nw">${f(s.creado)}</td>
        <td><b>${esc(s.apellidos + ' ' + s.nombres)}</b><br><span class="aud-ref">Doc. ${esc(s.documento)}</span>${aviso}</td>
        <td>${esc(s.correo)}${s.telefono ? '<br><span class="aud-ref">' + esc(s.telefono) + '</span>' : ''}</td>
        <td>${esc(s.programa || '—')}${det ? '<div class="aud-ref">' + esc(det) + '</div>' : ''}</td>
        <td>${est}${s.estado !== 'pendiente' ? '<div class="aud-ref">' + esc(s.resuelto_por || '') + ' · ' + f(s.resuelto_en) + (s.motivo ? '<br>Motivo: ' + esc(s.motivo) : '') + '</div>' : ''}</td>
        <td class="aud-nw">${s.estado === 'pendiente' ? `<button class="primary" style="padding:5px 10px;font-size:12px;" onclick="saAprobar(${i},this)">Aprobar</button> <button class="danger" style="padding:5px 10px;font-size:12px;" onclick="saRechazar(${i},this)">Rechazar</button>` : ''}</td></tr>`;
    }).join('') + '</tbody></table></div>';
}
function saTextoAprobado(nombre, usuario, clave){
  return 'Hola ' + nombre + ',\n\nTu solicitud de acceso fue APROBADA. Ya puedes ingresar a la plataforma de Asignación de prácticas del Politécnico Campoalto:\n\n' +
    'Ingresa en: ' + location.origin + '/\nUsuario: ' + usuario + '\nContraseña temporal: ' + clave +
    '\n\nAl ingresar por primera vez el sistema te pedirá cambiarla. No compartas esta información.\n\nPolitécnico Campoalto';
}
async function saEnviarCorreo(to, asunto, texto){
  if(typeof correoEnviarItems !== 'function') return 'El envío de correos no está instalado (falta correos.js).';
  try{ const r = await correoEnviarItems('solicitud', [{ to, asunto, texto }]); return r.errores.length ? r.errores[0].error : null; }
  catch(e){ return e.message; }
}
async function saAprobar(i, btn){
  const s = saFilas[i]; if(!s) return;
  if(!confirm('¿Aprobar la solicitud de ' + s.apellidos + ' ' + s.nombres + ' (doc. ' + s.documento + ')?\nSe le enviará su usuario y contraseña a ' + s.correo + '.')) return;
  btn.disabled = true;
  let { data, error } = await sb.rpc('admin_solicitud_aprobar', { p_id: s.id, p_confirmar: false });
  if(!error && data && data.requiere_confirmacion){
    if(!confirm('ATENCIÓN: ' + data.aviso + '\n\n¿Aprobar de todos modos?')){ btn.disabled = false; return; }
    ({ data, error } = await sb.rpc('admin_solicitud_aprobar', { p_id: s.id, p_confirmar: true }));
  }
  if(error){ btn.disabled = false; toast('No se pudo aprobar: ' + error.message, true); return; }
  const fallo = await saEnviarCorreo(data.correo, 'Tu acceso a la plataforma de prácticas fue aprobado', saTextoAprobado(data.nombre, data.documento, data.clave));
  saMostrarResultado(data, fallo);
  saConsultar();
}
function saMostrarResultado(d, fallo){
  const prev = document.getElementById('corModal'); if(prev) prev.remove();
  const m = document.createElement('div'); m.id = 'corModal'; m.className = 'cor-modal';
  m.innerHTML = `<div class="cor-caja" role="dialog" aria-modal="true">
    <h3 style="margin:0 0 8px;">✅ Solicitud aprobada</h3>
    <p style="font-size:14px;margin:0 0 8px;">${d.nuevo ? 'Se creó el estudiante y su acceso.' : 'Se activó el acceso del estudiante.'}</p>
    <div style="background:#EAF6F3;border:1px solid #BFE0D8;border-radius:8px;padding:10px 12px;font-size:14px;">
      <b>${esc(d.nombre)}</b><br>Usuario: <b>${esc(d.documento)}</b><br>Contraseña temporal: <b style="font-size:16px;letter-spacing:.5px;">${esc(d.clave)}</b></div>
    <p style="font-size:13.5px;margin:10px 0;">${fallo ? '<span style="color:var(--danger)">⚠ No se pudo enviar el correo (' + esc(fallo) + '). Entrégale estos datos al estudiante por otro medio: no se vuelven a mostrar.</span>' : '✉ Se envió su usuario y contraseña a <b>' + esc(d.correo) + '</b>.'}</p>
    <div class="actions-row" style="justify-content:flex-end;"><button class="ghost" id="saCopiar">Copiar usuario y contraseña</button><button class="primary" id="saCerrar">Cerrar</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector('#saCerrar').onclick = ()=>m.remove();
  m.querySelector('#saCopiar').onclick = ()=>{ try{ navigator.clipboard.writeText('Usuario: ' + d.documento + '  Contraseña: ' + d.clave); toast('Copiado'); }catch(_){} };
}
async function saRechazar(i, btn){
  const s = saFilas[i]; if(!s) return;
  const motivo = prompt('Rechazar la solicitud de ' + s.apellidos + ' ' + s.nombres + '.\nEscribe el motivo (se le enviará por correo):', '');
  if(motivo === null) return;
  btn.disabled = true;
  const { data, error } = await sb.rpc('admin_solicitud_rechazar', { p_id: s.id, p_motivo: motivo });
  if(error){ btn.disabled = false; toast('No se pudo rechazar: ' + error.message, true); return; }
  const fallo = await saEnviarCorreo(data.correo, 'Respuesta a tu solicitud de acceso', 'Hola ' + data.nombre + ',\n\nTu solicitud de acceso a la plataforma de Asignación de prácticas no pudo ser aprobada.' +
    (data.motivo ? '\n\nMotivo: ' + data.motivo : '') + '\n\nSi crees que es un error, comunícate con la institución.\n\nPolitécnico Campoalto');
  toast(fallo ? 'Solicitud rechazada, pero no se pudo enviar el correo: ' + fallo : 'Solicitud rechazada y estudiante notificado', !!fallo);
  saConsultar();
}

/* Marca en el panel cuántas solicitudes hay pendientes */
(function(){
  if(typeof showScreen !== 'function') return;
  const _show = showScreen;
  showScreen = function(id){
    _show(id);
    if(id === 'screen-admin-hub' && typeof sb !== 'undefined' && sb) setTimeout(saMarcarPendientes, 400);
  };
})();
async function saMarcarPendientes(){
  try{
    const { data, error } = await sb.rpc('admin_solicitudes_pendientes');
    if(error || !data) return;
    const b = [...document.querySelectorAll('.fn-card')].find(c=>c.getAttribute('data-fn') === 'Solicitudes de acceso');
    const sl = b && b.querySelector('.fn-badge');
    if(sl) sl.innerHTML = '<span class="sa-badge" title="Pendientes por revisar">' + data + '</span>';
  }catch(_){}
}

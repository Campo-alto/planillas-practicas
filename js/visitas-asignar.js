/* ============================= VISITAS POR ASIGNAR (supervisor general) =============================
   El supervisor general (o quien tenga el permiso «Asignar visitas a supervisores») ve los estudiantes de RAP y RLP ya
   aprobados que todavía no tienen supervisor, y asigna cada visita a un supervisor. Al asignar:
     • el supervisor recibe un correo y ve al estudiante en «Mis visitas asignadas»;
     • la información del estudiante queda BLOQUEADA para los demás supervisores (lo hace la base de datos).
   Requiere visitas-supervisor-general-etapa25.sql. Correos: correos.js + función «enviar-correo» (tipo «solicitud»). */

let vaVista = 'pendientes', vaFilas = [], vaSups = [];

async function abrirVisitasAsignar(vista){
  if(!requireSupabase()) return;
  if(vista) vaVista = vista;
  const el = spaPantalla('screen-admin-visitas'); if(!el) return;
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Visitas por asignar</h2>
    <p class="helptext" style="text-align:justify;">Los estudiantes de <b>Reconocimiento de aprendizajes previos (RAP)</b> y <b>Reconocimiento del lugar de prácticas (RLP)</b> aprobados por el asistente aparecen aquí.
    Elige el supervisor que hará la visita. Desde ese momento <b>solo ese supervisor</b> puede abrir y diligenciar al estudiante; los demás supervisores quedan bloqueados.</p>
    <div class="card">
      <div class="aud-filtros">
        <div class="field"><label>Ver</label><select id="vaVista" onchange="vaVista=this.value;vaConsultar()">
          <option value="pendientes">Por asignar</option><option value="activas">Asignadas (en curso)</option><option value="historial">Historial</option></select></div>
        <div class="field aud-ancho"><label>Buscar (documento o nombre)</label><input type="search" id="vaTexto" maxlength="80" onkeydown="if(event.key==='Enter')vaConsultar()"></div>
      </div>
      <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="vaConsultar()">Consultar</button></div>
      <div id="vaTabla"><p style="color:var(--muted)">Cargando…</p></div>
    </div>`;
  document.getElementById('vaVista').value = vaVista;
  showScreen('screen-admin-visitas');
  vaConsultar();
}
function vaOpciones(sel){
  return '<option value="">Elegir supervisor…</option>' + vaSups.map(s=>`<option value="${esc(s.id)}"${s.id === sel ? ' selected' : ''}>${esc(s.nombre)} (${s.activas} en curso)</option>`).join('');
}
async function vaConsultar(){
  const t = document.getElementById('vaTabla'); if(!t) return;
  const q = document.getElementById('vaTexto').value.trim();
  const [l, s] = await Promise.all([sb.rpc('admin_visitas_lista', { p_vista: vaVista, p_texto: q || null }), sb.rpc('admin_visitas_supervisores')]);
  if(l.error){ t.innerHTML = '<p style="color:var(--danger)">' + esc(l.error.message) + ' (¿ejecutaste visitas-supervisor-general-etapa25.sql?)</p>'; return; }
  vaFilas = l.data || []; vaSups = s.data || [];
  if(!vaFilas.length){ t.innerHTML = '<p style="color:var(--muted);font-size:13.5px;">' + (vaVista === 'pendientes' ? 'No hay estudiantes esperando supervisor. 🎉' : 'No hay registros.') + '</p>'; return; }
  if(vaVista === 'pendientes' && !vaSups.length) t.innerHTML = '<div class="note-box">Todavía no hay supervisores creados. Créalos en «Usuarios de supervisores».</div>';
  else t.innerHTML = '';
  const filas = vaFilas.map((f,i)=> vaVista === 'pendientes' ? `<tr>
      <td class="aud-nw">${spaF(f.aprobada_en)}</td>
      <td><b>${esc(f.nombre || '')}</b><br><span class="aud-ref">Doc. ${esc(f.documento)}</span></td>
      <td>${esc(f.modalidad)}<br><span class="aud-ref">${esc(f.programa || '')}</span></td>
      <td>${esc(f.sitio || '—')}</td>
      <td><select id="vaSup${i}" style="font-size:12.5px;max-width:230px;">${vaOpciones('')}</select><br>
          <input type="text" id="vaNota${i}" maxlength="300" placeholder="Nota para el supervisor (opcional)" style="font-size:12.5px;margin-top:4px;max-width:230px;"></td>
      <td><button class="primary" onclick="vaAsignar(${i})">Asignar</button></td></tr>`
    : `<tr>
      <td class="aud-nw">${spaF(f.creado)}${f.cerrada_en ? '<br><span class="aud-ref">Cerrada ' + spaF(f.cerrada_en) + '</span>' : ''}</td>
      <td><b>${esc(f.nombre || '')}</b><br><span class="aud-ref">Doc. ${esc(f.documento)}</span></td>
      <td>${esc(f.modalidad)}</td><td>${esc(f.sitio || '—')}</td>
      <td><b>${esc(f.supervisor)}</b><br><span class="aud-ref">${esc(f.supervisor_correo)}</span>${f.nota ? '<br><i>' + esc(f.nota) + '</i>' : ''}
        ${vaVista === 'historial' ? '<br>' + (f.estado === 'finalizada' ? '<span class="cor-est cor-enviado">Finalizada</span>' : '<span class="cor-est cor-pendiente">Cancelada</span>') : ''}</td>
      <td>${vaVista === 'activas' ? `<select id="vaSup${i}" style="font-size:12.5px;max-width:200px;">${vaOpciones('')}</select>
          <button class="ghost" onclick="vaReasignar(${i})">Reasignar</button> <button class="danger" onclick="vaLiberar(${i})">Liberar</button>` : ''}</td></tr>`).join('');
  t.innerHTML += '<div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>' + (vaVista === 'pendientes' ? 'Aprobada' : 'Asignada') + '</th><th>Estudiante</th><th>Modalidad</th><th>Lugar de prácticas</th><th>' +
    (vaVista === 'pendientes' ? 'Supervisor' : 'Supervisor asignado') + '</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div>';
}
async function vaAsignarA(f, supId, nota){
  const { data, error } = await sb.rpc('admin_visita_asignar', { p_documento: f.documento, p_supervisor: supId, p_nota: nota || '' });
  if(error){ toast(error.message, true); return false; }
  const est = data.estudiante, sup = data.supervisor, firma = '\n\nPolitécnico Campoalto';
  let fallo = await spaEnviarCorreo(sup.correo, 'Se te asignó una visita de supervisión',
    'Hola ' + sup.nombre + ',\n\nSe te asignó la visita de supervisión del estudiante ' + est.nombre + ' (documento ' + est.documento + ').\nModalidad: ' + est.modalidad +
    (est.sitio ? '\nLugar de prácticas: ' + est.sitio : '') + (nota ? '\nNota: ' + nota : '') +
    '\n\nIngresa a la plataforma como supervisor: lo encontrarás en «Mis visitas asignadas». Mientras la visita esté a tu cargo, solo tú podrás ver y diligenciar la información de este estudiante.' + firma);
  if(data.anterior && data.anterior.correo){
    await spaEnviarCorreo(data.anterior.correo, 'Se reasignó una visita de supervisión',
      'Hola ' + data.anterior.nombre + ',\n\nLa visita del estudiante ' + est.nombre + ' (documento ' + est.documento + ') fue reasignada a otro supervisor. Ya no tienes acceso a su información.' + firma);
  }
  toast(fallo ? 'Visita asignada, pero no se pudo avisar por correo al supervisor: ' + fallo : 'Visita asignada. ' + sup.nombre + ' fue notificado.', !!fallo);
  return true;
}
async function vaAsignar(i){
  const f = vaFilas[i], sup = document.getElementById('vaSup' + i).value;
  if(!sup){ toast('Elige el supervisor', true); return; }
  const nom = vaSups.find(s=>s.id === sup);
  if(!confirm('¿Asignar la visita de ' + f.nombre + ' a ' + (nom ? nom.nombre : 'este supervisor') + '?\nLos demás supervisores no podrán ver a este estudiante.')) return;
  if(await vaAsignarA(f, sup, document.getElementById('vaNota' + i).value.trim())) vaConsultar();
}
async function vaReasignar(i){
  const f = vaFilas[i], sup = document.getElementById('vaSup' + i).value;
  if(!sup){ toast('Elige el nuevo supervisor', true); return; }
  if(!confirm('¿Reasignar la visita de ' + f.nombre + '? El supervisor actual perderá el acceso.')) return;
  if(await vaAsignarA(f, sup, f.nota)) vaConsultar();
}
async function vaLiberar(i){
  const f = vaFilas[i];
  if(!confirm('¿Liberar a ' + f.nombre + '? Quedará sin supervisor (los de RAP y RLP vuelven a «Por asignar»; los demás vuelven a ser visibles para todos los supervisores).')) return;
  const { error } = await sb.rpc('admin_visita_liberar', { p_id: f.id });
  if(error){ toast(error.message, true); return; }
  toast('Visita liberada'); vaConsultar();
}

/* Aviso al supervisor general cuando el asistente aprueba una solicitud de RAP o RLP. Devuelve un texto de error o null. */
async function vaAvisarSupervisorGeneral(est){
  try{
    const { data, error } = await sb.rpc('admin_visita_destinatarios');
    if(error) return error.message;
    if(!data || !data.length) return 'No hay ningún usuario con el rol «Supervisor general». Créalo en Administradores.';
    let fallo = null;
    for(const d of data){
      const f = await spaEnviarCorreo(d.correo, 'Hay una visita por asignar: ' + est.nombre,
        'Hola ' + d.nombre + ',\n\nSe aprobó la solicitud de práctica de ' + est.nombre + ' (documento ' + est.documento + '), modalidad ' + est.modalidad +
        '.\n\nDebes asignar la visita a uno de los supervisores: ingresa a la plataforma → «Visitas por asignar».\n\nPolitécnico Campoalto');
      if(f) fallo = f;
    }
    return fallo;
  }catch(e){ return e.message; }
}

/* Cantidad de visitas por asignar en la tarjeta del panel */
async function vaMarcarPendientes(){
  try{
    const { data, error } = await sb.rpc('admin_visitas_pendientes');
    if(error || !data) return;
    const b = [...document.querySelectorAll('.fn-card')].find(c=>c.getAttribute('data-fn') === 'Visitas por asignar');
    const sl = b && b.querySelector('.fn-badge');
    if(sl) sl.innerHTML = '<span class="sa-badge" title="Estudiantes esperando supervisor">' + data + '</span>';
  }catch(_){}
}
(function(){
  if(typeof showScreen !== 'function') return;
  const _show = showScreen;
  showScreen = function(id){
    _show(id);
    if(id === 'screen-admin-hub' && typeof sb !== 'undefined' && sb) setTimeout(vaMarcarPendientes, 700);
  };
})();

/* ============================= ADMINISTRADOR ============================= */
async function renderAdministrador(){
  showScreen('screen-administrador');
  document.getElementById('admDocLabel').textContent = state.documento;
  await loadProgramas();
  document.getElementById('admDatosGenerales').innerHTML = datosGeneralesHtml(state.record, true, 'adm');
  document.getElementById('admResumen').innerHTML = resumenPlanillaHtml(state.record, true);
  const btn = document.getElementById('btnStartDelete');
  if(btn) btn.disabled = true;
  const panel = document.getElementById('deleteStudentPanel');
  if(panel){ panel.style.display = 'none'; panel.innerHTML = ''; }
}
async function saveDatosGeneralesAdmin(){
  const rec = state.record;
  rec.apellidos = val('adm-apellidos'); rec.nombres = val('adm-nombres');
  // El nombre completo se arma solo a partir de Apellidos + Nombres. Si el
  // estudiante es de antes de este cambio y todavía no tiene esos dos campos
  // separados, se conserva el nombre completo que ya tenía guardado.
  if(rec.apellidos || rec.nombres){
    rec.nombre = nombreCompletoDesde(rec.apellidos, rec.nombres);
  }
  rec.correo = val('adm-correo'); rec.telefono = val('adm-telefono');
  rec.sede = val('adm-sede'); rec.semestre = val('adm-semestre'); rec.modalidad = val('adm-modalidad');
  rec.periodoAcademico = val('adm-periodo'); rec.funcionario = val('adm-funcionario');
  rec.programa = val('adm-programa') || PROGRAMA;
  if(!rec.nombre){ toast('Escribe al menos apellidos o nombres del estudiante', true); return; }
  await saveRecord(rec);
  toast('Datos del estudiante guardados');
  await renderAdministrador();
}
async function adminToggleLock(i, locked){
  const rec = state.record;
  rec.meses[i].bloqueado = locked;
  await saveRecord(rec);
  toast(locked ? ('Mes '+(i+1)+' bloqueado') : ('Mes '+(i+1)+' desbloqueado — la empresa ya puede editarlo'));
  await renderAdministrador();
}
async function adminToggleVisitaLock(seccion, locked){
  const rec = state.record;
  const obj = seccion === 'rf' ? rec.revisionFunciones : rec.datosSupervision;
  obj.bloqueado = locked;
  await saveRecord(rec);
  toast(locked ? 'Visita bloqueada' : 'Visita desbloqueada — el supervisor ya puede editarla');
  await renderAdministrador();
}
async function adminToggleSubidoPlataforma(i, subido){
  const rec = state.record;
  rec.meses[i].subidoPlataforma = subido;
  await saveRecord(rec);
  await renderAdministrador();
}
function resumenPlanillaHtml(rec, editable){
  const mesesActivos = mesesPorModalidad(rec.modalidad);
  const heads = Array.from({length:mesesActivos}, (_,i)=>`<th>${mesLabel(rec,i)}</th>`).join('');
  const compRows = COMPETENCIAS.map(c=>{
    const cells = rec.competencias[c.key].slice(0,mesesActivos).map(v=> v ? (v+' · '+SCORE_LABELS[v]) : '—').map(v=>`<td>${v}</td>`).join('');
    return `<tr><td>${c.name}</td>${cells}</tr>`;
  }).join('');
  const compTable = `<table class="resumen-table"><thead><tr><th>Competencia</th>${heads}</tr></thead><tbody>${compRows}</tbody></table>`;

  const ctlRows = rec.meses.slice(0,mesesActivos).map((m,i)=>{
    const calificado = mesCalificado(rec, i);
    let plataformaCell;
    if(!calificado){
      plataformaCell = '<span style="color:var(--muted);">— sin calificar aún —</span>';
    } else if(editable){
      plataformaCell = m.subidoPlataforma
        ? `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--teal-dark);font-weight:700;"><input type="checkbox" checked onchange="adminToggleSubidoPlataforma(${i}, this.checked)"> ✅ Subida</label>`
        : `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--danger);font-weight:700;"><input type="checkbox" onchange="adminToggleSubidoPlataforma(${i}, this.checked)"> ⬜ Sin subir</label>`;
    } else {
      plataformaCell = m.subidoPlataforma ? '<span style="color:var(--teal-dark);font-weight:700;">✅ Subida</span>' : '<span style="color:var(--danger);font-weight:700;">⬜ Sin subir</span>';
    }
    return `<tr>
      <td>${mesLabel(rec,i)}</td><td>${m.sitio||'—'}</td><td>${fmtDate(m.fechaInicio)}</td><td>${fmtDate(m.fechaFin)}</td>
      <td class="${m.firmaEmpresa?'ok':'no'}">${m.firmaEmpresa?'Firmado':'Pendiente'}</td>
      <td class="${m.firmaEstudiante?'ok':'no'}">${m.firmaEstudiante?'Firmado':'Pendiente'}</td>
      <td>${editable
        ? (m.bloqueado
            ? `🔒 Bloqueado <button class="ghost" style="padding:4px 8px;font-size:11.5px;margin-left:6px;" onclick="adminToggleLock(${i}, false)">Desbloquear</button>`
            : `Editable <button class="ghost" style="padding:4px 8px;font-size:11.5px;margin-left:6px;" onclick="adminToggleLock(${i}, true)">Bloquear</button>`)
        : (m.bloqueado ? '🔒 Bloqueado' : 'Editable')}</td>
      <td>${plataformaCell}</td>
    </tr>`;
  }).join('');
  const ctlTable = `<table class="resumen-table"><thead><tr><th>${mesesActivos===1?'Nota':'Mes'}</th><th>Sitio</th><th>Inicio</th><th>Final</th><th>Firma empresa</th><th>Firma estudiante</th><th>Estado</th><th>Plataforma académica</th></tr></thead><tbody>${ctlRows}</tbody></table>`;

  const totalCalificados = rec.meses.slice(0,mesesActivos).filter((m,i)=>mesCalificado(rec,i)).length;
  const totalSubidos = rec.meses.slice(0,mesesActivos).filter((m,i)=>mesCalificado(rec,i) && m.subidoPlataforma).length;
  const totalPendientes = totalCalificados - totalSubidos;
  const contadorPlataforma = totalCalificados===0
    ? ''
    : `<div class="note-box" style="margin-bottom:12px;${totalPendientes===0?'background:#EAF6F0;border-color:#BFE3D0;color:#1E6B4A;':''}">${totalPendientes===0
        ? '✅ Todas las notas calificadas de este estudiante ya están marcadas como subidas a la plataforma académica.'
        : '📋 <b>'+totalPendientes+'</b> de '+totalCalificados+' nota(s) calificada(s) todavía sin subir a la plataforma académica.'}</div>`;

  const rf = rec.revisionFunciones;
  const rfTable = `<table class="resumen-table"><thead><tr><th>Revisión de funciones</th><th>Fecha</th><th>Modalidad</th><th>Supervisor</th><th>Sitio</th><th>Firma jefe</th><th>Firma estudiante</th><th>Firma supervisor</th><th>Estado</th></tr></thead><tbody>
    <tr><td>Visita 1</td><td>${fmtDate(rf.fecha)}</td><td>${rf.modalidadVisita||'—'}</td>
      <td>${rf.supervisor||'—'}</td>
      <td>${rf.sitio||'—'}</td>
      <td class="${rf.firmaJefe?'ok':'no'}">${rf.firmaJefe?'Firmado':'Pendiente'}</td>
      <td class="${rf.firmaEstudiante?'ok':'no'}">${rf.firmaEstudiante?'Firmado':'Pendiente'}</td>
      <td class="${rf.firmaSupervisor?'ok':'no'}">${rf.firmaSupervisor?'Firmado':'Pendiente'}</td>
      <td>${editable
        ? (rf.bloqueado
            ? `🔒 Bloqueado <button class="ghost" style="padding:4px 8px;font-size:11.5px;margin-left:6px;" onclick="adminToggleVisitaLock('rf', false)">Desbloquear</button>`
            : `Editable <button class="ghost" style="padding:4px 8px;font-size:11.5px;margin-left:6px;" onclick="adminToggleVisitaLock('rf', true)">Bloquear</button>`)
        : (rf.bloqueado ? '🔒 Bloqueado' : 'Editable')}</td>
    </tr></tbody></table>`;

  const ds = rec.datosSupervision;
  const dsTable = `<table class="resumen-table"><thead><tr><th>Datos de supervisión</th><th>Fecha</th><th>Modalidad</th><th>Supervisor</th><th>Obs. estudiante</th><th>Obs. jefe</th><th>Obs. supervisor</th><th>Estado</th></tr></thead><tbody>
    <tr><td>Visita 2</td><td>${fmtDate(ds.fecha)}</td><td>${ds.modalidadVisita||'—'}</td>
      <td>${ds.supervisor||'—'}</td>
      <td class="${ds.obsEstudiante.firma?'ok':'no'}">${ds.obsEstudiante.firma?'Firmado':'Pendiente'}</td>
      <td class="${ds.obsJefe.firma?'ok':'no'}">${ds.obsJefe.firma?'Firmado':'Pendiente'}</td>
      <td class="${ds.obsSupervisor.firma?'ok':'no'}">${ds.obsSupervisor.firma?'Firmado':'Pendiente'}</td>
      <td>${editable
        ? (ds.bloqueado
            ? `🔒 Bloqueado <button class="ghost" style="padding:4px 8px;font-size:11.5px;margin-left:6px;" onclick="adminToggleVisitaLock('ds', false)">Desbloquear</button>`
            : `Editable <button class="ghost" style="padding:4px 8px;font-size:11.5px;margin-left:6px;" onclick="adminToggleVisitaLock('ds', true)">Bloquear</button>`)
        : (ds.bloqueado ? '🔒 Bloqueado' : 'Editable')}</td>
    </tr></tbody></table>`;

  const modalidadNote = rec.modalidad
    ? `<p class="helptext" style="margin-top:0;">Modalidad: <b>${rec.modalidad}</b> — ${mesesActivos===1?'1 nota':mesesActivos+' meses'}.</p>`
    : `<p class="helptext" style="margin-top:0;color:var(--danger);">Sin modalidad asignada — asígnala en "Datos generales" para que la planilla muestre los meses correctos.</p>`;

  return `
    ${modalidadNote}
    <div class="subhead" style="margin-top:0;">Competencias transversales</div>
    ${compTable}
    <div class="subhead">Control de cumplimiento</div>
    ${contadorPlataforma}
    ${ctlTable}
    <div class="subhead">Supervisión</div>
    ${rfTable}
    ${dsTable}
  `;
}

/* ============================= ELIMINAR ESTUDIANTE ============================= */
let deleteSecurityCode = null;

function downloadPdfBeforeDelete(){
  downloadPdf();
  const btn = document.getElementById('btnStartDelete');
  if(btn) btn.disabled = false;
  toast('Acta descargada. Ya puedes continuar con "Eliminar estudiante" si es necesario.');
}

function startDeleteStudent(){
  deleteSecurityCode = String(Math.floor(100000 + Math.random()*900000)); // código de 6 dígitos
  const panel = document.getElementById('deleteStudentPanel');
  panel.style.display = 'block';
  panel.innerHTML = `
    <p style="color:var(--danger);font-weight:700;font-size:13.5px;margin-bottom:10px;">
      Vas a eliminar permanentemente a <b>${escapeAttr(state.record.nombre)||state.documento}</b> (documento ${state.documento}) y toda su planilla. Esta acción no se puede deshacer.
    </p>
    <p style="font-size:13.5px;margin-bottom:6px;">Para confirmar, escribe este código de seguridad:</p>
    <p style="font-size:22px;font-weight:800;letter-spacing:4px;color:var(--deep);background:#F7F4EE;border:1px dashed var(--line);border-radius:8px;padding:8px 12px;display:inline-block;margin-bottom:12px;">${deleteSecurityCode}</p>
    <div class="field-row">
      <div class="field"><label>Código de seguridad</label><input type="text" id="deleteCodeInput" inputmode="numeric" placeholder="Escribe el código de arriba"></div>
    </div>
    <div class="actions-row" style="justify-content:flex-start;">
      <button class="ghost" onclick="cancelDeleteStudent()">Cancelar</button>
      <button class="danger" onclick="confirmDeleteStudent()">Confirmar eliminación definitiva</button>
    </div>
    <div id="deleteStudentMsg" style="margin-top:8px;font-size:13px;"></div>
  `;
}

function cancelDeleteStudent(){
  deleteSecurityCode = null;
  const panel = document.getElementById('deleteStudentPanel');
  panel.style.display = 'none';
  panel.innerHTML = '';
}

async function confirmDeleteStudent(){
  if(!requireSupabase()) return;
  const input = document.getElementById('deleteCodeInput').value.trim();
  const msg = document.getElementById('deleteStudentMsg');
  if(input !== deleteSecurityCode){
    msg.innerHTML = '<span style="color:var(--danger)">El código no coincide. Revísalo e inténtalo de nuevo.</span>';
    return;
  }
  msg.innerHTML = '<span style="color:var(--muted)">Eliminando…</span>';
  try{
    const { error } = await sb.from('students').delete().eq('documento', state.documento);
    if(error){ throw new Error(error.message); }
    toast('Estudiante eliminado');
    deleteSecurityCode = null;
    goRole('administrador');
  }catch(e){
    console.error(e);
    msg.innerHTML = '<span style="color:var(--danger)">No se pudo eliminar: '+e.message+'</span>';
  }
}

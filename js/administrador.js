/* ============================= ADMINISTRADOR ============================= */
async function renderAdministrador(){
  showScreen('screen-administrador');
  document.getElementById('admDocLabel').textContent = state.documento;
  await loadProgramas();
  document.getElementById('admDatosGenerales').innerHTML = datosGeneralesHtml(state.record, true, 'adm');
  document.getElementById('admResumen').innerHTML = resumenPlanillaHtml(state.record, true);
}
async function saveDatosGeneralesAdmin(){
  const rec = state.record;
  rec.nombre = val('adm-nombre'); rec.correo = val('adm-correo'); rec.telefono = val('adm-telefono');
  rec.sede = val('adm-sede'); rec.semestre = val('adm-semestre'); rec.modalidad = val('adm-modalidad');
  rec.periodoAcademico = val('adm-periodo'); rec.funcionario = val('adm-funcionario');
  rec.programa = val('adm-programa') || PROGRAMA;
  if(!rec.nombre){ toast('Escribe al menos el nombre del estudiante', true); return; }
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
function resumenPlanillaHtml(rec, editable){
  const mesesActivos = mesesPorModalidad(rec.modalidad);
  const heads = Array.from({length:mesesActivos}, (_,i)=>`<th>${mesLabel(rec,i)}</th>`).join('');
  const compRows = COMPETENCIAS.map(c=>{
    const cells = rec.competencias[c.key].slice(0,mesesActivos).map(v=> v ? (v+' · '+SCORE_LABELS[v]) : '—').map(v=>`<td>${v}</td>`).join('');
    return `<tr><td>${c.name}</td>${cells}</tr>`;
  }).join('');
  const compTable = `<table class="resumen-table"><thead><tr><th>Competencia</th>${heads}</tr></thead><tbody>${compRows}</tbody></table>`;

  const ctlRows = rec.meses.slice(0,mesesActivos).map((m,i)=>`<tr>
      <td>${mesLabel(rec,i)}</td><td>${m.sitio||'—'}</td><td>${fmtDate(m.fechaInicio)}</td><td>${fmtDate(m.fechaFin)}</td>
      <td class="${m.firmaEmpresa?'ok':'no'}">${m.firmaEmpresa?'Firmado':'Pendiente'}</td>
      <td class="${m.firmaEstudiante?'ok':'no'}">${m.firmaEstudiante?'Firmado':'Pendiente'}</td>
      <td>${editable
        ? (m.bloqueado
            ? `🔒 Bloqueado <button class="ghost" style="padding:4px 8px;font-size:11.5px;margin-left:6px;" onclick="adminToggleLock(${i}, false)">Desbloquear</button>`
            : `Editable <button class="ghost" style="padding:4px 8px;font-size:11.5px;margin-left:6px;" onclick="adminToggleLock(${i}, true)">Bloquear</button>`)
        : (m.bloqueado ? '🔒 Bloqueado' : 'Editable')}</td>
    </tr>`).join('');
  const ctlTable = `<table class="resumen-table"><thead><tr><th>${mesesActivos===1?'Nota':'Mes'}</th><th>Sitio</th><th>Inicio</th><th>Final</th><th>Firma empresa</th><th>Firma estudiante</th><th>Estado</th></tr></thead><tbody>${ctlRows}</tbody></table>`;

  const rf = rec.revisionFunciones;
  const rfTable = `<table class="resumen-table"><thead><tr><th>Revisión de funciones</th><th>Fecha</th><th>Sitio</th><th>Firma jefe</th><th>Firma estudiante</th><th>Firma supervisor</th></tr></thead><tbody>
    <tr><td>Visita 1</td><td>${fmtDate(rf.fecha)}</td><td>${rf.sitio||'—'}</td>
      <td class="${rf.firmaJefe?'ok':'no'}">${rf.firmaJefe?'Firmado':'Pendiente'}</td>
      <td class="${rf.firmaEstudiante?'ok':'no'}">${rf.firmaEstudiante?'Firmado':'Pendiente'}</td>
      <td class="${rf.firmaSupervisor?'ok':'no'}">${rf.firmaSupervisor?'Firmado':'Pendiente'}</td>
    </tr></tbody></table>`;

  const ds = rec.datosSupervision;
  const dsTable = `<table class="resumen-table"><thead><tr><th>Datos de supervisión</th><th>Fecha</th><th>Obs. estudiante</th><th>Obs. jefe</th><th>Obs. supervisor</th></tr></thead><tbody>
    <tr><td>Visita 2</td><td>${fmtDate(ds.fecha)}</td>
      <td class="${ds.obsEstudiante.firma?'ok':'no'}">${ds.obsEstudiante.firma?'Firmado':'Pendiente'}</td>
      <td class="${ds.obsJefe.firma?'ok':'no'}">${ds.obsJefe.firma?'Firmado':'Pendiente'}</td>
      <td class="${ds.obsSupervisor.firma?'ok':'no'}">${ds.obsSupervisor.firma?'Firmado':'Pendiente'}</td>
    </tr></tbody></table>`;

  const modalidadNote = rec.modalidad
    ? `<p class="helptext" style="margin-top:0;">Modalidad: <b>${rec.modalidad}</b> — ${mesesActivos===1?'1 nota':mesesActivos+' meses'}.</p>`
    : `<p class="helptext" style="margin-top:0;color:var(--danger);">Sin modalidad asignada — asígnala en "Datos generales" para que la planilla muestre los meses correctos.</p>`;

  return `
    ${modalidadNote}
    <div class="subhead" style="margin-top:0;">Competencias transversales</div>
    ${compTable}
    <div class="subhead">Control de cumplimiento</div>
    ${ctlTable}
    <div class="subhead">Supervisión</div>
    ${rfTable}
    ${dsTable}
  `;
}

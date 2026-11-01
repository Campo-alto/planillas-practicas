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
  rec.jornadaSolicitada = val('adm-jornada');
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
            : `Editable <button class="ghost" style="padding:4px 8px;font-size:11.5px;margin-left:6px;" onclick="adminToggleLock(${i},

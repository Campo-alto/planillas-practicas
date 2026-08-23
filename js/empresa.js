/* ============================= EMPRESA ============================= */
function renderEmpresa(){
  showScreen('screen-empresa');
  document.getElementById('empDocLabel').textContent = state.documento;
  document.getElementById('empDatosGenerales').innerHTML = datosGeneralesHtml(state.record, false, 'emp');
  const mesesActivos = mesesPorModalidad(state.record.modalidad);
  if(state.empMonth >= mesesActivos) state.empMonth = 0;
  renderEmpOverview();
}

function mesLabel(rec, i){
  return mesesPorModalidad(rec.modalidad)===1 ? 'Nota (Homologación)' : 'Mes '+(i+1);
}

function renderEmpOverview(){
  const rec = state.record;
  const mesesActivos = mesesPorModalidad(rec.modalidad);
  const rows = rec.meses.slice(0, mesesActivos).map((m,i)=>{
    const scores = COMPETENCIAS.map(c=>rec.competencias[c.key][i]);
    const nCalificadas = scores.filter(s=>s!=null).length;
    const notasTxt = nCalificadas===0 ? 'Sin calificar' : (nCalificadas+'/4 competencias');
    const notasCls = nCalificadas===4 ? 'ok' : (nCalificadas>0 ? '' : 'no');
    const estado = m.bloqueado ? '🔒 Bloqueado' : 'Editable';
    const isOpen = i === state.empMonth;
    const mainRow = `<tr class="rowlink${isOpen?' active-month':''}" onclick="empGoToMonth(${i})">
      <td>${mesLabel(rec,i)}${isOpen ? ' ▾' : ''}</td>
      <td>${m.sitio || '—'}</td>
      <td class="${notasCls}">${notasTxt}</td>
      <td>${estado}</td>
    </tr>`;
    const expandRow = isOpen ? `<tr><td class="expand-cell" colspan="4">${empMonthEditorHtml(i)}</td></tr>` : '';
    return mainRow + expandRow;
  }).join('');
  const modalidadNote = rec.modalidad ? `<p class="helptext" style="margin-top:-4px;">Modalidad: <b>${rec.modalidad}</b> — ${mesesActivos===1?'1 nota':mesesActivos+' meses'}.</p>` : '<p class="helptext" style="margin-top:-4px;color:var(--danger);">El administrador todavía no asignó una modalidad a este estudiante — se muestran 6 meses por defecto.</p>';
  document.getElementById('empOverview').innerHTML = modalidadNote +
    `<table class="resumen-table"><thead><tr><th>${mesesActivos===1?'Nota':'Mes'}</th><th>Sitio</th><th>Notas</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function empMonthEditorHtml(i){
  const rec = state.record;
  const m = rec.meses[i];
  const locked = !!m.bloqueado;
  const dis = locked ? 'disabled' : '';
  const banner = locked ? `<div class="note-box" style="margin-bottom:12px;">🔒 Este mes ya fue guardado y quedó bloqueado. Si necesitas corregir una nota, pide al administrador que lo desbloquee.</div>` : '';

  const compRows = COMPETENCIAS.map(c=>{
    const current = rec.competencias[c.key][i];
    let opts = '<option value="">Sin calificar</option>';
    for(let s=5;s>=1;s--){ opts += `<option value="${s}" ${current===s?'selected':''}>${s} · ${SCORE_LABELS[s]}</option>`; }
    return `<div class="comp-row">
      <div><div class="comp-name">${c.name}</div><div class="comp-desc">${c.desc}</div></div>
      <select data-comp="${c.key}" class="empCompSelect" ${dis}>${opts}</select>
    </div>`;
  }).join('');

  return `
    ${banner}
    <div class="comp-grid">${compRows}</div>
    <div class="subhead" style="margin-top:16px;">Control de cumplimiento del mes</div>
    <div class="field-row">
      <div class="field"><label>Sitio de prácticas</label><input id="ctl-sitio" value="${escapeAttr(m.sitio)}" ${dis}></div>
      <div class="field"><label>Fecha inicio</label><input type="date" id="ctl-inicio" value="${m.fechaInicio||''}" ${dis}></div>
      <div class="field"><label>Fecha final</label><input type="date" id="ctl-fin" value="${m.fechaFin||''}" ${dis}></div>
    </div>
    <div class="field"><label>Observaciones de la práctica</label><textarea id="ctl-obs" ${dis}>${m.observaciones||''}</textarea></div>
    <div class="actions-row">
      <button class="primary" id="empSaveBtn" onclick="saveEmpresaMonth()" ${dis}>Guardar ${mesLabel(rec,i).toLowerCase()}</button>
    </div>
  `;
}

function empGoToMonth(i){
  state.empMonth = i;
  renderEmpresa();
}

async function saveEmpresaMonth(){
  const rec = state.record; const i = state.empMonth;
  if(rec.meses[i].bloqueado){ toast('Este mes está bloqueado. Pide al administrador que lo desbloquee.', true); return; }
  document.querySelectorAll('.empCompSelect').forEach(sel=>{
    const key = sel.getAttribute('data-comp');
    rec.competencias[key][i] = sel.value ? parseInt(sel.value,10) : null;
  });
  rec.meses[i].sitio = val('ctl-sitio');
  rec.meses[i].fechaInicio = document.getElementById('ctl-inicio').value;
  rec.meses[i].fechaFin = document.getElementById('ctl-fin').value;
  rec.meses[i].observaciones = document.getElementById('ctl-obs').value.trim();
  if(!rec.nombre){ toast('Guarda primero los datos generales del estudiante', true); return; }
  await saveRecord(rec);
  toast(mesLabel(rec,i)+' guardado. El administrador lo bloqueará cuando lo revise.');
  renderEmpresa();
}

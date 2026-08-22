/* ============================= EMPRESA ============================= */
function renderEmpresa(){
  showScreen('screen-empresa');
  document.getElementById('empDocLabel').textContent = state.documento;
  document.getElementById('empDatosGenerales').innerHTML = datosGeneralesHtml(state.record, false, 'emp');
  renderEmpOverview();

  const tabs = document.getElementById('empMonthTabs');
  tabs.innerHTML = '';
  for(let i=0;i<6;i++){
    const filled = state.record.meses[i].sitio || COMPETENCIAS.some(c=>state.record.competencias[c.key][i]!=null);
    const b = document.createElement('button');
    b.className = 'tab'+(i===state.empMonth?' active':'')+(filled?' filled':'');
    b.textContent = 'Mes '+(i+1)+(state.record.meses[i].bloqueado ? ' 🔒' : '');
    b.onclick = ()=>{ state.empMonth = i; renderEmpresa(); };
    tabs.appendChild(b);
  }
  renderEmpCompForm();
  renderEmpControlForm();
  setTimeout(()=>initSigPad('sig-empresa', state.record.meses[state.empMonth].firmaEmpresa, !!state.record.meses[state.empMonth].bloqueado), 30);
}
function renderEmpOverview(){
  const rec = state.record;
  const rows = rec.meses.map((m,i)=>{
    const scores = COMPETENCIAS.map(c=>rec.competencias[c.key][i]);
    const nCalificadas = scores.filter(s=>s!=null).length;
    const notasTxt = nCalificadas===0 ? 'Sin calificar' : (nCalificadas+'/4 competencias');
    const notasCls = nCalificadas===4 ? 'ok' : (nCalificadas>0 ? '' : 'no');
    const firmaTxt = m.firmaEmpresa ? 'Firmado' : 'Pendiente';
    const firmaCls = m.firmaEmpresa ? 'ok' : 'no';
    const estado = m.bloqueado ? '🔒 Bloqueado' : 'Editable';
    return `<tr class="rowlink" onclick="empGoToMonth(${i})">
      <td>Mes ${i+1}</td>
      <td>${m.sitio || '—'}</td>
      <td class="${notasCls}">${notasTxt}</td>
      <td class="${firmaCls}">${firmaTxt}</td>
      <td>${estado}</td>
    </tr>`;
  }).join('');
  document.getElementById('empOverview').innerHTML =
    `<table class="resumen-table"><thead><tr><th>Mes</th><th>Sitio</th><th>Notas</th><th>Firma</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function empGoToMonth(i){
  state.empMonth = i;
  renderEmpresa();
  document.getElementById('empCompForm').scrollIntoView({behavior:'smooth', block:'start'});
}
function renderEmpCompForm(){
  const i = state.empMonth;
  const locked = !!state.record.meses[i].bloqueado;
  const banner = locked ? `<div class="note-box" style="margin-bottom:12px;">🔒 Este mes ya fue guardado y quedó bloqueado. Si necesitas corregir una nota, pide al administrador que lo desbloquee.</div>` : '';
  const rows = COMPETENCIAS.map(c=>{
    const current = state.record.competencias[c.key][i];
    let opts = '<option value="">Sin calificar</option>';
    for(let s=5;s>=1;s--){ opts += `<option value="${s}" ${current===s?'selected':''}>${s} · ${SCORE_LABELS[s]}</option>`; }
    return `<div class="comp-row">
      <div><div class="comp-name">${c.name}</div><div class="comp-desc">${c.desc}</div></div>
      <select data-comp="${c.key}" class="empCompSelect" ${locked?'disabled':''}>${opts}</select>
    </div>`;
  }).join('');
  document.getElementById('empCompForm').innerHTML = `${banner}<div class="comp-grid">${rows}</div>`;
}
function renderEmpControlForm(){
  const i = state.empMonth;
  const m = state.record.meses[i];
  const locked = !!m.bloqueado;
  const dis = locked ? 'disabled' : '';
  document.getElementById('empControlForm').innerHTML = `
    <div class="field-row">
      <div class="field"><label>Sitio de prácticas</label><input id="ctl-sitio" value="${escapeAttr(m.sitio)}" ${dis}></div>
      <div class="field"><label>Fecha inicio</label><input type="date" id="ctl-inicio" value="${m.fechaInicio||''}" ${dis}></div>
      <div class="field"><label>Fecha final</label><input type="date" id="ctl-fin" value="${m.fechaFin||''}" ${dis}></div>
    </div>
    <div class="field"><label>Observaciones de la práctica</label><textarea id="ctl-obs" ${dis}>${m.observaciones||''}</textarea></div>
  `;
  const saveBtn = document.getElementById('empSaveBtn');
  if(saveBtn) saveBtn.disabled = locked;
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
  const sig = sigDataUrl('sig-empresa');
  if(sig) rec.meses[i].firmaEmpresa = sig;
  if(!rec.nombre){ toast('Guarda primero los datos generales del estudiante', true); return; }
  rec.meses[i].bloqueado = true;
  await saveRecord(rec);
  toast('Mes '+(i+1)+' guardado y bloqueado');
  renderEmpresa();
}

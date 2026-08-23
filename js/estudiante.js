/* ============================= ESTUDIANTE ============================= */
function renderEstudiante(){
  showScreen('screen-estudiante');
  document.getElementById('estDocLabel').textContent = state.documento;
  document.getElementById('estDatosGenerales').innerHTML = datosGeneralesHtml(state.record, false, 'est');
  renderEstNotasView();

  const mesesActivos = mesesPorModalidad(state.record.modalidad);
  if(state.estMonth >= mesesActivos) state.estMonth = 0;
  const tabs = document.getElementById('estMonthTabs');
  tabs.innerHTML = '';
  for(let i=0;i<mesesActivos;i++){
    const b = document.createElement('button');
    b.className = 'tab'+(i===state.estMonth?' active':'');
    b.textContent = mesLabel(state.record, i);
    b.onclick = ()=>{ state.estMonth = i; renderEstudiante(); };
    tabs.appendChild(b);
  }
  const m = state.record.meses[state.estMonth];
  document.getElementById('estControlView').innerHTML = `
    <div class="field-row">
      <div class="field"><label>Sitio de prácticas</label><div>${m.sitio||'— aún no diligenciado por la empresa —'}</div></div>
      <div class="field"><label>Fecha inicio</label><div>${m.fechaInicio||'—'}</div></div>
      <div class="field"><label>Fecha final</label><div>${m.fechaFin||'—'}</div></div>
    </div>
    <div class="field"><label>Observaciones de la práctica</label><div>${m.observaciones||'—'}</div></div>
  `;
}
function renderEstNotasView(){
  const rec = state.record;
  const mesesActivos = mesesPorModalidad(rec.modalidad);
  const heads = Array.from({length:mesesActivos}, (_,i)=>`<th>${mesLabel(rec,i)}</th>`).join('');
  const rows = COMPETENCIAS.map(c=>{
    const cells = rec.competencias[c.key].slice(0, mesesActivos).map(v=> v ? (v+' · '+SCORE_LABELS[v]) : '—').map(v=>`<td>${v}</td>`).join('');
    return `<tr><td>${c.name}</td>${cells}</tr>`;
  }).join('');
  document.getElementById('estNotasView').innerHTML =
    `<table class="resumen-table"><thead><tr><th>Competencia</th>${heads}</tr></thead><tbody>${rows}</tbody></table>`;
}

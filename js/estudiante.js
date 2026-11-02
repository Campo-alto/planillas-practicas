/* ============================= ESTUDIANTE ============================= */
function renderEstudiante(){
  showScreen('screen-estudiante');
  document.getElementById('estDocLabel').textContent = state.documento;
  document.getElementById('estDatosGenerales').innerHTML = datosGeneralesHtml(state.record, false, 'est');
  renderEstNotasView();
  renderAsignacionEstudiante();

  const mesesActivos = mesesPorModalidad(state.record.modalidad);
  if(state.estMonth >= mesesActivos) state.estMonth = 0;
  const tabs = document.getElementById('estMonthTabs');
  tabs.innerHTML = '';
  for(let i=0;i<mesesActivos;i++){
    const filled = !!state.record.meses[i].firmaEstudiante;
    const b = document.createElement('button');
    b.className = 'tab'+(i===state.estMonth?' active':'')+(filled?' filled':'');
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
  setTimeout(()=>initSigPad('sig-estudiante-mes', m.firmaEstudiante), 30);
  organizarPestanasEstudiante();
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
async function saveEstudianteMes(){
  const rec = state.record; const i = state.estMonth;
  const sig = sigDataUrl('sig-estudiante-mes');
  if(!sig){ toast('Firma primero en el recuadro', true); return; }
  rec.meses[i].firmaEstudiante = sig;
  await saveRecord(rec);
  toast('Firma de '+mesLabel(rec,i).toLowerCase()+' guardada');
  renderEstudiante();
}

/* ===== Pestañas del estudiante: Datos generales · Asignación · Mis notas · Control de cumplimiento ===== */
let estTabActual = 'datos';
function cardsEstudiante(){
  const c = id => { const e = document.getElementById(id); return e ? (e.classList.contains('card') ? e : e.closest('.card')) : null; };
  return { datos: c('estDatosGenerales'), asig: c('estAsignacion'), notas: c('estNotasView'), control: c('estMonthTabs') };
}
function organizarPestanasEstudiante(){
  const cards = cardsEstudiante();
  if(!cards.datos) return;
  let ref = cards.datos;
  ['asig','notas','control'].forEach(k=>{
    if(cards[k] && cards[k] !== ref.nextElementSibling) ref.insertAdjacentElement('afterend', cards[k]);
    if(cards[k]) ref = cards[k];
  });
  let bar = document.getElementById('estTabs');
  if(!bar){
    bar = document.createElement('div'); bar.className = 'tabs'; bar.id = 'estTabs';
    cards.datos.insertAdjacentElement('beforebegin', bar);
  }
  bar.innerHTML =
    '<button class="tab" id="estTab-datos" onclick="showEstTab(\'datos\')">Datos generales</button>'+
    '<button class="tab" id="estTab-asig" onclick="showEstTab(\'asig\')">Asignación de práctica</button>'+
    '<button class="tab" id="estTab-notas" onclick="showEstTab(\'notas\')">Mis notas</button>'+
    '<button class="tab" id="estTab-control" onclick="showEstTab(\'control\')">Control y firma</button>';
  showEstTab(estTabActual);
}
function showEstTab(tab){
  estTabActual = tab;
  const cards = cardsEstudiante();
  Object.keys(cards).forEach(k=>{
    if(cards[k]) cards[k].style.display = (k === tab) ? '' : 'none';
    const b = document.getElementById('estTab-'+k); if(b) b.classList.toggle('active', k === tab);
  });
  // el lienzo de la firma necesita estar visible para medirse bien
  if(tab === 'control' && state.record){
    const m = state.record.meses[state.estMonth];
    setTimeout(()=>initSigPad('sig-estudiante-mes', m.firmaEstudiante), 30);
  }
}

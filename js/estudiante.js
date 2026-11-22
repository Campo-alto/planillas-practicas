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
/* Quién calificó el mes: la empresa o, si la empresa no lo hizo, un profesor (la nota se ve igual para el estudiante) */
function estQuienCalifico(i){
  const rec = state.record, m = (rec.meses || [])[i] || {};
  const esc = x => (typeof escapeHtmlFicha === 'function' ? escapeHtmlFicha(x) : String(x));
  const hay = COMPETENCIAS.some(c => rec.competencias[c.key][i] != null);
  if(m.notaProfesor){
    const np = m.notaProfesor;
    return '🎓 Este mes lo calificó el profesor ' + esc(np.nombre || np.email || '') + (np.fecha ? ' el ' + esc(np.fecha) : '') + ', porque la empresa no lo calificó.';
  }
  return hay ? '🏢 Este mes lo calificó la empresa.' : '';
}
function renderEstNotasView(){
  const rec = state.record;
  const mesesActivos = mesesPorModalidad(rec.modalidad);
  const heads = Array.from({length:mesesActivos}, (_,i)=>`<th>${mesLabel(rec,i)}</th>`).join('');
  const rows = COMPETENCIAS.map(c=>{
    const cells = rec.competencias[c.key].slice(0, mesesActivos).map(v=> v ? (v+' · '+SCORE_LABELS[v]) : '—').map(v=>`<td>${v}</td>`).join('');
    return `<tr><td>${c.name}</td>${cells}</tr>`;
  }).join('');
  // mes que se muestra en la rúbrica: el último con alguna nota (o el primero)
  if(estNotasMes === null || estNotasMes >= mesesActivos){
    estNotasMes = 0;
    for(let i=0;i<mesesActivos;i++){ if(COMPETENCIAS.some(c=>rec.competencias[c.key][i])) estNotasMes = i; }
  }
  const pills = Array.from({length:mesesActivos}, (_,i)=>{
    const n = COMPETENCIAS.filter(c=>rec.competencias[c.key][i]!=null).length;
    return `<button type="button" class="tab${i===estNotasMes?' active':''}" onclick="estNotasMes=${i};renderEstNotasView()">${mesLabel(rec,i)} · ${n}/4</button>`;
  }).join('');
  document.getElementById('estNotasView').innerHTML =
    `<table class="resumen-table"><thead><tr><th>Competencia</th>${heads}</tr></thead><tbody>${rows}</tbody></table>
     <div class="subhead" style="margin-top:18px;">Rúbrica de calificación · ${mesLabel(rec,estNotasMes)}</div>
     <p class="helptext" style="margin-top:-2px;">Así se evalúa cada criterio. Se resalta el nivel que te asignaron este mes (la empresa o, si ella no calificó, un profesor).</p>
     ${estQuienCalifico(estNotasMes) ? '<div class="note-box" style="margin-bottom:10px;">' + estQuienCalifico(estNotasMes) + '</div>' : ''}
     <div class="tabs">${pills}</div>${rubricaLecturaHtml(estNotasMes)}`;
}
let estNotasMes = null;
function rubricaLecturaHtml(i){
  const rec = state.record;
  const head = `<tr><th class="rub-crit">Criterio</th>${[5,4,3,2,1].map(n=>`<th class="rub-lvl rub-l${n}"><b>${n}</b> · ${SCORE_LABELS[n]}</th>`).join('')}</tr>`;
  const rows = COMPETENCIAS.map(c=>{
    const cur = rec.competencias[c.key][i];
    const cells = [5,4,3,2,1].map(n=>`<td class="rub-cell rub-ro${cur===n?' sel':''}">${cur===n?'<span class="rub-tu">✔ Tu nota</span>':''}${RUBRICA[c.key][n]}</td>`).join('');
    return `<tr><th class="rub-crit"><div class="comp-name">${c.name}</div><div class="comp-desc">${c.desc}</div>
      <div class="rub-res ${cur?'ok':''}">${cur ? 'Nota: '+cur+' · '+SCORE_LABELS[cur] : 'Sin calificar'}</div></th>${cells}</tr>`;
  }).join('');
  return `<div class="rub-wrap"><table class="rubrica"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
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

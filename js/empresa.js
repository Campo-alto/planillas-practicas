/* ============================= EMPRESA ============================= */
const PENCIL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="M15 5l4 4"/></svg>';

function renderEmpresa(){
  showScreen('screen-empresa');
  document.getElementById('empDocLabel').textContent = state.documento;
  document.getElementById('empDatosGenerales').innerHTML = datosGeneralesHtml(state.record, false, 'emp');
  const mesesActivos = mesesPorModalidad(state.record.modalidad);
  if(state.empMonth >= mesesActivos) state.empMonth = 0;
  renderEmpOverview();
  setTimeout(()=>initSigPad('sig-empresa', state.record.meses[state.empMonth].firmaEmpresa, !!state.record.meses[state.empMonth].bloqueado), 30);
}

function mesLabel(rec, i){
  return mesesPorModalidad(rec.modalidad)===1 ? 'Nota (Homologación)' : 'Mes '+(i+1);
}

function renderEmpOverview(){
  const rec = state.record;
  const mesesActivos = mesesPorModalidad(rec.modalidad);
  const pills = rec.meses.slice(0, mesesActivos).map((m,i)=>{
    const n = COMPETENCIAS.filter(c=>rec.competencias[c.key][i]!=null).length;
    const icon = m.bloqueado ? '🔒' : (n===4 ? '✅' : (n>0 ? '◐' : '○'));
    return `<button type="button" class="month-pill${i===state.empMonth?' active':''}${m.bloqueado?' locked':''}" onclick="empGoToMonth(${i})"><span class="mp-name">${mesLabel(rec,i)}</span><span class="mp-state">${icon} ${n}/4</span></button>`;
  }).join('');
  const i = state.empMonth, m = rec.meses[i];
  const scores = COMPETENCIAS.map(c=>rec.competencias[c.key][i]);
  const nCal = scores.filter(x=>x!=null).length;
  const resumen = `<table class="ficha-table"><tbody>
      <tr><th>Sitio de prácticas</th><td>${m.sitio ? escapeHtmlFicha(m.sitio) : '<span class="ficha-vacio">—</span>'}</td><th>Estado</th><td>${m.bloqueado ? (m.congelado ? '🔒 Protegido (empresa anterior)' : '🔒 Bloqueado') : 'Editable'}</td></tr>
      <tr><th>Fecha inicio</th><td>${fmtDate(m.fechaInicio)||'<span class="ficha-vacio">—</span>'}</td><th>Fecha final</th><td>${fmtDate(m.fechaFin)||'<span class="ficha-vacio">—</span>'}</td></tr>
      <tr><th>Competencias calificadas</th><td>${nCal}/4</td><th>Firma empresa</th><td class="${m.firmaEmpresa?'ok':'no'}">${m.firmaEmpresa?'Firmado':'Pendiente'}</td></tr>
    </tbody></table>`;
  const modalidadNote = rec.modalidad ? `<p class="helptext" style="margin-top:-4px;">Modalidad: <b>${rec.modalidad}</b> — ${mesesActivos===1?'1 nota':mesesActivos+' meses'}.</p>` : '<p class="helptext" style="margin-top:-4px;color:var(--danger);">El administrador todavía no asignó una modalidad a este estudiante — se muestran 6 meses por defecto.</p>';
  document.getElementById('empOverview').innerHTML = modalidadNote +
    `<div class="month-pills">${pills}</div>
     <div class="ficha-mes">
       <div class="ficha-mes-title">Plantilla · ${mesLabel(rec,i)}</div>
       <div class="ficha-wrap">${resumen}</div>
       ${empMonthEditorHtml(i)}
     </div>`;
}

/* Rúbrica de calificación: texto orientativo por nivel (ajústalo si el formato institucional dice otra cosa) */
const RUBRICA = {
  ser: {5:'Siempre puntual, excelente presentación, comunicación asertiva; aporta y lidera el trabajo en equipo.',4:'Casi siempre puntual y bien presentado; buena relación con el equipo.',3:'Cumple de forma regular con puntualidad y presentación; colabora cuando se le pide.',2:'Llegadas tarde frecuentes o presentación inadecuada; dificultad para trabajar en equipo.',1:'No cumple horarios ni presentación; su actitud afecta el ambiente laboral.'},
  desempeno: {5:'Ejecuta con autonomía y precisión todas las tareas técnicas y operativas del programa.',4:'Ejecuta las tareas con poca supervisión y buena calidad.',3:'Ejecuta las tareas básicas con supervisión frecuente.',2:'Comete errores frecuentes y requiere acompañamiento constante.',1:'No logra ejecutar las tareas asignadas.'},
  producto: {5:'Entrega resultados completos, ordenados y oportunos, en un entorno de trabajo seguro.',4:'Resultados completos con detalles menores por mejorar; mantiene orden y seguridad.',3:'Resultados aceptables; orden y seguridad con recordatorios ocasionales.',2:'Resultados incompletos o desordenados; descuida las normas de seguridad.',1:'No entrega resultados o incumple las normas de seguridad.'},
  conocimiento: {5:'Aplica correctamente la normativa y maneja con total confidencialidad la información.',4:'Aplica la normativa con pocos errores y respeta la confidencialidad.',3:'Conoce lo básico de la normativa; confidencialidad con recordatorios.',2:'Aplica la normativa de forma parcial o errónea; descuida la confidencialidad.',1:'Desconoce la normativa o vulnera la confidencialidad.'}
};
function rubricaHtml(i, dis){
  const rec = state.record;
  const head = `<tr><th class="rub-crit">Criterio</th>${[5,4,3,2,1].map(n=>`<th class="rub-lvl rub-l${n}"><b>${n}</b> · ${SCORE_LABELS[n]}</th>`).join('')}</tr>`;
  const rows = COMPETENCIAS.map(c=>{
    const cur = rec.competencias[c.key][i];
    const cells = [5,4,3,2,1].map(n=>`<td class="rub-cell${cur===n?' sel':''}" data-comp="${c.key}" data-n="${n}">
        <label class="rub-lab"><input type="radio" name="rub-${c.key}" value="${n}" ${cur===n?'checked':''} ${dis} onchange="rubSel('${c.key}',${n})"><span>${RUBRICA[c.key][n]}</span></label></td>`).join('');
    return `<tr><th class="rub-crit"><div class="comp-name">${c.name}</div><div class="comp-desc">${c.desc}</div>
        <button type="button" class="linkbtn rub-clear" ${dis} onclick="rubSel('${c.key}',null)">Quitar nota</button>
        <select data-comp="${c.key}" class="empCompSelect" style="display:none" ${dis}><option value="">Sin calificar</option>${[5,4,3,2,1].map(n=>`<option value="${n}" ${cur===n?'selected':''}>${n}</option>`).join('')}</select></th>${cells}</tr>`;
  }).join('');
  return `<div class="rub-wrap"><table class="rubrica"><thead>${head}</thead><tbody>${rows}</tbody></table></div>
    <p class="helptext" style="margin-top:6px;">Haz clic en el nivel que describe el desempeño del estudiante en cada criterio. 5 = Excelente · 1 = Por desarrollar.</p>`;
}
function rubSel(key, n){
  const sel = document.querySelector('.empCompSelect[data-comp="'+key+'"]'); if(sel) sel.value = n==null ? '' : String(n);
  document.querySelectorAll('.rub-cell[data-comp="'+key+'"]').forEach(td=>{
    const on = n!=null && Number(td.dataset.n)===n; td.classList.toggle('sel', on);
    const r = td.querySelector('input'); if(r) r.checked = on;
  });
}
function empMonthEditorHtml(i){
  const rec = state.record;
  const m = rec.meses[i];
  const locked = !!m.bloqueado;
  const dis = locked ? 'disabled' : '';
  const banner = locked ? (m.congelado
    ? `<div class="note-box" style="margin-bottom:12px;">🔒 Este mes fue calificado por la empresa anterior del estudiante y quedó protegido: no se puede modificar. Solo el administrador puede hacerlo.</div>`
    : `<div class="note-box" style="margin-bottom:12px;">🔒 Este mes ya fue guardado y quedó bloqueado. Si necesitas corregir una nota, pide al administrador que lo desbloquee.</div>`) : '';

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
    ${rubricaHtml(i, dis)}
    <div class="subhead" style="margin-top:16px;">Control de cumplimiento del mes</div>
    <div class="field-row">
      <div class="field"><label>Sitio de prácticas</label><input id="ctl-sitio" value="${escapeAttr(m.sitio || sitioCache[rec.documento] || '')}" ${dis} ${sitioCache[rec.documento] ? 'readonly title="Es la empresa donde el estudiante tiene su práctica asignada"' : ''}></div>
      <div class="field"><label>Fecha inicio</label><input type="date" id="ctl-inicio" value="${m.fechaInicio||''}" ${dis}></div>
      <div class="field"><label>Fecha final</label><input type="date" id="ctl-fin" value="${m.fechaFin||''}" ${dis}></div>
    </div>
    <div class="field"><label>Observaciones de la práctica</label><textarea id="ctl-obs" ${dis}>${m.observaciones||''}</textarea></div>
    <div class="sig-wrap">
      <label>Firma empresa (jefe inmediato)</label>
      <div class="pencil-hint" style="margin-bottom:6px;">${PENCIL_SVG} Dibuja tu firma con el dedo o el mouse, como si usaras un lápiz</div>
      <div class="sig-box"><canvas class="sigpad" id="sig-empresa"></canvas></div>
      <div class="sig-actions">
        <span class="sig-status" id="sig-empresa-status">Sin firmar</span>
        <button class="ghost" onclick="clearSig('sig-empresa')" ${dis}>Borrar firma</button>
      </div>
    </div>
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
  const sig = sigDataUrl('sig-empresa');
  if(sig) rec.meses[i].firmaEmpresa = sig;
  if(!rec.nombre){ toast('Guarda primero los datos generales del estudiante', true); return; }
  await saveRecord(rec);
  toast(mesLabel(rec,i)+' guardado. El administrador lo bloqueará cuando lo revise.');
  renderEmpresa();
}

/* Sitio de prácticas por defecto: la empresa donde el estudiante ya está asignado o contratado */
const sitioCache = {};
async function empCargarSitio(){
  const rec = state.record; if(!rec || !state.token || !sb) return;
  const d = rec.documento; if(d in sitioCache) return;
  try{
    const { data, error } = await sb.rpc('sitio_practica', { p_token: state.token, p_documento: d });
    if(error) throw error;
    sitioCache[d] = data || '';
  }catch(e){ console.error(e); return; }      // sin el SQL de la etapa 14 el campo queda editable como antes
  const inp = document.getElementById('ctl-sitio');
  if(inp && sitioCache[d]){ if(!inp.value) inp.value = sitioCache[d]; inp.readOnly = true; inp.title = 'Es la empresa donde el estudiante tiene su práctica asignada'; }
}
(function(){ const _re = renderEmpresa; renderEmpresa = function(){ const r = _re.apply(this, arguments); empCargarSitio(); return r; }; })();

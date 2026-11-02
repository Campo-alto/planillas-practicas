/* ===== RÚBRICA DE CALIFICACIÓN (formato PPS-GAA-F-006 v9) =====
   Los criterios viven en la base de datos (tabla rubrica_criterios) y los edita el administrador.
   Si no se pueden cargar, se usa la rúbrica oficial incluida aquí como respaldo. */
const RUBRICA_OFICIAL = [
 {
  "key": "ser",
  "nombre": "1. Evaluación del ser",
  "descripcion": "Competencias transversales y actitudinales",
  "n5": "Cumple siempre con la puntualidad, presentación personal impecable y demuestra un excelente manejo de habilidades sociales, trabajo en equipo y empatía.",
  "n4": "Asiste regularmente, cumple con los estándares de presentación con mínimos detalles a ajustar. Muestra un buen manejo de habilidades sociales y colaboración.",
  "n3": "Asistencia y presentación aceptables, pero con faltas ocasionales. Manejo básico de habilidades sociales con dificultades para adaptarse a dinámicas.",
  "n2": "Problemas frecuentes de puntualidad y presentación personal deficiente. Dificultades significativas en habilidades sociales y comunicación.",
  "n1": "Poca asistencia, apariencia inadecuada al contexto y actitud negativa que afecta las relaciones y el trabajo en equipo."
 },
 {
  "key": "desempeno",
  "nombre": "2. Evaluación de desempeño",
  "descripcion": "Ejecución técnica y operativa del programa",
  "n5": "Utiliza los recursos, insumos o herramientas de su área de forma eficaz, aplicando con precisión los procedimientos y metodologías de su programa de formación.",
  "n4": "Ejecuta adecuadamente las actividades principales de su puesto de trabajo con buena calidad. Utiliza los recursos de su área de forma correcta, con imprecisiones menores en la fluidez o ritmo de trabajo que no afectan el resultado final del servicio.",
  "n3": "Realiza sus funciones en un nivel básico o estándar. Requiere guía o supervisión ocasional para aplicar los procedimientos operativos de su área o para utilizar adecuadamente los recursos y elementos asignados a su puesto.",
  "n2": "Presenta dificultades significativas en la ejecución de las actividades de su perfil. Comete errores frecuentes en los procedimientos de su programa o muestra un manejo limitado e inadecuado de los recursos de su puesto de trabajo.",
  "n1": "Presenta dificultades significativas en la ejecución de las actividades de su perfil. Comete errores frecuentes en los procedimientos de su programa o muestra un manejo limitado e inadecuado de los recursos de su puesto de trabajo."
 },
 {
  "key": "producto",
  "nombre": "3. Evaluación de producto",
  "descripcion": "Resultados tangibles, orden y entorno seguro",
  "n5": "Ejecuta la totalidad de las funciones asignadas a su perfil con autonomía, alta calidad y destreza. Utiliza los recursos de su área de forma eficaz, aplicando con precisión los procedimientos y protocolos de su programa de formación.",
  "n4": "Ejecuta adecuadamente las actividades principales de su puesto con buena calidad. Utiliza los recursos de su área correctamente, con imprecisiones menores en la fluidez técnica que no afectan el resultado final.",
  "n3": "Realiza sus funciones en un nivel básico o estándar. Requiere supervisión o guía ocasional para aplicar los procedimientos de su área o para utilizar adecuadamente los recursos de su puesto de trabajo.",
  "n2": "Presenta dificultades en la ejecución de las actividades asignadas a su perfil. Comete errores frecuentes en los procedimientos de su programa o muestra un manejo limitado e inadecuado de los recursos a su cargo.",
  "n1": "Incumple o no logra ejecutar las funciones básicas de su puesto. Desconoce o ignora los procedimientos operativos de su área, comprometiendo la calidad de la labor encomendada."
 },
 {
  "key": "conocimiento",
  "nombre": "4. Evaluación de conocimientos",
  "descripcion": "Aplicación de normativa y confidencialidad",
  "n5": "Aplica con total rigurosidad los conocimientos teóricos, normativas, reglamentos y protocolos propios de su formación. Maneja la información, datos y documentos de la organización bajo un estricto cumplimiento de la confidencialidad, la ética y el marco legal.",
  "n4": "Aplica correctamente los conocimientos y normativas de su área en las labores diarias. Maneja la información y documentación con responsabilidad y reserva, con imprecisiones menores que no comprometen la seguridad legal ni el proceso.",
  "n3": "Demuestra un conocimiento básico de la normativa y lineamientos de su puesto. Aplica los reglamentos de su área con guía ocasional y mantiene la confidencialidad, aunque presenta vacíos leves en el registro de datos o soportes.",
  "n2": "Muestra vacíos significativos en el conocimiento o aplicación de las normas y procedimientos que rigen su área de trabajo. Comete errores frecuentes en la gestión documental o maneja de forma poco rigurosa la información del puesto.",
  "n1": "Desconoce o ignora los reglamentos, normativas y procedimientos legales e institucionales de su perfil. Maneja de forma negligente la información confidencial o sensible, poniendo en riesgo legal o reputacional a la organización."
 }
];

function rubricaAplicar(lista){
  if(!Array.isArray(lista) || !lista.length) return;
  COMPETENCIAS.splice(0, COMPETENCIAS.length, ...lista.map(c=>({ key: c.key, name: c.nombre, desc: c.descripcion || '' })));
  Object.keys(RUBRICA).forEach(k=>delete RUBRICA[k]);
  lista.forEach(c=>{ RUBRICA[c.key] = { 5: c.n5 || '', 4: c.n4 || '', 3: c.n3 || '', 2: c.n2 || '', 1: c.n1 || '' }; });
  try{ if(typeof state !== 'undefined' && state && state.record) rubricaAsegurar(state.record); }catch(_){}
}
// Garantiza que el registro tenga un arreglo de 6 notas por cada criterio vigente
function rubricaAsegurar(rec){
  if(!rec) return rec;
  if(!rec.competencias || typeof rec.competencias !== 'object') rec.competencias = {};
  COMPETENCIAS.forEach(c=>{
    const a = rec.competencias[c.key];
    if(!Array.isArray(a)) rec.competencias[c.key] = Array(6).fill(null);
    else while(a.length < 6) a.push(null);
  });
  return rec;
}
// Los registros nuevos y los que llegan de la base pasan siempre por rubricaAsegurar
(function(){
  const _row = rowToRecord; rowToRecord = function(row){ return rubricaAsegurar(_row(row)); };
  const _vacio = emptyRecord; emptyRecord = function(doc){ return rubricaAsegurar(_vacio(doc)); };
})();

rubricaAplicar(RUBRICA_OFICIAL);
async function rubricaCargar(){
  if(typeof sb === 'undefined' || !sb) return;
  try{
    const { data, error } = await sb.rpc('rubrica_get');
    if(error || !Array.isArray(data) || !data.length) return;   // sin SQL de la etapa 13: queda la rúbrica oficial
    rubricaAplicar(data);
  }catch(e){ console.error(e); }
}
rubricaCargar();

/* ---------- Editor del administrador ---------- */
let rubEdit = [];
const RUB_NIVELES = [[5,'Excelente (5)'],[4,'Bueno (4)'],[3,'Aceptable (3)'],[2,'En desarrollo (2)'],[1,'Por desarrollar (1)']];
function rubPantalla(){
  let el = document.getElementById('screen-admin-rubrica');
  if(!el){
    const ref = document.getElementById('screen-admin-hub') || document.querySelector('.screen'); if(!ref) return null;
    el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-rubrica'; ref.parentNode.appendChild(el);
  }
  return el;
}
async function abrirRubricas(){
  if(!requireSupabase()) return;
  const el = rubPantalla(); if(!el) return;
  el.innerHTML = '<p style="color:var(--muted)">Cargando…</p>'; showScreen('screen-admin-rubrica');
  const { data, error } = await sb.rpc('rubrica_get');
  if(error){ el.innerHTML = '<button class="linkbtn" onclick="showScreen(\'screen-admin-hub\')">← Volver al panel</button><p style="color:var(--danger)">No se pudo cargar la rúbrica: '+esc(error.message)+' (¿ejecutaste el SQL de la etapa 13?)</p>'; return; }
  rubEdit = (data && data.length ? data : RUBRICA_OFICIAL).map(c=>Object.assign({}, c));
  rubPintar();
}
function rubLeer(){       // pasa lo escrito en pantalla al arreglo
  rubEdit.forEach((c,i)=>{
    const g = id => { const e = document.getElementById(id+'-'+i); return e ? e.value : ''; };
    c.nombre = g('rbN'); c.descripcion = g('rbD'); [5,4,3,2,1].forEach(n=>{ c['n'+n] = g('rbL'+n); });
  });
}
function rubPintar(){
  const el = rubPantalla(); if(!el) return;
  const cards = rubEdit.map((c,i)=>`<div class="card rub-ed">
      <div class="rub-ed-top"><b>Criterio ${i+1}</b>
        <span class="rub-ed-acc">
          <button class="ghost" ${i===0?'disabled':''} onclick="rubMover(${i},-1)" title="Subir">↑</button>
          <button class="ghost" ${i===rubEdit.length-1?'disabled':''} onclick="rubMover(${i},1)" title="Bajar">↓</button>
          <button class="danger" onclick="rubQuitar(${i})">Eliminar</button>
        </span></div>
      <div class="field-row">
        <div class="field"><label>Nombre del criterio</label><input type="text" id="rbN-${i}" maxlength="200" value="${escapeAttr(c.nombre||'')}"></div>
        <div class="field"><label>Descripción corta (aparece bajo el nombre)</label><input type="text" id="rbD-${i}" maxlength="300" value="${escapeAttr(c.descripcion||'')}"></div>
      </div>
      <div class="rub-ed-niv">${RUB_NIVELES.map(([n,t])=>`<div class="field"><label>${t}</label><textarea id="rbL${n}-${i}" rows="6" maxlength="800">${esc(c['n'+n]||'')}</textarea></div>`).join('')}</div>
    </div>`).join('');
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Rúbrica de calificación</h2>
    <p class="helptext" style="text-align:justify;">Crea, modifica, ordena o elimina los criterios con los que la empresa califica al estudiante. Los cambios se ven en las planillas de empresa y en las notas del estudiante. Las notas ya guardadas de un criterio eliminado no se borran, solo dejan de mostrarse. <b>Nota:</b> el PDF oficial de la planilla tiene espacio para 4 criterios; si agregas más, aparecen en pantalla pero solo los 4 primeros se imprimen en ese PDF.</p>
    <div class="actions-row" style="justify-content:flex-start;margin-bottom:12px;">
      <button class="primary" onclick="rubGuardar()">Guardar rúbrica</button>
      <button class="ghost" onclick="rubAgregar()" ${rubEdit.length>=12?'disabled':''}>+ Agregar criterio</button>
      <button class="ghost" onclick="rubRestaurar()">Restaurar rúbrica oficial</button>
    </div>
    <div id="rubMsg" style="font-size:13px;margin-bottom:8px;"></div>
    ${cards}
    <div class="actions-row" style="justify-content:flex-start;"><button class="primary" onclick="rubGuardar()">Guardar rúbrica</button></div>`;
}
function rubMover(i, d){ rubLeer(); const j = i + d; if(j<0 || j>=rubEdit.length) return; [rubEdit[i], rubEdit[j]] = [rubEdit[j], rubEdit[i]]; rubPintar(); }
function rubQuitar(i){
  if(rubEdit.length <= 1){ toast('La rúbrica debe tener al menos un criterio', true); return; }
  if(!confirm('¿Eliminar este criterio de la rúbrica? Las notas ya guardadas no se borran, pero dejará de mostrarse y calificarse.')) return;
  rubLeer(); rubEdit.splice(i,1); rubPintar();
}
function rubAgregar(){
  rubLeer(); if(rubEdit.length >= 12) return;
  const usados = new Set(rubEdit.map(c=>c.key)); let k;
  do{ k = 'c' + Math.random().toString(36).slice(2,8); }while(usados.has(k));
  rubEdit.push({ key:k, nombre:(rubEdit.length+1)+'. Nuevo criterio', descripcion:'', n5:'', n4:'', n3:'', n2:'', n1:'' });
  rubPintar(); window.scrollTo(0, document.body.scrollHeight);
}
function rubRestaurar(){
  if(!confirm('¿Reemplazar la rúbrica actual por la oficial del formato PPS-GAA-F-006 (versión 9)? Tus cambios no guardados se perderán.')) return;
  rubEdit = RUBRICA_OFICIAL.map(c=>Object.assign({}, c)); rubPintar();
}
async function rubGuardar(){
  rubLeer();
  const msg = document.getElementById('rubMsg');
  for(let i=0;i<rubEdit.length;i++){
    if(!String(rubEdit[i].nombre||'').trim()){ msg.innerHTML = '<span style="color:var(--danger)">El criterio '+(i+1)+' necesita un nombre.</span>'; return; }
    if([5,4,3,2,1].some(n=>!String(rubEdit[i]['n'+n]||'').trim())){ msg.innerHTML = '<span style="color:var(--danger)">Completa los 5 niveles del criterio '+(i+1)+'.</span>'; return; }
  }
  const { error } = await sb.rpc('admin_rubrica_guardar', { p_data: rubEdit });
  if(error){ msg.innerHTML = '<span style="color:var(--danger)">No se pudo guardar: '+esc(error.message)+'</span>'; return; }
  rubricaAplicar(rubEdit); toast('Rúbrica guardada');
  msg.innerHTML = '<span style="color:var(--teal-dark)">Rúbrica guardada. Ya se ve en las planillas.</span>';
}

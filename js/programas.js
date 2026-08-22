/* ============================= PROGRAMAS (catálogo Área → Programa) ============================= */
let programasCache = null; // null = todavía no cargado

async function loadProgramas(force){
  if(programasCache && !force) return programasCache;
  if(!sb) { programasCache = []; return programasCache; }
  try{
    const { data, error } = await sb.from('programas').select('id,area,nombre').order('area').order('nombre');
    if(error){ console.error(error); programasCache = []; return programasCache; }
    programasCache = data || [];
  }catch(e){ console.error(e); programasCache = []; }
  return programasCache;
}

function programasEnArea(area){
  return (programasCache||[]).filter(p=>p.area===area);
}

// Construye los dos <select> (Área / Programa) dependientes, para el formulario
// editable de datos generales. currentPrograma es el texto ya guardado (para
// preseleccionar Área+Programa si coincide con el catálogo).
function renderAreaProgramaSelects(formIdPrefix, currentPrograma){
  const match = (programasCache||[]).find(p=>p.nombre===currentPrograma);
  const currentArea = match ? match.area : '';
  const areaOpts = ['<option value="">Selecciona un área…</option>']
    .concat(AREAS_PROGRAMA.map(a=>`<option value="${escapeAttr(a)}" ${a===currentArea?'selected':''}>${a}</option>`))
    .join('');
  const programaOpts = buildProgramaOptions(currentArea, currentPrograma);
  return `
    <div class="field"><label>Área</label>
      <select id="${formIdPrefix}-area" onchange="onAreaChange('${formIdPrefix}')">${areaOpts}</select>
    </div>
    <div class="field"><label>Programa / Técnico laboral</label>
      <select id="${formIdPrefix}-programa">${programaOpts}</select>
    </div>
  `;
}
function buildProgramaOptions(area, currentPrograma){
  if(!area) return '<option value="">Elige primero un área</option>';
  const opts = programasEnArea(area);
  if(opts.length===0) return '<option value="">No hay programas en esta área todavía</option>';
  return '<option value="">Selecciona un programa…</option>' +
    opts.map(p=>`<option value="${escapeAttr(p.nombre)}" ${p.nombre===currentPrograma?'selected':''}>${p.nombre}</option>`).join('');
}
function onAreaChange(formIdPrefix){
  const area = document.getElementById(formIdPrefix+'-area').value;
  document.getElementById(formIdPrefix+'-programa').innerHTML = buildProgramaOptions(area, '');
}

/* ============================= Módulo Administrador: gestionar catálogo ============================= */
let editingProgramaId = null;

async function renderProgramasModule(){
  await loadProgramas(true);
  renderProgramasAreaForm();
  renderProgramasList();
}
function renderProgramasAreaForm(){
  const el = document.getElementById('progAreaSelect');
  if(!el) return;
  el.innerHTML = AREAS_PROGRAMA.map(a=>`<option value="${escapeAttr(a)}">${a}</option>`).join('');
}
function renderProgramasList(){
  const el = document.getElementById('programasList');
  if(!el) return;
  if(!programasCache || programasCache.length===0){ el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Todavía no hay programas registrados.</p>'; return; }
  const byArea = {};
  programasCache.forEach(p=>{ (byArea[p.area] = byArea[p.area]||[]).push(p); });
  let html = '';
  AREAS_PROGRAMA.forEach(area=>{
    const items = byArea[area];
    if(!items || items.length===0) return;
    const rows = items.map(p=>`<tr>
      <td>${p.nombre}</td>
      <td style="white-space:nowrap;">
        <button class="ghost" style="padding:5px 9px;font-size:12px;" onclick="editPrograma('${p.id}')">Editar</button>
        <button class="danger" style="padding:5px 9px;font-size:12px;" onclick="deletePrograma('${p.id}')">Eliminar</button>
      </td>
    </tr>`).join('');
    html += `<div class="subhead">${area}</div>
      <table class="students-list"><tbody>${rows}</tbody></table>`;
  });
  el.innerHTML = html || '<p style="color:var(--muted);font-size:13px;">Todavía no hay programas registrados.</p>';
}
function editPrograma(id){
  const p = (programasCache||[]).find(x=>x.id===id);
  if(!p) return;
  editingProgramaId = id;
  document.getElementById('progAreaSelect').value = p.area;
  document.getElementById('progNombre').value = p.nombre;
  document.getElementById('progSaveBtn').textContent = 'Guardar cambios';
  document.getElementById('progCancelBtn').style.display = 'inline-block';
  document.getElementById('programasMsg').innerHTML = '<span style="color:var(--muted)">Editando "'+p.nombre+'" — cambia lo que necesites y dale Guardar cambios.</span>';
}
function cancelEditPrograma(){
  editingProgramaId = null;
  document.getElementById('progNombre').value = '';
  document.getElementById('progSaveBtn').textContent = 'Agregar programa';
  document.getElementById('progCancelBtn').style.display = 'none';
  document.getElementById('programasMsg').innerHTML = '';
}
async function savePrograma(){
  if(!requireSupabase()) return;
  const area = val('progAreaSelect');
  const nombre = val('progNombre');
  const msg = document.getElementById('programasMsg');
  if(!area || !nombre){ msg.innerHTML = '<span style="color:var(--danger)">Elige un área y escribe el nombre del programa.</span>'; return; }
  msg.innerHTML = '<span style="color:var(--muted)">Guardando…</span>';
  try{
    let error;
    if(editingProgramaId){
      ({ error } = await sb.from('programas').update({ area, nombre }).eq('id', editingProgramaId));
    } else {
      ({ error } = await sb.from('programas').insert({ area, nombre }));
    }
    if(error){
      if(error.message && error.message.toLowerCase().includes('duplicate')){
        msg.innerHTML = '<span style="color:var(--danger)">Ese programa ya existe en esa área.</span>';
      } else {
        throw new Error(error.message);
      }
      return;
    }
    const wasEditing = !!editingProgramaId;
    cancelEditPrograma();
    msg.innerHTML = wasEditing
      ? '<span style="color:var(--teal-dark)">Programa actualizado.</span>'
      : '<span style="color:var(--teal-dark)">Programa agregado.</span>';
    await renderProgramasModule();
  }catch(e){ console.error(e); msg.innerHTML = '<span style="color:var(--danger)">Error: '+e.message+'</span>'; }
}
async function deletePrograma(id){
  if(!requireSupabase()) return;
  try{
    const { error } = await sb.from('programas').delete().eq('id', id);
    if(error){ throw new Error(error.message); }
    if(editingProgramaId === id) cancelEditPrograma();
    toast('Programa eliminado');
    await renderProgramasModule();
  }catch(e){ console.error(e); toast('No se pudo eliminar: '+e.message, true); }
}

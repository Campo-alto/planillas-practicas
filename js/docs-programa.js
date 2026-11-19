/* ============================= DOCUMENTOS POR PROGRAMA (administrador) =============================
   Lista de chequeo: para cada programa y cada modalidad se marca qué documentos debe subir el estudiante. Lo que no se marca no se le pide.
   Por defecto cada programa pide todos los documentos de su modalidad. Requiere documentos-por-programa-etapa64.sql.
   Seguridad: lo exige la base de datos (permiso «Documentos por modalidad»); el estudiante no puede cambiar su lista. */
let dpgResumen = [], dpgProg = '', dpgDatos = null;
function dpgPantalla(){
  let el = document.getElementById('screen-admin-docprog');
  if(!el){
    const ref = document.getElementById('screen-admin-hub') || document.querySelector('.screen'); if(!ref) return null;
    el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-docprog'; ref.parentNode.appendChild(el);
  }
  return el;
}
const dpgVolver = '<button class="linkbtn" onclick="showScreen(\'screen-admin-hub\')">← Volver al panel</button>';
async function abrirDocsPrograma(){
  if(typeof requireSupabase === 'function' && !requireSupabase()) return;
  const el = dpgPantalla(); if(!el) return;
  el.innerHTML = dpgVolver + '<p style="color:var(--muted)">Cargando…</p>'; showScreen('screen-admin-docprog');
  await dpgCargarResumen();
  dpgPintar();
  if(dpgProg && dpgResumen.some(p=>p.programa === dpgProg)) dpgElegir(dpgProg);
}
async function dpgCargarResumen(){
  const { data, error } = await sb.rpc('admin_programas_docs_resumen');
  const el = dpgPantalla();
  if(error){ el.innerHTML = dpgVolver + '<p style="color:var(--danger)">No se pudo cargar: ' + esc(error.message) + ' (¿ejecutaste documentos-por-programa-etapa64.sql?)</p>'; throw error; }
  dpgResumen = data || [];
}
function dpgPintar(){
  const el = dpgPantalla(); if(!el) return;
  const areas = {}; dpgResumen.forEach(p=>{ (areas[p.area] = areas[p.area] || []).push(p); });
  const opts = '<option value="">Elige un programa…</option>' + Object.keys(areas).map(a=>'<optgroup label="' + esc(a) + '">' + areas[a].map(p=>'<option value="' + esc(p.programa) + '"' + (p.programa === dpgProg ? ' selected' : '') + '>' + esc(p.programa) + (p.excluidos ? '  ● personalizado' : '') + '</option>').join('') + '</optgroup>').join('');
  const pers = dpgResumen.filter(p=>p.excluidos).length;
  el.innerHTML = dpgVolver + '<h2 style="margin:12px 0 4px;">Documentos por programa</h2>' +
    '<p class="helptext" style="text-align:justify;">Elige un programa y <b>marca los documentos que sí debe subir</b> su estudiante en cada modalidad. Lo que dejes sin marcar no se le pedirá. ' +
    'Mientras no cambies nada, cada programa pide <b>todos</b> los documentos de su modalidad. Los archivos que ya subieron los estudiantes no se pierden. ' +
    'Para crear o editar los documentos en sí usa <b>Documentos por modalidad</b>.</p>' +
    '<div class="card"><div class="field" style="max-width:520px;"><label>Programa</label><select id="dpgSel" onchange="dpgElegir(this.value)">' + opts + '</select></div>' +
    '<p class="helptext" style="margin:6px 0 0;">' + pers + ' de ' + dpgResumen.length + ' programas tienen una lista personalizada (● en la lista).</p></div>' +
    '<div id="dpgCuerpo"></div>';
}
async function dpgElegir(prog){
  dpgProg = prog; const c = document.getElementById('dpgCuerpo'); if(!c) return;
  if(!prog){ c.innerHTML = ''; dpgDatos = null; return; }
  c.innerHTML = '<p style="color:var(--muted)">Cargando…</p>';
  const { data, error } = await sb.rpc('admin_programa_docs', { p_programa: prog });
  if(error){ c.innerHTML = '<p style="color:var(--danger)">' + esc(error.message) + '</p>'; return; }
  dpgDatos = data; dpgCuerpo();
}
function dpgCuerpo(){
  const c = document.getElementById('dpgCuerpo'); if(!c || !dpgDatos) return;
  c.innerHTML = (dpgDatos.modalidades || []).map((m, mi)=>{
    const n = (m.requisitos || []).filter(r=>r.aplica).length, t = (m.requisitos || []).length;
    return '<div class="card" id="dpgM' + mi + '"><div class="section-bar deep">' + esc(m.nombre) + (m.solicitable ? '' : ' <small>(oculta para los estudiantes)</small>') + '</div>' +
      (t ? '<p class="helptext" style="margin:0 0 8px;"><b id="dpgCnt' + mi + '">' + n + ' de ' + t + '</b> documentos se piden en este programa.</p>' +
        '<div class="dpg-lista">' + m.requisitos.map(r=>'<label class="dpg-it"><input type="checkbox" data-mi="' + mi + '" value="' + esc(r.id) + '"' + (r.aplica ? ' checked' : '') + ' onchange="dpgContar(' + mi + ')">' +
          '<span class="dpg-t"><b>' + esc(r.nombre) + '</b> <span class="pill" style="background:' + (r.obligatorio ? '#F6E3E0;color:var(--danger)' : '#EEF3E4;color:#3B5B16') + ';">' + (r.obligatorio ? 'Obligatorio' : 'Opcional') + '</span>' +
          (r.descripcion ? '<br><span class="aud-ref">' + esc(r.descripcion) + '</span>' : '') + '</span></label>').join('') + '</div>' +
        '<div class="actions-row" style="margin-top:10px;"><button class="ghost" onclick="dpgTodos(' + mi + ', true)">Marcar todos</button><button class="ghost" onclick="dpgTodos(' + mi + ', false)">Desmarcar todos</button>' +
        '<button class="primary" onclick="dpgGuardar(' + mi + ')">Guardar para este programa</button><button class="ghost" onclick="dpgCopiar(' + mi + ')">Guardar y copiar a otros programas…</button></div><div id="dpgCp' + mi + '"></div>'
        : '<p class="helptext">Esta modalidad no tiene documentos activos. Créalos en <b>Documentos por modalidad</b>.</p>') + '</div>';
  }).join('') || '<p class="helptext">No hay modalidades con documentos.</p>';
}
function dpgMarcados(mi){ return Array.from(document.querySelectorAll('#dpgM' + mi + ' input[data-mi="' + mi + '"]')).filter(x=>x.checked).map(x=>x.value); }
function dpgContar(mi){ const t = document.querySelectorAll('#dpgM' + mi + ' input[data-mi="' + mi + '"]').length; const e = document.getElementById('dpgCnt' + mi); if(e) e.textContent = dpgMarcados(mi).length + ' de ' + t; }
function dpgTodos(mi, v){ document.querySelectorAll('#dpgM' + mi + ' input[data-mi="' + mi + '"]').forEach(x=>x.checked = v); dpgContar(mi); }
async function dpgEnviar(programas, mi){
  const m = dpgDatos.modalidades[mi], ids = dpgMarcados(mi);
  if(!ids.length && !confirm('No marcaste ningún documento: los estudiantes de ' + (programas.length > 1 ? 'estos programas' : 'este programa') + ' podrán enviar «' + m.nombre + '» sin adjuntar nada. ¿Continuar?')) return false;
  const { data, error } = await sb.rpc('admin_programa_docs_guardar', { p_programas: programas, p_modalidad_id: m.id, p_ids: ids });
  if(error){ toast(error.message, true); return false; }
  toast('Guardado: ' + data.piden + ' de ' + data.total + ' documentos se piden' + (data.programas > 1 ? ' en ' + data.programas + ' programas' : '') + '.');
  return true;
}
async function dpgGuardar(mi){
  if(!await dpgEnviar([dpgProg], mi)) return;
  await dpgCargarResumen(); const a = dpgProg; dpgPintar(); dpgElegir(a);
}
function dpgCopiar(mi){
  const box = document.getElementById('dpgCp' + mi); if(!box) return;
  const otros = dpgResumen.filter(p=>p.programa !== dpgProg);
  box.innerHTML = '<div class="note-box" style="margin-top:10px;"><b>Aplicar esta misma selección a otros programas</b> (se guarda también para «' + esc(dpgProg) + '»). Marca los programas:' +
    '<div class="actions-row" style="margin:6px 0;"><button class="ghost" onclick="dpgMarcarProgs(' + mi + ', true)">Todos</button><button class="ghost" onclick="dpgMarcarProgs(' + mi + ', false)">Ninguno</button></div>' +
    '<div class="dpg-progs">' + otros.map(p=>'<label class="dpg-it"><input type="checkbox" data-cp="' + mi + '" value="' + esc(p.programa) + '"><span class="dpg-t">' + esc(p.programa) + ' <span class="aud-ref">' + esc(p.area) + '</span></span></label>').join('') + '</div>' +
    '<div class="actions-row" style="margin-top:8px;"><button class="primary" onclick="dpgCopiarOk(' + mi + ')">Guardar y aplicar a los marcados</button><button class="ghost" onclick="document.getElementById(\'dpgCp' + mi + '\').innerHTML=\'\'">Cancelar</button></div></div>';
}
function dpgMarcarProgs(mi, v){ document.querySelectorAll('input[data-cp="' + mi + '"]').forEach(x=>x.checked = v); }
async function dpgCopiarOk(mi){
  const sel = Array.from(document.querySelectorAll('input[data-cp="' + mi + '"]')).filter(x=>x.checked).map(x=>x.value);
  if(!sel.length){ toast('Marca al menos un programa para copiar.', true); return; }
  if(!confirm('Se cambiarán los documentos de «' + dpgDatos.modalidades[mi].nombre + '» en ' + (sel.length + 1) + ' programas (incluido el actual). ¿Continuar?')) return;
  if(!await dpgEnviar([dpgProg].concat(sel), mi)) return;
  await dpgCargarResumen(); const a = dpgProg; dpgPintar(); dpgElegir(a);
}

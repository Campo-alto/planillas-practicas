/* ============================= MODIFICAR Y ELIMINAR ESTUDIANTES =============================
   En «Buscar o registrar estudiante» (lista de estudiantes registrados) cada fila tiene una casilla, un botón ✏ para modificar y 🗑 para eliminar.
   Con varias casillas marcadas aparece «Eliminar seleccionados». Eliminar borra TODO lo del estudiante (planilla, acceso, asignaciones,
   solicitud y documentos) y no se puede deshacer; por eso se pide confirmar (para varios, escribir ELIMINAR).
   Requiere estudiantes-gestion-etapa26.sql. La base de datos valida el permiso aunque alguien llame la función a mano. */
const egSel = new Set();

function egDocDeFila(tr){ const m = /jumpToAdmin\('([^']+)'\)/.exec(tr.getAttribute('onclick') || ''); return m ? m[1] : null; }
function egNombre(doc){ const s = (adminStudentsCache || []).find(x=>x.documento === doc); return s ? (s.nombre || doc) : doc; }

/* Se agrega a la tabla ya dibujada: casilla + acciones en cada fila y la barra de selección */
function egDecorar(){
  const el = document.getElementById('lookupAdminList'); if(!el) return;
  const tabla = el.querySelector('table.lista-est'); if(!tabla) return;
  const visibles = [];
  tabla.querySelectorAll('tbody tr').forEach(tr=>{
    const doc = egDocDeFila(tr); if(!doc) return; visibles.push(doc);
    const td = document.createElement('td'); td.className = 'eg-acc'; td.onclick = e=>e.stopPropagation();
    td.innerHTML = `<input type="checkbox" class="eg-chk" aria-label="Seleccionar" ${egSel.has(doc) ? 'checked' : ''} onchange="egMarcar('${doc}', this.checked)">
      <button type="button" class="ghost eg-btn" title="Modificar datos" onclick="egEditar('${doc}')">✏</button>
      <button type="button" class="ghost eg-btn eg-del" title="Eliminar estudiante" onclick="egEliminar(['${doc}'])">🗑</button>`;
    tr.insertBefore(td, tr.firstChild);
  });
  const th = document.createElement('th'); th.className = 'eg-acc';
  th.innerHTML = `<input type="checkbox" id="egTodos" title="Marcar todos los que se ven" aria-label="Marcar todos" onchange="egMarcarTodos(this.checked)">`;
  tabla.querySelector('thead tr').insertBefore(th, tabla.querySelector('thead tr').firstChild);
  tabla.dataset.visibles = JSON.stringify(visibles);
  let bar = document.getElementById('egBarra');
  if(!bar){ bar = document.createElement('div'); bar.id = 'egBarra'; bar.className = 'eg-barra'; tabla.parentNode.parentNode.insertBefore(bar, tabla.parentNode); }
  egBarra();
}
function egVisibles(){ const t = document.querySelector('#lookupAdminList table.lista-est'); try{ return JSON.parse(t.dataset.visibles || '[]'); }catch(_){ return []; } }
function egBarra(){
  const bar = document.getElementById('egBarra'); if(!bar) return;
  const n = egSel.size, vis = egVisibles();
  bar.innerHTML = n ? `<b>${n}</b> estudiante(s) seleccionado(s) <button class="danger" onclick="egEliminar([...egSel])">🗑 Eliminar seleccionados</button> <button class="ghost" onclick="egLimpiar()">Quitar selección</button>` :
    '<span style="color:var(--muted);font-size:12.5px;">Marca las casillas para eliminar varios a la vez, o usa ✏ / 🗑 en cada fila.</span>';
  const t = document.getElementById('egTodos'); if(t){ t.checked = vis.length > 0 && vis.every(d=>egSel.has(d)); }
}
function egMarcar(doc, on){ if(on) egSel.add(doc); else egSel.delete(doc); egBarra(); }
function egMarcarTodos(on){ egVisibles().forEach(d=>{ if(on) egSel.add(d); else egSel.delete(d); }); document.querySelectorAll('#lookupAdminList .eg-chk').forEach(c=>{ c.checked = on; }); egBarra(); }
function egLimpiar(){ egSel.clear(); document.querySelectorAll('#lookupAdminList .eg-chk').forEach(c=>{ c.checked = false; }); egBarra(); }

/* ---------- Eliminar ---------- */
async function egEliminar(docs){
  docs = (docs || []).slice(); if(!docs.length) return;
  if(docs.length === 1){
    if(!confirm('¿Eliminar a ' + egNombre(docs[0]) + ' (documento ' + docs[0] + ')?\n\nSe borra TODO lo suyo: planilla, acceso, empresa asignada, solicitud y documentos.\nEsto NO se puede deshacer.')) return;
  } else {
    const t = prompt('Vas a eliminar ' + docs.length + ' estudiantes con todo lo suyo (planillas, accesos, asignaciones, solicitudes).\nEsto NO se puede deshacer.\n\nPara confirmar escribe ELIMINAR:', '');
    if(t === null) return;
    if(t.trim().toUpperCase() !== 'ELIMINAR'){ toast('No se eliminó nada: no escribiste ELIMINAR', true); return; }
  }
  let borrados = 0;
  for(let i = 0; i < docs.length; i += 200){
    const { data, error } = await sb.rpc('admin_estudiantes_eliminar', { p_documentos: docs.slice(i, i + 200) });
    if(error){ toast((borrados ? borrados + ' eliminado(s). ' : '') + error.message + ' (¿ejecutaste estudiantes-gestion-etapa26.sql?)', true); break; }
    borrados += (data && data.eliminados) || 0;
  }
  docs.forEach(d=>egSel.delete(d));
  if(borrados) toast(borrados === 1 ? 'Estudiante eliminado' : borrados + ' estudiantes eliminados');
  renderAdminList();
}

/* ---------- Modificar ---------- */
const EG_CAMPOS = [['apellidos','Apellidos *'], ['nombres','Nombres *'], ['correo','Correo'], ['telefono','Teléfono'], ['programa','Programa'],
                   ['sede','Sede'], ['semestre','Semestre'], ['periodo_academico','Periodo académico'], ['jornada_solicitada','Jornada']];
async function egEditar(doc){
  const { data, error } = await sb.from('students').select('documento,nombre,apellidos,nombres,correo,telefono,programa,sede,semestre,periodo_academico,jornada_solicitada,modalidad').eq('documento', doc).maybeSingle();
  if(error || !data){ toast(error ? error.message : 'No se encontró al estudiante', true); return; }
  let mods = [], progs = [];
  try{ const r = await sb.from('modalidades').select('nombre').order('nombre'); mods = (r.data || []).map(x=>x.nombre); }catch(_){}
  try{ const r = await sb.from('programas').select('nombre').order('nombre'); progs = (r.data || []).map(x=>x.nombre); }catch(_){}
  if(data.modalidad && !mods.includes(data.modalidad)) mods.unshift(data.modalidad);
  const prev = document.getElementById('egModal'); if(prev) prev.remove();
  const m = document.createElement('div'); m.id = 'egModal'; m.className = 'cor-modal';
  const campo = ([k, et])=> k === 'programa'
    ? `<div class="field"><label>${et}</label><input id="eg-${k}" list="eg-progs" maxlength="200" value="${esc(data[k] || '')}"><datalist id="eg-progs">${progs.map(p=>`<option value="${esc(p)}">`).join('')}</datalist></div>`
    : `<div class="field"><label>${et}</label><input id="eg-${k}" maxlength="${k === 'correo' ? 120 : 80}" value="${esc(data[k] || '')}"></div>`;
  m.innerHTML = `<div class="cor-caja" role="dialog" aria-modal="true" style="max-width:640px;">
    <h3 style="margin:0 0 4px;">Modificar estudiante</h3>
    <p class="helptext" style="margin:0 0 10px;">Documento <b>${esc(doc)}</b> (el documento no se puede cambiar). La planilla y las notas no se tocan.</p>
    <div class="field-row">${EG_CAMPOS.map(campo).join('')}
      <div class="field"><label>Modalidad</label><select id="eg-modalidad"><option value="">Sin modalidad</option>${mods.map(x=>`<option value="${esc(x)}"${x === data.modalidad ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></div></div>
    <div id="egMsg" style="margin-top:8px;font-size:13px;"></div>
    <div class="actions-row" style="justify-content:flex-end;margin-top:12px;"><button class="ghost" onclick="document.getElementById('egModal').remove()">Cancelar</button>
      <button class="primary" id="egGuardar" onclick="egGuardar('${esc(doc)}')">Guardar cambios</button></div></div>`;
  document.body.appendChild(m);
}
async function egGuardar(doc){
  const v = id => document.getElementById('eg-' + id).value.trim();
  const datos = {}; EG_CAMPOS.forEach(([k])=>{ datos[k] = v(k); }); datos.modalidad = v('modalidad');
  const msg = document.getElementById('egMsg');
  if(!datos.apellidos || !datos.nombres){ msg.innerHTML = '<span style="color:var(--danger)">Escribe los apellidos y los nombres.</span>'; return; }
  const btn = document.getElementById('egGuardar'); btn.disabled = true;
  const { error } = await sb.rpc('admin_estudiante_editar', { p_documento: doc, p_datos: datos });
  btn.disabled = false;
  if(error){ msg.innerHTML = '<span style="color:var(--danger)">' + esc(error.message) + '</span>'; return; }
  document.getElementById('egModal').remove(); toast('Datos actualizados'); renderAdminList();
}

(function(){
  if(typeof renderAdminListTable !== 'function') return;
  const _r = renderAdminListTable;
  renderAdminListTable = function(){
    const r = _r.apply(this, arguments);
    try{ egDecorar(); }catch(e){ console.error(e); }
    return r;
  };
})();

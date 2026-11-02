/* ============================= ASIGNACIÓN DE PRÁCTICAS (empresas, cupos) ============================= */
function esc(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function errMsg(e){ return (e && e.message) ? e.message.replace(/^.*?(Este|Ya|No |La |Cupo|Estudiante|Esta)/,'$1') : 'Error'; }

/* ---------- ADMINISTRADOR: empresas y cupos ---------- */
let empresasCache = [];
let editingEmpresaId = null;
let asignacionesCache = [];
let accesosCache = [];   // usuarios de acceso con rol empresa

function showEmpresasTab(tab){
  ['datos','asig','acceso'].forEach(t=>{
    document.getElementById('empPane-'+t).style.display = t===tab ? '' : 'none';
    document.getElementById('empTab-'+t).classList.toggle('active', t===tab);
  });
  if(tab==='acceso') renderAccesosEmpresa();
}

const CATEGORIAS_EMPRESA = [
  { id:'practica_no_remunerada', nombre:'Prácticas no remuneradas', corto:'Prácticas no remuneradas' },
  { id:'contrato_aprendizaje', nombre:'Contrato de aprendizaje', corto:'Contrato de aprendizaje' },
  { id:'reconocimiento_aprendizajes_previos', nombre:'Reconocimiento de aprendizajes previos', corto:'Aprendizajes previos' },
  { id:'reconocimiento_lugar_practica', nombre:'Reconocimiento de lugar de prácticas', corto:'Lugar de prácticas' }
];
let filtroCategoriaEmpresa = 'todas';
function nombreCategoria(id){ const c = CATEGORIAS_EMPRESA.find(x=>x.id===id); return c ? c.nombre : id; }
function esModalidadPNR(m){
  const x = MODALIDADES.find(y=>y.nombre===m);
  return x ? !!x.es_pnr : /no remunerada/i.test(m||'');
}
// Agrega el selector de categoría al formulario si el HTML no lo trae
function asegurarCampoCategoria(){
  if(document.getElementById('empCategoria')) return;
  const nom = document.getElementById('empNombre'); if(!nom) return;
  const f = document.createElement('div'); f.className = 'field';
  f.innerHTML = '<label>Categoría de la empresa</label><select id="empCategoria">'+
    CATEGORIAS_EMPRESA.map(c=>'<option value="'+c.id+'">'+c.nombre+'</option>').join('')+'</select>';
  nom.closest('.field').insertAdjacentElement('afterend', f);
}
function asegurarCampoRequisitos(){
  if(document.getElementById('empRequisitos')) return;
  const c = document.getElementById('empContacto'); if(!c) return;
  const row = c.closest('.field-row');
  const f = document.createElement('div'); f.className = 'field'; f.style.gridColumn = '1 / -1';
  f.innerHTML = '<label>Requisitos de la empresa (aparecen en la carta de presentación del estudiante)</label>'+
    '<textarea id="empRequisitos" rows="3" maxlength="1500" placeholder="Ej. Uniforme blanco, hoja de vida formato Campoalto, fotocopia del documento, certificado de la EPS…"></textarea>';
  row.appendChild(f);
}
function setFiltroCategoria(id){ filtroCategoriaEmpresa = id; renderEmpresasListHtml(); }

async function renderEmpresasCupos(){
  asegurarCampoCategoria(); asegurarCampoRequisitos();
  if(!requireSupabase()) return;
  await loadProgramas();
  const el = document.getElementById('empresasList');
  el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Cargando…</p>';
  try{
    const { data, error } = await sb.from('empresas_practica')
      .select('*, cupos_empresa(id,programa,jornada,cupos_total,cupos_ocupados,fecha_inicio,fecha_fin,horario,dias)')
      .order('nombre', { ascending: true });
    if(error) throw error;
    empresasCache = data || [];
    try{
      const r = await sb.rpc('admin_list_role_accounts');
      accesosCache = (r.data || []).filter(u=>u.role==='empresa');
    }catch(_){ accesosCache = []; }
    renderEmpresasListHtml();
  }catch(e){ console.error(e); el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No se pudo cargar: '+esc(e.message)+'</p>'; }
  renderAsignacionesAdmin();
}
function renderEmpresasListHtml(){
  const el = document.getElementById('empresasList');
  if(empresasCache.length===0){ el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Todavía no hay empresas registradas.</p>'; return; }
  const cuentaCat = id => empresasCache.filter(e=>(e.categoria||'practica_no_remunerada')===id).length;
  const filtros = '<div class="tabs" style="margin-bottom:12px;">'+
    '<button class="tab '+(filtroCategoriaEmpresa==='todas'?'active':'')+'" onclick="setFiltroCategoria(\'todas\')">Todas ('+empresasCache.length+')</button>'+
    CATEGORIAS_EMPRESA.map(c=>'<button class="tab '+(filtroCategoriaEmpresa===c.id?'active':'')+'" onclick="setFiltroCategoria(\''+c.id+'\')">'+c.corto+' ('+cuentaCat(c.id)+')</button>').join('')+'</div>';
  const visibles = filtroCategoriaEmpresa==='todas' ? empresasCache : empresasCache.filter(e=>(e.categoria||'practica_no_remunerada')===filtroCategoriaEmpresa);
  if(visibles.length===0){ el.innerHTML = filtros + '<p style="color:var(--muted);font-size:13px;">No hay empresas en esta categoría.</p>'; return; }
  const progOpts = (programasCache||[]).map(p=>`<option value="${esc(p.nombre)}">${esc(p.nombre)}</option>`).join('');
  const jorOpts = JORNADAS.map(j=>`<option value="${j}">${j}</option>`).join('');
  el.innerHTML = filtros + visibles.map(emp=>{
    const esPNR = (emp.categoria||'practica_no_remunerada')==='practica_no_remunerada';
    const cupos = (emp.cupos_empresa||[]).slice().sort((a,b)=> a.programa.localeCompare(b.programa) || a.jornada.localeCompare(b.jornada));
    const rows = cupos.map(c=>{
      const disp = c.cupos_total - c.cupos_ocupados;
      return `<tr>
        <td>${esc(c.programa)}</td><td>${esc(c.jornada)}</td>
        <td><input type="number" min="${c.cupos_ocupados}" max="500" value="${c.cupos_total}" style="width:70px;" onchange="actualizarCupoTotal('${c.id}', this.value)"></td>
        <td>${c.cupos_ocupados}</td>
        <td><b style="color:${disp>0?'var(--teal-dark)':'var(--danger)'};">${disp}</b></td>
        <td><input type="date" value="${esc(c.fecha_inicio||'')}" onchange="actualizarCupoCampo('${c.id}','fecha_inicio',this.value)"></td>
        <td><input type="date" value="${esc(c.fecha_fin||'')}" onchange="actualizarCupoCampo('${c.id}','fecha_fin',this.value)"></td>
        <td><input type="text" maxlength="60" value="${esc(c.horario||'')}" placeholder="08:00 A 17:00" style="width:110px;" onchange="actualizarCupoCampo('${c.id}','horario',this.value)"></td>
        <td><input type="text" maxlength="80" value="${esc(c.dias||'')}" placeholder="MIERCOLES" style="width:110px;" onchange="actualizarCupoCampo('${c.id}','dias',this.value)"></td>
        <td><button class="danger" style="padding:4px 8px;font-size:12px;" onclick="eliminarCupo('${c.id}')">Quitar</button></td>
      </tr>`;
    }).join('');
    const tabla = cupos.length ? `<table class="students-list"><thead><tr><th>Programa</th><th>Jornada</th><th>Cupos</th><th>Ocupados</th><th>Disponibles</th><th>Inicio</th><th>Fin</th><th>Horario</th><th>Días</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
      : '<p style="color:var(--muted);font-size:13px;">Esta empresa todavía no tiene cupos.</p>';
    return `<div class="card" style="${emp.activa?'':'opacity:.65;'}">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start;">
        <div>
          <b style="font-size:15px;">${esc(emp.nombre)}</b> <span class="pill" style="background:#E6F1F0;color:var(--deep);">${esc(nombreCategoria(emp.categoria||'practica_no_remunerada'))}</span> ${emp.activa?'':'<span class="pill" style="background:#F6E3E0;color:var(--danger);">Inactiva</span>'}<br>
          <span style="color:var(--muted);font-size:12.5px;">${esc(emp.direccion||'—')}${emp.ciudad?' · '+esc(emp.ciudad):''} · Tel. ${esc(emp.telefono||'—')}${emp.nit?' · NIT '+esc(emp.nit):''}</span>
        </div>
        <div style="white-space:nowrap;">
          <button class="ghost" style="padding:5px 9px;font-size:12px;" onclick="gestionarAcceso('${emp.id}')">${tieneAcceso(emp)?'🔑 Acceso creado':'🔑 Crear acceso'}</button>
          <button class="ghost" style="padding:5px 9px;font-size:12px;" onclick="editarEmpresa('${emp.id}')">Editar</button>
          <button class="ghost" style="padding:5px 9px;font-size:12px;" onclick="toggleEmpresaActiva('${emp.id}', ${!emp.activa})">${emp.activa?'Desactivar':'Activar'}</button>
          <button class="danger" style="padding:5px 9px;font-size:12px;" onclick="eliminarEmpresa('${emp.id}')">Eliminar</button>
        </div>
      </div>
      ${esPNR ? `<div style="margin-top:12px;">${tabla}</div>
      <div class="field-row" style="margin-top:10px;align-items:end;">
        <div class="field"><label>Programa</label><select id="cupoProg-${emp.id}">${progOpts}</select></div>
        <div class="field"><label>Jornada</label><select id="cupoJor-${emp.id}">${jorOpts}</select></div>
        <div class="field"><label>Cupos</label><input type="number" min="0" max="500" id="cupoNum-${emp.id}" value="1"></div>
        <div class="field"><label>Fecha inicio</label><input type="date" id="cupoIni-${emp.id}"></div>
        <div class="field"><label>Fecha finalización</label><input type="date" id="cupoFin-${emp.id}"></div>
        <div class="field"><label>Horario</label><input type="text" maxlength="60" id="cupoHor-${emp.id}" placeholder="08:00 A 17:00"></div>
        <div class="field"><label>Días (jornada en la carta)</label><input type="text" maxlength="80" id="cupoDia-${emp.id}" placeholder="MIERCOLES"></div>
        <div class="field"><button class="primary" onclick="agregarCupo('${emp.id}')">Agregar cupos</button></div>
      </div>` : `<p style="margin:12px 0 0;color:var(--muted);font-size:13px;">Esta categoría no maneja cupos ni fechas de inscripción: solo aplican a prácticas no remuneradas.</p>`}
    </div>`;
  }).join('');
}
function limpiarFormEmpresa(){
  editingEmpresaId = null;
  ['empNombre','empNit','empDireccion','empCiudad','empTelefono','empCorreo','empContacto'].forEach(id=>document.getElementById(id).value='');
  const cs = document.getElementById('empCategoria'); if(cs) cs.value = 'practica_no_remunerada';
  const rq = document.getElementById('empRequisitos'); if(rq) rq.value = '';
  document.getElementById('empSaveBtn').textContent = 'Guardar empresa';
  document.getElementById('empCancelBtn').style.display = 'none';
  document.getElementById('empresaMsg').innerHTML = '';
}
function editarEmpresa(id){
  const e = empresasCache.find(x=>x.id===id); if(!e) return;
  editingEmpresaId = id;
  document.getElementById('empNombre').value = e.nombre||'';
  document.getElementById('empNit').value = e.nit||'';
  document.getElementById('empDireccion').value = e.direccion||'';
  document.getElementById('empCiudad').value = e.ciudad||'';
  document.getElementById('empTelefono').value = e.telefono||'';
  document.getElementById('empCorreo').value = e.correo||'';
  document.getElementById('empContacto').value = e.contacto||'';
  asegurarCampoCategoria(); asegurarCampoRequisitos(); document.getElementById('empCategoria').value = e.categoria || 'practica_no_remunerada';
  document.getElementById('empRequisitos').value = e.requisitos || '';
  document.getElementById('empSaveBtn').textContent = 'Actualizar empresa';
  document.getElementById('empCancelBtn').style.display = '';
  document.getElementById('empresaMsg').innerHTML = '<span style="color:var(--muted)">Editando '+esc(e.nombre)+'.</span>';
  window.scrollTo(0,0);
}
async function guardarEmpresa(){
  if(!requireSupabase()) return;
  const msg = document.getElementById('empresaMsg');
  const row = {
    nombre: val('empNombre'), nit: val('empNit'), direccion: val('empDireccion'), ciudad: val('empCiudad'),
    telefono: val('empTelefono'), correo: val('empCorreo'), contacto: val('empContacto'),
    categoria: (document.getElementById('empCategoria')||{}).value || 'practica_no_remunerada',
    requisitos: ((document.getElementById('empRequisitos')||{}).value || '').trim().slice(0,1500)
  };
  if(row.nombre.length < 2){ msg.innerHTML = '<span style="color:var(--danger)">Escribe el nombre de la empresa.</span>'; return; }
  try{
    let error;
    if(editingEmpresaId) ({ error } = await sb.from('empresas_practica').update(row).eq('id', editingEmpresaId));
    else ({ error } = await sb.from('empresas_practica').insert(row));
    if(error) throw error;
    const era = editingEmpresaId;
    limpiarFormEmpresa();
    document.getElementById('empresaMsg').innerHTML = '<span style="color:var(--teal-dark)">'+(era?'Empresa actualizada.':'Empresa guardada. Ahora agrégale sus cupos.')+'</span>';
    renderEmpresasCupos();
  }catch(e){ console.error(e); msg.innerHTML = '<span style="color:var(--danger)">Error: '+esc(e.message)+'</span>'; }
}
async function toggleEmpresaActiva(id, activa){
  const { error } = await sb.from('empresas_practica').update({ activa }).eq('id', id);
  if(error){ toast('No se pudo cambiar: '+error.message, true); return; }
  renderEmpresasCupos();
}
async function eliminarEmpresa(id){
  if(!confirm('¿Eliminar esta empresa y todos sus cupos? Si tiene estudiantes asignados o con historial, no se podrá eliminar (desactívala en su lugar).')) return;
  const { error } = await sb.from('empresas_practica').delete().eq('id', id);
  if(error){ toast('No se pudo eliminar (¿tiene asignaciones?). Desactívala en su lugar.', true); return; }
  toast('Empresa eliminada'); renderEmpresasCupos();
}
async function agregarCupo(empresaId){
  const programa = document.getElementById('cupoProg-'+empresaId).value;
  const jornada = document.getElementById('cupoJor-'+empresaId).value;
  const cupos_total = parseInt(document.getElementById('cupoNum-'+empresaId).value, 10);
  if(!programa){ toast('Primero crea programas en el módulo Programas', true); return; }
  if(isNaN(cupos_total) || cupos_total < 0 || cupos_total > 500){ toast('Cupos debe estar entre 0 y 500', true); return; }
  const ini = document.getElementById('cupoIni-'+empresaId).value || null, fin = document.getElementById('cupoFin-'+empresaId).value || null;
  if(ini && fin && fin < ini){ toast('La fecha de finalización no puede ser anterior a la de inicio', true); return; }
  const { error } = await sb.from('cupos_empresa').insert({ empresa_id: empresaId, programa, jornada, cupos_total, fecha_inicio: ini, fecha_fin: fin,
    horario: document.getElementById('cupoHor-'+empresaId).value.trim(), dias: document.getElementById('cupoDia-'+empresaId).value.trim() });
  if(error){ toast(error.code==='23505' ? 'Ya existe ese programa y jornada para esta empresa: edita el número de cupos.' : 'Error: '+error.message, true); return; }
  toast('Cupos agregados'); renderEmpresasCupos();
}
async function actualizarCupoCampo(id, campo, valor){
  const v = (campo==='fecha_inicio' || campo==='fecha_fin') ? (valor || null) : String(valor||'').trim();
  const { error } = await sb.from('cupos_empresa').update({ [campo]: v }).eq('id', id);
  if(error){ toast(error.message.includes('cupos_fechas_ok') ? 'La fecha de finalización no puede ser anterior a la de inicio' : 'No se pudo guardar: '+error.message, true); renderEmpresasCupos(); return; }
  toast('Guardado');
}
async function actualizarCupoTotal(id, value){
  const n = parseInt(value, 10);
  if(isNaN(n) || n < 0 || n > 500){ toast('Cupos debe estar entre 0 y 500', true); renderEmpresasCupos(); return; }
  const { error } = await sb.from('cupos_empresa').update({ cupos_total: n }).eq('id', id);
  if(error){ toast('No puedes dejar menos cupos que los ya ocupados.', true); }
  else toast('Cupos actualizados');
  renderEmpresasCupos();
}
async function eliminarCupo(id){
  if(!confirm('¿Quitar este cupo? Solo se puede si nunca ha sido asignado.')) return;
  const { error } = await sb.from('cupos_empresa').delete().eq('id', id);
  if(error){ toast('No se puede quitar: ya tiene asignaciones. Déjalo en 0 cupos.', true); return; }
  toast('Cupo quitado'); renderEmpresasCupos();
}

async function renderAsignacionesAdmin(){
  const el = document.getElementById('asignacionesList');
  renderVentanaAdmin();
  try{
    const { data, error } = await sb.rpc('admin_list_asignaciones');
    if(error) throw error;
    asignacionesCache = data || [];
    if(asignacionesCache.length===0){ el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Todavía no hay asignaciones.</p>'; return; }
    const rows = asignacionesCache.map(a=>`<tr>
      <td>${esc(a.estudiante)}<br><span style="color:var(--muted);font-size:11.5px;">${esc(a.documento)}</span></td>
      <td>${esc(a.programa)}</td><td>${esc(a.empresa)}</td><td>${esc(a.jornada)}</td>
      <td>${new Date(a.created_at).toLocaleDateString()}</td>
      <td>${a.estado==='activa'?'<b style="color:var(--teal-dark)">Activa</b>':'Liberada'}</td>
      <td>${a.estado==='activa'?`<button class="ghost" style="padding:4px 8px;font-size:12px;" onclick="liberarAsignacion('${a.id}')">Liberar cupo</button>`:''}</td>
    </tr>`).join('');
    el.innerHTML = `<table class="students-list"><thead><tr><th>Estudiante</th><th>Programa</th><th>Empresa</th><th>Jornada</th><th>Fecha</th><th>Estado</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  }catch(e){ console.error(e); el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No se pudo cargar: '+esc(e.message)+'</p>'; }
}
async function liberarAsignacion(id){
  const motivo = prompt('Motivo del retiro del estudiante de esta empresa (obligatorio):');
  if(motivo === null) return;
  if(motivo.trim().length < 3){ toast('Escribe el motivo del retiro', true); return; }
  const a = asignacionesCache.find(x=>x.id===id);
  let meses = null;
  if(a){ const rec = await getRecord(a.documento); if(rec) meses = mesesRestantesPractica(rec); }
  if(!confirm('¿Inactivar al estudiante de esta empresa?'+(meses!==null?' Podrá elegir una nueva por '+meses+' mes'+(meses===1?'':'es')+'.':'')+' El cupo volverá a estar disponible.')) return;
  const { error } = await sb.rpc('admin_liberar_asignacion', { p_id: id, p_motivo: motivo.trim(), p_meses: meses });
  if(error){ toast(errMsg(error), true); return; }
  toast('Estudiante inactivado de la empresa'); renderEmpresasCupos();
}
// Meses que se le asignan al estudiante que se retira: meses de la práctica menos los meses ya calificados
// (4 meses: 1 nota → 3 meses, 2 notas → 2 meses, 3 notas → 1 mes). Se cuenta por meses, no por días.
function notasCalificadas(rec){
  const total = mesesPorModalidad(rec.modalidad);
  let n = 0; for(let i=0;i<total;i++){ if(mesCalificado(rec,i)) n++; }
  return n;
}
function mesesRestantesPractica(rec){
  return Math.max(0, mesesPorModalidad(rec.modalidad) - notasCalificadas(rec));
}
function textoMeses(n){ return n+' mes'+(n===1?'':'es'); }
// ISO ↔ campo datetime-local
function isoALocalInput(iso){
  if(!iso) return '';
  const d = new Date(iso); if(isNaN(d)) return '';
  const p = n => String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());
}
async function renderVentanaAdmin(){
  const pane = document.getElementById('empPane-asig');
  if(!pane) return;
  let box = document.getElementById('ventanaAsignacion');
  if(!box){
    box = document.createElement('div'); box.className = 'card'; box.id = 'ventanaAsignacion';
    pane.insertAdjacentElement('afterbegin', box);
  }
  const { data, error } = await sb.rpc('admin_get_ventana');
  if(error){ box.innerHTML = '<div class="section-bar deep">Fechas de apertura y cierre</div><p style="color:var(--danger);font-size:13px;">'+esc(errMsg(error))+' (¿ejecutaste el SQL de ventana?)</p>'; return; }
  const estado = data.abierta ? '<b style="color:var(--teal-dark)">🟢 Abierta ahora</b>'
    : (!data.abre || !data.cierra ? '<b style="color:var(--danger)">🔴 Cerrada (sin fechas configuradas)</b>' : '<b style="color:var(--danger)">🔴 Cerrada ahora</b>');
  box.innerHTML = '<div class="section-bar deep">Fechas de apertura y cierre (solo prácticas no remuneradas) para que los estudiantes elijan su sitio de práctica</div>'+
    '<p style="margin:0 0 10px;font-size:14px;">'+estado+'. Fuera de estas fechas los estudiantes no pueden tomar cupos (tú sí puedes asignarlos desde la ficha).</p>'+
    '<div class="field-row">'+
      '<div class="field"><label>Apertura</label><input type="datetime-local" id="ventAbre" value="'+isoALocalInput(data.abre)+'"></div>'+
      '<div class="field"><label>Cierre</label><input type="datetime-local" id="ventCierra" value="'+isoALocalInput(data.cierra)+'"></div>'+
    '</div>'+
    '<div class="actions-row" style="justify-content:flex-start;"><button class="primary" onclick="guardarVentana()">Guardar fechas</button></div>';
}
async function guardarVentana(){
  const a = document.getElementById('ventAbre').value, c = document.getElementById('ventCierra').value;
  if(!a || !c){ toast('Indica la fecha de apertura y la de cierre', true); return; }
  const { error } = await sb.rpc('admin_set_ventana', { p_abre: new Date(a).toISOString(), p_cierra: new Date(c).toISOString() });
  if(error){ toast(errMsg(error), true); return; }
  toast('Fechas guardadas'); renderVentanaAdmin();
}
function descargarAsignacionesXLSX(){
  if(asignacionesCache.length===0){ toast('No hay asignaciones para descargar', true); return; }
  const rows = [['Documento','Estudiante','Programa','Empresa','Jornada','Fecha','Estado']]
    .concat(asignacionesCache.map(a=>[a.documento,a.estudiante,a.programa,a.empresa,a.jornada,new Date(a.created_at).toLocaleDateString(),a.estado]));
  const ws = XLSX.utils.aoa_to_sheet(rows); const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asignaciones');
  XLSX.writeFile(wb, 'asignaciones-practicas.xlsx');
}

/* ---------- ESTUDIANTE: ver y tomar cupo ---------- */
async function renderAsignacionEstudiante(){
  const el = document.getElementById('estAsignacion');
  if(!el) return;
  if(!state.token){ el.innerHTML = ''; return; }
  el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Cargando…</p>';
  try{
    const { data, error } = await sb.rpc('mis_cupos', { p_token: state.token });
    if(error) throw error;
    if(data.aplica === false){
      el.innerHTML = '<div class="note-box">La elección de sitio de práctica por cupos aplica solo a estudiantes de <b>Prácticas No Remuneradas</b>. Tu modalidad ('+esc(data.modalidad||'sin definir')+') no usa este proceso.</div>';
      return;
    }
    const a = data.asignacion;
    window.asigEstudiante = a || null;
    if(a){
      el.innerHTML = `<div class="note-box" style="background:#EAF6F0;border-color:#BFE3D0;color:#1E6B4A;">✅ Ya tienes tu práctica asignada.</div>
        <div class="field-row" style="margin-top:12px;">
          <div class="field"><label>Empresa</label><div><b>${esc(a.empresa)}</b></div></div>
          <div class="field"><label>Jornada</label><div>${esc(a.jornada)}</div></div>
          <div class="field"><label>Dirección</label><div>${esc(a.direccion||'—')}${a.ciudad?' · '+esc(a.ciudad):''}</div></div>
          <div class="field"><label>Teléfono</label><div>${esc(a.telefono||'—')}</div></div>
          ${a.contacto?`<div class="field"><label>Contacto</label><div>${esc(a.contacto)}</div></div>`:''}
          <div class="field"><label>Fechas de la práctica</label><div>${a.fecha_inicio?esc(cartaFechaCorta(a.fecha_inicio)):'—'} a ${a.fecha_fin?esc(cartaFechaCorta(a.fecha_fin)):'—'}</div></div>
          <div class="field"><label>Horario</label><div>${esc(a.horario||'—')}${a.dias?' · '+esc(a.dias):''}</div></div>
        </div>
        <div class="field" style="margin-top:8px;"><label>Requisitos de la empresa</label><div style="white-space:pre-wrap;">${esc(a.requisitos||'La empresa no tiene requisitos registrados.')}</div></div>
        <div class="actions-row" style="justify-content:flex-start;margin-top:12px;">
          <button class="primary" onclick="descargarCartaEstudiante()">📄 Descargar carta de presentación (PDF)</button>
        </div>
        <p class="helptext" style="margin-top:6px;">Entrega esta carta en la empresa como soporte de ingreso.</p>`;
      return;
    }
    if(!data.jornada){
      el.innerHTML = '<div class="note-box">Aún no tienes una jornada registrada. Pídele a la administración que registre en qué jornada solicitas tu cupo y vuelve a entrar.</div>';
      return;
    }
    const lista = data.cupos || [];
    const hist = data.historial || [];
    let aviso = '';
    if(hist.length){
      const u = hist[hist.length-1];
      const m = (u.meses!==null && u.meses!==undefined) ? u.meses : (state.record ? mesesRestantesPractica(state.record) : null);
      aviso = `<div class="note-box" style="margin-bottom:12px;">Fuiste retirado(a) de <b>${esc(u.empresa)}</b>${u.hasta?' el '+new Date(u.hasta).toLocaleDateString():''}${u.motivo?' (motivo: '+esc(u.motivo)+')':''}. Puedes elegir una nueva empresa${m!==null?' por <b>'+textoMeses(m)+'</b>, que es el tiempo que te falta de práctica':' por el tiempo que te falta'}.</div>`;
    }
    const v = data.ventana || {};
    if(!v.abierta){
      const fmt = d => new Date(d).toLocaleString([], {dateStyle:'medium', timeStyle:'short'});
      const fechas = (v.abre && v.cierra) ? ' Fechas habilitadas: del <b>'+fmt(v.abre)+'</b> al <b>'+fmt(v.cierra)+'</b>.' : ' Aún no se han definido las fechas.';
      el.innerHTML = aviso + '<div class="note-box">🔒 La ubicación en sitios de práctica no está habilitada en este momento.'+fechas+'</div>';
      return;
    }
    const cab = aviso + `<p class="helptext" style="margin-top:-4px;">Programa: <b>${esc(data.programa)}</b> · Jornada: <b>${esc(data.jornada)}</b>. Elige con cuidado: una vez tomes un cupo, solo la administración puede cambiarlo (si quieres cambiar de lugar, avísale a la administración).</p>`;
    if(lista.length===0){ el.innerHTML = cab + '<div class="note-box">Por ahora no hay cupos disponibles para tu programa y jornada. Vuelve a revisar más tarde.</div>'; return; }
    const rows = lista.map(c=>`<tr>
      <td><b>${esc(c.empresa)}</b>${c.requisitos?'<details style="margin-top:4px;font-size:12px;"><summary style="cursor:pointer;color:var(--muted);">Ver requisitos</summary>'+esc(c.requisitos)+'</details>':''}</td>
      <td>${esc(c.direccion||'—')}${c.ciudad?'<br><span style="color:var(--muted);font-size:11.5px;">'+esc(c.ciudad)+'</span>':''}</td>
      <td>${esc(c.telefono||'—')}</td>
      <td><b style="color:var(--teal-dark);">${c.disponibles}</b> de ${c.total}</td>
      <td><button class="primary" style="padding:6px 12px;font-size:12.5px;" onclick="tomarCupo('${c.id}', this)">Tomar cupo</button></td>
    </tr>`).join('');
    el.innerHTML = cab + `<table class="students-list"><thead><tr><th>Empresa</th><th>Dirección</th><th>Teléfono</th><th>Cupos disponibles</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  }catch(e){ console.error(e); el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No se pudo cargar: '+esc(errMsg(e))+'</p>'; }
}
async function tomarCupo(cupoId, btn){
  if(!confirm('¿Confirmas que quieres este cupo? Después no podrás cambiarlo por tu cuenta.')) return;
  if(btn) btn.disabled = true;
  const { data, error } = await sb.rpc('tomar_cupo', { p_token: state.token, p_cupo_id: cupoId });
  if(error){ toast(errMsg(error), true); renderAsignacionEstudiante(); return; }
  toast('Cupo asignado: '+data.empresa);
  renderAsignacionEstudiante();
}

/* ---------- Acceso (usuario) de la empresa, dentro del mismo módulo ---------- */
function tieneAcceso(emp){
  const c = (emp.correo||'').trim().toLowerCase();
  return !!c && accesosCache.some(u=>(u.email||'').toLowerCase()===c);
}
function opcionesEmpresasSelect(selectedId){
  return '<option value="">Selecciona una empresa registrada…</option>' +
    empresasCache.map(e=>`<option value="${e.id}" ${e.id===selectedId?'selected':''}>${esc(e.nombre)}</option>`).join('');
}
function llenarAccesoDesdeEmpresa(){
  const id = document.getElementById('acEmpresa').value;
  const e = empresasCache.find(x=>x.id===id);
  document.getElementById('acEmail').value = e ? (e.correo||'') : '';
  document.getElementById('acNombre').value = e ? e.nombre : '';
  document.getElementById('acPassword').value = '';
  const msg = document.getElementById('accesoMsg');
  msg.innerHTML = (e && !e.correo) ? '<span style="color:var(--muted)">Esta empresa no tiene correo registrado: escríbelo aquí (se usará solo para el acceso).</span>' : '';
}
function gestionarAcceso(empresaId){
  showEmpresasTab('acceso');
  document.getElementById('acEmpresa').innerHTML = opcionesEmpresasSelect(empresaId);
  llenarAccesoDesdeEmpresa();
  document.getElementById('acPassword').focus();
}
async function renderAccesosEmpresa(){
  const sel = document.getElementById('acEmpresa');
  if(!sel.value) sel.innerHTML = opcionesEmpresasSelect('');
  const el = document.getElementById('accesosList');
  el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Cargando…</p>';
  try{
    const { data, error } = await sb.rpc('admin_list_role_accounts');
    if(error) throw error;
    accesosCache = (data||[]).filter(u=>u.role==='empresa');
    if(accesosCache.length===0){ el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Todavía no hay empresas con acceso.</p>'; return; }
    el.innerHTML = '<table class="students-list"><thead><tr><th>Cuenta</th><th>Creado</th><th></th></tr></thead><tbody>' +
      accesosCache.map(u=>`<tr>
        <td>${u.nombre?esc(u.nombre)+'<br><span style="color:var(--muted);font-size:11.5px;">'+esc(u.email)+'</span>':esc(u.email)}</td>
        <td>${u.created_at?new Date(u.created_at).toLocaleDateString():'—'}</td>
        <td style="white-space:nowrap;">
          <button class="ghost" style="padding:5px 9px;font-size:12px;" onclick="editarAcceso('${u.id}')">Editar</button>
          <button class="danger" style="padding:5px 9px;font-size:12px;" onclick="eliminarAcceso('${u.id}')">Eliminar</button>
        </td></tr>`).join('') + '</tbody></table>';
  }catch(e){ console.error(e); el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No se pudo cargar: '+esc(e.message)+'</p>'; }
}
function editarAcceso(id){
  const u = accesosCache.find(x=>x.id===id); if(!u) return;
  const emp = empresasCache.find(e=>(e.correo||'').toLowerCase()===(u.email||'').toLowerCase());
  document.getElementById('acEmpresa').innerHTML = opcionesEmpresasSelect(emp ? emp.id : '');
  document.getElementById('acEmail').value = u.email;
  document.getElementById('acNombre').value = u.nombre||'';
  document.getElementById('acPassword').value = '';
  document.getElementById('accesoMsg').innerHTML = '<span style="color:var(--muted)">Editando '+esc(u.email)+'. Deja la contraseña en blanco para conservar la actual.</span>';
  window.scrollTo(0,0);
}
async function guardarAccesoEmpresa(){
  if(!requireSupabase()) return;
  const msg = document.getElementById('accesoMsg');
  const email = val('acEmail'), nombre = val('acNombre'), password = document.getElementById('acPassword').value;
  if(!email){ msg.innerHTML = '<span style="color:var(--danger)">Escribe el correo de acceso.</span>'; return; }
  if(password && password.length < 8){ msg.innerHTML = '<span style="color:var(--danger)">La contraseña debe tener mínimo 8 caracteres.</span>'; return; }
  try{
    const { data, error } = await sb.rpc('admin_save_role_account', { p_email: email, p_role: 'empresa', p_password: password || null, p_nombre: nombre });
    if(error) throw error;
    document.getElementById('acPassword').value = '';
    msg.innerHTML = '<span style="color:var(--teal-dark)">'+((data&&data.updated)?'Acceso actualizado.':'Acceso creado.')+'</span>';
    renderAccesosEmpresa();
  }catch(e){ console.error(e); msg.innerHTML = '<span style="color:var(--danger)">Error: '+esc(errMsg(e))+'</span>'; }
}
async function eliminarAcceso(id){
  if(!confirm('¿Eliminar este acceso? La empresa dejará de poder entrar (sus datos y cupos no se borran).')) return;
  const { error } = await sb.rpc('admin_delete_role_account', { p_id: id });
  if(error){ toast('No se pudo eliminar: '+error.message, true); return; }
  toast('Acceso eliminado'); renderAccesosEmpresa();
}

/* ---------- Carta de presentación ---------- */
function datosCarta(rec, a){
  return {
    contacto: a.contacto, empresa: a.empresa, direccion: a.direccion, telefono: a.telefono,
    estudiante: rec.nombre, documento: rec.documento, programa: rec.programa,
    inicio: a.fecha_inicio, fin: a.fecha_fin, horario: a.horario, jornada: a.dias || a.jornada, requisitos: a.requisitos
  };
}
async function descargarCartaEstudiante(){
  const a = window.asigEstudiante;
  if(!a){ toast('Aún no tienes una empresa asignada', true); return; }
  if(!a.fecha_inicio || !a.fecha_fin || !a.horario){
    toast('La administración aún no ha definido las fechas y el horario de tu práctica. Intenta más tarde.', true); return;
  }
  await descargarCartaPdf(datosCarta(state.record, a));
}
async function descargarCartaAdmin(){
  const { data, error } = await sb.rpc('admin_carta_datos', { p_documento: state.documento });
  if(error){ toast(errMsg(error), true); return; }
  if(!data){ toast('El estudiante no tiene empresa asignada', true); return; }
  if(!data.fecha_inicio || !data.fecha_fin || !data.horario){
    if(!confirm('Falta definir fechas u horario del cupo (módulo Empresas). ¿Generar la carta de todos modos con esos campos vacíos?')) return;
  }
  await descargarCartaPdf(datosCarta(state.record, data));
}

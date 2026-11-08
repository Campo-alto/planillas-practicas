/* ===== MODALIDADES (nombre + meses + si usa cupos y carta) ===== */
let modalidadesCache = [];
async function loadModalidades(){
  if(!sb) return;
  try{
    const { data, error } = await sb.from('modalidades').select('*').order('created_at', { ascending: true });
    if(error || !data) return;                           // si falla la consulta, se queda con la lista de respaldo (si la tabla está vacía, se respeta vacía)
    modalidadesCache = data;
    MODALIDADES = data.map(m=>({ nombre: m.nombre, meses: m.meses, es_pnr: m.es_pnr }));
  }catch(e){ console.error(e); }
}
loadModalidades();

function abrirModalidades(){
  if(!requireSupabase()) return;
  showScreen('screen-admin-modalidades');
  renderModalidadesAdmin();
}
async function renderModalidadesAdmin(){
  const el = document.getElementById('modalidadesList');
  el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Cargando…</p>';
  const { data, error } = await sb.from('modalidades').select('*').order('created_at', { ascending: true });
  if(error){ el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No se pudo cargar: '+esc(error.message)+' (¿ejecutaste el SQL de la etapa 7?)</p>'; return; }
  modalidadesCache = data || [];
  MODALIDADES = modalidadesCache.map(m=>({ nombre: m.nombre, meses: m.meses, es_pnr: m.es_pnr }));
  if(!modalidadesCache.length){ el.innerHTML = '<p style="color:var(--muted);font-size:13px;">No hay modalidades.</p>'; return; }
  el.innerHTML = '<table class="students-list"><thead><tr><th>Modalidad</th><th>Meses</th><th>Cupos y carta (no remunerada)</th><th></th></tr></thead><tbody>' +
    modalidadesCache.map(m=>`<tr>
      <td><input type="text" id="modNom-${m.id}" value="${escapeAttr(m.nombre)}" style="min-width:230px;"></td>
      <td><input type="number" id="modMes-${m.id}" min="1" max="12" value="${m.meses}" style="width:70px;"></td>
      <td style="text-align:center;"><input type="checkbox" id="modPnr-${m.id}" ${m.es_pnr?'checked':''}></td>
      <td style="white-space:nowrap;">
        <button class="primary" style="padding:5px 10px;font-size:12px;" onclick="guardarModalidad('${m.id}')">Guardar</button>
        <button class="danger" style="padding:5px 10px;font-size:12px;" onclick="eliminarModalidad('${m.id}')">Eliminar</button>
      </td></tr>`).join('') + '</tbody></table>';
}
function validarModalidad(nombre, meses){
  if(nombre.length < 3) return 'Escribe el nombre de la modalidad (mínimo 3 letras).';
  if(isNaN(meses) || meses < 1 || meses > 12) return 'Los meses deben estar entre 1 y 12.';
  return null;
}
async function agregarModalidad(){
  const nombre = document.getElementById('modNuevoNombre').value.trim();
  const meses = parseInt(document.getElementById('modNuevoMeses').value, 10);
  const es_pnr = document.getElementById('modNuevoPnr').checked;
  const msg = document.getElementById('modMsg');
  const err = validarModalidad(nombre, meses);
  if(err){ msg.innerHTML = '<span style="color:var(--danger)">'+err+'</span>'; return; }
  const { error } = await sb.from('modalidades').insert({ nombre, meses, es_pnr });
  if(error){ msg.innerHTML = '<span style="color:var(--danger)">'+(error.code==='23505'?'Ya existe una modalidad con ese nombre.':esc(error.message))+'</span>'; return; }
  document.getElementById('modNuevoNombre').value = '';
  msg.innerHTML = '<span style="color:var(--teal-dark)">Modalidad agregada.</span>';
  renderModalidadesAdmin();
}
async function guardarModalidad(id){
  const nombre = document.getElementById('modNom-'+id).value.trim();
  const meses = parseInt(document.getElementById('modMes-'+id).value, 10);
  const es_pnr = document.getElementById('modPnr-'+id).checked;
  const err = validarModalidad(nombre, meses);
  if(err){ toast(err, true); return; }
  const { error } = await sb.from('modalidades').update({ nombre, meses, es_pnr }).eq('id', id);
  if(error){ toast(error.code==='23505' ? 'Ya existe una modalidad con ese nombre.' : error.message, true); return; }
  toast('Modalidad actualizada'); renderModalidadesAdmin();
}
async function eliminarModalidad(id){
  const m = modalidadesCache.find(x=>x.id===id);
  if(!confirm('¿Eliminar la modalidad "'+(m?m.nombre:'')+'"? Solo se puede si ningún estudiante la usa.')) return;
  const { error } = await sb.from('modalidades').delete().eq('id', id);
  if(error){ toast(error.message, true); return; }
  toast('Modalidad eliminada'); renderModalidadesAdmin();
}

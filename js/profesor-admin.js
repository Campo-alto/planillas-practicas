/* ============================= USUARIOS DE PROFESORES (administrador) =============================
   El administrador crea los accesos de los profesores (correo + contraseña). El profesor entra por profesor.html y califica
   los meses que la empresa no calificó. Requiere rol-profesor-etapa65.sql.
   Seguridad: las funciones de la base de datos exigen el permiso «Usuarios de supervisores»; la contraseña se guarda cifrada y nunca se muestra. */
let profLista = [], profEditando = null;
function profPantalla(){
  let el = document.getElementById('screen-admin-profesores');
  if(!el){
    const ref = document.getElementById('screen-admin-hub') || document.querySelector('.screen'); if(!ref) return null;
    el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-profesores'; ref.parentNode.appendChild(el);
  }
  return el;
}
const profVolver = '<button class="linkbtn" onclick="showScreen(\'screen-admin-hub\')">← Volver al panel</button>';
async function abrirProfesoresAdmin(){
  if(typeof requireSupabase === 'function' && !requireSupabase()) return;
  const el = profPantalla(); if(!el) return;
  el.innerHTML = profVolver + '<p style="color:var(--muted)">Cargando…</p>'; showScreen('screen-admin-profesores');
  const { data, error } = await sb.rpc('admin_prof_listar');
  if(error){ el.innerHTML = profVolver + '<p style="color:var(--danger)">No se pudo cargar: ' + esc(error.message) + ' (¿ejecutaste rol-profesor-etapa65.sql?)</p>'; return; }
  profLista = data || []; profEditando = null; profPintar();
}
function profPintar(){
  const el = profPantalla(); if(!el) return;
  const filas = profLista.map(p=>'<tr><td>' + esc(p.nombre || '—') + '</td><td>' + esc(p.email) + '</td><td class="plz-n">' + (p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '') +
    '</td><td><div class="actions-row" style="margin:0;justify-content:flex-start;"><button class="ghost" data-ed="' + esc(p.id) + '">Editar</button><button class="danger" data-del="' + esc(p.id) + '">Eliminar</button></div></td></tr>').join('');
  const ed = profEditando ? profLista.find(x=>x.id === profEditando) : null;
  el.innerHTML = profVolver + '<h2 style="margin:12px 0 4px;">Usuarios de profesores</h2>' +
    '<p class="helptext" style="text-align:justify;">Los profesores entran por la tarjeta <b>Profesor</b> de la página principal con el correo y la contraseña que les crees aquí. ' +
    'Pueden buscar a un estudiante y <b>calificar solo los meses que la empresa no calificó</b>. Nunca pueden cambiar una nota puesta por la empresa ni un mes bloqueado.</p>' +
    '<div class="card" style="max-width:560px;"><div class="section-bar teal">' + (ed ? 'Editar profesor' : 'Nuevo profesor') + '</div>' +
    '<div class="field"><label>Nombre completo</label><input id="prNombre" maxlength="120" value="' + esc(ed ? ed.nombre : '') + '"></div>' +
    '<div class="field"><label>Correo</label><input id="prEmail" type="email" autocomplete="off" value="' + esc(ed ? ed.email : '') + '"' + (ed ? ' disabled' : '') + '></div>' +
    '<div class="field"><label>Contraseña' + (ed ? ' <small>(déjala vacía para no cambiarla)</small>' : ' <small>(mínimo 8 caracteres)</small>') + '</label><input id="prClave" type="text" autocomplete="new-password" placeholder="' + (ed ? 'Sin cambios' : 'Ej. Profe2026*') + '"></div>' +
    '<div class="actions-row"><button class="primary" id="prGuardar">' + (ed ? 'Guardar cambios' : 'Crear profesor') + '</button>' + (ed ? '<button class="ghost" id="prCancelar">Cancelar</button>' : '') + '</div></div>' +
    '<div class="card"><div class="section-bar deep">Profesores registrados (' + profLista.length + ')</div>' +
    (profLista.length ? '<div class="tbl-wrap"><table class="plz-tabla"><thead><tr><th>Nombre</th><th>Correo</th><th>Creado</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div>' : '<p class="helptext">Aún no hay profesores. Crea el primero con el formulario de arriba.</p>') + '</div>';
  document.getElementById('prGuardar').onclick = profGuardar;
  const c = document.getElementById('prCancelar'); if(c) c.onclick = ()=>{ profEditando = null; profPintar(); };
  el.querySelectorAll('[data-ed]').forEach(b=>b.onclick = ()=>{ profEditando = b.dataset.ed; profPintar(); window.scrollTo(0, 0); });
  el.querySelectorAll('[data-del]').forEach(b=>b.onclick = ()=>profEliminar(b.dataset.del));
}
async function profGuardar(){
  const nombre = document.getElementById('prNombre').value.trim(), email = document.getElementById('prEmail').value.trim(), clave = document.getElementById('prClave').value;
  if(nombre.length < 3){ toast('Escribe el nombre completo del profesor.', true); return; }
  if(!profEditando && !email){ toast('Escribe el correo del profesor.', true); return; }
  const ed = profEditando ? profLista.find(x=>x.id === profEditando) : null;
  const { data, error } = await sb.rpc('admin_prof_guardar', { p_email: ed ? ed.email : email, p_nombre: nombre, p_password: clave || null });
  if(error){ toast(error.message, true); return; }
  toast(data && data.nuevo ? 'Profesor creado. Entrégale su correo y su contraseña.' : 'Cambios guardados.');
  await abrirProfesoresAdmin();
}
async function profEliminar(id){
  const p = profLista.find(x=>x.id === id); if(!p) return;
  if(!confirm('¿Eliminar el acceso de ' + (p.nombre || p.email) + '?\n\nYa no podrá entrar. Las notas que calificó se conservan en las planillas.')) return;
  const { error } = await sb.rpc('admin_prof_eliminar', { p_id: id });
  if(error){ toast(error.message, true); return; }
  toast('Acceso eliminado.'); await abrirProfesoresAdmin();
}

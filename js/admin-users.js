/* ============================= USUARIOS EMPRESA/SUPERVISOR (gestión del admin, vía funciones SQL) ============================= */
let roleAccountsCache = [];
async function renderRoleAccounts(){
  const el = document.getElementById('roleAccountsList');
  if(!sb){ el.innerHTML = ''; return; }
  el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Cargando…</p>';
  try{
    const { data, error } = await sb.rpc('admin_list_role_accounts');
    if(error){ throw new Error(error.message); }
    roleAccountsCache = (data || []).filter(u=>u.role === state.adminModuleRole);
    if(typeof inhabCargar === 'function') await inhabCargar();
    renderRoleAccountsTable();
  }catch(e){ console.error(e); el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No se pudo cargar: '+e.message+'</p>'; }
}
function renderRoleAccountsTable(){
  const el = document.getElementById('roleAccountsList');
  if(roleAccountsCache.length === 0){ el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Todavía no hay usuarios creados en este módulo.</p>'; return; }
  const rows = roleAccountsCache.map(u=>`<tr${typeof inhabEsta==='function' && inhabEsta('cuenta', u.id) ? ' class="inhab-row"' : ''}>
    <td>${u.nombre ? u.nombre+'<br><span style="color:var(--muted);font-size:11.5px;">'+u.email+'</span>' : u.email}${typeof inhabBadge==='function' ? inhabBadge('cuenta', u.id) : ''}</td>
    <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
    <td style="white-space:nowrap;">
      <button class="ghost" style="padding:5px 9px;font-size:12px;" onclick="editRoleAccount('${escapeAttr(u.email)}', '${escapeAttr(u.nombre||'')}')">Editar</button>
      ${typeof inhabBoton==='function' ? inhabBoton('cuenta', u.id, u.nombre||u.email, u.role) : ''}
      <button class="danger" style="padding:5px 9px;font-size:12px;" onclick="deleteRoleAccount('${u.id}')">Eliminar</button>
    </td>
  </tr>`).join('');
  el.innerHTML = `<table class="students-list"><thead><tr><th>Cuenta</th><th>Creado</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
function editRoleAccount(email, nombre){
  document.getElementById('ruEmail').value = email;
  document.getElementById('ruNombre').value = nombre;
  document.getElementById('ruPassword').value = '';
  document.getElementById('roleAccountsMsg').innerHTML = '<span style="color:var(--muted)">Editando '+email+' — cambia el nombre si hace falta. Deja la contraseña en blanco para conservar la actual, o escribe una nueva para cambiarla.</span>';
  document.getElementById('ruNombre').focus();
}
async function saveRoleAccount(){
  if(!requireSupabase()) return;
  const email = document.getElementById('ruEmail').value.trim();
  const nombre = document.getElementById('ruNombre').value.trim();
  const role = state.adminModuleRole;
  const password = document.getElementById('ruPassword').value;
  const msg = document.getElementById('roleAccountsMsg');
  if(!email){ msg.innerHTML = '<span style="color:var(--danger)">Escribe el correo.</span>'; return; }
  if(password && password.length < 8){ msg.innerHTML = '<span style="color:var(--danger)">La contraseña debe tener mínimo 8 caracteres (o déjala en blanco para conservar la actual).</span>'; return; }
  msg.innerHTML = '<span style="color:var(--muted)">Guardando…</span>';
  try{
    const { data, error } = await sb.rpc('admin_save_role_account', { p_email: email, p_role: role, p_password: password || null, p_nombre: nombre });
    if(error){ throw new Error(error.message); }
    document.getElementById('ruEmail').value = '';
    document.getElementById('ruNombre').value = '';
    document.getElementById('ruPassword').value = '';
    msg.innerHTML = (data && data.updated)
      ? '<span style="color:var(--teal-dark)">Usuario actualizado.</span>'
      : '<span style="color:var(--teal-dark)">Usuario creado.</span>';
    renderRoleAccounts();
    if(password && typeof correoOfrecerClaveCuenta === 'function') correoOfrecerClaveCuenta(email, nombre, role, password);
  }catch(e){ console.error(e); msg.innerHTML = '<span style="color:var(--danger)">Error: '+e.message+'</span>'; }
}
async function deleteRoleAccount(userId){
  if(!requireSupabase()) return;
  try{
    const { error } = await sb.rpc('admin_delete_role_account', { p_id: userId });
    if(error){ throw new Error(error.message); }
    toast('Usuario eliminado');
    renderRoleAccounts();
  }catch(e){ console.error(e); toast('No se pudo eliminar: '+e.message, true); }
}
async function adminManage(body){
  const { data, error } = await sb.functions.invoke('admin-manage', { body });
  if(error){
    let m = error.message;
    try{ if(error.context && error.context.json){ const j = await error.context.json(); if(j && j.error) m = j.error; } }catch(_){}
    throw new Error(m);
  }
  if(data && data.error) throw new Error(data.error);
  return data;
}
let adminsCache = [];
function normTxt(t){ return (t||'').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
// Agrega el campo Documento al formulario y la barra de búsqueda (si el HTML no los trae)
function asegurarUiAdministradores(){
  const email = document.getElementById('admEmail');
  if(email && !document.getElementById('admDocumento')){
    const row = email.closest('.field-row');
    const f = document.createElement('div'); f.className = 'field';
    f.innerHTML = '<label>Documento</label><input type="text" id="admDocumento" inputmode="numeric" autocomplete="off">';
    row.insertBefore(f, row.firstChild);
    row.querySelector('#admNombre').closest('.field').querySelector('label').textContent = 'Nombre completo';
  }
  if(email && !document.getElementById('admRolNuevo') && typeof ROL_NOMBRES !== 'undefined'){
    const row = email.closest('.field-row');
    const f = document.createElement('div'); f.className = 'field';
    f.innerHTML = '<label>Rol</label><select id="admRolNuevo">' +
      Object.keys(ROL_NOMBRES).map(k=>'<option value="'+k+'"'+(k==='asistente'?' selected':'')+'>'+ROL_NOMBRES[k]+'</option>').join('') + '</select>';
    row.appendChild(f);
  }
  const list = document.getElementById('adminsList');
  if(list && !document.getElementById('admBuscar')){
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;';
    bar.innerHTML = '<input type="search" id="admBuscar" placeholder="Buscar por documento, nombre o apellido…" style="flex:1;min-width:220px;" oninput="filtrarAdministradores()">'+
      '<button class="ghost" type="button" onclick="document.getElementById(\'admBuscar\').value=\'\';filtrarAdministradores()">Limpiar</button>';
    list.insertAdjacentElement('beforebegin', bar);
  }
}
async function renderAdminsList(){
  asegurarUiAdministradores();
  const el = document.getElementById('adminsList');
  if(!sb){ el.innerHTML = ''; return; }
  el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Cargando…</p>';
  try{
    const { data, error } = await sb.rpc('admin_list_administradores');
    if(error){ throw new Error(error.message); }
    adminsCache = data || [];
    if(typeof inhabCargar === 'function') await inhabCargar();
    filtrarAdministradores();
  }catch(e){ console.error(e); el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No se pudo cargar: '+e.message+' (¿ejecutaste el SQL de la etapa 6?)</p>'; }
}
async function filtrarAdministradores(){
  const el = document.getElementById('adminsList');
  const q = normTxt((document.getElementById('admBuscar')||{}).value).trim();
  const lista = !q ? adminsCache : adminsCache.filter(a =>
    normTxt(a.documento).includes(q) || normTxt(a.nombre).includes(q) || normTxt(a.email).includes(q));
  if(adminsCache.length === 0){ el.innerHTML = '<p style="color:var(--muted);font-size:13px;">No se encontraron administradores.</p>'; return; }
  if(lista.length === 0){ el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Ningún administrador coincide con "'+escapeAttr(q)+'".</p>'; return; }
  const me = (await sb.auth.getUser()).data.user;
  const rows = lista.map(a=>`<tr${typeof inhabEsta==='function' && inhabEsta('personal', a.id) ? ' class="inhab-row"' : ''}>
    <td>${escapeAttr(a.documento) || '<span style="color:var(--danger)">sin documento</span>'}</td>
    <td>${escapeAttr(a.nombre) || '<span style="color:var(--muted)">—</span>'}${me && me.id===a.id ? ' <span style="color:var(--muted);font-size:11.5px;">(tú)</span>' : ''}${typeof inhabBadge==='function' ? inhabBadge('personal', a.id) : ''}</td>
    <td>${escapeAttr(a.email)}</td>
    ${a.rol === undefined ? '' : '<td>'+selectorRolHtml(a, me)+'</td>'}
    <td>${a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
    <td style="white-space:nowrap;">
      <button class="ghost" style="padding:5px 9px;font-size:12px;" onclick="editarPerfilAdmin('${a.id}')">Editar datos</button>
      <button class="ghost" style="padding:5px 9px;font-size:12px;" onclick="changeAdminPassword('${a.id}','${escapeAttr(a.email)}')">Cambiar contraseña</button>
      ${me && me.id===a.id || typeof inhabBoton!=='function' ? '' : inhabBoton('personal', a.id, a.nombre||a.email)}
      ${me && me.id===a.id ? '' : `<button class="danger" style="padding:5px 9px;font-size:12px;" onclick="deleteAdministrador('${a.id}','${escapeAttr(a.email)}')">Eliminar</button>`}
    </td>
  </tr>`).join('');
  el.innerHTML = `<p class="helptext" style="margin:0 0 8px;">${lista.length} de ${adminsCache.length} persona(s) del personal</p>
    <table class="students-list"><thead><tr><th>Documento</th><th>Nombre</th><th>Correo</th>${lista.some(a=>a.rol!==undefined)?'<th>Rol</th>':''}<th>Creado</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
async function editarPerfilAdmin(id){
  const a = adminsCache.find(x=>x.id===id); if(!a) return;
  const doc = prompt('Documento del administrador:', a.documento || '');
  if(doc === null) return;
  const nom = prompt('Nombre completo del administrador:', a.nombre || '');
  if(nom === null) return;
  const { error } = await sb.rpc('admin_set_admin_profile', { p_user_id: id, p_documento: doc.trim(), p_nombre: nom.trim() });
  if(error){ toast(error.message, true); return; }
  toast('Datos actualizados'); renderAdminsList();
}
async function saveAdministrador(){
  if(!requireSupabase()) return;
  asegurarUiAdministradores();
  const documento = document.getElementById('admDocumento').value.trim();
  const email = document.getElementById('admEmail').value.trim();
  const nombre = document.getElementById('admNombre').value.trim();
  const password = document.getElementById('admPasswordNew').value;
  const msg = document.getElementById('admFormMsg');
  const err = t => { msg.innerHTML = '<span style="color:var(--danger)">'+t+'</span>'; };
  if(!/^[0-9A-Za-z]{5,20}$/.test(documento)) return err('Escribe un documento válido (5 a 20 letras o números).');
  if(nombre.length < 3) return err('Escribe el nombre completo.');
  if(!email || !password) return err('Escribe correo y contraseña.');
  if(password.length < 8) return err('La contraseña debe tener mínimo 8 caracteres.');
  if(adminsCache.some(a=>a.documento === documento)) return err('Ya existe un administrador con ese documento.');
  msg.innerHTML = '<span style="color:var(--muted)">Creando…</span>';
  try{
    const rolSel = document.getElementById('admRolNuevo'); const rol = rolSel ? rolSel.value : 'administrador';
    const r = await adminManage({ action:'create', email, nombre, password, rol });
    const { error } = await sb.rpc('admin_set_admin_profile', { p_user_id: r.id, p_documento: documento, p_nombre: nombre });
    if(error) throw new Error('Se creó el acceso pero no se guardó el perfil: ' + error.message);
    ['admDocumento','admEmail','admNombre','admPasswordNew'].forEach(id=>document.getElementById(id).value='');
    msg.innerHTML = '<span style="color:var(--teal-dark)">Usuario creado con rol «'+(typeof ROL_NOMBRES!=='undefined'?ROL_NOMBRES[rol]:rol)+'».</span>';
    renderAdminsList();
    if(typeof correoOfrecerClaveCuenta === 'function') correoOfrecerClaveCuenta(email, nombre, 'personal', password);
  }catch(e){ console.error(e); err('Error: '+e.message); renderAdminsList(); }
}
async function changeAdminPassword(id, email){
  const p = prompt('Nueva contraseña para '+email+' (mínimo 8 caracteres):');
  if(!p) return;
  try{ await adminManage({ action:'set_password', user_id:id, password:p }); toast('Contraseña actualizada'); }
  catch(e){ toast('No se pudo cambiar: '+e.message, true); }
}
async function deleteAdministrador(id, email){
  if(!confirm('¿Eliminar a '+email+' del personal? Esta acción no se puede deshacer.')) return;
  try{ await adminManage({ action:'delete', user_id:id }); toast('Administrador eliminado'); renderAdminsList(); }
  catch(e){ toast('No se pudo eliminar: '+e.message, true); }
}

// Selector de rol de cada persona (no se puede cambiar el propio rol)
function selectorRolHtml(a, me){
  const propio = me && me.id === a.id;
  const opts = Object.keys(ROL_NOMBRES).map(k=>'<option value="'+k+'"'+(a.rol===k?' selected':'')+'>'+ROL_NOMBRES[k]+'</option>').join('');
  return '<select '+(propio?'disabled title="No puedes cambiar tu propio rol"':'')+' style="font-size:12.5px;padding:4px 6px;" onchange="cambiarRolAdmin(\''+a.id+'\', this)">'+opts+'</select>';
}
async function cambiarRolAdmin(id, sel){
  const a = adminsCache.find(x=>x.id===id); if(!a) return;
  const nuevo = sel.value;
  if(!confirm('¿Cambiar el rol de '+(a.nombre||a.email)+' a «'+ROL_NOMBRES[nuevo]+'»?')){ sel.value = a.rol; return; }
  const { error } = await sb.rpc('admin_set_admin_rol', { p_user_id: id, p_rol: nuevo });
  if(error){ toast(error.message, true); sel.value = a.rol; return; }
  a.rol = nuevo; toast('Rol actualizado');
}

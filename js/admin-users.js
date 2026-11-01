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
    renderRoleAccountsTable();
  }catch(e){ console.error(e); el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No se pudo cargar: '+e.message+'</p>'; }
}
function renderRoleAccountsTable(){
  const el = document.getElementById('roleAccountsList');
  if(roleAccountsCache.length === 0){ el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Todavía no hay usuarios creados en este módulo.</p>'; return; }
  const rows = roleAccountsCache.map(u=>`<tr>
    <td>${u.nombre ? u.nombre+'<br><span style="color:var(--muted);font-size:11.5px;">'+u.email+'</span>' : u.email}</td>
    <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
    <td style="white-space:nowrap;">
      <button class="ghost" style="padding:5px 9px;font-size:12px;" onclick="editRoleAccount('${escapeAttr(u.email)}', '${escapeAttr(u.nombre||'')}')">Editar</button>
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
async function renderAdminsList(){
  const el = document.getElementById('adminsList');
  if(!sb){ el.innerHTML = ''; return; }
  el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Cargando…</p>';
  try{
    const { data, error } = await sb.rpc('admin_list_administradores');
    if(error){ throw new Error(error.message); }
    const admins = data || [];
    if(admins.length === 0){ el.innerHTML = '<p style="color:var(--muted);font-size:13px;">No se encontraron administradores.</p>'; return; }
    const me = (await sb.auth.getUser()).data.user;
    const rows = admins.map(a=>`<tr>
      <td>${escapeAttr(a.email)}${me && me.id===a.id ? ' <span style="color:var(--muted);font-size:11.5px;">(tú)</span>' : ''}</td>
      <td>${a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
      <td style="white-space:nowrap;">
        <button class="ghost" style="padding:5px 9px;font-size:12px;" onclick="changeAdminPassword('${a.id}','${escapeAttr(a.email)}')">Cambiar contraseña</button>
        ${me && me.id===a.id ? '' : `<button class="danger" style="padding:5px 9px;font-size:12px;" onclick="deleteAdministrador('${a.id}','${escapeAttr(a.email)}')">Eliminar</button>`}
      </td>
    </tr>`).join('');
    el.innerHTML = `<table class="students-list"><thead><tr><th>Correo</th><th>Creado</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  }catch(e){ console.error(e); el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No se pudo cargar: '+e.message+'</p>'; }
}
async function saveAdministrador(){
  if(!requireSupabase()) return;
  const email = document.getElementById('admEmail').value.trim();
  const nombre = document.getElementById('admNombre').value.trim();
  const password = document.getElementById('admPasswordNew').value;
  const msg = document.getElementById('admFormMsg');
  if(!email || !password){ msg.innerHTML = '<span style="color:var(--danger)">Escribe correo y contraseña.</span>'; return; }
  if(password.length < 8){ msg.innerHTML = '<span style="color:var(--danger)">La contraseña debe tener mínimo 8 caracteres.</span>'; return; }
  msg.innerHTML = '<span style="color:var(--muted)">Creando…</span>';
  try{
    await adminManage({ action:'create', email, nombre, password });
    document.getElementById('admEmail').value = '';
    document.getElementById('admNombre').value = '';
    document.getElementById('admPasswordNew').value = '';
    msg.innerHTML = '<span style="color:var(--teal-dark)">Administrador creado.</span>';
    renderAdminsList();
  }catch(e){ console.error(e); msg.innerHTML = '<span style="color:var(--danger)">Error: '+e.message+'</span>'; }
}
async function changeAdminPassword(id, email){
  const p = prompt('Nueva contraseña para '+email+' (mínimo 8 caracteres):');
  if(!p) return;
  try{ await adminManage({ action:'set_password', user_id:id, password:p }); toast('Contraseña actualizada'); }
  catch(e){ toast('No se pudo cambiar: '+e.message, true); }
}
async function deleteAdministrador(id, email){
  if(!confirm('¿Eliminar al administrador '+email+'? Esta acción no se puede deshacer.')) return;
  try{ await adminManage({ action:'delete', user_id:id }); toast('Administrador eliminado'); renderAdminsList(); }
  catch(e){ toast('No se pudo eliminar: '+e.message, true); }
}

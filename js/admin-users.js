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
      <button class="ghost" style="padding:5px 9px;font-size:12px;" onclick="resetRoleAccountPassword('${escapeAttr(u.email)}', '${escapeAttr(u.nombre||'')}')">Restablecer contraseña</button>
      <button class="danger" style="padding:5px 9px;font-size:12px;" onclick="deleteRoleAccount('${u.id}')">Eliminar</button>
    </td>
  </tr>`).join('');
  el.innerHTML = `<table class="students-list"><thead><tr><th>Cuenta</th><th>Creado</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
function resetRoleAccountPassword(email, nombre){
  document.getElementById('ruEmail').value = email;
  document.getElementById('ruNombre').value = nombre;
  document.getElementById('ruPassword').value = '';
  document.getElementById('roleAccountsMsg').innerHTML = '<span style="color:var(--muted)">Escribe la contraseña nueva para '+email+' y dale Guardar usuario.</span>';
  document.getElementById('ruPassword').focus();
}
async function saveRoleAccount(){
  if(!requireSupabase()) return;
  const email = document.getElementById('ruEmail').value.trim();
  const nombre = document.getElementById('ruNombre').value.trim();
  const role = state.adminModuleRole;
  const password = document.getElementById('ruPassword').value;
  const msg = document.getElementById('roleAccountsMsg');
  if(!email || !password){ msg.innerHTML = '<span style="color:var(--danger)">Escribe correo y contraseña.</span>'; return; }
  if(password.length < 6){ msg.innerHTML = '<span style="color:var(--danger)">La contraseña debe tener mínimo 6 caracteres.</span>'; return; }
  msg.innerHTML = '<span style="color:var(--muted)">Guardando…</span>';
  try{
    const { data, error } = await sb.rpc('admin_save_role_account', { p_email: email, p_role: role, p_password: password, p_nombre: nombre });
    if(error){ throw new Error(error.message); }
    document.getElementById('ruEmail').value = '';
    document.getElementById('ruNombre').value = '';
    document.getElementById('ruPassword').value = '';
    msg.innerHTML = (data && data.updated)
      ? '<span style="color:var(--teal-dark)">Ya existía — se actualizó su contraseña.</span>'
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
async function renderAdminsList(){
  const el = document.getElementById('adminsList');
  if(!sb){ el.innerHTML = ''; return; }
  el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Cargando…</p>';
  try{
    const { data, error } = await sb.rpc('admin_list_administradores');
    if(error){ throw new Error(error.message); }
    const admins = data || [];
    if(admins.length === 0){ el.innerHTML = '<p style="color:var(--muted);font-size:13px;">No se encontraron administradores.</p>'; return; }
    const rows = admins.map(a=>`<tr>
      <td>${a.email}</td>
      <td>${a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
    </tr>`).join('');
    el.innerHTML = `<table class="students-list"><thead><tr><th>Correo</th><th>Creado</th></tr></thead><tbody>${rows}</tbody></table>`;
  }catch(e){ console.error(e); el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No se pudo cargar: '+e.message+'</p>'; }
}

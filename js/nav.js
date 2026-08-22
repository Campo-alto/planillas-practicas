/* ============================= NAV ============================= */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('topbarActions').innerHTML = id==='screen-home' ? '' :
    '<span class="pill">'+roleLabel(state.role)+'</span>';
  window.scrollTo(0,0);
}
function roleLabel(role){
  return role==='empresa' ? 'Empresa' : role==='estudiante' ? 'Estudiante' : role==='supervisor' ? 'Supervisor' : role==='administrador' ? 'Administrador' : '';
}
function goHome(){ state = {role:null, documento:null, record:null, empMonth:0, estMonth:0, pendingRole:null, isNewRecord:false}; showScreen('screen-home'); }

async function goAdminEntry(){
  if(!requireSupabase()) return;
  const { data } = await sb.auth.getSession();
  if(data && data.session){ showScreen('screen-admin-hub'); }
  else {
    document.getElementById('adminEmail').value = '';
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminLoginMsg').innerHTML = '';
    showScreen('screen-admin-login');
    setTimeout(()=>document.getElementById('adminEmail').focus(), 50);
  }
}
async function doAdminLogin(){
  if(!requireSupabase()) return;
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const msg = document.getElementById('adminLoginMsg');
  if(!email || !password){ msg.innerHTML = '<span style="color:var(--danger)">Escribe correo y contraseña.</span>'; return; }
  msg.innerHTML = '<span style="color:var(--muted)">Verificando…</span>';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if(error){ msg.innerHTML = '<span style="color:var(--danger)">Correo o contraseña incorrectos.</span>'; return; }
  const role = data.user.user_metadata && data.user.user_metadata.role;
  // Las cuentas de administrador creadas antes de este cambio no tienen "role" en sus
  // metadatos todavía — se siguen tratando como administrador por compatibilidad.
  if(role && role !== 'administrador'){
    await sb.auth.signOut();
    msg.innerHTML = '<span style="color:var(--danger)">Esta cuenta no tiene permisos de administrador.</span>';
    return;
  }
  state.role = 'administrador';
  showScreen('screen-admin-hub');
}
async function adminLogout(){
  if(sb) await sb.auth.signOut();
  goHome();
}
function goAdminModule(module){
  if(module === 'empresa' || module === 'supervisor'){
    state.adminModuleRole = module;
    document.getElementById('roleModuleTitle').textContent = module==='empresa' ? 'Usuarios de Empresa' : 'Usuarios de Supervisor';
    document.getElementById('roleModuleHelp').textContent = 'Crea la cuenta con su correo. Si el correo ya existe, se actualiza su contraseña.';
    document.getElementById('roleModuleListTitle').textContent = module==='empresa' ? 'Empresas registradas' : 'Supervisores registrados';
    document.getElementById('ruEmail').value = '';
    document.getElementById('ruNombre').value = '';
    document.getElementById('ruPassword').value = '';
    document.getElementById('roleAccountsMsg').innerHTML = '';
    showScreen('screen-admin-roleusers');
    renderRoleAccounts();
  } else if(module === 'administradores'){
    showScreen('screen-admin-admins');
    renderAdminsList();
  }
}
function goAdminBack(){
  if(state.role === 'administrador'){ showScreen('screen-admin-hub'); }
  else { goHome(); }
}

function goRoleLogin(role){
  state.pendingRole = role;
  document.getElementById('roleLoginTitle').textContent = role==='empresa' ? 'Acceso Empresa' : 'Acceso Supervisor';
  document.getElementById('roleLoginHelp').textContent = 'Ingresa el correo y la contraseña que te dio el administrador.';
  document.getElementById('roleEmail').value = '';
  document.getElementById('rolePassword').value = '';
  document.getElementById('roleLoginMsg').innerHTML = '';
  showScreen('screen-role-login');
  setTimeout(()=>document.getElementById('roleEmail').focus(), 50);
}
async function doRoleLogin(){
  if(!requireSupabase()) return;
  const email = document.getElementById('roleEmail').value.trim();
  const password = document.getElementById('rolePassword').value;
  const msg = document.getElementById('roleLoginMsg');
  if(!email || !password){ msg.innerHTML = '<span style="color:var(--danger)">Escribe correo y contraseña.</span>'; return; }
  msg.innerHTML = '<span style="color:var(--muted)">Verificando…</span>';
  try{
    const { data, error } = await sb.rpc('login_role_account', { p_email: email, p_password: password });
    if(error){ console.error(error); msg.innerHTML = '<span style="color:var(--danger)">Error verificando credenciales.</span>'; return; }
    if(!data || data !== state.pendingRole){
      msg.innerHTML = '<span style="color:var(--danger)">Correo o contraseña incorrectos.</span>';
      return;
    }
    goRole(state.pendingRole);
  }catch(e){ console.error(e); msg.innerHTML = '<span style="color:var(--danger)">No se pudo conectar (revisa la consola).</span>'; }
}
function roleLogout(){
  goHome();
}

function goRole(role){
  state.role = role;
  const titles = {
    empresa: ['Buscar practicante', 'Ingresa el documento del estudiante para diligenciar o continuar su planilla mensual.'],
    estudiante: ['Consultar mi planilla', 'Ingresa tu número de documento para ver lo diligenciado y firmar.'],
    supervisor: ['Buscar practicante', 'Ingresa el documento del estudiante para registrar la visita de seguimiento.'],
    administrador: ['Buscar o registrar estudiante', 'Ingresa el número de documento. Si no existe, se crea un registro nuevo para que empresa, estudiante y supervisor lo encuentren.']
  };
  document.getElementById('lookupTitle').textContent = titles[role][0];
  document.getElementById('lookupHelp').textContent = titles[role][1];
  document.getElementById('lookupDoc').value = '';
  document.getElementById('lookupMsg').innerHTML = '';
  showScreen('screen-lookup');
  const listCard = document.getElementById('lookupAdminListCard');
  if(role === 'administrador'){
    listCard.style.display = 'block';
    renderAdminList();
  } else {
    listCard.style.display = 'none';
  }
  setTimeout(()=>document.getElementById('lookupDoc').focus(), 50);
}
function switchStudent(role){
  if(role === 'administrador'){ goRole('administrador'); return; }
  goRole(role);
}

async function doLookup(){
  const doc = document.getElementById('lookupDoc').value.trim();
  const msg = document.getElementById('lookupMsg');
  if(!doc){ msg.innerHTML = '<span style="color:var(--danger)">Escribe un número de documento.</span>'; return; }
  if(!requireSupabase()){ msg.innerHTML = '<span style="color:var(--danger)">No hay conexión con la base de datos. Revisa la consola (F12).</span>'; return; }
  msg.innerHTML = '<span style="color:var(--muted)">Buscando…</span>';
  let rec = await getRecord(doc);
  state.isNewRecord = false;
  if(!rec){
    if(state.role === 'administrador'){
      rec = emptyRecord(doc);
      state.isNewRecord = true;
      msg.innerHTML = '<span style="color:var(--teal-dark)">No existe todavía — se creará un registro nuevo para este documento.</span>';
    } else {
      msg.innerHTML = '<span style="color:var(--danger)">Este estudiante aún no está registrado. Pide al administrador que lo registre primero.</span>';
      return;
    }
  }
  state.documento = doc;
  state.record = rec;
  state.empMonth = 0; state.estMonth = 0;
  if(state.role==='empresa') renderEmpresa();
  else if(state.role==='estudiante') renderEstudiante();
  else if(state.role==='supervisor') renderSupervisor();
  else if(state.role==='administrador') renderAdministrador();
}

async function renderAdminList(){
  const el = document.getElementById('lookupAdminList');
  if(!sb){ el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No hay conexión con la base de datos. Revisa la consola (F12).</p>'; return; }
  el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Cargando…</p>';
  try{
    const { data, error } = await sb.from('students').select('documento,nombre,sede,semestre,updated_at').order('nombre', {ascending:true});
    if(error){ el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No se pudo cargar el listado: '+error.message+'</p>'; return; }
    if(!data || data.length===0){ el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Todavía no hay estudiantes registrados.</p>'; return; }
    let rows = data.map(s=>`<tr class="rowlink" onclick="jumpToAdmin('${s.documento}')">
      <td>${s.nombre||'(sin nombre)'}</td><td>${s.documento}</td><td>${s.sede||'—'}</td><td>${s.semestre||'—'}</td>
    </tr>`).join('');
    el.innerHTML = `<table class="students-list"><thead><tr><th>Nombre</th><th>Documento</th><th>Sede</th><th>Semestre</th></tr></thead><tbody>${rows}</tbody></table>`;
  }catch(e){ console.error(e); el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No se pudo cargar el listado (revisa la consola).</p>'; }
}
function jumpToAdmin(doc){
  document.getElementById('lookupDoc').value = doc;
  doLookup();
}

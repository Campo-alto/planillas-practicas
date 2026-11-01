/* ===== ACCESO DE ESTUDIANTES: usuario (documento) + contraseña ===== */

// El estudiante ya no "busca" su documento: inicia sesión y ve solo lo suyo.
(function(){
  const _goRoleOriginal = goRole;
  goRole = function(role){
    if(role === 'estudiante'){ goEstudianteLogin(); return; }
    _goRoleOriginal(role);
  };
})();

function goEstudianteLogin(){
  state.role = null; state.pendingRole = 'estudiante'; state.token = null;
  ['estUsuario','estPassword'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  document.getElementById('estLoginMsg').innerHTML = '';
  showScreen('screen-estudiante-login');
  setTimeout(()=>{ const e=document.getElementById('estUsuario'); if(e) e.focus(); }, 50);
}

async function doEstudianteLogin(){
  if(!requireSupabase()) return;
  const usuario = document.getElementById('estUsuario').value.trim();
  const password = document.getElementById('estPassword').value;
  const msg = document.getElementById('estLoginMsg');
  if(!usuario || !password){ msg.innerHTML = '<span style="color:var(--danger)">Escribe tu usuario y tu contraseña.</span>'; return; }
  msg.innerHTML = '<span style="color:var(--muted)">Verificando…</span>';
  try{
    const { data, error } = await sb.rpc('login_estudiante', { p_usuario: usuario, p_password: password });
    if(error){ console.error(error); msg.innerHTML = '<span style="color:var(--danger)">'+esc(error.message)+'</span>'; return; }
    if(!data){ msg.innerHTML = '<span style="color:var(--danger)">Usuario o contraseña incorrectos.</span>'; return; }
    state.token = data.token;
    state.documento = data.documento;
    state.currentUserNombre = data.nombre || '';
    document.getElementById('estPassword').value = '';
    if(data.must_change){ goEstudianteCambio(true); return; }
    await entrarEstudiante();
  }catch(e){ console.error(e); msg.innerHTML = '<span style="color:var(--danger)">No se pudo conectar (revisa la consola).</span>'; }
}

async function entrarEstudiante(){
  state.role = 'estudiante';
  const rec = await getRecord(state.documento);
  if(!rec){ toast('No se encontró tu planilla. Contacta al administrador.', true); estudianteLogout(); return; }
  state.record = rec; state.estMonth = 0; state.isNewRecord = false;
  renderEstudiante();
}

function goEstudianteCambio(obligatorio){
  state.cambioObligatorio = !!obligatorio;
  ['estPwActual','estPwNueva','estPwNueva2'].forEach(id=>{ document.getElementById(id).value=''; });
  document.getElementById('estCambioMsg').innerHTML = '';
  document.getElementById('estCambioHelp').textContent = obligatorio
    ? 'Es tu primer ingreso (o el administrador restableció tu clave). Por seguridad debes elegir una contraseña propia para continuar.'
    : 'Elige una contraseña nueva. Mínimo 8 caracteres.';
  document.getElementById('estCambioCancel').style.display = obligatorio ? 'none' : '';
  showScreen('screen-estudiante-cambio');
}

async function doEstudianteCambio(){
  const a = document.getElementById('estPwActual').value;
  const n = document.getElementById('estPwNueva').value;
  const n2 = document.getElementById('estPwNueva2').value;
  const msg = document.getElementById('estCambioMsg');
  const err = t => { msg.innerHTML = '<span style="color:var(--danger)">'+esc(t)+'</span>'; };
  if(!a || !n) return err('Completa todos los campos.');
  if(n.length < 8) return err('La contraseña nueva debe tener al menos 8 caracteres.');
  if(n !== n2) return err('Las contraseñas nuevas no coinciden.');
  msg.innerHTML = '<span style="color:var(--muted)">Guardando…</span>';
  const { error } = await sb.rpc('estudiante_cambiar_password', { p_token: state.token, p_actual: a, p_nueva: n });
  if(error){ console.error(error); return err(error.message); }
  toast('Contraseña actualizada');
  await entrarEstudiante();
}

function cancelarCambioEstudiante(){ if(state.record) renderEstudiante(); }

async function estudianteLogout(){
  if(sb && state.token){ try{ await sb.rpc('role_logout', { p_token: state.token }); }catch(e){} }
  state = {role:null, documento:null, record:null, empMonth:0, estMonth:0, pendingRole:null, isNewRecord:false, adminModuleRole:null, currentUserNombre:'', currentUserEmail:'', token:null};
  goEstudianteLogin();
}

/* ===== ADMINISTRADOR: contraseña del estudiante ===== */
function generarClaveLocal(){
  const abc = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = new Uint32Array(10); crypto.getRandomValues(b);
  return Array.from(b, x => abc[x % abc.length]).join('');
}
async function renderAccesoEstudianteAdmin(){
  const el = document.getElementById('admAccesoEstudiante');
  if(!el) return;
  const { data, error } = await sb.rpc('admin_student_has_password', { p_documento: state.documento });
  const estado = error ? 'No se pudo consultar' : (data ? '✅ Tiene acceso (usuario: <b>'+esc(state.documento)+'</b>)' : '⚠️ Aún no tiene contraseña');
  el.innerHTML =
    '<p style="margin:0 0 10px;font-size:14px;">'+estado+'</p>'+
    '<div class="field-row" style="grid-template-columns:1fr auto;align-items:end;">'+
      '<div class="field"><label>Contraseña inicial (mín. 8 caracteres)</label><input type="text" id="admEstPw" autocomplete="off"></div>'+
      '<button class="ghost" type="button" onclick="document.getElementById(\'admEstPw\').value=generarClaveLocal()">Generar</button>'+
    '</div>'+
    '<div class="actions-row" style="justify-content:flex-start;"><button class="primary" onclick="guardarClaveEstudiante()">'+(data?'Restablecer contraseña':'Asignar contraseña')+'</button></div>'+
    '<div id="admEstPwMsg" style="margin-top:10px;font-size:13.5px;"></div>';
}
async function guardarClaveEstudiante(){
  const pw = document.getElementById('admEstPw').value;
  const msg = document.getElementById('admEstPwMsg');
  if(pw.length < 8){ msg.innerHTML = '<span style="color:var(--danger)">Mínimo 8 caracteres.</span>'; return; }
  const { error } = await sb.rpc('admin_set_student_password', { p_documento: state.documento, p_password: pw });
  if(error){ console.error(error); msg.innerHTML = '<span style="color:var(--danger)">'+esc(error.message)+'</span>'; return; }
  msg.innerHTML = '<span style="color:var(--teal-dark)">Listo. Entrégale al estudiante: usuario <b>'+esc(state.documento)+'</b> · contraseña <b>'+esc(pw)+'</b>. Deberá cambiarla al ingresar. Esta clave no se vuelve a mostrar.</span>';
  document.getElementById('admEstPw').value = '';
  toast('Contraseña guardada');
}
async function generarClavesMasivas(){
  if(!confirm('Se crearán contraseñas temporales para TODOS los estudiantes que aún no tienen acceso, y se descargará un Excel con ellas. ¿Continuar?')) return;
  const { data, error } = await sb.rpc('admin_generar_claves_pendientes');
  if(error){ console.error(error); toast(error.message, true); return; }
  if(!data || !data.length){ toast('Todos los estudiantes ya tienen acceso'); return; }
  const rows = data.map(r => ({ Documento: r.documento, Nombre: r.nombre, Usuario: r.documento, 'Contraseña temporal': r.clave }));
  const ws = XLSX.utils.json_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Accesos');
  XLSX.writeFile(wb, 'accesos-estudiantes.xlsx');
  toast(data.length + ' accesos creados. Guarda el Excel: las claves no se vuelven a mostrar.');
}

// Al abrir un estudiante en el panel del administrador, mostrar su bloque de acceso
(function(){
  const _renderAdm = renderAdministrador;
  renderAdministrador = async function(){
    await _renderAdm();
    renderAccesoEstudianteAdmin();
  };
})();

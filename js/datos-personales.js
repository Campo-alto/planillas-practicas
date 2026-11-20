/* ============================= TRATAMIENTO DE DATOS PERSONALES =============================
   ESTUDIANTE y EMPRESA ven el aviso de tratamiento de datos personales UNA sola vez: la primera vez que entran y aún no han aceptado.
   La aceptación se guarda en la base de datos (datos-personales-etapa63.sql) con fecha y hora, y aparece en Informes y reportes ›
   «Aceptación de tratamiento de datos». El estudiante que ya marcó la casilla al pedir su acceso cuenta como aceptado.
   No se aplica a ADMINISTRADOR ni a SUPERVISOR (esas páginas no cargan este archivo y además se excluye por rol).
   Seguridad: el aviso se muestra DESPUÉS de iniciar sesión (con la sesión se sabe quién es); si no acepta, se cierra la sesión.
   Si la etapa 63 aún no se ejecutó, no bloquea el ingreso (la página sigue funcionando). */
const DP_URL = 'https://campoalto.dataprotected.co';
let dpTokenRevisado = null;
try{ sessionStorage.removeItem('dp_aceptado_v1'); }catch(e){}   // versiones anteriores

function dpMostrar(alAceptar, alRechazar){
  let m = document.getElementById('dpModal');
  if(m) m.remove();
  m = document.createElement('div');
  m.className = 'home-modal'; m.id = 'dpModal';
  m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-labelledby','dpTitulo');
  m.innerHTML =
    '<div class="home-modal-box dp-box">' +
      '<div class="home-modal-head"><span class="home-modal-ico">🛡</span><h3 id="dpTitulo">TRATAMIENTO DE DATOS PERSONALES</h3></div>' +
      '<p class="dp-texto">Antes de continuar, lee la política de tratamiento de datos personales de Campoalto.</p>' +
      '<p class="dp-texto"><b>Clic <a href="'+DP_URL+'" target="_blank" rel="noopener noreferrer">AQUÍ</a></b></p>' +
      '<p class="dp-nota">Al pulsar «Aceptar» declaras que conoces la política y autorizas el tratamiento de tus datos personales. Solo se te pedirá esta vez.</p>' +
      '<div class="home-modal-acc"><button type="button" class="primary" id="dpAceptar">Aceptar y continuar</button><button type="button" class="ghost" id="dpCancelar">No acepto (salir)</button></div>' +
    '</div>';
  document.body.appendChild(m);
  document.getElementById('dpCancelar').onclick = ()=>{ m.remove(); alRechazar(); };
  document.getElementById('dpAceptar').onclick = async ()=>{
    const b = document.getElementById('dpAceptar'); b.disabled = true;
    try{
      const { error } = await sb.rpc('dp_aceptar', { p_token: state.token });
      if(error) throw error;
      m.remove(); alAceptar();
    }catch(e){ b.disabled = false; if(typeof toast === 'function') toast('No se pudo registrar tu aceptación: ' + (e.message || e), true); }
  };
  document.getElementById('dpAceptar').focus();
}

function dpSalir(){
  try{ state.token = null; }catch(_){}
  location.reload();   // vuelve al inicio con la sesión cerrada
}

// Después de iniciar sesión: si esta persona aún no aceptó, se le muestra el aviso (una sola vez)
async function dpVerificar(){
  try{
    if(typeof state === 'undefined' || !state.token || dpTokenRevisado === state.token) return;
    const esEst = !!state.documento && state.role !== 'empresa' && state.role !== 'supervisor' && state.role !== 'profesor' && state.role !== 'empresa_ca';
    const esEmp = state.role === 'empresa' || state.role === 'empresa_ca';
    if(!esEst && !esEmp) return;
    dpTokenRevisado = state.token;
    const { data, error } = await sb.rpc('dp_estado', { p_token: state.token });
    if(error){ console.warn('dp_estado:', error.message); return; }   // etapa 63 sin ejecutar: no se bloquea el ingreso
    if(data && data.aceptado) return;
    dpMostrar(()=>{}, dpSalir);
  }catch(e){ console.warn(e); }
}

function dpEnvolver(nombre){
  const original = window[nombre];
  if(typeof original !== 'function') return;
  window[nombre] = async function(){
    const r = await original.apply(this, arguments);
    setTimeout(dpVerificar, 400);
    return r;
  };
}
['doEstudianteLogin', 'doRoleLogin', 'caLogin'].forEach(dpEnvolver);
// por si la sesión se abre por otra vía (p. ej. cambio de pantalla con sesión ya iniciada)
if(typeof showScreen === 'function'){ const _s = showScreen; showScreen = function(){ const r = _s.apply(this, arguments); setTimeout(dpVerificar, 700); return r; }; }
// al cerrar sesión, se olvida la revisión de esa sesión
['roleLogout','estudianteLogout'].forEach(n=>{
  const o = window[n];
  if(typeof o === 'function') window[n] = function(){ dpTokenRevisado = null; return o.apply(this, arguments); };
});

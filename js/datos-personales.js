/* ============================= TRATAMIENTO DE DATOS PERSONALES =============================
   Antes de iniciar sesión, ESTUDIANTE y EMPRESA deben ver el aviso de tratamiento de datos personales y pulsar «Aceptar».
   No se aplica a ADMINISTRADOR ni a SUPERVISOR (esas páginas no cargan este archivo, y además se excluye por rol).
   La aceptación se recuerda SOLO mientras no se recargue la página ni se cierre la sesión (para no pedirla de nuevo si la
   contraseña se digita mal). Al recargar, volver al inicio o cerrar sesión, se vuelve a pedir en el siguiente ingreso.
   Cubre: estudiante, empresa y empresa de contrato de aprendizaje. */
const DP_URL = 'https://campoalto.dataprotected.co';
const DP_KEY = 'dp_aceptado_v1';

let dpOk = false;
try{ sessionStorage.removeItem(DP_KEY); }catch(e){}          // versión anterior: ya no se guarda entre cargas de página
function dpAceptado(){ return dpOk; }
function dpGuardar(){ dpOk = true; }
function dpOlvidar(){ dpOk = false; }

function dpMostrar(alAceptar){
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
      '<p class="dp-nota">Al pulsar «Aceptar» declaras que conoces la política y autorizas el tratamiento de tus datos personales.</p>' +
      '<div class="home-modal-acc"><button type="button" class="primary" id="dpAceptar">Aceptar y continuar</button><button type="button" class="ghost" id="dpCancelar">Cancelar</button></div>' +
    '</div>';
  document.body.appendChild(m);
  const cerrar = ()=>{ m.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e=>{ if(e.key==='Escape') cerrar(); };
  document.addEventListener('keydown', onKey);
  document.getElementById('dpCancelar').onclick = cerrar;
  document.getElementById('dpAceptar').onclick = ()=>{ dpGuardar(); cerrar(); alAceptar(); };
  document.getElementById('dpAceptar').focus();
}

// Solo si ya hay datos escritos (si faltan, se deja que el formulario muestre su propio aviso)
function dpEnvolver(nombre, camposIds, aplica){
  const original = window[nombre];
  if(typeof original !== 'function') return;
  window[nombre] = function(){
    const llenos = camposIds.every(id=>{ const el = document.getElementById(id); return el && String(el.value).trim() !== ''; });
    if(!aplica() || dpAceptado() || !llenos) return original.apply(this, arguments);
    dpMostrar(()=>original.apply(this, []));
  };
}
dpEnvolver('doEstudianteLogin', ['estUsuario','estPassword'], ()=>true);
dpEnvolver('doRoleLogin', ['roleEmail','rolePassword'], ()=> typeof state !== 'undefined' && state.pendingRole === 'empresa');
dpEnvolver('caLogin', ['caEmail','caPass'], ()=>true);
// al cerrar sesión se vuelve a pedir en el siguiente ingreso
['roleLogout','estudianteLogout'].forEach(n=>{
  const o = window[n];
  if(typeof o === 'function') window[n] = function(){ dpOlvidar(); return o.apply(this, arguments); };
});

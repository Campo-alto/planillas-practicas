/* ============================= SESIÓN PERSISTENTE =============================
   Al recargar la página (por ejemplo, tras subir una actualización) la persona NO tiene que
   volver a iniciar sesión. Seguridad:
   - El token se guarda en sessionStorage: se borra al cerrar la pestaña (no queda en el equipo).
   - El servidor sigue mandando: el token vence solo (empresa/supervisor 8 h, estudiante 4 h) y se
     invalida al cerrar sesión. Si el servidor lo rechaza, se vuelve al login.
   - Administrador: la sesión de Supabase Auth ya persiste sola; aquí solo se retoma el menú. */
const SESION_KEY = 'cai_sesion_v1';

function _ssGet(){ try{ return JSON.parse(sessionStorage.getItem(SESION_KEY)||'null'); }catch(e){ return null; } }
function _ssSet(o){ try{ sessionStorage.setItem(SESION_KEY, JSON.stringify(o)); }catch(e){} }
function _ssClear(){ try{ sessionStorage.removeItem(SESION_KEY); }catch(e){} }

function guardarSesion(screenId){
  if(!state || !state.token) return;   // el borrado ocurre solo al cerrar sesión o si el servidor rechaza el token
  const role = state.caMode ? 'empresa_ca' : (state.role || state.pendingRole);
  if(!role || role==='administrador') return;
  _ssSet({ token: state.token, role, documento: state.documento || null,
           nombre: state.currentUserNombre || '', email: state.currentUserEmail || '',
           screen: screenId, empMonth: state.empMonth||0, estMonth: state.estMonth||0,
           cambio: !!state.cambioObligatorio, ca: !!state.caMode, t: Date.now() });
}

// cada cambio de pantalla actualiza lo guardado; cerrar sesión lo borra
(function(){
  const _show = showScreen;
  showScreen = function(id){ _show(id); try{ guardarSesion(id); }catch(e){} };
})();

(function(){
  const _rl = roleLogout;
  roleLogout = function(){ _ssClear(); return _rl.apply(this, arguments); };
  const _el = estudianteLogout;
  estudianteLogout = function(){ _ssClear(); return _el.apply(this, arguments); };
})();

// Retoma la sesión. "rolPagina" = rol de la página actual (empresa | supervisor | estudiante)
async function restaurarSesion(rolPagina){
  const s = _ssGet();
  if(!s || !s.token || s.role !== rolPagina || !sb) return false;
  try{
    state.token = s.token; state.currentUserNombre = s.nombre||''; state.currentUserEmail = s.email||'';
    state.empMonth = s.empMonth||0; state.estMonth = s.estMonth||0;

    if(rolPagina === 'estudiante'){
      state.documento = s.documento; state.role = null; state.pendingRole = 'estudiante';
      if(s.screen === 'screen-estudiante-cambio'){ goEstudianteCambio(true); return true; }
      state.role = 'estudiante';
      const rec = await getRecord(state.documento);
      if(!rec){ throw new Error('sesion'); }
      state.record = rec; state.isNewRecord = false;
      renderEstudiante();
      return true;
    }

    // empresa / supervisor
    state.role = rolPagina; state.pendingRole = rolPagina;
    const abierta = (s.screen === 'screen-empresa' || s.screen === 'screen-supervisor') && s.documento;
    if(abierta){
      const rec = await getRecord(s.documento);
      if(!rec) throw new Error('sesion');
      state.documento = s.documento; state.record = rec; state.isNewRecord = false;
      if(rolPagina==='empresa') renderEmpresa(); else renderSupervisor();
    } else {
      goRole(rolPagina);          // pantalla de búsqueda de estudiante
    }
    return true;
  }catch(e){
    _ssClear(); state.token = null; state.role = null; state.documento = null; state.record = null;
    return false;
  }
}

/* ============================= ROLES Y PERMISOS DEL PERSONAL =============================
   Roles: Administrador (todo) · Coordinador de prácticas · Coordinador de gestión empresarial · Asistente.
   El panel solo muestra las funciones que el rol tiene habilitadas, y el administrador puede habilitar o
   inhabilitar cada función de los otros tres roles en «Roles y permisos».
   SEGURIDAD: esto solo organiza lo que se VE. La base de datos (roles-permisos-etapa18.sql) es quien rechaza
   cualquier acción no permitida, aunque alguien intente llamarla a mano. Se necesita haber ejecutado ese SQL. */

const ROL_NOMBRES = {
  administrador: 'Administrador',
  coord_practicas: 'Coordinador de prácticas',
  coord_gestion: 'Coordinador de gestión empresarial',
  asistente: 'Asistente'
};
const ROLES_CONFIGURABLES = ['coord_practicas', 'coord_gestion', 'asistente'];

let permAdmin = { listo:false, rol:null, total:false, modulos:[], uid:null };

// ¿Puede el usuario actual usar esta función? ('solo_admin' = únicamente el rol Administrador)
function puede(modulo){
  if(modulo === 'solo_admin') return !!permAdmin.total;
  return !!permAdmin.total || (Array.isArray(permAdmin.modulos) && permAdmin.modulos.indexOf(modulo) >= 0);
}
function puedeAlguno(lista){ return lista.some(m=>puede(m)); }

async function cargarPermisos(forzar){
  if(typeof sb === 'undefined' || !sb) return;
  let uid = null;
  try{ const { data } = await sb.auth.getSession(); uid = data && data.session ? data.session.user.id : null; }catch(_){}
  if(permAdmin.listo && !forzar && permAdmin.uid === uid) return;
  try{
    const { data, error } = await sb.rpc('mis_permisos');
    if(error) throw error;
    permAdmin = { listo:true, rol:data.rol, total:!!data.total, modulos:data.modulos || [], uid };
  }catch(e){
    const m = String((e && e.message) || '') + ' ' + String((e && e.code) || '');
    if(/PGRST202|42883|Could not find the function|does not exist/i.test(m)){
      // Aún no se ejecutó roles-permisos-etapa18.sql: todos siguen siendo administradores, como antes
      permAdmin = { listo:true, rol:'administrador', total:true, modulos:[], uid, sinSql:true };
    } else {
      console.error(e);
      permAdmin = { listo:true, rol:null, total:false, modulos:[], uid };   // ante la duda, sin permisos
    }
  }
}
function olvidarPermisos(){ permAdmin = { listo:false, rol:null, total:false, modulos:[], uid:null }; }

// Al cerrar sesión se olvidan los permisos
(function(){
  if(typeof adminLogout === 'function'){
    const _out = adminLogout;
    adminLogout = async function(){ olvidarPermisos(); return _out.apply(this, arguments); };
  }
})();

/* ---------- Pantalla «Roles y permisos» (solo administrador) ---------- */
function rpermPantalla(){
  let el = document.getElementById('screen-admin-permisos');
  if(!el){
    const ref = document.getElementById('screen-admin-hub') || document.querySelector('.screen'); if(!ref) return null;
    el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-permisos'; ref.parentNode.appendChild(el);
  }
  return el;
}
let rpermDatos = null;
async function abrirPermisos(){
  if(!requireSupabase()) return;
  const el = rpermPantalla(); if(!el) return;
  el.innerHTML = '<p style="color:var(--muted)">Cargando…</p>'; showScreen('screen-admin-permisos');
  const { data, error } = await sb.rpc('admin_permisos_get');
  if(error){
    el.innerHTML = '<button class="linkbtn" onclick="showScreen(\'screen-admin-hub\')">← Volver al panel</button><p style="color:var(--danger)">No se pudo cargar: ' + esc(error.message) + ' (¿ejecutaste roles-permisos-etapa18.sql?)</p>';
    return;
  }
  rpermDatos = data; rpermPintar();
}
function rpermValor(rol, modulo){
  const p = (rpermDatos.permisos || []).find(x=>x.rol === rol && x.modulo === modulo);
  return !!(p && p.habilitado);
}
function rpermPintar(){
  const el = rpermPantalla(); if(!el || !rpermDatos) return;
  const cat = rpermDatos.catalogo || [];
  let areaActual = '';
  const filas = cat.map(c=>{
    let cab = '';
    if(c.area !== areaActual){ areaActual = c.area; cab = '<tr class="rperm-area"><td colspan="5">' + esc(c.area) + '</td></tr>'; }
    const celdas = ROLES_CONFIGURABLES.map(r=>`<td class="rperm-c"><label class="rperm-sw" title="${esc(ROL_NOMBRES[r])} · ${esc(c.titulo)}">
        <input type="checkbox" ${rpermValor(r, c.modulo) ? 'checked' : ''} onchange="rpermCambiar('${r}','${c.modulo}',this)">
        <span class="rperm-knob"></span><span class="rperm-txt">${rpermValor(r, c.modulo) ? 'Habilitada' : 'Inhabilitada'}</span></label></td>`).join('');
    return cab + `<tr><td class="rperm-f">${esc(c.titulo)}</td><td class="rperm-c rperm-fijo">✔ Siempre</td>${celdas}</tr>`;
  }).join('');
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Roles y permisos</h2>
    <p class="helptext" style="text-align:justify;">Habilita o inhabilita cada función para los roles del personal. El cambio se guarda al instante y se aplica la próxima vez que la persona abra el panel (o al actualizar la página). El <b>Administrador</b> siempre tiene acceso total y es el único que gestiona al personal, esta pantalla, el registro de auditoría y el reinicio de la plataforma.</p>
    <div class="card">
      <div class="cupos-wrap"><table class="rperm-table">
        <thead><tr><th>Función</th><th class="rperm-c">${esc(ROL_NOMBRES.administrador)}</th>${ROLES_CONFIGURABLES.map(r=>'<th class="rperm-c">' + esc(ROL_NOMBRES[r]) + '</th>').join('')}</tr></thead>
        <tbody>${filas}</tbody>
      </table></div>
      <div class="actions-row" style="justify-content:flex-start;margin-top:14px;">
        <button class="ghost" onclick="rpermRestaurar()">Restablecer valores iniciales</button>
      </div>
      <div id="rpermMsg" style="font-size:13px;margin-top:8px;"></div>
    </div>
    <div class="note-box">Los valores iniciales son: <b>Coordinador de prácticas</b> = Estudiantes y Supervisores · <b>Coordinador de gestión empresarial</b> = Estudiantes y Empresas · <b>Asistente</b> = solo Estudiantes. Para asignar el rol a una persona, ve a «Personal y roles».</div>`;
}
async function rpermCambiar(rol, modulo, input){
  const nuevo = input.checked;
  input.disabled = true;
  const { error } = await sb.rpc('admin_permisos_set', { p_rol: rol, p_modulo: modulo, p_habilitado: nuevo });
  input.disabled = false;
  if(error){ input.checked = !nuevo; toast('No se pudo guardar: ' + error.message, true); return; }
  const p = rpermDatos.permisos.find(x=>x.rol === rol && x.modulo === modulo);
  if(p) p.habilitado = nuevo; else rpermDatos.permisos.push({ rol, modulo, habilitado: nuevo });
  const t = input.parentElement.querySelector('.rperm-txt'); if(t) t.textContent = nuevo ? 'Habilitada' : 'Inhabilitada';
  toast((nuevo ? 'Habilitada' : 'Inhabilitada') + ': ' + (rpermDatos.catalogo.find(c=>c.modulo === modulo) || {}).titulo + ' · ' + ROL_NOMBRES[rol]);
}
async function rpermRestaurar(){
  if(!confirm('¿Restablecer los permisos iniciales de TODOS los roles? Se perderán los cambios que hayas hecho.')) return;
  const { error } = await sb.rpc('admin_permisos_restaurar', { p_rol: null });
  if(error){ toast('No se pudo restablecer: ' + error.message, true); return; }
  toast('Permisos restablecidos'); abrirPermisos();
}

/* ============================= INHABILITAR / HABILITAR USUARIOS =============================
   Un usuario inhabilitado no puede ingresar, pero TODO lo que hizo se conserva y puede habilitarse de nuevo.
   Sirve para personal, cuentas de empresa/supervisor y estudiantes. El bloqueo real está en la base de datos
   (inhabilitar-usuarios-etapa20.sql): esta pantalla solo muestra el estado y llama a admin_set_activo. */

let inhabMapa = {}, inhabDisponible = false;

async function inhabCargar(){
  try{
    const { data, error } = await sb.rpc('admin_inhabilitados');
    if(error) throw error;
    inhabMapa = {}; (data || []).forEach(r=>{ inhabMapa[r.tipo + ':' + r.ref] = r; });
    inhabDisponible = true;
  }catch(e){ inhabMapa = {}; inhabDisponible = false; }     // aún no se ejecutó el SQL de la etapa 20
}
function inhabEsta(tipo, ref){ return !!inhabMapa[tipo + ':' + ref]; }
function inhabInfo(tipo, ref){ return inhabMapa[tipo + ':' + ref] || null; }
function inhabPermiso(tipo, rol){
  if(typeof puede !== 'function') return true;
  if(tipo === 'personal') return puede('solo_admin');
  if(tipo === 'estudiante') return puede('est_registrados');
  return rol === 'supervisor' ? puede('sup_usuarios') : (puede('emp_cupos') || puede('emp_ca'));
}
function inhabBadge(tipo, ref){
  const i = inhabInfo(tipo, ref); if(!i) return '';
  const f = i.desde ? new Date(i.desde).toLocaleDateString('es-CO', { timeZone:'America/Bogota' }) : '';
  const t = 'Inhabilitado' + (f ? ' el ' + f : '') + (i.motivo ? ' · ' + i.motivo : '');
  return ' <span class="inhab-badge" title="' + esc(t) + '">Inhabilitado</span>';
}
function inhabBoton(tipo, ref, nombre, rol){
  if(!inhabDisponible || !inhabPermiso(tipo, rol)) return '';
  const des = inhabEsta(tipo, ref);
  return '<button class="ghost inhab-btn" style="padding:5px 9px;font-size:12px;" data-t="' + esc(tipo) + '" data-r="' + esc(ref) + '" data-n="' + esc(nombre || '') + '" data-d="' + (des ? '1' : '0') +
         '" onclick="event.stopPropagation();inhabCambiar(this)">' + (des ? 'Habilitar' : 'Inhabilitar') + '</button>';
}
async function inhabCambiar(btn){
  if(!requireSupabase()) return;
  const tipo = btn.dataset.t, ref = btn.dataset.r, nombre = btn.dataset.n || ref, estaInhab = btn.dataset.d === '1';
  let motivo = '';
  if(estaInhab){
    if(!confirm('¿Habilitar de nuevo a ' + nombre + '? Podrá volver a ingresar.')) return;
  } else {
    const m = prompt('Vas a inhabilitar a «' + nombre + '».\nNo podrá ingresar, pero todo lo que ya hizo se conserva y podrás habilitarlo de nuevo cuando quieras.\n\nMotivo (opcional):', '');
    if(m === null) return;
    motivo = m.trim();
  }
  btn.disabled = true;
  const { error } = await sb.rpc('admin_set_activo', { p_tipo: tipo, p_ref: ref, p_activo: estaInhab, p_motivo: motivo });
  if(error){ btn.disabled = false; toast('No se pudo cambiar: ' + error.message, true); return; }
  toast(estaInhab ? 'Usuario habilitado' : 'Usuario inhabilitado');
  if(tipo === 'personal' && typeof renderAdminsList === 'function') renderAdminsList();
  else if(tipo === 'cuenta' && typeof renderRoleAccounts === 'function') renderRoleAccounts();
  else if(tipo === 'estudiante' && typeof renderAdminList === 'function') renderAdminList();
}

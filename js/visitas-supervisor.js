/* ============================= MIS VISITAS ASIGNADAS (supervisor) =============================
   Al entrar como supervisor se ve la lista de estudiantes que el supervisor general le asignó. Mientras una visita está a su cargo,
   ningún otro supervisor puede abrir a ese estudiante (lo impone la base de datos). Al terminar, «Finalizar seguimiento» la cierra.
   Requiere visitas-supervisor-general-etapa25.sql. */
let svVisitas = [];

function svTarjeta(){
  let c = document.getElementById('svVisitasCard');
  if(!c){
    const lk = document.getElementById('screen-lookup'); if(!lk) return null;
    c = document.createElement('div'); c.className = 'card'; c.id = 'svVisitasCard';
    const form = lk.querySelector('.card'); form.parentNode.insertBefore(c, form.nextSibling);
  }
  return c;
}
async function svCargar(){
  if(typeof state === 'undefined' || state.role !== 'supervisor' || !state.token) return;
  const c = svTarjeta(); if(!c) return;
  c.style.display = 'block';
  c.innerHTML = '<div class="section-bar deep">Mis visitas asignadas</div><p style="color:var(--muted)">Cargando…</p>';
  const { data, error } = await sb.rpc('sup_mis_visitas', { p_token: state.token });
  if(error){ c.innerHTML = '<div class="section-bar deep">Mis visitas asignadas</div><p style="color:var(--muted);font-size:13px;">No se pudo cargar la lista (' + esc(error.message) + ').</p>'; return; }
  svVisitas = data || [];
  const f = iso => new Date(iso).toLocaleDateString('es-CO', { timeZone:'America/Bogota', day:'2-digit', month:'2-digit', year:'numeric' });
  c.innerHTML = '<div class="section-bar deep">Mis visitas asignadas</div>' + (svVisitas.length
    ? '<p class="helptext">Estos estudiantes están bajo tu responsabilidad: ningún otro supervisor puede ver su información mientras la visita esté asignada a ti.</p><div class="cupos-wrap"><table class="cupos-table"><thead><tr><th>Estudiante</th><th>Modalidad</th><th>Lugar de prácticas</th><th>Asignada</th><th></th></tr></thead><tbody>' +
      svVisitas.map((v,i)=>`<tr><td><b>${esc(v.nombre || '')}</b><br><span class="aud-ref">Doc. ${esc(v.documento)}</span>${v.nota ? '<br><i>' + esc(v.nota) + '</i>' : ''}</td>
        <td>${esc(v.modalidad)}</td><td>${esc(v.sitio || '—')}</td><td class="aud-nw">${f(v.asignada)}</td>
        <td><button class="primary" onclick="svAbrir(${i})">Abrir</button> <button class="ghost" onclick="svFinalizar(${i})">Finalizar seguimiento</button></td></tr>`).join('') + '</tbody></table></div>'
    : '<p style="color:var(--muted);font-size:13.5px;">No tienes visitas asignadas por ahora. Cuando el supervisor general te asigne una, la verás aquí y recibirás un correo.</p>');
}
function svAbrir(i){ document.getElementById('lookupDoc').value = svVisitas[i].documento; doLookup(); }
async function svFinalizar(i){
  const v = svVisitas[i];
  if(!confirm('¿Finalizar el seguimiento de ' + v.nombre + '?\nEl estudiante quedará liberado: ya no figurará en tu lista.')) return;
  const { error } = await sb.rpc('sup_visita_finalizar', { p_token: state.token, p_documento: v.documento });
  if(error){ toast(error.message, true); return; }
  toast('Seguimiento finalizado'); svCargar();
}
(function(){
  if(typeof goRole !== 'function') return;
  const _go = goRole;
  goRole = function(role){
    const r = _go.apply(this, arguments);
    const c = document.getElementById('svVisitasCard');
    if(role === 'supervisor') setTimeout(svCargar, 0); else if(c) c.style.display = 'none';
    return r;
  };
})();

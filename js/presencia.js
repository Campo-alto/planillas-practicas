/* ============================= EN LÍNEA AHORA =============================
   1) Señal de presencia: mientras la plataforma está abierta y visible, se avisa al servidor cada minuto que la persona sigue conectada.
      Solo viaja el token de sesión (o la sesión del personal); no se envía ni se guarda IP, ubicación, páginas ni lo que se escribe.
   2) Pantalla «Quién está en línea» (solo Administrador): lista a quienes enviaron señal en los últimos 3 minutos. Requiere en-linea-etapa67.sql. */
(function(){
  const CADA = 60000;
  async function latido(){
    try{
      if(document.visibilityState === 'hidden') return;
      if(typeof sb === 'undefined' || !sb) return;
      if(typeof state !== 'undefined' && state && state.token){ await sb.rpc('presencia_ping', { p_token: state.token }); return; }
      if(document.getElementById('screen-admin-hub')){
        const { data } = await sb.auth.getSession();
        if(data && data.session) await sb.rpc('presencia_ping_personal');
      }
    }catch(_){}
  }
  setTimeout(latido, 4000);
  setInterval(latido, CADA);
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'visible') latido(); });
})();

/* ---------- Pantalla del administrador ---------- */
let elDatos = null, elTimer = null;
const EL_GRUPOS = [['personal', '🏛️ Personal de la institución'], ['supervisor', '🧭 Supervisores'], ['profesor', '🎓 Profesores'], ['empresa', '🏢 Empresas'], ['estudiante', '🎓 Estudiantes']];
function elPantalla(){
  let el = document.getElementById('screen-admin-enlinea');
  if(!el){
    const ref = document.getElementById('screen-admin-hub') || document.querySelector('.screen'); if(!ref) return null;
    el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-enlinea'; ref.parentNode.appendChild(el);
  }
  return el;
}
async function abrirEnLinea(){
  if(typeof requireSupabase === 'function' && !requireSupabase()) return;
  const el = elPantalla(); if(!el) return;
  el.innerHTML = '<button class="linkbtn" onclick="enLineaCerrar()">← Volver al panel</button><p style="color:var(--muted)">Cargando…</p>';
  showScreen('screen-admin-enlinea');
  await elCargar();
  clearInterval(elTimer);
  elTimer = setInterval(()=>{ const e = document.getElementById('screen-admin-enlinea'); if(!e || !e.classList.contains('active')){ clearInterval(elTimer); return; } elCargar(); }, 30000);
}
function enLineaCerrar(){ clearInterval(elTimer); showScreen('screen-admin-hub'); }
async function elCargar(){
  const el = elPantalla(); if(!el) return;
  const { data, error } = await sb.rpc('admin_en_linea');
  if(error){ el.innerHTML = '<button class="linkbtn" onclick="enLineaCerrar()">← Volver al panel</button><p style="color:var(--danger)">No se pudo cargar: ' + esc(error.message) + ' (¿ejecutaste en-linea-etapa67.sql?)</p>'; return; }
  elDatos = data; elPintar();
}
function elHace(s){ return s < 45 ? 'ahora' : s < 3600 ? 'hace ' + Math.max(1, Math.round(s / 60)) + ' min' : 'hace ' + Math.round(s / 3600) + ' h'; }
function elHora(t){ try{ return new Date(t).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }catch(_){ return ''; } }
function elPintar(){
  const el = elPantalla(); if(!el || !elDatos) return;
  const ps = (elDatos.personas || []).map(p=>Object.assign({}, p, { g: (p.tipo === 'empresa_ca' ? 'empresa' : p.tipo) }));
  const hoy = elDatos.hoy || {}; const hoyTotal = Object.keys(hoy).reduce((a, k)=>a + (hoy[k] || 0), 0);
  const chips = EL_GRUPOS.map(g=>{ const n = ps.filter(p=>p.g === g[0]).length; return '<span class="el-chip' + (n ? ' on' : '') + '"><b>' + n + '</b> ' + esc(g[1].replace(/^\S+\s/, '')) + '</span>'; }).join('');
  const bloques = EL_GRUPOS.map(g=>{
    const lista = ps.filter(p=>p.g === g[0]); if(!lista.length) return '';
    return '<div class="card"><div class="section-bar deep">' + esc(g[1]) + ' (' + lista.length + ')</div><div class="tbl-wrap"><table class="el-tabla"><thead><tr><th>Nombre</th><th>Rol</th><th>' + (g[0] === 'estudiante' ? 'Documento' : 'Correo') + '</th><th>Conectado desde</th><th>Última señal</th></tr></thead><tbody>' +
      lista.map(p=>'<tr><td><span class="el-dot"></span> <b>' + esc(p.nombre || '—') + '</b></td><td>' + esc(p.detalle) + '</td><td>' + esc(p.ref) + '</td><td>' + esc(elHora(p.desde)) + '</td><td>' + esc(elHace(p.hace_seg)) + '</td></tr>').join('') + '</tbody></table></div></div>';
  }).join('');
  el.innerHTML = '<button class="linkbtn" onclick="enLineaCerrar()">← Volver al panel</button>' +
    '<h2 style="margin:12px 0 4px;">Quién está en línea</h2>' +
    '<p class="helptext" style="text-align:justify;">Personas que tienen la plataforma abierta en pantalla ahora mismo (enviaron señal en los últimos 3 minutos). Se actualiza sola cada 30 segundos. ' +
    'No se guarda IP, ubicación ni lo que hacen: solo nombre, rol y hora.</p>' +
    '<div class="el-resumen"><div class="el-total"><b>' + ps.length + '</b><span>en línea ahora</span></div><div class="el-chips">' + chips + '</div>' +
    '<div class="el-hoy">Hoy han ingresado <b>' + hoyTotal + '</b> personas</div><button class="ghost" onclick="elCargar()">↻ Actualizar</button></div>' +
    (bloques || '<div class="card"><p class="helptext" style="margin:0;">Nadie más está en línea en este momento.</p></div>');
}

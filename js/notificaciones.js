/* ============================= NOTIFICACIONES (campana 🔔) =============================
   Muestra, dentro de la plataforma, todo lo que ocurre en el proceso de contrato de aprendizaje para el estudiante,
   la empresa de contrato de aprendizaje y la institución. Requiere notificaciones-ca-etapa34.sql.
   Las notificaciones se leen con la sesión (token) de cada quien: nadie ve las de otro. */
let ntUltimo = 0, ntLista = [], ntNoLeidas = 0, ntTimer = null;
function ntRol(){
  if(typeof state === 'undefined' || !state) return '';
  if(state.role === 'estudiante' && state.token) return 'est';
  if(state.role === 'empresa_ca' && state.token) return 'emp';
  // el administrador puede llegar al panel con sesión ya abierta (state.role vacío): se detecta por la pantalla
  const lg = document.getElementById('screen-admin-login');
  if(document.getElementById('screen-admin-hub') && (!state.role || state.role === 'administrador') && !(lg && lg.classList.contains('active')) && !document.getElementById('screen-reset-password')?.classList.contains('active')) return 'adm';
  return '';
}
async function ntCargar(avisar){
  const rol = ntRol(); const b = document.getElementById('ntBell');
  if(!rol || typeof sb === 'undefined' || !sb){ if(b) b.style.display = 'none'; return; }
  try{
    const r = rol === 'adm' ? await sb.rpc('admin_notif_mias') : await sb.rpc('notif_mias', { p_token: state.token });
    if(r.error || !r.data) { if(b) b.style.display = 'none'; return; }
    ntLista = r.data.lista || []; ntNoLeidas = r.data.no_leidas || 0;
    const nuevo = ntLista.length ? ntLista[0].id : 0;
    if(avisar && ntUltimo && nuevo > ntUltimo){ const n = ntLista.find(x=>x.id > ntUltimo && !x.leida); if(n && typeof toast === 'function') toast('🔔 ' + n.titulo); }
    ntUltimo = Math.max(ntUltimo, nuevo); ntPintarBell();
  }catch(_){ if(b) b.style.display = 'none'; }
}
function ntPintarBell(){
  let b = document.getElementById('ntBell');
  if(!b){
    b = document.createElement('button'); b.id = 'ntBell'; b.type = 'button'; b.setAttribute('aria-label', 'Notificaciones');
    b.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:900;width:54px;height:54px;border-radius:50%;border:1px solid var(--line,#ddd);background:var(--teal,#357b84);color:#fff;font-size:22px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);';
    b.onclick = ntAbrir; document.body.appendChild(b);
  }
  b.style.display = ntRol() ? '' : 'none';
  b.innerHTML = '🔔' + (ntNoLeidas ? '<span style="position:absolute;top:-4px;right:-4px;background:#c0392b;color:#fff;border-radius:11px;min-width:22px;height:22px;font-size:12px;line-height:22px;font-weight:700;">' + (ntNoLeidas > 99 ? '99+' : ntNoLeidas) + '</span>' : '');
}
function ntCerrar(){ const m = document.getElementById('ntModal'); if(m) m.remove(); }
async function ntAbrir(){
  ntCerrar(); const esc2 = typeof esc === 'function' ? esc : (t=>String(t).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const m = document.createElement('div'); m.id = 'ntModal'; m.className = 'home-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
  m.innerHTML = '<div class="home-modal-box" style="max-width:520px;width:94%;max-height:80vh;overflow:auto;"><div class="home-modal-head"><span class="home-modal-ico">🔔</span><h3>Notificaciones</h3></div>' +
    (ntLista.length ? ntLista.map(n=>'<div style="padding:10px 4px;border-bottom:1px solid var(--line,#e5e0d5);' + (n.leida ? 'opacity:.7' : '') + '"><div style="font-weight:600;font-size:14px;">' + (n.leida ? '' : '<span style="color:#c0392b">● </span>') + esc2(n.titulo) + '</div><div style="font-size:13px;color:var(--muted,#666);margin-top:2px;">' + esc2(n.mensaje) + '</div><div style="font-size:11.5px;color:var(--muted,#888);margin-top:2px;">' + new Date(n.creado).toLocaleString('es-CO') + '</div></div>').join('') : '<p class="helptext">Aún no tienes notificaciones.</p>') +
    '<div class="home-modal-acc"><button class="primary" type="button" onclick="ntCerrar()">Cerrar</button></div></div>';
  document.body.appendChild(m); m.addEventListener('click', e=>{ if(e.target === m) ntCerrar(); });
  if(ntNoLeidas){
    try{ if(ntRol() === 'adm') await sb.rpc('admin_notif_leidas'); else await sb.rpc('notif_leidas', { p_token: state.token }); }catch(_){}
    ntNoLeidas = 0; ntPintarBell();
  }
}
// arranca cuando hay sesión; revisa cada 45 s y después de cada acción
(function(){
  const tick = ()=>{ if(ntRol()) ntCargar(true); else { const b = document.getElementById('ntBell'); if(b) b.style.display = 'none'; ntUltimo = 0; } };
  ntTimer = setInterval(tick, 45000);
  setInterval(()=>{ if(ntRol() && !document.getElementById('ntBell')) ntCargar(false); }, 2000);
  window.addEventListener('focus', tick);
  if(typeof caRpc === 'function'){ const _c = caRpc; caRpc = async function(){ const r = await _c.apply(this, arguments); setTimeout(tick, 1200); return r; }; }
})();

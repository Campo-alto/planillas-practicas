/* ============================= CHAT DEL PANEL DE ADMINISTRADOR =============================
   Mensajes entre el personal (canal «Equipo» y mensajes directos) y con estudiantes, empresas y supervisores.
   Cada quien ve solo lo que su rol permite («Roles y permisos → Comunicación»). El administrador puede apagar el chat de
   un grupo completo, bloquear a una persona y eliminar mensajes. Requiere chat-etapa56.sql.
   SEGURIDAD: aquí solo se pinta; la base de datos valida sesión, permiso, bloqueos y límites en cada llamada.
   Todo texto se muestra escapado (nunca se interpreta como HTML). Los mensajes nuevos se consultan cada pocos segundos. */
let chCfg = null, chHilos = [], chInt = false, chExt = false, chYo = null, chAct = null, chActMeta = null, chUltimoMsg = 0;
let chTab = 'equipo', chTimer = null, chBadgeTimer = null, chAbriendo = false, chEnvio = false, chRes = [], chDir = null;
window.chatNoLeidos = 0;

const chE = s => (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const chHora = x => { try{ return new Date(x).toLocaleString('es-CO', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }); }catch(_){ return ''; } };
window.chatPuede = function(){ return typeof puede === 'function' && (puede('chat_interno') || puede('chat_externo')); };

function chEstilos(){
  if(document.getElementById('chEstilos')) return;
  const s = document.createElement('style'); s.id = 'chEstilos';
  s.textContent = `
  .ch-wrap{display:grid;grid-template-columns:320px 1fr;gap:14px;align-items:stretch;min-height:520px;}
  .ch-col{background:var(--card,#fff);border:1px solid var(--line,#DFD9C9);border-radius:12px;display:flex;flex-direction:column;min-height:0;overflow:hidden;}
  .ch-tabs{display:flex;flex-wrap:wrap;gap:6px;padding:10px;border-bottom:1px solid var(--line,#DFD9C9);}
  .ch-tab{border:1px solid var(--line,#DFD9C9);background:#fff;color:var(--ink,#22282B);border-radius:16px;padding:5px 11px;font:600 12.5px/1.2 inherit;cursor:pointer;}
  .ch-tab.act{background:var(--teal,#0E7C86);border-color:var(--teal,#0E7C86);color:#fff;}
  .ch-tab b{background:#C75B16;color:#fff;border-radius:9px;padding:0 6px;margin-left:5px;font-size:11px;}
  .ch-lista{overflow:auto;flex:1;max-height:560px;}
  .ch-hilo{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #EFEADC;background:#fff;padding:10px 12px;cursor:pointer;font:inherit;}
  .ch-hilo:hover,.ch-hilo.act{background:#EAF4F4;}
  .ch-hilo .t{font-weight:700;font-size:13.5px;display:flex;justify-content:space-between;gap:8px;}
  .ch-hilo .u{font-size:12.5px;color:var(--muted,#767066);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
  .ch-hilo .n{background:#C75B16;color:#fff;border-radius:10px;min-width:20px;height:20px;line-height:20px;font-size:11.5px;text-align:center;padding:0 6px;flex:none;}
  .ch-hilo .blq{font-size:11px;color:#B23A2E;font-weight:700;}
  .ch-cab{padding:10px 14px;border-bottom:1px solid var(--line,#DFD9C9);display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
  .ch-cab h3{margin:0;font-size:15px;flex:1;min-width:140px;}
  .ch-msgs{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#FBF9F4;min-height:300px;max-height:460px;}
  .ch-m{max-width:78%;padding:8px 11px;border-radius:12px;font-size:14px;line-height:1.35;background:#fff;border:1px solid #E6E0D0;align-self:flex-start;word-wrap:break-word;overflow-wrap:anywhere;}
  .ch-m.mio{align-self:flex-end;background:#DCF0EE;border-color:#B8DDD9;}
  .ch-m .a{font-size:11.5px;font-weight:700;color:var(--teal-dark,#0A5A62);margin-bottom:2px;}
  .ch-m .tx{white-space:pre-wrap;}
  .ch-m .h{font-size:10.5px;color:var(--muted,#767066);margin-top:3px;display:flex;gap:8px;justify-content:flex-end;}
  .ch-m.el .tx{font-style:italic;color:var(--muted,#767066);}
  .ch-m .x{border:0;background:none;cursor:pointer;color:#B23A2E;font-size:11px;padding:0;}
  .ch-comp{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line,#DFD9C9);align-items:flex-end;}
  .ch-comp textarea{flex:1;resize:none;min-height:42px;max-height:120px;border:1px solid var(--line,#DFD9C9);border-radius:10px;padding:8px 10px;font:inherit;}
  .ch-aviso{padding:8px 14px;background:#FCEBE8;color:#8C2E24;font-size:12.5px;border-bottom:1px solid #F1C9C3;}
  .ch-vacio{padding:26px 16px;color:var(--muted,#767066);text-align:center;font-size:13.5px;}
  .ch-lis2{max-height:260px;overflow:auto;margin-top:8px;border:1px solid var(--line,#DFD9C9);border-radius:10px;}
  .ch-atras{display:none;}
  @media (max-width:820px){ .ch-atras{display:inline;} .ch-wrap{grid-template-columns:1fr;} .ch-wrap.ch-abierto .ch-izq{display:none;} .ch-wrap:not(.ch-abierto) .ch-der{display:none;} .ch-m{max-width:92%;} }
  `;
  document.head.appendChild(s);
}

function chPantalla(){
  let el = document.getElementById('screen-admin-chat');
  if(!el){
    const ref = document.getElementById('screen-admin-hub') || document.querySelector('.screen'); if(!ref) return null;
    el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-chat'; ref.parentNode.appendChild(el);
  }
  return el;
}
function chActiva(){ const el = document.getElementById('screen-admin-chat'); return !!(el && el.classList.contains('active')); }
function chErr(e){ const m = (e && e.message) || String(e); toast(/does not exist|Could not find/i.test(m) ? 'Falta ejecutar chat-etapa56.sql en Supabase.' : m, true); }

/* ---------- Abrir la pantalla ---------- */
async function abrirChat(){
  if(!requireSupabase()) return;
  chEstilos();
  const el = chPantalla(); if(!el) return;
  el.innerHTML = '<p style="color:var(--muted)">Cargando…</p>'; showScreen('screen-admin-chat');
  chAct = null; chActMeta = null; chUltimoMsg = 0;
  const r = await sb.rpc('chat_hilos_mios');
  if(r.error){
    el.innerHTML = '<button class="linkbtn" onclick="showScreen(\'screen-admin-hub\')">← Volver al panel</button><p style="color:var(--danger)">No se pudo abrir el chat: ' + chE(r.error.message) + (/does not exist|Could not find/i.test(r.error.message) ? ' (¿ejecutaste chat-etapa56.sql?)' : '') + '</p>'; return;
  }
  chInt = !!r.data.interno; chExt = !!r.data.externo; chYo = r.data.yo; chHilos = r.data.hilos || [];
  chTab = chInt ? 'equipo' : 'estudiante';
  try{ const c = await sb.rpc('chat_config_get'); chCfg = c.error ? null : c.data; }catch(_){ chCfg = null; }
  el.innerHTML = `<button class="linkbtn" onclick="chSalir()">← Volver al panel</button>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 4px;"><h2 style="margin:0;flex:1;">Mensajes</h2>
      <button class="primary" type="button" onclick="chNueva()">＋ Nueva conversación</button>
      ${chCfg && chCfg.puede_cambiar ? '<button class="ghost" type="button" onclick="chOpciones()">⚙ Opciones del chat</button>' : ''}</div>
    <p class="helptext">Escribe al equipo o a una persona del personal${chExt ? ', y atiende los mensajes de estudiantes, empresas y supervisores' : ''}. Los mensajes se muestran solo dentro de la plataforma (no se envían por correo).</p>
    <div class="ch-wrap" id="chWrap">
      <div class="ch-col ch-izq"><div class="ch-tabs" id="chTabs"></div><div class="ch-lista" id="chLista"></div></div>
      <div class="ch-col ch-der" id="chDer"><div class="ch-vacio">Elige una conversación de la lista o crea una nueva.</div></div>
    </div>`;
  chPintarLista();
  if(chInt){ const eq = chHilos.find(h=>h.tipo === 'equipo'); if(eq && window.innerWidth > 820) chAbrirHilo(eq.id); }
  chArrancarTimer();
  chBadge();
}
window.chSalir = function(){ chParar(); showScreen('screen-admin-hub'); };
function chParar(){ if(chTimer){ clearInterval(chTimer); chTimer = null; } }
function chArrancarTimer(){
  chParar();
  chTimer = setInterval(async ()=>{
    if(!chActiva() || document.hidden){ if(!chActiva()) chParar(); return; }
    await chRefrescarLista();
    if(chAct) chCargarMsgs(true);
  }, 7000);
}

/* ---------- Lista de conversaciones ---------- */
async function chRefrescarLista(){
  const r = await sb.rpc('chat_hilos_mios'); if(r.error || !r.data) return;
  chHilos = r.data.hilos || []; chPintarLista();
}
function chTabDe(h){ return h.tipo === 'externo' ? (h.ext_tipo === 'estudiante' ? 'estudiante' : h.ext_tipo === 'supervisor' ? 'supervisor' : 'empresa') : 'equipo'; }
function chPintarLista(){
  const tabs = document.getElementById('chTabs'), lista = document.getElementById('chLista'); if(!tabs || !lista) return;
  const def = [['equipo', 'Equipo', chInt], ['estudiante', 'Estudiantes', chExt], ['empresa', 'Empresas', chExt], ['supervisor', 'Supervisores', chExt]].filter(t=>t[2]);
  if(!def.some(t=>t[0] === chTab) && def.length) chTab = def[0][0];
  tabs.innerHTML = def.map(t=>{ const n = chHilos.filter(h=>chTabDe(h) === t[0]).reduce((a, h)=>a + Number(h.no_leidos || 0), 0);
    return '<button type="button" class="ch-tab' + (chTab === t[0] ? ' act' : '') + '" onclick="chTab=\'' + t[0] + '\';chPintarLista()">' + t[1] + (n ? '<b>' + n + '</b>' : '') + '</button>'; }).join('');
  const hs = chHilos.filter(h=>chTabDe(h) === chTab);
  lista.innerHTML = hs.length ? hs.map(h=>'<button type="button" class="ch-hilo' + (h.id === chAct ? ' act' : '') + '" data-id="' + chE(h.id) + '" onclick="chAbrirHilo(this.dataset.id)">' +
      '<div class="t"><span>' + chE(h.titulo || '') + (h.bloqueado ? ' <span class="blq">· bloqueado</span>' : '') + '</span>' + (Number(h.no_leidos) ? '<span class="n">' + h.no_leidos + '</span>' : '') + '</div>' +
      '<div class="u">' + (h.ultimo_texto ? chE((h.ultimo_autor ? h.ultimo_autor + ': ' : '') + h.ultimo_texto) : '<i>Sin mensajes todavía</i>') + '</div></button>').join('')
    : '<div class="ch-vacio">' + (chTab === 'equipo' ? 'Aún no tienes conversaciones. Usa «＋ Nueva conversación».' : 'Aún no hay conversaciones aquí. Se crean cuando alguien escribe, o con «＋ Nueva conversación».') + '</div>';
}

/* ---------- Una conversación ---------- */
window.chAbrirHilo = async function(id){
  if(chAbriendo) return; chAbriendo = true;
  try{
    chAct = id; chUltimoMsg = 0; chActMeta = null;
    const h = chHilos.find(x=>x.id === id); if(h) chTab = chTabDe(h);
    const w = document.getElementById('chWrap'); if(w) w.classList.add('ch-abierto');
    await chCargarMsgs(false);
    chPintarLista();
  } finally { chAbriendo = false; }
};
async function chCargarMsgs(silencioso){
  if(!chAct) return;
  const id = chAct;
  const r = await sb.rpc('chat_mensajes_staff', { p_hilo: id, p_desde: silencioso ? chUltimoMsg : 0 });
  if(id !== chAct) return;                         // cambió de conversación mientras cargaba
  if(r.error){ if(!silencioso) chErr(r.error); return; }
  const d = r.data || {}; const nuevos = d.mensajes || [];
  const primera = !document.getElementById('chMsgs');
  chActMeta = { tipo: d.tipo, ext_tipo: d.ext_tipo, bloqueado: !!d.bloqueado, titulo: d.titulo };
  if(primera || !silencioso){ chPintarMarco(); }
  else { const av = document.getElementById('chAviso'); if(av) av.style.display = chActMeta.bloqueado ? '' : 'none'; }
  const box = document.getElementById('chMsgs'); if(!box) return;
  if(!silencioso) box.innerHTML = '';
  if(silencioso && !nuevos.length) return;
  const abajo = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  const vacio = box.querySelector('.ch-vacio'); if(vacio) vacio.remove();
  const admin = !!(chCfg && chCfg.puede_cambiar);
  nuevos.forEach(m=>{ if(m.id > chUltimoMsg) chUltimoMsg = m.id;
    const div = document.createElement('div'); div.className = 'ch-m' + (m.mio ? ' mio' : '') + (m.eliminado ? ' el' : ''); div.id = 'chm' + m.id;
    div.innerHTML = (m.mio ? '' : '<div class="a">' + chE(m.autor_nombre || '') + (m.autor_tipo !== 'staff' && chActMeta.tipo === 'externo' ? '' : '') + '</div>') +
      '<div class="tx">' + chE(m.texto) + '</div><div class="h">' + (admin && !m.eliminado ? '<button type="button" class="x" title="Eliminar mensaje" onclick="chEliminar(' + Number(m.id) + ')">🗑 Eliminar</button>' : '') + '<span>' + chHora(m.creado) + '</span></div>';
    box.appendChild(div); });
  if(!box.children.length) box.innerHTML = '<div class="ch-vacio">Aún no hay mensajes. Escribe el primero.</div>';
  if(!silencioso || abajo) box.scrollTop = box.scrollHeight;
  if(!silencioso && nuevos.length === 0){ /* nada */ }
  chBadge();
}
function chPintarMarco(){
  const der = document.getElementById('chDer'); if(!der) return;
  const m = chActMeta || {}; const externo = m.tipo === 'externo';
  der.innerHTML = '<div class="ch-cab"><button type="button" class="linkbtn ch-atras" onclick="chAtras()">← Lista</button><h3>' + chE(m.titulo || '') + (externo ? ' <span style="font-weight:400;font-size:12px;color:var(--muted)">· ' + chE(m.ext_tipo === 'estudiante' ? 'Estudiante' : m.ext_tipo === 'supervisor' ? 'Supervisor' : 'Empresa') + '</span>' : '') + '</h3>' +
    (externo && chExt ? '<button type="button" class="ghost" onclick="chBloquear()">' + (m.bloqueado ? '🔓 Desbloquear' : '🚫 Bloquear') + '</button>' : '') + '</div>' +
    '<div class="ch-aviso" id="chAviso" style="' + (m.bloqueado ? '' : 'display:none') + '">🚫 Esta persona puede leer sus mensajes pero no puede escribir.</div>' +
    '<div class="ch-msgs" id="chMsgs" aria-live="polite"></div>' +
    '<div class="ch-comp"><textarea id="chTxt" maxlength="1500" rows="1" placeholder="Escribe un mensaje… (Enter envía, Shift+Enter salto de línea)"></textarea><button class="primary" type="button" id="chBtn" onclick="chEnviar()">Enviar</button></div>';
  const t = document.getElementById('chTxt');
  t.addEventListener('keydown', ev=>{ if(ev.key === 'Enter' && !ev.shiftKey){ ev.preventDefault(); chEnviar(); } });
}
window.chAtras = function(){ const w = document.getElementById('chWrap'); if(w) w.classList.remove('ch-abierto'); };
window.chEnviar = async function(){
  if(chEnvio || !chAct) return;
  const t = document.getElementById('chTxt'); const txt = t ? t.value.trim() : ''; if(!txt) return;
  chEnvio = true; const b = document.getElementById('chBtn'); if(b) b.disabled = true;
  try{
    const r = await sb.rpc('chat_enviar_staff', { p_hilo: chAct, p_texto: txt });
    if(r.error){ chErr(r.error); return; }
    t.value = ''; await chCargarMsgs(true); chRefrescarLista();
  }catch(e){ chErr(e); }
  finally{ chEnvio = false; if(b) b.disabled = false; if(t) t.focus(); }
};
window.chEliminar = async function(id){
  if(!confirm('¿Eliminar este mensaje? Quedará como «mensaje eliminado» y se registra en la auditoría.')) return;
  const r = await sb.rpc('chat_msg_eliminar', { p_id: id }); if(r.error){ chErr(r.error); return; }
  const box = document.getElementById('chm' + id);
  if(box){ box.classList.add('el'); const tx = box.querySelector('.tx'); if(tx) tx.textContent = '(mensaje eliminado)'; const x = box.querySelector('.x'); if(x) x.remove(); }
  toast('Mensaje eliminado.');
};

/* ---------- Ventanas ---------- */
function chModal(html){
  chModalCerrar();
  const m = document.createElement('div'); m.id = 'chModal'; m.className = 'home-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
  m.innerHTML = '<div class="home-modal-box" style="max-width:520px;width:94%;max-height:86vh;overflow:auto;">' + html + '</div>';
  m.addEventListener('click', ev=>{ if(ev.target === m) chModalCerrar(); });
  document.body.appendChild(m); return m;
}
window.chModalCerrar = function(){ const m = document.getElementById('chModal'); if(m) m.remove(); };

window.chBloquear = function(){
  if(!chAct || !chActMeta) return;
  if(chActMeta.bloqueado){
    chModal('<div class="home-modal-head"><span class="home-modal-ico">🔓</span><h3>Desbloquear el chat</h3></div><p class="helptext">' + chE(chActMeta.titulo) + ' podrá volver a escribir.</p><div class="home-modal-acc"><button class="ghost" type="button" onclick="chModalCerrar()">Cancelar</button><button class="primary" type="button" onclick="chBloquearOk(false)">Desbloquear</button></div>');
  } else {
    chModal('<div class="home-modal-head"><span class="home-modal-ico">🚫</span><h3>Bloquear el chat</h3></div><p class="helptext"><b>' + chE(chActMeta.titulo) + '</b> podrá leer lo que ya se escribió, pero no podrá enviar mensajes. Queda registrado en la auditoría.</p><div class="field"><label>Motivo (opcional, solo lo ve el personal)</label><input id="chMotivo" maxlength="300"></div><div class="home-modal-acc"><button class="ghost" type="button" onclick="chModalCerrar()">Cancelar</button><button class="primary" type="button" onclick="chBloquearOk(true)">Bloquear</button></div>');
  }
};
window.chBloquearOk = async function(bloq){
  const motivo = bloq ? ((document.getElementById('chMotivo') || {}).value || '') : '';
  const r = await sb.rpc('chat_hilo_bloquear', { p_hilo: chAct, p_bloquear: bloq, p_motivo: motivo });
  if(r.error){ chErr(r.error); return; }
  chModalCerrar(); toast(bloq ? 'Chat bloqueado para esta persona.' : 'Chat desbloqueado.');
  await chCargarMsgs(false); chRefrescarLista();
};

window.chOpciones = async function(){
  const r = await sb.rpc('chat_config_get'); if(r.error){ chErr(r.error); return; }
  const c = r.data || {};
  chModal('<div class="home-modal-head"><span class="home-modal-ico">⚙</span><h3>Opciones del chat</h3></div><p class="helptext">Activa o apaga el chat para todo un grupo. Si lo apagas, esas personas dejan de poder escribir (siguen viendo lo anterior). Para bloquear a una sola persona usa «🚫 Bloquear» dentro de su conversación.</p>' +
    '<label class="cor-op"><input type="checkbox" id="chOpE" ' + (c.estudiantes ? 'checked' : '') + '> Chat habilitado para <b>estudiantes</b></label>' +
    '<label class="cor-op"><input type="checkbox" id="chOpM" ' + (c.empresas ? 'checked' : '') + '> Chat habilitado para <b>empresas</b> (prácticas y contrato de aprendizaje)</label>' +
    '<label class="cor-op"><input type="checkbox" id="chOpS" ' + (c.supervisores ? 'checked' : '') + '> Chat habilitado para <b>supervisores</b></label>' +
    '<div class="home-modal-acc"><button class="ghost" type="button" onclick="chModalCerrar()">Cancelar</button><button class="primary" type="button" onclick="chOpcionesOk()">Guardar</button></div>');
};
window.chOpcionesOk = async function(){
  const g = id => !!(document.getElementById(id) || {}).checked;
  const r = await sb.rpc('chat_config_set', { p_estudiantes: g('chOpE'), p_empresas: g('chOpM'), p_supervisores: g('chOpS') });
  if(r.error){ chErr(r.error); return; }
  chModalCerrar(); toast('Opciones del chat guardadas.');
};

/* ---------- Nueva conversación ---------- */
window.chNueva = function(){
  const tabs = [['personal', 'Personal', chInt], ['estudiante', 'Estudiante', chExt], ['empresa', 'Empresa', chExt], ['supervisor', 'Supervisor', chExt]].filter(t=>t[2]);
  if(!tabs.length) return;
  chModal('<div class="home-modal-head"><span class="home-modal-ico">💬</span><h3>Nueva conversación</h3></div><div class="ch-tabs" id="chNTabs" style="padding:0 0 8px;border:0;">' +
    tabs.map(t=>'<button type="button" class="ch-tab" data-t="' + t[0] + '" onclick="chNuevaTab(this.dataset.t)">' + t[1] + '</button>').join('') + '</div>' +
    '<input type="search" id="chNQ" class="lista-busca" placeholder="🔎 Buscar…" oninput="clearTimeout(window._chNT);window._chNT=setTimeout(chNuevaBuscar,300)"><div class="ch-lis2" id="chNLista"></div>' +
    '<div class="home-modal-acc"><button class="ghost" type="button" onclick="chModalCerrar()">Cerrar</button></div>');
  chNuevaTab(tabs[0][0]);
};
let chNT = 'personal';
window.chNuevaTab = function(t){
  chNT = t; document.querySelectorAll('#chNTabs .ch-tab').forEach(b=>b.classList.toggle('act', b.dataset.t === t));
  const q = document.getElementById('chNQ'); if(q){ q.value = ''; q.placeholder = t === 'personal' ? '🔎 Nombre del personal…' : t === 'estudiante' ? '🔎 Nombre o documento…' : '🔎 Nombre o correo…'; }
  chNuevaBuscar();
};
async function chNuevaBuscar(){
  const l = document.getElementById('chNLista'); if(!l) return;
  const q = ((document.getElementById('chNQ') || {}).value || '').trim(); const t = chNT;
  l.innerHTML = '<div class="ch-vacio">Buscando…</div>';
  let filas = [];
  if(t === 'personal'){
    if(!chDir){ const r = await sb.rpc('chat_directorio_staff'); if(r.error){ l.innerHTML = ''; chErr(r.error); return; } chDir = r.data || []; }
    const ql = q.toLowerCase();
    filas = chDir.filter(p=>!ql || String(p.nombre || '').toLowerCase().includes(ql)).slice(0, 40).map(p=>({ k:'personal', ref:p.id, nombre:p.nombre, detalle:p.rol }));
  } else {
    const r = await sb.rpc('chat_buscar_externos', { p_tipo: t, p_texto: q || null });
    if(r.error){ l.innerHTML = ''; chErr(r.error); return; }
    filas = (r.data || []).map(p=>({ k:p.tipo, ref:p.ref, nombre:p.nombre, detalle:p.detalle }));
  }
  if(t !== chNT) return;
  chRes = filas;
  l.innerHTML = filas.length ? filas.map((f, i)=>'<button type="button" class="ch-hilo" data-i="' + i + '" onclick="chNuevaElegir(Number(this.dataset.i))"><div class="t"><span>' + chE(f.nombre || '') + '</span></div><div class="u">' + chE(f.detalle || '') + '</div></button>').join('') : '<div class="ch-vacio">Sin resultados.</div>';
}
window.chNuevaElegir = async function(i){
  const f = chRes[i]; if(!f) return;
  const r = f.k === 'personal' ? await sb.rpc('chat_abrir_directo', { p_user: f.ref }) : await sb.rpc('chat_abrir_externo', { p_tipo: f.k, p_ref: f.ref });
  if(r.error){ chErr(r.error); return; }
  chModalCerrar(); await chRefrescarLista();
  const h = chHilos.find(x=>x.id === r.data);
  if(!h){ chHilos.unshift({ id:r.data, tipo: f.k === 'personal' ? 'directo' : 'externo', ext_tipo: f.k === 'personal' ? null : f.k, titulo:f.nombre, no_leidos:0, bloqueado:false }); }
  chTab = f.k === 'personal' ? 'equipo' : (f.k === 'estudiante' ? 'estudiante' : f.k === 'supervisor' ? 'supervisor' : 'empresa');
  chPintarLista(); chAbrirHilo(r.data);
};

/* ---------- Contador de mensajes sin leer (barra lateral) ---------- */
async function chBadge(){
  try{
    if(typeof sb === 'undefined' || !sb || !window.chatPuede() || !document.body.classList.contains('pm-side')) return;
    const r = await sb.rpc('chat_no_leidos_staff'); if(r.error) return;
    const n = Number(r.data) || 0, antes = window.chatNoLeidos;
    window.chatNoLeidos = n;
    document.querySelectorAll('#pmChatN').forEach(b=>{ b.textContent = n > 99 ? '99+' : n; b.style.display = n ? '' : 'none'; });
    if(n > antes && !chActiva() && typeof toast === 'function') toast('💬 Tienes mensajes nuevos');
  }catch(_){}
}
(function(){
  if(chBadgeTimer) return;
  chBadgeTimer = setInterval(()=>{ if(!document.hidden) chBadge(); }, 30000);
  setTimeout(chBadge, 4000);
  window.addEventListener('focus', ()=>setTimeout(chBadge, 300));
})();
window.chBadge = chBadge;

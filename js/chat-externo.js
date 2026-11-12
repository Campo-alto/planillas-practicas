/* ============================= CHAT CON LA INSTITUCIÓN (estudiante, empresa, supervisor) =============================
   Botón 💬 flotante: abre una ventana para escribirle al personal de Campoalto y leer sus respuestas.
   Cada persona ve SOLO su conversación (la base de datos lo exige con el token de su sesión). Si la institución apaga el chat
   o bloquea la cuenta, se puede leer pero no escribir. Requiere chat-etapa56.sql. Los mensajes se muestran solo dentro
   de la plataforma (no se envían por correo). Todo texto se muestra escapado. */
let cxTok = '', cxOk = false, cxN = 0, cxUlt = 0, cxAbierto = false, cxEnv = false, cxEst = { habilitado:true, bloqueado:false }, cxTimer = null, cxUltEst = 0;
const cxE = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const cxHora = x => { try{ return new Date(x).toLocaleString('es-CO', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }); }catch(_){ return ''; } };
const cxToken = () => (typeof state !== 'undefined' && state && state.token) ? state.token : '';

function cxEstilos(){
  if(document.getElementById('cxEstilos')) return;
  const s = document.createElement('style'); s.id = 'cxEstilos';
  s.textContent = `
  #cxBtn{position:fixed;right:18px;bottom:82px;z-index:900;width:54px;height:54px;border-radius:50%;border:1px solid var(--line,#ddd);background:var(--orange,#E8792D);color:#fff;font-size:22px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);}
  #cxBtn .n{position:absolute;top:-4px;right:-4px;background:#B23A2E;color:#fff;border-radius:11px;min-width:22px;height:22px;font-size:12px;line-height:22px;font-weight:700;padding:0 4px;}
  #cxPanel{position:fixed;right:18px;bottom:146px;z-index:950;width:360px;max-width:calc(100vw - 24px);height:480px;max-height:calc(100vh - 170px);background:#fff;border:1px solid var(--line,#DFD9C9);border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden;}
  #cxPanel .cx-cab{background:var(--teal,#0E7C86);color:#fff;padding:11px 14px;display:flex;align-items:center;gap:8px;}
  #cxPanel .cx-cab b{flex:1;font-size:14.5px;} #cxPanel .cx-cab button{background:none;border:0;color:#fff;font-size:20px;cursor:pointer;line-height:1;}
  #cxPanel .cx-aviso{padding:8px 12px;background:#FCEBE8;color:#8C2E24;font-size:12.5px;}
  #cxPanel .cx-info{padding:8px 12px;background:#F2F8F8;color:#47605F;font-size:12px;}
  #cxMsgs{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:7px;background:#FBF9F4;}
  #cxMsgs .m{max-width:84%;padding:7px 10px;border-radius:12px;font-size:13.5px;line-height:1.35;background:#fff;border:1px solid #E6E0D0;align-self:flex-start;overflow-wrap:anywhere;}
  #cxMsgs .m.mio{align-self:flex-end;background:#DCF0EE;border-color:#B8DDD9;}
  #cxMsgs .m .a{font-size:11px;font-weight:700;color:#0A5A62;margin-bottom:2px;} #cxMsgs .m .tx{white-space:pre-wrap;} #cxMsgs .m .h{font-size:10.5px;color:#767066;margin-top:2px;text-align:right;}
  #cxMsgs .v{color:#767066;font-size:13px;text-align:center;padding:20px 8px;}
  #cxPanel .cx-comp{display:flex;gap:6px;padding:8px;border-top:1px solid var(--line,#DFD9C9);align-items:flex-end;}
  #cxPanel .cx-comp textarea{flex:1;resize:none;min-height:40px;max-height:100px;border:1px solid var(--line,#DFD9C9);border-radius:10px;padding:7px 9px;font:inherit;}
  @media (max-width:520px){ #cxPanel{right:8px;left:8px;width:auto;max-width:none;bottom:140px;} }`;
  document.head.appendChild(s);
}
function cxBoton(){
  cxEstilos();
  let b = document.getElementById('cxBtn');
  if(!cxOk){ if(b) b.remove(); const p = document.getElementById('cxPanel'); if(p){ p.remove(); cxAbierto = false; } return; }
  if(!b){ b = document.createElement('button'); b.id = 'cxBtn'; b.type = 'button'; b.setAttribute('aria-label', 'Mensajes con la institución'); b.title = 'Mensajes con la institución'; b.onclick = cxAlternar; document.body.appendChild(b); }
  b.innerHTML = '💬' + (cxN ? '<span class="n">' + (cxN > 99 ? '99+' : cxN) + '</span>' : '');
}
async function cxProbar(){
  const t = cxToken();
  if(!t || typeof sb === 'undefined' || !sb){ if(cxOk || cxTok){ cxOk = false; cxTok = ''; cxN = 0; cxBoton(); } return; }
  cxTok = t; cxUltEst = Date.now();
  try{
    const r = await sb.rpc('chat_ext_estado', { p_token: t });
    if(cxToken() !== t) return;
    if(r.error || !r.data){ cxOk = false; cxBoton(); return; }          // sesión de otro tipo, vencida o sin el SQL: no se muestra el botón
    cxOk = true; cxEst = { habilitado: !!r.data.habilitado, bloqueado: !!r.data.bloqueado }; cxN = Number(r.data.no_leidos) || 0;
    if(cxAbierto) cxN = 0;
    cxBoton();
  }catch(_){ cxOk = false; cxBoton(); }
}
function cxAlternar(){ if(cxAbierto){ cxCerrar(); } else { cxAbrir(); } }
function cxCerrar(){ const p = document.getElementById('cxPanel'); if(p) p.remove(); cxAbierto = false; if(cxTimer){ clearInterval(cxTimer); cxTimer = null; } }
async function cxAbrir(){
  cxCerrar(); cxAbierto = true; cxUlt = 0;
  const p = document.createElement('div'); p.id = 'cxPanel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Mensajes con la institución');
  p.innerHTML = '<div class="cx-cab"><b>💬 Mensajes con la institución</b><button type="button" aria-label="Cerrar" onclick="cxCerrar()">×</button></div>' +
    '<div class="cx-info">Escribe aquí tus dudas al personal de prácticas. Te responderán dentro de la plataforma.</div><div id="cxAviso"></div>' +
    '<div id="cxMsgs" aria-live="polite"><div class="v">Cargando…</div></div>' +
    '<div class="cx-comp"><textarea id="cxTxt" maxlength="1500" rows="1" placeholder="Escribe un mensaje…"></textarea><button class="primary" type="button" id="cxEnviarBtn" onclick="cxEnviar()">Enviar</button></div>';
  document.body.appendChild(p);
  document.getElementById('cxTxt').addEventListener('keydown', ev=>{ if(ev.key === 'Enter' && !ev.shiftKey){ ev.preventDefault(); cxEnviar(); } });
  cxN = 0; cxBoton();
  await cxCargar(false);
  cxTimer = setInterval(()=>{ if(!document.hidden) cxCargar(true); }, 8000);
}
async function cxCargar(silencioso){
  const t = cxToken(); if(!t || !cxAbierto) return;
  const r = await sb.rpc('chat_ext_mensajes', { p_token: t, p_desde: silencioso ? cxUlt : 0 });
  const box = document.getElementById('cxMsgs'); if(!box) return;
  if(r.error){ if(!silencioso) box.innerHTML = '<div class="v">No se pudo cargar el chat. ' + cxE(/does not exist|Could not find/i.test(r.error.message) ? '(Falta ejecutar chat-etapa56.sql)' : r.error.message) + '</div>'; return; }
  const d = r.data || {}; cxEst = { habilitado: !!d.habilitado, bloqueado: !!d.bloqueado };
  const av = document.getElementById('cxAviso'), tx = document.getElementById('cxTxt'), bt = document.getElementById('cxEnviarBtn');
  const cerrado = !cxEst.habilitado || cxEst.bloqueado;
  if(av) av.innerHTML = !cxEst.habilitado ? '<div class="cx-aviso">El chat está desactivado por la institución. Puedes leer los mensajes anteriores.</div>' : cxEst.bloqueado ? '<div class="cx-aviso">La institución restringió el envío de mensajes en tu cuenta. Puedes leer los mensajes anteriores.</div>' : '';
  if(tx){ tx.disabled = cerrado; tx.placeholder = cerrado ? 'No puedes escribir en este momento' : 'Escribe un mensaje…'; } if(bt) bt.disabled = cerrado;
  const nuevos = d.mensajes || [];
  if(!silencioso) box.innerHTML = '';
  if(silencioso && !nuevos.length) return;
  const abajo = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  const v = box.querySelector('.v'); if(v) v.remove();
  nuevos.forEach(m=>{ if(m.id > cxUlt) cxUlt = m.id;
    const div = document.createElement('div'); div.className = 'm' + (m.mio ? ' mio' : '');
    div.innerHTML = (m.mio ? '' : '<div class="a">' + cxE(m.autor_nombre) + '</div>') + '<div class="tx">' + cxE(m.texto) + '</div><div class="h">' + cxHora(m.creado) + '</div>'; box.appendChild(div); });
  if(!box.children.length) box.innerHTML = '<div class="v">Aún no hay mensajes. Escribe el primero.</div>';
  if(!silencioso || abajo) box.scrollTop = box.scrollHeight;
}
async function cxEnviar(){
  if(cxEnv) return; const t = cxToken(); const tx = document.getElementById('cxTxt'); const txt = tx ? tx.value.trim() : ''; if(!t || !txt) return;
  cxEnv = true; const bt = document.getElementById('cxEnviarBtn'); if(bt) bt.disabled = true;
  try{
    const r = await sb.rpc('chat_ext_enviar', { p_token: t, p_texto: txt });
    if(r.error){ if(typeof toast === 'function') toast(r.error.message, true); return; }
    tx.value = ''; await cxCargar(true);
  }catch(e){ if(typeof toast === 'function') toast(e.message || String(e), true); }
  finally{ cxEnv = false; const b2 = document.getElementById('cxEnviarBtn'); if(b2 && !cxEst.bloqueado && cxEst.habilitado) b2.disabled = false; if(tx) tx.focus(); }
}
// Revisa si hay sesión (cada 3 s por si ingresa o sale) y los mensajes nuevos cada 40 s
setInterval(()=>{
  const t = cxToken();
  if(t !== cxTok) { if(!t){ cxCerrar(); } cxProbar(); }
  else if(t && Date.now() - cxUltEst > 40000 && !cxAbierto && !document.hidden) cxProbar();
}, 3000);
window.addEventListener('focus', ()=>{ if(cxToken()) cxProbar(); });

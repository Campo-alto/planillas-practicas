/* ============================= «¿DESEAS ENVIAR ESTE CORREO AHORA?» (todos los perfiles) =============================
   Cuando una acción deja un correo de aviso en cola (programar una visita, aprobar una empresa, subir un contrato…), a QUIEN hizo la acción
   le aparece un cuadro: «¿Deseas enviarlo ahora?». Al aceptar, el correo sale en ese momento, sin esperar al administrador.
   - Si marca «hacerlo automáticamente», en ese navegador los correos salen solos, sin preguntar.
   - Requiere pregunta-envio-etapa45.sql (función correos_cola_ultimo) y la función de correo «enviar-correo» actualizada.
   - Quien llama no elige destinatario ni texto: solo se envían los avisos que la plataforma ya dejó en cola. */
let cpUlt = null, cpBusy = false, cpModal = false, cpNativo = null;
const CP_LEE = /(lista|listar|mias|leidas|info|_get|pendientes|opciones|datos|detalle|buscar|resumen|consulta|mi_estado|_mi$|cola_ultimo|login|sesion|verificar|existe|notif_)/i;
function cpAutoOn(){ try{ return localStorage.getItem('corAuto') === '1'; }catch(_){ return false; } }
function cpAutoSet(v){ try{ localStorage.setItem('corAuto', v ? '1' : '0'); }catch(_){} }
function cpToast(m, e){ if(typeof toast === 'function') toast(m, e); }
async function cpUltimo(){
  try{ const r = await sb.rpc('correos_cola_ultimo'); if(r.error) return null; return Number(r.data) || 0; }catch(_){ return null; }
}
async function cpRevisar(){
  if(cpBusy || typeof sb === 'undefined' || !sb) return; cpBusy = true;
  try{
    const id = await cpUltimo(); if(id === null) return;
    if(cpUlt === null){ cpUlt = id; return; }          // primera lectura: es la línea de partida, no pregunta
    if(id > cpUlt){ cpUlt = id; if(cpAutoOn()) cpEnviar(); else cpPreguntar(); }
  }finally{ cpBusy = false; }
}
async function cpLlamar(){
  const admin = typeof ntRol === 'function' && ntRol() === 'adm' && typeof correoInvocar === 'function';
  if(admin) return await correoInvocar({ action: 'procesar', generar: false });
  const { data, error } = await cpNativo('enviar-correo', { body: { action: 'notificar_solicitud' } });
  if(error){
    let m = error.message || 'error';
    try{ if(error.context && error.context.json){ const j = await error.context.json(); if(j && j.error) m = j.error; } }catch(_){}
    if(/Failed to send|fetch|NetworkError/i.test(m)) m = 'No se pudo contactar la función de correo (¿está publicada y actualizada en Supabase?)';
    throw new Error(m);
  }
  if(data && data.error) throw new Error(data.error);
  return data || {};
}
async function cpEnviar(){
  let env = 0, fall = 0, err = '';
  try{ for(let i = 0; i < 4; i++){ const r = await cpLlamar(); env += r.enviados || 0; fall += r.fallidos || 0; if(!r.quedan || !(r.enviados || r.fallidos)) break; } }
  catch(e){ err = e.message; }
  if(err) cpToast('No se pudo enviar el correo: ' + err + '. Queda en cola; el administrador puede enviarlo desde Correos.', true);
  else if(!env && !fall) cpToast('El correo ya había salido.');
  else if(env) cpToast('✉ Correo enviado' + (env > 1 ? 's (' + env + ')' : '') + (fall ? ' · ' + fall + ' con error' : ''));
  else cpToast('El correo no se pudo enviar ahora (' + fall + ' con error). Queda en cola para reintentar.', true);
  if(typeof corConsultar === 'function' && document.getElementById('corTabla')) corConsultar(true);
}
function cpCerrar(){ const m = document.getElementById('cpModal'); if(m) m.remove(); cpModal = false; }
function cpPreguntar(){
  if(cpModal) return; cpModal = true;
  const m = document.createElement('div'); m.id = 'cpModal'; m.className = 'home-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.style.zIndex = 2000;
  m.innerHTML = '<div class="home-modal-box" style="max-width:440px;width:94%;"><div class="home-modal-head"><span class="home-modal-ico">✉</span><h3>¿Enviar el correo ahora?</h3></div>' +
    '<p style="margin:6px 0 10px;">Tu acción dejó un <b>correo de aviso</b> listo para enviar (por ejemplo, a la empresa, al estudiante o a la institución). ¿Deseas enviarlo ahora?</p>' +
    '<label style="font-size:13px;display:flex;gap:6px;align-items:flex-start;"><input type="checkbox" id="cpChk"> <span>Enviar siempre automáticamente, sin preguntar (en este navegador)</span></label>' +
    '<div class="home-modal-acc" style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;"><button class="ghost" type="button" id="cpNo">Ahora no</button><button class="primary" type="button" id="cpSi">Sí, enviar ahora</button></div></div>';
  document.body.appendChild(m);
  document.getElementById('cpNo').onclick = ()=>{ cpCerrar(); cpToast('El correo quedó en cola. Saldrá cuando el administrador lo envíe.'); };
  document.getElementById('cpSi').onclick = async ()=>{
    if(document.getElementById('cpChk').checked){ cpAutoSet(true); cpToast('Envío automático activado en este navegador.'); }
    const b = document.getElementById('cpSi'); b.disabled = true; b.textContent = 'Enviando…';
    await cpEnviar(); cpCerrar();
  };
}
function cpEnganchar(){
  if(typeof sb === 'undefined' || !sb || sb.__cp) return !!(typeof sb !== 'undefined' && sb && sb.__cp);
  // 1) Después de cada acción (RPC) que no sea de solo lectura, revisa si quedó un correo en cola
  const o = sb.rpc.bind(sb);
  sb.rpc = function(n, a, op){
    const b = o(n, a, op);
    if(typeof n === 'string' && !CP_LEE.test(n)){
      const t = b.then.bind(b);
      b.then = function(res, rej){ return t(function(r){ try{ if(r && !r.error) setTimeout(cpRevisar, 350); }catch(_){} return res ? res(r) : r; }, rej); };
    }
    return b;
  };
  // 2) Los envíos silenciosos que ya hacían las pantallas pasan a esperar tu respuesta (salvo que hayas elegido «automático»)
  cpNativo = sb.functions.invoke.bind(sb.functions);
  sb.functions.invoke = function(nombre, op){
    if(nombre === 'enviar-correo' && op && op.body && op.body.action === 'notificar_solicitud' && !cpAutoOn()) return Promise.resolve({ data: { ok: true, enviados: 0, diferido: true }, error: null });
    return cpNativo(nombre, op);
  };
  sb.__cp = true; return true;
}
(function(){
  let n = 0; const iv = setInterval(()=>{ n++; if(cpEnganchar()){ clearInterval(iv); setTimeout(cpRevisar, 800); } else if(n > 60) clearInterval(iv); }, 500);
  if(typeof caRpc === 'function'){ /* caRpc ya usa sb.rpc: queda cubierto */ }
})();

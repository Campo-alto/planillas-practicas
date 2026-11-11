/* ============================= ENVÍO DE CORREOS EN COLA (administrador) =============================
   Cuando hay correos «Pendientes» (avisos que la plataforma dejó en cola), pregunta «¿Enviarlos ahora?» y los envía desde ahí,
   sin tener que entrar al módulo Correos. Si el administrador marca «hacerlo automáticamente», los envía solo, sin preguntar.
   Usa la misma función de correo (enviar-correo) y los mismos permisos de siempre: quien no sea administrador no ve nada de esto. */
let caPreguntando = false, caSnooze = 0, caUltimoAviso = 0;
function corAutoOn(){ try{ return localStorage.getItem('corAuto') === '1'; }catch(_){ return false; } }
function corAutoSet(v){ try{ localStorage.setItem('corAuto', v ? '1' : '0'); }catch(_){} }
async function corPendientes(){
  if(typeof sb === 'undefined' || !sb || typeof ntRol !== 'function' || ntRol() !== 'adm') return 0;
  try{
    const { data, error } = await sb.rpc('admin_correos_lista', { p_estado: 'pendiente', p_texto: null, p_limite: 1, p_offset: 0 });
    if(error || !data) return 0;
    return (data.resumen && data.resumen.pendiente) || 0;
  }catch(_){ return 0; }
}
async function corEnviarCola(silencioso){
  let enviados = 0, fallidos = 0, ultimoError = '';
  try{
    for(let i = 0; i < 6; i++){                       // hasta 6 tandas por vez; la función envía en lotes
      const r = await correoInvocar({ action: 'procesar', generar: false });
      enviados += r.enviados || 0; fallidos += r.fallidos || 0;
      if(!r.quedan || !(r.enviados || r.fallidos)) break;
    }
  }catch(e){ ultimoError = e.message; }
  if(ultimoError){ toast('No se pudieron enviar los correos: ' + ultimoError, true); caSnooze = Date.now() + 5 * 60000; }
  else if(!enviados && !fallidos){ toast('No había correos por enviar en este momento.'); }
  else toast('✉ ' + enviados + ' correo(s) enviado(s)' + (fallidos ? ' · ' + fallidos + ' con error (míralos en Correos)' : ''), !!fallidos && !enviados);
  if(fallidos && !enviados) caSnooze = Date.now() + 5 * 60000;      // si todo falló, no insistir en seguida
  if(typeof corConsultar === 'function' && document.getElementById('corTabla')) corConsultar(true);
  return { enviados, fallidos, ultimoError };
}
function corCerrarPregunta(){ const m = document.getElementById('corAutoModal'); if(m) m.remove(); caPreguntando = false; }
function corPreguntar(n){
  if(caPreguntando || document.getElementById('corAutoModal') || document.getElementById('cpModal')) return; caPreguntando = true;
  const m = document.createElement('div'); m.id = 'corAutoModal'; m.className = 'home-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
  m.innerHTML = '<div class="home-modal-box" style="max-width:460px;width:94%;"><div class="home-modal-head"><span class="home-modal-ico">✉</span><h3>Correos por enviar</h3></div>' +
    '<p style="margin:6px 0 10px;">Hay <b>' + n + '</b> correo(s) en cola esperando salir (avisos a estudiantes, empresas o supervisores). ¿Quieres enviarlos ahora?</p>' +
    '<label style="font-size:13px;display:flex;gap:6px;align-items:flex-start;"><input type="checkbox" id="corAutoChk"> <span>Hacerlo automáticamente de ahora en adelante, sin preguntar (en este navegador)</span></label>' +
    '<div class="home-modal-acc" style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;"><button class="ghost" type="button" id="corAutoNo">Ahora no</button><button class="primary" type="button" id="corAutoSi">Sí, enviar ahora</button></div></div>';
  document.body.appendChild(m);
  document.getElementById('corAutoNo').onclick = ()=>{ caSnooze = Date.now() + 5 * 60000; corCerrarPregunta(); };
  document.getElementById('corAutoSi').onclick = async ()=>{
    if(document.getElementById('corAutoChk').checked){ corAutoSet(true); toast('Envío automático activado. Puedes desactivarlo en el módulo Correos.'); }
    const b = document.getElementById('corAutoSi'); b.disabled = true; b.textContent = 'Enviando…';
    await corEnviarCola(false); corCerrarPregunta();
  };
}
async function corRevisarCola(){
  if(Date.now() < caSnooze || caPreguntando) return;
  const n = await corPendientes(); if(!n) return;
  if(corAutoOn()){ if(Date.now() - caUltimoAviso < 15000) return; caUltimoAviso = Date.now(); await corEnviarCola(true); }
  else corPreguntar(n);
}
// Casilla para activar/desactivar el envío automático dentro del módulo Correos
function corPintarOpcionAuto(){
  const ref = document.getElementById('corCfgMsg'); if(!ref || document.getElementById('corAutoOpc')) return;
  const d = document.createElement('div'); d.id = 'corAutoOpc'; d.style.cssText = 'margin:8px 0;font-size:13.5px;';
  d.innerHTML = '<label><input type="checkbox" id="corAutoOpcChk" ' + (corAutoOn() ? 'checked' : '') + '> Enviar los correos en cola automáticamente, sin preguntar (en este navegador)</label>';
  ref.parentNode.insertBefore(d, ref);
  document.getElementById('corAutoOpcChk').onchange = e=>{ corAutoSet(e.target.checked); toast(e.target.checked ? 'Envío automático activado' : 'Ahora se te preguntará antes de enviar'); };
}
(function(){
  setInterval(corRevisarCola, 25000);
  setInterval(corPintarOpcionAuto, 1500);
  setTimeout(corRevisarCola, 4000);
  window.addEventListener('focus', ()=>setTimeout(corRevisarCola, 800));
  // justo después de una acción de contratación (aprobar empresa, aceptar contrato…) vuelve a revisar la cola
  if(typeof caRpc === 'function'){ const _c = caRpc; caRpc = async function(){ const r = await _c.apply(this, arguments); setTimeout(corRevisarCola, 2500); return r; }; }
})();

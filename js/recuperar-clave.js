/* ===== RECUPERAR LA CONTRASEÑA SIN EL ADMINISTRADOR (estudiantes, empresas y supervisores) =====
   1) La persona escribe su usuario  →  la Edge Function «enviar-correo» (acción recuperar_solicitar) le manda un código de 6 dígitos.
   2) Escribe el código y su contraseña nueva  →  RPC recuperar_confirmar.
   El servidor responde igual exista o no la cuenta; el código vence en 15 minutos y se anula tras 5 errores. */
const recEsc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let recVuelta = 'screen-home', recUsuario = '';

function recPantalla(){
  let el = document.getElementById('screen-recuperar');
  if(el) return el;
  const base = document.getElementById('screen-estudiante-login') || document.getElementById('screen-role-login');
  if(!base) return null;
  el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-recuperar';
  base.parentNode.appendChild(el);
  return el;
}
function recAbrir(origen){
  const el = recPantalla(); if(!el) return;
  const esEst = origen === 'estudiante';
  recVuelta = esEst ? 'screen-estudiante-login' : 'screen-role-login';
  const previo = (document.getElementById(esEst ? 'estUsuario' : 'roleEmail') || {}).value || '';
  recUsuario = '';
  el.innerHTML = `<button class="linkbtn" onclick="recVolver()">← Volver</button>
    <h2 style="margin:12px 0 4px;">Recuperar mi contraseña</h2>
    <p class="helptext" id="recAyuda">${esEst ? 'Escribe tu número de documento (tu usuario). Te enviaremos un código de 6 dígitos al correo que tienes registrado en la institución.'
                                              : 'Escribe el correo con el que ingresas. Te enviaremos un código de 6 dígitos a ese correo.'}</p>
    <div class="card" style="max-width:420px;">
      <div id="recPaso1">
        <div class="field"><label>${esEst ? 'Usuario (documento)' : 'Correo'}</label>
          <input id="recUser" ${esEst ? 'inputmode="numeric"' : 'type="email"'} autocomplete="username" value="${recEsc(previo.trim())}" onkeydown="if(event.key==='Enter')recEnviar()"></div>
        <div class="actions-row" style="justify-content:flex-start;"><button class="primary" id="recBtn1" onclick="recEnviar()">Enviarme el código</button></div>
      </div>
      <div id="recPaso2" style="display:none;">
        <div class="field"><label>Código de 6 dígitos (llega a tu correo)</label>
          <input id="recCodigo" inputmode="numeric" maxlength="6" autocomplete="one-time-code" style="letter-spacing:4px;font-size:18px;"></div>
        <div class="field"><label>Contraseña nueva (mínimo 8 caracteres)</label><input type="password" id="recPw1" autocomplete="new-password"></div>
        <div class="field"><label>Repite la contraseña nueva</label><input type="password" id="recPw2" autocomplete="new-password" onkeydown="if(event.key==='Enter')recCambiar()"></div>
        <label style="font-size:13px;display:block;margin:6px 0;"><input type="checkbox" onchange="['recPw1','recPw2'].forEach(i=>document.getElementById(i).type=this.checked?'text':'password')"> Mostrar contraseña</label>
        <div class="actions-row" style="justify-content:flex-start;"><button class="primary" id="recBtn2" onclick="recCambiar()">Cambiar mi contraseña</button>
          <button class="ghost" onclick="recEnviar(true)">Pedir otro código</button></div>
      </div>
      <div id="recMsg" style="margin-top:12px;font-size:13.5px;"></div>
    </div>`;
  showScreen('screen-recuperar');
  setTimeout(()=>{ const i = document.getElementById('recUser'); if(i) i.focus(); }, 50);
}
function recVolver(){ showScreen(recVuelta); }
function recMsg(t, ok){ const m = document.getElementById('recMsg'); if(m) m.innerHTML = '<span style="color:var(' + (ok ? '--teal-dark' : '--danger') + ')">' + recEsc(t) + '</span>'; }

async function recEnviar(reenviar){
  if(!requireSupabase()) return;
  const u = (reenviar ? recUsuario : document.getElementById('recUser').value).trim().toLowerCase();
  if(u.length < 3){ recMsg('Escribe tu usuario.', false); return; }
  const b = document.getElementById('recBtn1'); if(b) b.disabled = true;
  recMsg('Enviando…', true);
  try{
    const { error } = await sb.functions.invoke('enviar-correo', { body: { action: 'recuperar_solicitar', usuario: u } });
    if(error) throw error;
    recUsuario = u;
    document.getElementById('recPaso1').style.display = 'none';
    document.getElementById('recPaso2').style.display = '';
    document.getElementById('recAyuda').textContent = 'Si el usuario existe y tiene un correo registrado, te enviamos un código. Revisa tu bandeja de entrada y también «spam» o «correo no deseado». El código vale 15 minutos.';
    recMsg('', true);
    setTimeout(()=>{ const i = document.getElementById('recCodigo'); if(i) i.focus(); }, 50);
  }catch(e){ console.error(e); recMsg('No se pudo enviar el código. Inténtalo de nuevo en unos minutos.', false); }
  finally{ if(b) b.disabled = false; }
}

async function recCambiar(){
  const codigo = document.getElementById('recCodigo').value.trim();
  const p1 = document.getElementById('recPw1').value, p2 = document.getElementById('recPw2').value;
  if(!/^\d{6}$/.test(codigo)){ recMsg('Escribe el código de 6 dígitos que llegó a tu correo.', false); return; }
  if(p1.length < 8){ recMsg('La contraseña debe tener al menos 8 caracteres.', false); return; }
  if(p1 !== p2){ recMsg('Las dos contraseñas no coinciden.', false); return; }
  const b = document.getElementById('recBtn2'); b.disabled = true; recMsg('Guardando…', true);
  const { error } = await sb.rpc('recuperar_confirmar', { p_usuario: recUsuario, p_codigo: codigo, p_nueva: p1 });
  b.disabled = false;
  if(error){ recMsg(error.message, false); return; }
  toast('Contraseña cambiada. Ya puedes iniciar sesión.');
  const esEst = recVuelta === 'screen-estudiante-login';
  const campo = document.getElementById(esEst ? 'estUsuario' : 'roleEmail'); if(campo) campo.value = recUsuario;
  const pw = document.getElementById(esEst ? 'estPassword' : 'rolePassword'); if(pw) pw.value = '';
  showScreen(recVuelta);
  const msg = document.getElementById(esEst ? 'estLoginMsg' : 'roleLoginMsg');
  if(msg) msg.innerHTML = '<span style="color:var(--teal-dark)">✅ Contraseña cambiada. Ingresa con la nueva.</span>';
}

/* Cambia los textos de «¿Olvidaste tu contraseña?» de las pantallas de acceso */
(function(){
  const ini = ()=>{
    const ayuda = document.getElementById('forgotRoleHelp');
    if(ayuda){
      const btn = ayuda.previousElementSibling;
      if(btn && btn.tagName === 'BUTTON'){ btn.setAttribute('onclick', "recAbrir('cuenta')"); }
      ayuda.remove();
    }
    const est = document.getElementById('screen-estudiante-login');
    if(est){
      const p = Array.from(est.querySelectorAll('p.helptext')).find(x=>/Olvidaste/i.test(x.textContent));
      if(p) p.innerHTML = '<button class="linkbtn" style="padding:0;" onclick="recAbrir(\'estudiante\')">¿Olvidaste tu contraseña?</button>';
    }
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ini); else ini();
})();

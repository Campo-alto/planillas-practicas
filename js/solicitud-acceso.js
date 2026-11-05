/* ============================= SOLICITUD DE ACCESO (lado del estudiante) =============================
   El estudiante que aún no tiene usuario llena este formulario. La solicitud llega al encargado, y cuando la aprueba
   el estudiante recibe por correo su usuario y su contraseña. Seguridad: la función de la base de datos valida todo,
   no revela si un documento ya existe, tiene tope de solicitudes y un campo trampa contra robots. */
(function(){
  const login = document.getElementById('screen-estudiante-login');
  if(!login) return;
  const card = login.querySelector('.card');
  if(card && !document.getElementById('solLink')){
    const p = document.createElement('p'); p.id = 'solLink'; p.className = 'helptext'; p.style.cssText = 'margin-top:12px;';
    p.innerHTML = '¿Aún no tienes usuario? <a href="#" onclick="solAbrir();return false;"><b>Solicita tu acceso aquí</b></a>.';
    card.appendChild(p);
  }
})();

function solPantalla(){
  let el = document.getElementById('screen-solicitud-acceso');
  if(!el){
    const ref = document.getElementById('screen-estudiante-login'); if(!ref) return null;
    el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-solicitud-acceso'; ref.parentNode.appendChild(el);
  }
  return el;
}
async function solAbrir(){
  const el = solPantalla(); if(!el) return;
  try{ if(typeof loadProgramas === 'function') await loadProgramas(); }catch(e){ console.warn(e); }
  const mods = (typeof MODALIDADES !== 'undefined' ? MODALIDADES : []);
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-estudiante-login')">← Volver al ingreso</button>
    <h2 style="margin:12px 0 4px;">Solicitar mi acceso</h2>
    <p class="helptext" style="text-align:justify;">Llena tus datos. Tu solicitud llegará a la persona encargada y, cuando la apruebe, recibirás en tu correo tu <b>usuario y tu contraseña</b> para ingresar. Escribe bien tu correo: ahí te llegará la respuesta.</p>
    <div class="card" id="solCard" style="max-width:720px;">
      <div class="field-row">
        <div class="field"><label>Número de documento *</label><input id="sol-documento" inputmode="numeric" maxlength="15" autocomplete="off"></div>
        <div class="field"><label>Apellidos *</label><input id="sol-apellidos" maxlength="80" autocomplete="family-name"></div>
        <div class="field"><label>Nombres *</label><input id="sol-nombres" maxlength="80" autocomplete="given-name"></div>
        <div class="field"><label>Correo electrónico *</label><input id="sol-correo" type="email" maxlength="120" autocomplete="email"></div>
        <div class="field"><label>Teléfono</label><input id="sol-telefono" inputmode="tel" maxlength="20" autocomplete="tel"></div>
        ${typeof renderAreaProgramaSelects === 'function' ? renderAreaProgramaSelects('sol', '') : ''}
        <div class="field"><label>Modalidad de práctica</label><select id="sol-modalidad"><option value="">Selecciona…</option>${mods.map(m=>'<option value="'+esc(m.nombre)+'">'+esc(m.nombre)+'</option>').join('')}</select></div>
        <div class="field"><label>Sede</label><input id="sol-sede" maxlength="80"></div>
        <div class="field"><label>Semestre</label><input id="sol-semestre" maxlength="20"></div>
        <div class="field"><label>Periodo académico</label><input id="sol-periodo" maxlength="30" placeholder="Ej. 2026-2"></div>
        <div class="field"><label>Jornada en que solicitas el cupo</label><select id="sol-jornada"><option value="">Sin definir…</option>${(typeof JORNADAS !== 'undefined' ? JORNADAS : []).map(j=>'<option value="'+esc(j)+'">'+esc(j)+'</option>').join('')}</select></div>
      </div>
      <div style="position:absolute;left:-9999px;top:-9999px;height:0;overflow:hidden;" aria-hidden="true"><label>No llenar</label><input id="sol-web" tabindex="-1" autocomplete="off"></div>
      <label style="display:block;margin:10px 0;font-size:13.5px;"><input type="checkbox" id="sol-acepta"> He leído y acepto la <a href="${typeof DP_URL !== 'undefined' ? DP_URL : 'https://campoalto.dataprotected.co'}" target="_blank" rel="noopener noreferrer"><b>política de tratamiento de datos personales</b></a> de Campoalto.</label>
      <div id="solMsg" style="margin:8px 0;font-size:13.5px;"></div>
      <div class="actions-row" style="justify-content:flex-start;"><button class="primary" id="solEnviar" onclick="solEnviar()">Enviar solicitud</button></div>
    </div>`;
  showScreen('screen-solicitud-acceso');
}
async function solEnviar(){
  if(!requireSupabase()) return;
  const msg = document.getElementById('solMsg'), g = id => (document.getElementById(id) || {}).value || '';
  const err = t => { msg.innerHTML = '<span style="color:var(--danger)">' + esc(t) + '</span>'; };
  const doc = g('sol-documento').replace(/[\s.\-]/g, ''), correo = g('sol-correo').trim();
  if(!/^\d{5,15}$/.test(doc)) return err('El documento debe tener solo números (entre 5 y 15 dígitos).');
  if(g('sol-apellidos').trim().length < 2 || g('sol-nombres').trim().length < 2) return err('Escribe tus apellidos y tus nombres.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return err('Escribe un correo válido.');
  if(!document.getElementById('sol-acepta').checked) return err('Debes aceptar el tratamiento de datos personales.');
  const b = document.getElementById('solEnviar'); b.disabled = true; msg.innerHTML = '<span style="color:var(--muted)">Enviando…</span>';
  const { error } = await sb.rpc('solicitar_acceso_estudiante', {
    p_documento: doc, p_apellidos: g('sol-apellidos'), p_nombres: g('sol-nombres'), p_correo: correo, p_telefono: g('sol-telefono'),
    p_programa: g('sol-programa'), p_sede: g('sol-sede'), p_semestre: g('sol-semestre'), p_modalidad: g('sol-modalidad'),
    p_periodo: g('sol-periodo'), p_jornada: g('sol-jornada'), p_acepta: true, p_web: g('sol-web') });
  if(error){ b.disabled = false; err(/PGRST202|42883|Could not find/i.test(error.message + ' ' + (error.code || '')) ? 'Esta función aún no está disponible. Avisa a la institución.' : error.message); return; }
  try{ sb.functions.invoke('enviar-correo', { body:{ action:'notificar_solicitud' } }).then(()=>{}, ()=>{}); }catch(_){}   // avisa al encargado al instante
  document.getElementById('solCard').innerHTML = `<div style="text-align:center;padding:10px 0;">
    <div style="font-size:42px;">✅</div><h3 style="margin:6px 0;">¡Solicitud enviada!</h3>
    <p style="font-size:14px;">Cuando la persona encargada la apruebe, recibirás en <b>${esc(correo)}</b> tu usuario y tu contraseña. Revisa también la carpeta de spam.</p>
    <button class="primary" onclick="showScreen('screen-estudiante-login')">Volver al ingreso</button></div>`;
}

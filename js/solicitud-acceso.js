/* ============================= SOLICITUD DE ACCESO (lado del estudiante) =============================
   El estudiante que aún no tiene usuario llena este formulario. La solicitud llega al encargado, y cuando la aprueba
   el estudiante recibe por correo su usuario y su contraseña. Seguridad: la función de la base de datos valida todo,
   no revela si un documento ya existe, tiene tope de solicitudes y un campo trampa contra robots. */
/* El enlace «Solicita tu acceso aquí» se asegura al cargar, al terminar de cargar la página y cada vez que se muestra el ingreso del estudiante */
function solAsegurarEnlace(){
  try{
    const login = document.getElementById('screen-estudiante-login'); if(!login || document.getElementById('solLink')) return;
    const card = login.querySelector('.card') || login;
    const p = document.createElement('p'); p.id = 'solLink'; p.className = 'helptext'; p.style.cssText = 'margin-top:12px;';
    p.innerHTML = '¿Aún no tienes usuario? <a href="#" onclick="solAbrir();return false;"><b>Solicita tu acceso aquí</b></a>.';
    card.appendChild(p);
  }catch(_){}
}
(function(){
  solAsegurarEnlace();
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', solAsegurarEnlace);
  window.addEventListener('load', solAsegurarEnlace);
  if(typeof showScreen === 'function'){
    const o = showScreen;
    showScreen = function(id){ const r = o.apply(this, arguments); if(id === 'screen-estudiante-login') solAsegurarEnlace(); return r; };
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
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-estudiante-login')">← Volver al ingreso</button>
    <h2 style="margin:12px 0 4px;">Solicitar mi acceso</h2>
    <p class="helptext" style="text-align:justify;">Llena tus datos. Tu solicitud llegará a la persona encargada y, cuando la apruebe, recibirás en tu correo tu <b>usuario y tu contraseña</b> para ingresar. Escribe bien tu correo: ahí te llegará la respuesta.</p>
    <div class="card" id="solCard" style="max-width:720px;">
      <div class="sol-alerta" role="alert" style="background:#FFF4D6;border:1px solid #E0B84A;color:#6B4A00;border-radius:10px;padding:10px 14px;margin:0 0 12px;font-size:13.5px;line-height:1.45;">
        <b>⚠ Importante:</b> escribe tus <b>APELLIDOS COMPLETOS</b> (primero y segundo apellido) y tus <b>NOMBRES COMPLETOS</b> (primero y segundo nombre), tal como aparecen en tu documento de identidad. Si están incompletos, tu solicitud puede ser rechazada.
      </div>
      <div class="field-row" id="solCampos"><p class="helptext">Cargando el formulario…</p></div>
      <div style="position:absolute;left:-9999px;top:-9999px;height:0;overflow:hidden;" aria-hidden="true"><label>No llenar</label><input id="sol-web" tabindex="-1" autocomplete="off"></div>
      <label style="display:block;margin:10px 0;font-size:13.5px;"><input type="checkbox" id="sol-acepta"> He leído y acepto la <a href="${typeof DP_URL !== 'undefined' ? DP_URL : 'https://campoalto.dataprotected.co'}" target="_blank" rel="noopener noreferrer"><b>política de tratamiento de datos personales</b></a> de Campoalto.</label>
      <div id="solMsg" style="margin:8px 0;font-size:13.5px;"></div>
      <div class="actions-row" style="justify-content:flex-start;"><button class="primary" id="solEnviar" onclick="solEnviar()">Enviar solicitud</button></div>
    </div>`;
  showScreen('screen-solicitud-acceso');
  solCargarCampos();
}

/* ---------- Campos del formulario (los configura la administración: «Formulario de preinscripción») ---------- */
const SOL_BASE = [
  { clave:'documento', etiqueta:'Número de documento', tipo:'numero',   obligatorio:true,  ayuda:'', opciones:[], base:true },
  { clave:'apellidos', etiqueta:'Apellidos',           tipo:'texto',    obligatorio:true,  ayuda:'', opciones:[], base:true },
  { clave:'nombres',   etiqueta:'Nombres',             tipo:'texto',    obligatorio:true,  ayuda:'', opciones:[], base:true },
  { clave:'correo',    etiqueta:'Correo electrónico',  tipo:'correo',   obligatorio:true,  ayuda:'', opciones:[], base:true },
  { clave:'telefono',  etiqueta:'Teléfono',            tipo:'telefono', obligatorio:false, ayuda:'', opciones:[], base:true }
];
let solCampos = SOL_BASE.slice(), solUsaExtras = false;
function solCampoHtml(c){
  const id = 'sol-' + c.clave, req = c.obligatorio ? ' *' : '';
  const lab = '<label for="' + id + '">' + esc(c.etiqueta) + req + '</label>';
  let ayT = c.ayuda || '';
  if(c.clave === 'apellidos') ayT = 'Primero y segundo apellido, completos.' + (ayT ? ' ' + ayT : '');
  if(c.clave === 'nombres') ayT = 'Primero y segundo nombre, completos.' + (ayT ? ' ' + ayT : '');
  const ay = ayT ? '<small class="helptext" style="display:block;margin-top:3px;">' + esc(ayT) + '</small>' : '';
  let ctl;
  if(c.clave === 'documento') ctl = '<input id="' + id + '" inputmode="numeric" maxlength="15" autocomplete="off">';
  else if(c.clave === 'apellidos') ctl = '<input id="' + id + '" maxlength="80" autocomplete="family-name">';
  else if(c.clave === 'nombres') ctl = '<input id="' + id + '" maxlength="80" autocomplete="given-name">';
  else if(c.clave === 'correo') ctl = '<input id="' + id + '" type="email" maxlength="120" autocomplete="email">';
  else if(c.clave === 'telefono') ctl = '<input id="' + id + '" inputmode="tel" maxlength="20" autocomplete="tel">';
  else if(c.tipo === 'parrafo') ctl = '<textarea id="' + id + '" maxlength="1000" rows="3"></textarea>';
  else if(c.tipo === 'numero') ctl = '<input id="' + id + '" inputmode="decimal" maxlength="20">';
  else if(c.tipo === 'fecha'){ const hoy = new Date().toISOString().slice(0,10); ctl = '<input id="' + id + '" type="date" min="1900-01-01" max="' + hoy + '">'; }
  else if(c.tipo === 'correo') ctl = '<input id="' + id + '" type="email" maxlength="120">';
  else if(c.tipo === 'telefono') ctl = '<input id="' + id + '" inputmode="tel" maxlength="20">';
  else if(c.tipo === 'lista') ctl = '<select id="' + id + '"><option value="">Elige una opción</option>' + (c.opciones || []).map(o=>'<option value="' + esc(o) + '">' + esc(o) + '</option>').join('') + '</select>';
  else if(c.tipo === 'si_no') ctl = '<select id="' + id + '"><option value="">Elige</option><option value="Sí">Sí</option><option value="No">No</option></select>';
  else ctl = '<input id="' + id + '" maxlength="200">';
  return '<div class="field"' + (c.tipo === 'parrafo' ? ' style="grid-column:1/-1;"' : '') + '>' + lab + ctl + ay + '</div>';
}
async function solCargarCampos(){
  const box = document.getElementById('solCampos'); if(!box) return;
  solCampos = SOL_BASE.slice(); solUsaExtras = false;
  try{
    const { data, error } = await sb.rpc('preinscripcion_campos_publico');
    if(!error && Array.isArray(data) && data.length){ solCampos = data; solUsaExtras = true; }     // si la etapa 74 no está ejecutada se usa el formulario básico
  }catch(_){}
  box.innerHTML = solCampos.map(solCampoHtml).join('');
}
async function solEnviar(){
  if(!requireSupabase()) return;
  const msg = document.getElementById('solMsg'), g = id => (document.getElementById(id) || {}).value || '';
  const err = t => { msg.innerHTML = '<span style="color:var(--danger)">' + esc(t) + '</span>'; };
  const doc = g('sol-documento').replace(/[\s.\-]/g, ''), correo = g('sol-correo').trim();
  if(!/^\d{5,15}$/.test(doc)) return err('El documento debe tener solo números (entre 5 y 15 dígitos).');
  if(g('sol-apellidos').trim().length < 2 || g('sol-nombres').trim().length < 2) return err('Escribe tus apellidos y tus nombres.');
  { const pa = g('sol-apellidos').trim().split(/\s+/).length, pn = g('sol-nombres').trim().split(/\s+/).length;
    if((pa < 2 || pn < 2) && !confirm('Escribiste ' + (pa < 2 ? 'un solo apellido' : '') + (pa < 2 && pn < 2 ? ' y ' : '') + (pn < 2 ? 'un solo nombre' : '') + '.\n\nLos apellidos y nombres deben ir COMPLETOS, como aparecen en tu documento.\n\n¿Están completos y quieres enviar la solicitud?')) return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return err('Escribe un correo válido.');
  const extras = {};
  for(const c of solCampos){
    if(c.base) { if(c.clave === 'telefono' && c.obligatorio && g('sol-telefono').replace(/\D/g,'').length < 7) return err('Escribe tu ' + c.etiqueta.toLowerCase() + '.'); continue; }
    const v = g('sol-' + c.clave).trim();
    if(c.obligatorio && !v) return err('Completa el campo «' + c.etiqueta + '».');
    if(v) extras[c.clave] = v;
  }
  if(!document.getElementById('sol-acepta').checked) return err('Debes aceptar el tratamiento de datos personales.');
  const b = document.getElementById('solEnviar'); b.disabled = true; msg.innerHTML = '<span style="color:var(--muted)">Enviando…</span>';
  const args = {
    p_documento: doc, p_apellidos: g('sol-apellidos'), p_nombres: g('sol-nombres'), p_correo: correo, p_telefono: g('sol-telefono'),
    p_programa: '', p_sede: '', p_semestre: '', p_modalidad: '', p_periodo: '', p_jornada: '', p_acepta: true, p_web: g('sol-web') };
  if(solUsaExtras) args.p_extras = extras;
  const { error } = await sb.rpc('solicitar_acceso_estudiante', args);
  if(error){ b.disabled = false; err(/PGRST202|42883|Could not find/i.test(error.message + ' ' + (error.code || '')) ? 'Esta función aún no está disponible. Avisa a la institución.' : error.message); return; }
  try{ sb.functions.invoke('enviar-correo', { body:{ action:'notificar_solicitud' } }).then(()=>{}, ()=>{}); }catch(_){}   // avisa al encargado al instante
  document.getElementById('solCard').innerHTML = `<div style="text-align:center;padding:10px 0;">
    <div style="font-size:42px;">✅</div><h3 style="margin:6px 0;">¡Solicitud enviada!</h3>
    <p style="font-size:14px;">Cuando la persona encargada la apruebe, recibirás en <b>${esc(correo)}</b> tu usuario y tu contraseña. Revisa también la carpeta de spam.</p>
    <button class="primary" onclick="showScreen('screen-estudiante-login')">Volver al ingreso</button></div>`;
}

/* ============================= FORMULARIO DE PREINSCRIPCIÓN (campos configurables) =============================
   La administración agrega, modifica, ordena y quita los datos que se piden en «Solicita tu acceso» (por ejemplo
   «Fecha de nacimiento»). Los campos fijos (documento, apellidos, nombres, correo, teléfono) no se pueden quitar.
   Las respuestas se ven en la bandeja de solicitudes y en la ficha del estudiante.
   Requiere preinscripcion-campos-etapa74.sql. Permiso: «Documentos por modalidad» (adm_modalidades); todo se valida en el servidor. */
let piLista = [], piEditId = null;
const PI_TIPOS = { texto:'Texto corto', parrafo:'Texto largo', numero:'Número', fecha:'Fecha', correo:'Correo electrónico', telefono:'Teléfono', lista:'Lista de opciones', si_no:'Sí / No' };
const piE = t => (typeof esc === 'function' ? esc(t) : String(t == null ? '' : t).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));

function piPantalla(){
  let el = document.getElementById('screen-admin-preinsc');
  if(!el){
    const ref = document.getElementById('screen-admin-hub') || document.querySelector('.screen'); if(!ref) return null;
    el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-preinsc'; ref.parentNode.appendChild(el);
  }
  return el;
}
async function abrirPreinscripcion(){
  if(!requireSupabase()) return;
  const el = piPantalla(); if(!el) return;
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Formulario de preinscripción</h2>
    <p class="helptext" style="text-align:justify;">Aquí defines qué datos pide la plataforma cuando un estudiante <b>solicita su acceso</b>. Puedes <b>agregar</b> datos (por ejemplo «Fecha de nacimiento»), <b>cambiarles el nombre</b>, <b>ordenarlos</b> con las flechas, volverlos <b>obligatorios</b> u <b>ocultarlos</b>, y <b>quitar</b> los que agregaste. Documento, apellidos, nombres y correo siempre se piden. Lo que el estudiante responde queda en su ficha. Máximo 20 campos propios.</p>
    <div class="card"><div id="piTabla"><p style="color:var(--muted)">Cargando…</p></div>
      <div class="actions-row" style="justify-content:flex-start;margin-top:10px;"><button class="primary" onclick="piNuevo()">+ Agregar un campo</button></div></div>
    <div class="card" id="piForm" style="display:none;"></div>
    <div class="card"><div class="section-bar teal" style="margin-bottom:8px;">Así lo verá el estudiante</div><div id="piVista"></div></div>`;
  showScreen('screen-admin-preinsc');
  piCargar();
}
async function piCargar(){
  const t = document.getElementById('piTabla'); if(!t) return;
  const { data, error } = await sb.rpc('admin_preinscripcion_campos');
  if(error){ t.innerHTML = '<p style="color:var(--danger)">' + piE(error.message) + ' (¿ejecutaste preinscripcion-campos-etapa74.sql?)</p>'; return; }
  piLista = data || [];
  t.innerHTML = '<div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Orden</th><th>Campo</th><th>Tipo</th><th>¿Obligatorio?</th><th>Estado</th><th></th></tr></thead><tbody>' +
    piLista.map((c,i)=>`<tr${c.activo ? '' : ' style="opacity:.55"'}>
      <td class="aud-nw"><button class="ghost" style="padding:2px 8px;" aria-label="Subir" ${i === 0 ? 'disabled' : ''} onclick="piMover('${c.id}',-1)">▲</button>
          <button class="ghost" style="padding:2px 8px;" aria-label="Bajar" ${i === piLista.length - 1 ? 'disabled' : ''} onclick="piMover('${c.id}',1)">▼</button></td>
      <td><b>${piE(c.etiqueta)}</b>${c.base ? ' <span class="aud-ref">(fijo)</span>' : ''}${c.ayuda ? '<div class="aud-ref">' + piE(c.ayuda) + '</div>' : ''}${c.tipo === 'lista' ? '<div class="aud-ref">Opciones: ' + (c.opciones || []).map(piE).join(', ') + '</div>' : ''}</td>
      <td>${piE(PI_TIPOS[c.tipo] || c.tipo)}</td>
      <td>${c.obligatorio ? 'Sí' : 'No'}</td>
      <td>${c.activo ? '<span class="cor-est cor-enviado">Visible</span>' : '<span class="cor-est cor-pendiente">Oculto</span>'}</td>
      <td class="aud-nw"><button class="ghost" style="padding:5px 10px;font-size:12px;" onclick="piEditar('${c.id}')">Modificar</button>
        ${c.base ? '' : `<button class="danger" style="padding:5px 10px;font-size:12px;" onclick="piQuitar('${c.id}')">Quitar</button>`}</td></tr>`).join('') + '</tbody></table></div>';
  piVista();
}
function piVista(){
  const v = document.getElementById('piVista'); if(!v) return;
  v.innerHTML = '<div class="field-row">' + piLista.filter(c=>c.activo).map(c=>{
    const lab = '<label>' + piE(c.etiqueta) + (c.obligatorio ? ' *' : '') + '</label>';
    const ay = c.ayuda ? '<small class="helptext" style="display:block;margin-top:3px;">' + piE(c.ayuda) + '</small>' : '';
    let ctl = '<input disabled>';
    if(c.tipo === 'parrafo') ctl = '<textarea disabled rows="2"></textarea>';
    else if(c.tipo === 'fecha') ctl = '<input type="date" disabled>';
    else if(c.tipo === 'lista') ctl = '<select disabled><option>Elige una opción</option></select>';
    else if(c.tipo === 'si_no') ctl = '<select disabled><option>Elige</option></select>';
    return '<div class="field"' + (c.tipo === 'parrafo' ? ' style="grid-column:1/-1;"' : '') + '>' + lab + ctl + ay + '</div>';
  }).join('') + '</div><p class="helptext" style="margin-top:8px;">Después van la aceptación del tratamiento de datos y el botón «Enviar solicitud».</p>';
}
function piFormHtml(c){
  const base = !!(c && c.base), esNuevo = !c;
  const tipoSel = Object.keys(PI_TIPOS).map(k=>`<option value="${k}"${c && c.tipo === k ? ' selected' : ''}>${piE(PI_TIPOS[k])}</option>`).join('');
  const fijoObl = base && c.clave !== 'telefono';
  return `<div class="section-bar teal" style="margin-bottom:8px;">${esNuevo ? 'Agregar un campo' : 'Modificar «' + piE(c.etiqueta) + '»'}</div>
    <div class="field-row">
      <div class="field"><label for="piEtq">Nombre del campo *</label><input id="piEtq" maxlength="60" value="${piE(c ? c.etiqueta : '')}" placeholder="Ej.: Fecha de nacimiento"></div>
      <div class="field"><label for="piTipo">Tipo de dato</label><select id="piTipo" ${base ? 'disabled' : ''} onchange="piTipoCambio()">${tipoSel}</select></div>
      <div class="field" style="grid-column:1/-1;"><label for="piAyuda">Ayuda para el estudiante (opcional)</label><input id="piAyuda" maxlength="150" value="${piE(c ? c.ayuda : '')}" placeholder="Ej.: Día, mes y año"></div>
      <div class="field" id="piOpcBox" style="grid-column:1/-1;${c && c.tipo === 'lista' ? '' : 'display:none;'}"><label for="piOpc">Opciones de la lista (una por línea, mínimo 2)</label><textarea id="piOpc" rows="5" maxlength="1800">${piE(c && c.tipo === 'lista' ? (c.opciones || []).join('\n') : '')}</textarea></div>
    </div>
    <label style="display:block;margin:8px 0;font-size:13.5px;"><input type="checkbox" id="piObl" ${fijoObl || (c && c.obligatorio) ? 'checked' : ''} ${fijoObl ? 'disabled' : ''}> Es obligatorio${fijoObl ? ' (este campo siempre es obligatorio)' : ''}</label>
    <label style="display:block;margin:8px 0;font-size:13.5px;"><input type="checkbox" id="piAct" ${!c || c.activo ? 'checked' : ''} ${base && c.clave !== 'telefono' ? 'disabled' : ''}> Se muestra en el formulario</label>
    ${esNuevo ? '' : '<p class="helptext">Si cambias el nombre, las respuestas anteriores conservan el nombre que tenía el campo ese día.</p>'}
    <div id="piMsg" style="margin:6px 0;font-size:13.5px;"></div>
    <div class="actions-row" style="justify-content:flex-start;"><button class="primary" id="piGuardar" onclick="piGuardar()">Guardar</button> <button class="ghost" onclick="piCerrar()">Cancelar</button></div>`;
}
function piAbrirForm(c){
  const f = document.getElementById('piForm'); if(!f) return;
  f.innerHTML = piFormHtml(c); f.style.display = ''; f.scrollIntoView({ behavior:'smooth', block:'center' });
  const i = document.getElementById('piEtq'); if(i) i.focus();
}
function piCerrar(){ piEditId = null; const f = document.getElementById('piForm'); if(f){ f.style.display = 'none'; f.innerHTML = ''; } }
function piNuevo(){ piEditId = null; piAbrirForm(null); }
function piEditar(id){ const c = piLista.find(x=>x.id === id); if(!c) return; piEditId = id; piAbrirForm(c); }
function piTipoCambio(){ const t = document.getElementById('piTipo').value; document.getElementById('piOpcBox').style.display = t === 'lista' ? '' : 'none'; }
async function piGuardar(){
  const msg = document.getElementById('piMsg'), b = document.getElementById('piGuardar');
  const err = t => { msg.innerHTML = '<span style="color:var(--danger)">' + piE(t) + '</span>'; };
  const c = piEditId ? piLista.find(x=>x.id === piEditId) : null;
  const et = document.getElementById('piEtq').value.trim();
  if(et.length < 2) return err('Escribe el nombre del campo.');
  const tipo = c && c.base ? c.tipo : document.getElementById('piTipo').value;
  const opc = tipo === 'lista' ? document.getElementById('piOpc').value.split('\n').map(x=>x.trim()).filter(Boolean) : [];
  if(tipo === 'lista' && new Set(opc).size < 2) return err('La lista necesita al menos 2 opciones distintas.');
  b.disabled = true; msg.innerHTML = '<span style="color:var(--muted)">Guardando…</span>';
  const { error } = await sb.rpc('admin_preinscripcion_guardar', { p_id: piEditId, p_etiqueta: et, p_tipo: tipo,
    p_obligatorio: document.getElementById('piObl').checked, p_activo: document.getElementById('piAct').checked,
    p_ayuda: document.getElementById('piAyuda').value.trim(), p_opciones: opc });
  b.disabled = false;
  if(error) return err(error.message);
  toast(piEditId ? 'Campo modificado' : 'Campo agregado'); piCerrar(); piCargar();
}
async function piMover(id, dir){
  const { error } = await sb.rpc('admin_preinscripcion_mover', { p_id: id, p_dir: dir });
  if(error){ toast(error.message, true); return; }
  piCargar();
}
async function piQuitar(id){
  const c = piLista.find(x=>x.id === id); if(!c) return;
  if(!confirm('¿Quitar el campo «' + c.etiqueta + '»?\n\nYa no se pedirá a los nuevos estudiantes. Las respuestas que ya se guardaron se conservan.')) return;
  const { error } = await sb.rpc('admin_preinscripcion_eliminar', { p_id: id });
  if(error){ toast(error.message, true); return; }
  toast('Campo quitado'); piCargar();
}

/* ---------- Ficha del estudiante: respuestas de su preinscripción ---------- */
async function piFichaPintar(){
  const box = document.getElementById('admResumen'); if(!box || !state || !state.record || !state.documento) return;
  let d = null;
  try{ const r = await sb.rpc('admin_preinscripcion_de', { p_documento: state.documento }); if(r.error) return; d = r.data; }catch(_){ return; }
  let w = document.getElementById('piFicha');
  if(!Array.isArray(d) || !d.length){ if(w) w.remove(); return; }
  if(!w){ w = document.createElement('div'); w.id = 'piFicha'; box.insertAdjacentElement('beforebegin', w); }
  w.innerHTML = '<div class="card" style="margin:10px 0;"><b>📝 Datos de la preinscripción</b><div style="margin-top:6px;font-size:13.5px;">' +
    d.map(x=>'<div><span class="aud-ref">' + piE(x.e) + ':</span> <b>' + piE(x.v) + '</b></div>').join('') + '</div></div>';
}
if(typeof renderAdministrador === 'function'){
  const piO = renderAdministrador;
  renderAdministrador = async function(){ const r = await piO.apply(this, arguments); piFichaPintar(); return r; };
}

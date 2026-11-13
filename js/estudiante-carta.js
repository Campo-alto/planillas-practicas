/* ============================= «MI CARTA DE FECHAS» (vista del estudiante) =============================
   Cuando la institución deja disponible la carta de fechas de su contrato de aprendizaje, el estudiante la ve aquí y la descarga en PDF.
   Requiere carta-estudiante-etapa57.sql. Solo muestra SUS cartas (la base de datos toma el documento de su sesión). */
let ecCartas = [], ecContr = null;
const ecE = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const ecF = iso => { try{ return typeof cartaFechaCorta === 'function' ? cartaFechaCorta(iso) : String(iso); }catch(_){ return String(iso); } };
function ecTab(){
  const bar = document.getElementById('estTabs'); if(!bar) return;
  let b = document.getElementById('estTab-cartas');
  if(!ecCartas.length){ if(b) b.remove(); if(typeof estTabActual !== 'undefined' && estTabActual === 'cartas'){ showEstTab('datos'); } return; }
  if(!b){ b = document.createElement('button'); b.className = 'tab'; b.id = 'estTab-cartas'; b.textContent = '✉ Cartas'; b.onclick = ()=>showEstTab('cartas'); bar.appendChild(b); }
  b.classList.toggle('active', typeof estTabActual !== 'undefined' && estTabActual === 'cartas');
}
async function ecCargar(){
  const card = document.getElementById('estCartaCard'); if(!card) return;
  const cont = card.querySelector('#estCartaCont');
  try{
    const r = await sb.rpc('est_mis_cartas', { p_token: state.token });
    if(r.error){ ecCartas = /does not exist|Could not find/i.test(r.error.message) ? [] : ecCartas; cont.innerHTML = '<p class="helptext">No se pudo consultar tu carta: ' + ecE(r.error.message) + '</p>'; ecTab(); return; }
    ecCartas = r.data || [];
    cont.innerHTML = ecCartas.map((c, i)=>`<div style="border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin-bottom:10px;">
      <div style="font-weight:700;">${ecE(c.empresa)}</div>
      <div class="helptext" style="margin:2px 0 8px;">${ecE(c.convenio)}${c.ciudad ? ' · ' + ecE(c.ciudad) : ''}</div>
      <div style="font-size:13.5px;line-height:1.6;"><b>Etapa lectiva:</b> ${ecF(c.lectiva_ini)} a ${ecF(c.lectiva_fin)}<br><b>Etapa productiva:</b> ${ecF(c.prod_ini)} a ${ecF(c.prod_fin)}</div>
      <div class="actions-row" style="margin-top:10px;"><button class="primary" type="button" onclick="ecDescargar(${i})">⬇ Descargar mi carta (PDF)</button></div></div>`).join('');
    ecTab();                                                   // sin carta disponible no aparece la pestaña
    ecContrato();
  }catch(e){ console.error(e); }
}
async function ecContrato(){
  const cont = document.getElementById('estContratoCont'); if(!cont) return;
  try{
    const r = await sb.rpc('est_conv_contrato_info', { p_token: state.token });
    ecContr = r.error ? null : r.data;
  }catch(_){ ecContr = null; }
  const c = ecContr;
  if(!c || !c.aplica){ cont.innerHTML = ''; return; }          // sin el SQL de la etapa 60, o sin convenio: no se muestra
  let h = '<div class="note-box" style="margin-top:6px;"><b>📄 Contrato firmado</b><br>';
  if(c.formalizado) h += '✅ Tu contrato fue recibido y formalizado por la institución. Tus planillas están habilitadas.</div>';
  else {
    if(c.estado === 'pendiente') h += 'Subiste <b>' + ecE(c.nombre_archivo || 'el contrato') + '</b>. La institución lo está revisando.';
    else if(c.estado === 'rechazado') h += '<span style="color:var(--danger)">La institución lo devolvió.</span> <b>Motivo:</b> ' + ecE(c.observacion || '') + '<br>Sube el contrato corregido.';
    else h += 'Después de firmar el contrato con la empresa, súbelo aquí en <b>PDF</b> (máximo 3 MB). Se recibe del <b>1 al 10 de cada mes</b>. Cuando la institución lo reciba, te formaliza y se habilitan tus planillas.';
    h += '</div><div class="actions-row" style="justify-content:flex-start;"><label class="primary" style="cursor:pointer;padding:9px 14px;border-radius:8px;display:inline-block;">⬆ ' + (c.estado === 'sin_subir' || c.estado === 'rechazado' ? 'Subir contrato firmado (PDF)' : 'Reemplazar archivo') +
         '<input type="file" accept="application/pdf,.pdf" style="display:none" onchange="ecSubirContrato(this)"></label></div><div id="ecCtMsg" style="font-size:13px;"></div>';
  }
  cont.innerHTML = h;
}
async function ecSubirContrato(inp){
  const f = inp.files && inp.files[0]; if(!f) return; const msg = document.getElementById('ecCtMsg');
  const mal = t=>{ msg.innerHTML = '<span style="color:var(--danger)">' + ecE(t) + '</span>'; inp.value = ''; };
  if(!/\.pdf$/i.test(f.name)) return mal('El archivo debe ser un PDF.');
  if(f.size > 3 * 1048576) return mal('El archivo pesa más de 3 MB. Comprímelo e inténtalo de nuevo.');
  msg.innerHTML = '<span style="color:var(--muted)">Subiendo…</span>';
  try{
    const b64 = await new Promise((ok, no)=>{ const r = new FileReader(); r.onerror = ()=>no(new Error('No se pudo leer el archivo')); r.onload = ()=>{ const t = String(r.result || ''); ok(t.slice(t.indexOf(',') + 1)); }; r.readAsDataURL(f); });
    const { error } = await sb.rpc('est_conv_contrato_subir', { p_token: state.token, p_nombre: f.name, p_base64: b64 });
    if(error) throw new Error(error.message);
    toast('Contrato enviado a la institución'); await ecContrato();
  }catch(e){ mal(e.message + (/does not exist|Could not find/i.test(e.message) ? ' (falta ejecutar convenio-contrato-firmado-etapa60.sql)' : '')); }
}
async function ecDescargar(i){
  const c = ecCartas[i]; if(!c) return;
  if(typeof descargarCartaFechas !== 'function'){ toast('No cargó el generador de cartas. Recarga la página.', true); return; }
  await descargarCartaFechas(c);
}
function ecMontar(){
  if(document.getElementById('estCartaCard')){ ecTab(); ecCargar(); return; }
  const ref = document.getElementById('estDatosGenerales'); if(!ref) return;
  const base = ref.classList.contains('card') ? ref : ref.closest('.card'); if(!base) return;
  const card = document.createElement('div'); card.className = 'card'; card.id = 'estCartaCard'; card.style.display = 'none';
  card.innerHTML = '<div class="section-bar teal">Mis cartas</div><p class="helptext" style="margin-top:-4px;">Aquí está la carta con las fechas de tu etapa lectiva y productiva. Descárgala cuando la necesites.</p><div id="estCartaCont"></div><div id="estContratoCont"></div>';
  base.insertAdjacentElement('afterend', card); ecCargar();
}
/* La carta vive en su propia pestaña «Cartas»: solo se ve al entrar ahí, no en toda la plataforma */
(function(){
  if(typeof cardsEstudiante !== 'function' || typeof showEstTab !== 'function') return;
  const _c = cardsEstudiante, _o = organizarPestanasEstudiante;
  cardsEstudiante = function(){ const r = _c.apply(this, arguments); const e = document.getElementById('estCartaCard'); if(e) r.cartas = e; return r; };
  organizarPestanasEstudiante = function(){ ecMontar(); const r = _o.apply(this, arguments); ecTab(); return r; };
})();

/* ============================= ACTA DE COMITÉ (PE-SGI-F-015) =============================
   Para casos especiales de un estudiante (distintos de las visitas). La diligencia el asistente: datos generales, participantes (los que sean),
   actividades, desarrollo y compromisos. La firman la empresa y todos los participantes EN PANTALLA, o se sube el acta escaneada y firmada (PDF).
   Al quedar firmada se archiva junto a las planillas del estudiante y se envía por correo al estudiante y a la empresa.
   Requiere actas-comite-etapa32.sql. El PDF se genera en el navegador con pdf-lib. */
let acFilas = [], acActual = null, acPartes = [], acComp = [];

/* ---------------- Lista (administración) ---------------- */
async function abrirActas(){
  if(!requireSupabase()) return;
  const el = spaPantalla('screen-admin-actas'); if(!el) return;
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Actas de comité</h2>
    <p class="helptext" style="text-align:justify;">Acta para los casos especiales de un estudiante (distintos de las visitas). La firman la <b>empresa</b> y todos los <b>participantes</b> (en pantalla o con el PDF escaneado); al quedar firmada se <b>envía al correo del estudiante y de la empresa</b> y queda <b>archivada con sus planillas</b>.</p>
    <div class="card"><div class="aud-filtros">
      <div class="field"><label>Estado</label><select id="acEstado" onchange="acCargar()"><option value="">Todas</option><option value="borrador">Borradores</option><option value="firmada">Firmadas</option></select></div>
      <div class="field aud-ancho"><label>Buscar (estudiante, documento, comité o N.º)</label><input type="search" id="acTexto" maxlength="80" onkeydown="if(event.key==='Enter')acCargar()"></div></div>
      <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="acCargar()">Consultar</button><button class="primary" onclick="acEditar(null)">+ Nueva acta</button></div>
      <div id="acLista"><p style="color:var(--muted)">Cargando…</p></div></div>`;
  showScreen('screen-admin-actas'); acCargar();
}
async function acCargar(){
  const t = document.getElementById('acLista'); if(!t) return;
  const { data, error } = await sb.rpc('admin_actas_lista', { p_texto: document.getElementById('acTexto').value.trim() || null, p_estado: document.getElementById('acEstado').value || null });
  if(error){ t.innerHTML = '<p style="color:var(--danger)">' + esc(error.message) + ' (¿ejecutaste actas-comite-etapa32.sql?)</p>'; return; }
  acFilas = data || [];
  if(!acFilas.length){ t.innerHTML = '<p style="color:var(--muted);font-size:13.5px;">No hay actas.</p>'; return; }
  t.innerHTML = '<div class="lista-cuenta">' + acFilas.length + ' acta(s)</div><div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>N.º</th><th>Fecha</th><th>Estudiante</th><th>Comité</th><th>Empresa</th><th>Participantes</th><th>Estado</th><th>Enviada</th><th></th></tr></thead><tbody>' +
    acFilas.map((f,i)=>`<tr><td>${esc(f.numero || '—')}</td><td class="aud-nw">${asisFechaCorta(f.fecha)}</td><td><b>${esc(f.estudiante)}</b><br><span class="aud-ref">Doc. ${esc(f.documento)}</span></td><td>${esc(f.nombre_comite || '—')}</td><td>${esc(f.empresa_nombre || '—')}</td><td>${f.participantes}</td>
      <td><span class="cor-est ${f.estado === 'firmada' ? 'cor-enviado' : 'cor-pendiente'}">${f.estado === 'firmada' ? 'Firmada' + (f.origen_firma === 'escaneada' ? ' (escaneada)' : '') : 'Borrador'}</span></td>
      <td>${f.enviada_en ? asisFechaCorta(f.enviada_en) + '<br><span class="aud-ref">' + esc(f.enviada_a || '') + '</span>' : '<span style="color:var(--muted)">No</span>'}</td>
      <td class="aud-nw">${f.estado === 'borrador' ? `<button class="ghost" onclick="acEditar('${f.id}')">Abrir</button> <button class="danger" onclick="acEliminar('${f.id}')">Eliminar</button>`
        : `<button class="ghost" onclick="acVer('${f.id}')">Ver PDF</button> <button class="primary" onclick="acEnviar('${f.id}')">${f.enviada_en ? 'Reenviar' : 'Enviar'}</button>`}</td></tr>`).join('') + '</tbody></table></div>';
}
function acVer(id){ return spaVisorPdf('Acta de comité', ()=>sb.rpc('admin_acta_pdf', { p_id: id })); }
async function acEliminar(id){
  if(!confirm('¿Eliminar este borrador?')) return;
  const { error } = await sb.rpc('admin_acta_eliminar', { p_id: id }); if(error){ toast(error.message, true); return; }
  toast('Borrador eliminado'); acCargar();
}

/* ---------------- Editor ---------------- */
const acV = id => { const e = document.getElementById(id); return e ? e.value : ''; };
async function acEditar(id){
  if(!requireSupabase()) return;
  const el = spaPantalla('screen-admin-acta'); if(!el) return;
  let d = null;
  if(id){ const r = await sb.rpc('admin_acta_get', { p_id: id }); if(r.error){ toast(r.error.message, true); return; } d = r.data; }
  const a = d ? d.acta : { documento:'', numero:'', fecha:asisHoy(0), lugar:'', nombre_comite:'', presidente:'', lider:'', secretario:'', objetivo:'', hora_inicio:'', hora_fin:'', actividades:'', desarrollo:'', compromisos:[], empresa_nombre:'', empresa_correo:'' };
  acActual = { id: id || null, estudiante: d ? d.estudiante : null };
  acPartes = d && d.participantes.length ? d.participantes.map(p=>({ nombre:p.nombre, cargo:p.cargo, es_empresa:p.es_empresa, firma:'' })) : [{ nombre:'', cargo:'', es_empresa:false, firma:'' }, { nombre:'', cargo:'Representante de la empresa', es_empresa:true, firma:'' }];
  acComp = (a.compromisos || []).length ? a.compromisos.map(c=>Object.assign({}, c)) : [{ actividad:'', responsable:'', fecha:'' }];
  const f = (k, et, tipo, ph)=>`<div class="field"><label>${et}</label><input id="ac-${k}" type="${tipo || 'text'}" maxlength="200" value="${esc(a[k] || '')}" placeholder="${ph || ''}"></div>`;
  el.innerHTML = `<button class="linkbtn" onclick="abrirActas()">← Volver a las actas</button>
    <h2 style="margin:12px 0 4px;">${id ? 'Acta de comité' : 'Nueva acta de comité'}</h2>
    <div class="card"><div class="section-bar deep">Estudiante y empresa</div>
      <div class="field-row"><div class="field"><label>Documento del estudiante *</label><span style="display:flex;gap:6px;"><input id="ac-documento" maxlength="30" value="${esc(a.documento)}"><button class="ghost" onclick="acBuscarEst()">Buscar</button></span></div>
        <div class="field"><label>Estudiante</label><div id="acEstNombre" style="padding:8px 0;">${d ? esc(d.estudiante.nombre) + ' · ' + esc(d.estudiante.correo || 'sin correo') : '—'}</div></div></div>
      <div class="field-row">${f('empresa_nombre', 'Empresa')}${f('empresa_correo', 'Correo de la empresa (para enviarle el acta)', 'email')}</div></div>
    <div class="card"><div class="section-bar deep">Datos generales del comité</div>
      <div class="field-row">${f('fecha', 'Fecha *', 'date')}${f('numero', 'N.º del acta')}${f('lugar', 'Lugar')}</div>
      <div class="field-row">${f('nombre_comite', 'Nombre del comité')}${f('presidente', 'Presidente')}${f('lider', 'Líder de comité')}${f('secretario', 'Secretario')}</div>
      <div class="field"><label>Objetivo de la reunión</label><textarea id="ac-objetivo" rows="2" maxlength="1000">${esc(a.objetivo || '')}</textarea></div>
      <div class="field-row">${f('hora_inicio', 'Hora de inicio', 'time')}${f('hora_fin', 'Hora fin', 'time')}</div></div>
    <div class="card"><div class="section-bar deep">Participantes</div><p class="helptext">Agrega todas las personas que asistieron (no hay límite de tres). Marca a quien representa a la <b>empresa</b>: su firma es obligatoria.</p>
      <div id="acPartes"></div><div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="acAgregarParte()">+ Agregar participante</button></div></div>
    <div class="card"><div class="section-bar deep">Actividades ejecutadas</div><textarea id="ac-actividades" rows="4" maxlength="8000" style="width:100%">${esc(a.actividades || '')}</textarea></div>
    <div class="card"><div class="section-bar deep">Desarrollo</div><textarea id="ac-desarrollo" rows="8" maxlength="12000" style="width:100%">${esc(a.desarrollo || '')}</textarea></div>
    <div class="card"><div class="section-bar deep">Compromisos adquiridos</div><div id="acComp"></div><div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="acAgregarComp()">+ Agregar compromiso</button></div></div>
    <div class="card"><div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="acGuardar()">💾 Guardar borrador</button><button class="primary" onclick="acIrAFirmas()">✍ Pasar a las firmas</button></div><span id="acMsg"></span></div>
    <div id="acFirmas"></div>`;
  showScreen('screen-admin-acta'); acPintarPartes(); acPintarComp();
}
function acLeerPartes(){ acPartes = acPartes.map((p,i)=>({ nombre: acV('acpn-' + i), cargo: acV('acpc-' + i), es_empresa: !!(document.getElementById('acpe-' + i) || {}).checked, firma: p.firma || '' })); }
function acPintarPartes(){
  document.getElementById('acPartes').innerHTML = '<div class="cupos-wrap"><table class="cupos-table"><thead><tr><th>Nombres</th><th>Cargo</th><th>Empresa</th><th></th></tr></thead><tbody>' +
    acPartes.map((p,i)=>`<tr><td><input id="acpn-${i}" maxlength="150" value="${esc(p.nombre)}"></td><td><input id="acpc-${i}" maxlength="150" value="${esc(p.cargo)}"></td><td style="text-align:center;"><input type="checkbox" id="acpe-${i}" ${p.es_empresa ? 'checked' : ''}></td><td><button class="ghost" onclick="acQuitarParte(${i})">Quitar</button></td></tr>`).join('') + '</tbody></table></div>';
}
function acAgregarParte(){ acLeerPartes(); acPartes.push({ nombre:'', cargo:'', es_empresa:false, firma:'' }); acPintarPartes(); }
function acQuitarParte(i){ acLeerPartes(); acPartes.splice(i, 1); acPintarPartes(); }
function acLeerComp(){ acComp = acComp.map((c,i)=>({ actividad: acV('acca-' + i), responsable: acV('accr-' + i), fecha: acV('accf-' + i) })); }
function acPintarComp(){
  document.getElementById('acComp').innerHTML = '<div class="cupos-wrap"><table class="cupos-table"><thead><tr><th>Actividad</th><th>Responsable</th><th>Fecha límite de entrega</th><th></th></tr></thead><tbody>' +
    acComp.map((c,i)=>`<tr><td><input id="acca-${i}" maxlength="300" value="${esc(c.actividad)}"></td><td><input id="accr-${i}" maxlength="150" value="${esc(c.responsable)}"></td><td><input type="date" id="accf-${i}" value="${esc(c.fecha)}"></td><td><button class="ghost" onclick="acQuitarComp(${i})">Quitar</button></td></tr>`).join('') + '</tbody></table></div>';
}
function acAgregarComp(){ acLeerComp(); acComp.push({ actividad:'', responsable:'', fecha:'' }); acPintarComp(); }
function acQuitarComp(i){ acLeerComp(); acComp.splice(i, 1); acPintarComp(); }
async function acBuscarEst(){
  const { data, error } = await sb.rpc('admin_acta_contexto', { p_documento: acV('ac-documento') });
  if(error){ toast(error.message, true); return; }
  acActual.estudiante = data;
  document.getElementById('acEstNombre').innerHTML = esc(data.nombre) + ' · ' + esc(data.correo || 'sin correo') + (data.programa ? ' · ' + esc(data.programa) : '');
  if(!acV('ac-empresa_nombre')) document.getElementById('ac-empresa_nombre').value = data.empresa || '';
  if(!acV('ac-empresa_correo')) document.getElementById('ac-empresa_correo').value = data.empresa_correo || '';
}
function acDatos(){
  acLeerPartes(); acLeerComp();
  const o = { documento: acV('ac-documento').trim(), participantes: acPartes.filter(p=>p.nombre.trim()), compromisos: acComp.filter(c=>c.actividad.trim() || c.responsable.trim()) };
  ['numero','fecha','lugar','nombre_comite','presidente','lider','secretario','objetivo','hora_inicio','hora_fin','actividades','desarrollo','empresa_nombre','empresa_correo'].forEach(k=>{ o[k] = acV('ac-' + k); });
  return o;
}
async function acGuardar(conFirmas){
  const msg = document.getElementById('acMsg'); const o = acDatos();
  if(!o.documento){ toast('Escribe el documento del estudiante', true); return null; }
  const { data, error } = await sb.rpc('admin_acta_guardar', { p_id: acActual.id, p_datos: o });
  if(error){ msg.innerHTML = '<span style="color:var(--danger)">' + esc(error.message) + '</span>'; return null; }
  acActual.id = data; if(!conFirmas) { toast('Borrador guardado'); msg.innerHTML = ''; }
  return o;
}

/* ---------------- Firmas ---------------- */
async function acIrAFirmas(){
  const o = await acGuardar(true); if(!o) return;
  if(!o.participantes.length){ toast('Agrega al menos un participante', true); return; }
  if(!o.participantes.some(p=>p.es_empresa)){ toast('Marca quién representa a la empresa', true); return; }
  const cont = document.getElementById('acFirmas');
  cont.innerHTML = `<div class="card"><div class="section-bar teal">Firmas</div>
    <p class="helptext">Cada participante firma en su recuadro (con el dedo o el mouse). <b>La firma de la empresa es obligatoria.</b> También puedes subir el acta ya firmada a mano (PDF escaneado).</p>
    <div class="cupos-wrap"><table class="cupos-table"><thead><tr><th>Nombre</th><th>Rol</th><th>Firma</th></tr></thead><tbody>` +
    o.participantes.map((p,i)=>`<tr><td><b>${esc(p.nombre)}</b></td><td>${esc(p.cargo || '')}${p.es_empresa ? ' <span class="cor-est cor-enviado">Empresa</span>' : ''}</td><td><canvas id="acSig-${i}" class="sigpad" style="width:100%;max-width:320px;height:130px;border:1px solid var(--line,#ccc);border-radius:8px;"></canvas><br><button class="ghost" style="font-size:12px;padding:3px 8px;" onclick="clearSig('acSig-${i}')">Borrar</button></td></tr>`).join('') +
    `</tbody></table></div>
    <div class="actions-row" style="justify-content:flex-start;"><button class="primary" onclick="acFinalizarPantalla()">✔ Generar el acta firmada y enviarla</button></div>
    <div class="subhead">…o subir el acta firmada y escaneada</div>
    <div class="field"><input type="file" id="acArchivo" accept="application/pdf,.pdf"></div>
    <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="acFinalizarEscaneada()">Subir PDF firmado y enviarlo</button></div></div>`;
  acActual.parts = o.participantes;
  o.participantes.forEach((p,i)=>initSigPad('acSig-' + i));
  cont.scrollIntoView({ behavior:'smooth' });
}
function acB64(bytes){ let s = ''; for(let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)); return btoa(s); }
async function acFinalizarPantalla(){
  const partes = acActual.parts.map((p,i)=>Object.assign({}, p, { firma: sigDataUrl('acSig-' + i) || '' }));
  const emp = partes.filter(p=>p.es_empresa);
  if(!emp.some(p=>p.firma)){ toast('Falta la firma de la empresa', true); return; }
  const sinFirma = partes.filter(p=>!p.firma).map(p=>p.nombre);
  if(sinFirma.length && !confirm('Faltan las firmas de: ' + sinFirma.join(', ') + '.\n¿Generar el acta de todos modos?')) return;
  if(typeof PDFLib === 'undefined'){ toast('No cargó el generador de PDF. Revisa tu conexión y recarga.', true); return; }
  const o = acDatos(); o.participantes = partes;
  const g = await sb.rpc('admin_acta_guardar', { p_id: acActual.id, p_datos: o }); if(g.error){ toast(g.error.message, true); return; }
  try{
    toast('Generando el acta…');
    const bytes = await acGenerarPdf(o);
    const r = await sb.rpc('admin_acta_finalizar', { p_id: acActual.id, p_origen: 'pantalla', p_nombre: 'acta-comite-' + o.documento + '.pdf', p_base64: acB64(bytes) });
    if(r.error){ toast(r.error.message, true); return; }
    toast('Acta firmada y archivada'); await acEnviar(acActual.id, true);
  }catch(e){ console.error(e); toast('No se pudo generar el acta: ' + e.message, true); }
}
async function acFinalizarEscaneada(){
  const f = (document.getElementById('acArchivo').files || [])[0];
  if(!f){ toast('Elige el PDF del acta firmada', true); return; }
  if(!/\.pdf$/i.test(f.name) || f.size > 8 * 1048576){ toast('Debe ser un PDF de máximo 8 MB', true); return; }
  const o = await acGuardar(true); if(!o) return;
  const b64 = await asisLeerB64(f);
  const r = await sb.rpc('admin_acta_finalizar', { p_id: acActual.id, p_origen: 'escaneada', p_nombre: f.name, p_base64: b64 });
  if(r.error){ toast(r.error.message, true); return; }
  toast('Acta archivada'); await acEnviar(acActual.id, true);
}

/* ---------------- Envío por correo (estudiante y empresa) ---------------- */
async function acEnviar(id, volverALista){
  const g = await sb.rpc('admin_acta_get', { p_id: id }); if(g.error){ toast(g.error.message, true); return; }
  const a = g.data.acta, st = g.data.estudiante;
  const dest = [];
  const add = (c, quien)=>{ c = String(c || '').trim().toLowerCase(); if(c && corEmailOk(c) && !dest.some(d=>d.to === c)) dest.push({ to:c, quien }); };
  add(st.correo, 'estudiante'); add(a.empresa_correo, 'empresa');
  if(!dest.length){ toast('El estudiante y la empresa no tienen correo registrado. Corrígelos en el acta (ábrela desde el borrador) o en su ficha.', true); if(volverALista) abrirActas(); return; }
  const faltan = [!corEmailOk(st.correo) ? 'el estudiante' : '', !corEmailOk(a.empresa_correo) ? 'la empresa' : ''].filter(Boolean);
  if(!confirm('Se enviará el acta firmada a:\n• ' + dest.map(d=>d.to + ' (' + d.quien + ')').join('\n• ') + (faltan.length ? '\n\n(Sin correo válido: ' + faltan.join(' y ') + ')' : '') + '\n\n¿Enviar ahora?')){ if(volverALista) abrirActas(); return; }
  const p = await sb.rpc('admin_acta_pdf', { p_id: id }); if(p.error){ toast(p.error.message, true); return; }
  const asunto = 'Acta de comité' + (a.numero ? ' N.º ' + a.numero : '') + ' - ' + (st.nombre || a.documento);
  const items = dest.map(d=>({ to:d.to, asunto, texto:'Cordial saludo,\n\nAdjuntamos el acta de comité' + (a.nombre_comite ? ' «' + a.nombre_comite + '»' : '') + ' del ' + asisFechaCorta(a.fecha) + ', relacionada con ' + (st.nombre || 'el estudiante') + ', firmada por los participantes.\n\nPolitécnico Campoalto' }));
  try{
    const r = await correoEnviarItems('carta', items, { nombre: 'acta-comite-' + a.documento + '.pdf', base64: p.data.base64 });
    if(r.errores.length){ toast('Algunos correos no salieron: ' + (r.errores[0].error || ''), true); }
    if(r.enviados){ await sb.rpc('admin_acta_enviada', { p_id: id, p_a: dest.map(d=>d.to).join(', ') }); toast('Acta enviada a ' + r.enviados + ' destinatario(s)'); }
  }catch(e){ toast('No se pudo enviar: ' + e.message, true); }
  if(volverALista) abrirActas(); else acCargar();
}

/* ---------------- PDF del acta (mismo formato del PE-SGI-F-015) ---------------- */
async function acGenerarPdf(a){
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdf = await PDFDocument.create();
  const F = await pdf.embedFont(StandardFonts.Helvetica), FB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(Uint8Array.from(atob(ACTA_LOGO_B64), c=>c.charCodeAt(0)));
  const naranja = rgb(0.81, 0.43, 0.09), negro = rgb(0.05, 0.05, 0.05), gris = rgb(0.45, 0.45, 0.45), blanco = rgb(1, 1, 1);
  const W = 612, H = 792, X0 = 46, X1 = 566, AN = X1 - X0, TOP = 690, BOT = 86;
  const limpiar = t=>String(t == null ? '' : t).replace(/[–—]/g, '-').replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...').replace(/\r/g, '').replace(/[^\n\x20-\x7E\xA0-\xFF]/g, '?');
  const envolver = (t, f, sz, ancho)=>{
    const out = [];
    limpiar(t).split('\n').forEach(par=>{
      const pal = par.split(' '); let ln = '';
      pal.forEach(w=>{ const prueba = ln ? ln + ' ' + w : w; if(f.widthOfTextAtSize(prueba, sz) <= ancho) ln = prueba; else { if(ln) out.push(ln); ln = w; } });
      out.push(ln);
    });
    return out;
  };
  const paginas = []; let pg = null, y = 0;
  const nueva = ()=>{
    pg = pdf.addPage([W, H]); paginas.push(pg);
    pg.drawRectangle({ x:X0, y:702, width:AN, height:50, borderColor:negro, borderWidth:0.8 });
    pg.drawLine({ start:{ x:X0 + 130, y:702 }, end:{ x:X0 + 130, y:752 }, thickness:0.8, color:negro });
    pg.drawLine({ start:{ x:X1 - 120, y:702 }, end:{ x:X1 - 120, y:752 }, thickness:0.8, color:negro });
    pg.drawImage(logo, { x:X0 + 12, y:708, width:100, height:100 * 173 / 396 });
    const t = 'ACTA DE COMITE'; pg.drawText('ACTA DE COMIT\xC9', { x: X0 + 130 + (AN - 250) / 2 - FB.widthOfTextAtSize('ACTA DE COMIT\xC9', 15) / 2, y:722, size:15, font:FB, color:negro });
    ['VERSI\xD3N: 4', 'C\xD3DIGO: PE-SGI-F-015'].forEach((s,i)=>pg.drawText(s, { x:X1 - 114, y:738 - i * 11, size:8.5, font:F, color:negro }));
    // pie
    const cel = [['Elabor\xF3: Coordinaci\xF3n de Planeaci\xF3n y SGI', 'Fecha: 05 de Mayo de 2020'], ['Revis\xF3: Rector', 'Fecha: 14 de Mayo de 2020'], ['Aprob\xF3: Comit\xE9 de SGI', 'Fecha: 14 de Mayo de 2020']];
    cel.forEach((c,i)=>{ const x = X0 + i * AN / 3; pg.drawRectangle({ x, y:40, width:AN / 3, height:34, borderColor:negro, borderWidth:0.6 }); c.forEach((s,j)=>pg.drawText(s, { x:x + 5, y:62 - j * 12, size:7.5, font:F, color:negro })); });
    y = TOP;
  };
  const asegurar = h=>{ if(y - h < BOT) nueva(); };
  const banda = titulo=>{ asegurar(60); pg.drawRectangle({ x:X0, y:y - 16, width:AN, height:16, color:naranja }); const s = limpiar(titulo).toUpperCase(); pg.drawText(s, { x:X0 + AN / 2 - F.widthOfTextAtSize(s, 9) / 2, y:y - 12, size:9, font:F, color:blanco }); y -= 16; };
  const caja = (x, yTop, w, h)=>pg.drawRectangle({ x, y:yTop - h, width:w, height:h, borderColor:negro, borderWidth:0.6 });
  const campo = (et, val, x, w)=>{ pg.drawText(limpiar(et), { x, y, size:8.5, font:FB, color:negro }); const ex = FB.widthOfTextAtSize(limpiar(et), 8.5) + 4; envolver(val, F, 8.5, w - ex).slice(0, 3).forEach((ln,i)=>pg.drawText(ln, { x:x + ex, y:y - i * 11, size:8.5, font:F, color:negro })); };
  const texto = (val, minH)=>{
    const lineas = envolver(val || '', F, 9, AN - 14); let i = 0; let primera = true;
    while(primera || i < lineas.length){
      primera = false; asegurar(40);
      const disp = Math.floor((y - BOT - 8) / 12); const n = Math.max(1, Math.min(lineas.length - i, disp));
      const h = Math.max(n * 12 + 10, i === 0 && lineas.length <= disp ? minH : 0);
      caja(X0, y, AN, h); lineas.slice(i, i + n).forEach((ln,k)=>pg.drawText(ln, { x:X0 + 7, y:y - 14 - k * 12, size:9, font:F, color:negro })); y -= h; i += n; if(i >= lineas.length) break;
    }
    y -= 12;
  };
  nueva();
  banda('Datos generales comit\xE9'); asegurar(150);
  const hh = 130; caja(X0, y, AN, hh); y -= 14;
  campo('Fecha:', asisFechaCorta(a.fecha), X0 + 6, 220); campo('No.', a.numero || '', X0 + 250, 100); y -= 14;
  campo('Lugar:', a.lugar, X0 + 6, AN - 12); y -= 14; campo('Nombre del Comit\xE9:', a.nombre_comite, X0 + 6, AN - 12); y -= 14; campo('Presidente:', a.presidente, X0 + 6, AN - 12); y -= 14;
  campo('L\xEDder de Comit\xE9:', a.lider, X0 + 6, AN - 12); y -= 14; campo('Secretario:', a.secretario, X0 + 6, AN - 12); y -= 14;
  campo('Objetivo de la reuni\xF3n:', a.objetivo, X0 + 6, AN - 12); y -= 22; campo('Hora de inicio:', a.hora_inicio, X0 + 6, 200); campo('Hora fin:', a.hora_fin, X0 + 260, 200);
  y = TOP - 16 - hh - 12;
  banda('Participantes'); asegurar(30); pg.drawText('Nombres:', { x:X0 + 5, y:y - 11, size:8.5, font:F, color:negro }); pg.drawText('Cargo:', { x:X0 + AN / 2 + 5, y:y - 11, size:8.5, font:F, color:negro }); caja(X0, y, AN, 16); y -= 16;
  a.participantes.forEach(p=>{ const l1 = envolver(p.nombre, F, 9, AN / 2 - 12), l2 = envolver(p.cargo || '', F, 9, AN / 2 - 12), n = Math.max(l1.length, l2.length), h = n * 12 + 6; asegurar(h);
    caja(X0, y, AN / 2, h); caja(X0 + AN / 2, y, AN / 2, h); l1.forEach((s,k)=>pg.drawText(s, { x:X0 + 5, y:y - 12 - k * 12, size:9, font:F, color:negro })); l2.forEach((s,k)=>pg.drawText(s, { x:X0 + AN / 2 + 5, y:y - 12 - k * 12, size:9, font:F, color:negro })); y -= h; });
  y -= 14;
  banda('Actividades ejecutadas'); texto(a.actividades, 60);
  banda('Desarrollo'); texto(a.desarrollo, 120);
  banda('Compromisos adquiridos'); asegurar(34);
  const c1 = AN * 0.5, c2 = AN * 0.25;
  const filaComp = (v, neg)=>{ const l = [envolver(v[0], neg ? FB : F, 8.5, c1 - 10), envolver(v[1], neg ? FB : F, 8.5, c2 - 10), envolver(v[2], neg ? FB : F, 8.5, AN - c1 - c2 - 10)], n = Math.max(l[0].length, l[1].length, l[2].length), h = n * 11 + 8; asegurar(h);
    [[X0, c1], [X0 + c1, c2], [X0 + c1 + c2, AN - c1 - c2]].forEach(([x,w],k)=>{ caja(x, y, w, h); l[k].forEach((s,j)=>pg.drawText(s, { x:x + 5, y:y - 11 - j * 11, size:8.5, font:neg ? FB : F, color:negro })); }); y -= h; };
  filaComp(['Actividad', 'Responsable', 'Fecha l\xEDmite de entrega'], true);
  (a.compromisos.length ? a.compromisos : [{ actividad:'', responsable:'', fecha:'' }]).forEach(c=>filaComp([c.actividad || '', c.responsable || '', c.fecha ? asisFechaCorta(c.fecha) : ''], false));
  y -= 14; asegurar(60); pg.drawText('En constancia firman.', { x:X0, y, size:9, font:F, color:negro }); y -= 10;
  banda('Firmas'); asegurar(40);
  const f1 = AN * 0.38, f2 = AN * 0.27, f3 = AN - f1 - f2;
  [[X0, f1, 'Nombre'], [X0 + f1, f2, 'Rol'], [X0 + f1 + f2, f3, 'Firma']].forEach(([x,w,t])=>{ caja(x, y, w, 16); pg.drawText(t, { x:x + 5, y:y - 11, size:8.5, font:FB, color:negro }); }); y -= 16;
  for(const p of a.participantes){
    asegurar(52); const h = 50;
    [[X0, f1], [X0 + f1, f2], [X0 + f1 + f2, f3]].forEach(([x,w])=>caja(x, y, w, h));
    envolver(p.nombre, F, 8.5, f1 - 10).slice(0, 3).forEach((s,k)=>pg.drawText(s, { x:X0 + 5, y:y - 13 - k * 11, size:8.5, font:F, color:negro }));
    envolver((p.es_empresa ? 'Empresa - ' : '') + (p.cargo || ''), F, 8.5, f2 - 10).slice(0, 3).forEach((s,k)=>pg.drawText(s, { x:X0 + f1 + 5, y:y - 13 - k * 11, size:8.5, font:F, color:negro }));
    if(p.firma){ try{ const im = await pdf.embedPng(Uint8Array.from(atob(p.firma.split(',')[1]), c=>c.charCodeAt(0))); const esc2 = Math.min((f3 - 12) / im.width, (h - 8) / im.height); pg.drawImage(im, { x:X0 + f1 + f2 + 6, y:y - h + 4, width:im.width * esc2, height:im.height * esc2 }); }catch(_){} }
    y -= h;
  }
  paginas.forEach((p,i)=>{ const s = 'P\xC1GINA ' + (i + 1) + ' DE ' + paginas.length; p.drawText(s, { x:X1 - 114, y:716, size:8.5, font:F, color:negro }); });
  pdf.setTitle('Acta de comite ' + (a.numero || '')); pdf.setAuthor('Politecnico Campoalto');
  return await pdf.save();
}

/* ---------------- Estudiante y empresa: actas archivadas con las planillas ---------------- */
async function actasMiLista(m){
  const caja = document.getElementById('actasCaja-' + m); if(!caja) return;
  const r = m === 'est' ? await sb.rpc('est_actas_lista', { p_token: state.token }) : await sb.rpc('emp_actas_lista', { p_token: state.token, p_documento: state.documento });
  if(r.error){ caja.innerHTML = '<p style="color:var(--danger)">' + esc(r.error.message) + ' (¿ejecutaste actas-comite-etapa32.sql?)</p>'; return; }
  const items = (r.data && r.data.items) || [];
  caja.innerHTML = !items.length ? '<p style="color:var(--muted);font-size:13.5px;">No hay actas de comité archivadas.</p>'
    : '<div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>N.º</th><th>Fecha</th><th>Comité</th><th>Objetivo</th><th>Participantes</th><th></th></tr></thead><tbody>' +
      items.map(i=>`<tr><td>${esc(i.numero || '—')}</td><td class="aud-nw">${asisFechaCorta(i.fecha)}</td><td>${esc(i.nombre_comite || '—')}</td><td>${esc(i.objetivo || '—')}</td><td>${i.participantes}</td><td><button class="ghost" onclick="actasVer('${m}','${i.id}')">Ver acta</button></td></tr>`).join('') + '</tbody></table></div>';
}
function actasVer(m, id){
  return spaVisorPdf('Acta de comité', ()=> m === 'est' ? sb.rpc('est_acta_pdf', { p_token: state.token, p_id: id }) : sb.rpc('emp_acta_pdf', { p_token: state.token, p_documento: state.documento, p_id: id }));
}

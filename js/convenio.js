/* ============================= CONTRATO DE APRENDIZAJE · CONVENIO =============================
   Grupos de estudiantes que YA fueron aceptados por una empresa (sin entrevistas ni ofertas).
   Flujo: 1) Preinscribir al grupo (Excel o selección manual)  2) Generar y enviar las cartas de fechas a la empresa (y al estudiante)
          3) FORMALIZAR (contrato firmado): solo entonces se habilitan las planillas, que además se envían por correo.
   Requiere convenio-aprendizaje-etapa33.sql. Los PDF se generan en el navegador con pdf-lib. */
let cvLista = [], cvOpc = null, cvSel = new Map(), cvDet = null, cvMarcados = new Set();
const cvF = iso => (typeof asisFechaCorta === 'function' ? asisFechaCorta(iso) : (iso || '')) || '—';
const cvEstTxt = { preinscrito:'Preinscrito', carta_enviada:'Carta enviada', formalizado:'Formalizado', retirado:'Retirado' };
const cvEstCls = { preinscrito:'cor-pendiente', carta_enviada:'cor-pendiente', formalizado:'cor-enviado', retirado:'cor-error' };
const cvErr = e => (typeof errMsg === 'function' ? errMsg(e) : (e && e.message) || 'Error');

/* ---------------- Lista de convenios ---------------- */
async function abrirConvenios(){
  if(!requireSupabase()) return;
  const el = spaPantalla('screen-admin-convenios'); if(!el) return;
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Contratos de aprendizaje · Convenio</h2>
    <p class="helptext" style="text-align:justify;">Para grupos de estudiantes que <b>ya fueron aceptados por una empresa</b> sin pasar por entrevistas. Preinscribe al grupo, envía las <b>cartas de fechas</b> a la empresa y, cuando el contrato esté firmado, <b>formaliza</b>: solo entonces se habilitan las planillas (que también se envían por correo).</p>
    <div class="card"><div class="actions-row" style="justify-content:flex-start;"><button class="primary" onclick="cvNuevo()">+ Nuevo convenio</button><button class="ghost" onclick="cvCargar()">Actualizar</button></div>
    <div id="cvLista"><p style="color:var(--muted)">Cargando…</p></div></div>`;
  showScreen('screen-admin-convenios'); cvCargar();
}
async function cvCargar(){
  const t = document.getElementById('cvLista'); if(!t) return;
  const { data, error } = await sb.rpc('admin_convenios_lista');
  if(error){ t.innerHTML = '<p style="color:var(--danger)">' + esc(cvErr(error)) + ' (¿ejecutaste convenio-aprendizaje-etapa33.sql?)</p>'; return; }
  cvLista = data || [];
  if(!cvLista.length){ t.innerHTML = '<p style="color:var(--muted);font-size:13.5px;">Aún no hay convenios.</p>'; return; }
  t.innerHTML = '<div class="lista-cuenta">' + cvLista.length + ' convenio(s)</div><div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Convenio</th><th>Empresa</th><th>Modalidad</th><th>Estudiantes</th><th>Preinscritos</th><th>Carta enviada</th><th>Formalizados</th><th></th></tr></thead><tbody>' +
    cvLista.map(c=>`<tr><td><b>${esc(c.nombre)}</b><br><span class="aud-ref">${cvF(c.creado)}</span></td><td>${esc(c.empresa)}</td><td>${esc(c.modalidad || '—')}</td><td>${c.total}</td><td>${c.preinscritos}</td><td>${c.cartas}</td><td>${c.formalizados}</td>
      <td class="aud-nw"><button class="primary" onclick="cvDetalle('${c.id}')">Abrir</button></td></tr>`).join('') + '</tbody></table></div>';
}

/* ---------------- Selector de estudiantes (Excel + manual) ---------------- */
function cvNormFecha(v){
  v = String(v == null ? '' : v).trim(); if(!v) return '';
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[1] + '-' + m[2] + '-' + m[3];
  m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/); if(m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  return 'ERR';
}
function cvPickerHtml(){
  return `<div class="section-bar deep">Estudiantes del grupo</div>
    <p class="helptext">Elige cómo agregarlos (puedes combinar): <b>Excel</b>, <b>buscar y marcar</b> o <b>pegar documentos</b>.</p>
    <div class="actions-row" style="justify-content:flex-start;flex-wrap:wrap;">
      <button class="ghost" type="button" onclick="cvPlantilla()">⬇ Plantilla de Excel</button>
      <label class="ghost" style="cursor:pointer;padding:8px 12px;border:1px solid var(--line);border-radius:8px;">⬆ Subir Excel<input type="file" accept=".xlsx,.xls,.csv" style="display:none" onchange="cvLeerExcel(this)"></label></div>
    <div class="field-row"><div class="field"><label>Buscar estudiante (nombre o documento)</label><span style="display:flex;gap:6px;"><input id="cvBuscar" maxlength="60" onkeydown="if(event.key==='Enter'){event.preventDefault();cvBuscar();}"><button class="ghost" type="button" onclick="cvBuscar()">Buscar</button></span></div>
      <div class="field"><label>Pegar documentos (uno por línea o separados por coma)</label><span style="display:flex;gap:6px;"><textarea id="cvPegar" rows="2" maxlength="6000"></textarea><button class="ghost" type="button" onclick="cvPegarDocs()">Agregar</button></span></div></div>
    <div id="cvResBusca"></div><div id="cvSelBox"></div>`;
}
function cvPintarSel(){
  const b = document.getElementById('cvSelBox'); if(!b) return;
  if(!cvSel.size){ b.innerHTML = '<p style="color:var(--muted);font-size:13.5px;">Todavía no has elegido estudiantes.</p>'; return; }
  const nuevos = [...cvSel.values()].filter(x=>x.reg === false).length;
  b.innerHTML = '<div class="lista-cuenta">' + cvSel.size + ' estudiante(s) por preinscribir' + (nuevos ? ' · <b>' + nuevos + ' nuevo(s)</b> (se crearán con los datos del Excel)' : '') + '</div><div class="cupos-wrap"><table class="cupos-table aud-tabla" style="min-width:860px"><thead><tr><th>Documento</th><th>Nombre</th><th>Programa</th><th>Correo</th><th>Teléfono</th><th>Estado</th><th>Fechas propias</th><th></th></tr></thead><tbody>' +
    [...cvSel.entries()].map(([d, x])=>{
      const dt = x.datos || {}, nom = x.nombre || (dt.nombre || [dt.nombres, dt.apellidos].filter(Boolean).join(' ')) || '';
      const falta = x.reg === false && !nom;
      return `<tr><td>${esc(d)}</td><td>${esc(nom || '—')}</td><td>${esc(dt.programa || x.programa || '—')}</td><td>${esc(dt.correo || x.correo || '—')}</td><td>${esc(dt.telefono || x.telefono || '—')}</td>
      <td>${x.reg === true ? '✔ Registrado' : x.reg === false ? (falta ? '<span style="color:var(--danger)">Sin datos: no se podrá crear</span>' : '🆕 Nuevo') : '…'}</td>
      <td>${x.fechas && Object.keys(x.fechas).length ? 'Sí (del Excel)' : 'Las del grupo'}</td><td><button class="danger" type="button" onclick="cvQuitarSel('${esc(d)}')">Quitar</button></td></tr>`;
    }).join('') + '</tbody></table></div>';
}
// Consulta a los que aún no se sabe si están registrados y trae sus datos para mostrarlos
async function cvCompletar(){
  const pend = [...cvSel.entries()].filter(([, x])=>x.reg === undefined).map(([d])=>d); if(!pend.length) return;
  for(let i = 0; i < pend.length; i += 150){
    const lote = pend.slice(i, i + 150);
    const { data, error } = await sb.from('students').select('documento,nombre,programa,correo,telefono').in('documento', lote);
    if(error){ toast('No se pudo consultar a los estudiantes: ' + error.message, true); return; }
    const mapa = new Map((data || []).map(x=>[x.documento, x]));
    lote.forEach(d=>{ const x = cvSel.get(d); if(!x) return; const r = mapa.get(d);
      if(r){ x.reg = true; x.nombre = x.nombre || r.nombre || ''; x.programa = r.programa || ''; x.correo = r.correo || ''; x.telefono = r.telefono || ''; } else x.reg = false; });
  }
  cvPintarSel();
}
function cvQuitarSel(d){ cvSel.delete(d); cvPintarSel(); }
function cvAgregarSel(d, nombre, fechas, datos){ d = String(d || '').trim(); if(!d || d.length > 30) return; const p = cvSel.get(d) || {}; cvSel.set(d, { nombre: nombre || p.nombre || '', fechas: fechas || p.fechas || null, datos: datos || p.datos || null, reg: p.reg, programa: p.programa, correo: p.correo, telefono: p.telefono }); }
async function cvBuscar(){
  const q = (document.getElementById('cvBuscar').value || '').trim().replace(/[%,()]/g, ' ');
  const box = document.getElementById('cvResBusca'); if(q.length < 2){ toast('Escribe al menos 2 caracteres', true); return; }
  box.innerHTML = '<p style="color:var(--muted)">Buscando…</p>';
  const { data, error } = await sb.from('students').select('documento,nombre,programa').or('nombre.ilike.%' + q + '%,documento.ilike.%' + q + '%').order('nombre').limit(40);
  if(error){ box.innerHTML = '<p style="color:var(--danger)">' + esc(error.message) + '</p>'; return; }
  if(!(data || []).length){ box.innerHTML = '<p style="color:var(--muted)">Sin resultados.</p>'; return; }
  box.innerHTML = '<div class="cupos-wrap"><table class="cupos-table aud-tabla" style="min-width:560px"><thead><tr><th>Documento</th><th>Nombre</th><th>Programa</th><th></th></tr></thead><tbody>' +
    data.map(s=>`<tr><td>${esc(s.documento)}</td><td>${esc(s.nombre)}</td><td>${esc(s.programa || '')}</td><td><button class="ghost" type="button" onclick="cvAgregarSel('${esc(s.documento)}','${esc(s.nombre).replace(/'/g, '&#39;')}');cvPintarSel();cvCompletar()">+ Agregar</button></td></tr>`).join('') + '</tbody></table></div>';
}
function cvPegarDocs(){
  const t = document.getElementById('cvPegar'); const docs = (t.value || '').split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean);
  if(!docs.length){ toast('Pega al menos un documento', true); return; }
  docs.forEach(d=>cvAgregarSel(d)); t.value = ''; cvPintarSel(); toast(docs.length + ' documento(s) agregado(s)'); cvCompletar();
}
function cvPlantilla(){
  if(typeof ieDescargarXlsx !== 'function'){ toast('No está disponible la descarga de Excel', true); return; }
  ieDescargarXlsx('plantilla-convenio', ['documento', 'nombres', 'apellidos', 'correo', 'telefono', 'programa', 'sede', 'semestre', 'periodo', 'lectiva_inicio', 'lectiva_fin', 'productiva_inicio', 'productiva_fin'],
    [['1020304050', 'Ana María', 'Pérez Gómez', 'ana@correo.com', '3001234567', 'Auxiliar Administrativo en Salud', 'Bogotá', '1', '2026-2', '', '', '', ''],
     ['1020304051', 'Luis', 'Rojas Díaz', 'luis@correo.com', '3009876543', 'Auxiliar Administrativo en Salud', 'Bogotá', '1', '2026-2', '2026-01-15', '2026-04-15', '2026-04-16', '2026-10-16']], 'Convenio', false);
}
async function cvLeerExcel(input){
  const file = input.files && input.files[0]; if(!file) return;
  try{
    if(typeof XLSX === 'undefined') throw new Error('No cargó la librería de Excel (revisa tu conexión)');
    if(!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error('El archivo debe ser Excel (.xlsx) o CSV');
    if(file.size > 5 * 1024 * 1024) throw new Error('El archivo supera 5 MB');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
    const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
    let n = 0, malas = 0;
    rows.slice(0, 500).forEach(r=>{
      const k = {}; Object.keys(r).forEach(c=>{ k[norm(c)] = r[c]; });
      const doc = String(k.documento || k.cedula || k.identificacion || k.numerodocumento || '').trim(); if(!doc) return;
      const f = { lectiva_ini: cvNormFecha(k.lectivainicio || k.lectivaini), lectiva_fin: cvNormFecha(k.lectivafin), prod_ini: cvNormFecha(k.productivainicio || k.prodini), prod_fin: cvNormFecha(k.productivafin || k.prodfin) };
      if(Object.values(f).includes('ERR')){ malas++; return; }
      Object.keys(f).forEach(x=>{ if(!f[x]) delete f[x]; });
      const dt = { nombres: String(k.nombres || k.nombre || '').trim(), apellidos: String(k.apellidos || '').trim(), correo: String(k.correo || k.email || k.correoelectronico || '').trim(), telefono: String(k.telefono || k.celular || '').trim(),
        programa: String(k.programa || '').trim(), sede: String(k.sede || '').trim(), semestre: String(k.semestre || '').trim(), periodo: String(k.periodo || k.periodoacademico || '').trim() };
      if(!k.apellidos && dt.nombres){ dt.nombre = dt.nombres; delete dt.nombres; }     // si solo hay una columna «nombre», es el nombre completo
      Object.keys(dt).forEach(x=>{ if(!dt[x]) delete dt[x]; });
      cvAgregarSel(doc, '', Object.keys(f).length ? f : null, Object.keys(dt).length ? dt : null); n++;
    });
    cvPintarSel(); cvCompletar(); toast(n + ' estudiante(s) leído(s) del Excel' + (malas ? ' · ' + malas + ' fila(s) con fechas inválidas (use AAAA-MM-DD o DD/MM/AAAA)' : ''), !n);
  }catch(e){ toast(e.message, true); }
  input.value = '';
}
const cvEstLista = () => [...cvSel.entries()].map(([d, x])=>Object.assign({ documento: d }, x.datos || {}, x.fechas || {}));
function cvMostrarOmitidos(r){
  const om = (r && r.omitidos) || [];
  if(!om.length) return;
  alert('Se agregaron ' + r.agregados + ' estudiante(s)' + (r.creados ? ' (' + r.creados + ' nuevo(s) creado(s) con los datos del Excel)' : '') + '. No se pudieron agregar ' + om.length + ':\n\n' + om.slice(0, 40).map(o=>'• ' + o.documento + ': ' + o.motivo).join('\n') + (om.length > 40 ? '\n…' : ''));
}

/* ---------------- Nuevo convenio ---------------- */
async function cvNuevo(){
  const el = spaPantalla('screen-admin-convenio'); if(!el) return;
  const r = await sb.rpc('admin_convenio_opciones'); if(r.error){ toast(cvErr(r.error), true); return; }
  cvOpc = r.data; cvSel = new Map();
  el.innerHTML = `<button class="linkbtn" onclick="abrirConvenios()">← Volver a los convenios</button>
    <h2 style="margin:12px 0 4px;">Nuevo convenio</h2>
    <div class="card"><div class="section-bar deep">Datos del convenio</div>
      <div class="field-row"><div class="field"><label>Nombre del grupo *</label><input id="cv-nombre" maxlength="160" placeholder="Ej. Auxiliares de enfermería – Clínica X 2026-2"></div>
        <div class="field"><label>Empresa (aprobada) *</label><select id="cv-empresa" onchange="cvEmpresaElegida()"><option value="">— Elige —</option>${cvOpc.empresas.map(e=>`<option value="${e.id}">${e.convenio ? '🤝 ' : ''}${esc(e.nombre)} · NIT ${esc(e.nit)}${e.convenio ? ' · Convenio: ' + esc(e.convenio) : ''}</option>`).join('')}</select></div></div>
      ${cvOpc.empresas.length ? '' : '<p class="helptext" style="color:var(--danger)">No hay empresas aprobadas. Apruébalas primero en «Empresas de contrato de aprendizaje».</p>'}
      <div class="field-row"><div class="field"><label>Modalidad</label><select id="cv-modalidad">${cvOpc.modalidades.length ? cvOpc.modalidades.map(m=>`<option>${esc(m)}</option>`).join('') : '<option value="">(crea una modalidad «Contrato de aprendizaje convenio» en Modalidades)</option>'}</select></div>
        <div class="field"><label>Ciudad</label><input id="cv-ciudad" maxlength="100" placeholder="Bogotá D.C."></div></div>
      <div class="field-row"><div class="field"><label>Etapa lectiva · inicio</label><input id="cv-li" type="date"></div><div class="field"><label>Etapa lectiva · fin</label><input id="cv-lf" type="date"></div>
        <div class="field"><label>Etapa productiva · inicio</label><input id="cv-pi" type="date"></div><div class="field"><label>Etapa productiva · fin</label><input id="cv-pf" type="date"></div></div>
      <p class="helptext">Estas fechas valen para todo el grupo. Si algún estudiante tiene fechas distintas, ponlas en el Excel. Las 4 fechas son necesarias para generar las cartas.</p>
      <div class="field"><label>Observación</label><input id="cv-obs" maxlength="500"></div></div>
    <div class="card">${cvPickerHtml()}</div>
    <div class="actions-row"><button class="primary" id="cvCrearBtn" onclick="cvCrear()">Crear convenio y preinscribir</button></div>`;
  showScreen('screen-admin-convenio'); cvPintarSel();
}
function cvEmpresaElegida(){          // al elegir una empresa con convenio, propone el nombre del convenio como nombre del grupo
  const id = (document.getElementById('cv-empresa') || {}).value, n = document.getElementById('cv-nombre');
  const e = ((cvOpc && cvOpc.empresas) || []).find(x=>x.id === id);
  if(e && e.convenio && n && !n.value.trim()) n.value = e.convenio;
  const c = document.getElementById('cv-ciudad'); if(e && e.ciudad && c && !c.value.trim()) c.value = e.ciudad;
}
async function cvCrear(){
  const g = id => (document.getElementById(id) || {}).value || '';
  if(g('cv-nombre').trim().length < 2){ toast('Escribe el nombre del grupo', true); return; }
  if(!g('cv-empresa')){ toast('Elige la empresa', true); return; }
  if(!cvSel.size && !confirm('No elegiste estudiantes. ¿Crear el convenio vacío (podrás agregarlos después)?')) return;
  const btn = document.getElementById('cvCrearBtn'); btn.disabled = true;
  const { data, error } = await sb.rpc('admin_convenio_crear', { p_datos: { nombre: g('cv-nombre').trim(), empresa_id: g('cv-empresa'), modalidad: g('cv-modalidad'), ciudad: g('cv-ciudad').trim(), lectiva_ini: g('cv-li'), lectiva_fin: g('cv-lf'), prod_ini: g('cv-pi'), prod_fin: g('cv-pf'), observacion: g('cv-obs').trim() }, p_est: cvEstLista() });
  btn.disabled = false;
  if(error){ toast(cvErr(error), true); return; }
  toast('Convenio creado · ' + data.agregados + ' estudiante(s) preinscrito(s)' + (data.creados ? ' · ' + data.creados + ' nuevo(s) creado(s)' : '')); cvMostrarOmitidos(data); cvSel = new Map(); cvDetalle(data.id);
}

/* ---------------- Detalle ---------------- */
let cvContr = {};
const cvContrTxt = x => { const k = cvContr[x.documento]; if(!k) return x.estado === 'carta_enviada' ? '<br><span class="aud-ref">📄 Sin contrato firmado</span>' : ''; return '<br><span class="aud-ref">📄 ' + ({ pendiente:'Contrato por revisar', aceptado:'Contrato aceptado', rechazado:'Contrato devuelto' }[k.estado] || '') + '</span>'; };
const cvContrBtn = x => cvContr[x.documento] ? `<button class="ghost" onclick="cvVerContrato('${esc(x.documento)}')">Ver contrato</button>` + (cvContr[x.documento].estado === 'pendiente' && x.estado === 'carta_enviada' ? ` <button class="ghost" onclick="cvDevolverContrato('${esc(x.documento)}')">Devolver</button>` : '') + ' ' : '';
function cvVerContrato(doc){ return spaVisorPdf('Contrato firmado', ()=>sb.rpc('admin_convenio_contrato_doc', { p_id: cvDet.convenio.id, p_documento: doc })); }
async function cvDevolverContrato(doc){
  const m = prompt('Motivo para devolver el contrato (mínimo 5 caracteres). El estudiante lo verá y podrá subirlo de nuevo:'); if(m === null) return;
  const { error } = await sb.rpc('admin_convenio_contrato_devolver', { p_id: cvDet.convenio.id, p_documento: doc, p_obs: m });
  if(error){ toast(cvErr(error), true); return; } toast('Contrato devuelto al estudiante'); cvDetalle(cvDet.convenio.id);
}
async function cvDetalle(id){
  const el = spaPantalla('screen-admin-convenio'); if(!el) return;
  const r = await sb.rpc('admin_convenio_detalle', { p_id: id }); if(r.error){ toast(cvErr(r.error), true); return; }
  cvDet = r.data; cvMarcados = new Set(); cvSel = new Map();
  cvContr = {}; try{ const rc = await sb.rpc('admin_convenio_contratos', { p_id: id }); if(!rc.error) (rc.data || []).forEach(k=>{ cvContr[k.documento] = k; }); }catch(_){}   // sin la etapa 60 simplemente no hay contratos
  const c = cvDet.convenio, e = cvDet.empresa, ests = cvDet.estudiantes;
  const activos = ests.filter(x=>x.estado !== 'retirado');
  const inp = (k, v) => `<div class="field"><label>${k}</label><input type="date" id="cvf-${k.replace(/\W/g, '')}" value="${esc((v || '').slice(0, 10))}"></div>`;
  el.innerHTML = `<button class="linkbtn" onclick="abrirConvenios()">← Volver a los convenios</button>
    <h2 style="margin:12px 0 4px;">${esc(c.nombre)}</h2>
    <p class="helptext"><b>${esc(e.nombre)}</b> · NIT ${esc(e.nit)} · ${esc(e.correo || 'sin correo')} · Modalidad: ${esc(c.modalidad || '—')}${e.estado !== 'aprobada' ? ' · <span style="color:var(--danger)">La empresa ya no está aprobada</span>' : ''}</p>
    <div class="card"><div class="section-bar deep">Fechas del grupo</div>
      <div class="field-row">${inp('Lectiva inicio', c.lectiva_ini)}${inp('Lectiva fin', c.lectiva_fin)}${inp('Productiva inicio', c.prod_ini)}${inp('Productiva fin', c.prod_fin)}</div>
      <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="cvGuardarFechas()">Guardar fechas</button></div></div>
    <div class="card"><div class="section-bar deep">Estudiantes (${activos.length})</div>
      <div class="cor-aviso" style="margin:6px 0;font-size:13px;">Estos estudiantes ya fueron aceptados por la empresa: <b>no necesitan hoja de vida</b>. 1) Selecciona y <b>envía las cartas de fechas</b> · 2) cuando el contrato esté firmado, <b>formaliza</b> (se habilitan las planillas) · 3) las planillas se envían por correo.</div>
      <div class="actions-row" style="justify-content:flex-start;flex-wrap:wrap;gap:10px;align-items:center;">
        <label style="font-size:13px;"><input type="checkbox" id="cvEnvEmp" checked> Enviar a la empresa</label>
        <span class="helptext" style="font-size:12.5px;">✉ La empresa recibe <b>un solo correo con un solo PDF</b> con todas las cartas (no se envía un correo por estudiante).</span><input type="checkbox" id="cvEnvEst" style="display:none">
        <label style="font-size:13px;"><input type="checkbox" id="cvEnvPanel" checked> Dejarlas disponibles en el panel de la empresa</label></div>
      <div class="actions-row" style="justify-content:flex-start;flex-wrap:wrap;">
        <button class="primary" onclick="cvEnviarCartas()">📨 Generar y enviar cartas</button>
        <button class="ghost" onclick="cvDescargarCartas()">⬇ Solo descargar cartas</button>
        <button class="primary" onclick="cvFormalizar()">✔ Formalizar seleccionados</button>
        <button class="ghost" onclick="cvEnviarPlanillas()">📨 Enviar planillas (formalizados)</button></div>
      <div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th><input type="checkbox" onchange="cvMarcarTodos(this.checked)" title="Marcar todos"></th><th>Documento</th><th>Estudiante</th><th>Programa</th><th>Etapa lectiva</th><th>Etapa productiva</th><th>Estado</th><th></th></tr></thead><tbody>` +
    (ests.length ? ests.map(x=>`<tr${x.estado === 'retirado' ? ' style="opacity:.55"' : ''}><td>${x.estado === 'retirado' ? '' : `<input type="checkbox" class="cvChk" value="${esc(x.documento)}" onchange="cvMarcar('${esc(x.documento)}',this.checked)">`}</td>
      <td>${esc(x.documento)}</td><td><b>${esc(x.nombre)}</b><br><span class="aud-ref">${esc(x.correo || 'sin correo')}</span></td><td>${esc(x.programa || '')}</td>
      <td class="aud-nw">${x.lectiva_ini ? cvF(x.lectiva_ini) + ' → ' + cvF(x.lectiva_fin) : '<span style="color:var(--danger)">Falta</span>'}</td><td class="aud-nw">${x.prod_ini ? cvF(x.prod_ini) + ' → ' + cvF(x.prod_fin) : '<span style="color:var(--danger)">Falta</span>'}</td>
      <td><span class="cor-est ${cvEstCls[x.estado]}">${cvEstTxt[x.estado]}</span>${cvContrTxt(x)}${x.formalizado_en ? '<br><span class="aud-ref">' + cvF(x.formalizado_en) + '</span>' : x.carta_enviada_en ? '<br><span class="aud-ref">' + cvF(x.carta_enviada_en) + '</span>' : ''}${x.estado === 'retirado' ? '<br><span class="aud-ref">' + esc(x.motivo_retiro) + '</span>' : ''}</td>
      <td class="aud-nw">${x.estado === 'retirado' ? '' : cvContrBtn(x) + `<button class="danger" onclick="cvRetirar('${esc(x.documento)}')">Retirar</button>`}</td></tr>`).join('') : '<tr><td colspan="9" style="color:var(--muted)">Sin estudiantes.</td></tr>') +
    `</tbody></table></div></div>
    <div class="card"><details><summary style="cursor:pointer;font-weight:600;">+ Agregar más estudiantes</summary>${cvPickerHtml()}
      <div class="actions-row" style="justify-content:flex-start;"><button class="primary" onclick="cvAgregar()">Agregar al convenio</button></div></details></div>
    <div class="actions-row"><button class="danger" onclick="cvEliminar()">Eliminar convenio</button></div>`;
  showScreen('screen-admin-convenio'); cvPintarSel();
}
function cvMarcar(d, on){ if(on) cvMarcados.add(d); else cvMarcados.delete(d); }
function cvMarcarTodos(on){ document.querySelectorAll('.cvChk').forEach(c=>{ c.checked = on; cvMarcar(c.value, on); }); }
function cvElegidos(estados){
  const l = cvDet.estudiantes.filter(x=>cvMarcados.has(x.documento) && (!estados || estados.includes(x.estado)));
  if(!l.length) toast(estados ? 'Marca al menos un estudiante en estado ' + estados.map(e=>cvEstTxt[e]).join(' / ') : 'Marca al menos un estudiante', true);
  return l;
}
async function cvGuardarFechas(){
  const v = k => (document.getElementById('cvf-' + k) || {}).value || '';
  const { error } = await sb.rpc('admin_convenio_fechas', { p_id: cvDet.convenio.id, p_datos: { lectiva_ini: v('Lectivainicio'), lectiva_fin: v('Lectivafin'), prod_ini: v('Productivainicio'), prod_fin: v('Productivafin') } });
  if(error){ toast(cvErr(error), true); return; } toast('Fechas guardadas'); cvDetalle(cvDet.convenio.id);
}
async function cvAgregar(){
  if(!cvSel.size){ toast('Elige al menos un estudiante', true); return; }
  const { data, error } = await sb.rpc('admin_convenio_agregar', { p_id: cvDet.convenio.id, p_est: cvEstLista() });
  if(error){ toast(cvErr(error), true); return; }
  toast(data.agregados + ' estudiante(s) agregado(s)' + (data.creados ? ' · ' + data.creados + ' nuevo(s) creado(s)' : '')); cvMostrarOmitidos(data); cvDetalle(cvDet.convenio.id);
}
async function cvRetirar(doc){
  const m = prompt('Motivo del retiro de ' + doc + ' (se registra):'); if(m === null) return;
  const { error } = await sb.rpc('admin_convenio_retirar', { p_id: cvDet.convenio.id, p_documento: doc, p_motivo: m });
  if(error){ toast(cvErr(error), true); return; } toast('Estudiante retirado'); cvDetalle(cvDet.convenio.id);
}
async function cvEliminar(){
  if(!confirm('¿Eliminar este convenio y su lista de estudiantes?')) return;
  const { error } = await sb.rpc('admin_convenio_eliminar', { p_id: cvDet.convenio.id });
  if(error){ toast(cvErr(error), true); return; } toast('Convenio eliminado'); abrirConvenios();
}

/* ---------------- PDF: unir en lotes pequeños (límite del correo) ---------------- */
const CV_LOTE_BYTES = 3.5 * 1024 * 1024;
async function cvUnirLotes(items){                 // items: [{ bytes }] → [{ bytes, n }]
  const lotes = []; let cur = [], peso = 0;
  const cerrar = async ()=>{
    if(!cur.length) return;
    const out = await PDFLib.PDFDocument.create();
    for(const b of cur){ const src = await PDFLib.PDFDocument.load(b); (await out.copyPages(src, src.getPageIndices())).forEach(p=>out.addPage(p)); }
    lotes.push({ bytes: await out.save(), n: cur.length }); cur = []; peso = 0;
  };
  for(const it of items){ if(cur.length && peso + it.bytes.length > CV_LOTE_BYTES) await cerrar(); cur.push(it.bytes); peso += it.bytes.length; }
  await cerrar(); return lotes;
}
const cvB64 = b => (typeof corBase64 === 'function' ? corBase64(b) : btoa(String.fromCharCode(...b)));
function cvNombreArch(s){ return String(s || 'grupo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'grupo'; }
async function cvPdfsCartas(sel){                  // [{ x, datos, bytes }]
  if(typeof PDFLib === 'undefined') throw new Error('No cargó la librería de PDF (revisa tu conexión)');
  const out = [];
  for(const x of sel){
    const r = await sb.rpc('admin_convenio_carta_datos', { p_id: cvDet.convenio.id, p_documento: x.documento }); if(r.error) throw new Error(cvErr(r.error));
    const d = r.data; out.push({ x, datos: d, bytes: await generarCartaFechasPdf(Object.assign({ fecha: new Date() }, d, { fecha: new Date() })) });
  }
  return out;
}
function cvDescargar(bytes, nombre){
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
}

/* ---------------- Cartas de fechas ---------------- */
async function cvDescargarCartas(){
  const sel = cvElegidos(['preinscrito', 'carta_enviada']); if(!sel.length) return;
  try{
    toast('Generando cartas…'); const pdfs = await cvPdfsCartas(sel);
    const lotes = await cvUnirLotes(pdfs); lotes.forEach((l, i)=>cvDescargar(l.bytes, 'cartas-fechas-' + cvNombreArch(cvDet.convenio.nombre) + (lotes.length > 1 ? '-' + (i + 1) : '') + '.pdf'));
  }catch(e){ toast(e.message, true); }
}
async function cvEnviarCartas(){
  const sel = cvElegidos(['preinscrito', 'carta_enviada']); if(!sel.length) return;
  const aEmp = document.getElementById('cvEnvEmp').checked, aEst = false, aPanel = !!(document.getElementById('cvEnvPanel') || {}).checked;
  if(!aEmp && !aEst && !aPanel){ toast('Elige a quién enviar', true); return; }
  if(!aEmp && !aEst && aPanel){          // solo dejarlas en el panel de la empresa: no hace falta generar ni enviar correos
    if(!confirm('Se dejarán disponibles ' + sel.length + ' carta(s) en el panel de la empresa (' + cvDet.empresa.nombre + ') y se le avisará. ¿Continuar?')) return;
    const { error } = await sb.rpc('admin_convenio_carta_enviada', { p_id: cvDet.convenio.id, p_docs: sel.map(x=>x.documento) });
    if(error){ toast(cvErr(error), true); return; }
    try{ sb.functions.invoke('enviar-correo', { body:{ action:'notificar_solicitud' } }).then(()=>{}, ()=>{}); }catch(_){}
    toast('✔ ' + sel.length + ' carta(s) disponibles en el panel de la empresa'); cvDetalle(cvDet.convenio.id); return;
  }
  const correoEmp = cvDet.empresa.correo;
  if(aEmp && !corEmailOk(correoEmp)){ toast('La empresa no tiene un correo válido', true); return; }
  if(!confirm('Se generarán ' + sel.length + ' carta(s) de fechas' + (aEmp ? ' y se enviarán a la empresa (' + correoEmp + ')' : '') + (aEst ? ' y a cada estudiante' : '') + (aPanel ? ' y quedarán disponibles en el panel de la empresa' : '') + '. ¿Continuar?')) return;
  try{
    toast('Generando cartas…'); const pdfs = await cvPdfsCartas(sel);
    const emp = cvDet.empresa.nombre; let errores = [], okEmp = !aEmp, enviados = 0;
    if(aEmp){
      const lotes = await cvUnirLotes(pdfs);
      for(let i = 0; i < lotes.length; i++){
        const nombre = 'cartas-fechas-' + cvNombreArch(cvDet.convenio.nombre) + (lotes.length > 1 ? '-' + (i + 1) : '') + '.pdf';
        const r = await correoEnviarItems('carta', [{ to: correoEmp, asunto: 'Cartas de fechas - ' + cvDet.convenio.nombre + (lotes.length > 1 ? ' (' + (i + 1) + '/' + lotes.length + ')' : ''),
          texto: 'Cordial saludo,\n\nAdjuntamos las cartas de fechas (etapa lectiva y productiva) de ' + lotes[i].n + ' estudiante(s) del convenio «' + cvDet.convenio.nombre + '» con ' + emp + '.\n\nQuedamos atentos para formalizar el contrato de aprendizaje.\n\nPolitécnico Campoalto' }], { nombre, base64: cvB64(lotes[i].bytes) });
        enviados += r.enviados; errores = errores.concat(r.errores);
      }
      okEmp = !errores.length;
    }
    if(aEst){
      let n = 0;
      for(const p of pdfs){
        if(!corEmailOk(p.datos.correo_estudiante)){ errores.push({ to: p.x.nombre, error: 'sin correo válido' }); continue; }
        const nombre = 'carta-fechas-' + p.x.documento + '.pdf';
        const r = await correoEnviarItems('carta', [{ to: p.datos.correo_estudiante, asunto: 'Carta de fechas - ' + p.x.nombre,
          texto: 'Cordial saludo ' + p.x.nombre + ',\n\nAdjuntamos tu carta de fechas del contrato de aprendizaje con ' + emp + '. Una vez se formalice el contrato se habilitarán tus planillas.\n\nPolitécnico Campoalto' }], { nombre, base64: cvB64(p.bytes) });
        enviados += r.enviados; errores = errores.concat(r.errores); n++; if(n % 5 === 0) toast('Enviando… ' + n + '/' + pdfs.length);
      }
    }
    if(aPanel || (okEmp && enviados)){
      const { error } = await sb.rpc('admin_convenio_carta_enviada', { p_id: cvDet.convenio.id, p_docs: sel.map(x=>x.documento) });
      if(error) toast(cvErr(error), true);
    }
    toast(enviados ? '✉ Se envió ' + enviados + ' correo con el PDF de ' + sel.length + ' carta(s) a ' + correoEmp + '. Si no lo ves, revisa Spam.' : 'No se envió ningún correo', !!errores.length || !enviados);
    if(errores.length) toast(errores.length + ' con error: ' + (errores[0].to || '') + ' — ' + (errores[0].error || '') + ((okEmp || aPanel) ? '' : ' · No se marcaron como enviadas: reintenta'), true);
    cvDetalle(cvDet.convenio.id);
  }catch(e){ console.error(e); toast(e.message, true); }
}

/* ---------------- Formalizar y planillas ---------------- */
async function cvFormalizar(){
  const sel = cvElegidos(['carta_enviada']); if(!sel.length) return;
  const sinC = sel.filter(x=>!cvContr[x.documento]);
  if(sinC.length && !confirm('Atención: ' + sinC.length + ' estudiante(s) NO han subido su contrato firmado (' + sinC.slice(0, 5).map(x=>x.nombre).join(', ') + (sinC.length > 5 ? '…' : '') + ').\n\n¿Formalizar de todos modos?')) return;
  if(!confirm('¿Formalizar a ' + sel.length + ' estudiante(s)? Quedan contratados con ' + cvDet.empresa.nombre + ' y se HABILITAN sus planillas.')) return;
  const { data, error } = await sb.rpc('admin_convenio_formalizar', { p_id: cvDet.convenio.id, p_docs: sel.map(x=>x.documento) });
  if(error){ toast(cvErr(error), true); return; }
  try{ sb.functions.invoke('enviar-correo', { body:{ action:'notificar_solicitud' } }).then(()=>{}, ()=>{}); }catch(_){}
  const om = data.omitidos || [];
  toast('Formalizados: ' + data.formalizados.length + (om.length ? ' · Omitidos: ' + om.length : ''), !data.formalizados.length);
  if(om.length) alert('No se formalizaron:\n' + om.map(o=>'• ' + o.documento + ': ' + o.motivo).join('\n'));
  await cvDetalle(cvDet.convenio.id);
  if(data.formalizados.length && confirm('¿Enviar ahora las planillas por correo (a cada estudiante y a la empresa)?')){
    data.formalizados.forEach(d=>cvMarcados.add(d)); await cvEnviarPlanillas(true);
  }
}
async function cvPlanillaPdf(doc){
  const rec = await getRecord(doc); if(!rec) throw new Error('No se pudo cargar la planilla de ' + doc);
  const previo = state.record; state.record = rec;
  try{
    return await new Promise(ok=>{ window._pdfCapturar = ok; Promise.resolve(downloadPdf()).then(()=>{ if(window._pdfCapturar){ window._pdfCapturar = null; ok(null); } }); });
  } finally { state.record = previo; }
}
async function cvEnviarPlanillas(yaConfirmado){
  const sel = cvElegidos(['formalizado']); if(!sel.length) return;
  const aEmp = document.getElementById('cvEnvEmp').checked, aEst = false;
  if(!aEmp && !aEst){ toast('Elige a quién enviar', true); return; }
  if(aEmp && !corEmailOk(cvDet.empresa.correo)){ toast('La empresa no tiene un correo válido', true); return; }
  if(!yaConfirmado && !confirm('Se enviarán ' + sel.length + ' planilla(s)' + (aEmp ? ' a la empresa' : '') + (aEst ? ' y a cada estudiante' : '') + '. ¿Continuar?')) return;
  try{
    if(typeof PDFLib === 'undefined') throw new Error('No cargó la librería de PDF (revisa tu conexión)');
    const pdfs = []; let k = 0;
    for(const x of sel){ toast('Preparando planillas… ' + (++k) + '/' + sel.length); const b = await cvPlanillaPdf(x.documento); if(!b) throw new Error('No se pudo generar la planilla de ' + x.nombre); pdfs.push({ x, bytes: b }); }
    let enviados = 0, errores = [];
    if(aEmp){
      const lotes = await cvUnirLotes(pdfs);
      for(let i = 0; i < lotes.length; i++){
        const nombre = 'planillas-' + cvNombreArch(cvDet.convenio.nombre) + (lotes.length > 1 ? '-' + (i + 1) : '') + '.pdf';
        const r = await correoEnviarItems('planilla', [{ to: cvDet.empresa.correo, asunto: 'Planillas de prácticas - ' + cvDet.convenio.nombre + (lotes.length > 1 ? ' (' + (i + 1) + '/' + lotes.length + ')' : ''),
          texto: 'Cordial saludo,\n\nAdjuntamos las planillas de evaluación de prácticas de ' + lotes[i].n + ' estudiante(s) del convenio «' + cvDet.convenio.nombre + '».\n\nPolitécnico Campoalto' }], { nombre, base64: cvB64(lotes[i].bytes) });
        enviados += r.enviados; errores = errores.concat(r.errores);
      }
    }
    if(aEst){
      for(const p of pdfs){
        if(!corEmailOk(p.x.correo)){ errores.push({ to: p.x.nombre, error: 'sin correo válido' }); continue; }
        const nombre = 'planilla-' + p.x.documento + '.pdf';
        const r = await correoEnviarItems('planilla', [{ to: p.x.correo, asunto: 'Planilla de prácticas - ' + p.x.nombre,
          texto: 'Cordial saludo ' + p.x.nombre + ',\n\nAdjuntamos tu planilla de evaluación de prácticas. También la encuentras en la plataforma.\n\nPolitécnico Campoalto' }], { nombre, base64: cvB64(p.bytes) });
        enviados += r.enviados; errores = errores.concat(r.errores);
      }
    }
    toast('✉ ' + enviados + ' correo(s) enviado(s)' + (errores.length ? ' · ' + errores.length + ' con error: ' + (errores[0].to || '') + ' — ' + (errores[0].error || '') : ''), !!errores.length);
  }catch(e){ console.error(e); toast(e.message, true); }
}

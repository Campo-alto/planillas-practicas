/* ===== INFORMES Y REPORTES CRUZADOS · estudiantes, empresas, cupos y supervisores =====
   La base entrega los datos ya cruzados (informes-etapa53.sql). Aquí se filtra, agrupa, ordena y se presenta como PDF o Excel.
   Solo lectura. Requiere el permiso «Informes y reportes». */
const INF_T = {
  estudiantes: { t: 'Estudiantes · cruce general', rpc: 'admin_inf_estudiantes',
    cols: [['documento','Documento',9],['nombre','Estudiante',19],['programa','Programa',19],['sede','Sede',8],['semestre','Sem.',4],['periodo','Periodo',7],['modalidad','Modalidad',14],
           ['tipo_empresa','Origen de la empresa',13],['empresa','Empresa',19],['jornada','Jornada',7],['estado_practica','Estado de la práctica',11],['formalizacion','Formalización',15],
           ['convenio','Convenio',12],['supervisor','Supervisor',14],['visita_estado','Visita',7],['solicitud_estado','Solicitud',8],['notas_cal','Notas calificadas',9],
           ['notas_sub','Notas subidas',8],['notas_estado','Entrega de notas',11],['promedio','Promedio',7,'p']],
    def: ['documento','nombre','modalidad','empresa','estado_practica','formalizacion','supervisor','notas_cal','notas_estado'],
    filtros: ['modalidad','programa','sede','periodo','tipo_empresa','empresa','estado_practica','formalizacion','convenio','supervisor','notas_estado','solicitud_estado'],
    agrupar: ['modalidad','programa','sede','periodo','tipo_empresa','empresa','estado_practica','formalizacion','convenio','supervisor','notas_estado'] },
  empresas: { t: 'Empresas · cupos y estudiantes', rpc: 'admin_inf_empresas',
    cols: [['tipo','Tipo',16],['nombre','Empresa',24],['nit','NIT',9],['ciudad','Ciudad',9],['convenio','Convenio',14],['cupos_total','Cupos',6,'n'],['cupos_ocupados','Ocupados',7,'n'],
           ['cupos_libres','Libres',6,'n'],['estudiantes_activos','Estudiantes activos',9,'n'],['retirados','Retirados',7,'n'],['estado','Estado',10]],
    def: ['tipo','nombre','ciudad','cupos_total','cupos_ocupados','cupos_libres','estudiantes_activos','retirados','estado'],
    filtros: ['tipo','ciudad','convenio','estado'], agrupar: ['tipo','ciudad','convenio','estado'] },
  cupos: { t: 'Cupos por empresa, programa y jornada', rpc: 'admin_inf_cupos',
    cols: [['empresa','Empresa',24],['ciudad','Ciudad',9],['programa','Programa',24],['jornada','Jornada',8],['cupos_total','Cupos',7,'n'],['cupos_ocupados','Ocupados',8,'n'],
           ['cupos_libres','Libres',7,'n'],['ocupacion','Ocupación %',8,'p']],
    def: ['empresa','programa','jornada','cupos_total','cupos_ocupados','cupos_libres','ocupacion'],
    filtros: ['empresa','ciudad','programa','jornada'], agrupar: ['empresa','ciudad','programa','jornada'] },
  supervisores: { t: 'Supervisores y visitas', rpc: 'admin_inf_supervisores',
    cols: [['supervisor','Supervisor',22],['correo','Correo',24],['visitas_activas','Activas',8,'n'],['visitas_finalizadas','Finalizadas',9,'n'],['visitas_canceladas','Canceladas',9,'n'],
           ['visitas_total','Total',7,'n'],['estudiantes','Estudiantes',9,'n']],
    def: ['supervisor','visitas_activas','visitas_finalizadas','visitas_canceladas','visitas_total','estudiantes'], filtros: [], agrupar: [] }
};
let infTipo = 'estudiantes', infRows = [], infSel = null;
const infE = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const infCol = k => INF_T[infTipo].cols.find(c => c[0] === k);
const infVal = (r, k) => { const v = r[k]; return (v === null || v === undefined || v === '') ? '' : v; };
const infTxt = (r, k) => { const v = infVal(r, k); return v === '' ? '' : String(v); };

function infNuevoSel(){ return { cols: INF_T[infTipo].def.slice(), f: {}, texto: '', grupo: '', orden: '', dir: 'asc', titulo: INF_T[infTipo].t, nota: '', resumen: true, grafico: true, horizontal: true }; }

function infPrep(rows){
  if(infTipo !== 'estudiantes') return rows;
  return rows.map(r => Object.assign({}, r, {
    notas_cal: r.notas_calificadas + ' de ' + r.meses_total, notas_sub: r.notas_subidas + ' de ' + r.notas_calificadas,
    notas_estado: r.notas_calificadas === 0 ? 'Sin calificar' : (r.notas_subidas < r.notas_calificadas ? 'Por subir al sistema' : 'Al día') }));
}
async function infPantalla(){
  let el = document.getElementById('screen-admin-informes');
  if(!el){ const hub = document.getElementById('screen-admin-hub'); if(!hub) return null; el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-informes'; hub.parentNode.appendChild(el); }
  return el;
}
async function abrirInformes(){
  if(!requireSupabase()) return;
  const el = await infPantalla(); if(!el) return;
  infSel = infSel || infNuevoSel();
  showScreen('screen-admin-informes');
  await infCargar(infTipo, true);
}
async function infCargar(tipo, mantener){
  const el = document.getElementById('screen-admin-informes');
  el.innerHTML = '<button class="linkbtn" onclick="showScreen(\'screen-admin-hub\')">← Volver al panel</button><p style="color:var(--muted)">Cargando datos…</p>';
  const { data, error } = await sb.rpc(INF_T[tipo].rpc);
  if(error){ el.innerHTML = '<button class="linkbtn" onclick="showScreen(\'screen-admin-hub\')">← Volver al panel</button><p style="color:var(--danger)">No se pudo cargar: ' + infE(error.message) + ' (¿ejecutaste informes-etapa53.sql y tienes el permiso?)</p>'; return; }
  infTipo = tipo; infRows = infPrep(data || []);
  if(!mantener || !infSel) infSel = infNuevoSel();
  infDibujar();
}

/* ---------- datos filtrados, agrupados y ordenados ---------- */
function infFiltradas(){
  const T = INF_T[infTipo], q = (infSel.texto || '').toLowerCase().trim();
  let rows = infRows.filter(r => T.filtros.every(k => { const v = infSel.f[k]; return !v || (v === '(vacío)' ? infTxt(r, k) === '' : infTxt(r, k) === v); }));
  if(q) rows = rows.filter(r => T.cols.some(c => infTxt(r, c[0]).toLowerCase().includes(q)));
  const k = infSel.orden || infSel.grupo;
  if(k){ const num = ['n', 'p'].includes((infCol(k) || [])[3]); const d = infSel.dir === 'desc' ? -1 : 1;
    rows = rows.slice().sort((a, b) => num ? ((Number(a[k]) || 0) - (Number(b[k]) || 0)) * d : infTxt(a, k).localeCompare(infTxt(b, k), 'es') * d); }
  return rows;
}
function infGrupos(rows){
  const g = infSel.grupo; if(!g) return null;
  const m = new Map(); rows.forEach(r => { const c = infTxt(r, g) || '(sin dato)'; if(!m.has(c)) m.set(c, []); m.get(c).push(r); });
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([clave, filas]) => ({ clave, filas }));
}
function infSuma(filas, k){ return filas.reduce((a, r) => a + (Number(r[k]) || 0), 0); }
function infKpis(rows){
  const n = rows.length, c = (f) => rows.filter(f).length;
  if(infTipo === 'estudiantes') return [['Estudiantes', n], ['En práctica', c(r => r.estado_practica === 'En práctica')], ['Sin empresa', c(r => r.estado_practica === 'Sin empresa')],
    ['Retirados', c(r => r.estado_practica === 'Retirado (inactiva)')], ['Formalizados', c(r => /Formalizado|Contratado/.test(r.formalizacion))], ['Notas por subir', c(r => r.notas_estado === 'Por subir al sistema')]];
  if(infTipo === 'empresas') return [['Registros', n], ['Cupos', infSuma(rows, 'cupos_total')], ['Ocupados', infSuma(rows, 'cupos_ocupados')], ['Libres', infSuma(rows, 'cupos_libres')],
    ['Estudiantes activos', infSuma(rows, 'estudiantes_activos')], ['Retirados', infSuma(rows, 'retirados')]];
  if(infTipo === 'cupos'){ const t = infSuma(rows, 'cupos_total'), o = infSuma(rows, 'cupos_ocupados'); return [['Líneas de cupo', n], ['Cupos', t], ['Ocupados', o], ['Libres', infSuma(rows, 'cupos_libres')], ['Ocupación', (t ? Math.round(100 * o / t) : 0) + '%']]; }
  return [['Supervisores', n], ['Visitas activas', infSuma(rows, 'visitas_activas')], ['Finalizadas', infSuma(rows, 'visitas_finalizadas')], ['Canceladas', infSuma(rows, 'visitas_canceladas')], ['Estudiantes', infSuma(rows, 'estudiantes')]];
}
function infFiltrosTexto(){
  const T = INF_T[infTipo], out = []; T.filtros.forEach(k => { if(infSel.f[k]) out.push(infCol(k)[1] + ': ' + infSel.f[k]); });
  if(infSel.texto) out.push('Texto: «' + infSel.texto + '»'); if(infSel.grupo) out.push('Agrupado por ' + infCol(infSel.grupo)[1]);
  return out.length ? out.join(' · ') : 'Sin filtros (todos los registros)';
}

/* ---------- pantalla ---------- */
function infPresets(){ try{ return JSON.parse(localStorage.getItem('infPresets') || '{}'); }catch(_){ return {}; } }
function infGuardarPreset(){
  const n = prompt('Nombre para guardar este informe (así lo vuelves a abrir con un clic):', infSel.titulo || ''); if(!n || !n.trim()) return;
  try{ const p = infPresets(); p[n.trim().slice(0, 60)] = { tipo: infTipo, sel: infSel }; localStorage.setItem('infPresets', JSON.stringify(p)); toast('Informe guardado en este navegador'); infDibujar(); }catch(_){ toast('No se pudo guardar en este navegador', true); }
}
async function infAbrirPreset(nombre){
  const p = infPresets()[nombre]; if(!p) return;
  if(p.tipo !== infTipo){ infTipo = p.tipo; await infCargar(p.tipo, true); }
  infSel = Object.assign(infNuevoSel(), p.sel); infDibujar();
}
function infBorrarPreset(){
  const s = document.getElementById('infPre'); if(!s || !s.value) return; if(!confirm('¿Borrar el informe guardado «' + s.value + '»?')) return;
  try{ const p = infPresets(); delete p[s.value]; localStorage.setItem('infPresets', JSON.stringify(p)); infDibujar(); }catch(_){}
}
function infSet(k, v){ infSel[k] = v; infDibujar(true); }
function infSetF(k, v){ infSel.f[k] = v; infDibujar(true); }
function infToggleCol(k, on){ const a = infSel.cols; const i = a.indexOf(k); if(on && i < 0){ const ord = INF_T[infTipo].cols.map(c => c[0]); a.push(k); a.sort((x, y) => ord.indexOf(x) - ord.indexOf(y)); } if(!on && i >= 0) a.splice(i, 1); infDibujar(true); }

function infDibujar(sinEnfoque){
  const el = document.getElementById('screen-admin-informes'); if(!el) return;
  const T = INF_T[infTipo], rows = infFiltradas(), grupos = infGrupos(rows), pre = infPresets();
  const opts = k => { const vs = [...new Set(infRows.map(r => infTxt(r, k)))].sort((a, b) => a.localeCompare(b, 'es')); return vs.map(v => v === '' ? '(vacío)' : v); };
  const sel = (id, k, lista, actual, fn, vacio) => '<select id="' + id + '" onchange="' + fn + '">' + '<option value="">' + vacio + '</option>' + lista.map(v => '<option value="' + infE(v) + '"' + (v === actual ? ' selected' : '') + '>' + infE(v) + '</option>').join('') + '</select>';
  const kp = infKpis(rows);
  const hdr = infSel.cols.map(k => '<th>' + infE(infCol(k)[1]) + '</th>').join('');
  const fila = r => '<tr>' + infSel.cols.map(k => { const c = infCol(k); return '<td' + (['n', 'p'].includes(c[3]) ? ' style="text-align:right"' : '') + '>' + infE(infTxt(r, k)) + '</td>'; }).join('') + '</tr>';
  let cuerpo = '', pintadas = 0; const MAX = 150;
  if(grupos){ grupos.forEach(g => { cuerpo += '<tr><td colspan="' + infSel.cols.length + '" style="background:#E6F1F0;font-weight:700;">' + infE(infCol(infSel.grupo)[1]) + ': ' + infE(g.clave) + ' — ' + g.filas.length + ' registro(s)</td></tr>';
      g.filas.forEach(r => { if(pintadas < MAX){ cuerpo += fila(r); pintadas++; } }); }); }
  else rows.slice(0, MAX).forEach(r => { cuerpo += fila(r); pintadas++; });
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Informes y reportes</h2>
    <p class="helptext" style="text-align:justify;">Arma un informe cruzando la información: elige <b>qué informe</b>, aplica <b>filtros</b>, escoge las <b>columnas</b>, <b>agrupa y ordena</b>, ponle título y descárgalo en <b>PDF</b> o <b>Excel</b>. Lo que ves abajo es la vista previa.</p>
    <div class="card"><div class="section-bar deep">1 · ¿Qué informe quieres?</div>
      <div class="field-row"><div class="field"><label>Tipo de informe</label><select onchange="infCargar(this.value,false)">${Object.keys(INF_T).map(k => '<option value="' + k + '"' + (k === infTipo ? ' selected' : '') + '>' + infE(INF_T[k].t) + '</option>').join('')}</select></div>
        <div class="field"><label>Mis informes guardados</label><div style="display:flex;gap:6px;"><select id="infPre" onchange="if(this.value)infAbrirPreset(this.value)"><option value="">— abrir uno guardado —</option>${Object.keys(pre).map(n => '<option>' + infE(n) + '</option>').join('')}</select>
          <button class="ghost" type="button" onclick="infGuardarPreset()">Guardar este</button><button class="ghost" type="button" onclick="infBorrarPreset()">Borrar</button></div></div></div></div>
    <div class="card"><div class="section-bar deep">2 · Filtros</div>
      <div class="field-row">${T.filtros.map(k => '<div class="field"><label>' + infE(infCol(k)[1]) + '</label>' + sel('', k, opts(k), infSel.f[k] || '', "infSetF('" + k + "',this.value)", 'Todos') + '</div>').join('')}
        <div class="field"><label>Buscar texto</label><input value="${infE(infSel.texto)}" onchange="infSet('texto',this.value)" placeholder="nombre, documento, empresa…"></div></div>
      <button class="ghost" type="button" onclick="infSel.f={};infSel.texto='';infDibujar()">Limpiar filtros</button></div>
    <div class="card"><div class="section-bar deep">3 · Columnas, orden y agrupación</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-bottom:10px;">${T.cols.map(c => '<label style="font-size:13px;"><input type="checkbox" ' + (infSel.cols.includes(c[0]) ? 'checked' : '') + ' onchange="infToggleCol(\'' + c[0] + '\',this.checked)"> ' + infE(c[1]) + '</label>').join('')}</div>
      <div class="field-row"><div class="field"><label>Agrupar por</label><select onchange="infSet('grupo',this.value)"><option value="">Sin agrupar</option>${T.agrupar.map(k => '<option value="' + k + '"' + (infSel.grupo === k ? ' selected' : '') + '>' + infE(infCol(k)[1]) + '</option>').join('')}</select></div>
        <div class="field"><label>Ordenar por</label><select onchange="infSet('orden',this.value)"><option value="">Orden natural</option>${T.cols.map(c => '<option value="' + c[0] + '"' + (infSel.orden === c[0] ? ' selected' : '') + '>' + infE(c[1]) + '</option>').join('')}</select></div>
        <div class="field"><label>Sentido</label><select onchange="infSet('dir',this.value)"><option value="asc"${infSel.dir === 'asc' ? ' selected' : ''}>Ascendente</option><option value="desc"${infSel.dir === 'desc' ? ' selected' : ''}>Descendente</option></select></div></div></div>
    <div class="card"><div class="section-bar deep">4 · Presentación (PDF)</div>
      <div class="field"><label>Título del informe</label><input value="${infE(infSel.titulo)}" maxlength="120" onchange="infSet('titulo',this.value)"></div>
      <div class="field"><label>Notas o conclusiones (salen en la primera página)</label><textarea rows="3" maxlength="1500" onchange="infSet('nota',this.value)">${infE(infSel.nota)}</textarea></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:6px;">
        <label style="font-size:13px;"><input type="checkbox" ${infSel.resumen ? 'checked' : ''} onchange="infSet('resumen',this.checked)"> Incluir resumen (cifras)</label>
        <label style="font-size:13px;"><input type="checkbox" ${infSel.grafico ? 'checked' : ''} onchange="infSet('grafico',this.checked)"> Incluir gráfico por grupo</label>
        <label style="font-size:13px;"><input type="checkbox" ${infSel.horizontal ? 'checked' : ''} onchange="infSet('horizontal',this.checked)"> Hoja horizontal</label></div></div>
    <div class="card"><div class="section-bar teal">Vista previa · ${rows.length} registro(s)</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0;">${kp.map(x => '<div style="border:1px solid var(--line,#ddd);border-radius:8px;padding:6px 12px;min-width:90px;"><div style="font-size:20px;font-weight:700;">' + infE(x[1]) + '</div><div style="font-size:12px;color:var(--muted)">' + infE(x[0]) + '</div></div>').join('')}</div>
      <div class="actions-row" style="justify-content:flex-start;gap:8px;"><button class="primary" onclick="infPdf()">📄 Descargar PDF</button><button class="ghost" onclick="infExcel()">📊 Descargar Excel</button></div>
      ${infSel.cols.length ? '<div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr>' + hdr + '</tr></thead><tbody>' + (cuerpo || '<tr><td colspan="' + infSel.cols.length + '">Sin registros con estos filtros.</td></tr>') + '</tbody></table></div>' : '<p style="color:var(--danger)">Marca al menos una columna.</p>'}
      ${rows.length > MAX ? '<p class="helptext">La vista previa muestra los primeros ' + MAX + '; el PDF y el Excel llevan todos los registros.</p>' : ''}</div>`;
}

/* ---------- Excel ---------- */
const infSafe = v => (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
function infExcel(){
  if(typeof XLSX === 'undefined'){ toast('No cargó la librería de Excel (revisa tu conexión).', true); return; }
  if(!infSel.cols.length){ toast('Marca al menos una columna.', true); return; }
  const rows = infFiltradas(), grupos = infGrupos(rows), T = INF_T[infTipo];
  const lista = grupos ? grupos.flatMap(g => g.filas) : rows;
  const data = lista.map(r => { const o = {}; infSel.cols.forEach(k => { const c = infCol(k); o[c[1]] = ['n', 'p'].includes(c[3]) ? (r[k] == null ? '' : Number(r[k])) : infSafe(infTxt(r, k)); }); return o; });
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Informe');
  const res = [[infSafe(infSel.titulo)], ['Generado', new Date().toLocaleString('es-CO')], ['Filtros', infFiltrosTexto()], []].concat(infKpis(rows).map(x => [x[0], x[1]]));
  if(grupos){ res.push([], [infCol(infSel.grupo)[1], 'Registros']); grupos.forEach(g => res.push([infSafe(g.clave), g.filas.length])); }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(res), 'Resumen');
  XLSX.writeFile(wb, 'informe-' + infTipo + '-' + new Date().toISOString().slice(0, 10) + '.xlsx');
}

/* ---------- PDF ---------- */
async function infPdf(){
  if(typeof PDFLib === 'undefined'){ toast('No cargó la librería de PDF (revisa tu conexión).', true); return; }
  if(!infSel.cols.length){ toast('Marca al menos una columna.', true); return; }
  try{
    const { PDFDocument, StandardFonts, rgb } = PDFLib, doc = await PDFDocument.create();
    const F = await doc.embedFont(StandardFonts.Helvetica), FB = await doc.embedFont(StandardFonts.HelveticaBold);
    const PW = infSel.horizontal ? 792 : 612, PH = infSel.horizontal ? 612 : 792, M = 36, AW = PW - 2 * M;
    const teal = rgb(0.06, 0.3, 0.29), claro = rgb(0.9, 0.95, 0.94), gris = rgb(0.45, 0.45, 0.45), negro = rgb(0.1, 0.1, 0.1);
    const L = t => String(t == null ? '' : t).replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
    const ajusta = (t, w, f, sz) => { t = L(t); if(f.widthOfTextAtSize(t, sz) <= w) return t; while(t.length > 1 && f.widthOfTextAtSize(t + '...', sz) > w) t = t.slice(0, -1); return t + '...'; };
    const lineas = (t, w, f, sz) => { const out = []; let cur = ''; L(t).split(/\s+/).forEach(p => { const x = cur ? cur + ' ' + p : p; if(f.widthOfTextAtSize(x, sz) <= w) cur = x; else { if(cur) out.push(cur); cur = p; } }); if(cur) out.push(cur); return out; };
    const rows = infFiltradas(), grupos = infGrupos(rows), T = INF_T[infTipo];
    let page = null, y = 0;
    const nueva = () => { page = doc.addPage([PW, PH]); y = PH - M; };
    const txt = (t, x, yy, sz, f, col) => page.drawText(L(t), { x, y: yy, size: sz, font: f || F, color: col || negro });

    // ---- portada / resumen
    nueva();
    page.drawRectangle({ x: 0, y: PH - 70, width: PW, height: 70, color: teal });
    txt('Politécnico Campoalto · Prácticas', M, PH - 28, 10, F, rgb(1, 1, 1));
    txt(ajusta(infSel.titulo || T.t, AW, FB, 18), M, PH - 52, 18, FB, rgb(1, 1, 1)); y = PH - 92;
    txt('Generado el ' + new Date().toLocaleString('es-CO') + ' · ' + rows.length + ' registro(s)', M, y, 9, F, gris); y -= 16;
    lineas('Filtros: ' + infFiltrosTexto(), AW, F, 9).forEach(l => { txt(l, M, y, 9, F, gris); y -= 12; }); y -= 6;
    if(infSel.nota && infSel.nota.trim()){ txt('Notas', M, y, 11, FB, teal); y -= 14; lineas(infSel.nota, AW, F, 10).slice(0, 14).forEach(l => { txt(l, M, y, 10); y -= 13; }); y -= 8; }
    if(infSel.resumen){
      const kp = infKpis(rows), bw = Math.min(120, (AW - 8 * (kp.length - 1)) / kp.length);
      kp.forEach((x, i) => { const bx = M + i * (bw + 8); page.drawRectangle({ x: bx, y: y - 40, width: bw, height: 40, color: claro });
        txt(String(x[1]), bx + 8, y - 20, 16, FB, teal); txt(ajusta(x[0], bw - 12, F, 8), bx + 8, y - 34, 8, F, gris); });
      y -= 56;
    }
    if(grupos && grupos.length){
      txt('Resumen por ' + infCol(infSel.grupo)[1].toLowerCase(), M, y, 11, FB, teal); y -= 16;
      const max = Math.max(...grupos.map(g => g.filas.length)), lw = 190, bwmax = AW - lw - 50;
      const lista = infSel.grafico ? grupos.slice().sort((a, b) => b.filas.length - a.filas.length).slice(0, 14) : grupos.slice(0, 40);
      lista.forEach(g => { if(y < M + 30){ nueva(); }
        txt(ajusta(g.clave, lw - 6, F, 8.5), M, y, 8.5);
        if(infSel.grafico) page.drawRectangle({ x: M + lw, y: y - 2, width: Math.max(2, bwmax * g.filas.length / max), height: 9, color: teal });
        txt(String(g.filas.length), M + lw + (infSel.grafico ? Math.max(2, bwmax * g.filas.length / max) + 4 : 0), y, 8.5, FB); y -= 14; });
      if(infSel.grafico && grupos.length > 14){ txt('… y ' + (grupos.length - 14) + ' grupo(s) más (ver detalle).', M, y, 8, F, gris); y -= 12; }
    }

    // ---- tabla de detalle
    nueva(); txt('Detalle', M, y, 12, FB, teal); y -= 16;
    const cols = infSel.cols.map(infCol), tw = cols.reduce((a, c) => a + c[2], 0), ws = cols.map(c => c[2] / tw * AW), SZ = 7.2, RH = 13;
    const cabecera = () => { page.drawRectangle({ x: M, y: y - 3, width: AW, height: RH, color: teal }); let x = M; cols.forEach((c, i) => { txt(ajusta(c[1], ws[i] - 6, FB, SZ), x + 3, y + 1, SZ, FB, rgb(1, 1, 1)); x += ws[i]; }); y -= RH; };
    const asegura = h => { if(y - h < M + 18){ nueva(); cabecera(); } };
    cabecera(); let par = false;
    const pintaFila = r => { asegura(RH); if(par) page.drawRectangle({ x: M, y: y - 3, width: AW, height: RH, color: rgb(0.965, 0.975, 0.975) }); par = !par;
      let x = M; cols.forEach((c, i) => { const t = ajusta(infTxt(r, c[0]), ws[i] - 6, F, SZ); const num = ['n', 'p'].includes(c[3]);
        txt(t, num ? x + ws[i] - 3 - F.widthOfTextAtSize(L(t), SZ) : x + 3, y + 1, SZ); x += ws[i]; }); y -= RH; };
    if(grupos){ grupos.forEach(g => { asegura(RH * 2); page.drawRectangle({ x: M, y: y - 3, width: AW, height: RH, color: claro }); txt(ajusta(infCol(infSel.grupo)[1] + ': ' + g.clave + ' — ' + g.filas.length + ' registro(s)', AW - 8, FB, SZ + 0.6), M + 3, y + 1, SZ + 0.6, FB, teal); y -= RH; par = false; g.filas.forEach(pintaFila); }); }
    else rows.forEach(pintaFila);
    if(!rows.length){ txt('Sin registros con estos filtros.', M, y - 4, 9, F, gris); }
    // totales de columnas numéricas
    const sumables = cols.filter(c => c[3] === 'n');
    if(sumables.length && rows.length){ asegura(RH + 4); y -= 4; page.drawRectangle({ x: M, y: y - 3, width: AW, height: RH, color: claro }); let x = M;
      cols.forEach((c, i) => { if(i === 0) txt('TOTAL', x + 3, y + 1, SZ, FB, teal); if(c[3] === 'n'){ const t = String(infSuma(rows, c[0])); txt(t, x + ws[i] - 3 - FB.widthOfTextAtSize(t, SZ), y + 1, SZ, FB, teal); } x += ws[i]; }); y -= RH; }

    // pie de página
    const pgs = doc.getPages(); pgs.forEach((p, i) => { p.drawLine({ start: { x: M, y: M - 6 }, end: { x: PW - M, y: M - 6 }, thickness: 0.5, color: gris });
      p.drawText(L('Politécnico Campoalto · ' + (infSel.titulo || T.t)).slice(0, 110), { x: M, y: M - 18, size: 7.5, font: F, color: gris });
      const pg = 'Página ' + (i + 1) + ' de ' + pgs.length; p.drawText(pg, { x: PW - M - F.widthOfTextAtSize(pg, 7.5), y: M - 18, size: 7.5, font: F, color: gris }); });
    doc.setTitle(L(infSel.titulo || T.t)); doc.setAuthor('Politécnico Campoalto');
    const bytes = await doc.save(), url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = 'informe-' + infTipo + '-' + new Date().toISOString().slice(0, 10) + '.pdf';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }catch(e){ console.error(e); toast('No se pudo generar el PDF: ' + e.message, true); }
}

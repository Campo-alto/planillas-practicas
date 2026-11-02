/* ===== IMPORTAR / EXPORTAR (Excel y PDF) · solo administrador =====
   Todas las escrituras pasan por las políticas del administrador en la base de datos (RLS). */
const IE_MAX_FILAS = 2000;
const IE_MAX_BYTES = 5 * 1024 * 1024;
let ieDatos = null;   // { ds, validas:[], errores:[] } a la espera de confirmación

function ieNorm(t){ return (t==null?'':String(t)).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
// Evita que Excel ejecute fórmulas escritas por alguien en un dato (=, +, -, @)
function ieSafe(v){ return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v; }
function ieUnsafe(v){ return (typeof v === 'string') ? v.replace(/^'(?=[=+\-@])/, '').trim() : v; }
function ieStr(v, max){ return String(v==null?'':v).replace(/^'(?=[=+\-@])/, '').trim().slice(0, max||200); }

/* ---------- definición de cada conjunto de datos ---------- */
const IE_DATASETS = {
  estudiantes: {
    titulo: 'Estudiantes', archivo: 'estudiantes',
    cols: ['Documento','Apellidos','Nombres','Correo','Teléfono','Sede','Semestre','Modalidad','Periodo académico','Funcionario','Programa','Jornada solicitada'],
    ejemplo: ['1128108664','Pérez Gómez','Ana María','ana@correo.com','3001234567','Sede Norte','3','Prácticas No Remuneradas','2026-2','','','Mañana'],
    aliases: { documento:'documento', apellidos:'apellidos', nombres:'nombres', correo:'correo', 'correo electronico':'correo', telefono:'telefono', celular:'telefono',
               sede:'sede', semestre:'semestre', modalidad:'modalidad', 'periodo academico':'periodo', periodo:'periodo', funcionario:'funcionario',
               'funcionario que procesa':'funcionario', programa:'programa', jornada:'jornada', 'jornada solicitada':'jornada' },
    importable: true,
    async exportar(){
      const { data, error } = await sb.from('students').select('documento,apellidos,nombres,nombre,correo,telefono,sede,semestre,modalidad,periodo_academico,funcionario,programa,jornada_solicitada').order('apellidos');
      if(error) throw error;
      const asig = {};
      try{ const r = await sb.rpc('admin_list_asignaciones'); (r.data||[]).forEach(a=>{ if(a.estado==='activa') asig[a.documento] = a.empresa; }); }catch(_){}
      return { head: this.cols.concat(['Empresa asignada']),
        rows: (data||[]).map(s=>[s.documento, s.apellidos||s.nombre, s.nombres, s.correo, s.telefono, s.sede, s.semestre, s.modalidad, s.periodo_academico, s.funcionario, s.programa, s.jornada_solicitada, asig[s.documento]||'']) };
    },
    async preparar(filas){
      await loadProgramas();
      const progs = (programasCache||[]).map(p=>p.nombre);
      const vistos = new Set(), validas = [], errores = [];
      filas.forEach(f=>{
        const r = f.v, e = [];
        const doc = ieStr(r.documento, 20);
        if(!/^[0-9A-Za-z]{5,20}$/.test(doc)) e.push('documento inválido (5 a 20 letras o números)');
        if(vistos.has(doc)) e.push('documento repetido en el archivo'); vistos.add(doc);
        const ape = ieStr(r.apellidos), nom = ieStr(r.nombres);
        if(!ape && !nom) e.push('falta apellidos o nombres');
        let modalidad = ieStr(r.modalidad).replace(/\s*\(.*\)\s*$/, '');
        if(modalidad){
          const m = MODALIDADES.find(x=>ieNorm(x.nombre)===ieNorm(modalidad));
          if(!m) e.push('modalidad no reconocida ("'+modalidad+'")'); else modalidad = m.nombre;
        }
        let jornada = ieStr(r.jornada);
        if(jornada){ const j = JORNADAS.find(x=>ieNorm(x)===ieNorm(jornada)); if(!j) e.push('jornada no válida ("'+jornada+'")'); else jornada = j; }
        let programa = ieStr(r.programa, 250);
        if(programa){ const p = progs.find(x=>ieNorm(x)===ieNorm(programa)); if(!p) e.push('el programa "'+programa+'" no existe en el módulo Programas'); else programa = p; }
        if(e.length) errores.push({ fila: f.n, msg: e.join('; ') });
        else validas.push({ fila: f.n, doc, ape, nom, correo: ieStr(r.correo), telefono: ieStr(r.telefono,40), sede: ieStr(r.sede,100), semestre: ieStr(r.semestre,40),
                            modalidad, periodo: ieStr(r.periodo,40), funcionario: ieStr(r.funcionario,150), programa, jornada });
      });
      return { validas, errores, resumen: v=>v.doc+' · '+(v.ape+' '+v.nom).trim() };
    },
    async confirmar(validas, opts){
      const { data: ex } = await sb.from('students').select('documento');
      const existentes = new Set((ex||[]).map(x=>x.documento));
      const nuevos = [], act = []; let fallos = [];
      validas.forEach(v=>{
        if(existentes.has(v.doc)){ if(opts.actualizar) act.push(v); return; }
        const rec = emptyRecord(v.doc);
        rec.apellidos = v.ape; rec.nombres = v.nom; rec.nombre = nombreCompletoDesde(v.ape, v.nom);
        rec.correo = v.correo; rec.telefono = v.telefono; rec.sede = v.sede; rec.semestre = v.semestre; rec.modalidad = v.modalidad;
        rec.periodoAcademico = v.periodo; rec.funcionario = v.funcionario; rec.programa = v.programa || PROGRAMA; rec.jornadaSolicitada = v.jornada;
        nuevos.push(recordToRow(rec));
      });
      let creados = 0, actualizados = 0;
      for(let i=0;i<nuevos.length;i+=100){
        const lote = nuevos.slice(i,i+100);
        const { error } = await sb.from('students').insert(lote);
        if(error) fallos.push('Lote '+(i/100+1)+': '+error.message); else creados += lote.length;
      }
      for(const v of act){
        const upd = { updated_at: new Date().toISOString() };
        if(v.ape || v.nom){ upd.apellidos = v.ape; upd.nombres = v.nom; upd.nombre = nombreCompletoDesde(v.ape, v.nom); }
        if(v.correo) upd.correo = v.correo; if(v.telefono) upd.telefono = v.telefono; if(v.sede) upd.sede = v.sede;
        if(v.semestre) upd.semestre = v.semestre; if(v.modalidad) upd.modalidad = v.modalidad; if(v.periodo) upd.periodo_academico = v.periodo;
        if(v.funcionario) upd.funcionario = v.funcionario; if(v.programa) upd.programa = v.programa; if(v.jornada) upd.jornada_solicitada = v.jornada;
        const { error } = await sb.from('students').update(upd).eq('documento', v.doc);
        if(error) fallos.push(v.doc+': '+error.message); else actualizados++;
      }
      return { texto: creados+' estudiante(s) creado(s), '+actualizados+' actualizado(s)'+(opts.actualizar?'':' (los existentes se omitieron)')+'.', fallos,
               extra: creados ? 'Para darles acceso, entra a Estudiantes y usa "Generar claves para estudiantes sin acceso".' : '' };
    }
  },

  empresas: {
    titulo: 'Empresas', archivo: 'empresas',
    cols: ['Nombre','Categoría','NIT','Dirección','Ciudad','Teléfono','Correo','Contacto','Requisitos','Programa','Jornada','Cupos'],
    ejemplo: ['Clínica Ejemplo S.A.S.','Prácticas no remuneradas','900123456','Calle 1 # 2-3','Bogotá','6011234567','contacto@clinica.com','María López','Uniforme blanco, hoja de vida formato Campoalto','','Mañana','2'],
    aliases: { nombre:'nombre', empresa:'nombre', 'nombre de la empresa':'nombre', categoria:'categoria', nit:'nit', direccion:'direccion', ciudad:'ciudad', telefono:'telefono',
               correo:'correo', contacto:'contacto', 'persona de contacto':'contacto', requisitos:'requisitos', programa:'programa', jornada:'jornada', cupos:'cupos' },
    importable: true,
    async exportar(){
      const { data, error } = await sb.from('empresas_practica').select('*, cupos_empresa(programa,jornada,cupos_total,cupos_ocupados)').order('nombre');
      if(error) throw error;
      const rows = [];
      (data||[]).forEach(e=>{
        const base = [e.nombre, nombreCategoria(e.categoria||'practica_no_remunerada'), e.nit, e.direccion, e.ciudad, e.telefono, e.correo, e.contacto, e.requisitos];
        const cs = e.cupos_empresa||[];
        if(!cs.length) rows.push(base.concat(['','','',e.activa?'Sí':'No','']));
        cs.forEach(c=>rows.push(base.concat([c.programa, c.jornada, c.cupos_total, e.activa?'Sí':'No', c.cupos_ocupados])));
      });
      return { head: this.cols.concat(['Activa','Cupos ocupados']), rows };
    },
    async preparar(filas){
      await loadProgramas();
      const progs = (programasCache||[]).map(p=>p.nombre);
      const validas = [], errores = [];
      filas.forEach(f=>{
        const r = f.v, e = [];
        const nombre = ieStr(r.nombre);
        if(nombre.length < 2) e.push('falta el nombre de la empresa');
        const catTxt = ieNorm(r.categoria);
        const cat = CATEGORIAS_EMPRESA.find(c=>ieNorm(c.nombre)===catTxt || ieNorm(c.corto)===catTxt || c.id.replace(/_/g,' ')===catTxt);
        if(!cat) e.push('categoría no reconocida ("'+ieStr(r.categoria)+'")');
        let programa = ieStr(r.programa,250), jornada = ieStr(r.jornada), cupos = null;
        const hayCupo = programa || jornada || ieStr(r.cupos) !== '';
        if(hayCupo){
          if(cat && cat.id !== 'practica_no_remunerada') e.push('solo las empresas de prácticas no remuneradas manejan cupos');
          const p = progs.find(x=>ieNorm(x)===ieNorm(programa)); if(!p) e.push('programa de cupos no existe'); else programa = p;
          const j = JORNADAS.find(x=>ieNorm(x)===ieNorm(jornada)); if(!j) e.push('jornada de cupos no válida'); else jornada = j;
          cupos = parseInt(ieStr(r.cupos), 10);
          if(isNaN(cupos) || cupos < 0 || cupos > 500) e.push('cupos debe ser un número entre 0 y 500');
        }
        if(e.length) errores.push({ fila: f.n, msg: e.join('; ') });
        else validas.push({ fila: f.n, nombre, categoria: cat.id, nit: ieStr(r.nit,40), direccion: ieStr(r.direccion,250), ciudad: ieStr(r.ciudad,100),
                            telefono: ieStr(r.telefono,40), correo: ieStr(r.correo,150), contacto: ieStr(r.contacto,150), requisitos: ieStr(r.requisitos,1500),
                            cupo: hayCupo ? { programa, jornada, total: cupos } : null });
      });
      return { validas, errores, resumen: v=>v.nombre+' · '+nombreCategoria(v.categoria)+(v.cupo?' · '+v.cupo.programa+' / '+v.cupo.jornada+': '+v.cupo.total:'') };
    },
    async confirmar(validas, opts){
      const { data: ex, error: e0 } = await sb.from('empresas_practica').select('id,nombre,nit,categoria');
      if(e0) throw e0;
      let lista = ex||[]; let creadas = 0, actualizadas = 0, cupos = 0; const fallos = [];
      for(const v of validas){
        try{
          let emp = (v.nit && lista.find(x=>x.nit && x.nit===v.nit)) || lista.find(x=>ieNorm(x.nombre)===ieNorm(v.nombre));
          const datos = { nombre: v.nombre, categoria: v.categoria, nit: v.nit, direccion: v.direccion, ciudad: v.ciudad, telefono: v.telefono, correo: v.correo, contacto: v.contacto, requisitos: v.requisitos };
          if(emp){
            if(opts.actualizar){
              const upd = {}; Object.keys(datos).forEach(k=>{ if(datos[k]) upd[k] = datos[k]; });
              const { error } = await sb.from('empresas_practica').update(upd).eq('id', emp.id);
              if(error) throw error; actualizadas++;
            }
          } else {
            const { data, error } = await sb.from('empresas_practica').insert(datos).select('id,nombre,nit,categoria').single();
            if(error) throw error; emp = data; lista.push(data); creadas++;
          }
          if(v.cupo){
            const { data: c } = await sb.from('cupos_empresa').select('id,cupos_ocupados').eq('empresa_id', emp.id).eq('programa', v.cupo.programa).eq('jornada', v.cupo.jornada).maybeSingle();
            if(c){
              if(v.cupo.total < c.cupos_ocupados) throw new Error('ya hay '+c.cupos_ocupados+' cupos ocupados; no se puede dejar en '+v.cupo.total);
              const { error } = await sb.from('cupos_empresa').update({ cupos_total: v.cupo.total }).eq('id', c.id); if(error) throw error;
            } else {
              const { error } = await sb.from('cupos_empresa').insert({ empresa_id: emp.id, programa: v.cupo.programa, jornada: v.cupo.jornada, cupos_total: v.cupo.total }); if(error) throw error;
            }
            cupos++;
          }
        }catch(e){ fallos.push('Fila '+v.fila+' ('+v.nombre+'): '+(e.message||e)); }
      }
      return { texto: creadas+' empresa(s) creada(s), '+actualizadas+' actualizada(s), '+cupos+' registro(s) de cupos.', fallos, extra: '' };
    }
  },

  supervisores: {
    titulo: 'Supervisores', archivo: 'supervisores',
    cols: ['Correo','Nombre','Contraseña'],
    ejemplo: ['supervisor@campoalto.edu.co','Carlos Ruiz',''],
    aliases: { correo:'correo', email:'correo', 'correo electronico':'correo', nombre:'nombre', 'nombre completo':'nombre', contrasena:'password', clave:'password' },
    importable: true,
    async exportar(){
      const { data, error } = await sb.rpc('admin_list_role_accounts');
      if(error) throw error;
      return { head: ['Correo','Nombre','Creado'], rows: (data||[]).filter(u=>u.role==='supervisor').map(u=>[u.email, u.nombre, u.created_at?new Date(u.created_at).toLocaleDateString():'']) };
    },
    async preparar(filas){
      const vistos = new Set(), validas = [], errores = [];
      filas.forEach(f=>{
        const r = f.v, e = [];
        const correo = ieStr(r.correo,150).toLowerCase();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) e.push('correo inválido');
        if(vistos.has(correo)) e.push('correo repetido en el archivo'); vistos.add(correo);
        const nombre = ieStr(r.nombre,150); if(nombre.length < 3) e.push('falta el nombre');
        const pw = ieStr(r.password,72); if(pw && pw.length < 8) e.push('la contraseña debe tener mínimo 8 caracteres (o déjala vacía para generarla)');
        if(e.length) errores.push({ fila: f.n, msg: e.join('; ') }); else validas.push({ fila: f.n, correo, nombre, pw });
      });
      return { validas, errores, resumen: v=>v.correo+' · '+v.nombre };
    },
    async confirmar(validas, opts){
      const { data: ex } = await sb.rpc('admin_list_role_accounts');
      const existentes = new Set((ex||[]).filter(u=>u.role==='supervisor').map(u=>(u.email||'').toLowerCase()));
      const fallos = [], cred = []; let creados = 0, actualizados = 0;
      for(const v of validas){
        const esNuevo = !existentes.has(v.correo);
        if(!esNuevo && !opts.actualizar) continue;
        const pw = v.pw || (esNuevo ? generarClaveLocal() : null);
        const { error } = await sb.rpc('admin_save_role_account', { p_email: v.correo, p_role: 'supervisor', p_password: pw, p_nombre: v.nombre });
        if(error){ fallos.push('Fila '+v.fila+' ('+v.correo+'): '+error.message); continue; }
        if(esNuevo) creados++; else actualizados++;
        if(pw) cred.push([v.correo, v.nombre, pw]);
      }
      if(cred.length) ieDescargarXlsx('credenciales-supervisores', ['Correo','Nombre','Contraseña'], cred, 'Credenciales');
      return { texto: creados+' supervisor(es) creado(s), '+actualizados+' actualizado(s).', fallos,
               extra: cred.length ? 'Se descargó un Excel con las contraseñas: entrégalas y guárdalo en un lugar seguro; no se vuelven a mostrar.' : '' };
    }
  },

  asignaciones: {
    titulo: 'Asignaciones de práctica', archivo: 'asignaciones-practica', importable: false,
    async exportar(){
      const { data, error } = await sb.rpc('admin_list_asignaciones');
      if(error) throw error;
      return { head: ['Documento','Estudiante','Programa','Empresa','Jornada','Fecha','Estado'],
        rows: (data||[]).map(a=>[a.documento, a.estudiante, a.programa, a.empresa, a.jornada, new Date(a.created_at).toLocaleDateString(), a.estado]) };
    }
  }
};

/* ---------- descargas ---------- */
function ieDescargarXlsx(nombre, head, rows, hoja, conEncabezado){
  // conEncabezado=true: añade nombre de la institución, título y fecha sobre la tabla (listados); las plantillas/credenciales van sin él
  const datos = rows.map(r=>r.map(ieSafe));
  const aoa = [];
  if(conEncabezado){
    aoa.push(['CAMPOALTO']); aoa.push([conEncabezado]); aoa.push(['Generado el ' + new Date().toLocaleString('es-CO') + ' · ' + rows.length + ' registro(s)']); aoa.push([]);
  }
  aoa.push(head); datos.forEach(r=>aoa.push(r));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const cols = head.map((h,i)=>({ wch: Math.min(40, Math.max(String(h).length, ...rows.slice(0,200).map(r=>String(r[i]==null?'':r[i]).length)) + 2) }));
  ws['!cols'] = cols;
  if(conEncabezado && head.length>1){
    ws['!merges'] = [0,1,2].map(r=>({ s:{r,c:0}, e:{r,c:head.length-1} }));
  }
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, (hoja||'Datos').slice(0,31));
  XLSX.writeFile(wb, nombre + '-' + new Date().toISOString().slice(0,10) + '.xlsx');
}
function ieDescargarPdf(titulo, nombre, head, rows){
  return pdfTablaDescargar({ titulo, archivo: nombre, head, rows });   // js/impresion.js: escudo, nombre y tabla centrados
}
async function ieExportar(id, formato){
  const ds = IE_DATASETS[id];
  try{
    toast('Preparando ' + ds.titulo.toLowerCase() + '…');
    const { head, rows } = await ds.exportar();
    if(!rows.length){ toast('No hay datos para exportar', true); return; }
    if(formato === 'pdf') await ieDescargarPdf(ds.titulo, ds.archivo, head, rows);
    else ieDescargarXlsx(ds.archivo, head, rows, ds.titulo, ds.titulo);
  }catch(e){ console.error(e); toast('No se pudo exportar: ' + (e.message||e), true); }
}
function ieDescargarPlantilla(id){
  const ds = IE_DATASETS[id];
  ieDescargarXlsx('plantilla-' + ds.archivo, ds.cols, [ds.ejemplo], 'Plantilla');
}

/* ---------- importar ---------- */
async function ieLeerArchivo(id, input){
  const file = input.files && input.files[0]; if(!file) return;
  const box = document.getElementById('iePrev-' + id);
  const ds = IE_DATASETS[id];
  ieDatos = null;
  try{
    if(!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error('El archivo debe ser Excel (.xlsx) o CSV');
    if(file.size > IE_MAX_BYTES) throw new Error('El archivo supera 5 MB');
    box.innerHTML = '<p style="color:var(--muted)">Leyendo archivo…</p>';
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
    if(!json.length) throw new Error('El archivo no tiene filas');
    if(json.length > IE_MAX_FILAS) throw new Error('Máximo ' + IE_MAX_FILAS + ' filas por archivo');
    const mapa = {}; Object.keys(json[0]).forEach(h=>{ const k = ds.aliases[ieNorm(h)]; if(k) mapa[h] = k; });
    if(!Object.keys(mapa).length) throw new Error('No se reconocieron las columnas. Descarga la plantilla y úsala como base.');
    const filas = json.map((r,i)=>{ const v = {}; Object.keys(mapa).forEach(h=>{ v[mapa[h]] = r[h]; }); return { n: i + 2, v }; })
                      .filter(f=>Object.values(f.v).some(x=>String(x).trim() !== ''));
    const res = await ds.preparar(filas);
    ieDatos = { id, ...res };
    const errHtml = res.errores.length
      ? '<details open style="margin:8px 0;"><summary style="color:var(--danger);cursor:pointer;"><b>' + res.errores.length + ' fila(s) con error (no se importarán)</b></summary><ul style="margin:6px 0 0 18px;font-size:12.5px;">' +
        res.errores.slice(0,50).map(e=>'<li>Fila ' + e.fila + ': ' + esc(e.msg) + '</li>').join('') + (res.errores.length>50?'<li>… y ' + (res.errores.length-50) + ' más</li>':'') + '</ul></details>' : '';
    const okHtml = res.validas.length
      ? '<p style="margin:8px 0;color:var(--teal-dark);"><b>' + res.validas.length + ' fila(s) listas para importar.</b></p><ul style="margin:0 0 8px 18px;font-size:12.5px;color:var(--muted);">' +
        res.validas.slice(0,5).map(v=>'<li>' + esc(res.resumen(v)) + '</li>').join('') + (res.validas.length>5?'<li>… y ' + (res.validas.length-5) + ' más</li>':'') + '</ul>' +
        '<label style="font-size:13px;display:block;margin-bottom:8px;"><input type="checkbox" id="ieActualizar-' + id + '" checked> Actualizar los que ya existen (si no, se omiten)</label>' +
        '<button class="primary" onclick="ieConfirmar(\'' + id + '\')">Importar ' + res.validas.length + ' fila(s)</button>'
      : '<p style="color:var(--danger);">No hay filas válidas para importar.</p>';
    box.innerHTML = errHtml + okHtml;
  }catch(e){ console.error(e); box.innerHTML = '<p style="color:var(--danger);">' + esc(e.message||e) + '</p>'; }
  input.value = '';
}
async function ieConfirmar(id){
  if(!ieDatos || ieDatos.id !== id) return;
  const ds = IE_DATASETS[id], box = document.getElementById('iePrev-' + id);
  const chk = document.getElementById('ieActualizar-' + id);
  const opts = { actualizar: chk ? chk.checked : true };
  if(!confirm('¿Importar ' + ieDatos.validas.length + ' fila(s) de ' + ds.titulo.toLowerCase() + '?')) return;
  box.innerHTML = '<p style="color:var(--muted)">Importando… no cierres la página.</p>';
  try{
    const r = await ds.confirmar(ieDatos.validas, opts);
    ieDatos = null;
    box.innerHTML = '<p style="color:var(--teal-dark);"><b>✅ ' + esc(r.texto) + '</b></p>' + (r.extra ? '<p style="font-size:13px;">' + esc(r.extra) + '</p>' : '') +
      (r.fallos.length ? '<details open><summary style="color:var(--danger);"><b>' + r.fallos.length + ' con problemas</b></summary><ul style="margin:6px 0 0 18px;font-size:12.5px;">' +
        r.fallos.slice(0,50).map(f=>'<li>' + esc(f) + '</li>').join('') + '</ul></details>' : '');
  }catch(e){ console.error(e); box.innerHTML = '<p style="color:var(--danger);">Error importando: ' + esc(e.message||e) + '</p>'; }
}

/* ---------- pantalla ---------- */
function abrirImportExport(){
  if(!requireSupabase()) return;
  const body = document.getElementById('ieBody');
  const card = (id, icono, ayuda) => {
    const ds = IE_DATASETS[id];
    return '<div class="card"><div class="section-bar deep">' + icono + ' ' + ds.titulo + '</div>' +
      '<p class="helptext" style="margin-top:-4px;">' + ayuda + '</p>' +
      '<div class="actions-row" style="justify-content:flex-start;flex-wrap:wrap;">' +
        '<button class="ghost" onclick="ieExportar(\'' + id + '\',\'xlsx\')">⬇ Exportar Excel</button>' +
        '<button class="ghost" onclick="ieExportar(\'' + id + '\',\'pdf\')">🖨 Exportar PDF</button>' +
        (ds.importable ? '<button class="ghost" onclick="ieDescargarPlantilla(\'' + id + '\')">📄 Plantilla de importación</button>' : '') +
      '</div>' +
      (ds.importable ? '<div style="margin-top:12px;"><label style="font-size:13px;font-weight:600;">Importar desde Excel (.xlsx):</label><br>' +
        '<input type="file" accept=".xlsx,.xls,.csv" onchange="ieLeerArchivo(\'' + id + '\', this)" style="margin-top:6px;"></div><div id="iePrev-' + id + '" style="margin-top:10px;font-size:13.5px;"></div>' : '') +
      '</div>';
  };
  body.innerHTML =
    card('estudiantes','🎓','Sube varios estudiantes de una vez. Obligatorios: Documento y Apellidos o Nombres. Modalidad, Programa y Jornada deben escribirse como en la aplicación (revisa la plantilla).') +
    card('empresas','🏢','Una fila por empresa y, si es de prácticas no remuneradas, puedes agregar Programa, Jornada y Cupos (repite la empresa en varias filas para varios cupos). Categorías: ' + CATEGORIAS_EMPRESA.map(c=>c.nombre).join(' · ') + '.') +
    card('supervisores','👤','Crea o actualiza supervisores. Si dejas la contraseña vacía en uno nuevo, se genera una y se descarga un Excel con las credenciales.') +
    card('asignaciones','📋','Lista de estudiantes con la empresa a la que fueron asignados.');
  showScreen('screen-admin-datos');
}

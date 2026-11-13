/* ============================= AUDITORÍA DEL SISTEMA (solo administrador) =============================
   Reporte de quién hizo qué y cuándo: fecha, hora, usuario, rol, actividad, módulo, sobre qué y el detalle del cambio.
   Los datos los llenan disparadores en la base de datos (auditoria-etapa19.sql); esta pantalla solo los consulta.
   El registro no se puede editar ni borrar. Requiere haber ejecutado ese SQL. */

const AUD_TIPOS = [['', 'Todas las actividades'], ['crear', 'Crear / ingresar información'], ['modificar', 'Modificar'], ['eliminar', 'Eliminar'],
                   ['ingreso', 'Ingresos al sistema'], ['seguridad', 'Ingresos fallidos'], ['exportar', 'Exportaciones']];
const AUD_ROLES = [['', 'Todos los roles'], ['administrador', 'Administrador'], ['coord_practicas', 'Coordinador de prácticas'],
                   ['coord_gestion', 'Coordinador de gestión empresarial'], ['asistente', 'Asistente'], ['sup_general', 'Supervisor general'], ['servicio_estudiante', 'Servicio al estudiante'],
                   ['estudiante', 'Estudiante'], ['empresa', 'Empresa'], ['empresa_ca', 'Empresa (contrato de aprendizaje)'],
                   ['supervisor', 'Supervisor'], ['sistema', 'Sistema']];
const AUD_TIPO_TXT = { crear:'Crear', modificar:'Modificar', eliminar:'Eliminar', ingreso:'Ingreso', seguridad:'Ingreso fallido', exportar:'Exportar', otro:'Otro' };
const AUD_CAMPOS = {
  nombre:'Nombre', apellidos:'Apellidos', nombres:'Nombres', correo:'Correo', email:'Correo', telefono:'Teléfono', sede:'Sede', semestre:'Semestre',
  modalidad:'Modalidad', periodo_academico:'Periodo académico', funcionario:'Funcionario', programa:'Programa', jornada_solicitada:'Jornada solicitada',
  documento:'Documento', nit:'NIT', direccion:'Dirección', ciudad:'Ciudad', contacto:'Contacto', activa:'Activa', categoria:'Categoría', requisitos:'Requisitos',
  jornada:'Jornada', cupos_total:'Cupos', cupos_ocupados:'Cupos ocupados', fecha_inicio:'Fecha de inicio', fecha_fin:'Fecha de fin', horario:'Horario',
  dias:'Días', funciones:'Funciones', area:'Área', meses:'Meses', es_pnr:'Es práctica no remunerada', role:'Rol', key:'Clave', value:'Valor',
  abre:'Abre', cierra:'Cierra', empresa_id:'Empresa', id:'Id'
};
let audPagina = 0, audTotal = 0, audFiltros = {}, audFilas = [];
const AUD_POR_PAGINA = 100;

function audPantalla(){
  let el = document.getElementById('screen-admin-auditoria');
  if(!el){
    const ref = document.getElementById('screen-admin-hub') || document.querySelector('.screen'); if(!ref) return null;
    el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-auditoria'; ref.parentNode.appendChild(el);
  }
  return el;
}
function audHoy(d){ const x = new Date(Date.now() - (d||0)*86400000); const p = n=>String(n).padStart(2,'0');
  const f = new Intl.DateTimeFormat('en-CA', { timeZone:'America/Bogota', year:'numeric', month:'2-digit', day:'2-digit' }).format(x); return f; }
function audOpts(lista, sel){ return lista.map(([v,t])=>'<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(t)+'</option>').join(''); }

async function abrirAuditoria(){
  if(!requireSupabase()) return;
  const el = audPantalla(); if(!el) return;
  audFiltros = { desde: audHoy(7), hasta: audHoy(0), texto:'', tipo:'', modulo:'', rol:'' };
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Auditoría del sistema</h2>
    <p class="helptext" style="text-align:justify;">Control de quién hace movimientos en la plataforma: crear o ingresar información, modificar, eliminar, ingresos y exportaciones. Cada línea muestra la fecha, la hora (hora de Colombia), el usuario, su rol y la actividad. Este registro no se puede editar ni borrar. Por privacidad, nunca guarda contraseñas ni firmas.</p>
    <div class="card">
      <div class="aud-filtros">
        <div class="field"><label>Desde</label><input type="date" id="audDesde" value="${audFiltros.desde}"></div>
        <div class="field"><label>Hasta</label><input type="date" id="audHasta" value="${audFiltros.hasta}"></div>
        <div class="field aud-ancho"><label>Buscar (usuario, documento, empresa, dato…)</label><input type="search" id="audTexto" maxlength="80" autocomplete="off" onkeydown="if(event.key==='Enter')audConsultar(true)"></div>
        <div class="field"><label>Actividad</label><select id="audTipo">${audOpts(AUD_TIPOS, '')}</select></div>
        <div class="field"><label>Módulo</label><select id="audModulo"><option value="">Todos los módulos</option></select></div>
        <div class="field"><label>Rol</label><select id="audRol">${audOpts(AUD_ROLES, '')}</select></div>
      </div>
      <div class="actions-row" style="justify-content:flex-start;flex-wrap:wrap;">
        <button class="primary" onclick="audConsultar(true)">Consultar</button>
        <button class="ghost" onclick="audLimpiar()">Limpiar filtros</button>
        <button class="ghost" onclick="audExportar('xlsx')">⬇ Excel</button>
        <button class="ghost" onclick="audExportar('pdf')">⬇ PDF</button>
      </div>
    </div>
    <div class="card"><div id="audResumen" class="lista-cuenta"></div><div id="audTabla"><p style="color:var(--muted)">Cargando…</p></div><div id="audPager"></div></div>`;
  showScreen('screen-admin-auditoria');
  await audConsultar(true);
}
function audLeerFiltros(){
  const g = id => { const e = document.getElementById(id); return e ? e.value : ''; };
  audFiltros = { desde: g('audDesde'), hasta: g('audHasta'), texto: g('audTexto').trim(), tipo: g('audTipo'), modulo: g('audModulo'), rol: g('audRol') };
}
function audLimpiar(){
  ['audTexto'].forEach(i=>{ document.getElementById(i).value = ''; });
  document.getElementById('audDesde').value = audHoy(7); document.getElementById('audHasta').value = audHoy(0);
  ['audTipo','audModulo','audRol'].forEach(i=>{ document.getElementById(i).value = ''; });
  audConsultar(true);
}
function audArgs(limite, offset){
  return { p_desde: audFiltros.desde || null, p_hasta: audFiltros.hasta || null, p_texto: audFiltros.texto || null,
           p_tipo: audFiltros.tipo || null, p_modulo: audFiltros.modulo || null, p_rol: audFiltros.rol || null, p_limite: limite, p_offset: offset };
}
async function audConsultar(reiniciar){
  if(reiniciar){ audPagina = 0; audLeerFiltros(); }
  const tabla = document.getElementById('audTabla'); if(!tabla) return;
  if(audFiltros.desde && audFiltros.hasta && audFiltros.desde > audFiltros.hasta){ toast('La fecha «Desde» no puede ser posterior a «Hasta»', true); return; }
  tabla.innerHTML = '<p style="color:var(--muted)">Consultando…</p>';
  const { data, error } = await sb.rpc('admin_auditoria', audArgs(AUD_POR_PAGINA, audPagina * AUD_POR_PAGINA));
  if(error){
    tabla.innerHTML = '<p style="color:var(--danger)">No se pudo cargar la auditoría: ' + esc(error.message) + ' (¿ejecutaste auditoria-etapa19.sql?)</p>'; return;
  }
  audTotal = data.total || 0; audFilas = data.filas || [];
  // lista de módulos (se llena una vez)
  const selM = document.getElementById('audModulo');
  if(selM && selM.options.length <= 1 && Array.isArray(data.modulos)){
    selM.innerHTML = '<option value="">Todos los módulos</option>' + data.modulos.map(m=>'<option value="'+esc(m)+'">'+esc(m)+'</option>').join('');
    selM.value = audFiltros.modulo || '';
  }
  audPintar();
}
function audFechaHora(iso){
  const d = new Date(iso);
  return [ d.toLocaleDateString('es-CO', { timeZone:'America/Bogota', day:'2-digit', month:'2-digit', year:'numeric' }),
           d.toLocaleTimeString('es-CO', { timeZone:'America/Bogota', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }) ];
}
function audRol(r){ const f = AUD_ROLES.find(x=>x[0] === r); return f ? f[1] : (r || '—'); }
function audCampo(k){ return AUD_CAMPOS[k] || k.replace(/_/g, ' ').replace(/^./, c=>c.toUpperCase()); }
function audRuta(p){
  let m;
  if((m = /^meses\[(\d+)\]\.(.+)$/.exec(p))) return 'Mes ' + m[1] + ' · ' + audCampo(m[2]).replace('firmaEmpresa','firma de la empresa').replace('firmaEstudiante','firma del estudiante');
  if((m = /^meses\[(\d+)\]$/.exec(p))) return 'Mes ' + m[1];
  if((m = /^competencias\.(\w+)\[(\d+)\]$/.exec(p))) return 'Calificación «' + m[1] + '» · mes ' + m[2];
  if((m = /^revision_funciones\.(.+)$/.exec(p))) return 'Revisión de funciones · ' + audCampo(m[1]);
  if((m = /^datos_supervision\.(.+)$/.exec(p))) return 'Visita de supervisión · ' + audCampo(m[1]);
  return p;
}
function audDetalleHtml(d){
  if(!d) return '<span style="color:var(--muted)">Sin más detalle.</span>';
  let h = '';
  if(d.cambios && Object.keys(d.cambios).length){
    h += '<table class="cupos-table aud-tabla"><thead><tr><th>Campo</th><th>Antes</th><th>Después</th></tr></thead><tbody>' + Object.keys(d.cambios).map(k=>{
      const v = d.cambios[k];
      if(v && typeof v === 'object' && 'antes' in v) return '<tr><td><b>' + esc(audCampo(k)) + '</b></td><td class="aud-antes">' + esc(v.antes || '(vacío)') + '</td><td class="aud-desp">' + esc(v.despues || '(vacío)') + '</td></tr>';
      return '<tr><td><b>' + esc(audCampo(k)) + '</b></td><td>—</td><td>' + esc(String(v)) + '</td></tr>';
    }).join('') + '</tbody></table>';
  }
  if(d.partes_modificadas && d.partes_modificadas.length) h += '<div><b>Partes modificadas:</b> ' + d.partes_modificadas.map(p=>esc(audRuta(p))).join(' · ') + '</div>';
  if(d.datos && Object.keys(d.datos).length) h += '<table class="cupos-table aud-tabla"><thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>' + Object.keys(d.datos).filter(k=>k!=='id').map(k=>'<tr><td><b>' + esc(audCampo(k)) + '</b></td><td>' + esc(String(d.datos[k])) + '</td></tr>').join('') + '</tbody></table>';
  if(d.info) h += '<div>' + esc(String(d.info)) + '</div>';
  if(!h) h = '<pre class="aud-pre">' + esc(JSON.stringify(d, null, 1)) + '</pre>';
  return h;
}
function audPintar(){
  const tabla = document.getElementById('audTabla'), res = document.getElementById('audResumen'), pager = document.getElementById('audPager');
  const ini = audTotal ? audPagina * AUD_POR_PAGINA + 1 : 0, fin = Math.min(audTotal, (audPagina + 1) * AUD_POR_PAGINA);
  res.textContent = audTotal ? ('Mostrando ' + ini + '–' + fin + ' de ' + audTotal.toLocaleString('es-CO') + ' movimiento(s)') : '';
  if(!audFilas.length){ tabla.innerHTML = '<p style="color:var(--muted);font-size:13.5px;">No hay movimientos con estos filtros.</p>'; pager.innerHTML = ''; return; }
  const filas = audFilas.map((f,i)=>{
    const [dia, hora] = audFechaHora(f.fecha);
    return `<tr>
      <td class="aud-nw">${dia}</td><td class="aud-nw">${hora}</td>
      <td><b>${esc(f.usuario || '—')}</b>${f.usuario_ref && f.usuario_ref !== f.usuario ? '<br><span class="aud-ref">' + esc(f.usuario_ref) + '</span>' : ''}</td>
      <td>${esc(audRol(f.rol))}</td>
      <td><span class="aud-tipo aud-t-${esc(f.tipo)}">${esc(AUD_TIPO_TXT[f.tipo] || f.tipo)}</span> ${esc(f.actividad)}</td>
      <td>${esc(f.modulo)}</td><td>${esc(f.objeto || '—')}</td>
      <td>${f.detalle ? '<button class="ghost aud-ver" onclick="audToggle(' + i + ')">Ver</button>' : ''}</td>
    </tr>${f.detalle ? '<tr class="aud-fila-det" id="audDet' + i + '" hidden><td colspan="8">' + audDetalleHtml(f.detalle) + '</td></tr>' : ''}`;
  }).join('');
  tabla.innerHTML = '<div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Fecha</th><th>Hora</th><th>Usuario</th><th>Rol</th><th>Actividad</th><th>Módulo</th><th>Sobre</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div>';
  const paginas = Math.ceil(audTotal / AUD_POR_PAGINA);
  pager.innerHTML = paginas > 1 ? `<div class="actions-row" style="justify-content:space-between;margin-top:10px;">
      <button class="ghost" ${audPagina === 0 ? 'disabled' : ''} onclick="audPagina--;audConsultar(false)">← Anterior</button>
      <span class="helptext" style="margin:0">Página ${audPagina + 1} de ${paginas}</span>
      <button class="ghost" ${audPagina >= paginas - 1 ? 'disabled' : ''} onclick="audPagina++;audConsultar(false)">Siguiente →</button></div>` : '';
}
function audToggle(i){ const r = document.getElementById('audDet' + i); if(r) r.hidden = !r.hidden; }

// Texto plano del detalle (para Excel/PDF)
function audDetalleTexto(d){
  if(!d) return '';
  const p = [];
  if(d.cambios) Object.keys(d.cambios).forEach(k=>{ const v = d.cambios[k]; p.push(audCampo(k) + ': ' + ((v && typeof v === 'object' && 'antes' in v) ? ((v.antes || '(vacío)') + ' → ' + (v.despues || '(vacío)')) : v)); });
  if(d.partes_modificadas) p.push('Partes: ' + d.partes_modificadas.map(audRuta).join(', '));
  if(d.datos) Object.keys(d.datos).filter(k=>k!=='id').forEach(k=>p.push(audCampo(k) + ': ' + d.datos[k]));
  if(d.info) p.push(String(d.info));
  return p.join(' | ');
}
async function audExportar(formato){
  audLeerFiltros();
  toast('Preparando el reporte…');
  const { data, error } = await sb.rpc('admin_auditoria', audArgs(5000, 0));
  if(error){ toast('No se pudo exportar: ' + error.message, true); return; }
  const filas = data.filas || [];
  if(!filas.length){ toast('No hay movimientos para exportar', true); return; }
  const head = ['Fecha', 'Hora', 'Usuario', 'Correo / documento', 'Rol', 'Actividad', 'Módulo', 'Sobre', 'Detalle'];
  const rows = filas.map(f=>{ const [d, h] = audFechaHora(f.fecha);
    return [d, h, f.usuario, f.usuario_ref, audRol(f.rol), (AUD_TIPO_TXT[f.tipo] || f.tipo) + ' · ' + f.actividad, f.modulo, f.objeto, audDetalleTexto(f.detalle)]; });
  const rango = (audFiltros.desde || 'inicio') + ' a ' + (audFiltros.hasta || 'hoy');
  const nombre = 'auditoria-' + (audFiltros.desde || 'inicio') + '_' + (audFiltros.hasta || 'hoy');
  if(data.total > filas.length) toast('Se exportan los 5.000 movimientos más recientes de ' + data.total.toLocaleString('es-CO') + '. Acota las fechas para ver el resto.', true);
  if(formato === 'pdf') await pdfTablaDescargar({ titulo: 'Auditoría del sistema · ' + rango, archivo: nombre, head: head.filter((_,i)=>i!==3), rows: rows.map(r=>r.filter((_,i)=>i!==3)) });
  else ieDescargarXlsx(nombre, head, rows, 'Auditoría', 'Auditoría del sistema · ' + rango);
  try{ sb.rpc('registrar_evento', { p_tipo:'exportar', p_modulo:'Auditoría', p_actividad:'Exportó la auditoría a ' + (formato === 'pdf' ? 'PDF' : 'Excel'), p_detalle: { rango } }).then(()=>{}, ()=>{}); }catch(_){}
}

/* ---------- Registro de exportaciones y del ingreso del personal (lo anota la base de datos) ---------- */
function audRegistrar(modulo, actividad){
  try{ if(typeof sb !== 'undefined' && sb && state.role === 'administrador') sb.rpc('registrar_evento', { p_tipo:'exportar', p_modulo:modulo, p_actividad:actividad }).then(()=>{}, ()=>{}); }catch(_){}
}
(function(){
  if(typeof ieExportar === 'function'){
    const _ie = ieExportar;
    ieExportar = function(id, formato){
      const ds = (typeof IE_DATASETS !== 'undefined' && IE_DATASETS[id]) ? IE_DATASETS[id].titulo : id;
      audRegistrar(ds, 'Exportó ' + String(ds).toLowerCase() + ' a ' + (formato === 'pdf' ? 'PDF' : 'Excel'));
      return _ie.apply(this, arguments);
    };
  }
  if(typeof adminListExportar === 'function'){
    const _al = adminListExportar;
    adminListExportar = function(formato){
      audRegistrar('Estudiantes', 'Exportó el listado de estudiantes a ' + (formato === 'pdf' ? 'PDF' : 'Excel'));
      return _al.apply(this, arguments);
    };
  }
})();

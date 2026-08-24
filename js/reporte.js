/* ============================= REPORTE DE VISITAS (Administrador) ============================= */
let reporteVisitasCache = []; // todas las filas, sin filtrar
let reporteFiltroSupervisorVal = '';
let reporteFiltroDesdeVal = '';
let reporteFiltroHastaVal = '';

async function renderReporteVisitas(){
  const el = document.getElementById('reporteVisitasList');
  if(!sb){ el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No hay conexión con la base de datos. Revisa la consola (F12).</p>'; return; }
  el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Cargando…</p>';
  try{
    const { data, error } = await sb.from('students')
      .select('documento,nombre,apellidos,nombres,revision_funciones,datos_supervision')
      .order('nombre', { ascending: true });
    if(error){ el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No se pudo cargar: '+error.message+'</p>'; return; }

    const rows = [];
    (data || []).forEach(s=>{
      const rf = s.revision_funciones || {};
      const ds = s.datos_supervision || {};
      if(rf.fecha){
        rows.push({
          supervisor: rf.supervisor || '',
          supervisorCorreo: rf.supervisorCorreo || '',
          fecha: rf.fecha,
          documento: s.documento,
          apellidos: s.apellidos || '',
          nombres: s.nombres || '',
          modalidadVisita: rf.modalidadVisita || '',
          empresa: rf.sitio || '',
          jefeInmediato: rf.jefeInmediato || '',
          visita: 'Visita 1'
        });
      }
      if(ds.fecha){
        rows.push({
          supervisor: ds.supervisor || '',
          supervisorCorreo: ds.supervisorCorreo || '',
          fecha: ds.fecha,
          documento: s.documento,
          apellidos: s.apellidos || '',
          nombres: s.nombres || '',
          modalidadVisita: ds.modalidadVisita || '',
          empresa: ds.sitio || '',
          jefeInmediato: ds.jefeInmediato || '',
          visita: 'Visita 2'
        });
      }
    });
    rows.sort((a,b)=> (b.fecha||'').localeCompare(a.fecha||''));
    reporteVisitasCache = rows;

    // arma la lista de supervisores para el filtro, conservando lo que ya estaba elegido
    const sel = document.getElementById('reporteFiltroSupervisor');
    const supervisores = Array.from(new Set(rows.map(r=>r.supervisor).filter(Boolean))).sort();
    const valorPrevio = reporteFiltroSupervisorVal;
    sel.innerHTML = '<option value="">Todos</option>' + supervisores.map(s=>`<option value="${escapeAttr(s)}" ${s===valorPrevio?'selected':''}>${s}</option>`).join('');

    renderReporteVisitasTable();
  }catch(e){ console.error(e); el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No se pudo cargar (revisa la consola).</p>'; }
}

function filasFiltradas(){
  return reporteVisitasCache.filter(r=>{
    if(reporteFiltroSupervisorVal && r.supervisor !== reporteFiltroSupervisorVal) return false;
    if(reporteFiltroDesdeVal && r.fecha < reporteFiltroDesdeVal) return false;
    if(reporteFiltroHastaVal && r.fecha > reporteFiltroHastaVal) return false;
    return true;
  });
}

function aplicarFiltrosReporte(){
  reporteFiltroSupervisorVal = document.getElementById('reporteFiltroSupervisor').value;
  reporteFiltroDesdeVal = document.getElementById('reporteFiltroDesde').value;
  reporteFiltroHastaVal = document.getElementById('reporteFiltroHasta').value;
  renderReporteVisitasTable();
}
function limpiarFiltrosReporte(){
  document.getElementById('reporteFiltroSupervisor').value = '';
  document.getElementById('reporteFiltroDesde').value = '';
  document.getElementById('reporteFiltroHasta').value = '';
  reporteFiltroSupervisorVal = ''; reporteFiltroDesdeVal = ''; reporteFiltroHastaVal = '';
  renderReporteVisitasTable();
}

function renderReporteVisitasTable(){
  const el = document.getElementById('reporteVisitasList');
  const rows = filasFiltradas();
  if(reporteVisitasCache.length === 0){ el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Todavía no hay visitas registradas por ningún supervisor.</p>'; return; }
  if(rows.length === 0){ el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Ninguna visita coincide con estos filtros.</p>'; return; }

  const trs = rows.map(r=>`<tr>
    <td>${r.supervisor || '—'}</td>
    <td>${r.supervisorCorreo || '—'}</td>
    <td>${fmtDate(r.fecha) || '—'}</td>
    <td>${r.visita}</td>
    <td>${r.documento}</td>
    <td>${r.apellidos || '<span style="color:var(--muted);">— sin registrar —</span>'}</td>
    <td>${r.nombres || '<span style="color:var(--muted);">— sin registrar —</span>'}</td>
    <td>${r.modalidadVisita || '—'}</td>
    <td>${r.empresa || '—'}</td>
    <td>${r.jefeInmediato || '—'}</td>
  </tr>`).join('');
  el.innerHTML = `<p class="helptext" style="margin-top:0;">${rows.length} de ${reporteVisitasCache.length} visita(s).</p>
    <table class="resumen-table"><thead><tr>
      <th>Supervisor</th><th>Correo supervisor</th><th>Fecha visita</th><th>Visita</th><th>Documento estudiante</th><th>Apellidos</th><th>Nombres</th><th>Modalidad visita</th><th>Empresa</th><th>Jefe inmediato</th>
    </tr></thead><tbody>${trs}</tbody></table>
    <p class="helptext">Si "Apellidos"/"Nombres" salen vacíos para algún estudiante, edítalos en su ficha (Estudiantes → Datos generales).</p>`;
}

function downloadReporteVisitasXLSX(){
  const rows = filasFiltradas();
  if(!rows || rows.length===0){ toast('No hay datos para descargar con estos filtros', true); return; }
  if(typeof XLSX === 'undefined'){ toast('No se pudo cargar el generador de Excel. Revisa tu conexión y recarga la página.', true); return; }
  const headers = ['Supervisor','Correo supervisor','Fecha visita','Visita','Documento estudiante','Apellidos','Nombres','Modalidad visita','Empresa','Jefe inmediato'];
  const data = [headers].concat(rows.map(r=>[
    r.supervisor, r.supervisorCorreo, fmtDate(r.fecha), r.visita, r.documento, r.apellidos, r.nombres, r.modalidadVisita, r.empresa, r.jefeInmediato
  ]));
  try{
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [ {wch:20}, {wch:24}, {wch:12}, {wch:9}, {wch:16}, {wch:20}, {wch:20}, {wch:14}, {wch:26}, {wch:20} ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte visitas');
    XLSX.writeFile(wb, 'reporte_visitas.xlsx');
    toast('Excel descargado');
  }catch(e){
    console.error(e);
    toast('No se pudo generar el Excel: '+e.message, true);
  }
}

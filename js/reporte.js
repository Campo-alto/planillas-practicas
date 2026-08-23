/* ============================= REPORTE DE VISITAS (Administrador) ============================= */
let reporteVisitasCache = [];

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
          fecha: rf.fecha,
          documento: s.documento,
          apellidos: s.apellidos || '',
          nombres: s.nombres || '',
          nombreCompleto: s.nombre || '',
          modalidadVisita: rf.modalidadVisita || '',
          empresa: rf.sitio || '',
          jefeInmediato: rf.jefeInmediato || '',
          visita: 'Visita 1'
        });
      }
      if(ds.fecha){
        rows.push({
          supervisor: ds.supervisor || '',
          fecha: ds.fecha,
          documento: s.documento,
          apellidos: s.apellidos || '',
          nombres: s.nombres || '',
          nombreCompleto: s.nombre || '',
          modalidadVisita: ds.modalidadVisita || '',
          empresa: ds.sitio || '',
          jefeInmediato: ds.jefeInmediato || '',
          visita: 'Visita 2'
        });
      }
    });
    rows.sort((a,b)=> (b.fecha||'').localeCompare(a.fecha||''));
    reporteVisitasCache = rows;

    if(rows.length === 0){ el.innerHTML = '<p style="color:var(--muted);font-size:13px;">Todavía no hay visitas registradas por ningún supervisor.</p>'; return; }

    const trs = rows.map(r=>`<tr>
      <td>${r.supervisor || '—'}</td>
      <td>${fmtDate(r.fecha) || '—'}</td>
      <td>${r.visita}</td>
      <td>${r.documento}</td>
      <td>${r.apellidos || '<span style="color:var(--muted);">— sin registrar —</span>'}</td>
      <td>${r.nombres || '<span style="color:var(--muted);">— sin registrar —</span>'}</td>
      <td>${r.modalidadVisita || '—'}</td>
      <td>${r.empresa || '—'}</td>
      <td>${r.jefeInmediato || '—'}</td>
    </tr>`).join('');
    el.innerHTML = `<table class="resumen-table"><thead><tr>
      <th>Supervisor</th><th>Fecha visita</th><th>Visita</th><th>Documento estudiante</th><th>Apellidos</th><th>Nombres</th><th>Modalidad visita</th><th>Empresa</th><th>Jefe inmediato</th>
    </tr></thead><tbody>${trs}</tbody></table>
    <p class="helptext">Si "Apellidos"/"Nombres" salen vacíos para algún estudiante, edítalos en su ficha (Estudiantes → Datos generales) — antes solo se guardaba el nombre completo en un solo campo.</p>`;
  }catch(e){ console.error(e); el.innerHTML = '<p style="color:var(--danger);font-size:13px;">No se pudo cargar (revisa la consola).</p>'; }
}

function csvEscape(v){
  const s = String(v==null ? '' : v);
  if(/[",\n]/.test(s)) return '"'+s.replace(/"/g,'""')+'"';
  return s;
}
function downloadReporteVisitasCSV(){
  if(!reporteVisitasCache || reporteVisitasCache.length===0){ toast('No hay datos para descargar todavía', true); return; }
  const headers = ['Supervisor','Fecha visita','Visita','Documento estudiante','Apellidos','Nombres','Modalidad visita','Empresa','Jefe inmediato'];
  const lines = [headers.join(',')];
  reporteVisitasCache.forEach(r=>{
    lines.push([
      csvEscape(r.supervisor), csvEscape(fmtDate(r.fecha)), csvEscape(r.visita), csvEscape(r.documento),
      csvEscape(r.apellidos), csvEscape(r.nombres), csvEscape(r.modalidadVisita), csvEscape(r.empresa), csvEscape(r.jefeInmediato)
    ].join(','));
  });
  const csv = '\uFEFF' + lines.join('\r\n'); // BOM para que Excel lea bien las tildes
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reporte_visitas.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('CSV descargado');
}

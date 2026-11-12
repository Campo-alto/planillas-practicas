/* ============================= FUNCIONES DE ADMINISTRADOR PARA EL SUPERVISOR (VISITAS) =============================
   Si el administrador enciende estas casillas en «Roles y permisos → Supervisor (visitas)», aparecen aquí tarjetas con:
   asignar visitas · reporte de visitas completo · empresas de RLP y RAP (consulta) · estudiantes registrados (consulta).
   SEGURIDAD: esto solo ordena lo que se VE. La base de datos (supervisor-funciones-admin-etapa55.sql) rechaza cada llamada sin permiso.
   Requiere visitas-supervisor.js (svPuede, svPermisos) y haber ejecutado las etapas 54 y 55. */
let saVista = 'pendientes', saSups = [], saFilas = {}, saRep = [], saEmp = [], saEst = [];

function saTarjeta(id, titulo, ayuda, cuerpo){
  let c = document.getElementById(id);
  if(!c){
    const lk = document.getElementById('screen-lookup'); if(!lk) return null;
    c = document.createElement('div'); c.className = 'card'; c.id = id; lk.appendChild(c);
    c.innerHTML = '<div class="section-bar deep">' + titulo + '</div><p class="helptext">' + ayuda + '</p>' + cuerpo;
  }
  c.style.display = 'block'; return c;
}
function saOculta(id){ const c = document.getElementById(id); if(c) c.style.display = 'none'; }
function saErr(el, e){ el.innerHTML = '<p style="color:var(--danger);font-size:13px;">' + esc(e.message || e) + (/does not exist|Could not find/i.test(String(e.message)) ? ' (¿ejecutaste supervisor-funciones-admin-etapa55.sql?)' : '') + '</p>'; }
function saExcel(nombre, filas){
  if(typeof XLSX === 'undefined'){ toast('No se cargó la librería de Excel. Recarga la página.', true); return; }
  if(!filas.length){ toast('No hay datos para descargar.', true); return; }
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), 'Datos'); XLSX.writeFile(wb, nombre + '.xlsx');
}
const saFecha = x => x ? String(x).slice(0, 10).split('-').reverse().join('/') : '—';

/* ---------- Mostrar u ocultar cada tarjeta según los permisos ---------- */
function saRender(){
  if(typeof svPuede !== 'function') return;
  if(svPuede('supa_asignar')){
    saTarjeta('saAsignarCard', 'Visitas por asignar', 'Asigna a un supervisor los estudiantes de RLP y RAP que aún no tienen visita, o reasigna y libera las activas. El supervisor y el estudiante reciben un correo.',
      '<div class="lista-top" style="display:flex;gap:8px;flex-wrap:wrap;"><select id="saVista" onchange="saVista=this.value;saAsignarCargar()"><option value="pendientes">Por asignar</option><option value="activas">Activas</option><option value="historial">Historial</option></select><input type="search" id="saQ" class="lista-busca" placeholder="🔎 Nombre o documento…" oninput="clearTimeout(window._saT);window._saT=setTimeout(saAsignarCargar,350)"></div><div id="saAsignarLista"><p style="color:var(--muted)">Cargando…</p></div>');
    if(!saTarjeta.cargado) { saTarjeta.cargado = true; saAsignarCargar(); }
  } else saOculta('saAsignarCard');
  if(svPuede('supa_reporte')){
    saTarjeta('saReporteCard', 'Reporte de visitas completo', 'Una fila por visita: supervisor, fecha, estudiante, modalidad, empresa y jefe inmediato. Solo lectura.',
      '<div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="saReporteCargar()">Ver / actualizar</button><button class="ghost" onclick="saReporteExcel()">⬇ Excel</button></div><div id="saReporteLista"></div>');
  } else saOculta('saReporteCard');
  if(svPuede('supa_empresas')){
    saTarjeta('saEmpresasCard', 'Empresas de RLP y RAP', 'Empresas que consiguieron los estudiantes: contacto, estudiante, supervisor y concepto de la visita. Solo lectura.',
      '<div class="lista-top" style="display:flex;gap:8px;flex-wrap:wrap;"><select id="saTipo"><option value="">RLP y RAP</option><option value="rlp">RLP</option><option value="rap">RAP</option></select><input type="search" id="saEmpQ" class="lista-busca" placeholder="🔎 Empresa, estudiante, documento o NIT…"><button class="ghost" onclick="saEmpresasCargar()">Buscar</button><button class="ghost" onclick="saEmpresasExcel()">⬇ Excel</button></div><div id="saEmpresasLista"></div>');
  } else saOculta('saEmpresasCard');
  if(svPuede('supa_estudiantes')){
    saTarjeta('saEstudiantesCard', 'Estudiantes registrados', 'Lista de estudiantes con su programa, modalidad y estado. Solo lectura: no se crean ni se inhabilitan desde aquí.',
      '<div class="lista-top" style="display:flex;gap:8px;flex-wrap:wrap;"><input type="search" id="saEstQ" class="lista-busca" placeholder="🔎 Nombre, documento o programa…"><button class="ghost" onclick="saEstudiantesCargar()">Buscar</button><button class="ghost" onclick="saEstudiantesExcel()">⬇ Excel</button></div><div id="saEstudiantesLista"></div>');
  } else saOculta('saEstudiantesCard');
}

/* ---------- Asignar visitas ---------- */
async function saAsignarCargar(){
  const l = document.getElementById('saAsignarLista'); if(!l) return;
  const q = (document.getElementById('saQ') || {}).value || '';
  l.innerHTML = '<p style="color:var(--muted)">Cargando…</p>';
  const { data, error } = await sb.rpc('supa_visitas_lista', { p_token: state.token, p_vista: saVista, p_texto: q || null });
  if(error){ saErr(l, error); return; }
  saFilas = {}; (data || []).forEach((f, i)=>{ saFilas[i] = f; });
  const filas = data || [];
  if(!filas.length){ l.innerHTML = '<p style="color:var(--muted);font-size:13.5px;">No hay registros en esta vista.</p>'; return; }
  l.innerHTML = '<div class="cupos-wrap"><table class="cupos-table"><thead><tr><th>Estudiante</th><th>Modalidad</th><th>Lugar</th>' + (saVista === 'pendientes' ? '' : '<th>Supervisor</th><th>Estado</th>') + '<th></th></tr></thead><tbody>' +
    filas.map((f, i)=>'<tr><td><b>' + esc(f.nombre || '') + '</b><br><span class="aud-ref">Doc. ' + esc(f.documento) + '</span></td><td>' + esc(f.modalidad || '—') + '</td><td>' + esc(f.sitio || '—') + '</td>' +
      (saVista === 'pendientes' ? '' : '<td>' + esc(f.supervisor || '—') + '<br><span class="aud-ref">' + esc(f.supervisor_correo || '') + '</span>' + (f.nota ? '<br><i>' + esc(f.nota) + '</i>' : '') + '</td><td>' + esc(f.estado || '') + '<br><span class="aud-ref">' + saFecha(f.creado) + '</span></td>') +
      '<td>' + (saVista === 'historial' ? '' : '<button class="primary" onclick="saAsignarModal(' + i + ')">' + (saVista === 'activas' ? 'Reasignar' : 'Asignar') + '</button>') +
      (saVista === 'activas' ? ' <button class="ghost" onclick="saLiberar(' + i + ')">Liberar</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>';
}
async function saAsignarModal(i){
  const f = saFilas[i]; if(!f) return;
  const { data, error } = await sb.rpc('supa_visitas_supervisores', { p_token: state.token });
  if(error){ toast(error.message, true); return; }
  saSups = data || [];
  const prev = document.getElementById('saModal'); if(prev) prev.remove();
  const m = document.createElement('div'); m.id = 'saModal'; m.className = 'cor-modal';
  m.innerHTML = '<div class="cor-caja" role="dialog" aria-modal="true" style="max-width:520px;"><h3 style="margin:0 0 4px;">Asignar visita</h3>' +
    '<p class="helptext" style="margin:0 0 8px;"><b>' + esc(f.nombre) + '</b> (Doc. ' + esc(f.documento) + ') · ' + esc(f.modalidad || '') + '</p>' +
    '<div class="field"><label>Supervisor *</label><select id="saSup"><option value="">Elige…</option>' + saSups.map(x=>'<option value="' + esc(x.id) + '">' + esc(x.nombre) + ' (' + x.activas + ' activas)</option>').join('') + '</select></div>' +
    '<div class="field"><label>Nota (opcional)</label><input type="text" id="saNota" maxlength="300"></div><div id="saMsg" style="margin-top:6px;font-size:13px;"></div>' +
    '<div class="actions-row" style="justify-content:flex-end;margin-top:10px;"><button class="ghost" onclick="document.getElementById(\'saModal\').remove()">Cancelar</button><button class="primary" id="saGo" onclick="saAsignar(' + i + ')">Asignar</button></div></div>';
  document.body.appendChild(m);
}
async function saAsignar(i){
  const f = saFilas[i], sup = document.getElementById('saSup').value, msg = document.getElementById('saMsg');
  if(!sup){ msg.innerHTML = '<span style="color:var(--danger)">Elige un supervisor.</span>'; return; }
  const b = document.getElementById('saGo'); b.disabled = true;
  const { error } = await sb.rpc('supa_visita_asignar', { p_token: state.token, p_documento: f.documento, p_supervisor: sup, p_nota: document.getElementById('saNota').value.trim() });
  if(error){ b.disabled = false; msg.innerHTML = '<span style="color:var(--danger)">' + esc(error.message) + '</span>'; return; }
  document.getElementById('saModal').remove(); toast('Visita asignada. Los avisos por correo quedaron listos para enviar.');
  saAsignarCargar(); if(typeof cpRevisar === 'function') setTimeout(cpRevisar, 300);
}
async function saLiberar(i){
  const f = saFilas[i]; if(!f || !confirm('¿Liberar la visita de ' + f.nombre + '?\nEl estudiante queda sin supervisor.')) return;
  const { error } = await sb.rpc('supa_visita_liberar', { p_token: state.token, p_id: f.id });
  if(error){ toast(error.message, true); return; }
  toast('Visita liberada'); saAsignarCargar();
}

/* ---------- Reporte de visitas completo ---------- */
async function saReporteCargar(){
  const l = document.getElementById('saReporteLista'); if(!l) return; l.innerHTML = '<p style="color:var(--muted)">Cargando…</p>';
  const { data, error } = await sb.rpc('supa_reporte_completo', { p_token: state.token });
  if(error){ saErr(l, error); return; }
  saRep = data || [];
  l.innerHTML = !saRep.length ? '<p style="color:var(--muted);font-size:13.5px;">Aún no hay visitas registradas.</p>' :
    '<div class="cupos-wrap"><table class="cupos-table"><thead><tr><th>Supervisor</th><th>Fecha</th><th>Estudiante</th><th>Visita</th><th>Modalidad</th><th>Empresa</th><th>Jefe inmediato</th></tr></thead><tbody>' +
    saRep.map(r=>'<tr><td>' + esc(r.supervisor || '—') + '</td><td class="aud-nw">' + saFecha(r.fecha) + '</td><td><b>' + esc(r.nombre || '') + '</b><br><span class="aud-ref">Doc. ' + esc(r.documento) + '</span></td><td>' + esc(r.visita) + '</td><td>' + esc(r.modalidad_visita || '—') + '</td><td>' + esc(r.empresa || '—') + '</td><td>' + esc(r.jefe_inmediato || '—') + '</td></tr>').join('') + '</tbody></table></div>';
}
async function saReporteExcel(){ if(!saRep.length) await saReporteCargar(); saExcel('reporte-visitas', saRep.map(r=>({ Supervisor:r.supervisor, Fecha:saFecha(r.fecha), Documento:r.documento, Estudiante:r.nombre, Visita:r.visita, Modalidad:r.modalidad_visita, Empresa:r.empresa, 'Jefe inmediato':r.jefe_inmediato }))); }

/* ---------- Empresas de RLP y RAP ---------- */
async function saEmpresasCargar(){
  const l = document.getElementById('saEmpresasLista'); if(!l) return; l.innerHTML = '<p style="color:var(--muted)">Cargando…</p>';
  const { data, error } = await sb.rpc('supa_empresas_rlp_rap', { p_token: state.token, p_tipo: document.getElementById('saTipo').value || null, p_estado: null, p_texto: document.getElementById('saEmpQ').value.trim() || null });
  if(error){ saErr(l, error); return; }
  saEmp = data || [];
  l.innerHTML = !saEmp.length ? '<p style="color:var(--muted);font-size:13.5px;">No hay empresas con esa búsqueda.</p>' :
    '<div class="cupos-wrap"><table class="cupos-table"><thead><tr><th>Empresa</th><th>Contacto</th><th>Estudiante</th><th>Supervisor</th><th>Concepto</th></tr></thead><tbody>' +
    saEmp.map(e=>'<tr><td><b>' + esc(e.empresa || '') + '</b> <span class="aud-ref">' + esc(e.tipo) + '</span><br><span class="aud-ref">NIT ' + esc(e.nit || '—') + ' · ' + esc([e.direccion, e.ciudad].filter(Boolean).join(', ') || '—') + '</span></td><td><span class="aud-ref">' + esc(e.contacto || '—') + '<br>' + esc(e.correo || '') + (e.telefono ? ' · ' + esc(e.telefono) : '') + '</span></td><td><b>' + esc(e.estudiante || '') + '</b><br><span class="aud-ref">Doc. ' + esc(e.documento) + ' · ' + esc(e.programa || '') + '</span></td><td>' + esc(e.supervisor || '—') + '</td><td>' + esc(e.concepto || e.estado || '—') + '</td></tr>').join('') + '</tbody></table></div>';
}
function saEmpresasExcel(){ saExcel('empresas-rlp-rap', saEmp.map(e=>({ Tipo:e.tipo, Empresa:e.empresa, NIT:e.nit, Contacto:e.contacto, Correo:e.correo, Teléfono:e.telefono, Dirección:e.direccion, Ciudad:e.ciudad, Documento:e.documento, Estudiante:e.estudiante, Programa:e.programa, Supervisor:e.supervisor, Concepto:e.concepto || e.estado }))); }

/* ---------- Estudiantes registrados ---------- */
async function saEstudiantesCargar(){
  const l = document.getElementById('saEstudiantesLista'); if(!l) return; l.innerHTML = '<p style="color:var(--muted)">Cargando…</p>';
  const { data, error } = await sb.rpc('supa_estudiantes_lista', { p_token: state.token, p_texto: document.getElementById('saEstQ').value.trim() || null });
  if(error){ saErr(l, error); return; }
  saEst = data || [];
  const abrir = svPuede('supv_consultar');
  l.innerHTML = !saEst.length ? '<p style="color:var(--muted);font-size:13.5px;">No hay estudiantes con esa búsqueda.</p>' :
    '<div class="cupos-wrap"><table class="cupos-table"><thead><tr><th>Estudiante</th><th>Programa</th><th>Modalidad</th><th>Contacto</th><th>Estado</th>' + (abrir ? '<th></th>' : '') + '</tr></thead><tbody>' +
    saEst.map((e, i)=>'<tr><td><b>' + esc(e.nombre || '') + '</b><br><span class="aud-ref">Doc. ' + esc(e.documento) + '</span></td><td>' + esc(e.programa || '—') + '<br><span class="aud-ref">' + esc([e.sede, e.semestre].filter(Boolean).join(' · ')) + '</span></td><td>' + esc(e.modalidad || '—') + '</td><td><span class="aud-ref">' + esc(e.telefono || '—') + '<br>' + esc(e.correo || '—') + '</span></td><td>' + (e.inhabilitado ? 'Inhabilitado' : 'Activo') + '</td>' + (abrir ? '<td><button class="ghost" onclick="saAbrirEst(' + i + ')">Abrir</button></td>' : '') + '</tr>').join('') + '</tbody></table></div>';
}
function saAbrirEst(i){ const e = saEst[i]; if(!e) return; document.getElementById('lookupDoc').value = e.documento; doLookup(); }
function saEstudiantesExcel(){ saExcel('estudiantes', saEst.map(e=>({ Documento:e.documento, Nombre:e.nombre, Programa:e.programa, Sede:e.sede, Semestre:e.semestre, Modalidad:e.modalidad, Correo:e.correo, Teléfono:e.telefono, Estado:e.inhabilitado ? 'Inhabilitado' : 'Activo' }))); }

/* ---------- Enganche: se pintan al cargar la pantalla del supervisor; se esconden con otros roles ---------- */
(function(){
  if(typeof svCargar === 'function'){
    const _c = svCargar;
    svCargar = async function(){ saTarjeta.cargado = false; const r = await _c.apply(this, arguments); try{ saRender(); }catch(e){ console.error(e); } return r; };
  }
  if(typeof goRole === 'function'){
    const _go = goRole;
    goRole = function(role){
      const r = _go.apply(this, arguments);
      if(role !== 'supervisor') ['saAsignarCard', 'saReporteCard', 'saEmpresasCard', 'saEstudiantesCard'].forEach(saOculta);
      return r;
    };
  }
})();

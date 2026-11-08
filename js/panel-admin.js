/* ============================= PANEL DEL ADMINISTRADOR POR ÁREAS =============================
   El panel principal muestra las funciones como TARJETAS agrupadas por lo que se quiere hacer (Estudiantes, Empresas, Supervisión,
   Configurar la práctica, Personas y seguridad, Comunicación), con buscador. Un solo clic abre la función.
   No cambia ninguna función: solo organiza los accesos. Se carga al final de administrador.html. */
(function(){
  const run = (fn)=>()=>{ try{ fn(); }catch(e){ console.error(e); toast('No se pudo abrir esta opción: ' + e.message, true); } };
  const caTab = (t)=>()=>{ caAdmTab = t; return caAdmPintar(); };

  // Las funciones están agrupadas por lo que la persona quiere HACER y, en Estudiantes, en el orden real del proceso (paso 1, 2, 3…).
  const GRUPOS = [
    { id:'estudiantes', icono:'🎓', clase:'estudiante', titulo:'Estudiantes',
      desc:'El camino del estudiante, en orden: primero su acceso, luego su solicitud de práctica y después su seguimiento.',
      funciones:[
        { icono:'📨', clase:'estudiante', paso:1, titulo:'Solicitudes de acceso', mod:'est_registrados', desc:'Aprueba quién puede ingresar. Al aprobar, el estudiante recibe su usuario y contraseña por correo.', abrir:()=>abrirSolicitudes() },
        { icono:'📂', clase:'estudiante', paso:2, titulo:'Solicitudes de práctica', mod:'est_registrados', desc:'Revisa la modalidad, los datos y los documentos en PDF; aprueba, devuelve o rechaza.', abrir:()=>abrirSolicitudesPractica() },
        { icono:'🩺', clase:'estudiante', titulo:'Inasistencias reportadas', mod:'est_registrados', desc:'Revisa las inasistencias que reportan estudiantes y empresas, con sus incapacidades en PDF; márcalas justificadas o no.', abrir:()=>abrirInasistencias() },
        { icono:'🎓', clase:'estudiante', paso:3, titulo:'Estudiantes registrados', mod:'est_registrados', desc:'Consulta a cada estudiante, su planilla, sus notas y su estado. También puedes crear o inhabilitar.', abrir:()=>goRole('administrador') },
        { icono:'🤝', clase:'empresa', paso:4, titulo:'Contrato de aprendizaje', mod:'est_contrato', desc:'Verifica pagos, declara aptos, sigue los procesos y confirma contrataciones.', abrir:()=>caAbrirAdmin() },
        { icono:'⇅', clase:'administrador', titulo:'Importar / exportar estudiantes', mod:'est_importexport', desc:'Sube estudiantes desde Excel y descarga listados en Excel o PDF.', abrir:()=>abrirImportExport() }
      ] },
    { id:'empresas', icono:'🏢', clase:'empresa', titulo:'Empresas',
      desc:'Dónde hacen la práctica: empresas, cupos disponibles y solicitudes de aprendices.',
      funciones:[
        { icono:'✅', clase:'empresa', titulo:'Empresas por confirmar', mod:'est_registrados', desc:'Lugares que consiguieron los estudiantes de RLP y RAP: cuando el supervisor los declara aptos, crea el usuario y contraseña de la empresa. También los casos en coordinación.', abrir:()=>abrirEmpresasConfirmar() },
        { icono:'📋', clase:'empresa', titulo:'Empresas de RLP y RAP', mod:'est_registrados', desc:'Consulta todas las empresas que consiguieron los estudiantes de RLP y RAP: contacto, estudiante, supervisor y concepto de la visita. Exporta a Excel o PDF.', abrir:()=>abrirEmpresasRlpRap() },
        { icono:'🔄', clase:'empresa', titulo:'Cambios de empresa', mod:['est_registrados','sup_asignar'], desc:'Solicitudes de los estudiantes para cambiar de empresa (todas las modalidades): opina, aprueba o rechaza.', abrir:()=>abrirCambiosEmpresa() },
        { icono:'🏢', clase:'empresa', titulo:'Empresas y cupos', mod:'emp_cupos', desc:'Administra los datos de cada empresa, sus cupos por programa y jornada, y su usuario de acceso.', abrir:()=>goAdminModule('empresas') },
        { icono:'🤝', clase:'empresa', titulo:'Empresas de contrato de aprendizaje', mod:'emp_ca', desc:'Aprueba empresas (plataforma SENA), crea sus accesos y enlázalas con Empresas.', abrir:caTab('emp') },
        { icono:'📝', clase:'empresa', titulo:'Solicitudes de aprendices', mod:'emp_solicitudes', desc:'Revisa lo que pide cada empresa y apruébalo, ciérralo o elimínalo.', abrir:caTab('ofe') },
        { icono:'⇅', clase:'administrador', titulo:'Importar / exportar empresas', mod:'emp_importexport', desc:'Carga masiva desde Excel, con cupos y empresas de contrato de aprendizaje.', abrir:()=>abrirImportExport() }
      ] },
    { id:'supervisores', icono:'👤', clase:'supervisor', titulo:'Supervisión',
      desc:'Quienes acompañan la práctica y el registro de sus visitas.',
      funciones:[
        { icono:'🧭', clase:'supervisor', paso:1, titulo:'Visitas por asignar', mod:'sup_asignar', desc:'Estudiantes de RAP y RLP aprobados que esperan supervisor. Asigna cada visita; el estudiante queda bloqueado para los demás.', abrir:()=>abrirVisitasAsignar() },
        { icono:'S', clase:'supervisor', titulo:'Usuarios de supervisores', mod:'sup_usuarios', desc:'Crea y administra los accesos de los supervisores institucionales.', abrir:()=>goAdminModule('supervisor') },
        { icono:'📋', clase:'empresa', titulo:'Reporte de visitas', mod:'sup_reporte', desc:'Consulta una fila por visita: supervisor, fecha, estudiante, modalidad, empresa y jefe inmediato.', abrir:()=>goAdminModule('reporte') },
        { icono:'⇅', clase:'administrador', titulo:'Importar / exportar supervisores', mod:'sup_importexport', desc:'Crea supervisores desde Excel y descarga el listado.', abrir:()=>abrirImportExport() }
      ] },
    { id:'practica', icono:'🗂', clase:'supervisor', titulo:'Configurar la práctica',
      desc:'Lo que define cómo funciona la práctica: programas, modalidades, documentos que se piden y forma de calificar.',
      funciones:[
        { icono:'📚', clase:'supervisor', titulo:'Programas', mod:'adm_programas', desc:'Crea y elimina los programas o técnicos laborales de cada área.', abrir:()=>goAdminModule('programas') },
        { icono:'🗂', clase:'supervisor', titulo:'Modalidades', mod:'adm_modalidades', desc:'Agrega o cambia las modalidades y define cuántos meses dura cada una.', abrir:()=>abrirModalidades() },
        { icono:'📑', clase:'supervisor', titulo:'Documentos por modalidad', mod:'adm_modalidades', desc:'Define qué PDF debe subir el estudiante en cada modalidad, si es obligatorio y su peso máximo.', abrir:()=>abrirDocsModalidad() },
        { icono:'📊', clase:'empresa', titulo:'Rúbrica de calificación', mod:'adm_rubrica', desc:'Crea, ordena o modifica los criterios y niveles con que se califica al estudiante.', abrir:()=>abrirRubricas() }
      ] },
    { id:'seguridad', icono:'🔐', clase:'administrador', titulo:'Personas y seguridad',
      desc:'Quién puede entrar, qué puede hacer cada rol y el registro de lo que ocurre en el sistema.',
      funciones:[
        { icono:'Ad', clase:'administrador', titulo:'Personal y roles', mod:'solo_admin', desc:'Crea al personal (administradores, coordinadores, asistentes) y asígnale su rol.', abrir:()=>goAdminModule('administradores') },
        { icono:'🔑', clase:'administrador', titulo:'Roles y permisos', mod:'solo_admin', desc:'Activa o desactiva las funciones que puede usar cada rol.', abrir:()=>abrirPermisos() },
        { icono:'🛡', clase:'administrador', titulo:'Auditoría del sistema', mod:'solo_admin', desc:'Mira quién creó, cambió, eliminó o ingresó información: fecha, hora, usuario y actividad.', abrir:()=>abrirAuditoria() }
      ] },
    { id:'comunicacion', icono:'✉️', clase:'empresa', titulo:'Comunicación',
      desc:'Los correos que envía la plataforma.',
      funciones:[
        { icono:'✉️', clase:'empresa', titulo:'Correos automáticos', mod:'solo_admin', desc:'Configura avisos y recordatorios, envía claves y consulta la bitácora de lo enviado.', abrir:()=>abrirCorreos() }
      ] }
  ];

  function pantalla(id, html){
    let el = document.getElementById(id);
    if(!el){ const hub = document.getElementById('screen-admin-hub'); if(!hub) return null;
      el = document.createElement('div'); el.className = 'screen'; el.id = id; hub.parentNode.appendChild(el); }
    el.innerHTML = html; return el;
  }

  /* Recuerda la última función abierta (solo qué opción, nada sensible) para volver a ella si la página se recarga */
  const RUTA_KEY = 'cai_admin_ruta_v1', RUTA_MAX_MS = 12 * 3600 * 1000;
  let rutaPendiente = null;
  try{ const r = JSON.parse(sessionStorage.getItem(RUTA_KEY) || 'null'); if(r && r.gid != null && Date.now() - r.t < RUTA_MAX_MS) rutaPendiente = r; }catch(_){}
  function rutaGuardar(gid, i){ try{ sessionStorage.setItem(RUTA_KEY, JSON.stringify({ gid, i, t:Date.now() })); }catch(_){} }
  window.pgRutaOlvidar = function(){ rutaPendiente = null; try{ sessionStorage.removeItem(RUTA_KEY); }catch(_){} };
  window.pgAbrirFuncion = function(gid, i){
    const g = GRUPOS.find(x=>x.id===gid); if(!g || !g.funciones[i]) return;
    rutaGuardar(gid, i);
    run(g.funciones[i].abrir)();
  };

  function construirHub(){
    const hub = document.getElementById('screen-admin-hub'); if(!hub) return;
    const grid = hub.querySelector('.role-grid'); if(!grid) return;
    const help = hub.querySelector('.helptext'); if(help) help.textContent = 'Elige la función que necesitas. Están agrupadas por lo que quieres hacer; en Estudiantes siguen el orden del proceso.';
    const nuevo = document.createElement('div'); nuevo.className = 'fn-hub'; nuevo.id = 'grupoGrid';
    grid.replaceWith(nuevo);
    pgPintar();
  }
  let pgBusca = '';
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  window.pgFiltrar = function(v){
    pgBusca = norm(v).trim();
    let total = 0;
    document.querySelectorAll('#grupoGrid .fn-seccion').forEach(sec=>{
      let n = 0;
      sec.querySelectorAll('.fn-card').forEach(c=>{
        const ok = !pgBusca || norm(c.getAttribute('data-texto')).includes(pgBusca);
        c.style.display = ok ? '' : 'none'; if(ok) n++;
      });
      sec.style.display = n ? '' : 'none'; total += n;
    });
    const v0 = document.getElementById('fnVacio'); if(v0) v0.style.display = total ? 'none' : '';
  };
  // Pinta las funciones como tarjetas, SOLO las que el rol de la persona tiene habilitadas
  function pgPintar(){
    const grid = document.getElementById('grupoGrid'); if(!grid) return;
    const hay = typeof puede === 'function' && typeof permAdmin !== 'undefined';
    if(hay && !permAdmin.listo){ grid.innerHTML = '<p class="helptext">Cargando tus permisos…</p>'; return; }
    const ok = f => hay ? (Array.isArray(f.mod) ? puedeAlguno(f.mod) : puede(f.mod)) : true;
    const visibles = GRUPOS.map(g=>({ g, fs: g.funciones.map((f,i)=>[f,i]).filter(([f])=>ok(f)) })).filter(x=>x.fs.length);
    const h2 = document.querySelector('#screen-admin-hub h2');
    if(h2 && hay && permAdmin.rol){
      h2.innerHTML = 'Panel de administración <span class="rol-chip">' + (ROL_NOMBRES[permAdmin.rol] || '') + '</span>';
    }
    if(!visibles.length){ grid.innerHTML = '<div class="note-box">Tu rol no tiene funciones habilitadas por ahora. Pídele al administrador que te habilite las que necesites.</div>'; return; }
    const e = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    grid.innerHTML = `<div class="fn-buscar"><input type="search" id="fnBuscar" placeholder="🔍  Buscar una función… (ej. correo, documentos, empresa)" autocomplete="off" aria-label="Buscar una función" value="${e(pgBusca)}" oninput="pgFiltrar(this.value)"></div>` +
      visibles.map(({g,fs})=>`<section class="fn-seccion ${g.clase}" id="grupoSec-${g.id}">
        <div class="fn-sec-cab"><span class="fn-sec-ico">${g.icono}</span><div><h3>${g.titulo}</h3><p>${g.desc}</p></div></div>
        <div class="fn-grid" id="grupoCards-${g.id}">${fs.map(([f,i])=>`<button type="button" class="fn-card ${f.clase}" data-fn="${e(f.titulo)}" data-texto="${e(f.titulo + ' ' + f.desc + ' ' + g.titulo)}" onclick="pgAbrirFuncion('${g.id}',${i})">
            <span class="fn-ico">${f.icono}</span>
            <span class="fn-txt"><span class="fn-tit">${f.paso ? `<span class="fn-paso">Paso ${f.paso}</span>` : ''}${f.titulo}<span class="fn-badge"></span></span><span class="fn-desc">${f.desc}</span></span>
            <span class="fn-go" aria-hidden="true">›</span></button>`).join('')}</div></section>`).join('') +
      '<div class="note-box" id="fnVacio" style="display:none;">Ninguna función coincide con tu búsqueda.</div>';
    if(pgBusca) pgFiltrar(pgBusca);
  }
  construirHub();
  // Cada vez que se muestra el panel: se cargan los permisos del rol, se pintan las funciones y se revisa si el servidor permite el reinicio
  const _showScreen = showScreen;
  showScreen = function(id){
    _showScreen(id);
    if(id === 'screen-home' || id === 'screen-admin-login') window.pgRutaOlvidar();
    if(id !== 'screen-admin-hub') return;
    const volver = rutaPendiente; rutaPendiente = null;   // solo la primera vez tras una recarga
    if(!volver) { try{ sessionStorage.removeItem(RUTA_KEY); }catch(_){} }   // el administrador volvió al panel a propósito
    pgPintar();
    const listo = (typeof cargarPermisos === 'function') ? cargarPermisos() : Promise.resolve();
    Promise.resolve(listo).then(()=>{ pgPintar();
      if(volver){ try{ const g = GRUPOS.find(x=>x.id===volver.gid); const f = g && g.funciones[volver.i];
        if(f && (typeof puede !== 'function' || !f.mod || (Array.isArray(f.mod) ? puedeAlguno(f.mod) : puede(f.mod)))) { window.pgAbrirFuncion(volver.gid, volver.i); return; } }catch(e){ console.error('Volver a la opción:', e); } }
      if(window.rpMostrarTarjeta && (typeof puede !== 'function' || puede('solo_admin'))) window.rpMostrarTarjeta(); });
  };
})();

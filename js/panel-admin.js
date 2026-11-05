/* ============================= PANEL DEL ADMINISTRADOR POR ÁREAS =============================
   El panel principal muestra 4 tarjetas grandes (Estudiantes, Empresas, Supervisores, Administración).
   Cada función de la tarjeta es un enlace directo: un solo clic la abre (no hay pantalla intermedia).
   No cambia ninguna función: solo organiza los accesos. Se carga al final de administrador.html. */
(function(){
  const run = (fn)=>()=>{ try{ fn(); }catch(e){ console.error(e); toast('No se pudo abrir esta opción: ' + e.message, true); } };
  const caTab = (t)=>()=>{ caAdmTab = t; return caAdmPintar(); };

  const GRUPOS = [
    { id:'estudiantes', icono:'🎓', clase:'estudiante', titulo:'Estudiantes',
      desc:'Todo lo relacionado con los estudiantes y su proceso de práctica o contratación.',
      funciones:[
        { icono:'🎓', clase:'estudiante', titulo:'Estudiantes registrados', mod:'est_registrados', desc:'Ver, crear y gestionar a cada estudiante y el estado de su planilla.', abrir:()=>goRole('administrador') },
        { icono:'🤝', clase:'empresa', titulo:'Contrato de aprendizaje', mod:'est_contrato', desc:'Verificar pagos, declarar aptos, seguir los procesos y confirmar contrataciones.', abrir:()=>caAbrirAdmin() },
        { icono:'⇅', clase:'administrador', titulo:'Importar / exportar estudiantes', mod:'est_importexport', desc:'Subir estudiantes desde Excel y descargar listados en Excel o PDF.', abrir:()=>abrirImportExport() }
      ] },
    { id:'empresas', icono:'🏢', clase:'empresa', titulo:'Empresas',
      desc:'Empresas de práctica y de contrato de aprendizaje, cupos y solicitudes.',
      funciones:[
        { icono:'🏢', clase:'empresa', titulo:'Empresas y cupos', mod:'emp_cupos', desc:'Datos de la empresa, cupos por programa y jornada, asignaciones y usuario de acceso.', abrir:()=>goAdminModule('empresas') },
        { icono:'🤝', clase:'empresa', titulo:'Empresas de contrato de aprendizaje', mod:'emp_ca', desc:'Aprobar empresas (plataforma SENA), crear accesos y enlazarlas con Empresas.', abrir:caTab('emp') },
        { icono:'📝', clase:'empresa', titulo:'Solicitudes de aprendices', mod:'emp_solicitudes', desc:'Revisar las funciones de cada solicitud y aprobarla, cerrarla o eliminarla.', abrir:caTab('ofe') },
        { icono:'⇅', clase:'administrador', titulo:'Importar / exportar empresas', mod:'emp_importexport', desc:'Carga masiva desde Excel, con cupos y empresas de contrato de aprendizaje.', abrir:()=>abrirImportExport() }
      ] },
    { id:'supervisores', icono:'👤', clase:'supervisor', titulo:'Supervisores',
      desc:'Usuarios de los supervisores institucionales y el reporte de sus visitas.',
      funciones:[
        { icono:'S', clase:'supervisor', titulo:'Usuarios de supervisores', mod:'sup_usuarios', desc:'Crear y administrar los accesos de los supervisores institucionales.', abrir:()=>goAdminModule('supervisor') },
        { icono:'📋', clase:'empresa', titulo:'Reporte de visitas', mod:'sup_reporte', desc:'Una fila por visita: supervisor, fecha, estudiante, modalidad, empresa y jefe inmediato.', abrir:()=>goAdminModule('reporte') },
        { icono:'⇅', clase:'administrador', titulo:'Importar / exportar supervisores', mod:'sup_importexport', desc:'Crear supervisores desde Excel y descargar el listado.', abrir:()=>abrirImportExport() }
      ] },
    { id:'administracion', icono:'⚙️', clase:'administrador', titulo:'Administración',
      desc:'Administradores del sistema, programas de formación y modalidades.',
      funciones:[
        { icono:'Ad', clase:'administrador', titulo:'Personal y roles', mod:'solo_admin', desc:'Crear al personal (administradores, coordinadores y asistentes) y asignarle su rol.', abrir:()=>goAdminModule('administradores') },
        { icono:'🔑', clase:'administrador', titulo:'Roles y permisos', mod:'solo_admin', desc:'Habilitar o inhabilitar las funciones de cada rol.', abrir:()=>abrirPermisos() },
        { icono:'🛡', clase:'administrador', titulo:'Auditoría del sistema', mod:'solo_admin', desc:'Reporte de quién creó, modificó, eliminó o ingresó información: fecha, hora, usuario y actividad.', abrir:()=>abrirAuditoria() },
        { icono:'✉️', clase:'empresa', titulo:'Correos automáticos', mod:'solo_admin', desc:'Avisos y recordatorios por correo, envío de claves, y bitácora de lo enviado.', abrir:()=>abrirCorreos() },
        { icono:'📚', clase:'supervisor', titulo:'Programas', mod:'adm_programas', desc:'Crear, ver y eliminar los programas / técnicos laborales por área.', abrir:()=>goAdminModule('programas') },
        { icono:'🗂', clase:'supervisor', titulo:'Modalidades', mod:'adm_modalidades', desc:'Agregar, modificar o eliminar modalidades y definir cuántos meses dura cada una.', abrir:()=>abrirModalidades() },
        { icono:'📊', clase:'empresa', titulo:'Rúbrica de calificación', mod:'adm_rubrica', desc:'Crear, modificar, ordenar o eliminar los criterios y niveles con que se califica al estudiante.', abrir:()=>abrirRubricas() }
      ] }
  ];

  function pantalla(id, html){
    let el = document.getElementById(id);
    if(!el){ const hub = document.getElementById('screen-admin-hub'); if(!hub) return null;
      el = document.createElement('div'); el.className = 'screen'; el.id = id; hub.parentNode.appendChild(el); }
    el.innerHTML = html; return el;
  }

  window.pgAbrirFuncion = function(gid, i){
    const g = GRUPOS.find(x=>x.id===gid); if(!g || !g.funciones[i]) return;
    run(g.funciones[i].abrir)();
  };

  function construirHub(){
    const hub = document.getElementById('screen-admin-hub'); if(!hub) return;
    const grid = hub.querySelector('.role-grid'); if(!grid) return;
    const help = hub.querySelector('.helptext'); if(help) help.textContent = 'Elige la función que necesitas.';
    const nuevo = document.createElement('div'); nuevo.className = 'grupo-grid'; nuevo.id = 'grupoGrid';
    grid.replaceWith(nuevo);
    pgPintar();
  }
  // Pinta las tarjetas con SOLO las funciones que el rol de la persona tiene habilitadas
  function pgPintar(){
    const grid = document.getElementById('grupoGrid'); if(!grid) return;
    const hay = typeof puede === 'function' && typeof permAdmin !== 'undefined';
    if(hay && !permAdmin.listo){ grid.innerHTML = '<p class="helptext">Cargando tus permisos…</p>'; return; }
    const ok = f => hay ? puede(f.mod) : true;
    const visibles = GRUPOS.map(g=>({ g, fs: g.funciones.map((f,i)=>[f,i]).filter(([f])=>ok(f)) })).filter(x=>x.fs.length);
    const h2 = document.querySelector('#screen-admin-hub h2');
    if(h2 && hay && permAdmin.rol){
      h2.innerHTML = 'Panel de administración <span class="rol-chip">' + (ROL_NOMBRES[permAdmin.rol] || '') + '</span>';
    }
    if(!visibles.length){ grid.innerHTML = '<div class="note-box">Tu rol no tiene funciones habilitadas por ahora. Pídele al administrador que te habilite las que necesites.</div>'; return; }
    grid.innerHTML = visibles.map(({g,fs})=>`<div class="grupo-card ${g.clase}">
        <div class="grupo-head"><span class="grupo-ico">${g.icono}</span><div><h3>${g.titulo}</h3><p>${g.desc}</p></div></div>
        <div class="grupo-chips" id="grupoChips-${g.id}">${fs.map(([f,i])=>`<button type="button" class="grupo-chip" title="Abrir ${f.titulo}" onclick="pgAbrirFuncion('${g.id}',${i})">${f.titulo}</button>`).join('')}</div></div>`).join('');
  }
  construirHub();
  // Cada vez que se muestra el panel: se cargan los permisos del rol, se pintan las funciones y se revisa si el servidor permite el reinicio
  const _showScreen = showScreen;
  showScreen = function(id){
    _showScreen(id);
    if(id !== 'screen-admin-hub') return;
    pgPintar();
    const listo = (typeof cargarPermisos === 'function') ? cargarPermisos() : Promise.resolve();
    Promise.resolve(listo).then(()=>{ pgPintar(); if(window.rpMostrarTarjeta && (typeof puede !== 'function' || puede('solo_admin'))) window.rpMostrarTarjeta(); });
  };
})();

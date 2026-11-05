/* ============================= CREAR ESTUDIANTE (administrador) =============================
   Reemplaza el cuadro "Número de documento + Buscar" de la pantalla de estudiantes del administrador.
   - Para CONSULTAR un estudiante: se usa el buscador de la lista (nombre, documento, programa, empresa) o se hace clic en su fila.
   - Para CREAR un estudiante: botón "Crear estudiante" → formulario → se guarda y se abre su ficha.
   Seguridad: solo funciona con rol administrador; el INSERT pasa por la política RLS is_admin() de Supabase
   (si alguien sin permiso lo intentara, la base de datos lo rechaza). Las entradas se validan y se limpian aquí. */

(function(){
  const _goRole = goRole;
  goRole = function(role){
    _goRole(role);
    if(role === 'administrador') ceAdaptarPantalla();
  };
})();

function ceEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// Cambia la tarjeta de búsqueda por la de creación (solo para el administrador)
function ceAdaptarPantalla(){
  const t = document.getElementById('lookupTitle'), h = document.getElementById('lookupHelp');
  if(t) t.textContent = 'Estudiantes';
  if(h) h.textContent = 'Busca en la lista (por nombre, documento, programa o empresa) y haz clic en el estudiante para abrir su ficha. Para registrar uno nuevo, usa «Crear estudiante».';
  const doc = document.getElementById('lookupDoc');
  const card = doc ? doc.closest('.card') : null;
  if(!card) return;
  card.id = 'lookupCardAdmin';
  card.innerHTML =
    '<div class="ce-barra">' +
      '<div><b>¿El estudiante todavía no está registrado?</b><div class="helptext" style="margin:2px 0 0;">Créalo manualmente con sus datos básicos; después podrás completar el resto en su ficha.</div></div>' +
      '<button class="primary" type="button" onclick="ceAbrirFormulario()">➕ Crear estudiante</button>' +
    '</div>' +
    '<div id="ceFormulario" style="display:none;"></div>' +
    // Se conservan estos elementos (ocultos) porque otras funciones los leen
    '<div style="display:none"><input type="text" id="lookupDoc"><div id="lookupMsg"></div></div>';
}

async function ceAbrirFormulario(){
  if(state.role !== 'administrador'){ toast('Solo el administrador puede crear estudiantes', true); return; }
  const box = document.getElementById('ceFormulario');
  if(!box) return;
  try{ await loadProgramas(); }catch(e){ console.warn(e); }
  const p = 'ce';
  box.style.display = 'block';
  box.innerHTML =
    '<div class="section-bar" style="margin-top:14px;">Crear estudiante</div>' +
    '<div class="field-row">' +
      '<div class="field"><label>Número de documento *</label><input id="ce-documento" inputmode="numeric" maxlength="15" placeholder="Ej. 1128108664" autocomplete="off"></div>' +
      '<div class="field"><label>Apellidos *</label><input id="ce-apellidos" maxlength="80" placeholder="Ej. Pérez Gómez" autocomplete="off" oninput="updateNombrePreview(\'ce\')"></div>' +
      '<div class="field"><label>Nombres *</label><input id="ce-nombres" maxlength="80" placeholder="Ej. Ana María" autocomplete="off" oninput="updateNombrePreview(\'ce\')"></div>' +
      '<div class="field"><label>Nombre completo</label><input id="ce-nombre-preview" readonly tabindex="-1" placeholder="Se arma solo con apellidos y nombres"></div>' +
      '<div class="field"><label>Correo</label><input id="ce-correo" type="email" maxlength="120" autocomplete="off"></div>' +
      '<div class="field"><label>Teléfono</label><input id="ce-telefono" inputmode="tel" maxlength="20" autocomplete="off"></div>' +
      renderAreaProgramaSelects(p, '') +
      '<div class="field"><label>Modalidad</label><select id="ce-modalidad"><option value="">Selecciona una modalidad…</option>' +
        MODALIDADES.map(m=>'<option value="'+ceEsc(m.nombre)+'">'+ceEsc(m.nombre)+' ('+(m.meses===1?'1 nota':m.meses+' meses')+')</option>').join('') +
      '</select></div>' +
      '<div class="field"><label>Sede</label><input id="ce-sede" maxlength="80"></div>' +
      '<div class="field"><label>Semestre</label><input id="ce-semestre" maxlength="20"></div>' +
      '<div class="field"><label>Periodo académico</label><input id="ce-periodo" maxlength="30" placeholder="Ej. 2026-2"></div>' +
      '<div class="field"><label>Jornada en que solicita el cupo</label><select id="ce-jornada"><option value="">Sin definir…</option>' +
        JORNADAS.map(j=>'<option value="'+ceEsc(j)+'">'+ceEsc(j)+'</option>').join('') +
      '</select></div>' +
    '</div>' +
    '<div id="ceMsg" style="margin:8px 0;font-size:13.5px;"></div>' +
    '<div class="actions-row" style="justify-content:flex-start;">' +
      '<button class="primary" type="button" id="ceBtnGuardar" onclick="ceCrearEstudiante()">Guardar y abrir ficha</button>' +
      '<button class="ghost" type="button" onclick="ceCerrarFormulario()">Cancelar</button>' +
    '</div>';
  const d = document.getElementById('ce-documento'); if(d) d.focus();
}
function ceCerrarFormulario(){
  const box = document.getElementById('ceFormulario');
  if(box){ box.style.display = 'none'; box.innerHTML = ''; }
}
function ceMensaje(html, esError){
  const m = document.getElementById('ceMsg');
  if(m) m.innerHTML = '<span style="color:'+(esError?'var(--danger)':'var(--teal-dark)')+'">'+html+'</span>';
}

async function ceCrearEstudiante(){
  if(state.role !== 'administrador'){ toast('Solo el administrador puede crear estudiantes', true); return; }
  if(!requireSupabase()){ ceMensaje('No hay conexión con la base de datos. Revisa la consola (F12).', true); return; }
  const doc = val('ce-documento').replace(/[\s.\-]/g, '');
  const apellidos = val('ce-apellidos').replace(/\s+/g, ' ');
  const nombres = val('ce-nombres').replace(/\s+/g, ' ');
  if(!/^\d{5,15}$/.test(doc)){ ceMensaje('El documento debe tener solo números (entre 5 y 15 dígitos).', true); return; }
  if(!apellidos || !nombres){ ceMensaje('Escribe los apellidos y los nombres del estudiante.', true); return; }
  const correo = val('ce-correo');
  if(correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)){ ceMensaje('El correo no tiene un formato válido.', true); return; }

  const btn = document.getElementById('ceBtnGuardar');
  if(btn) btn.disabled = true;
  ceMensaje('Verificando que no exista…', false);
  try{
    const existente = await getRecord(doc);
    if(existente){
      ceMensaje('Ya existe un estudiante con ese documento: <b>'+ceEsc(existente.nombre||'(sin nombre)')+'</b>. ' +
        '<a href="#" onclick="ceAbrirExistente(\''+ceEsc(doc)+'\');return false;">Abrir su ficha</a>', true);
      return;
    }
    const rec = emptyRecord(doc);
    rec.apellidos = apellidos; rec.nombres = nombres;
    rec.nombre = nombreCompletoDesde(apellidos, nombres);
    rec.correo = correo; rec.telefono = val('ce-telefono');
    rec.sede = val('ce-sede'); rec.semestre = val('ce-semestre');
    rec.modalidad = val('ce-modalidad'); rec.periodoAcademico = val('ce-periodo');
    rec.programa = val('ce-programa') || PROGRAMA;
    rec.jornadaSolicitada = val('ce-jornada');
    state.isNewRecord = true;
    await saveRecord(rec);                       // INSERT protegido por RLS (is_admin)
    if(state.isNewRecord){                       // sigue en true = la base de datos lo rechazó (ya se mostró el error)
      ceMensaje('No se pudo guardar el estudiante. Revisa el mensaje de error e inténtalo de nuevo.', true);
      return;
    }
    toast('Estudiante creado');
    state.documento = doc; state.record = rec; state.empMonth = 0; state.estMonth = 0;
    await renderAdministrador();
  }catch(e){
    console.error(e);
    ceMensaje('Ocurrió un error al crear el estudiante (revisa la consola).', true);
  }finally{
    if(btn) btn.disabled = false;
  }
}
async function ceAbrirExistente(doc){
  const rec = await getRecord(doc);
  if(!rec) return;
  state.isNewRecord = false; state.documento = doc; state.record = rec; state.empMonth = 0; state.estMonth = 0;
  await renderAdministrador();
}

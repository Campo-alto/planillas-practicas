/* ============================= STORAGE (Supabase) ============================= */
// 1. Crea un proyecto en https://supabase.com (con tu cuenta nueva, separada de CODICE)
// 2. Corre supabase-schema.sql en el SQL Editor del proyecto
// 3. Copia la Project URL y la anon public key desde Project Settings > API
// 4. Pégalas aquí abajo:
const SUPABASE_URL = "https://avlyhjecouqrdkirdqrh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_m2agwKHDXBUxKw0tWYLHIw_FX2R1nFo";

const sb = (function(){
  try{
    if(!window.supabase || !window.supabase.createClient){
      console.error('La librería de Supabase no cargó (revisa el script CDN o el bloqueador de anuncios).');
      return null;
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }catch(e){
    console.error('Error creando el cliente de Supabase:', e);
    return null;
  }
})();

// Cuando alguien llega desde el enlace del correo "restablecer contraseña",
// Supabase dispara este evento automáticamente — lo mandamos directo a la
// pantalla de elegir contraseña nueva, sin que tenga que iniciar sesión primero.
if(sb){
  sb.auth.onAuthStateChange((event)=>{
    if(event === 'PASSWORD_RECOVERY'){
      showScreen('screen-reset-password');
    }
  });
}
function requireSupabase(){
  if(!sb){
    toast('No hay conexión con la base de datos. Abre la consola (F12) y revisa el error.', true);
    return false;
  }
  return true;
}

function rowToRecord(row){
  return {
    documento: row.documento,
    nombre: row.nombre || '', apellidos: row.apellidos || '', nombres: row.nombres || '',
    correo: row.correo || '', telefono: row.telefono || '',
    sede: row.sede || '', semestre: row.semestre || '', modalidad: row.modalidad || '',
    periodoAcademico: row.periodo_academico || '', funcionario: row.funcionario || '',
    programa: row.programa || PROGRAMA,
    jornadaSolicitada: row.jornada_solicitada || '',
    competencias: row.competencias,
    meses: row.meses,
    revisionFunciones: row.revision_funciones,
    datosSupervision: row.datos_supervision,
    lastUpdated: row.updated_at
  };
}
function recordToRow(rec){
  return {
    documento: rec.documento,
    nombre: rec.nombre, apellidos: rec.apellidos, nombres: rec.nombres,
    correo: rec.correo, telefono: rec.telefono,
    sede: rec.sede, semestre: rec.semestre, modalidad: rec.modalidad,
    periodo_academico: rec.periodoAcademico, funcionario: rec.funcionario,
    programa: rec.programa,
    jornada_solicitada: rec.jornadaSolicitada || '',
    competencias: rec.competencias,
    meses: rec.meses,
    revision_funciones: rec.revisionFunciones,
    datos_supervision: rec.datosSupervision,
    updated_at: new Date().toISOString()
  };
}
// El token de sesión de Empresa/Supervisor/Estudiante vive SOLO en memoria
// (state.token): no se guarda en localStorage, así que cerrar la pestaña lo borra.
async function getRecord(doc){
  if(!requireSupabase()) return null;
  try{
    // Administrador: sesión real de Supabase Auth + política RLS is_admin()
    if(state.role === 'administrador'){
      const { data, error } = await sb.from('students').select('*').eq('documento', doc).maybeSingle();
      if(error){ console.error(error); toast('Error consultando: '+error.message, true); return null; }
      return data ? rowToRecord(data) : null;
    }
    // Estudiante: primero inicia su sesión por documento (con límite de intentos)
    if(state.role === 'estudiante' && !state.token){
      const { data: ses, error: e1 } = await sb.rpc('login_estudiante', { p_documento: doc });
      if(e1){ console.error(e1); toast(e1.message, true); return null; }
      if(!ses) return null;
      state.token = ses.token;
    }
    if(!state.token){ toast('Tu sesión venció. Inicia sesión de nuevo.', true); return null; }
    const { data, error } = await sb.rpc('get_student', { p_token: state.token, p_documento: doc });
    if(error){ console.error(error); toast(error.message, true); return null; }
    return data ? rowToRecord(data) : null;
  }catch(e){
    console.error(e); toast('No se pudo conectar (revisa la consola)', true); return null;
  }
}
async function savePart(part, data, extraDoc){
  const { error } = await sb.rpc('save_student_part', {
    p_token: state.token, p_documento: extraDoc, p_part: part, p_data: data
  });
  if(error) throw error;
}
async function saveRecord(rec){
  if(!requireSupabase()) return;
  try{
    rec.lastUpdated = new Date().toISOString();
    if(state.role === 'administrador'){
      const row = recordToRow(rec);
      let error;
      if(state.isNewRecord){
        ({ error } = await sb.from('students').insert(row));
        if(!error) state.isNewRecord = false;
      } else {
        ({ error } = await sb.from('students').update(row).eq('documento', rec.documento));
      }
      if(error){ console.error(error); toast('Error guardando: '+error.message, true); }
      return;
    }
    if(!state.token){ toast('Tu sesión venció. Inicia sesión de nuevo.', true); return; }
    // Cada rol solo puede escribir SUS partes (también lo exige la base de datos)
    if(state.role === 'empresa'){
      await savePart('competencias', rec.competencias, rec.documento);
      await savePart('meses', rec.meses, rec.documento);
    } else if(state.role === 'estudiante'){
      const idx = state.estMonth;
      await savePart('firma_mes', { idx, firma: (rec.meses[idx] || {}).firmaEstudiante || null }, rec.documento);
    } else if(state.role === 'supervisor'){
      await savePart('revision_funciones', rec.revisionFunciones, rec.documento);
      await savePart('datos_supervision', rec.datosSupervision, rec.documento);
    }
  }catch(e){
    console.error(e); toast('Error guardando: ' + (e.message || 'revisa la consola'), true);
  }
}

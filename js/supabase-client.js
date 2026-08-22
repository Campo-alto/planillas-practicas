/* ============================= STORAGE (Supabase) ============================= */
// 1. Crea un proyecto en https://supabase.com (con tu cuenta nueva, separada de CODICE)
// 2. Corre supabase-schema.sql en el SQL Editor del proyecto
// 3. Copia la Project URL y la anon public key desde Project Settings > API
// 4. Pégalas aquí abajo:
const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_ANON_KEY = "TU-ANON-KEY";

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
    nombre: row.nombre || '', correo: row.correo || '', telefono: row.telefono || '',
    sede: row.sede || '', semestre: row.semestre || '', modalidad: row.modalidad || '',
    periodoAcademico: row.periodo_academico || '', funcionario: row.funcionario || '',
    programa: row.programa || PROGRAMA,
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
    nombre: rec.nombre, correo: rec.correo, telefono: rec.telefono,
    sede: rec.sede, semestre: rec.semestre, modalidad: rec.modalidad,
    periodo_academico: rec.periodoAcademico, funcionario: rec.funcionario,
    programa: rec.programa,
    competencias: rec.competencias,
    meses: rec.meses,
    revision_funciones: rec.revisionFunciones,
    datos_supervision: rec.datosSupervision,
    updated_at: new Date().toISOString()
  };
}
async function getRecord(doc){
  if(!requireSupabase()) return null;
  try{
    const { data, error } = await sb.from('students').select('*').eq('documento', doc).maybeSingle();
    if(error){ console.error(error); toast('Error consultando Supabase: '+error.message, true); return null; }
    return data ? rowToRecord(data) : null;
  }catch(e){
    console.error(e); toast('No se pudo conectar con Supabase (revisa la consola)', true); return null;
  }
}
async function saveRecord(rec){
  if(!requireSupabase()) return;
  try{
    rec.lastUpdated = new Date().toISOString();
    const row = recordToRow(rec);
    let error;
    if(state.isNewRecord){
      // Solo pasa por aquí el Administrador, creando un estudiante que no existía.
      ({ error } = await sb.from('students').insert(row));
      if(!error) state.isNewRecord = false;
    } else {
      // Empresa/Estudiante/Supervisor siempre actualizan un estudiante que el
      // administrador ya creó — nunca insertan, así que usamos update en vez de
      // upsert (upsert exige permiso de insertar aunque termine actualizando).
      ({ error } = await sb.from('students').update(row).eq('documento', rec.documento));
    }
    if(error){ console.error(error); toast('Error guardando en Supabase: '+error.message, true); }
  }catch(e){
    console.error(e); toast('No se pudo conectar con Supabase (revisa la consola)', true);
  }
}

/* ============================= STATE ============================= */
const COMPETENCIAS = [
  {key:'ser', name:'1. Evaluación del ser', desc:'Puntualidad, presentación, habilidades sociales y trabajo en equipo'},
  {key:'desempeno', name:'2. Evaluación de desempeño', desc:'Ejecución técnica y operativa del programa'},
  {key:'producto', name:'3. Evidencia de producto', desc:'Resultados tangibles, orden y entorno seguro'},
  {key:'conocimiento', name:'4. Evaluación de conocimientos', desc:'Aplicación de normativa y confidencialidad'}
];
const PROGRAMA = 'Técnico Laboral por Competencias en Auxiliar Administrativo en Salud';
const CODIGO = 'PPS-GAA-F-006';

let state = { role: null, documento: null, record: null, empMonth: 0, estMonth: 0, pendingRole: null, isNewRecord: false, adminModuleRole: null };
const sigPads = {}; // id -> {canvas, ctx, drawing, empty}

function emptyRecord(documento){
  return {
    documento, nombre:'', correo:'', telefono:'', sede:'', semestre:'', modalidad:'', periodoAcademico:'',
    funcionario:'', fechaEnvio:'', programa: PROGRAMA,
    competencias:{ ser:Array(6).fill(null), desempeno:Array(6).fill(null), producto:Array(6).fill(null), conocimiento:Array(6).fill(null) },
    meses: Array.from({length:6}, ()=>({sitio:'', fechaInicio:'', fechaFin:'', observaciones:'', firmaEmpresa:null, firmaEstudiante:null, bloqueado:false})),
    revisionFunciones:{ fecha:'', sitio:'', area:'', jefeInmediato:'', supervisor:'', firmaJefe:null, firmaEstudiante:null, firmaSupervisor:null },
    datosSupervision:{
      fecha:'', sitio:'', area:'', jefeInmediato:'', supervisor:'',
      obsEstudiante:{p1:'', p2:'', comentarios:'', firma:null},
      obsJefe:{p1:'', p2:'', comentarios:'', firma:null},
      obsSupervisor:{comentarios:'', firma:null}
    },
    lastUpdated: null
  };
}

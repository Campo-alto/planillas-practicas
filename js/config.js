/* ============================= STATE ============================= */
const SCORE_LABELS = {5:'Excelente',4:'Bueno',3:'Aceptable',2:'Insuficiente',1:'Deficiente'};
const COMPETENCIAS = [
  {key:'ser', name:'1. Evaluación del ser', desc:'Puntualidad, presentación, habilidades sociales y trabajo en equipo'},
  {key:'desempeno', name:'2. Evaluación de desempeño', desc:'Ejecución técnica y operativa del programa'},
  {key:'producto', name:'3. Evidencia de producto', desc:'Resultados tangibles, orden y entorno seguro'},
  {key:'conocimiento', name:'4. Evaluación de conocimientos', desc:'Aplicación de normativa y confidencialidad'}
];
const PROGRAMA = 'Técnico Laboral por Competencias en Auxiliar Administrativo en Salud';
const CODIGO = 'PPS-GAA-F-006';
const VERSION_FORMATO = '8';

// Texto exacto de los 5 niveles de desempeño por criterio, tomado del formato
// oficial PPS-GAA-F-006, usado para reconstruir el PDF con el mismo formato.
const CRITERIOS_PDF = {
  ser: {
    titulo: '1. EVALUACIÓN DEL SER (Competencias Transversales y Actitudinales)',
    niveles: {
      5: 'Cumple siempre con la puntualidad (100%), presentación personal impecable y demuestra un excelente manejo de habilidades sociales, trabajo en equipo y empatía',
      4: 'Asiste regularmente, cumple con los estándares de presentación con mínimos detalles a ajustar. Muestra un buen manejo de habilidades sociales y colaboración',
      3: 'Asistencia y presentación aceptables, pero con faltas ocasionales. Manejo básico de habilidades sociales con dificultades para adaptarse a dinámicas',
      2: 'Problemas frecuentes de puntualidad y presentación personal deficiente. Dificultades significativas en habilidades sociales y comunicación',
      1: 'Asistencia deficiente, apariencia inadecuada al contexto y actitud negativa que afecta las relaciones y el trabajo en equipo'
    }
  },
  desempeno: {
    titulo: '2. EVALUACIÓN DE DESEMPEÑO (Ejecución Técnica y Operativa del Programa)',
    niveles: {
      5: 'Ejecuta las labores específicas de su programa con total destreza técnica. Opera herramientas, software o equipos de forma eficaz y profesional',
      4: 'Ejecuta las labores de forma adecuada y funcional, con pequeños detalles por mejorar en el aprovechamiento de funciones avanzadas o fluidez técnica',
      3: 'Realiza operaciones en un nivel básico, presentando limitaciones o requiriendo apoyo constante para aplicar las técnicas correctamente',
      2: 'Ejecuta tareas con dificultades significativas o errores frecuentes, omitiendo pasos metodológicos clave de su programa de formación',
      1: 'No logra realizar las tareas operativas o incumple gravemente los procedimientos técnicos y manuales, impidiendo la labor'
    }
  },
  producto: {
    titulo: '3. EVIDENCIA DE PRODUCTO (Resultados Tangibles, Orden y Entorno Seguro)',
    niveles: {
      5: 'Entrega resultados de alta calidad (documentos, registros, procesos). Mantiene su área limpia, organizada e implementa métodos de control de riesgos proactivamente',
      4: 'Entrega resultados efectivos con mínimas imprecisiones. Mantiene buen orden y aplica medidas preventivas de seguridad de forma oportuna',
      3: 'Entrega productos básicos pero con errores que dificultan el proceso. Reconoce riesgos básicos pero presenta omisiones en el orden o mantenimiento del área',
      2: 'Entrega productos incompletos. Muestra un manejo deficiente del entorno, ignorando protocolos de higiene, orden o acumulación de residuos',
      1: 'El resultado final de su trabajo es inútil o peligroso. Entorno desorganizado que pone en peligro su integridad y la del equipo'
    }
  },
  conocimiento: {
    titulo: '4. EVALUACIÓN DE CONOCIMIENTOS (Aplicación de Normativa y Confidencialidad)',
    niveles: {
      5: 'Demuestra dominio teórico aplicándolo en la práctica: Cumple estrictamente normativas (ej. salud, contable, mecánica) y maneja la información con confidencialidad impecable',
      4: 'Aplica correctamente los conocimientos y normas, con imprecisiones menores (ej. uso de terminología técnica) que no comprometen la seguridad legal',
      3: 'Muestra un conocimiento básico de la normativa, pero presenta lagunas frecuentes en su aplicación o en la protección de la información',
      2: 'Desconoce normativas clave para su ejercicio práctico, cometiendo errores de documentación, codificación o vulnerando la confidencialidad parcialmente',
      1: 'Desconoce normativas clave para su ejercicio práctico, cometiendo errores de documentación, codificación o vulnerando la confidencialidad parcialmente'
    }
  }
};

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

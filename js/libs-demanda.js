/* Rendimiento · librerías de Excel y de PDF bajo demanda.
   Antes, TODAS las páginas descargaban al abrir las librerías de Excel (xlsx) y de PDF (pdf-lib) (~1,4 MB), aunque la persona
   no exportara nada. Ahora se descargan la primera vez que se pulsa un botón que las necesita (o, en el panel del administrador,
   unos segundos después de abrir, sin estorbar). Las funciones de exportar/leer archivos se «envuelven» para esperar la descarga.
   Seguridad: solo se cargan estas dos librerías, desde los mismos dos servidores de siempre (cdnjs), con versión fija, sin enviar
   el referer ni credenciales. Debe cargarse DESPUÉS de los demás scripts de la página (va al final del HTML). */
(function(){
  if(window.__libsDemanda) return; window.__libsDemanda = true;
  const LIBS = {
    xlsx:   { url: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',  listo: ()=>typeof window.XLSX !== 'undefined' },
    pdflib: { url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js', listo: ()=>typeof window.PDFLib !== 'undefined' }
  };
  const promesas = {};
  function inyectar(k){
    return new Promise((ok, no)=>{
      const s = document.createElement('script');
      s.src = LIBS[k].url; s.async = true; s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer';
      s.onload = ()=>{ LIBS[k].listo() ? ok() : no(new Error('La librería no quedó disponible')); };
      s.onerror = ()=>{ s.remove(); no(new Error('No se pudo descargar la librería')); };
      document.head.appendChild(s);
    });
  }
  function cargar(k){
    if(!LIBS[k]) return Promise.resolve();
    if(LIBS[k].listo()) return Promise.resolve();
    if(!promesas[k]) promesas[k] = inyectar(k).catch(()=>inyectar(k)).catch(e=>{ promesas[k] = null; throw e; });   // un reintento
    return promesas[k];
  }
  window.cargarLibs = function(){ return Promise.all(Array.prototype.map.call(arguments, cargar)); };

  // Funciones que usan cada librería (todas son botones o pasos de exportar/importar)
  const USAN = {
    xlsx:   ['descargarAsignacionesXLSX', 'downloadReporteVisitasXLSX', 'generarClavesMasivas', 'ieDescargarXlsx', 'ieLeerArchivo',
             'infExcel', 'rpRespaldar', 'saExcel', 'cvLeerExcel'],
    pdflib: ['acFinalizarPantalla', 'acGenerarPdf', 'descargarCartaFechas', 'generarCartaFechasPdf', 'descargarCartaPdf', 'generarCartaPdf',
             'caConvDescargar', 'cvUnirLotes', 'cvPdfsCartas', 'cvEnviarPlanillas', 'correoEnviarCarta', 'pdfTablaDescargar', 'infPdf', 'downloadPdf']
  };
  function envolver(nombre, lib){
    const f = window[nombre];
    if(typeof f !== 'function' || f.__ld) return;
    const w = function(){
      const self = this, args = arguments;
      if(LIBS[lib].listo()) return f.apply(self, args);
      let aviso = setTimeout(()=>{ try{ if(typeof toast === 'function') toast('Preparando la descarga…'); }catch(_){} }, 700);
      return cargar(lib).then(()=>{ clearTimeout(aviso); return f.apply(self, args); }, ()=>{
        clearTimeout(aviso);
        try{ if(typeof toast === 'function') toast('No se pudo cargar el generador de ' + (lib === 'xlsx' ? 'Excel' : 'PDF') + '. Revisa tu conexión y vuelve a intentar.', true); }catch(_){}
      });
    };
    w.__ld = true;
    try{ window[nombre] = w; }catch(_){}
  }
  function envolverTodas(){ Object.keys(USAN).forEach(lib=>USAN[lib].forEach(n=>envolver(n, lib))); }
  envolverTodas();
  document.addEventListener('DOMContentLoaded', envolverTodas);
  window.addEventListener('load', ()=>{ envolverTodas(); setTimeout(envolverTodas, 3000); });   // por si otro script define o reemplaza alguna después

  // Panel del administrador: es quien más exporta; se descargan sin estorbar, unos segundos después de abrir
  window.addEventListener('load', ()=>{
    const ahorro = navigator.connection && navigator.connection.saveData;
    if(ahorro || !/administrador/i.test(location.pathname)) return;
    const ir = ()=>{ cargar('xlsx').catch(()=>{}); cargar('pdflib').catch(()=>{}); };
    if('requestIdleCallback' in window) requestIdleCallback(()=>setTimeout(ir, 4000), { timeout: 12000 }); else setTimeout(ir, 8000);
  });
})();

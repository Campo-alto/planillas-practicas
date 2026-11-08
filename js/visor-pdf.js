/* ============================= VISOR DE PDF (solo vista previa) =============================
   Muestra un PDF dentro de la página, sin botón de descarga ni menú del clic derecho. Lo usan solicitudes, inasistencias y actas. */
const SPA_PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const SPA_PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let spaPdfListo = null;
function spaCargarPdfJs(){
  if(window.pdfjsLib) return Promise.resolve();
  if(spaPdfListo) return spaPdfListo;
  spaPdfListo = new Promise((ok, mal)=>{
    const sc = document.createElement('script'); sc.src = SPA_PDFJS; sc.crossOrigin = 'anonymous';
    sc.onload = ()=>{
      try{
        // el motor del visor se carga desde un archivo local temporal para evitar bloqueos entre dominios
        const w = URL.createObjectURL(new Blob(["importScripts('" + SPA_PDFJS_WORKER + "');"], { type:'text/javascript' }));
        pdfjsLib.GlobalWorkerOptions.workerSrc = w; ok();
      }catch(e){ mal(e); }
    };
    sc.onerror = ()=>{ spaPdfListo = null; mal(new Error('No se pudo cargar el visor de PDF (¿sin internet o bloqueado?)')); };
    document.head.appendChild(sc);
  });
  return spaPdfListo;
}
function spaCerrarVisor(){
  const v = document.getElementById('spaVisor'); if(v) v.remove();
  document.removeEventListener('keydown', spaTeclaVisor);
  document.body.style.overflow = '';
}
function spaTeclaVisor(e){ if(e.key === 'Escape') spaCerrarVisor(); if((e.ctrlKey || e.metaKey) && ['s','p'].includes((e.key || '').toLowerCase())) e.preventDefault(); }
/* Visor de PDF dentro de la página (solo vista previa: sin botón de descarga ni menú del clic derecho). Lo usan solicitudes e inasistencias. */
async function spaVisorPdf(nombre, cargar){
  spaCerrarVisor();
  const v = document.createElement('div'); v.id = 'spaVisor'; v.className = 'spa-visor';
  v.innerHTML = `<div class="spa-visor-bar"><b>${esc(nombre)}</b><span class="aud-ref" id="spaVisorInfo" style="color:#cfe;">Cargando…</span>
      <button class="ghost" onclick="spaCerrarVisor()">✕ Cerrar</button></div><div class="spa-visor-cuerpo" id="spaVisorCuerpo" oncontextmenu="return false"></div>`;
  document.body.appendChild(v); document.body.style.overflow = 'hidden'; document.addEventListener('keydown', spaTeclaVisor);
  const cuerpo = document.getElementById('spaVisorCuerpo'), info = document.getElementById('spaVisorInfo');
  try{
    const [{ data, error }] = await Promise.all([cargar(), spaCargarPdfJs()]);
    if(error) throw new Error(error.message);
    const bin = atob(data.base64), bytes = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const total = Math.min(pdf.numPages, 40);
    info.textContent = (data.nombre_archivo || '') + ' · ' + total + (total === 1 ? ' página' : ' páginas') + (pdf.numPages > 40 ? ' (se muestran 40)' : '');
    cuerpo.innerHTML = '';
    const ancho = Math.min(cuerpo.clientWidth - 24, 900), dpr = Math.min(window.devicePixelRatio || 1, 2);
    for(let n = 1; n <= total; n++){
      if(!document.getElementById('spaVisor')) return;          // se cerró mientras cargaba
      const pag = await pdf.getPage(n), base = pag.getViewport({ scale: 1 }), sc = ancho / base.width, vp = pag.getViewport({ scale: sc * dpr });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; c.style.width = (vp.width / dpr) + 'px'; c.style.height = (vp.height / dpr) + 'px';
      cuerpo.appendChild(c);
      await pag.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    }
  }catch(e){ cuerpo.innerHTML = '<p style="color:#fff;padding:20px;">No se pudo mostrar el documento: ' + esc(e.message || 'error') + '</p>'; info.textContent = ''; }
}

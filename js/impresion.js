/* ============================= IMPRESIÓN INSTITUCIONAL (PDF de listados) =============================
   Todos los listados en PDF salen con: logo (escudo) de Campoalto centrado, nombre de la institución,
   título y fecha centrados, tabla centrada en la hoja y pie institucional (sitio web, teléfono, NIT, sede). */
const INST_NOMBRE = 'CAMPOALTO';

function _pdfBytes(b64){ const bin = atob(b64); const u = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }

async function pdfTablaDescargar(opt){
  // opt: { titulo, archivo, head:[...], rows:[[...]], subtitulo? }
  if(!window.PDFLib){ toast('No cargó la librería de PDF (revisa tu conexión o bloqueador).', true); return; }
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const head = opt.head, rows = opt.rows;
  const doc = await PDFDocument.create();
  const F = await doc.embedFont(StandardFonts.Helvetica), FB = await doc.embedFont(StandardFonts.HelveticaBold);
  const clean = s => String(s==null?'':s).replace(/\r?\n/g,' ').replace(/[^\x20-\x7E -ÿ]/g,'').replace(/\s+/g,' ').trim();
  const _w = new Map();
  const tw = (t,sz,f)=>{ let sum=0; for(const ch of t){ const k=(f===FB?'b':'n')+ch; let w=_w.get(k); if(w===undefined){ w=f.widthOfTextAtSize(ch,1000); _w.set(k,w);} sum+=w; } return sum*sz/1000; };

  const landscape = head.length > 6;
  const PW = landscape ? 841.89 : 595.28, PH = landscape ? 595.28 : 841.89;
  const M = 36, FS = 7.5, PADX = 4, PADY = 3.5, LH = FS*1.25;
  const DEEP = rgb(11/255,61/255,61/255), LINE = rgb(0.84,0.82,0.76), ZEBRA = rgb(0.98,0.97,0.95);

  let logo = null, pie = null;
  try{ logo = await doc.embedPng(CAMPOALTO_LOGO_PNG); }catch(e){}
  try{ if(typeof CARTA_FOOTER_B64!=='undefined') pie = await doc.embedJpg(_pdfBytes(CARTA_FOOTER_B64)); }catch(e){}

  // ---- anchos de columna: naturales, reducidos proporcionalmente si no caben; la tabla queda CENTRADA ----
  const body = rows.map(r=>r.map(clean));
  const avail = PW - M*2;
  let nat = head.map((h,i)=>{
    let w = tw(clean(h),FS,FB);
    body.slice(0,300).forEach(r=>{ w = Math.max(w, Math.min(tw(r[i]||'',FS,F), 170)); });
    return w + PADX*2 + 2;
  });
  let total = nat.reduce((a,b)=>a+b,0);
  if(total > avail){
    // las columnas cortas (documento, sede, semestre…) conservan su ancho; solo se reducen las de texto largo
    const corto = nat.map(w=>w<=95);
    const fijo = nat.reduce((a,w,i)=>a+(corto[i]?w:0),0);
    const largos = nat.reduce((a,w,i)=>a+(corto[i]?0:w),0);
    const k = Math.max(0.3, (avail-fijo)/largos);
    nat = nat.map((w,i)=>corto[i]?w:Math.max(60,w*k));
    total = nat.reduce((a,b)=>a+b,0);
    if(total > avail){ const k2 = avail/total; nat = nat.map(w=>w*k2); total = nat.reduce((a,b)=>a+b,0); }
  }
  const X0 = (PW - total)/2;

  function wrap(text, width, f){
    const out=[]; let cur='';
    String(text).split(' ').forEach(word=>{
      while(tw(word,FS,f) > width && word.length>1){ let k=word.length-1; while(k>1 && tw(word.slice(0,k),FS,f)>width) k--; if(cur){ out.push(cur); cur=''; } out.push(word.slice(0,k)); word=word.slice(k); }
      const t = cur ? cur+' '+word : word;
      if(tw(t,FS,f) <= width) cur = t; else { if(cur) out.push(cur); cur = word; }
    });
    out.push(cur); return out;
  }

  const fecha = new Date().toLocaleString('es-CO');
  const pages = [];
  function nuevaPagina(){
    const p = doc.addPage([PW,PH]); pages.push(p);
    let y = PH - 28;
    if(logo){ const lw = 84, lh = lw*logo.height/logo.width; p.drawImage(logo,{x:(PW-lw)/2, y:y-lh, width:lw, height:lh}); y -= lh + 6; }
    const centro = (t,sz,f,yy)=>{ const w=tw(t,sz,f); p.drawText(t,{x:(PW-w)/2,y:yy,size:sz,font:f,color:DEEP}); };
    centro(INST_NOMBRE, 13, FB, y-8); y -= 22;
    centro(clean(opt.titulo), 11, FB, y-6); y -= 16;
    p.drawText('',{x:0,y:0,size:1,font:F});
    const sub = clean(opt.subtitulo || ('Generado el '+fecha+' - '+rows.length+' registro(s)'));
    const w = tw(sub,8,F); p.drawText(sub,{x:(PW-w)/2,y:y-6,size:8,font:F,color:rgb(0.4,0.4,0.4)}); y -= 20;
    // pie institucional centrado
    if(pie){ const fw = Math.min(380, PW-2*M), fh = fw*pie.height/pie.width; p.drawImage(pie,{x:(PW-fw)/2, y:14, width:fw, height:fh}); }
    return { p, y, minY: 14 + (pie ? Math.min(380,PW-2*M)*pie.height/pie.width : 0) + 22 };
  }
  function encabezadoTabla(pg){
    const h = LH + PADY*2;
    pg.p.drawRectangle({x:X0, y:pg.y-h, width:total, height:h, color:DEEP});
    let x = X0;
    head.forEach((t,i)=>{ const txt = wrap(clean(t), nat[i]-PADX*2, FB)[0]; const w=tw(txt,FS,FB);
      pg.p.drawText(txt,{x:x+(nat[i]-w)/2, y:pg.y-PADY-FS, size:FS, font:FB, color:rgb(1,1,1)}); x += nat[i]; });
    pg.y -= h;
  }
  let pg = nuevaPagina(); encabezadoTabla(pg);
  body.forEach((r,ri)=>{
    const cells = r.map((t,i)=>wrap(t, nat[i]-PADX*2, F));
    const n = Math.max(...cells.map(c=>c.length)); const h = n*LH + PADY*2;
    if(pg.y - h < pg.minY){ pg = nuevaPagina(); encabezadoTabla(pg); }
    if(ri%2===1) pg.p.drawRectangle({x:X0, y:pg.y-h, width:total, height:h, color:ZEBRA});
    let x = X0;
    cells.forEach((lines,i)=>{ lines.forEach((ln,k)=>{ pg.p.drawText(ln,{x:x+PADX, y:pg.y-PADY-FS-k*LH, size:FS, font:F, color:rgb(0.1,0.1,0.1)}); }); x += nat[i]; });
    pg.p.drawLine({start:{x:X0,y:pg.y-h},end:{x:X0+total,y:pg.y-h},thickness:0.5,color:LINE});
    pg.y -= h;
  });
  // numeración centrada
  pages.forEach((p,i)=>{ const t='Página '+(i+1)+' de '+pages.length; const w=tw(t,7.5,F); p.drawText(t,{x:(PW-w)/2,y:(pie? 14+Math.min(380,PW-2*M)*pie.height/pie.width+6 : 20),size:7.5,font:F,color:rgb(0.4,0.4,0.4)}); });

  const bytes = await doc.save();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  a.download = opt.archivo + '-' + new Date().toISOString().slice(0,10) + '.pdf';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

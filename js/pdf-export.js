/* ============================= PDF EXPORT (formato versión 9) =============================
   Usa la plantilla en blanco oficial (planilla-template.js) y escribe encima los datos.
   Coordenadas en puntos, medidas desde el borde SUPERIOR de la página (carta horizontal 792x612). */
function fmtDate(d){
  if(!d) return '';
  const parts = String(d).split('-');
  if(parts.length===3) return parts[2]+'/'+parts[1]+'/'+parts[0];
  return d;
}

function _b64ToBytes(b64){
  const bin = atob(b64); const u = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) u[i] = bin.charCodeAt(i);
  return u;
}

async function downloadPdf(){
  const rec = state.record;
  if(!rec){ toast('Busca un estudiante primero', true); return; }
  if(!window.PDFLib || typeof PLANILLA_TEMPLATE_B64==='undefined'){
    toast('No se pudo cargar el generador de PDF. Revisa tu conexión y recarga la página.', true);
    return;
  }
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  try{
    const doc = await PDFDocument.load(_b64ToBytes(PLANILLA_TEMPLATE_B64));
    const F  = await doc.embedFont(StandardFonts.Helvetica);
    const FB = await doc.embedFont(StandardFonts.HelveticaBold);
    const pages = doc.getPages();
    const H = 612;
    const ink = rgb(0.05,0.05,0.05);

    const clean = s => String(s==null?'':s).replace(/\r/g,'').replace(/[^\n\x20-\x7E -ÿ]/g,'');
    // ancho SIN kerning (el PDF no lo aplica al dibujar; widthOfTextAtSize sí y subestima el ancho)
    const _cw = new Map();
    const tw = (t,sz,f)=>{ f=f||F; let sum=0;
      for(const ch of t){ const k=(f===FB?'b':'n')+ch; let w=_cw.get(k);
        if(w===undefined){ w=f.widthOfTextAtSize(ch,1000); _cw.set(k,w); } sum+=w; }
      return sum*sz/1000; };

    // texto de una línea, ajustado al ancho de la celda (reduce tamaño hasta 5pt), centrado vertical
    function cell(pi, text, x0, x1, t0, t1, opt){
      opt = opt||{};
      let t = clean(text).replace(/\n/g,' ').trim(); if(!t) return;
      const f = opt.bold ? FB : F;
      let sz = opt.size || 7.5;
      const pad = 2, avail = (x1-x0)-pad*2;
      while(sz>5 && tw(t,sz,f)>avail) sz -= 0.25;
      while(tw(t,sz,f)>avail && t.length>1) t = t.slice(0,-1);
      const w = tw(t,sz,f);
      const x = opt.align==='left' ? x0+pad : x0+((x1-x0)-w)/2;
      const yTop = t0 + ((t1-t0)-sz)/2 + sz*0.82;   // línea base
      pages[pi].drawText(t,{x, y:H-yTop, size:sz, font:f, color:ink});
    }

    // bloque de texto multilínea con ajuste de palabras; reduce el tamaño hasta que quepa
    function block(pi, text, x0, x1, t0, t1, maxSize){
      const raw = clean(text).trim(); if(!raw) return;
      const pad = 3, avail = (x1-x0)-pad*2, availH = (t1-t0)-pad*2;
      let sz = maxSize||8, lines;
      for(;;){
        lines = [];
        raw.split('\n').forEach(par=>{
          const words = par.split(/\s+/); let cur='';
          words.forEach(w=>{
            // palabra más larga que la línea: partirla
            while(tw(w,sz)>avail && w.length>1){
              let k=w.length-1; while(k>1 && tw(w.slice(0,k),sz)>avail) k--;
              if(cur){ lines.push(cur); cur=''; }
              lines.push(w.slice(0,k)); w=w.slice(k);
            }
            const test = cur ? cur+' '+w : w;
            if(tw(test,sz)<=avail) cur=test; else { if(cur) lines.push(cur); cur=w; }
          });
          lines.push(cur);
        });
        if(lines.length*sz*1.22<=availH || sz<=5) break;
        sz -= 0.25;
      }
      const lh = sz*1.22; const maxLines = Math.max(1,Math.floor(availH/lh));
      lines.slice(0,maxLines).forEach((ln,i)=>{
        pages[pi].drawText(ln,{x:x0+pad, y:H-(t0+pad+sz*0.85+i*lh), size:sz, font:F, color:ink});
      });
    }

    // etiqueta en negrita + valor (para los apartados de texto libre)
    function labeled(pi, label, value, x0, x1, t0, t1, maxSize){
      pages[pi].drawText(clean(label),{x:x0+3, y:H-(t0+3+6.5*0.85), size:6.5, font:FB, color:ink});
      block(pi, value, x0, x1, t0+8, t1, maxSize);
    }

    // firma (PNG/JPG dataURL) ajustada dentro de un recuadro conservando proporción
    async function sig(pi, dataUrl, x0, x1, t0, t1){
      if(!dataUrl || typeof dataUrl!=='string' || dataUrl.indexOf('data:image')!==0) return;
      try{
        const img = /^data:image\/jpe?g/i.test(dataUrl) ? await doc.embedJpg(dataUrl) : await doc.embedPng(dataUrl);
        const bw=(x1-x0)-6, bh=(t1-t0)-4;
        const sc = Math.min(bw/img.width, bh/img.height);
        const w=img.width*sc, h=img.height*sc;
        pages[pi].drawImage(img,{x:x0+((x1-x0)-w)/2, y:H-(t0+2+(bh-h)/2+h), width:w, height:h});
      }catch(e){ console.warn('Firma no válida', e); }
    }

    // la plantilla trae la versión 9 y el pie fijos; nada de eso se redibuja

    // ---------- tira del estudiante (páginas 2 a 4) ----------
    function strip(pi){
      cell(pi, rec.nombre,    170.3, 362.0, 92.6, 103.2, {align:'left'});
      cell(pi, rec.documento, 413.4, 557.4, 92.6, 103.2, {align:'left'});
      cell(pi, rec.telefono,  598.5, 741.0, 92.6, 103.2, {align:'left'});
    }

    // ================= PÁGINA 1: datos generales + notas =================
    cell(0, rec.periodoAcademico, 154.5, 557.4,  95.3, 106.3, {align:'left'});
    cell(0, rec.sede,             598.5, 741.0,  95.3, 106.3, {align:'left'});
    cell(0, rec.programa,         170.3, 741.0, 106.3, 116.6, {align:'left'});
    cell(0, rec.nombre,           170.3, 362.0, 116.6, 126.9, {align:'left'});
    cell(0, rec.documento,        413.4, 557.4, 116.6, 126.9, {align:'left'});
    cell(0, rec.telefono,         598.5, 741.0, 116.6, 126.9, {align:'left'});
    cell(0, rec.correo,           170.3, 362.0, 126.9, 139.0, {align:'left', size:7});
    cell(0, rec.modalidad,        413.4, 557.4, 126.9, 139.0, {align:'left'});
    cell(0, rec.semestre,         598.5, 741.0, 126.9, 139.0, {align:'left'});
    cell(0, rec.funcionario,      250.4, 477.4, 139.0, 154.8, {align:'left'});
    cell(0, fmtDate(rec.fechaEnvio)||rec.fechaEnvio, 560.0, 741.0, 139.0, 154.8, {align:'left'});

    const colsX = [570.3,598.5,627.2,655.8,684.5,713.1,741.8];
    const rowsY = [189.3,273.4,357.5,441.7,525.8];
    const orden = ['ser','desempeno','producto','conocimiento'];
    const keys = (typeof COMPETENCIAS!=='undefined' && COMPETENCIAS.length)
      ? COMPETENCIAS.map(c=>c.key) : orden;
    keys.slice(0,4).forEach((k,r)=>{
      const notas = (rec.competencias && rec.competencias[k]) || [];
      for(let c=0;c<6;c++){
        const v = notas[c]; if(!v) continue;
        cell(0, String(v), colsX[c], colsX[c+1], rowsY[r], rowsY[r+1], {size:12, bold:true});
      }
    });

    // ================= PÁGINA 2: control de cumplimiento mensual =================
    strip(1);
    for(let i=0;i<6;i++){
      const m = (rec.meses && rec.meses[i]) || {};
      const top = 124.0 + 68.66*i;
      const vt0 = top+11.4, vt1 = top+23.5;           // fila de valores
      cell(1, m.sitio,              85.8, 316.9, vt0, vt1, {align:'left'});
      cell(1, fmtDate(m.fechaInicio), 316.9, 401.3, vt0, vt1);
      cell(1, fmtDate(m.fechaFin),    401.3, 477.4, vt0, vt1);
      block(1, m.observaciones, 50.8, 477.4, top+32.5, top+65.3, 7.5);
      await sig(1, m.firmaEmpresa,    477.4, 598.5, top, top+44.4);
      await sig(1, m.firmaEstudiante, 598.5, 741.2, top, top+44.4);
    }

    // ================= PÁGINA 3: revisión de funciones y actividades =================
    strip(2);
    const rf = rec.revisionFunciones || {};
    const fp = String(rf.fecha||'').split('-');
    if(fp.length===3){
      cell(2, fp[0], 50.0, 103.5, 157.0, 175.7);
      cell(2, fp[1], 103.5, 138.7, 157.0, 175.7);
      cell(2, fp[2], 138.7, 170.3, 157.0, 175.7);
    }
    cell(2, rf.sitio,         170.3, 262.5, 147.8, 175.7, {size:7});
    cell(2, rf.area,          262.5, 401.3, 147.8, 175.7, {size:7});
    cell(2, rf.jefeInmediato, 401.3, 557.4, 147.8, 175.7, {size:7});
    cell(2, rf.supervisor,    557.4, 741.2, 147.8, 175.7, {size:7});

    const L0=50.4, L1=598.5;
    labeled(2,'MODALIDAD DE LA VISITA:', rf.modalidadVisita, L0, L1, 176.5, 200, 8);
    labeled(2,'NOMBRE DEL TUTOR DE LA PRÁCTICA:', rf.tutor, L0, L1, 200, 224, 8);
    labeled(2,'FUNCIONES ASIGNADAS AL ESTUDIANTE:', rf.funcionesAsignadas, L0, L1, 224, 318, 8);
    labeled(2,'¿EL ESTUDIANTE ACEPTA LAS FUNCIONES Y SE RELACIONAN CON SU PROGRAMA DE FORMACIÓN?  SI/NO:', rf.aceptacionFunciones, L0, L1, 318, 345, 8);
    labeled(2,'OBSERVACIONES DE MEJORA:', rf.observacionesMejora, L0, L1, 345, 435, 8);
    labeled(2,'COMPROMISOS:', rf.compromisos, L0, L1, 435, 526.1, 8);
    await sig(2, rf.firmaJefe,       598.5, 741.2, 175.7, 274);
    await sig(2, rf.firmaEstudiante, 598.5, 741.2, 284.8, 400);
    await sig(2, rf.firmaSupervisor, 598.5, 741.2, 411.5, 515);

    // ================= PÁGINA 4: datos de supervisión =================
    strip(3);
    const ds = rec.datosSupervision || {};
    const dp = String(ds.fecha||'').split('-');
    if(dp.length===3){
      cell(3, dp[0], 50.0, 103.5, 134.0, 148.2);
      cell(3, dp[1], 103.5, 138.7, 134.0, 148.2);
      cell(3, dp[2], 138.7, 170.3, 134.0, 148.2);
    }
    cell(3, ds.sitio,         170.3, 262.5, 124.0, 148.2, {size:7});
    cell(3, ds.area,          262.5, 401.3, 124.0, 148.2, {size:7});
    cell(3, ds.jefeInmediato, 401.3, 557.4, 124.0, 148.2, {size:7});
    cell(3, ds.supervisor,    557.4, 741.2, 124.0, 148.2, {size:7});

    // respuestas SI/NO: se marca con un círculo/negrita junto a la opción elegida
    function yn(v, xSi, xNo, top, wSi, wNo){
      const val = String(v||'').trim().toUpperCase();
      const x = val==='SI' || val==='SÍ' ? xSi : val==='NO' ? xNo : null;
      if(x==null) return;
      const w = x===xSi ? wSi : wNo;
      pages[3].drawEllipse({x:x+w/2, y:H-(top+4.4), xScale:w/2+2, yScale:6, borderColor:rgb(0.8,0.1,0.1), borderWidth:1});
    }
    const eo = ds.obsEstudiante||{}, jo = ds.obsJefe||{}, so = ds.obsSupervisor||{};
    yn(eo.p1, 316.4, 334.1, 166.1, 16.2, 23.6);
    yn(eo.p2, 313.4, 325.4, 183.7, 10.4, 15.0);
    yn(jo.p1, 426.4, 438.4, 284.0, 10.4, 14.9);
    yn(jo.p2, 384.5, 396.6, 301.6, 10.5, 14.9);

    block(3, eo.comentarios, 50.8, 598.5, 205, 270, 8);
    block(3, jo.comentarios, 50.8, 598.5, 323, 407.7, 8);
    block(3, so.comentarios, 50.8, 598.5, 424, 525.4, 8);
    await sig(3, eo.firma, 598.5, 741.2, 194.8, 258);
    await sig(3, jo.firma, 598.5, 741.2, 312.6, 396);
    await sig(3, so.firma, 598.5, 655.8, 415.4, 488);

    const bytes = await doc.save();
    const blob = new Blob([bytes], {type:'application/pdf'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Planilla_'+CODIGO+'_'+(rec.documento||'estudiante')+'.pdf';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast('PDF generado');
  }catch(e){
    console.error('Error generando el PDF:', e);
    toast('No se pudo generar el PDF: '+e.message+' (revisa la consola)', true);
  }
}

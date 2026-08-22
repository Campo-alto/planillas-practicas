/* ============================= PDF EXPORT ============================= */
function fmtDate(d){
  if(!d) return '';
  const parts = d.split('-');
  if(parts.length===3) return parts[2]+'/'+parts[1]+'/'+parts[0];
  return d;
}

function downloadPdf(){
  const rec = state.record;
  if(!rec){ toast('Busca un estudiante primero', true); return; }
  const { jsPDF } = window.jspdf;
  const orange = [232,121,45];
  const teal = [14,124,134];
  const deep = [11,61,61];
  const line = [120,120,120];

  // -------- helpers compartidos por todas las páginas (todas horizontales) --------
  function pageHeader(doc, pageLabel){
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 28;
    const boxRight = 130;
    const logoCellW = 95;
    doc.setDrawColor(...line); doc.setLineWidth(0.8);
    doc.rect(margin, 18, pageW-margin*2, 40);
    doc.line(margin+logoCellW, 18, margin+logoCellW, 58);
    doc.line(pageW-margin-boxRight, 18, pageW-margin-boxRight, 58);
    doc.line(pageW-margin-boxRight, 31, pageW-margin, 31);
    doc.line(pageW-margin-boxRight, 44, pageW-margin, 44);

    try{
      const logoW = 70, logoH = 28;
      doc.addImage(CAMPOALTO_LOGO_PNG, 'PNG', margin+(logoCellW-logoW)/2, 24, logoW, logoH);
    }catch(e){ /* si el logo no carga, se deja el espacio en blanco */ }

    doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(20,20,20);
    doc.text('RECOLECCIÓN DE EVIDENCIAS DE DESEMPEÑO', margin+logoCellW+(pageW-margin*2-logoCellW-boxRight)/2, 30, {align:'center'});
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    doc.text('TÉCNICO LABORAL POR COMPETENCIAS EN AUXILIAR ADMINISTRATIVO EN SALUD', margin+logoCellW+(pageW-margin*2-logoCellW-boxRight)/2, 42, {align:'center'});

    doc.setFontSize(7.5); doc.setFont('helvetica','normal');
    doc.text('VERSIÓN: '+VERSION_FORMATO, pageW-margin-boxRight+6, 27);
    doc.text('CÓDIGO: '+CODIGO, pageW-margin-boxRight+6, 40);
    doc.text('PÁGINA: '+pageLabel, pageW-margin-boxRight+6, 53);
    doc.setTextColor(0,0,0);
    return 66;
  }
  function drawInfoRow(doc, x0, y, w, h, cells){
    // cells: [{frac, label, value, valueAlign, twoLineLabel}]
    let x = x0;
    doc.setDrawColor(...line); doc.setLineWidth(0.6);
    cells.forEach(c=>{
      const cw = w * c.frac;
      doc.rect(x, y, cw, h);
      doc.setFont('helvetica','bold'); doc.setFontSize(6.6); doc.setTextColor(20,20,20);
      if(c.twoLineLabel){
        const parts = c.label.split('\n');
        doc.text(parts[0], x+cw/2, y+h/2-3, {align:'center'});
        doc.text(parts[1], x+cw/2, y+h/2+6, {align:'center'});
      } else {
        doc.text(c.label, x+4, y+h/2+2.5);
      }
      if(c.value !== undefined){
        doc.setFont('helvetica','normal'); doc.setFontSize(7.3);
        const vAlign = c.valueAlign || 'left';
        const vx = vAlign==='center' ? x+cw/2 : x+4;
        doc.text(String(c.value||''), vx, y+h/2+2.5, {align: vAlign, maxWidth: cw-8});
      }
      x += cw;
    });
    doc.setTextColor(0,0,0);
    return y+h;
  }
  function studentStrip(doc, y){
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 28;
    const w = pageW - margin*2;
    const h = 16;

    // Fila 1: Periodo académico | valor | Sede | valor
    y = drawInfoRow(doc, margin, y, w, h, [
      {frac:0.155, label:'PERIODO ACADÉMICO:'},
      {frac:0.505, value: rec.periodoAcademico||'', valueAlign:'center'},
      {frac:0.08, label:'SEDE:'},
      {frac:0.26, value: rec.sede||'', valueAlign:'left'}
    ]);
    // Fila 2: Nombre del estudiante | valor | D. Identidad | valor | Teléfonos | valor
    y = drawInfoRow(doc, margin, y, w, h, [
      {frac:0.175, label:'NOMBRE DEL ESTUDIANTE:'},
      {frac:0.325, value: rec.nombre||'', valueAlign:'center'},
      {frac:0.10, label:'D. IDENTIDAD:'},
      {frac:0.14, value: rec.documento||'', valueAlign:'center'},
      {frac:0.10, label:'TELÉFONOS:'},
      {frac:0.16, value: rec.telefono||'', valueAlign:'left'}
    ]);
    // Fila 3: Correo electrónico | valor | Modalidad | valor | Semestre | valor
    y = drawInfoRow(doc, margin, y, w, h, [
      {frac:0.155, label:'CORREO ELECTRÓNICO:'},
      {frac:0.335, value: rec.correo||'', valueAlign:'center'},
      {frac:0.10, label:'MODALIDAD:'},
      {frac:0.22, value: rec.modalidad||'', valueAlign:'center'},
      {frac:0.09, label:'SEMESTRE:'},
      {frac:0.10, value: rec.semestre||'', valueAlign:'left'}
    ]);
    // Fila 4: Nombre del funcionario | valor | Fecha de envío de las planillas | valor
    y = drawInfoRow(doc, margin, y, w, h+4, [
      {frac:0.30, label:'NOMBRE DEL FUNCIONARIO QUE REALIZA EL PROCESO'},
      {frac:0.40, value: rec.funcionario||'', valueAlign:'center'},
      {frac:0.14, label:'FECHA DE ENVIO DE LAS\nPLANILLAS', twoLineLabel:true},
      {frac:0.16, value: rec.fechaEnvio||'', valueAlign:'center'}
    ]);
    return y+8;
  }
  function sectionBar(doc, title, y, color, note){
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 28;
    doc.setFillColor(...(color||orange));
    doc.rect(margin, y, pageW-margin*2, 16, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
    doc.text(title.toUpperCase(), pageW/2, y+11, {align:'center'});
    if(note){ doc.setFontSize(6.8); doc.text(note, pageW-margin-6, y+11, {align:'right'}); }
    doc.setTextColor(0,0,0);
    return y+16;
  }
  function sigImg(doc, dataUrl, x, y, w, h){
    if(dataUrl){ try{ doc.addImage(dataUrl,'PNG', x+2, y+2, w-4, h-4); }catch(e){} }
  }
  function footer(doc){
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    const y = pageH - 26;
    doc.setDrawColor(...line); doc.setLineWidth(0.6);
    const third = (pageW-margin*2)/3;
    doc.rect(margin, y, pageW-margin*2, 20);
    doc.line(margin+third, y, margin+third, y+20);
    doc.line(margin+third*2, y, margin+third*2, y+20);
    doc.line(margin, y+10, pageW-margin, y+10);
    doc.setFont('helvetica','normal'); doc.setFontSize(6.8); doc.setTextColor(20,20,20);
    doc.text('Elaboró: Analista Planeación y Desarrollo', margin+3, y+7);
    doc.text('Revisó: Dirección Planeación y Desarrollo', margin+third+3, y+7);
    doc.text('Aprobó: Vicerrectoría Académica', margin+third*2+3, y+7);
    doc.text('Fecha: 07 octubre de 2025', margin+3, y+17);
    doc.text('Fecha: de 2025', margin+third+3, y+17);
    doc.text('Fecha: de 2025', margin+third*2+3, y+17);
    doc.setTextColor(0,0,0);
  }

  const doc = new jsPDF({unit:'pt', format:'a4', orientation:'landscape'});

  // ================= PÁGINA 1 — Competencias transversales =================
  let y = pageHeader(doc, '1 DE 4');
  y = studentStrip(doc, y);
  y = sectionBar(doc, 'Competencias transversales', y, orange, 'Califique de 1 a 5 según desempeño');

  const critRows = COMPETENCIAS.map(c=>{
    const info = CRITERIOS_PDF[c.key];
    const notas = rec.competencias[c.key].map(v=>v ? String(v) : '');
    return [info.titulo, info.niveles[5], info.niveles[4], info.niveles[3], info.niveles[2], info.niveles[1], ...notas];
  });
  doc.autoTable({
    startY: y,
    head: [['CRITERIO','Excelente (5)','Bueno (4)','Aceptable (3)','Insuficiente (2)','Deficiente (1)','NOTA 1','NOTA 2','NOTA 3','NOTA 4','NOTA 5','NOTA 6']],
    body: critRows,
    theme: 'grid',
    styles:{fontSize:6.3, cellPadding:3, valign:'middle', halign:'left', lineColor:line, lineWidth:0.5},
    headStyles:{fillColor:orange, textColor:255, fontStyle:'bold', fontSize:6.5, halign:'center'},
    columnStyles:{
      0:{cellWidth:95, fontStyle:'bold', fontSize:6.5},
      1:{cellWidth:115}, 2:{cellWidth:115}, 3:{cellWidth:115}, 4:{cellWidth:115}, 5:{cellWidth:115},
      6:{cellWidth:16, halign:'center', fontStyle:'bold'},
      7:{cellWidth:16, halign:'center', fontStyle:'bold'},
      8:{cellWidth:16, halign:'center', fontStyle:'bold'},
      9:{cellWidth:16, halign:'center', fontStyle:'bold'},
      10:{cellWidth:16, halign:'center', fontStyle:'bold'},
      11:{cellWidth:16, halign:'center', fontStyle:'bold'}
    },
    margin:{left:28, right:28},
    didParseCell: function(data){
      // Las columnas de nota (6 a 11) van en verde oscuro cuando el mes está sin
      // calificar todavía (igual que el formato original en blanco), y en blanco
      // con el número una vez la empresa puso la nota.
      if(data.section === 'body' && data.column.index >= 6){
        const hasValue = data.cell.raw !== '' && data.cell.raw != null;
        data.cell.styles.fillColor = hasValue ? [255,255,255] : deep;
        data.cell.styles.textColor = hasValue ? [20,20,20] : [255,255,255];
      }
    }
  });
  footer(doc);

  // ================= PÁGINA 2 — Control de cumplimiento =================
  doc.addPage('a4','landscape');
  y = pageHeader(doc, '2 DE 4');
  y = studentStrip(doc, y);
  y = sectionBar(doc, 'Control de cumplimiento', y, orange);

  const pageW2 = doc.internal.pageSize.getWidth();
  const margin = 28;
  const tableW = pageW2 - margin*2;
  // Columnas: MES | SITIO DE PRÁCTICAS (+valor) | FECHA INICIO | FECHA FINAL | FIRMA EMPRESA | FIRMA ESTUDIANTE
  const colMes = 55, colFechaI = 85, colFechaF = 85;
  const colFirma = (tableW - colMes - colFechaI - colFechaF) / 2 - 130; // se resta 130 para dejarle ese espacio extra a Sitio
  const colSitio = tableW - colMes - colFechaI - colFechaF - colFirma*2;
  const xMes = margin, xSitio = xMes+colMes, xFI = xSitio+colSitio, xFF = xFI+colFechaI, xFE = xFF+colFechaF, xFEst = xFE+colFirma;
  const rowLabelH = 14, rowValueH = 14, rowObsH = 38;
  const blockH = rowLabelH + rowValueH + rowObsH;

  rec.meses.forEach((m,i)=>{
    doc.setDrawColor(...line); doc.setLineWidth(0.6);
    // Contorno general del bloque
    doc.rect(xMes, y, tableW, blockH);
    // Divisiones verticales
    [xSitio, xFI, xFF, xFE, xFEst].forEach(x=> doc.line(x, y, x, y+blockH));
    // División horizontal bajo la fila de etiquetas (Sitio/Fecha inicio/Fecha final)
    doc.line(xSitio, y+rowLabelH, xFE, y+rowLabelH);
    // División horizontal bajo la fila de valores (antes de Observaciones)
    doc.line(xSitio, y+rowLabelH+rowValueH, xFE, y+rowLabelH+rowValueH);

    doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
    doc.text('MES N°.'+(i+1), xMes+colMes/2, y+blockH/2+3, {align:'center'});

    doc.setFont('helvetica','normal'); doc.setFontSize(6.8);
    doc.text('SITIO DE PRÁCTICAS', xSitio+colSitio/2, y+9.5, {align:'center'});
    doc.text('FECHA INICIO', xFI+colFechaI/2, y+9.5, {align:'center'});
    doc.text('FECHA FINAL', xFF+colFechaF/2, y+9.5, {align:'center'});

    doc.setFontSize(7.3);
    doc.text(m.sitio || '', xSitio+colSitio/2, y+rowLabelH+9.5, {align:'center'});
    doc.text(fmtDate(m.fechaInicio) || '', xFI+colFechaI/2, y+rowLabelH+9.5, {align:'center'});
    doc.text(fmtDate(m.fechaFin) || '', xFF+colFechaF/2, y+rowLabelH+9.5, {align:'center'});

    doc.setFontSize(6.6);
    doc.text('OBSERVACIONES DE LA PRÁCTICA', xSitio+4, y+rowLabelH+rowValueH+10);
    if(m.observaciones){
      const obsLines = doc.splitTextToSize(m.observaciones, colSitio+colFechaI+colFechaF-12);
      doc.setFontSize(6.5);
      doc.text(obsLines.slice(0,3), xSitio+4, y+rowLabelH+rowValueH+21);
    }

    sigImg(doc, m.firmaEmpresa, xFE, y, colFirma, blockH-12);
    sigImg(doc, m.firmaEstudiante, xFEst, y, colFirma, blockH-12);
    doc.setFont('helvetica','normal'); doc.setFontSize(6.8);
    doc.text('FIRMA EMPRESA', xFE+colFirma/2, y+blockH-4, {align:'center'});
    doc.text('FIRMA ESTUDIANTE', xFEst+colFirma/2, y+blockH-4, {align:'center'});

    // Divisor naranja entre meses
    doc.setDrawColor(...orange); doc.setLineWidth(1.4);
    doc.line(xMes, y+blockH, xMes+tableW, y+blockH);

    y += blockH + 2;
  });
  footer(doc);

  // ================= PÁGINA 3 — Revisión de funciones y actividades (visita 1) =================
  doc.addPage('a4','landscape');
  y = pageHeader(doc, '3 DE 4');
  y = studentStrip(doc, y);
  y = sectionBar(doc, 'Revisión de funciones y actividades', y, orange);

  const pageW3 = doc.internal.pageSize.getWidth();
  const pageH3 = doc.internal.pageSize.getHeight();
  const rf = rec.revisionFunciones;
  const fechaRf = rf.fecha ? rf.fecha.split('-') : ['','',''];

  const fW3 = pageW3 - margin*2;
  const fechaColW = 130, sitioColW = 150, areaColW = 200, jefeColW = 200;
  const supColW = fW3 - fechaColW - sitioColW - areaColW - jefeColW;
  const xFecha = margin, xSitio3 = xFecha+fechaColW, xArea3 = xSitio3+sitioColW, xJefe3 = xArea3+areaColW, xSup3 = xJefe3+jefeColW;

  doc.setDrawColor(...line); doc.setLineWidth(0.6);
  doc.rect(margin, y, fW3, 28);
  [xSitio3, xArea3, xJefe3, xSup3].forEach(x=> doc.line(x, y, x, y+28));
  doc.line(xFecha, y+14, xSitio3, y+14);
  const subW = fechaColW/3;
  doc.line(xFecha+subW, y+14, xFecha+subW, y+28);
  doc.line(xFecha+subW*2, y+14, xFecha+subW*2, y+28);

  doc.setFont('helvetica','normal'); doc.setFontSize(6.8);
  doc.text('FECHA DE LA VISITA 1', xFecha+fechaColW/2, y+9, {align:'center'});
  doc.text('AÑO', xFecha+subW/2, y+21, {align:'center'});
  doc.text('MES', xFecha+subW+subW/2, y+21, {align:'center'});
  doc.text('DÍA', xFecha+subW*2+subW/2, y+21, {align:'center'});
  doc.text('SITIO DE PRACTICAS', xSitio3+sitioColW/2, y+16, {align:'center'});
  doc.text('AREA DE TRABAJO', xArea3+areaColW/2, y+16, {align:'center'});
  doc.text('NOMBRE DEL JEFE INMEDIATO', xJefe3+jefeColW/2, y+16, {align:'center'});
  doc.text('NOMBRE DEL SUPERVISOR', xSup3+supColW/2, y+16, {align:'center'});

  doc.setFontSize(7);
  doc.text(fechaRf[0]||'', xFecha+subW/2, y+26, {align:'center'});
  doc.text(fechaRf[1]||'', xFecha+subW+subW/2, y+26, {align:'center'});
  doc.text(fechaRf[2]||'', xFecha+subW*2+subW/2, y+26, {align:'center'});
  doc.text(rf.sitio||'', xSitio3+4, y+24);
  doc.text(rf.area||'', xArea3+4, y+24);
  doc.text(rf.jefeInmediato||'', xJefe3+4, y+24);
  doc.text(rf.supervisor||'', xSup3+4, y+24);
  y += 28;

  const bottomY3 = pageH3 - 54;
  const bigBoxW = fW3 - supColW;
  doc.rect(margin, y, bigBoxW, bottomY3-y);
  doc.rect(margin+bigBoxW, y, supColW, bottomY3-y);
  const sigRowH3 = (bottomY3-y)/3;
  doc.line(margin+bigBoxW, y+sigRowH3, margin+bigBoxW+supColW, y+sigRowH3);
  doc.line(margin+bigBoxW, y+sigRowH3*2, margin+bigBoxW+supColW, y+sigRowH3*2);
  sigImg(doc, rf.firmaJefe, margin+bigBoxW+2, y+2, supColW-4, sigRowH3-13);
  sigImg(doc, rf.firmaEstudiante, margin+bigBoxW+2, y+sigRowH3+2, supColW-4, sigRowH3-13);
  sigImg(doc, rf.firmaSupervisor, margin+bigBoxW+2, y+sigRowH3*2+2, supColW-4, sigRowH3-13);
  doc.setFont('helvetica','normal'); doc.setFontSize(7);
  doc.text('FIRMA JEFE INMEDIATO', margin+bigBoxW+supColW/2, y+sigRowH3-4, {align:'center'});
  doc.text('FIRMA ESTUDIANTE', margin+bigBoxW+supColW/2, y+sigRowH3*2-4, {align:'center'});
  doc.text('FIRMA SUPERVISOR', margin+bigBoxW+supColW/2, y+sigRowH3*3-4, {align:'center'});
  footer(doc);

  // ================= PÁGINA 4 — Datos de supervisión (visita 2) =================
  doc.addPage('a4','landscape');
  y = pageHeader(doc, '4 DE 4');
  y = studentStrip(doc, y);
  y = sectionBar(doc, 'Datos de supervisión', y, orange);

  const pageW4 = doc.internal.pageSize.getWidth();
  const ds = rec.datosSupervision;
  const fechaDs = ds.fecha ? ds.fecha.split('-') : ['','',''];
  const fW4 = pageW4 - margin*2;
  const xSitio4 = margin+fechaColW, xArea4 = xSitio4+sitioColW, xJefe4 = xArea4+areaColW, xSup4 = xJefe4+jefeColW;

  doc.setDrawColor(...line); doc.setLineWidth(0.6);
  doc.rect(margin, y, fW4, 28);
  [xSitio4, xArea4, xJefe4, xSup4].forEach(x=> doc.line(x, y, x, y+28));
  doc.line(margin, y+14, xSitio4, y+14);
  doc.line(margin+subW, y+14, margin+subW, y+28);
  doc.line(margin+subW*2, y+14, margin+subW*2, y+28);
  doc.setFont('helvetica','normal'); doc.setFontSize(6.8);
  doc.text('FECHA DE LA VISITA 2', margin+fechaColW/2, y+9, {align:'center'});
  doc.text('AÑO', margin+subW/2, y+21, {align:'center'});
  doc.text('MES', margin+subW+subW/2, y+21, {align:'center'});
  doc.text('DÍA', margin+subW*2+subW/2, y+21, {align:'center'});
  doc.text('SITIO DE PRACTICAS', xSitio4+sitioColW/2, y+16, {align:'center'});
  doc.text('AREA DE TRABAJO', xArea4+areaColW/2, y+16, {align:'center'});
  doc.text('NOMBRE DEL JEFE INMEDIATO', xJefe4+jefeColW/2, y+16, {align:'center'});
  doc.text('NOMBRE DEL SUPERVISOR', xSup4+supColW/2, y+16, {align:'center'});
  doc.setFontSize(7);
  doc.text(fechaDs[0]||'', margin+subW/2, y+26, {align:'center'});
  doc.text(fechaDs[1]||'', margin+subW+subW/2, y+26, {align:'center'});
  doc.text(fechaDs[2]||'', margin+subW*2+subW/2, y+26, {align:'center'});
  doc.text(ds.sitio||'', xSitio4+4, y+24);
  doc.text(ds.area||'', xArea4+4, y+24);
  doc.text(ds.jefeInmediato||'', xJefe4+4, y+24);
  doc.text(ds.supervisor||'', xSup4+4, y+24);
  y += 30;

  const sigColW4 = 140;
  const textColW4 = fW4 - sigColW4;

  function obsBlock(title, y0, h, preguntas, comentarios, firma, firmaLabel){
    y0 = sectionBar(doc, title, y0, orange);
    doc.setDrawColor(...line); doc.setLineWidth(0.6);
    doc.rect(margin, y0, textColW4, h);
    doc.rect(margin+textColW4, y0, sigColW4, h);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.2);
    let ty = y0+11;
    preguntas.forEach(p=>{ doc.text(p, margin+4, ty); ty += 12; });
    doc.text('COMENTARIOS:', margin+4, ty); ty += 10;
    if(comentarios){
      const lines = doc.splitTextToSize(comentarios, textColW4-8);
      doc.text(lines.slice(0, Math.floor((h-(ty-y0)-4)/9)), margin+4, ty);
    }
    sigImg(doc, firma, margin+textColW4+2, y0+2, sigColW4-4, h-13);
    doc.text(firmaLabel, margin+textColW4+sigColW4/2, y0+h-4, {align:'center'});
    return y0+h;
  }

  y = obsBlock('Observaciones del estudiante', y, 74,
    ['1. ¿CONSIDERA QUE EL LUGAR DE PRÁCTICAS ES EL INDICADO?  SI/NO: '+(ds.obsEstudiante.p1||''),
     '2. ¿HA RECIBIDO APOYO DE SU JEFE INMEDIATO?  SI/NO: '+(ds.obsEstudiante.p2||'')],
    ds.obsEstudiante.comentarios, ds.obsEstudiante.firma, 'FIRMA DEL ESTUDIANTE');

  y = obsBlock('Observaciones de jefe inmediato', y, 74,
    ['1. ¿LAS FUNCIONES CUBREN LAS NECESIDADES DEL SERVICIO?  SI/NO: '+(ds.obsJefe.p1||''),
     '2. ¿LOS CONOCIMIENTOS CUBREN LAS NECESIDADES DEL SERVICIO?  SI/NO: '+(ds.obsJefe.p2||'')],
    ds.obsJefe.comentarios, ds.obsJefe.firma, 'FIRMA DEL JEFE INMEDIATO');

  y = obsBlock('Observaciones del supervisor', y, 60, [],
    ds.obsSupervisor.comentarios, ds.obsSupervisor.firma, 'FIRMA DEL SUPERVISOR');

  footer(doc);

  doc.save('Planilla_'+CODIGO+'_'+(rec.documento||'estudiante')+'.pdf');
  toast('PDF generado');
}

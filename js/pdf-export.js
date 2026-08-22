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
  const line = [150,150,150];

  // -------- helpers compartidos por todas las páginas --------
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
  function studentStrip(doc, y){
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 28;
    doc.setDrawColor(...line); doc.setLineWidth(0.6);
    const rows = [
      ['PERIODO ACADÉMICO: '+(rec.periodoAcademico||'—'), 'SEDE: '+(rec.sede||'—')],
      ['NOMBRE DEL ESTUDIANTE: '+(rec.nombre||'—'), 'D. IDENTIDAD: '+rec.documento+'   TELÉFONOS: '+(rec.telefono||'—')],
      ['CORREO ELECTRÓNICO: '+(rec.correo||'—'), 'MODALIDAD: '+(rec.modalidad||'—')+'   SEMESTRE: '+(rec.semestre||'—')],
      ['NOMBRE DEL FUNCIONARIO: '+(rec.funcionario||'—'), 'FECHA ENVÍO PLANILLAS: '+(rec.fechaEnvio||'—')]
    ];
    doc.setFont('helvetica','normal'); doc.setFontSize(7.8);
    rows.forEach(([left,right])=>{
      doc.rect(margin, y, pageW-margin*2, 14);
      doc.line(margin+(pageW-margin*2)*0.62, y, margin+(pageW-margin*2)*0.62, y+14);
      doc.text(left, margin+4, y+9.5);
      doc.text(right, margin+(pageW-margin*2)*0.62+4, y+9.5);
      y += 14;
    });
    return y+10;
  }
  function sectionBar(doc, title, y, color, note){
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 28;
    doc.setFillColor(...(color||orange));
    doc.rect(margin, y, pageW-margin*2, 16, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
    doc.text(title.toUpperCase(), margin+6, y+11);
    if(note){ doc.setFontSize(6.8); doc.text(note, pageW-margin-6, y+11, {align:'right'}); }
    doc.setTextColor(0,0,0);
    return y+16;
  }
  function sigImg(doc, dataUrl, x, y, w, h, label){
    doc.setDrawColor(...line); doc.setLineWidth(0.6);
    doc.rect(x,y,w,h);
    if(dataUrl){ try{ doc.addImage(dataUrl,'PNG', x+2, y+2, w-4, h-4); }catch(e){} }
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(90,90,90);
    doc.text(label, x, y+h+8);
    doc.setTextColor(0,0,0);
  }
  function footer(doc){
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    const y = pageH - 22;
    doc.setDrawColor(...line); doc.setLineWidth(0.5);
    doc.line(margin, y, pageW-margin, y);
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(90,90,90);
    const third = (pageW-margin*2)/3;
    doc.text('Elaboró: Analista Planeación y Desarrollo', margin, y+10);
    doc.text('Revisó: Dirección Planeación y Desarrollo', margin+third, y+10);
    doc.text('Aprobó: Vicerrectoría Académica', margin+third*2, y+10);
    doc.setTextColor(0,0,0);
  }

  // ================= PÁGINA 1 — Competencias transversales (horizontal) =================
  const doc = new jsPDF({unit:'pt', format:'a4', orientation:'landscape'});
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
    head: [['CRITERIO','Excelente (5)','Bueno (4)','Aceptable (3)','Insuficiente (2)','Deficiente (1)','N1','N2','N3','N4','N5','N6']],
    body: critRows,
    theme: 'grid',
    styles:{fontSize:6.3, cellPadding:3, valign:'middle', lineColor:line, lineWidth:0.5},
    headStyles:{fillColor:orange, textColor:255, fontStyle:'bold', fontSize:6.8, halign:'center'},
    columnStyles:{
      0:{cellWidth:95, fontStyle:'bold', fontSize:6.5},
      1:{cellWidth:115}, 2:{cellWidth:115}, 3:{cellWidth:115}, 4:{cellWidth:115}, 5:{cellWidth:115},
      6:{cellWidth:16, halign:'center', fontStyle:'bold', fillColor:[210,235,232]},
      7:{cellWidth:16, halign:'center', fontStyle:'bold', fillColor:[210,235,232]},
      8:{cellWidth:16, halign:'center', fontStyle:'bold', fillColor:[210,235,232]},
      9:{cellWidth:16, halign:'center', fontStyle:'bold', fillColor:[210,235,232]},
      10:{cellWidth:16, halign:'center', fontStyle:'bold', fillColor:[210,235,232]},
      11:{cellWidth:16, halign:'center', fontStyle:'bold', fillColor:[210,235,232]}
    },
    margin:{left:28, right:28}
  });
  footer(doc);

  // ================= PÁGINA 2 — Control de cumplimiento (vertical) =================
  doc.addPage('a4','portrait');
  y = pageHeader(doc, '2 DE 4');
  y = studentStrip(doc, y);
  y = sectionBar(doc, 'Control de cumplimiento', y, orange);

  const pageW2 = doc.internal.pageSize.getWidth();
  const margin = 28;
  const ctlBody = rec.meses.map((m,i)=>[
    'MES N°.'+(i+1),
    m.sitio || '',
    fmtDate(m.fechaInicio) || '',
    fmtDate(m.fechaFin) || '',
    m.observaciones || '',
    '', ''
  ]);
  doc.autoTable({
    startY: y,
    head: [['MES','SITIO DE PRÁCTICAS','FECHA INICIO','FECHA FINAL','OBSERVACIONES DE LA PRÁCTICA','FIRMA EMPRESA','FIRMA ESTUDIANTE']],
    body: ctlBody,
    theme: 'grid',
    styles:{fontSize:7, cellPadding:4, valign:'middle', lineColor:line, lineWidth:0.6, minCellHeight:60},
    headStyles:{fillColor:orange, textColor:255, fontStyle:'bold', fontSize:7, halign:'center'},
    columnStyles:{
      0:{cellWidth:44, fontStyle:'bold', halign:'center'},
      1:{cellWidth:120},
      2:{cellWidth:55, halign:'center'},
      3:{cellWidth:55, halign:'center'},
      4:{cellWidth:'auto'},
      5:{cellWidth:100},
      6:{cellWidth:100}
    },
    margin:{left:margin, right:margin},
    didDrawCell: function(data){
      if(data.section !== 'body') return;
      const m = rec.meses[data.row.index];
      if(data.column.index === 5 && m.firmaEmpresa){
        try{ doc.addImage(m.firmaEmpresa, 'PNG', data.cell.x+4, data.cell.y+4, data.cell.width-8, data.cell.height-8); }catch(e){}
      }
      if(data.column.index === 6 && m.firmaEstudiante){
        try{ doc.addImage(m.firmaEstudiante, 'PNG', data.cell.x+4, data.cell.y+4, data.cell.width-8, data.cell.height-8); }catch(e){}
      }
    }
  });
  y = doc.lastAutoTable.finalY + 10;
  footer(doc);

  // ================= PÁGINA 3 — Revisión de funciones y actividades (visita 1) =================
  doc.addPage('a4','portrait');
  y = pageHeader(doc, '3 DE 4');
  y = studentStrip(doc, y);
  y = sectionBar(doc, 'Revisión de funciones y actividades', y, orange);

  const pageW3 = doc.internal.pageSize.getWidth();
  const rf = rec.revisionFunciones;
  doc.setDrawColor(...line); doc.setLineWidth(0.6);
  doc.rect(28, y, pageW3-56, 16);
  doc.setFontSize(7.2); doc.setFont('helvetica','normal');
  const fechaRf = rf.fecha ? rf.fecha.split('-') : ['','',''];
  doc.text('FECHA VISITA 1 — AÑO: '+(fechaRf[0]||'—')+'   MES: '+(fechaRf[1]||'—')+'   DÍA: '+(fechaRf[2]||'—'), 32, y+11);
  y += 16;
  doc.rect(28, y, pageW3-56, 16);
  doc.text('SITIO DE PRÁCTICAS: '+(rf.sitio||'—')+'    ÁREA DE TRABAJO: '+(rf.area||'—'), 32, y+11);
  y += 16;
  doc.rect(28, y, pageW3-56, 16);
  doc.text('JEFE INMEDIATO: '+(rf.jefeInmediato||'—')+'    SUPERVISOR: '+(rf.supervisor||'—'), 32, y+11);
  y += 32;

  const sigW3 = (pageW3-56-32)/3;
  sigImg(doc, rf.firmaJefe, 28, y, sigW3, 90, 'FIRMA JEFE INMEDIATO');
  sigImg(doc, rf.firmaEstudiante, 28+sigW3+16, y, sigW3, 90, 'FIRMA ESTUDIANTE');
  sigImg(doc, rf.firmaSupervisor, 28+(sigW3+16)*2, y, sigW3, 90, 'FIRMA SUPERVISOR');
  footer(doc);

  // ================= PÁGINA 4 — Datos de supervisión (visita 2) =================
  doc.addPage('a4','portrait');
  y = pageHeader(doc, '4 DE 4');
  y = studentStrip(doc, y);
  y = sectionBar(doc, 'Datos de supervisión', y, orange);

  const pageW4 = doc.internal.pageSize.getWidth();
  const ds = rec.datosSupervision;
  doc.setDrawColor(...line); doc.setLineWidth(0.6);
  doc.rect(28, y, pageW4-56, 16);
  doc.setFontSize(7.2); doc.setFont('helvetica','normal');
  const fechaDs = ds.fecha ? ds.fecha.split('-') : ['','',''];
  doc.text('FECHA VISITA 2 — AÑO: '+(fechaDs[0]||'—')+'   MES: '+(fechaDs[1]||'—')+'   DÍA: '+(fechaDs[2]||'—'), 32, y+11);
  y += 16;
  doc.rect(28, y, pageW4-56, 16);
  doc.text('SITIO: '+(ds.sitio||'—')+'   ÁREA: '+(ds.area||'—')+'   JEFE INMEDIATO: '+(ds.jefeInmediato||'—')+'   SUPERVISOR: '+(ds.supervisor||'—'), 32, y+11);
  y += 24;

  y = sectionBar(doc, 'Observaciones del estudiante', y, teal);
  doc.setFontSize(7.5); doc.setFont('helvetica','normal');
  doc.text('1. ¿Considera que el lugar de prácticas es el indicado?  SI/NO: '+(ds.obsEstudiante.p1||'—'), 32, y+11);
  doc.text('2. ¿Ha recibido apoyo de su jefe inmediato?  SI/NO: '+(ds.obsEstudiante.p2||'—'), 32, y+23);
  const c1 = doc.splitTextToSize('Comentarios: '+(ds.obsEstudiante.comentarios||'—'), pageW4-56-160);
  doc.text(c1.slice(0,3), 32, y+35);
  sigImg(doc, ds.obsEstudiante.firma, pageW4-28-140, y+2, 140, 55, 'FIRMA DEL ESTUDIANTE');
  y += 66;

  y = sectionBar(doc, 'Observaciones de jefe inmediato', y, teal);
  doc.text('1. ¿Las funciones cubren las necesidades del servicio?  SI/NO: '+(ds.obsJefe.p1||'—'), 32, y+11);
  doc.text('2. ¿Los conocimientos cubren las necesidades del servicio?  SI/NO: '+(ds.obsJefe.p2||'—'), 32, y+23);
  const c2 = doc.splitTextToSize('Comentarios: '+(ds.obsJefe.comentarios||'—'), pageW4-56-160);
  doc.text(c2.slice(0,3), 32, y+35);
  sigImg(doc, ds.obsJefe.firma, pageW4-28-140, y+2, 140, 55, 'FIRMA DEL JEFE INMEDIATO');
  y += 66;

  y = sectionBar(doc, 'Observaciones del supervisor', y, teal);
  const c3 = doc.splitTextToSize('Comentarios: '+(ds.obsSupervisor.comentarios||'—'), pageW4-56-160);
  doc.text(c3.slice(0,3), 32, y+11);
  sigImg(doc, ds.obsSupervisor.firma, pageW4-28-140, y+2, 140, 55, 'FIRMA DEL SUPERVISOR');
  footer(doc);

  doc.save('Planilla_'+CODIGO+'_'+(rec.documento||'estudiante')+'.pdf');
  toast('PDF generado');
}

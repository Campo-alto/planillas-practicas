/* ============================= PDF EXPORT ============================= */
function fmtDate(d){
  if(!d) return '—';
  const parts = d.split('-');
  if(parts.length===3) return parts[2]+'/'+parts[1]+'/'+parts[0];
  return d;
}
function scoreCell(v){ return v ? (v+' · '+SCORE_LABELS[v]) : '—'; }

function downloadPdf(){
  const rec = state.record;
  if(!rec){ toast('Busca un estudiante primero', true); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'pt', format:'a4'});
  const orange = [232,121,45];
  const teal = [14,124,134];
  const deep = [11,61,61];
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 36;

  function header(pageTitle){
    doc.setFillColor(...deep);
    doc.rect(0,0,pageW,54,'F');
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold'); doc.setFontSize(13);
    doc.text('Campoalto', margin, 24);
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.text('Recolección de evidencias de desempeño', margin, 38);
    doc.setFontSize(8);
    doc.text(CODIGO+'  ·  '+pageTitle, margin, 48);
    doc.setTextColor(0,0,0);
  }
  function studentBlock(y){
    doc.setDrawColor(...orange); doc.setLineWidth(1.2);
    doc.line(margin, y, pageW-margin, y);
    y += 16;
    doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text(rec.nombre || '(sin nombre)', margin, y);
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.text('Documento: '+rec.documento, margin, y+14);
    doc.text('Programa: '+ (rec.programa||PROGRAMA), margin, y+28);
    doc.text('Sede: '+(rec.sede||'—')+'   Semestre: '+(rec.semestre||'—')+'   Modalidad: '+(rec.modalidad||'—'), margin, y+42);
    doc.text('Periodo académico: '+(rec.periodoAcademico||'—')+'   Funcionario: '+(rec.funcionario||'—'), margin, y+56);
    return y+72;
  }
  function sectionBar(title, y, color){
    doc.setFillColor(...(color||orange));
    doc.roundedRect(margin, y, pageW-margin*2, 20, 3, 3, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(9.5);
    doc.text(title.toUpperCase(), margin+8, y+14);
    doc.setTextColor(0,0,0);
    return y+30;
  }
  function sigImg(dataUrl, x, y, w, h, label){
    doc.setDrawColor(200,200,200); doc.setLineWidth(0.6);
    doc.rect(x,y,w,h);
    if(dataUrl){
      try{ doc.addImage(dataUrl,'PNG', x+2, y+2, w-4, h-4); }catch(e){}
    }
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(90,90,90);
    doc.text(label, x, y+h+9);
    doc.setTextColor(0,0,0);
  }

  // PAGE 1: datos + competencias
  header('Página 1 de 3 — Competencias transversales');
  let y = studentBlock(66);
  y = sectionBar('Competencias transversales (calificación 1 a 5 por mes)', y);

  const body = COMPETENCIAS.map(c=>{
    const row = [c.name];
    for(let i=0;i<6;i++){ row.push(String(rec.competencias[c.key][i] || '—')); }
    return row;
  });
  doc.autoTable({
    startY: y,
    head: [['Criterio','Mes 1','Mes 2','Mes 3','Mes 4','Mes 5','Mes 6']],
    body: body,
    theme: 'grid',
    styles:{fontSize:8, cellPadding:5, valign:'middle'},
    headStyles:{fillColor:teal, textColor:255, fontStyle:'bold'},
    columnStyles:{0:{cellWidth:200}},
    margin:{left:margin, right:margin}
  });
  y = doc.lastAutoTable.finalY + 10;
  doc.setFont('helvetica','italic'); doc.setFontSize(7.5); doc.setTextColor(110,110,110);
  doc.text('Escala: 5 Excelente · 4 Bueno · 3 Aceptable · 2 Insuficiente · 1 Deficiente', margin, y);
  doc.setTextColor(0,0,0);

  // PAGE 2: control de cumplimiento
  doc.addPage();
  header('Página 2 de 3 — Control de cumplimiento');
  y = 70;
  y = sectionBar('Control de cumplimiento', y);
  const ctlBody = rec.meses.map((m,i)=>[
    'Mes '+(i+1), m.sitio||'—', fmtDate(m.fechaInicio), fmtDate(m.fechaFin), m.observaciones||'—',
    m.firmaEmpresa ? 'Sí' : 'No', m.firmaEstudiante ? 'Sí' : 'No'
  ]);
  doc.autoTable({
    startY:y,
    head:[['Mes','Sitio de prácticas','Inicio','Final','Observaciones','Firma empresa','Firma estudiante']],
    body: ctlBody,
    theme:'grid',
    styles:{fontSize:7.5, cellPadding:4},
    headStyles:{fillColor:orange, textColor:255, fontStyle:'bold'},
    margin:{left:margin, right:margin}
  });
  y = doc.lastAutoTable.finalY + 20;
  // show signature images for months that have them, 2 per row
  let sx = margin, sy = y, sw = (pageW-margin*2-16)/2, sh = 60;
  rec.meses.forEach((m,i)=>{
    if(!m.firmaEmpresa && !m.firmaEstudiante) return;
    if(sy > doc.internal.pageSize.getHeight()-100){ doc.addPage(); header('Página 2 de 3 — Control de cumplimiento (cont.)'); sy = 70; }
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.text('Mes '+(i+1), sx, sy);
    sigImg(m.firmaEmpresa, sx, sy+6, sw, sh, 'Firma empresa');
    sigImg(m.firmaEstudiante, sx+sw+16, sy+6, sw, sh, 'Firma estudiante');
    sy += sh + 28;
  });

  // PAGE 3: revision funciones + datos supervision
  doc.addPage();
  header('Página 3 de 3 — Supervisión');
  y = 70;
  y = sectionBar('Revisión de funciones y actividades — visita 1', y, deep);
  const rf = rec.revisionFunciones;
  doc.setFontSize(9);
  doc.text('Fecha: '+fmtDate(rf.fecha)+'   Sitio: '+(rf.sitio||'—'), margin, y+2);
  doc.text('Área: '+(rf.area||'—')+'   Jefe inmediato: '+(rf.jefeInmediato||'—')+'   Supervisor: '+(rf.supervisor||'—'), margin, y+16);
  y += 30;
  sigImg(rf.firmaJefe, margin, y, 150, 55, 'Firma jefe inmediato');
  sigImg(rf.firmaEstudiante, margin+166, y, 150, 55, 'Firma estudiante');
  sigImg(rf.firmaSupervisor, margin+332, y, 150, 55, 'Firma supervisor');
  y += 80;

  y = sectionBar('Datos de supervisión — visita 2', y, deep);
  const ds = rec.datosSupervision;
  doc.setFontSize(9);
  doc.text('Fecha: '+fmtDate(ds.fecha)+'   Sitio: '+(ds.sitio||'—')+'   Área: '+(ds.area||'—'), margin, y+2);
  y += 18;
  doc.setFont('helvetica','bold'); doc.text('Observaciones del estudiante', margin, y); doc.setFont('helvetica','normal');
  y += 12;
  doc.setFontSize(8.5);
  doc.text('¿Lugar indicado? '+(ds.obsEstudiante.p1||'—')+'    ¿Recibió apoyo? '+(ds.obsEstudiante.p2||'—'), margin, y);
  y += 12;
  doc.text(doc.splitTextToSize('Comentarios: '+(ds.obsEstudiante.comentarios||'—'), pageW-margin*2), margin, y);
  y += 24;
  sigImg(ds.obsEstudiante.firma, margin, y, 150, 45, 'Firma estudiante');
  y += 62;

  doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.text('Observaciones del jefe inmediato', margin, y); doc.setFont('helvetica','normal');
  y += 12; doc.setFontSize(8.5);
  doc.text('¿Funciones cubren necesidades? '+(ds.obsJefe.p1||'—')+'    ¿Conocimientos cubren necesidades? '+(ds.obsJefe.p2||'—'), margin, y);
  y += 12;
  doc.text(doc.splitTextToSize('Comentarios: '+(ds.obsJefe.comentarios||'—'), pageW-margin*2), margin, y);
  y += 24;
  sigImg(ds.obsJefe.firma, margin, y, 150, 45, 'Firma jefe inmediato');
  y += 62;

  doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.text('Observaciones del supervisor', margin, y); doc.setFont('helvetica','normal');
  y += 12; doc.setFontSize(8.5);
  doc.text(doc.splitTextToSize('Comentarios: '+(ds.obsSupervisor.comentarios||'—'), pageW-margin*2), margin, y);
  y += 24;
  sigImg(ds.obsSupervisor.firma, margin, y, 150, 45, 'Firma supervisor');

  doc.save('Planilla_'+CODIGO+'_'+(rec.documento||'estudiante')+'.pdf');
  toast('PDF generado');
}

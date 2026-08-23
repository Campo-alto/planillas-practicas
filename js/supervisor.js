/* ============================= SUPERVISOR ============================= */
function renderSupervisor(){
  showScreen('screen-supervisor');
  document.getElementById('supDocLabel').textContent = state.documento;
  document.getElementById('supDatosGenerales').innerHTML = datosGeneralesHtml(state.record, false, 'sup');
  document.getElementById('supPlanillaView').innerHTML = resumenPlanillaHtml(state.record, false);

  const rf = state.record.revisionFunciones;
  document.getElementById('rf-fecha').value = rf.fecha || '';
  document.getElementById('rf-modalidad-visita').value = rf.modalidadVisita || '';
  document.getElementById('rf-sitio').value = rf.sitio || '';
  document.getElementById('rf-area').value = rf.area || '';
  document.getElementById('rf-jefe').value = rf.jefeInmediato || '';
  document.getElementById('rf-supervisor').value = rf.supervisor || '';
  document.getElementById('rf-tutor').value = rf.tutor || '';
  document.getElementById('rf-funciones').value = rf.funcionesAsignadas || '';
  document.querySelectorAll('input[name="rfAceptacion"]').forEach(r=>{ r.checked = r.value === rf.aceptacionFunciones; });
  document.getElementById('rf-observaciones-mejora').value = rf.observacionesMejora || '';
  document.getElementById('rf-compromisos').value = rf.compromisos || '';
  setTimeout(()=>{
    initSigPad('sig-rf-jefe', rf.firmaJefe);
    initSigPad('sig-rf-estudiante', rf.firmaEstudiante);
    initSigPad('sig-rf-supervisor', rf.firmaSupervisor);
  }, 30);

  const ds = state.record.datosSupervision;
  document.getElementById('ds-fecha').value = ds.fecha || '';
  document.getElementById('ds-modalidad-visita').value = ds.modalidadVisita || '';
  document.getElementById('ds-sitio').value = ds.sitio || '';
  document.getElementById('ds-area').value = ds.area || '';
  document.getElementById('ds-jefe').value = ds.jefeInmediato || '';
  document.getElementById('ds-supervisor').value = ds.supervisor || '';
  document.querySelectorAll('input[name="estP1"]').forEach(r=>{ r.checked = r.value === ds.obsEstudiante.p1; });
  document.querySelectorAll('input[name="estP2"]').forEach(r=>{ r.checked = r.value === ds.obsEstudiante.p2; });
  document.getElementById('ds-estComentarios').value = ds.obsEstudiante.comentarios || '';
  document.querySelectorAll('input[name="jefeP1"]').forEach(r=>{ r.checked = r.value === ds.obsJefe.p1; });
  document.querySelectorAll('input[name="jefeP2"]').forEach(r=>{ r.checked = r.value === ds.obsJefe.p2; });
  document.getElementById('ds-jefeComentarios').value = ds.obsJefe.comentarios || '';
  document.getElementById('ds-supComentarios').value = ds.obsSupervisor.comentarios || '';
  setTimeout(()=>{
    initSigPad('sig-ds-estudiante', ds.obsEstudiante.firma);
    initSigPad('sig-ds-jefe', ds.obsJefe.firma);
    initSigPad('sig-ds-supervisor', ds.obsSupervisor.firma);
  }, 30);
}
async function saveRevisionFunciones(){
  const rec = state.record; const rf = rec.revisionFunciones;
  rf.fecha = document.getElementById('rf-fecha').value;
  rf.modalidadVisita = document.getElementById('rf-modalidad-visita').value;
  rf.sitio = val('rf-sitio'); rf.area = val('rf-area'); rf.jefeInmediato = val('rf-jefe'); rf.supervisor = val('rf-supervisor');
  rf.tutor = val('rf-tutor');
  rf.funcionesAsignadas = document.getElementById('rf-funciones').value.trim();
  const rfAcept = document.querySelector('input[name="rfAceptacion"]:checked');
  rf.aceptacionFunciones = rfAcept ? rfAcept.value : '';
  rf.observacionesMejora = document.getElementById('rf-observaciones-mejora').value.trim();
  rf.compromisos = document.getElementById('rf-compromisos').value.trim();
  const sj = sigDataUrl('sig-rf-jefe'); if(sj) rf.firmaJefe = sj;
  const se = sigDataUrl('sig-rf-estudiante'); if(se) rf.firmaEstudiante = se;
  const ss = sigDataUrl('sig-rf-supervisor'); if(ss) rf.firmaSupervisor = ss;
  await saveRecord(rec);
  toast('Visita 1 guardada');
}
async function saveDatosSupervision(){
  const rec = state.record; const ds = rec.datosSupervision;
  ds.fecha = document.getElementById('ds-fecha').value;
  ds.modalidadVisita = document.getElementById('ds-modalidad-visita').value;
  ds.sitio = val('ds-sitio'); ds.area = val('ds-area'); ds.jefeInmediato = val('ds-jefe'); ds.supervisor = val('ds-supervisor');
  const ep1 = document.querySelector('input[name="estP1"]:checked'); const ep2 = document.querySelector('input[name="estP2"]:checked');
  ds.obsEstudiante.p1 = ep1 ? ep1.value : ''; ds.obsEstudiante.p2 = ep2 ? ep2.value : '';
  ds.obsEstudiante.comentarios = document.getElementById('ds-estComentarios').value.trim();
  const jp1 = document.querySelector('input[name="jefeP1"]:checked'); const jp2 = document.querySelector('input[name="jefeP2"]:checked');
  ds.obsJefe.p1 = jp1 ? jp1.value : ''; ds.obsJefe.p2 = jp2 ? jp2.value : '';
  ds.obsJefe.comentarios = document.getElementById('ds-jefeComentarios').value.trim();
  ds.obsSupervisor.comentarios = document.getElementById('ds-supComentarios').value.trim();
  const se = sigDataUrl('sig-ds-estudiante'); if(se) ds.obsEstudiante.firma = se;
  const sj = sigDataUrl('sig-ds-jefe'); if(sj) ds.obsJefe.firma = sj;
  const ss = sigDataUrl('sig-ds-supervisor'); if(ss) ds.obsSupervisor.firma = ss;
  await saveRecord(rec);
  toast('Visita 2 guardada');
}

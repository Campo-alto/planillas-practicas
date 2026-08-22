/* ============================= DATOS GENERALES ============================= */
function datosGeneralesHtml(rec, editable, formIdPrefix){
  if(editable){
    return `
      <div class="section-bar">Datos generales del estudiante</div>
      <div class="field-row">
        <div class="field"><label>Nombre completo</label><input id="${formIdPrefix}-nombre" value="${escapeAttr(rec.nombre)}"></div>
        <div class="field"><label>Correo</label><input id="${formIdPrefix}-correo" value="${escapeAttr(rec.correo)}"></div>
        <div class="field"><label>Teléfono</label><input id="${formIdPrefix}-telefono" value="${escapeAttr(rec.telefono)}"></div>
        <div class="field"><label>Sede</label><input id="${formIdPrefix}-sede" value="${escapeAttr(rec.sede)}"></div>
        <div class="field"><label>Semestre</label><input id="${formIdPrefix}-semestre" value="${escapeAttr(rec.semestre)}"></div>
        <div class="field"><label>Modalidad</label><input id="${formIdPrefix}-modalidad" value="${escapeAttr(rec.modalidad)}"></div>
        <div class="field"><label>Periodo académico</label><input id="${formIdPrefix}-periodo" value="${escapeAttr(rec.periodoAcademico)}"></div>
        <div class="field"><label>Funcionario que procesa</label><input id="${formIdPrefix}-funcionario" value="${escapeAttr(rec.funcionario)}"></div>
        ${renderAreaProgramaSelects(formIdPrefix, rec.programa)}
      </div>
      <div class="actions-row"><button class="ghost" onclick="saveDatosGeneralesAdmin()">Guardar datos generales</button></div>
    `;
  }
  return `
    <div class="section-bar teal">Datos generales del estudiante</div>
    <div class="field-row">
      <div class="field"><label>Nombre</label><div>${rec.nombre||'—'}</div></div>
      <div class="field"><label>Documento</label><div>${rec.documento}</div></div>
      <div class="field"><label>Sede</label><div>${rec.sede||'—'}</div></div>
      <div class="field"><label>Semestre</label><div>${rec.semestre||'—'}</div></div>
      <div class="field"><label>Modalidad</label><div>${rec.modalidad||'—'}</div></div>
      <div class="field" style="grid-column:1/-1;"><label>Programa</label><div>${rec.programa||'—'}</div></div>
    </div>
  `;
}
function escapeAttr(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }
function val(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; }

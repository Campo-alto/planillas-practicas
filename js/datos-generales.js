/* ============================= DATOS GENERALES ============================= */
function datosGeneralesHtml(rec, editable, formIdPrefix){
  if(editable){
    return `
      <div class="section-bar">Datos generales del estudiante</div>
      <div class="field-row">
        <div class="field"><label>Apellidos</label><input id="${formIdPrefix}-apellidos" value="${escapeAttr(rec.apellidos)}" oninput="updateNombrePreview('${formIdPrefix}')"></div>
        <div class="field"><label>Nombres</label><input id="${formIdPrefix}-nombres" value="${escapeAttr(rec.nombres)}" oninput="updateNombrePreview('${formIdPrefix}')"></div>
        <div class="field">
          <label>Nombre completo (se arma solo)</label>
          <input id="${formIdPrefix}-nombre-preview" value="${escapeAttr(rec.nombre)}" disabled style="background:#F3F0E8;color:var(--muted);">
        </div>
        <div class="field"><label>Correo</label><input id="${formIdPrefix}-correo" value="${escapeAttr(rec.correo)}"></div>
        <div class="field"><label>Teléfono</label><input id="${formIdPrefix}-telefono" value="${escapeAttr(rec.telefono)}"></div>
        <div class="field"><label>Sede</label><input id="${formIdPrefix}-sede" value="${escapeAttr(rec.sede)}"></div>
        <div class="field"><label>Semestre</label><input id="${formIdPrefix}-semestre" value="${escapeAttr(rec.semestre)}"></div>
        <div class="field"><label>Modalidad</label>
          <select id="${formIdPrefix}-modalidad">
            <option value="">Selecciona una modalidad…</option>
            ${MODALIDADES.map(m=>`<option value="${escapeAttr(m.nombre)}" ${m.nombre===rec.modalidad?'selected':''}>${m.nombre} (${m.meses===1?'1 nota':m.meses+' meses'})</option>`).join('')}
          </select>
        </div>
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
function nombreCompletoDesde(apellidos, nombres){
  return (apellidos+' '+nombres).trim().replace(/\s+/g,' ');
}
function updateNombrePreview(formIdPrefix){
  const apellidos = val(formIdPrefix+'-apellidos');
  const nombres = val(formIdPrefix+'-nombres');
  const preview = document.getElementById(formIdPrefix+'-nombre-preview');
  if(preview) preview.value = nombreCompletoDesde(apellidos, nombres);
}

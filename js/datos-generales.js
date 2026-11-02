/* ============================= DATOS GENERALES ============================= */
function datosGeneralesHtml(rec, editable, formIdPrefix){
  if(editable){
    return `
      <div class="section-bar">Datos generales del estudiante</div>
      <div class="field-row">
        <div class="field" style="grid-column:1/-1;max-width:640px"><label>Nombre completo del estudiante</label><input id="${formIdPrefix}-nombre" value="${escapeAttr(rec.nombre)}" maxlength="150" placeholder="Ej. Ana María Pérez Gómez"></div>
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
        <div class="field"><label>Jornada en que solicita el cupo de práctica</label>
          <select id="${formIdPrefix}-jornada">
            <option value="">Sin definir…</option>
            ${JORNADAS.map(j=>`<option value="${j}" ${j===rec.jornadaSolicitada?'selected':''}>${j}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="actions-row"><button class="ghost" onclick="saveDatosGeneralesAdmin()">Guardar datos generales</button></div>
    `;
  }
  const v = x => (x===undefined||x===null||String(x).trim()==='') ? '<span class="ficha-vacio">—</span>' : escapeHtmlFicha(x);
  const row = (l1,v1,l2,v2) => `<tr><th>${l1}</th><td>${v1}</td><th>${l2}</th><td>${v2}</td></tr>`;
  return `
    <div class="section-bar teal">Ficha · Datos generales del estudiante</div>
    <div class="ficha-wrap"><table class="ficha-table">
      <tbody>
        <tr class="ficha-head"><td colspan="4"><span class="ficha-nombre">${v(rec.nombre)}</span><span class="ficha-doc">Documento · ${v(rec.documento)}</span></td></tr>
        <tr><th>Programa</th><td colspan="3">${v(rec.programa)}</td></tr>
        ${row('Modalidad', v(rec.modalidad), 'Semestre', v(rec.semestre))}
        ${row('Sede', v(rec.sede), 'Jornada solicitada', v(rec.jornadaSolicitada))}
        ${row('Periodo académico', v(rec.periodoAcademico), 'Teléfono', v(rec.telefono))}
        <tr><th>Correo</th><td colspan="3">${v(rec.correo)}</td></tr>
      </tbody>
    </table></div>
  `;
}
function escapeHtmlFicha(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
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

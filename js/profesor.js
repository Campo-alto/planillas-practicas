/* ============================= PROFESOR (profesor.html) =============================
   El profesor entra con su correo y contraseña (los crea el administrador), busca al estudiante por documento o por nombre y califica
   los meses que la empresa NO calificó. Reutiliza la planilla de la empresa; las reglas las exige la base de datos
   (rol-profesor-etapa65.sql): solo meses sin nota de la empresa, sin firma de empresa y sin tocar meses bloqueados. */
(function(){
  const lab = document.querySelector('#screen-lookup .lookup-form .field label');
  const inp = document.getElementById('lookupDoc');
  if(lab) lab.textContent = 'Documento o nombre del estudiante';
  if(inp){ inp.removeAttribute('inputmode'); inp.placeholder = 'Ej. 1128108664 o María Pérez'; inp.addEventListener('keydown', e=>{ if(e.key === 'Enter'){ e.preventDefault(); doLookup(); } }); }

  // Si lo escrito tiene letras, se busca por nombre y se muestran los resultados para elegir
  const _lookup = doLookup;
  doLookup = async function(){
    const v = ((document.getElementById('lookupDoc') || {}).value || '').trim();
    if(state.role === 'profesor' && v && /[^\d\s.]/.test(v)) return profBuscarNombre(v);
    return _lookup.apply(this, arguments);
  };
})();

async function profBuscarNombre(texto){
  const msg = document.getElementById('lookupMsg'); if(!msg) return;
  if(texto.length < 3){ msg.innerHTML = '<span style="color:var(--danger)">Escribe al menos 3 letras del nombre.</span>'; return; }
  msg.innerHTML = '<span style="color:var(--muted)">Buscando…</span>';
  const { data, error } = await sb.rpc('prof_buscar', { p_token: state.token, p_texto: texto });
  if(error){ msg.innerHTML = '<span style="color:var(--danger)">' + esc(error.message) + (/vencida|inválida/i.test(error.message) ? '' : ' (¿ejecutaste rol-profesor-etapa65.sql?)') + '</span>'; return; }
  if(!data || !data.length){ msg.innerHTML = '<span style="color:var(--danger)">No se encontró ningún estudiante con ese nombre.</span>'; return; }
  msg.innerHTML = '<div style="margin-bottom:6px;color:var(--muted)">Elige al estudiante (' + data.length + (data.length === 30 ? ', máximo 30: afina la búsqueda' : '') + '):</div>' +
    '<div class="prof-res">' + data.map(x=>'<button type="button" class="prof-fila" data-doc="' + esc(x.documento) + '"><b>' + esc(x.nombre || '(sin nombre)') + '</b><span>' + esc(x.documento) + ' · ' + esc(x.programa || '') + (x.modalidad ? ' · ' + esc(x.modalidad) : '') + '</span></button>').join('') + '</div>';
  msg.querySelectorAll('.prof-fila').forEach(b=>b.addEventListener('click', ()=>{ document.getElementById('lookupDoc').value = b.dataset.doc; doLookup(); }));
}

/* ===== NOTAS POR SUBIR AL SISTEMA: lista de estudiantes cuyas notas ya fueron calificadas pero aún no se han subido ===== */
let npLista = [];
const npE = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function npPantalla(){
  let el = document.getElementById('screen-admin-notas-subir');
  if(!el){ const hub = document.getElementById('screen-admin-hub'); if(!hub) return null; el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-notas-subir'; hub.parentNode.appendChild(el); }
  return el;
}
async function abrirNotasPorSubir(){
  if(!requireSupabase()) return;
  const el = npPantalla(); if(!el) return;
  el.innerHTML = '<p style="color:var(--muted)">Cargando…</p>'; showScreen('screen-admin-notas-subir');
  const { data, error } = await sb.rpc('admin_notas_por_subir');
  if(error){ el.innerHTML = '<button class="linkbtn" onclick="showScreen(\'screen-admin-hub\')">← Volver al panel</button><p style="color:var(--danger)">No se pudo cargar: ' + npE(error.message) + ' (¿ejecutaste notas-por-subir-etapa50.sql?)</p>'; return; }
  npLista = data || [];
  const filas = npLista.map((x, i) => `<tr><td>${npE(x.documento)}</td><td><b>${npE(x.nombre)}</b><br><span class="aud-ref">${npE(x.programa || '')}</span></td>
      <td>${npE(x.modalidad || '—')}</td><td>${(x.meses || []).map(m => '<span class="cor-est cor-pendiente">Mes ' + m + '</span>').join(' ')}</td>
      <td class="aud-nw"><button class="ghost" onclick="npVer('${npE(x.documento)}')">Ver planilla</button>
        <button class="primary" onclick="npMarcar(${i})">Ya las subí</button></td></tr>`).join('');
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Notas por subir al sistema</h2>
    <p class="helptext" style="text-align:justify;">Estudiantes con meses ya calificados cuya nota todavía no se marcó como subida. Sube la nota al sistema y pulsa <b>«Ya las subí»</b>; también puedes abrir la planilla para revisarla.</p>
    <div class="card">${npLista.length ? `<div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Documento</th><th>Estudiante</th><th>Modalidad</th><th>Meses por subir</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`
      : '<p>🎉 No hay notas pendientes por subir.</p>'}</div>`;
}
async function npVer(doc){
  try{
    const rec = await getRecord(doc); if(!rec){ toast('No se encontró la planilla', true); return; }
    state.role = 'administrador'; state.documento = doc; state.record = rec; state.empMonth = 0; state.estMonth = 0;
    await renderAdministrador();
  }catch(e){ toast(e.message, true); }
}
async function npMarcar(i){
  const x = npLista[i]; if(!x) return;
  if(!confirm('¿Confirmas que ya subiste al sistema ' + (x.meses.length === 1 ? 'el mes ' : 'los meses ') + x.meses.join(', ') + ' de ' + x.nombre + '?')) return;
  const { error } = await sb.rpc('admin_notas_marcar_subidas', { p_documento: x.documento, p_meses: x.meses });
  if(error){ toast(error.message, true); return; }
  toast('Marcadas como subidas'); if(gdNotasAbierto) npInline(true); else abrirNotasPorSubir(); if(typeof gdPendientes === 'function') gdPendientes(); if(typeof ntCargar === 'function') ntCargar(false);
}

/* Campana del administrador: aviso fijo mientras haya notas por subir (al pulsar, abre la lista) */
let ntNotas = 0;
(function(){
  if(typeof ntCargar !== 'function') return;
  const _c = ntCargar;
  ntCargar = async function(){
    const r = await _c.apply(this, arguments);
    try{
      if(typeof ntRol === 'function' && ntRol() === 'adm'){ const { data, error } = await sb.rpc('admin_notas_por_subir_n'); ntNotas = (!error && Number(data)) || 0; } else ntNotas = 0;
    }catch(_){ ntNotas = 0; }
    if(typeof ntPintarBell === 'function') ntPintarBell();
    return r;
  };
  const _p = ntPintarBell;
  ntPintarBell = function(){
    const real = ntNoLeidas; ntNoLeidas = real + (ntNotas || 0);
    try{ return _p.apply(this, arguments); } finally { ntNoLeidas = real; }
  };
  const _a = ntAbrir;
  ntAbrir = async function(){
    await _a.apply(this, arguments);
    if(ntNotas > 0){
      const box = document.querySelector('#ntModal .home-modal-box'), head = box && box.querySelector('.home-modal-head');
      if(head){ const d = document.createElement('div');
        d.style.cssText = 'padding:10px 12px;margin:8px 0;border:1px solid #EFD9B5;background:#FBF3E7;border-radius:8px;cursor:pointer;';
        d.innerHTML = '<div style="font-weight:700;font-size:14px;color:#7A5B21;">📤 ' + ntNotas + ' estudiante(s) con notas sin subir al sistema</div><div style="font-size:13px;">Pulsa aquí para ver quiénes son.</div>';
        d.onclick = () => { ntCerrar(); abrirNotasPorSubir(); }; head.insertAdjacentElement('afterend', d); }
    }
  };
})();


/* ===== Dentro de «Pendientes por proceso»: al pulsar el chip se despliega la lista de estudiantes ===== */
let gdNotasAbierto = false;
async function npInline(forzar){
  const box = document.getElementById('gdPend'); if(!box) return;
  let d = document.getElementById('gdNotasInline');
  if(d && !forzar){ d.remove(); gdNotasAbierto = false; return; }       // segundo clic: se cierra
  gdNotasAbierto = true;
  if(!d){ d = document.createElement('div'); d.id = 'gdNotasInline'; d.style.cssText = 'margin-top:12px;border-top:1px dashed var(--line,#ddd);padding-top:10px;'; box.appendChild(d); }
  d.innerHTML = '<p style="color:var(--muted)">Cargando notas por subir…</p>';
  const { data, error } = await sb.rpc('admin_notas_por_subir');
  if(error){ d.innerHTML = '<p style="color:var(--danger)">No se pudo cargar: ' + npE(error.message) + '</p>'; return; }
  npLista = data || [];
  d.innerHTML = '<div class="gd-grupo-t">📤 Notas por subir al sistema (' + npLista.length + ')</div>' + (npLista.length ?
    '<div class="cupos-wrap"><table class="cupos-table aud-tabla"><thead><tr><th>Documento</th><th>Estudiante</th><th>Meses por subir</th><th></th></tr></thead><tbody>' +
    npLista.map((x, i) => '<tr><td>' + npE(x.documento) + '</td><td><b>' + npE(x.nombre) + '</b><br><span class="aud-ref">' + npE(x.modalidad || '') + '</span></td><td>' +
      (x.meses || []).map(m => '<span class="cor-est cor-pendiente">Mes ' + m + '</span>').join(' ') + '</td><td class="aud-nw"><button class="ghost" onclick="npVer(\'' + npE(x.documento) + '\')">Ver planilla</button> <button class="primary" onclick="npMarcar(' + i + ')">Ya las subí</button></td></tr>').join('') +
    '</tbody></table></div>' : '<p>🎉 No hay notas pendientes por subir.</p>');
}
(function(){
  if(typeof gdAbrirFn === 'function'){
    const _a = gdAbrirFn;
    gdAbrirFn = function(titulo){ if(titulo === 'Notas por subir al sistema'){ npInline(); return; } return _a.apply(this, arguments); };
  }
  if(typeof gdPendientes === 'function'){
    const _p = gdPendientes;
    gdPendientes = async function(){ const r = await _p.apply(this, arguments); if(gdNotasAbierto) npInline(true); return r; };
  }
})();

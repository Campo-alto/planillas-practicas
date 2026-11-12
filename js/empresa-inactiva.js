/* ===== PRÁCTICA INACTIVA: si el estudiante fue retirado de la empresa, su planilla queda bloqueada (solo se puede mirar) =====
   El bloqueo real lo exige el servidor (etapa 52); esto solo muestra el aviso y desactiva los botones para que sea claro. */
let empInact = { doc: null, info: null };
async function empCargarInactiva(){
  const doc = state.documento;
  if(!doc || !state.token || typeof sb === 'undefined' || !sb) return null;
  try{
    const { data, error } = await sb.rpc('emp_practica_estado', { p_token: state.token, p_documento: doc });
    empInact = { doc, info: (!error && data) ? data : null };
  }catch(_){ empInact = { doc, info: null }; }
  return empInact.info;
}
function empAplicarBloqueo(){
  const info = empInact.doc === state.documento ? empInact.info : null;
  const ov = document.getElementById('empOverview');
  if(!ov || !info || !info.inactiva) return;
  if(!document.getElementById('empInactivaAviso')){
    const f = info.desde ? new Date(info.desde).toLocaleDateString('es-CO') : '';
    const d = document.createElement('div'); d.id = 'empInactivaAviso'; d.className = 'note-box';
    d.style.cssText = 'margin-bottom:12px;background:#FBEAE7;border-color:#F0C4BD;color:#8F2A20;';
    d.innerHTML = '🚫 <b>Práctica inactiva.</b> Este estudiante fue retirado de tu empresa' + (f ? ' el ' + f : '') + '. Su planilla quedó <b>bloqueada</b>: puedes consultarla, pero no modificar nada.' +
      (info.motivo ? '<br><span style="font-size:13px;">Motivo: ' + String(info.motivo).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) + '</span>' : '');
    ov.insertBefore(d, ov.firstChild);
  }
  ov.querySelectorAll('input,textarea,select,button').forEach(el=>{ if(!el.classList.contains('month-pill')) el.disabled = true; });
  ov.querySelectorAll('canvas').forEach(c=>{ c.style.pointerEvents = 'none'; c.style.opacity = '.6'; });
}
(function(){
  if(typeof renderEmpresa === 'function'){
    const _r = renderEmpresa;
    renderEmpresa = function(){ empInact = { doc: null, info: null }; const x = _r.apply(this, arguments); empCargarInactiva().then(empAplicarBloqueo); return x; };
  }
  if(typeof renderEmpOverview === 'function'){
    const _o = renderEmpOverview;
    renderEmpOverview = function(){ const x = _o.apply(this, arguments); empAplicarBloqueo(); return x; };
  }
  if(typeof saveEmpresaMonth === 'function'){
    const _s = saveEmpresaMonth;
    saveEmpresaMonth = async function(){
      if(empInact.doc === state.documento && empInact.info && empInact.info.inactiva){ toast('Práctica inactiva: la planilla está bloqueada y no se puede modificar.', true); return; }
      return _s.apply(this, arguments);
    };
  }
})();

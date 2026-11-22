/* ===== PRÁCTICA FINALIZADA: al terminar, la práctica queda inactiva (solo lectura). La base de datos también lo exige (etapa 70). ===== */
const pfE = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function pfFecha(f){ if(!f) return ''; const p = String(f).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : f; }

function pfBanner(rec, admin){
  const fin = rec.practicaFin ? ' Fecha final: <b>' + pfE(pfFecha(rec.practicaFin)) + '</b>.' : '';
  return '<div id="pfBanner" style="margin:10px 0;padding:12px 14px;border:1px solid #D9B3B3;background:#FBEDED;border-radius:10px;color:#7A2E2E;">' +
    '<b>🔒 Práctica finalizada</b> — ya no se pueden cambiar notas, firmas ni datos; todo se puede ver y descargar.' + fin +
    (admin ? '' : ' Si crees que es un error, escribe a Servicio al estudiante por el chat de la aplicación.') + '</div>';
}
function pfBloquear(idPantalla){
  const sc = document.getElementById(idPantalla); if(!sc) return;
  sc.classList.add('pf-bloq');
  sc.querySelectorAll('input, textarea, select').forEach(el => { if(el.type !== 'hidden') el.disabled = true; });
  sc.querySelectorAll('button.primary, button.btn-save, [data-pf-guardar]').forEach(b => { b.disabled = true; b.title = 'Práctica finalizada'; });
  sc.querySelectorAll('canvas').forEach(c => { c.style.pointerEvents = 'none'; c.style.opacity = '.7'; });
}
function pfAplicar(idPantalla, adminBox){
  const rec = state && state.record; if(!rec || !rec.practicaFinalizada) return;
  const sc = document.getElementById(idPantalla); if(!sc) return;
  const old = document.getElementById('pfBanner'); if(old) old.remove();
  sc.insertAdjacentHTML('afterbegin', pfBanner(rec, false));
  pfBloquear(idPantalla);
}
(function(){
  [['renderEmpresa', 'screen-empresa'], ['renderEstudiante', 'screen-estudiante']].forEach(([fn, id]) => {
    if(typeof window[fn] !== 'function') return;
    const orig = window[fn];
    window[fn] = function(){ const r = orig.apply(this, arguments); try{ setTimeout(() => pfAplicar(id), 60); }catch(_){} return r; };
  });
  // Los botones de navegación entre meses no deben quedar desactivados: se vuelven a aplicar solo a lo editable
  const css = document.createElement('style');
  css.textContent = '.pf-bloq .month-pill,.pf-bloq .tab{pointer-events:auto;} .pf-bloq input:disabled,.pf-bloq textarea:disabled{opacity:.75;cursor:not-allowed;}';
  document.head.appendChild(css);
})();

/* ===== Administrador: estado y botones Finalizar / Reabrir en la ficha del estudiante ===== */
async function pfAdminPintar(){
  const box = document.getElementById('admResumen'); if(!box || !state || !state.record) return;
  let d = null;
  try{ const { data, error } = await sb.rpc('admin_practica_estado', { p_documento: state.documento }); if(error) return; d = data; }catch(_){ return; }
  if(!d) return;
  let w = document.getElementById('pfAdmin');
  if(!w){ w = document.createElement('div'); w.id = 'pfAdmin'; box.insertAdjacentElement('beforebegin', w); }
  const origen = d.origen === 'manual' ? 'finalizada a mano' : d.origen === 'fecha' ? 'finalizada por fecha' : d.origen === 'reabierta' ? 'reabierta a mano' : '';
  const info = d.fecha_fin ? 'Fecha final: <b>' + pfE(pfFecha(d.fecha_fin)) + '</b> (con ' + d.gracia_dias + ' días de gracia hasta el <b>' + pfE(pfFecha(d.hasta)) + '</b>). ' : 'Esta práctica no tiene fecha final registrada: se finaliza solo a mano. ';
  const mot = d.motivo ? '<br><span class="helptext">Último cambio: ' + pfE(d.por || '') + ' · ' + pfE(pfFecha(d.en)) + ' · «' + pfE(d.motivo) + '»</span>' : '';
  w.innerHTML = '<div class="card" style="margin:10px 0;border-left:4px solid ' + (d.finalizada ? '#B24A4A' : '#3E8E5A') + ';">' +
    '<b>' + (d.finalizada ? '🔒 Práctica FINALIZADA' : '🟢 Práctica activa') + '</b>' + (origen ? ' <span class="aud-ref">(' + origen + ')</span>' : '') +
    '<p class="helptext" style="margin:6px 0;">' + info + (d.finalizada ? 'Nadie puede cambiar notas, firmas ni datos (empresa, profesor, estudiante).' : 'Al llegar la fecha final más los días de gracia, se finaliza sola.') + mot + '</p>' +
    (d.finalizada ? '<button class="ghost" onclick="pfAdminMarcar(\'activa\')">Reabrir práctica</button>' : '<button class="ghost" onclick="pfAdminMarcar(\'finalizada\')">Finalizar práctica</button>') + '</div>';
}
async function pfAdminMarcar(estado){
  const txt = estado === 'finalizada' ? 'Finalizar la práctica: nadie podrá cambiar notas ni datos.' : 'Reabrir la práctica: se podrán volver a cambiar notas y datos.';
  const m = prompt(txt + '\n\nEscribe el motivo (mínimo 5 letras):'); if(m == null) return;
  if(m.trim().length < 5){ toast('Escribe el motivo (mínimo 5 letras)', true); return; }
  const { error } = await sb.rpc('admin_practica_marcar', { p_documento: state.documento, p_estado: estado, p_motivo: m.trim() });
  if(error){ toast(error.message, true); return; }
  toast(estado === 'finalizada' ? 'Práctica finalizada' : 'Práctica reabierta'); pfAdminPintar();
}
(function(){
  if(typeof renderAdministrador !== 'function') return;
  const o = renderAdministrador;
  renderAdministrador = async function(){ const r = await o.apply(this, arguments); pfAdminPintar(); return r; };
})();

/* ============================= AVISO DE PLAZOS (calendario fijo) =============================
   Muestra, en la pantalla del estudiante y de la empresa, qué plazos hay y si hoy están abiertos.
   Los plazos los valida la base de datos (calendario-plazos-etapa59.sql); esto solo informa. Si el SQL no se ha ejecutado, no muestra nada. */
(function(){
  const esc2 = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const fila = (ok, txt) => '<li style="margin:3px 0;">' + (ok ? '🟢' : '🔴') + ' ' + txt + ' <b>' + (ok ? 'abierto hoy' : 'cerrado hoy') + '</b></li>';
  async function pintar(pantallaId, items){
    try{
      const pant = document.getElementById(pantallaId); if(!pant || typeof sb === 'undefined' || !sb) return;
      const r = await sb.rpc('plazos_hoy'); if(r.error || !r.data) return;
      const p = r.data; let caja = document.getElementById('plazosAviso-' + pantallaId);
      if(!caja){ caja = document.createElement('div'); caja.id = 'plazosAviso-' + pantallaId; caja.className = 'card'; caja.style.cssText = 'margin-bottom:12px;border-left:4px solid var(--orange,#E8792D);'; pant.insertBefore(caja, pant.firstChild); }
      caja.innerHTML = '<div style="font-weight:700;margin-bottom:4px;">📅 Calendario de plazos</div><ul style="margin:0;padding-left:4px;list-style:none;font-size:13.5px;">' + items(p).join('') + '</ul>' +
        '<div class="helptext" style="margin-top:6px;">Estas fechas son fijas cada mes. Si te quedó algo pendiente fuera del plazo, comunícate con la institución.</div>';
    }catch(_){}
  }
  window.plazosPintar = function(){
    const est = document.getElementById('screen-estudiante'), emp = document.getElementById('screen-empresa');
    if(est && est.classList.contains('active')) pintar('screen-estudiante', p=>[
      fila(p.pnr_registro, 'Prácticas no remuneradas · registro de documentos (27 al 2 del mes siguiente; con pendientes por corregir, hasta el 10):'),
      fila(p.rap_rlp, 'Prácticas RAP y RLP · registro de documentos (1 al 10 de cada mes):'),
      fila(p.contrato, 'Contrato de aprendizaje · formalización, envío del contrato firmado (1 al 10 de cada mes):')]);
    if(emp && emp.classList.contains('active')) pintar('screen-empresa', p=>[
      fila(p.notas_empresa, 'Registro de notas de la planilla (27 de cada mes al 2 del mes siguiente):')]);
  };
  if(typeof showScreen === 'function'){
    const _s = showScreen;
    showScreen = function(){ const r = _s.apply(this, arguments); setTimeout(window.plazosPintar, 300); return r; };
  }
  setInterval(()=>{ if(!document.hidden) window.plazosPintar(); }, 3600000);
})();

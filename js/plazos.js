/* ============================= AVISO DE PLAZOS (calendario fijo) =============================
   Muestra, en la pantalla del estudiante y de la empresa, qué plazos hay y si hoy están abiertos.
   Los plazos los valida la base de datos (calendario-plazos-etapa59.sql); esto solo informa. Si el SQL no se ha ejecutado, no muestra nada. */
(function(){
  const esc2 = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const fila = (ok, txt) => '<li style="margin:3px 0;">' + (ok ? '🟢' : '🔴') + ' ' + txt + ' <b>' + (ok ? 'abierto hoy' : 'cerrado hoy') + '</b></li>';
  /* Ventana emergente: se abre una vez por sesión y por día en cada pantalla, se cierra con ✕, «Entendido», clic afuera o Esc, y se puede volver a abrir con el botón «📅 Plazos». */
  const datos = {};
  function cerrar(){ const m = document.getElementById('plazosModal'); if(m) m.remove(); }
  function abrir(pantallaId){
    const d = datos[pantallaId]; if(!d) return; cerrar();
    const m = document.createElement('div'); m.id = 'plazosModal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Calendario de plazos');
    m.style.cssText = 'position:fixed;inset:0;z-index:2200;background:rgba(10,30,32,.55);display:flex;align-items:center;justify-content:center;padding:16px;';
    m.innerHTML = '<div style="background:#fff;border-radius:14px;max-width:560px;width:100%;max-height:88vh;overflow:auto;padding:18px 20px;border-top:5px solid var(--orange,#E8792D);box-shadow:0 18px 50px rgba(0,0,0,.35);position:relative;">' +
      '<button type="button" id="plazosX" aria-label="Cerrar" style="position:absolute;top:8px;right:10px;border:0;background:transparent;font-size:22px;cursor:pointer;line-height:1;">✕</button>' +
      '<div style="font-weight:700;font-size:17px;margin:0 28px 8px 0;">📅 Calendario de plazos</div><ul style="margin:0;padding-left:4px;list-style:none;font-size:14px;">' + d.join('') + '</ul>' +
      '<div class="helptext" style="margin-top:8px;">Estas fechas son fijas cada mes. Si te quedó algo pendiente fuera del plazo, comunícate con la institución.</div>' +
      '<div class="actions-row" style="margin-top:12px;"><button type="button" class="primary" id="plazosOk">Entendido</button></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', ev=>{ if(ev.target === m) cerrar(); });
    m.querySelector('#plazosX').onclick = cerrar; const ok = m.querySelector('#plazosOk'); ok.onclick = cerrar; ok.focus();
  }
  document.addEventListener('keydown', ev=>{ if(ev.key === 'Escape') cerrar(); });
  function boton(pantallaId){
    let b = document.getElementById('plazosBtn');
    const lugar = document.querySelector('#pmSide .pm-nav');
    if(b && b.dataset.p === pantallaId && b.isConnected) return;
    if(b) b.remove();
    if(!lugar) return;
    b = document.createElement('button'); b.type = 'button'; b.id = 'plazosBtn'; b.className = 'pm-it'; b.dataset.p = pantallaId;
    b.innerHTML = '<span class="pmu-emo">📅</span><span class="t">Plazos</span>'; b.onclick = ()=>abrir(pantallaId);
    lugar.insertAdjacentElement('afterend', b);
  }
  async function pintar(pantallaId, items){
    try{
      const pant = document.getElementById(pantallaId); if(!pant || typeof sb === 'undefined' || !sb) return;
      const r = await sb.rpc('plazos_hoy'); if(r.error || !r.data) return;
      datos[pantallaId] = items(r.data);
      const old = document.getElementById('plazosAviso-' + pantallaId); if(old) old.remove();   // versión anterior (tarjeta fija)
      boton(pantallaId);
      const clave = 'plazos-' + pantallaId + '-' + new Date().toISOString().slice(0, 10); let visto = false;
      try{ visto = sessionStorage.getItem(clave) === '1'; sessionStorage.setItem(clave, '1'); }catch(_){}
      if(!visto) abrir(pantallaId);
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
  setInterval(()=>{ ['screen-estudiante', 'screen-empresa'].forEach(id=>{ const el = document.getElementById(id); if(datos[id] && el && el.classList.contains('active')) boton(id); }); }, 1500);
})();

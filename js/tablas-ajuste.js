/* ============================= TABLAS AJUSTADAS A LA PANTALLA =============================
   Envuelve cada tabla en un marco con desplazamiento lateral (solo si no cabe) para que nunca se salga de su tarjeta ni
   deforme la página. Vigila también las tablas que la plataforma dibuja después. No cambia datos ni el funcionamiento de las tablas. */
(function(){
  const SALTAR = 'ficha-table';                       // tablas de formato fijo (ficha) que ya se adaptan solas
  function yaEnvuelta(t){
    const p = t.parentElement; if(!p) return true;
    if(p.classList.contains('tbl-wrap') || p.classList.contains('cupos-wrap')) return true;
    if(t.closest('table') !== t) return true;         // tabla dentro de otra tabla
    const cs = getComputedStyle(p); if(/(auto|scroll)/.test(cs.overflowX)) return true;
    if(t.classList.contains(SALTAR) || t.closest('.pdf-oculto,[data-no-ajuste]')) return true;
    return false;
  }
  function envolver(t){
    if(t.tagName !== 'TABLE' || yaEnvuelta(t)) return;
    const w = document.createElement('div'); w.className = 'tbl-wrap'; w.setAttribute('role', 'region'); w.tabIndex = 0;
    t.parentNode.insertBefore(w, t); w.appendChild(t);
  }
  function barrer(raiz){
    try{ (raiz.querySelectorAll ? raiz.querySelectorAll('table') : []).forEach(envolver); if(raiz.tagName === 'TABLE') envolver(raiz); }catch(_){}
  }
  let pendiente = false;
  const mo = new MutationObserver(()=>{ if(pendiente) return; pendiente = true; requestAnimationFrame(()=>{ pendiente = false; barrer(document.body); }); });
  function iniciar(){ barrer(document.body); mo.observe(document.body, { childList:true, subtree:true }); }
  if(document.body) iniciar(); else document.addEventListener('DOMContentLoaded', iniciar);
})();

/* ============================= MENÚ PARA CELULAR =============================
   En pantallas angostas (≤ 900 px) el menú lateral se convierte en una barra superior con el botón «☰ Menú» y el nombre de la sección
   actual. Al pulsarlo se abre un menú a pantalla completa, con opciones grandes en lista vertical (fáciles de tocar). Se cierra al elegir
   una opción, con la ✕, con la tecla Esc o al girar a pantalla grande. En computador no cambia nada: el menú sigue a la izquierda.
   Se carga DESPUÉS de panel-moderno.js / panel-moderno-usuarios.js y necesita panel-moderno-todo.css. Sin datos ni permisos: solo presentación. */
(function(){
  const mq = window.matchMedia ? window.matchMedia('(max-width:900px)') : null;
  function lado(){ return document.getElementById('pmSide'); }
  function abrir(v){
    const s = lado(); if(!s) return;
    document.body.classList.toggle('pm-abierto', !!v);
    const b = s.querySelector('.pm-burger'); if(b){ b.setAttribute('aria-expanded', v ? 'true' : 'false'); b.setAttribute('aria-label', v ? 'Cerrar menú' : 'Abrir menú'); const t = b.querySelector('.pm-bg-t'); if(t) t.textContent = v ? 'Cerrar' : 'Menú'; }
    if(v){ const a = s.querySelector('.pm-nav .pm-it.act') || s.querySelector('.pm-nav .pm-it'); if(a && a.scrollIntoView) setTimeout(()=>a.scrollIntoView({ block:'center' }), 60); }
  }
  function montar(){
    const s = lado(); if(!s) return;
    if(!s.querySelector('.pm-bar-m')){
      const bar = document.createElement('div'); bar.className = 'pm-bar-m';
      bar.innerHTML = '<button type="button" class="pm-burger" aria-label="Abrir menú" aria-expanded="false"><span class="pm-bg-ico" aria-hidden="true"><i></i><i></i><i></i></span><span class="pm-bg-t">Menú</span></button><div class="pm-tit-m"></div>';
      s.insertBefore(bar, s.firstChild);
      bar.querySelector('.pm-burger').onclick = ()=>abrir(!document.body.classList.contains('pm-abierto'));
      s.addEventListener('click', ev=>{
        if(!document.body.classList.contains('pm-abierto')) return;
        if(ev.target.closest('.pm-nav .pm-it, #pmSide > .pm-it, #plazosBtn')) setTimeout(()=>abrir(false), 90);
      }, true);   // en captura: el menú se repinta al elegir y el botón pulsado deja de existir
    }
    const act = s.querySelector('.pm-nav .pm-it.act .t'), tit = s.querySelector('.pm-tit-m');
    const txt = act ? act.textContent.trim() : '';
    if(tit && tit.textContent !== txt) tit.textContent = txt;
  }
  document.addEventListener('keydown', ev=>{ if(ev.key === 'Escape' && document.body.classList.contains('pm-abierto')) abrir(false); });
  if(mq){ const f = ()=>{ if(!mq.matches) abrir(false); }; if(mq.addEventListener) mq.addEventListener('change', f); else if(mq.addListener) mq.addListener(f); }
  setInterval(()=>{ try{ montar(); if(!lado()) document.body.classList.remove('pm-abierto'); }catch(_){} }, 500);
})();

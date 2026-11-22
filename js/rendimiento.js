/* Rendimiento · temporizadores rápidos que se detienen cuando la pestaña está oculta.
   Varias partes de la plataforma «vigilan» la pantalla cada 0,5 a 2,5 segundos (menú, campana, contador de personas en línea…).
   Esto hace dos cosas, sin cambiar lo que ve el usuario:
     1) Si la pestaña está en segundo plano, esos temporizadores no hacen nada (ahorra procesador, batería y datos).
     2) Ningún temporizador interno corre más seguido que cada 1 segundo.
   No toca los temporizadores de 5 segundos o más (sesión, presencia, chat externo, etc.). No lee ni envía datos.
   Debe cargarse ANTES que los demás scripts (va primero en el HTML). */
(function(){
  if(window.__rendimientoTimers) return; window.__rendimientoTimers = true;
  const nativo = window.setInterval.bind(window);
  window.setInterval = function(fn, ms){
    const args = Array.prototype.slice.call(arguments, 2);
    if(typeof fn !== 'function' || typeof ms !== 'number' || ms > 5000) return nativo.apply(null, arguments);
    const cada = ms < 1000 ? 1000 : ms;
    return nativo(function(){
      if(document.hidden) return;
      return fn.apply(this, args);
    }, cada);
  };
})();

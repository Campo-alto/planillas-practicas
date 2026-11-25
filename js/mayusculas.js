/* Mayúsculas automáticas en los formularios de inscripción (solicitud de acceso, preinscripción, solicitud de práctica,
   hoja de vida de contrato de aprendizaje, registro de empresa y solicitudes de aprendices).
   Se convierte lo que se escribe, pega o autocompleta. NO toca correos, contraseñas, sitios web, fechas, números, archivos ni casillas. */
(function(){
  'use strict';
  // Campos (por id) que se pasan a mayúsculas
  var INCLUIR = /^(sol-|sp-|hv-|rg|of|ne-|ins-o-)/;
  // Campos que nunca se convierten (correos, claves, web, honeypot…)
  var EXCLUIR_ID = /(correo|email|mail|pass|clave|web|url|link|token|-w$|^sol-w)/i;
  var TIPOS_NO = /^(email|password|url|date|time|number|file|checkbox|radio|hidden|submit|button|color|range|search)$/i;

  function aplica(el){
    if(!el || !el.tagName) return false;
    var t = el.tagName;
    if(t !== 'INPUT' && t !== 'TEXTAREA') return false;
    if(t === 'INPUT' && TIPOS_NO.test(el.type || 'text')) return false;
    if(el.hasAttribute('data-no-mayus') || el.readOnly || el.disabled) return false;
    var id = el.id || '';
    if(EXCLUIR_ID.test(id)) return false;
    if(el.getAttribute('autocomplete') === 'username' || el.getAttribute('autocomplete') === 'email') return false;
    if(id && INCLUIR.test(id)) return true;
    if(!id && el.closest && el.closest('.ca-fila')) return true;   // filas de formación, cursos y experiencia
    return false;
  }
  function convertir(el){
    var v = el.value;
    if(!v) return;
    var u = v.toLocaleUpperCase('es');
    if(u === v) return;
    var a = null, b = null;
    try{ a = el.selectionStart; b = el.selectionEnd; }catch(e){}
    el.value = u;
    try{ if(a !== null) el.setSelectionRange(a, b); }catch(e){}
  }
  // Fase de captura: corre antes que los oninput de cada campo, que ya leen el valor en mayúsculas
  document.addEventListener('input', function(ev){ if(aplica(ev.target)) convertir(ev.target); }, true);
  document.addEventListener('focusin', function(ev){ if(aplica(ev.target)) convertir(ev.target); }, true);
  document.addEventListener('change', function(ev){ if(aplica(ev.target)) convertir(ev.target); }, true);

  // Formularios que se pintan ya con datos en minúscula: se convierten al aparecer
  function barrer(raiz){
    if(!raiz || !raiz.querySelectorAll) return;
    var l = raiz.querySelectorAll('input,textarea');
    for(var i = 0; i < l.length; i++){
      if(aplica(l[i]) && l[i].value){
        convertir(l[i]);
        // mantiene sincronizados los datos de los oninput (hoja de vida)
        try{ l[i].dispatchEvent(new Event('input', { bubbles:true })); }catch(e){}
      }
    }
  }
  var pend = false;
  new MutationObserver(function(ms){
    if(pend) return; pend = true;
    setTimeout(function(){ pend = false; for(var i = 0; i < ms.length; i++){ for(var j = 0; j < ms[i].addedNodes.length; j++){ var n = ms[i].addedNodes[j]; if(n.nodeType === 1) barrer(n); } } }, 60);
  }).observe(document.documentElement, { childList:true, subtree:true });
})();

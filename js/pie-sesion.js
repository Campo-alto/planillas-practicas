/* ============================= BARRA DE SESIÓN AL PIE =============================
   En Estudiante, Empresa y Supervisor (y el portal de contrato de aprendizaje) la barra con
   "Editando como … · Documento …", "Cambiar contraseña / Cambiar estudiante" y "Cerrar sesión"
   se muestra al final de la pantalla. Solo mueve el elemento: los botones siguen igual. */
(function(){
  function alPie(id){
    const scr = document.getElementById(id); if(!scr) return;
    scr.querySelectorAll(':scope > .status-strip').forEach(b=>{
      b.classList.add('pie');
      if(scr.lastElementChild !== b) scr.appendChild(b);
    });
  }
  const _show = showScreen;
  showScreen = function(id){ _show(id); try{ alPie(id); }catch(e){} };
  document.querySelectorAll('.screen').forEach(s=>{ if(s.id) alPie(s.id); });
})();

/* ============================= MOSTRAR/OCULTAR CONTRASEÑA ============================= */
const EYE_OPEN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a18.7 18.7 0 015.06-5.94M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 7 11 7a18.6 18.6 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
function togglePw(id, btn){
  const input = document.getElementById(id);
  if(!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.innerHTML = show ? EYE_OFF_SVG : EYE_OPEN_SVG;
  btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
}
function initPwToggles(){
  document.querySelectorAll('.pw-toggle').forEach(btn=>{
    btn.innerHTML = EYE_OPEN_SVG;
    btn.onclick = ()=> togglePw(btn.getAttribute('data-target'), btn);
  });
}

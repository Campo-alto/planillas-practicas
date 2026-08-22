/* ============================= TOAST ============================= */
let toastTimer;
function toast(msg, isError){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#B23A2E' : '#0B3D3D';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2600);
}

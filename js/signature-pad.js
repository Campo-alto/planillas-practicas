/* ============================= STATE ============================= */
window.addEventListener('error', function(e){
  console.error('Error no controlado:', e.error || e.message);
});
window.addEventListener('unhandledrejection', function(e){
  console.error('Promesa rechazada sin controlar:', e.reason);
});


/* ============================= SIGNATURE PAD ============================= */
function initSigPad(id, dataUrl, readOnly){
  const canvas = document.getElementById(id);
  if(!canvas) return;
  // Espera a que el navegador termine de acomodar el layout (importante cuando
  // el canvas vive dentro de una tabla, que puede tardar más de un frame) antes
  // de medir su ancho real — si se mide muy pronto, el ancho sale en 0 y el
  // lienzo queda sin superficie para dibujar.
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      setupSigPad(canvas, id, dataUrl, readOnly);
    });
  });
}
function setupSigPad(canvas, id, dataUrl, readOnly){
  const ratio = window.devicePixelRatio || 1;
  let rect = canvas.getBoundingClientRect();
  if(rect.width < 10){
    // Todavía sin layout válido — reintenta una vez más un poco después.
    setTimeout(()=>setupSigPad(canvas, id, dataUrl, readOnly), 120);
    return;
  }
  canvas.width = rect.width * ratio;
  canvas.height = 130 * ratio;
  canvas.style.touchAction = 'none';
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0B3D3D';
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const state_ = {drawing:false, empty:true, lastX:0, lastY:0};
  sigPads[id] = {canvas, ctx, s: state_};
  canvas.style.opacity = readOnly ? '0.6' : '1';
  canvas.style.cursor = readOnly ? 'not-allowed' : 'crosshair';

  function pos(e){
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return {x: t.clientX - r.left, y: t.clientY - r.top};
  }
  function start(e){ if(readOnly) return; e.preventDefault(); const p = pos(e); state_.drawing = true; state_.lastX = p.x; state_.lastY = p.y; }
  function move(e){
    if(readOnly || !state_.drawing) return;
    e.preventDefault();
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(state_.lastX, state_.lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
    state_.lastX = p.x; state_.lastY = p.y; state_.empty = false;
    updateSigStatus(id);
  }
  function end(){ state_.drawing = false; }
  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);
  canvas.addEventListener('touchstart', start, {passive:false});
  canvas.addEventListener('touchmove', move, {passive:false});
  canvas.addEventListener('touchend', end);

  if(dataUrl){
    const img = new Image();
    img.onload = ()=>{ ctx.drawImage(img,0,0, rect.width, 130); state_.empty = false; updateSigStatus(id); };
    img.src = dataUrl;
  } else {
    updateSigStatus(id);
  }
}
function clearSig(id){
  const p = sigPads[id]; if(!p) return;
  p.ctx.clearRect(0,0,p.canvas.width,p.canvas.height);
  p.s.empty = true;
  updateSigStatus(id);
}
function updateSigStatus(id){
  const el = document.getElementById(id+'-status');
  if(!el) return;
  const p = sigPads[id];
  if(p && !p.s.empty){ el.textContent = 'Firmado'; el.classList.add('ok'); }
  else { el.textContent = 'Sin firmar'; el.classList.remove('ok'); }
}
function sigDataUrl(id){
  const p = sigPads[id];
  if(!p || p.s.empty) return null;
  return p.canvas.toDataURL('image/png');
}

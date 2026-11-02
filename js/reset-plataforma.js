/* ============================= REINICIAR PLATAFORMA (uso excepcional) =============================
   Solo aparece si el SERVIDOR lo permite (app_config.reset_habilitado = 'true'). Para ocultarlo/bloquearlo:
     update app_config set value = 'false' where key = 'reset_habilitado';
   Seguridad: la función SQL valida que seas administrador, que esté habilitado y la frase exacta; todo ocurre en una transacción. */
let rpBackupOk = false;

// Se llama al abrir el área "Administración": agrega la tarjeta solo si el servidor lo permite
window.rpMostrarTarjeta = async function(){
  try{
    if(typeof sb === 'undefined' || !sb) return;
    const { data } = await sb.rpc('admin_reset_habilitado');
    const grid = document.querySelector('#screen-admin-grupo .pg-funciones');
    if(data !== true || !grid || document.getElementById('rpCard')) return;
    const c = document.createElement('div'); c.className = 'role-card rp-card'; c.id = 'rpCard'; c.setAttribute('role','button'); c.tabIndex = 0;
    c.onclick = rpAbrir; c.onkeydown = e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); rpAbrir(); } };
    c.innerHTML = '<div class="icon" style="background:var(--danger)">⚠</div><h3>Reiniciar plataforma</h3><p>Borra los datos para empezar de cero. Exige copia de seguridad y confirmación. Uso excepcional.</p>';
    grid.appendChild(c);
  }catch(e){ console.warn('reset:', e); }
};

function rpPantalla(html){
  let el = document.getElementById('screen-admin-reset');
  if(!el){ const hub = document.getElementById('screen-admin-hub'); el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-reset'; hub.parentNode.appendChild(el); }
  el.innerHTML = html; return el;
}
function rpAbrir(){
  rpBackupOk = false;
  rpPantalla(`<button class="linkbtn" onclick="pgAbrirGrupo('administracion')">← Volver a Administración</button>
    <h2 style="margin:12px 0 4px;color:var(--danger)">Reiniciar plataforma</h2>
    <div class="note-box" style="background:#FBEAE7;border-color:#F0C4BD;color:#8F2A20;margin:10px 0 16px;"><b>Acción irreversible.</b> Los datos borrados no se pueden recuperar desde la aplicación. Antes de continuar descarga la copia de seguridad. Nunca se borran: administradores, programas, modalidades ni el historial de auditoría.</div>
    <div class="card" style="border-color:#E4C3BE;">
      <div class="section-bar" style="background:var(--danger);">1 · ¿Qué quieres borrar?</div>
      <label class="rp-op"><input type="radio" name="rpAlcance" value="estudiantes" checked onchange="rpValidar()"><span><b>Solo datos de estudiantes</b><br><small>Estudiantes, notas, firmas, asignaciones, accesos de estudiantes y contrato de aprendizaje (inscripciones y procesos). Se liberan los cupos. <b>Se conservan</b> empresas, cupos, supervisores y cuentas de empresa.</small></span></label>
      <label class="rp-op"><input type="radio" name="rpAlcance" value="completo" onchange="rpValidar()"><span><b>Toda la plataforma</b><br><small>Lo anterior <b>y además</b> empresas, cupos, empresas de contrato de aprendizaje, solicitudes, y las cuentas de empresa y de supervisor. Queda lista para empezar desde cero.</small></span></label>
      <div class="section-bar" style="background:var(--danger);margin-top:18px;">2 · Copia de seguridad (obligatoria)</div>
      <p class="helptext">Descarga todos los datos en un archivo JSON (completo) y un Excel (para consultar). Guárdalos en un lugar seguro. Además, si tu plan de Supabase lo incluye, verifica que tengas respaldo automático.</p>
      <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" id="rpBtnBackup" onclick="rpRespaldar()">⬇ Descargar copia de seguridad</button><span id="rpBackupEstado" class="helptext" style="margin:0"></span></div>
      <div class="section-bar" style="background:var(--danger);margin-top:18px;">3 · Confirmación</div>
      <div class="field" style="max-width:420px"><label>Escribe exactamente: <b>REINICIAR PLATAFORMA</b></label><input id="rpFrase" autocomplete="off" oninput="rpValidar()"></div>
      <label class="lista-chk" style="margin:6px 0 12px"><input type="checkbox" id="rpEntiendo" onchange="rpValidar()"> Entiendo que esta acción no se puede deshacer.</label>
      <div id="rpMsg" style="margin:6px 0;font-size:13.5px;"></div>
      <div class="actions-row"><button class="danger" id="rpBtnReset" onclick="rpEjecutar()" disabled>Reiniciar ahora</button></div>
    </div>`);
  showScreen('screen-admin-reset');
}
function rpAlcance(){ const r = document.querySelector('input[name="rpAlcance"]:checked'); return r ? r.value : 'estudiantes'; }
function rpValidar(){
  const ok = rpBackupOk && (document.getElementById('rpFrase').value === 'REINICIAR PLATAFORMA') && document.getElementById('rpEntiendo').checked;
  document.getElementById('rpBtnReset').disabled = !ok;
}

async function rpRespaldar(){
  const btn = document.getElementById('rpBtnBackup'), est = document.getElementById('rpBackupEstado');
  btn.disabled = true; est.textContent = 'Recopilando datos…';
  try{
    const tomar = async (nombre, fn)=>{ try{ const r = await fn(); if(r && r.error) throw r.error; return (r && r.data) || []; }catch(e){ console.warn('respaldo', nombre, e); return { _error: String(e.message||e) }; } };
    const D = {
      generado: new Date().toISOString(),
      estudiantes: await tomar('students', ()=>sb.from('students').select('*')),
      asignaciones: await tomar('asig', ()=>sb.rpc('admin_list_asignaciones')),
      empresas_y_cupos: await tomar('empresas', ()=>sb.from('empresas_practica').select('*, cupos_empresa(*)')),
      cuentas_empresa_supervisor: await tomar('cuentas', ()=>sb.rpc('admin_list_role_accounts')),
      ca_inscripciones: await tomar('ca1', ()=>sb.rpc('admin_ca_inscripciones')),
      ca_empresas: await tomar('ca2', ()=>sb.rpc('admin_ca_empresas')),
      ca_solicitudes: await tomar('ca3', ()=>sb.rpc('admin_ca_ofertas')),
      ca_procesos: await tomar('ca4', ()=>sb.rpc('admin_ca_postulaciones')),
      programas: await tomar('prog', ()=>sb.from('programas').select('*')),
      modalidades: await tomar('mod', ()=>sb.from('modalidades').select('*'))
    };
    const fallos = Object.keys(D).filter(k=>D[k] && D[k]._error);
    if(fallos.some(k=>k==='estudiantes')){ throw new Error('No se pudo leer la tabla de estudiantes: ' + D.estudiantes._error); }
    const sello = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    // JSON completo
    const blob = new Blob([JSON.stringify(D, null, 1)], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'respaldo-planillas-' + sello + '.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
    // Excel (una hoja por tabla)
    if(window.XLSX){
      const wb = XLSX.utils.book_new();
      const plano = v => v==null ? '' : (typeof v === 'object' ? JSON.stringify(v) : v);
      const celda = v => { v = plano(v); if(typeof v === 'string'){ if(v.length > 32000) v = v.slice(0, 32000) + '…'; return (typeof ieSafe==='function') ? ieSafe(v) : v; } return v; };
      Object.keys(D).forEach(k=>{
        const rows = Array.isArray(D[k]) ? D[k] : [];
        if(!rows.length) return;
        const cols = Array.from(rows.reduce((s,r)=>{ Object.keys(r).forEach(c=>s.add(c)); return s; }, new Set()));
        const aoa = [cols].concat(rows.map(r=>cols.map(c=>celda(r[c]))));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), k.slice(0,31));
      });
      XLSX.writeFile(wb, 'respaldo-planillas-' + sello + '.xlsx');
    }
    rpBackupOk = true;
    est.innerHTML = '✅ Copia descargada (' + (D.estudiantes.length||0) + ' estudiantes).' + (fallos.length ? ' <span style="color:var(--danger)">No se pudo leer: ' + fallos.join(', ') + '.</span>' : '');
  }catch(e){ console.error(e); rpBackupOk = false; est.innerHTML = '<span style="color:var(--danger)">No se pudo generar la copia: ' + esc(e.message||e) + '. No se puede continuar sin ella.</span>'; }
  btn.disabled = false; rpValidar();
}

async function rpEjecutar(){
  const alcance = rpAlcance();
  const txt = alcance === 'completo' ? 'TODA LA PLATAFORMA (estudiantes, empresas, cupos, cuentas)' : 'los DATOS DE ESTUDIANTES';
  if(!confirm('ÚLTIMA CONFIRMACIÓN\n\nVas a borrar ' + txt + '.\nEsto NO se puede deshacer.\n\n¿Continuar?')) return;
  const btn = document.getElementById('rpBtnReset'), msg = document.getElementById('rpMsg');
  btn.disabled = true; msg.innerHTML = '<span style="color:var(--muted)">Reiniciando…</span>';
  try{
    const { data, error } = await sb.rpc('admin_reset_plataforma', { p_frase: document.getElementById('rpFrase').value, p_alcance: alcance });
    if(error) throw new Error(error.message);
    adminStudentsCache = []; if(typeof empresasCache !== 'undefined') empresasCache = [];
    const b = (data && data.borrados) || {};
    msg.innerHTML = '<div class="note-box" style="background:#EAF6F0;border-color:#BFE3D0;color:#1E6B4A;">✅ Plataforma reiniciada (' + esc(alcance) + '). Borrados: ' +
      esc(Object.keys(b).filter(k=>b[k]>0).map(k=>k.replace(/_/g,' ') + ': ' + b[k]).join(' · ') || 'no había datos') + '.</div>';
    rpBackupOk = false; toast('Plataforma reiniciada');
  }catch(e){ msg.innerHTML = '<span style="color:var(--danger)">' + esc(e.message) + '</span>'; btn.disabled = false; }
}

/* ============================= CALENDARIO DE PLAZOS (administrador) =============================
   Pantalla donde el administrador pone las fechas de apertura y cierre de cada plazo: registro de documentos de prácticas no remuneradas,
   RAP y RLP, formalización del contrato de aprendizaje y notas de la empresa. Requiere plazos-configurables-etapa62.sql.
   Seguridad: solo el rol Administrador (lo exige la base de datos); la página nunca escribe en la tabla directamente. */
const PLZ_DEF = [
  { clave:'pnr_registro',   t:'Prácticas no remuneradas · registro de documentos', q:'Estudiantes (modalidad general)' },
  { clave:'pnr_pendientes', t:'Prácticas no remuneradas · completar pendientes',   q:'Estudiantes con documentos devueltos o por completar' },
  { clave:'rap_rlp',        t:'RAP y RLP · registro de documentos',               q:'Reconocimiento de aprendizajes previos y del lugar de prácticas' },
  { clave:'contrato',       t:'Contrato de aprendizaje · formalización',           q:'Envío del contrato firmado (incluye convenio)' },
  { clave:'notas_empresa',  t:'Registro de notas de la planilla',                  q:'Empresas que califican a sus practicantes' }
];
let plzDatos = null;
function plzPantalla(){
  let el = document.getElementById('screen-admin-plazos');
  if(!el){
    const ref = document.getElementById('screen-admin-hub') || document.querySelector('.screen'); if(!ref) return null;
    el = document.createElement('div'); el.className = 'screen'; el.id = 'screen-admin-plazos'; ref.parentNode.appendChild(el);
  }
  return el;
}
async function abrirPlazosAdmin(){
  if(typeof requireSupabase === 'function' && !requireSupabase()) return;
  const el = plzPantalla(); if(!el) return;
  el.innerHTML = '<p style="color:var(--muted)">Cargando…</p>'; showScreen('screen-admin-plazos');
  const { data, error } = await sb.rpc('admin_plazos_listar');
  if(error){
    el.innerHTML = '<button class="linkbtn" onclick="showScreen(\'screen-admin-hub\')">← Volver al panel</button><p style="color:var(--danger)">No se pudo cargar: ' + esc(error.message) + ' (¿ejecutaste plazos-configurables-etapa62.sql?)</p>';
    return;
  }
  plzDatos = data; plzPintar();
}
function plzFmt(x){ if(!x) return ''; const p = String(x).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
function plzPintar(){
  const el = plzPantalla(); if(!el || !plzDatos) return;
  const dias = sel => { let o = ''; for(let i = 1; i <= 31; i++) o += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + i + '</option>'; return o; };
  const filas = PLZ_DEF.map(d=>{
    const c = (plzDatos.plazos || []).find(x=>x.clave === d.clave) || { dia_ini:1, dia_fin:10, modo:'calendario', abierto:false };
    const cruza = Number(c.dia_ini) > Number(c.dia_fin);
    return '<tr data-c="' + d.clave + '"><td class="plz-n"><b>' + esc(d.t) + '</b><br><span class="aud-ref">' + esc(d.q) + '</span></td>' +
      '<td class="plz-e">' + (c.abierto ? '<span class="pill" style="background:#E6F4EA;color:#1E6B3A;">🟢 Abierto hoy</span>' : '<span class="pill" style="background:#F6E3E0;color:var(--danger);">🔴 Cerrado hoy</span>') + '</td>' +
      '<td><select id="plz-i-' + d.clave + '" aria-label="Día de apertura">' + dias(Number(c.dia_ini)) + '</select></td>' +
      '<td><select id="plz-f-' + d.clave + '" aria-label="Día de cierre">' + dias(Number(c.dia_fin)) + '</select>' + (cruza ? '<br><span class="aud-ref">cruza al mes siguiente</span>' : '') + '</td>' +
      '<td><select id="plz-m-' + d.clave + '" aria-label="Modo"><option value="calendario"' + (c.modo === 'calendario' ? ' selected' : '') + '>Según el calendario</option><option value="abierto"' + (c.modo === 'abierto' ? ' selected' : '') + '>Abierto ahora (sin fechas)</option><option value="cerrado"' + (c.modo === 'cerrado' ? ' selected' : '') + '>Cerrado ahora (sin fechas)</option></select></td>' +
      '<td><input type="date" id="plz-d-' + d.clave + '" value="' + (c.extra_desde ? String(c.extra_desde).slice(0, 10) : '') + '" aria-label="Ampliación desde"> <input type="date" id="plz-h-' + d.clave + '" value="' + (c.extra_hasta ? String(c.extra_hasta).slice(0, 10) : '') + '" aria-label="Ampliación hasta"></td>' +
      '<td><button class="primary" onclick="plzGuardar(\'' + d.clave + '\', this)">Guardar</button>' + (c.por ? '<br><span class="aud-ref">Último cambio: ' + esc(c.por) + '</span>' : '') + '</td></tr>';
  }).join('');
  el.innerHTML = '<button class="linkbtn" onclick="showScreen(\'screen-admin-hub\')">← Volver al panel</button>' +
    '<h2 style="margin:12px 0 4px;">Calendario de plazos</h2>' +
    '<p class="helptext" style="text-align:justify;">Aquí defines <b>cuándo se abre y cuándo se cierra</b> cada plazo. Los estudiantes y las empresas solo pueden registrar dentro de estas fechas; tú, como administrador, siempre puedes resolver excepciones desde su ficha. Hoy es <b>' + esc(plzFmt(plzDatos.hoy)) + '</b> (hora de Colombia).</p>' +
    '<div class="note-box" style="margin:8px 0 12px;"><b>Cómo funciona:</b> <b>Apertura</b> y <b>cierre</b> son días del mes (se repiten cada mes). Si la apertura es mayor que el cierre (por ejemplo 27 → 2), el plazo cruza al mes siguiente. ' +
    '<b>Abierto ahora / Cerrado ahora</b> abre o cierra el plazo de inmediato, ignorando las fechas (úsalo para una excepción y vuelve a «Según el calendario» al terminar). ' +
    '<b>Ampliación puntual</b> abre el plazo entre dos fechas exactas (por ejemplo del 14 al 20 de este mes) sin cambiar el calendario normal.</div>' +
    '<div class="cupos-wrap"><table class="cupos-table plz-tabla"><thead><tr><th>Plazo</th><th>Hoy</th><th>Apertura (día)</th><th>Cierre (día)</th><th>Modo</th><th>Ampliación puntual (desde — hasta)</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div>' +
    '<div id="plzMsg" style="font-size:13px;margin-top:8px;"></div>';
}
async function plzGuardar(clave, btn){
  const g = id => document.getElementById(id), msg = g('plzMsg');
  const ini = Number(g('plz-i-' + clave).value), fin = Number(g('plz-f-' + clave).value), modo = g('plz-m-' + clave).value;
  const d = g('plz-d-' + clave).value || null, h = g('plz-h-' + clave).value || null;
  if((d && !h) || (!d && h)){ msg.innerHTML = '<span style="color:var(--danger)">Para la ampliación puntual escribe las dos fechas (desde y hasta), o deja ambas vacías.</span>'; return; }
  const nombre = (PLZ_DEF.find(x=>x.clave === clave) || {}).t || clave;
  if(!confirm('¿Guardar el plazo «' + nombre + '»?\n\n' + (modo === 'abierto' ? 'Quedará ABIERTO ahora, sin importar las fechas.' : modo === 'cerrado' ? 'Quedará CERRADO ahora, sin importar las fechas.' : 'Se abre el día ' + ini + ' y se cierra el día ' + fin + (ini > fin ? ' del mes siguiente' : '') + ' de cada mes.') + (d ? '\nAmpliación puntual: del ' + plzFmt(d) + ' al ' + plzFmt(h) + '.' : ''))) return;
  btn.disabled = true;
  const { data, error } = await sb.rpc('admin_plazos_guardar', { p_clave: clave, p_dia_ini: ini, p_dia_fin: fin, p_modo: modo, p_extra_desde: d, p_extra_hasta: h });
  btn.disabled = false;
  if(error){ msg.innerHTML = '<span style="color:var(--danger)">' + esc(error.message) + '</span>'; return; }
  toast('Plazo guardado: hoy está ' + (data && data.abierto ? 'abierto' : 'cerrado') + '.');
  abrirPlazosAdmin();
}

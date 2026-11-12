/* ===== CARTA DE FECHAS · CONTRATO DE APRENDIZAJE =====
   Se solicita después de la entrevista (cuando la empresa selecciona al estudiante).
   Las cuatro fechas (etapa lectiva y productiva) las define solo la institución.
   Usa pdf-lib (PDFLib) y los helpers de carta.js. */
const CARTA_FECHAS_FIRMA = ['Yaneth Gomez', 'Coordinadora de Prácticas', 'Campoalto Acesalud S.A.S', 'PBX 7441441 Ext. 1224.', 'gestionpracticas@campoalto.edu.co'];

/* Firma editable (la define el administrador). Si no se puede leer, se usa la de arriba. */
let cartaFirmaCache = null;
async function cartaFirmaCargar(forzar){
  if(cartaFirmaCache && !forzar) return cartaFirmaCache;
  try{
    const { data, error } = await sb.rpc('carta_firma_obtener');
    if(!error && data && data.nombre){ cartaFirmaCache = [data.nombre, data.cargo, data.institucion, data.telefono, data.correo]; return cartaFirmaCache; }
  }catch(e){}
  return CARTA_FECHAS_FIRMA;
}

async function generarCartaFechasPdf(d){
  const firma = await cartaFirmaCargar();
  const { PDFDocument, StandardFonts, rgb, setWordSpacing } = PDFLib;
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const imgH = await pdf.embedJpg(Uint8Array.from(atob(CARTA_HEADER_B64), c=>c.charCodeAt(0)));
  const imgF = await pdf.embedJpg(Uint8Array.from(atob(CARTA_FOOTER_B64), c=>c.charCodeAt(0)));
  const negro = rgb(0,0,0), L = cartaLimpiar;
  const p = pdf.addPage([595, 842]);
  p.drawImage(imgH, { x: 20, y: 708.33, width: 592, height: 83.67 });
  p.drawImage(imgF, { x: 20, y: 13.73, width: 592, height: 71.27 });
  const X = 66, W = 460.6, SZ = 10;
  const txt = (t, x, y, size)=>{ t = L(t); if(t) p.drawText(t, { x, y, size: size || SZ, font, color: negro }); };
  const centrado = (t, cx, y)=>{ t = L(t); p.drawText(t, { x: cx - font.widthOfTextAtSize(t, SZ) / 2, y, size: SZ, font, color: negro }); };
  const parrafo = (texto, y)=>{                          // párrafo justificado; devuelve la y siguiente
    const lineas = cartaEnvolver(font, L(texto), SZ, 1.036, 462);
    lineas.forEach((ln, i)=>{
      const esp = (ln.match(/ /g) || []).length;
      const ws = (i < lineas.length - 1 && esp) ? Math.max(0, (W - font.widthOfTextAtSize(ln, SZ)) / esp) : 0;
      if(ws){ p.pushOperators(setWordSpacing(ws)); }
      p.drawText(ln, { x: X, y, size: SZ, font, color: negro });
      if(ws){ p.pushOperators(setWordSpacing(0)); }
      y -= 15.4;
    });
    return y;
  };

  const hoy = d.fecha || new Date();
  const fechaTxt = MESES_ES[hoy.getMonth()].toLowerCase() + ' ' + String(hoy.getDate()).padStart(2, '0') + ', ' + hoy.getFullYear();
  txt('Bogotá D.C.', X, 689.5);
  txt(fechaTxt, X + W - font.widthOfTextAtSize(L(fechaTxt), SZ), 689.5);
  txt('Señores', X, 650);
  txt(cartaTitulo(d.empresa), X, 634);
  txt(d.ciudad || 'Bogotá D.C', X, 618);

  let y = 585;
  y = parrafo('Campoalto Acesalud SAS con NIT. 830.015.970-6 presenta al estudiante ' + cartaTitulo(d.nombre) + ' identificado(a) con C.C. No. ' + d.documento +
              ' quien cursa estudios en nuestra institución en el programa de Técnico laboral por competencias en ' + cartaTitulo(d.programa) +
              ', quien inicia prácticas con su empresa en la modalidad de ' + (cartaTitulo(d.modalidad) || 'Contrato de Aprendizaje') + '.', y);
  y -= 14;
  y = parrafo('Solicitamos notificar al estudiante que cuenta con 30 días calendario a partir de la fecha de firma del contrato para legalizar su práctica en la institución, ' +
              'entregando en físico en Campoalto el formato lista de chequeo para prácticas, los documentos de la misma y la copia del contrato de aprendizaje; de no realizar este proceso ' +
              'su práctica no será válida en la Institución. Así mismo debe asistir a la institución en los cortes mensuales según cronograma de prácticas y reportar su correspondiente calificación.', y);
  y -= 16;
  txt('Las fechas de la firma del contrato son:', X, y);

  // Tabla de etapas
  const x0 = 100, w1 = 150, w2 = 170, rh = 24; let ty = y - 14;
  const caja = (x, top, w, h)=> p.drawRectangle({ x, y: top - h, width: w, height: h, borderColor: negro, borderWidth: 0.8 });
  [['Etapa lectiva', d.lectiva_ini, d.lectiva_fin], ['Etapa productiva', d.prod_ini, d.prod_fin]].forEach(([nom, a, b])=>{
    caja(x0, ty, w1, rh * 2); caja(x0 + w1, ty, w2, rh); caja(x0 + w1, ty - rh, w2, rh);
    centrado(nom, x0 + w1 / 2, ty - rh - 4);
    centrado(cartaFechaCorta(a), x0 + w1 + w2 / 2, ty - 16); centrado(cartaFechaCorta(b), x0 + w1 + w2 / 2, ty - rh - 16);
    ty -= rh * 2;
  });
  y = ty - 30;
  txt('Cordialmente,', X, y);
  y -= 60;
  firma.forEach((ln, i)=>{ txt(ln, X, y - i * 14); });

  pdf.setTitle('Carta de fechas ' + d.documento);
  pdf.setAuthor('Politécnico Campoalto');
  return await pdf.save();
}
async function descargarCartaFechas(d){
  if(typeof PDFLib === 'undefined'){ toast('No cargó la librería de PDF (revisa tu conexión o bloqueador).', true); return; }
  try{
    const bytes = await generarCartaFechasPdf(Object.assign({ fecha: new Date() }, d));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = 'carta-fechas-' + d.documento + '.pdf';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 4000);
  }catch(e){ console.error(e); toast('No se pudo generar la carta: ' + e.message, true); }
}

/* ---------- Interfaz (empresa e institución) ---------- */
let caCartasEmp = {}, caCartasAdm = {}, caCartasOk = true;
const caF = iso => iso ? cartaFechaCorta(iso) : '—';
function caCartaEmpHtml(p){
  if(!['seleccionado','contratado'].includes(p.estado)) return '';
  if(!caCartasOk) return '<span class="ca-oculto">Función no disponible todavía (falta ejecutar el SQL de la etapa 16).</span>';
  const c = caCartasEmp[p.id];
  if(!c) return `<div class="ca-carta"><p>Ya seleccionaste a este estudiante. Solicita la carta de fechas del contrato.</p><button class="primary" onclick="caCartaSolicitar('${p.id}')">Solicitar carta de fechas</button></div>`;
  return `<div class="ca-carta">
    <div class="ca-carta-fila"><span>Etapa lectiva</span><b>${c.lectiva_ini ? caF(c.lectiva_ini)+' a '+caF(c.lectiva_fin) : 'Pendiente: la define la institución'}</b></div>
    <div class="ca-carta-fila"><span>Etapa productiva</span><b>${c.prod_ini ? caF(c.prod_ini)+' a '+caF(c.prod_fin) : 'Pendiente: la define la institución'}</b></div>
    <div class="ca-carta-acc">${c.lista ? `<button class="primary" onclick="caCartaDescargar('${p.id}', false)">📄 Descargar carta (PDF)</button>` : '<small class="ca-oculto">Las fechas las define la institución; la carta se podrá descargar cuando estén las 4.</small>'}</div></div>`;
}
function caCartaAdmHtml(x){
  if(!['seleccionado','contratado'].includes(x.estado)) return '';
  const c = caCartasAdm[x.id] || {};
  const estado = !caCartasAdm[x.id] ? 'La empresa aún no la ha solicitado' : (c.lista ? 'Lista para descargar' : 'Solicitada: faltan fechas por definir');
  const inp = (id, v) => `<input type="date" id="${id}-${x.id}" value="${esc(v||'')}">`;
  return `<div class="ca-carta"><div class="ca-carta-fila"><span>Estado</span><b>${estado}</b></div>
    <div class="ca-carta-fila"><span>Etapa lectiva</span><div class="ca-carta-fechas"><label>Inicio ${inp('caLi', c.lectiva_ini)}</label><label>Fin ${inp('caLf', c.lectiva_fin)}</label></div></div>
    <div class="ca-carta-fila"><span>Etapa productiva</span><div class="ca-carta-fechas"><label>Inicio ${inp('caPi', c.prod_ini)}</label><label>Fin ${inp('caPf', c.prod_fin)}</label></div></div>
    <div class="ca-carta-acc"><button class="primary" onclick="caCartaGuardarAdm('${x.id}')">Guardar fechas</button>${c.lista ? ` <button class="ghost" onclick="caCartaDescargar('${x.id}', true)">📄 Descargar carta (PDF)</button>` : ''}</div></div>`;
}
async function caCartaSolicitar(id){
  try{ await caRpc('ca_emp_carta_solicitar', { p_token: state.token, p_post: id }); toast('Carta solicitada. La institución definirá las fechas.'); caPintarProcesos(); }catch(e){ toast(e.message, true); }
}
async function caCartaGuardarAdm(id){
  const g = k => document.getElementById(k+'-'+id).value || null;
  try{ await caRpc('admin_ca_carta_guardar', { p_post: id, p_lect_ini: g('caLi'), p_lect_fin: g('caLf'), p_prod_ini: g('caPi'), p_prod_fin: g('caPf') }); toast('Fechas guardadas'); caAdmPintar(); }catch(e){ toast(e.message, true); }
}
async function caCartaDescargar(id, admin){
  try{
    const d = admin ? await caRpc('admin_ca_carta_datos', { p_post: id }) : await caRpc('ca_emp_carta_datos', { p_token: state.token, p_post: id });
    await descargarCartaFechas(d);
  }catch(e){ toast(e.message, true); }
}


/* ---------- Administrador: editar firma y teléfono de la carta ---------- */
async function abrirFirmaCarta(){
  if(!requireSupabase()) return;
  const f = await cartaFirmaCargar(true);
  const v = i => esc(f[i] || '');
  const old = document.getElementById('cfModal'); if(old) old.remove();
  const m = document.createElement('div'); m.id = 'cfModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  m.innerHTML = `<div class="card" style="max-width:460px;width:100%;max-height:92vh;overflow:auto;">
    <div class="section-bar deep">Firma y teléfono de la carta de fechas</div>
    <p class="helptext" style="text-align:justify;">Lo que escribas aquí sale impreso al pie de <b>todas</b> las cartas de fechas que se generen desde ahora (empresas, convenios e institución).</p>
    <label>Nombre de quien firma<input id="cfNom" maxlength="80" value="${v(0)}"></label>
    <label>Cargo<input id="cfCar" maxlength="80" value="${v(1)}"></label>
    <label>Institución<input id="cfIns" maxlength="80" value="${v(2)}"></label>
    <label>Teléfono<input id="cfTel" maxlength="60" value="${v(3)}"></label>
    <label>Correo<input id="cfCor" type="email" maxlength="120" value="${v(4)}"></label>
    <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
      <button class="ghost" onclick="document.getElementById('cfModal').remove()">Cancelar</button>
      <button class="primary" id="cfGuardar" onclick="guardarFirmaCarta()">Guardar</button></div></div>`;
  document.body.appendChild(m);
}
async function guardarFirmaCarta(){
  const g = id => document.getElementById(id).value;
  const b = document.getElementById('cfGuardar'); b.disabled = true;
  const { error } = await sb.rpc('admin_carta_firma_guardar', { p_nombre: g('cfNom'), p_cargo: g('cfCar'), p_institucion: g('cfIns'), p_telefono: g('cfTel'), p_correo: g('cfCor') });
  b.disabled = false;
  if(error){ toast(error.message, true); return; }
  cartaFirmaCache = null; await cartaFirmaCargar(true);
  document.getElementById('cfModal').remove();
  toast('Firma y teléfono actualizados. Las próximas cartas saldrán con estos datos.');
}

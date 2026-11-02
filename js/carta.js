/* ===== CARTA DE PRESENTACIÓN (PDF) =====
   Réplica del modelo oficial de Campoalto: mismas posiciones, tipo de letra, tabla y encabezado/pie.
   Solo cambian los datos variables. Usa pdf-lib (global PDFLib). Medidas en puntos, origen abajo-izquierda (A4: 595 x 842). */
const CARTA = {
  W_JUST: 460.6,        // ancho al que se justifica el primer párrafo
  ESCALA_ENVOLVER: 1.036, // el modelo corta las líneas con una métrica ~3.6% más ancha que Helvetica 10
  ANCHO_ENVOLVER: 462,
  ANCHO_REQ: 462,
  INTERLINEA_P1: 15.4625,
  INTERLINEA_REQ: 11.635,
  Y_MIN_P1: 95          // por debajo de esto empieza el pie de página
};
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function cartaFechaCorta(iso){            // 'YYYY-MM-DD' → 'DD/MM/AAAA'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : (iso || '');
}
function cartaFechaImpresion(d){
  const p = n => String(n).padStart(2, '0');
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
}
// Deja solo caracteres que la fuente estándar (WinAnsi) puede dibujar
function cartaLimpiar(t){
  return String(t == null ? '' : t).replace(/[\r\n\t]+/g, ' ').replace(/[^ -~¡-ÿ]/g, '');
}
function cartaEnvolver(font, texto, size, escala, ancho){
  const palabras = texto.split(' '), lineas = []; let actual = '';
  palabras.forEach(p=>{
    const prueba = actual === '' && lineas.length >= 0 && actual.length === 0 ? p : actual + ' ' + p;
    if(actual !== '' && font.widthOfTextAtSize(prueba, size) * escala > ancho){ lineas.push(actual); actual = p; }
    else actual = prueba;
  });
  if(actual !== '' || !lineas.length) lineas.push(actual);
  return lineas;
}

/* datos: { fecha:Date, contacto, empresa, direccion, telefono, estudiante, documento, programa,
            inicio:'YYYY-MM-DD', fin:'YYYY-MM-DD', horario, jornada, requisitos } */
async function generarCartaPdf(d){
  const { PDFDocument, StandardFonts, rgb, setCharacterSpacing, setWordSpacing } = PDFLib;
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const imgH = await pdf.embedJpg(Uint8Array.from(atob(CARTA_HEADER_B64), c=>c.charCodeAt(0)));
  const imgF = await pdf.embedJpg(Uint8Array.from(atob(CARTA_FOOTER_B64), c=>c.charCodeAt(0)));
  const negro = rgb(0,0,0);
  const L = cartaLimpiar;

  const nuevaPagina = () => {
    const p = pdf.addPage([595, 842]);
    p.drawImage(imgH, { x: 20, y: 708.33, width: 592, height: 83.67 });
    p.drawImage(imgF, { x: 20, y: 13.73, width: 592, height: 71.27 });
    return p;
  };
  const txt = (p, t, x, y, size, maxW) => {
    t = L(t); if(!t) return;
    let s = size || 10;
    if(maxW) while(s > 5 && font.widthOfTextAtSize(t, s) > maxW) s -= 0.25;
    p.drawText(t, { x, y, size: s, font, color: negro });
  };
  const txtEspaciado = (p, t, x, y, tw, tc) => {   // texto con espaciado de palabra y de carácter (justificado)
    p.pushOperators(setWordSpacing(tw), setCharacterSpacing(tc));
    p.drawText(t, { x, y, size: 10, font, color: negro });
    p.pushOperators(setWordSpacing(0), setCharacterSpacing(0));
  };

  /* ---------- página 1 ---------- */
  const p1 = nuevaPagina();
  const impresion = d.fecha || new Date();
  txt(p1, 'Bogotá,', 352, 689.5);
  txt(p1, impresion.getDate() + ' ' + MESES_ES[impresion.getMonth()] + '     ' + impresion.getFullYear(), 388, 688.5);
  txt(p1, 'Ref:', 69, 669.47);
  txt(p1, d.documento + '-' + cartaFechaImpresion(impresion), 90, 669.47);
  txt(p1, 'Señor(a):', 69, 634.47);
  txt(p1, String(d.contacto || '').toUpperCase(), 69, 618.47, 10, 460);
  txt(p1, String(d.empresa || '').toUpperCase(), 69, 601.47, 10, 460);
  txt(p1, 'Dirección:', 69, 586.47);
  txt(p1, d.direccion, 124, 586.47, 10, 400);
  txt(p1, 'Teléfono:', 69, 569.47);
  txt(p1, d.telefono, 129, 569.47, 10, 400);
  txt(p1, 'L.C', 69, 553.47);

  // Párrafo principal (justificado)
  const parrafo = L('CAMPOALTO ACESALUD SAS con NIT. 830.015.970-6, presenta al estudiante ' + String(d.estudiante || '').toUpperCase() +
    '  identificado con C.C. No ' + d.documento + ' quien actualmente cursan estudios en nuestra institución en el programa de   ' +
    String(d.programa || '').toUpperCase() + ', quien inicia prácticas con su empresa en la modalidad de pasantía no remunerada. ');
  const lineasP = cartaEnvolver(font, parrafo.replace(/ +$/, ''), 10, CARTA.ESCALA_ENVOLVER, CARTA.ANCHO_ENVOLVER);
  let y = 527.47, ultTw = 0, ultTc = 0;
  lineasP.forEach((ln, i)=>{
    if(i < lineasP.length - 1){
      const nat = font.widthOfTextAtSize(ln, 10);
      const esp = (ln.match(/ /g) || []).length;
      const tw = Math.max(0, (CARTA.W_JUST - nat) / (esp + 0.4 * ln.length));
      ultTw = tw; ultTc = 0.4 * tw;
    }
    txtEspaciado(p1, ln, 66, y, ultTw, ultTc);
    y -= CARTA.INTERLINEA_P1;
  });
  const shift = (lineasP.length - 5) * CARTA.INTERLINEA_P1;   // lo de abajo baja si el párrafo ocupa más de 5 líneas
  const Y = v => v - shift;

  txt(p1, 'El estudiante deberá hacer entrega de la presente carta como soporte de ingreso a la empresa,', 66, Y(420.5));
  txt(p1, 'asistir a los cortes mensuales según cronograma entregado y traer su correspondiente', 66, Y(406.49));
  txt(p1, 'La información de la asignación es la siguiente:', 69, Y(380.5));

  // Tabla de asignación
  const azul = rgb(0.74902, 0.88235, 1), blanco = rgb(1,1,1);
  const cols = [[66,148],[148,229],[229,308],[308,499]];
  const yTop = Y(356), yMid = Y(315), yBot = Y(274);
  cols.forEach(([x0,x1])=>{
    p1.drawRectangle({ x: x0, y: yMid, width: x1 - x0, height: yTop - yMid, color: azul });
    p1.drawRectangle({ x: x0, y: yBot, width: x1 - x0, height: yMid - yBot, color: blanco });
  });
  const linea = (x0,y0,x1,y1,t) => p1.drawLine({ start:{x:x0,y:y0}, end:{x:x1,y:y1}, thickness:t, color: negro });
  cols.forEach(([x0,x1])=>{
    [[yTop,yMid],[yMid,yBot]].forEach(([a,b])=>{
      linea(x0 - 0.25, a, x1 + 0.25, a, 0.5); linea(x0, a + 0.25, x0, b - 0.25, 0.5);
      linea(x0 - 0.25, b, x1 + 0.25, b, 0.5); linea(x1, a + 0.25, x1, b - 0.25, 0.5);
    });
  });
  linea(65.5, yTop, 499.5, yTop, 1); linea(66, yTop + 0.5, 66, yBot - 0.5, 1);
  linea(65.5, yBot, 499.5, yBot, 1); linea(499, yTop + 0.5, 499, yBot - 0.5, 1);

  const centrado = (t, cx, y, size) => {
    t = L(t); if(!t) return; let s = size;
    while(s > 5 && font.widthOfTextAtSize(t, s) > 76) s -= 0.25;
    p1.drawText(t, { x: cx - font.widthOfTextAtSize(t, s) / 2, y, size: s, font, color: negro });
  };
  centrado('FECHA DE INICIO', 109.5, Y(338.38), 8);
  centrado('FECHA DE', 191.0, Y(338.38), 8); centrado('FINALIZACIÓN', 190.88, Y(329.07), 8);
  centrado('HORARIO', 270.5, Y(338.38), 8);
  txt(p1, 'JORNADA', 370, Y(341.38), 8);
  centrado(cartaFechaCorta(d.inicio), 109.5, Y(296.4), 8);
  centrado(cartaFechaCorta(d.fin), 191.0, Y(296.4), 8);
  centrado(String(d.horario || '').toUpperCase(), 270.5, Y(296.4), 8);
  { const t = L(String(d.jornada || '').toUpperCase()); let s = 8;
    while(s > 5 && font.widthOfTextAtSize(t, s) > 180) s -= 0.25;
    p1.drawText(t, { x: 400.0 - font.widthOfTextAtSize(t, s) / 2, y: Y(298.4), size: s, font, color: negro }); }

  // Requisitos (de la empresa; en mayúsculas como el modelo)
  txt(p1, 'Requisitos:', 66, Y(244.47));
  const req = L(String(d.requisitos || '').toUpperCase()).trim();
  const lineasR = req ? cartaEnvolver(font, req, 10, 1, CARTA.ANCHO_REQ) : [];
  let yr = Y(223.5), pag2 = [];
  lineasR.forEach(ln=>{
    if(yr >= CARTA.Y_MIN_P1){ txt(p1, ln, 66, yr); yr -= CARTA.INTERLINEA_REQ; }
    else pag2.push(ln);
  });

  /* ---------- página 2 ---------- */
  const p2 = nuevaPagina();
  let y2 = 684.5;
  pag2.forEach(ln=>{ p2.drawText(ln, { x: 66, y: y2, size: 10, font, color: negro }); y2 -= CARTA.INTERLINEA_REQ; });
  const off = pag2.length ? (684.5 - y2) + 4 : 0;            // el cierre baja si hubo requisitos en la página 2
  const Z = v => v - off;
  txtEspaciado(p2, 'Cualquier tipo de modificación a ésta deberá ser informada por escrito a Campo alto y autorizada de la', 66, Z(684.5), 0.11847, 0.04739);
  txtEspaciado(p2, 'misma forma.', 66, Z(668.9), 0.11847, 0.04739);
  txt(p2, 'Gracias por su atención y colaboración,', 66, Z(637.71));
  txt(p2, 'Cordialmente,', 66, Z(606.52));
  txt(p2, 'COORDINACIÓN PRÁCTICAS', 66, Z(563.47));
  txt(p2, 'POLITÉCNICO CAMPOALTO', 66, Z(548.27));
  txt(p2, 'PBX: 7 44 441 Ext. 1215', 66, Z(533.06));
  txt(p2, 'coordinacionpracticas@campoalto.edu.co', 66, Z(517.85));
  txt(p2, 'Elaboró:', 66, Z(493.38), 8);
  txt(p2, 'SANDRA  ORJUELA HUERTAS', 110, Z(493.38), 8);

  pdf.setTitle('Carta de presentación ' + d.documento);
  pdf.setAuthor('Politécnico Campoalto');
  return await pdf.save();
}

async function descargarCartaPdf(d){
  if(typeof PDFLib === 'undefined'){ toast('No cargó la librería de PDF (revisa tu conexión o bloqueador).', true); return; }
  try{
    const bytes = await generarCartaPdf(Object.assign({ fecha: new Date() }, d));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = 'carta-presentacion-' + d.documento + '.pdf';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 4000);
  }catch(e){ console.error(e); toast('No se pudo generar la carta: ' + e.message, true); }
}

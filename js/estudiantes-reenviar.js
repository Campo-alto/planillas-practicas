/* ============================= REENVIAR ACCESO AL ESTUDIANTE =============================
   En «Buscar o registrar estudiante», cada fila tiene un botón ✉: genera una contraseña temporal NUEVA
   (la anterior no se puede ver ni reenviar porque se guarda cifrada), la guarda y la envía al correo del estudiante.
   Al entrar, el estudiante debe cambiarla. Solo funciona para administradores: usa las mismas funciones protegidas de siempre
   (admin_set_student_password) y la función de correo «enviar-correo». No requiere SQL nuevo ni redesplegar nada.
   Debe cargarse después de estudiantes-gestion.js y correos.js. */
(function(){
  if(typeof egDecorar !== 'function') return;
  const orig = egDecorar;
  window.egDecorar = egDecorar = function(){
    orig.apply(this, arguments);
    document.querySelectorAll('#lookupAdminList td.eg-acc').forEach(td=>{
      if(td.querySelector('.er-btn')) return;
      const tr = td.closest('tr'), doc = (typeof egDocDeFila === 'function') ? egDocDeFila(tr) : null; if(!doc) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost eg-btn er-btn';
      b.title = 'Reenviar acceso por correo (genera una contraseña nueva)'; b.textContent = '✉️';
      b.onclick = e=>{ e.stopPropagation(); erReenviar(doc, b); };
      td.insertBefore(b, td.querySelector('.eg-del'));
    });
  };
})();

async function erReenviar(doc, btn){
  const nombre = (typeof egNombre === 'function') ? egNombre(doc) : doc;
  let correo = '';
  try{
    const { data, error } = await sb.from('students').select('correo,nombre').eq('documento', doc).maybeSingle();
    if(error) throw error;
    correo = (data && data.correo || '').trim();
  }catch(e){ toast('No se pudo consultar el correo: ' + e.message, true); return; }
  if(!corEmailOk(correo)){
    toast('Este estudiante no tiene un correo válido. Corrígelo con ✏ (Modificar) o entrégale la clave desde su ficha.', true); return;
  }
  if(!confirm('Se generará una contraseña NUEVA para ' + nombre + ' (documento ' + doc + ') y se enviará a:\n' + correo + '\n\nLa contraseña anterior dejará de servir. ¿Continuar?')) return;
  if(btn) btn.disabled = true;
  const clave = generarClaveLocal();
  try{
    const { error } = await sb.rpc('admin_set_student_password', { p_documento: doc, p_password: clave });
    if(error) throw error;
  }catch(e){ toast('No se pudo crear la contraseña: ' + e.message, true); if(btn) btn.disabled = false; return; }
  try{
    const items = [{ to: correo, asunto: 'Tu acceso a la plataforma de prácticas', texto: corTextoClave(nombre, doc, clave, 'estudiante') }];
    const r = await correoEnviarItems('clave', items);
    if(!r.enviados) throw new Error((r.errores && r.errores[0] && (r.errores[0].error || r.errores[0])) || 'sin respuesta del servidor de correo');
    correoResultado(r);
  }catch(e){
    // La clave ya cambió: se muestra una sola vez para que el administrador la entregue de otra forma
    alert('El correo NO se pudo enviar (' + e.message + ').\n\nLa contraseña de ' + nombre + ' ya fue cambiada. Entrégasela por otro medio:\n\nUsuario: ' + doc + '\nContraseña temporal: ' + clave + '\n\nNo se volverá a mostrar.');
  }
  if(btn) btn.disabled = false;
}

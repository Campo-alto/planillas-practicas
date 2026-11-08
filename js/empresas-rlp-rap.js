/* ============================= DIRECTORIO DE EMPRESAS · RLP y RAP =============================
   Lista de solo lectura de los lugares de práctica que consiguieron los estudiantes de RLP y RAP: empresa, contacto, estudiante, supervisor,
   concepto de la visita y estado. Filtra por tipo, estado y texto; exporta a Excel y PDF. Requiere empresas-rlp-rap-etapa30.sql. */
let erFilas = [];
const ER_ET = { '':'Todos', pendiente:'Esperando visita', apto:'Apto (falta crear acceso)', confirmada:'Con acceso creado', coordinacion:'En coordinación', no_apto:'No apto', devuelta:'Devuelto', descartada:'Cerrado' };
const ER_CONC = { apto:'Apto', condiciones:'Apto con condiciones', no_apto:'No apto' };

async function abrirEmpresasRlpRap(){
  if(!requireSupabase()) return;
  const el = spaPantalla('screen-admin-emprlprap'); if(!el) return;
  el.innerHTML = `<button class="linkbtn" onclick="showScreen('screen-admin-hub')">← Volver al panel</button>
    <h2 style="margin:12px 0 4px;">Empresas de RLP y RAP</h2>
    <p class="helptext" style="text-align:justify;">Lugares de práctica que consiguieron los estudiantes de <b>RLP</b> y <b>RAP</b>, con el estudiante, el supervisor que los visita y el concepto de la visita. Es solo consulta; para crear accesos o decidir casos usa <b>Empresas por confirmar</b>.</p>
    <div class="card">
      <div class="aud-filtros">
        <div class="field"><label>Modalidad</label><select id="erTipo" onchange="erConsultar()"><option value="">RLP y RAP</option><option value="rlp">Solo RLP</option><option value="rap">Solo RAP</option></select></div>
        <div class="field"><label>Estado</label><select id="erEstado" onchange="erConsultar()">${Object.keys(ER_ET).map(k=>`<option value="${k}">${ER_ET[k]}</option>`).join('')}</select></div>
        <div class="field aud-ancho"><label>Buscar (empresa, NIT, estudiante o documento)</label><input type="search" id="erTexto" maxlength="80" onkeydown="if(event.key==='Enter')erConsultar()"></div>
      </div>
      <div class="actions-row" style="justify-content:flex-start;"><button class="ghost" onclick="erConsultar()">Consultar</button>
        <button class="ghost" onclick="erExportar('xlsx')">⬇ Excel</button><button class="ghost" onclick="erExportar('pdf')">⬇ PDF</button></div>
      <div id="erCuenta" class="lista-cuenta"></div>
      <div id="erLista"><p style="color:var(--muted)">Cargando…</p></div>
    </div>`;
  showScreen('screen-admin-emprlprap');
  erConsultar();
}
async function erConsultar(){
  const t = document.getElementById('erLista'); if(!t) return;
  const { data, error } = await sb.rpc('admin_empresas_rlp_rap', { p_tipo: document.getElementById('erTipo').value || null, p_estado: document.getElementById('erEstado').value || null, p_texto: document.getElementById('erTexto').value.trim() || null });
  if(error){ t.innerHTML = '<p style="color:var(--danger)">' + esc(error.message) + ' (¿ejecutaste empresas-rlp-rap-etapa30.sql?)</p>'; return; }
  erFilas = data || [];
  document.getElementById('erCuenta').textContent = erFilas.length + ' lugar(es)' + (erFilas.length >= 1000 ? ' (se muestran los 1000 más recientes)' : '');
  if(!erFilas.length){ t.innerHTML = '<p style="color:var(--muted);font-size:13.5px;">No hay empresas con ese filtro.</p>'; return; }
  t.innerHTML = `<div class="cupos-wrap"><table class="cupos-table"><thead><tr><th>Empresa</th><th>Tipo</th><th>Contacto</th><th>Correo / teléfono</th><th>Ciudad</th><th>Estudiante</th><th>Supervisor</th><th>Concepto</th><th>Estado</th></tr></thead><tbody>` +
    erFilas.map(f=>`<tr><td><b>${esc(f.empresa || '(sin nombre)')}</b>${f.nit ? '<br><span class="aud-ref">NIT ' + esc(f.nit) + '</span>' : ''}</td><td>${esc(f.tipo || '')}</td><td>${esc(f.contacto || '—')}</td>
      <td>${esc(f.correo || '—')}${f.telefono ? '<br>' + esc(f.telefono) : ''}</td><td>${esc(f.ciudad || '—')}</td>
      <td>${esc(f.estudiante || '')}<br><span class="aud-ref">${esc(f.documento)} · ${esc(f.programa || '')}</span></td><td>${esc(f.supervisor || '—')}</td>
      <td>${esc(ER_CONC[f.concepto] || '—')}</td><td>${esc(ER_ET[f.estado] || f.estado)}${f.tiene_acceso ? ' ✔' : ''}</td></tr>`).join('') + '</tbody></table></div>';
}
function erExportar(formato){
  if(!erFilas.length){ toast('No hay empresas para exportar', true); return; }
  const head = ['Empresa','NIT','Tipo','Contacto','Correo','Teléfono','Dirección','Ciudad','Estudiante','Documento','Programa','Supervisor','Concepto','Estado','Acceso creado'];
  const rows = erFilas.map(f=>[f.empresa || '', f.nit || '', f.tipo || '', f.contacto || '', f.correo || '', f.telefono || '', f.direccion || '', f.ciudad || '', f.estudiante || '', f.documento, f.programa || '', f.supervisor || '', ER_CONC[f.concepto] || '', ER_ET[f.estado] || f.estado, f.tiene_acceso ? 'Sí' : 'No']);
  if(formato === 'pdf') pdfTablaDescargar({ titulo:'Empresas de RLP y RAP', archivo:'empresas-rlp-rap', head, rows });
  else ieDescargarXlsx('empresas-rlp-rap', head, rows, 'Empresas', 'Empresas de RLP y RAP');
}

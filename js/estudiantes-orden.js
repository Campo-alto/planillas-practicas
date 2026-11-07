/* ============================= ORDENAR Y FILTRAR LA LISTA DE ESTUDIANTES =============================
   Barra «Ordenar y filtrar» sobre la lista de estudiantes registrados:
     • Ordenar por: nombre, último acceso, fecha de registro, última actualización, sede, programa, semestre, modalidad, empresa.
     • Filtrar por: sede, programa, modalidad, semestre, acceso (ya ingresaron / nunca) y rango de fechas de registro o de acceso.
   Excel y PDF exportan lo que se ve (ya ordenado y filtrado). Las fechas de acceso y registro requieren estudiantes-orden-etapa27.sql. */
const ord = { campo:'nombre', desc:false, sede:'', programa:'', modalidad:'', semestre:'', acceso:'', fechaDe:'registro', desde:'', hasta:'', abierto:false };
const ORD_CAMPOS = [['nombre','Nombre (A-Z)'], ['ultimo_acceso','Último acceso'], ['created_at','Fecha de registro'], ['updated_at','Última actualización'],
                    ['sede','Sede'], ['programa','Programa'], ['semestre','Semestre'], ['modalidad','Modalidad'], ['empresa','Empresa asignada']];

function ordT(v){ const t = v ? new Date(v).getTime() : NaN; return isNaN(t) ? null : t; }
function ordFecha(v){ const t = ordT(v); return t === null ? '—' : new Date(t).toLocaleString('es-CO', { timeZone:'America/Bogota', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
function ordActivos(){ return [ord.sede, ord.programa, ord.modalidad, ord.semestre, ord.acceso, ord.desde, ord.hasta].filter(Boolean).length + (ord.campo !== 'nombre' || ord.desc ? 1 : 0); }

/* Se aplica sobre la lista que ya filtra por texto y «solo con notas pendientes» */
(function(){
  if(typeof adminListaFiltrada !== 'function') return;
  const _f = adminListaFiltrada;
  adminListaFiltrada = function(){
    let list = _f.apply(this, arguments);
    if(ord.sede) list = list.filter(x=>(x.s.sede || '') === ord.sede);
    if(ord.programa) list = list.filter(x=>(x.s.programa || '') === ord.programa);
    if(ord.modalidad) list = list.filter(x=>(x.s.modalidad || '') === ord.modalidad);
    if(ord.semestre) list = list.filter(x=>(x.s.semestre || '') === ord.semestre);
    if(ord.acceso === 'si') list = list.filter(x=>ordT(x.s.ultimo_acceso) !== null);
    if(ord.acceso === 'no') list = list.filter(x=>ordT(x.s.ultimo_acceso) === null);
    const col = ord.fechaDe === 'acceso' ? 'ultimo_acceso' : 'created_at';
    const d = ord.desde ? new Date(ord.desde + 'T00:00:00-05:00').getTime() : null, h = ord.hasta ? new Date(ord.hasta + 'T23:59:59-05:00').getTime() : null;
    if(d !== null || h !== null) list = list.filter(x=>{ const t = ordT(x.s[col]); return t !== null && (d === null || t >= d) && (h === null || t <= h); });
    const val = x => ord.campo === 'empresa' ? x.empresa : x.s[ord.campo];
    const esFecha = ['ultimo_acceso','created_at','updated_at'].includes(ord.campo);
    const dir = ord.desc ? -1 : 1;
    // en fechas, «orden natural» = más reciente primero; los vacíos (nunca ingresó) siempre al final
    list = list.slice().sort((a, b)=>{
      if(esFecha){
        const ta = ordT(val(a)), tb = ordT(val(b));
        if(ta === null && tb === null) return String(a.s.nombre).localeCompare(String(b.s.nombre), 'es');
        if(ta === null) return 1; if(tb === null) return -1;
        return (tb - ta) * dir;
      }
      const c = String(val(a) || '').localeCompare(String(val(b) || ''), 'es', { numeric:true });
      return (c || String(a.s.nombre).localeCompare(String(b.s.nombre), 'es')) * dir;
    });
    return list;
  };
})();

function ordUnicos(campo){ return [...new Set((adminStudentsCache || []).map(s=>s[campo]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b), 'es', { numeric:true })); }
function ordSel(id, etiqueta, campo, actual){
  return `<div class="field"><label>${etiqueta}</label><select onchange="ord.${id}=this.value;renderAdminListTable()"><option value="">Todas</option>${ordUnicos(campo).map(v=>`<option value="${esc(v)}"${v === actual ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></div>`;
}
function ordLimpiar(){ Object.assign(ord, { campo:'nombre', desc:false, sede:'', programa:'', modalidad:'', semestre:'', acceso:'', fechaDe:'registro', desde:'', hasta:'' }); renderAdminListTable(); }

function ordDecorar(){
  const el = document.getElementById('lookupAdminList'); if(!el) return;
  const tabla = el.querySelector('table.lista-est'); const wrap = tabla ? tabla.parentNode : null;
  const ref = wrap || el.querySelector('.lista-cuenta'); if(!ref) return;
  const n = ordActivos();
  const caja = document.createElement('div'); caja.className = 'ord-caja';
  const conFechas = (adminStudentsCache || []).some(s=>s.created_at || s.ultimo_acceso);
  caja.innerHTML = `<div class="ord-top"><button class="ghost" onclick="ord.abierto=!ord.abierto;renderAdminListTable()">⇅ Ordenar y filtrar${n ? ' <span class="sa-badge">' + n + '</span>' : ''}</button>
      ${n ? '<button class="ghost" onclick="ordLimpiar()">Quitar orden y filtros</button>' : ''}</div>` + (!ord.abierto ? '' : `<div class="ord-panel">
      <div class="field-row">
        <div class="field"><label>Ordenar por</label><select onchange="ord.campo=this.value;renderAdminListTable()">${ORD_CAMPOS.map(([k,t])=>`<option value="${k}"${k === ord.campo ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label>Sentido</label><select onchange="ord.desc=this.value==='1';renderAdminListTable()"><option value="0"${ord.desc ? '' : ' selected'}>Normal (A-Z · más reciente primero)</option><option value="1"${ord.desc ? ' selected' : ''}>Inverso (Z-A · más antiguo primero)</option></select></div>
        ${ordSel('sede','Sede','sede',ord.sede)}${ordSel('programa','Programa','programa',ord.programa)}${ordSel('modalidad','Modalidad','modalidad',ord.modalidad)}${ordSel('semestre','Semestre','semestre',ord.semestre)}
        <div class="field"><label>Acceso a la plataforma</label><select onchange="ord.acceso=this.value;renderAdminListTable()"><option value="">Todos</option><option value="si"${ord.acceso === 'si' ? ' selected' : ''}>Ya ingresaron</option><option value="no"${ord.acceso === 'no' ? ' selected' : ''}>Nunca han ingresado</option></select></div>
        <div class="field"><label>Rango de fechas por</label><select onchange="ord.fechaDe=this.value;renderAdminListTable()"><option value="registro"${ord.fechaDe === 'registro' ? ' selected' : ''}>Fecha de registro</option><option value="acceso"${ord.fechaDe === 'acceso' ? ' selected' : ''}>Último acceso</option></select></div>
        <div class="field"><label>Desde</label><input type="date" value="${ord.desde}" onchange="ord.desde=this.value;renderAdminListTable()"></div>
        <div class="field"><label>Hasta</label><input type="date" value="${ord.hasta}" onchange="ord.hasta=this.value;renderAdminListTable()"></div>
      </div>${conFechas ? '' : '<div class="note-box">Las fechas de registro y de acceso aparecerán cuando ejecutes <b>estudiantes-orden-etapa27.sql</b>. El último acceso se llena desde el próximo ingreso de cada estudiante.</div>'}</div>`);
  ref.parentNode.insertBefore(caja, ref);
  if(tabla){ // columna «Último acceso» al final de cada fila
    const th = document.createElement('th'); th.textContent = 'Último acceso'; tabla.querySelector('thead tr').appendChild(th);
    tabla.querySelectorAll('tbody tr').forEach(tr=>{
      const m = /jumpToAdmin\('([^']+)'\)/.exec(tr.getAttribute('onclick') || ''); if(!m) return;
      const s = adminStudentsCache.find(x=>x.documento === m[1]); const td = document.createElement('td'); td.className = 'aud-nw';
      td.innerHTML = s && ordT(s.ultimo_acceso) !== null ? esc(ordFecha(s.ultimo_acceso)) : '<span style="color:var(--muted)">Nunca</span>';
      tr.appendChild(td);
    });
  }
}
(function(){
  if(typeof renderAdminListTable !== 'function') return;
  const _r = renderAdminListTable;
  renderAdminListTable = function(){
    const r = _r.apply(this, arguments);
    try{ ordDecorar(); }catch(e){ console.error(e); }
    return r;
  };
})();

/* ============================= ORDENAR Y FILTRAR LA LISTA DE ESTUDIANTES =============================
   Barra «Ordenar y filtrar» sobre la lista de estudiantes registrados:
     • Ordenar por: nombre, último acceso, fecha de registro, última actualización, sede, programa, semestre, modalidad, empresa.
     • Filtrar por: sede, programa, modalidad, semestre, acceso (ya ingresaron / nunca) y rango de fechas de registro o de acceso.
   Excel y PDF exportan lo que se ve (ya ordenado y filtrado). Las fechas de acceso y registro requieren estudiantes-orden-etapa27.sql. */
const ord = { campo:'nombre', desc:false, sede:'', programa:'', modalidad:'', semestre:'', acceso:'', fechaDe:'registro', desde:'', hasta:'', abierto:false };
const ORD_CAMPOS = [['nombre','Nombre (A-Z)'], ['ultimo_acceso','Último acceso'], ['created_at','Fecha de registro'], ['updated_at','Última actualización'],
                    ['sede','Sede'], ['programa','Programa'], ['semestre','Semestre'], ['modalidad','Modalidad'], ['empresa','Empresa asignada']];

const ORD_COL = new Intl.Collator('es', { numeric:true });
/* La búsqueda y los filtros se recuerdan mientras la pestaña siga abierta (también si se recarga) */
const ORD_KEY = 'cai_lista_est_v1', ORD_FLAG = 'cai_lista_est_dibujando';
// si la página se cerró a mitad de dibujar la lista, se descarta el filtro guardado para no repetir el problema
try{ if(sessionStorage.getItem(ORD_FLAG)){ sessionStorage.removeItem(ORD_FLAG); sessionStorage.removeItem(ORD_KEY); } }catch(_){}
// se redibuja DESPUÉS de que el menú desplegable termina su evento (redibujarlo en medio hace fallar a Safari)
function ordRender(){ setTimeout(()=>{ try{ renderAdminListTable(); }catch(e){ console.error(e); } }, 60); }
try{ const g = JSON.parse(sessionStorage.getItem(ORD_KEY) || 'null'); if(g){ Object.assign(ord, g.ord || {}); if(typeof g.b === 'string') adminStudentsBusqueda = g.b; if(g.solo) adminStudentsSoloPendientes = true; } }catch(_){}
function ordGuardar(){ try{ sessionStorage.setItem(ORD_KEY, JSON.stringify({ ord, b:adminStudentsBusqueda, solo:!!adminStudentsSoloPendientes })); }catch(_){} }
function ordT(v){ const t = v ? new Date(v).getTime() : NaN; return isNaN(t) ? null : t; }
let ORD_FMT = null;   // un solo formateador de fechas (crear uno por fila volvía lenta la página)
function ordFecha(v){ const t = ordT(v); if(t === null) return '—';
  try{ if(!ORD_FMT) ORD_FMT = new Intl.DateTimeFormat('es-CO', { timeZone:'America/Bogota', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); return ORD_FMT.format(new Date(t)); }
  catch(e){ return new Date(t).toISOString().slice(0,16).replace('T',' '); } }
function ordActivos(){ return [ord.sede, ord.programa, ord.modalidad, ord.semestre, ord.acceso, ord.desde, ord.hasta].filter(Boolean).length + (ord.campo !== 'nombre' || ord.desc ? 1 : 0); }

/* Se aplica sobre la lista que ya filtra por texto y «solo con notas pendientes» */
(function(){
  if(typeof adminListaFiltrada !== 'function') return;
  const _f = adminListaFiltrada;
  adminListaFiltrada = function(){
    let list = _f.apply(this, arguments);
    try{ return ordAplicar(list); }catch(e){ console.error('Ordenar/filtrar:', e); return list; }   // si algo falla, la lista se muestra completa en vez de romperse
  };
})();
function ordIgual(a, b){ return _norm(String(a == null ? '' : a)).trim() === _norm(String(b == null ? '' : b)).trim(); }
function ordAplicar(list){
  {
    if(ord.sede) list = list.filter(x=>ordIgual(x.s.sede, ord.sede));
    if(ord.programa) list = list.filter(x=>ordIgual(x.s.programa, ord.programa));
    if(ord.modalidad) list = list.filter(x=>ordIgual(x.s.modalidad, ord.modalidad));
    if(ord.semestre) list = list.filter(x=>ordIgual(x.s.semestre, ord.semestre));
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
        if(ta === null && tb === null) return ORD_COL.compare(String(a.s.nombre), String(b.s.nombre));
        if(ta === null) return 1; if(tb === null) return -1;
        return (tb - ta) * dir;
      }
      const c = ORD_COL.compare(String(val(a) || ''), String(val(b) || ''));
      return (c || ORD_COL.compare(String(a.s.nombre), String(b.s.nombre))) * dir;
    });
    return list;
  }
}

function ordUnicos(campo){ const m = new Map(); (adminStudentsCache || []).forEach(s=>{ const v = s[campo]; if(v != null && String(v).trim() !== '') { const k = _norm(String(v)).trim(); if(!m.has(k)) m.set(k, String(v).trim()); } }); return [...m.values()].sort((a,b)=>ORD_COL.compare(a, b)); }
function ordSel(id, etiqueta, campo, actual){
  return `<div class="field"><label>${etiqueta}</label><select onchange="ord.${id}=this.value;ordRender()"><option value="">Todas</option>${ordUnicos(campo).map(v=>`<option value="${esc(v)}"${ordIgual(v, actual) && actual ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></div>`;
}
function ordLimpiar(){ Object.assign(ord, { campo:'nombre', desc:false, sede:'', programa:'', modalidad:'', semestre:'', acceso:'', fechaDe:'registro', desde:'', hasta:'' }); ordRender(); }

function ordDecorar(){
  const el = document.getElementById('lookupAdminList'); if(!el) return;
  const tabla = el.querySelector('table.lista-est'); const wrap = tabla ? tabla.parentNode : null;
  const ref = wrap || el.querySelector('.lista-cuenta'); if(!ref) return;
  const n = ordActivos();
  const caja = document.createElement('div'); caja.className = 'ord-caja';
  const conFechas = (adminStudentsCache || []).some(s=>s.created_at || s.ultimo_acceso);
  caja.innerHTML = `<div class="ord-top"><button class="ghost" onclick="ord.abierto=!ord.abierto;ordRender()">⇅ Ordenar y filtrar${n ? ' <span class="sa-badge">' + n + '</span>' : ''}</button>
      ${n ? '<button class="ghost" onclick="ordLimpiar()">Quitar orden y filtros</button>' : ''}</div>` + (!ord.abierto ? '' : `<div class="ord-panel">
      <div class="field-row">
        <div class="field"><label>Ordenar por</label><select onchange="ord.campo=this.value;ordRender()">${ORD_CAMPOS.map(([k,t])=>`<option value="${k}"${k === ord.campo ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label>Sentido</label><select onchange="ord.desc=this.value==='1';ordRender()"><option value="0"${ord.desc ? '' : ' selected'}>Normal (A-Z · más reciente primero)</option><option value="1"${ord.desc ? ' selected' : ''}>Inverso (Z-A · más antiguo primero)</option></select></div>
        ${ordSel('sede','Sede','sede',ord.sede)}${ordSel('programa','Programa','programa',ord.programa)}${ordSel('modalidad','Modalidad','modalidad',ord.modalidad)}${ordSel('semestre','Semestre','semestre',ord.semestre)}
        <div class="field"><label>Acceso a la plataforma</label><select onchange="ord.acceso=this.value;ordRender()"><option value="">Todos</option><option value="si"${ord.acceso === 'si' ? ' selected' : ''}>Ya ingresaron</option><option value="no"${ord.acceso === 'no' ? ' selected' : ''}>Nunca han ingresado</option></select></div>
        <div class="field"><label>Rango de fechas por</label><select onchange="ord.fechaDe=this.value;ordRender()"><option value="registro"${ord.fechaDe === 'registro' ? ' selected' : ''}>Fecha de registro</option><option value="acceso"${ord.fechaDe === 'acceso' ? ' selected' : ''}>Último acceso</option></select></div>
        <div class="field"><label>Desde</label><input type="date" value="${ord.desde}" onchange="ord.desde=this.value;ordRender()"></div>
        <div class="field"><label>Hasta</label><input type="date" value="${ord.hasta}" onchange="ord.hasta=this.value;ordRender()"></div>
      </div>${conFechas ? '' : '<div class="note-box">Las fechas de registro y de acceso aparecerán cuando ejecutes <b>estudiantes-orden-etapa27.sql</b>. El último acceso se llena desde el próximo ingreso de cada estudiante.</div>'}</div>`);
  ref.parentNode.insertBefore(caja, ref);
  const porDoc = new Map((adminStudentsCache || []).map(x=>[x.documento, x]));
  if(tabla){ // columna «Último acceso» al final de cada fila
    const th = document.createElement('th'); th.textContent = 'Último acceso'; tabla.querySelector('thead tr').appendChild(th);
    tabla.querySelectorAll('tbody tr').forEach(tr=>{
      const m = /jumpToAdmin\('([^']+)'\)/.exec(tr.getAttribute('onclick') || ''); if(!m) return;
      const s = porDoc.get(m[1]); const td = document.createElement('td'); td.className = 'aud-nw';
      td.innerHTML = s && ordT(s.ultimo_acceso) !== null ? esc(ordFecha(s.ultimo_acceso)) : '<span style="color:var(--muted)">Nunca</span>';
      tr.appendChild(td);
    });
  }
}
(function(){
  if(typeof renderAdminListTable !== 'function') return;
  const _r = renderAdminListTable;
  renderAdminListTable = function(){
    const y = window.scrollY;
    try{ sessionStorage.setItem(ORD_FLAG, '1'); }catch(_){}
    const r = _r.apply(this, arguments);
    try{ ordDecorar(); }catch(e){ console.error(e); }
    ordGuardar();
    try{ sessionStorage.removeItem(ORD_FLAG); }catch(_){}
    if(Math.abs(window.scrollY - y) > 4) window.scrollTo(0, y);
    return r;
  };
})();

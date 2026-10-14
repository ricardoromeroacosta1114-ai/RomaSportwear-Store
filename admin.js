/* ============================================================
   OMA Sportwear — ADMINISTRADOR
   Protegido con Supabase Auth. Requiere SUPABASE_URL y
   SUPABASE_ANON_KEY en config.js + setup-supabase.sql ejecutado.
   ============================================================ */
(function(){
"use strict";
let sesion=null, promoEdit=null;

async function checaSesion(){ if(!window.sb) return null;
  try{ const {data}=await sb.auth.getSession(); sesion=data.session; return sesion; }catch(e){ return null; }
}

/* ---------- VISTA: acceso ---------- */
function viewAdmin(){
  if(!window.sb) return `
  <div class="back-row"><button onclick="go('perfil')">← Perfil</button></div>
  <h1 class="titulo" tabindex="-1">Administrador</h1>
  <div class="panel">
    <h4>Falta conectar Supabase</h4>
    <p style="font-size:13.5px;line-height:1.7;color:var(--tinta2)">
      El administrador guarda productos, imágenes y configuración en la nube (Supabase, gratis)
      para que los cambios lleguen a todas tus clientas. Para activarlo:</p>
    <ol style="font-size:13px;line-height:1.9;color:var(--tinta2);padding-left:20px;margin-top:8px">
      <li>Crea una cuenta en <b>supabase.com</b> y un proyecto nuevo.</li>
      <li>En <b>SQL Editor</b>, pega y ejecuta el contenido de <b>setup-supabase.sql</b> (viene en tu zip).</li>
      <li>En <b>Authentication → Users</b>, crea tu usuario administrador (correo y contraseña).</li>
      <li>En <b>Settings → API</b>, copia <b>Project URL</b> y <b>anon public key</b> y pégalos en el archivo <b>config.js</b> del sitio.</li>
      <li>Vuelve a subir el sitio a Netlify.</li>
    </ol>
  </div>`;
  if(!sesion) return `
  <div class="back-row"><button onclick="go('perfil')">← Perfil</button></div>
  <h1 class="titulo" tabindex="-1">Administrador</h1>
  <div class="panel">
    <h4>Acceso</h4>
    <div class="field"><label>Correo</label><input id="admEmail" type="email" autocomplete="username"></div>
    <div class="field"><label>Contraseña</label><input id="admPass" type="password" autocomplete="current-password"></div>
    <button class="btn-cart" style="width:100%" onclick="adminLogin()">Entrar</button>
    <p id="admErr" style="color:var(--rojo);font-size:12.5px;margin-top:10px;font-weight:600"></p>
  </div>`;
  return viewAdminPanel();
}

window.adminLogin=async function(){
  const email=document.getElementById("admEmail").value.trim();
  const pass=document.getElementById("admPass").value;
  try{
    const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
    if(error){ document.getElementById("admErr").textContent="Correo o contraseña incorrectos"; return; }
    sesion=data.session; toast("Bienvenido"); render();
  }catch(e){ document.getElementById("admErr").textContent="Error de conexión"; }
};
window.adminLogout=async function(){ try{await sb.auth.signOut();}catch(e){} sesion=null; go("perfil"); };

/* ---------- VISTA: panel ---------- */
let admPromos=[];
async function cargaAdmPromos(){
  const {data,error}=await sb.from("promos").select("*").order("creado",{ascending:true});
  if(!error) admPromos=data||[];
}
function admPromosListaHtml(){
  if(!admPromos.length) return `<p style="font-size:13px;color:var(--gris)">Aún no hay códigos promocionales.</p>`;
  return admPromos.map(p=>`<div style="display:flex;align-items:center;gap:11px;padding:10px 0;border-bottom:1px solid var(--linea)">
    <div style="flex:1;min-width:0"><b style="font-size:13.5px">${p.codigo}</b>
      <br><small style="color:var(--gris)">${p.descripcion||""} · ${p.activo?"ACTIVO":"apagado"}</small></div>
    <button class="mini-btn sec2" onclick="adminEditaPromo('${p.codigo}')">Editar</button>
  </div>`).join("");
}
function viewAdminPanel(){
  cargaAdmPromos().then(()=>{ const el=document.getElementById("admListaPromos"); if(el) el.innerHTML=admPromosListaHtml(); });
  const C=CFG();
  return `
  <div class="back-row"><button onclick="go('perfil')">← Salir de la vista</button>
    <span style="flex:1"></span><button style="color:var(--rojo);font-weight:600;font-size:13px" onclick="adminLogout()">Cerrar sesión</button></div>
  <h1 class="titulo" tabindex="-1">Administrador</h1>

  <div class="panel">
    <h4>Productos e inventario</h4>
    <p style="font-size:13.5px;color:var(--texto2)">Los productos, sus precios y sus existencias salen del sistema de inventario del punto de venta, no de este panel. La tienda tiene cargadas ${(typeof INV!=="undefined"?INV:[]).length} variantes y ${(typeof INV!=="undefined"?INV:[]).reduce((n,p)=>n+p.stock,0)} piezas.</p>
    <p style="font-size:13.5px;color:var(--texto2);margin-top:8px">Para cambiar un precio, dar de alta mercancía o corregir existencias, hazlo en el inventario: la tienda lo toma de ahí.</p>
    ${admCheck("inventarioEnVivo","Leer precio y existencias en vivo del punto de venta",C.inventarioEnVivo)}
    <p style="font-size:12px;color:var(--texto2)">Enciéndelo solo cuando el inventario ya esté en la nube (ver CONEXION-INVENTARIO.md). Apagado, la tienda usa la última carga de mercancía.</p>
  </div>

  <div class="panel">
    <h4>Códigos promocionales</h4>
    <button class="btn-cart" style="width:100%;margin-bottom:12px" onclick="adminNuevoPromo()">+ Agregar código</button>
    <div id="admListaPromos">${admPromosListaHtml()}</div>
    <p style="font-size:11.5px;color:var(--gris);margin-top:8px">Apagados por defecto — solo las clientas ven los que actives aquí.</p>
  </div>

  <div class="panel">
    <h4>Puntos y niveles</h4>
    ${admCheck("puntosEnabled","Activar programa de puntos y niveles",C.puntosEnabled)}
    ${admCampo("oroDiscountPct","% descuento automático nivel Oro (500+ pts)",C.oroDiscountPct,"number")}
    ${admCampo("eliteDiscountPct","% descuento automático nivel Élite (1,500+ pts)",C.eliteDiscountPct,"number")}
  </div>

  <div class="panel">
    <h4>Configuración de la tienda</h4>
    ${admCampo("whatsappNumber","Número de WhatsApp (52 + número)",C.whatsappNumber)}
    ${admCampo("pickupAddress","Dirección de recolección",C.pickupAddress)}
    ${admCampo("localDeliveryCost","Costo entrega local Mexicali ($)",C.localDeliveryCost,"number")}
    ${admCampo("nationalShippingCost","Costo envío nacional ($)",C.nationalShippingCost,"number")}
    ${admCampo("freeShippingFrom","Envío gratis desde ($, 0 = nunca)",C.freeShippingFrom,"number")}
    ${admCampo("outfitDiscountPct","% descuento por outfit completo",C.outfitDiscountPct,"number")}
    ${admCampo("schedule","Horarios",C.schedule)}
    ${admCampo("bankName","Banco (transferencias)",C.bankName)}
    ${admCampo("accountHolder","Titular de la cuenta",C.accountHolder)}
    ${admCampo("clabe","CLABE",C.clabe)}
    ${admCampo("instagram","Instagram (URL)",C.instagram)}
    ${admCampo("facebook","Facebook (URL)",C.facebook)}
    ${admCheck("mercadoPagoEnabled","Activar pago con tarjeta (Mercado Pago)",C.mercadoPagoEnabled)}
    <button class="btn-cart" style="width:100%;margin-top:6px" onclick="adminGuardaCfg()">Guardar configuración</button>
    <p style="font-size:11.5px;color:var(--gris);margin-top:10px">Para que el pago con tarjeta funcione, además de activarlo aquí debe existir la variable de entorno MP_ACCESS_TOKEN en Netlify. Las llaves NUNCA van en este panel ni en el código del sitio.</p>
  </div>`;
}
function admCampo(k,label,val,tipo){ return `<div class="field"><label>${label}</label><input data-cfg="${k}" type="${tipo||"text"}" value="${val==null?"":String(val).replace(/"/g,"&quot;")}"></div>`; }
function admCheck(k,label,val){ return `<div class="field" style="display:flex;align-items:center;gap:8px"><input data-cfg="${k}" type="checkbox" ${val?"checked":""} style="width:auto"><label style="margin:0">${label}</label></div>`; }
window.adminGuardaCfg=async function(){
  const o={};
  document.querySelectorAll("[data-cfg]").forEach(i=>{
    const k=i.dataset.cfg; let v=i.value;
    if(i.type==="checkbox") v=i.checked;
    else if(i.type==="number") v=parseFloat(v)||0;
    o[k]=v;
  });
  const {error}=await sb.from("config").upsert({id:1,datos:o});
  if(error){ toast("No se pudo guardar: "+error.message); return; }
  setCfgOverrides(o); pintaWaFloat(); toast("Configuración guardada"); render();
};

window.adminNuevoPromo=function(){ promoEdit={codigo:"",tipo:"pct",valor:10,minimo:null,vence:"",descripcion:"",activo:false}; go("adminPromo"); };
window.adminEditaPromo=function(codigo){ promoEdit=JSON.parse(JSON.stringify(admPromos.find(p=>p.codigo===codigo))); go("adminPromo"); };

function viewAdminPromo(){
  if(!sesion||!promoEdit) return viewAdmin();
  const p=promoEdit;
  const esNuevo=!admPromos.some(x=>x.codigo===p.codigo);
  return `
  <div class="back-row"><button onclick="go('admin')">← Códigos</button></div>
  <h1 class="titulo" tabindex="-1">${esNuevo?"Nuevo":"Editar"} código</h1>
  <div class="panel">
    <div class="field"><label>Código</label><input id="pmCodigo" value="${p.codigo}" ${esNuevo?"":"disabled"} placeholder="EJ. ROMA10" style="text-transform:uppercase"></div>
    <div class="field"><label>Tipo de descuento</label><select id="pmTipo" class="f-sel" style="width:100%;border-radius:14px;padding:13px" onchange="promoEdit.tipo=this.value;render()">
      ${[["pct","% sobre el subtotal"],["fijo","Monto fijo ($)"],["envio","Envío gratis"]].map(([k,v])=>`<option value="${k}" ${p.tipo===k?"selected":""}>${v}</option>`).join("")}</select></div>
    ${p.tipo!=="envio"?`<div class="field"><label>${p.tipo==="pct"?"Porcentaje (%)":"Monto ($)"}</label><input id="pmValor" type="number" value="${p.valor||0}"></div>`:""}
    <div class="field"><label>Compra mínima ($, opcional)</label><input id="pmMinimo" type="number" value="${p.minimo||""}"></div>
    <div class="field"><label>Vence (opcional)</label><input id="pmVence" type="date" value="${p.vence||""}"></div>
    <div class="field"><label>Descripción (se muestra a la clienta)</label><input id="pmDesc" value="${(p.descripcion||"").replace(/"/g,"&quot;")}"></div>
    <div class="field" style="display:flex;align-items:center;gap:8px"><input id="pmActivo" type="checkbox" ${p.activo?"checked":""} style="width:auto"><label style="margin:0">Código activo</label></div>
  </div>
  <div style="margin:6px 20px 20px;display:flex;flex-direction:column;gap:10px">
    <button class="btn-cart" onclick="adminGuardaPromo()">Guardar código</button>
    ${esNuevo?"":`<button class="btn-linea" style="color:var(--rojo);border-color:var(--rojo)" onclick="adminBorraPromo()">Eliminar código</button>`}
  </div>`;
}
window.adminGuardaPromo=async function(){
  const g=id=>document.getElementById(id).value;
  const codigo=g("pmCodigo").trim().toUpperCase();
  if(!codigo){ toast("Falta el código"); return; }
  const fila={
    codigo, tipo:g("pmTipo"),
    valor: g("pmTipo")==="envio" ? null : (parseFloat(g("pmValor"))||0),
    minimo: parseFloat(g("pmMinimo"))||null,
    vence: g("pmVence")||null,
    descripcion: g("pmDesc").trim(),
    activo: document.getElementById("pmActivo").checked
  };
  const esNuevo=!admPromos.some(x=>x.codigo===promoEdit.codigo);
  const {error}= esNuevo
    ? await sb.from("promos").insert(fila)
    : await sb.from("promos").update(fila).eq("codigo",promoEdit.codigo);
  if(error){ toast("No se pudo guardar: "+error.message); return; }
  toast("Código guardado");
  await cargaAdmPromos(); await cargaPromos(); go("admin");
};
window.adminBorraPromo=async function(){
  if(!confirm("¿Eliminar este código promocional?")) return;
  const {error}=await sb.from("promos").delete().eq("codigo",promoEdit.codigo);
  if(error){ toast("No se pudo eliminar: "+error.message); return; }
  toast("Código eliminado"); await cargaAdmPromos(); await cargaPromos(); go("admin");
};

/* registrar vistas en el router de la tienda */
window.EXTRA_VIEWS = { admin:viewAdmin, adminPromo:viewAdminPromo };
checaSesion();
})();

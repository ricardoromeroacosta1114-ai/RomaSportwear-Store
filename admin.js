/* ============================================================
   ROMA Sportwear — ADMINISTRADOR
   Protegido con Supabase Auth. Requiere SUPABASE_URL y
   SUPABASE_ANON_KEY en config.js + setup-supabase.sql ejecutado.
   ============================================================ */
(function(){
"use strict";
let sesion=null, prodEdit=null, subiendo=false;

async function checaSesion(){ if(!window.sb) return null;
  try{ const {data}=await sb.auth.getSession(); sesion=data.session; return sesion; }catch(e){ return null; }
}

/* ---------- VISTA: acceso ---------- */
function viewAdmin(){
  if(!window.sb) return `
  <div class="back-row"><button onclick="go('perfil')">← Perfil</button></div>
  <h2 class="titulo serif">Administrador</h2>
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
  <h2 class="titulo serif">Administrador</h2>
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
let admProds=[];
async function cargaAdmProds(){
  const {data,error}=await sb.from("productos").select("*").order("orden",{ascending:true}).order("creado",{ascending:true});
  if(!error) admProds=data||[];
}
function viewAdminPanel(){
  cargaAdmProds().then(()=>{ const el=document.getElementById("admLista"); if(el) el.innerHTML=admListaHtml(); });
  const C=CFG();
  return `
  <div class="back-row"><button onclick="go('perfil')">← Salir de la vista</button>
    <span style="flex:1"></span><button style="color:var(--rojo);font-weight:600;font-size:13px" onclick="adminLogout()">Cerrar sesión</button></div>
  <h2 class="titulo serif">Administrador</h2>

  <div class="panel">
    <h4>Productos</h4>
    <button class="btn-cart" style="width:100%;margin-bottom:12px" onclick="adminNuevoProd()">+ Agregar producto</button>
    <div id="admLista">${admListaHtml()}</div>
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
    <p style="font-size:11.5px;color:var(--gris);margin-top:10px">Para que el pago con tarjeta funcione, además de activarlo aquí debe existir la variable de entorno MP_ACCESS_TOKEN en Netlify. Ver README-ADMIN.md — las llaves NUNCA van en este panel ni en el código del sitio.</p>
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

function admListaHtml(){
  if(!admProds.length) return `<p style="font-size:13px;color:var(--gris)">Aún no hay productos en la nube. La tienda muestra el catálogo integrado hasta que agregues el primero.</p>`;
  return admProds.map(p=>`<div style="display:flex;align-items:center;gap:11px;padding:10px 0;border-bottom:1px solid var(--linea)">
    <div style="width:46px;height:56px;border-radius:10px;background:var(--papel2);overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0">
      ${(p.imagenes&&p.imagenes[p.img_principal||0])?`<img src="${p.imagenes[p.img_principal||0]}" style="width:100%;height:100%;object-fit:cover">`:svgPrenda(p.forma||"playera",p.color||"Negro",48)}
    </div>
    <div style="flex:1;min-width:0"><b style="font-size:13.5px">${p.nombre} · ${p.color}</b>
      <br><small style="color:var(--gris)">$${p.precio} · ${p.activo===false?"OCULTO":p.agotado?"AGOTADO":"activo"}${p.nuevo?" · NUEVO":""}${p.oferta?" · OFERTA":""}</small></div>
    <button class="mini-btn sec2" onclick="adminEditaProd('${p.id}')">Editar</button>
  </div>`).join("");
}

/* ---------- VISTA: editor de producto ---------- */
window.adminNuevoProd=function(){ prodEdit={nombre:"",descripcion:"",cat:"Leggings",color:"Negro",precio:0,antes:null,
  tipo:"abajo",forma:"recto",tallas:{S:{stock:0},M:{stock:0},L:{stock:0}},imagenes:[],img_principal:0,
  nuevo:false,oferta:false,agotado:false,activo:true,orden:admProds.length}; go("adminProd"); };
window.adminEditaProd=function(id){ prodEdit=JSON.parse(JSON.stringify(admProds.find(p=>p.id===id))); 
  prodEdit.tallas=prodEdit.tallas||{}; ["S","M","L"].forEach(t=>{ if(!prodEdit.tallas[t]) prodEdit.tallas[t]={stock:0}; });
  prodEdit.imagenes=prodEdit.imagenes||[]; go("adminProd"); };

function viewAdminProd(){
  if(!sesion||!prodEdit) return viewAdmin();
  const p=prodEdit;
  const formas={playera:"Playera",chamarra:"Chamarra",tubito:"Leggings tubito",recto:"Leggings recto",campana:"Leggings campana"};
  const tipos={arriba:"Arriba (armador)",abajo:"Abajo (armador)",capa:"Capa (armador)",ninguno:"No aparece en el armador"};
  return `
  <div class="back-row"><button onclick="go('admin')">← Productos</button></div>
  <h2 class="titulo serif">${p.id?"Editar":"Nuevo"} producto</h2>
  <div class="panel">
    <div class="field"><label>Nombre</label><input id="ppNombre" value="${p.nombre}"></div>
    <div class="field"><label>Descripción</label><input id="ppDesc" value="${(p.descripcion||"").replace(/"/g,"&quot;")}"></div>
    <div class="field"><label>Categoría</label><select id="ppCat" class="f-sel" style="width:100%;border-radius:14px;padding:13px">
      ${["Leggings","Playeras","Chamarras","Accesorios","Otros"].map(c=>`<option ${p.cat===c?"selected":""}>${c}</option>`).join("")}</select></div>
    <div class="field"><label>Color (nombre)</label><input id="ppColor" value="${p.color}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Precio</label><input id="ppPrecio" type="number" value="${p.precio}"></div>
      <div class="field"><label>Precio anterior (oferta)</label><input id="ppAntes" type="number" value="${p.antes||""}"></div>
    </div>
    <div class="field"><label>Silueta (si no hay fotos)</label><select id="ppForma" class="f-sel" style="width:100%;border-radius:14px;padding:13px">
      ${Object.entries(formas).map(([k,v])=>`<option value="${k}" ${p.forma===k?"selected":""}>${v}</option>`).join("")}</select></div>
    <div class="field"><label>Relación con el armador de outfits</label><select id="ppTipo" class="f-sel" style="width:100%;border-radius:14px;padding:13px">
      ${Object.entries(tipos).map(([k,v])=>`<option value="${k}" ${p.tipo===k?"selected":""}>${v}</option>`).join("")}</select></div>
  </div>

  <div class="panel">
    <h4>Existencias por talla</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      ${["S","M","L"].map(t=>`<div class="field" style="margin:0"><label>Talla ${t}</label>
        <input data-talla="${t}" type="number" min="0" value="${(p.tallas[t]&&p.tallas[t].stock)||0}"></div>`).join("")}
    </div>
  </div>

  <div class="panel">
    <h4>Imágenes (${(p.imagenes||[]).length})</h4>
    <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:8px">
      ${(p.imagenes||[]).map((u,i)=>`<div style="flex-shrink:0;text-align:center">
        <img src="${u}" style="width:76px;height:94px;object-fit:cover;border-radius:12px;border:2.5px solid ${i===(p.img_principal||0)?"var(--oro)":"var(--linea)"}">
        <div style="display:flex;gap:4px;justify-content:center;margin-top:5px">
          <button title="Principal" onclick="prodImgPrincipal(${i})" style="font-size:13px">${i===(p.img_principal||0)?"★":"☆"}</button>
          <button title="Mover izq" onclick="prodImgMueve(${i},-1)" style="font-size:13px">◀</button>
          <button title="Mover der" onclick="prodImgMueve(${i},1)" style="font-size:13px">▶</button>
          <button title="Eliminar" onclick="prodImgBorra(${i})" style="font-size:13px;color:var(--rojo)">✕</button>
        </div></div>`).join("")}
    </div>
    <input id="ppFile" type="file" accept="image/*" multiple style="display:none" onchange="prodSubeImgs(this)">
    <button class="btn-linea" style="width:100%" onclick="document.getElementById('ppFile').click()">${subiendo?"Subiendo…":"⬆ Subir imágenes"}</button>
    <p style="font-size:11.5px;color:var(--gris);margin-top:8px">★ marca la imagen principal. Se guardan en Supabase Storage.</p>
  </div>

  <div class="panel">
    <h4>Estado</h4>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${[["nuevo","NUEVO"],["oferta","OFERTA"],["agotado","AGOTADO"],["activo","VISIBLE EN TIENDA"]].map(([k,l])=>
        `<button class="chip ${p[k]?"on":""}" onclick="prodEditToggle('${k}')">${l}</button>`).join("")}
    </div>
  </div>

  <div style="margin:6px 20px 20px;display:flex;flex-direction:column;gap:10px">
    <button class="btn-cart" onclick="adminGuardaProd()">Guardar producto</button>
    ${p.id?`<button class="btn-linea" style="color:var(--rojo);border-color:var(--rojo)" onclick="adminBorraProd()">Eliminar producto</button>`:""}
  </div>`;
}
window.prodEditToggle=function(k){ prodEdit[k]=!prodEdit[k]; render(); };
window.prodImgPrincipal=function(i){ prodEdit.img_principal=i; render(); };
window.prodImgBorra=function(i){ prodEdit.imagenes.splice(i,1); if(prodEdit.img_principal>=prodEdit.imagenes.length) prodEdit.img_principal=0; render(); };
window.prodImgMueve=function(i,d){ const j=i+d; if(j<0||j>=prodEdit.imagenes.length) return;
  const a=prodEdit.imagenes; [a[i],a[j]]=[a[j],a[i]];
  if(prodEdit.img_principal===i) prodEdit.img_principal=j; else if(prodEdit.img_principal===j) prodEdit.img_principal=i;
  render(); };

window.prodSubeImgs=async function(input){
  if(!input.files||!input.files.length) return;
  subiendo=true; render();
  try{
    for(const f of input.files){
      const nombre=(prodEdit.id||"nuevo")+"/"+Date.now()+"-"+f.name.replace(/[^a-zA-Z0-9.\-_]/g,"");
      const {error}=await sb.storage.from("productos").upload(nombre,f,{upsert:false});
      if(error){ toast("Error subiendo "+f.name+": "+error.message); continue; }
      const {data}=sb.storage.from("productos").getPublicUrl(nombre);
      prodEdit.imagenes.push(data.publicUrl);
    }
  }finally{ subiendo=false; render(); }
};

window.adminGuardaProd=async function(){
  const g=id=>document.getElementById(id).value;
  prodEdit.nombre=g("ppNombre").trim(); prodEdit.descripcion=g("ppDesc").trim();
  prodEdit.cat=g("ppCat"); prodEdit.color=g("ppColor").trim()||"Negro";
  prodEdit.precio=parseFloat(g("ppPrecio"))||0;
  prodEdit.antes=parseFloat(g("ppAntes"))||null;
  prodEdit.forma=g("ppForma"); prodEdit.tipo=g("ppTipo");
  document.querySelectorAll("[data-talla]").forEach(i=>{ prodEdit.tallas[i.dataset.talla]={stock:parseInt(i.value)||0}; });
  if(!prodEdit.nombre){ toast("Falta el nombre"); return; }
  if(prodEdit.precio<=0){ toast("Precio inválido"); return; }
  const fila={...prodEdit};
  const esNuevo=!fila.id; if(esNuevo) delete fila.id;
  const {data,error}= esNuevo
    ? await sb.from("productos").insert(fila).select().single()
    : await sb.from("productos").update(fila).eq("id",fila.id).select().single();
  if(error){ toast("No se pudo guardar: "+error.message); return; }
  toast("Producto guardado");
  await cargaAdmProds(); adoptaCatalogo(admProds); go("admin");
};
window.adminBorraProd=async function(){
  if(!confirm("¿Eliminar este producto de la tienda? (sus imágenes quedan en Storage)")) return;
  const {error}=await sb.from("productos").delete().eq("id",prodEdit.id);
  if(error){ toast("No se pudo eliminar: "+error.message); return; }
  toast("Producto eliminado"); await cargaAdmProds(); adoptaCatalogo(admProds); go("admin");
};

/* registrar vistas en el router de la tienda */
window.EXTRA_VIEWS = { admin:viewAdmin, adminProd:viewAdminProd };
checaSesion();
})();

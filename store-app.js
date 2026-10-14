/* ============================================================
   OMA SPORTWEAR — tienda en línea
   ------------------------------------------------------------
   El catálogo es el inventario del punto de venta (catalogo.js, generado
   de data/catalogo.json). Precio y existencias se validan otra vez en el
   servidor al pagar: lo que diga este archivo nunca decide cuánto se cobra.
   ============================================================ */

/* ---------- configuración: config.js + lo guardado desde el administrador ---------- */
let CFG_OVR = (function(){ try{return JSON.parse(localStorage.getItem("romastore_cfg")||"{}");}catch(e){return {};} })();
function CFG(){ return Object.assign({}, ROMA_CONFIG, CFG_OVR); }
function setCfgOverrides(o){ CFG_OVR=o||{}; try{localStorage.setItem("romastore_cfg",JSON.stringify(CFG_OVR));}catch(e){} }

/* Códigos. OUTFIT es el descuento del armador (jacket o playera + legging);
   los demás se administran en el panel y viven en la tabla `promos`. */
const OUTFIT = { tipo:"look", get valor(){return CFG().outfitDiscountPct;},
  get desc(){return CFG().outfitDiscountPct+" % al llevar el outfit completo (jacket o playera, más legging)";} };
let CODIGOS = { OUTFIT };
const codigoCanon = c => { c=(c||"").trim().toUpperCase(); return c==="LOOK15" ? "OUTFIT" : c; };

/* ---------- catálogo ---------- */
const ORDEN_TALLAS = ["XS","S","M","L","XL","XXL"];
const ZONAS = ["capa","arriba","abajo"];
const NOMBRE_ZONA = { capa:"Jacket", arriba:"Playera", abajo:"Legging" };
/* Cómo llama la tienda a cada tipo del punto de venta (para el inventario en vivo). */
const TIPOS_POS = {
  chamarra:          { cat:"Jackets",  zona:"capa",   forma:"chamarra" },
  "blusa deportiva": { cat:"Playeras", zona:"arriba", forma:"playera" },
  legging:           { cat:"Leggings", zona:"abajo",  forma:"campana" }
};

function slug(s){
  return String(s==null?"":s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }

/* Agrupa las variantes (una por talla) en modelos (producto + color). */
function construyeModelos(inv){
  const m = {};
  (inv||[]).forEach(p=>{
    const id = slug(p.nombre+" "+p.color);
    if(!m[id]) m[id] = { id, nombre:p.nombre, cat:p.cat, color:p.color, hex:p.hex||"#8A8177", precio:p.precio,
      antes:(typeof OFERTA!=="undefined"&&OFERTA[p.nombre])||null,
      nuevo:(typeof NUEVO!=="undefined"&&NUEVO.includes(p.nombre)),
      tipo:p.zona||"arriba", forma:p.forma||"playera", base:slug(p.nombre), tallas:{} };
    m[id].tallas[p.talla] = { sku:p.sku, stock:p.stock };
  });
  return Object.values(m).sort((a,b)=>ZONAS.indexOf(a.tipo)-ZONAS.indexOf(b.tipo)).map(x=>{
    const orden={}; Object.keys(x.tallas).sort((a,b)=>ORDEN_TALLAS.indexOf(a)-ORDEN_TALLAS.indexOf(b)).forEach(t=>orden[t]=x.tallas[t]);
    x.tallas=orden; return x;
  });
}
let MODELOS = construyeModelos(typeof INV!=="undefined"?INV:[]);
const modelo = id => MODELOS.find(x=>x.id===id);
const variantes = nombre => MODELOS.filter(x=>x.nombre===nombre);
const tallasDe = m => Object.keys(m.tallas);
const hayStock = m => !m.agotado && Object.values(m.tallas).some(v=>v.stock>0);
function tallasDisp(m){ return Object.entries(m.tallas).filter(([,v])=>v.stock>0).map(([t])=>t); }
function piezasTotales(m){ return Object.values(m.tallas).reduce((n,v)=>n+(v.stock>0?v.stock:0),0); }
/* Las familias de producto, en el orden en que se visten: jacket, playera, legging. */
function familias(){
  const f={};
  MODELOS.forEach(m=>{ (f[m.nombre]=f[m.nombre]||{nombre:m.nombre,tipo:m.tipo,cat:m.cat,modelos:[]}).modelos.push(m); });
  return Object.values(f).sort((a,b)=>ZONAS.indexOf(a.tipo)-ZONAS.indexOf(b.tipo));
}

/* ---------- inventario en vivo (punto de venta) ----------
   Con `inventarioEnVivo` encendido en config.js, precio y existencias se
   leen de la base del punto de venta en cada visita. catalogo.js queda de
   respaldo por si la base no responde. Ver CONEXION-INVENTARIO.md */
function adoptaInventario(filas){
  if(!Array.isArray(filas)||!filas.length) return false;
  const inv=[];
  filas.forEach(r=>{
    const t=TIPOS_POS[String(r.tipo||"").toLowerCase()]; if(!t) return;
    if(!(Number(r.precio)>0)) return;
    inv.push({ sku:r.clave, nombre:r.producto, cat:t.cat, zona:t.zona, forma:t.forma, color:r.color,
      hex:r.color_hex||(modelo(slug(r.producto+" "+r.color))||{}).hex||"#8A8177",
      talla:String(r.talla||"").toUpperCase(), precio:Number(r.precio), stock:Math.max(0,Number(r.stock)||0) });
  });
  if(!inv.length) return false;
  MODELOS=construyeModelos(inv); limpiaEstado();
  return true;
}
async function cargarCatalogo(){
  try{ localStorage.removeItem("romastore_catalogo"); }catch(e){}     // catálogo viejo de ROMA
  if(!window.sb) return;
  try{
    const cfg=await sb.from("config").select("datos").eq("id",1).maybeSingle();
    if(cfg.data&&cfg.data.datos&&JSON.stringify(cfg.data.datos)!==JSON.stringify(CFG_OVR)){ setCfgOverrides(cfg.data.datos); render(); pintaAviso(); pintaWaFloat(); }
  }catch(e){}
  if(CFG().inventarioEnVivo===true){
    try{
      const r=await sb.rpc("roma_catalogo_web");
      if(!r.error && adoptaInventario(r.data)) render();
    }catch(e){}
  }
}
function adoptaCatalogo(){ /* el catálogo ya no se edita aquí: viene del inventario */ }
function adoptaPromos(rows){
  const activos={};
  (rows||[]).filter(r=>r.activo===true).forEach(r=>{
    activos[String(r.codigo).toUpperCase()]={tipo:r.tipo, valor:r.valor, min:r.minimo, vence:r.vence, desc:r.descripcion};
  });
  CODIGOS=Object.assign({}, activos, {OUTFIT});
  try{localStorage.setItem("romastore_promos",JSON.stringify(rows));}catch(e){}
}
async function cargaPromos(){
  try{ const cache=JSON.parse(localStorage.getItem("romastore_promos")||"null"); if(cache) adoptaPromos(cache); }catch(e){}
  if(!window.sb) return;
  try{
    const {data,error}=await sb.from("promos").select("*");
    if(!error&&data){ const antes=JSON.stringify(Object.keys(CODIGOS).sort()); adoptaPromos(data); if(JSON.stringify(Object.keys(CODIGOS).sort())!==antes) render(); }
  }catch(e){}
}
function pintaWaFloat(){ const a=document.getElementById("waFloat"); if(a) a.href="https://wa.me/"+CFG().whatsappNumber; }

/* ---------- estado / persistencia ---------- */
const DB = {
  load(k,d){ try{const v=localStorage.getItem("romastore_"+k); return v?JSON.parse(v):d;}catch(e){return d;} },
  save(k,v){ try{localStorage.setItem("romastore_"+k, JSON.stringify(v));}catch(e){} }
};
let carrito = DB.load("carrito",[]);          // [{sku,cant}]
let looks   = DB.load("looks",[]);            // [{id,nombre,slots:{arriba,abajo,capa}}]
let ordenes = DB.load("ordenes",[]);
let perfil  = DB.load("perfil",{nombre:"",whats:"",dir:""});
let puntos  = DB.load("puntos",0);
let codigoAplicado = codigoCanon(DB.load("codigo",null))||null;
let entrega = DB.load("entrega","local"); if(entrega==="envio") entrega="local";
let tema    = DB.load("tema","claro");

let vista="home", vistaParam=null, catFiltro="Todo";
let filtroTalla="", filtroColor="", filtroPrecio="", filtroDisp="";
let fichaTallaSel={}, fichaVista="prenda", famColor={};
let outfit = DB.load("outfit",{arriba:null,abajo:null,capa:null});   // ids de modelo
let outfitTallas = DB.load("outfitTallas",{});                        // { zona: talla }
let lookPortada = 0;

const $ = id=>document.getElementById(id);
const peso = n=>"$"+(Math.round(n*100)/100).toLocaleString("es-MX",{minimumFractionDigits:2});
function toast(m){ const t=$("toast"); if(!t) return; t.textContent=m; t.classList.add("on"); clearTimeout(t._x); t._x=setTimeout(()=>t.classList.remove("on"),2400); }

/* Lo guardado en el teléfono puede hablar de prendas que ya no existen
   (el catálogo cambió): se retira sin romper nada. */
function limpiaEstado(){
  const antes=carrito.length;
  carrito=carrito.filter(i=>i&&skuInfo(i.sku));
  if(carrito.length!==antes) DB.save("carrito",carrito);
  ZONAS.forEach(z=>{ if(outfit[z]&&!modelo(outfit[z])){ outfit[z]=null; delete outfitTallas[z]; } });
  looks=looks.filter(L=>L&&L.slots&&ZONAS.some(z=>L.slots[z]&&modelo(L.slots[z])));
  looks.forEach(L=>ZONAS.forEach(z=>{ if(L.slots[z]&&!modelo(L.slots[z])) L.slots[z]=null; }));
}

/* ---------- reseñas: solo verificadas, nunca inventadas ---------- */
function resenasDe(id){
  const todas = (window.RESENAS_VERIFICADAS||[]).filter(r=>r.producto===id);
  return { items: todas, rating: null, total: todas.length };
}

/* El acceso de administrador no se muestra a las clientas.
   Se activa entrando una vez a la tienda con ?admin=1 */
const ADMIN_VISIBLE=(function(){
  try{
    if(/[?&]admin=1/.test(location.search)){ localStorage.setItem("romastore_admin","1"); return true; }
    if(/[?&]admin=0/.test(location.search)){ localStorage.removeItem("romastore_admin"); return false; }
    return localStorage.getItem("romastore_admin")==="1";
  }catch(e){ return false; }
})();

/* ---------- imágenes de prenda ----------
   Son ilustraciones 3D con el tono medido de la tela, no fotografías, y así
   se describen. Si el inventario trae un color sin imagen, se tiñe al vuelo
   sobre la prenda base; el dibujo de línea es el último respaldo. */
function render3D(m){ return (window.RENDERS_3D && window.RENDERS_3D[m.id]) || null; }
function altPrenda(m){ return m.nombre+" color "+m.color+". Ilustración 3D de referencia de OMA Sportwear."; }
function figura3D(m, alto, opciones){
  const url=render3D(m), o=opciones||{};
  const est = alto ? ` style="height:${alto}px;width:auto"` : "";
  const idAttr = o.id ? ` id="${o.id}"` : "";
  if(url) return `<img class="fig3d"${idAttr} src="${url}" alt="${esc(altPrenda(m))}"${est} width="1000" height="1000" ${o.prioridad?'fetchpriority="high"':'loading="lazy"'} decoding="async">`;
  if(window.RENDER_BASES && window.RENDER_BASES.indexOf(m.base)>=0)
    return `<canvas class="fig3d"${idAttr} width="700" height="700" data-plana="${m.base}" data-hex="${m.hex}" role="img" aria-label="${esc(altPrenda(m))}"${est}></canvas>`;
  return null;
}
function prendaImg(m,h,o){ return figura3D(m,h,o) || svgPrenda(m.forma,m.hex,h); }
function figuraDe(m,h,o){
  const imgs=m.imagenes||[], principal=imgs[m.imgPrincipal||0]||imgs[0];
  if(principal) return `<img src="${principal}" alt="${esc(m.nombre+" "+m.color)}" style="width:100%;height:100%;object-fit:cover" loading="lazy">`;
  return prendaImg(m,h,o);
}
/* Dibujo de línea de respaldo. */
function svgPrenda(forma, hex, h=120){
  const c=hex||"#8A8177", s="rgba(25,25,25,.35)";
  const cuerpos={
    playera:`<path d="M50,14 C44,14 39,16.5 36,20 L15,29 L21,49 L30,45 L30,102 Q50,109 70,102 L70,45 L79,49 L85,29 L64,20 C61,16.5 56,14 50,14 Z" fill="${c}" stroke="${s}" stroke-width="1.2"/>`,
    chamarra:`<path d="M50,10 C44,10 40,12.5 37,16 L15,25 L11,75 L23,77 L28,45 L28,96 Q50,103 72,96 L72,45 L77,77 L89,75 L85,25 L63,16 C60,12.5 56,10 50,10 Z" fill="${c}" stroke="${s}" stroke-width="1.2"/><path d="M50,18 L50,98" stroke="${s}" stroke-width="1.2"/>`,
    campana:`<path d="M31,10 L69,10 L67,44 L76,122 L54,122 L50,62 L46,122 L24,122 L33,44 Z" fill="${c}" stroke="${s}" stroke-width="1.2"/>`
  };
  return `<svg viewBox="0 0 100 130" ${h?`height="${h}"`:""} role="img" aria-label="${esc(forma)}">${cuerpos[forma]||cuerpos.playera}</svg>`;
}

/* ---------- maniquí ---------- */
function prendasDe(slots){
  const o={};
  ["abajo","arriba","capa"].forEach(z=>{ const m=slots&&slots[z]&&modelo(slots[z]); if(m) o[z]={base:m.base,hex:m.hex}; });
  return o;
}
function altOutfit(slots){
  const p=ZONAS.map(z=>slots&&slots[z]&&modelo(slots[z])).filter(Boolean).map(m=>m.nombre.toLowerCase()+" "+m.color.toLowerCase());
  return p.length ? "Maniquí blanco con "+p.join(", ")+"." : "Maniquí blanco sin prendas.";
}
let maniquiVisto=false, secuenciaHecha=false;
function maniquiHtml(slots,o){
  o=o||{};
  const sec=o.secuencia&&!secuenciaHecha;
  return `<div class="escena${o.clase?" "+o.clase:""}${maniquiVisto?"":" cargando"}"><canvas class="maniqui"${o.id?` id="${o.id}"`:""} width="644" height="1920"
    data-maniqui='${JSON.stringify(prendasDe(slots))}'${o.escala?` data-escala="${o.escala}"`:""}${sec?' data-secuencia="1"':""}
    role="img" aria-label="${esc(altOutfit(slots))}"></canvas></div>`;
}
function pintaManiqui(cv,prendas,o){
  if(!cv||!window.OMA_MANIQUI) return;
  o=o||{};
  const marco=cv.parentElement;
  const listo=()=>{ maniquiVisto=true; if(marco&&marco.classList) marco.classList.remove("cargando"); };
  if(o.secuencia) secuenciaHecha=true;
  const p = o.secuencia ? OMA_MANIQUI.visteEnSecuencia(cv,prendas,{alEmpezar:listo}) : OMA_MANIQUI.viste(cv,prendas,{escala:o.escala});
  p.then(listo).catch(()=>{ if(marco&&marco.classList){ marco.classList.remove("cargando"); marco.classList.add("fallo"); } });
}
/* Enciende los lienzos que la vista recién pintada trae declarados. */
function montaLienzos(){
  const v=$("views"); if(!v||!v.querySelectorAll) return;
  v.querySelectorAll("canvas[data-maniqui]").forEach(cv=>{
    let prendas={}; try{ prendas=JSON.parse(cv.dataset.maniqui||"{}"); }catch(e){}
    pintaManiqui(cv,prendas,{escala:Number(cv.dataset.escala)||0,secuencia:!!cv.dataset.secuencia});
  });
  v.querySelectorAll("canvas[data-plana]").forEach(cv=>{
    if(window.OMA_MANIQUI) OMA_MANIQUI.pintaPlana(cv,cv.dataset.plana,cv.dataset.hex).catch(()=>{});
  });
}

/* ---------- eventos de conversión ---------- */
function evItems(lista){
  return (lista||[]).map(function(i){
    const inf=skuInfo(i.sku); if(!inf) return null;
    return {sku:i.sku,nombre:inf.m.nombre,categoria:inf.m.cat,color:inf.m.color,talla:inf.talla,precio:inf.m.precio,cant:i.cant};
  }).filter(Boolean);
}
function evModelo(m,talla,cant){
  return [{sku:(talla&&m.tallas[talla]&&m.tallas[talla].sku)||m.id,nombre:m.nombre,categoria:m.cat,color:m.color,talla:talla||"",precio:m.precio,cant:cant||1}];
}
function ev(nombre,datos){ if(window.ROMA_EVENTO) window.ROMA_EVENTO(nombre,datos||{}); }

/* ---------- bolsa ---------- */
const skuInfo = sku => { for(const m of MODELOS) for(const [t,v] of Object.entries(m.tallas)) if(v.sku===sku) return {m,talla:t,stock:v.stock}; return null; };
const cartCount = ()=>carrito.reduce((s,i)=>s+i.cant,0);
const subtotal = ()=>carrito.reduce((s,i)=>{const inf=skuInfo(i.sku);return s+(inf?inf.m.precio*i.cant:0);},0);
function addSku(sku,cant=1,silencio=false){
  const info=skuInfo(sku); if(!info) return false;
  const ya=carrito.find(i=>i.sku===sku);
  const actual=ya?ya.cant:0;
  if(actual+cant>info.stock){
    toast(info.stock===1?"Solo queda 1 pieza en talla "+info.talla:"Solo quedan "+info.stock+" piezas en talla "+info.talla);
    cant=info.stock-actual; if(cant<=0) return false;
  }
  ev("add_to_cart",{items:evItems([{sku,cant}]),valor:info.m.precio*cant});
  if(ya) ya.cant+=cant; else carrito.push({sku,cant});
  DB.save("carrito",carrito); pintaBadge(true);
  if(!silencio) toast("Agregado a tu bolsa");
  return true;
}
function pintaBadge(pop){
  const b=$("cartBadge"); if(!b) return;
  const n=cartCount();
  b.textContent=n; b.classList.toggle("on",n>0);
  if(pop&&n>0){ b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }
}

/* ---------- totales y códigos ---------- */
function lookCompletoEnCarrito(){
  const tipos=new Set(carrito.map(i=>{const inf=skuInfo(i.sku);return inf&&inf.m.tipo;}));
  return (tipos.has("arriba")||tipos.has("capa")) && tipos.has("abajo");
}
function validaCodigo(cod){
  cod=codigoCanon(cod);
  if(!cod) return {ok:false,msg:"Escribe un código"};
  const c=CODIGOS[cod];
  if(!c) return {ok:false,msg:"Ese código no existe"};
  if(c.vence && c.vence < new Date().toISOString().slice(0,10)) return {ok:false,msg:"Ese código ya venció"};
  const sub=subtotal();
  if(c.min && sub<c.min) return {ok:false,msg:"Vale en compras desde "+peso(c.min)};
  if(c.tipo==="look" && !lookCompletoEnCarrito()) return {ok:false,msg:"Necesitas una jacket o playera y un legging"};
  return {ok:true,cod,c,msg:c.desc};
}
function nivelPctActual(){
  const C=CFG(); if(C.puntosEnabled===false) return 0;
  const niv=nivelDe(puntos)[0];
  return niv==="Élite"?(C.eliteDiscountPct||0) : niv==="Oro"?(C.oroDiscountPct||0) : 0;
}
function totales(){
  const sub=subtotal();
  let desc=0, envioGratisCod=false, etiqueta="";
  if(codigoAplicado){
    const v=validaCodigo(codigoAplicado);
    if(!v.ok){ codigoAplicado=null; DB.save("codigo",null); }
    else{
      const c=v.c;
      if(c.tipo==="pct"||c.tipo==="look") desc=sub*c.valor/100;
      else if(c.tipo==="fijo") desc=Math.min(c.valor,sub);
      else if(c.tipo==="envio") envioGratisCod=true;
      etiqueta=codigoAplicado==="OUTFIT"?"outfit completo":codigoAplicado;
    }
  }
  const C=CFG(), nivelPct=nivelPctActual();
  if(nivelPct>0){
    const descNivel=sub*nivelPct/100;
    if(descNivel>desc){ desc=descNivel; etiqueta="nivel "+nivelDe(puntos)[0]; }
  }
  const costoBase = entrega==="pickup" ? 0 : entrega==="nacional" ? C.nationalShippingCost : C.localDeliveryCost;
  const gratis = envioGratisCod || (C.freeShippingFrom>0 && (sub-desc)>=C.freeShippingFrom);
  const envio = (sub>0 && !gratis) ? costoBase : 0;
  return {sub,desc,envio,total:Math.max(sub-desc,0)+envio,etiqueta,envioGratisCod};
}

/* ---------- navegación ---------- */
const ICONOS = {
  inicio:'<svg viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/></svg>',
  tienda:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6.5" height="6.5"/><rect x="13.5" y="4" width="6.5" height="6.5"/><rect x="4" y="13.5" width="6.5" height="6.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5"/></svg>',
  outfit:'<svg viewBox="0 0 24 24"><circle cx="12" cy="4.6" r="2"/><path d="M12 6.6v2.2M8.2 9.4h7.6l1.4 5.4-2 .6-.7-2.6V21h-5v-8.2l-.7 2.6-2-.6z"/></svg>',
  cuenta:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6"/><path d="M4.5 20c.9-3.7 3.9-5.6 7.5-5.6s6.6 1.9 7.5 5.6"/></svg>'
};
const NAV=[["home","inicio","Inicio"],["tienda","tienda","Tienda"],["armador","outfit","Outfit"],["perfil","cuenta","Cuenta"]];
const quieto = ()=>!!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
function enfocaVista(){
  const h=document.querySelector("#views h1");
  if(h&&h.focus){ h.setAttribute&&h.setAttribute("tabindex","-1"); h.focus({preventScroll:true}); }
}
/* Cambia la pantalla con una transición si el navegador la tiene. Si la
   aborta (por ejemplo, al girar el teléfono) el cambio ya quedó hecho. */
function transita(cambia,despues){
  const fin=despues||(()=>{});
  if(document.startViewTransition && !quieto()){
    const t=document.startViewTransition(cambia);
    if(t&&t.ready&&t.ready.catch) t.ready.catch(()=>{});
    if(t&&t.finished&&t.finished.then) t.finished.then(fin,fin); else fin();
  }else{ cambia(); fin(); }
}
function go(v,param=null){
  if(v==="producto"&&param&&modelo(param)) ev("select_item",{items:evModelo(modelo(param)),valor:modelo(param).precio});
  if(v==="producto") fichaVista="prenda";
  const cambia=()=>{ vista=v; vistaParam=param; render(); window.scrollTo({top:0}); };
  transita(cambia,enfocaVista);
  cierraMenu();
}
/* Abrir una prenda desde su tarjeta: la imagen viaja de la tarjeta a la ficha. */
function abre(el,id){
  try{ const img=el&&el.querySelector&&el.querySelector(".fig3d"); if(img) img.style.viewTransitionName="prenda"; }catch(e){}
  go("producto",id);
}
function render(){
  const nav=$("nav");
  if(nav) nav.innerHTML=NAV.map(([k,ic,l])=>`<button class="${vista===k?'on':''}" onclick="go('${k}')"${vista===k?' aria-current="page"':''}>${ICONOS[ic]}${l}</button>`).join("");
  const V=Object.assign({home:viewHome,tienda:viewTienda,producto:viewProducto,armador:viewArmador,looks:viewLooks,
    carrito:viewCarrito,checkout:viewCheckout,confirmacion:viewConfirmacion,pagoMP:viewPagoMP,perfil:viewPerfil,pedidos:viewPedidos}, window.EXTRA_VIEWS||{});
  const vistas=$("views");
  if(vistas) vistas.innerHTML=`<div class="view${vista==="home"?" view-portada":""}">${(V[vista]||viewHome)()}</div>`;
  if(document.body&&document.body.classList) document.body.classList.toggle("con-total",vista==="armador");
  if(document.querySelectorAll) document.querySelectorAll(".cab-nav [data-v]").forEach(b=>b.classList.toggle("on",b.dataset.v===vista));
  pintaBadge(false);
  montaLienzos();
  montaEfectos();
}
function abreMenu(){ const m=$("menu"); if(m&&m.showModal&&!m.open) m.showModal(); }
function cierraMenu(){ const m=$("menu"); if(m&&m.open&&m.close) m.close(); }
function pintaAviso(){
  const a=$("aviso"); if(!a) return;
  const C=CFG(), p=["Entrega local en Mexicali","Envíos a todo México"];
  if(C.freeShippingFrom>0) p.push("Envío gratis desde "+peso(C.freeShippingFrom).replace(".00",""));
  a.innerHTML=p.map(t=>`<span>${t}</span>`).join("");
}

/* ============================================================
   VISTAS
   ============================================================ */
function cardProducto(m){
  const ago=!hayStock(m), pz=piezasTotales(m);
  return `<button class="tarjeta${ago?" agotada":""}" onclick="abre(this,'${m.id}')">
    <span class="tarjeta-fig">${ago?'<span class="etq">Agotado</span>':""}${figuraDe(m,0)}${ago?"":`<span class="tarjeta-tallas" aria-hidden="true">${tallasDisp(m).map(t=>`<span>${t}</span>`).join("")}</span>`}</span>
    <span class="tarjeta-nom">${esc(m.nombre)}</span>
    <span class="tarjeta-col"><i class="punto" style="background:${m.hex}"></i>${esc(m.color)}</span>
    <span class="tarjeta-pre">${peso(m.precio)}${m.antes?`<s>${peso(m.antes)}</s>`:""}</span>
    ${!ago&&pz<=2?`<span class="tarjeta-nota">${pz===1?"Última pieza":"Últimas "+pz+" piezas"}</span>`:""}
  </button>`;
}

/* Combinaciones armadas con colores que sí hay en el inventario. */
const LOOKS_OMA=[
 {nombre:"Negro completo",  slots:{capa:"jacket-negro",        arriba:"playera-negro",         abajo:"legging-campana-negro"}},
 {nombre:"Cacao y marfil",  slots:{capa:"jacket-cacao",        arriba:"playera-blanco-marfil", abajo:"legging-campana-cacao"}},
 {nombre:"Azules",          slots:{capa:"jacket-azul-ballena", arriba:"playera-azul-lago",     abajo:"legging-campana-azul-oscuro"}},
 {nombre:"Morado y lila",   slots:{capa:"jacket-morado",       arriba:"playera-lila",          abajo:"legging-campana-morado"}},
 {nombre:"Marfil y café",   slots:{capa:"jacket-marfil",       arriba:"playera-negro",         abajo:"legging-campana-cafe"}}
];
/* Solo las combinaciones cuyas prendas existen hoy. */
function looksVivos(){ return LOOKS_OMA.filter(L=>ZONAS.every(z=>!L.slots[z]||modelo(L.slots[z]))); }
function lookPrecio(sl){ return ZONAS.reduce((s,k)=>{const m=sl[k]&&modelo(sl[k]);return s+(m?m.precio:0);},0); }
function trioHtml(sl){ return ZONAS.map(z=>{const m=sl[z]&&modelo(sl[z]);return m?`<i style="background:${m.hex}"></i>`:"";}).join(""); }
function verLookPortada(i){
  const L=looksVivos()[i]; if(!L) return;
  lookPortada=i;
  pintaManiqui($("mqPortada"),prendasDe(L.slots));
  if(document.querySelectorAll) document.querySelectorAll(".sala-looks .trio").forEach((b,k)=>b.setAttribute("aria-pressed",k===i?"true":"false"));
  const cv=$("mqPortada"); if(cv&&cv.setAttribute) cv.setAttribute("aria-label",altOutfit(L.slots));
  const n=$("lookNombre"); if(n) n.textContent=L.nombre;
}
function abrirLookEnArmador(i){
  const L=looksVivos()[i]; if(!L) return;
  outfit=Object.assign({arriba:null,abajo:null,capa:null},L.slots); outfitTallas={};
  DB.save("outfit",outfit); DB.save("outfitTallas",outfitTallas); go("armador");
}

function barraEnvioGratis(){
  const C=CFG(), meta=Number(C.freeShippingFrom)||0;
  if(meta<=0||entrega==="pickup") return "";
  const sub=subtotal();
  if(sub<=0) return "";
  if(sub>=meta) return `<div class="envio-barra listo"><span>Tu envío va por nuestra cuenta.</span></div>`;
  const pct=Math.min(100,Math.round(sub/meta*100));
  return `<div class="envio-barra"><span>Te faltan <b>${peso(meta-sub)}</b> para el envío gratis.</span>
    <div class="envio-pista"><i style="width:${pct}%"></i></div></div>`;
}

function pieTienda(){
  return `<footer class="pie noche">
    <div><img class="logo-claro" src="/marca/oma-logo-claro.webp" width="1100" height="491" alt="OMA Sportwear" loading="lazy">
      <img class="logo-oscuro" src="/marca/oma-logo-oscuro.webp" width="1100" height="535" alt="OMA Sportwear" loading="lazy"></div>
    <nav class="pie-links" aria-label="Información">
      <a href="/envios/">Envíos</a><a href="/cambios/">Cambios y devoluciones</a>
      <a href="/guia-de-tallas/">Guía de tallas</a><a href="/preguntas-frecuentes/">Preguntas frecuentes</a>
      <a href="/sobre-oma/">Sobre OMA</a><a href="/contacto/">Contacto</a>
      <a href="/terminos/">Términos</a><a href="/privacidad/">Aviso de privacidad</a>
    </nav>
    <p class="pie-nota">OMA Sportwear, Mexicali, Baja California. Precios en pesos mexicanos. Las imágenes de prenda son ilustraciones 3D de referencia.</p>
  </footer>`;
}

function fraseColores(fs){
  const p=fs.map((f,i)=>`${f.modelos.length} ${i===0?"colores de ":"de "}${f.nombre.toLowerCase()}`);
  return p.length>1 ? p.slice(0,-1).join(", ")+" y "+p[p.length-1] : (p[0]||"");
}
let introHasta=0;
function viewHome(){
  const C=CFG(), fs=familias(), lv=looksVivos(), pct=C.outfitDiscountPct||0;
  if(lookPortada>=lv.length) lookPortada=0;
  const inicial=lv[lookPortada] ? lv[lookPortada].slots : {};
  if(!introHasta) introHasta=Date.now()+2500;
  const intro=Date.now()<introHasta;
  const sinCentavos=n=>peso(n).replace(".00","");
  const cinta=["Entrega local en Mexicali","Envíos a todo México",
    C.freeShippingFrom>0?"Envío gratis desde "+sinCentavos(C.freeShippingFrom):"",
    pct>0?"Arma tu outfit y ahorra "+pct+" %":"",
    C.mercadoPagoEnabled?"Paga con tarjeta, transferencia o efectivo":"Paga con transferencia o efectivo"].filter(Boolean);
  const precioFam=f=>{ const p=f.modelos.map(m=>m.precio); return Math.min(...p)===Math.max(...p) ? peso(p[0]) : "Desde "+peso(Math.min(...p)); };
  const formasPago=C.mercadoPagoEnabled?3:2;
  return `
  <section class="sala noche${intro?" sala--intro":""}" aria-label="Portada">
    <div class="sala-marco">
      <picture>
        <source media="(min-width:1100px)" srcset="/escenas/arco-noche-ancho.webp" width="2200" height="1228">
        <img class="sala-fondo" src="/escenas/arco-noche.webp" width="1200" height="1607" alt="" fetchpriority="high" decoding="async">
      </picture>
      ${maniquiHtml(inicial,{id:"mqPortada",secuencia:true,clase:"escena--sala"})}
    </div>
    <div class="sala-txt">
      <p class="ceja" style="--i:0">OMA Sportwear, nueva colección</p>
      <h1 class="display" tabindex="-1" style="--i:1"><span>Hecha para moverte,</span><span>pensada para lucir.</span></h1>
      <p class="entrada" style="--i:2">${fs.length?fraseColores(fs).replace(/^./,c=>c.toUpperCase())+".":""} Vístelos en el maniquí antes de comprarlos.</p>
      <div class="sala-acciones" style="--i:3">
        <button class="btn-champ" onclick="catFiltro='Todo';go('tienda')">Descubrir la colección</button>
        <button class="btn-fantasma" onclick="go('armador')">Armar mi outfit</button>
      </div>
    </div>
    ${lv.length>1?`<div class="sala-looks" role="group" aria-label="Probar otro look en el maniquí">
      <span class="ceja">Prueba un look</span>
      ${lv.map((L,i)=>`<button class="trio" aria-pressed="${i===lookPortada}" aria-label="${esc(L.nombre)}" title="${esc(L.nombre)}" onclick="verLookPortada(${i})">${trioHtml(L.slots)}</button>`).join("")}
      <span class="look-nombre" id="lookNombre" aria-live="polite">${esc(lv[lookPortada].nombre)}</span>
    </div>`:""}
  </section>

  <div class="cinta"><div class="cinta-pista">${[...cinta,...cinta].map((t,k)=>`<span${k>=cinta.length?' aria-hidden="true"':""}>${esc(t)}</span>`).join("")}</div></div>

  <section class="coleccion" aria-labelledby="tColeccion">
    <header class="sec-cab" data-rev>
      <p class="ceja">La colección</p>
      <h2 class="sec-titulo" id="tColeccion">${fs.length} prendas, ${MODELOS.length} colores.</h2>
      <button class="enlace-mayus" onclick="catFiltro='Todo';go('tienda')">Ver toda la tienda</button>
    </header>
    ${fs.map(f=>`<div class="riel" data-rev>
      <div class="riel-cab">
        <h3 class="riel-nombre">${esc(f.nombre)}</h3>
        <p class="riel-precio">${precioFam(f)}</p>
        <p class="riel-datos">${f.modelos.length} colores, tallas ${tallasDe(f.modelos[0]).join(" ")}</p>
        <div class="riel-flechas"><button class="ico" onclick="desliza(this,-1)" aria-label="Ver colores anteriores de ${esc(f.nombre)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6 8.5 12l6 6"/></svg></button><button class="ico" onclick="desliza(this,1)" aria-label="Ver más colores de ${esc(f.nombre)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg></button></div>
      </div>
      <ul class="riel-pista" aria-label="Colores de ${esc(f.nombre)}">
        ${f.modelos.map(m=>`<li><button class="percha" onclick="abre(this,'${m.id}')" aria-label="${esc(m.nombre+" "+m.color)}, ${peso(m.precio)}${hayStock(m)?"":", agotado"}">
          <span class="percha-fig">${figuraDe(m,0)}</span>
          <span class="percha-col"><i class="punto" style="background:${m.hex}"></i>${esc(m.color)}</span></button></li>`).join("")}
      </ul>
    </div>`).join("")}
  </section>

  ${lv.length?`<section class="lookbook noche" aria-labelledby="tLooks">
    <header class="sec-cab" data-rev>
      <p class="ceja">El probador</p>
      <h2 class="sec-titulo" id="tLooks">Looks listos para llevar.</h2>
      <p>Armados con piezas que hay hoy en tienda.${pct>0?" Jacket o playera más legging: "+pct+" % menos.":""}</p>
    </header>
    <ul class="lookbook-pista">
      ${lv.map((L,i)=>{ const p=lookPrecio(L.slots), completo=!!((L.slots.arriba||L.slots.capa)&&L.slots.abajo), con=completo&&pct>0?p*(1-pct/100):p;
        return `<li class="look-carta" data-rev style="--i:${i}">
          ${maniquiHtml(L.slots,{escala:0.5,clase:"escena--pedestal"})}
          <h3>${esc(L.nombre)}</h3>
          <p class="look-precio">${con<p?`<s>${peso(p)}</s><b>${peso(con)}</b>`:peso(p)}</p>
          <button class="btn-fantasma" onclick="abrirLookEnArmador(${i})">Probar este look</button>
        </li>`;}).join("")}
    </ul>
  </section>`:""}

  <section class="servicio" aria-label="Entregas y pagos">
    <div data-rev style="--i:0"><span class="servicio-cifra">${C.localDeliveryCost>0?sinCentavos(C.localDeliveryCost):"Gratis"}</span>
      <h3>Entrega local</h3><p>En Mexicali. También puedes recogerlo sin costo: ${esc(C.pickupAddress||"")}.</p></div>
    <div data-rev style="--i:1"><span class="servicio-cifra">${C.nationalShippingCost>0?sinCentavos(C.nationalShippingCost):"Gratis"}</span>
      <h3>Envíos a todo México</h3><p>Enviamos a cualquier estado del país.</p></div>
    ${C.freeShippingFrom>0?`<div data-rev style="--i:2"><span class="servicio-cifra">Desde ${sinCentavos(C.freeShippingFrom)}</span>
      <h3>Envío gratis</h3><p>En compras desde ${sinCentavos(C.freeShippingFrom)}, ya con descuentos.</p></div>`:""}
    <div data-rev style="--i:3"><span class="servicio-cifra">${formasPago} formas</span>
      <h3>Formas de pago</h3><p>${C.mercadoPagoEnabled?"Tarjeta con Mercado Pago, transferencia o efectivo al recibir. OMA no ve los datos de tu tarjeta.":"Transferencia o efectivo al recibir."}</p></div>
  </section>

  <section class="manifiesto noche">
    <div class="manifiesto-in" data-rev>
      <p class="ceja">Arma tu outfit</p>
      <h2>Tú eliges cada pieza.<br>El maniquí te la muestra.</h2>
      <p>${MODELOS.length} colores para combinar como quieras, cada uno con el tono de su tela.</p>
      <button class="btn-champ" onclick="go('armador')">Entrar al probador</button>
    </div>
  </section>
  ${pieTienda()}`;
}

/* Flechas del perchero (en computadora, donde no se desliza con el dedo). */
function desliza(btn,dir){
  const p=btn.closest&&btn.closest(".riel")&&btn.closest(".riel").querySelector(".riel-pista");
  if(p&&p.scrollBy) p.scrollBy({left:dir*p.clientWidth*0.8,behavior:quieto()?"auto":"smooth"});
}

/* ---------- portada: encabezado transparente, profundidad y apariciones ---------- */
let rafScroll=false, observador=null;
function pintaCabecera(){
  const b=document.body; if(!b||!b.classList) return;
  const s=vista==="home"&&document.querySelector&&document.querySelector(".sala");
  b.classList.toggle("en-sala",!!(s&&window.scrollY<s.offsetHeight-70));
}
function profundidad(){
  if(quieto()||!document.querySelector) return;
  const y=window.scrollY||0, alto=window.innerHeight||800;
  const marco=document.querySelector(".sala-marco");
  if(marco&&marco.style&&y<1600) marco.style.setProperty("--par",(y*0.16).toFixed(1)+"px");
  const m=document.querySelector(".manifiesto");
  if(m&&m.getBoundingClientRect&&m.style){ const r=m.getBoundingClientRect(); if(r.bottom>0&&r.top<alto) m.style.setProperty("--par",((r.top+r.height/2-alto/2)*-0.1).toFixed(1)+"px"); }
}
if(window.addEventListener) window.addEventListener("scroll",()=>{
  if(rafScroll) return; rafScroll=true;
  requestAnimationFrame(()=>{ rafScroll=false; pintaCabecera(); profundidad(); });
},{passive:true});
/* Las secciones aparecen al llegar a ellas. Sin IntersectionObserver, o con
   movimiento reducido, se muestran de una vez. */
function montaEfectos(){
  pintaCabecera();
  const v=$("views"); if(!v||!v.querySelectorAll) return;
  const els=v.querySelectorAll("[data-rev]");
  if(typeof IntersectionObserver==="undefined"||quieto()){ els.forEach(e=>e.classList.add("visto")); return; }
  document.documentElement.classList.add("fx");
  if(!observador) observador=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("visto"); observador.unobserve(e.target); } }),{rootMargin:"0px 0px -6% 0px",threshold:0.06});
  els.forEach(e=>observador.observe(e));
}

function viewTienda(){
  const cats=["Todo",...new Set(familias().map(f=>f.cat))];
  if(!cats.includes(catFiltro)) catFiltro="Todo";
  let list=MODELOS.slice();
  if(catFiltro!=="Todo") list=list.filter(m=>m.cat===catFiltro);
  if(filtroTalla) list=list.filter(m=>m.tallas[filtroTalla]&&m.tallas[filtroTalla].stock>0);
  if(filtroColor) list=list.filter(m=>m.color===filtroColor);
  if(filtroDisp==="si") list=list.filter(hayStock);
  if(filtroPrecio==="menor") list.sort((a,b)=>a.precio-b.precio);
  else if(filtroPrecio==="mayor") list.sort((a,b)=>b.precio-a.precio);
  else list.sort((a,b)=>(hayStock(b)?1:0)-(hayStock(a)?1:0));          // lo agotado, al final
  const colores=[...new Set(MODELOS.map(m=>m.color))].sort((a,b)=>a.localeCompare(b,"es"));
  const tallas=ORDEN_TALLAS.filter(t=>MODELOS.some(m=>m.tallas[t]));
  const hayFiltro=filtroTalla||filtroColor||filtroPrecio||filtroDisp;
  return `
  <h1 class="titulo" tabindex="-1">Tienda</h1>
  <div class="chips" role="group" aria-label="Tipo de prenda">${cats.map(c=>`<button class="chip" aria-pressed="${catFiltro===c}" onclick="catFiltro='${c}';render()">${c}</button>`).join("")}</div>
  <div class="filtros">
    <label class="solo-lector" for="fTalla">Talla</label>
    <select class="f-sel" id="fTalla" onchange="filtroTalla=this.value;render()">
      <option value="">Talla</option>${tallas.map(t=>`<option ${filtroTalla===t?'selected':''}>${t}</option>`).join("")}</select>
    <label class="solo-lector" for="fColor">Color</label>
    <select class="f-sel" id="fColor" onchange="filtroColor=this.value;render()">
      <option value="">Color</option>${colores.map(c=>`<option ${filtroColor===c?'selected':''}>${esc(c)}</option>`).join("")}</select>
    <label class="solo-lector" for="fOrden">Orden</label>
    <select class="f-sel" id="fOrden" onchange="filtroPrecio=this.value;render()">
      <option value="">Orden</option><option value="menor" ${filtroPrecio==='menor'?'selected':''}>Precio: menor a mayor</option>
      <option value="mayor" ${filtroPrecio==='mayor'?'selected':''}>Precio: mayor a menor</option></select>
    <button class="chip" aria-pressed="${filtroDisp==='si'}" onclick="filtroDisp=filtroDisp==='si'?'':'si';render()">Solo disponibles</button>
    ${hayFiltro?`<button class="enlace" onclick="filtroTalla='';filtroColor='';filtroPrecio='';filtroDisp='';render()">Quitar filtros</button>`:""}
  </div>
  <p class="cuenta" role="status">${list.length===1?"1 prenda":list.length+" prendas"}</p>
  ${list.length?`<div class="grid">${list.map(cardProducto).join("")}</div>`
   :`<div class="vacio-msg"><h2>Nada con esos filtros</h2><p>Quita alguno para ver más prendas.</p>
     <button class="btn btn-claro" onclick="filtroTalla='';filtroColor='';filtroPrecio='';filtroDisp='';catFiltro='Todo';render()">Ver todo</button></div>`}
  ${pieTienda()}`;
}

function viewProducto(){
  const m=modelo(vistaParam); if(!m) return viewTienda();
  ev("view_item",{items:evModelo(m),valor:m.precio});
  const C=CFG(), hermanos=variantes(m.nombre);
  const tallaSel=(fichaTallaSel[m.id]&&m.tallas[fichaTallaSel[m.id]]&&m.tallas[fichaTallaSel[m.id]].stock>0)?fichaTallaSel[m.id]:"";
  const rs=resenasDe(m.id), combos=sugerencias(m), ago=!hayStock(m);
  const enManiqui=window.OMA_MANIQUI&&OMA_MANIQUI.tiene(m.base);
  const slots={[m.tipo]:m.id};
  const stockSel=tallaSel?m.tallas[tallaSel].stock:0;
  return `
  <div class="back-row"><button onclick="go('tienda')"><span aria-hidden="true">←</span> Tienda</button></div>
  <div class="ficha">
    <div class="ficha-galeria">
      <div class="ficha-fig">${fichaVista==="maniqui"&&enManiqui ? maniquiHtml(slots) : figuraDe(m,0,{id:"fichaImg",prioridad:true})}</div>
      ${enManiqui?`<div class="ficha-vistas" role="group" aria-label="Vistas">
        <button class="vista-btn" aria-pressed="${fichaVista!=="maniqui"}" onclick="fichaVista='prenda';render()" aria-label="Ver la prenda sola">${prendaImg(m,0)}</button>
        <button class="vista-btn" aria-pressed="${fichaVista==="maniqui"}" onclick="fichaVista='maniqui';render()">Puesta en maniquí</button>
      </div>`:""}
    </div>
    <div class="ficha-info">
      <p class="migas"><button onclick="catFiltro='Todo';go('tienda')">Tienda</button> / <button onclick="catFiltro='${m.cat}';go('tienda')">${esc(m.cat)}</button></p>
      <h1 tabindex="-1">${esc(m.nombre)}</h1>
      <p class="ficha-precio">${peso(m.precio)}${m.antes?`<s>${peso(m.antes)}</s>`:""}</p>

      <fieldset class="opcion">
        <legend><span>Color: <b>${esc(m.color)}</b></span><span>${hermanos.length} colores</span></legend>
        <div class="muestras">${hermanos.map(v=>`<button class="sw${hayStock(v)?"":" agotada"}" style="background:${v.hex}" aria-pressed="${v.id===m.id}"
          aria-label="${esc(v.color)}${hayStock(v)?"":", agotado"}" title="${esc(v.color)}" onclick="cambiaColorFicha('${v.id}')"></button>`).join("")}</div>
      </fieldset>

      <fieldset class="opcion">
        <legend><span>Talla${tallaSel?": <b>"+tallaSel+"</b>":""}</span><a class="enlace" href="/guia-de-tallas/">Guía de tallas</a></legend>
        <div class="tallas">${tallasDe(m).map(t=>{
          const ag=m.tallas[t].stock<=0;
          return `<button class="tl${ag?" agotada":""}" aria-pressed="${tallaSel===t}" ${ag?'disabled aria-label="'+t+', agotada"':""}
            onclick="fichaTallaSel['${m.id}']='${t}';render()">${t}</button>`;}).join("")}</div>
        ${tallaSel&&stockSel<=2?`<p class="ultimas">${stockSel===1?"Queda 1 pieza":"Quedan "+stockSel+" piezas"} en talla ${tallaSel}.</p>`:""}
      </fieldset>

      <div class="ficha-acciones">
        <button class="btn btn-ancho" id="btnAgregar" ${ago?"disabled":""} onclick="fichaAdd('${m.id}',this)">${ago?"Agotado":"Agregar a la bolsa"}</button>
        ${enManiqui?`<button class="btn btn-claro btn-ancho" onclick="abrirEnArmador('${m.id}')">Armar un outfit con esta prenda</button>`:""}
      </div>

      <div class="pliegues">
        <details><summary>Envío y entrega</summary>
          <p>Entrega local en Mexicali: ${C.localDeliveryCost>0?peso(C.localDeliveryCost):"gratis"}. Envío a todo México: ${C.nationalShippingCost>0?peso(C.nationalShippingCost):"gratis"}.${C.freeShippingFrom>0?" Gratis en compras desde "+peso(C.freeShippingFrom)+".":""}</p>
          <p><a class="enlace" href="/envios/">Ver tiempos y detalles de envío</a></p></details>
        <details><summary>Cambios y devoluciones</summary>
          <p><a class="enlace" href="/cambios/">Consulta las condiciones de cambio</a></p></details>
        <details><summary>Sobre esta imagen</summary>
          <p>Es una ilustración 3D de referencia con el tono medido de la tela, no una fotografía. El color real puede variar un poco según tu pantalla.</p></details>
      </div>
    </div>
  </div>

  ${combos.length?`<section class="bloque">
    <header class="bloque-cab"><h2>Combínalo con</h2>
      <span class="nota">Jacket o playera más legging: ${C.outfitDiscountPct} % menos</span></header>
    <div class="grid" style="padding-inline:0">${combos.map(cardProducto).join("")}</div>
  </section>`:""}

  <section class="bloque">
    <header class="bloque-cab"><h2>Reseñas</h2></header>
    ${rs.items.length ? rs.items.map(r=>`<div class="orden" style="margin:0"><b>${esc(r.nombre)}</b><p>${esc(r.texto)}</p></div>`).join("")
      : `<p class="nota">Esta prenda todavía no tiene reseñas de clientas. Aquí solo se publican las de compras verificadas.</p>`}
  </section>
  ${pieTienda()}`;
}
function cambiaColorFicha(id){
  if(!modelo(id)) return;
  const cambia=()=>{ vistaParam=id; render(); };
  transita(cambia);
}
/* Qué ofrecer junto a una prenda: lo que le falta para ser outfit, en tonos afines. */
function sugerencias(m){
  const afin=x=>x.color===m.color||/^negro$/i.test(x.color)||/marfil|blanco/i.test(x.color);
  const out=[];
  ZONAS.filter(z=>z!==m.tipo).forEach(z=>{
    const pool=MODELOS.filter(x=>x.tipo===z&&hayStock(x));
    const mismo=pool.filter(x=>x.color===m.color), cerca=pool.filter(afin);
    const pick=(mismo.length?mismo:cerca.length?cerca:pool).slice(0,z==="abajo"||m.tipo==="abajo"?2:1);
    out.push(...pick);
  });
  return out.slice(0,4);
}
function fichaAdd(id,btn){
  const m=modelo(id), t=fichaTallaSel[id];
  if(!t||!m.tallas[t]){ toast("Elige tu talla"); return; }
  if(addSku(m.tallas[t].sku)){
    btn.classList.add("ok"); btn.textContent="Agregado";
    setTimeout(()=>{ btn.classList.remove("ok"); btn.textContent="Agregar a la bolsa"; },1400);
  }
}

/* ============ ARMADOR ============ */
function abrirEnArmador(id){
  const m=modelo(id); if(!m) return;
  outfit[m.tipo]=id; delete outfitTallas[m.tipo];
  if(fichaTallaSel[id]) outfitTallas[m.tipo]=fichaTallaSel[id];
  DB.save("outfit",outfit); DB.save("outfitTallas",outfitTallas); go("armador");
}
function totalOutfit(){
  const ms=ZONAS.map(z=>outfit[z]&&modelo(outfit[z])).filter(Boolean);
  const precio=ms.reduce((s,m)=>s+m.precio,0);
  const completo=!!((outfit.arriba||outfit.capa)&&outfit.abajo);
  const pct=CFG().outfitDiscountPct||0;
  return { piezas:ms.length, precio, completo, pct, conDesc:completo?precio*(1-pct/100):precio };
}
function piezaHtml(z){
  const pool=MODELOS.filter(m=>m.tipo===z);
  if(!pool.length) return "";
  const sel=outfit[z]&&modelo(outfit[z]);
  const productos=[...new Set(pool.map(m=>m.nombre))];
  const nombre=sel?sel.nombre:productos[0];
  const colores=pool.filter(m=>m.nombre===nombre);
  const talla=sel&&outfitTallas[z]&&sel.tallas[outfitTallas[z]]&&sel.tallas[outfitTallas[z]].stock>0?outfitTallas[z]:"";
  return `<section class="pieza" data-zona="${z}">
    <div class="pieza-cab"><h2>${esc(nombre)}</h2>
      <span class="nota">${sel?`<b>${esc(sel.color)}</b>, ${peso(sel.precio)}`:(z==="capa"?"Opcional":"Elige un color")}</span></div>
    ${productos.length>1?`<div class="prods">${productos.map(n=>`<button class="chip" aria-pressed="${n===nombre}" onclick="armaProducto('${z}','${esc(n)}')">${esc(n)}</button>`).join("")}</div>`:""}
    <div class="muestras" role="group" aria-label="Color de ${esc(nombre)}">
      ${colores.map(m=>`<button class="sw${hayStock(m)?"":" agotada"}" style="background:${m.hex}" aria-pressed="${!!sel&&sel.id===m.id}"
        aria-label="${esc(m.color)}${hayStock(m)?"":", agotado"}" title="${esc(m.color)}" onclick="armaColor('${z}','${m.id}')"></button>`).join("")}
    </div>
    ${sel?`<div class="tallas" role="group" aria-label="Talla de ${esc(nombre)}">${tallasDe(sel).map(t=>{
        const ag=sel.tallas[t].stock<=0;
        return `<button class="tl${ag?" agotada":""}" aria-pressed="${talla===t}" ${ag?"disabled":""} onclick="armaTalla('${z}','${t}')">${t}</button>`;}).join("")}</div>
      <div class="pieza-pie"><span class="nota">${talla?"Talla "+talla:"Elige tu talla"}</span><button class="quitar" onclick="armaColor('${z}',null)">Quitar</button></div>`:""}
  </section>`;
}
function totalArmadorHtml(){
  const T=totalOutfit();
  return `<div class="suma">${T.piezas?(T.completo&&T.pct>0?`<s>${peso(T.precio)}</s>`:"")+peso(T.conDesc):"Elige tus prendas"}
      ${T.completo&&T.pct>0?`<small>Outfit completo: ahorras ${peso(T.precio-T.conDesc)}</small>`:(T.piezas&&T.pct>0?`<small style="color:var(--texto2)">Suma ${outfit.abajo?"una jacket o playera":"un legging"} y baja ${T.pct} %</small>`:"")}</div>
    <button class="btn" ${T.piezas?"":"disabled"} onclick="outfitAlCarrito()">Agregar a la bolsa</button>`;
}
function viewArmador(){
  const T=totalOutfit();
  return `<div class="armador">
    <div class="armador-escena">${maniquiHtml(outfit,{id:"mqArmador"})}</div>
    <div class="armador-panel">
      <h1 tabindex="-1">Arma tu outfit</h1>
      <p class="entrada">Toca un color y míralo puesto.${T.pct>0?" Con jacket o playera más legging, el outfit lleva "+T.pct+" % de descuento.":""}</p>
      <div id="armadorPiezas">${ZONAS.map(piezaHtml).join("")}</div>
      <div class="armador-extra">
        <button class="btn btn-claro" id="btnGuardarLook" ${T.piezas?"":"disabled"} onclick="guardarLook()">Guardar look</button>
        <button class="btn btn-claro" id="btnCompartirLook" ${T.piezas?"":"disabled"} onclick="compartirLook()">Compartir</button>
      </div>
      <div class="armador-total" id="armadorTotal">${totalArmadorHtml()}</div>
    </div>
  </div>`;
}
/* Cambiar algo en el armador repinta el maniquí y el panel, no la página:
   el maniquí no parpadea y la pantalla no brinca. */
function refrescaArmador(){
  DB.save("outfit",outfit); DB.save("outfitTallas",outfitTallas);
  const caja=$("armadorPiezas");
  if(!caja||!caja.querySelectorAll){ render(); return; }
  caja.innerHTML=ZONAS.map(piezaHtml).join("");
  const tot=$("armadorTotal"); if(tot) tot.innerHTML=totalArmadorHtml();
  const hay=totalOutfit().piezas>0;
  ["btnGuardarLook","btnCompartirLook"].forEach(id=>{ const b=$(id); if(b) b.disabled=!hay; });
  const cv=$("mqArmador");
  if(cv){ pintaManiqui(cv,prendasDe(outfit)); if(cv.setAttribute) cv.setAttribute("aria-label",altOutfit(outfit)); }
}
function armaColor(z,id){
  if(id&&!modelo(id)) return;
  if(outfit[z]===id) return;
  outfit[z]=id||null;
  const m=id&&modelo(id);
  if(!m) delete outfitTallas[z];
  else if(outfitTallas[z]&&!(m.tallas[outfitTallas[z]]&&m.tallas[outfitTallas[z]].stock>0)) delete outfitTallas[z];
  refrescaArmador();
}
function armaProducto(z,nombre){
  const m=MODELOS.find(x=>x.tipo===z&&x.nombre===nombre&&hayStock(x))||MODELOS.find(x=>x.tipo===z&&x.nombre===nombre);
  if(m) armaColor(z,m.id);
}
function armaTalla(z,t){ outfitTallas[z]=t; refrescaArmador(); }
function outfitAlCarrito(){
  const zonas=ZONAS.filter(z=>outfit[z]&&modelo(outfit[z]));
  if(!zonas.length) return;
  const falta=zonas.find(z=>{const m=modelo(outfit[z]);return !(outfitTallas[z]&&m.tallas[outfitTallas[z]]&&m.tallas[outfitTallas[z]].stock>0);});
  if(falta){
    toast("Elige la talla de "+modelo(outfit[falta]).nombre.toLowerCase());
    const sec=document.querySelector&&document.querySelector('.pieza[data-zona="'+falta+'"]');
    if(sec&&sec.scrollIntoView) sec.scrollIntoView({behavior:quieto()?"auto":"smooth",block:"center"});
    return;
  }
  let ok=true;
  zonas.forEach(z=>{ if(!addSku(modelo(outfit[z]).tallas[outfitTallas[z]].sku,1,true)) ok=false; });
  if(lookCompletoEnCarrito()&&!codigoAplicado){ codigoAplicado="OUTFIT"; DB.save("codigo",codigoAplicado); }
  toast(ok?(codigoAplicado==="OUTFIT"?"Outfit en tu bolsa, con su descuento":"Outfit en tu bolsa"):"Revisa tu bolsa: alguna pieza ya no alcanzó");
  go("carrito");
}
function guardarLook(){
  if(!ZONAS.some(z=>outfit[z])) return;
  const nombre=prompt("Ponle nombre a tu look:","Mi look "+(looks.length+1));
  if(nombre===null) return;
  looks.unshift({id:Date.now(),nombre:(nombre||"").trim()||("Mi look "+(looks.length+1)),slots:Object.assign({},outfit)});
  DB.save("looks",looks); toast("Guardado en tus looks");
}
/* Compartir el look como imagen (1080 x 1350, formato de Instagram). */
async function compartirLook(){
  try{
    const ms=ZONAS.map(z=>outfit[z]&&modelo(outfit[z])).filter(Boolean); if(!ms.length) return;
    const cv=document.createElement("canvas"); cv.width=1080; cv.height=1350;
    const x=cv.getContext("2d");
    const g=x.createRadialGradient(360,480,60,360,620,900); g.addColorStop(0,"#F3ECE1"); g.addColorStop(1,"#E2D6C5");
    x.fillStyle=g; x.fillRect(0,0,1080,1350);
    const man=await OMA_MANIQUI.aLienzo(prendasDe(outfit));
    const alto=1210, ancho=alto*man.width/man.height;
    x.drawImage(man,150,70,ancho,alto);
    const logo=await new Promise(r=>{const i=new Image(); i.onload=()=>r(i); i.onerror=()=>r(null); i.src="/marca/oma-logo-claro.png";});
    if(logo){ const w=330; x.drawImage(logo,650,150,w,w*logo.height/logo.width); }
    let y=470; x.textAlign="left";
    ms.forEach(m=>{
      x.fillStyle=m.hex; x.beginPath(); x.arc(668,y-10,13,0,Math.PI*2); x.fill();
      x.strokeStyle="rgba(25,25,25,.2)"; x.lineWidth=1; x.stroke();
      x.fillStyle="#191919"; x.font="500 40px 'Cormorant Garamond', serif"; x.fillText(m.nombre,698,y);
      x.fillStyle="#655D54"; x.font="400 24px Montserrat, sans-serif"; x.fillText(m.color+"  "+peso(m.precio),698,y+38);
      y+=118;
    });
    const T=totalOutfit();
    x.fillStyle="#B79A70"; x.fillRect(650,y-34,330,1);
    x.fillStyle="#191919"; x.font="600 30px Montserrat, sans-serif"; x.fillText(peso(T.conDesc),650,y+26);
    if(T.completo&&T.pct>0){ x.fillStyle="#655D54"; x.font="400 22px Montserrat, sans-serif"; x.fillText("Outfit completo, "+T.pct+" % menos",650,y+62); }
    const blob=await new Promise(r=>cv.toBlob(r,"image/png"));
    const file=new File([blob],"mi-look-oma.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})) await navigator.share({files:[file],title:"Mi look OMA"});
    else{ const u=URL.createObjectURL(blob); const l=document.createElement("a"); l.href=u; l.download="mi-look-oma.png"; l.click(); setTimeout(()=>URL.revokeObjectURL(u),3000); toast("Imagen descargada"); }
  }catch(e){ if(e&&e.name!=="AbortError") toast("No se pudo crear la imagen"); }
}

function viewLooks(){
  return `<h1 class="titulo" tabindex="-1">Tus looks</h1>
  ${looks.length?`<div class="looks">${looks.map(L=>`<article class="look">
    <div class="look-escena">${maniquiHtml(L.slots,{escala:0.5})}</div>
    <h3>${esc(L.nombre)}</h3>
    <p class="nota">${ZONAS.filter(k=>L.slots[k]&&modelo(L.slots[k])).map(k=>{const m=modelo(L.slots[k]);return esc(m.nombre+" "+m.color.toLowerCase());}).join(", ")}. ${peso(lookPrecio(L.slots))}</p>
    <div class="acciones">
      <button class="mini-btn" onclick="usaLook(${L.id})">Abrir en el armador</button>
      <button class="mini-btn sec2" onclick="looks=looks.filter(x=>x.id!==${L.id});DB.save('looks',looks);render()">Borrar</button>
    </div></article>`).join("")}</div>`
  :`<div class="vacio-msg"><h2>Aún no guardas ningún look</h2><p>Arma un outfit y guárdalo para volver a él después.</p>
    <button class="btn" onclick="go('armador')">Armar mi outfit</button></div>`}`;
}
function usaLook(id){
  const L=looks.find(x=>x.id===id); if(!L) return;
  outfit=Object.assign({arriba:null,abajo:null,capa:null},L.slots); outfitTallas={};
  DB.save("outfit",outfit); DB.save("outfitTallas",outfitTallas); go("armador");
}

/* ============ BOLSA ============ */
function viewCarrito(){
  ev("view_cart",{items:evItems(carrito),valor:totales().total});
  if(!carrito.length) return `<h1 class="titulo" tabindex="-1">Tu bolsa</h1>
    <div class="vacio-msg"><h2>Tu bolsa está vacía</h2><p>Empieza por la colección o arma un outfit en el maniquí.</p>
    <button class="btn" onclick="go('tienda')">Ver la colección</button>
    <button class="btn btn-claro" onclick="go('armador')">Armar mi outfit</button></div>`;
  const T=totales(), C=CFG();
  const sugerir = lookCompletoEnCarrito() && !codigoAplicado && C.outfitDiscountPct>0;
  const items=carrito.map((i,idx)=>{
    const {m,talla}=skuInfo(i.sku);
    return `<div class="c-item">
      <div class="c-fig">${prendaImg(m,0)}</div>
      <div class="c-info"><b>${esc(m.nombre)}</b><small><i class="punto" style="background:${m.hex}"></i>${esc(m.color)}</small>
        <div class="c-edit">
          <select aria-label="Talla" onchange="cambiaTalla(${idx},this.value)">${tallasDe(m).map(t=>m.tallas[t].stock>0?`<option ${t===talla?'selected':''}>${t}</option>`:"").join("")}</select>
          <select aria-label="Color" onchange="cambiaColor(${idx},this.value)">${variantes(m.nombre).map(v=>`<option ${v.color===m.color?'selected':''}>${esc(v.color)}</option>`).join("")}</select>
          <div class="qty"><button aria-label="Quitar una" onclick="cambiaCant(${idx},-1)">−</button><span aria-live="polite">${i.cant}</span><button aria-label="Agregar una" onclick="cambiaCant(${idx},1)">+</button></div>
        </div></div>
      <div class="c-precio">${peso(m.precio*i.cant)}<button onclick="quitaItem(${idx})">Quitar</button></div>
    </div>`;}).join("");
  return `<h1 class="titulo" tabindex="-1">Tu bolsa</h1>
  <div class="dos-col">
    <div>${items}</div>
    <div class="lateral" style="padding-top:18px">
      ${barraEnvioGratis()}
      <div class="panel">
        <h4>Código de descuento</h4>
        <div class="cod-row">
          <label class="solo-lector" for="codIn">Código</label>
          <input id="codIn" autocomplete="off" autocapitalize="characters" value="${esc(codigoAplicado&&codigoAplicado!=="OUTFIT"?codigoAplicado:"")}" ${codigoAplicado&&codigoAplicado!=="OUTFIT"?'class="ok"':''}>
          ${codigoAplicado&&codigoAplicado!=="OUTFIT"
            ? `<button class="mini-btn sec2" onclick="codigoAplicado=null;DB.save('codigo',null);render()">Quitar</button>`
            : `<button class="mini-btn" onclick="aplicaCodigo()">Aplicar</button>`}
        </div>
        <div class="cod-msg ${codigoAplicado?'ok':''}" id="codMsg" role="status">${codigoAplicado&&CODIGOS[codigoAplicado]?esc(CODIGOS[codigoAplicado].desc):""}</div>
        ${sugerir?`<div class="cupon"><div><b>Traes el outfit completo</b><small>Lleva ${C.outfitDiscountPct} % de descuento.</small></div>
          <button class="mini-btn" onclick="codigoAplicado='OUTFIT';DB.save('codigo','OUTFIT');render()">Aplicar</button></div>`:""}
      </div>
      <div class="panel">
        <h4>Entrega</h4>
        <div class="entrega">
          <button class="ent-opt" aria-pressed="${entrega==='local'}" onclick="entrega='local';DB.save('entrega','local');render()">
            <b>Entrega local en Mexicali</b><small>${C.localDeliveryCost>0?peso(C.localDeliveryCost):"Gratis"}${C.freeShippingFrom>0?", gratis desde "+peso(C.freeShippingFrom):""}</small></button>
          <button class="ent-opt" aria-pressed="${entrega==='nacional'}" onclick="entrega='nacional';DB.save('entrega','nacional');render()">
            <b>Envío a todo México</b><small>${C.nationalShippingCost>0?peso(C.nationalShippingCost):"Gratis"}${C.freeShippingFrom>0?", gratis desde "+peso(C.freeShippingFrom):""}</small></button>
          <button class="ent-opt" aria-pressed="${entrega==='pickup'}" onclick="entrega='pickup';DB.save('entrega','pickup');render()">
            <b>Recoger en persona</b><small>${esc(C.pickupAddress)}. Sin costo.</small></button>
        </div>
        <div style="margin-top:16px">
          <div class="tot-row"><span>Subtotal</span><span>${peso(T.sub)}</span></div>
          ${T.desc>0?`<div class="tot-row"><span>Descuento ${esc(T.etiqueta)}</span><span class="verde">−${peso(T.desc)}</span></div>`:""}
          <div class="tot-row"><span>Entrega</span><span>${T.envio===0?'<span class="verde">Gratis</span>':peso(T.envio)}</span></div>
          <div class="tot-row big"><span>Total</span><span>${peso(T.total)}</span></div>
        </div>
      </div>
      <div class="pie-pago"><button class="btn btn-ancho" onclick="go('checkout')">Continuar al pago</button></div>
    </div>
  </div>`;
}
function aplicaCodigo(){
  const inp=$("codIn"), v=validaCodigo(inp.value), msg=$("codMsg");
  if(v.ok){ codigoAplicado=v.cod; DB.save("codigo",v.cod); render(); }
  else{ inp.classList.remove("mal"); void inp.offsetWidth; inp.classList.add("mal"); msg.textContent=v.msg; msg.className="cod-msg mal"; }
}
function cambiaCant(idx,d){
  const it=carrito[idx], info=skuInfo(it.sku);
  if(d>0&&it.cant+1>info.stock){ toast(info.stock===1?"Solo queda 1 pieza":"Solo quedan "+info.stock+" piezas"); return; }
  it.cant+=d; if(it.cant<=0) carrito.splice(idx,1);
  DB.save("carrito",carrito); render();
}
function quitaItem(idx){ carrito.splice(idx,1); DB.save("carrito",carrito); render(); }
function cambiaTalla(idx,t){
  const info=skuInfo(carrito[idx].sku);
  const v=info.m.tallas[t]; if(!v||v.stock<=0){ toast("La talla "+t+" está agotada"); render(); return; }
  carrito[idx].sku=v.sku; carrito[idx].cant=Math.min(carrito[idx].cant,v.stock);
  fusiona(); DB.save("carrito",carrito); render();
}
function cambiaColor(idx,color){
  const info=skuInfo(carrito[idx].sku);
  const nuevoM=variantes(info.m.nombre).find(v=>v.color===color); if(!nuevoM) return;
  const t=tallasDe(nuevoM).find(t=>t===info.talla&&nuevoM.tallas[t].stock>0)||tallasDe(nuevoM).find(t=>nuevoM.tallas[t].stock>0);
  if(!t){ toast("Ese color está agotado"); render(); return; }
  if(t!==info.talla) toast("En ese color queda la talla "+t);
  carrito[idx].sku=nuevoM.tallas[t].sku; carrito[idx].cant=Math.min(carrito[idx].cant,nuevoM.tallas[t].stock);
  fusiona(); DB.save("carrito",carrito); render();
}
function fusiona(){ const m={}; carrito.forEach(i=>{m[i.sku]=(m[i.sku]||0)+i.cant;}); carrito=Object.entries(m).map(([sku,cant])=>({sku,cant})); }

/* ============ PAGO ============ */
let pagoSel = DB.load("pago","transferencia");
const NOMBRE_ENTREGA = { pickup:"Recoger en persona", local:"Entrega local en Mexicali", nacional:"Envío a todo México" };
function campo(id,etq,valor,extra){ return `<div class="field"><label for="${id}">${etq}</label><input id="${id}" value="${esc(valor||"")}" ${extra||""}></div>`; }
function viewCheckout(){
  if(!carrito.length) return viewCarrito();
  ev("begin_checkout",{items:evItems(carrito),valor:totales().total});
  const T=totales(), C=CFG();
  if(pagoSel==="tarjeta"&&!C.mercadoPagoEnabled) pagoSel="transferencia";
  if(pagoSel==="efectivo"&&entrega==="nacional") pagoSel="transferencia";
  const conTarjeta=pagoSel==="tarjeta";
  return `<div class="back-row"><button onclick="go('carrito')"><span aria-hidden="true">←</span> Tu bolsa</button></div>
  <h1 class="titulo" tabindex="-1">Pago</h1>
  <div class="dos-col">
    <form onsubmit="event.preventDefault();confirmarPedido()" id="formPago" novalidate>
      <div class="panel">
        <h4>Tus datos</h4>
        ${campo("ckNombre","Nombre completo",perfil.nombre,'autocomplete="name" required')}
        ${campo("ckWhats","WhatsApp",perfil.whats,'type="tel" inputmode="tel" autocomplete="tel" required')}
        ${campo("ckCorreo","Correo electrónico (opcional)",perfil.correo,'type="email" inputmode="email" autocomplete="email"')}
      </div>
      <div class="panel">
        <h4>${NOMBRE_ENTREGA[entrega]}</h4>
        ${entrega==="pickup"
          ? `<p class="nota">Recoges en ${esc(C.pickupAddress)}.</p>`
          : campo("ckDir","Calle y número",perfil.dir,'autocomplete="address-line1" required')
            + campo("ckCol","Colonia",perfil.col,'autocomplete="address-line2" required')
            + (entrega==="nacional" ? campo("ckCP","Código postal",perfil.cp,'inputmode="numeric" autocomplete="postal-code" maxlength="5" required')
                + campo("ckCiudad","Ciudad y estado",perfil.ciudad,'autocomplete="address-level2" required') : "")
            + campo("ckRef","Referencias para encontrar el domicilio (opcional)",perfil.ref,'autocomplete="off"')}
        <button type="button" class="enlace" onclick="go('carrito')">Cambiar la forma de entrega</button>
      </div>
      <div class="panel">
        <h4>Forma de pago</h4>
        <div class="entrega">
          ${C.mercadoPagoEnabled
            ? `<button type="button" class="ent-opt" aria-pressed="${conTarjeta}" onclick="pagoSel='tarjeta';DB.save('pago',pagoSel);render()">
                 <b>Tarjeta de crédito o débito</b><small>Pagas en Mercado Pago. OMA no recibe los datos de tu tarjeta.</small></button>`
            : ""}
          <button type="button" class="ent-opt" aria-pressed="${pagoSel==='transferencia'}" onclick="pagoSel='transferencia';DB.save('pago',pagoSel);render()">
            <b>Transferencia</b><small>Te mostramos los datos al confirmar el pedido.</small></button>
          ${entrega!=="nacional"?`<button type="button" class="ent-opt" aria-pressed="${pagoSel==='efectivo'}" onclick="pagoSel='efectivo';DB.save('pago',pagoSel);render()">
            <b>Efectivo al recibir</b><small>Pagas cuando te entregamos el pedido.</small></button>`:""}
        </div>
      </div>
      <div class="panel">
        <h4>Algo que debamos saber (opcional)</h4>
        <div class="field" style="margin-bottom:0"><label class="solo-lector" for="ckNotas">Notas del pedido</label>
          <input id="ckNotas" autocomplete="off"></div>
      </div>
    </form>
    <div class="lateral" style="padding-top:0">
      <div class="panel">
        <h4>Tu pedido</h4>
        ${carrito.map(i=>{const {m,talla}=skuInfo(i.sku);return `<div class="tot-row"><span>${i.cant} × ${esc(m.nombre)} ${esc(m.color.toLowerCase())}, ${talla}</span><span>${peso(m.precio*i.cant)}</span></div>`;}).join("")}
        ${T.desc>0?`<div class="tot-row"><span>Descuento ${esc(T.etiqueta)}</span><span class="verde">−${peso(T.desc)}</span></div>`:""}
        <div class="tot-row"><span>Entrega</span><span>${T.envio===0?'Gratis':peso(T.envio)}</span></div>
        <div class="tot-row big"><span>Total</span><span>${peso(T.total)}</span></div>
      </div>
      <p class="aviso-legal">${conTarjeta?"Al confirmar vas a Mercado Pago para pagar. El total se recalcula en nuestro servidor."
        :"Al confirmar se abre WhatsApp con tu pedido escrito: solo falta enviarlo para que OMA lo aparte."}
        Aceptas los <a href="/terminos/">términos</a> y el <a href="/privacidad/">aviso de privacidad</a>. Consulta <a href="/cambios/">cambios y devoluciones</a>.</p>
      <div class="pie-pago"><button class="btn btn-ancho" id="btnConfirmar" onclick="confirmarPedido()">${conTarjeta?"Pagar "+peso(T.total)+" con tarjeta":"Enviar pedido por WhatsApp"}</button></div>
    </div>
  </div>`;
}
function nuevoFolio(){
  const d=new Date();
  const ymd=d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0");
  return "OMA-"+ymd+"-"+String(1000+Math.floor(Math.random()*9000));
}
function confirmarPedido(){
  const C=CFG(), val=id=>{const e=$(id);return e&&e.value?String(e.value).trim():"";};
  const nombre=val("ckNombre"), whats=val("ckWhats"), correo=val("ckCorreo"), notas=val("ckNotas");
  let dir="", col="", cp="", ciudad="", ref="";
  if(entrega!=="pickup"){ dir=val("ckDir"); col=val("ckCol"); ref=val("ckRef"); if(entrega==="nacional"){ cp=val("ckCP"); ciudad=val("ckCiudad"); } }
  if(!carrito.length){ go("carrito"); return; }
  if(!nombre){ toast("Escribe tu nombre completo"); return; }
  if(!whats){ toast("Escribe tu WhatsApp"); return; }
  if(correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)){ toast("Revisa tu correo electrónico"); return; }
  if(entrega!=="pickup"&&(!dir||!col)){ toast("Falta la calle o la colonia"); return; }
  if(entrega==="nacional"&&(!cp||!ciudad)){ toast("Falta el código postal o la ciudad"); return; }
  perfil=Object.assign({},perfil,{nombre,whats,correo,dir:entrega!=="pickup"?dir:perfil.dir,col:col||perfil.col,cp:cp||perfil.cp,ciudad:ciudad||perfil.ciudad,ref}); DB.save("perfil",perfil);
  const T=totales(), folio=nuevoFolio();
  const entTxt = entrega==="pickup" ? "Recoger en persona ("+C.pickupAddress+")" : NOMBRE_ENTREGA[entrega];
  const pagoTxt = pagoSel==="transferencia"?"Transferencia":pagoSel==="tarjeta"?"Tarjeta (Mercado Pago)":"Efectivo al recibir";
  const L=[];
  L.push("*PEDIDO "+folio+"*","");
  L.push("*Cliente:* "+nombre);
  L.push("*WhatsApp:* "+whats);
  if(correo) L.push("*Correo:* "+correo);
  L.push("","*Productos:*");
  carrito.forEach(i=>{const {m,talla}=skuInfo(i.sku);
    L.push("- "+i.cant+"x "+m.nombre+" | "+m.color+" | Talla "+talla+" | "+peso(m.precio)+" c/u = "+peso(m.precio*i.cant));});
  L.push("","Subtotal: "+peso(T.sub));
  if(T.desc>0) L.push("Descuento "+T.etiqueta+": -"+peso(T.desc));
  L.push("Entrega ("+entTxt+"): "+(T.envio===0?"Gratis":peso(T.envio)));
  L.push("*TOTAL: "+peso(T.total)+"*","","*Pago:* "+pagoTxt);
  if(entrega!=="pickup"){
    L.push("*Dirección:* "+dir+", Col. "+col+(cp?", CP "+cp:"")+(ciudad?", "+ciudad:""));
    if(ref) L.push("*Referencias:* "+ref);
  }
  if(notas) L.push("*Notas:* "+notas);
  const texto=L.join("\n"), ganados=Math.floor(T.total/10);
  ordenes.unshift({folio,fecha:new Date().toISOString().slice(0,10),total:T.total,puntos:ganados,
    items:carrito.map(i=>{const {m,talla}=skuInfo(i.sku);return {n:m.nombre,c:m.color,t:talla,q:i.cant,sku:i.sku};}),
    entrega,pago:pagoSel,estado:pagoSel==="tarjeta"?"Pendiente de pago":"Pendiente de enviar",texto});
  DB.save("ordenes",ordenes);
  ev("add_payment_info",{items:evItems(carrito),valor:T.total,extra:{payment_type:pagoSel}});
  /* Con tarjeta todavía no se sabe si el pago pasa: la bolsa y los puntos
     esperan a la respuesta de Mercado Pago (cierraPedido). Si la tarjeta
     rebota, la clienta vuelve con su bolsa intacta. */
  if(pagoSel==="tarjeta"){ pagarConMP(folio,carrito.map(i=>({sku:i.sku,cant:i.cant})),entrega); return; }
  cierraPedido(folio);
  navegaA("https://wa.me/"+C.whatsappNumber+"?text="+encodeURIComponent(texto));
  go("confirmacion",{folio,ganados});
}
/* Cierra el pedido: registra la compra, da los puntos y vacía la bolsa.
   Solo cuando quedó en firme (WhatsApp o tarjeta aprobada). */
function cierraPedido(folio){
  const o=ordenes.find(x=>x.folio===folio);
  if(o && !o.eventoCompra){
    ev("purchase",{items:evItems((o.items||[]).filter(x=>x.sku).map(x=>({sku:x.sku,cant:x.q}))),valor:o.total,extra:{transaction_id:o.folio}});
    if(window.ROMA_CONVERSION_COMPRA) window.ROMA_CONVERSION_COMPRA(o.folio,o.total);
    o.eventoCompra=true;
  }
  if(o && !o.puntosAplicados){ puntos+=(o.puntos||0); o.puntosAplicados=true; DB.save("puntos",puntos); }
  DB.save("ordenes",ordenes);
  carrito=[]; codigoAplicado=null; DB.save("carrito",carrito); DB.save("codigo",null);
}
async function pagarConMP(folio,items,entregaSel){
  const b=$("btnConfirmar"); if(b){ b.disabled=true; b.textContent="Abriendo Mercado Pago…"; }
  try{
    const r=await fetch("/.netlify/functions/create-preference",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({folio, items, entrega:entregaSel, codigo:codigoAplicado, nivelPct:nivelPctActual()})
    });
    const data=await r.json();
    if(!r.ok||!data.init_point) throw new Error(data.error||"No se pudo iniciar el pago");
    navegaA(data.init_point);
  }catch(e){
    toast(e.message||"No se pudo abrir el pago con tarjeta. Intenta de nuevo o elige otra forma de pago.");
    go("checkout");
  }
}
/* Entrada desde las páginas indexables: /productos/<slug>/ enlaza a la
   tienda con ?producto=<slug> y abre esa prenda directamente. */
function procesaEnlaceEntrada(){
  try{
    const qs=new URLSearchParams(location.search);
    const prod=qs.get("producto"), v=qs.get("vista");
    if(prod && modelo(prod)){ vista="producto"; vistaParam=prod; limpiaUrl(); return true; }
    if(v && ["tienda","armador","looks","carrito","home"].indexOf(v)>=0){ vista=v; limpiaUrl(); return true; }
  }catch(e){}
  return false;
}
function limpiaUrl(){ try{ history.replaceState(null,"",location.pathname); }catch(e){} }

function procesaRetornoMP(){
  const qs=new URLSearchParams(window.location.search);
  const mp=qs.get("mp"), folio=qs.get("folio");
  if(!mp||!folio) return;
  const o=ordenes.find(x=>x.folio===folio);
  if(o){ o.estado = mp==="approved"?"Pagado con tarjeta":mp==="pending"?"Pago pendiente":"Pago rechazado"; DB.save("ordenes",ordenes); }
  /* Aprobado: puntos y bolsa vacía. Pendiente: el pago sigue en curso, se
     vacía la bolsa sin dar puntos. Rechazado: nada cambia, para reintentar. */
  if(mp==="approved") cierraPedido(folio);
  else if(mp==="pending"){ carrito=[]; codigoAplicado=null; DB.save("carrito",carrito); DB.save("codigo",null); }
  vista="pagoMP"; vistaParam={folio,estado:mp};
  limpiaUrl();
}
function viewPagoMP(){
  const p=vistaParam||{};
  const ok=p.estado==="approved", pend=p.estado==="pending";
  return `<div class="conf">
    <div class="sello-ok" aria-hidden="true">${ok?"✓":pend?"…":"×"}</div>
    <h1 tabindex="-1">${ok?"Pago recibido":pend?"Pago en revisión":"El pago no pasó"}</h1>
    <p>Pedido ${esc(p.folio||"")}</p>
    <p>${ok?"Mercado Pago nos avisó que tu pago fue aprobado. Escríbenos por WhatsApp para coordinar la entrega."
        :pend?"Mercado Pago todavía está confirmando tu pago. En cuanto se apruebe preparamos tu pedido."
        :"Tu bolsa sigue intacta. Puedes intentar con otra tarjeta o elegir otra forma de pago."}</p>
    <div class="acciones">
      ${ok||pend?`<button class="btn" onclick="navegaA(waDe('${esc(p.folio)}'))">Escribir por WhatsApp</button>`
        :`<button class="btn" onclick="go('carrito')">Volver a tu bolsa</button>`}
      <button class="btn btn-claro" onclick="go('home')">Ir al inicio</button>
    </div>
  </div>`;
}
/* Datos bancarios: solo aparecen con el pedido ya generado. */
function datosTransferencia(folio){
  const o=ordenes.find(x=>x.folio===folio); if(!o||o.pago!=="transferencia") return "";
  const C=CFG(); if(!C.clabe) return "";
  const fila=(et,v)=>v?`<p>${et}: <b>${esc(v)}</b></p>`:"";
  return `<div class="panel"><h4>Para completar tu pago</h4>
    <p>Transfiere ${peso(o.total)} y mándanos el comprobante por WhatsApp.</p>
    ${fila("Banco",C.bankName)}${fila("A nombre de",C.accountHolder)}${fila("CLABE o tarjeta",C.clabe)}
    <button class="mini-btn sec2" style="margin-top:10px" onclick="copiarClabe()">Copiar número</button></div>`;
}
async function copiarClabe(){
  try{ await navigator.clipboard.writeText(CFG().clabe||""); toast("Número copiado"); }
  catch(e){ toast("No se pudo copiar"); }
}
function waDe(folio){
  const o=ordenes.find(x=>x.folio===folio); if(!o) return "https://wa.me/"+CFG().whatsappNumber;
  return "https://wa.me/"+CFG().whatsappNumber+"?text="+encodeURIComponent(o.texto||"");
}
async function copiarPedido(folio){
  const o=ordenes.find(x=>x.folio===folio); if(!o) return;
  const txt=(o.texto||"").replace(/\*/g,"");
  try{ await navigator.clipboard.writeText(txt); toast("Pedido copiado: pégalo en WhatsApp"); }
  catch(e){ prompt("Copia tu pedido:",txt); }
}
function viewConfirmacion(){
  const p=vistaParam||{folio:"",ganados:0};
  return `<div class="conf">
    <div class="sello-ok" aria-hidden="true">✓</div>
    <h1 tabindex="-1">Tu pedido está escrito</h1>
    <p>Pedido ${esc(p.folio)}</p>
    <p>Falta un paso: envíalo en WhatsApp para que OMA lo aparte y te confirme la entrega.</p>
    <div class="acciones">
      <button class="btn" onclick="navegaA(waDe('${esc(p.folio)}'))">Abrir WhatsApp con mi pedido</button>
      <button class="btn btn-claro" onclick="copiarPedido('${esc(p.folio)}')">Copiar el pedido</button>
    </div>
    ${datosTransferencia(p.folio)}
    ${CFG().puntosEnabled!==false&&p.ganados?`<p class="nota">Sumaste ${p.ganados} puntos OMA.</p>`:""}
    <button class="enlace" style="margin-top:12px" onclick="go('home')">Ir al inicio</button>
  </div>`;
}

/* ============ CUENTA ============ */
function nivelDe(p){ return p>=1500?["Élite",1500,3000]:p>=500?["Oro",500,1500]:["Bronce",0,500]; }
function viewPerfil(){
  const C=CFG();
  const [niv,base,tope]=nivelDe(puntos);
  const pct=Math.min(100,Math.round((puntos-base)/(tope-base)*100));
  const beneficio = niv==="Élite" ? `Tienes ${C.eliteDiscountPct||0} % de descuento en cada compra.`
    : niv==="Oro" ? `Tienes ${C.oroDiscountPct||0} % de descuento en cada compra.`
    : `Con 500 puntos llegas a Oro y tienes ${C.oroDiscountPct||0} % de descuento en cada compra; con 1,500, ${C.eliteDiscountPct||0} %.`;
  return `<h1 class="titulo" tabindex="-1">${perfil.nombre?("Hola, "+esc(perfil.nombre.split(" ")[0])):"Tu cuenta"}</h1>
  ${C.puntosEnabled===false?"":`<div class="nivel-card">
    <p>Nivel ${niv}</p>
    <h3>${puntos} puntos</h3>
    <p>${beneficio}</p>
    <p>${tope-puntos>0&&niv!=="Élite"?`Te faltan ${tope-puntos} para el siguiente nivel. Ganas 1 punto por cada $10 de compra.`:"Ganas 1 punto por cada $10 de compra."}</p>
    <div class="nivel-bar"><div style="width:${pct}%"></div></div>
  </div>`}
  <div class="panel">
    <h4>Tus datos</h4>
    ${campo("pfNombre","Nombre",perfil.nombre,'autocomplete="name"')}
    ${campo("pfWhats","WhatsApp",perfil.whats,'type="tel" inputmode="tel" autocomplete="tel"')}
    <button class="btn btn-claro btn-ancho" onclick="perfil.nombre=$('pfNombre').value.trim();perfil.whats=$('pfWhats').value.trim();DB.save('perfil',perfil);toast('Datos guardados');render()">Guardar datos</button>
  </div>
  <button class="perfil-item" onclick="go('pedidos')"><span>Tus pedidos</span><small>${ordenes.length}</small></button>
  <button class="perfil-item" onclick="go('looks')"><span>Tus looks</span><small>${looks.length}</small></button>
  <button class="perfil-item" onclick="verPromos()"><span>Códigos de descuento</span><small aria-hidden="true">+</small></button>
  <button class="perfil-item" onclick="toggleTema()"><span>Modo ${tema==="claro"?"oscuro":"claro"}</span><small aria-hidden="true">${tema==="claro"?"☾":"☀"}</small></button>
  ${ADMIN_VISIBLE?`<button class="perfil-item" onclick="go('admin')"><span>Administrador</span><small aria-hidden="true">→</small></button>`:""}
  ${pieTienda()}`;
}
function verPromos(){
  const hoy=new Date().toISOString().slice(0,10);
  const html=`<div class="hoja-bg" onclick="if(event.target===this)this.remove()"><div class="hoja" role="dialog" aria-label="Códigos de descuento">
    <h3>Códigos de descuento</h3>
    ${Object.entries(CODIGOS).map(([k,c])=>{
      const exp=c.vence&&c.vence<hoy, auto=k==="OUTFIT";
      return `<div class="cupon" style="margin-bottom:10px;${exp?'opacity:.45':''}">
        <div><b>${auto?"Outfit completo":esc(k)}</b><small>${esc(c.desc||"")}${c.vence?`. Vence el ${esc(c.vence)}`:""}${exp?". Vencido":""}</small></div>
        ${exp||auto?"":`<button class="mini-btn" onclick="codigoAplicado='${esc(k)}';DB.save('codigo','${esc(k)}');this.closest('.hoja-bg').remove();toast('Código listo para tu bolsa')">Usar</button>`}
      </div>`;}).join("")}
    <button class="btn btn-claro btn-ancho" style="margin-top:8px" onclick="this.closest('.hoja-bg').remove()">Cerrar</button>
  </div></div>`;
  document.body.insertAdjacentHTML("beforeend",html);
}
function viewPedidos(){
  return `<div class="back-row"><button onclick="go('perfil')"><span aria-hidden="true">←</span> Tu cuenta</button></div>
  <h1 class="titulo" tabindex="-1">Tus pedidos</h1>
  ${ordenes.length?ordenes.map(o=>`<div class="orden">
    <div class="o-head"><b>${esc(o.folio)}</b><span>${esc(o.fecha)}</span></div>
    <p>${o.items.map(i=>`${i.q} × ${esc(i.n)} ${esc(String(i.c).toLowerCase())}, ${esc(i.t)}`).join("; ")}</p>
    <div class="o-head" style="margin-top:8px"><span>${esc(o.estado||"")}</span><b>${peso(o.total)}</b></div>
    ${o.texto?`<div class="acciones">
      <button class="mini-btn sec2" onclick="navegaA(waDe('${esc(o.folio)}'))">Reenviar por WhatsApp</button>
      <button class="mini-btn sec2" onclick="copiarPedido('${esc(o.folio)}')">Copiar</button></div>`:""}
  </div>`).join("")
  :`<div class="vacio-msg"><h2>Todavía no hay pedidos</h2><p>Cuando hagas uno lo verás aquí.</p><button class="btn" onclick="go('tienda')">Ver la colección</button></div>`}`;
}

function navegaA(url){ try{ window.location.href=url; }catch(e){} }

/* ---------- instalación en iOS (Safari no ofrece el aviso nativo) ---------- */
function esIOSInstalable(){
  const ua=navigator.userAgent||"";
  const iOS=/iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const safari=/Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const standalone = window.navigator.standalone===true || (window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches);
  return iOS && safari && !standalone;
}
function pintaBannerInstalar(){
  if($("bannerInstalar")||!esIOSInstalable()) return;
  if(Date.now() < DB.load("instalarOcultoHasta",0)) return;
  document.body.insertAdjacentHTML("beforeend",
    `<div id="bannerInstalar"><div style="flex:1">Para tener OMA como app: toca <b>Compartir</b> y luego <b>Agregar a pantalla de inicio</b>.</div>
      <button onclick="cerrarBannerInstalar()" aria-label="Cerrar">×</button></div>`);
}
function cerrarBannerInstalar(){
  DB.save("instalarOcultoHasta", Date.now()+14*24*60*60*1000);
  const b=$("bannerInstalar"); if(b) b.remove();
}

/* ---------- tema ---------- */
function aplicaTema(){
  document.documentElement.dataset.tema=tema==="oscuro"?"oscuro":"claro";
  const mt=document.querySelector('meta[name="theme-color"]'); if(mt) mt.content=tema==="oscuro"?"#191919":"#F7F3ED";
}
function toggleTema(){ tema=tema==="claro"?"oscuro":"claro"; DB.save("tema",tema); aplicaTema(); render(); }

/* ---------- arranque ---------- */
limpiaEstado();
window.addEventListener("scroll",()=>{ const t=$("topbar"); if(t&&t.classList) t.classList.toggle("linea",window.scrollY>8); },{passive:true});
document.addEventListener("DOMContentLoaded",()=>{
  aplicaTema(); pintaAviso(); pintaWaFloat(); cargarCatalogo(); cargaPromos(); procesaRetornoMP(); procesaEnlaceEntrada();
  const directo = vista!=="home";                       // quien llega a una prenda o del pago no espera
  setTimeout(()=>{
    const s=$("splash"); if(s) s.classList.add("out");
    $("app").classList.add("show"); render(); pintaBannerInstalar();
    setTimeout(()=>{ if(s) s.style.display="none"; },520);
  }, directo?0:650);
});

/* acceso de diagnóstico y pruebas */
const DIAG={
  get carrito(){return carrito}, set carrito(v){carrito=v},
  get looks(){return looks}, get ordenes(){return ordenes}, get puntos(){return puntos},
  get codigoAplicado(){return codigoAplicado}, set codigoAplicado(v){codigoAplicado=v},
  get outfit(){return outfit}, set outfit(v){outfit=v},
  get entrega(){return entrega}, set entrega(v){entrega=v},
  set catFiltro(v){catFiltro=v}, set filtroColor(v){filtroColor=v}, set filtroTalla(v){filtroTalla=v},
  totales, cartCount, DB
};
Object.defineProperty(window,"__oma",{value:DIAG});
Object.defineProperty(window,"__roma",{value:DIAG});

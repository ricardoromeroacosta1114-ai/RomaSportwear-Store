/* ============================================================
   ROMA SPORTSWEAR — Tienda móvil
   Catálogo tomado del inventario real del POS ROMA.
   ------------------------------------------------------------
   CONFIGURACIÓN EDITABLE (cámbiala aquí):                      */
/* configuración: base en config.js + overrides guardados por el administrador */
let CFG_OVR = (function(){ try{return JSON.parse(localStorage.getItem("romastore_cfg")||"{}");}catch(e){return {};} })();
function CFG(){ return Object.assign({}, ROMA_CONFIG, CFG_OVR); }
function setCfgOverrides(o){ CFG_OVR=o||{}; try{localStorage.setItem("romastore_cfg",JSON.stringify(CFG_OVR));}catch(e){} }
const CODIGOS = {
  ROMA10:      { tipo:"pct",   valor:10, desc:"10% de descuento en tu compra" },
  BIENVENIDA:  { tipo:"fijo",  valor:50, min:300, desc:"$50 de regalo en compras desde $300" },
  ENVIOGRATIS: { tipo:"envio", desc:"Envío gratis en tu pedido" },
  LOOK15:      { tipo:"look",  get valor(){return CFG().outfitDiscountPct;}, get desc(){return CFG().outfitDiscountPct+"% al llevar el look completo (arriba + abajo)";} },
  VERANO25:    { tipo:"pct",   valor:25, vence:"2026-06-30", desc:"25% — promoción de verano" }
};
/* ============================================================ */

/* ---------- inventario (sincronizado del POS) ---------- */
const INV = [
{sku:"ROM-CHAM-NEG-S",nombre:"Chamarra Deportiva",cat:"Chamarras",color:"Negro",talla:"S",precio:250,stock:2},{sku:"ROM-CHAM-NEG-M",nombre:"Chamarra Deportiva",cat:"Chamarras",color:"Negro",talla:"M",precio:250,stock:2},{sku:"ROM-CHAM-NEG-L",nombre:"Chamarra Deportiva",cat:"Chamarras",color:"Negro",talla:"L",precio:250,stock:2},
{sku:"ROM-CHAM-BLA-S",nombre:"Chamarra Deportiva",cat:"Chamarras",color:"Blanco",talla:"S",precio:250,stock:1},{sku:"ROM-CHAM-BLA-M",nombre:"Chamarra Deportiva",cat:"Chamarras",color:"Blanco",talla:"M",precio:250,stock:2},{sku:"ROM-CHAM-BLA-L",nombre:"Chamarra Deportiva",cat:"Chamarras",color:"Blanco",talla:"L",precio:250,stock:1},
{sku:"ROM-CHAM-AZO-S",nombre:"Chamarra Deportiva",cat:"Chamarras",color:"Azul Oscuro",talla:"S",precio:250,stock:1},{sku:"ROM-CHAM-AZO-M",nombre:"Chamarra Deportiva",cat:"Chamarras",color:"Azul Oscuro",talla:"M",precio:250,stock:1},{sku:"ROM-CHAM-AZO-L",nombre:"Chamarra Deportiva",cat:"Chamarras",color:"Azul Oscuro",talla:"L",precio:250,stock:1},
{sku:"ROM-CHAM-CAF-M",nombre:"Chamarra Deportiva",cat:"Chamarras",color:"Cafe",talla:"M",precio:250,stock:1},{sku:"ROM-CHAM-CAF-L",nombre:"Chamarra Deportiva",cat:"Chamarras",color:"Cafe",talla:"L",precio:250,stock:1},
{sku:"ROM-CHAM-AZL-M",nombre:"Chamarra Deportiva",cat:"Chamarras",color:"Azul Lago",talla:"M",precio:250,stock:1},{sku:"ROM-CHAM-AZL-L",nombre:"Chamarra Deportiva",cat:"Chamarras",color:"Azul Lago",talla:"L",precio:250,stock:1},
{sku:"ROM-CHAM-ROB-S",nombre:"Chamarra Deportiva",cat:"Chamarras",color:"Rosa",talla:"S",precio:250,stock:1},{sku:"ROM-CHAM-ROB-M",nombre:"Chamarra Deportiva",cat:"Chamarras",color:"Rosa",talla:"M",precio:250,stock:1},
{sku:"ROM-TUBITO-NEG-S",nombre:"Leggings Tubito",cat:"Leggings",color:"Negro",talla:"S",precio:200,stock:2},{sku:"ROM-TUBITO-NEG-M",nombre:"Leggings Tubito",cat:"Leggings",color:"Negro",talla:"M",precio:200,stock:2},{sku:"ROM-TUBITO-NEG-L",nombre:"Leggings Tubito",cat:"Leggings",color:"Negro",talla:"L",precio:200,stock:2},
{sku:"ROM-TUBITO-AZO-S",nombre:"Leggings Tubito",cat:"Leggings",color:"Azul Oscuro",talla:"S",precio:200,stock:1},{sku:"ROM-TUBITO-AZO-M",nombre:"Leggings Tubito",cat:"Leggings",color:"Azul Oscuro",talla:"M",precio:200,stock:1},{sku:"ROM-TUBITO-AZO-L",nombre:"Leggings Tubito",cat:"Leggings",color:"Azul Oscuro",talla:"L",precio:200,stock:1},
{sku:"ROM-TUBITO-CAF-S",nombre:"Leggings Tubito",cat:"Leggings",color:"Cafe",talla:"S",precio:200,stock:1},{sku:"ROM-TUBITO-CAF-M",nombre:"Leggings Tubito",cat:"Leggings",color:"Cafe",talla:"M",precio:200,stock:1},{sku:"ROM-TUBITO-CAF-L",nombre:"Leggings Tubito",cat:"Leggings",color:"Cafe",talla:"L",precio:200,stock:1},
{sku:"ROM-TUBITO-MOR-S",nombre:"Leggings Tubito",cat:"Leggings",color:"Morado",talla:"S",precio:200,stock:1},{sku:"ROM-TUBITO-MOR-M",nombre:"Leggings Tubito",cat:"Leggings",color:"Morado",talla:"M",precio:200,stock:1},
{sku:"ROM-TUBITO-AZL-M",nombre:"Leggings Tubito",cat:"Leggings",color:"Azul Lago",talla:"M",precio:200,stock:1},
{sku:"ROM-TUBITO-CAC-M",nombre:"Leggings Tubito",cat:"Leggings",color:"Cacao",talla:"M",precio:200,stock:1},
{sku:"ROM-CAMPANA-NEG-S",nombre:"Leggings Campana",cat:"Leggings",color:"Negro",talla:"S",precio:280,stock:2},{sku:"ROM-CAMPANA-NEG-M",nombre:"Leggings Campana",cat:"Leggings",color:"Negro",talla:"M",precio:280,stock:2},{sku:"ROM-CAMPANA-NEG-L",nombre:"Leggings Campana",cat:"Leggings",color:"Negro",talla:"L",precio:280,stock:2},
{sku:"ROM-CAMPANA-CAF-S",nombre:"Leggings Campana",cat:"Leggings",color:"Cafe",talla:"S",precio:280,stock:1},{sku:"ROM-CAMPANA-CAF-M",nombre:"Leggings Campana",cat:"Leggings",color:"Cafe",talla:"M",precio:280,stock:1},{sku:"ROM-CAMPANA-CAF-L",nombre:"Leggings Campana",cat:"Leggings",color:"Cafe",talla:"L",precio:280,stock:1},
{sku:"ROM-CAMPANA-AZO-S",nombre:"Leggings Campana",cat:"Leggings",color:"Azul Oscuro",talla:"S",precio:280,stock:1},{sku:"ROM-CAMPANA-AZO-M",nombre:"Leggings Campana",cat:"Leggings",color:"Azul Oscuro",talla:"M",precio:280,stock:1},{sku:"ROM-CAMPANA-AZO-L",nombre:"Leggings Campana",cat:"Leggings",color:"Azul Oscuro",talla:"L",precio:280,stock:1},
{sku:"ROM-CAMPANA-CAC-S",nombre:"Leggings Campana",cat:"Leggings",color:"Cacao",talla:"S",precio:280,stock:1},{sku:"ROM-CAMPANA-CAC-M",nombre:"Leggings Campana",cat:"Leggings",color:"Cacao",talla:"M",precio:280,stock:1},{sku:"ROM-CAMPANA-CAC-L",nombre:"Leggings Campana",cat:"Leggings",color:"Cacao",talla:"L",precio:280,stock:1},
{sku:"ROM-PLAYERA-NEG-S",nombre:"Playera Dry-Fit",cat:"Playeras",color:"Negro",talla:"S",precio:150,stock:1},{sku:"ROM-PLAYERA-NEG-M",nombre:"Playera Dry-Fit",cat:"Playeras",color:"Negro",talla:"M",precio:150,stock:1},{sku:"ROM-PLAYERA-NEG-L",nombre:"Playera Dry-Fit",cat:"Playeras",color:"Negro",talla:"L",precio:150,stock:1},
{sku:"ROM-PLAYERA-MAR-S",nombre:"Playera Dry-Fit",cat:"Playeras",color:"Beige",talla:"S",precio:150,stock:1},
{sku:"ROM-PLAYERA-AMA-S",nombre:"Playera Dry-Fit",cat:"Playeras",color:"Amarillo",talla:"S",precio:150,stock:1},
{sku:"ROM-PLAYERA-AZO-M",nombre:"Playera Dry-Fit",cat:"Playeras",color:"Azul Oscuro",talla:"M",precio:150,stock:1},
{sku:"ROM-PLAYERA-ROS-M",nombre:"Playera Dry-Fit",cat:"Playeras",color:"Rosa",talla:"M",precio:150,stock:1},
{sku:"ROM-PLAYERA-AZL-L",nombre:"Playera Dry-Fit",cat:"Playeras",color:"Azul Lago",talla:"L",precio:150,stock:1},
{sku:"ROM-PLAYERA-ROJ-L",nombre:"Playera Dry-Fit",cat:"Playeras",color:"Guinda",talla:"L",precio:150,stock:1},
{sku:"ROM-PLAYERA-MOR-L",nombre:"Playera Dry-Fit",cat:"Playeras",color:"Morado",talla:"L",precio:150,stock:1},
{sku:"ROM-RECTO-NEG-S",nombre:"Leggings Recto",cat:"Leggings",color:"Negro",talla:"S",precio:300,stock:12},{sku:"ROM-RECTO-NEG-M",nombre:"Leggings Recto",cat:"Leggings",color:"Negro",talla:"M",precio:300,stock:18},{sku:"ROM-RECTO-NEG-L",nombre:"Leggings Recto",cat:"Leggings",color:"Negro",talla:"L",precio:300,stock:18},
{sku:"ROM-RECTO-MAR-S",nombre:"Leggings Recto",cat:"Leggings",color:"Beige",talla:"S",precio:300,stock:3},{sku:"ROM-RECTO-MAR-M",nombre:"Leggings Recto",cat:"Leggings",color:"Beige",talla:"M",precio:300,stock:5},{sku:"ROM-RECTO-MAR-L",nombre:"Leggings Recto",cat:"Leggings",color:"Beige",talla:"L",precio:300,stock:4},
{sku:"ROM-RECTO-CAF-S",nombre:"Leggings Recto",cat:"Leggings",color:"Cafe",talla:"S",precio:300,stock:5},{sku:"ROM-RECTO-CAF-M",nombre:"Leggings Recto",cat:"Leggings",color:"Cafe",talla:"M",precio:300,stock:8},{sku:"ROM-RECTO-CAF-L",nombre:"Leggings Recto",cat:"Leggings",color:"Cafe",talla:"L",precio:300,stock:7}
];

/* metadatos de escaparate (editable): novedades y ofertas */
const NUEVO = ["Leggings Recto","Chamarra Deportiva"];
const OFERTA = { "Leggings Tubito":240, "Playera Dry-Fit":180 }; // precio anterior tachado

/* ---------- modelos agrupados (nombre+color) ---------- */
function slug(s){return s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g,"-");}
let MODELOS = (()=> {
  const m = {};
  INV.forEach(p=>{
    const id = slug(p.nombre+"-"+p.color);
    if(!m[id]) m[id] = { id, nombre:p.nombre, cat:p.cat, color:p.color, precio:p.precio,
      antes:OFERTA[p.nombre]||null, nuevo:NUEVO.includes(p.nombre),
      tipo: p.cat==="Playeras"?"arriba" : p.cat==="Chamarras"?"capa" : "abajo",
      forma: p.nombre.includes("Tubito")?"tubito" : p.nombre.includes("Campana")?"campana"
           : p.nombre.includes("Recto")?"recto" : p.cat==="Chamarras"?"chamarra":"playera",
      tallas:{} };
    m[id].tallas[p.talla] = { sku:p.sku, stock:p.stock };
  });
  return Object.values(m);
})();
const modelo = id => MODELOS.find(x=>x.id===id);
const variantes = nombre => MODELOS.filter(x=>x.nombre===nombre);

/* ---------- colores ---------- */
const COLORES = {
  "Negro":["#211E1A","#0D0C0A"], "Blanco":["#F4F0E7","#D9D3C4"], "Azul Oscuro":["#26344B","#161F2E"],
  "Cafe":["#6E5138","#4A3524"], "Azul Lago":["#3E7E8C","#2A5661"], "Rosa":["#D795A6","#B5717F"],
  "Morado":["#6C5990","#4C3D68"], "Cacao":["#8A6A50","#5F4736"], "Beige":["#CBB989","#A89B77"], "Amarillo":["#D4AF3F","#A8862C"], "Guinda":["#7C3140","#57202B"]
};

/* ---------- siluetas SVG de prendas ---------- */
function svgPrenda(forma, colorName, h=120){
  const [c,s] = COLORES[colorName] || ["#999","#666"];
  const oro="#C9A85C";
  const cuerpos={
    playera:`<path d="M50,14 C44,14 39,16.5 36,20 L15,29 L21,49 L30,45 L30,102 Q50,109 70,102 L70,45 L79,49 L85,29 L64,20 C61,16.5 56,14 50,14 Z" fill="${c}" stroke="${s}" stroke-width="1.6"/>
      <path d="M41,15.5 Q50,24 59,15.5" fill="none" stroke="${s}" stroke-width="1.8"/>
      <rect x="46.6" y="90" width="6.8" height="2.6" rx="1.3" fill="${oro}"/>`,
    chamarra:`<path d="M50,10 C44,10 40,12.5 37,16 L15,25 L11,75 L23,77 L28,45 L28,106 Q50,113 72,106 L72,45 L77,77 L89,75 L85,25 L63,16 C60,12.5 56,10 50,10 Z" fill="${c}" stroke="${s}" stroke-width="1.6"/>
      <path d="M50,20 L50,105" stroke="${s}" stroke-width="1.7"/>
      <path d="M41,12 L50,22 L59,12" fill="none" stroke="${s}" stroke-width="1.8"/>
      <path d="M34,88 L44,88 M56,88 L66,88" stroke="${s}" stroke-width="1.5"/>
      <rect x="51.6" y="24" width="3.4" height="7" rx="1.4" fill="${oro}"/>`,
    tubito:`<path d="M31,10 L69,10 L67,42 L63.5,122 L53.5,122 L50,58 L46.5,122 L36.5,122 L33,42 Z" fill="${c}" stroke="${s}" stroke-width="1.6"/>
      <rect x="31" y="10" width="38" height="8" rx="3" fill="${s}"/>
      <rect x="47" y="12.4" width="6" height="3.2" rx="1.4" fill="${oro}"/>`,
    recto:`<path d="M31,10 L69,10 L67,44 L66,122 L52.5,122 L50,60 L47.5,122 L34,122 L33,44 Z" fill="${c}" stroke="${s}" stroke-width="1.6"/>
      <rect x="31" y="10" width="38" height="8" rx="3" fill="${s}"/>
      <rect x="47" y="12.4" width="6" height="3.2" rx="1.4" fill="${oro}"/>`,
    campana:`<path d="M31,10 L69,10 L67,44 L76,122 L54,122 L50,62 L46,122 L24,122 L33,44 Z" fill="${c}" stroke="${s}" stroke-width="1.6"/>
      <rect x="31" y="10" width="38" height="8" rx="3" fill="${s}"/>
      <rect x="47" y="12.4" width="6" height="3.2" rx="1.4" fill="${oro}"/>`
  };
  return `<svg viewBox="0 0 100 130" height="${h}" role="img" aria-label="${forma} ${colorName}">${cuerpos[forma]||cuerpos.playera}</svg>`;
}

/* ---------- catálogo remoto (Supabase, si está configurado) ---------- */
function filaAModelo(r){
  return { id:r.id, nombre:r.nombre, descripcion:r.descripcion||"", cat:r.cat, color:r.color,
    precio:Number(r.precio), antes:r.antes?Number(r.antes):null, nuevo:!!r.nuevo, oferta:!!r.oferta,
    agotado:!!r.agotado, tipo:r.tipo||"arriba", forma:r.forma||"playera",
    tallas:r.tallas||{}, imagenes:r.imagenes||[], imgPrincipal:r.img_principal||0 };
}
function adoptaCatalogo(rows){
  if(!rows||!rows.length) return;
  MODELOS = rows.filter(r=>r.activo!==false).map(filaAModelo);
  try{localStorage.setItem("romastore_catalogo",JSON.stringify(rows));}catch(e){}
}
async function cargarCatalogo(){
  try{ const cache=JSON.parse(localStorage.getItem("romastore_catalogo")||"null"); if(cache) adoptaCatalogo(cache); }catch(e){}
  if(!window.sb) return;
  try{
    const {data,error}=await sb.from("productos").select("*").order("orden",{ascending:true});
    if(!error&&data&&data.length){ adoptaCatalogo(data); render(); }
    const cfg=await sb.from("config").select("datos").eq("id",1).maybeSingle();
    if(cfg.data&&cfg.data.datos){ setCfgOverrides(cfg.data.datos); render(); pintaWaFloat(); }
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
let codigoAplicado = DB.load("codigo",null);
let entrega = DB.load("entrega","pickup"); if(entrega==="envio"){entrega="local";DB.save("entrega","local");}
let tema    = DB.load("tema","claro");

let vista="home", vistaParam=null, catFiltro="Todo";
let filtroTalla="", filtroColor="", filtroPrecio="", filtroDisp="";
let fichaColorSel={}, fichaTallaSel={};
let outfit = DB.load("outfit",{arriba:null,abajo:null,capa:null}); // ids de modelo
let slotActivo="arriba";

const $ = id=>document.getElementById(id);
const peso = n=>"$"+(Math.round(n*100)/100).toLocaleString("es-MX",{minimumFractionDigits:2});
function toast(m){ const t=$("toast"); t.textContent=m; t.classList.add("on"); clearTimeout(t._x); t._x=setTimeout(()=>t.classList.remove("on"),2200); }

/* ---------- reseñas seed ---------- */
const RESENAS_POOL=[
 ["Karla M.","La tela es de otra calidad, no se transparenta nada. Segunda compra."],
 ["Fernanda R.","Me encantó el corte, estiliza muchísimo. Llegó rápido en Mexicali."],
 ["Alexa T.","Talla fiel. El color es igualito al de la foto del look."],
 ["Dany G.","Lo compré con el outfit completo por el 15% y valió toda la pena."],
 ["Marifer L.","Súper cómodo para el gym y para salir. Quiero más colores."]
];
function resenasDe(id){ let h=0; for(const ch of id) h=(h*31+ch.charCodeAt(0))>>>0;
  const n=2+(h%2); const out=[]; for(let i=0;i<n;i++) out.push(RESENAS_POOL[(h+i*2)%RESENAS_POOL.length]);
  return {items:out, rating:(4.6+((h%4)/10)).toFixed(1)};
}

/* ---------- carrito helpers ---------- */
const skuInfo = sku => { for(const m of MODELOS) for(const [t,v] of Object.entries(m.tallas)) if(v.sku===sku) return {m,talla:t,stock:v.stock}; return null; };
const cartCount = ()=>carrito.reduce((s,i)=>s+i.cant,0);
function addSku(sku,cant=1,silencio=false){
  const info=skuInfo(sku); if(!info) return false;
  const ya=carrito.find(i=>i.sku===sku);
  const actual=ya?ya.cant:0;
  if(actual+cant>info.stock){ toast("Solo quedan "+info.stock+" en talla "+info.talla); cant=info.stock-actual; if(cant<=0) return false; }
  if(ya) ya.cant+=cant; else carrito.push({sku,cant});
  DB.save("carrito",carrito); pintaBadge(true);
  if(!silencio) toast("Agregado al carrito");
  return true;
}
function pintaBadge(pop){
  const b=$("cartBadge"), n=cartCount();
  b.textContent=n; b.classList.toggle("on",n>0);
  if(pop&&n>0){ b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }
}

/* ---------- totales + códigos ---------- */
function lookCompletoEnCarrito(){
  const tipos=new Set(carrito.map(i=>skuInfo(i.sku)?.m.tipo));
  return (tipos.has("arriba")||tipos.has("capa")) && tipos.has("abajo");
}
function validaCodigo(cod){
  cod=(cod||"").trim().toUpperCase();
  if(!cod) return {ok:false,msg:"Escribe un código"};
  const c=CODIGOS[cod];
  if(!c) return {ok:false,msg:"Código no válido"};
  if(c.vence && c.vence < new Date().toISOString().slice(0,10)) return {ok:false,msg:"Este código ya expiró"};
  const sub=carrito.reduce((s,i)=>{const inf=skuInfo(i.sku);return s+inf.m.precio*i.cant;},0);
  if(c.min && sub<c.min) return {ok:false,msg:"Válido en compras desde "+peso(c.min)};
  if(c.tipo==="look" && !lookCompletoEnCarrito()) return {ok:false,msg:"Necesitas una prenda de arriba y una de abajo"};
  return {ok:true,cod,c,msg:"✓ "+c.desc};
}
function totales(){
  const sub=carrito.reduce((s,i)=>{const inf=skuInfo(i.sku);return s+inf.m.precio*i.cant;},0);
  let desc=0, envioGratisCod=false, etiqueta="";
  if(codigoAplicado){
    const v=validaCodigo(codigoAplicado);
    if(!v.ok){ codigoAplicado=null; DB.save("codigo",null); }
    else{
      const c=v.c;
      if(c.tipo==="pct"||c.tipo==="look") desc=sub*c.valor/100;
      else if(c.tipo==="fijo") desc=Math.min(c.valor,sub);
      else if(c.tipo==="envio") envioGratisCod=true;
      etiqueta=codigoAplicado;
    }
  }
  const C=CFG();
  const costoBase = entrega==="pickup" ? 0 : entrega==="nacional" ? C.nationalShippingCost : C.localDeliveryCost;
  const gratis = envioGratisCod || (C.freeShippingFrom>0 && (sub-desc)>=C.freeShippingFrom);
  let envio = (sub>0 && !gratis) ? costoBase : 0;
  return {sub,desc,envio,total:Math.max(sub-desc,0)+envio,etiqueta,envioGratisCod};
}

/* ---------- router ---------- */
const NAV=[["home","⌂","Inicio"],["tienda","▤","Tienda"],["armador","✦","Armar"],["looks","♡","Looks"],["perfil","◉","Perfil"]];
function go(v,param=null){ vista=v; vistaParam=param; render(); window.scrollTo({top:0}); }
function render(){
  $("nav").innerHTML=NAV.map(([k,ic,l])=>`<button class="${vista===k?'on':''}" onclick="go('${k}')"><span class="ic">${ic}</span>${l}</button>`).join("");
  const V=Object.assign({home:viewHome,tienda:viewTienda,producto:viewProducto,armador:viewArmador,looks:viewLooks,
    carrito:viewCarrito,checkout:viewCheckout,confirmacion:viewConfirmacion,perfil:viewPerfil,pedidos:viewPedidos}, window.EXTRA_VIEWS||{});
  $("views").innerHTML=`<div class="view">${(V[vista]||viewHome)()}</div>`;
  pintaBadge(false);
}

/* ============================================================
   VISTAS
============================================================ */
function figuraDe(m,h){
  const imgs=m.imagenes||[];
  const principal=imgs[m.imgPrincipal||0]||imgs[0];
  return principal?`<img src="${principal}" alt="${m.nombre} ${m.color}" style="width:100%;height:100%;object-fit:cover" loading="lazy">`:svgPrenda(m.forma,m.color,h);
}
function cardProducto(m){
  const ago = m.agotado || !Object.values(m.tallas).some(v=>v.stock>0);
  const tag = ago?`<span class="tag" style="background:var(--gris)">AGOTADO</span>` : m.antes?`<span class="tag oferta">OFERTA</span>` : m.nuevo?`<span class="tag">NUEVO</span>`:"";
  return `<button class="p-card" style="${ago?'opacity:.55':''}" onclick="go('producto','${m.id}')">
    <div class="p-fig">${tag}${figuraDe(m,150)}</div>
    <div class="p-nombre">${m.nombre}</div>
    <div class="p-meta">${m.color} · ${Object.keys(m.tallas).join(" / ")}</div>
    <div class="p-precio">${peso(m.precio)}${m.antes?`<s>${peso(m.antes)}</s>`:""}</div>
  </button>`;
}

/* looks curados */
const LOOKS_ROMA=[
 {nombre:"Total Black", desc:"El clásico que no falla",  slots:{arriba:"playera-dry-fit-negro",abajo:"leggings-recto-negro",capa:"chamarra-deportiva-negro"}},
 {nombre:"Tierra",      desc:"Tonos cálidos, energía suave", slots:{arriba:"playera-dry-fit-beige",abajo:"leggings-recto-cafe",capa:"chamarra-deportiva-cafe"}},
 {nombre:"Lago",        desc:"Azules profundos para entrenar", slots:{arriba:"playera-dry-fit-azul-lago",abajo:"leggings-campana-azul-oscuro",capa:"chamarra-deportiva-azul-lago"}}
];
function lookPrecio(sl){ return ["arriba","abajo","capa"].reduce((s,k)=>{const m=sl[k]&&modelo(sl[k]);return s+(m?m.precio:0);},0); }
function lookFlat(sl,esc=1){
  const a=sl.arriba&&modelo(sl.arriba), b=sl.abajo&&modelo(sl.abajo), c=sl.capa&&modelo(sl.capa);
  return `${c?`<div style="position:absolute;left:14%;top:12px;transform:rotate(-7deg)">${svgPrenda(c.forma,c.color,120*esc)}</div>`:""}
    ${a?`<div style="position:absolute;left:50%;top:8px;transform:translateX(-42%)">${svgPrenda(a.forma,a.color,118*esc)}</div>`:""}
    ${b?`<div style="position:absolute;right:12%;top:34px;transform:rotate(6deg)">${svgPrenda(b.forma,b.color,150*esc)}</div>`:""}`;
}

function viewHome(){
  const nuevos=MODELOS.filter(m=>m.nuevo);
  const ofertas=MODELOS.filter(m=>m.antes);
  const cats=["Todo","Leggings","Playeras","Chamarras","Nuevo","Ofertas"];
  return `
  <section class="hero">
    <div class="eyebrow">Mexicali · Nueva colección</div>
    <h1 class="serif">El look<br>completo.</h1>
    <p>No vendemos prendas sueltas. Armamos outfits que se sienten tuyos.</p>
    <button class="btn-oro" onclick="go('armador')"><span class="fl">✦</span> Arma tu outfit</button>
  </section>
  <div class="chips">${cats.map(c=>`<button class="chip ${catFiltro===c?'on':''}" onclick="catFiltro='${c}';go('tienda')">${c}</button>`).join("")}</div>

  <section class="sec"><div class="sec-head"><h3 class="serif">Outfits armados por ROMA</h3></div></section>
  <div class="carrusel">
    ${LOOKS_ROMA.map((L,i)=>`<div class="look-card">
      <div class="look-flat">${lookFlat(L.slots,.92)}</div>
      <div class="look-body"><h4 class="serif">${L.nombre}</h4><p>${L.desc}</p>
        <div class="look-cta"><b>${peso(lookPrecio(L.slots))}</b>
          <div style="display:flex;gap:7px">
            <button class="mini-btn sec2" onclick="abrirLookEnArmador(${i})">Editar</button>
            <button class="mini-btn" onclick="lookAlCarrito(${i},this)">Llevar look</button>
          </div></div></div>
    </div>`).join("")}
  </div>

  <section class="sec"><div class="sec-head"><h3 class="serif">Nuevos lanzamientos</h3>
    <button onclick="catFiltro='Nuevo';go('tienda')">Ver todo →</button></div></section>
  <div class="carrusel">${nuevos.map(cardProducto).join("")}</div>

  <section class="sec"><div class="sec-head"><h3 class="serif">Ofertas</h3>
    <button onclick="catFiltro='Ofertas';go('tienda')">Ver todo →</button></div></section>
  <div class="carrusel">${ofertas.map(cardProducto).join("")}</div>`;
}

function viewTienda(){
  const cats=["Todo","Leggings","Playeras","Chamarras","Nuevo","Ofertas"];
  let list=MODELOS;
  if(catFiltro==="Nuevo") list=list.filter(m=>m.nuevo);
  else if(catFiltro==="Ofertas") list=list.filter(m=>m.antes);
  else if(catFiltro!=="Todo") list=list.filter(m=>m.cat===catFiltro);
  if(filtroTalla) list=list.filter(m=>m.tallas[filtroTalla]&&m.tallas[filtroTalla].stock>0);
  if(filtroColor) list=list.filter(m=>m.color===filtroColor);
  if(filtroDisp==='si') list=list.filter(m=>!m.agotado&&Object.values(m.tallas).some(v=>v.stock>0));
  if(filtroPrecio==="menor") list=[...list].sort((a,b)=>a.precio-b.precio);
  if(filtroPrecio==="mayor") list=[...list].sort((a,b)=>b.precio-a.precio);
  const colores=[...new Set(MODELOS.map(m=>m.color))];
  return `
  <h2 class="titulo serif">Tienda</h2>
  <div class="chips">${cats.map(c=>`<button class="chip ${catFiltro===c?'on':''}" onclick="catFiltro='${c}';render()">${c}</button>`).join("")}</div>
  <div class="filtros">
    <select class="f-sel" onchange="filtroTalla=this.value;render()">
      <option value="">Talla</option>${["S","M","L"].map(t=>`<option ${filtroTalla===t?'selected':''}>${t}</option>`).join("")}</select>
    <select class="f-sel" onchange="filtroColor=this.value;render()">
      <option value="">Color</option>${colores.map(c=>`<option ${filtroColor===c?'selected':''}>${c}</option>`).join("")}</select>
    <select class="f-sel" onchange="filtroDisp=this.value;render()">
      <option value="">Disponibilidad</option><option value="si" ${filtroDisp==='si'?'selected':''}>En existencia</option></select>
    <select class="f-sel" onchange="filtroPrecio=this.value;render()">
      <option value="">Precio</option><option value="menor" ${filtroPrecio==='menor'?'selected':''}>Menor a mayor</option>
      <option value="mayor" ${filtroPrecio==='mayor'?'selected':''}>Mayor a menor</option></select>
    ${(filtroTalla||filtroColor||filtroPrecio||filtroDisp)?`<button class="chip" onclick="filtroTalla='';filtroColor='';filtroPrecio='';render()">Limpiar ✕</button>`:""}
  </div>
  ${list.length?`<div class="grid">${list.map(cardProducto).join("")}</div>`
   :`<div class="vacio-msg"><div class="big">◌</div><h3 class="serif">Sin resultados</h3><p>Prueba con otros filtros.</p></div>`}`;
}

function viewProducto(){
  const m=modelo(vistaParam); if(!m) return viewTienda();
  const colorSel=fichaColorSel[m.nombre]||m.color;
  const mSel=variantes(m.nombre).find(v=>v.color===colorSel)||m;
  const tallaSel=fichaTallaSel[mSel.id]||"";
  const rs=resenasDe(mSel.id);
  const combos=sugerencias(mSel);
  return `
  <div class="back-row"><button onclick="go('tienda')">← Tienda</button></div>
  <div class="ficha-fig" id="fichaFig" onclick="this.classList.toggle('zoom')">
    ${mSel.antes?`<span class="tag oferta">OFERTA</span>`:mSel.nuevo?`<span class="tag">NUEVO</span>`:""}
    ${figuraDe(mSel,300)}
    <span class="zoom-hint">Toca para acercar</span>
  </div>
  ${(mSel.imagenes||[]).length>1?`<div style="display:flex;gap:8px;overflow-x:auto;padding:10px 20px 0">${mSel.imagenes.map((u,i)=>`<img src="${u}" onclick="modelo('${mSel.id}').imgPrincipal=${i};render()" style="width:58px;height:70px;object-fit:cover;border-radius:10px;border:2px solid ${i===(mSel.imgPrincipal||0)?'var(--oro)':'var(--linea)'}">`).join("")}</div>`:""}
  <div class="ficha-body">
    <div class="eyebrow">${mSel.cat}</div>
    <h1 class="serif">${mSel.nombre}</h1>
    <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
      <span style="font-size:20px;font-weight:700">${peso(mSel.precio)}</span>
      ${mSel.antes?`<s style="color:var(--gris)">${peso(mSel.antes)}</s>`:""}
      <span style="flex:1"></span>
      <span class="estrellas">★★★★★</span><b style="font-size:13px">${rs.rating}</b>
    </div>

    <div class="opt-label">Color · ${colorSel}</div>
    <div class="swatches">${variantes(m.nombre).map(v=>{
      const [c]=COLORES[v.color]||["#999"];
      return `<button class="sw ${v.color===colorSel?'on':''}" style="background:${c}" aria-label="${v.color}"
        onclick="fichaColorSel['${m.nombre}']='${v.color}';fichaTallaSel['${v.id}']='';go('producto','${v.id}')"></button>`;}).join("")}</div>

    <div class="opt-label">Talla</div>
    <div class="tallas">${["S","M","L"].map(t=>{
      const v=mSel.tallas[t];
      const ag=!v||v.stock<=0;
      return `<button class="tl ${tallaSel===t?'on':''} ${ag?'agotada':''}"
        onclick="fichaTallaSel['${mSel.id}']='${t}';render()">${t}</button>`;}).join("")}</div>
    ${tallaSel&&mSel.tallas[tallaSel]&&mSel.tallas[tallaSel].stock<=2?`<p style="font-size:12px;color:var(--oro);font-weight:700;margin-top:8px">Últimas ${mSel.tallas[tallaSel].stock} piezas en ${tallaSel}</p>`:""}
  </div>

  <div class="cta-fija">
    <button class="btn-cart" onclick="fichaAdd('${mSel.id}',this)">Agregar al carrito · ${peso(mSel.precio)}</button>
  </div>

  <div class="combina">
    <h3 class="serif">¿Con qué combinarlo?</h3>
    <p>Complementa el look — y desbloquea el ${CFG().outfitDiscountPct}% del outfit completo.</p>
    <div class="combo-row">
      ${combos.map(c=>`<button class="combo-it" onclick="go('producto','${c.id}')">
        <div class="cf">${svgPrenda(c.forma,c.color,74)}</div>
        <span>${c.nombre}</span><small>${c.color} · ${peso(c.precio)}</small></button>`).join("")}
      <button class="combo-it" style="background:var(--tinta);color:var(--papel)" onclick="abrirEnArmador('${mSel.id}')">
        <div class="cf" style="font-size:26px;color:var(--oro-suave)">✦</div>
        <span>Armar el look completo</span></button>
    </div>
  </div>

  <div class="ficha-body">
    <div class="opt-label">Reseñas</div>
    ${rs.items.map(([n,t])=>`<div class="resena"><span class="estrellas" style="font-size:11px">★★★★★</span><b> ${n}</b><p>${t}</p></div>`).join("")}
  </div>`;
}
function sugerencias(m){
  const out=[];
  const negro=c=>c==="Negro";
  const mismaGama=x=>x.color===m.color||negro(x.color)||["Beige","Blanco"].includes(x.color);
  const pool=t=>MODELOS.filter(x=>x.tipo===t&&x.nombre!==m.nombre);
  if(m.tipo!=="abajo"){ const b=pool("abajo").filter(mismaGama); out.push(...(b.length?b:pool("abajo")).slice(0,2)); }
  if(m.tipo!=="arriba"){ const a=pool("arriba").filter(mismaGama); out.push(...(a.length?a:pool("arriba")).slice(0,1)); }
  if(m.tipo!=="capa"){ const c=pool("capa").filter(mismaGama); out.push(...(c.length?c:pool("capa")).slice(0,1)); }
  return out.slice(0,3);
}
function fichaAdd(id,btn){
  const m=modelo(id);
  const t=fichaTallaSel[id];
  if(!t){ toast("Elige tu talla primero"); return; }
  if(addSku(m.tallas[t].sku)){
    btn.classList.add("ok"); btn.textContent="✓ Agregado";
    setTimeout(()=>{btn.classList.remove("ok");btn.textContent="Agregar al carrito · "+peso(m.precio);},1300);
  }
}

/* ============ ARMADOR (feature insignia) ============ */
function abrirEnArmador(id){ const m=modelo(id); outfit[m.tipo]=id; DB.save("outfit",outfit); slotActivo=m.tipo==="arriba"?"abajo":"arriba"; go("armador"); }
function abrirLookEnArmador(i){ outfit={...LOOKS_ROMA[i].slots}; DB.save("outfit",outfit); go("armador"); }
function lookAlCarrito(i,btn){ outfit={...LOOKS_ROMA[i].slots}; DB.save("outfit",outfit); go("armador"); setTimeout(()=>toast("Elige tallas y agrégalo en un tap"),350); }

function viewArmador(){
  const a=outfit.arriba&&modelo(outfit.arriba), b=outfit.abajo&&modelo(outfit.abajo), c=outfit.capa&&modelo(outfit.capa);
  const precio=(a?a.precio:0)+(b?b.precio:0)+(c?c.precio:0);
  const completo=!!((a||c)&&b);
  const pctLook=CFG().outfitDiscountPct;
  const conDesc=completo?precio*(1-pctLook/100):precio;
  const slotBtn=(k,label,top,size)=>{
    const m=outfit[k]&&modelo(outfit[k]);
    return m
      ? `<button class="slot slot-${k}" style="top:${top}px" onclick="slotActivo='${k}';render()">${svgPrenda(m.forma,m.color,size)}</button>`
      : `<button class="slot vacio slot-${k}" style="top:${top}px;width:120px;height:${size*0.8}px" onclick="slotActivo='${k}';render()">+ ${label}</button>`;
  };
  const pickPool=MODELOS.filter(m=>m.tipo===slotActivo);
  return `
  <h2 class="titulo serif">Armador de outfits</h2>
  <p class="subtitulo">Toca una zona del tablero y elige la prenda. Arriba + abajo = ${CFG().outfitDiscountPct}% de descuento.</p>
  <div class="board">
    <div class="board-flat">
      <span class="sello ${completo?'on':''}">LOOK ROMA −${CFG().outfitDiscountPct}%</span>
      ${slotBtn("capa","Capa (opcional)",10,105)}
      ${slotBtn("arriba","Arriba",34,110)}
      ${slotBtn("abajo","Abajo",148,158)}
    </div>
    <div class="board-info">
      <div><div class="tt">${completo?"Look completo":"Tu look va tomando forma"}</div>
        <div class="pp">${peso(conDesc)} ${completo?`<small>ahorras ${peso(precio-conDesc)} con LOOK15</small>`:""}</div></div>
      ${(a||b||c)?`<button class="mini-btn sec2" onclick="outfit={arriba:null,abajo:null,capa:null};DB.save('outfit',outfit);render()">Vaciar</button>`:""}
    </div>
  </div>

  <div class="pick-row">
    <h4>${slotActivo==="arriba"?"Elige la prenda de arriba":slotActivo==="abajo"?"Elige la prenda de abajo":"Elige tu capa"}</h4>
    <div class="pick-scroll">
      ${outfit[slotActivo]?`<button class="pick quitar" onclick="outfit['${slotActivo}']=null;DB.save('outfit',outfit);render()">✕ Quitar</button>`:""}
      ${pickPool.map(m=>`<button class="pick ${outfit[slotActivo]===m.id?'on':''}" onclick="outfit['${slotActivo}']='${m.id}';DB.save('outfit',outfit);render()">
        <div class="pf">${svgPrenda(m.forma,m.color,58)}</div><span>${m.nombre.replace("Leggings ","")}<br><small style="color:var(--gris)">${m.color}</small></span></button>`).join("")}
    </div>
  </div>

  <div class="armador-cta">
    <button class="btn-cart" onclick="outfitAlCarrito(this)" ${!(a||b||c)?"disabled style='opacity:.4'":""}>Agregar todo el outfit al carrito${completo?" · "+peso(conDesc):""}</button>
    <div style="display:flex;gap:10px">
      <button class="btn-linea" style="flex:1" onclick="guardarLook()" ${!(a||b||c)?"disabled style='flex:1;opacity:.4'":""}>♡ Guardar en Mis Looks</button>
      <button class="btn-linea" style="flex:1" onclick="compartirLook()" ${!(a||b||c)?"disabled style='flex:1;opacity:.4'":""}>↗ Compartir</button>
    </div>
  </div>`;
}
function pideTallasOutfit(cb){
  const piezas=["capa","arriba","abajo"].filter(k=>outfit[k]).map(k=>modelo(outfit[k]));
  const html=`<div class="hoja-bg" id="hojaBg" onclick="if(event.target===this)this.remove()"><div class="hoja">
    <div class="asa"></div><h3 class="serif" style="font-size:24px;margin-bottom:2px">Tallas del outfit</h3>
    <p style="color:var(--gris);font-size:13px;margin-bottom:14px">Elige la talla de cada pieza.</p>
    ${piezas.map(m=>`<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--linea)">
      <div style="width:52px">${svgPrenda(m.forma,m.color,48)}</div>
      <div style="flex:1"><b style="font-size:13.5px">${m.nombre}</b><br><small style="color:var(--gris)">${m.color}</small></div>
      <div class="tallas" style="gap:6px">${["S","M","L"].map(t=>{
        const v=m.tallas[t], ag=!v||v.stock<=0;
        return `<button class="tl ${ag?'agotada':''}" data-mid="${m.id}" data-t="${t}" style="min-width:38px;padding:8px 0;font-size:12.5px"
          onclick="this.parentElement.querySelectorAll('.tl').forEach(x=>x.classList.remove('on'));this.classList.add('on')">${t}</button>`;}).join("")}</div>
    </div>`).join("")}
    <button class="btn-cart" style="width:100%;margin-top:18px" id="hojaOk">Confirmar y agregar</button>
  </div></div>`;
  document.body.insertAdjacentHTML("beforeend",html);
  $("hojaOk").onclick=()=>{
    const sel={};
    document.querySelectorAll("#hojaBg .tl.on").forEach(b=>sel[b.dataset.mid]=b.dataset.t);
    if(Object.keys(sel).length<piezas.length){ toast("Falta elegir talla en alguna pieza"); return; }
    $("hojaBg").remove(); cb(sel);
  };
}
function outfitAlCarrito(btn){
  pideTallasOutfit(sel=>{
    let ok=true;
    Object.entries(sel).forEach(([mid,t])=>{ if(!addSku(modelo(mid).tallas[t].sku,1,true)) ok=false; });
    if(lookCompletoEnCarrito()&&!codigoAplicado){ codigoAplicado="LOOK15"; DB.save("codigo",codigoAplicado); }
    toast(ok?"Outfit agregado · LOOK15 aplicado":"Outfit agregado (revisa disponibilidad)");
    go("carrito");
  });
}
function guardarLook(){
  const nombre=prompt("Ponle nombre a tu look:","Mi look "+(looks.length+1));
  if(nombre===null) return;
  looks.unshift({id:Date.now(),nombre:nombre||("Mi look "+(looks.length+1)),slots:{...outfit}});
  DB.save("looks",looks); toast("Guardado en Mis Looks ♡");
}

/* compartir look como imagen */
async function compartirLook(){
  try{
    const cv=document.createElement("canvas"); cv.width=1080; cv.height=1350;
    const x=cv.getContext("2d");
    x.fillStyle="#FAF8F3"; x.fillRect(0,0,1080,1350);
    x.fillStyle="#C9A85C"; x.fillRect(0,0,1080,14);
    x.fillStyle="#141210"; x.font="700 92px Cormorant Garamond, serif"; x.textAlign="center";
    x.fillText("R O M A",540,150);
    x.font="600 30px Inter, sans-serif"; x.fillStyle="#B08D3E"; x.fillText("S P O R T S W E A R",540,200);
    const dib=async(m,px,py,h)=>{ if(!m) return;
      const img=new Image();
      img.src="data:image/svg+xml;utf8,"+encodeURIComponent(svgPrenda(m.forma,m.color,h).replace('height="'+h+'"','width="'+Math.round(h*100/130)+'" height="'+h+'"'));
      await new Promise(r=>{img.onload=r;img.onerror=r;});
      x.drawImage(img,px,py);
    };
    const a=outfit.arriba&&modelo(outfit.arriba), b=outfit.abajo&&modelo(outfit.abajo), c=outfit.capa&&modelo(outfit.capa);
    await dib(c,150,300,430); await dib(a,400,270,450); await dib(b,620,420,560);
    let y=1090; x.fillStyle="#141210"; x.font="600 40px Inter,sans-serif"; x.textAlign="left";
    [c,a,b].filter(Boolean).forEach(m=>{ x.fillText(m.nombre+" · "+m.color,120,y); x.textAlign="right"; x.fillText("$"+m.precio,960,y); x.textAlign="left"; y+=60; });
    x.fillStyle="#B08D3E"; x.font="700 46px Inter,sans-serif";
    const tot=(a?a.precio:0)+(b?b.precio:0)+(c?c.precio:0);
    x.fillText("Look completo: $"+Math.round(((a||c)&&b)?tot*(1-CFG().outfitDiscountPct/100):tot),120,y+30);
    const blob=await new Promise(r=>cv.toBlob(r,"image/png"));
    const file=new File([blob],"mi-look-roma.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})) await navigator.share({files:[file],title:"Mi look ROMA"});
    else{ const u=URL.createObjectURL(blob); const l=document.createElement("a"); l.href=u; l.download="mi-look-roma.png"; l.click(); setTimeout(()=>URL.revokeObjectURL(u),3000); toast("Imagen del look generada"); }
  }catch(e){ if(e&&e.name!=="AbortError") toast("No se pudo compartir"); }
}

function viewLooks(){
  return `<h2 class="titulo serif">Mis Looks</h2>
  ${looks.length?"":`<div class="vacio-msg"><div class="big">♡</div><h3 class="serif">Aún no guardas looks</h3>
    <p>Arma tu primer outfit y guárdalo aquí.</p>
    <button class="btn-oro" style="margin-top:16px" onclick="go('armador')"><span class="fl">✦</span> Ir al armador</button></div>`}
  <div style="padding:6px 20px;display:flex;flex-direction:column;gap:16px">
  ${looks.map(L=>`<div class="look-card" style="width:auto">
    <div class="look-flat">${lookFlat(L.slots,.92)}</div>
    <div class="look-body"><h4 class="serif">${L.nombre}</h4>
      <p>${["capa","arriba","abajo"].filter(k=>L.slots[k]).map(k=>modelo(L.slots[k]).nombre).join(" + ")}</p>
      <div class="look-cta"><b>${peso(lookPrecio(L.slots))}</b>
        <div style="display:flex;gap:7px">
          <button class="mini-btn sec2" onclick="looks=looks.filter(x=>x.id!==${L.id});DB.save('looks',looks);render()">Borrar</button>
          <button class="mini-btn sec2" onclick="outfit={...(looks.find(x=>x.id===${L.id}).slots)};DB.save('outfit',outfit);go('armador')">Editar</button>
          <button class="mini-btn" onclick="outfit={...(looks.find(x=>x.id===${L.id}).slots)};DB.save('outfit',outfit);outfitAlCarrito()">Llevar</button>
        </div></div></div>
  </div>`).join("")}
  </div>`;
}

/* ============ CARRITO ============ */
function viewCarrito(){
  if(!carrito.length) return `<h2 class="titulo serif">Carrito</h2>
    <div class="vacio-msg"><div class="big">🛍</div><h3 class="serif">Tu carrito está vacío</h3>
    <p>El armador es el mejor lugar para empezar.</p>
    <button class="btn-oro" style="margin-top:16px" onclick="go('armador')"><span class="fl">✦</span> Armar un outfit</button></div>`;
  const T=totales();
  const sugerirLook = lookCompletoEnCarrito() && !codigoAplicado;
  const items=carrito.map((i,idx)=>{
    const {m,talla,stock}=skuInfo(i.sku);
    return `<div class="c-item">
      <div class="c-fig">${svgPrenda(m.forma,m.color,66)}</div>
      <div class="c-info"><b>${m.nombre}</b><small>${m.color}</small>
        <div class="c-edit">
          <select onchange="cambiaTalla(${idx},this.value)">${["S","M","L"].map(t=>{
            const v=m.tallas[t]; return v&&v.stock>0?`<option ${t===talla?'selected':''}>${t}</option>`:``;}).join("")}</select>
          <select onchange="cambiaColor(${idx},this.value)">${variantes(m.nombre).map(v=>`<option ${v.color===m.color?'selected':''}>${v.color}</option>`).join("")}</select>
          <div class="qty"><button onclick="cambiaCant(${idx},-1)">−</button><span>${i.cant}</span><button onclick="cambiaCant(${idx},1)">+</button></div>
        </div></div>
      <div class="c-precio">${peso(m.precio*i.cant)}<button onclick="quitaItem(${idx})">Quitar</button></div>
    </div>`;}).join("");
  return `<h2 class="titulo serif">Carrito</h2>
  ${lookCompletoEnCarrito()?`<p class="subtitulo" style="color:var(--verde);font-weight:600">✓ Traes el look completo</p>`:""}
  ${items}
  <div class="panel">
    <h4>Código promocional</h4>
    <div class="cod-row">
      <input id="codIn" placeholder="EJ. ROMA10" value="${codigoAplicado||""}" ${codigoAplicado?'class="ok"':''}>
      ${codigoAplicado
        ? `<button class="mini-btn sec2" onclick="codigoAplicado=null;DB.save('codigo',null);render()">Quitar</button>`
        : `<button class="mini-btn" onclick="aplicaCodigo()">Aplicar</button>`}
    </div>
    <div class="cod-msg ${codigoAplicado?'ok':''}" id="codMsg">${codigoAplicado?("✓ "+CODIGOS[codigoAplicado].desc):""}</div>
    ${sugerirLook?`<div class="cupon"><div><b>LOOK15</b><small>Tu look completo tiene ${CFG().outfitDiscountPct}% — aplícalo</small></div>
      <button class="mini-btn" onclick="codigoAplicado='LOOK15';DB.save('codigo','LOOK15');render()">Aplicar</button></div>`:""}
  </div>
  <div class="panel">
    <h4>Entrega</h4>
    <div class="entrega" style="grid-template-columns:1fr">
      <button class="ent-opt ${entrega==='pickup'?'on':''}" onclick="entrega='pickup';DB.save('entrega','pickup');render()">
        <b>Recoger personalmente</b><small>${CFG().pickupAddress} · Gratis</small></button>
      <button class="ent-opt ${entrega==='local'?'on':''}" onclick="entrega='local';DB.save('entrega','local');render()">
        <b>Entrega local en Mexicali</b><small>${CFG().localDeliveryCost>0?peso(CFG().localDeliveryCost):"Gratis"}${CFG().freeShippingFrom>0?" · Gratis desde "+peso(CFG().freeShippingFrom):""}</small></button>
      <button class="ent-opt ${entrega==='nacional'?'on':''}" onclick="entrega='nacional';DB.save('entrega','nacional');render()">
        <b>Envío nacional</b><small>${CFG().nationalShippingCost>0?peso(CFG().nationalShippingCost):"Gratis"}${CFG().freeShippingFrom>0?" · Gratis desde "+peso(CFG().freeShippingFrom):""}</small></button>
    </div>
    <div style="margin-top:14px">
      <div class="tot-row"><span>Subtotal</span><span>${peso(T.sub)}</span></div>
      ${T.desc>0?`<div class="tot-row"><span>Descuento ${T.etiqueta}</span><span class="verde">−${peso(T.desc)}</span></div>`:""}
      <div class="tot-row"><span>Envío</span><span>${T.envio===0?'<span class="verde">Gratis</span>':peso(T.envio)}</span></div>
      <div class="tot-row big"><span>Total</span><span>${peso(T.total)}</span></div>
    </div>
  </div>
  <div style="margin:4px 20px 10px"><button class="btn-cart" style="width:100%" onclick="go('checkout')">Continuar · ${peso(T.total)}</button></div>`;
}
function aplicaCodigo(){
  const inp=$("codIn"), v=validaCodigo(inp.value);
  const msg=$("codMsg");
  if(v.ok){ codigoAplicado=v.cod; DB.save("codigo",v.cod); render(); }
  else{ inp.classList.remove("mal"); void inp.offsetWidth; inp.classList.add("mal");
    msg.textContent=v.msg; msg.className="cod-msg mal"; }
}
function cambiaCant(idx,d){
  const it=carrito[idx], info=skuInfo(it.sku);
  if(d>0&&it.cant+1>info.stock){ toast("Solo hay "+info.stock+" disponibles"); return; }
  it.cant+=d; if(it.cant<=0) carrito.splice(idx,1);
  DB.save("carrito",carrito); render();
}
function quitaItem(idx){ carrito.splice(idx,1); DB.save("carrito",carrito); render(); }
function cambiaTalla(idx,t){
  const info=skuInfo(carrito[idx].sku);
  const v=info.m.tallas[t]; if(!v||v.stock<=0){ toast("Sin stock en "+t); render(); return; }
  carrito[idx].sku=v.sku; carrito[idx].cant=Math.min(carrito[idx].cant,v.stock);
  fusiona(); DB.save("carrito",carrito); render();
}
function cambiaColor(idx,color){
  const info=skuInfo(carrito[idx].sku);
  const nuevoM=variantes(info.m.nombre).find(v=>v.color===color); if(!nuevoM) return;
  const t=Object.keys(nuevoM.tallas).find(t=>t===info.talla&&nuevoM.tallas[t].stock>0)||Object.keys(nuevoM.tallas).find(t=>nuevoM.tallas[t].stock>0);
  if(!t){ toast("Ese color está agotado"); render(); return; }
  carrito[idx].sku=nuevoM.tallas[t].sku; carrito[idx].cant=Math.min(carrito[idx].cant,nuevoM.tallas[t].stock);
  fusiona(); DB.save("carrito",carrito); render();
}
function fusiona(){ const m={}; carrito.forEach(i=>{m[i.sku]=(m[i.sku]||0)+i.cant;}); carrito=Object.entries(m).map(([sku,cant])=>({sku,cant})); }

/* ============ CHECKOUT ============ */
let pagoSel = DB.load("pago","transferencia");
function viewCheckout(){
  const T=totales(); const C=CFG();
  const pideCP = entrega==="nacional";
  return `<div class="back-row"><button onclick="go('carrito')">← Carrito</button></div>
  <h2 class="titulo serif">Checkout</h2>
  <div class="panel">
    <h4>Tus datos</h4>
    <div class="field"><label>Nombre completo</label><input id="ckNombre" value="${perfil.nombre||""}" placeholder="Tu nombre completo"></div>
    <div class="field"><label>Tu WhatsApp</label><input id="ckWhats" inputmode="tel" value="${perfil.whats||""}" placeholder="686 000 0000"></div>
  </div>
  <div class="panel">
    <h4>Entrega · ${entrega==="pickup"?"Recoger personalmente":entrega==="local"?"Entrega local en Mexicali":"Envío nacional"}</h4>
    ${entrega==="pickup"
      ? `<p style="font-size:13px;color:var(--gris)">Recoges en: <b style="color:var(--tinta)">${C.pickupAddress}</b>${C.schedule?`<br>Horario: ${C.schedule}`:""}</p>`
      : `<div class="field"><label>Dirección (calle y número)</label><input id="ckDir" value="${perfil.dir||""}" placeholder="Calle y número"></div>
         <div class="field"><label>Colonia</label><input id="ckCol" value="${perfil.col||""}" placeholder="Colonia"></div>
         ${pideCP?`<div class="field"><label>Código postal</label><input id="ckCP" inputmode="numeric" value="${perfil.cp||""}" placeholder="21000"></div>
         <div class="field"><label>Ciudad y estado</label><input id="ckCiudad" value="${perfil.ciudad||""}" placeholder="Ciudad, Estado"></div>`:""}
         <div class="field"><label>Referencias</label><input id="ckRef" value="${perfil.ref||""}" placeholder="Entre calles, color de casa…"></div>`}
    <button style="font-size:12px;color:var(--oro);font-weight:600;margin-top:2px" onclick="go('carrito')">Cambiar método de entrega</button>
  </div>
  <div class="panel">
    <h4>Método de pago</h4>
    <div class="entrega" style="grid-template-columns:1fr">
      <button class="ent-opt ${pagoSel==='transferencia'?'on':''}" onclick="pagoSel='transferencia';DB.save('pago',pagoSel);render()">
        <b>Transferencia</b><small>Te enviamos los datos al confirmar</small></button>
      <button class="ent-opt ${pagoSel==='efectivo'?'on':''}" onclick="pagoSel='efectivo';DB.save('pago',pagoSel);render()">
        <b>Efectivo al recoger</b><small>Pagas al recibir tu pedido</small></button>
      <button class="ent-opt" style="opacity:.45;pointer-events:none" aria-disabled="true">
        <b>Pago con tarjeta</b><small>Próximamente</small></button>
    </div>
    ${pagoSel==="transferencia"&&C.clabe?`<p style="font-size:12.5px;color:var(--gris);margin-top:10px">${C.bankName?C.bankName+" · ":""}${C.accountHolder?C.accountHolder+"<br>":""}CLABE: <b style="color:var(--tinta)">${C.clabe}</b></p>`:""}
  </div>
  <div class="panel">
    <h4>Notas adicionales</h4>
    <div class="field" style="margin-bottom:0"><input id="ckNotas" placeholder="Opcional: instrucciones, horario, etc."></div>
  </div>
  <div class="panel">
    <h4>Resumen</h4>
    ${carrito.map(i=>{const {m,talla}=skuInfo(i.sku);return `<div class="tot-row"><span>${i.cant}× ${m.nombre} ${m.color} (${talla})</span><span>${peso(m.precio*i.cant)}</span></div>`;}).join("")}
    ${T.desc>0?`<div class="tot-row"><span>Descuento ${T.etiqueta}</span><span class="verde">−${peso(T.desc)}</span></div>`:""}
    <div class="tot-row"><span>Entrega</span><span>${T.envio===0?'Gratis':peso(T.envio)}</span></div>
    <div class="tot-row big"><span>Total</span><span>${peso(T.total)}</span></div>
  </div>
  <p style="padding:0 22px;font-size:12px;color:var(--gris)">Al confirmar se abre WhatsApp con tu pedido armado — solo presiona enviar para que ROMA lo confirme.</p>
  <div style="margin:14px 20px"><button class="btn-cart" style="width:100%" onclick="confirmarPedido()">Enviar pedido por WhatsApp</button></div>`;
}
function nuevoFolio(){
  const d=new Date();
  const ymd=d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0");
  return "ROMA-"+ymd+"-"+String(1000+Math.floor(Math.random()*9000));
}
function confirmarPedido(){
  const C=CFG();
  const nombre=$("ckNombre").value.trim(), whats=$("ckWhats").value.trim();
  const notas=$("ckNotas")?$("ckNotas").value.trim():"";
  let dir="", col="", cp="", ciudad="", ref="";
  if(entrega!=="pickup"){
    dir=$("ckDir").value.trim(); col=$("ckCol").value.trim(); ref=$("ckRef")?$("ckRef").value.trim():"";
    if(entrega==="nacional"){ cp=$("ckCP").value.trim(); ciudad=$("ckCiudad").value.trim(); }
  }
  if(!nombre){ toast("Escribe tu nombre completo"); return; }
  if(!whats){ toast("Escribe tu WhatsApp"); return; }
  if(entrega!=="pickup"&&(!dir||!col)){ toast("Falta la dirección o colonia"); return; }
  if(entrega==="nacional"&&(!cp||!ciudad)){ toast("Falta código postal o ciudad"); return; }
  perfil={...perfil,nombre,whats,dir:entrega!=="pickup"?dir:perfil.dir,col,cp,ciudad,ref}; DB.save("perfil",perfil);
  const T=totales();
  const folio=nuevoFolio();
  const entTxt = entrega==="pickup" ? "Recoger personalmente ("+C.pickupAddress+")"
    : entrega==="local" ? "Entrega local en Mexicali" : "Envío nacional";
  const pagoTxt = pagoSel==="transferencia"?"Transferencia":"Efectivo al recoger";
  const L=[];
  L.push("🛍 *PEDIDO "+folio+"*","");
  L.push("*Cliente:* "+nombre);
  L.push("*WhatsApp:* "+whats,"");
  L.push("*Productos:*");
  carrito.forEach(i=>{const {m,talla}=skuInfo(i.sku);
    L.push("- "+i.cant+"x "+m.nombre+" | "+m.color+" | Talla "+talla+" | "+peso(m.precio)+" c/u = "+peso(m.precio*i.cant));});
  L.push("");
  L.push("Subtotal: "+peso(T.sub));
  if(T.desc>0) L.push("Descuento "+T.etiqueta+": -"+peso(T.desc));
  L.push("Entrega ("+entTxt+"): "+(T.envio===0?"Gratis":peso(T.envio)));
  L.push("*TOTAL: "+peso(T.total)+"*","");
  L.push("*Pago:* "+pagoTxt);
  if(entrega!=="pickup"){
    L.push("*Direccion:* "+dir+", Col. "+col+(cp?", CP "+cp:"")+(ciudad?", "+ciudad:""));
    if(ref) L.push("*Referencias:* "+ref);
  }
  if(notas) L.push("*Notas:* "+notas);
  const texto=L.join("\n");
  const ganados=Math.floor(T.total/10);
  ordenes.unshift({folio,fecha:new Date().toISOString().slice(0,10),total:T.total,puntos:ganados,
    items:carrito.map(i=>{const {m,talla}=skuInfo(i.sku);return {n:m.nombre,c:m.color,t:talla,q:i.cant};}),
    entrega,pago:pagoSel,estado:"Pendiente de enviar",texto});
  DB.save("ordenes",ordenes);
  puntos+=ganados; DB.save("puntos",puntos);
  carrito=[]; codigoAplicado=null; DB.save("carrito",carrito); DB.save("codigo",null);
  navegaA("https://wa.me/"+C.whatsappNumber+"?text="+encodeURIComponent(texto));
  go("confirmacion",{folio,ganados});
}
function waDe(folio){
  const o=ordenes.find(x=>x.folio===folio); if(!o) return "#";
  return "https://wa.me/"+CFG().whatsappNumber+"?text="+encodeURIComponent(o.texto||"");
}
async function copiarPedido(folio){
  const o=ordenes.find(x=>x.folio===folio); if(!o) return;
  const txt=(o.texto||"").replace(/\*/g,"");
  try{ await navigator.clipboard.writeText(txt); toast("Pedido copiado — pégalo en WhatsApp"); }
  catch(e){ prompt("Copia tu pedido:",txt); }
}
function viewConfirmacion(){
  const p=vistaParam||{folio:"",ganados:0};
  return `<div class="conf">
    <div class="sello-ok">✓</div>
    <h2 class="serif">Pedido ${p.folio}</h2>
    <p><b style="color:var(--tinta)">Tu pedido está preparado.</b> Presiona enviar dentro de WhatsApp para que ROMA pueda confirmarlo.</p>
    <div style="display:flex;flex-direction:column;gap:10px;max-width:320px;margin:22px auto 0">
      <button class="btn-cart" onclick="navegaA(waDe('${p.folio}'))">Abrir WhatsApp con mi pedido</button>
      <button class="btn-linea" onclick="copiarPedido('${p.folio}')">⧉ Copiar pedido</button>
    </div>
    <p style="margin-top:12px;color:var(--oro);font-weight:700">+${p.ganados} puntos ROMA ✦</p>
    <button class="btn-oro" style="margin-top:20px" onclick="go('home')">Volver al inicio</button>
  </div>`;
}

/* ============ PERFIL ============ */
function nivelDe(p){ return p>=1500?["Élite",1500,3000]:p>=500?["Oro",500,1500]:["Bronce",0,500]; }
function viewPerfil(){
  const [niv,base,tope]=nivelDe(puntos);
  const pct=Math.min(100,Math.round((puntos-base)/(tope-base)*100));
  return `<h2 class="titulo serif">${perfil.nombre?("Hola, "+perfil.nombre.split(" ")[0]):"Tu perfil"}</h2>
  <div class="nivel-card">
    <div class="eyebrow">Nivel ${niv}</div>
    <h3 class="serif">${puntos} puntos ✦</h3>
    <p>${tope-puntos>0?`${tope-puntos} puntos para el siguiente nivel — 1 punto por cada $10 de compra.`:"Nivel máximo. Acceso anticipado a drops."}</p>
    <div class="nivel-bar"><div style="width:${pct}%"></div></div>
  </div>
  <div class="panel" style="margin-top:4px">
    <h4>Tus datos</h4>
    <div class="field"><label>Nombre</label><input id="pfNombre" value="${perfil.nombre||""}" placeholder="Tu nombre"></div>
    <div class="field"><label>Teléfono o correo</label><input id="pfWhats" value="${perfil.whats||""}" placeholder="686 000 0000 o tu@correo.com"></div>
    <button class="btn-linea" style="width:100%" onclick="perfil.nombre=$('pfNombre').value;perfil.whats=$('pfWhats').value;DB.save('perfil',perfil);toast('Datos guardados');render()">Guardar cambios</button>
  </div>
  <button class="perfil-item" onclick="go('pedidos')"><span class="ic">▤</span> Mis pedidos <small>${ordenes.length}</small></button>
  <button class="perfil-item" onclick="go('looks')"><span class="ic">♡</span> Mis looks guardados <small>${looks.length}</small></button>
  <button class="perfil-item" onclick="verPromos()"><span class="ic">🏷</span> Mis promociones disponibles</button>
  <button class="perfil-item" onclick="go('admin')"><span class="ic">🔒</span> Administrador ROMA</button>
  <button class="perfil-item" onclick="toggleTema()"><span class="ic">◐</span> Modo ${tema==="claro"?"oscuro":"claro"}</button>`;
}
function verPromos(){
  const hoy=new Date().toISOString().slice(0,10);
  const html=`<div class="hoja-bg" onclick="if(event.target===this)this.remove()"><div class="hoja">
    <div class="asa"></div><h3 class="serif" style="font-size:24px;margin-bottom:12px">Promociones disponibles</h3>
    ${Object.entries(CODIGOS).map(([k,c])=>{
      const exp=c.vence&&c.vence<hoy;
      return `<div class="cupon" style="margin-bottom:10px;${exp?'opacity:.45':''}">
        <div><b>${k}</b><small>${c.desc}${c.vence?` · vence ${c.vence}`:""}${exp?" · EXPIRADO":""}</small></div>
        ${exp?"":`<button class="mini-btn" onclick="codigoAplicado='${k}';DB.save('codigo','${k}');this.closest('.hoja-bg').remove();toast('${k} se aplicará en tu carrito')">Usar</button>`}
      </div>`;}).join("")}
  </div></div>`;
  document.body.insertAdjacentHTML("beforeend",html);
}
function viewPedidos(){
  return `<div class="back-row"><button onclick="go('perfil')">← Perfil</button></div>
  <h2 class="titulo serif">Mis pedidos</h2>
  ${ordenes.length?ordenes.map(o=>`<div class="orden">
    <div class="o-head"><b>${o.folio}</b><span>${o.fecha}</span></div>
    <p>${o.items.map(i=>`${i.q}× ${i.n} ${i.c} (${i.t})`).join(" · ")}</p>
    <div class="o-head" style="margin-top:6px"><span style="color:var(--oro);font-weight:700">+${o.puntos} pts ✦</span><b>${peso(o.total)}</b></div>
    ${o.texto?`<div style="display:flex;gap:8px;margin-top:9px">
      <button class="mini-btn sec2" onclick="navegaA(waDe('${o.folio}'))">✉ Reenviar por WhatsApp</button>
      <button class="mini-btn sec2" onclick="copiarPedido('${o.folio}')">⧉ Copiar</button></div>`:""}
  </div>`).join("")
  :`<div class="vacio-msg"><div class="big">▤</div><h3 class="serif">Sin pedidos aún</h3><p>Tu primer look te espera.</p></div>`}`;
}

function navegaA(url){ try{ window.location.href=url; }catch(e){} }

/* ---------- tema ---------- */
function aplicaTema(){ document.documentElement.dataset.tema=tema==="oscuro"?"oscuro":"claro";
  const mt=document.querySelector('meta[name="theme-color"]'); if(mt) mt.content=tema==="oscuro"?"#12100D":"#FAF8F3"; }
function toggleTema(){ tema=tema==="claro"?"oscuro":"claro"; DB.save("tema",tema); aplicaTema(); render(); }

/* ---------- onboarding ---------- */
function obNext(){
  const t=$("obTrack"); const i=Math.round(t.scrollLeft/t.clientWidth);
  if(i>=2){ finOnboard(); return; }
  t.scrollTo({left:(i+1)*t.clientWidth,behavior:"smooth"});
}
function finOnboard(){ DB.save("onboard",true); $("onboard").classList.remove("show"); $("app").classList.add("show"); render(); }

/* ---------- arranque ---------- */
window.addEventListener("scroll",()=>{ $("topbar")&&$("topbar").classList.toggle("linea",window.scrollY>8); });
document.addEventListener("DOMContentLoaded",()=>{
  aplicaTema(); pintaWaFloat(); cargarCatalogo();
  /* arte del onboarding */
  const ob1=$("obArt1"), ob2=$("obArt2");
  if(ob1) ob1.innerHTML=`<div style="position:relative;width:200px;height:200px">
    <div style="position:absolute;left:6px;top:14px;transform:rotate(-8deg)">${svgPrenda("playera","Beige",120)}</div>
    <div style="position:absolute;right:6px;top:52px;transform:rotate(7deg)">${svgPrenda("recto","Cafe",140)}</div></div>`;
  if(ob2) ob2.innerHTML=`<div style="position:relative;width:200px;height:200px">
    <div style="position:absolute;left:0;top:26px;transform:rotate(-9deg)">${svgPrenda("chamarra","Negro",115)}</div>
    <div style="position:absolute;left:66px;top:8px">${svgPrenda("playera","Azul Lago",112)}</div>
    <div style="position:absolute;right:0;top:48px;transform:rotate(8deg)">${svgPrenda("campana","Azul Oscuro",145)}</div></div>`;
  const track=$("obTrack");
  if(track) track.addEventListener("scroll",()=>{
    const i=Math.round(track.scrollLeft/track.clientWidth);
    document.querySelectorAll(".ob-dot").forEach((d,j)=>d.classList.toggle("on",j===i));
    const btn=document.querySelector(".ob-foot .mini-btn"); if(btn) btn.textContent=i>=2?"Empezar":"Siguiente";
  },{passive:true});

  setTimeout(()=>{
    $("splash").classList.add("out");
    setTimeout(()=>{
      $("splash").style.display="none";
      if(DB.load("onboard",false)){ $("app").classList.add("show"); render(); }
      else $("onboard").classList.add("show");
    },430);
  },1500);
});

/* acceso de diagnóstico/pruebas */
Object.defineProperty(window,"__roma",{value:{
  get carrito(){return carrito}, set carrito(v){carrito=v},
  get looks(){return looks}, get ordenes(){return ordenes}, get puntos(){return puntos},
  get codigoAplicado(){return codigoAplicado}, set codigoAplicado(v){codigoAplicado=v},
  get outfit(){return outfit}, set outfit(v){outfit=v},
  get entrega(){return entrega}, set entrega(v){entrega=v},
  set catFiltro(v){catFiltro=v}, set filtroColor(v){filtroColor=v}, set filtroTalla(v){filtroTalla=v},
  totales, cartCount, DB
}});

/* Minha Diária: controle diário para motoristas de aplicativo.
   Tudo fica no aparelho (localStorage). A única chamada externa é a Tabela FIPE, na pesquisa do Premium. */
(function(){
"use strict";
const LS="metaDoDia.v1";
const MESES=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS=["dom","seg","ter","qua","qui","sex","sáb"];
const DIAS_LONGOS=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const ORDEM_SEMANA=[1,2,3,4,5,6,0];
const FIPE="https://parallelum.com.br/fipe/api/v1/carros";

/* ---------- utilidades ---------- */
const $=id=>document.getElementById(id);
const brl=v=>(Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const brl0=v=>(Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const sinal=v=>(v>0.004?"+":v<-0.004?"−":"")+brl(Math.abs(v));
const pad=n=>String(n).padStart(2,"0");
const key=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const fromKey=k=>{const[a,b,c]=k.split("-").map(Number);return new Date(a,b-1,c)};
const ddmm=k=>{const d=fromKey(k);return pad(d.getDate())+"/"+pad(d.getMonth()+1)};
const uid=()=>Math.random().toString(36).slice(2,10);
const nf=(v,d)=>(+v||0).toLocaleString("pt-BR",{maximumFractionDigits:d==null?1:d});
function num(raw){let s=String(raw==null?"":raw).trim().replace(/\s|R\$/g,"");
  if(s==="")return null; if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");
  const v=Number(s); return isFinite(v)?Math.round(v*100)/100:NaN}
const inVal=v=>v==null||v===""||v===0?"":String(v).replace(".",",");
function el(tag,attrs,html){const e=document.createElement(tag);
  if(attrs)for(const k in attrs){if(k==="class")e.className=attrs[k];else if(k.startsWith("on"))e.addEventListener(k.slice(2),attrs[k]);else e.setAttribute(k,attrs[k])}
  if(html!=null)e.innerHTML=html;return e}
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const vibra=()=>{try{navigator.vibrate&&navigator.vibrate(25)}catch(e){}};

/* ---------- estado ---------- */
function vazio(){const rot={};for(let d=0;d<7;d++)rot[d]={hr:"",h:0,vh:0};
  return{app:"meta-do-dia",v:2,cfg:{diaCiclo:1,inicio:"",tema:"auto",retirada:0,vhPadrao:35,combKm:.55,rkm:1.8},
    premium:{ativo:false,fonte:""},configurado:false,carro:null,
    desp:[],ent:[],extra:{},rot,esp:[],lanc:{}}}
let S=vazio();
try{const d=JSON.parse(localStorage.getItem(LS)||"null");if(d&&d.app==="meta-do-dia")S=normaliza(d)}catch(e){}
function normaliza(d){const b=vazio();
  const o={...b,...d,cfg:{...b.cfg,...(d.cfg||{})},rot:{...b.rot,...(d.rot||{})},premium:{...b.premium,...(d.premium||{})}};
  ["desp","ent","esp"].forEach(k=>{if(!Array.isArray(o[k]))o[k]=[]});
  if(!o.extra||typeof o.extra!=="object")o.extra={};
  if(!o.lanc||typeof o.lanc!=="object")o.lanc={};
  o.cfg.diaCiclo=Math.min(28,Math.max(1,parseInt(o.cfg.diaCiclo)||1));
  // backups da versão 1 já vinham configurados
  // versões antigas guardavam o combustível em %: vira uma estimativa por km
  if(d.cfg&&d.cfg.combKm==null){const rk=+o.cfg.rkm||1.8;o.cfg.combKm=d.cfg.combModo==="km"&&d.cfg.litro&&d.cfg.kml?d.cfg.litro/d.cfg.kml:Math.round((+d.cfg.comb||30)/100*rk*100)/100}
  ["comb","combModo","litro","kml"].forEach(k=>delete o.cfg[k]);
  if(d.v===1||d.configurado===undefined)o.configurado=!!(o.desp.length||Object.values(o.rot).some(r=>+r.h>0));
  o.v=2;return o}
let avisoGravar=false;
function salva(){try{localStorage.setItem(LS,JSON.stringify(S));return true}
  catch(e){if(!avisoGravar){avisoGravar=true;toast("Este aparelho não deixou guardar os dados. Faça um backup em Ajustes.")}return false}}
if(navigator.storage&&navigator.storage.persist){try{navigator.storage.persist()}catch(e){}}
const pro=()=>!!S.premium.ativo;

/* ---------- ciclos e metas ---------- */
const hoje=key(new Date());
const ontem=(()=>{const d=new Date();d.setDate(d.getDate()-1);return key(d)})();
const cidDe=k=>{const d=fromKey(k);let y=d.getFullYear(),m=d.getMonth();
  if(d.getDate()<S.cfg.diaCiclo){m--;if(m<0){m=11;y--}}return y+"-"+pad(m+1)};
const somaMes=(c,n)=>{let[y,m]=c.split("-").map(Number);m=m-1+n;y+=Math.floor(m/12);m=((m%12)+12)%12;return y+"-"+pad(m+1)};
function limites(c){const[y,m]=c.split("-").map(Number);return{ini:new Date(y,m-1,S.cfg.diaCiclo),fim:new Date(y,m,S.cfg.diaCiclo-1)}}
const nomeCiclo=c=>{const[y,m]=c.split("-").map(Number);return MESES[m-1]+" "+y};
let cid=cidDe(hoje);
const rotOn=r=>r&&+r.h>0&&+r.vh>0&&!r.off;
function metaDoDia(k,todos){
  if(!todos&&S.cfg.inicio&&k<S.cfg.inicio)return{plano:"Antes do início",meta:0,esp:false,antes:true,h:0};
  const e=S.esp.find(x=>x.data===k);
  if(e)return{plano:e.nome||"Data especial",meta:(+e.h||0)*(+e.vh||0),esp:true,h:+e.h||0};
  const r=S.rot[fromKey(k).getDay()];
  return rotOn(r)?{plano:r.hr?"Rotina "+r.hr:`Rotina · ${nf(r.h)} h`,meta:r.h*r.vh,esp:false,h:+r.h}:{plano:"Folga",meta:0,esp:false,h:0}}
function diasDo(c){const{ini,fim}=limites(c);const out=[];const d=new Date(ini);
  while(d<=fim){const k=key(d);out.push({k,d:new Date(d),...metaDoDia(k)});d.setDate(d.getDate()+1)}return out}
const diasTrab=c=>{const{ini,fim}=limites(c);let n=0;const d=new Date(ini);while(d<=fim){if(metaDoDia(key(d),true).meta>0)n++;d.setDate(d.getDate()+1)}return n};
const tem=k=>S.lanc[k]&&typeof S.lanc[k].v==="number";

/* ---------- contas ---------- */
const mensal=x=>{const v=+x.valor||0;if(x.freq==="km")return 0;if(x.freq==="semanal")return v*52/12;if(x.freq==="meses")return v/Math.max(1,parseInt(x.cada)||1);return v};
function ativo(x,c){if(x.desde&&c<x.desde)return false;const n=parseInt(x.parcelas)||0;
  if(n>0&&c>=somaMes(x.desde||c,n))return false;return true}
const PRO_CARRO=["Estacionamento","Plano de celular"];
const ehProCarro=x=>PRO_CARRO.includes(x.nome);
const carroDe=()=>S.desp.filter(x=>x.tipo==="carro");
const casaDe=()=>S.desp.filter(x=>x.tipo!=="carro");
const contaCarro=(x,c)=>ativo(x,c)&&(pro()||!ehProCarro(x));
// Ganho por km: o real dos últimos 60 dias (com pelo menos 500 km lançados) ou a estimativa
function rkmReal(){const lim=(()=>{const d=new Date();d.setDate(d.getDate()-60);return key(d)})();let v=0,km=0;
  for(const k in S.lanc){const L=S.lanc[k];if(k>=lim&&L.km>0&&L.v>0){v+=L.v;km+=L.km}}return km>=500?{v:v/km,real:true,km}:{v:+S.cfg.rkm||1.8,real:false,km}}
// Combustível por km: média real dos lançamentos (últimos 60 dias, com pelo menos 300 km) ou a estimativa
function combMedia(){const lim=(()=>{const d=new Date();d.setDate(d.getDate()-60);return key(d)})();let c=0,km=0;
  for(const k in S.lanc){const L=S.lanc[k];if(k>=lim&&L.km>0&&typeof L.c==="number"){c+=L.c;km+=L.km}}
  return km>=300?{v:c/km,real:true,km}:{v:+S.cfg.combKm||.55,real:false,km}}
function custoKm(c){const rk=rkmReal().v;
  const comb=combMedia().v;
  const manut=carroDe().filter(x=>x.freq==="km"&&contaCarro(x,c||cid)).reduce((s,x)=>s+(+x.valor||0)/Math.max(100,+x.cada||5000),0);
  return{comb,manut,total:comb+manut,rk}}
function contas(c){
  const carro=carroDe().filter(x=>contaCarro(x,c)).reduce((s,x)=>s+mensal(x),0);
  let casa,ciclo=0,entradas=0;
  if(pro()){casa=casaDe().filter(x=>ativo(x,c)).reduce((s,x)=>s+mensal(x),0);
    const ex=S.extra[c]||[];ciclo=ex.filter(x=>x.tipo!=="entrada").reduce((s,x)=>s+(+x.valor||0),0);
    entradas=S.ent.filter(x=>ativo(x,c)).reduce((s,x)=>s+mensal(x),0)+ex.filter(x=>x.tipo==="entrada").reduce((s,x)=>s+(+x.valor||0),0)}
  else casa=+S.cfg.retirada||0;
  const saidas=carro+casa+ciclo;const liquido=Math.max(0,saidas-entradas);
  const K=custoKm(c);const pct=Math.min(.85,K.total/K.rk);const obj=liquido/(1-pct);
  const pComb=K.comb/K.rk,pMan=K.manut/K.rk;
  return{carro,casa,ciclo,entradas,saidas,liquido,pct,obj,comb:obj*pComb,manut:obj*pMan,K,pComb,pMan}}
const lucroDia=L=>{if(!L||!(L.v>0))return 0;const K=custoKm();const km=L.km>0?L.km:L.v/K.rk;return L.v-km*K.total};

/* ---------- navegação e folhas ---------- */
const VIEWS=["inicio","dias","contas","rotina","ajustes"];
function mostra(v){if(!VIEWS.includes(v))v="inicio";
  document.querySelectorAll(".view").forEach(s=>s.hidden=s.dataset.view!==v);
  document.querySelectorAll("#tabbar button").forEach(b=>{if(b.dataset.go===v)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  window.scrollTo(0,0)}
function vai(v){const h=location.hash.slice(1);
  if(v==="inicio"){if(h&&h!=="inicio")history.back();else mostra(v);return}
  if(h&&h!=="inicio"){history.replaceState(null,"","#"+v);mostra(v)}else location.hash=v}
window.addEventListener("hashchange",()=>mostra(location.hash.slice(1)));
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-go]");if(b){fechaTudo(true);vai(b.dataset.go)}
  if(ev.target.closest("[data-premium]"))abrePremium()});
$("cPrev").onclick=()=>{cid=somaMes(cid,-1);tudo()};
$("cNext").onclick=()=>{cid=somaMes(cid,1);tudo()};

let abertas=[];
function abre(id){const s=$(id);if(!s.hidden)return;s.hidden=false;document.body.classList.add("travado");abertas.push(id);history.pushState({sheet:id},"")}
function fecha(id,semHistorico){const s=$(id);if(s.hidden)return;s.hidden=true;abertas=abertas.filter(x=>x!==id);
  if(!abertas.length)document.body.classList.remove("travado");if(!semHistorico&&history.state&&history.state.sheet===id)history.back()}
function fechaTudo(semHist){[...abertas].forEach(id=>fecha(id,semHist))}
window.addEventListener("popstate",()=>{const top=abertas[abertas.length-1];if(!top||(history.state&&history.state.sheet===top))return;
  if($(top).dataset.travada){history.pushState({sheet:top},"");return}fecha(top,true)});
document.querySelectorAll(".sheet").forEach(s=>s.addEventListener("click",ev=>{if(ev.target.closest("[data-close]")&&!s.dataset.travada)fecha(s.id)}));

let toastT=null;
function toast(msg,acao){const t=$("toast");t.innerHTML="";t.appendChild(el("span",null,msg));
  if(acao){const b=el("button",{type:"button"},esc(acao.rot));b.onclick=()=>{t.hidden=true;acao.fn()};t.appendChild(b)}
  t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,acao?6500:3500)}

/* ---------- componentes ---------- */
function stepper({rot,valor,passo,min,max,fmt,on}){const w=el("div",{class:"stepper"});
  if(rot)w.appendChild(el("span",{class:"st-rot"},esc(rot)));
  const box=el("div",{class:"st-box"});const menos=el("button",{type:"button","aria-label":"Diminuir "+rot},"−");
  const out=el("output",{class:"num"});const mais=el("button",{type:"button","aria-label":"Aumentar "+rot},"+");
  let v=+valor||0;const pinta=()=>{out.textContent=fmt?fmt(v):nf(v)};
  const muda=d=>{v=Math.round(Math.min(max,Math.max(min,v+d))*100)/100;pinta();on(v);vibra()};
  menos.onclick=()=>muda(-passo);mais.onclick=()=>muda(passo);
  box.append(menos,out,mais);w.appendChild(box);pinta();w.setValor=x=>{v=x;pinta()};w.getValor=()=>v;return w}
function campoNum(lbl,val,on,attrs){const l=el("label",null,esc(lbl));const i=el("input",{type:"text",inputmode:"decimal",...(attrs||{})});i.value=inVal(val);
  i.addEventListener("change",()=>{const v=num(i.value);if(v!=null&&(isNaN(v)||v<0)){i.value=inVal(val);return}val=v;on(v)});l.appendChild(i);return l}
function campoTxt(lbl,val,on,type,attrs){const l=el("label",null,esc(lbl));const i=el("input",{type:type||"text",...(attrs||{})});i.value=val||"";
  i.addEventListener("change",()=>on(i.value.trim()));l.appendChild(i);return l}
function campoSel(lbl,val,ops,on){const l=el("label",null,esc(lbl));const s=el("select");
  ops.forEach(([v,t])=>{const o=el("option",{value:v},esc(t));if(v===val)o.selected=true;s.appendChild(o)});
  s.addEventListener("change",()=>on(s.value));l.appendChild(s);return l}
const botaoDel=on=>el("button",{type:"button",class:"del","aria-label":"Remover",onclick:on},"✕");

/* ---------- TECLADO DE LANÇAMENTO ---------- */
// Dois formatos: rápido (um valor só) e detalhado (por aplicativo + corridas particulares)
const APPS_PADRAO=[{id:"uber",nome:"Uber"},{id:"99",nome:"99"},{id:"indrive",nome:"inDrive"}];
const apps=()=>[...APPS_PADRAO,...(S.cfg.apps||[])];
const P={k:hoje,b:{v:"",km:"",c:""},part:[],campo:"v",modo:"rapido",h:0,mexeuH:false};
const padH=stepper({rot:"Horas rodadas",valor:0,passo:.5,min:0,max:24,fmt:v=>nf(v)+" h",on:v=>{P.h=v;P.mexeuH=true}});
$("padHoras").replaceWith(padH);
["1","2","3","4","5","6","7","8","9","00","0","⌫"].forEach(t=>{const b=el("button",{type:"button",class:"key"+(t==="⌫"?" bs":""),"data-k":t,"aria-label":t==="⌫"?"Apagar":t},t);
  b.onclick=()=>{tecla(t);vibra()};$("keys").appendChild(b)});
function tecla(t){const c=P.campo;if(P.modo==="detalhado"&&c==="v")return;const cur=P.b[c]||"";
  P.b[c]=t==="⌫"?cur.slice(0,-1):cur.length<(c==="km"?4:8)?(cur+t).replace(/^0+/,""):cur;pintaPad()}
const cents=s=>(parseInt(s||"0",10)||0)/100;
const somaApps=()=>apps().reduce((s,a)=>s+cents(P.b["a:"+a.id]),0);
const somaPart=()=>P.part.reduce((s,x)=>s+(+x.v||0),0);
const valorPad=()=>P.modo==="detalhado"?Math.round((somaApps()+somaPart())*100)/100:cents(P.b.v);
const kmPad=()=>parseInt(P.b.km||"0",10)||0;
const combPad=()=>cents(P.b.c);
function pf(id,rot,txt,vazio,campo){const b=el("button",{type:"button",class:"pf sm"+(P.campo===campo?" on":"")+(vazio?" zero":"")},`<small>${esc(rot)}</small><output class="num">${txt}</output>`);
  b.onclick=()=>{P.campo=campo;pintaPad()};return b}
function pintaPad(){const det=P.modo==="detalhado";
  document.querySelectorAll("#padModo button").forEach(b=>b.setAttribute("aria-checked",String(b.dataset.m===P.modo)));
  $("padDet").hidden=!det;$("fVal").classList.toggle("total",det);
  $("fVal").querySelector("small").textContent=det?"Total do dia":"Faturamento";
  $("padDisplay").textContent=brl(valorPad());$("padKmOut").textContent=nf(kmPad(),0)+" km";$("padCombOut").textContent=brl(combPad());
  [["fVal","v"],["fKm","km"],["fComb","c"]].forEach(([id,c])=>{$(id).classList.toggle("on",P.campo===c);$(id).classList.toggle("zero",c==="v"?!valorPad():!P.b[c])});
  if(det){const box=$("padApps");box.innerHTML="";
    apps().forEach(a=>{const c="a:"+a.id;box.appendChild(pf(c,a.nome,brl(cents(P.b[c])),!P.b[c],c))});
    box.appendChild(el("button",{type:"button",class:"pf sm add",onclick:novoApp},"<small>&nbsp;</small><span>+ Outro app</span>"));
    const pl=$("padPart");pl.innerHTML="";
    P.part.forEach((x,i)=>{const r=el("div",{class:"part"});r.innerHTML=`<span class="nm">${esc(x.de||"Origem")} → ${esc(x.para||"Destino")}<small>${x.km?nf(x.km)+" km":""}${x.km&&x.v?` · ${brl(x.v/x.km)}/km`:""}</small></span><b class="num">${brl(x.v)}</b>`;
      r.appendChild(botaoDel(()=>{P.part.splice(i,1);pintaPad()}));pl.appendChild(r)})}
  const k00=$("keys").querySelector('[data-k="00"]');k00.style.visibility=P.campo==="km"?"hidden":"";
  const v=valorPad(),km=kmPad();const naApp=P.campo==="v"||P.campo.startsWith("a:");
  $("padSalvar").textContent=naApp&&!P.b.km?"Próximo: km rodados":P.campo==="km"&&!P.b.c?"Próximo: combustível":"Salvar";
  const cm=combMedia();
  $("padLucro").textContent=P.campo==="km"?"Veja os km do dia no app de corrida ou no painel do carro.":P.campo==="c"?(km>0&&combPad()>0?`Hoje: ${brl(combPad()/km)} por km. Sua média: ${brl(cm.v)} por km.`:"Quanto você gastou de combustível hoje? Se não abasteceu, deixe zero."):det&&P.campo==="v"?"Toque num aplicativo para digitar quanto fez nele.":v>0&&km>0?`Lucro do dia ≈ ${brl(v-km*custoKm().total)}`:""}
$("fVal").onclick=()=>{if(P.modo==="detalhado"){P.campo="a:"+apps()[0].id}else P.campo="v";pintaPad()};
$("fKm").onclick=()=>{P.campo="km";pintaPad()};$("fComb").onclick=()=>{P.campo="c";pintaPad()};
document.querySelectorAll("#padModo button").forEach(b=>b.onclick=()=>{const m=b.dataset.m;if(m===P.modo)return;
  if(m==="detalhado"){P.campo="a:"+apps()[0].id;if(P.b.v&&!apps().some(a=>P.b["a:"+a.id])&&!P.part.length)P.b["a:"+apps()[0].id]=P.b.v}
  else{P.b.v=String(Math.round(valorPad()*100));if(P.b.v==="0")P.b.v="";P.campo="v"}
  P.modo=m;S.cfg.modoLanc=m;salva();pintaPad()});
function novoApp(){const b=folha(`<div class="wz-top"><h2 class="wz-h" style="margin:0">Outro aplicativo</h2><button type="button" class="ib" data-close aria-label="Fechar">✕</button></div>
  <label>Nome do aplicativo<input type="text" id="nApp" placeholder="Ex.: Lalamove, iFood" maxlength="20"></label>
  <button type="button" class="btn big" id="nAppOk">Adicionar</button>
  ${(S.cfg.apps||[]).length?`<p class="muted">Seus aplicativos: ${(S.cfg.apps||[]).map(a=>esc(a.nome)).join(", ")}.</p><div class="chips" id="nAppDel"></div>`:""}`);
  const i=b.querySelector("#nApp");setTimeout(()=>i.focus(),200);
  b.querySelector("#nAppOk").onclick=()=>{const n=i.value.trim();if(!n)return;const id="x"+uid();(S.cfg.apps=S.cfg.apps||[]).push({id,nome:n});salva();P.campo="a:"+id;fecha("sheet");pintaPad()};
  const dl=b.querySelector("#nAppDel");if(dl)(S.cfg.apps||[]).forEach(a=>dl.appendChild(el("button",{type:"button",class:"chip warn",onclick:()=>{S.cfg.apps=S.cfg.apps.filter(x=>x.id!==a.id);salva();fecha("sheet");pintaPad()}},"Remover "+esc(a.nome))))}
// Corrida particular: origem, destino, km calculado pelo mapa e valor
const NOMI="https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=";
const OSRM="https://router.project-osrm.org/route/v1/driving/";
async function geocode(q){const r=await fetch(NOMI+encodeURIComponent(q),{headers:{"Accept-Language":"pt-BR"}});const a=await r.json();if(!a.length)throw new Error("nao achou");return{lat:+a[0].lat,lon:+a[0].lon}}
function minhaPos(){return new Promise((ok,err)=>{if(!navigator.geolocation)return err(new Error("sem gps"));navigator.geolocation.getCurrentPosition(p=>ok({lat:p.coords.latitude,lon:p.coords.longitude}),err,{enableHighAccuracy:true,timeout:10000})})}
function novaCorrida(){const x={de:"",para:"",km:0,v:0};let posDe=null;
  const b=folha(`<div class="wz-top"><h2 class="wz-h" style="margin:0">Corrida particular</h2><button type="button" class="ib" data-close aria-label="Fechar">✕</button></div>
    <label>Saída<input type="text" id="cDe" placeholder="Rua, número, bairro, cidade"></label>
    <button type="button" class="btn tiny" id="cGps">Usar minha localização</button>
    <label>Destino<input type="text" id="cPara" placeholder="Rua, número, bairro, cidade"></label>
    <button type="button" class="btn ghost" id="cCalc">Calcular distância</button>
    <p class="status" id="cSt"></p>
    <div class="grid2"><label>Km da corrida<input type="text" inputmode="decimal" id="cKm" placeholder="0"></label><label>Valor cobrado (R$)<input type="text" inputmode="decimal" id="cV" placeholder="0,00"></label></div>
    <p class="muted" id="cDica"></p>
    <button type="button" class="btn big" id="cOk">Adicionar corrida</button>`);
  const q=s=>b.querySelector(s);const st=q("#cSt");
  const dica=()=>{const km=num(q("#cKm").value)||0,v=num(q("#cV").value)||0;const K=custoKm();
    q("#cDica").textContent=km?`Seu custo nessa corrida: ${brl(km*K.total)} (${brl(K.total)} por km). Só a ida; se voltar vazio, conte a volta também.`+(v?` Você cobrou ${brl(v/km)} por km.`:""):""};
  q("#cKm").oninput=dica;q("#cV").oninput=dica;
  q("#cDe").oninput=()=>{posDe=null};
  q("#cGps").onclick=async()=>{st.textContent="Pegando sua localização…";try{posDe=await minhaPos();q("#cDe").value="Minha localização";st.textContent=""}catch(e){st.textContent="Não consegui pegar a localização. Digite o endereço."}};
  q("#cCalc").onclick=async()=>{const de=q("#cDe").value.trim(),para=q("#cPara").value.trim();if(!(de&&para)){st.textContent="Preencha a saída e o destino.";return}
    st.textContent="Calculando…";try{const a=posDe||await geocode(de);const z=await geocode(para);
      const r=await (await fetch(`${OSRM}${a.lon},${a.lat};${z.lon},${z.lat}?overview=false`)).json();
      const km=Math.round(r.routes[0].distance/100)/10;q("#cKm").value=inVal(km);st.textContent=`Distância pelo caminho de carro: ${nf(km)} km.`;dica()}
    catch(e){st.textContent="Não consegui calcular. Confira os endereços (com cidade) ou digite os km."}};
  q("#cOk").onclick=()=>{x.de=q("#cDe").value.trim();x.para=q("#cPara").value.trim();x.km=num(q("#cKm").value)||0;x.v=num(q("#cV").value)||0;
    if(!(x.v>0)){st.textContent="Coloque o valor da corrida.";return}P.part.push(x);fecha("sheet");pintaPad()}}
$("padAddPart").onclick=novaCorrida;
function nomeDia(k){return k===hoje?"Hoje":k===ontem?"Ontem":DIAS_LONGOS[fromKey(k).getDay()]+", "+ddmm(k)}
function abrePad(k){P.k=k||hoje;const L=S.lanc[P.k];const m=metaDoDia(P.k);
  P.b={v:L&&L.v?String(Math.round(L.v*100)):"",km:L&&L.km?String(Math.round(L.km)):"",c:L&&L.c?String(Math.round(L.c*100)):""};
  P.part=L&&L.part?L.part.map(x=>({...x})):[];
  if(L&&L.apps)for(const id in L.apps)P.b["a:"+id]=String(Math.round(L.apps[id]*100));
  P.modo=L?(L.apps||L.part?"detalhado":"rapido"):(S.cfg.modoLanc||"rapido");
  P.campo=P.modo==="detalhado"?"a:"+apps()[0].id:"v";
  P.h=L&&L.h?L.h:m.h||0;P.mexeuH=false;padH.setValor(P.h);$("padMais").open=!!(L&&L.h);
  $("padTitulo").textContent=nomeDia(P.k);
  $("padSub").textContent=` · ${m.plano}${m.meta?", meta "+brl(m.meta):""}`;
  const dz=$("padDias");dz.innerHTML="";
  [hoje,ontem].forEach(d=>{const c=el("button",{type:"button",class:"chip"+(d===P.k?" on":"")},d===hoje?"Hoje":"Ontem");c.onclick=()=>abrePad(d);dz.appendChild(c)});
  const outro=el("label",{class:"chip date"+(P.k!==hoje&&P.k!==ontem?" on":"")});outro.innerHTML=`<span>${P.k!==hoje&&P.k!==ontem?ddmm(P.k):"Outro dia"}</span>`;
  const di=el("input",{type:"date","aria-label":"Escolher outro dia",max:hoje});di.value=P.k;di.onchange=()=>di.value&&abrePad(di.value);outro.appendChild(di);dz.appendChild(outro);
  const at=$("padAtalhos");at.innerHTML="";
  if(m.meta>0)at.appendChild(el("button",{type:"button",class:"chip ok",onclick:()=>{if(P.modo==="detalhado"){P.modo="rapido";P.campo="v"}P.b.v=String(Math.round(m.meta*100));pintaPad()}},"Bati a meta · "+brl0(m.meta)));
  at.appendChild(el("button",{type:"button",class:"chip",onclick:()=>{salvaDia(0)}},"Não rodei"));
  if(L)at.appendChild(el("button",{type:"button",class:"chip warn",onclick:()=>{delete S.lanc[P.k];salva();fecha("padSheet");toast(`Lançamento de ${nomeDia(P.k).toLowerCase()} apagado.`);tudo()}},"Apagar lançamento"));
  pintaPad();abre("padSheet")}
function tentaSalvar(){const v=valorPad();
  if(!kmPad()&&v>0){if(P.campo!=="km"){P.campo="km";pintaPad()}else{const d=$("fKm");d.classList.remove("treme");void d.offsetWidth;d.classList.add("treme")}return}
  if(P.campo==="km"&&!P.b.c&&v>0){P.campo="c";pintaPad();return}
  salvaDia(v)}
$("padSalvar").onclick=tentaSalvar;
document.addEventListener("keydown",ev=>{if($("padSheet").hidden||!$("sheet").hidden||ev.target.tagName==="INPUT")return;
  if(/^\d$/.test(ev.key)){tecla(ev.key);ev.preventDefault()}else if(ev.key==="Backspace"){tecla("⌫");ev.preventDefault()}else if(ev.key==="Enter"){tentaSalvar();ev.preventDefault()}});
function salvaDia(v){const k=P.k;const m=metaDoDia(k);const reg={v};
  const km=v>0?kmPad():0;reg.km=km;reg.c=v>0?combPad():0;if($("padMais").open||P.mexeuH){if(P.h>0)reg.h=P.h}
  if(v>0&&P.modo==="detalhado"){const ap={};apps().forEach(a=>{const x=cents(P.b["a:"+a.id]);if(x>0)ap[a.id]=x});reg.apps=ap;if(P.part.length)reg.part=P.part}
  S.lanc[k]=reg;salva();fecha("padSheet");
  const c=cidDe(k);if(c!==cid)cid=c;tudo();vibra();
  let msg;if(v===0)msg=`${nomeDia(k)}: sem rodar.`;
  else{const lu=lucroDia(reg);const base=m.meta>0?(v>=m.meta?`Meta batida! `:`Faltaram ${brl(m.meta-v)} para a meta. `):"Dia extra! ";msg=base+`Lucro do dia: ${brl(lu)}.`+(reg.c>0&&km>0?` Combustível: ${brl(reg.c/km)}/km (média ${brl(combMedia().v)}/km).`:"")}
  const pend=pendentes();toast(msg,pend.length?{rot:"Lançar "+ddmm(pend[0]),fn:()=>abrePad(pend[0])}:null)}
function pendentes(){const c=cidDe(hoje);const ks=[...diasDo(somaMes(c,-1)),...diasDo(c)];
  const lim=(()=>{const d=new Date();d.setDate(d.getDate()-7);return key(d)})();
  return ks.filter(x=>x.meta>0&&x.k<hoje&&x.k>=lim&&!tem(x.k)).map(x=>x.k).reverse()}
$("heroBtn").onclick=()=>abrePad(hoje);
$("fab").onclick=()=>abrePad(hoje);

/* ---------- INÍCIO ---------- */
function renderInicio(){
  const ds=diasDo(cid);const C=contas(cid);
  let feito=0,fs=0,lanc=0,hs=0,vh=0,km=0,vk=0,lucro=0;
  ds.forEach(x=>{const L=S.lanc[x.k];if(!tem(x.k))return;feito+=L.v;lanc++;lucro+=lucroDia(L);if(!x.antes)fs+=L.v-x.meta;
    if(L.h>0){hs+=L.h;vh+=L.v}if(L.km>0){km+=L.km;vk+=L.v}});
  // herói
  const mh=metaDoDia(hoje);const Lh=S.lanc[hoje];
  $("hero").querySelector(".hero-q").textContent=Lh?`Hoje: ${brl(Lh.v)}`:"Quanto você fez hoje?";
  $("heroMeta").textContent=Lh?(mh.meta?(Lh.v>=mh.meta?`Meta de ${brl(mh.meta)} batida.`:`Meta era ${brl(mh.meta)}.`):"Dia extra."):mh.meta?`Meta de hoje: ${brl(mh.meta)} (${mh.plano.toLowerCase()})`:"Hoje é folga na sua rotina.";
  $("heroBtn").textContent=Lh?"Corrigir hoje":"Lançar o dia";
  const pend=pendentes();$("pend").hidden=!pend.length;$("pendChips").innerHTML="";
  pend.slice(0,6).forEach(k=>$("pendChips").appendChild(el("button",{type:"button",class:"chip warn",onclick:()=>abrePad(k)},nomeDia(k))));
  // anel
  const falta=C.obj-feito;const p=C.obj>0?Math.min(1,feito/C.obj):0;
  $("ringFg").style.strokeDashoffset=String(326.73*(1-p));$("pPct").textContent=Math.round(p*100)+"%";
  $("tObj").textContent=C.obj>0?brl(C.obj):"–";
  {const dt=diasTrab(cid);$("tDia").textContent=C.obj>0&&dt?brl(C.obj/dt):"–"}$("tFeito").textContent=brl(feito);
  $("tFalta").textContent=C.obj<=0?"–":falta>0?brl(falta):"Batido!";
  const rest=ds.filter(x=>x.meta>0&&!tem(x.k)&&x.k>=hoje).length;
  $("tFaltaNote").textContent=C.obj<=0?"Cadastre seus custos em Contas para ver o objetivo.":falta>0?(rest?`Dá ${brl(falta/rest)} por dia nos ${rest} dias de trabalho que faltam.`:"Não há mais dias de trabalho na rotina deste ciclo."):`Você passou ${brl(-falta)} do objetivo. Tudo daqui pra frente é sobra.`;
  $("tFS").textContent=sinal(fs);const box=$("fsBox");box.classList.toggle("pos",fs>0.004);box.classList.toggle("neg",fs<-0.004);
  $("tFSNote").textContent=lanc?(fs<-0.004?"Precisa repor nos próximos dias.":fs>0.004?"Você está à frente das metas.":"Em dia com as metas."):"Ainda sem lançamentos neste ciclo.";
  // plano
  const plan=ds.reduce((s,x)=>s+x.meta,0),hPlan=ds.reduce((s,x)=>s+(x.meta>0?x.h:0),0),diasPlan=ds.filter(x=>x.meta>0).length,vhM=hPlan?plan/hPlan:0;
  let txt;
  if(C.obj<=0)txt="Cadastre seus custos na aba Contas para saber quanto precisa faturar.";
  else if(!plan)txt="Marque os dias que você roda na aba Rotina.";
  else if(plan>=C.obj)txt=`<strong class="pos">Sim.</strong> Seguindo a rotina você fatura ${brl(plan)}, ${brl(plan-C.obj)} acima do objetivo.`;
  else{const f=C.obj-plan;txt=`<strong class="neg">Ainda não.</strong> A rotina rende ${brl(plan)}. Faltam ${brl(f)}`+(vhM?`, cerca de ${Math.ceil(f/vhM)} horas a mais no ciclo (${nf(f/vhM/4.3)} h por semana).`:".")}
  $("aPlano").innerHTML=txt;
  const kv=[["Dias de trabalho",String(diasPlan)],["Horas planejadas",nf(hPlan)+" h"],["Bruto previsto",brl(plan)],
    [`Custos por km (${Math.round(C.pct*100)}%)`,brl(plan*C.pct)],["Sobra prevista",`<span class="${plan*(1-C.pct)-C.liquido>=0?"pos":"neg"}">${sinal(plan*(1-C.pct)-C.liquido)}</span>`]];
  if(lanc)kv.push(["Lucro nos dias lançados",`<span class="${lucro>=0?"pos":"neg"}">${brl(lucro)}</span>`]);
  kv.push(["Custo por km",brl(C.K.total)]);kv.push([rkmReal().real?"Seu ganho real por km":"Ganho por km (estimado)",brl(C.K.rk)]);
  if(hs)kv.push(["Seu ganho real por hora",brl(vh/hs)]);
  // faturamento por aplicativo (lançamentos detalhados)
  const porApp={};let nPart=0,vPart=0;ds.forEach(x=>{const L=S.lanc[x.k];if(!L)return;if(L.apps)for(const id in L.apps)porApp[id]=(porApp[id]||0)+L.apps[id];
    if(L.part)L.part.forEach(r=>{nPart++;vPart+=+r.v||0})});
  const lin=apps().filter(a=>porApp[a.id]).map(a=>[a.nome,brl(porApp[a.id])]);if(nPart)lin.push([`Particulares (${nPart})`,brl(vPart)]);
  $("porApp").hidden=!lin.length;$("porAppKv").innerHTML=lin.map(([a,b])=>`<dt>${esc(a)}</dt><dd>${b}</dd>`).join("");
  $("aKv").innerHTML=kv.map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join("")}

/* ---------- DIAS ---------- */
function renderDias(){const box=$("rows");box.innerHTML="";let fs=0;
  diasDo(cid).forEach(x=>{const L=S.lanc[x.k];const t=tem(x.k);
    let ac="";if(t&&!x.antes){const d=L.v-x.meta;fs+=d;ac=`<span class="${d>0?"pos":d<0?"neg":""}">${sinal(d)}</span> · acum. <span class="${fs>0?"pos":fs<0?"neg":""}">${sinal(fs)}</span>`+(L.v>0?` · lucro ${brl(lucroDia(L))}${L.km>0?"":"*"}`:"")}
    const pendente=!t&&x.meta>0&&x.k<hoje;
    const b=el("button",{type:"button",class:"day"+(!x.meta&&!t?" off":"")+(x.k===hoje?" today":"")+(pendente?" pend":"")});
    b.innerHTML=`<span class="d"><b>${ddmm(x.k)}</b><small>${DIAS[x.d.getDay()]}</small></span>
      <span class="p"><span class="pl">${x.esp?'<span class="chip-s">especial</span>':""}${esc(x.plano)}</span><span class="mt">${x.meta?"Meta "+brl(x.meta):"Sem meta"}</span>${ac?`<span class="ac num">${ac}</span>`:""}</span>
      <span class="v num">${t?brl(L.v):pendente?"Lançar":x.k<=hoje||x.meta?"–":""}</span>`;
    if(x.antes)b.disabled=true;else b.onclick=()=>abrePad(x.k);box.appendChild(b)})}

/* ---------- CONTAS ---------- */
const PRESET_CARRO=[["Aluguel do carro","semanal"],["Financiamento do carro","mensal"],["Seguro","mensal"],["Estacionamento","semanal"],["Troca de óleo","km",5000],
  ["Pneus","km",40000],["IPVA e licenciamento","meses",12],["Alinhamento e balanceamento","km",10000],["Lavagem","mensal"],["Plano de celular","mensal"],["Outro custo","mensal"]];
const PRESET_CASA=[["Aluguel","mensal"],["Condomínio","mensal"],["Luz","mensal"],["Água","mensal"],["Gás","mensal"],["Internet","mensal"],["Mercado","mensal"],
  ["Empréstimo","mensal",0,true],["Cartão parcelado","mensal",0,true],["Plano de saúde","mensal"],["Escola","mensal"],["Pensão","mensal"],["Outra conta","mensal"]];
let abrirId=null;
function chipsPreset(boxId,preset,tipo,listaFn){const b=$(boxId);b.innerHTML="";const usados=new Set(listaFn().map(x=>x.nome));
  preset.forEach(([nome,freq,cada,parc])=>{if(usados.has(nome)&&!/^Outr/.test(nome))return;
    if(!pro()&&PRO_CARRO.includes(nome)){b.appendChild(el("button",{type:"button",class:"chip add locked",onclick:()=>abrePremium()},`+ ${esc(nome)} <span class="pro-mini">PRO</span>`));return}
    b.appendChild(el("button",{type:"button",class:"chip add",onclick:()=>{const x={id:uid(),nome:/^Outr/.test(nome)?"":nome,valor:0,freq,cada:cada||undefined,tipo,desde:parc?cid:"",parcelas:parc?12:0};
      S.desp.push(x);abrirId=x.id;salva();renderContas();focaItem(x.id)}},"+ "+esc(nome)))})}
function focaItem(id){const it=document.querySelector(`[data-id="${id}"]`);if(!it)return;it.scrollIntoView({block:"center",behavior:"smooth"});
  const i=it.querySelector(it.querySelector("input[data-nome]").value?"input[data-valor]":"input[data-nome]");setTimeout(()=>i&&i.focus(),250)}
function itemConta(lista,x,opts){const it=el("details",{class:"item","data-id":x.id});if(abrirId===x.id)it.open=true;
  const sm=el("summary");it.appendChild(sm);const eq=el("div",{class:"eq"});
  const pinta=()=>{const m=mensal(x),n=parseInt(x.parcelas)||0,fora=!ativo(x,cid);
    const bloq=!pro()&&x.tipo==="carro"&&ehProCarro(x);let fimTxt="";if(n){const ult=somaMes(x.desde||cid,n-1);fimTxt=`Última parcela no ciclo de ${nomeCiclo(ult)}.`}
    eq.textContent=x.freq==="km"?`Custa ${brl((+x.valor||0)/Math.max(100,+x.cada||5000))} por km rodado. Entra no custo por km, não nas contas fixas.`:(x.freq&&x.freq!=="mensal"?`Equivale a ${brl(m)} por mês. `:"")+fimTxt;
    sm.innerHTML=`<span class="nm">${esc(x.nome||"Sem nome")}${n?` <span class="tg">${n}x</span>`:""}${fora?' <span class="tg">fora deste ciclo</span>':""}${bloq?' <span class="pro-mini">PRO</span>':""}</span><span class="num">${bloq?'<span class="warn-t">Premium</span>':x.valor&&x.freq==="km"?brl((+x.valor||0)/Math.max(100,+x.cada||5000))+"/km":x.valor?brl(m)+"/mês":'<span class="warn-t">pôr valor</span>'}</span>`};
  const mud=()=>{salva();pinta();renderResumoContas();renderInicio();renderDias()};
  const r1=el("div",{class:"r1"});
  const cn=campoTxt("Nome",x.nome,v=>{x.nome=v;mud()},"text",{placeholder:"Nome da conta","data-nome":""});
  const rotV=f=>f==="semanal"?"Valor por semana":f==="meses"||f==="km"?"Valor de cada vez":"Valor por mês";
  const cv=campoNum(rotV(x.freq),x.valor,v=>{x.valor=v||0;mud()},{placeholder:"0,00","data-valor":""});
  r1.append(cn,cv,botaoDel(()=>{lista.splice(lista.indexOf(x),1);salva();renderContas();renderInicio()}));it.appendChild(r1);
  if(opts.freq){const r2=el("div",{class:"r2 two"});
    const cada=stepper({rot:"A cada",valor:x.freq==="meses"?(x.cada||2):2,passo:1,min:2,max:24,fmt:v=>v+" meses",on:v=>{x.cada=v;mud()}});cada.hidden=x.freq!=="meses";
    const cadaKm=stepper({rot:"A cada",valor:x.freq==="km"?(x.cada||5000):5000,passo:1000,min:1000,max:100000,fmt:v=>nf(v,0)+" km",on:v=>{x.cada=v;mud()}});cadaKm.hidden=x.freq!=="km";
    const ops=opts.km?[["mensal","Todo mês"],["semanal","Toda semana"],["meses","A cada alguns meses"],["km","A cada X km"]]:[["mensal","Todo mês"],["semanal","Toda semana"],["meses","A cada alguns meses"]];
    r2.append(campoSel("Frequência",x.freq||"mensal",ops,v=>{x.freq=v;if(v==="meses"){x.cada=cada.getValor()}if(v==="km"){x.cada=cadaKm.getValor()}cada.hidden=v!=="meses";cadaKm.hidden=v!=="km";
      cv.firstChild.textContent=rotV(v);mud();renderResumoContas()}),cada,cadaKm);it.appendChild(r2)}
  if(opts.parcelas){const r3=el("div",{class:"r2 two"});
    r3.append(campoTxt("Primeira parcela no ciclo de",x.desde,v=>{x.desde=v;mud()},"month"),
      stepper({rot:"Parcelas",valor:x.parcelas||0,passo:1,min:0,max:120,fmt:v=>v?v+"x":"sem fim",on:v=>{x.parcelas=v;if(v&&!x.desde)x.desde=cid;mud()}}));it.appendChild(r3)}
  it.appendChild(eq);pinta();return it}
function lista(boxId,arr,filtro,opts,vazioTxt){const b=$(boxId);b.innerHTML="";const its=arr.filter(filtro);
  if(!its.length)b.appendChild(el("p",{class:"empty"},vazioTxt));its.forEach(x=>b.appendChild(itemConta(arr,x,opts)))}
function renderExtra(){const b=$("listaExtra");b.innerHTML="";const l=S.extra[cid]||[];
  if(!l.length)b.appendChild(el("p",{class:"empty"},"Nada para "+nomeCiclo(cid)+"."));
  l.forEach(x=>{const it=el("details",{class:"item","data-id":x.id});if(abrirId===x.id)it.open=true;const sm=el("summary");
    const pinta=()=>sm.innerHTML=`<span class="nm">${esc(x.nome||"Sem nome")}${x.tipo==="entrada"?' <span class="tg">entrada</span>':""}</span><span class="num">${x.valor?brl(x.valor):'<span class="warn-t">pôr valor</span>'}</span>`;
    const mud=()=>{salva();pinta();renderResumoContas();renderInicio()};
    const r1=el("div",{class:"r1"});r1.append(campoTxt("Nome",x.nome,v=>{x.nome=v;mud()},"text",{placeholder:"Ex.: Fatura Nubank","data-nome":""}),
      campoNum("Valor",x.valor,v=>{x.valor=v||0;mud()},{placeholder:"0,00","data-valor":""}),
      botaoDel(()=>{l.splice(l.indexOf(x),1);if(!l.length)delete S.extra[cid];salva();renderExtra();renderResumoContas();renderInicio()}));
    const seg=el("div",{class:"seg sm"});[["saida","Conta a pagar"],["entrada","Dinheiro que entra"]].forEach(([v,t])=>{const bb=el("button",{type:"button","aria-checked":String((x.tipo||"saida")===v)},t);
      bb.onclick=()=>{x.tipo=v;seg.querySelectorAll("button").forEach(z=>z.setAttribute("aria-checked",String(z===bb)));mud()};seg.appendChild(bb)});
    it.append(sm,r1,seg);pinta();b.appendChild(it)})}
$("addExtra").onclick=()=>{const x={id:uid(),nome:"",valor:0,tipo:"saida"};(S.extra[cid]=S.extra[cid]||[]).push(x);abrirId=x.id;salva();renderExtra();focaItem(x.id)};
$("copiaExtra").onclick=()=>{const ant=S.extra[somaMes(cid,-1)]||[];if(!ant.length){toast("O ciclo anterior não tem faturas para copiar.");return}
  const a=S.extra[cid]=S.extra[cid]||[];ant.forEach(x=>a.push({...x,id:uid()}));salva();renderExtra();renderResumoContas();renderInicio();toast(`${ant.length} itens copiados. Confira os valores.`)};
$("addEnt").onclick=()=>{const x={id:uid(),nome:"",valor:0,freq:"mensal",desde:"",parcelas:0};S.ent.push(x);abrirId=x.id;salva();renderContas();focaItem(x.id)};
function renderResumoContas(){const C=contas(cid);$("resumoNome").textContent=nomeCiclo(cid);
  const linhas=[["Custos do carro",brl(C.carro)],[pro()?"Contas da casa e dívidas":"Sua meta mensal",brl(C.casa)]];
  if(pro()){linhas.push(["Faturas e contas do ciclo",brl(C.ciclo)]);if(C.entradas)linhas.push(["Outras entradas","−"+brl(C.entradas)])}
  linhas.push([`Combustível (${nf(C.pComb*100,0)}% do que faturar)`,"+"+brl(C.comb)]);if(C.manut>0.004)linhas.push([`Manutenção por km (${nf(C.pMan*100,0)}%)`,"+"+brl(C.manut)]);
  $("resumoContas").innerHTML=linhas.map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join("")+`<dt class="tot">Você precisa faturar</dt><dd class="tot">${brl(C.obj)}</dd>`;
  renderKm(C)}
function renderKm(C){const K=C.K;const r=rkmReal();const cm=combMedia();
  $("combBox").hidden=cm.real;$("rkmBox").hidden=r.real;
  $("combReal").textContent=cm.real?`Seu gasto real de combustível: ${brl(cm.v)} por km (média de ${nf(cm.km,0)} km nos últimos 60 dias).`:`Até você lançar ${nf(300,0)} km com o combustível do dia, o app usa a estimativa acima.${cm.km?` Faltam ${nf(Math.max(0,300-cm.km),0)} km.`:""}`;
  $("rkmReal").textContent=r.real?`Seu ganho real por km: ${brl(r.v)} (calculado com ${nf(r.km,0)} km lançados nos últimos 60 dias).`:"";
  $("kmRes").innerHTML=`<dt>Combustível</dt><dd>${brl(K.comb)}/km</dd><dt>Manutenção por km</dt><dd>${brl(K.manut)}/km</dd><dt class="tot">Custo por km</dt><dd class="tot">${brl(K.total)}/km</dd>`;
  $("kmDica").textContent=`Isso é ${nf(C.pct*100,0)}% do que você ganha por km. De cada R$ 100 que você faz, ${brl(100*C.pct)} vão para combustível e desgaste do carro.`}
function renderContas(){
  chipsPreset("chipsCarro",PRESET_CARRO,"carro",carroDe);
  lista("listaCarro",S.desp,x=>x.tipo==="carro",{freq:true,parcelas:true,km:true},"Nenhum custo do carro ainda. Toque num atalho acima.");
  $("cardCasa").hidden=pro();$("premiumContas").hidden=!pro();
  $("cardUpsell").hidden=pro();
  if(!pro()&&casaDe().length)$("cardUpsell").querySelector("p").textContent=`Suas ${casaDe().length} contas detalhadas continuam guardadas. Reative o Premium para usá-las de novo.`;
  document.querySelectorAll(".nomeCiclo").forEach(e=>e.textContent=nomeCiclo(cid));
  if(pro()){chipsPreset("chipsCasa",PRESET_CASA,"pessoal",casaDe);
    lista("listaCasa",S.desp,x=>x.tipo!=="carro",{freq:true,parcelas:true},"Toque num atalho para adicionar aluguel, contas, empréstimos e dívidas.");
    renderExtra();lista("listaEnt",S.ent,()=>true,{freq:false,parcelas:true},"Nenhuma entrada.")}
  $("cfgRetirada").value=inVal(S.cfg.retirada);
  stComb.setValor(+S.cfg.combKm||.55);stRkm.setValor(+S.cfg.rkm||1.8);
  renderResumoContas();abrirId=null}
$("cfgRetirada").addEventListener("change",ev=>{const v=num(ev.target.value);if(v==null||isNaN(v)||v<0){ev.target.value=inVal(S.cfg.retirada);return}
  S.cfg.retirada=v;salva();renderResumoContas();renderInicio()});
const mudaKm=()=>{salva();renderResumoContas();renderInicio();renderDias()};
const stComb=stepper({rot:"Gasto de combustível por km (estimativa)",valor:.55,passo:.05,min:.1,max:3,fmt:v=>brl(v),on:v=>{S.cfg.combKm=v;mudaKm()}});
const stRkm=stepper({rot:"Quanto ganha por km (estimativa)",valor:1.8,passo:.1,min:.5,max:6,fmt:v=>brl(v),on:v=>{S.cfg.rkm=v;mudaKm()}});
$("combBox").appendChild(stComb);$("rkmBox").appendChild(stRkm);
$("btnPesquisa").onclick=()=>pro()?abrePesquisa():abrePremium("pesquisa");

/* ---------- ROTINA ---------- */
function renderRotina(){const b=$("rotina");b.innerHTML="";
  ORDEM_SEMANA.forEach(d=>{const r=S.rot[d];const on=rotOn(r);const row=el("div",{class:"rd"+(on?"":" off")});
    const tg=el("button",{type:"button",class:"daytg","aria-pressed":String(on)},`<b>${DIAS_LONGOS[d]}</b><small>${on?brl0(r.h*r.vh):"folga"}</small>`);
    tg.onclick=()=>{if(on){r.off=true}else{r.off=false;if(!(+r.h>0))r.h=6;if(!(+r.vh>0))r.vh=S.cfg.vhPadrao||35}salva();renderRotina();renderInicio();renderDias()};
    row.appendChild(tg);
    if(on){const upd=()=>{tg.querySelector("small").textContent=brl0(r.h*r.vh);salva();somaRotina();renderInicio();renderDias()};
      row.append(stepper({rot:"Horas",valor:r.h,passo:.5,min:.5,max:24,fmt:v=>nf(v)+" h",on:v=>{r.h=v;r.hr="";upd()}}),
        stepper({rot:"R$ por hora",valor:r.vh,passo:5,min:5,max:200,fmt:v=>"R$ "+nf(v,0),on:v=>{r.vh=v;S.cfg.vhPadrao=v;upd()}}))}
    b.appendChild(row)});somaRotina()}
function somaRotina(){let h=0,v=0;Object.values(S.rot).forEach(r=>{if(rotOn(r)){h+=+r.h;v+=r.h*r.vh}});
  $("rotSoma").innerHTML=`Por semana: <strong class="num">${nf(h)} h</strong> e <strong class="num">${brl(v)}</strong> brutos`+(h?`, média de ${brl(v/h)} por hora.`:".")}
function renderEsp(){const b=$("listaEsp");b.innerHTML="";const ord=[...S.esp].sort((a,c)=>(a.data||"9").localeCompare(c.data||"9"));
  if(!ord.length)b.appendChild(el("p",{class:"empty"},"Nenhuma data especial."));
  ord.forEach(x=>{const it=el("details",{class:"item","data-id":x.id});if(abrirId===x.id)it.open=true;const sm=el("summary");
    const pinta=()=>sm.innerHTML=`<span class="nm">${x.data?ddmm(x.data)+" · ":""}${esc(x.nome||"Sem nome")}</span><span class="num">${brl0((+x.h||0)*(+x.vh||0))}</span>`;
    const mud=()=>{pinta();salva();renderInicio();renderDias()};
    const r1=el("div",{class:"r1"});r1.append(campoTxt("Evento",x.nome,v=>{x.nome=v;mud()},"text",{placeholder:"Ex.: Show no estádio","data-nome":""}),
      campoTxt("Data",x.data,v=>{x.data=v;mud()},"date"),botaoDel(()=>{S.esp.splice(S.esp.indexOf(x),1);salva();renderEsp();renderInicio();renderDias()}));
    const r2=el("div",{class:"r2 two"});r2.append(stepper({rot:"Horas",valor:x.h||0,passo:.5,min:0,max:24,fmt:v=>nf(v)+" h",on:v=>{x.h=v;mud()}}),
      stepper({rot:"R$ por hora",valor:x.vh||0,passo:5,min:0,max:300,fmt:v=>"R$ "+nf(v,0),on:v=>{x.vh=v;mud()}}));
    it.append(sm,r1,r2);pinta();b.appendChild(it)});abrirId=null}
$("addEsp").onclick=()=>{const x={id:uid(),nome:"",data:"",h:6,vh:Math.max(40,S.cfg.vhPadrao||40)};S.esp.push(x);abrirId=x.id;salva();renderEsp();focaItem(x.id)};

/* ---------- AJUSTES ---------- */
function renderAjustes(){const cd=$("chipsDia");cd.innerHTML="";const opc=[1,5,10,11,15,20,25];if(!opc.includes(S.cfg.diaCiclo))opc.push(S.cfg.diaCiclo);
  opc.sort((a,b)=>a-b).forEach(n=>cd.appendChild(el("button",{type:"button",class:"chip"+(n===S.cfg.diaCiclo?" on":""),onclick:()=>mudaDia(n)},"Dia "+n)));
  const st=stepper({rot:"",valor:S.cfg.diaCiclo,passo:1,min:1,max:28,fmt:v=>"Outro: dia "+v,on:v=>mudaDia(v,true)});st.classList.add("inline");cd.appendChild(st);
  const{ini,fim}=limites(cid);$("cfgDiaDica").textContent=`O ciclo de ${nomeCiclo(cid)} vai de ${ini.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}.`;
  $("cfgInicio").value=S.cfg.inicio||"";
  document.querySelectorAll("#tema button").forEach(b=>b.setAttribute("aria-checked",String(b.dataset.t===(S.cfg.tema||"auto"))));
  const cp=$("cardPremium");
  cp.innerHTML=pro()?`<h2>Premium ativo</h2><p class="muted">${S.premium.fonte==="play"?"Assinatura pela Google Play. Para cancelar, abra a Play Store › Pagamentos e assinaturas.":"Liberado neste aparelho."}</p>`
    :`<h2>Minha Diária Premium</h2><p class="muted">Finanças completas (cartões, empréstimos, aluguel, dívidas) e pesquisa de custos do carro.</p><button type="button" class="btn" data-premium>Conhecer o Premium</button>`}
let tDia=null;
function mudaDia(n,devagar){S.cfg.diaCiclo=n;salva();clearTimeout(tDia);const ap=()=>{cid=cidDe(hoje);tudo()};if(devagar)tDia=setTimeout(ap,600);else ap()}
$("cfgInicio").addEventListener("change",ev=>{S.cfg.inicio=ev.target.value;salva();tudo()});
document.querySelectorAll("#tema button").forEach(b=>b.onclick=()=>{S.cfg.tema=b.dataset.t;salva();aplicaTema();renderAjustes()});
function aplicaTema(){const t=S.cfg.tema;if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);else document.documentElement.removeAttribute("data-theme");
  const esc_=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.querySelector('meta[name="theme-color"]').setAttribute("content",esc_?"#19201d":"#0f7a5a")}
$("bkExport").onclick=async()=>{const nome=`minha-diaria-backup-${hoje}.json`;const blob=new Blob([JSON.stringify(S,null,1)],{type:"application/json"});
  try{const f=new File([blob],nome,{type:"application/json"});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:"Backup Minha Diária"});$("bkStatus").textContent="Backup compartilhado.";return}}
  catch(e){if(e&&e.name==="AbortError")return}
  const a=el("a",{href:URL.createObjectURL(blob),download:nome});document.body.appendChild(a);a.click();a.remove();$("bkStatus").textContent=`Backup salvo como ${nome} na pasta Downloads.`};
async function importa(f,statusEl){try{const d=JSON.parse(await f.text());
    if(d&&d.app==="meta-do-dia"){if(S.configurado&&!confirm("Substituir todos os dados deste aparelho pelos do backup?"))return false;
      const premAtual=S.premium;S=normaliza(d);if(premAtual.ativo&&premAtual.fonte==="play")S.premium=premAtual;S.configurado=true;salva();cid=cidDe(hoje);aplicaTema();tudo();statusEl.textContent="Backup importado.";return true}
    const ks=d&&typeof d==="object"?Object.keys(d).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&typeof d[k]==="number"):[];
    if(ks.length){ks.forEach(k=>S.lanc[k]={...(S.lanc[k]||{}),v:d[k]});salva();tudo();statusEl.textContent=`${ks.length} lançamentos importados.`;return true}
    statusEl.textContent="Esse arquivo não é um backup do Minha Diária."}catch(e){statusEl.textContent="Não consegui ler esse arquivo."}return false}
$("bkImport").addEventListener("change",async ev=>{const f=ev.target.files[0];ev.target.value="";if(f)importa(f,$("bkStatus"))});
$("refazer").onclick=()=>abreWizard();
$("apagar").onclick=()=>{if(!confirm("Apagar contas, rotina e lançamentos deste aparelho? Isso não pode ser desfeito."))return;
  const prem=S.premium;try{localStorage.removeItem(LS)}catch(e){}S=vazio();if(prem.fonte==="play")S.premium=prem;cid=cidDe(hoje);aplicaTema();tudo();vai("inicio");abreWizard()};

/* ---------- FOLHA GENÉRICA ---------- */
function folha(html,travada){const b=$("sheetBody");b.innerHTML=html;b.parentElement.classList.remove("venda-box");$("sheet").dataset.travada=travada?"1":"";if($("sheet").hidden)abre("sheet");b.parentElement.scrollTop=0;return b}

/* ---------- CONFIGURAÇÃO INICIAL ---------- */
let W=null;
function abreWizard(){W={passo:0,dia:S.cfg.diaCiclo===1&&!S.configurado?10:S.cfg.diaCiclo,carro:{},retirada:S.cfg.retirada||0,
  dias:new Set(ORDEM_SEMANA.filter(d=>rotOn(S.rot[d]))),horas:6,vh:S.cfg.vhPadrao||35,combKm:+S.cfg.combKm||.55,rkm:+S.cfg.rkm||1.8};
  carroDe().forEach(x=>W.carro[x.nome]={valor:x.valor,ex:true});if(!W.dias.size)[3,4,5,6,0].forEach(d=>W.dias.add(d));
  const r1=ORDEM_SEMANA.map(d=>S.rot[d]).find(rotOn);if(r1){W.horas=+r1.h;W.vh=+r1.vh}
  passoW()}
const TOTAL_W=6;
function passoW(){const p=W.passo;const nav=(prox,txt)=>`<div class="wz-nav">${p>0?'<button type="button" class="btn ghost" id="wVolta">Voltar</button>':'<span></span>'}<button type="button" class="btn" id="wVai">${txt||"Continuar"}</button></div>`;
  const topo=`<div class="wz-top"><div class="dots">${Array.from({length:TOTAL_W},(_,i)=>`<i class="${i<=p?"on":""}"></i>`).join("")}</div>${S.configurado?'<button type="button" class="ib" data-close aria-label="Fechar">✕</button>':""}</div>`;
  let h="";
  if(p===0)h=`${topo}<h2 class="wz-h">Quanto você precisa fazer por dia?</h2><p>Em um minuto o app descobre, com base nas suas contas e na sua rotina. Depois é só lançar quanto fez, em dois toques.</p>
    ${nav(0,"Começar")}<label class="btn ghost file wide">Já tenho um backup<input type="file" id="wImport" accept="application/json,.json"></label><p class="status" id="wStatus"></p>`;
  else if(p===1)h=`${topo}<h2 class="wz-h">Em que dia vencem suas contas?</h2><p class="muted">Seu "mês" vai desse dia até a véspera do próximo vencimento.</p><div class="chips big" id="wDias"></div><div id="wDiaOutro"></div>${nav()}`;
  else if(p===2)h=`${topo}<h2 class="wz-h">Quais custos o seu carro tem?</h2><p class="muted">Toque para marcar e coloque o valor. O combustível vem depois.</p><div class="chips" id="wCarroChips"></div><div id="wCarroVals" class="wz-vals"></div>${nav()}`;
  else if(p===3)h=`${topo}<h2 class="wz-h">Defina sua meta mensal</h2><p class="muted">Quanto você quer que sobre no mês, depois do carro e do combustível, para pagar suas contas e para você. Pode ser aproximado. Com isso o app calcula quanto você precisa fazer por dia e por mês.</p>
    <label class="big-in"><span>R$</span><input type="text" inputmode="decimal" id="wRet" placeholder="0,00" value="${inVal(W.retirada)}"></label>
    <p class="muted">Prefere cadastrar cada conta, cartão e empréstimo separado? Isso é do Premium, que você encontra depois na aba Contas.</p>${nav()}`;
  else if(p===4)h=`${topo}<h2 class="wz-h">Quando você costuma rodar?</h2><p class="muted">Toque nos dias. Depois dá para ajustar cada dia na aba Rotina.</p><div class="chips big" id="wSem"></div><div class="wz-st" id="wSt"></div>${nav()}`;
  else if(p===5)h=`${topo}<h2 class="wz-h">Combustível e km</h2><p class="muted">O custo do carro depende de quantos km você roda. Se não souber, deixe como está: o app aprende com os seus lançamentos.</p>
    <div class="wz-st" id="wKm"></div><p class="muted" id="wKmD"></p>${nav(0,"Ver meu resultado")}`;
  else{aplicaWizard();const C=contas(cid);const ds=diasDo(cid);const plan=ds.reduce((s,x)=>s+metaDoDia(x.k,true).meta,0);const dTrab=diasTrab(cid);
    h=`${topo}<h2 class="wz-h">Pronto!</h2><p class="muted">Para pagar tudo e chegar na sua meta em ${nomeCiclo(cid)}, você precisa fazer:</p>
      <div class="wz-res2"><div><span class="muted">por mês</span><b class="num">${brl(C.obj)}</b></div><div><span class="muted">por dia de trabalho</span><b class="num">${dTrab?brl(C.obj/dTrab):"–"}</b>${dTrab?`<small class="muted">${dTrab} dias de trabalho no mês</small>`:""}</div></div>
      <p>${plan>=C.obj?`<strong class="pos">Sua rotina dá conta</strong> e sobra ${brl(plan-C.obj)}.`:plan?`<strong class="neg">Sua rotina rende ${brl(plan)}</strong>. O app mostra no Início quantas horas a mais seriam necessárias.`:""}</p>
      <p class="muted">Agora, no fim de cada dia, toque em <b>+</b> e digite quanto fez, os km rodados e o combustível.</p><button type="button" class="btn big" id="wFim">Começar a usar</button>`}
  const b=folha(h,!S.configurado);
  const vai_=b.querySelector("#wVai"),volta=b.querySelector("#wVolta");if(volta)volta.onclick=()=>{guardaW();W.passo--;passoW()};if(vai_)vai_.onclick=()=>{guardaW();W.passo++;passoW()};
  if(p===0){b.querySelector("#wImport").onchange=async ev=>{const f=ev.target.files[0];if(f&&await importa(f,b.querySelector("#wStatus"))){fecha("sheet");toast("Backup importado. Tudo pronto!")}}}
  if(p===1){const box=b.querySelector("#wDias");const pinta=()=>{box.innerHTML="";[1,5,10,15,20,25].forEach(n=>box.appendChild(el("button",{type:"button",class:"chip"+(W.dia===n?" on":""),onclick:()=>{W.dia=n;pinta();st.setValor(n)}},"Dia "+n)))};
    const st=stepper({rot:"Outro dia",valor:W.dia,passo:1,min:1,max:28,fmt:v=>"Dia "+v,on:v=>{W.dia=v;pinta()}});b.querySelector("#wDiaOutro").appendChild(st);pinta()}
  if(p===2){const ch=b.querySelector("#wCarroChips"),vals=b.querySelector("#wCarroVals");
    const pinta=()=>{ch.innerHTML="";vals.innerHTML="";PRESET_CARRO.filter(x=>!/^Outro/.test(x[0])&&(pro()||!PRO_CARRO.includes(x[0]))).forEach(([nome,freq,cada])=>{const on=!!W.carro[nome];
      ch.appendChild(el("button",{type:"button",class:"chip"+(on?" on":""),"aria-pressed":String(on),onclick:()=>{if(on)delete W.carro[nome];else W.carro[nome]={valor:0};pinta();if(!on){const i=vals.querySelector(`[data-n="${nome}"]`);i&&i.focus()}}},esc(nome)));
      if(on){const l=el("label",{class:"wz-val"},`<span>${esc(nome)} <small>${freq==="semanal"?"por semana":freq==="meses"?`a cada ${cada} meses`:freq==="km"?`a cada ${nf(cada,0)} km`:"por mês"}</small></span>`);
        const i=el("input",{type:"text",inputmode:"decimal",placeholder:"R$ 0,00","data-n":nome});i.value=inVal(W.carro[nome].valor);i.oninput=()=>{const v=num(i.value);W.carro[nome].valor=v>0?v:0};l.appendChild(i);vals.appendChild(l)}})};pinta()}
  if(p===4){const box=b.querySelector("#wSem");const pinta=()=>{box.innerHTML="";ORDEM_SEMANA.forEach(d=>box.appendChild(el("button",{type:"button",class:"chip"+(W.dias.has(d)?" on":""),"aria-pressed":String(W.dias.has(d)),
      onclick:()=>{W.dias.has(d)?W.dias.delete(d):W.dias.add(d);pinta()}},DIAS_LONGOS[d])));somaW()};
    const st=b.querySelector("#wSt");const sv=el("p",{class:"muted"});
    st.append(stepper({rot:"Horas por dia",valor:W.horas,passo:.5,min:1,max:16,fmt:v=>nf(v)+" h",on:v=>{W.horas=v;somaW()}}),
      stepper({rot:"Quanto faz por hora",valor:W.vh,passo:5,min:10,max:150,fmt:v=>"R$ "+v,on:v=>{W.vh=v;somaW()}}),sv);
    function somaW(){sv.textContent=`${W.dias.size} dias × ${nf(W.horas)} h × R$ ${W.vh} = ${brl(W.dias.size*W.horas*W.vh)} por semana`}pinta()}
  if(p===5){const d=()=>{b.querySelector("#wKmD").textContent=`Hoje o app conta ${brl(W.combKm)} de combustível por km, ${nf(W.combKm/W.rkm*100,0)}% do que você ganha por km. Quando você começar a lançar o combustível do dia, ele troca pela sua média real.`};
    b.querySelector("#wKm").append(stepper({rot:"Quanto gasta de combustível por km",valor:W.combKm,passo:.05,min:.1,max:3,fmt:v=>brl(v),on:v=>{W.combKm=v;d()}}),
      stepper({rot:"Quanto ganha por km rodado",valor:W.rkm,passo:.1,min:.5,max:6,fmt:v=>brl(v),on:v=>{W.rkm=v;d()}}));d()}
  if(p===6)b.querySelector("#wFim").onclick=()=>{fecha("sheet");vai("inicio")}}
function guardaW(){if(W.passo===3){const v=num(($("wRet")||{}).value);W.retirada=v>0?v:0}}
function aplicaWizard(){const mudouDia=S.cfg.diaCiclo!==W.dia;S.cfg.diaCiclo=W.dia;S.cfg.retirada=W.retirada;S.cfg.combKm=W.combKm;S.cfg.rkm=W.rkm;S.cfg.vhPadrao=W.vh;
  // carro: mantém os itens existentes, atualiza valores, cria os novos, remove desmarcados
  S.desp=S.desp.filter(x=>x.tipo!=="carro"||W.carro[x.nome]||!PRESET_CARRO.some(p=>p[0]===x.nome));
  Object.entries(W.carro).forEach(([nome,o])=>{const ex=S.desp.find(x=>x.tipo==="carro"&&x.nome===nome);
    if(ex){if(o.valor)ex.valor=o.valor}else{const pr=PRESET_CARRO.find(p=>p[0]===nome)||[nome,"mensal"];S.desp.push({id:uid(),nome,valor:o.valor||0,freq:pr[1],cada:pr[2],tipo:"carro",desde:"",parcelas:0})}});
  for(let d=0;d<7;d++){const r=S.rot[d];if(W.dias.has(d)){const mesmo=rotOn(r);r.off=false;if(!mesmo||!S.configurado){r.h=W.horas;r.vh=W.vh;r.hr=""}}else r.off=true}
  if(!S.configurado&&!S.cfg.inicio&&!Object.keys(S.lanc).length)S.cfg.inicio=hoje;
  S.configurado=true;salva();if(mudouDia)cid=cidDe(hoje);tudo()}

/* ---------- PREMIUM ---------- */
const PLANOS=[{sku:"premium_anual",nome:"Anual",meses:12,preco:80,selo:"Mais vantajoso"},{sku:"premium_semestral",nome:"Semestral",meses:6,preco:45},{sku:"premium_mensal",nome:"Mensal",meses:1,preco:9}];
const ICO={alvo:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',cal:'<path d="M4 5h16v15H4zM4 9h16M8 3v4M16 3v4M8 14l2.5 2.5L16 12"/>',
  car:'<path d="M5 16l1.5-5h11L19 16M3 16h18v3H3zM7 19v2M17 19v2"/><circle cx="7.5" cy="16" r="0"/>',rec:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3"/>'};
async function abrePremium(origem){
  const mensal=PLANOS.find(p=>p.meses===1).preco;const rk=rkmReal().v;
  const anual=PLANOS[0];const porDia=anual.preco/365;
  const ben=[["alvo","Uma meta que cobre tudo","Aluguel, luz, cartões e empréstimos entram na sua meta do dia. Nada de susto no dia do vencimento."],
    ["cal","Veja o fim de cada dívida","Cadastre as parcelas e acompanhe mês a mês quando cada uma acaba e quanto sobra a mais depois disso."],
    ["car","Gaste menos com o carro","Valor do seu carro na Tabela FIPE, IPVA estimado e oficinas, pneus e postos perto de você para comparar preço."],
    ["rec","Lucro de verdade","Estacionamento e plano de celular entram na conta. O lucro que o app mostra é o que fica no seu bolso."]];
  const b=folha(`<div class="venda">
    <div class="v-hero"><div class="wz-top"><span class="pro-tag">Premium</span><button type="button" class="ib" data-close aria-label="Fechar">✕</button></div>
      <h2>Chega de chegar no fim do mês sem saber se a conta fecha.</h2>
      <p>O Premium junta o carro, a casa e as dívidas numa conta só e te diz quanto rodar por dia. Você sai para trabalhar sabendo onde precisa chegar.</p></div>
    ${pro()?`<div class="v-ok"><strong>Seu Premium está ativo.</strong> Aproveite tudo na aba Contas.</div>`:""}
    <div class="v-ben">${ben.map(([i,t,d])=>`<div class="v-b"><span class="v-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${ICO[i]}</svg></span><div><b>${t}</b><p>${d}</p></div></div>`).join("")}</div>
    ${pro()?"":`<div class="v-ancora">No plano anual, sai por <b>${brl(porDia)} por dia</b>. Menos do que você ganha em 1 km rodado (${brl(rk)}).</div>
    <div class="v-planos" role="radiogroup" aria-label="Escolha o plano" id="vPlanos"></div>
    <button type="button" class="btn big v-cta" id="vCta"></button>
    <p class="v-conf">Cancele quando quiser, direto na Play Store, sem multa. Seus dados continuam só no seu celular.</p>
    <p class="status center" id="pStatus" role="status"></p>
    <details class="mais"><summary>Tenho um código</summary><div class="r1 code"><input type="text" id="pCod" placeholder="Código" autocapitalize="characters"><button type="button" class="btn" id="pCodOk">Usar</button></div></details>`}
    </div>`);
  b.parentElement.classList.add("venda-box");
  if(pro())return;
  let sel=PLANOS[0].sku;const box=b.querySelector("#vPlanos");
  const precos={};PLANOS.forEach(p=>precos[p.sku]={valor:p.preco,txt:brl(p.preco)});
  const pinta=()=>{box.innerHTML="";PLANOS.forEach(p=>{const pr=precos[p.sku];const gratis=Math.floor(p.meses-pr.valor/mensal+.05);
    const card=el("button",{type:"button",class:"v-plano"+(sel===p.sku?" on":""),role:"radio","aria-checked":String(sel===p.sku)},
      `${p.selo?`<span class="v-selo">${p.selo}</span>`:""}<span class="v-radio"></span>
       <span class="v-nome"><b>${p.nome}</b><small>${p.meses===1?"Sem compromisso":gratis>0?`Ganhe ${gratis} ${gratis>1?"meses grátis":"mês grátis"}`:""}</small></span>
       <span class="v-preco"><b class="num">${pr.txt}</b><small>${p.meses===1?"por mês":`${brl(pr.valor/p.meses)} por mês`}</small></span>`);
    card.onclick=()=>{sel=p.sku;pinta()};box.appendChild(card)});
    const p=PLANOS.find(x=>x.sku===sel);b.querySelector("#vCta").textContent=`Quero o plano ${p.nome.toLowerCase()}`};
  pinta();
  b.querySelector("#pCodOk").onclick=()=>{if(Premium.codigoValido(b.querySelector("#pCod").value)){ativaPremium("codigo");if(origem==="pesquisa")abrePesquisa();else fecha("sheet")}else b.querySelector("#pStatus").textContent="Código inválido."};
  const play=await Premium.disponivel();
  if(play){const ds=await Premium.precos();ds.forEach(d=>{if(d.price&&precos[d.itemId])precos[d.itemId]={valor:Number(d.price.value),txt:Number(d.price.value).toLocaleString("pt-BR",{style:"currency",currency:d.price.currency})}});pinta()}
  b.querySelector("#vCta").onclick=async()=>{const st=b.querySelector("#pStatus");
    if(!play){st.textContent="A assinatura é feita pelo app Minha Diária instalado da Google Play.";return}
    try{await Premium.comprar(sel);ativaPremium("play");if(origem==="pesquisa")abrePesquisa();else fecha("sheet")}
    catch(e){st.textContent=e&&e.message==="confirmacao"?"Não deu para confirmar a compra. Tente de novo em instantes.":"Compra não concluída."}}}
function ativaPremium(fonte){const era=pro();S.premium={ativo:true,fonte};
  if(!era&&+S.cfg.retirada>0&&!casaDe().length)S.desp.push({id:uid(),nome:"Para casa (valor geral)",valor:+S.cfg.retirada,freq:"mensal",tipo:"pessoal",desde:"",parcelas:0});
  salva();tudo();toast("Premium ativado! Suas contas completas estão na aba Contas.")}
(async()=>{const r=await Premium.ativoNaPlay();if(r===true&&!pro())ativaPremium("play");
  else if(r===false&&S.premium.fonte==="play"){S.premium={ativo:false,fonte:""};salva();tudo()}})();

/* ---------- PESQUISA DE CUSTOS (Premium) ---------- */
async function getJSON(u){const r=await fetch(u);if(!r.ok)throw new Error(r.status);return r.json()}
function abrePesquisa(){const car=S.carro||{};
  const mapa=q=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const b=folha(`<div class="wz-top"><h2 class="wz-h" style="margin:0">Pesquisar custos do carro</h2><button type="button" class="ib" data-close aria-label="Fechar">✕</button></div>
    <section class="pq"><h3>Valor do seu carro (Tabela FIPE)</h3>
      <label>Marca<select id="fMarca"><option value="">Carregando…</option></select></label>
      <label>Modelo<select id="fModelo" disabled><option value="">Escolha a marca</option></select></label>
      <label>Ano<select id="fAno" disabled><option value="">Escolha o modelo</option></select></label>
      <div class="pq-res" id="fRes">${car.valor?`<span class="muted">${esc(car.modelo)} ${esc(car.ano)}</span><b class="num">${esc(car.valor)}</b>`:""}</div>
    </section>
    <section class="pq"><h3>IPVA estimado</h3>
      <p class="muted">A alíquota muda por estado (em geral de 1% a 4%). Confira a do seu estado no site da Secretaria da Fazenda.</p>
      <div class="r2 two"><div id="ipvaSt"></div><div class="pq-res" id="ipvaRes"></div></div>
      <button type="button" class="btn ghost" id="ipvaAdd" disabled>Adicionar IPVA às contas do carro</button>
    </section>
    <section class="pq"><h3>Preços perto de você</h3><p class="muted">Abre o mapa com avaliações e telefones para comparar.</p>
      <div class="chips">${[["Troca de óleo","troca de óleo"],["Pneus","loja de pneus"],["Alinhamento","alinhamento e balanceamento"],["Mecânico","oficina mecânica"],["Lava-jato","lava jato"],["Posto mais barato","posto de combustível"]]
        .map(([t,q])=>`<a class="chip" href="${mapa(q)}" target="_blank" rel="noopener">${t}</a>`).join("")}</div>
      <p class="muted">Preço médio do combustível na sua cidade: <a href="https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas" target="_blank" rel="noopener">pesquisa semanal da ANP</a>.</p>
    </section>`);
  let fipeNum=car.valorNum||0,aliq=car.aliq||4;
  const ipva=()=>{const v=fipeNum*aliq/100;b.querySelector("#ipvaRes").innerHTML=fipeNum?`<span class="muted">por ano</span><b class="num">${brl(v)}</b><span class="muted">${brl(v/12)} por mês</span>`:'<span class="muted">Escolha o carro acima.</span>';b.querySelector("#ipvaAdd").disabled=!fipeNum};
  b.querySelector("#ipvaSt").appendChild(stepper({rot:"Alíquota",valor:aliq,passo:.5,min:.5,max:6,fmt:v=>nf(v)+"%",on:v=>{aliq=v;S.carro={...(S.carro||{}),aliq:v};salva();ipva()}}));ipva();
  b.querySelector("#ipvaAdd").onclick=()=>{const v=Math.round(fipeNum*aliq)/100;const ex=S.desp.find(x=>x.tipo==="carro"&&/^IPVA/.test(x.nome));
    if(ex){ex.valor=v;ex.freq="meses";ex.cada=12}else S.desp.push({id:uid(),nome:"IPVA e licenciamento",valor:v,freq:"meses",cada:12,tipo:"carro",desde:"",parcelas:0});
    salva();renderContas();renderInicio();toast(`IPVA de ${brl(v)} por ano adicionado (${brl(v/12)} por mês).`)};
  const sM=b.querySelector("#fMarca"),sMo=b.querySelector("#fModelo"),sA=b.querySelector("#fAno"),res=b.querySelector("#fRes");
  const ops=(s,arr,txt)=>{s.innerHTML=`<option value="">${txt}</option>`+arr.map(x=>`<option value="${esc(x.codigo)}">${esc(x.nome)}</option>`).join("");s.disabled=false};
  const erro=()=>{res.innerHTML='<span class="neg">Não consegui consultar a Tabela FIPE. Confira a internet e tente de novo.</span>'};
  getJSON(FIPE+"/marcas").then(a=>ops(sM,a,"Escolha a marca")).catch(()=>{sM.innerHTML='<option value="">Sem conexão</option>';erro()});
  sM.onchange=()=>{sMo.disabled=sA.disabled=true;if(!sM.value)return;sMo.innerHTML="<option>Carregando…</option>";
    getJSON(`${FIPE}/marcas/${sM.value}/modelos`).then(a=>ops(sMo,a.modelos,"Escolha o modelo")).catch(erro)};
  sMo.onchange=()=>{sA.disabled=true;if(!sMo.value)return;sA.innerHTML="<option>Carregando…</option>";
    getJSON(`${FIPE}/marcas/${sM.value}/modelos/${sMo.value}/anos`).then(a=>ops(sA,a,"Escolha o ano")).catch(erro)};
  sA.onchange=()=>{if(!sA.value)return;res.innerHTML='<span class="muted">Consultando…</span>';
    getJSON(`${FIPE}/marcas/${sM.value}/modelos/${sMo.value}/anos/${sA.value}`).then(d=>{fipeNum=num(d.Valor)||0;
      S.carro={modelo:d.Modelo,ano:String(d.AnoModelo),valor:d.Valor,valorNum:fipeNum,ref:d.MesReferencia,aliq};salva();
      res.innerHTML=`<span class="muted">${esc(d.Modelo)} ${esc(d.AnoModelo)} · referência ${esc(d.MesReferencia||"")}</span><b class="num">${esc(d.Valor)}</b>`;ipva()}).catch(erro)}}

/* ---------- geral ---------- */
function tudo(){const{ini,fim}=limites(cid);$("cNome").textContent=nomeCiclo(cid);
  $("cDatas").textContent=`${pad(ini.getDate())}/${pad(ini.getMonth()+1)} a ${pad(fim.getDate())}/${pad(fim.getMonth()+1)}`;
  $("proTag").hidden=!pro();$("upInicio").hidden=pro();
  renderInicio();renderDias();renderContas();renderRotina();renderEsp();renderAjustes()}
aplicaTema();tudo();mostra(location.hash.slice(1)||"inicio");
if(!S.configurado)abreWizard();
if("serviceWorker" in navigator&&location.protocol==="https:")window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
})();

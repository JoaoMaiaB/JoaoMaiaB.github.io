/* Minha Diária · Base: constantes, utilidades, dados do usuário (S), ciclos, metas e o cálculo das contas.
   Não desenha nada na tela; os outros arquivos usam estas funções. */
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
  // backup vindo de fora: só aceita dias no formato AAAA-MM-DD e valores numéricos
  for(const k in o.lanc){const L=o.lanc[k];if(!/^\d{4}-\d{2}-\d{2}$/.test(k)||!L||typeof L!=="object"||typeof L.v!=="number"||!isFinite(L.v)){delete o.lanc[k];continue}
    ["km","c","h"].forEach(c=>{if(L[c]!=null&&!(typeof L[c]==="number"&&isFinite(L[c])))delete L[c]})}
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

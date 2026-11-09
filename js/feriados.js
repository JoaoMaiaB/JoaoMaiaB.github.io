/* Minha Diária · Feriados da cidade e Possíveis Dinâmicos (Premium).
   Feriados: nacionais calculados aqui; estaduais e municipais vêm de dados/feriados/UF.json
   (base aberta "feriados-brasil", licença MIT). Possíveis Dinâmicos juntam véspera e volta de
   feriado, as datas de dados/eventos.json e a chuva prevista (Open-Meteo, sem cadastro). */
"use strict";

const UFS=["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const FER_NAC=[["01/01","Ano Novo"],["P-2","Sexta-feira Santa"],["21/04","Tiradentes"],["01/05","Dia do Trabalho"],["07/09","Independência do Brasil"],
  ["12/10","Nossa Senhora Aparecida"],["02/11","Finados"],["15/11","Proclamação da República"],["20/11","Consciência Negra"],["25/12","Natal"]];
const FER_FAC=[["P-48","Carnaval"],["P-47","Carnaval"],["P+60","Corpus Christi"]];
const TIPO_FER={nac:"Nacional",est:"Estadual",mun:"Municipal",fac:"Ponto facultativo"};

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher)
function pascoa(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
  h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mes=Math.floor((h+l-7*m+114)/31);
  return new Date(y,mes-1,((h+l-7*m+114)%31)+1)}
const somaD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
function dataDaRegra(r,y){if(r[0]==="P")return key(somaD(pascoa(y),+r.slice(1)));const[d,m]=r.split("/").map(Number);return key(new Date(y,m-1,d))}

// Feriados entre duas datas (AAAA-MM-DD), um por dia, do mais forte para o mais fraco
function feriadosEntre(ini,fim){const L=S.cfg.local||{};const out={};const anos=[+ini.slice(0,4)];if(fim.slice(0,4)!==ini.slice(0,4))anos.push(+fim.slice(0,4));
  const poe=(lista,tipo)=>anos.forEach(y=>(lista||[]).forEach(([r,nome])=>{const k=dataDaRegra(r,y);if(k<ini||k>fim)return;
    const ord={nac:0,est:1,mun:2,fac:3};if(!out[k]||ord[tipo]<ord[out[k].tipo])out[k]={k,nome,tipo}}));
  poe(FER_NAC,"nac");poe(L.est,"est");poe(L.mun,"mun");poe(FER_FAC,"fac");
  return Object.values(out).sort((a,b)=>a.k.localeCompare(b.k))}
const ehFolgaGeral=k=>{const d=fromKey(k).getDay();return d===0||d===6};
// Feriadão: o feriado mais os fins de semana e feriados colados nele
const diasEntreK=(a,b)=>Math.round((fromKey(b)-fromKey(a))/864e5);
function blocoDoFeriado(k,fers){if(ehFolgaGeral(k))return{a:k,b:k,longo:false};const set=new Set(fers.filter(f=>f.tipo!=="fac").map(f=>f.k));const livre=x=>set.has(x)||ehFolgaGeral(x);
  let a=k,b=k;while(livre(key(somaD(fromKey(a),-1))))a=key(somaD(fromKey(a),-1));while(livre(key(somaD(fromKey(b),1))))b=key(somaD(fromKey(b),1));return{a,b,longo:diasEntreK(a,b)>=2}}

/* ---------- cidade ---------- */
let cidadesUF=null;
async function carregaUF(uf){if(cidadesUF&&cidadesUF.uf===uf)return cidadesUF;
  const r=await fetch(`dados/feriados/${uf}.json`);if(!r.ok)throw new Error("dados");const d=await r.json();cidadesUF={uf,...d};return cidadesUF}
const semAcento=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
async function escolheCidade(uf,nome){const d=await carregaUF(uf);const c=d.cidades.find(x=>semAcento(x[1])===semAcento(nome));if(!c)return false;
  S.cfg.local={uf,ibge:c[0],cidade:c[1],lat:c[2],lon:c[3],est:d.estado,mun:c[4]};climaCache=null;salva();return true}
function seletorCidade(box,depois){const L=S.cfg.local||{};const lid="cidLista"+(++seletorN);
  box.innerHTML=`<div class="cid-sel"><label>Estado<select class="cid-uf"><option value="">–</option>${UFS.map(u=>`<option${u===L.uf?" selected":""}>${u}</option>`).join("")}</select></label>
    <label>Cidade<input type="text" class="cid-nome" list="${lid}" autocomplete="off" placeholder="Comece a digitar" value="${esc(L.cidade||"")}"></label><datalist id="${lid}"></datalist></div><p class="muted cid-st"></p>`;
  const uf=box.querySelector(".cid-uf"),cid=box.querySelector(".cid-nome"),st=box.querySelector(".cid-st"),dl=box.querySelector("datalist");
  const lista=async()=>{if(!uf.value)return;try{const d=await carregaUF(uf.value);dl.innerHTML=d.cidades.map(c=>`<option value="${esc(c[1])}">`).join("")}
    catch(e){st.textContent="Não consegui carregar as cidades. Confira a internet."}};
  uf.onchange=()=>{cid.value="";lista();cid.focus()};
  cid.onchange=async()=>{if(!uf.value){st.textContent="Escolha o estado primeiro.";return}
    try{if(await escolheCidade(uf.value,cid.value)){st.textContent="";depois()}else st.textContent="Não achei essa cidade. Escolha um nome da lista."}catch(e){st.textContent="Não consegui carregar as cidades. Confira a internet."}};
  lista()}
let seletorN=0;

/* ---------- meta do feriado (vira uma data especial) ---------- */
function personalizaDia(k,nome){const ex=S.esp.find(x=>x.data===k);const r=S.rot[fromKey(k).getDay()];
  const x=ex?{...ex}:{h:rotOn(r)?+r.h:8,vh:Math.round((rotOn(r)?+r.vh:+S.cfg.vhPadrao||35)*1.2/5)*5};
  const d=fromKey(k);const b=folha(`<h2>${esc(nome)}</h2><p class="muted">${DIAS_LONGOS[d.getDay()]} ${ddmm(k)}. ${rotOn(r)?`Na rotina, esse dia vale ${brl(r.h*r.vh)}.`:"Na rotina, esse dia é folga."} Ajuste quanto acha que dá para fazer.</p>
    <div class="wz-st" id="pdSt"></div><p class="sum" id="pdSoma"></p><div class="row-btns"><button type="button" class="btn" id="pdOk">Salvar</button><button type="button" class="btn ghost" id="pdFolga">Vou folgar</button>${ex?'<button type="button" class="btn ghost" id="pdRot">Usar a rotina</button>':""}</div>`);
  const soma=()=>b.querySelector("#pdSoma").textContent=`Meta do dia: ${brl(x.h*x.vh)}`;
  b.querySelector("#pdSt").append(stepper({rot:"Horas",valor:x.h,passo:.5,min:.5,max:24,fmt:v=>nf(v)+" h",on:v=>{x.h=v;soma()}}),
    stepper({rot:"R$ por hora",valor:x.vh,passo:5,min:5,max:300,fmt:v=>"R$ "+nf(v,0),on:v=>{x.vh=v;soma()}}));soma();
  const grava=(h,vh)=>{const alvo=ex||S.esp.find(y=>y.data===k);if(alvo){alvo.h=h;alvo.vh=vh;if(!alvo.nome)alvo.nome=nome}else S.esp.push({id:uid(),nome,data:k,h,vh,fer:true});
    salva();fecha("sheet");tudo();toast(h?`Meta de ${ddmm(k)}: ${brl(h*vh)}.`:`${ddmm(k)} marcado como folga.`)};
  b.querySelector("#pdOk").onclick=()=>grava(x.h,x.vh);b.querySelector("#pdFolga").onclick=()=>grava(0,x.vh);
  if(ex)b.querySelector("#pdRot").onclick=()=>{S.esp.splice(S.esp.indexOf(ex),1);salva();fecha("sheet");tudo();toast(`${ddmm(k)} volta a seguir a rotina.`)}}

/* ---------- cartão Feriados (aba Rotina) ---------- */
let ferTodos=false;
function renderFeriados(){const box=$("ferBox");if(!box)return;
  if(!pro()){box.innerHTML=travaPremium("Veja os feriados nacionais, do seu estado e da sua cidade, e ponha uma meta diferente em cada um.");return}
  const L=S.cfg.local;box.innerHTML="";
  if(!L){const s=el("div");box.appendChild(el("p",{class:"muted"},"Escolha sua cidade para ver também os feriados do estado e da cidade."));box.appendChild(s);seletorCidade(s,tudo)}
  else{const t=el("p",{class:"muted cid-atual"},`Feriados de <b>${esc(L.cidade)}/${esc(L.uf)}</b> `);
    t.appendChild(el("button",{type:"button",class:"linkbtn",onclick:()=>{const s=el("div");t.replaceWith(s);seletorCidade(s,tudo)}},"Trocar cidade"));box.appendChild(t)}
  const fim=key(somaD(fromKey(hoje),365));const fers=feriadosEntre(hoje,fim);const ver=ferTodos?fers:fers.slice(0,8);
  const ul=el("div",{class:"fer-lista"});
  ver.forEach(f=>{const d=fromKey(f.k);const e=S.esp.find(x=>x.data===f.k);const bl=f.tipo!=="fac"?blocoDoFeriado(f.k,fers):null;
    const prol=bl&&bl.longo?`Feriadão de ${DIAS_LONGOS[fromKey(bl.a).getDay()].toLowerCase()} a ${DIAS_LONGOS[fromKey(bl.b).getDay()].toLowerCase()}. `:"";
    const meta=e?(+e.h>0?`Sua meta: ${brl(e.h*e.vh)} (${nf(e.h)} h)`:"Você vai folgar"):(m=>m.meta>0?`Rotina: ${brl(m.meta)}`:"Rotina: folga")(metaDoDia(f.k,true));
    const it=el("div",{class:"fer"+(e?" on":"")},`<div class="fer-d"><b>${pad(d.getDate())}/${pad(d.getMonth()+1)}</b><small>${DIAS_LONGOS[d.getDay()]}</small></div>
      <div class="fer-t"><b>${esc(f.nome)}</b><small><span class="tag t-${f.tipo}">${TIPO_FER[f.tipo]}</span> ${prol}${meta}</small></div>`);
    it.appendChild(el("button",{type:"button",class:"btn tiny ghost",onclick:()=>personalizaDia(f.k,f.nome)},e?"Editar":"Personalizar"));ul.appendChild(it)});
  box.appendChild(ul);
  if(fers.length>8)box.appendChild(el("button",{type:"button",class:"btn ghost tiny",onclick:()=>{ferTodos=!ferTodos;renderFeriados()}},ferTodos?"Mostrar menos":`Ver todos os ${fers.length} feriados do ano`))}

/* ---------- Possíveis Dinâmicos (Início) ---------- */
let eventosBase=null,climaCache=null;
async function carregaEventos(){if(eventosBase)return eventosBase;try{const r=await fetch("dados/eventos.json");eventosBase=r.ok?(await r.json()).eventos||[]:[]}catch(e){eventosBase=[]}return eventosBase}
function datasDoEvento(ev,y){let d;
  if(ev.fixo){const[dd,mm]=ev.fixo.split("/").map(Number);d=new Date(y,mm-1,dd)}
  else if(ev.pascoa!=null)d=somaD(pascoa(y),ev.pascoa);
  else if(ev.semana){const[n,ds,mm]=ev.semana;d=new Date(y,mm-1,1);while(d.getDay()!==ds)d.setDate(d.getDate()+1);d.setDate(d.getDate()+7*(n-1))}
  else if(ev.ultima){const[ds,mm]=ev.ultima;d=new Date(y,mm,0);while(d.getDay()!==ds)d.setDate(d.getDate()-1)}
  else return[];if(ev.mais)d=somaD(d,ev.mais);return Array.from({length:ev.dias||1},(_,i)=>key(somaD(d,i)))}
// Chuva: horas seguidas com chance ≥ 60% e pelo menos 0,5 mm, das 6h às 23h, nos próximos 3 dias
async function chuvaPrevista(){const L=S.cfg.local;if(!L||L.lat==null)return[];
  if(climaCache&&climaCache.ibge===L.ibge&&Date.now()-climaCache.t<2*3600e3)return climaCache.v;
  try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${L.lat}&longitude=${L.lon}&hourly=precipitation_probability,precipitation&forecast_days=3&timezone=auto`);
    if(!r.ok)throw 0;const j=await r.json();const H=j.hourly||{};const out=[];let cur=null;
    (H.time||[]).forEach((t,i)=>{const k=t.slice(0,10),h=+t.slice(11,13);const chove=h>=6&&h<=23&&(H.precipitation_probability[i]||0)>=60&&(H.precipitation[i]||0)>=.5;
      if(chove&&cur&&cur.k===k&&cur.fim===h)cur.fim=h+1;else if(chove){cur={k,ini:h,fim:h+1};out.push(cur)}else cur=null});
    climaCache={ibge:L.ibge,t:Date.now(),v:out};return out}catch(e){return[]}}
async function dinamicosEntre(ini,fim){const L=S.cfg.local||{};const out=[];const anos=[+ini.slice(0,4)];if(fim.slice(0,4)!==ini.slice(0,4))anos.push(+fim.slice(0,4));
  // feriados: véspera (saída da cidade) e último dia (volta)
  const fers=feriadosEntre(key(somaD(fromKey(ini),-5)),key(somaD(fromKey(fim),5)));const vistos=new Set();
  fers.filter(f=>f.tipo!=="fac"&&!ehFolgaGeral(f.k)).forEach(f=>{const bl=blocoDoFeriado(f.k,fers);if(vistos.has(bl.a))return;vistos.add(bl.a);
    const vesp=key(somaD(fromKey(bl.a),-1));const longo=bl.longo;
    out.push({k:vesp,nome:longo?`Véspera do feriadão (${f.nome})`:`Véspera de feriado (${f.nome})`,local:"Rodoviária, aeroporto e saídas da cidade",ini:"17:00",fim:"22:00",tipo:"fer"});
    if(longo)out.push({k:bl.b,nome:`Volta do feriadão (${f.nome})`,local:"Rodoviária e aeroporto",ini:"16:00",fim:"23:00",tipo:"fer"})});
  (await carregaEventos()).filter(ev=>!ev.cidade||ev.cidade===L.ibge).forEach(ev=>anos.forEach(y=>datasDoEvento(ev,y).forEach(k=>
    out.push({k,nome:ev.nome,local:ev.local,ini:ev.ini,fim:ev.fim,tipo:ev.cidade?"cid":"nac"}))));
  (await chuvaPrevista()).forEach(c=>out.push({k:c.k,nome:"Chuva prevista",local:`Em ${L.cidade}. Com chuva, mais gente chama carro.`,ini:pad(c.ini)+":00",fim:pad(c.fim%24)+":00",tipo:"chuva"}));
  return out.filter(x=>x.k>=ini&&x.k<=fim).sort((a,b)=>a.k.localeCompare(b.k)||a.ini.localeCompare(b.ini))}
const quandoTxt=k=>k===hoje?"Hoje":k===key(somaD(fromKey(hoje),1))?"Amanhã":`${DIAS_LONGOS[fromKey(k).getDay()]} ${ddmm(k)}`;
let dinVez=0;
async function renderDinamicos(){const box=$("dinBox");if(!box)return;
  if(!pro()){box.innerHTML=travaPremium("Saiba antes quando pode ter dinâmico: véspera e volta de feriado, grandes eventos da sua cidade e chuva prevista.");return}
  const L=S.cfg.local;if(!L){box.innerHTML="";box.appendChild(el("p",{class:"muted"},"Escolha sua cidade para ver os eventos e a chuva da sua região."));const s=el("div");box.appendChild(s);seletorCidade(s,tudo)}
  const vez=++dinVez;const lista=await dinamicosEntre(hoje,key(somaD(fromKey(hoje),30)));if(vez!==dinVez)return;
  const ul=el("div",{class:"din-lista"});if(L)box.innerHTML="";
  if(!lista.length)ul.appendChild(el("p",{class:"empty"},"Nada previsto nos próximos 30 dias."));
  lista.slice(0,8).forEach(x=>{const it=el("div",{class:"din t-"+x.tipo},`<div class="fer-d"><b>${quandoTxt(x.k)}</b><small>${x.ini} às ${x.fim}</small></div><div class="fer-t"><b>${esc(x.nome)}</b><small>${esc(x.local)}</small></div>`);
    it.appendChild(el("button",{type:"button",class:"btn tiny ghost","aria-label":"Meta do dia "+ddmm(x.k),onclick:()=>personalizaDia(x.k,x.nome)},"Meta"));ul.appendChild(it)});
  box.appendChild(ul);
  if(L)box.appendChild(el("p",{class:"muted fonte"},`Para ${esc(L.cidade)}/${esc(L.uf)}. São previsões: o dinâmico depende da plataforma. Chuva: Open-Meteo.`))}

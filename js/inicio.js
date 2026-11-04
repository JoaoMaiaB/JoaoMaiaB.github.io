/* Minha Diária · Tela Início: herói do dia, anel do objetivo do mês e análise do ciclo. */
"use strict";

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

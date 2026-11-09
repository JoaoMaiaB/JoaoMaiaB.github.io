/* Minha Diária · Tela Contas: custos do carro, combustível, meta mensal e (no Premium) casa, dívidas e faturas. */
"use strict";

/* ---------- CONTAS ---------- */
const PRESET_CARRO=[["Aluguel do carro","semanal"],["Financiamento do carro","mensal"],["Seguro","mensal"],["Estacionamento","semanal"],["Troca de óleo","km",5000],
  ["Pneus","km",40000],["IPVA e licenciamento","meses",12],["Alinhamento e balanceamento","km",10000],["Lavagem","mensal"],["Plano de celular","mensal"],["Outro custo","mensal"]];
const PRESET_CASA=[["Aluguel","mensal"],["Condomínio","mensal"],["Luz","mensal"],["Água","mensal"],["Gás","mensal"],["Internet","mensal"],["Mercado","mensal"],
  ["DAS do MEI","mensal"],["Empréstimo","mensal",0,true],["Cartão parcelado","mensal",0,true],["Plano de saúde","mensal"],["Escola","mensal"],["Pensão","mensal"],["Outra conta","mensal"]];
let abrirId=null;
function chipsPreset(boxId,preset,tipo,listaFn){const b=$(boxId);b.innerHTML="";const usados=new Set(listaFn().map(x=>x.nome));
  preset.forEach(([nome,freq,cada,parc])=>{if(usados.has(nome)&&!/^Outr/.test(nome))return;
    if(!pro()&&PRO_CARRO.includes(nome)){b.appendChild(el("button",{type:"button",class:"chip add locked",onclick:()=>abrePremium()},`+ ${esc(nome)} <span class="pro-mini">PRO</span>`));return}
    b.appendChild(el("button",{type:"button",class:"chip add",onclick:()=>{const x={id:uid(),nome:/^Outr/.test(nome)?"":nome,valor:0,freq,cada:cada||undefined,tipo,desde:parc?cid:"",parcelas:parc?12:0};
      S.desp.push(x);abrirId=x.id;salva();renderContas();focaItem(x.id)}},"+ "+esc(nome)+(dev()&&PRO_CARRO.includes(nome)?' <span class="pro-mini">PRO</span>':"")))})}
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

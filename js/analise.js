/* Minha Diária · Análises do Premium: evolução por semana e por mês, melhores dias e turnos,
   e consumo do carro (km/l, preço do litro e postos mais baratos). */
"use strict";

const lancsEntre=(ini,fim)=>Object.keys(S.lanc).filter(k=>k>=ini&&k<=fim&&S.lanc[k].v>0).map(k=>[k,S.lanc[k]]);
const travaPremium=(txt)=>`<div class="trava"><p class="muted">${txt}</p><button type="button" class="btn tiny" data-premium>Conhecer o Premium</button></div>`;

/* ---------- 7. evolução (Premium) ---------- */
let evolModo="sem";
function gruposEvol(){const out=[];
  if(evolModo==="sem"){const d=fromKey(hoje);d.setDate(d.getDate()-((d.getDay()+6)%7));// segunda-feira desta semana
    for(let i=7;i>=0;i--){const ini=new Date(d);ini.setDate(ini.getDate()-7*i);const fim=new Date(ini);fim.setDate(fim.getDate()+6);
      out.push({rot:ddmm(key(ini)),ini:key(ini),fim:key(fim)})}}
  else for(let i=5;i>=0;i--){const c=somaMes(cidDe(hoje),-i);const{ini,fim}=limites(c);out.push({rot:MESES[+c.slice(5)-1].slice(0,3),ini:key(ini),fim:key(fim)})}
  out.forEach(g=>{const ls=lancsEntre(g.ini,g.fim);g.fat=ls.reduce((s,[,L])=>s+L.v,0);g.luc=ls.reduce((s,[,L])=>s+lucroDia(L),0)});return out}
function graficoEvol(gs){const W=340,H=170,b=22,top=14,max=Math.max(1,...gs.map(g=>g.fat));const gw=(W-8)/gs.length,bw=Math.min(14,gw/2-3);
  const y=v=>top+(H-top-b)*(1-Math.max(0,v)/max);
  const barras=gs.map((g,i)=>{const x=4+i*gw+gw/2;
    return`<rect class="b-fat" x="${x-bw-1}" y="${y(g.fat)}" width="${bw}" height="${H-b-y(g.fat)}" rx="3"><title>${esc(g.rot)}: faturamento ${brl(g.fat)}</title></rect>`+
      `<rect class="b-luc" x="${x+1}" y="${y(g.luc)}" width="${bw}" height="${H-b-y(g.luc)}" rx="3"><title>${esc(g.rot)}: lucro ${brl(g.luc)}</title></rect>`+
      `<text x="${x}" y="${H-6}" text-anchor="middle">${esc(g.rot)}</text>`}).join("");
  return`<svg class="graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Faturamento e lucro por ${evolModo==="sem"?"semana":"mês"}"><line x1="0" x2="${W}" y1="${H-b}" y2="${H-b}" class="eixo"/>${barras}</svg>`}
function renderEvol(){const box=$("evolBox");$("evolModo").hidden=!pro();
  document.querySelectorAll("#evolModo button").forEach(b=>b.setAttribute("aria-checked",String(b.dataset.m===evolModo)));
  if(!pro()){box.innerHTML=travaPremium("Veja seu faturamento e seu lucro semana a semana e mês a mês, e descubra se está melhorando.");return}
  const gs=gruposEvol();if(!gs.some(g=>g.fat>0)){box.innerHTML='<p class="muted">Lance alguns dias para ver sua evolução.</p>';return}
  // compara os dois últimos períodos completos; o atual ainda está em andamento
  const at=gs[gs.length-1],ul=gs[gs.length-2],pe=gs[gs.length-3];const dif=pe&&pe.fat>0?(ul.fat-pe.fat)/pe.fat:null;const sem=evolModo==="sem";
  const comp=dif!=null?`, <span class="${dif>=0?"pos":"neg"}">${dif>=0?"+":"−"}${nf(Math.abs(dif)*100,0)}%</span> em relação ${sem?"à semana anterior":"ao mês anterior"}`:"";
  box.innerHTML=graficoEvol(gs)+`<p class="legenda"><span class="lg fat"></span>Faturamento <span class="lg luc"></span>Lucro</p>`+
    `<p class="muted">${sem?"Semana passada":"Mês passado"}: ${brl(ul.fat)}${comp}. ${sem?"Esta semana":"Este mês"}, até agora: ${brl(at.fat)}.</p>`}
document.querySelectorAll("#evolModo button").forEach(b=>b.onclick=()=>{evolModo=b.dataset.m;renderEvol()});

/* ---------- 10. melhores dias e turnos (Premium) ---------- */
function renderMelhores(){const box=$("melhoresBox");
  if(!pro()){box.innerHTML=travaPremium("Descubra que dia da semana e que turno rendem mais por hora, para rodar quando vale mais a pena.");return}
  const lim=(()=>{const d=fromKey(hoje);d.setDate(d.getDate()-90);return key(d)})();const ls=lancsEntre(lim,hoje);
  const comH=ls.filter(([,L])=>L.h>0);const porHora=comH.length>=5;
  const dia={};ls.forEach(([k,L])=>{if(porHora&&!(L.h>0))return;const w=fromKey(k).getDay();const o=dia[w]=dia[w]||{v:0,n:0,h:0};o.v+=L.v;o.n++;o.h+=+L.h||0});
  const linhas=Object.entries(dia).filter(([,o])=>o.n>=2).map(([w,o])=>({nome:DIAS_LONGOS[w],val:porHora?o.v/o.h:o.v/o.n,n:o.n})).sort((a,b)=>b.val-a.val);
  if(!linhas.length){box.innerHTML='<p class="muted">Precisa de pelo menos 2 lançamentos no mesmo dia da semana. Continue lançando!</p>';return}
  const max=linhas[0].val;
  let h=`<p class="muted">${porHora?"Quanto você faz por hora":"Média por dia"} em cada dia da semana (últimos 90 dias).</p><div class="rank">`+
    linhas.map((l,i)=>`<div class="rk${i===0?" top":""}"><span>${l.nome}</span><span class="bar"><i style="width:${Math.round(l.val/max*100)}%"></i></span><b class="num">${brl(l.val)}</b></div>`).join("")+"</div>";
  // turnos: divide as horas do dia entre os turnos marcados
  const tu={};comH.filter(([,L])=>L.t&&L.t.length).forEach(([,L])=>L.t.forEach(t=>{const o=tu[t]=tu[t]||{v:0,h:0,n:0};o.v+=L.v/L.t.length;o.h+=L.h/L.t.length;o.n++}));
  const tl=Object.entries(tu).filter(([,o])=>o.n>=2).map(([t,o])=>({t,val:o.v/o.h})).sort((a,b)=>b.val-a.val);
  h+=tl.length?`<p class="muted" style="margin-top:12px">Por turno: ${tl.map((x,i)=>`${i===0?"<b>":""}${x.t} ${brl(x.val)}/h${i===0?"</b>":""}`).join(" · ")}.</p>`
    :`<p class="muted" style="margin-top:12px">Para comparar os turnos, marque as horas e o turno (madrugada, manhã, tarde, noite) em "Gastos do dia, horas e turno" no lançamento.</p>`;
  if(!porHora)h+='<p class="muted">Dica: lance as horas rodadas para ver quanto rende cada hora, que é a conta mais justa.</p>';
  box.innerHTML=h}

/* ---------- 11. consumo e postos (Premium) ---------- */
function renderAbast(){const box=$("abastBox");
  if(!pro()){box.innerHTML='<p class="muted"><span class="pro-mini">PRO</span> Com o Premium, informe os litros no lançamento e veja o consumo em km/l, o preço médio do litro e o posto mais barato.</p>';return}
  const ab=Object.keys(S.lanc).filter(k=>S.lanc[k].l>0).sort();
  if(ab.length<3){box.innerHTML=`<p class="muted">Consumo do carro: informe os litros em "Gastos do dia, horas e turno" quando abastecer. ${ab.length?`Faltam ${3-ab.length} abastecimentos`:"Depois de 3 abastecimentos"} para o app mostrar o consumo.</p>`;return}
  const lit=ab.reduce((s,k)=>s+S.lanc[k].l,0),gasto=ab.reduce((s,k)=>s+(+S.lanc[k].c||0),0);
  // consumo: km rodados depois do 1º abastecimento ÷ litros colocados depois dele
  const kmPer=Object.keys(S.lanc).filter(k=>k>ab[0]&&k<=hoje).reduce((s,k)=>s+(+S.lanc[k].km||0),0);
  const litDepois=lit-S.lanc[ab[0]].l;const kml=litDepois>0?kmPer/litDepois:0;
  const po={};ab.forEach(k=>{const L=S.lanc[k];if(!L.posto||!(L.c>0))return;const n=L.posto.trim();const id=n.toLowerCase();const o=po[id]=po[id]||{n,c:0,l:0,q:0};o.c+=L.c;o.l+=L.l;o.q++});
  const rank=Object.values(po).map(o=>({...o,pl:o.c/o.l})).sort((a,b)=>a.pl-b.pl);
  box.innerHTML=`<h3>Consumo do carro</h3><dl class="kv"><dt>Consumo médio</dt><dd>${kml?nf(kml)+" km/l":"–"}</dd><dt>Preço médio do litro</dt><dd>${brl(gasto/lit)}</dd><dt>Abastecimentos</dt><dd>${ab.length} (${nf(lit,0)} L)</dd></dl>`+
    (rank.length>=2?`<p class="muted">Postos mais baratos: ${rank.slice(0,3).map(o=>`${esc(o.n)} ${brl(o.pl)}/L`).join(" · ")}.${rank[rank.length-1].pl-rank[0].pl>=.05?` Abastecer sempre no primeiro economiza ${brl((rank[rank.length-1].pl-rank[0].pl)*lit/ab.length)} por abastecimento, em média.`:""}</p>`
      :'<p class="muted">Informe o nome do posto ao abastecer para comparar os preços.</p>')}

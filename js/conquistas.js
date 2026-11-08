/* Minha Diária · Conquistas: dias seguidos lançando, medalhas e o resumo do mês para compartilhar. */
"use strict";

/* ---------- 8. sequências e medalhas ---------- */
const diaDeTrabalho=k=>metaDoDia(k,true).meta>0;
const lancou=k=>tem(k)&&(S.lanc[k].v>0||diaDeTrabalho(k));
// Sequência: dias de trabalho seguidos com lançamento. Folga não quebra; dia de trabalho sem lançar quebra.
function sequencias(){const ks=Object.keys(S.lanc).filter(k=>S.lanc[k].v>0).sort();if(!ks.length)return{atual:0,melhor:0};
  let melhor=0,run=0;const d=fromKey(ks[0]),fim=fromKey(hoje);
  for(;d<=fim;d.setDate(d.getDate()+1)){const k=key(d);
    if(tem(k)&&S.lanc[k].v>0){run++;melhor=Math.max(melhor,run)}
    else if(diaDeTrabalho(k)&&!tem(k)&&k!==hoje)run=0}
  return{atual:run,melhor}}
function metasBatidas(){let n=0;for(const k in S.lanc){const L=S.lanc[k];const m=metaDoDia(k,true).meta;if(m>0&&L.v>=m)n++}return n}
function mesesNoObjetivo(){const ks=Object.keys(S.lanc).sort();if(!ks.length)return 0;let n=0;
  for(let c=cidDe(ks[0]);c<=cidDe(hoje);c=somaMes(c,1)){const o=contas(c).obj;if(!(o>0))continue;
    const f=diasDo(c).reduce((s,x)=>s+(tem(x.k)?S.lanc[x.k].v:0),0);if(f>=o)n++}return n}
const MEDALHAS=[
  ["primeiro","Primeiro dia","Lançou o primeiro dia",d=>d.lanc>=1],
  ["seq7","7 dias seguidos","Lançou 7 dias de trabalho seguidos",d=>d.melhor>=7],
  ["seq30","30 dias seguidos","Lançou 30 dias de trabalho seguidos",d=>d.melhor>=30],
  ["meta5","Meta batida 5 vezes","Bateu a meta do dia 5 vezes",d=>d.metas>=5],
  ["meta20","Meta batida 20 vezes","Bateu a meta do dia 20 vezes",d=>d.metas>=20],
  ["mes","Mês no objetivo","Fechou um mês acima do objetivo",d=>d.meses>=1],
  ["km1","1.000 km","Rodou 1.000 km lançados",d=>d.km>=1000],
  ["km10","10.000 km","Rodou 10.000 km lançados",d=>d.km>=10000],
  ["lanc100","100 dias lançados","Lançou 100 dias",d=>d.lanc>=100]];
function renderConquistas(){const sq=sequencias();
  const dados={lanc:Object.values(S.lanc).filter(L=>L.v>0).length,melhor:sq.melhor,metas:metasBatidas(),meses:mesesNoObjetivo(),km:totalKm()};
  $("cardConq").hidden=!dados.lanc;if(!dados.lanc)return;
  $("streak").innerHTML=`<span class="fogo num">${sq.atual}</span><span><b>${sq.atual===1?"dia seguido":"dias seguidos"} lançando</b><small class="muted">Seu recorde: ${sq.melhor} ${sq.melhor===1?"dia":"dias"}. Folga não quebra a sequência.</small></span>`;
  const ganhas=MEDALHAS.filter(m=>m[3](dados)).map(m=>m[0]);
  const novas=S.conq?ganhas.filter(id=>!S.conq.includes(id)):[];
  if(!S.conq||novas.length){S.conq=ganhas;salva()}
  if(novas.length){const m=MEDALHAS.find(x=>x[0]===novas[novas.length-1]);setTimeout(()=>toast(`Nova conquista: ${m[1]}!`),3800)}
  $("badges").innerHTML=MEDALHAS.map(([id,nome,desc])=>{const on=ganhas.includes(id);
    return`<span class="badge${on?" on":""}" title="${esc(desc)}"><i aria-hidden="true">${on?"★":"☆"}</i>${esc(nome)}</span>`}).join("")}

/* ---------- 9. resumo do mês para compartilhar ---------- */
function dadosDoMes(c){const ds=diasDo(c);let feito=0,km=0,dias=0,metas=0,comMeta=0,lucro=0;
  ds.forEach(x=>{if(x.meta>0&&x.k<=hoje)comMeta++;if(!tem(x.k))return;const L=S.lanc[x.k];if(!(L.v>0))return;
    feito+=L.v;km+=+L.km||0;dias++;lucro+=lucroDia(L);if(x.meta>0&&L.v>=x.meta)metas++});
  const obj=contas(c).obj;return{feito,km,dias,metas,comMeta,lucro,obj,pct:obj>0?Math.min(1,feito/obj):0}}
function desenhaResumo(c,valores){const D=dadosDoMes(c);const W=1080,H=1350;const cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");
  const verde="#0f7a5a",claro="#e8f4ef",escuro="#14201b";
  g.fillStyle=verde;g.fillRect(0,0,W,H);
  g.fillStyle="rgba(255,255,255,.08)";g.beginPath();g.arc(W-80,120,260,0,7);g.fill();g.beginPath();g.arc(60,H-90,200,0,7);g.fill();
  g.fillStyle="#fff";g.font="600 44px system-ui,sans-serif";g.fillText("Minha Diária",80,130);
  g.font="400 40px system-ui,sans-serif";g.fillStyle=claro;g.fillText("Meu mês de "+nomeCiclo(c),80,195);
  // anel do objetivo
  const cx=W/2,cy=470,r=190;g.lineWidth=46;g.strokeStyle="rgba(255,255,255,.18)";g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.stroke();
  g.strokeStyle="#fff";g.lineCap="round";g.beginPath();g.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(.001,D.pct));g.stroke();
  g.textAlign="center";g.fillStyle="#fff";g.font="700 110px system-ui,sans-serif";g.fillText(Math.round(D.pct*100)+"%",cx,cy+30);
  g.font="400 36px system-ui,sans-serif";g.fillStyle=claro;g.fillText("do objetivo do mês",cx,cy+85);
  // quadros
  const quadros=[["Dias trabalhados",String(D.dias)],["Km rodados",nf(D.km,0)],["Metas batidas",`${D.metas} de ${D.comMeta}`],["Dias seguidos",String(sequencias().atual)]];
  if(valores){quadros.splice(0,0,["Faturamento",brl0(D.feito)],["Lucro",brl0(D.lucro)])}
  const cols=2,bw=440,bh=150,gx=40,y0=valores?740:790;
  quadros.forEach(([t,v],i)=>{const x=80+(i%cols)*(bw+gx),y=y0+Math.floor(i/cols)*(bh+28);
    g.fillStyle="#fff";g.beginPath();g.roundRect(x,y,bw,bh,28);g.fill();
    g.textAlign="left";g.fillStyle="#5b6b64";g.font="400 32px system-ui,sans-serif";g.fillText(t,x+32,y+52);
    g.fillStyle=escuro;g.font="700 54px system-ui,sans-serif";g.fillText(v,x+32,y+118)});
  g.textAlign="center";g.fillStyle=claro;g.font="400 32px system-ui,sans-serif";g.fillText("Controle diário para motoristas de aplicativo",W/2,H-70);
  return cv}
function abreResumo(){let valores=false;const c=cid;
  const b=folha(`<div class="wz-top"><h2 class="wz-h" style="margin:0">Resumo do mês</h2><button type="button" class="ib" data-close aria-label="Fechar">✕</button></div>
    <p class="muted">Mostre seu mês no grupo dos motoristas. Por padrão, a imagem não mostra quanto você ganhou.</p>
    <label class="switch"><input type="checkbox" id="rsVal"><span>Mostrar faturamento e lucro</span></label>
    <img id="rsImg" class="resumo-img" alt="Prévia do resumo do mês">
    <button type="button" class="btn big" id="rsOk">Compartilhar</button><p class="status" id="rsSt"></p>`);
  const pinta=()=>{b.querySelector("#rsImg").src=desenhaResumo(c,valores).toDataURL("image/png")};
  b.querySelector("#rsVal").onchange=e=>{valores=e.target.checked;pinta()};pinta();
  b.querySelector("#rsOk").onclick=()=>desenhaResumo(c,valores).toBlob(async blob=>{const nome=`minha-diaria-${c}.png`;const st=b.querySelector("#rsSt");
    try{const f=new File([blob],nome,{type:"image/png"});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text:"Meu mês no Minha Diária"});st.textContent="";return}}
    catch(e){if(e&&e.name==="AbortError")return}
    const a=el("a",{href:URL.createObjectURL(blob),download:nome});document.body.appendChild(a);a.click();a.remove();st.textContent=`Imagem salva como ${nome}.`},"image/png")}
$("btnResumo").onclick=abreResumo;

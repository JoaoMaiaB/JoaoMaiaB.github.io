/* Minha Diária · Interface comum: troca de abas, folhas que sobem de baixo, aviso (toast) e componentes
   reaproveitados (stepper, campos de formulário). */
"use strict";

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

/* ---------- FOLHA GENÉRICA ---------- */
function folha(html,travada){const b=$("sheetBody");b.innerHTML=html;b.parentElement.classList.remove("venda-box");$("sheet").dataset.travada=travada?"1":"";if($("sheet").hidden)abre("sheet");b.parentElement.scrollTop=0;return b}

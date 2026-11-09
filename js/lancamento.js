/* Minha Diária · Teclado de lançamento do dia: modos Rápido e Detalhado, aplicativos e corridas particulares. */
"use strict";

/* ---------- TECLADO DE LANÇAMENTO ---------- */
// Dois formatos: rápido (um valor só) e detalhado (por aplicativo + corridas particulares)
const APPS_PADRAO=[{id:"uber",nome:"Uber"},{id:"99",nome:"99"},{id:"indrive",nome:"inDrive"}];
const apps=()=>[...APPS_PADRAO,...(S.cfg.apps||[])];
const P={k:hoje,b:{v:"",km:"",c:"",g:"",l:""},part:[],t:[],campo:"v",modo:"rapido",h:0,mexeuH:false};
const padH=stepper({rot:"Horas rodadas",valor:0,passo:.5,min:0,max:24,fmt:v=>nf(v)+" h",on:v=>{P.h=v;P.mexeuH=true}});
$("padHoras").replaceWith(padH);
["1","2","3","4","5","6","7","8","9","00","0","⌫"].forEach(t=>{const b=el("button",{type:"button",class:"key"+(t==="⌫"?" bs":""),"data-k":t,"aria-label":t==="⌫"?"Apagar":t},t);
  b.onclick=()=>{tecla(t);vibra()};$("keys").appendChild(b)});
function tecla(t){const c=P.campo;if(P.modo==="detalhado"&&c==="v")return;const cur=P.b[c]||"";
  P.b[c]=t==="⌫"?cur.slice(0,-1):cur.length<(c==="km"?4:c==="l"?5:8)?(cur+t).replace(/^0+/,""):cur;pintaPad()}
const cents=s=>(parseInt(s||"0",10)||0)/100;
const somaApps=()=>apps().reduce((s,a)=>s+cents(P.b["a:"+a.id]),0);
const somaPart=()=>P.part.reduce((s,x)=>s+(+x.v||0),0);
const valorPad=()=>P.modo==="detalhado"?Math.round((somaApps()+somaPart())*100)/100:cents(P.b.v);
const kmPad=()=>parseInt(P.b.km||"0",10)||0;
const combPad=()=>cents(P.b.c);
const gasPad=()=>cents(P.b.g);
const litPad=()=>cents(P.b.l);
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
  // gastos do dia, litros, posto e turno (dentro de "Gastos do dia, horas e turno")
  $("padGasOut").textContent=brl(gasPad());$("padLitOut").textContent=nf(litPad(),2)+" L";
  [["fGas","g"],["fLit","l"]].forEach(([id,c])=>{$(id).classList.toggle("on",P.campo===c);$(id).classList.toggle("zero",!P.b[c])});
  $("fLit").querySelector(".pro-mini").hidden=pro()&&!dev();$("padPostoL").hidden=!(pro()&&litPad()>0);
  const tb=$("padTurnos");tb.innerHTML="";TURNOS.forEach(t=>{const on=P.t.includes(t);
    tb.appendChild(el("button",{type:"button",class:"chip"+(on?" on":""),"aria-pressed":String(on),onclick:()=>{P.t=on?P.t.filter(x=>x!==t):[...P.t,t];pintaPad()}},t))});
  $("padSalvar").textContent=naApp&&!P.b.km?"Próximo: km rodados":P.campo==="km"&&!P.b.c?"Próximo: combustível":"Salvar";
  const cm=combMedia();
  $("padLucro").textContent=P.campo==="g"?"Pedágio, lanche, lavagem: some tudo o que gastou hoje, fora o combustível.":P.campo==="l"?(litPad()>0&&combPad()>0?`Preço do litro: ${brl(combPad()/litPad())}.`+(km>0?` Consumo hoje: ${nf(km/litPad())} km/l.`:""):"Quantos litros você colocou hoje? Assim o app calcula o consumo e o preço do litro."):P.campo==="km"?"Veja os km do dia no app de corrida ou no painel do carro.":P.campo==="c"?(km>0&&combPad()>0?`Hoje: ${brl(combPad()/km)} por km. Sua média: ${brl(cm.v)} por km.`:"Quanto você gastou de combustível hoje? Se não abasteceu, deixe zero."):det&&P.campo==="v"?"Toque num aplicativo para digitar quanto fez nele.":v>0&&km>0?`Lucro do dia ≈ ${brl(v-km*custoKm().total)}`:""}
$("fVal").onclick=()=>{if(P.modo==="detalhado"){P.campo="a:"+apps()[0].id}else P.campo="v";pintaPad()};
$("fKm").onclick=()=>{P.campo="km";pintaPad()};
$("fGas").onclick=()=>{P.campo="g";pintaPad()};
$("fLit").onclick=()=>{if(!pro()){abrePremium();return}P.campo="l";pintaPad()};$("fComb").onclick=()=>{P.campo="c";pintaPad()};
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
  P.b.g=L&&L.g?String(Math.round(L.g*100)):"";P.b.l=L&&L.l?String(Math.round(L.l*100)):"";
  P.t=L&&L.t?[...L.t]:[];$("padPosto").value=L&&L.posto||"";
  P.part=L&&L.part?L.part.map(x=>({...x})):[];
  if(L&&L.apps)for(const id in L.apps)P.b["a:"+id]=String(Math.round(L.apps[id]*100));
  P.modo=L?(L.apps||L.part?"detalhado":"rapido"):(S.cfg.modoLanc||"rapido");
  P.campo=P.modo==="detalhado"?"a:"+apps()[0].id:"v";
  P.h=L&&L.h?L.h:m.h||0;P.mexeuH=false;padH.setValor(P.h);$("padMais").open=!!(L&&(L.h||L.g||L.l||(L.t&&L.t.length)));
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
  if(v>0){const g=gasPad();if(g>0)reg.g=g;if(P.t.length)reg.t=P.t.filter(t=>TURNOS.includes(t));
    const l=litPad();if(pro()&&l>0){reg.l=l;const po=$("padPosto").value.trim().slice(0,30);if(po)reg.posto=po}}
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

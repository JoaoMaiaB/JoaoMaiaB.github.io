/* Minha Diária · Configuração inicial: as 6 perguntas da primeira vez. */
"use strict";

/* ---------- CONFIGURAÇÃO INICIAL ---------- */
let W=null;
function abreWizard(){W={passo:0,dia:S.cfg.diaCiclo===1&&!S.configurado?10:S.cfg.diaCiclo,carro:{},retirada:S.cfg.retirada||0,
  dias:new Set(ORDEM_SEMANA.filter(d=>rotOn(S.rot[d]))),horas:6,hd:{},vh:S.cfg.vhPadrao||35,litro:S.configurado?litroAtual():+S.cfg.precoLitro||6.3,kml:kmlAtual(),rkm:+S.cfg.rkm||1.8};
  for(let d=0;d<7;d++)W.hd[d]=rotOn(S.rot[d])?+S.rot[d].h:(d===0||d===6?8:6);
  carroDe().forEach(x=>W.carro[x.nome]={valor:x.valor,ex:true});if(!W.dias.size)[3,4,5,6,0].forEach(d=>W.dias.add(d));
  const r1=ORDEM_SEMANA.map(d=>S.rot[d]).find(rotOn);if(r1)W.vh=+r1.vh
  passoW()}
const TOTAL_W=6;
function passoW(){const p=W.passo;const nav=(prox,txt)=>`<div class="wz-nav">${p>0?'<button type="button" class="btn ghost" id="wVolta">Voltar</button>':'<span></span>'}<button type="button" class="btn" id="wVai">${txt||"Continuar"}</button></div>`;
  const topo=`<div class="wz-top"><div class="dots">${Array.from({length:TOTAL_W},(_,i)=>`<i class="${i<=p?"on":""}"></i>`).join("")}</div>${S.configurado?'<button type="button" class="ib" data-close aria-label="Fechar">✕</button>':""}</div>`;
  let h="";
  if(p===0)h=`${topo}<h2 class="wz-h">Quanto você precisa fazer por dia?</h2><p>Em um minuto o app descobre, com base nas suas contas e na sua rotina. Depois é só lançar quanto fez, em dois toques.</p>
    ${nav(0,"Começar")}${nuvemLigada()?'<button type="button" class="btn ghost wide" id="wConta">Já tenho conta: entrar</button>':""}<label class="btn ghost file wide">Já tenho um backup<input type="file" id="wImport" accept="application/json,.json"></label><p class="status" id="wStatus"></p>`;
  else if(p===1)h=`${topo}<h2 class="wz-h">Em que dia vencem suas contas?</h2><p class="muted">Seu "mês" vai desse dia até a véspera do próximo vencimento.</p><div class="chips big" id="wDias"></div><div id="wDiaOutro"></div>${nav()}`;
  else if(p===2)h=`${topo}<h2 class="wz-h">Quais custos o seu carro tem?</h2><p class="muted">Toque para marcar e coloque o valor. O combustível vem depois.</p><div class="chips" id="wCarroChips"></div><div id="wCarroVals" class="wz-vals"></div>${nav()}`;
  else if(p===3)h=`${topo}<h2 class="wz-h">Defina sua meta mensal</h2><p class="muted">Quanto você quer que sobre no mês, depois do carro e do combustível, para pagar suas contas e para você. Pode ser aproximado. Com isso o app calcula quanto você precisa fazer por dia e por mês.</p>
    <label class="big-in"><span>R$</span><input type="text" inputmode="decimal" id="wRet" placeholder="0,00" value="${inVal(W.retirada)}"></label>
    <p class="muted">Prefere cadastrar cada conta, cartão e empréstimo separado? Isso é do Premium, que você encontra depois na aba Contas.</p>${nav()}`;
  else if(p===4)h=`${topo}<h2 class="wz-h">Quando você costuma rodar?</h2><p class="muted">Toque nos dias e ajuste as horas de cada um. Feriados e dias de evento ganham horário próprio na aba Rotina.</p><div class="chips big" id="wSem"></div><div class="wz-dias" id="wHd"></div><div class="wz-st" id="wSt"></div>${nav()}`;
  else if(p===5)h=`${topo}<h2 class="wz-h">Quanto você gasta por km?</h2><p class="muted">O app calcula para você com o preço do litro e quantos km o carro faz por litro. Se não souber, deixe como está: o app aprende com os seus lançamentos.</p>
    <div class="wz-st" id="wKm"></div><p class="muted" id="wKmD"></p>${nav(0,"Ver meu resultado")}`;
  else{aplicaWizard();const C=contas(cid);const ds=diasDo(cid);const plan=ds.reduce((s,x)=>s+metaDoDia(x.k,true).meta,0);const dTrab=diasTrab(cid);
    h=`${topo}<h2 class="wz-h">Pronto!</h2><p class="muted">Para pagar tudo e chegar na sua meta em ${nomeCiclo(cid)}, você precisa fazer:</p>
      <div class="wz-res2"><div><span class="muted">por mês</span><b class="num">${brl(C.obj)}</b></div><div><span class="muted">por dia de trabalho</span><b class="num">${dTrab?brl(C.obj/dTrab):"–"}</b>${dTrab?`<small class="muted">${dTrab} dias de trabalho no mês</small>`:""}</div></div>
      <p>${plan>=C.obj?`<strong class="pos">Sua rotina dá conta</strong> e sobra ${brl(plan-C.obj)}.`:plan?`<strong class="neg">Sua rotina rende ${brl(plan)}</strong>. O app mostra no Início quantas horas a mais seriam necessárias.`:""}</p>
      <p class="muted">Agora, no fim de cada dia, toque em <b>+</b> e digite quanto fez, os km rodados e o combustível.</p><button type="button" class="btn big" id="wFim">Começar a usar</button>`}
  const b=folha(h,!S.configurado);
  const vai_=b.querySelector("#wVai"),volta=b.querySelector("#wVolta");if(volta)volta.onclick=()=>{guardaW();W.passo--;passoW()};if(vai_)vai_.onclick=()=>{guardaW();W.passo++;passoW()};
  if(p===0){if(b.querySelector("#wConta"))b.querySelector("#wConta").onclick=()=>abreConta("entrar");b.querySelector("#wImport").onchange=async ev=>{const f=ev.target.files[0];if(f&&await importa(f,b.querySelector("#wStatus"))){fecha("sheet");toast("Backup importado. Tudo pronto!")}}}
  if(p===1){const box=b.querySelector("#wDias");const pinta=()=>{box.innerHTML="";[1,5,10,15,20,25].forEach(n=>box.appendChild(el("button",{type:"button",class:"chip"+(W.dia===n?" on":""),onclick:()=>{W.dia=n;pinta();st.setValor(n)}},"Dia "+n)))};
    const st=stepper({rot:"Outro dia",valor:W.dia,passo:1,min:1,max:28,fmt:v=>"Dia "+v,on:v=>{W.dia=v;pinta()}});b.querySelector("#wDiaOutro").appendChild(st);pinta()}
  if(p===2){const ch=b.querySelector("#wCarroChips"),vals=b.querySelector("#wCarroVals");
    const pinta=()=>{ch.innerHTML="";vals.innerHTML=Object.keys(W.carro).length?'<p class="wz-sep">Valor de cada item marcado</p>':"";PRESET_CARRO.filter(x=>!/^Outro/.test(x[0])&&(pro()||!PRO_CARRO.includes(x[0]))).forEach(([nome,freq,cada])=>{const on=!!W.carro[nome];
      ch.appendChild(el("button",{type:"button",class:"chip"+(on?" on":""),"aria-pressed":String(on),onclick:()=>{if(on)delete W.carro[nome];else W.carro[nome]={valor:0};pinta();if(!on){const i=vals.querySelector(`[data-n="${nome}"]`);i&&i.focus()}}},esc(nome)));
      if(on){const l=el("label",{class:"wz-val"},`<span>${esc(nome)} <small>${freq==="semanal"?"por semana":freq==="meses"?`a cada ${cada} meses`:freq==="km"?`a cada ${nf(cada,0)} km`:"por mês"}</small></span>`);
        const i=el("input",{type:"text",inputmode:"decimal",placeholder:"R$ 0,00","data-n":nome});i.value=inVal(W.carro[nome].valor);i.oninput=()=>{const v=num(i.value);W.carro[nome].valor=v>0?v:0};l.appendChild(i);vals.appendChild(l)}})};pinta()}
  if(p===4){const box=b.querySelector("#wSem"),hd=b.querySelector("#wHd");const pinta=()=>{box.innerHTML="";hd.innerHTML="";ORDEM_SEMANA.forEach(d=>{box.appendChild(el("button",{type:"button",class:"chip"+(W.dias.has(d)?" on":""),"aria-pressed":String(W.dias.has(d)),
      onclick:()=>{W.dias.has(d)?W.dias.delete(d):W.dias.add(d);pinta()}},DIAS_LONGOS[d]));
      if(W.dias.has(d))hd.appendChild(stepper({rot:DIAS_LONGOS[d],valor:W.hd[d],passo:.5,min:1,max:16,fmt:v=>nf(v)+" h",on:v=>{W.hd[d]=v;somaW()}}))});
      if(W.dias.size>1)hd.appendChild(el("button",{type:"button",class:"btn tiny ghost",onclick:()=>{const v=W.hd[[...W.dias][0]];W.dias.forEach(d=>W.hd[d]=v);pinta()}},"Mesmo horário em todos"));somaW()};
    const st=b.querySelector("#wSt");const sv=el("p",{class:"muted"});
    st.append(stepper({rot:"Quanto faz por hora",valor:W.vh,passo:5,min:10,max:150,fmt:v=>"R$ "+v,on:v=>{W.vh=v;somaW()}}),sv);
    function somaW(){const h=[...W.dias].reduce((t,d)=>t+W.hd[d],0);sv.textContent=`${W.dias.size} dias, ${nf(h)} h por semana × R$ ${W.vh} = ${brl(h*W.vh)} por semana`}pinta()}
  if(p===5){const d=()=>{const comb=W.litro/W.kml;const man=custoManutKm(W.carro);
      b.querySelector("#wKmD").innerHTML=`Combustível: <b>${brl(comb)} por km</b> (${brl(W.litro)} ÷ ${nf(W.kml)} km/l).`+(man>0?` Com a manutenção por km que você marcou, o carro custa <b>${brl(comb+man)} por km</b> rodado.`:"")+` Isso é ${nf((comb+man)/W.rkm*100,0)}% do que você ganha por km. Quando você lançar o combustível do dia, o app troca pela sua média real.`};
    b.querySelector("#wKm").append(stepper({rot:"Preço do litro",valor:W.litro,passo:.1,min:1,max:15,fmt:v=>brl(v),on:v=>{W.litro=v;d()}}),
      stepper({rot:"Quantos km o carro faz por litro",valor:W.kml,passo:.5,min:3,max:40,fmt:v=>nf(v)+" km/l",on:v=>{W.kml=v;d()}}),
      stepper({rot:"Quanto ganha por km rodado",valor:W.rkm,passo:.1,min:.5,max:6,fmt:v=>brl(v),on:v=>{W.rkm=v;d()}}));d()}
  if(p===6)b.querySelector("#wFim").onclick=()=>{fecha("sheet");vai("inicio")}}
function guardaW(){if(W.passo===3){const v=num(($("wRet")||{}).value);W.retirada=v>0?v:0}}
function aplicaWizard(){const mudouDia=S.cfg.diaCiclo!==W.dia;S.cfg.diaCiclo=W.dia;S.cfg.retirada=W.retirada;S.cfg.precoLitro=W.litro;S.cfg.kmPorLitro=W.kml;S.cfg.combKm=Math.round(W.litro/W.kml*100)/100;S.cfg.rkm=W.rkm;S.cfg.vhPadrao=W.vh;
  // carro: mantém os itens existentes, atualiza valores, cria os novos, remove desmarcados
  S.desp=S.desp.filter(x=>x.tipo!=="carro"||W.carro[x.nome]||!PRESET_CARRO.some(p=>p[0]===x.nome));
  Object.entries(W.carro).forEach(([nome,o])=>{const ex=S.desp.find(x=>x.tipo==="carro"&&x.nome===nome);
    if(ex){if(o.valor)ex.valor=o.valor}else{const pr=PRESET_CARRO.find(p=>p[0]===nome)||[nome,"mensal"];S.desp.push({id:uid(),nome,valor:o.valor||0,freq:pr[1],cada:pr[2],tipo:"carro",desde:"",parcelas:0})}});
  for(let d=0;d<7;d++){const r=S.rot[d];if(W.dias.has(d)){const mesmo=rotOn(r);r.off=false;if(+r.h!==W.hd[d]){r.h=W.hd[d];r.hr=""}if(!mesmo||!S.configurado)r.vh=W.vh}else r.off=true}
  if(!S.configurado&&!S.cfg.inicio&&!Object.keys(S.lanc).length)S.cfg.inicio=hoje;
  S.configurado=true;salva();if(mudouDia)cid=cidDe(hoje);tudo()}
// Manutenção "a cada X km" (óleo, pneus…) em R$ por km, a partir dos custos marcados no passo do carro
function custoManutKm(sel){return Object.entries(sel).reduce((t,[nome,o])=>{const pr=PRESET_CARRO.find(p=>p[0]===nome);
  const ex=carroDe().find(x=>x.nome===nome&&x.freq==="km");const cada=ex?+ex.cada:pr&&pr[1]==="km"?+pr[2]:0;
  return cada>0&&o.valor>0?t+o.valor/Math.max(100,cada):t},0)}

/* Minha Diária · Premium: tela de venda, planos e ativação. A cobrança em si fica em premium.js. */
"use strict";

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
    <p class="v-trial" id="vTrial"></p>
    <p class="v-conf">A assinatura renova automaticamente pelo mesmo valor no fim de cada período. Cancele quando quiser, direto na Play Store, sem multa. Seus dados continuam só no seu celular.</p>
    <p class="status center" id="pStatus" role="status"></p>
    ${Premium.local?`<details class="mais"><summary>Tenho um código</summary><div class="r1 code"><input type="text" id="pCod" placeholder="Código" autocapitalize="characters"><button type="button" class="btn" id="pCodOk">Usar</button></div></details>`:""}`}
    </div>`);
  b.parentElement.classList.add("venda-box");
  if(pro())return;
  let sel=PLANOS[0].sku;const box=b.querySelector("#vPlanos");
  const precos={};PLANOS.forEach(p=>precos[p.sku]={valor:p.preco,txt:brl(p.preco),gratis:+Premium.diasGratis||0});
  const pinta=()=>{box.innerHTML="";PLANOS.forEach(p=>{const pr=precos[p.sku];const gratis=Math.floor(p.meses-pr.valor/mensal+.05);
    const card=el("button",{type:"button",class:"v-plano"+(sel===p.sku?" on":""),role:"radio","aria-checked":String(sel===p.sku)},
      `${p.selo?`<span class="v-selo">${p.selo}</span>`:""}<span class="v-radio"></span>
       <span class="v-nome"><b>${p.nome}</b><small>${p.meses===1?"Sem compromisso":gratis>0?`Ganhe ${gratis} ${gratis>1?"meses grátis":"mês grátis"}`:""}</small></span>
       <span class="v-preco"><b class="num">${pr.txt}</b><small>${p.meses===1?"por mês":`${brl(pr.valor/p.meses)} por mês`}</small></span>`);
    card.onclick=()=>{sel=p.sku;pinta()};box.appendChild(card)});
    const p=PLANOS.find(x=>x.sku===sel);const pr=precos[sel];const per=p.meses===1?"por mês":p.meses===12?"por ano":`a cada ${p.meses} meses`;
    b.querySelector("#vCta").textContent=pr.gratis?`Começar ${pr.gratis} dias grátis`:`Quero o plano ${p.nome.toLowerCase()}`;
    // teste grátis: a Play pede a forma de pagamento no início e só cobra depois do teste
    b.querySelector("#vTrial").textContent=pr.gratis?`${pr.gratis} dias grátis, depois ${pr.txt} ${per}. A Google Play pede a forma de pagamento agora, mas só cobra no ${pr.gratis+1}º dia. Cancele antes e não paga nada.`:""};
  pinta();
  if(b.querySelector("#pCodOk"))b.querySelector("#pCodOk").onclick=()=>{if(Premium.codigoValido(b.querySelector("#pCod").value)){ativaPremium("codigo");if(origem==="pesquisa")abrePesquisa();else fecha("sheet")}else b.querySelector("#pStatus").textContent="Código inválido."};
  const play=await Premium.disponivel();
  if(play){const ds=await Premium.precos();ds.forEach(d=>{if(d.price&&precos[d.itemId]){const t=/^P(\d+)([DW])$/.exec(d.freeTrialPeriod||"");precos[d.itemId]={valor:Number(d.price.value),txt:Number(d.price.value).toLocaleString("pt-BR",{style:"currency",currency:d.price.currency}),gratis:t?(+t[1])*(t[2]==="W"?7:1):(d.freeTrialPeriod===undefined?precos[d.itemId].gratis:0)}}});pinta()}
  b.querySelector("#vCta").onclick=async()=>{const st=b.querySelector("#pStatus");
    if(!play){st.textContent="A assinatura é feita pelo app Minha Diária instalado da Google Play.";return}
    try{await Premium.comprar(sel);ativaPremium("play");if(origem==="pesquisa")abrePesquisa();else fecha("sheet")}
    catch(e){st.textContent=e&&e.message==="confirmacao"?"Não deu para confirmar a compra. Tente de novo em instantes.":"Compra não concluída."}}}
function ativaPremium(fonte){const era=pro();S.premium={ativo:true,fonte};
  if(!era&&+S.cfg.retirada>0&&!casaDe().length)S.desp.push({id:uid(),nome:"Para casa (valor geral)",valor:+S.cfg.retirada,freq:"mensal",tipo:"pessoal",desde:"",parcelas:0});
  salva();tudo();toast("Premium ativado! Suas contas completas estão na aba Contas.")}
// Premium liberado por código de teste só vale no computador de testes
if(S.premium.fonte==="codigo"&&!Premium.local){S.premium={ativo:false,fonte:""};salva()}
(async()=>{const r=await Premium.ativoNaPlay();if(r===true&&!pro())ativaPremium("play");
  else if(r===false&&S.premium.fonte==="play"){S.premium={ativo:false,fonte:""};salva();tudo()}})();

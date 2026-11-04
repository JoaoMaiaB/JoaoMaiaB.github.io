/* Minha Diária · Pesquisa de custos do carro (Premium): Tabela FIPE, IPVA e atalhos para o mapa. */
"use strict";

/* ---------- PESQUISA DE CUSTOS (Premium) ---------- */
async function getJSON(u){const r=await fetch(u);if(!r.ok)throw new Error(r.status);return r.json()}
function abrePesquisa(){const car=S.carro||{};
  const mapa=q=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const b=folha(`<div class="wz-top"><h2 class="wz-h" style="margin:0">Pesquisar custos do carro</h2><button type="button" class="ib" data-close aria-label="Fechar">✕</button></div>
    <section class="pq"><h3>Valor do seu carro (Tabela FIPE)</h3>
      <label>Marca<select id="fMarca"><option value="">Carregando…</option></select></label>
      <label>Modelo<select id="fModelo" disabled><option value="">Escolha a marca</option></select></label>
      <label>Ano<select id="fAno" disabled><option value="">Escolha o modelo</option></select></label>
      <div class="pq-res" id="fRes">${car.valor?`<span class="muted">${esc(car.modelo)} ${esc(car.ano)}</span><b class="num">${esc(car.valor)}</b>`:""}</div>
    </section>
    <section class="pq"><h3>IPVA estimado</h3>
      <p class="muted">A alíquota muda por estado (em geral de 1% a 4%). Confira a do seu estado no site da Secretaria da Fazenda.</p>
      <div class="r2 two"><div id="ipvaSt"></div><div class="pq-res" id="ipvaRes"></div></div>
      <button type="button" class="btn ghost" id="ipvaAdd" disabled>Adicionar IPVA às contas do carro</button>
    </section>
    <section class="pq"><h3>Preços perto de você</h3><p class="muted">Abre o mapa com avaliações e telefones para comparar.</p>
      <div class="chips">${[["Troca de óleo","troca de óleo"],["Pneus","loja de pneus"],["Alinhamento","alinhamento e balanceamento"],["Mecânico","oficina mecânica"],["Lava-jato","lava jato"],["Posto mais barato","posto de combustível"]]
        .map(([t,q])=>`<a class="chip" href="${mapa(q)}" target="_blank" rel="noopener">${t}</a>`).join("")}</div>
      <p class="muted">Preço médio do combustível na sua cidade: <a href="https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas" target="_blank" rel="noopener">pesquisa semanal da ANP</a>.</p>
    </section>`);
  let fipeNum=car.valorNum||0,aliq=car.aliq||4;
  const ipva=()=>{const v=fipeNum*aliq/100;b.querySelector("#ipvaRes").innerHTML=fipeNum?`<span class="muted">por ano</span><b class="num">${brl(v)}</b><span class="muted">${brl(v/12)} por mês</span>`:'<span class="muted">Escolha o carro acima.</span>';b.querySelector("#ipvaAdd").disabled=!fipeNum};
  b.querySelector("#ipvaSt").appendChild(stepper({rot:"Alíquota",valor:aliq,passo:.5,min:.5,max:6,fmt:v=>nf(v)+"%",on:v=>{aliq=v;S.carro={...(S.carro||{}),aliq:v};salva();ipva()}}));ipva();
  b.querySelector("#ipvaAdd").onclick=()=>{const v=Math.round(fipeNum*aliq)/100;const ex=S.desp.find(x=>x.tipo==="carro"&&/^IPVA/.test(x.nome));
    if(ex){ex.valor=v;ex.freq="meses";ex.cada=12}else S.desp.push({id:uid(),nome:"IPVA e licenciamento",valor:v,freq:"meses",cada:12,tipo:"carro",desde:"",parcelas:0});
    salva();renderContas();renderInicio();toast(`IPVA de ${brl(v)} por ano adicionado (${brl(v/12)} por mês).`)};
  const sM=b.querySelector("#fMarca"),sMo=b.querySelector("#fModelo"),sA=b.querySelector("#fAno"),res=b.querySelector("#fRes");
  const ops=(s,arr,txt)=>{s.innerHTML=`<option value="">${txt}</option>`+arr.map(x=>`<option value="${esc(x.codigo)}">${esc(x.nome)}</option>`).join("");s.disabled=false};
  const erro=()=>{res.innerHTML='<span class="neg">Não consegui consultar a Tabela FIPE. Confira a internet e tente de novo.</span>'};
  getJSON(FIPE+"/marcas").then(a=>ops(sM,a,"Escolha a marca")).catch(()=>{sM.innerHTML='<option value="">Sem conexão</option>';erro()});
  sM.onchange=()=>{sMo.disabled=sA.disabled=true;if(!sM.value)return;sMo.innerHTML="<option>Carregando…</option>";
    getJSON(`${FIPE}/marcas/${sM.value}/modelos`).then(a=>ops(sMo,a.modelos,"Escolha o modelo")).catch(erro)};
  sMo.onchange=()=>{sA.disabled=true;if(!sMo.value)return;sA.innerHTML="<option>Carregando…</option>";
    getJSON(`${FIPE}/marcas/${sM.value}/modelos/${sMo.value}/anos`).then(a=>ops(sA,a,"Escolha o ano")).catch(erro)};
  sA.onchange=()=>{if(!sA.value)return;res.innerHTML='<span class="muted">Consultando…</span>';
    getJSON(`${FIPE}/marcas/${sM.value}/modelos/${sMo.value}/anos/${sA.value}`).then(d=>{fipeNum=num(d.Valor)||0;
      S.carro={modelo:d.Modelo,ano:String(d.AnoModelo),valor:d.Valor,valorNum:fipeNum,ref:d.MesReferencia,aliq};salva();
      res.innerHTML=`<span class="muted">${esc(d.Modelo)} ${esc(d.AnoModelo)} · referência ${esc(d.MesReferencia||"")}</span><b class="num">${esc(d.Valor)}</b>`;ipva()}).catch(erro)}}

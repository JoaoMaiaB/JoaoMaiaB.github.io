/* Minha Diária · Modo desenvolvedor: libera tudo do Premium para o dono do app testar.
   Para entrar: Ajustes › toque 7 vezes no título "Sobre" e digite o código.
   O código não fica escrito aqui, só a "impressão digital" dele (SHA-256), então ler este arquivo não revela o código. */
"use strict";

const DEV_HASH="99c9884a66c8ba4fbd6f4244f8c18b5ee36b716d96607a42d3c2ac3bbf8f97dd";
const dev=()=>pro()&&S.premium.fonte==="dev";
async function sha256(t){const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));return[...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("")}
const RECURSOS_PRO=["Estacionamento e plano de celular nos custos do carro","Contas da casa, cartões, empréstimos e dívidas","Faturas por ciclo e outras entradas",
  "Pesquisa FIPE, IPVA e preços perto de você","Aviso de manutenção por km","Gráfico da evolução","Melhores dias e turnos",
  "Litros, consumo em km/l e postos mais baratos","Lembrete do DAS do MEI","Feriados da cidade e Possíveis Dinâmicos"];
function renderDev(){document.body.classList.toggle("dev",dev());const box=$("devAviso");
  if(!dev()){box.innerHTML="";return}
  box.innerHTML=`<div class="card dev-aviso"><b>Modo desenvolvedor: Premium liberado para teste</b>
    <p>Tudo o que tem o selo <span class="pro-mini">PRO</span> é do Premium. No app publicado, quem não assina vê esses recursos travados.</p>
    <details class="mais"><summary>Ver os recursos do Premium</summary><ul>${RECURSOS_PRO.map(r=>`<li>${r}</li>`).join("")}</ul></details>
    <button type="button" class="btn tiny ghost" id="devSair">Sair do modo desenvolvedor</button></div>`;
  $("devSair").onclick=()=>{if(!confirm("Sair do modo desenvolvedor? O app volta a ser o plano grátis."))return;S.premium={ativo:false,fonte:""};salva();tudo();toast("Modo desenvolvedor desligado.")}}
let toquesSobre=0,tSobre=null;
$("sobreH").addEventListener("click",()=>{toquesSobre++;clearTimeout(tSobre);tSobre=setTimeout(()=>toquesSobre=0,2500);if(toquesSobre<7)return;toquesSobre=0;
  const b=folha(`<div class="wz-top"><h2 class="wz-h" style="margin:0">Modo desenvolvedor</h2><button type="button" class="ib" data-close aria-label="Fechar">✕</button></div>
    <label>Código<input type="text" id="devCod" autocapitalize="characters" autocomplete="off"></label>
    <button type="button" class="btn big" id="devOk">Entrar</button><p class="status" id="devSt"></p>`);
  b.querySelector("#devOk").onclick=async()=>{const c=b.querySelector("#devCod").value.trim().toUpperCase();
    if(await sha256(c)!==DEV_HASH){b.querySelector("#devSt").textContent="Código inválido.";return}
    fecha("sheet");ativaPremium("dev");vai("inicio")}});

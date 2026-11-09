/* Minha Diária · Início do app: desenha todas as telas e abre a configuração na primeira vez.
   Precisa ser o último arquivo carregado. */
"use strict";

/* ---------- geral ---------- */
function tudo(){const{ini,fim}=limites(cid);$("cNome").textContent=nomeCiclo(cid);
  $("cDatas").textContent=`${pad(ini.getDate())}/${pad(ini.getMonth()+1)} a ${pad(fim.getDate())}/${pad(fim.getMonth()+1)}`;
  $("proTag").hidden=!pro();$("upInicio").hidden=pro();
  renderInicio();renderAvisos();renderConquistas();renderEvol();renderMelhores();renderDias();renderContas();renderAbast();renderRotina();renderEsp();renderAjustes();renderLembrete();renderDev()}
aplicaTema();tudo();mostra(location.hash.slice(1)||"inicio");
if(!S.configurado)abreWizard();
// toque na notificação do lembrete diário abre o teclado de lançamento
else if(new URLSearchParams(location.search).get("lancar")){history.replaceState(null,"",location.pathname+location.hash);abrePad(hoje)}
if("serviceWorker" in navigator&&location.protocol==="https:")window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));

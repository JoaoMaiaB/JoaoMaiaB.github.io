/* Premium: cobrança pela Google Play (Digital Goods API + Payment Request),
   que funciona quando o app roda pela Play Store (pacote TWA com "Google Play Billing" ligado).
   No navegador comum a compra não aparece e o app mostra onde comprar. */
window.Premium=(function(){
"use strict";
const CFG={
  // IDs dos produtos criados no Play Console (Monetização > Assinaturas)
  skus:["premium_mensal","premium_semestral","premium_anual"],
  // Endereço do seu servidor que confirma a compra na API do Google Play.
  // Sem ele, a Google reembolsa a assinatura em 3 dias. Veja o LEIAME.
  confirmaURL:"",
  // Código para testar o Premium antes da Play. Apague antes de publicar.
  codigoTeste:"METADODIA-TESTE"
};
const PLAY="https://play.google.com/billing";
let svc=null;
async function servico(){
  if(svc)return svc;
  if(!("getDigitalGoodsService" in window))return null;
  try{svc=await window.getDigitalGoodsService(PLAY);return svc}catch(e){return null}}
async function disponivel(){return !!(await servico())}
async function precos(){const s=await servico();if(!s)return[];
  try{return await s.getDetails(CFG.skus)}catch(e){return[]}}
async function ativoNaPlay(){const s=await servico();if(!s)return null;
  try{const ps=await s.listPurchases();return ps.some(p=>CFG.skus.includes(p.itemId))}catch(e){return null}}
async function comprar(sku){
  if(!(await servico()))throw new Error("indisponivel");
  const req=new PaymentRequest([{supportedMethods:PLAY,data:{sku}}],{total:{label:"Total",amount:{currency:"BRL",value:"0"}}});
  const resp=await req.show();
  const token=resp.details&&resp.details.purchaseToken;
  let ok=true;
  if(CFG.confirmaURL){
    try{const r=await fetch(CFG.confirmaURL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sku,token})});ok=r.ok}catch(e){ok=false}}
  await resp.complete(ok?"success":"fail");
  if(!ok)throw new Error("confirmacao");
  return true}
const codigoValido=c=>!!CFG.codigoTeste&&String(c||"").trim().toUpperCase()===CFG.codigoTeste;
return{disponivel,precos,ativoNaPlay,comprar,codigoValido,skus:CFG.skus};
})();

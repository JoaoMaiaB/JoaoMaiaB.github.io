/* Minha Diária · Avisos e lembretes: backup a cada 15 dias, manutenção por km (Premium),
   DAS do MEI (Premium) e a notificação diária pelo servidor. */
"use strict";

/* ---------- avisos no Início ---------- */
const diasEntre=(a,b)=>Math.round((fromKey(b)-fromKey(a))/864e5);
const somaDias=(k,n)=>{const d=fromKey(k);d.setDate(d.getDate()+n);return key(d)};

// 1. Backup: lembra a cada 15 dias, depois que a pessoa já tem lançamentos
function avisoBackup(){const ks=Object.keys(S.lanc).sort();if(!S.configurado||ks.length<3)return null;
  if(S.cfg.adiaBackup&&S.cfg.adiaBackup>hoje)return null;
  const desde=S.cfg.ultBackup||ks[0];const d=diasEntre(desde,hoje);if(d<15)return null;
  return{cls:"warn",titulo:S.cfg.ultBackup?`Seu último backup foi há ${d} dias`:"Você ainda não fez nenhum backup",
    texto:`Seus dados ficam só neste celular. Se ele quebrar ou for trocado, os ${ks.length} dias lançados se perdem. Leva 5 segundos.`,
    botoes:[["Salvar backup agora",()=>$("bkExport").click()],["Depois",()=>{S.cfg.adiaBackup=somaDias(hoje,3);salva();renderAvisos()}]]}}

// 5. Manutenção: itens "a cada X km" avisam quando faltam poucos km (Premium)
function avisosManut(){if(!pro())return[];const tk=totalKm();let mudou=false;const out=[];
  carroDe().filter(x=>x.freq==="km"&&ativo(x,cid)&&+x.cada>0).forEach(x=>{
    if(typeof x.baseKm!=="number"){x.baseKm=tk;mudou=true}
    const falta=Math.round(+x.cada-(tk-x.baseKm));const perto=Math.max(300,+x.cada*.1);
    if(falta<=perto)out.push({cls:falta<=0?"neg":"warn",titulo:falta>0?`${x.nome||"Manutenção"}: faltam ${nf(falta,0)} km`:`${x.nome||"Manutenção"}: passou ${nf(-falta,0)} km`,
      texto:`Você cadastrou a cada ${nf(+x.cada,0)} km. Fazer na hora certa evita gastar mais com o motor e os pneus.`,
      botoes:[["Já fiz",()=>{x.baseKm=totalKm();salva();renderAvisos();toast(`Pronto. O próximo aviso de ${(x.nome||"manutenção").toLowerCase()} vem daqui a ${nf(+x.cada,0)} km.`)}]]})});
  if(mudou)salva();return out}

// 12. DAS do MEI: vence todo dia 20 (Premium, se a conta "DAS do MEI" estiver cadastrada)
function avisoDAS(){if(!pro())return null;const das=casaDe().find(x=>/^DAS/i.test(x.nome||"")&&ativo(x,cid));if(!das)return null;
  const d=new Date(fromKey(hoje));const dia=d.getDate();const mes=hoje.slice(0,7);
  if((S.das||{})[mes]||dia<13||dia>20)return null;
  return{cls:dia>=18?"neg":"warn",titulo:dia===20?"O DAS do MEI vence hoje":`O DAS do MEI vence dia 20 (faltam ${20-dia} dias)`,
    texto:`Valor cadastrado: ${brl(das.valor)}. Pague pelo app MEI ou no Portal do Empreendedor para não perder os benefícios do INSS.`,
    botoes:[["Já paguei",()=>{(S.das=S.das||{})[mes]=true;salva();renderAvisos()}]]}}

function renderAvisos(){const box=$("avisos");box.innerHTML="";
  [avisoBackup(),...avisosManut(),avisoDAS()].filter(Boolean).forEach(a=>{
    const c=el("div",{class:"card aviso "+a.cls,role:"status"},`<b>${esc(a.titulo)}</b><p>${esc(a.texto)}</p>`);
    const r=el("div",{class:"row-btns"});a.botoes.forEach(([t,fn],i)=>r.appendChild(el("button",{type:"button",class:"btn tiny"+(i?" ghost":""),onclick:fn},esc(t))));
    c.appendChild(r);box.appendChild(c)})}

/* ---------- 2. lembrete diário (notificação pelo servidor) ---------- */
const b64uParaBytes=s=>{s=s.replace(/-/g,"+").replace(/_/g,"/");const b=atob(s+"===".slice((s.length+3)%4));return Uint8Array.from(b,c=>c.charCodeAt(0))};
const lembretePossivel=()=>!!Premium.servidor&&"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
function renderLembrete(){const card=$("cardLembrete");card.hidden=!lembretePossivel();if(card.hidden)return;
  const L=S.cfg.lembrete||{};$("lemAtivo").checked=!!L.ativo;$("lemHora").value=L.hora||"22:00";$("lemHora").disabled=!L.ativo}
async function ligaLembrete(hora){const st=$("lemStatus");st.textContent="Ligando…";
  try{if(await Notification.requestPermission()!=="granted")throw new Error("permissao");
    const reg=await navigator.serviceWorker.ready;
    const chave=await (await fetch(Premium.servidor+"/lembrete/chave")).text();
    let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uParaBytes(chave.trim())});
    const r=await fetch(Premium.servidor+"/lembrete",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id:(S.cfg.lembrete||{}).id||"",endpoint:sub.endpoint,hora,fuso:new Date().getTimezoneOffset()})});
    if(!r.ok)throw new Error("servidor");const{id}=await r.json();
    S.cfg.lembrete={ativo:true,hora,id};salva();st.textContent=`Pronto! Todo dia às ${hora} chega o lembrete.`}
  catch(e){S.cfg.lembrete={...(S.cfg.lembrete||{}),ativo:false};salva();
    st.textContent=e&&e.message==="permissao"?"Para receber o lembrete, permita as notificações do app nas configurações do celular.":"Não consegui ligar o lembrete agora. Confira a internet e tente de novo."}
  renderLembrete()}
async function desligaLembrete(){const L=S.cfg.lembrete||{};S.cfg.lembrete={hora:L.hora};salva();renderLembrete();$("lemStatus").textContent="Lembrete desligado.";
  try{if(L.id)await fetch(Premium.servidor+"/lembrete",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:L.id})});
    const sub=await (await navigator.serviceWorker.ready).pushManager.getSubscription();if(sub)await sub.unsubscribe()}catch(e){}}
$("lemAtivo").addEventListener("change",ev=>{if(ev.target.checked)ligaLembrete($("lemHora").value||"22:00");else desligaLembrete()});
$("lemHora").addEventListener("change",ev=>{if((S.cfg.lembrete||{}).ativo&&ev.target.value)ligaLembrete(ev.target.value)});

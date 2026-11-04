/* Minha Diária · Tela Ajustes: dia do ciclo, tema, Premium, backup e apagar dados. */
"use strict";

/* ---------- AJUSTES ---------- */
function renderAjustes(){const cd=$("chipsDia");cd.innerHTML="";const opc=[1,5,10,11,15,20,25];if(!opc.includes(S.cfg.diaCiclo))opc.push(S.cfg.diaCiclo);
  opc.sort((a,b)=>a-b).forEach(n=>cd.appendChild(el("button",{type:"button",class:"chip"+(n===S.cfg.diaCiclo?" on":""),onclick:()=>mudaDia(n)},"Dia "+n)));
  const st=stepper({rot:"",valor:S.cfg.diaCiclo,passo:1,min:1,max:28,fmt:v=>"Outro: dia "+v,on:v=>mudaDia(v,true)});st.classList.add("inline");cd.appendChild(st);
  const{ini,fim}=limites(cid);$("cfgDiaDica").textContent=`O ciclo de ${nomeCiclo(cid)} vai de ${ini.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}.`;
  $("cfgInicio").value=S.cfg.inicio||"";
  document.querySelectorAll("#tema button").forEach(b=>b.setAttribute("aria-checked",String(b.dataset.t===(S.cfg.tema||"auto"))));
  const cp=$("cardPremium");
  cp.innerHTML=pro()?`<h2>Premium ativo</h2><p class="muted">${S.premium.fonte==="play"?"Assinatura pela Google Play. Para cancelar, abra a Play Store › Pagamentos e assinaturas.":"Liberado neste aparelho."}</p>`
    :`<h2>Minha Diária Premium</h2><p class="muted">Finanças completas (cartões, empréstimos, aluguel, dívidas) e pesquisa de custos do carro.</p><button type="button" class="btn" data-premium>Conhecer o Premium</button>`}
let tDia=null;
function mudaDia(n,devagar){S.cfg.diaCiclo=n;salva();clearTimeout(tDia);const ap=()=>{cid=cidDe(hoje);tudo()};if(devagar)tDia=setTimeout(ap,600);else ap()}
$("cfgInicio").addEventListener("change",ev=>{S.cfg.inicio=ev.target.value;salva();tudo()});
document.querySelectorAll("#tema button").forEach(b=>b.onclick=()=>{S.cfg.tema=b.dataset.t;salva();aplicaTema();renderAjustes()});
function aplicaTema(){const t=S.cfg.tema;if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);else document.documentElement.removeAttribute("data-theme");
  const esc_=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.querySelector('meta[name="theme-color"]').setAttribute("content",esc_?"#19201d":"#0f7a5a")}
$("bkExport").onclick=async()=>{const nome=`minha-diaria-backup-${hoje}.json`;const blob=new Blob([JSON.stringify(S,null,1)],{type:"application/json"});
  try{const f=new File([blob],nome,{type:"application/json"});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:"Backup Minha Diária"});$("bkStatus").textContent="Backup compartilhado.";return}}
  catch(e){if(e&&e.name==="AbortError")return}
  const a=el("a",{href:URL.createObjectURL(blob),download:nome});document.body.appendChild(a);a.click();a.remove();$("bkStatus").textContent=`Backup salvo como ${nome} na pasta Downloads.`};
async function importa(f,statusEl){try{const d=JSON.parse(await f.text());
    if(d&&d.app==="meta-do-dia"){if(S.configurado&&!confirm("Substituir todos os dados deste aparelho pelos do backup?"))return false;
      const premAtual=S.premium;S=normaliza(d);if(premAtual.ativo&&premAtual.fonte==="play")S.premium=premAtual;S.configurado=true;salva();cid=cidDe(hoje);aplicaTema();tudo();statusEl.textContent="Backup importado.";return true}
    const ks=d&&typeof d==="object"?Object.keys(d).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&typeof d[k]==="number"):[];
    if(ks.length){ks.forEach(k=>S.lanc[k]={...(S.lanc[k]||{}),v:d[k]});salva();tudo();statusEl.textContent=`${ks.length} lançamentos importados.`;return true}
    statusEl.textContent="Esse arquivo não é um backup do Minha Diária."}catch(e){statusEl.textContent="Não consegui ler esse arquivo."}return false}
$("bkImport").addEventListener("change",async ev=>{const f=ev.target.files[0];ev.target.value="";if(f)importa(f,$("bkStatus"))});
$("refazer").onclick=()=>abreWizard();
$("apagar").onclick=()=>{if(!confirm("Apagar contas, rotina e lançamentos deste aparelho? Isso não pode ser desfeito."))return;
  const prem=S.premium;try{localStorage.removeItem(LS)}catch(e){}S=vazio();if(prem.fonte==="play")S.premium=prem;cid=cidDe(hoje);aplicaTema();tudo();vai("inicio");abreWizard()};

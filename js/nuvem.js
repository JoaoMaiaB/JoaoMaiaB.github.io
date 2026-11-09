/* Minha Diária · Conta e nuvem: cadastro com e-mail e senha, entrar em qualquer celular,
   esqueci a senha, sincronização automática dos dados e apagar a conta.

   Usa o Firebase pelos endereços oficiais (REST), sem biblioteca extra:
   - Firebase Authentication: cria a conta e confere a senha (a senha nunca fica no app nem no servidor do app);
   - Cloud Firestore: guarda os dados da pessoa em usuarios/<id da conta>, e as regras (NUVEM.md)
     só deixam cada conta ler e gravar o próprio documento.

   Os dados continuam também no celular (funciona sem internet). Quando há internet,
   cada mudança sobe para a nuvem em poucos segundos, e ao abrir o app ele baixa o que mudou em outro celular. */
"use strict";

const CONTA_LS="minhaDiaria.conta";
const AUTH="https://identitytoolkit.googleapis.com/v1/accounts:";
const TOKEN="https://securetoken.googleapis.com/v1/token?key=";
const nuvemLigada=()=>!!(NUVEM_CFG.apiKey&&NUVEM_CFG.projeto);
let conta=null;try{conta=JSON.parse(localStorage.getItem(CONTA_LS)||"null")}catch(e){}
const logado=()=>!!(conta&&conta.uid);
function guardaConta(){try{if(conta)localStorage.setItem(CONTA_LS,JSON.stringify(conta));else localStorage.removeItem(CONTA_LS)}catch(e){}}
const docURL=()=>`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(NUVEM_CFG.projeto)}/databases/(default)/documents/usuarios/${encodeURIComponent(conta.uid)}`;

/* ---------- login (Firebase Authentication) ---------- */
const ERROS={EMAIL_EXISTS:"Esse e-mail já tem conta. Toque em \"Entrar\".",EMAIL_NOT_FOUND:"Não achei conta com esse e-mail.",
  INVALID_PASSWORD:"Senha errada.",INVALID_LOGIN_CREDENTIALS:"E-mail ou senha errados.",INVALID_EMAIL:"Confira o e-mail.",
  WEAK_PASSWORD:"A senha precisa ter pelo menos 6 caracteres.",MISSING_PASSWORD:"Digite a senha.",USER_DISABLED:"Essa conta foi desativada.",
  TOO_MANY_ATTEMPTS_TRY_LATER:"Muitas tentativas. Espere alguns minutos e tente de novo.",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"Por segurança, digite a senha de novo."};
async function chamaAuth(acao,corpo){
  let r;try{r=await fetch(AUTH+acao+"?key="+encodeURIComponent(NUVEM_CFG.apiKey),{method:"POST",headers:{"Content-Type":"application/json","X-Firebase-Locale":"pt-BR"},body:JSON.stringify(corpo)})}
  catch(e){throw new Error("Sem internet. Tente de novo quando tiver sinal.")}
  const d=await r.json().catch(()=>({}));
  if(!r.ok){const c=((d.error&&d.error.message)||"").split(" ")[0].split(":")[0];throw new Error(ERROS[c]||"Não deu certo agora. Tente de novo.")}
  return d}
function guardaLogin(d){conta={...(conta||{}),uid:d.localId,email:d.email,idToken:d.idToken,refresh:d.refreshToken,expira:Date.now()+(+d.expiresIn||3600)*1000-60000};guardaConta()}
async function tokenValido(){if(!logado())throw new Error("sem conta");if(Date.now()<conta.expira)return conta.idToken;
  let r;try{r=await fetch(TOKEN+encodeURIComponent(NUVEM_CFG.apiKey),{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=refresh_token&refresh_token="+encodeURIComponent(conta.refresh)})}
  catch(e){throw new Error("offline")}
  if(!r.ok){if(r.status===400){toast("Sua sessão expirou. Entre na conta de novo em Ajustes.");saiDaConta(true)}throw new Error("sessao")}
  const d=await r.json();conta.idToken=d.id_token;conta.refresh=d.refresh_token;conta.expira=Date.now()+(+d.expires_in||3600)*1000-60000;guardaConta();return conta.idToken}

/* ---------- dados (Cloud Firestore) ---------- */
async function baixa(){const t=await tokenValido();let r;
  try{r=await fetch(docURL(),{headers:{Authorization:"Bearer "+t}})}catch(e){throw new Error("offline")}
  if(r.status===404)return null;if(!r.ok)throw new Error("nuvem "+r.status);
  const d=await r.json();const f=d.fields||{};
  return{dados:JSON.parse(f.dados.stringValue),atualizado:+((f.atualizado||{}).integerValue||0)}}
async function sobe(){const t=await tokenValido();const quando=Math.max(Date.now(),(conta.versao||0)+1);// sempre maior que a versão anterior
  const corpo={fields:{dados:{stringValue:JSON.stringify(S)},atualizado:{integerValue:String(quando)},app:{stringValue:"minha-diaria"}}};
  let r;try{r=await fetch(docURL(),{method:"PATCH",headers:{Authorization:"Bearer "+t,"Content-Type":"application/json"},body:JSON.stringify(corpo)})}catch(e){throw new Error("offline")}
  if(!r.ok)throw new Error("nuvem "+r.status);
  conta.versao=quando;conta.pendente=false;conta.sinc=quando;guardaConta();renderConta()}
// troca os dados deste celular pelos da nuvem, mantendo a assinatura da Play deste aparelho
function usaDaNuvem(n){const prem=S.premium;S=normaliza(n.dados);if(prem.ativo&&prem.fonte==="play")S.premium=prem;S.configurado=true;
  conta.versao=n.atualizado;conta.pendente=false;conta.sinc=Date.now();guardaConta();
  try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}cid=cidDe(hoje);aplicaTema();tudo()}

/* ---------- sincronização ---------- */
let tSobe=null,subindo=false;
// chamado por salva(): marca que há mudança e sobe em 2 segundos (junta vários toques numa subida só)
function nuvemMudou(){if(!logado()||!nuvemLigada())return;conta.pendente=true;conta.editado=Date.now();guardaConta();clearTimeout(tSobe);tSobe=setTimeout(sincroniza,2000)}
async function sincroniza(){if(!logado()||!nuvemLigada()||subindo)return;subindo=true;
  try{const n=await baixa();
    if(n&&n.atualizado>(conta.versao||0)&&!(conta.pendente&&(conta.editado||0)>n.atualizado)){usaDaNuvem(n);toast("Dados atualizados com o que você lançou em outro celular.")}
    else if(conta.pendente||!n)await sobe();
    else{conta.sinc=Date.now();guardaConta();renderConta()}}
  catch(e){/* sem internet: tenta de novo quando voltar */}
  finally{subindo=false}}
window.addEventListener("online",()=>sincroniza());
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")sincroniza()});

/* ---------- telas ---------- */
function abreConta(modo){modo=modo||"entrar";
  const b=folha(`<div class="wz-top"><h2 class="wz-h" style="margin:0">${modo==="criar"?"Criar conta":"Entrar na conta"}</h2><button type="button" class="ib" data-close aria-label="Fechar">✕</button></div>
    <p class="muted">${modo==="criar"?"Com a conta, seus dados ficam guardados na nuvem e você entra em qualquer celular com o mesmo e-mail e senha.":"Use o e-mail e a senha que você cadastrou. Seus dados aparecem neste celular."}</p>
    <label>E-mail<input type="email" id="cEmail" autocomplete="email" inputmode="email" autocapitalize="off"></label>
    <label>Senha<input type="password" id="cSenha" autocomplete="${modo==="criar"?"new-password":"current-password"}" minlength="6"></label>
    ${modo==="criar"?'<p class="muted">Pelo menos 6 caracteres.</p>':'<button type="button" class="lnk" id="cEsqueci">Esqueci a senha</button>'}
    <button type="button" class="btn big" id="cOk">${modo==="criar"?"Criar conta":"Entrar"}</button>
    <p class="status" id="cSt" role="status"></p>
    <button type="button" class="btn ghost" id="cTroca">${modo==="criar"?"Já tenho conta: entrar":"Não tenho conta: criar agora"}</button>`,!S.configurado);
  const q=s=>b.querySelector(s),st=q("#cSt");
  // na primeira vez (configuração inicial), o ✕ volta para a configuração em vez de fechar
  if(!S.configurado){const x=q(".wz-top [data-close]");x.removeAttribute("data-close");x.onclick=()=>abreWizard()}
  q("#cTroca").onclick=()=>abreConta(modo==="criar"?"entrar":"criar");
  if(q("#cEsqueci"))q("#cEsqueci").onclick=async()=>{const email=q("#cEmail").value.trim();if(!email){st.textContent="Digite o seu e-mail acima e toque de novo.";return}
    try{await chamaAuth("sendOobCode",{requestType:"PASSWORD_RESET",email});st.textContent=`Enviamos um link para ${email}. Abra o e-mail, crie uma senha nova e volte aqui para entrar.`}catch(e){st.textContent=e.message}};
  q("#cOk").onclick=async()=>{const email=q("#cEmail").value.trim(),senha=q("#cSenha").value;if(!email||!senha){st.textContent="Preencha o e-mail e a senha.";return}
    q("#cOk").disabled=true;st.textContent=modo==="criar"?"Criando sua conta…":"Entrando…";
    try{guardaLogin(await chamaAuth(modo==="criar"?"signUp":"signInWithPassword",{email,password:senha,returnSecureToken:true}));
      conta.versao=0;conta.pendente=false;guardaConta();
      const n=modo==="criar"?null:await baixa();
      const temLocal=S.configurado&&Object.keys(S.lanc).length>0;
      if(n&&temLocal)return escolheDados(n);
      if(n){usaDaNuvem(n);fecha("sheet");toast("Pronto! Seus dados estão neste celular.");return}
      if(S.configurado){await sobe();fecha("sheet");toast(modo==="criar"?"Conta criada. Seus dados já estão guardados na nuvem.":"Pronto! Seus dados deste celular foram para a sua conta.");return}
      fecha("sheet");toast("Conta criada! Agora configure o app.");abreWizard()}
    catch(e){st.textContent=e.message==="offline"?"Sem internet. Tente de novo quando tiver sinal.":e.message;q("#cOk").disabled=false}}}
// a conta já tem dados e este celular também: a pessoa escolhe
function escolheDados(n){const nN=Object.keys(n.dados.lanc||{}).length,nL=Object.keys(S.lanc).length;
  const b=folha(`<h2 class="wz-h">Qual versão dos dados usar?</h2>
    <p class="muted">Sua conta já tem dados salvos e este celular também tem. Escolha qual fica. A outra é substituída.</p>
    <button type="button" class="btn big" id="eNuvem">Usar os da conta (${nN} dias lançados)</button>
    <button type="button" class="btn ghost" id="eLocal">Usar os deste celular (${nL} dias lançados)</button>
    <p class="muted">Na dúvida, salve um backup em Ajustes antes de escolher.</p>`,true);
  b.querySelector("#eNuvem").onclick=()=>{usaDaNuvem(n);fecha("sheet");toast("Pronto! Você está usando os dados da conta.")};
  b.querySelector("#eLocal").onclick=async()=>{try{await sobe();fecha("sheet");toast("Pronto! Os dados deste celular foram para a sua conta.")}catch(e){toast("Sem internet agora. Os dados sobem quando tiver sinal.");conta.pendente=true;conta.editado=Date.now();guardaConta();fecha("sheet")}}}
// sair: os dados ficam guardados na conta; este celular volta a ficar vazio (bom para celular emprestado)
async function saiDaConta(semPerguntar){
  if(!semPerguntar){if(!confirm("Sair da conta? Seus dados continuam guardados na nuvem e somem deste celular até você entrar de novo."))return;
    if(conta&&conta.pendente){try{await sobe()}catch(e){if(!confirm("Sem internet: as últimas mudanças ainda não foram para a nuvem e vão se perder. Sair mesmo assim?"))return}}}
  conta=null;guardaConta();if(semPerguntar){renderConta();return}
  const prem=S.premium;try{localStorage.removeItem(LS)}catch(e){}S=vazio();if(prem.fonte==="play")S.premium=prem;cid=cidDe(hoje);aplicaTema();tudo();vai("inicio");abreWizard()}
// apagar a conta (exigência da Google Play): apaga os dados da nuvem e o login
function apagaConta(){const b=folha(`<div class="wz-top"><h2 class="wz-h" style="margin:0">Apagar a conta</h2><button type="button" class="ib" data-close aria-label="Fechar">✕</button></div>
    <p>Isso apaga para sempre a sua conta e todos os dados guardados na nuvem. Os dados deste celular continuam aqui até você apagar em "Apagar todos os dados".</p>
    <p class="muted">A assinatura Premium é cancelada à parte, na Play Store › Pagamentos e assinaturas.</p>
    <label>Digite sua senha para confirmar<input type="password" id="aSenha" autocomplete="current-password"></label>
    <button type="button" class="btn big danger" id="aOk">Apagar minha conta</button><p class="status" id="aSt" role="status"></p>`);
  b.querySelector("#aOk").onclick=async()=>{const st=b.querySelector("#aSt");st.textContent="Apagando…";
    try{guardaLogin(await chamaAuth("signInWithPassword",{email:conta.email,password:b.querySelector("#aSenha").value,returnSecureToken:true}));
      const r=await fetch(docURL(),{method:"DELETE",headers:{Authorization:"Bearer "+conta.idToken}});if(!r.ok&&r.status!==404)throw new Error("Não deu para apagar os dados agora. Tente de novo.");
      await chamaAuth("delete",{idToken:conta.idToken});conta=null;guardaConta();fecha("sheet");renderConta();toast("Sua conta e os dados da nuvem foram apagados.")}
    catch(e){st.textContent=e.message}}}
function renderConta(){const card=$("cardConta");if(!card)return;card.hidden=!nuvemLigada();if(card.hidden)return;
  const box=$("contaBox");
  if(!logado()){box.innerHTML=`<p class="muted">Crie uma conta para guardar seus dados na nuvem e entrar em qualquer celular. É grátis.</p>
    <div class="row-btns"><button type="button" class="btn" id="ctCriar">Criar conta</button><button type="button" class="btn ghost" id="ctEntrar">Entrar</button></div>`;
    $("ctCriar").onclick=()=>abreConta("criar");$("ctEntrar").onclick=()=>abreConta("entrar");return}
  const quando=conta.sinc?new Date(conta.sinc).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"";
  box.innerHTML=`<p><b>${esc(conta.email)}</b></p><p class="muted">${conta.pendente?"Mudanças esperando internet para subir à nuvem.":quando?`Dados guardados na nuvem. Última sincronização: ${quando}.`:"Sincronizando…"}</p>
    <div class="row-btns"><button type="button" class="btn ghost" id="ctSair">Sair da conta</button><button type="button" class="btn ghost danger-t" id="ctApagar">Apagar conta</button></div>`;
  $("ctSair").onclick=()=>saiDaConta();$("ctApagar").onclick=apagaConta}

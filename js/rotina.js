/* Minha Diária · Tela Rotina: horas e ganho por hora de cada dia da semana e datas especiais. */
"use strict";

/* ---------- ROTINA ---------- */
function renderRotina(){const b=$("rotina");b.innerHTML="";
  ORDEM_SEMANA.forEach(d=>{const r=S.rot[d];const on=rotOn(r);const row=el("div",{class:"rd"+(on?"":" off")});
    const tg=el("button",{type:"button",class:"daytg","aria-pressed":String(on)},`<b>${DIAS_LONGOS[d]}</b><small>${on?brl0(r.h*r.vh):"folga"}</small>`);
    tg.onclick=()=>{if(on){r.off=true}else{r.off=false;if(!(+r.h>0))r.h=6;if(!(+r.vh>0))r.vh=S.cfg.vhPadrao||35}salva();renderRotina();renderInicio();renderDias()};
    row.appendChild(tg);
    if(on){const upd=()=>{tg.querySelector("small").textContent=brl0(r.h*r.vh);salva();somaRotina();renderInicio();renderDias()};
      row.append(stepper({rot:"Horas",valor:r.h,passo:.5,min:.5,max:24,fmt:v=>nf(v)+" h",on:v=>{r.h=v;r.hr="";upd()}}),
        stepper({rot:"R$ por hora",valor:r.vh,passo:5,min:5,max:200,fmt:v=>"R$ "+nf(v,0),on:v=>{r.vh=v;S.cfg.vhPadrao=v;upd()}}))}
    b.appendChild(row)});somaRotina()}
function somaRotina(){let h=0,v=0;Object.values(S.rot).forEach(r=>{if(rotOn(r)){h+=+r.h;v+=r.h*r.vh}});
  $("rotSoma").innerHTML=`Por semana: <strong class="num">${nf(h)} h</strong> e <strong class="num">${brl(v)}</strong> brutos`+(h?`, média de ${brl(v/h)} por hora.`:".")}
function renderEsp(){const b=$("listaEsp");b.innerHTML="";const ord=[...S.esp].sort((a,c)=>(a.data||"9").localeCompare(c.data||"9"));
  if(!ord.length)b.appendChild(el("p",{class:"empty"},"Nenhuma data especial."));
  ord.forEach(x=>{const it=el("details",{class:"item","data-id":x.id});if(abrirId===x.id)it.open=true;const sm=el("summary");
    const pinta=()=>sm.innerHTML=`<span class="nm">${x.data?ddmm(x.data)+" · ":""}${esc(x.nome||"Sem nome")}</span><span class="num">${brl0((+x.h||0)*(+x.vh||0))}</span>`;
    const mud=()=>{pinta();salva();renderInicio();renderDias()};
    const r1=el("div",{class:"r1"});r1.append(campoTxt("Evento",x.nome,v=>{x.nome=v;mud()},"text",{placeholder:"Ex.: Show no estádio","data-nome":""}),
      campoTxt("Data",x.data,v=>{x.data=v;mud()},"date"),botaoDel(()=>{S.esp.splice(S.esp.indexOf(x),1);salva();renderEsp();renderInicio();renderDias()}));
    const r2=el("div",{class:"r2 two"});r2.append(stepper({rot:"Horas",valor:x.h||0,passo:.5,min:0,max:24,fmt:v=>nf(v)+" h",on:v=>{x.h=v;mud()}}),
      stepper({rot:"R$ por hora",valor:x.vh||0,passo:5,min:0,max:300,fmt:v=>"R$ "+nf(v,0),on:v=>{x.vh=v;mud()}}));
    it.append(sm,r1,r2);pinta();b.appendChild(it)});abrirId=null}
$("addEsp").onclick=()=>{const x={id:uid(),nome:"",data:"",h:6,vh:Math.max(40,S.cfg.vhPadrao||40)};S.esp.push(x);abrirId=x.id;salva();renderEsp();focaItem(x.id)};

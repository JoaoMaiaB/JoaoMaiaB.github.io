/* Minha Diária · Tela Dias: lista dos dias do ciclo com meta, valor feito e saldo acumulado. */
"use strict";

/* ---------- DIAS ---------- */
function renderDias(){const box=$("rows");box.innerHTML="";let fs=0;
  diasDo(cid).forEach(x=>{const L=S.lanc[x.k];const t=tem(x.k);
    let ac="";if(t&&!x.antes){const d=L.v-x.meta;fs+=d;ac=`<span class="${d>0?"pos":d<0?"neg":""}">${sinal(d)}</span> · acum. <span class="${fs>0?"pos":fs<0?"neg":""}">${sinal(fs)}</span>`+(L.v>0?` · lucro ${brl(lucroDia(L))}${L.km>0?"":"*"}`:"")}
    const pendente=!t&&x.meta>0&&x.k<hoje;
    const b=el("button",{type:"button",class:"day"+(!x.meta&&!t?" off":"")+(x.k===hoje?" today":"")+(pendente?" pend":"")});
    b.innerHTML=`<span class="d"><b>${ddmm(x.k)}</b><small>${DIAS[x.d.getDay()]}</small></span>
      <span class="p"><span class="pl">${x.esp?'<span class="chip-s">especial</span>':""}${esc(x.plano)}</span><span class="mt">${x.meta?"Meta "+brl(x.meta):"Sem meta"}</span>${ac?`<span class="ac num">${ac}</span>`:""}</span>
      <span class="v num">${t?brl(L.v):pendente?"Lançar":x.k<=hoje||x.meta?"–":""}</span>`;
    if(x.antes)b.disabled=true;else b.onclick=()=>abrePad(x.k);box.appendChild(b)})}

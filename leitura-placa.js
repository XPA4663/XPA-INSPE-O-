/* ======================= LEITURA DA PLACA DE IDENTIFICAÇÃO =======================
   Na ficha do equipamento: o técnico fotografa a placa, o site (api.php?acao=ler_placa, Locaweb)
   envia a foto para a IA (API do Claude) e devolve os dados; o técnico confere e aplica.
   - Usa a mesma chave e endereço configurados para a Área do Cliente (area-cliente.js).
   - A foto da placa fica salva em "Outras fotos" do equipamento, mesmo sem internet.
   Depende de: $, esc, toast, compress, uid, writeDoc, photoCache, saveCur, openPicker, CUR (index.html). */
(function(){
const BASE=[['fab','Fabricante'],['modelo','Modelo / tipo'],['serie','Nº de série'],['ano','Ano de fabricação']];
const modal=(html)=>{ $('#mbox').innerHTML=html; $('#modal').classList.add('show'); };
const fechar=()=>$('#modal').classList.remove('show');
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();

(function(){ if(document.getElementById('lp-css')) return; const st=document.createElement('style'); st.id='lp-css'; st.textContent=`
.lpbar{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px}
.lpbar .lbtn{background:#FFF7DB;border-color:#E9B200;color:#0A1733;font-weight:bold}
.lprow{display:grid;grid-template-columns:26px 1fr;gap:6px;align-items:start;padding:7px 0;border-bottom:1px solid #E6E9EF}
.lprow input[type=checkbox]{-webkit-appearance:checkbox;appearance:auto;width:20px;height:20px;margin:4px 0 0;accent-color:#2E7D32}
.lprow .lb{font-size:12px;color:#6B7385}.lprow .at{font-size:11.5px;color:#8A93A6;margin-top:2px}
.lprow input[type=text]{width:100%;margin-top:3px}
.lpfill{background:#FFF7DB!important;transition:background 2s}`; document.head.appendChild(st); })();

/* campos que a IA deve procurar: identificação padrão + campos do tipo de equipamento */
function camposDe(T){
  return BASE.map(([k,r])=>({k,rotulo:r})).concat((T.campos||[]).map(c=>Array.isArray(c[2])&&c[2].length?{k:c[0],rotulo:c[1],opcoes:c[2].map(o=>Array.isArray(o)?o[1]:o), vals:c[2].map(o=>Array.isArray(o)?o[0]:o)}:{k:c[0],rotulo:c[1]}));
}
/* valor "vazio" = em branco ou ainda com o padrão do formulário */
function padrao(T,k){ const c=(T.campos||[]).find(x=>x[0]===k); return c?(c[3]||(Array.isArray(c[2])?(Array.isArray(c[2][0])?c[2][0][0]:c[2][0]):'')):''; }
function opcaoValida(c,v){ if(!c.opcoes) return v; const n=norm(v); const o=c.opcoes.find(x=>norm(x)===n)||c.opcoes.find(x=>norm(x).startsWith(n)||n.startsWith(norm(x))); return o||null; }

window.lerPlacaBtns=function(){
  return `<div class="lpbar"><button type="button" class="lbtn" id="lpCam">📷 Ler placa (câmera)</button><input type="file" accept="image/*" capture="environment" id="lpInCam" class="hid">
  <button type="button" class="lbtn" id="lpGal">🖼️ Ler placa (galeria)</button><input type="file" accept="image/*" id="lpInGal" class="hid"></div>`;
};

window.lerPlacaBind=function(e,T,depoisFoto){
  const cam=$('#lpCam'), gal=$('#lpGal'); if(!cam) return;
  cam.onclick=()=>openPicker($('#lpInCam')); gal.onclick=()=>openPicker($('#lpInGal'));
  const onFile=async(inp)=>{ const f=inp.files&&inp.files[0]; inp.value=''; if(!f) return;
    let ph; try{ ph=await compress(f); }catch(err){ toast('Não foi possível abrir a foto.'); return; }
    /* guarda a foto da placa no equipamento */
    try{ const id=uid('ph'); const body={kind:'photo', id, insp:CUR.id, equip:e.id, item:'photos', data:ph.data, w:ph.w, h:ph.h, at:Date.now()};
      photoCache[id]=body; await writeDoc(id, body); (e.photos=e.photos||[]).push(id); saveCur(); depoisFoto&&depoisFoto(); }catch(err){}
    ler(e,T,ph.data);
  };
  $('#lpInCam').onchange=()=>onFile($('#lpInCam')); $('#lpInGal').onchange=()=>onFile($('#lpInGal'));
};

async function ler(e,T,dataUrl){
  const AC=window.XPA_AREA_CLIENTE;
  if(!AC||!AC.temChave()){ toast('Configure a chave do app (a mesma da Área do Cliente).'); AC&&AC.configurar(()=>ler(e,T,dataUrl)); return; }
  if(!navigator.onLine){ toast('Sem internet: a foto da placa foi salva. Leia a placa quando tiver sinal.'); return; }
  const campos=camposDe(T);
  modal(`<p style="margin-top:0;font-weight:bold;color:var(--navy)">Lendo a placa…</p><p class="note">A foto foi enviada para leitura. Isso leva alguns segundos.</p>`);
  let j;
  try{
    const blob=await (await fetch(dataUrl)).blob();
    const fd=new FormData(); fd.append('imagem',blob,'placa.jpg'); fd.append('tipo',T.nome); fd.append('campos',JSON.stringify(campos));
    j=await AC.api('ler_placa',{body:fd});
  }catch(err){
    modal(`<p style="margin-top:0;font-weight:bold;color:var(--navy)">Não foi possível ler a placa</p><p class="note">${esc(err.message||'Erro de conexão.')}</p><p class="note">A foto ficou salva em "Outras fotos". Preencha à mão ou tente outra foto, de frente e sem reflexo.</p>
      <div class="row" style="justify-content:flex-end"><button class="btn" id="lpOk">Fechar</button></div>`); $('#lpOk').onclick=fechar; return;
  }
  revisar(e,T,campos,j);
}

function revisar(e,T,campos,j){
  const d=e.d, v=j.valores||{};
  const linhas=campos.filter(c=>v[c.k]!==undefined).map(c=>{ const lido=String(v[c.k]); const val=opcaoValida(c,lido);
    const atual=String(d[c.k]??''); const vazio=!atual.trim()||atual===padrao(T,c.k);
    return {c, lido, val, atual, marcar: val!==null && vazio}; });
  if(!linhas.length){
    modal(`<p style="margin-top:0;font-weight:bold;color:var(--navy)">Nenhum dado encontrado</p><p class="note">${esc(j.legivel===false?'A foto não mostra uma placa legível.':'A placa não trouxe dados dos campos deste equipamento.')}${j.obs?' '+esc(j.obs):''}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn" id="lpOk">Fechar</button></div>`); $('#lpOk').onclick=fechar; return;
  }
  modal(`<p style="margin-top:0;font-weight:bold;color:var(--navy)">Dados lidos da placa (${linhas.length})</p>
    <p class="note" style="margin-top:0">Confira cada valor com a placa. Marcados vão para a ficha; campos já preenchidos vêm desmarcados.${j.obs?'<br><b>Obs.:</b> '+esc(j.obs):''}</p>
    <div style="max-height:56vh;overflow:auto">${linhas.map((l,i)=>`<div class="lprow"><input type="checkbox" id="lpc${i}" ${l.marcar?'checked':''} ${l.val===null?'disabled':''}>
      <div><div class="lb">${esc(l.c.rotulo)}</div>${l.c.opcoes
        ?(l.val===null?`<div class="note">Lido: “${esc(l.lido)}” – não corresponde às opções; escolha à mão.</div>`:`<div><b>${esc(l.val)}</b></div>`)
        :`<input type="text" id="lpv${i}" value="${esc(l.lido)}">`}
      ${l.atual.trim()&&l.atual!==padrao(T,l.c.k)?`<div class="at">Atual na ficha: ${esc(l.atual)}</div>`:''}</div></div>`).join('')}</div>
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button id="lpNo">Cancelar</button><button class="btn gold" id="lpAp">Aplicar marcados</button></div>`);
  $('#lpNo').onclick=fechar;
  $('#lpAp').onclick=()=>{ let n=0;
    linhas.forEach((l,i)=>{ const ck=$('#lpc'+i); if(!ck||!ck.checked||l.val===null) return;
      const novo=l.c.opcoes?l.c.vals[l.c.opcoes.indexOf(l.val)]:($('#lpv'+i).value.trim()); if(!novo) return;
      d[l.c.k]=novo; n++;
      const el=document.querySelector(`#ef [data-k="${l.c.k}"]`);
      if(el){ if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===novo)) el.add(new Option(novo,novo)); el.value=novo; el.classList.add('lpfill'); el.dispatchEvent(new Event('change')); setTimeout(()=>el.classList.remove('lpfill'),2500); } });
    saveCur(); fechar(); toast(n?`${n} campo(s) preenchido(s) pela placa.`:'Nada aplicado.');
  };
}
})();

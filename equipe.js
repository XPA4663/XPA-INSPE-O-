/* ======================= OS COMPARTILHADA (trabalho em equipe) =======================
   Uma manutenção pode ser compartilhada com outros técnicos (por e-mail da conta XPA).
   Firestore:
     os/{osId}                 cabeçalho: dados do trabalho (h), membros, nomes, dono, status
     os/{osId}/equip/{eqId}    um documento por equipamento (data = objeto do equipamento)
     os/{osId}/fotos/{fotoId}  fotos e anexos da OS
   Cada técnico grava só os campos que alterou (updateMask), então vários técnicos podem
   registrar ensaios ao mesmo tempo, inclusive no mesmo equipamento. Funciona sem internet:
   as alterações ficam na fila do aparelho e são enviadas quando a conexão voltar.
   Ao final, o responsável finaliza a OS e gera um relatório único com todos os registros. */
(function(){
const SH={};            // osId -> {hdr, job, last:{eqId:json}, lastH:json, pos:{eqId:n}, un:[]}
const FOTO_OS={};       // fotoId -> osId
const PEND={};          // docId -> máscaras pendentes de envio (ou 'full')
let UNSUB_LIST=null;
const DONO_FIXO='xavier@xpaengenharia.com.br';
const clone=o=>JSON.parse(JSON.stringify(o));
const isObj=o=>o&&typeof o==='object'&&!Array.isArray(o);
const meuEmail=()=>((typeof FBUSER!=='undefined'&&FBUSER&&FBUSER.email)||'').toLowerCase();
const emOk=s=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
const nomeDe=(hdr,em)=>((hdr&&hdr.nomes)||{})[em]||em;

window.quemSou=function(){
  const em=meuEmail(); if(CUR&&CUR.shared&&SH[CUR.id]) return nomeDe(SH[CUR.id].hdr,em);
  return localStorage.getItem('xpa_meu_nome')||em||'';
};
window.equipePath=function(id,body){
  if(!body) return null;
  if(body.kind==='oshdr') return 'os/'+id;
  if(body.kind==='oseq') return 'os/'+body.os+'/equip/'+id;
  if(body.kind==='photo'){ const os=(body.insp&&SH[body.insp])?body.insp:FOTO_OS[id]; if(os) return 'os/'+os+'/fotos/'+id; }
  return null;
};
window.equipeFotoOS=id=>FOTO_OS[id];
window.equipeEnviado=id=>{ delete PEND[id]; };

/* ---------- diferenças campo a campo ---------- */
function diffPaths(a,b,depth,prefix){
  prefix=prefix||[]; const out=[]; a=a||{}; b=b||{};
  for(const k of new Set([...Object.keys(a),...Object.keys(b)])){
    const va=a[k], vb=b[k]; if(JSON.stringify(va)===JSON.stringify(vb)) continue;
    if(depth>1&&isObj(vb)&&(va===undefined||isObj(va))) out.push(...diffPaths(va||{},vb,depth-1,prefix.concat(k)));
    else out.push(prefix.concat(k));
  }
  return out;
}
function addPend(id,mask){ if(PEND[id]==='full') return; if(!mask){ PEND[id]='full'; return; } PEND[id]=(PEND[id]||[]).concat(mask); }
async function carregarPend(){ for(const [id,o] of await idb.all('outbox')){ if(o.op!=='set') continue; PEND[id]=o.mask&&o.mask.length?o.mask:'full'; } }
/* mescla documento remoto com o local, mantendo os campos ainda não enviados deste aparelho */
function mesclar(remoto,local,id){
  const p=PEND[id]; if(!p||!local) return remoto; if(p==='full') return local;
  const out=clone(remoto); for(const segs of p) setPath(out,segs,getPath(local,segs)===undefined?undefined:clone(getPath(local,segs))); return out;
}

/* ---------- montagem do trabalho a partir dos documentos ---------- */
function montar(hdr,eqDocs){
  let S=SH[hdr.id];
  if(!S){ S=SH[hdr.id]={hdr, job:{kind:'job', shared:true, id:hdr.id, mod:hdr.mod, h:{}, items:[], createdAt:hdr.createdAt||Date.now(), updatedAt:hdr.updatedAt||Date.now()}, last:{}, pos:{}, lastH:'{}', un:[]}; }
  S.hdr=hdr; const job=S.job;
  for(const k of Object.keys(job.h)) if(!(k in (hdr.h||{}))) delete job.h[k];
  Object.assign(job.h, clone(hdr.h||{})); S.lastH=JSON.stringify(job.h);
  job.os={dono:hdr.dono, membros:hdr.membros||[], nomes:hdr.nomes||{}, status:hdr.status||'aberta'};
  job.updatedAt=Math.max(hdr.updatedAt||0, job.updatedAt||0);
  if(eqDocs) aplicarEquips(S,eqDocs,true);
  for(const id of photoIdsJob(job)) FOTO_OS[id]=hdr.id;
  return S;
}
function aplicarEquips(S,docs,todos){
  const job=S.job, ids=new Set();
  for(const d of docs){ ids.add(d.id); S.pos[d.id]=d.pos||0;
    const ex=job.items.find(e=>e.id===d.id);
    if(ex){ for(const k of Object.keys(ex)) if(!(k in d.data)) delete ex[k]; Object.assign(ex, clone(d.data)); }
    else job.items.push(clone(d.data));
    S.last[d.id]=JSON.stringify(d.data); job.updatedAt=Math.max(job.updatedAt||0,d.at||0); }
  if(todos) for(let i=job.items.length-1;i>=0;i--){ const id=job.items[i].id; if(!ids.has(id)&&PEND[id]!=='full'){ job.items.splice(i,1); delete S.last[id]; } }
  job.items.sort((a,b)=>(S.pos[a.id]||0)-(S.pos[b.id]||0));
  for(const id of photoIdsJob(job)) FOTO_OS[id]=job.id;
}

/* ---------- gravação (chamada pelo saveCur do núcleo) ---------- */
window.equipeSave=async function(job){
  const S=SH[job.id]; if(!S) return;
  if(S.hdr.status==='finalizada'){ if(!S._avisou){ S._avisou=1; toast('OS finalizada: alterações não são salvas. O responsável pode reabrir a OS.'); } return; }
  const now=Date.now(), quem=quemSou();
  const hm=diffPaths(JSON.parse(S.lastH),job.h,2).map(p=>['h'].concat(p));
  if(hm.length){ S.hdr.h=clone(job.h); S.hdr.updatedAt=now; S.lastH=JSON.stringify(job.h);
    const mk=hm.concat([['updatedAt']]); addPend(job.id,mk); await writeDoc(job.id, clone(S.hdr), mk); }
  const atual=new Set(job.items.map(e=>e.id));
  for(let i=0;i<job.items.length;i++){ const e=job.items[i]; const js=JSON.stringify(e); const prev=S.last[e.id];
    if(prev===js) continue;
    if(prev===undefined){ // equipamento novo: posição entre os vizinhos
      const pa=i>0?S.pos[job.items[i-1].id]:undefined, pb=i<job.items.length-1?S.pos[job.items[i+1].id]:undefined;
      const pos=pa!==undefined&&pb!==undefined?(pa+pb)/2:pa!==undefined?pa+1000:pb!==undefined?pb-1000:now;
      S.pos[e.id]=pos; S.last[e.id]=js; addPend(e.id,null);
      await writeDoc(e.id,{kind:'oseq', os:job.id, id:e.id, pos, data:clone(e), por:quem, at:now});
    } else {
      const mk=diffPaths(JSON.parse(prev),e,2).map(p=>['data'].concat(p)).concat([['por'],['at']]);
      S.last[e.id]=js; addPend(e.id,mk);
      await writeDoc(e.id,{kind:'oseq', os:job.id, id:e.id, pos:S.pos[e.id]||0, data:clone(e), por:quem, at:now}, mk);
    }
  }
  for(const id of Object.keys(S.last)) if(!atual.has(id)){ delete S.last[id]; delete S.pos[id]; delete PEND[id]; await delDoc(id); }
  for(const id of photoIdsJob(job)) FOTO_OS[id]=job.id;
};
async function gravarHdr(S,mask){ S.hdr.updatedAt=Date.now(); const mk=mask.concat([['updatedAt']]); addPend(S.hdr.id,mk); await writeDoc(S.hdr.id, clone(S.hdr), mk); }

/* ---------- atualizações recebidas da equipe ---------- */
function focoAtual(){ const a=document.activeElement; if(!a||!a.dataset) return null; for(const k of ['k','gmot','anxk']) if(a.dataset[k]){ const box=a.closest('[data-g],[data-it],.card'); return {k, v:a.dataset[k], it:box&&box.dataset?box.dataset.it:null, pos:a.selectionStart}; } return null; }
function restaurarFoco(f){ if(!f) return; let el=null; const sel=`[data-${f.k}="${CSS.escape(f.v)}"]`; el=f.it?document.querySelector(`[data-it="${CSS.escape(f.it)}"] ${sel}`):document.querySelector(sel); if(el){ el.focus(); try{ if(f.pos!=null) el.setSelectionRange(f.pos,f.pos); }catch(e){} } }
let rrT=null;
function rerender(quem){ clearTimeout(rrT); rrT=setTimeout(()=>{ if(VIEW==='home'){ render(); return; }
  const f=focoAtual(), y=window.scrollY; render(); window.scrollTo(0,y); restaurarFoco(f); if(quem) toast('Atualizado por '+quem); },350); }
async function recebeHdr(hdr){
  const S0=SH[hdr.id]; const local=await localGet(hdr.id);
  hdr=mesclar(hdr,local&&local.kind==='oshdr'?local:null,hdr.id);
  if(S0&&CUR&&CUR.id===hdr.id) await flushSave();
  const S=montar(hdr,null); await localPut(hdr.id,clone(hdr));
  if(!INSPS.includes(S.job)) INSPS.push(S.job);
  ligarEquips(S);
  if(CUR===S.job&&VIEW==='job') rerender(); else if(VIEW==='home') rerender();
}
async function recebeEquips(osId,snap){
  const S=SH[osId]; if(!S) return; const ch=snap.docChanges?snap.docChanges():[]; if(!ch.length) return;
  if(CUR===S.job) await flushSave();
  let quem='', mudouItem=false, removido=false;
  const docs=[];
  for(const c of ch){ const id=c.doc.id;
    if(c.type==='removed'){ const i=S.job.items.findIndex(e=>e.id===id); if(i>=0&&PEND[id]!=='full'){ S.job.items.splice(i,1); delete S.last[id]; await localDel(id); if(ITEM&&ITEM.id===id) removido=true; } continue; }
    const r=c.doc.data(); const local=await localGet(id); const m=mesclar(r,local&&local.kind==='oseq'?local:null,id);
    if(S.last[id]===JSON.stringify(m.data)) continue;
    await localPut(id,m); docs.push(m); if(r.por&&r.por!==quemSou()) quem=r.por; if(ITEM&&ITEM.id===id) mudouItem=true; }
  if(docs.length) aplicarEquips(S,docs,false);
  if(CUR!==S.job){ if(VIEW==='home'&&(docs.length||ch.length)) rerender(); return; }
  if(removido){ toast('Este equipamento foi excluído por outro técnico.'); ITEM=null; go('job'); return; }
  if(VIEW==='job'||(VIEW==='item'&&mudouItem)) rerender(quem);
}
function ligarEquips(S){
  if(S.un.length||!DB||!online()) return;
  try{ S.un.push(DB.collection('os/'+S.hdr.id+'/equip').onSnapshot(sn=>recebeEquips(S.hdr.id,sn),e=>{ DIAG.equipe='equip: '+(e&&e.code||e); S.un=[]; })); }catch(e){}
}
function desligar(){ if(UNSUB_LIST){ try{ UNSUB_LIST(); }catch(e){} UNSUB_LIST=null; } for(const S of Object.values(SH)){ S.un.forEach(u=>{ try{ u(); }catch(e){} }); S.un=[]; } }

/* ---------- carga inicial (chamada pelo iniciar do núcleo) ---------- */
window.equipeIniciar=async function(){
  desligar(); for(const k of Object.keys(SH)) delete SH[k];
  INSPS=INSPS.filter(x=>!x.shared);
  if(MODE!=='db'||!FBUSER||!DB) return;
  const em=meuEmail(); await carregarPend();
  // 1) o que já está no aparelho
  const all=(await idb.all('docs')).map(x=>x[1]).filter(Boolean);
  const hdrs=all.filter(d=>d.kind==='oshdr'&&(d.membros||[]).includes(em));
  for(const h of hdrs){ const S=montar(h,all.filter(d=>d.kind==='oseq'&&d.os===h.id)); INSPS.push(S.job); }
  // 2) o que está na nuvem
  if(online()){
    try{
      const snap=await withTimeout(DB.collection('os').where('membros','array-contains',em).get(),12000);
      const vistos=new Set();
      for(const d of snap.docs){ const r=d.data(); vistos.add(r.id);
        const local=await localGet(r.id); const hdr=mesclar(r,local&&local.kind==='oshdr'?local:null,r.id); await localPut(r.id,clone(hdr));
        let eqs=[]; try{ const es=await withTimeout(DB.collection('os/'+r.id+'/equip').get(),15000);
          for(const x of es.docs){ const rr=x.data(); const l=await localGet(rr.id); const m=mesclar(rr,l&&l.kind==='oseq'?l:null,rr.id); await localPut(rr.id,m); eqs.push(m); }
          for(const l of all.filter(d=>d.kind==='oseq'&&d.os===r.id)) if(!eqs.find(x=>x.id===l.id)&&PEND[l.id]==='full') eqs.push(l);
        }catch(e){ eqs=all.filter(d=>d.kind==='oseq'&&d.os===r.id); }
        const novo=!SH[r.id]; const S=montar(hdr,eqs); if(novo) INSPS.push(S.job); }
      // removido da equipe (ou OS excluída): some da lista, exceto se ainda não foi enviada
      for(const id of Object.keys(SH)) if(!vistos.has(id)&&PEND[id]!=='full'){ INSPS=INSPS.filter(x=>x!==SH[id].job); await localDel(id); delete SH[id]; }
    }catch(e){ DIAG.equipe='lista: '+((e&&e.code)||e); }
    try{ UNSUB_LIST=DB.collection('os').where('membros','array-contains',em).onSnapshot(sn=>{
        sn.docChanges().forEach(c=>{ const r=c.doc.data();
          if(c.type==='removed'){ const S=SH[r.id]; if(S){ S.un.forEach(u=>{ try{u();}catch(e){} }); INSPS=INSPS.filter(x=>x!==S.job); delete SH[r.id]; localDel(r.id); if(CUR===S.job){ toast('Você não faz mais parte desta OS.'); CUR=null; go('home'); } else if(VIEW==='home') rerender(); } return; }
          recebeHdr(r); }); },e=>{ DIAG.equipe='tempo real: '+((e&&e.code)||e); }); }catch(e){}
    for(const S of Object.values(SH)) ligarEquips(S);
  }
};

/* ---------- compartilhar um trabalho pessoal ---------- */
async function compartilhar(emails,meuNome){
  const em=meuEmail(); const job=CUR; await flushSave();
  const osId=uid('os'); const now=Date.now();
  // as fotos ganham novos ids na OS (as antigas ficam na pasta pessoal e são apagadas)
  const fotos=photoIdsJob(job); let js=JSON.stringify(job); const mapa={};
  for(const id of fotos){ const n=uid('ph'); mapa[id]=n; js=js.split(id).join(n); }
  const novo=JSON.parse(js);
  const membros=[...new Set([em,...emails.map(x=>x.email)])];
  const nomes={}; nomes[em]=meuNome||em; emails.forEach(x=>{ if(x.nome) nomes[x.email]=x.nome; });
  const hdr={kind:'oshdr', id:osId, mod:job.mod, h:novo.h||{}, membros, nomes, dono:em, status:'aberta', createdAt:now, updatedAt:now, origem:job.id};
  const S=montar(hdr,[]); addPend(osId,null); await writeDoc(osId,clone(hdr));
  for(const [old,nid] of Object.entries(mapa)){ const p=await getPhoto(old); if(!p) continue; const b=Object.assign({},p,{id:nid,insp:osId}); FOTO_OS[nid]=osId; photoCache[nid]=b; addPend(nid,null); await writeDoc(nid,b); }
  let pos=now; const docs=[];
  for(const e of (novo.items||[])){ if(!e.id) e.id=uid('eq'); pos+=1000; const d={kind:'oseq', os:osId, id:e.id, pos, data:e, por:quemSou(), at:now}; addPend(e.id,null); await writeDoc(e.id,d); docs.push(d); }
  aplicarEquips(S,docs,true);
  // remove o trabalho pessoal
  for(const id of fotos) await delDoc(id);
  await delDoc(job.id); INSPS=INSPS.filter(x=>x!==job); INSPS.push(S.job); CUR=S.job;
  ligarEquips(S); go('job'); toast('OS compartilhada com '+(membros.length-1)+' técnico(s).');
}

/* ---------- tela: cartão "Equipe" dentro do trabalho ---------- */
window.equipeHtml=function(){
  if(!CUR) return '';
  const logado=typeof FBUSER!=='undefined'&&FBUSER&&MODE==='db';
  if(!CUR.shared){
    return `<div class="sec">Trabalho em equipe</div><div class="card"><div class="note">Compartilhe esta manutenção com os técnicos da equipe: cada um registra os ensaios e o checklist no próprio celular, ao mesmo tempo, e no final sai um relatório único.</div>
    ${logado?`<button class="btn" id="eq_share" style="margin-top:8px">👥 Compartilhar com a equipe</button>`:`<div class="note" style="margin-top:6px;color:#C62828">Entre na conta XPA para compartilhar.</div>`}</div>`;
  }
  const S=SH[CUR.id]; if(!S) return ''; const hdr=S.hdr, em=meuEmail();
  const gest=em===hdr.dono||em===DONO_FIXO, fin=hdr.status==='finalizada';
  const membros=(hdr.membros||[]);
  return `<div class="sec">Equipe da OS</div><div class="card" id="eq_card">
    <div class="result"><div><b>${fin?'🔒 OS finalizada':'🟢 OS aberta – equipe registrando'}</b><div class="note">Responsável: ${esc(nomeDe(hdr,hdr.dono))}${fin&&hdr.finalizadaEm?' · finalizada em '+esc(new Date(hdr.finalizadaEm).toLocaleString('pt-BR'))+(hdr.finalizadaPor?' por '+esc(nomeDe(hdr,hdr.finalizadaPor)):''):''}</div></div><span class="pill p-${fin?'ok':'pend'}">${fin?'Finalizada':'Aberta'}</span></div>
    <div class="list" style="margin-top:8px">${membros.map(m=>`<div class="it" style="cursor:default"><div style="font-size:18px">${m===hdr.dono?'⭐':'👷'}</div><div style="flex:1"><div class="t">${esc(nomeDe(hdr,m))}${m===em?' (você)':''}</div><div class="s">${esc(m)}</div></div>${gest&&m!==hdr.dono&&!fin?`<button class="eq_rm" data-em="${esc(m)}" style="font-size:12px;padding:4px 9px">Remover</button>`:''}</div>`).join('')}</div>
    <label>Seu nome no relatório</label><input id="eq_nome" value="${esc((hdr.nomes||{})[em]||'')}" placeholder="Ex.: Téc. João Silva">
    ${gest&&!fin?`<label>Adicionar técnico (e-mail da conta XPA)</label><div class="row"><input id="eq_add_em" type="email" inputmode="email" placeholder="tecnico@xpaengenharia.com.br" style="flex:2"><input id="eq_add_nm" placeholder="Nome" style="flex:1"><button class="btn" id="eq_add">Adicionar</button></div>`:''}
    <div class="note" style="margin-top:8px">Cada técnico registra no próprio celular; as alterações aparecem para todos em tempo real. Sem internet, ficam guardadas no aparelho e são enviadas depois. Cada ensaio registra quem o executou.</div>
    ${gest?`<div class="row" style="margin-top:10px">${fin?`<button class="btn ghost" id="eq_reab">Reabrir OS</button>`:`<button class="btn gold" id="eq_fin">✅ Finalizar manutenção</button>`}</div>`:''}
  </div>`;
};
window.equipeBind=function(){
  const b=document.getElementById('eq_share'); if(b) b.onclick=modalCompartilhar;
  if(!CUR||!CUR.shared||!SH[CUR.id]) return;
  const S=SH[CUR.id], hdr=S.hdr, em=meuEmail(), gest=em===hdr.dono||em===DONO_FIXO;
  const del=document.getElementById('del');
  if(del){ if(!gest) del.style.display='none'; else { del.textContent='Excluir OS da equipe'; del.onclick=()=>confirmBox('Excluir esta OS para toda a equipe, com todos os equipamentos, ensaios e fotos?', async()=>{
    const job=S.job; for(const p of photoIdsJob(job)) await delDoc(p); for(const e of job.items) await delDoc(e.id);
    S.un.forEach(u=>{ try{u();}catch(e){} }); await delDoc(job.id); delete SH[job.id]; INSPS=INSPS.filter(x=>x!==job); CUR=null; go('home'); }); } }
  const nm=document.getElementById('eq_nome'); if(nm) nm.onchange=async()=>{ hdr.nomes=hdr.nomes||{}; hdr.nomes[em]=nm.value.trim(); localStorage.setItem('xpa_meu_nome',nm.value.trim()); await gravarHdr(S,[['nomes',em]]); toast('Nome salvo.'); };
  document.querySelectorAll('.eq_rm').forEach(x=>x.onclick=()=>confirmBox('Remover '+x.dataset.em+' da OS? Os registros feitos por ele continuam no relatório.', async()=>{
    hdr.membros=(hdr.membros||[]).filter(m=>m!==x.dataset.em); await gravarHdr(S,[['membros']]); render(); }));
  const ad=document.getElementById('eq_add'); if(ad) ad.onclick=async()=>{ const e2=document.getElementById('eq_add_em').value.trim().toLowerCase(), n2=document.getElementById('eq_add_nm').value.trim();
    if(!emOk(e2)){ toast('Informe um e-mail válido.'); return; } if((hdr.membros||[]).includes(e2)){ toast('Este técnico já está na OS.'); return; }
    hdr.membros=(hdr.membros||[]).concat(e2); const mk=[['membros']]; if(n2){ hdr.nomes=hdr.nomes||{}; hdr.nomes[e2]=n2; mk.push(['nomes',e2]); }
    await gravarHdr(S,mk); toast(e2+' adicionado. Ele verá a OS ao abrir o app.'); render(); };
  const fi=document.getElementById('eq_fin'); if(fi) fi.onclick=()=>finalizar(S);
  const re=document.getElementById('eq_reab'); if(re) re.onclick=()=>confirmBox('Reabrir a OS para a equipe voltar a registrar?', async()=>{ hdr.status='aberta'; S._avisou=0; await gravarHdr(S,[['status']]); render(); });
};
async function finalizar(S){
  await flushSave(); const m=MODS[S.job.mod]; const pend=m&&m.pendencias?m.pendencias(S.job):[];
  const cont=PENDING?`<p class="note" style="color:#C62828">Este aparelho ainda tem ${PENDING} alteração(ões) aguardando envio. Peça para a equipe abrir o app com internet antes de finalizar.</p>`:'';
  $('#mbox').innerHTML=`<p style="margin-top:0;font-weight:bold;color:var(--navy)">Finalizar manutenção</p>
    ${pend.length?`<p class="note" style="margin-top:0">Pendências encontradas (${pend.length}):</p><div style="max-height:40vh;overflow:auto;font-size:13px;background:var(--bg);border-radius:8px;padding:8px 10px">${pend.map(x=>'• '+esc(x)).join('<br>')}</div><p class="note">Para não realizar um ensaio, desmarque <b>Realizar</b> no equipamento; ele sai como "não realizado" no relatório.</p>`:'<p class="note" style="margin-top:0">Todos os itens e ensaios previstos têm registro.</p>'}
    ${cont}<p class="note">Depois de finalizada, a OS fica somente leitura para a equipe e o relatório único pode ser gerado.</p>
    <div class="row" style="justify-content:flex-end"><button id="mn">Voltar</button><button class="btn gold" id="my">${pend.length?'Finalizar mesmo assim':'Finalizar'}</button></div>`;
  $('#modal').classList.add('show'); $('#mn').onclick=()=>$('#modal').classList.remove('show');
  $('#my').onclick=async()=>{ $('#modal').classList.remove('show'); const em=meuEmail(); S.hdr.status='finalizada'; S.hdr.finalizadaEm=Date.now(); S.hdr.finalizadaPor=em;
    await gravarHdr(S,[['status'],['finalizadaEm'],['finalizadaPor']]); render(); toast('OS finalizada.'); setTimeout(escolherRelatorio,400); };
}
function modalCompartilhar(){
  const linhas=()=>[...document.querySelectorAll('.eq_l')].map(l=>({email:l.querySelector('.eq_e').value.trim().toLowerCase(), nome:l.querySelector('.eq_n').value.trim()})).filter(x=>x.email);
  const linha=()=>`<div class="row eq_l" style="margin-bottom:6px"><input class="eq_e" type="email" inputmode="email" placeholder="e-mail do técnico" style="flex:2"><input class="eq_n" placeholder="Nome" style="flex:1"></div>`;
  $('#mbox').innerHTML=`<p style="margin-top:0;font-weight:bold;color:var(--navy)">Compartilhar com a equipe</p>
    <p class="note" style="margin-top:0">Informe o e-mail da conta XPA de cada técnico. Todos poderão registrar checklist, ensaios e fotos nesta OS ao mesmo tempo. Você continua como responsável e é quem finaliza.</p>
    <label>Seu nome no relatório</label><input id="eq_meu" value="${esc(localStorage.getItem('xpa_meu_nome')||'')}" placeholder="Ex.: Eng. Magidiel">
    <label>Técnicos</label><div id="eq_ls">${linha()}${linha()}</div><button id="eq_mais" style="font-size:13px">+ outro técnico</button>
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button id="mn">Cancelar</button><button class="btn gold" id="my">Compartilhar</button></div>`;
  $('#modal').classList.add('show'); $('#mn').onclick=()=>$('#modal').classList.remove('show');
  $('#eq_mais').onclick=()=>$('#eq_ls').insertAdjacentHTML('beforeend',linha());
  $('#my').onclick=async()=>{ const ls=linhas(); const bad=ls.find(x=>!emOk(x.email)); if(bad){ toast('E-mail inválido: '+bad.email); return; }
    if(!ls.length){ toast('Informe ao menos um técnico.'); return; }
    const meu=$('#eq_meu').value.trim(); if(meu) localStorage.setItem('xpa_meu_nome',meu);
    $('#modal').classList.remove('show'); toast('Compartilhando...'); try{ await compartilhar(ls,meu); }catch(e){ console.error(e); toast('Não foi possível compartilhar ('+((e&&e.message)||e)+').'); } };
}
})();

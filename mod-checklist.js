/* ======================= FÁBRICA DE MÓDULOS DE CHECKLIST (subestação, inspeção visual, gerador, motores…) =======================
   Um módulo de checklist tem: tipos de item (TIPOS) com campos, itens de inspeção e grupos de medições;
   uma função de avaliação das medições (avaliar) e os textos do relatório (tx). */

/* ---------- limites e utilidades compartilhados ---------- */
// NETA MTS Tab. 100.1 – resistência de isolamento mínima (MΩ) para disjuntores, chaves, barramentos e cabos, por tensão nominal (V)
function limRI(volts){ if(volts===null) return null; if(volts<=250) return 25; if(volts<=1000) return 100; if(volts<=2500) return 500; if(volts<=5000) return 1000; if(volts<=8000) return 2000; if(volts<=15000) return 5000; if(volts<=25000) return 20000; return 100000; }
// NETA MTS Tab. 100.5 – transformadores (MΩ, a 20 °C)
function limRItrafo(volts,seco){ if(volts===null) return null; if(volts<=600) return seco?500:100; if(volts<=5000) return seco?5000:1000; return seco?25000:5000; }
// IEEE 43 – mínimo para máquinas rotativas (MΩ, a 40 °C): kV+1 (enrolamentos antigos) / 100 MΩ (pós-1970) / 5 MΩ (rotor, máquinas < 1 kV)
function limRImaq(volts){ if(volts===null) return null; return volts<1000 ? 5 : 100; }
function kV(v){ const x=num(v); return x===null?null:x*1000; }
const evMin=(val,lim,unit)=>{ if(val===null) return null; if(lim===null) return {st:null,lim:'—'}; return {st:val>=lim?'ok':(val>=lim*0.5?'att':'nc'), lim:'≥ '+fmtN(lim)+' '+unit}; };
const evMax=(val,lim,unit,attFrac)=>{ if(val===null) return null; if(lim===null) return {st:null,lim:'—'}; const f=attFrac||0.8; return {st:val<=lim*f?'ok':(val<=lim?'att':'nc'), lim:'≤ '+fmtN(lim)+' '+unit}; };
const evFaixa=(val,min,max,unit)=>{ if(val===null) return null; const ok=val>=min&&val<=max; const tol=(max-min)*0.1; const att=val>=min-tol&&val<=max+tol; return {st:ok?'ok':att?'att':'nc', lim:fmtN(min)+' a '+fmtN(max)+' '+unit}; };
function desvioPct(arr){ const v=arr.filter(x=>x!==null); if(v.length<2) return null; const mn=Math.min(...v), mx=Math.max(...v); if(mn<=0) return null; return (mx-mn)/mn*100; }
function desequilibrio(arr){ const v=arr.filter(x=>x!==null); if(v.length<2) return null; const avg=v.reduce((a,b)=>a+b,0)/v.length; if(avg<=0) return null; return Math.max(...v.map(x=>Math.abs(x-avg)))/avg*100; }

const RES={
  ok:  {label:'Conforme',                 curto:'Conforme',      acao:'Em condições normais de operação. Manter o plano de manutenção.'},
  att: {label:'Atenção',                  curto:'Atenção',       acao:'Observação registrada: acompanhar e reavaliar na próxima inspeção.'},
  nc:  {label:'Não conforme – programar', curto:'NC – programar', acao:'Não conformidade: programar a correção para a próxima parada.'},
  crit:{label:'Não conforme – urgente',   curto:'NC – urgente',  acao:'Não conformidade crítica: corrigir imediatamente ou antes da reenergização.'},
  pend:{label:'Sem avaliação',            curto:'Pendente',      acao:'Itens ainda não avaliados.'},
};
const RANK_RES={ok:0,att:1,nc:2,crit:3};
const SEV={A:{label:'A – Urgente',curto:'A',desc:'Risco imediato à segurança ou à continuidade: corrigir de imediato.'},B:{label:'B – Programar',curto:'B',desc:'Deficiência que evolui: corrigir na próxima parada programada.'},C:{label:'C – Observação',curto:'C',desc:'Desvio menor: acompanhar e corrigir em rotina.'}};
const STATUS={C:{label:'Conforme'},A:{label:'Atenção'},NC:{label:'Não conforme'},NA:{label:'Não se aplica'}};
const C_RES={ok:[46,125,50],att:[181,134,0],nc:[211,84,0],crit:[198,40,40],pend:[138,147,166]};
const C_ST={C:[46,125,50],A:[181,134,0],NC:[198,40,40],NA:[138,147,166]};
const CRIT_GERAL=[['Conforme','Todos os itens conformes e medições dentro dos limites.',RES.ok.acao],['Atenção','Desvios menores ou medições próximas ao limite.',RES.att.acao],['Não conforme – programar','Não conformidade de severidade B ou medição fora do limite.',RES.nc.acao],['Não conforme – urgente','Não conformidade de severidade A (risco à segurança ou à continuidade).',RES.crit.acao]];

function criarModuloChecklist(cfg){
  const TIPOS=cfg.TIPOS, TIPOS_ORD=cfg.TIPOS_ORD||Object.keys(cfg.TIPOS);
  const comMeds=cfg.comMeds!==false && TIPOS_ORD.some(k=>(TIPOS[k].meds||[]).length);
  const avaliar=cfg.avaliar||(()=>[]);
  const IN=cfg.itemNome||'equipamento', INP=cfg.itemNomePl||(IN+'s');
  const INcap=IN.charAt(0).toUpperCase()+IN.slice(1), INPcap=INP.charAt(0).toUpperCase()+INP.slice(1);
  const tx=Object.assign({
    dadosSec:'Dados do trabalho', antes:'Antes da intervenção', depois:'Depois da intervenção', outras:'Outras fotos (placa, detalhes)',
    titulo:cfg.nome, capa1:cfg.nome, capa2:'', xlsTitulo:cfg.nome.toUpperCase(),
    objetivo:[], metodologia:[], limitacoes:'', condSec:'Condições e instrumentos', lblData:'Data', normas:[], criterios:[],
    consideracoes:null,
  },cfg.tx||{});
  const worst=(a,b)=>{ if(!a) return b; if(!b) return a; return RANK_RES[a]>=RANK_RES[b]?a:b; };
  const hTit=(h)=>(cfg.hTitulo&&h[cfg.hTitulo])||'';

  function novoItem(tipo,base){
    const T=TIPOS[tipo]; const d={tag:'',local:'',fab:'',modelo:'',serie:'',ano:''};
    (T.campos||[]).forEach(c=>{ d[c[0]]=c[3]||(Array.isArray(c[2])?c[2][0]:''); });
    if(base){ Object.assign(d, JSON.parse(JSON.stringify(base.d))); d.tag=''; d.serie=''; }
    const it={id:uid('eq'), tipo, d, items:{}, m:{}, pantes:[], pdepois:[], photos:[], diag:'', rec:'', manual:'', just:''};
    if(T.ext&&T.ext.novo) T.ext.novo(it,base);
    return it;
  }
  function photoIds(e){ const X=(TIPOS[e.tipo]||{}).ext; return [...(e.pantes||[]),...(e.pdepois||[]),...(e.photos||[]),...Object.values(e.items||{}).flatMap(it=>it.photos||[]),...((X&&X.slots)||[]).flatMap(s=>e[s]||[])]; }
  function eqTitle(e){ const T=TIPOS[e.tipo]; return (e.d.tag||T.nome); }

  function equipResult(e,h){
    h=h||(CUR&&CUR.h)||{}; const T=TIPOS[e.tipo]; let auto=null, n={C:0,A:0,NC:0,NA:0}, ncs=[];
    for(const it of T.items){ const r=(e.items||{})[it[0]]; if(!r||!r.s) continue; n[r.s]=(n[r.s]||0)+1;
      if(r.s==='A') auto=worst(auto,'att');
      if(r.s==='NC'){ const sev=r.sev||it[3]; auto=worst(auto, sev==='A'?'crit':sev==='B'?'nc':'att'); ncs.push({item:it, sev, obs:r.obs||''}); } }
    const meds=comMeds?avaliar(e,h,T):[]; const medBad=meds.filter(x=>x.st&&x.st!=='ok');
    for(const x of meds){ if(x.st==='ok') auto=worst(auto,'ok'); if(x.st==='att') auto=worst(auto,'att'); if(x.st==='nc') auto=worst(auto,'nc'); }
    if((n.C||n.NA)&&!auto) auto='ok';
    const total=T.items.length, done=n.C+n.A+n.NC+n.NA;
    const k=e.manual||auto||'pend';
    return {k,label:RES[k].label,curto:RES[k].curto,auto,n,done,total,ncs,meds,medBad,manual:!!e.manual};
  }

  /* ---------- telas ---------- */
  function vJob(){
    const h=CUR.h; CUR.items=CUR.items||[];
    const grupos=cfg.grupos||[['',''] ];
    const lista=(eqs)=>`<div class="list">${eqs.map(e=>{ const r=equipResult(e); const i=CUR.items.indexOf(e)+1; const T=TIPOS[e.tipo];
      return `<div class="it" data-e="${e.id}"><div style="font-size:20px">${T.icone}</div><div style="flex:1"><div class="t">${i}. ${esc(eqTitle(e))}</div>
      <div class="s">${e.d.tag?esc(T.nome)+' · ':''}${e.d.local?esc(e.d.local)+' · ':''}${r.done}/${r.total} itens${r.ncs.length?' · '+r.ncs.length+' NC':''}</div></div><span class="pill p-${r.k}">${r.curto}</span></div>`;}).join('')}</div>`;
    const porGrupo=cfg.grupos?grupos.map(([g,gn])=>{ const eqs=CUR.items.filter(e=>TIPOS[e.tipo].grupo===g); if(!eqs.length) return ''; return `<div class="note" style="margin:6px 2px 4px;font-weight:bold">${gn}</div>`+lista(eqs); }).join(''):lista(CUR.items);
    $('#app').innerHTML = storageBanner() + `<div class="row" style="margin-bottom:8px"><button id="back">‹ Trabalhos</button></div>
    ${cfg.jobFields(h)}
    <div class="sec">${INPcap} (${CUR.items.length})</div>
    ${porGrupo || `<div class="empty">Nenhum ${IN} cadastrado.</div>`}
    `+jobFooter();
    document.querySelectorAll('.hdr').forEach(el=>bindFields(el,h));
    bindJobFooter();
    document.querySelectorAll('[data-e]').forEach(el=>el.onclick=()=>{ ITEM=CUR.items.find(e=>e.id===el.dataset.e); go('item'); });
    setBar(`<button class="btn" id="adde">+ Adicionar ${IN}</button><button class="btn gold" id="pdf">Gerar relatório</button>`);
    $('#adde').onclick=()=>{ if(TIPOS_ORD.length===1){ ITEM=novoItem(TIPOS_ORD[0]); CUR.items.push(ITEM); saveCur(); go('item'); } else escolherTipo(); };
    $('#pdf').onclick=escolherRelatorio;
  }
  function escolherTipo(){
    $('#mbox').innerHTML=`<p style="margin-top:0;font-weight:bold;color:var(--navy)">Tipo de ${IN}</p>
    <div style="display:grid;gap:6px;max-height:60vh;overflow:auto">${TIPOS_ORD.map(k=>`<button class="tp" data-t="${k}" style="text-align:left">${TIPOS[k].icone} ${esc(TIPOS[k].nome)} ${TIPOS[k].grupo?`<span class="note">· ${esc(TIPOS[k].grupo)}</span>`:''}</button>`).join('')}</div>
    <div class="row" style="justify-content:flex-end;margin-top:8px"><button id="mn">Cancelar</button></div>`;
    $('#modal').classList.add('show');
    $('#mn').onclick=()=>$('#modal').classList.remove('show');
    document.querySelectorAll('.tp').forEach(b=>b.onclick=()=>{ $('#modal').classList.remove('show'); ITEM=novoItem(b.dataset.t); CUR.items.push(ITEM); saveCur(); go('item'); });
  }

  function vItem(){
    const e=ITEM, d=e.d, T=TIPOS[e.tipo]; e.items=e.items||{}; e.m=e.m||{}; e.pantes=e.pantes||[]; e.pdepois=e.pdepois||[]; e.photos=e.photos||[];
    const idx=CUR.items.indexOf(e)+1;
    const campo=(c)=>c[2]&&Array.isArray(c[2])?sel(c[0],c[1],d,c[2]):field(c[0],c[1],d,'text',c[3]?'Padrão: '+c[3]:'',/\(k?V|kVA|kW|\(A\)|\(ms\)|\(h\)|Ω|mA|kA|Vcc|rpm|Hz|°C|elementos|\(%\)/.test(c[1])?DEC:'');
    const meds=comMeds?(T.meds||[]):[];
    $('#app').innerHTML = `<div class="row" style="margin-bottom:8px"><button id="back">‹ ${esc(hTit(CUR.h)||CUR.h.cliente||'Trabalho')}</button></div>
    <div class="card"><div class="result"><div><div style="font-weight:bold;color:var(--navy)" id="rtag">${T.icone} ${idx}. ${esc(eqTitle(e))}</div><div class="note" id="rcalc"></div></div><span class="pill" id="rpill"></span></div>
    <div class="note" id="racao" style="margin-top:6px"></div><div class="prog"><div id="rprog" style="width:0"></div></div></div>
    <div class="sec">Identificação – ${esc(T.nome)}</div>
    <div class="card" id="ef"><div class="grid">
      ${field('tag','TAG / identificação',d)}${field('local',cfg.lblLocal||'Localização',d)}
      ${field('fab','Fabricante',d)}${field('modelo','Modelo / tipo',d)}
      ${field('serie','Nº de série',d)}${field('ano','Ano de fabricação',d)}
      ${(T.campos||[]).map(campo).join('')}
    </div></div>
    <div class="sec">Checklist de inspeção</div>
    <div class="grp" style="border:none;background:none">${T.items.map(it=>{ const r=e.items[it[0]]||{}; const show=r.s==='A'||r.s==='NC';
      return `<div class="item card" style="margin-bottom:8px" data-it="${it[0]}"><div class="q">${esc(it[1])}</div><div class="ref">Ref.: ${esc(it[2])} · severidade padrão ${it[3]}</div>
      <div class="seg">${['C','A','NC','NA'].map(s=>`<button data-s="${s}" class="${r.s===s?'on s-'+s:''}">${s==='C'?'Conforme':s==='A'?'Atenção':s==='NC'?'Não conf.':'N/A'}</button>`).join('')}</div>
      <div class="extra ${show?'show':''}">${sel('sev','Severidade',{sev:r.sev||it[3]},[['A',SEV.A.label],['B',SEV.B.label],['C',SEV.C.label]])}
        <label>Observação / evidência</label><textarea data-k="obs" placeholder="Descreva o que foi encontrado">${esc(r.obs||'')}</textarea>
        <label>Fotos do item</label><div class="row">${photoBtns(`data-slot="item:${it[0]}"`)}</div><div class="thumbs" id="th_item_${it[0]}"></div></div></div>`; }).join('')}</div>
    ${meds.length?`<div class="sec">Medições e ensaios</div>
    <div class="card" id="mm">${meds.map(g=>`<div style="font-weight:bold;color:var(--navy);margin:8px 0 2px">${esc(g.g)}</div><div class="grid">${g.f.map(f=>field(f[0],f[1],e.m,'text','',DEC)).join('')}</div><div class="note">${esc(g.note||'')}</div>`).join('')}
    <div id="medres" style="margin-top:10px"></div></div>`:''}
    ${T.ext&&comMeds?T.ext.html(e):''}
    <div class="sec">Fotos</div>
    <div class="card">
      <label>${esc(tx.antes)}</label><div class="row">${photoBtns('data-slot="pantes"')}</div><div class="thumbs" id="th_pantes"></div>
      <label>${esc(tx.depois)}</label><div class="row">${photoBtns('data-slot="pdepois"')}</div><div class="thumbs" id="th_pdepois"></div>
      <label>${esc(tx.outras)}</label><div class="row">${photoBtns('data-slot="photos"')}</div><div class="thumbs" id="th_photos"></div>
    </div>
    <div class="sec">Parecer e classificação</div>
    <div class="card" id="df">
      ${field('diag',cfg.lblDiag||'Diagnóstico / serviços executados',e,'textarea',cfg.phDiag||'')}
      ${field('rec','Recomendações',e,'textarea',cfg.phRec||'')}
      ${sel('manual','Classificação',e,[['','Automática (checklist'+(meds.length?' + medições':'')+')'],['ok',RES.ok.label],['att',RES.att.label],['nc',RES.nc.label],['crit',RES.crit.label]])}
      <div id="jwrap">${field('just','Justificativa da classificação manual',e,'textarea')}</div>
    </div>
    <div class="row"><button class="btn ghost" id="dup">Duplicar ${IN}</button><button class="btn danger" id="dele">Excluir ${IN}</button></div>`;
    const upd=()=>{ $('#rtag').textContent=`${T.icone} ${idx}. ${eqTitle(e)}`; refreshCalc(); };
    bindFields($('#ef'),d,upd); if($('#mm')) bindFields($('#mm'),e.m,upd); bindFields($('#df'),e,upd);
    document.querySelectorAll('[data-it]').forEach(box=>{
      const id=box.dataset.it; const it=T.items.find(x=>x[0]===id);
      const get=()=>e.items[id]||(e.items[id]={s:'',sev:it[3],obs:'',photos:[]});
      box.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{ const r=get(); r.s=(r.s===b.dataset.s)?'':b.dataset.s; if(!r.sev) r.sev=it[3];
        box.querySelectorAll('.seg button').forEach(x=>x.className=(x.dataset.s===r.s)?'on s-'+r.s:''); box.querySelector('.extra').classList.toggle('show',r.s==='A'||r.s==='NC'); saveCur(); refreshCalc(); });
      box.querySelector('select[data-k=sev]').onchange=(ev)=>{ get().sev=ev.target.value; saveCur(); refreshCalc(); };
      box.querySelector('textarea[data-k=obs]').oninput=(ev)=>{ get().obs=ev.target.value; saveCur(); };
    });
    $('#back').onclick=()=>go('job');
    $('#dup').onclick=()=>{ const n=novoItem(e.tipo,e); const i=CUR.items.indexOf(e); CUR.items.splice(i+1,0,n); ITEM=n; saveCur(); go('item'); toast(`${INcap} duplicado: informe a TAG e o nº de série.`); };
    $('#dele').onclick=()=>confirmBox(`Excluir este ${IN}?`, async()=>{
      for(const p of photoIds(e)) await delDoc(p);
      CUR.items=CUR.items.filter(x=>x!==e); saveCur(); go('job');
    });
    const slotArr=(slot)=>{ if(slot.startsWith('item:')){ const id=slot.slice(5); const r=e.items[id]||(e.items[id]={s:'',sev:'',obs:'',photos:[]}); r.photos=r.photos||[]; return r.photos; } return e[slot]; };
    const slotEl=(slot)=>slot.startsWith('item:')?'th_item_'+slot.slice(5):'th_'+slot;
    document.querySelectorAll('.pbtn').forEach(btn=>btn.onclick=()=>openPicker(btn.nextElementSibling));
    document.querySelectorAll('input[type=file][data-slot]').forEach(inp=>inp.onchange=async()=>{
      const files=[...inp.files]; inp.value=''; const slot=inp.dataset.slot; const arr=slotArr(slot);
      for(const f of files){
        try{
          const ph=await compress(f); const id=uid('ph');
          const body={kind:'photo', id, insp:CUR.id, equip:e.id, item:slot, data:ph.data, w:ph.w, h:ph.h, at:Date.now()};
          photoCache[id]=body; await writeDoc(id, body);
          arr.push(id); saveCur();
        }catch(err){ photoError(f,err); break; }
      }
      drawSlot(slot);
    });
    const drawSlot=(slot)=>{ const arr=slotArr(slot); drawThumbs(slotEl(slot), arr, id=>{ const a=slotArr(slot); a.splice(a.indexOf(id),1); }); };
    ['pantes','pdepois','photos'].concat(T.ext&&comMeds?(T.ext.slots||[]):[]).forEach(s=>{ if(!e[s]) e[s]=[]; drawSlot(s); });
    if(T.ext&&comMeds) T.ext.bind(e,refreshCalc);
    T.items.forEach(it=>{ if((e.items[it[0]]||{}).photos?.length) drawSlot('item:'+it[0]); });
    refreshCalc();
    setBar(`<button class="btn" id="nx">Próximo ${IN}</button><button class="btn gold" id="pdf2">Gerar relatório</button>`);
    $('#nx').onclick=()=>{ const i=CUR.items.indexOf(e); if(i<CUR.items.length-1){ ITEM=CUR.items[i+1]; go('item'); } else go('job'); };
    $('#pdf2').onclick=escolherRelatorio;
  }
  function refreshCalc(){
    const e=ITEM, r=equipResult(e);
    $('#rpill').className='pill p-'+r.k; $('#rpill').textContent=r.curto;
    $('#rcalc').textContent=`Checklist ${r.done}/${r.total} · C ${r.n.C||0} · Atenção ${r.n.A||0} · NC ${r.n.NC||0} · N/A ${r.n.NA||0}${r.meds.length?' · medições fora do limite: '+r.medBad.length:''}`;
    $('#racao').textContent = r.k==='pend' ? 'Avalie os itens do checklist'+(comMeds?' e registre as medições.':'.') : (RES[r.k].acao + (r.manual?' (classificação manual)':''));
    $('#rprog').style.width=(r.total?Math.round(r.done/r.total*100):0)+'%';
    $('#jwrap').style.display = e.manual?'block':'none';
    const mr=$('#medres'); if(mr){ mr.innerHTML = r.meds.length? `<table style="width:100%;border-collapse:collapse;font-size:12px">${r.meds.map(x=>`<tr style="border-top:1px solid var(--line)"><td style="padding:4px 2px">${esc(x.label)}</td><td style="padding:4px 2px;text-align:right;white-space:nowrap">${esc(x.val)}</td><td style="padding:4px 2px;color:var(--muted);white-space:nowrap">${esc(x.lim)}</td><td style="padding:4px 2px;text-align:right">${x.st?`<span class="pill p-${x.st}">${x.st==='ok'?'OK':x.st==='att'?'Atenção':'NC'}</span>`:''}</td></tr>`).join('')}</table>` : '<div class="note">Informe as medições para a avaliação automática.</div>'; }
  }

  /* ---------- plano de ação ---------- */
  function montarPlano(eqs,res){
    const eqName=(e,i)=>`${i+1}. ${eqTitle(e)}`; const plano=[];
    eqs.forEach((e,i)=>{ const T=TIPOS[e.tipo];
      for(const it of T.items){ const r=(e.items||{})[it[0]]; if(!r||(r.s!=='NC'&&r.s!=='A')) continue; plano.push({eq:eqName(e,i),tipo:T.nome,item:it[1],st:r.s,sev:r.s==='NC'?(r.sev||it[3]):'C',obs:r.obs||''}); }
      for(const x of res[i].medBad) plano.push({eq:eqName(e,i),tipo:T.nome,item:`${x.label}: ${x.val} (limite ${x.lim})`,st:x.st==='nc'?'NC':'A',sev:x.st==='nc'?'B':'C',obs:'Medição fora do limite de referência.'});
    });
    const sevRank={A:0,B:1,C:2}; plano.sort((a,b)=>sevRank[a.sev]-sevRank[b.sev]); return plano;
  }

  /* ---------- PDF ---------- */
  async function gerarPDF(){
    if(!pdfPronto()) return;
    if(!CUR.items.length){ toast(`Adicione ao menos um ${IN}.`); return; }
    toast('Gerando relatório...');
    const h=CUR.h; const K=pdfKit(h); const {doc,W,H,M,INK,band,sec,para,bul,tbl,ensure,TOC}=K;
    const eqs=CUR.items, res=eqs.map(e=>equipResult(e,h));
    const cnt=k=>res.filter(r=>r.k===k).length;
    const eqName=(e,i)=>`${i+1}. ${eqTitle(e)}`;
    const plano=montarPlano(eqs,res);
    let y=K.capa(tx.capa1,tx.capa2,cfg.capaRows(h,eqs.length));

    y=sec('Identificação',y);
    y=tbl({startY:y, columnStyles:{0:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:52}}, body:cfg.identRows(h,eqs.length).map(([k,v])=>[k,v||'-'])});
    y=sec('Objetivo e escopo',y);
    for(const p of tx.objetivo) y=para(p,y);
    if(tx.normas.length){ y=ensure(y,40); y=sec('Normas e documentos de referência',y);
      y=tbl({startY:y, head:[['Referência','Aplicação']], body:tx.normas, columnStyles:{0:{fontStyle:'bold',cellWidth:46,textColor:C_NAVY}}});
      y=para('As normas são aplicadas em suas edições vigentes. Havendo critério específico do fabricante ou do projeto da instalação, ele prevalece sobre os valores de referência deste relatório.',y,{italic:true,size:8,color:C_MUT}); }
    y=ensure(y,60); y=sec('Critérios de avaliação',y);
    y=tbl({startY:y, head:[[`Classificação do ${IN}`,'Significado','Ação']], body:CRIT_GERAL, columnStyles:{0:{cellWidth:42,fontStyle:'bold'},1:{cellWidth:62}},
      didParseCell:c=>{ if(c.section==='body'&&c.column.index===0) c.cell.styles.textColor=C_RES[['ok','att','nc','crit'][c.row.index]]; }});
    y=tbl({startY:y, head:[['Severidade','Significado']], body:['A','B','C'].map(k=>[SEV[k].label,SEV[k].desc]), columnStyles:{0:{cellWidth:42,fontStyle:'bold'}},
      didParseCell:c=>{ if(c.section==='body'&&c.column.index===0) c.cell.styles.textColor=[C_RES.crit,C_RES.nc,C_RES.att][c.row.index]; }});
    if(tx.criterios.length) y=tbl({startY:y, head:[['Grandeza','Limite de referência adotado']], body:tx.criterios, columnStyles:{0:{cellWidth:46,fontStyle:'bold',textColor:C_NAVY}}});
    y=bul('O engenheiro responsável pode ajustar a classificação automática com justificativa técnica registrada na ficha.',y);
    const cond=cfg.condRows?cfg.condRows(h):[];
    if(cond.length){ y=ensure(y,40); y=sec(tx.condSec,y);
      y=tbl({startY:y, columnStyles:{0:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:52}}, body:cond.map(([k,v])=>[k,v||'-'])}); }
    if(tx.metodologia.length){ y=ensure(y,40); y=sec('Metodologia e segurança',y); for(const b of tx.metodologia) y=bul(b,y); }
    if(tx.limitacoes){ y=ensure(y,30); y=sec('Limitações',y); y=para(tx.limitacoes,y); }

    /* resumo */
    doc.addPage(); y=22;
    y=sec('Resumo dos resultados',y);
    const kp=[[INPcap,eqs.length,C_NAVY],['Conformes',cnt('ok'),C_RES.ok],['Atenção',cnt('att'),C_RES.att],['NC – programar',cnt('nc'),C_RES.nc],['NC – urgente',cnt('crit'),C_RES.crit]];
    const kw=(W-2*M-4*3)/5;
    kp.forEach(([l,v,c],i)=>{ const x=M+i*(kw+3); doc.setFillColor(...C_BG); doc.rect(x,y,kw,20,'F'); doc.setFillColor(...c); doc.rect(x,y,kw,1.4,'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(17); doc.setTextColor(...c); doc.text(String(v),x+kw/2,y+11,{align:'center'});
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...C_MUT); doc.text(doc.splitTextToSize(l,kw-2)[0],x+kw/2,y+17,{align:'center'}); });
    y+=26; doc.setTextColor(...INK);
    if(cnt('pend')) y=para(`Atenção: ${cnt('pend')} ${IN}(s) sem avaliação completa.`,y,{italic:true,size:8.5,color:C_RES.crit});
    const headRes=[INcap,'Tipo','Checklist','NC'].concat(comMeds?['Medições fora']:[]).concat(['Classificação']);
    const ci=headRes.length-1;
    y=tbl({startY:y, head:[headRes],
      body:eqs.map((e,i)=>[eqName(e,i), TIPOS[e.tipo].nome, `${res[i].done}/${res[i].total}`, String(res[i].ncs.length)].concat(comMeds?[String(res[i].medBad.length)]:[]).concat([res[i].label])),
      styles:{fontSize:8,cellPadding:1.6,lineColor:C_LINE,lineWidth:.2,textColor:INK,valign:'middle'},
      columnStyles:Object.assign({2:{halign:'center',cellWidth:18},3:{halign:'center',cellWidth:12}},comMeds?{4:{halign:'center',cellWidth:20}}:{},{[ci]:{fontStyle:'bold',cellWidth:36}}),
      didParseCell:c=>{ if(c.section==='body'&&c.column.index===ci) c.cell.styles.textColor=C_RES[res[c.row.index].k]; }});
    if(plano.length){
      y=ensure(y,30); y=sec('Plano de ação – não conformidades e observações',y);
      y=para('Ordenado por severidade: A – urgente, B – programar na próxima parada, C – observação.',y,{size:8,color:C_MUT,italic:true});
      y=tbl({startY:y, head:[['Sev.',INcap,'Item / constatação','Observação']],
        body:plano.map(p=>[p.sev, p.eq+'\n'+p.tipo, p.item, p.obs||'-']),
        styles:{fontSize:8,cellPadding:1.6,lineColor:C_LINE,lineWidth:.2,textColor:INK,valign:'top'},
        columnStyles:{0:{cellWidth:12,halign:'center',fontStyle:'bold'},1:{cellWidth:40},2:{cellWidth:66}},
        didParseCell:c=>{ if(c.section==='body'&&c.column.index===0) c.cell.styles.textColor=plano[c.row.index].sev==='A'?C_RES.crit:plano[c.row.index].sev==='B'?C_RES.nc:C_RES.att; }});
    } else { y=ensure(y,20); y=sec('Plano de ação',y); y=para('Não foram registradas não conformidades ou observações.',y); }
    if(h.obs){ y=ensure(y,20); y=sec('Observações gerais',y); y=para(h.obs,y); }

    /* fichas */
    const fichaSec=K.nextSec(); let fichaTocDone=false, nf=0;
    for(let i=0;i<eqs.length;i++){
      const e=eqs[i], r=res[i], d=e.d, T=TIPOS[e.tipo];
      nf++; doc.addPage(); y=22;
      if(!fichaTocDone){ TOC.push({t:`${fichaSec}. Fichas – ${INP}`,p:doc.getNumberOfPages()}); fichaTocDone=true; }
      const ft=`${fichaSec}.${nf} ${eqName(e,i)} – ${T.nome}`; TOC.push({t:ft,p:doc.getNumberOfPages(),sub:true});
      y=band(ft,y);
      const ident=[['TAG',d.tag||'-',cfg.lblLocal||'Localização',d.local||'-'],['Fabricante',d.fab||'-','Modelo',d.modelo||'-'],['Nº de série',d.serie||'-','Ano',d.ano||'-']];
      const ex=(T.campos||[]).map(c=>[c[1],d[c[0]]||'-']); for(let k=0;k<ex.length;k+=2){ ident.push([ex[k][0],ex[k][1],ex[k+1]?ex[k+1][0]:'',ex[k+1]?ex[k+1][1]:'']); }
      y=tbl({startY:y, columnStyles:{0:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:40},2:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:40}}, body:ident, styles:{fontSize:8,cellPadding:1.5,lineColor:C_LINE,lineWidth:.2,textColor:INK}})-1;
      doc.setFillColor(...C_RES[r.k]); doc.roundedRect(M,y,W-2*M,9,1.5,1.5,'F'); doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(10);
      doc.text(`${r.label}${r.manual?' (manual)':''}  ·  ${RES[r.k].acao}`.slice(0,105),M+3,y+6); doc.setTextColor(...INK); y+=13;
      if(r.manual&&e.just) y=para('Justificativa da classificação: '+e.just,y,{size:8.5});
      y=ensure(y,30);
      const chk=T.items.map(it=>{ const x=(e.items||{})[it[0]]||{}; const st=x.s||''; return [it[1], it[2], st?STATUS[st].label:'—', st==='NC'?(x.sev||it[3]):(st==='A'?'C':'—'), x.obs||'']; });
      y=tbl({startY:y, head:[['Item de inspeção','Ref.','Situação','Sev.','Observação']], body:chk,
        styles:{fontSize:7.6,cellPadding:1.3,lineColor:C_LINE,lineWidth:.2,textColor:INK,valign:'middle'},
        columnStyles:{0:{cellWidth:70},1:{cellWidth:28,textColor:C_MUT},2:{cellWidth:22,fontStyle:'bold',halign:'center'},3:{cellWidth:10,halign:'center',fontStyle:'bold'}},
        didParseCell:c=>{ if(c.section==='body'&&c.column.index===2){ const st=((e.items||{})[T.items[c.row.index][0]]||{}).s; if(st) c.cell.styles.textColor=C_ST[st]; } }});
      if(comMeds){
        const mrows=[]; for(const g of (T.meds||[])) for(const f of g.f){ const v=(e.m||{})[f[0]]; if(v!==undefined&&v!==''){ mrows.push([g.g,f[1],String(v)]); } }
        if(mrows.length){ y=ensure(y,30); y=tbl({startY:y, head:[['Ensaio','Grandeza','Valor medido']], body:mrows, styles:{fontSize:7.6,cellPadding:1.3,lineColor:C_LINE,lineWidth:.2,textColor:INK}, columnStyles:{0:{cellWidth:62,textColor:C_MUT},2:{cellWidth:30,halign:'right',fontStyle:'bold'}}}); }
        if(r.meds.length){ y=ensure(y,25);
          y=tbl({startY:y, head:[['Avaliação','Valor','Limite de referência','Resultado']], body:r.meds.map(x=>[x.label,x.val,x.lim,x.st?(x.st==='ok'?'OK':x.st==='att'?'Atenção':'Não conforme'):'—']),
            styles:{fontSize:7.6,cellPadding:1.3,lineColor:C_LINE,lineWidth:.2,textColor:INK}, columnStyles:{1:{cellWidth:26,halign:'right'},2:{cellWidth:36},3:{cellWidth:24,fontStyle:'bold',halign:'center'}},
            didParseCell:c=>{ if(c.section==='body'&&c.column.index===3){ const st=r.meds[c.row.index].st; if(st) c.cell.styles.textColor=C_RES[st]; } }}); }
      }
      if(T.ext&&comMeds&&T.ext.pdf) y=await T.ext.pdf(K,e,y,h);
      const A=(e.pantes||[])[0], D=(e.pdepois||[])[0];
      if(A||D){ const cw=(W-2*M-6)/2, chh=64; y=ensure(y,chh+12); await K.foto(A,M,y,cw,chh,tx.antes); await K.foto(D,M+cw+6,y,cw,chh,tx.depois); y+=chh+9; }
      if(e.diag){ y=ensure(y,16); y=para((cfg.lblDiag||'Diagnóstico / serviços executados')+': '+e.diag,y,{size:9}); }
      if(e.rec){ y=ensure(y,16); y=para('Recomendações: '+e.rec,y,{size:9}); }
      const extra=[...(e.pantes||[]).slice(1).map(id=>({id,cap:tx.antes+' – adicional'})),...(e.pdepois||[]).slice(1).map(id=>({id,cap:tx.depois+' – adicional'})),...(e.photos||[]).map(id=>({id,cap:'Foto complementar'}))];
      for(const it of T.items){ const x=(e.items||{})[it[0]]; if(x&&x.photos) for(const id of x.photos) extra.push({id,cap:'Item: '+it[1]}); }
      y=await K.galeria(extra,y);
    }

    /* considerações e assinatura */
    y=ensure(y,70); y+=4; y=sec('Considerações finais',y);
    const nUrg=plano.filter(p=>p.sev==='A').length, nProg=plano.filter(p=>p.sev==='B').length;
    y=para(`Foram inspecionados ${eqs.length} ${eqs.length===1?IN:INP}. ${cnt('ok')} em conformidade, ${cnt('att')} com observações, ${cnt('nc')} com não conformidade a programar e ${cnt('crit')} com não conformidade urgente. O plano de ação relaciona ${nUrg} item(ns) de severidade A, ${nProg} de severidade B e ${plano.length-nUrg-nProg} de severidade C.`,y);
    y=para(tx.consideracoes||'Recomenda-se a execução das ações de severidade A de imediato, a programação das de severidade B para a próxima parada e a repetição desta inspeção em periodicidade anual, ou conforme o plano de manutenção da instalação e a criticidade do processo atendido.',y);
    K.assinatura(y, cfg.assinLinha?cfg.assinLinha(h):'');
    const fname=`${slug(tx.arquivo||tx.titulo)}_${(h.numero?slug(h.numero)+'_':'')}${slug(h.cliente||'cliente')}_${h.data||''}.pdf`;
    await K.finish(tx.titulo,fname);
  }

  /* ---------- EXCEL ---------- */
  async function gerarExcel(){
    if(!CUR.items.length){ toast(`Adicione ao menos um ${IN}.`); return; }
    toast('Gerando planilha...');
    if(!(await ensureExcelJS())){ toast('Gerador de Excel não carregou. Verifique a conexão e tente de novo.'); return; }
    const h=CUR.h, eqs=CUR.items, res=eqs.map(e=>equipResult(e,h));
    const wb=novoWb(); const X=xlsxKit(wb,h);
    const {NAVY,BAND,NAVY2,GOLD,LINE,BG,WHITE,INK,MUT,border,fill,font,head,tableHeader,secTitle,cellRow}=X;
    const PC={ok:'FF2E7D32',att:'FFB58600',nc:'FFD35400',crit:'FFC62828',pend:'FF8A93A6'};
    const PF={ok:'FFE3F2E7',att:'FFFFF1D6',nc:'FFFDE7DA',crit:'FFFBE3E1',pend:'FFF3F4F6'};
    const SC={C:'FF2E7D32',A:'FFB58600',NC:'FFC62828',NA:'FF8A93A6'};
    const cnt=k=>res.filter(r=>r.k===k).length;
    const eqName=(e,i)=>`${i+1}. ${eqTitle(e)}`;
    const SUB=`${h.cliente||''}${hTit(h)?' · '+hTit(h):''} · ${fmtDate(h.data)}${h.numero?' · Relatório Nº '+h.numero:''}`;
    X.capa(tx.capa1,tx.capa2,cfg.capaRows(h,eqs.length));

    const w1=wb.addWorksheet('Relatório',{views:[{showGridLines:false}]});
    w1.columns=[{width:32},{width:20},{width:16},{width:14},{width:14},{width:26}];
    let r=head(w1,tx.xlsTitulo,6,SUB);
    const kv=(rows)=>rows.forEach(([k,v])=>{ w1.mergeCells(`B${r}:F${r}`); const a=w1.getCell(`A${r}`), b=w1.getCell(`B${r}`); a.value=k; b.value=(v===''||v==null)?'-':v;
      a.fill=fill(BG); a.font=font({bold:true,color:{argb:NAVY}}); a.border=border; b.border=border; b.font=font(); b.alignment={horizontal:'left',wrapText:true,vertical:'top'}; r++; });
    secTitle(w1,r,'1. Identificação',6); r++; kv(cfg.identRows(h,eqs.length));
    const cond=cfg.condRows?cfg.condRows(h):[];
    if(cond.length){ r++; secTitle(w1,r,'2. '+tx.condSec,6); r++; kv(cond); }
    r++; secTitle(w1,r,(cond.length?'3':'2')+'. Resumo por classificação',6); r++;
    [[INPcap+' inspecionados',eqs.length,NAVY]].forEach(([l,v,c])=>{ const a=w1.getCell(`A${r}`), b=w1.getCell(`B${r}`); a.value=l; b.value=v; a.font=font({bold:true}); b.font=font({bold:true,size:12,color:{argb:c}}); a.border=border; b.border=border; b.alignment={horizontal:'center'}; r++; });
    ['ok','att','nc','crit','pend'].forEach(k=>{ const a=w1.getCell(`A${r}`), b=w1.getCell(`B${r}`); a.value=RES[k].label;
      b.value={formula:`COUNTIF('${INPcap}'!H:H,"${RES[k].label}")`, result:cnt(k)}; a.font=font({bold:true,color:{argb:PC[k]}}); b.font=font({bold:true,size:12,color:{argb:PC[k]}});
      a.border=border; b.border=border; b.alignment={horizontal:'center'}; r++; });
    if(h.obs){ r++; secTitle(w1,r,'Observações gerais',6); r++; w1.mergeCells(`A${r}:F${r}`); const c=w1.getCell(`A${r}`); c.value=h.obs; c.alignment={wrapText:true,vertical:'top'}; c.font=font(); w1.getRow(r).height=Math.min(120,Math.max(30,Math.ceil(h.obs.length/90)*14)); r++; }
    r+=2; w1.mergeCells(`C${r}:F${r}`); const sg=w1.getCell(`C${r}`); sg.value=h.resp||'Responsável técnico'; sg.font=font({bold:true}); sg.alignment={horizontal:'center'}; sg.border={top:{style:'thin',color:{argb:NAVY}}};
    r++; w1.mergeCells(`C${r}:F${r}`); const sg2=w1.getCell(`C${r}`); sg2.value=EMPRESA.nome; sg2.font=font({size:9,color:{argb:MUT}}); sg2.alignment={horizontal:'center'};

    const w2=wb.addWorksheet(INPcap,{views:[{state:'frozen',ySplit:5,showGridLines:false}]});
    w2.columns=[6,22,26,20,20,18,12,26,10,12,40,40].map(w=>({width:w}));
    r=head(w2,INPcap.toUpperCase()+' INSPECIONADOS',12,SUB); tableHeader(w2,r,['Nº','TAG','Tipo',cfg.lblLocal||'Localização','Fabricante / modelo','Nº de série','Checklist','Classificação','NC','Medições fora',cfg.lblDiag||'Diagnóstico / serviços','Recomendações']); r++;
    eqs.forEach((e,i)=>{ const x=res[i]; const row=cellRow(w2,r,[i+1,e.d.tag||'-',TIPOS[e.tipo].nome,e.d.local||'-',[e.d.fab,e.d.modelo].filter(Boolean).join(' / ')||'-',e.d.serie||'-',`${x.done}/${x.total}`,x.label,x.ncs.length,x.medBad.length,e.diag||'-',e.rec||'-'],{center:[0,6,8,9]});
      const c=row.getCell(8); c.font=font({bold:true,size:9,color:{argb:PC[x.k]}}); c.fill=fill(PF[x.k]); r++; });
    w2.autoFilter={from:{row:5,column:1},to:{row:r-1,column:12}};

    const w3=wb.addWorksheet('Checklist',{views:[{state:'frozen',ySplit:5,showGridLines:false}]});
    w3.columns=[6,22,26,56,22,14,8,48].map(w=>({width:w}));
    r=head(w3,'CHECKLIST DE INSPEÇÃO',8,SUB); tableHeader(w3,r,['Nº',INcap,'Tipo','Item de inspeção','Referência','Situação','Sev.','Observação']); r++;
    eqs.forEach((e,i)=>{ const T=TIPOS[e.tipo]; for(const it of T.items){ const x=(e.items||{})[it[0]]||{}; const st=x.s||'';
      const row=cellRow(w3,r,[i+1,eqTitle(e),T.nome,it[1],it[2],st?STATUS[st].label:'—',st==='NC'?(x.sev||it[3]):(st==='A'?'C':'—'),x.obs||''],{center:[0,5,6]});
      if(st){ const c=row.getCell(6); c.font=font({bold:true,size:9,color:{argb:SC[st]}}); } r++; } });
    w3.autoFilter={from:{row:5,column:1},to:{row:r-1,column:8}};

    if(comMeds){
      const w4=wb.addWorksheet('Medições',{views:[{state:'frozen',ySplit:5,showGridLines:false}]});
      w4.columns=[6,22,26,40,18,26,14].map(w=>({width:w}));
      r=head(w4,'MEDIÇÕES, ENSAIOS E AVALIAÇÃO',7,SUB); tableHeader(w4,r,['Nº',INcap,'Tipo','Grandeza','Valor','Limite de referência','Resultado']); r++;
      eqs.forEach((e,i)=>{ const T=TIPOS[e.tipo];
        for(const g of (T.meds||[])) for(const f of g.f){ const v=(e.m||{})[f[0]]; if(v===undefined||v==='') continue; cellRow(w4,r,[i+1,eqTitle(e),T.nome,`${g.g} – ${f[1]}`,v,'',''],{center:[0,4]}); r++; }
        if(T.ext&&T.ext.excelRows) for(const x of T.ext.excelRows(e)){ const row=cellRow(w4,r,[i+1,eqTitle(e),T.nome,x[0],x[1],x[2],x[3]],{center:[0,4,6]});
          if(x[4]){ const c=row.getCell(7); c.font=font({bold:true,size:9,color:{argb:PC[x[4]]}}); c.fill=fill(PF[x[4]]); } r++; }
        for(const x of res[i].meds){ const row=cellRow(w4,r,[i+1,eqTitle(e),T.nome,'Avaliação: '+x.label,x.val,x.lim,x.st?(x.st==='ok'?'OK':x.st==='att'?'Atenção':'Não conforme'):'—'],{center:[0,4,6]});
          if(x.st){ const c=row.getCell(7); c.font=font({bold:true,size:9,color:{argb:PC[x.st]}}); c.fill=fill(PF[x.st]); } r++; } });
      w4.autoFilter={from:{row:5,column:1},to:{row:r-1,column:7}};
    }

    const w5=wb.addWorksheet('Plano de ação',{views:[{state:'frozen',ySplit:5,showGridLines:false}]});
    w5.columns=[8,24,26,52,14,40,20,14,16].map(w=>({width:w}));
    r=head(w5,'PLANO DE AÇÃO',9,SUB); tableHeader(w5,r,['Sev.',INcap,'Tipo','Item / constatação','Situação','Observação','Responsável','Prazo','Status']); r++;
    const plano=montarPlano(eqs,res);
    const SEVC={A:PC.crit,B:PC.nc,C:PC.att}, SEVF={A:PF.crit,B:PF.nc,C:PF.att};
    if(!plano.length){ cellRow(w5,r,['','Nenhuma não conformidade ou observação registrada.','','','','','','','']); r++; }
    plano.forEach(p=>{ const row=cellRow(w5,r,[p.sev,p.eq,p.tipo,p.item,STATUS[p.st].label,p.obs,'','','Pendente'],{center:[0,4,7,8]}); const c=row.getCell(1); c.font=font({bold:true,size:10,color:{argb:SEVC[p.sev]}}); c.fill=fill(SEVF[p.sev]); r++; });
    w5.dataValidations.add(`I6:I${Math.max(6,r-1)}`,{type:'list',allowBlank:true,formulae:['"Pendente,Em andamento,Concluído"']});
    w5.autoFilter={from:{row:5,column:1},to:{row:r-1,column:9}};

    const w6=wb.addWorksheet('Normas e critérios',{views:[{showGridLines:false}]});
    w6.columns=[{width:34},{width:90}];
    r=head(w6,'NORMAS E CRITÉRIOS DE AVALIAÇÃO',2,SUB);
    if(tx.normas.length){ secTitle(w6,r,'Normas e documentos de referência',2); r++; tableHeader(w6,r,['Referência','Aplicação']); r++;
      tx.normas.forEach(n=>{ cellRow(w6,r,n); w6.getCell(`A${r}`).font=font({bold:true,size:9,color:{argb:NAVY}}); r++; }); r++; }
    if(tx.criterios.length){ secTitle(w6,r,'Limites de referência adotados',2); r++; tableHeader(w6,r,['Grandeza','Limite']); r++;
      tx.criterios.forEach(n=>{ cellRow(w6,r,n); w6.getCell(`A${r}`).font=font({bold:true,size:9,color:{argb:NAVY}}); r++; }); r++; }
    secTitle(w6,r,'Classificação',2); r++; tableHeader(w6,r,['Classificação','Significado']); r++;
    CRIT_GERAL.forEach((n,i)=>{ cellRow(w6,r,[n[0],n[1]+' '+n[2]]); w6.getCell(`A${r}`).font=font({bold:true,size:9,color:{argb:PC[['ok','att','nc','crit'][i]]}}); r++; });
    r++; secTitle(w6,r,'Severidade das não conformidades',2); r++; tableHeader(w6,r,['Severidade','Descrição']); r++;
    ['A','B','C'].forEach(k=>{ cellRow(w6,r,[SEV[k].label,SEV[k].desc]); w6.getCell(`A${r}`).font=font({bold:true,size:9,color:{argb:SEVC[k]}}); r++; });

    X.contracapa();
    const fname=`${slug(tx.arquivo||tx.titulo)}_${(h.numero?slug(h.numero)+'_':'')}${slug(h.cliente||'cliente')}_${h.data||''}.xlsx`;
    await X.salvar(fname);
  }

  registrar({
    k:cfg.k, nome:cfg.nome, curto:cfg.curto, icone:cfg.icone, desc:cfg.desc,
    novoH:cfg.novoH, photoIds, vJob, vItem,
    resumo:(x)=>{ const eq=x.items||[]; const rs=eq.map(e=>equipResult(e,x.h)); const nc=rs.filter(r=>r.k==='nc'||r.k==='crit').length; const at=rs.filter(r=>r.k==='att').length;
      const w=rs.reduce((a,r)=>(r.k!=='pend'&&(a===null||RANK_RES[r.k]>RANK_RES[a]))?r.k:a,null);
      return {txt:`${hTit(x.h)?hTit(x.h)+' · ':''}${eq.length} ${eq.length===1?IN:INP}${nc?' · '+nc+' NC':''}${at?' · '+at+' atenção':''}`, pill:w?{k:w,t:RES[w].curto}:null}; },
    pdf:gerarPDF, excel:gerarExcel,
  });
  return {TIPOS, equipResult};
}

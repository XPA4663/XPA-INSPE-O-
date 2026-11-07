/* ======================= MÓDULO: TERMOGRAFIA ======================= */
(function(){
/* ======================= CRITÉRIOS (NETA MTS Tab. 100.18) ======================= */
const COMPONENTES=['Barramento','Disjuntor','Seccionadora','Fusível / base','Contator','Relé térmico','Borne / terminal','Cabo / condutor','Conexão / emenda','Transformador','Motor','Inversor / soft-starter','Banco de capacitores','Para-raios','Isolador','Mufla / terminação','Outro'];
const FASES=['—','R','S','T','N','R-S-T'];
const PRIO={
  n:{label:'Normal', sim:'abaixo de 1 °C', amb:'abaixo de 1 °C', acao:'Sem anomalia térmica. Manter no plano de inspeção periódica.'},
  p4:{label:'Prioridade 4', sim:'1 a 3 °C', amb:'1 a 10 °C', acao:'Possível deficiência: investigar.'},
  p3:{label:'Prioridade 3', sim:'4 a 15 °C', amb:'11 a 20 °C', acao:'Provável deficiência: reparar quando possível.'},
  p2:{label:'Prioridade 2', sim:'—', amb:'21 a 40 °C', acao:'Monitorar até que a correção seja feita.'},
  p1:{label:'Prioridade 1', sim:'acima de 15 °C', amb:'acima de 40 °C', acao:'Grande discrepância: reparar imediatamente.'},
  pend:{label:'Incompleto', acao:'Medições incompletas.'},
};
const RANK={n:0,p4:1,p3:2,p2:3,p1:4};
const BYRANK=['n','p4','p3','p2','p1'];
const clsSim=(d)=>d===null?null:(d<1?'n':d<=3?'p4':d<=15?'p3':'p1');
const clsAmb=(d)=>d===null?null:(d<1?'n':d<=10?'p4':d<=20?'p3':d<=40?'p2':'p1');
function photoIds(m){ return [...(m.photos||[]),...(m.ptermo||[]),...(m.pvisual||[]),...Object.values(m.items||{}).flatMap(it=>it.photos||[])]; }
function motorResult(m,h){ // resultado de um ponto
  h=h||(CUR&&CUR.h)||{}; const d=m.d||{}; const tamb=num(d.tamb)!==null?num(d.tamb):num(h.tamb);
  const tp=num(d.tponto), tr=num(d.tref), im=num(d.imed), in_=num(d.inom);
  const dSim=(tp!==null&&tr!==null)?tp-tr:null, dAmb=(tp!==null&&tamb!==null)?tp-tamb:null;
  const carga=(im!==null&&in_)?im/in_*100:null;
  const a=clsSim(dSim), b=clsAmb(dAmb);
  let auto=null; if(a||b) auto=BYRANK[Math.max(a?RANK[a]:0,b?RANK[b]:0)];
  const k=m.manual||auto||'pend';
  return {k,label:PRIO[k].label,auto,dSim,dAmb,tamb,carga,low:carga!==null&&carga<40,manual:!!m.manual,done:!!auto||!!m.manual};
}
function vJob(){
  const h=CUR.h; CUR.items=CUR.items||[];
  $('#app').innerHTML = storageBanner() + `<div class="row" style="margin-bottom:8px"><button id="back">‹ Trabalhos</button></div>
  <div class="sec">Dados da inspeção</div>
  <div class="card" id="hf"><div class="grid">
    ${field('numero','Nº do relatório',h,'text','Ex.: RT-26-001')}
    ${field('data','Data',h,'date')}
    ${field('cliente','Cliente',h)}
    ${field('local','Local / unidade',h)}
    ${field('inspetor','Termografista',h)}
    ${field('qualif','Qualificação (nível / certificado)',h,'text','Ex.: Nível I – ISO 18436-7')}
    ${field('acompanhante','Acompanhante do cliente',h)}
    ${field('resp','Responsável técnico',h)}
  </div></div>
  <div class="sec">Câmera e condições</div>
  <div class="card" id="cf"><div class="grid">
    ${field('camera','Câmera termográfica (modelo)',h)}
    ${field('camSerie','Nº de série',h)}
    ${field('camCal','Calibração válida até',h,'date')}
    ${field('emis','Emissividade padrão',h,'text','0,95',DEC)}
    ${field('tamb','Temperatura ambiente (°C)',h,'text','',DEC)}
    ${field('umid','Umidade relativa (%)',h,'text','',DEC)}
    ${sel('fichasNormais','Fichas de pontos normais no relatório',h,['Sim','Não'])}
  </div>${field('obs','Observações gerais',h,'textarea')}</div>
  <div class="sec">Pontos inspecionados (${CUR.items.length})</div>
  <div class="list">${CUR.items.map((m,i)=>{ const r=motorResult(m); return `<div class="it" data-m="${m.id}"><div style="flex:1"><div class="t">${i+1}. ${esc(m.d.tag||'Sem TAG')}${m.d.fase&&m.d.fase!=='—'?' · '+esc(m.d.fase):''}</div>
    <div class="s">${esc([m.d.componente,m.d.local].filter(Boolean).join(' · '))}${r.dSim!==null?' · ΔT sim. '+f1(r.dSim)+' °C':''}${r.dAmb!==null?' · ΔT amb. '+f1(r.dAmb)+' °C':''}</div></div><span class="pill p-${r.k}">${r.label}</span></div>`;}).join('') || '<div class="empty">Nenhum ponto cadastrado.</div>'}</div>
  `+jobFooter();
  bindFields($('#hf'),h); bindFields($('#cf'),h);
  bindJobFooter();
  document.querySelectorAll('[data-m]').forEach(e=>e.onclick=()=>{ ITEM=CUR.items.find(m=>m.id===e.dataset.m); go('item'); });
  setBar(`<button class="btn" id="addm">+ Adicionar ponto</button><button class="btn gold" id="pdf">Gerar relatório</button>`);
  $('#addm').onclick=()=>{ ITEM=novoPonto(); CUR.items.push(ITEM); saveCur(); go('item'); };
  $('#pdf').onclick=escolherRelatorio;
}
function novoPonto(base){
  const b=base?base.d:{};
  return {id:uid('pt'), d:{tag:b.tag||'',local:b.local||'',componente:b.componente||'Disjuntor',fase:'—',descricao:b.descricao||'',
    tponto:'',tref:'',tamb:'',emis:'',imed:'',inom:b.inom||''}, items:{}, photos:[], ptermo:[], pvisual:[], diag:'', rec:'', manual:'', just:''};
}

function vItem(){
  const m=ITEM, d=m.d; m.ptermo=m.ptermo||[]; m.pvisual=m.pvisual||[]; m.photos=m.photos||[];
  const idx=CUR.items.indexOf(m)+1;
  $('#app').innerHTML = `<div class="row" style="margin-bottom:8px"><button id="back">‹ ${esc(CUR.h.cliente||'Inspeção')}</button></div>
  <div class="card"><div class="result"><div><div style="font-weight:bold;color:var(--navy)" id="rtag">Ponto ${idx} · ${esc(d.tag||'')}</div><div class="note" id="rcalc"></div></div><span class="pill" id="rpill"></span></div>
  <div class="note" id="racao" style="margin-top:6px"></div><div class="banner" id="lowload" style="display:none;margin:8px 0 0">Carga abaixo de 40% da nominal: o ΔT medido pode subestimar o problema (NFPA 70B). Registre a condição e, se possível, repita com carga maior.</div></div>
  <div class="sec">Identificação do ponto</div>
  <div class="card" id="mf"><div class="grid">
    ${field('tag','Equipamento / painel (TAG)',d)}${field('local','Localização',d)}
    ${sel('componente','Componente',d,COMPONENTES)}${sel('fase','Fase',d,FASES)}
  </div>${field('descricao','Descrição do ponto',d,'text','Ex.: borne de saída do disjuntor geral')}</div>
  <div class="sec">Medições</div>
  <div class="card" id="mm"><div class="grid">
    ${field('tponto','Temperatura do ponto (°C)',d,'text','',DEC)}
    ${field('tref','Temperatura de referência – componente similar (°C)',d,'text','',DEC)}
    ${field('tamb','Temperatura ambiente (°C)',d,'text',CUR.h.tamb?'Padrão: '+CUR.h.tamb:'',DEC)}
    ${field('emis','Emissividade',d,'text',CUR.h.emis?'Padrão: '+CUR.h.emis:'0,95',DEC)}
    ${field('imed','Corrente medida (A)',d,'text','',DEC)}
    ${field('inom','Corrente nominal (A)',d,'text','',DEC)}
  </div></div>
  <div class="sec">Imagens</div>
  <div class="card">
    <label>Imagem térmica</label><div class="row">${photoBtns('data-slot="ptermo"')}</div><div class="thumbs" id="th_ptermo"></div>
    <label>Imagem visual</label><div class="row">${photoBtns('data-slot="pvisual"')}</div><div class="thumbs" id="th_pvisual"></div>
    <label>Outras fotos</label><div class="row">${photoBtns('data-slot="photos"')}</div><div class="thumbs" id="th_photos"></div>
  </div>
  <div class="sec">Diagnóstico e classificação</div>
  <div class="card" id="df">
    ${field('diag','Diagnóstico (provável causa)',m,'textarea','Ex.: conexão frouxa ou oxidada no borne da fase S')}
    ${field('rec','Recomendação',m,'textarea','Ex.: desenergizar, limpar e reapertar com torque do fabricante; reinspecionar')}
    ${sel('manual','Classificação',m,[['','Automática (Tabela 100.18 NETA)'],['n','Normal'],['p4','Prioridade 4'],['p3','Prioridade 3'],['p2','Prioridade 2'],['p1','Prioridade 1']])}
    <div id="jwrap">${field('just','Justificativa da classificação manual',m,'textarea')}</div>
  </div>
  <div class="row"><button class="btn ghost" id="dup">Duplicar ponto (outra fase)</button><button class="btn danger" id="delm">Excluir ponto</button></div>`;
  const upd=()=>{ $('#rtag').textContent=`Ponto ${idx} · ${d.tag||''}`; refreshCalc(); };
  bindFields($('#mf'),d,upd); bindFields($('#mm'),d,upd); bindFields($('#df'),m,upd);
  $('#back').onclick=()=>go('job');
  $('#dup').onclick=()=>{ const n=novoPonto(m); const i=CUR.items.indexOf(m); CUR.items.splice(i+1,0,n); ITEM=n; saveCur(); go('item'); toast('Ponto duplicado: informe a fase e as medições.'); };
  $('#delm').onclick=()=>confirmBox('Excluir este ponto?', async()=>{
    for(const p of photoIds(m)) await delDoc(p);
    CUR.items=CUR.items.filter(x=>x!==m); saveCur(); go('job');
  });
  document.querySelectorAll('.pbtn').forEach(btn=>btn.onclick=()=>openPicker(btn.nextElementSibling));
  document.querySelectorAll('input[type=file][data-slot]').forEach(inp=>inp.onchange=async()=>{
    const files=[...inp.files]; inp.value=''; const slot=inp.dataset.slot;
    for(const f of files){
      try{
        const ph=await compress(f); const id=uid('ph');
        const body={kind:'photo', id, insp:CUR.id, motor:m.id, item:slot, data:ph.data, w:ph.w, h:ph.h, at:Date.now()};
        photoCache[id]=body; await writeDoc(id, body);
        m[slot].push(id); saveCur();
      }catch(e){ photoError(f,e); break; }
    }
    drawSlot(slot);
  });
  const drawSlot=(slot)=>drawThumbs('th_'+slot, m[slot], id=>{ m[slot]=m[slot].filter(x=>x!==id); });
  ['ptermo','pvisual','photos'].forEach(drawSlot);
  refreshCalc();
  setBar(`<button class="btn" id="nx">Próximo ponto</button><button class="btn gold" id="pdf2">Gerar relatório</button>`);
  $('#nx').onclick=()=>{ const i=CUR.items.indexOf(m); if(i<CUR.items.length-1){ ITEM=CUR.items[i+1]; go('item'); } else go('job'); };
  $('#pdf2').onclick=escolherRelatorio;
}
function refreshCalc(){
  const m=ITEM, r=motorResult(m);
  $('#rpill').className='pill p-'+r.k; $('#rpill').textContent=r.label;
  $('#rcalc').textContent=`ΔT similar: ${r.dSim!==null?f1(r.dSim)+' °C':'-'} · ΔT ambiente: ${r.dAmb!==null?f1(r.dAmb)+' °C':'-'} · Carga: ${r.carga!==null?Math.round(r.carga)+'%':'-'}`;
  $('#racao').textContent = r.k==='pend' ? 'Informe a temperatura do ponto e a de referência ou a ambiente.' : (PRIO[r.k].acao + (r.manual?' (classificação manual)':''));
  $('#lowload').style.display = r.low?'block':'none';
  $('#jwrap').style.display = m.manual?'block':'none';
}

const C_PRIO={n:[46,125,50],p4:[29,111,184],p3:[181,134,0],p2:[211,84,0],p1:[198,40,40],pend:[138,147,166]};
const NORMAS = [
  ['ABNT NBR 15424', 'Ensaios não destrutivos – Termografia – Terminologia'],
  ['ABNT NBR 15572', 'Ensaios não destrutivos – Termografia – Guia para inspeção de equipamentos elétricos e mecânicos'],
  ['ABNT NBR 15763', 'Termografia – Critérios de definição de periodicidade de inspeção em sistemas elétricos de potência'],
  ['ABNT NBR 15866', 'Termografia – Metodologia de avaliação de temperatura de trabalho de equipamentos em sistemas elétricos'],
  ['ABNT NBR 16818', 'Termografia infravermelha – Procedimento para realização de inspeções e ensaios termográficos'],
  ['ABNT NBR 16969', 'Termografia infravermelha – Princípios gerais (emissividade e temperatura refletida)'],
  ['ABNT NBR ISO 18436-7', 'Qualificação e avaliação de pessoal – Termografia'],
  ['ANSI/NETA MTS', 'Tabela 100.18 – Ações sugeridas com base na elevação de temperatura'],
  ['NFPA 70B', 'Manutenção de equipamentos elétricos – condição mínima de carga para a inspeção'],
  ['NR-10', 'Segurança em instalações e serviços em eletricidade'],
];

async function gerarPDF(){
  if(!pdfPronto()) return;
  if(!CUR.items.length){ toast('Adicione ao menos um ponto.'); return; }
  toast('Gerando relatório...');
  const h=CUR.h; const K=pdfKit(h); const {doc,W,H,M,INK,LIGHT,band,sec,para,bul,tbl,ensure,TOC}=K;
  const title='Relatório de Inspeção Termográfica';
  const pts=CUR.items, res=pts.map(m=>motorResult(m,h));
  const cnt=k=>res.filter(r=>r.k===k).length;
  const anom=pts.map((m,i)=>({m,r:res[i],i})).filter(x=>!['n','pend'].includes(x.r.k)).sort((a,b)=>RANK[b.r.k]-RANK[a.r.k]);
  const ptName=(m,i)=>`${i+1}. ${m.d.tag||'-'}${m.d.fase&&m.d.fase!=='—'?' · fase '+m.d.fase:''}`;
  let y=K.capa('Relatório de Inspeção Termográfica','Instalações Elétricas',[['CLIENTE',h.cliente],['LOCAL',h.local],['DATA DA INSPEÇÃO',fmtDate(h.data)],['TERMOGRAFISTA',h.inspetor],['PONTOS INSPECIONADOS',String(pts.length)],['EMISSÃO',fmtDate(today())]]);

  y=sec('Identificação',y);
  y=tbl({startY:y, columnStyles:{0:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:52}},
    body:[['Relatório Nº',h.numero||'-'],['Cliente',h.cliente||'-'],['Local / unidade',h.local||'-'],['Data da inspeção',fmtDate(h.data)||'-'],
      ['Termografista',h.inspetor||'-'],['Qualificação',h.qualif||'-'],['Acompanhante do cliente',h.acompanhante||'-'],['Responsável técnico',h.resp||'-'],['Pontos inspecionados',String(pts.length)],['Data de emissão',fmtDate(today())]]});

  y=sec('Objetivo e escopo',y);
  y=para('Este relatório apresenta o resultado da inspeção termográfica nas instalações elétricas indicadas, com o objetivo de identificar pontos com aquecimento anormal, como conexões frouxas ou oxidadas, contatos desgastados, sobrecarga e desequilíbrio entre fases, antes que evoluam para falhas, paradas não programadas ou incêndio.',y);
  y=para('Para cada ponto foram registradas a temperatura do ponto, a temperatura de um componente similar sob carga semelhante, a temperatura ambiente, a corrente de carga, a imagem térmica e a imagem visual.',y);

  y=ensure(y,40); y=sec('Normas e documentos de referência',y);
  y=tbl({startY:y, head:[['Referência','Aplicação']], body:NORMAS, columnStyles:{0:{fontStyle:'bold',cellWidth:42,textColor:C_NAVY}}});
  y=para('As normas são aplicadas em suas edições vigentes. Havendo critério específico do fabricante do equipamento, ele prevalece.',y,{italic:true,size:8,color:C_MUT});

  y=ensure(y,60); y=sec('Critérios de avaliação',y);
  y=para('A classificação segue a Tabela 100.18 da ANSI/NETA MTS. O ΔT é avaliado de duas formas: em relação a um componente similar sob carga semelhante (método mais confiável) e em relação à temperatura ambiente. Vale a pior das duas classificações.',y);
  y=tbl({startY:y, head:[['Classificação','ΔT – componente similar','ΔT – ambiente','Ação recomendada']],
    body:['p1','p2','p3','p4','n'].map(k=>[PRIO[k].label,PRIO[k].sim,PRIO[k].amb,PRIO[k].acao]),
    columnStyles:{0:{cellWidth:30,fontStyle:'bold'},1:{cellWidth:34,halign:'center'},2:{cellWidth:30,halign:'center'}},
    didParseCell:c=>{ if(c.section==='body'&&c.column.index===0) c.cell.styles.textColor=C_PRIO[['p1','p2','p3','p4','n'][c.row.index]]; }});
  y=bul('Como o aquecimento é proporcional ao quadrado da corrente, a carga influencia muito o ΔT. Recomenda-se inspecionar com carga de pelo menos 40% da nominal (NFPA 70B). Pontos abaixo disso são sinalizados no relatório.',y);
  y=bul('O termografista pode ajustar a classificação com justificativa técnica registrada na ficha do ponto, por exemplo com base em critério do fabricante ou no histórico do equipamento.',y);

  y=ensure(y,40); y=sec('Condições da inspeção e equipamento',y);
  y=tbl({startY:y, columnStyles:{0:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:52}},
    body:[['Câmera termográfica',h.camera||'-'],['Nº de série',h.camSerie||'-'],['Calibração válida até',fmtDate(h.camCal)||'-'],['Emissividade padrão',h.emis||'-'],
      ['Temperatura ambiente',h.tamb?h.tamb+' °C':'-'],['Umidade relativa',h.umid?h.umid+' %':'-']]});

  y=ensure(y,40); y=sec('Metodologia e segurança',y);
  y=bul('Inspeção com os equipamentos energizados e em carga, comparando fases e componentes similares do mesmo circuito.',y);
  y=bul('Ajuste de emissividade e de temperatura refletida na câmera, conforme o tipo de superfície (ABNT NBR 16969).',y);
  y=bul('Atividade executada por profissional autorizado, com EPI e vestimenta adequados ao risco de arco elétrico, mantendo a distância de segurança e com acompanhante do cliente (NR-10). Painéis abertos somente com autorização da operação.',y);
  y=bul('Registro da corrente de carga de cada ponto e das imagens térmica e visual.',y);

  y=ensure(y,30); y=sec('Limitações',y);
  y=para('A termografia mede apenas a temperatura das superfícies visíveis à câmera. Componentes atrás de barreiras, tampas ou vidros comuns não são medidos corretamente. Superfícies metálicas polidas têm baixa emissividade e podem indicar temperatura menor que a real. Os resultados representam a condição de carga e de operação no momento da inspeção.',y);

  /* ---------- RESUMO ---------- */
  doc.addPage(); y=22;
  y=sec('Resumo dos resultados',y);
  const kp=[['Pontos',pts.length,C_NAVY],['Normais',cnt('n'),C_PRIO.n],['Prioridade 4',cnt('p4'),C_PRIO.p4],['Prioridade 3',cnt('p3'),C_PRIO.p3],['Prioridade 2',cnt('p2'),C_PRIO.p2],['Prioridade 1',cnt('p1'),C_PRIO.p1]];
  const kw=(W-2*M-5*3)/6;
  kp.forEach(([l,v,c],i)=>{ const x=M+i*(kw+3); doc.setFillColor(...C_BG); doc.rect(x,y,kw,20,'F'); doc.setFillColor(...c); doc.rect(x,y,kw,1.4,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(17); doc.setTextColor(...c); doc.text(String(v),x+kw/2,y+11,{align:'center'});
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...C_MUT); doc.text(l,x+kw/2,y+17,{align:'center'}); });
  y+=26; doc.setTextColor(...INK);
  if(cnt('pend')) y=para(`Atenção: ${cnt('pend')} ponto(s) com medições incompletas.`,y,{italic:true,size:8.5,color:C_PRIO.p1});
  y=tbl({startY:y, head:[['Ponto','Componente','T ponto','ΔT sim.','ΔT amb.','Carga','Classificação']],
    body:pts.map((m,i)=>[ptName(m,i), m.d.componente||'-', m.d.tponto?f1(num(m.d.tponto))+' °C':'-', res[i].dSim!==null?f1(res[i].dSim):'-', res[i].dAmb!==null?f1(res[i].dAmb):'-', res[i].carga!==null?Math.round(res[i].carga)+'%':'-', res[i].label]),
    styles:{fontSize:8,cellPadding:1.6,lineColor:C_LINE,lineWidth:.2,textColor:INK,valign:'middle'},
    columnStyles:{2:{halign:'center',cellWidth:18},3:{halign:'center',cellWidth:16},4:{halign:'center',cellWidth:16},5:{halign:'center',cellWidth:14},6:{fontStyle:'bold',cellWidth:27}},
    didParseCell:c=>{ if(c.section==='body'){ if(c.column.index===6) c.cell.styles.textColor=C_PRIO[res[c.row.index].k]; if(c.column.index===5&&res[c.row.index].low) c.cell.styles.textColor=C_PRIO.p2; } }});
  y=para('ΔT em °C. Carga em vermelho-alaranjado: abaixo de 40% da nominal.',y,{italic:true,size:7.5,color:C_MUT});

  if(anom.length){
    y=ensure(y,30); y=sec('Anomalias encontradas e recomendações',y);
    y=tbl({startY:y, head:[['Ponto','Classificação','Diagnóstico','Recomendação']],
      body:anom.map(({m,r,i})=>[ptName(m,i)+(m.d.componente?'\n'+m.d.componente:''), r.label, m.diag||'-', m.rec||PRIO[r.k].acao]),
      styles:{fontSize:8,cellPadding:1.6,lineColor:C_LINE,lineWidth:.2,textColor:INK,valign:'top'},
      columnStyles:{0:{cellWidth:38},1:{cellWidth:24,fontStyle:'bold'}},
      didParseCell:c=>{ if(c.section==='body'&&c.column.index===1) c.cell.styles.textColor=C_PRIO[anom[c.row.index].r.k]; }});
  }
  if(h.obs){ y=ensure(y,20); y=sec('Observações gerais',y); y=para(h.obs,y); }

  /* ---------- FICHAS ---------- */
  const fichaSec=K.nextSec(); let fichaTocDone=false, nf=0;
  const incluirNormais=(h.fichasNormais||'Sim')==='Sim';
  for(let i=0;i<pts.length;i++){
    const m=pts[i], r=res[i], d=m.d;
    if(!incluirNormais && (r.k==='n')) continue;
    nf++; doc.addPage(); y=22;
    if(!fichaTocDone){ TOC.push({t:`${fichaSec}. Fichas dos pontos inspecionados`,p:doc.getNumberOfPages()}); fichaTocDone=true; }
    const ft=`${fichaSec}.${nf} Ponto ${ptName(m,i)}`; TOC.push({t:ft,p:doc.getNumberOfPages(),sub:true});
    y=band(ft,y);
    y=tbl({startY:y, columnStyles:{0:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:34},2:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:34}},
      body:[['Equipamento',d.tag||'-','Localização',d.local||'-'],['Componente',d.componente||'-','Fase',d.fase||'-'],
        ['Corrente medida',d.imed?d.imed+' A':'-','Corrente nominal',d.inom?d.inom+' A':'-'],['Carga',r.carga!==null?Math.round(r.carga)+'%':'-','Emissividade',d.emis||h.emis||'-'],
        [{content:'Descrição',styles:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY}},{content:d.descricao||'-',colSpan:3}]]})-1;
    y=tbl({startY:y, head:[['T ponto','T referência','T ambiente','ΔT similar','ΔT ambiente']],
      body:[[d.tponto?f1(num(d.tponto))+' °C':'-', d.tref?f1(num(d.tref))+' °C':'-', r.tamb!==null?f1(r.tamb)+' °C':'-', r.dSim!==null?f1(r.dSim)+' °C':'-', r.dAmb!==null?f1(r.dAmb)+' °C':'-']],
      styles:{fontSize:9,cellPadding:2,halign:'center',lineColor:C_LINE,lineWidth:.2,textColor:INK}, headStyles:{fillColor:[19,36,74],textColor:255,halign:'center'}})-1;
    doc.setFillColor(...C_PRIO[r.k]); doc.roundedRect(M,y,W-2*M,9,1.5,1.5,'F'); doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text(`${r.label}${r.manual?' (manual)':''}  ·  ${PRIO[r.k].acao}`.slice(0,110),M+3,y+6); doc.setTextColor(...INK); y+=13;
    if(r.low) y=para('Carga abaixo de 40% da nominal no momento da medição: o ΔT pode estar subestimado.',y,{italic:true,size:8,color:C_PRIO.p2});
    if(r.manual&&m.just) y=para('Justificativa da classificação: '+m.just,y,{size:8.5});
    // imagens térmica e visual lado a lado
    const T=(m.ptermo||[])[0], V=(m.pvisual||[])[0];
    if(T||V){
      const cw=(W-2*M-6)/2, chh=64; y=ensure(y,chh+12);
      const draw=async(id,x,cap)=>{ doc.setDrawColor(...C_LINE); doc.rect(x,y,cw,chh); const P=id?await getPhoto(id):null;
        if(P){ const k=Math.min(cw/P.w,chh/P.h); try{ doc.addImage(P.data,'JPEG',x+(cw-P.w*k)/2,y+(chh-P.h*k)/2,P.w*k,P.h*k); }catch(e){} }
        else { doc.setFontSize(8); doc.setTextColor(...C_MUT); doc.text('Sem imagem',x+cw/2,y+chh/2,{align:'center'}); }
        doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...C_NAVY); doc.text(cap,x,y+chh+4); doc.setTextColor(...INK); };
      await draw(T,M,'Imagem térmica'); await draw(V,M+cw+6,'Imagem visual'); y+=chh+9;
    }
    if(m.diag){ y=ensure(y,16); y=para('Diagnóstico: '+m.diag,y,{size:9}); }
    if(m.rec){ y=ensure(y,16); y=para('Recomendação: '+m.rec,y,{size:9,bold:false}); }
    const extra=[...(m.ptermo||[]).slice(1).map(id=>({id,cap:'Imagem térmica adicional'})),...(m.pvisual||[]).slice(1).map(id=>({id,cap:'Imagem visual adicional'})),...(m.photos||[]).map(id=>({id,cap:'Foto complementar'}))];
    if(extra.length){
      y=ensure(y,80); y=band('Imagens complementares',y);
      const cw=(W-2*M-6)/2, chh=60; let col=0;
      for(const p of extra){
        const P=await getPhoto(p.id); if(!P) continue;
        if(col===0) y=ensure(y,chh+10);
        const x=M+col*(cw+6); const k=Math.min(cw/P.w, chh/P.h);
        doc.setDrawColor(...C_LINE); doc.rect(x,y,cw,chh);
        try{ doc.addImage(P.data,'JPEG',x+(cw-P.w*k)/2,y+(chh-P.h*k)/2,P.w*k,P.h*k); }catch(e){}
        doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...C_MUT); doc.text(p.cap,x,y+chh+3.5); doc.setTextColor(...INK);
        col++; if(col===2){ col=0; y+=chh+9; }
      }
      if(col===1) y+=chh+9;
    }
  }

  /* ---------- CONSIDERAÇÕES E ASSINATURA ---------- */
  y=ensure(y,70); y+=4; y=sec('Considerações finais',y);
  y=para(`Foram inspecionados ${pts.length} ponto(s): ${cnt('n')} normal(is), ${cnt('p4')} de prioridade 4, ${cnt('p3')} de prioridade 3, ${cnt('p2')} de prioridade 2 e ${cnt('p1')} de prioridade 1. Os pontos de prioridade 1 devem ser corrigidos de imediato. Após cada correção, recomenda-se nova termografia para confirmar a eliminação do aquecimento. A periodicidade das próximas inspeções deve seguir a ABNT NBR 15763 e a criticidade das instalações.`,y);
  K.assinatura(y, h.inspetor?`Termografista: ${h.inspetor}${h.qualif?' – '+h.qualif:''}`:'');
  const fname=`Relatorio_Inspecao_Termografica_${(h.numero?h.numero+'_':'')}${(h.cliente||'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w]+/g,'_')}_${h.data||''}.pdf`;
  await K.finish(title,fname);
}

async function gerarExcel(){
  if(!CUR.items.length){ toast('Adicione ao menos um ponto.'); return; }
  toast('Gerando planilha...');
  if(!(await ensureExcelJS())){ toast('Gerador de Excel não carregou. Verifique a conexão e tente de novo.'); return; }
  const h=CUR.h, pts=CUR.items, res=pts.map(m=>motorResult(m,h));
  const wb=novoWb(); const X=xlsxKit(wb,h);
  const {NAVY,BAND,NAVY2,GOLD,LINE,BG,WHITE,INK,MUT,b64,logoW,border,fill,font,colL,setRow,head,tableHeader,secTitle,navySheet,put}=X;
  const PC={n:'FF2E7D32',p4:'FF1D6FB8',p3:'FFB58600',p2:'FFD35400',p1:'FFC62828',pend:'FF8A93A6'};
  const PF={n:'FFE3F2E7',p4:'FFE3EEF9',p3:'FFFFF1D6',p2:'FFFDE7DA',p1:'FFFBE3E1',pend:'FFF3F4F6'};
  const cnt=k=>res.filter(r=>r.k===k).length;
  const temImg=pts.some(m=>photoIds(m).length);

  /* ---- Capa ---- */
  X.capa('Relatório de Inspeção Termográfica','Instalações Elétricas',[['CLIENTE',h.cliente],['LOCAL',h.local],['DATA DA INSPEÇÃO',fmtDate(h.data)],['TERMOGRAFISTA',h.inspetor],['PONTOS INSPECIONADOS',String(pts.length)],['EMISSÃO',fmtDate(today())]]);

  /* ---- Sumário ---- */
  const wsum=wb.addWorksheet('Sumário',{views:[{showGridLines:false}]}); wsum.columns=[{width:6},{width:30},{width:62}];
  let sr=head(wsum,'SUMÁRIO',3); tableHeader(wsum,sr,['Nº','Aba','Conteúdo']); wsum.getRow(sr).height=20; sr++;
  const abas=[['Relatório','Identificação, câmera e condições, resumo por classificação e assinatura'],['Pontos','Todos os pontos com temperaturas, ΔT, carga e classificação (calculados por fórmula)'],
    ['Anomalias','Plano de ação com prioridade, responsável, prazo e situação'],['Normas e critérios','Normas de referência, Tabela 100.18 NETA, metodologia e limitações']]
    .concat(temImg?[['Imagens','Imagens térmicas e visuais de cada ponto']]:[]).concat([['Contracapa','Contatos da XPA Engenharia']]);
  abas.forEach(([n,dsc],i)=>{ const row=wsum.getRow(sr); row.height=20; const c1=row.getCell(1), c2=row.getCell(2), c3=row.getCell(3);
    c1.value=i+1; c2.value={text:n, hyperlink:`#'${n}'!A1`}; c3.value=dsc;
    [c1,c2,c3].forEach(c=>{ c.border=border; c.alignment={vertical:'middle',wrapText:true}; });
    c1.font=font({bold:true,color:{argb:'FFB58600'}}); c1.alignment={horizontal:'center',vertical:'middle'}; c2.font=font({bold:true,underline:true,color:{argb:NAVY2}}); c3.font=font({size:9}); sr++; });

  /* ---- Relatório ---- */
  const w1=wb.addWorksheet('Relatório',{views:[{showGridLines:false}]});
  w1.columns=[{width:30},{width:18},{width:16},{width:14},{width:14},{width:24}];
  let r=head(w1,'RELATÓRIO DE INSPEÇÃO TERMOGRÁFICA',6);
  const kv=(rows)=>rows.forEach(([k,v])=>{ w1.mergeCells(`B${r}:F${r}`); const a=w1.getCell(`A${r}`), b=w1.getCell(`B${r}`); a.value=k; b.value=(v===''||v==null)?'-':v;
    a.fill=fill(BG); a.font=font({bold:true,color:{argb:NAVY}}); a.border=border; b.border=border; b.font=font(); b.alignment={horizontal:'left'}; r++; });
  secTitle(w1,r,'1. Identificação',6); r++;
  kv([['Relatório Nº',h.numero],['Cliente',h.cliente],['Local / unidade',h.local],['Data da inspeção',fmtDate(h.data)],['Termografista',h.inspetor],['Qualificação',h.qualif],['Acompanhante do cliente',h.acompanhante],['Responsável técnico',h.resp],['Data de emissão',fmtDate(today())]]);
  r++; secTitle(w1,r,'2. Câmera e condições da inspeção',6); r++;
  kv([['Câmera termográfica',h.camera],['Nº de série',h.camSerie],['Calibração válida até',fmtDate(h.camCal)],['Emissividade padrão',h.emis],['Temperatura ambiente (°C)',h.tamb],['Umidade relativa (%)',h.umid]]);
  r++; secTitle(w1,r,'3. Resumo por classificação',6); r++;
  const p0=r+1;
  [['Pontos inspecionados',pts.length,NAVY]].forEach(([l,v,c])=>{ const a=w1.getCell(`A${r}`), b=w1.getCell(`B${r}`); a.value=l; b.value=v; a.font=font({bold:true}); b.font=font({bold:true,size:12,color:{argb:c}}); a.border=border; b.border=border; b.alignment={horizontal:'center'}; r++; });
  ['n','p4','p3','p2','p1','pend'].forEach(k=>{ const a=w1.getCell(`A${r}`), b=w1.getCell(`B${r}`); a.value=PRIO[k].label;
    b.value={formula:`COUNTIF(Pontos!S:S,"${PRIO[k].label}")`, result:cnt(k)}; a.font=font({bold:true,color:{argb:PC[k]}}); b.font=font({bold:true,size:12,color:{argb:PC[k]}});
    a.border=border; b.border=border; b.alignment={horizontal:'center'}; r++; });
  if(h.obs){ r++; secTitle(w1,r,'Observações gerais',6); r++; w1.mergeCells(`A${r}:F${r}`); const c=w1.getCell(`A${r}`); c.value=h.obs; c.alignment={wrapText:true,vertical:'top'}; c.font=font(); w1.getRow(r).height=Math.max(18,Math.ceil(h.obs.length/95)*14); r++; }
  r+=2; w1.mergeCells(`C${r}:F${r}`); const sg=w1.getCell(`C${r}`); sg.value=h.resp||'Responsável técnico'; sg.font=font({bold:true}); sg.alignment={horizontal:'center'}; sg.border={top:{style:'thin',color:{argb:NAVY}}};
  r++; w1.mergeCells(`C${r}:F${r}`); const sg2=w1.getCell(`C${r}`); sg2.value='XPA Engenharia, Manutenção e Comércio Ltda.'; sg2.font=font({size:9,color:{argb:MUT}}); sg2.alignment={horizontal:'center'};

  /* ---- Pontos (com fórmulas) ---- */
  const w2=wb.addWorksheet('Pontos',{views:[{state:'frozen',ySplit:5,xSplit:2,showGridLines:false}]});
  const hd=['Nº','Equipamento (TAG)','Localização','Componente','Fase','Descrição','T ponto (°C)','T referência (°C)','T ambiente (°C)','ΔT similar (°C)','ΔT ambiente (°C)','I medida (A)','I nominal (A)','Carga (%)','Emissividade','Nível ΔT similar','Nível ΔT ambiente','Classificação manual','Classificação final','Diagnóstico','Recomendação','Justificativa'];
  w2.columns=[6,16,16,16,6,26,10,11,10,10,10,9,9,8,9,8,8,14,15,30,30,24].map(w=>({width:w}));
  r=head(w2,'PONTOS INSPECIONADOS',hd.length); tableHeader(w2,r,hd); r++;
  const first=r;
  pts.forEach((m,i)=>{ const d=m.d, x=res[i]; const row=w2.getRow(r);
    const tamb=num(d.tamb)!==null?num(d.tamb):num(h.tamb);
    setRow(row,[i+1,d.tag,d.local,d.componente,d.fase==='—'?'':d.fase,d.descricao,num(d.tponto),num(d.tref),tamb,null,null,num(d.imed),num(d.inom),null,num(d.emis)!==null?num(d.emis):num(h.emis),null,null,m.manual?PRIO[m.manual].label:'',null,m.diag||'',m.rec||'',m.just||'']);
    row.getCell(10).value={formula:`IF(OR(G${r}="",H${r}=""),"",G${r}-H${r})`, result:x.dSim!==null?Math.round(x.dSim*10)/10:''};
    row.getCell(11).value={formula:`IF(OR(G${r}="",I${r}=""),"",G${r}-I${r})`, result:x.dAmb!==null?Math.round(x.dAmb*10)/10:''};
    row.getCell(14).value={formula:`IF(OR(L${r}="",M${r}="",M${r}=0),"",L${r}/M${r})`, result:x.carga!==null?x.carga/100:''};
    row.getCell(16).value={formula:`IF(J${r}="","",IF(J${r}<1,0,IF(J${r}<=3,1,IF(J${r}<=15,2,4))))`, result:''};
    row.getCell(17).value={formula:`IF(K${r}="","",IF(K${r}<1,0,IF(K${r}<=10,1,IF(K${r}<=20,2,IF(K${r}<=40,3,4)))))`, result:''};
    row.getCell(19).value={formula:`IF(R${r}<>"",R${r},IF(AND(P${r}="",Q${r}=""),"Incompleto",CHOOSE(MAX(P${r},Q${r})+1,"Normal","Prioridade 4","Prioridade 3","Prioridade 2","Prioridade 1")))`, result:x.label};
    row.eachCell({includeEmpty:true},c=>{ c.border=border; c.font=font({size:9}); c.alignment={vertical:'top',wrapText:true}; });
    [7,8,9,10,11].forEach(k=>row.getCell(k).numFmt='0.0'); row.getCell(14).numFmt='0%'; row.getCell(15).numFmt='0.00';
    [16,17].forEach(k=>row.getCell(k).font=font({size:8,color:{argb:MUT}}));
    [7,8,9,12,13,15,18].forEach(k=>row.getCell(k).fill=fill('FFFFFDE7'));
    row.getCell(19).font=font({size:9,bold:true,color:{argb:PC[x.k]}}); row.getCell(19).fill=fill(PF[x.k]);
    if(x.low) row.getCell(14).font=font({size:9,bold:true,color:{argb:PC.p2}});
    r++; });
  const last=r-1;
  if(w2.dataValidations && pts.length) w2.dataValidations.add(`R${first}:R${last}`,{type:'list',allowBlank:true,formulae:['"Normal,Prioridade 4,Prioridade 3,Prioridade 2,Prioridade 1"']});
  w2.autoFilter={from:{row:5,column:1},to:{row:5,column:hd.length}};
  r++; w2.mergeCells(`A${r}:${colL(hd.length)}${r}`); const nt=w2.getCell(`A${r}`);
  nt.value='Células em amarelo são editáveis: ΔT, carga e classificação são recalculados por fórmula (Tabela 100.18 ANSI/NETA MTS). Nível: 0 = normal, 1 = prioridade 4, 2 = prioridade 3, 3 = prioridade 2, 4 = prioridade 1. A classificação manual, quando preenchida, prevalece.';
  nt.font=font({italic:true,size:8,color:{argb:MUT}}); nt.alignment={wrapText:true}; w2.getRow(r).height=28;

  /* ---- Anomalias ---- */
  const w4=wb.addWorksheet('Anomalias',{views:[{state:'frozen',ySplit:5,showGridLines:false}]});
  const nc=['Nº','Equipamento','Componente / fase','ΔT similar','ΔT ambiente','Classificação','Diagnóstico','Recomendação','Responsável','Prazo','Situação'];
  w4.columns=[5,16,18,9,9,14,30,34,16,12,14].map(w=>({width:w}));
  r=head(w4,'PLANO DE AÇÃO – ANOMALIAS TÉRMICAS',nc.length); tableHeader(w4,r,nc); r++;
  const anom=pts.map((m,i)=>({m,x:res[i],i})).filter(o=>!['n','pend'].includes(o.x.k)).sort((a,b)=>RANK[b.x.k]-RANK[a.x.k]);
  const r0=r;
  anom.forEach(({m,x,i})=>{ const row=w4.getRow(r);
    setRow(row,[i+1,m.d.tag||'-',[m.d.componente,m.d.fase&&m.d.fase!=='—'?m.d.fase:''].filter(Boolean).join(' · '),x.dSim!==null?Math.round(x.dSim*10)/10:'',x.dAmb!==null?Math.round(x.dAmb*10)/10:'',x.label,m.diag||'',m.rec||PRIO[x.k].acao,'','','Aberta']);
    row.eachCell({includeEmpty:true},c=>{ c.border=border; c.font=font({size:9}); c.alignment={vertical:'top',wrapText:true}; });
    row.getCell(6).fill=fill(PF[x.k]); row.getCell(6).font=font({size:9,bold:true,color:{argb:PC[x.k]}});
    row.getCell(10).numFmt='dd/mm/yyyy'; [9,10,11].forEach(k=>row.getCell(k).fill=fill('FFFFFDE7')); r++; });
  if(!anom.length){ w4.mergeCells(`A${r}:K${r}`); w4.getCell(`A${r}`).value='Nenhuma anomalia térmica registrada.'; w4.getCell(`A${r}`).font=font({italic:true,color:{argb:MUT}}); }
  else { if(w4.dataValidations) w4.dataValidations.add(`K${r0}:K${r-1}`,{type:'list',allowBlank:true,formulae:['"Aberta,Em andamento,Concluída,Reinspecionada"']});
    w4.autoFilter={from:{row:5,column:1},to:{row:5,column:nc.length}}; }

  /* ---- Normas e critérios ---- */
  const w5=wb.addWorksheet('Normas e critérios',{views:[{showGridLines:false}]});
  w5.columns=[{width:24},{width:22},{width:18},{width:46}];
  r=head(w5,'NORMAS E CRITÉRIOS DE AVALIAÇÃO',4);
  secTitle(w5,r,'Normas e documentos de referência',4); r++; tableHeader(w5,r,['Referência','Aplicação','','']); w5.mergeCells(`B${r}:D${r}`); w5.getRow(r).height=20; r++;
  NORMAS.forEach(([a,b])=>{ w5.mergeCells(`B${r}:D${r}`); const x=w5.getCell(`A${r}`), y=w5.getCell(`B${r}`); x.value=a; y.value=b; x.font=font({bold:true,color:{argb:NAVY},size:9}); y.font=font({size:9}); y.alignment={wrapText:true}; x.border=border; y.border=border; r++; });
  r++; secTitle(w5,r,'Tabela 100.18 – ANSI/NETA MTS (vale a pior das duas comparações)',4); r++; tableHeader(w5,r,['Classificação','ΔT – componente similar','ΔT – ambiente','Ação recomendada']); r++;
  ['p1','p2','p3','p4','n'].forEach(k=>{ const row=w5.getRow(r); setRow(row,[PRIO[k].label,PRIO[k].sim,PRIO[k].amb,PRIO[k].acao]);
    row.eachCell(c=>{ c.border=border; c.font=font({size:9}); c.alignment={wrapText:true,vertical:'top'}; }); row.getCell(1).fill=fill(PF[k]); row.getCell(1).font=font({size:9,bold:true,color:{argb:PC[k]}});
    [2,3].forEach(i=>row.getCell(i).alignment={horizontal:'center',vertical:'top'}); r++; });
  const txt=(t,hgt)=>{ r++; w5.mergeCells(`A${r}:D${r}`); const c=w5.getCell(`A${r}`); c.value=t; c.alignment={wrapText:true,vertical:'top'}; c.font=font({size:9}); w5.getRow(r).height=hgt; r++; };
  txt('Carga: como o aquecimento é proporcional ao quadrado da corrente, recomenda-se inspecionar com pelo menos 40% da carga nominal (NFPA 70B). Pontos abaixo disso são sinalizados.',30);
  secTitle(w5,r,'Metodologia e segurança',4); r++;
  txt('Inspeção com equipamentos energizados e em carga, comparando fases e componentes similares; ajuste de emissividade e temperatura refletida (ABNT NBR 16969); profissional autorizado com EPI e vestimenta adequados ao risco de arco elétrico, distância de segurança e acompanhante do cliente (NR-10).',44);
  secTitle(w5,r,'Limitações',4); r++;
  txt('A termografia mede apenas superfícies visíveis à câmera. Componentes atrás de barreiras, tampas ou vidros comuns não são medidos corretamente; superfícies metálicas polidas podem indicar temperatura menor que a real. Os resultados representam a condição de carga no momento da inspeção.',44);

  /* ---- Imagens ---- */
  if(temImg){
    const w6=wb.addWorksheet('Imagens',{views:[{showGridLines:false}]});
    w6.columns=[{width:45},{width:3},{width:45}];
    r=head(w6,'IMAGENS TÉRMICAS E VISUAIS',3);
    for(let i=0;i<pts.length;i++){
      const m=pts[i]; const ids=[[(m.ptermo||[])[0],'Térmica'],[(m.pvisual||[])[0],'Visual']]; const extra=[...(m.ptermo||[]).slice(1),...(m.pvisual||[]).slice(1),...(m.photos||[])];
      if(!ids[0][0]&&!ids[1][0]&&!extra.length) continue;
      w6.mergeCells(`A${r}:C${r}`); const t=w6.getCell(`A${r}`); t.value=`Ponto ${i+1} · ${m.d.tag||'-'}${m.d.fase&&m.d.fase!=='—'?' · fase '+m.d.fase:''} · ${res[i].label}`;
      t.font=font({bold:true,color:{argb:WHITE},size:10}); t.fill=fill(BAND); w6.getRow(r).height=20; r++;
      const pairs=[...ids.filter(x=>x[0]),...extra.map(id=>[id,'Complementar'])];
      let col=0;
      for(const [id,cap] of pairs){
        const P=await getPhoto(id); if(!P) continue;
        const k=Math.min(310/P.w,230/P.h); const img=wb.addImage({base64:b64(P.data),extension:'jpeg'});
        for(let q=0;q<12;q++) w6.getRow(r+q).height=20;
        w6.addImage(img,{tl:{col:col===0?0.05:2.05,row:r-1+0.1},ext:{width:Math.round(P.w*k),height:Math.round(P.h*k)}});
        const cc=w6.getCell(r+12,col===0?1:3); cc.value=`Imagem ${cap.toLowerCase()}`; cc.font=font({size:8,color:{argb:MUT}});
        col++; if(col===2){ col=0; r+=14; }
      }
      if(col===1) r+=14; r++;
    }
  }

  /* ---- Contracapa ---- */
  X.contracapa();
  const fname=`Relatorio_Inspecao_Termografica_${(h.numero?h.numero+'_':'')}${(h.cliente||'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w]+/g,'_')}_${h.data||''}.xlsx`;
  await X.salvar(fname);
}
registrar({
  k:'termo', nome:'Inspeção termográfica', curto:'Termografia', icone:'🌡️',
  desc:'Pontos quentes em painéis e equipamentos – classificação NETA Tab. 100.18, PDF e Excel.',
  novoH:()=>({inspetor:'', qualif:'', acompanhante:'', camera:'', camSerie:'', camCal:'', emis:'0,95', tamb:'', umid:'', fichasNormais:'Sim'}),
  photoIds, vJob, vItem,
  resumo:(x)=>{ const n=(x.items||[]).length; const an=(x.items||[]).filter(m=>{ const k=motorResult(m,x.h).k; return k!=='n'&&k!=='pend'; }).length;
    const worst=(x.items||[]).reduce((a,m)=>{ const k=motorResult(m,x.h).k; return (k!=='pend'&&(a===null||RANK[k]>RANK[a]))?k:a; },null);
    return {txt:`${n} ponto${n===1?'':'s'}${an?' · '+an+' anomalia'+(an>1?'s':''):''}`, pill:worst?{k:worst,t:PRIO[worst].label}:null}; },
  pdf:gerarPDF, excel:gerarExcel,
});
})();

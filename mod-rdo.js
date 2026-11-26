/* ======================= MÓDULO: RDO – RELATÓRIO DIÁRIO DE OBRA =======================
   Um trabalho = um dia de obra. Dados da obra, clima, efetivo (com horas), atividades com fotos,
   equipamentos/materiais, segurança, ocorrências e assinaturas na tela (XPA e fiscal do cliente).
   "Novo RDO – dia seguinte" copia obra e efetivo e numera em sequência. */
(function(){
const CLIMA=['Bom','Nublado','Chuva leve','Chuva forte'];
const TRAB=['Praticável','Impraticável'];
const ST_AT=['Em andamento','Concluída','Iniciada','Paralisada','Não iniciada'];
const AC=['Nenhum','Quase-acidente','Acidente sem afastamento','Acidente com afastamento'];
const SN=['Sim','Não'];
const hm=(s)=>{ const m=/^(\d{1,2}):(\d{2})$/.exec(String(s||'').trim()); return m?(+m[1])*60+(+m[2]):null; };
const fmtH=(min)=>min==null?'-':`${Math.floor(min/60)}h${String(Math.round(min%60)).padStart(2,'0')}`;
function horasPessoa(p,h){ const a=hm(p.ent), b=hm(p.sai); if(a==null||b==null) return null; let t=b-a; if(t<0) t+=1440; const iv=hm(h.intervalo); if(iv&&t>iv) t-=iv; return t; }
const totalHH=(h)=>(h.efetivo||[]).reduce((s,p)=>s+(horasPessoa(p,h)||0),0);
const proxNum=(n)=>{ const m=/^(.*?)(\d+)\s*$/.exec(String(n||'')); return m?m[1]+String(+m[2]+1).padStart(m[2].length,'0'):''; };

(function(){ if(document.getElementById('rdo-css')) return; const st=document.createElement('style'); st.id='rdo-css'; st.textContent=`
.rdo-ef{display:grid;grid-template-columns:1.6fr 1.2fr .8fr .8fr auto;gap:6px;align-items:end;margin-bottom:6px}
.rdo-ef input{min-width:0}.rdo-ef .x{padding:6px 10px}
.rdo-ass{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rdo-ass .box{border:1px dashed #B8C2D6;border-radius:8px;min-height:90px;display:flex;align-items:center;justify-content:center;background:#fff;cursor:pointer}
.rdo-ass img{max-width:100%;max-height:86px}
.rdo-pad{width:100%;height:200px;border:1px solid #D5DAE2;border-radius:8px;background:#fff;touch-action:none}
@media(max-width:520px){.rdo-ef{grid-template-columns:1fr 1fr}.rdo-ass{grid-template-columns:1fr}}`; document.head.appendChild(st); })();

function novoH(){ return {numero:'RDO-001', os:'', servico:'', encarregado:'', fiscal:'', horaIni:'07:00', horaFim:'17:00', intervalo:'01:00',
  clima_m:'Bom', clima_t:'Bom', trab_m:'Praticável', trab_t:'Praticável', efetivo:[], terceiros:'', equip:'', materiais:'',
  dds:'Sim', apr:'Sim', pt:'Sim', epi:'Sim', acidente:'Nenhum', ocorrencias:'', paralisacao:'', pendCliente:'', prox:'', assXpa:'', assCli:'', assCliNome:'', assXpaNome:''}; }
function novaAtiv(){ return {id:uid('at'), desc:'', local:'', status:'Em andamento', avanco:'', obs:'', photos:[]}; }
const photoIds=(it)=>it.photos||[];

/* ---------- tela do dia ---------- */
function vJob(){
  const h=CUR.h; CUR.items=CUR.items||[]; h.efetivo=h.efetivo||[];
  const ats=CUR.items;
  $('#app').innerHTML=storageBanner()+`<div class="row" style="margin-bottom:8px"><button id="back">‹ Trabalhos</button><button id="novoDia" style="margin-left:auto">＋ Novo RDO – dia seguinte</button></div>
  <div class="sec">Obra e dia</div>
  <div class="card hdr"><div class="grid">
    ${field('numero','Nº do RDO',h,'text','Ex.: RDO-001')}${field('data','Data',h,'date')}
    ${field('cliente','Cliente',h)}${field('local','Obra / unidade / endereço',h)}
    ${field('os','OS / proposta / contrato',h,'text','Ex.: 11_26079')}${field('servico','Serviço / frente de trabalho',h)}
    ${field('encarregado','Encarregado XPA',h)}${field('fiscal','Fiscal do cliente',h)}
    ${field('horaIni','Início da jornada',h,'time')}${field('horaFim','Término da jornada',h,'time')}
    ${field('intervalo','Intervalo (descontado das horas)',h,'time')}
  </div></div>
  <div class="sec">Condições do tempo</div>
  <div class="card hdr"><div class="grid">
    ${sel('clima_m','Clima – manhã',h,CLIMA)}${sel('trab_m','Condição – manhã',h,TRAB)}
    ${sel('clima_t','Clima – tarde',h,CLIMA)}${sel('trab_t','Condição – tarde',h,TRAB)}
  </div></div>
  <div class="sec">Efetivo (${h.efetivo.length}) · <span id="hh">${fmtH(totalHH(h))}</span> trabalhadas</div>
  <div class="card" id="ef">${h.efetivo.map((p,i)=>`<div class="rdo-ef" data-i="${i}">
      <div><label>Nome</label><input data-p="nome" value="${esc(p.nome)}"></div>
      <div><label>Função</label><input data-p="funcao" value="${esc(p.funcao)}" list="dl_funcao"></div>
      <div><label>Entrada</label><input type="time" data-p="ent" value="${esc(p.ent)}"></div>
      <div><label>Saída</label><input type="time" data-p="sai" value="${esc(p.sai)}"></div>
      <button class="x danger" data-rm="${i}" title="Remover">×</button></div>`).join('')||'<div class="empty">Ninguém lançado.</div>'}
    <datalist id="dl_funcao"><option value="Engenheiro"><option value="Técnico eletrotécnico"><option value="Eletricista"><option value="Eletricista de MT"><option value="Ajudante"><option value="Encarregado"><option value="Técnico de segurança"></datalist>
    <button class="lbtn" id="addp" style="margin-top:6px">+ Adicionar pessoa</button>
    <div class="hdr" style="margin-top:8px">${field('terceiros','Terceiros / subcontratados no local',h,'text','Empresa, quantidade e função')}</div></div>
  <div class="sec">Atividades executadas (${ats.length})</div>
  ${ats.length?`<div class="list">${ats.map((a,i)=>`<div class="it" data-a="${a.id}"><div style="font-size:20px">🔧</div><div style="flex:1"><div class="t">${i+1}. ${esc(a.desc||'(sem descrição)')}</div>
    <div class="s">${a.local?esc(a.local)+' · ':''}${esc(a.status)}${a.avanco?' · '+esc(a.avanco)+' %':''} · ${(a.photos||[]).length} foto(s)</div></div></div>`).join('')}</div>`:'<div class="empty">Nenhuma atividade lançada.</div>'}
  <div class="sec">Equipamentos e materiais</div>
  <div class="card hdr">${field('equip','Equipamentos / instrumentos utilizados',h,'textarea','Ex.: caminhão munck, megômetro, termovisor…')}
    ${field('materiais','Materiais recebidos / aplicados',h,'textarea')}</div>
  <div class="sec">Segurança do trabalho</div>
  <div class="card hdr"><div class="grid">
    ${sel('dds','DDS realizado',h,SN)}${sel('apr','APR emitida',h,SN.concat(['Não aplicável']))}
    ${sel('pt','PT / liberação emitida',h,SN.concat(['Não aplicável']))}${sel('epi','EPI / EPC conforme',h,SN)}
    ${sel('acidente','Acidente / incidente',h,AC)}
  </div></div>
  <div class="sec">Ocorrências</div>
  <div class="card hdr">${field('paralisacao','Paralisações (motivo e horário)',h,'textarea','Ex.: chuva 13h–15h; aguardando liberação da área')}
    ${field('ocorrencias','Ocorrências / interferências',h,'textarea')}
    ${field('pendCliente','Pendências e solicitações ao cliente',h,'textarea')}
    ${field('prox','Programação para o próximo dia',h,'textarea')}
    ${field('obs','Observações gerais',h,'textarea')}</div>
  <div class="sec">Assinaturas</div>
  <div class="card"><div class="rdo-ass">
    <div><label>Responsável XPA</label><div class="box" data-ass="assXpa">${h.assXpa?`<img src="${h.assXpa}">`:'<span class="note">Toque para assinar</span>'}</div>
      <div class="hdr">${field('assXpaNome','Nome',h,'text',h.encarregado||'')}</div></div>
    <div><label>Fiscal do cliente</label><div class="box" data-ass="assCli">${h.assCli?`<img src="${h.assCli}">`:'<span class="note">Toque para assinar</span>'}</div>
      <div class="hdr">${field('assCliNome','Nome',h,'text',h.fiscal||'')}</div></div>
  </div></div>`+jobFooter();
  document.querySelectorAll('.hdr').forEach(el=>bindFields(el,h));
  bindJobFooter();
  document.querySelectorAll('.rdo-ef').forEach(row=>{ const p=h.efetivo[+row.dataset.i];
    row.querySelectorAll('[data-p]').forEach(inp=>{ const fn=()=>{ p[inp.dataset.p]=inp.value; saveCur(); $('#hh').textContent=fmtH(totalHH(h)); }; inp.oninput=fn; inp.onchange=fn; }); });
  document.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{ h.efetivo.splice(+b.dataset.rm,1); saveCur(); vJob(); });
  $('#addp').onclick=()=>{ h.efetivo.push({nome:'',funcao:'',ent:h.horaIni||'',sai:h.horaFim||''}); saveCur(); vJob(); };
  document.querySelectorAll('[data-a]').forEach(el=>el.onclick=()=>{ ITEM=CUR.items.find(a=>a.id===el.dataset.a); go('item'); });
  document.querySelectorAll('[data-ass]').forEach(el=>el.onclick=()=>assinar(el.dataset.ass));
  $('#novoDia').onclick=novoDia;
  setBar(`<button class="btn" id="adda">+ Atividade</button><button class="btn gold" id="pdf">Gerar RDO</button>`);
  $('#adda').onclick=()=>{ ITEM=novaAtiv(); CUR.items.push(ITEM); saveCur(); go('item'); };
  $('#pdf').onclick=escolherRelatorio;
}

/* ---------- atividade ---------- */
function vItem(){
  const a=ITEM; a.photos=a.photos||[]; const idx=CUR.items.indexOf(a)+1;
  $('#app').innerHTML=`<div class="row" style="margin-bottom:8px"><button id="back">‹ RDO ${esc(CUR.h.numero||'')}</button></div>
  <div class="sec">Atividade ${idx}</div>
  <div class="card" id="af">${field('desc','Descrição da atividade',a,'textarea','O que foi executado')}
    <div class="grid">${field('local','Local / equipamento',a)}${sel('status','Situação',a,ST_AT)}${field('avanco','Avanço acumulado (%)',a,'text','',DEC)}</div>
    ${field('obs','Observações',a,'textarea')}</div>
  <div class="sec">Fotos</div>
  <div class="card"><div class="row">${photoBtns('data-slot="photos"')}</div><div class="thumbs" id="th_photos"></div></div>
  <div class="row" style="margin-top:14px"><button class="btn danger" id="dela">Excluir atividade</button></div>`;
  bindFields($('#af'),a);
  $('#back').onclick=()=>go('job');
  $('#dela').onclick=()=>confirmBox('Excluir esta atividade e as fotos?',async()=>{ for(const p of a.photos) await delDoc(p); CUR.items=CUR.items.filter(x=>x!==a); saveCur(); go('job'); });
  const draw=()=>drawThumbs('th_photos',a.photos,id=>a.photos.splice(a.photos.indexOf(id),1));
  document.querySelectorAll('.pbtn').forEach(btn=>btn.onclick=()=>openPicker(btn.nextElementSibling));
  document.querySelectorAll('input[type=file][data-slot]').forEach(inp=>inp.onchange=async()=>{
    const files=[...inp.files]; inp.value='';
    for(const f of files){ try{ const ph=await compress(f); const id=uid('ph');
        const body={kind:'photo',id,insp:CUR.id,equip:a.id,item:'photos',data:ph.data,w:ph.w,h:ph.h,at:Date.now()};
        photoCache[id]=body; await writeDoc(id,body); a.photos.push(id); saveCur(); }catch(err){ photoError(f,err); break; } }
    draw(); });
  draw();
  setBar(`<button class="btn" id="nova">+ Outra atividade</button><button class="btn gold" id="volta">Concluir</button>`);
  $('#nova').onclick=()=>{ ITEM=novaAtiv(); CUR.items.push(ITEM); saveCur(); go('item'); };
  $('#volta').onclick=()=>go('job');
}

/* ---------- assinatura na tela ---------- */
function assinar(k){
  $('#mbox').innerHTML=`<p style="margin-top:0;font-weight:bold;color:var(--navy)">${k==='assCli'?'Assinatura do fiscal do cliente':'Assinatura do responsável XPA'}</p>
  <canvas class="rdo-pad" id="pad"></canvas>
  <div class="row" style="justify-content:space-between;margin-top:8px"><button id="plim">Limpar</button><span><button id="pcan">Cancelar</button> <button class="btn gold" id="pok">Salvar</button></span></div>`;
  $('#modal').classList.add('show');
  const c=$('#pad'), r=c.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
  c.width=r.width*dpr; c.height=r.height*dpr; const g=c.getContext('2d'); g.scale(dpr,dpr);
  g.lineWidth=2.2; g.lineCap='round'; g.lineJoin='round'; g.strokeStyle='#0A1733';
  let des=false, vaz=true; const pos=e=>{ const b=c.getBoundingClientRect(); return [e.clientX-b.left,e.clientY-b.top]; };
  c.onpointerdown=e=>{ des=true; vaz=false; c.setPointerCapture(e.pointerId); const [x,y]=pos(e); g.beginPath(); g.moveTo(x,y); };
  c.onpointermove=e=>{ if(!des) return; const [x,y]=pos(e); g.lineTo(x,y); g.stroke(); };
  c.onpointerup=c.onpointercancel=()=>{ des=false; };
  $('#plim').onclick=()=>{ g.clearRect(0,0,c.width,c.height); vaz=true; };
  $('#pcan').onclick=()=>$('#modal').classList.remove('show');
  $('#pok').onclick=()=>{ if(vaz){ CUR.h[k]=''; } else {
      const o=document.createElement('canvas'); const s=Math.min(1,600/c.width); o.width=c.width*s; o.height=c.height*s;
      o.getContext('2d').drawImage(c,0,0,o.width,o.height); CUR.h[k]=o.toDataURL('image/png'); }
    saveCur(); $('#modal').classList.remove('show'); vJob(); };
}

/* ---------- novo RDO do dia seguinte ---------- */
function novoDia(){
  const o=CUR.h; flushSave();
  const keep=['cliente','local','os','servico','encarregado','fiscal','horaIni','horaFim','intervalo','resp','assXpaNome','assCliNome','terceiros','equip'];
  const h=Object.assign({numero:'',cliente:'',local:'',data:today(),resp:RESP_PADRAO,obs:''},novoH());
  keep.forEach(k=>{ if(o[k]!==undefined) h[k]=o[k]; });
  h.numero=proxNum(o.numero)||''; h.data=today();
  h.efetivo=(o.efetivo||[]).map(p=>({nome:p.nome,funcao:p.funcao,ent:h.horaIni||p.ent,sai:h.horaFim||p.sai}));
  h.ocorrencias=o.prox?('Programado no RDO anterior: '+o.prox):'';
  const items=(CUR.items||[]).filter(a=>a.status!=='Concluída').map(a=>({id:uid('at'),desc:a.desc,local:a.local,status:'Em andamento',avanco:a.avanco,obs:'',photos:[]}));
  const n={kind:'job',mod:'rdo',id:uid('rdo'),createdAt:Date.now(),updatedAt:Date.now(),h,items,uid:UID||undefined};
  INSPS.push(n); CUR=n; writeDoc(n.id,JSON.parse(JSON.stringify(n))); go('job');
  toast(`${h.numero||'Novo RDO'} criado: obra, efetivo e atividades em andamento copiados.`);
}

/* ---------- PDF ---------- */
async function gerarPDF(){
  if(!pdfPronto()) return; const h=CUR.h; toast('Gerando RDO...');
  const K=pdfKit(h,{rotulo:'RELATÓRIO DIÁRIO DE OBRA',semSumario:true,contraTexto:'Dúvidas sobre este RDO ou sobre o andamento da obra?'});
  const {doc,W,M,para,tbl,ensure,band}=K;
  let y=K.capa('Relatório Diário','de Obra',[['CLIENTE',h.cliente],['OBRA',h.local],['SERVIÇO',h.servico],['OS / CONTRATO',h.os],['DATA',fmtDate(h.data)],['EMISSÃO',fmtDate(today())]]);
  const kv={columnStyles:{0:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:44},2:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:40}}};
  y=band('Identificação',y);
  y=tbl(Object.assign({startY:y,body:[['RDO Nº',h.numero||'-','Data',fmtDate(h.data)],['Cliente',h.cliente||'-','OS / contrato',h.os||'-'],
    ['Obra / local',h.local||'-','Serviço',h.servico||'-'],['Encarregado XPA',h.encarregado||'-','Fiscal do cliente',h.fiscal||'-'],
    ['Jornada',`${h.horaIni||'-'} às ${h.horaFim||'-'}`,'Intervalo',h.intervalo||'-']]},kv));
  y=band('Condições do tempo',y);
  y=tbl({startY:y,head:[['Período','Clima','Condição de trabalho']],body:[['Manhã',h.clima_m,h.trab_m],['Tarde',h.clima_t,h.trab_t]],
    didParseCell:c=>{ if(c.section==='body'&&c.column.index===2&&c.cell.raw==='Impraticável') c.cell.styles.textColor=C_RES.nc; }});
  y=ensure(y,30); y=band(`Efetivo – ${(h.efetivo||[]).length} pessoa(s) · ${fmtH(totalHH(h))} trabalhadas`,y);
  if((h.efetivo||[]).length) y=tbl({startY:y,head:[['Nome','Função','Entrada','Saída','Horas']],
    body:h.efetivo.map(p=>[p.nome||'-',p.funcao||'-',p.ent||'-',p.sai||'-',fmtH(horasPessoa(p,h))]),columnStyles:{2:{halign:'center'},3:{halign:'center'},4:{halign:'center'}}});
  else y=para('Sem efetivo lançado.',y,{italic:true,color:C_MUT});
  if(h.terceiros) y=para('Terceiros no local: '+h.terceiros,y);
  y=ensure(y,30); y=band('Atividades executadas',y);
  const ats=CUR.items||[];
  if(ats.length) y=tbl({startY:y,head:[['#','Atividade','Local / equipamento','Situação','Avanço']],
    body:ats.map((a,i)=>[String(i+1),a.desc+(a.obs?'\nObs.: '+a.obs:''),a.local||'-',a.status,a.avanco?a.avanco+' %':'-']),
    columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:78},3:{cellWidth:26},4:{cellWidth:17,halign:'center'}}});
  else y=para('Nenhuma atividade lançada.',y,{italic:true,color:C_MUT});
  const blocos=[['Equipamentos / instrumentos',h.equip],['Materiais',h.materiais]].filter(b=>b[1]);
  if(blocos.length){ y=ensure(y,25); y=band('Equipamentos e materiais',y); y=tbl(Object.assign({startY:y,body:blocos},{columnStyles:{0:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:44}}})); }
  y=ensure(y,30); y=band('Segurança do trabalho',y);
  y=tbl(Object.assign({startY:y,body:[['DDS realizado',h.dds,'APR emitida',h.apr],['PT / liberação',h.pt,'EPI / EPC conforme',h.epi],['Acidente / incidente',h.acidente,'','']],
    didParseCell:c=>{ if(c.section==='body'&&(c.column.index===1||c.column.index===3)&&(c.cell.raw==='Não'||/Acidente|Quase/.test(c.cell.raw||''))) c.cell.styles.textColor=C_RES.nc; }},kv));
  const oc=[['Paralisações',h.paralisacao],['Ocorrências / interferências',h.ocorrencias],['Pendências do cliente',h.pendCliente],['Programação do próximo dia',h.prox],['Observações',h.obs]].filter(b=>b[1]);
  if(oc.length){ y=ensure(y,25); y=band('Ocorrências e programação',y); y=tbl({startY:y,body:oc,columnStyles:{0:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:44}}}); }
  const fotos=ats.flatMap((a,i)=>(a.photos||[]).map((id,j)=>({id,cap:`Atividade ${i+1}${a.local?' – '+a.local:''}${(a.photos.length>1)?' ('+(j+1)+')':''}`})));
  if(fotos.length) y=await K.galeria(fotos,y,'Registro fotográfico');
  // assinaturas
  y=ensure(y,48); y=band('Assinaturas',y); y+=4; const cw=(W-2*M-10)/2;
  [[h.assXpa,h.assXpaNome||h.encarregado,'Responsável XPA – '+EMPRESA.nome.split(',')[0]],[h.assCli,h.assCliNome||h.fiscal,'Fiscal do cliente – '+(h.cliente||'')]].forEach(([img,nome,sub],i)=>{
    const x=M+i*(cw+10);
    if(img){ try{ doc.addImage(img,'PNG',x+cw/2-30,y,60,20); }catch(e){} }
    doc.setDrawColor(...C_NAVY); doc.setLineWidth(0.3); doc.line(x+5,y+22,x+cw-5,y+22);
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...C_NAVY); doc.text(nome||' ',x+cw/2,y+27,{align:'center'});
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...C_MUT); doc.text(doc.splitTextToSize(sub,cw)[0],x+cw/2,y+31.5,{align:'center'}); });
  const fname=`RDO_${slug(h.numero||'')}_${slug(h.cliente||'cliente')}_${h.data||''}.pdf`;
  await K.finish('Relatório Diário de Obra',fname);
}

/* ---------- Excel (planilha editável) ---------- */
async function gerarExcel(){
  try{ await ensureExcelJS(); }catch(e){ toast('Gerador de Excel não carregou. Verifique a conexão.'); return; }
  const h=CUR.h, wb=novoWb(), X=xlsxKit(wb,h);
  const ws=wb.addWorksheet('RDO',{views:[{showGridLines:false}]}); ws.columns=[{width:26},{width:34},{width:22},{width:16},{width:12}];
  let r=X.head(ws,`RELATÓRIO DIÁRIO DE OBRA ${h.numero||''}`,5);
  const bloco=(t,rows)=>{ X.secTitle(ws,r,t,5); r++; rows.forEach(v=>{ X.cellRow(ws,r,v); r++; }); r++; };
  bloco('Identificação',[['RDO Nº',h.numero],['Data',fmtDate(h.data)],['Cliente',h.cliente],['Obra / local',h.local],['OS / contrato',h.os],['Serviço',h.servico],['Encarregado XPA',h.encarregado],['Fiscal do cliente',h.fiscal],['Jornada',`${h.horaIni||''} às ${h.horaFim||''} (intervalo ${h.intervalo||''})`]]);
  bloco('Condições do tempo',[['Manhã',h.clima_m,h.trab_m],['Tarde',h.clima_t,h.trab_t]]);
  X.secTitle(ws,r,'Efetivo',5); r++; X.tableHeader(ws,r,['Nome','Função','Entrada','Saída','Horas']); r++;
  (h.efetivo||[]).forEach(p=>{ X.cellRow(ws,r,[p.nome,p.funcao,p.ent,p.sai,fmtH(horasPessoa(p,h))]); r++; });
  X.cellRow(ws,r,['Total','','','',fmtH(totalHH(h))]); ws.getRow(r).font=X.font({bold:true,size:9}); r+=2;
  X.secTitle(ws,r,'Atividades executadas',5); r++; X.tableHeader(ws,r,['Atividade','Observações','Local / equipamento','Situação','Avanço %']); r++;
  (CUR.items||[]).forEach(a=>{ X.cellRow(ws,r,[a.desc,a.obs,a.local,a.status,a.avanco]); r++; }); r++;
  bloco('Equipamentos e materiais',[['Equipamentos / instrumentos',h.equip],['Materiais',h.materiais]]);
  bloco('Segurança do trabalho',[['DDS realizado',h.dds],['APR emitida',h.apr],['PT / liberação',h.pt],['EPI / EPC conforme',h.epi],['Acidente / incidente',h.acidente]]);
  bloco('Ocorrências e programação',[['Paralisações',h.paralisacao],['Ocorrências',h.ocorrencias],['Pendências do cliente',h.pendCliente],['Próximo dia',h.prox],['Observações',h.obs]]);
  bloco('Assinaturas',[['Responsável XPA',h.assXpaNome||h.encarregado,h.assXpa?'assinado na tela':''],['Fiscal do cliente',h.assCliNome||h.fiscal,h.assCli?'assinado na tela':'']]);
  await X.salvar(`RDO_${slug(h.numero||'')}_${slug(h.cliente||'cliente')}_${h.data||''}.xlsx`);
}

registrar({
  k:'rdo', nome:'RDO – Relatório diário de obra', curto:'RDO', icone:'📅', anexos:['anexDoc'],
  desc:'Um relatório por dia: clima, efetivo e horas, atividades com fotos, segurança, ocorrências e assinaturas do encarregado e do fiscal do cliente.',
  novoH, photoIds, vJob, vItem,
  resumo:(x)=>{ const h=x.h||{}; const n=(x.items||[]).length; const imp=h.trab_m==='Impraticável'||h.trab_t==='Impraticável';
    return {txt:`${h.local?h.local+' · ':''}${(h.efetivo||[]).length} pessoa(s) · ${n} atividade(s)`, pill:h.acidente&&h.acidente!=='Nenhum'?{k:'nc',t:'Ocorrência SST'}:imp?{k:'att',t:'Impraticável'}:(h.assCli?{k:'ok',t:'Assinado'}:null)}; },
  pdf:gerarPDF, excel:gerarExcel,
  pendencias:(x)=>{ const h=x.h||{}, out=[]; if(!(h.efetivo||[]).length) out.push('Efetivo não lançado'); if(!(x.items||[]).length) out.push('Nenhuma atividade lançada');
    if(!h.assXpa) out.push('Falta assinatura do responsável XPA'); if(!h.assCli) out.push('Falta assinatura do fiscal do cliente'); return out; },
});
})();

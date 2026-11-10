/* ======================= MÓDULO: ENSAIO VLF E TANGENTE DELTA EM CABOS DE POTÊNCIA =======================
   Um item = um circuito de cabo (3 fases). Resistência de isolamento, tangente delta em 0,5/1,0/1,5 U0,
   estabilidade (desvio padrão), tensão suportável VLF, critérios IEEE 400.2, gráfico e diagrama ilustrativo. */
(function(){
function svgPng(svg,w){ return new Promise(res=>{ const m=svg.match(/viewBox="0 0 (\d+) (\d+)"/); const W0=+m[1],H0=+m[2]; const k=w/W0;
  const img=new Image(); const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  img.onload=()=>{ const c=document.createElement('canvas'); c.width=W0*k; c.height=H0*k; const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url); res({data:c.toDataURL('image/png'),w:W0,h:H0}); };
  img.onerror=()=>{ URL.revokeObjectURL(url); res(null); }; img.src=url; }); }
const NAVY='#0A1733', ORG='#E85A24', GRN='#2F8F4E', GOLD='#F4B400', MUT='#6B7385', LINE='#D5DAE2';
const FASES=[['a','A',NAVY],['b','B',ORG],['c','C',GRN]];
// IEEE 400.2 – critérios de avaliação de tangente delta para cabos envelhecidos em serviço (×10⁻³)
// [sem ação necessária <, ação requerida >] ; entre os dois: investigação adicional recomendada
const CRIT={
  'XLPE / PE': {td:[4,50],   dtd:[5,80],  sd:[0.1,0.5]},
  'EPR':       {td:[35,120], dtd:[5,100], sd:[0.1,1.3]},
};
const crit=(d)=>CRIT[d.isol]||null;
const ev3=(v,[a,b])=>v===null?null:(v<a?'ok':v<=b?'att':'nc');
const LBL={ok:'Sem ação necessária', att:'Investigação adicional', nc:'Ação requerida'};
function u0kV(d){ const x=num(d.u0); if(x!==null) return x; const m=String(d.un||'').match(/[\d.,]+/); return m?num(m[0]):null; }
function ukV(d){ const p=String(d.un||'').split('/'); return p.length>1?num(p[1]):(u0kV(d)!==null?u0kV(d)*Math.sqrt(3):null); }
function fase(m,k){ const v=x=>num(m[k+x]); const t05=v('05'), t10=v('10'), t15=v('15'), sd=v('sd'); return {t05,t10,t15,sd,dtd:(t15!==null&&t05!==null)?t15-t05:null}; }

const TIPOS={
 CB:{nome:'Circuito de cabo de potência (MT)', grupo:'', icone:'🔌',
  campos:[['circuito','Circuito (origem → destino)'],['un','Tensão nominal U0/U (kV)','','8,7/15'],['u0','U0 (kV)','','8,7'],['isol','Isolação',['XLPE / PE','EPR','PILC (papel impregnado)']],
          ['secao','Seção (mm²)'],['comp','Comprimento aproximado (m)'],['emendas','Quantidade de emendas'],['term','Terminações (tipo / fabricante)'],
          ['tipoens','Tipo de ensaio',['Manutenção (cabo em serviço)','Aceitação (cabo novo)','Pós-reparo']],['instalacao','Ano de instalação']],
  items:[
   ['desl','Circuito desligado, bloqueado, aterrado e com permissão de trabalho','NR-10','A'],
   ['ext','Extremidades desconectadas de equipamentos (transformadores, para-raios, TPs, cargas)','IEEE 400.2','A'],
   ['remota','Extremidade remota isolada, sinalizada e com vigia','NR-10 / IEEE 400','A'],
   ['term','Terminações limpas, secas e sem trilhamento ou sinais de descarga','IEEE 400.2','B'],
   ['blind','Blindagem metálica contínua e aterrada nas duas extremidades','ABNT NBR 7286 / 7287','B'],
   ['emenda','Emendas acessíveis sem sinais de aquecimento, deformação ou umidade','Fabricante','B'],
   ['ident','Identificação das fases e do circuito','ABNT NBR 14039','C'],
   ['mec','Fixação, raio de curvatura e proteção mecânica dos cabos','ABNT NBR 14039','C'],
   ['supor','Tensão suportável VLF aplicada sem ruptura (quando realizada)','IEEE 400.2','A'],
   ['desc','Cabo descarregado e aterrado após o ensaio (tempo de descarga respeitado)','NR-10 / IEEE 400','A'],
  ],
  meds:[
   {g:'Resistência de isolamento antes do VLF (MΩ, 1 min)', f:[['ri_a','Fase A – blindagem (MΩ)'],['ri_b','Fase B – blindagem (MΩ)'],['ri_c','Fase C – blindagem (MΩ)'],['ri_v','Tensão de ensaio (kV)']], note:'Megôhmetro 5 kV (cabos até 15 kV) ou 10 kV. Limite pela tensão nominal (NETA MTS Tab. 100.1).'},
   {g:'Tangente delta – fase A (×10⁻³)', f:[['a05','Em 0,5 U0'],['a10','Em 1,0 U0'],['a15','Em 1,5 U0'],['asd','Estabilidade em U0 – desvio padrão']], note:'1 × 10⁻³ = 0,1 %. Use o valor médio de cada degrau (VLF 0,1 Hz senoidal).'},
   {g:'Tangente delta – fase B (×10⁻³)', f:[['b05','Em 0,5 U0'],['b10','Em 1,0 U0'],['b15','Em 1,5 U0'],['bsd','Estabilidade em U0 – desvio padrão']]},
   {g:'Tangente delta – fase C (×10⁻³)', f:[['c05','Em 0,5 U0'],['c10','Em 1,0 U0'],['c15','Em 1,5 U0'],['csd','Estabilidade em U0 – desvio padrão']]},
   {g:'Tensão suportável VLF (opcional)', f:[['vlf_kv','Tensão aplicada (kV rms)'],['vlf_min','Duração (min)'],['vlf_hz','Frequência (Hz)']], note:'Tensão e duração conforme IEEE 400.2 (tabela de tensões de ensaio) e tipo de ensaio. Registre ruptura no item do checklist.'},
  ],
 },
};

function avaliar(e){
  const m=e.m||{}, d=e.d||{}, out=[]; const C=crit(d);
  const add=(label,val,unit,st,lim,dec)=>{ if(val===null) return; out.push({label, val:f1(val,dec===undefined?2:dec)+(unit?' '+unit:''), lim, st}); };
  const volts=(ukV(d)||0)*1000||null; const limri=limRI(volts);
  FASES.forEach(([k,F])=>{ const ri=num(m['ri_'+k]); if(ri!==null){ const r=evMin(ri,limri,'MΩ'); out.push({label:`RI fase ${F}`, val:fmtN(ri)+' MΩ', lim:r?r.lim:'—', st:r?r.st:null}); } });
  FASES.forEach(([k,F])=>{ const f=fase(m,k);
    if(f.t10!==null) add(`TD médio em U0 – fase ${F}`, f.t10, '×10⁻³', C?ev3(f.t10,C.td):null, C?`< ${fmtN(C.td[0])} (ação > ${fmtN(C.td[1])})`:'comparativo (PILC)');
    if(f.dtd!==null) add(`ΔTD (1,5 U0 – 0,5 U0) – fase ${F}`, f.dtd, '×10⁻³', C?ev3(f.dtd,C.dtd):null, C?`< ${fmtN(C.dtd[0])} (ação > ${fmtN(C.dtd[1])})`:'comparativo (PILC)');
    if(f.sd!==null) add(`Estabilidade em U0 (desvio padrão) – fase ${F}`, f.sd, '×10⁻³', C?ev3(f.sd,C.sd):null, C?`< ${fmtN(C.sd[0])} (ação > ${fmtN(C.sd[1])})`:'comparativo (PILC)', 3);
  });
  const t=FASES.map(([k])=>fase(m,k).t10).filter(x=>x!==null);
  if(t.length>=2&&Math.min(...t)>0){ const r=Math.max(...t)/Math.min(...t); out.push({label:'Relação entre fases (TD máx / mín em U0)', val:f1(r,2), lim:'≤ 2 (indicativo)', st:r<=2?'ok':'att'}); }
  const vk=num(m.vlf_kv), u0=u0kV(d); if(vk!==null) out.push({label:'Tensão suportável VLF aplicada', val:fmtN(vk)+' kV'+(u0?` (${f1(vk/u0,2)} × U0)`:'')+(num(m.vlf_min)!==null?` · ${fmtN(num(m.vlf_min))} min`:''), lim:'IEEE 400.2 – Tab. de tensões', st:null});
  return out;
}

/* ---------- gráficos (SVG) ---------- */
function chartTD(e){
  const m=e.m||{}, d=e.d||{}, C=crit(d); const F=FASES.map(([k,L,col])=>({L,col,f:fase(m,k)}));
  const vals=F.flatMap(x=>[x.f.t05,x.f.t10,x.f.t15]).filter(v=>v!==null); if(!vals.length) return '';
  const W=760,H=310, L1=56,R1=440,T=34,B=262; const xs=[0.5,1.0,1.5];
  let ymax=Math.max(...vals)*1.25; if(C) ymax=Math.max(ymax,C.td[0]*1.6); ymax=Math.max(ymax,1); const ymin=Math.min(0,...vals);
  const X=v=>L1+(v-0.35)/(1.65-0.35)*(R1-L1), Y=v=>B-(v-ymin)/(ymax-ymin)*(B-T);
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Arial" font-size="11"><rect width="${W}" height="${H}" fill="#fff"/>`;
  s+=`<text x="${L1}" y="18" font-weight="bold" fill="${NAVY}" font-size="13">Tangente delta × tensão aplicada (×10⁻³)</text>`;
  for(let i=0;i<=5;i++){ const v=ymin+(ymax-ymin)*i/5, y=Y(v); s+=`<line x1="${L1}" x2="${R1}" y1="${y}" y2="${y}" stroke="${LINE}"/><text x="${L1-6}" y="${y+4}" text-anchor="end" fill="${MUT}">${f1(v,v<10?1:0)}</text>`; }
  if(C){ [[C.td[0],GRN,'sem ação'],[C.td[1],'#C62828','ação requerida']].forEach(([v,c,t])=>{ if(v<=ymax){ const y=Y(v); s+=`<line x1="${L1}" x2="${R1}" y1="${y}" y2="${y}" stroke="${c}" stroke-dasharray="6 4"/><text x="${R1-4}" y="${y-4}" text-anchor="end" fill="${c}" font-size="10">${t} (U0): ${fmtN(v)}</text>`; } }); }
  xs.forEach(v=>{ s+=`<text x="${X(v)}" y="${B+18}" text-anchor="middle" fill="${NAVY}" font-weight="bold">${String(v).replace('.',',')} U0</text>`; });
  s+=`<line x1="${L1}" x2="${R1}" y1="${B}" y2="${B}" stroke="${NAVY}"/><line x1="${L1}" x2="${L1}" y1="${T}" y2="${B}" stroke="${NAVY}"/>`;
  F.forEach(({L,col,f},i)=>{ const pts=[[0.5,f.t05],[1.0,f.t10],[1.5,f.t15]].filter(p=>p[1]!==null);
    if(pts.length>1) s+=`<polyline fill="none" stroke="${col}" stroke-width="2.4" points="${pts.map(p=>X(p[0])+','+Y(p[1])).join(' ')}"/>`;
    pts.forEach(p=>{ s+=`<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="4.5" fill="${col}"/>`; });
    s+=`<rect x="${L1+10+i*80}" y="${H-18}" width="14" height="4" fill="${col}"/><text x="${L1+28+i*80}" y="${H-13}" fill="${INK_}">Fase ${L}</text>`; });
  // painel direito: estabilidade e ΔTD
  const L2=500,R2=740; const sds=F.map(x=>x.f.sd), dts=F.map(x=>x.f.dtd);
  s+=`<text x="${L2}" y="18" font-weight="bold" fill="${NAVY}" font-size="13">Estabilidade e ΔTD por fase</text>`;
  const bar=(arr,lim,top,bot,tit,dec)=>{ const vv=arr.filter(v=>v!==null); if(!vv.length) return ''; let mx=Math.max(...vv.map(Math.abs),lim?lim[1]*1.1:0,0.001)*1.15; mx=Math.max(mx,lim?lim[0]*1.6:0);
    let o=`<text x="${L2}" y="${top-6}" fill="${MUT}">${tit}</text><line x1="${L2}" x2="${R2}" y1="${bot}" y2="${bot}" stroke="${NAVY}"/>`; const bw=(R2-L2)/3;
    arr.forEach((v,i)=>{ const x=L2+i*bw+bw*0.25, w=bw*0.5; if(v!==null){ const hh=Math.abs(v)/mx*(bot-top); o+=`<rect x="${x}" y="${bot-hh}" width="${w}" height="${hh}" fill="${FASES[i][2]}"/><text x="${x+w/2}" y="${bot-hh-3}" text-anchor="middle" font-size="10" fill="${INK_}">${f1(v,dec)}</text>`; } o+=`<text x="${x+w/2}" y="${bot+12}" text-anchor="middle" fill="${NAVY}" font-size="10">${FASES[i][1]}</text>`; });
    if(lim){ [[lim[0],GRN],[lim[1],'#C62828']].forEach(([l,c])=>{ if(l<=mx){ const y=bot-l/mx*(bot-top); o+=`<line x1="${L2}" x2="${R2}" y1="${y}" y2="${y}" stroke="${c}" stroke-dasharray="5 3"/><text x="${R2}" y="${y-2}" text-anchor="end" font-size="9" fill="${c}">${fmtN(l)}</text>`; } }); }
    return o; };
  s+=bar(sds,C&&C.sd,44,132,'Desvio padrão em U0 (×10⁻³)',3)+bar(dts,C&&C.dtd,174,262,'ΔTD = TD(1,5 U0) − TD(0,5 U0) (×10⁻³)',1);
  s+=`<text x="${W-6}" y="${H-4}" text-anchor="end" font-size="9" fill="${MUT}">Critérios: IEEE 400.2 · isolação ${esc(d.isol||'')}</text></svg>`;
  return s;
}
const INK_='#1B2333';
function diagrama(d){
  const W=760,H=230; let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Arial" font-size="11"><rect width="${W}" height="${H}" fill="#fff"/>`;
  s+=`<text x="16" y="20" font-weight="bold" fill="${NAVY}" font-size="13">Diagrama ilustrativo do ensaio (fase sob ensaio, demais aterradas)</text>`;
  s+=`<rect x="20" y="70" width="130" height="90" rx="8" fill="${NAVY}"/><text x="85" y="102" fill="#fff" text-anchor="middle" font-weight="bold">Fonte VLF</text><text x="85" y="118" fill="${GOLD}" text-anchor="middle">0,1 Hz senoidal</text><text x="85" y="134" fill="#fff" text-anchor="middle" font-size="10">+ medidor TD</text>`;
  s+=`<line x1="150" y1="95" x2="230" y2="95" stroke="#C62828" stroke-width="3"/><text x="190" y="88" text-anchor="middle" fill="#C62828" font-size="10">AT</text>`;
  s+=`<line x1="150" y1="140" x2="200" y2="140" stroke="${GRN}" stroke-width="2"/><line x1="200" y1="140" x2="200" y2="196" stroke="${GRN}" stroke-width="2"/>`;
  const gnd=(x,y)=>`<line x1="${x-12}" y1="${y}" x2="${x+12}" y2="${y}" stroke="${GRN}" stroke-width="2"/><line x1="${x-8}" y1="${y+5}" x2="${x+8}" y2="${y+5}" stroke="${GRN}" stroke-width="2"/><line x1="${x-4}" y1="${y+10}" x2="${x+4}" y2="${y+10}" stroke="${GRN}" stroke-width="2"/>`;
  s+=gnd(200,196);
  // cabo
  s+=`<rect x="230" y="80" width="400" height="30" rx="15" fill="#E6EAF2" stroke="${MUT}" stroke-dasharray="5 3"/><line x1="230" y1="95" x2="630" y2="95" stroke="#C62828" stroke-width="5"/>`;
  s+=`<text x="430" y="72" text-anchor="middle" fill="${NAVY}" font-weight="bold">Cabo ${esc(d.isol||'')} ${d.secao?esc(d.secao)+' mm²':''} ${d.comp?'· '+esc(d.comp)+' m':''}</text><text x="430" y="128" text-anchor="middle" fill="${MUT}" font-size="10">blindagem metálica (tracejado) aterrada nas duas extremidades</text>`;
  s+=`<line x1="245" y1="110" x2="245" y2="176" stroke="${GRN}" stroke-width="2"/>${gnd(245,176)}<line x1="615" y1="110" x2="615" y2="176" stroke="${GRN}" stroke-width="2"/>${gnd(615,176)}`;
  s+=`<rect x="250" y="146" width="330" height="40" rx="6" fill="#F3F4F6"/><text x="415" y="162" text-anchor="middle" fill="${INK_}" font-size="10">Fases não ensaiadas: condutor e blindagem aterrados</text><text x="415" y="176" text-anchor="middle" fill="${INK_}" font-size="10">Degraus: 0,5 U0 → 1,0 U0 → 1,5 U0 (≥ 6 medições por degrau)</text>`;
  s+=`<circle cx="650" cy="95" r="10" fill="#fff" stroke="#C62828" stroke-width="2"/><text x="690" y="88" fill="#C62828" font-size="10" text-anchor="middle">extremidade</text><text x="690" y="101" fill="#C62828" font-size="10" text-anchor="middle">isolada e</text><text x="690" y="114" fill="#C62828" font-size="10" text-anchor="middle">sinalizada</text>`;
  s+=`<text x="16" y="${H-8}" fill="${MUT}" font-size="9">Ilustrativo – a ligação real segue o manual do equipamento de ensaio e a análise de risco (NR-10).</text></svg>`;
  return s;
}
const EXT={
  slots:['pmont','ptela'],
  novo(it){ it.pmont=[]; it.ptela=[]; },
  html(e){ return `<div class="sec">Gráficos do ensaio</div><div class="card"><div id="vlfChart"></div><div class="note">O gráfico é atualizado ao preencher a tangente delta. Linhas tracejadas: limites da IEEE 400.2 para a isolação informada.</div></div>
    <div class="sec">Diagrama ilustrativo e fotos do ensaio</div><div class="card"><div id="vlfDiag"></div>
    <label>Montagem do ensaio (fonte VLF, ligações, aterramentos)</label><div class="row">${photoBtns('data-slot="pmont"')}</div><div class="thumbs" id="th_pmont"></div>
    <label>Tela / relatório do equipamento de ensaio</label><div class="row">${photoBtns('data-slot="ptela"')}</div><div class="thumbs" id="th_ptela"></div></div>`; },
  bind(e){ const draw=()=>{ const c=document.getElementById('vlfChart'); if(c) c.innerHTML=chartTD(e)||'<div class="note">Preencha a tangente delta das fases para desenhar o gráfico.</div>'; const g=document.getElementById('vlfDiag'); if(g) g.innerHTML=diagrama(e.d||{}); };
    ['mm','ef'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.addEventListener('input',draw); el.addEventListener('change',draw); } });
    document.querySelectorAll('#vlfChart, #vlfDiag').forEach(x=>{ x.style.overflowX='auto'; }); draw(); },
  async pdf(K,e,y){ const {doc,W,M}=K;
    const put=async(svg,maxH,tit)=>{ if(!svg) return; const png=await svgPng(svg,1600); if(!png) return; const w=W-2*M, hh=Math.min(maxH,w*png.h/png.w), ww=hh*png.w/png.h; y=K.ensure(y,hh+12); y=K.para(tit,y,{bold:true,size:9.5,color:C_NAVY}); try{ doc.addImage(png.data,'PNG',(W-ww)/2,y,ww,hh); }catch(err){} y+=hh+5; };
    const C=crit(e.d||{});
    if(C){ y=K.ensure(y,30); y=K.tbl({startY:y, head:[['Indicador (IEEE 400.2) ×10⁻³','Sem ação necessária','Investigação adicional','Ação requerida']], body:[['TD médio em U0',`< ${fmtN(C.td[0])}`,`${fmtN(C.td[0])} a ${fmtN(C.td[1])}`,`> ${fmtN(C.td[1])}`],['ΔTD (1,5 U0 – 0,5 U0)',`< ${fmtN(C.dtd[0])}`,`${fmtN(C.dtd[0])} a ${fmtN(C.dtd[1])}`,`> ${fmtN(C.dtd[1])}`],['Estabilidade em U0 (desvio padrão)',`< ${fmtN(C.sd[0])}`,`${fmtN(C.sd[0])} a ${fmtN(C.sd[1])}`,`> ${fmtN(C.sd[1])}`]], styles:{fontSize:7.6,cellPadding:1.3,lineColor:C_LINE,lineWidth:.2,halign:'center'}, columnStyles:{0:{halign:'left',fontStyle:'bold',textColor:C_NAVY,cellWidth:56}}, didParseCell:c=>{ if(c.section==='body'&&c.column.index>0) c.cell.styles.textColor=[null,C_RES.ok,C_RES.att,C_RES.crit][c.column.index]; } }); }
    await put(chartTD(e),82,'Gráfico – tangente delta por fase'); await put(diagrama(e.d||{}),58,'Diagrama ilustrativo do ensaio');
    const A=(e.pmont||[])[0], B=(e.ptela||[])[0]; if(A||B){ const cw=(W-2*M-6)/2, chh=60; y=K.ensure(y,chh+12); await K.foto(A,M,y,cw,chh,'Montagem do ensaio'); await K.foto(B,M+cw+6,y,cw,chh,'Tela / relatório do equipamento'); y+=chh+9; }
    const extra=[...(e.pmont||[]).slice(1).map(id=>({id,cap:'Montagem do ensaio'})),...(e.ptela||[]).slice(1).map(id=>({id,cap:'Equipamento de ensaio'}))]; if(extra.length) y=await K.galeria(extra,y,'Fotos do ensaio');
    return y; },
};
TIPOS.CB.ext=EXT;

const NORMAS=[
  ['IEEE 400','Guia para ensaios em campo e avaliação da isolação de sistemas de cabos de potência blindados'],
  ['IEEE 400.2','Ensaios em campo com tensão VLF – tensão suportável e tangente delta; critérios de avaliação'],
  ['IEC 60502-2','Cabos de potência com isolação extrudada de 6 kV a 30 kV – ensaios após a instalação'],
  ['ABNT NBR 7286','Cabos de potência com isolação extrudada de EPR, HEPR ou EPR 105 para 1 kV a 35 kV'],
  ['ABNT NBR 7287','Cabos de potência com isolação extrudada de XLPE para 1 kV a 35 kV'],
  ['ABNT NBR 14039','Instalações elétricas de média tensão de 1,0 kV a 36,2 kV'],
  ['ANSI/NETA MTS','Ensaios de manutenção – resistência de isolamento de cabos (Tab. 100.1)'],
  ['NR-10','Segurança em instalações e serviços em eletricidade'],
];
const CRITERIOS=[
  ['Resistência de isolamento','Mínimo pela tensão nominal do cabo (NETA MTS Tab. 100.1); valores muito diferentes entre fases indicam investigação.'],
  ['TD médio em U0 – XLPE/PE','< 4 sem ação · 4 a 50 investigação adicional · > 50 ação requerida (×10⁻³)'],
  ['ΔTD (1,5 – 0,5 U0) – XLPE/PE','< 5 sem ação · 5 a 80 investigação · > 80 ação requerida (×10⁻³)'],
  ['Estabilidade em U0 – XLPE/PE','< 0,1 sem ação · 0,1 a 0,5 investigação · > 0,5 ação requerida (×10⁻³)'],
  ['TD médio em U0 – EPR','< 35 sem ação · 35 a 120 investigação · > 120 ação requerida (×10⁻³)'],
  ['ΔTD / estabilidade – EPR','ΔTD < 5 / 5 a 100 / > 100 · estabilidade < 0,1 / 0,1 a 1,3 / > 1,3 (×10⁻³)'],
  ['PILC (papel impregnado)','Sem critério automático: avaliação comparativa entre fases e com o histórico.'],
  ['Classificação','Sem ação = Conforme · Investigação adicional = Atenção · Ação requerida = Não conforme.'],
];
function jobFields(h){
  return `<div class="sec">Dados do ensaio</div>
  <div class="card hdr"><div class="grid">
    ${field('numero','Nº do relatório',h,'text','Ex.: RT-26-001')}${field('data','Data',h,'date')}
    ${field('cliente','Cliente',h)}${field('local','Local / unidade',h)}
    ${sel('servico','Tipo de serviço',h,['Diagnóstico – tangente delta VLF','Tangente delta + tensão suportável VLF','Aceitação de cabo novo','Ensaio pós-reparo'])}
    ${field('os','Ordem de serviço / proposta',h)}${field('equipe','Equipe executante',h,'text','Nomes dos técnicos')}${field('acompanhante','Acompanhante do cliente',h)}${field('resp','Responsável técnico',h)}
  </div></div>
  <div class="sec">Condições e instrumentos</div>
  <div class="card hdr"><div class="grid">${field('tamb','Temperatura ambiente (°C)',h,'text','',DEC)}${field('umid','Umidade relativa (%)',h,'text','',DEC)}</div>
  ${field('instrumentos','Instrumentos utilizados (modelo, série, calibração)',h,'textarea','Ex.: Fonte VLF 0,1 Hz com medição de tangente delta; megôhmetro 5 kV; termo-higrômetro')}
  ${field('obs','Observações gerais',h,'textarea')}</div>`;
}
criarModuloChecklist({
  k:'vlf', nome:'Ensaio VLF e tangente delta em cabos', curto:'VLF / Tan δ', icone:'🔌',
  desc:'Cabos de potência MT: resistência de isolamento, tangente delta em 0,5/1,0/1,5 U0, estabilidade, tensão suportável VLF, critérios IEEE 400.2, gráficos e fotos.',
  TIPOS, TIPOS_ORD:['CB'], avaliar, itemNome:'circuito', itemNomePl:'circuitos', hTitulo:'local', lblLocal:'Localização / trecho',
  novoH:()=>({servico:'Diagnóstico – tangente delta VLF', equipe:'', acompanhante:'', os:'', tamb:'', umid:'', instrumentos:''}), jobFields,
  capaRows:(h,n)=>[['CLIENTE',h.cliente],['LOCAL',h.local],['SERVIÇO',h.servico],['DATA',fmtDate(h.data)],['CIRCUITOS',String(n)],['EMISSÃO',fmtDate(today())]],
  identRows:(h,n)=>[['Relatório Nº',h.numero],['Cliente',h.cliente],['Local / unidade',h.local],['Tipo de serviço',h.servico],['Ordem de serviço / proposta',h.os],['Data',fmtDate(h.data)],['Equipe executante',h.equipe],['Acompanhante do cliente',h.acompanhante],['Responsável técnico',h.resp],['Circuitos ensaiados',String(n)]],
  condRows:(h)=>[['Temperatura ambiente',h.tamb?h.tamb+' °C':''],['Umidade relativa',h.umid?h.umid+' %':''],['Instrumentos utilizados',h.instrumentos]],
  lblDiag:'Diagnóstico do circuito', phDiag:'Ex.: fase C com TD elevado e instável em 1,5 U0 – indica umidade/arborescência; demais fases sem ação',
  phRec:'Ex.: localizar e substituir emenda da fase C; reensaiar em 12 meses',
  assinLinha:(h)=>h.equipe?`Equipe executante: ${h.equipe}`:'',
  tx:{ dadosSec:'Dados do ensaio', antes:'Terminação – extremidade local', depois:'Terminação – extremidade remota', outras:'Outras fotos (placas, emendas, identificação)',
    titulo:'Relatório de Ensaio VLF e Tangente Delta em Cabos de Potência', arquivo:'Relatorio_VLF_Tangente_Delta', capa1:'Ensaio VLF e Tangente Delta', capa2:'Cabos de Potência', xlsTitulo:'ENSAIO VLF E TANGENTE DELTA EM CABOS',
    condSec:'Condições do ensaio e instrumentos', normas:NORMAS, criterios:CRITERIOS,
    objetivo:['Este relatório apresenta os resultados dos ensaios de resistência de isolamento e de tangente delta (fator de dissipação) com fonte VLF de 0,1 Hz nos circuitos de cabos de potência indicados, com o objetivo de avaliar o estado da isolação e identificar degradação por umidade, arborescência (water trees) e falhas em emendas e terminações.',
      'Cada fase foi classificada conforme os critérios da IEEE 400.2 (sem ação necessária, investigação adicional recomendada ou ação requerida); o circuito recebe a pior classificação entre as fases e os itens do checklist.'],
    metodologia:['Desligamento, bloqueio, aterramento e emissão de permissão de trabalho pelo cliente; extremidades desconectadas de equipamentos e extremidade remota isolada, sinalizada e vigiada (NR-10).',
      'Resistência de isolamento de cada fase contra a blindagem aterrada com megôhmetro, antes da aplicação de tensão VLF.',
      'Tangente delta com tensão VLF senoidal de 0,1 Hz em degraus de 0,5 U0, 1,0 U0 e 1,5 U0, fase por fase, com as demais fases aterradas; registro do valor médio, do desvio padrão (estabilidade) e da variação entre degraus (ΔTD).',
      'Quando contratado, ensaio de tensão suportável VLF conforme a tabela de tensões da IEEE 400.2. Descarga e aterramento do cabo ao final de cada ensaio.'],
    limitacoes:'O ensaio de tangente delta avalia o estado médio da isolação do circuito e não localiza o defeito; não constitui garantia de vida útil remanescente. Cabos com isolação comprometida podem romper durante a aplicação de tensão. Os critérios de referência devem ser conferidos com a edição vigente da IEEE 400.2 e com dados do fabricante.',
    consideracoes:'Recomenda-se tratar de imediato os circuitos com ação requerida, programar a investigação adicional (descargas parciais, inspeção de emendas e terminações) para os circuitos em atenção e repetir o ensaio de tangente delta para acompanhamento de tendência.',
  },
});
})();

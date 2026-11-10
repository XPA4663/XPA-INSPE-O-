/* ======================= MÓDULO: ENSAIOS DE EPIs E EPCs (isolantes) =======================
   Um item = um EPI/EPC ensaiado. Inspeção visual, ensaio dielétrico (tensão, tempo, corrente de fuga),
   critérios por tipo e classe, gráfico de fuga × limite, diagrama ilustrativo do ensaio e fotos. */
(function(){
function svgPng(svg,w){ return new Promise(res=>{ const m=svg.match(/viewBox="0 0 (\d+) (\d+)"/); const W0=+m[1],H0=+m[2]; const k=w/W0;
  const img=new Image(); const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  img.onload=()=>{ const c=document.createElement('canvas'); c.width=W0*k; c.height=H0*k; const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url); res({data:c.toDataURL('image/png'),w:W0,h:H0}); };
  img.onerror=()=>{ URL.revokeObjectURL(url); res(null); }; img.src=url; }); }
const NAVY='#0A1733', ORG='#E85A24', GRN='#2F8F4E', GOLD='#F4B400', MUT='#6B7385', LINE='#D5DAE2', INK_='#1B2333', RED='#C62828';
// tensão de ensaio periódico por classe (kV ca) – ASTM F496 (luvas e mangas), ASTM D178 (tapetes), ASTM D1048/D1049 (lençóis e coberturas)
const KV_CLASSE={'00':2.5,'0':5,'1':10,'2':20,'3':30,'4':40};
const CLASSES=['00','0','1','2','3','4'];
const visual=(extra)=>[
  ['ident','Identificação legível (fabricante, classe, tamanho, CA / lote)','NR-6','C'],
  ...extra,
  ['valid','Dentro do prazo do último ensaio / validade','NR-10 / fabricante','B'],
  ['guarda','Acondicionamento e guarda adequados (sem dobras, sol, óleo)','Fabricante','C'],
];
const DIEL=['diel','Ensaio dielétrico sem ruptura, perfuração ou descarga','Norma do tipo','A'];
const medDiel=(note,fuga)=>[{g:'Ensaio dielétrico', f:[['kv','Tensão aplicada (kV ca)'],['min','Duração (min)']].concat(fuga?[['ifuga','Corrente de fuga medida (mA)'],['ilim','Corrente máxima admissível (mA)']]:[]), note}];
const BORR=(extra)=>visual([['furos','Sem furos, cortes, rasgos ou abrasões','Norma do tipo','A'],['ozonio','Sem craquelamento por ozônio, ressecamento ou pegajosidade','Norma do tipo','A'],['contam','Sem inchaço ou contaminação por óleo / produtos químicos','Norma do tipo','B'],...extra]);
const TIPOS={
 LUVA:{nome:'Luva isolante de borracha', grupo:'EPI', icone:'🧤', dia:'tanque',
  campos:[['classe','Classe',CLASSES.slice(1).concat(['00'])],['tam','Tamanho'],['compr','Comprimento (mm)','','360'],['cor','Cor'],['fabdata','Data de fabricação'],['prox','Próximo ensaio (data)']],
  items:[...BORR([['infl','Ensaio de inflação (ar) sem vazamento','ASTM F496 / IEC 60903','A']]),DIEL],
  meds:medDiel('Tensão de reensaio por classe (ASTM F496): 00 = 2,5 kV · 0 = 5 kV · 1 = 10 kV · 2 = 20 kV · 3 = 30 kV · 4 = 40 kV. Corrente máxima conforme tabela da norma para a classe e o comprimento da luva. Periodicidade: 6 meses.',true)},
 MANGA:{nome:'Manga isolante de borracha', grupo:'EPI', icone:'🦾', dia:'tanque',
  campos:[['classe','Classe',CLASSES.slice(1).concat(['00'])],['tam','Tamanho'],['fabdata','Data de fabricação'],['prox','Próximo ensaio (data)']],
  items:[...BORR([]),DIEL], meds:medDiel('Tensões por classe (ASTM F496 / D1051): iguais às das luvas. Periodicidade: 12 meses.',true)},
 TAPETE:{nome:'Tapete / manta isolante', grupo:'EPC', icone:'🟫', dia:'placas',
  campos:[['classe','Classe',CLASSES.slice(1)],['dim','Dimensões (m)'],['local_uso','Local de uso (painel / cabine)'],['prox','Próximo ensaio (data)']],
  items:[...BORR([]),DIEL], meds:medDiel('Tensão de ensaio por classe (ASTM D178 / IEC 61111): 0 = 5 kV · 1 = 10 kV · 2 = 20 kV · 3 = 30 kV · 4 = 40 kV, 1 min, sem ruptura. Periodicidade: 12 meses.',false)},
 COBERT:{nome:'Lençol / cobertura isolante', grupo:'EPC', icone:'🧱', dia:'placas',
  campos:[['classe','Classe',CLASSES.slice(1)],['modelo_c','Tipo (lençol, cobertura de condutor, de isolador)'],['prox','Próximo ensaio (data)']],
  items:[...BORR([]),DIEL], meds:medDiel('Tensões por classe (ASTM D1048 / D1049 / IEC 61112): iguais às dos tapetes. Periodicidade: 12 meses.',true)},
 VARA:{nome:'Vara / bastão de manobra', grupo:'EPC', icone:'🦯', dia:'vara',
  campos:[['compr','Comprimento útil (m)'],['secoes','Nº de seções'],['un','Tensão máxima de uso (kV)'],['prox','Próximo ensaio (data)']],
  items:visual([['trinca','Tubo sem trincas, fissuras, delaminação ou fibras expostas','ASTM F711 / IEC 60855','A'],['brilho','Superfície limpa, lisa e hidrorrepelente (sem perda de brilho)','ASTM F711','B'],['ferrag','Ferragens, engates e cabeçote firmes','Fabricante','B'],DIEL]),
  meds:[{g:'Ensaio dielétrico (por trecho)', f:[['kv','Tensão aplicada (kV ca)'],['dist','Distância entre eletrodos (cm)'],['min','Duração (min)'],['ifuga','Corrente de fuga medida (µA)'],['ilim','Corrente máxima admissível (µA)']], note:'Ensaio periódico típico: 75 kV a cada 30 cm por 1 min (ASTM F711 / IEC 60855) ou conforme fabricante. Periodicidade: 12 meses.'}]},
 DETECT:{nome:'Detector de tensão', grupo:'EPC', icone:'📟', dia:'',
  campos:[['faixa','Faixa nominal (kV)'],['un','Tensão nominal de referência Un (kV)'],['tipo_d','Tipo',['Contato (capacitivo)','Aproximação','Contato + aproximação']],['prox','Próxima verificação (data)']],
  items:visual([['auto','Autoteste funcionando (luminoso e sonoro)','IEC 61243-1','A'],['bat','Bateria em boas condições','Fabricante','B'],['corpo','Corpo, eletrodo e extensão sem danos','IEC 61243-1','B'],['vara_d','Vara de acoplamento compatível e ensaiada','IEC 61243-1','B'],['fonte','Verificado em fonte de tensão conhecida','IEC 61243-1','A']]),
  meds:[{g:'Verificação do limiar de indicação', f:[['ut','Tensão limiar de indicação medida Ut (kV)']], note:'IEC 61243-1: o limiar deve ficar entre 10 % e 45 % da tensão nominal Un.'}]},
 ATERR:{nome:'Conjunto de aterramento temporário', grupo:'EPC', icone:'🔗', dia:'',
  campos:[['secao','Seção do cabo (mm²)'],['comp_c','Comprimento de cada cabo (m)'],['ncabos','Nº de cabos',['4','3','1']],['grampo','Tipo de grampo'],['prox','Próximo ensaio (data)']],
  items:visual([['gramp','Grampos e garras sem trincas, com rosca e mola em bom estado','ASTM F855 / IEC 61230','A'],['cabo','Cabo sem fios rompidos, capa transparente íntegra','ASTM F855','A'],['term','Terminais prensados e firmes (sem oxidação)','ASTM F855','A'],['bastao','Bastão de instalação ensaiado','ASTM F711','B']]),
  meds:[{g:'Resistência elétrica por cabo (mΩ)', f:[['r1','Cabo 1'],['r2','Cabo 2'],['r3','Cabo 3'],['r4','Cabo 4 / terra']], note:'Comparada à resistência teórica do cobre (0,0178 Ω·mm²/m × comprimento / seção) + 50 % (critério adotado, ref. ASTM F2249).'}]},
 FERR:{nome:'Ferramentas manuais isoladas (1000 V)', grupo:'EPI', icone:'🪛', dia:'tanque',
  campos:[['desc_f','Conjunto / ferramentas (alicates, chaves, soquetes…)'],['qtd_f','Quantidade ensaiada'],['fab_f','Fabricante / linha'],['prox','Próximo ensaio (data)']],
  items:visual([['isol','Isolação sem trincas, cortes, bolhas ou desgaste','IEC 60900','A'],['indic','Camada de indicação (cor interna) não aparente','IEC 60900','A'],['aderen','Isolação firmemente aderida ao metal (sem folga ou deslocamento)','IEC 60900','A'],['marca','Símbolo de duplo triângulo, 1000 V e ano de fabricação','IEC 60900','C'],['func','Funcionamento mecânico adequado (articulação, mola, catraca)','Fabricante','C'],DIEL]),
  meds:[{g:'Ensaio dielétrico (imersão em água)', f:[['kv','Tensão aplicada (kV ca)'],['min','Duração (min)'],['ifuga','Maior corrente de fuga medida (mA)'],['ilim','Corrente máxima admissível (mA)'],['nens','Quantidade ensaiada'],['nrep','Quantidade reprovada']], note:'IEC 60900: ensaio de 10 kV ca (rotina) com a ferramenta imersa até a borda da isolação; registre a maior fuga do lote e quantas ferramentas foram reprovadas. Fuga máxima conforme a norma / fabricante.'}]},
 PROBE:{nome:'Ponta de prova / cabos de teste de multímetro', grupo:'EPI', icone:'🔍', dia:'',
  campos:[['cat','Categoria de medição',['CAT III 1000 V','CAT IV 600 V','CAT IV 1000 V','CAT II 600 V','CAT III 600 V']],['instr','Instrumento associado (multímetro / alicate)'],['tipo_p','Tipo',['Par de pontas com cabos','Ponta com garra jacaré','Ponta fusível']],['prox','Próxima verificação (data)']],
  items:visual([['cabo_p','Cabos sem cortes, emendas, ressecamento ou condutor exposto','IEC 61010-031','A'],['guarda','Protetor de dedos (guarda) íntegro','IEC 61010-031','A'],['ponta','Ponta metálica exposta compatível com a categoria (≤ 4 mm em CAT III/IV ou capa protetora)','IEC 61010-031','A'],['conect','Plugues banana com proteção (blindados) e firmes','IEC 61010-031','B'],['marca_p','Marcação de categoria (CAT) e tensão legível','IEC 61010-031','B'],['compat','Categoria igual ou superior à do multímetro e do ponto de medição','NR-10 / IEC 61010-1','A']]),
  meds:[{g:'Ensaios elétricos', f:[['rcont','Resistência de continuidade do par (Ω)'],['rcont_lim','Resistência máxima admissível (Ω)'],['riso','Resistência de isolamento entre cabos / capa (MΩ)'],['riso_v','Tensão do ensaio de isolamento (V cc)']], note:'Continuidade com o próprio multímetro ou micro-ohmímetro (critério adotado: ≤ 0,5 Ω para o par, se não informado). Isolamento com megôhmetro a 1000 V cc, com os condutores unidos contra uma folha condutora sobre a capa: ≥ 100 MΩ (critério adotado).'}]},
 CAPAC:{nome:'Capacete classe B (eletricista)', grupo:'EPI', icone:'⛑️', dia:'tanque',
  campos:[['ca','Nº do CA'],['fabdata','Data de fabricação'],['prox','Próximo ensaio (data)']],
  items:visual([['casco','Casco sem trincas, furos ou deformações','ABNT NBR 8221','A'],['susp','Suspensão / carneira e jugular em bom estado','ABNT NBR 8221','B'],['metal','Sem partes metálicas ou furos adicionais','ABNT NBR 8221','A'],DIEL]),
  meds:medDiel('ABNT NBR 8221 – classe B: 20 kV por 3 min, corrente de fuga ≤ 9 mA.',true)},
 CALC:{nome:'Calçado isolante', grupo:'EPI', icone:'🥾', dia:'tanque',
  campos:[['ca','Nº do CA'],['tam','Tamanho'],['prox','Próximo ensaio (data)']],
  items:visual([['solado','Solado sem cortes, furos ou objetos encravados','Fabricante','A'],['cabed','Cabedal e costuras em bom estado','Fabricante','C'],DIEL]),
  meds:medDiel('Tensão e corrente máxima conforme o CA / fabricante (calçado com requisito de isolamento elétrico).',true)},
 OUTRO:{nome:'Outro EPI / EPC isolante', grupo:'EPC', icone:'🛡️', dia:'placas',
  campos:[['desc_o','Descrição'],['prox','Próximo ensaio (data)']],
  items:visual([['estado','Estado geral sem danos','Fabricante','A'],DIEL]), meds:medDiel('Tensão, tempo e corrente máxima conforme norma e fabricante.',true)},
};
const ORDEM=['LUVA','MANGA','TAPETE','COBERT','VARA','DETECT','ATERR','FERR','PROBE','CAPAC','CALC','OUTRO'];

function limiteFuga(e){ const m=e.m||{}; const l=num(m.ilim); if(l!==null) return l; if(e.tipo==='CAPAC') return 9; return null; }
function avaliar(e){
  const m=e.m||{}, d=e.d||{}, out=[]; const v=k=>num(m[k]);
  const kv=v('kv'), kvc=KV_CLASSE[d.classe];
  if(kv!==null){ if(kvc&&['LUVA','MANGA','TAPETE','COBERT'].includes(e.tipo)) out.push({label:`Tensão de ensaio (classe ${d.classe})`, val:fmtN(kv)+' kV', lim:'≥ '+fmtN(kvc)+' kV', st:kv>=kvc?'ok':'nc'});
    else if(e.tipo==='CAPAC') out.push({label:'Tensão de ensaio', val:fmtN(kv)+' kV', lim:'≥ 20 kV', st:kv>=20?'ok':'nc'});
    else if(e.tipo==='FERR') out.push({label:'Tensão de ensaio', val:fmtN(kv)+' kV', lim:'≥ 10 kV', st:kv>=10?'ok':'nc'});
    else if(e.tipo==='VARA'){ const dd=v('dist'); if(dd) { const g=kv/dd*30; out.push({label:'Gradiente aplicado', val:f1(g,1)+' kV / 30 cm', lim:'≥ 75 kV / 30 cm', st:g>=75?'ok':'att'}); } }
    else out.push({label:'Tensão de ensaio', val:fmtN(kv)+' kV', lim:'conforme norma', st:null}); }
  const mn=v('min'); if(mn!==null) out.push({label:'Duração do ensaio', val:fmtN(mn)+' min', lim:e.tipo==='CAPAC'?'≥ 3 min':'conforme norma', st:e.tipo==='CAPAC'?(mn>=3?'ok':'nc'):null});
  const i=v('ifuga'), lim=limiteFuga(e); const un=e.tipo==='VARA'?'µA':'mA';
  if(i!==null){ const r=lim!==null?{st:i<=lim?(i<=lim*0.8?'ok':'att'):'nc',lim:'≤ '+fmtN(lim)+' '+un}:{st:null,lim:'informe o limite'}; out.push({label:'Corrente de fuga', val:fmtN(i)+' '+un, lim:r.lim, st:r.st}); }
  if(e.tipo==='FERR'){ const ne=v('nens'), nr=v('nrep'); if(ne!==null) out.push({label:'Ferramentas reprovadas no lote', val:`${fmtN(nr||0)} de ${fmtN(ne)}`, lim:'0 reprovadas', st:(nr||0)>0?'nc':'ok'}); }
  if(e.tipo==='PROBE'){ const rc=v('rcont'), rl=v('rcont_lim')!==null?v('rcont_lim'):0.5; if(rc!==null) out.push({label:'Resistência de continuidade', val:fmtN(rc)+' Ω', lim:'≤ '+fmtN(rl)+' Ω', st:rc<=rl?'ok':(rc<=rl*2?'att':'nc')});
    const ri=v('riso'); if(ri!==null) out.push({label:'Resistência de isolamento'+(v('riso_v')?` (${fmtN(v('riso_v'))} V)`:''), val:fmtN(ri)+' MΩ', lim:'≥ 100 MΩ', st:ri>=100?'ok':(ri>=10?'att':'nc')}); }
  if(e.tipo==='DETECT'){ const ut=v('ut'), U=num(d.un); if(ut!==null&&U){ const p=ut/U*100; out.push({label:'Limiar de indicação', val:fmtN(ut)+' kV ('+f1(p,0)+' % Un)', lim:'10 % a 45 % de Un', st:p>=10&&p<=45?'ok':'nc'}); } }
  if(e.tipo==='ATERR'){ const s=num(d.secao), L=num(d.comp_c); const rt=(s&&L)?0.0178*L/s*1000:null;
    ['r1','r2','r3','r4'].forEach((k,j)=>{ const r=v(k); if(r===null) return; out.push({label:`Resistência do cabo ${j+1}`, val:fmtN(r)+' mΩ', lim:rt?'≤ '+f1(rt*1.5,2)+' mΩ':'informe seção e comprimento', st:rt?(r<=rt*1.5?'ok':'nc'):null}); }); }
  return out;
}

/* ---------- gráficos e diagramas (SVG) ---------- */
function chartFuga(e){
  const m=e.m||{}; const i=num(m.ifuga), lim=limiteFuga(e); if(i===null) return '';
  const un=e.tipo==='VARA'?'µA':'mA'; const mx=Math.max(i,lim||0)*1.3||1; const W=760,H=150, L=150, R=700;
  const X=v=>L+v/mx*(R-L);
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Arial" font-size="12"><rect width="${W}" height="${H}" fill="#fff"/><text x="16" y="20" font-weight="bold" fill="${NAVY}" font-size="13">Corrente de fuga × limite admissível (${un})</text>`;
  const st=lim===null?NAVY:(i<=lim*0.8?GRN:i<=lim?GOLD:RED);
  s+=`<text x="${L-10}" y="62" text-anchor="end" fill="${INK_}">Medida</text><rect x="${L}" y="46" width="${X(i)-L}" height="24" fill="${st}"/><text x="${X(i)+6}" y="63" fill="${INK_}" font-weight="bold">${fmtN(i)} ${un}</text>`;
  if(lim!==null) s+=`<text x="${L-10}" y="104" text-anchor="end" fill="${INK_}">Limite</text><rect x="${L}" y="88" width="${X(lim)-L}" height="24" fill="#D5DAE2"/><text x="${X(lim)+6}" y="105" fill="${MUT}">${fmtN(lim)} ${un}</text><line x1="${X(lim)}" x2="${X(lim)}" y1="36" y2="120" stroke="${RED}" stroke-dasharray="5 3"/>`;
  s+=`<line x1="${L}" x2="${L}" y1="36" y2="124" stroke="${NAVY}"/><text x="${W-8}" y="${H-8}" text-anchor="end" font-size="9" fill="${MUT}">Verde: até 80 % do limite · amarelo: 80–100 % · vermelho: acima do limite</text></svg>`;
  return s;
}
function chartTensao(e){
  const d=e.d||{}, kvc=KV_CLASSE[d.classe]; if(!kvc||!['LUVA','MANGA','TAPETE','COBERT'].includes(e.tipo)) return '';
  const W=760,H=170,L=60,R=730,B=136,T=34; const mx=44; const X=i=>L+(i+0.5)*(R-L)/CLASSES.length, Y=v=>B-v/mx*(B-T);
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Arial" font-size="11"><rect width="${W}" height="${H}" fill="#fff"/><text x="16" y="20" font-weight="bold" fill="${NAVY}" font-size="13">Tensão de ensaio periódico por classe (kV ca)</text>`;
  const kv=num((e.m||{}).kv);
  CLASSES.forEach((c,i)=>{ const v=KV_CLASSE[c], on=c===d.classe; s+=`<rect x="${X(i)-30}" y="${Y(v)}" width="60" height="${B-Y(v)}" fill="${on?NAVY:'#D5DAE2'}"/><text x="${X(i)}" y="${Y(v)-4}" text-anchor="middle" fill="${on?NAVY:MUT}" font-weight="${on?'bold':'normal'}">${fmtN(v)}</text><text x="${X(i)}" y="${B+16}" text-anchor="middle" fill="${INK_}">Classe ${c}</text>`; });
  if(kv!==null){ const y=Y(Math.min(kv,mx)); s+=`<line x1="${L}" x2="${R}" y1="${y}" y2="${y}" stroke="${ORG}" stroke-width="2" stroke-dasharray="6 4"/><text x="${R}" y="${y-4}" text-anchor="end" fill="${ORG}" font-weight="bold">aplicado: ${fmtN(kv)} kV</text>`; }
  s+=`<line x1="${L}" x2="${R}" y1="${B}" y2="${B}" stroke="${NAVY}"/></svg>`; return s;
}
function diagrama(e){
  const T=TIPOS[e.tipo]; const k=T.dia; if(!k) return '';
  const W=760,H=220; let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Arial" font-size="11"><rect width="${W}" height="${H}" fill="#fff"/><text x="16" y="20" font-weight="bold" fill="${NAVY}" font-size="13">Diagrama ilustrativo do ensaio dielétrico</text>`;
  const fonte=`<rect x="20" y="70" width="130" height="80" rx="8" fill="${NAVY}"/><text x="85" y="102" fill="#fff" text-anchor="middle" font-weight="bold">Fonte de AT</text><text x="85" y="120" fill="${GOLD}" text-anchor="middle">ca 60 Hz</text><text x="85" y="136" fill="#fff" text-anchor="middle" font-size="10">+ medidor de fuga</text>`;
  const gnd=(x,y)=>`<line x1="${x-12}" y1="${y}" x2="${x+12}" y2="${y}" stroke="${GRN}" stroke-width="2"/><line x1="${x-8}" y1="${y+5}" x2="${x+8}" y2="${y+5}" stroke="${GRN}" stroke-width="2"/><line x1="${x-4}" y1="${y+10}" x2="${x+4}" y2="${y+10}" stroke="${GRN}" stroke-width="2"/>`;
  s+=fonte;
  if(k==='tanque'){ s+=`<rect x="300" y="70" width="300" height="110" fill="#DCEBFA" stroke="${NAVY}"/><text x="450" y="196" text-anchor="middle" fill="${MUT}" font-size="10">tanque com água (eletrodo externo, aterrado)</text>`;
    s+=`<path d="M410 60 L410 150 Q450 172 490 150 L490 60 Z" fill="#F4B40033" stroke="${GOLD}" stroke-width="3"/><rect x="420" y="70" width="60" height="70" fill="#BFD8F2"/><text x="450" y="112" text-anchor="middle" fill="${NAVY}" font-size="10">água</text><text x="450" y="54" text-anchor="middle" fill="${INK_}" font-weight="bold">${esc(T.nome.split(' ')[0])}</text>`;
    s+=`<line x1="150" y1="90" x2="450" y2="90" stroke="${RED}" stroke-width="3"/><text x="300" y="84" text-anchor="middle" fill="${RED}" font-size="10">AT – eletrodo interno</text><line x1="150" y1="135" x2="250" y2="135" stroke="${GRN}" stroke-width="2"/><line x1="250" y1="135" x2="250" y2="176" stroke="${GRN}" stroke-width="2"/><line x1="250" y1="176" x2="300" y2="176" stroke="${GRN}" stroke-width="2"/>${gnd(250,186)}`;
    s+=`<text x="620" y="96" fill="${INK_}" font-size="10">folga de borda sem água</text><text x="620" y="110" fill="${INK_}" font-size="10">conforme norma e classe</text>`; }
  if(k==='placas'){ s+=`<rect x="300" y="78" width="320" height="14" fill="#C9CED8" stroke="${NAVY}"/><rect x="300" y="92" width="320" height="18" fill="#3A3A3A"/><rect x="300" y="110" width="320" height="14" fill="#C9CED8" stroke="${NAVY}"/><text x="640" y="88" fill="${INK_}" font-size="10">eletrodo superior (AT)</text><text x="640" y="105" fill="${INK_}" font-size="10">material isolante</text><text x="640" y="122" fill="${INK_}" font-size="10">eletrodo inferior (terra)</text>`;
    s+=`<line x1="150" y1="90" x2="300" y2="85" stroke="${RED}" stroke-width="3"/><line x1="150" y1="135" x2="300" y2="118" stroke="${GRN}" stroke-width="2"/>${gnd(230,160)}<line x1="230" y1="127" x2="230" y2="160" stroke="${GRN}" stroke-width="2"/>`; }
  if(k==='vara'){ s+=`<rect x="250" y="100" width="470" height="16" rx="8" fill="#F4B400" stroke="${NAVY}"/>`; [300,420,540,660].forEach((x,i)=>{ s+=`<rect x="${x-4}" y="94" width="8" height="28" fill="${i%2?GRN:RED}"/>`; });
    s+=`<text x="360" y="88" text-anchor="middle" fill="${INK_}" font-size="10">30 cm</text><line x1="300" y1="92" x2="420" y2="92" stroke="${MUT}"/><line x1="150" y1="90" x2="300" y2="96" stroke="${RED}" stroke-width="3"/><line x1="150" y1="135" x2="420" y2="135" stroke="${GRN}" stroke-width="2"/><line x1="420" y1="122" x2="420" y2="135" stroke="${GRN}" stroke-width="2"/>${gnd(420,150)}<text x="480" y="160" fill="${INK_}" font-size="10">eletrodos alternados AT / terra a cada trecho ensaiado</text>`; }
  s+=`<text x="16" y="${H-8}" fill="${MUT}" font-size="9">Ilustrativo – a montagem real segue a norma do EPI/EPC e o manual do equipamento de ensaio.</text></svg>`; return s;
}
const EXT={
  slots:['pens'],
  novo(it){ it.pens=[]; },
  html(e){ return `<div class="sec">Gráficos e diagrama do ensaio</div><div class="card"><div id="epiCh1"></div><div id="epiCh2"></div><div id="epiDia"></div>
    <label>Fotos do ensaio (montagem, leitura do equipamento, etiqueta de aprovação)</label><div class="row">${photoBtns('data-slot="pens"')}</div><div class="thumbs" id="th_pens"></div></div>`; },
  bind(e){ const draw=()=>{ const a=document.getElementById('epiCh1'), b=document.getElementById('epiCh2'), c=document.getElementById('epiDia'); if(a) a.innerHTML=chartTensao(e); if(b) b.innerHTML=chartFuga(e)||(TIPOS[e.tipo].meds[0].f.some(f=>f[0]==='ifuga')?'<div class="note">Informe a corrente de fuga e o limite para desenhar o gráfico.</div>':''); if(c) c.innerHTML=diagrama(e); };
    ['mm','ef'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.addEventListener('input',draw); el.addEventListener('change',draw); } }); draw(); },
  async pdf(K,e,y){ const {doc,W,M}=K;
    const put=async(svg,maxH)=>{ if(!svg) return; const png=await svgPng(svg,1500); if(!png) return; const w=W-2*M, hh=Math.min(maxH,w*png.h/png.w), ww=hh*png.w/png.h; y=K.ensure(y,hh+6); try{ doc.addImage(png.data,'PNG',(W-ww)/2,y,ww,hh); }catch(err){} y+=hh+4; };
    await put(chartTensao(e),36); await put(chartFuga(e),30); await put(diagrama(e),48);
    const ps=(e.pens||[]); if(ps.length){ const cw=(W-2*M-6)/2, chh=58; y=K.ensure(y,chh+12); await K.foto(ps[0],M,y,cw,chh,'Ensaio'); if(ps[1]) await K.foto(ps[1],M+cw+6,y,cw,chh,'Ensaio'); y+=chh+9; if(ps.length>2) y=await K.galeria(ps.slice(2).map(id=>({id,cap:'Ensaio'})),y,'Fotos do ensaio'); }
    return y; },
};
ORDEM.forEach(k=>{ TIPOS[k].ext=EXT; });

const NORMAS=[
  ['NR-6','Equipamento de proteção individual – CA, fornecimento, guarda e conservação'],
  ['NR-10','Segurança em eletricidade – EPI e EPC adequados, inspecionados e ensaiados'],
  ['IEC 60903 / ASTM D120','Luvas isolantes de borracha – requisitos e ensaios'],
  ['ASTM F496','Cuidados em serviço de luvas e mangas isolantes – reensaio periódico por classe'],
  ['IEC 60984 / ASTM D1051','Mangas isolantes de borracha'],
  ['IEC 61111 / ASTM D178','Tapetes isolantes'],
  ['IEC 61112 / ASTM D1048 / D1049','Lençóis e coberturas isolantes'],
  ['IEC 60855 / ASTM F711','Varas e bastões de manobra de fibra de vidro'],
  ['IEC 61243-1','Detectores de tensão capacitivos'],
  ['IEC 61230 / ASTM F855 / F2249','Conjuntos de aterramento temporário e ensaio em serviço'],
  ['IEC 60900 / ABNT NBR IEC 60900','Ferramentas manuais isoladas para trabalhos até 1000 V ca e 1500 V cc'],
  ['IEC 61010-031','Pontas de prova e cabos de teste manuais para medição elétrica – requisitos de segurança'],
  ['IEC 61010-1','Segurança de equipamentos de medição – categorias de medição (CAT II, III, IV)'],
  ['ABNT NBR 8221','Capacete de segurança para uso na indústria – classe B'],
];
const CRITERIOS=[
  ['Luvas e mangas (reensaio)','Classe 00 = 2,5 kV · 0 = 5 kV · 1 = 10 kV · 2 = 20 kV · 3 = 30 kV · 4 = 40 kV; sem ruptura; corrente de fuga dentro do limite da norma. Luvas: 6 meses; mangas: 12 meses.'],
  ['Tapetes, lençóis e coberturas','Mesmas tensões por classe (0 a 4); sem ruptura. Periodicidade de 12 meses.'],
  ['Varas e bastões','75 kV a cada 30 cm por 1 min (ou fabricante); sem descarga, aquecimento ou fuga excessiva.'],
  ['Detectores de tensão','Limiar de indicação entre 10 % e 45 % de Un; autoteste e sinalização funcionando.'],
  ['Aterramento temporário','Resistência de cada cabo ≤ 150 % da teórica do cobre (critério adotado); grampos e terminais íntegros.'],
  ['Ferramentas isoladas','10 kV ca com imersão (IEC 60900); isolação íntegra, camada de indicação não aparente; qualquer ferramenta reprovada é retirada do lote.'],
  ['Pontas de prova','Categoria compatível com o ponto de medição; continuidade ≤ 0,5 Ω (par) e isolamento ≥ 100 MΩ a 1000 V cc (critérios adotados); guarda e capa íntegras.'],
  ['Capacete classe B','20 kV por 3 min; corrente de fuga ≤ 9 mA (ABNT NBR 8221).'],
  ['Corrente de fuga','Até 80 % do limite: conforme · 80 % a 100 %: atenção · acima: não conforme (reprovar e retirar de uso).'],
  ['Resultado','Conforme = aprovado para uso · Não conforme = reprovado: inutilizar ou segregar e identificar.'],
];
function jobFields(h){
  return `<div class="sec">Dados do ensaio</div>
  <div class="card hdr"><div class="grid">
    ${field('numero','Nº do relatório / certificado',h,'text','Ex.: EPI-26-001')}${field('data','Data do ensaio',h,'date')}
    ${field('cliente','Cliente',h)}${field('local','Local do ensaio (laboratório / campo)',h)}
    ${field('os','Ordem de serviço / proposta',h)}${field('validade','Validade do ensaio (meses)',h,'text','6 (luvas) / 12 (demais)',DEC)}
    ${field('equipe','Executante(s)',h)}${field('resp','Responsável técnico',h)}
  </div></div>
  <div class="sec">Condições e instrumentos</div>
  <div class="card hdr"><div class="grid">${field('tamb','Temperatura ambiente (°C)',h,'text','',DEC)}${field('umid','Umidade relativa (%)',h,'text','',DEC)}</div>
  ${field('instrumentos','Equipamento de ensaio (modelo, série, calibração)',h,'textarea','Ex.: Hipot ca 0–50 kV com medidor de fuga; tanque para luvas; micro-ohmímetro; termo-higrômetro')}
  ${field('obs','Observações gerais',h,'textarea')}</div>`;
}
criarModuloChecklist({
  k:'epi', nome:'Ensaios de EPIs e EPCs isolantes', curto:'EPI / EPC', icone:'🦺',
  desc:'Luvas, mangas, tapetes, coberturas, varas, detectores, aterramento temporário, ferramentas manuais isoladas, pontas de prova de multímetro, capacetes e calçados: inspeção, ensaio dielétrico, fuga, normas, gráficos e fotos.',
  TIPOS, TIPOS_ORD:ORDEM, avaliar, itemNome:'item', itemNomePl:'itens', hTitulo:'local', lblLocal:'Usuário / setor / nº de controle',
  grupos:[['EPI','EPI – equipamentos de proteção individual'],['EPC','EPC – equipamentos de proteção coletiva']],
  novoH:()=>({os:'', equipe:'', validade:'', tamb:'', umid:'', instrumentos:''}), jobFields,
  capaRows:(h,n)=>[['CLIENTE',h.cliente],['LOCAL DO ENSAIO',h.local],['DATA DO ENSAIO',fmtDate(h.data)],['ITENS ENSAIADOS',String(n)],['VALIDADE',h.validade?h.validade+' meses':'conforme item'],['EMISSÃO',fmtDate(today())]],
  identRows:(h,n)=>[['Relatório / certificado Nº',h.numero],['Cliente',h.cliente],['Local do ensaio',h.local],['Ordem de serviço / proposta',h.os],['Data do ensaio',fmtDate(h.data)],['Validade do ensaio',h.validade?h.validade+' meses':'conforme item'],['Executante(s)',h.equipe],['Responsável técnico',h.resp],['Itens ensaiados',String(n)]],
  condRows:(h)=>[['Temperatura ambiente',h.tamb?h.tamb+' °C':''],['Umidade relativa',h.umid?h.umid+' %':''],['Equipamento de ensaio',h.instrumentos]],
  lblDiag:'Resultado / observações do ensaio', phDiag:'Ex.: aprovada – sem ruptura a 10 kV por 3 min; fuga 8,2 mA',
  phRec:'Ex.: reprovada – furo no dedo indicador; inutilizar e substituir',
  assinLinha:(h)=>h.equipe?`Executante(s): ${h.equipe}`:'',
  tx:{ dadosSec:'Dados do ensaio', antes:'Foto do item', depois:'Marcação / etiqueta de ensaio', outras:'Outras fotos (defeitos, detalhes)',
    titulo:'Relatório de Ensaios de EPIs e EPCs Isolantes', arquivo:'Relatorio_Ensaios_EPI_EPC', capa1:'Ensaios de EPIs e EPCs', capa2:'Isolantes', xlsTitulo:'ENSAIOS DE EPIs E EPCs ISOLANTES',
    condSec:'Condições do ensaio e equipamento', normas:NORMAS, criterios:CRITERIOS,
    objetivo:['Este relatório apresenta o resultado da inspeção visual e dos ensaios dielétricos periódicos dos equipamentos de proteção individual (EPI) e coletiva (EPC) isolantes relacionados, em atendimento à NR-10 e à NR-6, com o objetivo de atestar a condição de uso de cada item.',
      'Cada item foi inspecionado, ensaiado com a tensão correspondente à sua classe ou norma e classificado como Conforme (aprovado) ou Não conforme (reprovado), com registro da corrente de fuga quando aplicável.'],
    metodologia:['Limpeza e inspeção visual de cada item (interna e externa), incluindo ensaio de inflação nas luvas.',
      'Ensaio dielétrico em tensão alternada com fonte de alta tensão e medição da corrente de fuga, na tensão e duração definidas por classe e norma; montagem em tanque com água (luvas, mangas, capacetes, calçados), entre eletrodos (tapetes e coberturas) ou por trechos (varas).',
      'Verificação funcional de detectores de tensão, medição da resistência dos cabos dos conjuntos de aterramento temporário e ensaios de continuidade e isolamento das pontas de prova de multímetro.',
      'Itens reprovados identificados e segregados; itens aprovados identificados com a data do ensaio e a data do próximo ensaio.'],
    limitacoes:'O resultado vale para a condição do item na data do ensaio. Danos posteriores, armazenamento inadequado ou uso fora da classe invalidam a aprovação; a inspeção visual antes de cada uso continua obrigatória.',
    consideracoes:'Recomenda-se retirar de uso imediatamente os itens reprovados, manter os aprovados identificados com a data do próximo ensaio e respeitar a periodicidade de reensaio indicada para cada tipo.',
  },
});
})();

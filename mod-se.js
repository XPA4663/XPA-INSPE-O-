/* ======================= MÓDULO: MANUTENÇÃO PREVENTIVA DE SUBESTAÇÃO ======================= */
(function(){
/* ======================= CRITÉRIOS E CHECKLISTS – MANUTENÇÃO PREVENTIVA DE SUBESTAÇÃO ======================= */

/* Níveis de resultado */
const RES={
  ok:  {label:'Conforme',               curto:'Conforme',  acao:'Equipamento em condições normais de operação. Manter o plano de manutenção.'},
  att: {label:'Atenção',                curto:'Atenção',   acao:'Observação registrada: acompanhar e reavaliar na próxima manutenção.'},
  nc:  {label:'Não conforme – programar', curto:'NC – programar', acao:'Não conformidade: programar a correção para a próxima parada.'},
  crit:{label:'Não conforme – urgente', curto:'NC – urgente', acao:'Não conformidade crítica: corrigir imediatamente ou antes da reenergização.'},
  pend:{label:'Sem avaliação',          curto:'Pendente',  acao:'Itens ainda não avaliados.'},
};
const RANK={ok:0,att:1,nc:2,crit:3}; const BYRANK=['ok','att','nc','crit'];
const SEV={A:{label:'A – Urgente',curto:'A',desc:'Risco imediato à segurança ou à continuidade: corrigir de imediato.'},B:{label:'B – Programar',curto:'B',desc:'Deficiência que evolui: corrigir na próxima parada programada.'},C:{label:'C – Observação',curto:'C',desc:'Desvio menor: acompanhar e corrigir em rotina.'}};
const STATUS={C:{label:'Conforme'},A:{label:'Atenção'},NC:{label:'Não conforme'},NA:{label:'Não se aplica'}};
const worst=(a,b)=>{ if(!a) return b; if(!b) return a; return RANK[a]>=RANK[b]?a:b; };

/* ---------- limites automáticos ---------- */
// NETA MTS Tab. 100.1 – resistência de isolamento mínima (MΩ) para disjuntores, chaves, barramentos e cabos, por tensão nominal (V)
function limRI(volts){ if(volts===null) return null; if(volts<=250) return 25; if(volts<=1000) return 100; if(volts<=2500) return 500; if(volts<=5000) return 1000; if(volts<=8000) return 2000; if(volts<=15000) return 5000; if(volts<=25000) return 20000; return 100000; }
// NETA MTS Tab. 100.5 – transformadores (MΩ, a 20 °C)
function limRItrafo(volts,seco){ if(volts===null) return null; if(volts<=600) return seco?500:100; if(volts<=5000) return seco?5000:1000; return seco?25000:5000; }
function kV(v){ const x=num(v); return x===null?null:x*1000; }
const evMin=(val,lim,unit)=>{ if(val===null) return null; if(lim===null) return {st:null,lim:'—'}; return {st:val>=lim?'ok':(val>=lim*0.5?'att':'nc'), lim:'≥ '+fmtN(lim)+' '+unit}; };
const evMax=(val,lim,unit,attFrac)=>{ if(val===null) return null; if(lim===null) return {st:null,lim:'—'}; const f=attFrac||0.8; return {st:val<=lim*f?'ok':(val<=lim?'att':'nc'), lim:'≤ '+fmtN(lim)+' '+unit}; };
function desvioPct(arr){ const v=arr.filter(x=>x!==null); if(v.length<2) return null; const mn=Math.min(...v), mx=Math.max(...v); if(mn<=0) return null; return (mx-mn)/mn*100; }
function desequilibrio(arr){ const v=arr.filter(x=>x!==null); if(v.length<2) return null; const avg=v.reduce((a,b)=>a+b,0)/v.length; if(avg<=0) return null; return Math.max(...v.map(x=>Math.abs(x-avg)))/avg*100; }

/* ---------- tipos de equipamento ---------- */
const TIPOS={
 TR:{nome:'Transformador de força', grupo:'MT/AT', icone:'⚡',
  campos:[['pot','Potência (kVA)'],['un','Tensão AT (kV)'],['ub','Tensão BT (kV)'],['isol','Isolação',['Óleo','Seco']],['in','Corrente nominal BT (A)'],['grupo','Grupo de ligação / TAP']],
  items:[
   ['nivel','Nível de óleo no indicador / conservador','NBR 5356-1','B'],
   ['vaz','Vazamentos de óleo (tanque, radiadores, buchas, válvulas, gaxetas)','NBR 5356-1','B'],
   ['silica','Sílica-gel do desumidificador (cor e saturação)','Fabricante','C'],
   ['buchas','Buchas AT e BT: trincas, trilhamento, sujidade','NBR 5356-1','A'],
   ['term','Conectores e terminais AT/BT: reaperto e oxidação','NBR 5410 / NETA','B'],
   ['vent','Radiadores e ventilação forçada funcionando','Fabricante','B'],
   ['termo','Termômetros de óleo e enrolamento: leitura e ajustes de alarme/desligamento','NBR 5356-2','B'],
   ['buch','Relé de gás (Buchholz), válvula de alívio e relé de pressão súbita','NBR 5356-1','A'],
   ['aterr','Aterramento do tanque e do neutro','NBR 14039','A'],
   ['comut','Comutador de derivações: posição e travamento','Fabricante','B'],
   ['pint','Pintura, corrosão, estado do tanque e da base','NBR 5462','C'],
   ['ruido','Ruído ou vibração anormal','Fabricante','B'],
   ['placa','Placa de identificação legível','NBR 5356-1','C'],
  ],
  meds:[
   {g:'Resistência de isolamento (MΩ)', f:[['ri_atm','AT – massa'],['ri_atbt','AT – BT'],['ri_btm','BT – massa'],['ip','Índice de polarização (10 min / 1 min)'],['ri_temp','Temperatura do ensaio (°C)']], note:'Referência: NETA MTS Tab. 100.5 (a 20 °C) e IEEE C57.152. IP ≥ 1,25 bom; < 1,0 investigar.'},
   {g:'Relação de transformação (TTR)', f:[['rel_desvio','Maior desvio em relação à nominal (%)']], note:'Desvio aceitável: ≤ 0,5 % (NBR 5356-1).'},
   {g:'Resistência ôhmica dos enrolamentos AT (mΩ)', f:[['ro_r','Fase R'],['ro_s','Fase S'],['ro_t','Fase T']], note:'Desvio entre fases ≤ 2 % (NBR 5356-1 / NETA).'},
   {g:'Óleo isolante e temperaturas', f:[['rig','Rigidez dielétrica do óleo (kV)'],['t_oleo','Temperatura do óleo (°C)'],['t_enr','Temperatura do enrolamento (°C)']], note:'Rigidez: ≥ 40 kV bom; 30–40 kV atenção; < 30 kV não conforme (NBR 10576 / IEC 60422, ≤ 72,5 kV). Elevação do óleo ≤ 55 K.'},
  ]},
 DJ:{nome:'Disjuntor MT/AT', grupo:'MT/AT', icone:'🔌',
  campos:[['un','Tensão nominal (kV)'],['in','Corrente nominal (A)'],['meio','Meio de extinção',['SF6','Vácuo','Óleo','Ar']],['nop','Nº de operações (contador)'],['rc_ref','Resist. de contato de referência do fabricante (µΩ)'],['tab_ref','Tempo de abertura máx. do fabricante (ms)'],['tfe_ref','Tempo de fechamento máx. do fabricante (ms)']],
  items:[
   ['geral','Estado geral, limpeza de isoladores e câmaras','NBR IEC 62271-100','C'],
   ['gas','Pressão/densidade de SF6 ou indicador de vácuo dentro da faixa','Fabricante','A'],
   ['cont','Contador de operações registrado e comparado ao limite','Fabricante','C'],
   ['molas','Mecanismo de molas: carregamento, lubrificação, travas','Fabricante','B'],
   ['bob','Bobinas de abertura/fechamento e motor de carregamento','Fabricante','B'],
   ['heat','Resistência de aquecimento (anticondensação)','Fabricante','C'],
   ['intert','Intertravamentos mecânicos e elétricos','NR-10 / NBR 14039','A'],
   ['aterr','Aterramento do carro / estrutura','NBR 14039','A'],
   ['extr','Contatos de extração (carrinho) e garras','Fabricante','B'],
   ['sinal','Sinalização e indicador de posição','NBR IEC 62271-100','C'],
   ['term','Reaperto dos terminais e conexões','NETA MTS','B'],
  ],
  meds:[
   {g:'Resistência de isolamento (MΩ)', f:[['ri_r','Polo R (aberto, entre terminais)'],['ri_s','Polo S'],['ri_t','Polo T'],['ri_m','Fase – massa (fechado)']], note:'Mínimo conforme NETA MTS Tab. 100.1 pela tensão nominal.'},
   {g:'Resistência de contato (µΩ)', f:[['rc_r','Polo R'],['rc_s','Polo S'],['rc_t','Polo T']], note:'Comparar ao fabricante; desvio entre polos ≤ 50 % do menor valor (NETA MTS).'},
   {g:'Tempos de operação (ms)', f:[['tab_r','Abertura R'],['tab_s','Abertura S'],['tab_t','Abertura T'],['tfe_r','Fechamento R'],['tfe_s','Fechamento S'],['tfe_t','Fechamento T']], note:'Simultaneidade entre polos: ≤ 2,8 ms na abertura (1/6 ciclo) e ≤ 4,2 ms no fechamento (1/4 ciclo), 60 Hz.'},
  ]},
 SC:{nome:'Seccionadora / chave MT', grupo:'MT/AT', icone:'🔀',
  campos:[['un','Tensão nominal (kV)'],['in','Corrente nominal (A)'],['tipo','Tipo',['Seccionadora tripolar','Chave fusível','Chave faca','Religador','Chave de aterramento']],['rc_ref','Resist. de contato de referência (µΩ)']],
  items:[
   ['alin','Alinhamento e penetração dos contatos (facas)','Fabricante','B'],
   ['isol','Isoladores: trincas, trilhamento, sujidade','NBR 14039','A'],
   ['cmd','Comando / acionamento (manual ou motorizado)','Fabricante','B'],
   ['intert','Intertravamento com o disjuntor e chave de terra','NR-10 / NBR 14039','A'],
   ['aterr','Aterramento da estrutura e do comando','NBR 14039','A'],
   ['elo','Elos fusíveis dimensionados e identificados','Estudo de proteção','B'],
   ['lub','Lubrificação de articulações e contatos','Fabricante','C'],
   ['term','Reaperto dos terminais','NETA MTS','B'],
  ],
  meds:[
   {g:'Resistência de contato (µΩ)', f:[['rc_r','Fase R'],['rc_s','Fase S'],['rc_t','Fase T']], note:'Desvio entre fases ≤ 50 % do menor valor (NETA MTS).'},
   {g:'Resistência de isolamento (MΩ)', f:[['ri_r','Fase R'],['ri_s','Fase S'],['ri_t','Fase T']], note:'Mínimo conforme NETA MTS Tab. 100.1.'},
  ]},
 PR:{nome:'Para-raios', grupo:'MT/AT', icone:'🛡️',
  campos:[['un','Tensão nominal (kV)'],['in','Corrente de descarga (kA)'],['tipo','Tipo',['ZnO polimérico','ZnO porcelana','Carboneto de silício']],['fuga_ref','Corrente de fuga de referência (mA)']],
  items:[
   ['inv','Invólucro: trincas, trilhamento, poluição','NBR 16050','A'],
   ['desc','Desconectador / contador de descargas','Fabricante','C'],
   ['aterr','Conexão e condutor de aterramento','NBR 14039','A'],
   ['dist','Distâncias de segurança e fixação','NBR 14039','B'],
  ],
  meds:[
   {g:'Corrente de fuga (mA)', f:[['fuga_r','Fase R'],['fuga_s','Fase S'],['fuga_t','Fase T']], note:'Comparar à referência do fabricante; acima dela: não conforme.'},
   {g:'Resistência de isolamento (MΩ)', f:[['ri_r','Fase R'],['ri_s','Fase S'],['ri_t','Fase T']], note:'Referência: ≥ 1000 MΩ.'},
  ]},
 TI:{nome:'TC / TP (instrumentos)', grupo:'MT/AT', icone:'📐',
  campos:[['un','Tensão nominal (kV)'],['tipo','Tipo',['TC','TP','TC + TP']],['rel','Relação nominal']],
  items:[
   ['isol','Isolação externa: trincas, sujidade','NBR 6856 / 6855','A'],
   ['fix','Fixação e terminais do primário','NETA MTS','B'],
   ['aterr','Aterramento do secundário e da carcaça','NBR 14039','A'],
   ['born','Bornes secundários identificados e apertados','NBR 14039','B'],
   ['curto','TCs não utilizados curto-circuitados','NBR 14039','A'],
   ['fus','Fusíveis de proteção dos TPs','Estudo de proteção','B'],
  ],
  meds:[
   {g:'Resistência de isolamento (MΩ)', f:[['ri_pm','Primário – massa'],['ri_ps','Primário – secundário'],['ri_sm','Secundário – massa']], note:'Mínimo conforme NETA MTS Tab. 100.5 (seco).'},
   {g:'Relação', f:[['rel_desvio','Maior desvio da relação nominal (%)']], note:'TP: ≤ 0,5 %. TC: conforme classe de exatidão.'},
  ]},
 BM:{nome:'Barramentos, cabos e muflas MT', grupo:'MT/AT', icone:'➖',
  campos:[['un','Tensão nominal (kV)'],['in','Corrente nominal (A)'],['desc','Descrição (trecho / cubículo)']],
  items:[
   ['reap','Reaperto das conexões com torque','NETA MTS','B'],
   ['oxid','Oxidação, descoloração ou sinais de aquecimento','NBR 14039','A'],
   ['isol','Isoladores suporte e passagem','NBR 14039','A'],
   ['dist','Distâncias de isolamento fase-fase e fase-terra','NBR 14039','A'],
   ['mufla','Muflas e terminações: trincas, trilhamento, fixação','NBR 14039','A'],
   ['ident','Identificação de fases e circuitos','NBR 14039','C'],
   ['limp','Limpeza de barramentos e isoladores','NBR 5462','C'],
   ['cabos','Estado dos cabos, suportes e blindagem aterrada','NBR 14039','B'],
  ],
  meds:[
   {g:'Resistência de isolamento fase – terra (MΩ)', f:[['ri_r','Fase R'],['ri_s','Fase S'],['ri_t','Fase T']], note:'Mínimo conforme NETA MTS Tab. 100.1 pela tensão nominal.'},
  ]},
 QB:{nome:'Cubículo BT / QGBT / painel', grupo:'BT', icone:'🗄️',
  campos:[['un','Tensão nominal (kV)','','0,38'],['in','Corrente nominal do geral (A)'],['desc','Descrição (QGBT, QD, CCM…)']],
  items:[
   ['limp','Limpeza interna e ausência de corpos estranhos','NBR 5410','C'],
   ['reap','Reaperto de conexões e bornes','NBR 5410','B'],
   ['ident','Identificação de circuitos e diagrama atualizado','NBR 5410','C'],
   ['dps','DPS: estado, sinalização e aterramento','NBR 5410 / 5419','B'],
   ['disj','Disjuntores: estado, operação, calibre conforme projeto','NBR 5410','B'],
   ['barra','Barramentos, isoladores e separações','NBR IEC 61439','B'],
   ['aterr','Aterramento da carcaça, portas e equipotencialização','NBR 5410','A'],
   ['portas','Portas, fechos, vedação e grau de proteção IP','NBR IEC 61439','B'],
   ['aquec','Sinais de aquecimento ou descoloração','NBR 5410','A'],
   ['ilum','Iluminação e ventilação do recinto','NR-10','C'],
  ],
  meds:[
   {g:'Tensões (V)', f:[['v_rs','R – S'],['v_st','S – T'],['v_tr','T – R']], note:'Desequilíbrio de tensão ≤ 2 % bom; até 3 % atenção (PRODIST Módulo 8).'},
   {g:'Correntes (A)', f:[['i_r','Fase R'],['i_s','Fase S'],['i_t','Fase T'],['i_n','Neutro']], note:'Carregamento > 80 % da nominal: atenção; > 100 %: não conforme. Desequilíbrio de corrente > 10 %: atenção; > 20 %: não conforme.'},
   {g:'Resistência de isolamento dos circuitos (MΩ)', f:[['ri_min','Menor valor medido']], note:'≥ 1,0 MΩ a 500 Vcc (NBR 5410 Tab. 59).'},
  ]},
 PC:{nome:'Proteção, comando e serviços auxiliares', grupo:'Proteção', icone:'🧭',
  campos:[['desc','Descrição (painel de proteção, relés, banco CC)'],['rele','Relés (modelo / funções)'],['bat','Tipo de bateria',['Chumbo-ácido ventilada','VRLA / estacionária','Alcalina (NiCd)','Não há']],['vnom','Tensão nominal do banco (Vcc)'],['nel','Nº de elementos']],
  items:[
   ['ajust','Ajustes dos relés conforme estudo de seletividade','Estudo de proteção','A'],
   ['trip','Teste funcional de atuação (trip) e religamento','NETA MTS','A'],
   ['sinal','Sinalizações, alarmes e anunciadores','NBR 14039','B'],
   ['med','Medidores e indicadores','NBR 14039','C'],
   ['batv','Banco de baterias: bornes, eletrólito, corrosão, ventilação','NBR 14039','B'],
   ['retif','Retificador / carregador: tensão de flutuação e alarmes','Fabricante','B'],
   ['cabos','Cabos de comando e bornes identificados','NBR 14039','C'],
   ['fus','Fusíveis e disjuntores dos circuitos auxiliares','NBR 14039','B'],
   ['doc','Documentação de ajustes e ensaios disponível','NR-10','C'],
  ],
  meds:[
   {g:'Banco de baterias', f:[['v_banco','Tensão total do banco (Vcc)'],['v_elmin','Menor tensão por elemento (V)'],['v_elmax','Maior tensão por elemento (V)']], note:'Desvio da tensão nominal ≤ 5 % bom; até 10 % atenção. Dispersão entre elementos > 0,10 V: atenção.'},
   {g:'Teste funcional', f:[['t_trip','Tempo de atuação medido (ms)'],['t_ref','Tempo esperado (ms)']], note:'Tempo medido até 10 % acima do esperado: conforme.'},
  ]},
 AT:{nome:'Aterramento e SPDA da subestação', grupo:'Aterramento', icone:'🌍',
  campos:[['desc','Descrição (malha, hastes, SPDA)'],['r_ref','Resistência máxima de projeto (Ω)','','10']],
  items:[
   ['conex','Conexões visíveis da malha (soldas, conectores)','NBR 15751','B'],
   ['cont','Continuidade de cercas, portões e estruturas metálicas','NBR 15751','A'],
   ['hastes','Hastes, caixas de inspeção e condutores expostos','NBR 15751','C'],
   ['spda','Captores, descidas e conexões do SPDA','NBR 5419','B'],
   ['equip','Equipotencialização de neutros, carcaças e blindagens','NBR 14039','A'],
   ['corr','Corrosão em condutores e conectores','NBR 15751','B'],
  ],
  meds:[
   {g:'Medições', f:[['r_malha','Resistência da malha (Ω)'],['r_cont','Maior resistência de continuidade (Ω)']], note:'Malha: conforme até o valor de projeto; até 2× atenção. Continuidade ≤ 1 Ω.'},
  ]},
 CG:{nome:'Civil, segurança e documentação', grupo:'Geral', icone:'🏗️',
  campos:[['desc','Descrição']],
  items:[
   ['acesso','Cercas, portas, cadeados e controle de acesso','NR-10','B'],
   ['sinal','Sinalização de segurança (advertência, perigo de morte)','NR-10 / NR-26','B'],
   ['ilum','Iluminação normal e de emergência','NR-10','C'],
   ['ext','Extintores dentro da validade e sinalizados','NR-23','B'],
   ['epc','EPC e EPI disponíveis (tapete, bastão, detector, luvas)','NR-10','B'],
   ['dren','Drenagem, infiltrações e bacia de contenção de óleo','NBR 14039','B'],
   ['limp','Limpeza, vegetação e organização','NBR 5462','C'],
   ['eletro','Eletrodutos, canaletas e caixas de passagem','NBR 14039','C'],
   ['doc','Documentação: unifilar, prontuário NR-10, laudo SPDA, ART','NR-10','B'],
  ],
  meds:[]},
};
const TIPOS_ORD=['TR','DJ','SC','PR','TI','BM','QB','PC','AT','CG'];

function novoEquip(tipo,base){
  const T=TIPOS[tipo]; const d={tag:'',local:'',fab:'',modelo:'',serie:'',ano:''};
  T.campos.forEach(c=>{ d[c[0]]=c[3]||''; });
  if(base){ Object.assign(d, JSON.parse(JSON.stringify(base.d))); d.tag=''; d.serie=''; }
  return {id:uid('eq'), tipo, d, items:{}, m:{}, pantes:[], pdepois:[], photos:[], diag:'', rec:'', manual:'', just:''};
}
function photoIds(e){ return [...(e.pantes||[]),...(e.pdepois||[]),...(e.photos||[]),...Object.values(e.items||{}).flatMap(it=>it.photos||[])]; }

/* ---------- avaliação automática das medições ---------- */
function avaliarMeds(e,h){
  const T=TIPOS[e.tipo], m=e.m||{}, d=e.d||{}, out=[];
  const v=(k)=>num(m[k]);
  const add=(label,val,unit,ev,extra)=>{ if(val===null&&!extra) return; out.push({label, val:val===null?'-':fmtN(val)+(unit?' '+unit:''), lim:ev?ev.lim:'—', st:ev?ev.st:null, extra}); };
  const volts=kV(d.un);
  if(e.tipo==='TR'){
    const lim=limRItrafo(volts, d.isol==='Seco');
    [['ri_atm','RI AT – massa'],['ri_atbt','RI AT – BT'],['ri_btm','RI BT – massa']].forEach(([k,l])=>add(l,v(k),'MΩ',evMin(v(k),lim,'MΩ')));
    const ip=v('ip'); if(ip!==null) add('Índice de polarização',ip,'',{st:ip>=1.25?'ok':ip>=1?'att':'nc',lim:'≥ 1,25'});
    const rd=v('rel_desvio'); if(rd!==null) add('Desvio da relação (TTR)',rd,'%',{st:Math.abs(rd)<=0.5?'ok':Math.abs(rd)<=1?'att':'nc',lim:'≤ 0,5 %'});
    const ro=desvioPct([v('ro_r'),v('ro_s'),v('ro_t')]); if(ro!==null) add('Desvio da resist. ôhmica entre fases',ro,'%',{st:ro<=2?'ok':ro<=3?'att':'nc',lim:'≤ 2 %'});
    const rig=v('rig'); if(rig!==null) add('Rigidez dielétrica do óleo',rig,'kV',{st:rig>=40?'ok':rig>=30?'att':'nc',lim:'≥ 40 kV'});
    const to=v('t_oleo'), ta=num(h.tamb); if(to!==null){ const el=ta!==null?to-ta:null; add('Temperatura do óleo'+(el!==null?' (elevação '+f1(el,0)+' K)':''),to,'°C',el!==null?{st:el<=45?'ok':el<=55?'att':'nc',lim:'elev. ≤ 55 K'}:null); }
    const te=v('t_enr'); if(te!==null) add('Temperatura do enrolamento',te,'°C',{st:te<=95?'ok':te<=105?'att':'nc',lim:'≤ 105 °C'});
  }
  if(e.tipo==='DJ'||e.tipo==='SC'||e.tipo==='BM'||e.tipo==='PR'){
    const lim=e.tipo==='PR'?1000:limRI(volts);
    [['ri_r','RI fase R'],['ri_s','RI fase S'],['ri_t','RI fase T'],['ri_m','RI fase – massa']].forEach(([k,l])=>{ if(k in m||v(k)!==null) add(l,v(k),'MΩ',evMin(v(k),lim,'MΩ')); });
  }
  if(e.tipo==='DJ'||e.tipo==='SC'){
    const rc=[v('rc_r'),v('rc_s'),v('rc_t')], ref=num(d.rc_ref);
    rc.forEach((x,i)=>{ if(x!==null) add('Resist. de contato '+'RST'[i],x,'µΩ',ref!==null?evMax(x,ref,'µΩ',1):null); });
    const dv=rc.filter(x=>x!==null); if(dv.length>=2){ const mn=Math.min(...dv), mx=Math.max(...dv); const p=mn>0?(mx-mn)/mn*100:null; if(p!==null) add('Desvio entre polos (contato)',p,'%',{st:p<=50?'ok':'nc',lim:'≤ 50 %'}); }
  }
  if(e.tipo==='DJ'){
    const ab=[v('tab_r'),v('tab_s'),v('tab_t')], fe=[v('tfe_r'),v('tfe_s'),v('tfe_t')];
    const aref=num(d.tab_ref), fref=num(d.tfe_ref);
    const sim=(arr)=>{ const w=arr.filter(x=>x!==null); return w.length>=2?Math.max(...w)-Math.min(...w):null; };
    const am=ab.filter(x=>x!==null); if(am.length){ const mx=Math.max(...am); add('Tempo de abertura (máx.)',mx,'ms',aref!==null?evMax(mx,aref,'ms',1):null); const s=sim(ab); if(s!==null) add('Simultaneidade na abertura',s,'ms',{st:s<=2.8?'ok':s<=4.2?'att':'nc',lim:'≤ 2,8 ms'}); }
    const fm=fe.filter(x=>x!==null); if(fm.length){ const mx=Math.max(...fm); add('Tempo de fechamento (máx.)',mx,'ms',fref!==null?evMax(mx,fref,'ms',1):null); const s=sim(fe); if(s!==null) add('Simultaneidade no fechamento',s,'ms',{st:s<=4.2?'ok':s<=6?'att':'nc',lim:'≤ 4,2 ms'}); }
  }
  if(e.tipo==='PR'){
    const ref=num(d.fuga_ref); [['fuga_r','Corrente de fuga R'],['fuga_s','Corrente de fuga S'],['fuga_t','Corrente de fuga T']].forEach(([k,l])=>{ const x=v(k); if(x!==null) add(l,x,'mA',ref!==null?evMax(x,ref,'mA',0.8):null); });
  }
  if(e.tipo==='TI'){
    const lim=limRItrafo(volts,true);
    [['ri_pm','RI primário – massa'],['ri_ps','RI primário – secundário'],['ri_sm','RI secundário – massa']].forEach(([k,l])=>add(l,v(k),'MΩ',evMin(v(k),lim,'MΩ')));
    const rd=v('rel_desvio'); if(rd!==null) add('Desvio da relação',rd,'%',{st:Math.abs(rd)<=0.5?'ok':Math.abs(rd)<=1?'att':'nc',lim:'≤ 0,5 %'});
  }
  if(e.tipo==='QB'){
    const dv=desequilibrio([v('v_rs'),v('v_st'),v('v_tr')]); if(dv!==null) add('Desequilíbrio de tensão',dv,'%',{st:dv<=2?'ok':dv<=3?'att':'nc',lim:'≤ 2 %'});
    const ii=[v('i_r'),v('i_s'),v('i_t')]; const di=desequilibrio(ii); if(di!==null) add('Desequilíbrio de corrente',di,'%',{st:di<=10?'ok':di<=20?'att':'nc',lim:'≤ 10 %'});
    const inom=num(d.in), im=ii.filter(x=>x!==null); if(inom&&im.length){ const c=Math.max(...im)/inom*100; add('Carregamento máximo',c,'%',{st:c<=80?'ok':c<=100?'att':'nc',lim:'≤ 80 %'}); }
    const inn=v('i_n'); if(inn!==null&&im.length){ const p=inn/Math.max(...im)*100; add('Corrente de neutro / maior fase',p,'%',{st:p<=30?'ok':p<=50?'att':'nc',lim:'≤ 30 %'}); }
    const ri=v('ri_min'); if(ri!==null) add('RI mínima dos circuitos',ri,'MΩ',{st:ri>=1?'ok':ri>=0.5?'att':'nc',lim:'≥ 1,0 MΩ'});
  }
  if(e.tipo==='PC'){
    const vb=v('v_banco'), vn=num(d.vnom); if(vb!==null){ const p=vn?Math.abs(vb-vn)/vn*100:null; add('Tensão do banco'+(p!==null?' (desvio '+f1(p)+' %)':''),vb,'Vcc',p!==null?{st:p<=5?'ok':p<=10?'att':'nc',lim:'desvio ≤ 5 %'}:null); }
    const a=v('v_elmin'), b=v('v_elmax'); if(a!==null&&b!==null){ const s=b-a; add('Dispersão entre elementos',s,'V',{st:s<=0.1?'ok':s<=0.2?'att':'nc',lim:'≤ 0,10 V'}); }
    const t=v('t_trip'), tr=v('t_ref'); if(t!==null) add('Tempo de atuação',t,'ms',tr!==null?{st:t<=tr*1.1?'ok':t<=tr*1.3?'att':'nc',lim:'≤ '+fmtN(tr*1.1)+' ms'}:null);
  }
  if(e.tipo==='AT'){
    const r=v('r_malha'), ref=num(d.r_ref)||10; if(r!==null) add('Resistência da malha',r,'Ω',{st:r<=ref?'ok':r<=ref*2?'att':'nc',lim:'≤ '+fmtN(ref)+' Ω'});
    const c=v('r_cont'); if(c!==null) add('Continuidade',c,'Ω',{st:c<=1?'ok':c<=2?'att':'nc',lim:'≤ 1 Ω'});
  }
  return out;
}

/* resultado consolidado do equipamento */
function equipResult(e,h){
  h=h||(CUR&&CUR.h)||{}; const T=TIPOS[e.tipo]; let auto=null, n={C:0,A:0,NC:0,NA:0}, ncs=[];
  for(const it of T.items){ const r=(e.items||{})[it[0]]; if(!r||!r.s) continue; n[r.s]=(n[r.s]||0)+1;
    if(r.s==='A') auto=worst(auto,'att');
    if(r.s==='NC'){ const sev=r.sev||it[3]; auto=worst(auto, sev==='A'?'crit':sev==='B'?'nc':'att'); ncs.push({item:it, sev, obs:r.obs||''}); } }
  const meds=avaliarMeds(e,h); const medBad=meds.filter(x=>x.st&&x.st!=='ok');
  for(const x of meds){ if(x.st==='ok') auto=worst(auto,'ok'); if(x.st==='att') auto=worst(auto,'att'); if(x.st==='nc') auto=worst(auto,'nc'); }
  if((n.C||n.NA)&&!auto) auto='ok';
  const total=T.items.length, done=n.C+n.A+n.NC+n.NA;
  const k=e.manual||auto||'pend';
  return {k,label:RES[k].label,curto:RES[k].curto,auto,n,done,total,ncs,meds,medBad,manual:!!e.manual};
}

const CONDICOES=['Desligamento total','Desligamento parcial','Sem desligamento (energizada)'];
function eqTitle(e){ const T=TIPOS[e.tipo]; return (e.d.tag||T.nome); }
function vJob(){
  const h=CUR.h; CUR.items=CUR.items||[];
  const grupos=[['MT/AT','Média e alta tensão'],['BT','Baixa tensão'],['Proteção','Proteção e serviços auxiliares'],['Aterramento','Aterramento e SPDA'],['Geral','Civil, segurança e documentação']];
  $('#app').innerHTML = storageBanner() + `<div class="row" style="margin-bottom:8px"><button id="back">‹ Trabalhos</button></div>
  <div class="sec">Dados da manutenção</div>
  <div class="card" id="hf"><div class="grid">
    ${field('numero','Nº do relatório',h,'text','Ex.: RT-26-001')}
    ${field('data','Data',h,'date')}
    ${field('cliente','Cliente',h)}
    ${field('subestacao','Subestação (nome / TAG)',h,'text','Ex.: SE-01 Principal')}
    ${field('local','Endereço / unidade',h)}
    ${field('tensoes','Tensões (AT / MT / BT)',h,'text','Ex.: 13,8 kV / 380-220 V')}
    ${field('potencia','Potência instalada (kVA)',h,'text','',DEC)}
    ${field('os','Ordem de serviço / contrato',h)}
    ${field('equipe','Equipe executante',h,'text','Nomes dos técnicos')}
    ${field('acompanhante','Acompanhante do cliente',h)}
    ${field('resp','Responsável técnico',h)}
    ${sel('condicao','Condição da intervenção',h,CONDICOES)}
  </div></div>
  <div class="sec">Condições e instrumentos</div>
  <div class="card" id="cf"><div class="grid">
    ${field('clima','Condição climática',h,'text','Ex.: tempo seco, céu limpo')}
    ${field('tamb','Temperatura ambiente (°C)',h,'text','',DEC)}
    ${field('umid','Umidade relativa (%)',h,'text','',DEC)}
  </div>${field('instrumentos','Instrumentos utilizados (modelo, série, calibração)',h,'textarea','Ex.: Megôhmetro Megger MIT1025 nº 123 – cal. 05/2026; Microhmímetro …')}
  ${field('obs','Observações gerais',h,'textarea')}</div>
  <div class="sec">Equipamentos (${CUR.items.length})</div>
  ${grupos.map(([g,gn])=>{ const eqs=CUR.items.filter(e=>TIPOS[e.tipo].grupo===g); if(!eqs.length) return ''; return `<div class="note" style="margin:6px 2px 4px;font-weight:bold">${gn}</div><div class="list">${eqs.map(e=>{ const r=equipResult(e); const i=CUR.items.indexOf(e)+1; const T=TIPOS[e.tipo];
    return `<div class="it" data-e="${e.id}"><div style="font-size:20px">${T.icone}</div><div style="flex:1"><div class="t">${i}. ${esc(eqTitle(e))}</div>
    <div class="s">${esc(T.nome)}${e.d.local?' · '+esc(e.d.local):''} · ${r.done}/${r.total} itens${r.ncs.length?' · '+r.ncs.length+' NC':''}</div></div><span class="pill p-${r.k}">${r.curto}</span></div>`;}).join('')}</div>`; }).join('') || '<div class="empty">Nenhum equipamento cadastrado.</div>'}
  `+jobFooter();
  bindFields($('#hf'),h); bindFields($('#cf'),h);
  bindJobFooter();
  document.querySelectorAll('[data-e]').forEach(el=>el.onclick=()=>{ ITEM=CUR.items.find(e=>e.id===el.dataset.e); go('item'); });
  setBar(`<button class="btn" id="adde">+ Adicionar equipamento</button><button class="btn gold" id="pdf">Gerar relatório</button>`);
  $('#adde').onclick=escolherTipo;
  $('#pdf').onclick=escolherRelatorio;
}
function escolherTipo(){
  $('#mbox').innerHTML=`<p style="margin-top:0;font-weight:bold;color:var(--navy)">Tipo de equipamento</p>
  <div style="display:grid;gap:6px;max-height:60vh;overflow:auto">${TIPOS_ORD.map(k=>`<button class="tp" data-t="${k}" style="text-align:left">${TIPOS[k].icone} ${esc(TIPOS[k].nome)} <span class="note">· ${esc(TIPOS[k].grupo)}</span></button>`).join('')}</div>
  <div class="row" style="justify-content:flex-end;margin-top:8px"><button id="mn">Cancelar</button></div>`;
  $('#modal').classList.add('show');
  $('#mn').onclick=()=>$('#modal').classList.remove('show');
  document.querySelectorAll('.tp').forEach(b=>b.onclick=()=>{ $('#modal').classList.remove('show'); ITEM=novoEquip(b.dataset.t); CUR.items.push(ITEM); saveCur(); go('item'); });
}

function vItem(){
  const e=ITEM, d=e.d, T=TIPOS[e.tipo]; e.items=e.items||{}; e.m=e.m||{}; e.pantes=e.pantes||[]; e.pdepois=e.pdepois||[]; e.photos=e.photos||[];
  const idx=CUR.items.indexOf(e)+1;
  const campo=(c)=>c[2]&&Array.isArray(c[2])?sel(c[0],c[1],d,c[2]):field(c[0],c[1],d,'text',c[3]?'Padrão: '+c[3]:'',/\(k?V|kVA|\(A\)|\(ms\)|Ω|mA|kA|Vcc|elementos/.test(c[1])?DEC:'');
  $('#app').innerHTML = `<div class="row" style="margin-bottom:8px"><button id="back">‹ ${esc(CUR.h.subestacao||CUR.h.cliente||'Manutenção')}</button></div>
  <div class="card"><div class="result"><div><div style="font-weight:bold;color:var(--navy)" id="rtag">${T.icone} ${idx}. ${esc(eqTitle(e))}</div><div class="note" id="rcalc"></div></div><span class="pill" id="rpill"></span></div>
  <div class="note" id="racao" style="margin-top:6px"></div><div class="prog"><div id="rprog" style="width:0"></div></div></div>
  <div class="sec">Identificação – ${esc(T.nome)}</div>
  <div class="card" id="ef"><div class="grid">
    ${field('tag','TAG / identificação',d)}${field('local','Localização (cubículo, sala, pátio)',d)}
    ${field('fab','Fabricante',d)}${field('modelo','Modelo / tipo',d)}
    ${field('serie','Nº de série',d)}${field('ano','Ano de fabricação',d)}
    ${T.campos.map(campo).join('')}
  </div></div>
  <div class="sec">Checklist de inspeção</div>
  <div class="grp" style="border:none;background:none">${T.items.map(it=>{ const r=e.items[it[0]]||{}; const show=r.s==='A'||r.s==='NC';
    return `<div class="item card" style="margin-bottom:8px" data-it="${it[0]}"><div class="q">${esc(it[1])}</div><div class="ref">Ref.: ${esc(it[2])} · severidade padrão ${it[3]}</div>
    <div class="seg">${['C','A','NC','NA'].map(s=>`<button data-s="${s}" class="${r.s===s?'on s-'+s:''}">${s==='C'?'Conforme':s==='A'?'Atenção':s==='NC'?'Não conf.':'N/A'}</button>`).join('')}</div>
    <div class="extra ${show?'show':''}">${sel('sev','Severidade',Object.assign({sev:r.sev||it[3]},{}),[['A',SEV.A.label],['B',SEV.B.label],['C',SEV.C.label]])}
      <label>Observação / evidência</label><textarea data-k="obs" placeholder="Descreva o que foi encontrado">${esc(r.obs||'')}</textarea>
      <label>Fotos do item</label><div class="row">${photoBtns(`data-slot="item:${it[0]}"`)}</div><div class="thumbs" id="th_item_${it[0]}"></div></div></div>`; }).join('')}</div>
  ${T.meds.length?`<div class="sec">Medições e ensaios</div>
  <div class="card" id="mm">${T.meds.map(g=>`<div style="font-weight:bold;color:var(--navy);margin:8px 0 2px">${esc(g.g)}</div><div class="grid">${g.f.map(f=>field(f[0],f[1],e.m,'text','',DEC)).join('')}</div><div class="note">${esc(g.note)}</div>`).join('')}
  <div id="medres" style="margin-top:10px"></div></div>`:''}
  <div class="sec">Fotos do equipamento</div>
  <div class="card">
    <label>Antes da manutenção</label><div class="row">${photoBtns('data-slot="pantes"')}</div><div class="thumbs" id="th_pantes"></div>
    <label>Depois da manutenção</label><div class="row">${photoBtns('data-slot="pdepois"')}</div><div class="thumbs" id="th_pdepois"></div>
    <label>Outras fotos (placa, detalhes)</label><div class="row">${photoBtns('data-slot="photos"')}</div><div class="thumbs" id="th_photos"></div>
  </div>
  <div class="sec">Parecer e classificação</div>
  <div class="card" id="df">
    ${field('diag','Diagnóstico / serviços executados',e,'textarea','Ex.: reaperto geral, limpeza, substituição de sílica-gel; constatada fuga de óleo na bucha X1')}
    ${field('rec','Recomendações',e,'textarea','Ex.: substituir gaxeta da bucha X1 na próxima parada; reensaiar em 12 meses')}
    ${sel('manual','Classificação do equipamento',e,[['','Automática (checklist + medições)'],['ok',RES.ok.label],['att',RES.att.label],['nc',RES.nc.label],['crit',RES.crit.label]])}
    <div id="jwrap">${field('just','Justificativa da classificação manual',e,'textarea')}</div>
  </div>
  <div class="row"><button class="btn ghost" id="dup">Duplicar equipamento</button><button class="btn danger" id="dele">Excluir equipamento</button></div>`;
  const upd=()=>{ $('#rtag').textContent=`${T.icone} ${idx}. ${eqTitle(e)}`; refreshCalc(); };
  bindFields($('#ef'),d,upd); if($('#mm')) bindFields($('#mm'),e.m,upd); bindFields($('#df'),e,upd);
  // checklist
  document.querySelectorAll('[data-it]').forEach(box=>{
    const id=box.dataset.it; const it=T.items.find(x=>x[0]===id);
    const get=()=>e.items[id]||(e.items[id]={s:'',sev:it[3],obs:'',photos:[]});
    box.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{ const r=get(); r.s=(r.s===b.dataset.s)?'':b.dataset.s; if(!r.sev) r.sev=it[3];
      box.querySelectorAll('.seg button').forEach(x=>x.className=(x.dataset.s===r.s)?'on s-'+r.s:''); box.querySelector('.extra').classList.toggle('show',r.s==='A'||r.s==='NC'); saveCur(); refreshCalc(); });
    box.querySelector('select[data-k=sev]').onchange=(ev)=>{ get().sev=ev.target.value; saveCur(); refreshCalc(); };
    box.querySelector('textarea[data-k=obs]').oninput=(ev)=>{ get().obs=ev.target.value; saveCur(); };
  });
  $('#back').onclick=()=>go('job');
  $('#dup').onclick=()=>{ const n=novoEquip(e.tipo,e); const i=CUR.items.indexOf(e); CUR.items.splice(i+1,0,n); ITEM=n; saveCur(); go('item'); toast('Equipamento duplicado: informe a TAG e o nº de série.'); };
  $('#dele').onclick=()=>confirmBox('Excluir este equipamento?', async()=>{
    for(const p of photoIds(e)) await delDoc(p);
    CUR.items=CUR.items.filter(x=>x!==e); saveCur(); go('job');
  });
  // fotos
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
  ['pantes','pdepois','photos'].forEach(drawSlot);
  T.items.forEach(it=>{ if((e.items[it[0]]||{}).photos?.length) drawSlot('item:'+it[0]); });
  refreshCalc();
  setBar(`<button class="btn" id="nx">Próximo equipamento</button><button class="btn gold" id="pdf2">Gerar relatório</button>`);
  $('#nx').onclick=()=>{ const i=CUR.items.indexOf(e); if(i<CUR.items.length-1){ ITEM=CUR.items[i+1]; go('item'); } else go('job'); };
  $('#pdf2').onclick=escolherRelatorio;
}
function refreshCalc(){
  const e=ITEM, r=equipResult(e);
  $('#rpill').className='pill p-'+r.k; $('#rpill').textContent=r.curto;
  $('#rcalc').textContent=`Checklist ${r.done}/${r.total} · C ${r.n.C||0} · Atenção ${r.n.A||0} · NC ${r.n.NC||0} · N/A ${r.n.NA||0}${r.meds.length?' · medições fora do limite: '+r.medBad.length:''}`;
  $('#racao').textContent = r.k==='pend' ? 'Avalie os itens do checklist e registre as medições.' : (RES[r.k].acao + (r.manual?' (classificação manual)':''));
  $('#rprog').style.width=(r.total?Math.round(r.done/r.total*100):0)+'%';
  $('#jwrap').style.display = e.manual?'block':'none';
  const mr=$('#medres'); if(mr){ mr.innerHTML = r.meds.length? `<table style="width:100%;border-collapse:collapse;font-size:12px">${r.meds.map(x=>`<tr style="border-top:1px solid var(--line)"><td style="padding:4px 2px">${esc(x.label)}</td><td style="padding:4px 2px;text-align:right;white-space:nowrap">${esc(x.val)}</td><td style="padding:4px 2px;color:var(--muted);white-space:nowrap">${esc(x.lim)}</td><td style="padding:4px 2px;text-align:right">${x.st?`<span class="pill p-${x.st}">${x.st==='ok'?'OK':x.st==='att'?'Atenção':'NC'}</span>`:''}</td></tr>`).join('')}</table>` : '<div class="note">Informe as medições para a avaliação automática.</div>'; }
}

const C_RES={ok:[46,125,50],att:[181,134,0],nc:[211,84,0],crit:[198,40,40],pend:[138,147,166]};
const C_ST={C:[46,125,50],A:[181,134,0],NC:[198,40,40],NA:[138,147,166]};
const NORMAS = [
  ['ABNT NBR 5410', 'Instalações elétricas de baixa tensão'],
  ['ABNT NBR 14039', 'Instalações elétricas de média tensão de 1,0 kV a 36,2 kV'],
  ['ABNT NBR 5356', 'Transformadores de potência – requisitos e ensaios'],
  ['ABNT NBR 10576', 'Óleo mineral isolante de equipamentos elétricos – diretrizes para supervisão e manutenção'],
  ['ABNT NBR IEC 62271-100', 'Disjuntores de alta tensão de corrente alternada'],
  ['ABNT NBR 15751', 'Sistemas de aterramento de subestações – requisitos'],
  ['ABNT NBR 5419', 'Proteção contra descargas atmosféricas'],
  ['ABNT NBR 5462', 'Confiabilidade e mantenabilidade – terminologia'],
  ['ANSI/NETA MTS', 'Especificação para ensaios de manutenção de equipamentos e sistemas elétricos de potência (Tabelas 100.1 e 100.5)'],
  ['IEEE C57.152 / IEEE 43', 'Diagnóstico de transformadores e resistência de isolamento (IP/DAR)'],
  ['NR-10', 'Segurança em instalações e serviços em eletricidade'],
  ['PRODIST Módulo 8', 'Qualidade da energia – desequilíbrio de tensão'],
];
const CRITERIOS=[
  ['Resistência de isolamento','Mínimos da ANSI/NETA MTS Tab. 100.1 (chaves, disjuntores, barramentos, cabos) e Tab. 100.5 (transformadores), pela tensão nominal; ≥ 1,0 MΩ nos circuitos BT (NBR 5410).'],
  ['Índice de polarização','≥ 1,25 bom; 1,0 a 1,25 atenção; < 1,0 investigar (IEEE 43 / C57.152).'],
  ['Relação de transformação','Desvio ≤ 0,5 % da nominal (NBR 5356-1).'],
  ['Resistência ôhmica','Desvio entre fases ≤ 2 %.'],
  ['Resistência de contato','Comparada ao fabricante; desvio entre polos ≤ 50 % do menor valor (NETA MTS).'],
  ['Tempos de disjuntor','Dentro do fabricante; simultaneidade ≤ 2,8 ms (abertura) e ≤ 4,2 ms (fechamento).'],
  ['Óleo isolante','Rigidez ≥ 40 kV bom; 30–40 kV atenção; < 30 kV não conforme (NBR 10576 / IEC 60422).'],
  ['Aterramento','Resistência da malha ≤ valor de projeto (padrão 10 Ω); continuidade ≤ 1 Ω.'],
  ['Painéis BT','Desequilíbrio de tensão ≤ 2 %; de corrente ≤ 10 %; carregamento ≤ 80 % da nominal.'],
];

async function gerarPDF(){
  if(!pdfPronto()) return;
  if(!CUR.items.length){ toast('Adicione ao menos um equipamento.'); return; }
  toast('Gerando relatório...');
  const h=CUR.h; const K=pdfKit(h); const {doc,W,H,M,INK,LIGHT,band,sec,para,bul,tbl,ensure,TOC}=K;
  const title='Relatório de Manutenção Preventiva – Subestação';
  const eqs=CUR.items, res=eqs.map(e=>equipResult(e,h));
  const cnt=k=>res.filter(r=>r.k===k).length;
  const eqName=(e,i)=>`${i+1}. ${eqTitle(e)}`;
  const plano=[];
  eqs.forEach((e,i)=>{ const T=TIPOS[e.tipo];
    for(const it of T.items){ const r=(e.items||{})[it[0]]; if(!r||(r.s!=='NC'&&r.s!=='A')) continue; plano.push({eq:eqName(e,i),tipo:T.nome,item:it[1],st:r.s,sev:r.s==='NC'?(r.sev||it[3]):'C',obs:r.obs||''}); }
    for(const x of res[i].medBad) plano.push({eq:eqName(e,i),tipo:T.nome,item:`${x.label}: ${x.val} (limite ${x.lim})`,st:x.st==='nc'?'NC':'A',sev:x.st==='nc'?'B':'C',obs:'Medição fora do limite de referência.'});
  });
  const sevRank={A:0,B:1,C:2}; plano.sort((a,b)=>sevRank[a.sev]-sevRank[b.sev]);
  let y=K.capa('Manutenção Preventiva','Subestação de Energia',[['CLIENTE',h.cliente],['SUBESTAÇÃO',[h.subestacao,h.tensoes].filter(Boolean).join(' · ')],['LOCAL',h.local],['DATA DA MANUTENÇÃO',fmtDate(h.data)],['EQUIPAMENTOS',String(eqs.length)],['EMISSÃO',fmtDate(today())]]);

  y=sec('Identificação',y);
  y=tbl({startY:y, columnStyles:{0:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:52}},
    body:[['Relatório Nº',h.numero||'-'],['Cliente',h.cliente||'-'],['Subestação',h.subestacao||'-'],['Endereço / unidade',h.local||'-'],['Tensões',h.tensoes||'-'],['Potência instalada',h.potencia?h.potencia+' kVA':'-'],
      ['Ordem de serviço / contrato',h.os||'-'],['Data da manutenção',fmtDate(h.data)||'-'],['Condição da intervenção',h.condicao||'-'],['Equipe executante',h.equipe||'-'],['Acompanhante do cliente',h.acompanhante||'-'],['Responsável técnico',h.resp||'-'],['Equipamentos inspecionados',String(eqs.length)],['Data de emissão',fmtDate(today())]]});

  y=sec('Objetivo e escopo',y);
  y=para('Este relatório apresenta o resultado da manutenção preventiva realizada na subestação indicada, abrangendo os equipamentos de alta, média e baixa tensão, os sistemas de proteção e comando, o aterramento e os aspectos civis e de segurança. O objetivo é verificar as condições de operação, executar os serviços preventivos previstos, identificar não conformidades e recomendar as ações corretivas necessárias para a segurança das pessoas e a confiabilidade do fornecimento de energia.',y);
  y=para('Para cada equipamento foram aplicados um checklist de inspeção visual e funcional, as medições e ensaios aplicáveis, com registro fotográfico antes e depois da intervenção. Cada item foi classificado como Conforme, Atenção, Não conforme ou Não se aplica, e cada não conformidade recebeu uma severidade: A – urgente, B – programar ou C – observação.',y);

  y=ensure(y,40); y=sec('Normas e documentos de referência',y);
  y=tbl({startY:y, head:[['Referência','Aplicação']], body:NORMAS, columnStyles:{0:{fontStyle:'bold',cellWidth:46,textColor:C_NAVY}}});
  y=para('As normas são aplicadas em suas edições vigentes. Havendo critério específico do fabricante do equipamento ou do estudo de proteção da instalação, ele prevalece sobre os valores de referência deste relatório.',y,{italic:true,size:8,color:C_MUT});

  y=ensure(y,60); y=sec('Critérios de avaliação',y);
  y=tbl({startY:y, head:[['Classificação do equipamento','Significado','Ação']],
    body:[['Conforme','Todos os itens conformes e medições dentro dos limites.',RES.ok.acao],['Atenção','Desvios menores ou medições próximas ao limite.',RES.att.acao],['Não conforme – programar','Não conformidade de severidade B ou medição fora do limite.',RES.nc.acao],['Não conforme – urgente','Não conformidade de severidade A (risco à segurança ou à continuidade).',RES.crit.acao]],
    columnStyles:{0:{cellWidth:42,fontStyle:'bold'},1:{cellWidth:62}},
    didParseCell:c=>{ if(c.section==='body'&&c.column.index===0) c.cell.styles.textColor=C_RES[['ok','att','nc','crit'][c.row.index]]; }});
  y=tbl({startY:y, head:[['Grandeza','Limite de referência adotado']], body:CRITERIOS, columnStyles:{0:{cellWidth:46,fontStyle:'bold',textColor:C_NAVY}}});
  y=bul('O engenheiro responsável pode ajustar a classificação automática com justificativa técnica registrada na ficha do equipamento.',y);

  y=ensure(y,40); y=sec('Condições da manutenção e instrumentos',y);
  y=tbl({startY:y, columnStyles:{0:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:52}},
    body:[['Condição climática',h.clima||'-'],['Temperatura ambiente',h.tamb?h.tamb+' °C':'-'],['Umidade relativa',h.umid?h.umid+' %':'-'],['Instrumentos utilizados',h.instrumentos||'-']]});

  y=ensure(y,40); y=sec('Metodologia e segurança',y);
  y=bul('Planejamento da intervenção com o cliente, análise de risco, permissão de trabalho e aplicação das medidas de controle da NR-10 (desligamento, impedimento de reenergização, constatação de ausência de tensão, aterramento temporário, sinalização).',y);
  y=bul('Inspeção visual e funcional, limpeza, reaperto com torque, lubrificação e substituição de consumíveis conforme recomendações dos fabricantes.',y);
  y=bul('Medições e ensaios com instrumentos calibrados: resistência de isolamento, resistência de contato, relação de transformação, resistência ôhmica, tempos de operação, rigidez dielétrica do óleo, resistência de aterramento e grandezas elétricas em BT, conforme aplicável a cada equipamento.',y);
  y=bul('Registro fotográfico antes e depois dos serviços, testes funcionais e liberação da instalação para reenergização acompanhada pelo cliente.',y);

  y=ensure(y,30); y=sec('Limitações',y);
  y=para('As avaliações refletem as condições encontradas na data da manutenção. Valores de resistência de isolamento dependem da temperatura e da umidade e devem ser comparados ao histórico do equipamento. Componentes internos não acessíveis sem desmontagem e ensaios não contratados não fazem parte deste escopo.',y);

  /* ---------- RESUMO ---------- */
  doc.addPage(); y=22;
  y=sec('Resumo dos resultados',y);
  const kp=[['Equipamentos',eqs.length,C_NAVY],['Conformes',cnt('ok'),C_RES.ok],['Atenção',cnt('att'),C_RES.att],['NC – programar',cnt('nc'),C_RES.nc],['NC – urgente',cnt('crit'),C_RES.crit]];
  const kw=(W-2*M-4*3)/5;
  kp.forEach(([l,v,c],i)=>{ const x=M+i*(kw+3); doc.setFillColor(...C_BG); doc.rect(x,y,kw,20,'F'); doc.setFillColor(...c); doc.rect(x,y,kw,1.4,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(17); doc.setTextColor(...c); doc.text(String(v),x+kw/2,y+11,{align:'center'});
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...C_MUT); doc.text(l,x+kw/2,y+17,{align:'center'}); });
  y+=26; doc.setTextColor(...INK);
  if(cnt('pend')) y=para(`Atenção: ${cnt('pend')} equipamento(s) sem avaliação completa.`,y,{italic:true,size:8.5,color:C_RES.crit});
  y=tbl({startY:y, head:[['Equipamento','Tipo','Checklist','NC','Medições fora','Classificação']],
    body:eqs.map((e,i)=>[eqName(e,i), TIPOS[e.tipo].nome, `${res[i].done}/${res[i].total}`, String(res[i].ncs.length), String(res[i].medBad.length), res[i].label]),
    styles:{fontSize:8,cellPadding:1.6,lineColor:C_LINE,lineWidth:.2,textColor:INK,valign:'middle'},
    columnStyles:{2:{halign:'center',cellWidth:18},3:{halign:'center',cellWidth:12},4:{halign:'center',cellWidth:20},5:{fontStyle:'bold',cellWidth:36}},
    didParseCell:c=>{ if(c.section==='body'&&c.column.index===5) c.cell.styles.textColor=C_RES[res[c.row.index].k]; }});

  if(plano.length){
    y=ensure(y,30); y=sec('Plano de ação – não conformidades e observações',y);
    y=para('Ordenado por severidade: A – urgente, B – programar na próxima parada, C – observação.',y,{size:8,color:C_MUT,italic:true});
    y=tbl({startY:y, head:[['Sev.','Equipamento','Item / constatação','Observação']],
      body:plano.map(p=>[p.sev, p.eq+'\n'+p.tipo, p.item, p.obs||'-']),
      styles:{fontSize:8,cellPadding:1.6,lineColor:C_LINE,lineWidth:.2,textColor:INK,valign:'top'},
      columnStyles:{0:{cellWidth:12,halign:'center',fontStyle:'bold'},1:{cellWidth:40},2:{cellWidth:66}},
      didParseCell:c=>{ if(c.section==='body'&&c.column.index===0) c.cell.styles.textColor=plano[c.row.index].sev==='A'?C_RES.crit:plano[c.row.index].sev==='B'?C_RES.nc:C_RES.att; }});
  } else { y=ensure(y,20); y=sec('Plano de ação',y); y=para('Não foram registradas não conformidades ou observações.',y); }
  if(h.obs){ y=ensure(y,20); y=sec('Observações gerais',y); y=para(h.obs,y); }

  /* ---------- FICHAS ---------- */
  const fichaSec=K.nextSec(); let fichaTocDone=false, nf=0;
  for(let i=0;i<eqs.length;i++){
    const e=eqs[i], r=res[i], d=e.d, T=TIPOS[e.tipo];
    nf++; doc.addPage(); y=22;
    if(!fichaTocDone){ TOC.push({t:`${fichaSec}. Fichas dos equipamentos`,p:doc.getNumberOfPages()}); fichaTocDone=true; }
    const ft=`${fichaSec}.${nf} ${eqName(e,i)} – ${T.nome}`; TOC.push({t:ft,p:doc.getNumberOfPages(),sub:true});
    y=band(ft,y);
    const ident=[['TAG',d.tag||'-','Localização',d.local||'-'],['Fabricante',d.fab||'-','Modelo',d.modelo||'-'],['Nº de série',d.serie||'-','Ano',d.ano||'-']];
    const ex=T.campos.map(c=>[c[1],d[c[0]]||'-']); for(let k=0;k<ex.length;k+=2){ ident.push([ex[k][0],ex[k][1],ex[k+1]?ex[k+1][0]:'',ex[k+1]?ex[k+1][1]:'']); }
    y=tbl({startY:y, columnStyles:{0:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:40},2:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:40}}, body:ident, styles:{fontSize:8,cellPadding:1.5,lineColor:C_LINE,lineWidth:.2,textColor:INK}})-1;
    doc.setFillColor(...C_RES[r.k]); doc.roundedRect(M,y,W-2*M,9,1.5,1.5,'F'); doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text(`${r.label}${r.manual?' (manual)':''}  ·  ${RES[r.k].acao}`.slice(0,105),M+3,y+6); doc.setTextColor(...INK); y+=13;
    if(r.manual&&e.just) y=para('Justificativa da classificação: '+e.just,y,{size:8.5});
    // checklist
    y=ensure(y,30);
    const chk=T.items.map(it=>{ const x=(e.items||{})[it[0]]||{}; const st=x.s||''; return [it[1], it[2], st?STATUS[st].label:'—', st==='NC'?(x.sev||it[3]):(st==='A'?'C':'—'), x.obs||'']; });
    y=tbl({startY:y, head:[['Item de inspeção','Ref.','Situação','Sev.','Observação']], body:chk,
      styles:{fontSize:7.6,cellPadding:1.3,lineColor:C_LINE,lineWidth:.2,textColor:INK,valign:'middle'},
      columnStyles:{0:{cellWidth:70},1:{cellWidth:28,textColor:C_MUT},2:{cellWidth:22,fontStyle:'bold',halign:'center'},3:{cellWidth:10,halign:'center',fontStyle:'bold'}},
      didParseCell:c=>{ if(c.section==='body'&&c.column.index===2){ const st=((e.items||{})[T.items[c.row.index][0]]||{}).s; if(st) c.cell.styles.textColor=C_ST[st]; } }});
    // medições
    if(r.meds.length||Object.values(e.m||{}).some(v=>v)){
      y=ensure(y,30);
      const mrows=[]; for(const g of T.meds) for(const f of g.f){ const v=(e.m||{})[f[0]]; if(v!==undefined&&v!==''){ mrows.push([g.g,f[1],String(v)]); } }
      if(mrows.length) y=tbl({startY:y, head:[['Ensaio','Grandeza','Valor medido']], body:mrows, styles:{fontSize:7.6,cellPadding:1.3,lineColor:C_LINE,lineWidth:.2,textColor:INK}, columnStyles:{0:{cellWidth:62,textColor:C_MUT},2:{cellWidth:30,halign:'right',fontStyle:'bold'}}});
      if(r.meds.length){ y=ensure(y,25);
        y=tbl({startY:y, head:[['Avaliação','Valor','Limite de referência','Resultado']], body:r.meds.map(x=>[x.label,x.val,x.lim,x.st?(x.st==='ok'?'OK':x.st==='att'?'Atenção':'Não conforme'):'—']),
          styles:{fontSize:7.6,cellPadding:1.3,lineColor:C_LINE,lineWidth:.2,textColor:INK}, columnStyles:{1:{cellWidth:26,halign:'right'},2:{cellWidth:36},3:{cellWidth:24,fontStyle:'bold',halign:'center'}},
          didParseCell:c=>{ if(c.section==='body'&&c.column.index===3){ const st=r.meds[c.row.index].st; if(st) c.cell.styles.textColor=C_RES[st]; } }}); }
    }
    // fotos antes/depois
    const A=(e.pantes||[])[0], D=(e.pdepois||[])[0];
    if(A||D){
      const cw=(W-2*M-6)/2, chh=64; y=ensure(y,chh+12);
      const draw=async(id,x,cap)=>{ doc.setDrawColor(...C_LINE); doc.rect(x,y,cw,chh); const P=id?await getPhoto(id):null;
        if(P){ const k=Math.min(cw/P.w,chh/P.h); try{ doc.addImage(P.data,'JPEG',x+(cw-P.w*k)/2,y+(chh-P.h*k)/2,P.w*k,P.h*k); }catch(err){} }
        else { doc.setFontSize(8); doc.setTextColor(...C_MUT); doc.text('Sem imagem',x+cw/2,y+chh/2,{align:'center'}); }
        doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...C_NAVY); doc.text(cap,x,y+chh+4); doc.setTextColor(...INK); };
      await draw(A,M,'Antes da manutenção'); await draw(D,M+cw+6,'Depois da manutenção'); y+=chh+9;
    }
    if(e.diag){ y=ensure(y,16); y=para('Diagnóstico / serviços executados: '+e.diag,y,{size:9}); }
    if(e.rec){ y=ensure(y,16); y=para('Recomendações: '+e.rec,y,{size:9}); }
    // fotos complementares (itens + extras)
    const extra=[...(e.pantes||[]).slice(1).map(id=>({id,cap:'Antes – adicional'})),...(e.pdepois||[]).slice(1).map(id=>({id,cap:'Depois – adicional'})),...(e.photos||[]).map(id=>({id,cap:'Foto complementar'}))];
    for(const it of T.items){ const x=(e.items||{})[it[0]]; if(x&&x.photos) for(const id of x.photos) extra.push({id,cap:'Item: '+it[1]}); }
    if(extra.length){
      y=ensure(y,80); y=band('Registro fotográfico',y);
      const cw=(W-2*M-6)/2, chh=60; let col=0;
      for(const p of extra){
        const P=await getPhoto(p.id); if(!P) continue;
        if(col===0) y=ensure(y,chh+10);
        const x=M+col*(cw+6); const k=Math.min(cw/P.w, chh/P.h);
        doc.setDrawColor(...C_LINE); doc.rect(x,y,cw,chh);
        try{ doc.addImage(P.data,'JPEG',x+(cw-P.w*k)/2,y+(chh-P.h*k)/2,P.w*k,P.h*k); }catch(err){}
        doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...C_MUT); doc.text(doc.splitTextToSize(p.cap,cw)[0],x,y+chh+3.5); doc.setTextColor(...INK);
        col++; if(col===2){ col=0; y+=chh+9; }
      }
      if(col===1) y+=chh+9;
    }
  }

  /* ---------- CONSIDERAÇÕES E ASSINATURA ---------- */
  y=ensure(y,70); y+=4; y=sec('Considerações finais',y);
  const nUrg=plano.filter(p=>p.sev==='A').length, nProg=plano.filter(p=>p.sev==='B').length;
  y=para(`Foram inspecionados ${eqs.length} equipamento(s). ${cnt('ok')} em conformidade, ${cnt('att')} com observações, ${cnt('nc')} com não conformidade a programar e ${cnt('crit')} com não conformidade urgente. O plano de ação relaciona ${nUrg} item(ns) de severidade A, ${nProg} de severidade B e ${plano.length-nUrg-nProg} de severidade C.`,y);
  y=para('Recomenda-se a execução das ações de severidade A de imediato, a programação das de severidade B para a próxima parada e a repetição da manutenção preventiva em periodicidade anual, ou conforme o plano de manutenção da instalação e a criticidade do processo atendido.',y);
  K.assinatura(y, h.equipe?`Equipe executante: ${h.equipe}`:'');
  const fname=`Relatorio_Manutencao_Subestacao_${(h.numero?slug(h.numero)+'_':'')}${slug(h.cliente||'cliente')}_${h.data||''}.pdf`;
  await K.finish(title,fname);
}

/* ======================= EXCEL ======================= */
async function gerarExcel(){
  if(!CUR.items.length){ toast('Adicione ao menos um equipamento.'); return; }
  toast('Gerando planilha...');
  if(!(await ensureExcelJS())){ toast('Gerador de Excel não carregou. Verifique a conexão e tente de novo.'); return; }
  const h=CUR.h, eqs=CUR.items, res=eqs.map(e=>equipResult(e,h));
  const wb=novoWb(); const X=xlsxKit(wb,h);
  const {NAVY,BAND,NAVY2,GOLD,LINE,BG,WHITE,INK,MUT,b64,logoW,border,fill,font,colL,head,tableHeader,secTitle,cellRow,put,navySheet}=X;
  const PC={ok:'FF2E7D32',att:'FFB58600',nc:'FFD35400',crit:'FFC62828',pend:'FF8A93A6'};
  const PF={ok:'FFE3F2E7',att:'FFFFF1D6',nc:'FFFDE7DA',crit:'FFFBE3E1',pend:'FFF3F4F6'};
  const SC={C:'FF2E7D32',A:'FFB58600',NC:'FFC62828',NA:'FF8A93A6'};
  const cnt=k=>res.filter(r=>r.k===k).length;
  const eqName=(e,i)=>`${i+1}. ${eqTitle(e)}`;
  const SUB=`${h.cliente||''}${h.subestacao?' · '+h.subestacao:''} · ${fmtDate(h.data)}${h.numero?' · Relatório Nº '+h.numero:''}`;

  /* ---- Capa ---- */
  X.capa('Manutenção Preventiva','Subestação de Energia',[['CLIENTE',h.cliente],['SUBESTAÇÃO',[h.subestacao,h.tensoes].filter(Boolean).join(' · ')],['LOCAL',h.local],['DATA DA MANUTENÇÃO',fmtDate(h.data)],['EQUIPAMENTOS',String(eqs.length)],['EMISSÃO',fmtDate(today())]]);

  /* ---- Relatório (identificação + resumo) ---- */
  const w1=wb.addWorksheet('Relatório',{views:[{showGridLines:false}]});
  w1.columns=[{width:32},{width:20},{width:16},{width:14},{width:14},{width:26}];
  let r=head(w1,'MANUTENÇÃO PREVENTIVA – SUBESTAÇÃO',6,SUB);
  const kv=(rows)=>rows.forEach(([k,v])=>{ w1.mergeCells(`B${r}:F${r}`); const a=w1.getCell(`A${r}`), b=w1.getCell(`B${r}`); a.value=k; b.value=(v===''||v==null)?'-':v;
    a.fill=fill(BG); a.font=font({bold:true,color:{argb:NAVY}}); a.border=border; b.border=border; b.font=font(); b.alignment={horizontal:'left',wrapText:true,vertical:'top'}; r++; });
  secTitle(w1,r,'1. Identificação',6); r++;
  kv([['Relatório Nº',h.numero],['Cliente',h.cliente],['Subestação',h.subestacao],['Endereço / unidade',h.local],['Tensões',h.tensoes],['Potência instalada (kVA)',h.potencia],['Ordem de serviço / contrato',h.os],['Data da manutenção',fmtDate(h.data)],['Condição da intervenção',h.condicao],['Equipe executante',h.equipe],['Acompanhante do cliente',h.acompanhante],['Responsável técnico',h.resp]]);
  r++; secTitle(w1,r,'2. Condições e instrumentos',6); r++;
  kv([['Condição climática',h.clima],['Temperatura ambiente (°C)',h.tamb],['Umidade relativa (%)',h.umid],['Instrumentos utilizados',h.instrumentos]]);
  r++; secTitle(w1,r,'3. Resumo por classificação',6); r++;
  [['Equipamentos inspecionados',eqs.length,NAVY]].forEach(([l,v,c])=>{ const a=w1.getCell(`A${r}`), b=w1.getCell(`B${r}`); a.value=l; b.value=v; a.font=font({bold:true}); b.font=font({bold:true,size:12,color:{argb:c}}); a.border=border; b.border=border; b.alignment={horizontal:'center'}; r++; });
  ['ok','att','nc','crit','pend'].forEach(k=>{ const a=w1.getCell(`A${r}`), b=w1.getCell(`B${r}`); a.value=RES[k].label;
    b.value={formula:`COUNTIF(Equipamentos!H:H,"${RES[k].label}")`, result:cnt(k)}; a.font=font({bold:true,color:{argb:PC[k]}}); b.font=font({bold:true,size:12,color:{argb:PC[k]}});
    a.border=border; b.border=border; b.alignment={horizontal:'center'}; r++; });
  if(h.obs){ r++; secTitle(w1,r,'Observações gerais',6); r++; w1.mergeCells(`A${r}:F${r}`); const c=w1.getCell(`A${r}`); c.value=h.obs; c.alignment={wrapText:true,vertical:'top'}; c.font=font(); w1.getRow(r).height=Math.min(120,Math.max(30,Math.ceil(h.obs.length/90)*14)); r++; }
  r+=2; w1.mergeCells(`C${r}:F${r}`); const sg=w1.getCell(`C${r}`); sg.value=h.resp||'Responsável técnico'; sg.font=font({bold:true}); sg.alignment={horizontal:'center'}; sg.border={top:{style:'thin',color:{argb:NAVY}}};
  r++; w1.mergeCells(`C${r}:F${r}`); const sg2=w1.getCell(`C${r}`); sg2.value='XPA Engenharia, Manutenção e Comércio Ltda.'; sg2.font=font({size:9,color:{argb:MUT}}); sg2.alignment={horizontal:'center'};

  /* ---- Equipamentos ---- */
  const w2=wb.addWorksheet('Equipamentos',{views:[{state:'frozen',ySplit:5,showGridLines:false}]});
  w2.columns=[6,22,26,20,20,18,12,26,10,12,40,40].map(w=>({width:w}));
  r=head(w2,'EQUIPAMENTOS INSPECIONADOS',12,SUB); tableHeader(w2,r,['Nº','TAG','Tipo','Localização','Fabricante / modelo','Nº de série','Checklist','Classificação','NC','Medições fora','Diagnóstico / serviços','Recomendações']); r++;
  eqs.forEach((e,i)=>{ const x=res[i]; const row=cellRow(w2,r,[i+1,e.d.tag||'-',TIPOS[e.tipo].nome,e.d.local||'-',[e.d.fab,e.d.modelo].filter(Boolean).join(' / ')||'-',e.d.serie||'-',`${x.done}/${x.total}`,x.label,x.ncs.length,x.medBad.length,e.diag||'-',e.rec||'-'],{center:[0,6,8,9]});
    const c=row.getCell(8); c.font=font({bold:true,size:9,color:{argb:PC[x.k]}}); c.fill=fill(PF[x.k]); r++; });
  w2.autoFilter={from:{row:5,column:1},to:{row:r-1,column:12}};

  /* ---- Checklist ---- */
  const w3=wb.addWorksheet('Checklist',{views:[{state:'frozen',ySplit:5,showGridLines:false}]});
  w3.columns=[6,22,26,56,22,14,8,48].map(w=>({width:w}));
  r=head(w3,'CHECKLIST DE INSPEÇÃO',8,SUB); tableHeader(w3,r,['Nº','Equipamento','Tipo','Item de inspeção','Referência','Situação','Sev.','Observação']); r++;
  eqs.forEach((e,i)=>{ const T=TIPOS[e.tipo]; for(const it of T.items){ const x=(e.items||{})[it[0]]||{}; const st=x.s||'';
    const row=cellRow(w3,r,[i+1,eqTitle(e),T.nome,it[1],it[2],st?STATUS[st].label:'—',st==='NC'?(x.sev||it[3]):(st==='A'?'C':'—'),x.obs||''],{center:[0,5,6]});
    if(st){ const c=row.getCell(6); c.font=font({bold:true,size:9,color:{argb:SC[st]}}); } r++; } });
  w3.autoFilter={from:{row:5,column:1},to:{row:r-1,column:8}};

  /* ---- Medições ---- */
  const w4=wb.addWorksheet('Medições',{views:[{state:'frozen',ySplit:5,showGridLines:false}]});
  w4.columns=[6,22,26,40,18,26,14].map(w=>({width:w}));
  r=head(w4,'MEDIÇÕES, ENSAIOS E AVALIAÇÃO',7,SUB); tableHeader(w4,r,['Nº','Equipamento','Tipo','Grandeza','Valor','Limite de referência','Resultado']); r++;
  eqs.forEach((e,i)=>{ const T=TIPOS[e.tipo];
    for(const g of T.meds) for(const f of g.f){ const v=(e.m||{})[f[0]]; if(v===undefined||v==='') continue; cellRow(w4,r,[i+1,eqTitle(e),T.nome,`${g.g} – ${f[1]}`,v,'','' ],{center:[0,4]}); r++; }
    for(const x of res[i].meds){ const row=cellRow(w4,r,[i+1,eqTitle(e),T.nome,'Avaliação: '+x.label,x.val,x.lim,x.st?(x.st==='ok'?'OK':x.st==='att'?'Atenção':'Não conforme'):'—'],{center:[0,4,6]});
      if(x.st){ const c=row.getCell(7); c.font=font({bold:true,size:9,color:{argb:PC[x.st]}}); c.fill=fill(PF[x.st]); } r++; } });
  w4.autoFilter={from:{row:5,column:1},to:{row:r-1,column:7}};

  /* ---- Plano de ação ---- */
  const w5=wb.addWorksheet('Plano de ação',{views:[{state:'frozen',ySplit:5,showGridLines:false}]});
  w5.columns=[8,24,26,52,14,40,20,14,16].map(w=>({width:w}));
  r=head(w5,'PLANO DE AÇÃO',9,SUB); tableHeader(w5,r,['Sev.','Equipamento','Tipo','Item / constatação','Situação','Observação','Responsável','Prazo','Status']); r++;
  const plano=[];
  eqs.forEach((e,i)=>{ const T=TIPOS[e.tipo];
    for(const it of T.items){ const x=(e.items||{})[it[0]]; if(!x||(x.s!=='NC'&&x.s!=='A')) continue; plano.push([x.s==='NC'?(x.sev||it[3]):'C',eqName(e,i),T.nome,it[1],STATUS[x.s].label,x.obs||'']); }
    for(const x of res[i].medBad) plano.push([x.st==='nc'?'B':'C',eqName(e,i),T.nome,`${x.label}: ${x.val} (limite ${x.lim})`,x.st==='nc'?'Não conforme':'Atenção','Medição fora do limite de referência.']); });
  const sevRank={A:0,B:1,C:2}; plano.sort((a,b)=>sevRank[a[0]]-sevRank[b[0]]);
  const SEVC={A:PC.crit,B:PC.nc,C:PC.att}, SEVF={A:PF.crit,B:PF.nc,C:PF.att};
  if(!plano.length){ cellRow(w5,r,['','Nenhuma não conformidade ou observação registrada.','','','','','','','']); r++; }
  plano.forEach(p=>{ const row=cellRow(w5,r,[...p,'','','Pendente'],{center:[0,4,7,8]}); const c=row.getCell(1); c.font=font({bold:true,size:10,color:{argb:SEVC[p[0]]}}); c.fill=fill(SEVF[p[0]]); r++; });
  w5.dataValidations.add(`I6:I${Math.max(6,r-1)}`,{type:'list',allowBlank:true,formulae:['"Pendente,Em andamento,Concluído"']});
  w5.autoFilter={from:{row:5,column:1},to:{row:r-1,column:9}};

  /* ---- Normas e critérios ---- */
  const w6=wb.addWorksheet('Normas e critérios',{views:[{showGridLines:false}]});
  w6.columns=[{width:34},{width:90}];
  r=head(w6,'NORMAS E CRITÉRIOS DE AVALIAÇÃO',2,SUB);
  secTitle(w6,r,'Normas e documentos de referência',2); r++; tableHeader(w6,r,['Referência','Aplicação']); r++;
  NORMAS.forEach(n=>{ cellRow(w6,r,n); w6.getCell(`A${r}`).font=font({bold:true,size:9,color:{argb:NAVY}}); r++; });
  r++; secTitle(w6,r,'Limites de referência adotados',2); r++; tableHeader(w6,r,['Grandeza','Limite']); r++;
  CRITERIOS.forEach(n=>{ cellRow(w6,r,n); w6.getCell(`A${r}`).font=font({bold:true,size:9,color:{argb:NAVY}}); r++; });
  r++; secTitle(w6,r,'Severidade das não conformidades',2); r++; tableHeader(w6,r,['Severidade','Descrição']); r++;
  ['A','B','C'].forEach(k=>{ cellRow(w6,r,[SEV[k].label,SEV[k].desc]); w6.getCell(`A${r}`).font=font({bold:true,size:9,color:{argb:SEVC[k]}}); r++; });

  /* ---- Contracapa ---- */
  X.contracapa();
  const fname=`Relatorio_Manutencao_Subestacao_${(h.numero?slug(h.numero)+'_':'')}${slug(h.cliente||'cliente')}_${h.data||''}.xlsx`;
  await X.salvar(fname);
}

registrar({
  k:'se', nome:'Manutenção preventiva de subestação', curto:'Subestação', icone:'🏭',
  desc:'Equipamentos AT/MT/BT, proteção, aterramento e civil – checklist, ensaios com limites e plano de ação.',
  novoH:()=>({subestacao:'', tensoes:'', potencia:'', equipe:'', acompanhante:'', condicao:CONDICOES[0], clima:'', tamb:'', umid:'', instrumentos:'', os:''}),
  photoIds, vJob, vItem,
  resumo:(x)=>{ const eq=x.items||[]; const rs=eq.map(e=>equipResult(e,x.h)); const nc=rs.filter(r=>r.k==='nc'||r.k==='crit').length; const at=rs.filter(r=>r.k==='att').length;
    const worst=rs.reduce((a,r)=>(r.k!=='pend'&&(a===null||RANK[r.k]>RANK[a]))?r.k:a,null);
    return {txt:`${x.h.subestacao?x.h.subestacao+' · ':''}${eq.length} equipamento${eq.length===1?'':'s'}${nc?' · '+nc+' NC':''}${at?' · '+at+' atenção':''}`, pill:worst?{k:worst,t:RES[worst].curto}:null}; },
  pdf:gerarPDF, excel:gerarExcel,
});
})();

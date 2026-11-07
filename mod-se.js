/* ======================= MÓDULOS: MANUTENÇÃO PREVENTIVA E INSPEÇÃO VISUAL DE SUBESTAÇÃO ======================= */
(function(){
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
const CONDICOES=['Desligamento total','Desligamento parcial','Sem desligamento (energizada)'];
const NORMAS_SE=[
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
const CRITERIOS_SE=[
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
const GRUPOS_SE=[['MT/AT','Média e alta tensão'],['BT','Baixa tensão'],['Proteção','Proteção e serviços auxiliares'],['Aterramento','Aterramento e SPDA'],['Geral','Civil, segurança e documentação']];
function jobFieldsSE(h, visual){
  return `<div class="sec">${visual?'Dados da inspeção':'Dados da manutenção'}</div>
  <div class="card hdr"><div class="grid">
    ${field('numero','Nº do relatório',h,'text','Ex.: RT-26-001')}
    ${field('data','Data',h,'date')}
    ${field('cliente','Cliente',h)}
    ${field('subestacao','Subestação (nome / TAG)',h,'text','Ex.: SE-01 Principal')}
    ${field('local','Endereço / unidade',h)}
    ${field('tensoes','Tensões (AT / MT / BT)',h,'text','Ex.: 13,8 kV / 380-220 V')}
    ${field('potencia','Potência instalada (kVA)',h,'text','',DEC)}
    ${field('os','Ordem de serviço / contrato',h)}
    ${field('equipe',visual?'Inspetor(es)':'Equipe executante',h,'text','Nomes dos técnicos')}
    ${field('acompanhante','Acompanhante do cliente',h)}
    ${field('resp','Responsável técnico',h)}
    ${visual?sel('condicao','Condição da instalação',h,['Energizada (inspeção externa)','Desenergizada']):sel('condicao','Condição da intervenção',h,CONDICOES)}
  </div></div>
  <div class="sec">Condições${visual?'':' e instrumentos'}</div>
  <div class="card hdr"><div class="grid">
    ${field('clima','Condição climática',h,'text','Ex.: tempo seco, céu limpo')}
    ${field('tamb','Temperatura ambiente (°C)',h,'text','',DEC)}
    ${field('umid','Umidade relativa (%)',h,'text','',DEC)}
  </div>${field('instrumentos',visual?'Recursos utilizados (câmera, lanterna, detector de tensão…)':'Instrumentos utilizados (modelo, série, calibração)',h,'textarea',visual?'':'Ex.: Megôhmetro Megger MIT1025 nº 123 – cal. 05/2026; Microhmímetro …')}
  ${field('obs','Observações gerais',h,'textarea')}</div>`;
}
const identSE=(lbl)=>(h,n)=>[['Relatório Nº',h.numero],['Cliente',h.cliente],['Subestação',h.subestacao],['Endereço / unidade',h.local],['Tensões',h.tensoes],['Potência instalada',h.potencia?h.potencia+' kVA':''],['Ordem de serviço / contrato',h.os],[lbl,fmtDate(h.data)],['Condição',h.condicao],['Equipe / inspetor',h.equipe],['Acompanhante do cliente',h.acompanhante],['Responsável técnico',h.resp],['Equipamentos inspecionados',String(n)],['Data de emissão',fmtDate(today())]];
const condSE=(h)=>[['Condição climática',h.clima],['Temperatura ambiente',h.tamb?h.tamb+' °C':''],['Umidade relativa',h.umid?h.umid+' %':''],['Instrumentos / recursos',h.instrumentos]];
const capaSE=(lbl)=>(h,n)=>[['CLIENTE',h.cliente],['SUBESTAÇÃO',[h.subestacao,h.tensoes].filter(Boolean).join(' · ')],['LOCAL',h.local],[lbl,fmtDate(h.data)],['EQUIPAMENTOS',String(n)],['EMISSÃO',fmtDate(today())]];
const novoHSE=()=>({subestacao:'', tensoes:'', potencia:'', equipe:'', acompanhante:'', condicao:'', clima:'', tamb:'', umid:'', instrumentos:'', os:''});

/* ---- Manutenção preventiva ---- */
criarModuloChecklist({
  k:'se', nome:'Manutenção preventiva de subestação', curto:'Subestação', icone:'🏭',
  desc:'Equipamentos AT/MT/BT, proteção, aterramento e civil – checklist, ensaios com limites e plano de ação.',
  TIPOS, TIPOS_ORD, avaliar:avaliarMeds, grupos:GRUPOS_SE, itemNome:'equipamento', hTitulo:'subestacao',
  novoH:()=>Object.assign(novoHSE(),{condicao:CONDICOES[0]}), jobFields:(h)=>jobFieldsSE(h,false),
  capaRows:capaSE('DATA DA MANUTENÇÃO'), identRows:identSE('Data da manutenção'), condRows:condSE,
  assinLinha:(h)=>h.equipe?`Equipe executante: ${h.equipe}`:'',
  tx:{ dadosSec:'Dados da manutenção', antes:'Antes da manutenção', depois:'Depois da manutenção',
    titulo:'Relatório de Manutenção Preventiva – Subestação', arquivo:'Relatorio_Manutencao_Subestacao', capa1:'Manutenção Preventiva', capa2:'Subestação de Energia', xlsTitulo:'MANUTENÇÃO PREVENTIVA – SUBESTAÇÃO',
    condSec:'Condições da manutenção e instrumentos', normas:NORMAS_SE, criterios:CRITERIOS_SE,
    objetivo:['Este relatório apresenta o resultado da manutenção preventiva realizada na subestação indicada, abrangendo os equipamentos de alta, média e baixa tensão, os sistemas de proteção e comando, o aterramento e os aspectos civis e de segurança. O objetivo é verificar as condições de operação, executar os serviços preventivos previstos, identificar não conformidades e recomendar as ações corretivas necessárias para a segurança das pessoas e a confiabilidade do fornecimento de energia.',
      'Para cada equipamento foram aplicados um checklist de inspeção visual e funcional, as medições e ensaios aplicáveis, com registro fotográfico antes e depois da intervenção. Cada item foi classificado como Conforme, Atenção, Não conforme ou Não se aplica, e cada não conformidade recebeu uma severidade: A – urgente, B – programar ou C – observação.'],
    metodologia:['Planejamento da intervenção com o cliente, análise de risco, permissão de trabalho e aplicação das medidas de controle da NR-10 (desligamento, impedimento de reenergização, constatação de ausência de tensão, aterramento temporário, sinalização).',
      'Inspeção visual e funcional, limpeza, reaperto com torque, lubrificação e substituição de consumíveis conforme recomendações dos fabricantes.',
      'Medições e ensaios com instrumentos calibrados: resistência de isolamento, resistência de contato, relação de transformação, resistência ôhmica, tempos de operação, rigidez dielétrica do óleo, resistência de aterramento e grandezas elétricas em BT, conforme aplicável a cada equipamento.',
      'Registro fotográfico antes e depois dos serviços, testes funcionais e liberação da instalação para reenergização acompanhada pelo cliente.'],
    limitacoes:'As avaliações refletem as condições encontradas na data da manutenção. Valores de resistência de isolamento dependem da temperatura e da umidade e devem ser comparados ao histórico do equipamento. Componentes internos não acessíveis sem desmontagem e ensaios não contratados não fazem parte deste escopo.',
  },
});

/* ---- Inspeção visual (mesmos checklists, sem ensaios) ---- */
criarModuloChecklist({
  k:'visual', nome:'Inspeção visual de subestação', curto:'Insp. visual SE', icone:'👁️',
  desc:'Vistoria externa dos equipamentos AT/MT/BT, aterramento e civil – checklist e fotos, sem ensaios.',
  TIPOS, TIPOS_ORD, comMeds:false, grupos:GRUPOS_SE, itemNome:'equipamento', hTitulo:'subestacao',
  novoH:()=>Object.assign(novoHSE(),{condicao:'Energizada (inspeção externa)'}), jobFields:(h)=>jobFieldsSE(h,true),
  capaRows:capaSE('DATA DA INSPEÇÃO'), identRows:identSE('Data da inspeção'), condRows:condSE,
  lblDiag:'Constatações', phDiag:'Ex.: oxidação nos terminais do TR-01; vegetação junto à cerca',
  assinLinha:(h)=>h.equipe?`Inspetor(es): ${h.equipe}`:'',
  tx:{ dadosSec:'Dados da inspeção', antes:'Foto geral', depois:'Detalhe', outras:'Outras fotos',
    titulo:'Relatório de Inspeção Visual – Subestação', arquivo:'Relatorio_Inspecao_Visual_Subestacao', capa1:'Inspeção Visual', capa2:'Subestação de Energia', xlsTitulo:'INSPEÇÃO VISUAL – SUBESTAÇÃO',
    condSec:'Condições da inspeção', normas:NORMAS_SE.filter(n=>!/10576|62271|C57/.test(n[0])), criterios:[],
    objetivo:['Este relatório apresenta o resultado da inspeção visual realizada na subestação indicada, sem desligamento e sem ensaios elétricos, com o objetivo de verificar as condições aparentes dos equipamentos de alta, média e baixa tensão, da proteção, do aterramento e dos aspectos civis e de segurança, identificando desvios que exijam manutenção corretiva ou programação de parada.',
      'Cada item do checklist foi classificado como Conforme, Atenção, Não conforme ou Não se aplica, com severidade A – urgente, B – programar ou C – observação para as não conformidades, e registro fotográfico das constatações.'],
    metodologia:['Inspeção externa com a instalação energizada, respeitando as distâncias de segurança e as zonas controlada e de risco da NR-10, sem abertura de painéis energizados sem autorização da operação.',
      'Verificação visual de estado geral, vazamentos, corrosão, sinais de aquecimento, trilhamento, sujidade, sinalização, aterramentos visíveis, acessos e condições civis.',
      'Registro fotográfico e classificação de cada constatação por severidade, com recomendação de ação.'],
    limitacoes:'A inspeção visual não substitui a manutenção preventiva com desligamento e ensaios elétricos. Componentes internos, contatos, isolamento e ajustes de proteção não são avaliados neste escopo; as condições refletem o que estava visível na data da inspeção.',
    consideracoes:'Recomenda-se tratar as constatações de severidade A de imediato, incluir as de severidade B na próxima parada programada e realizar a manutenção preventiva completa, com ensaios, em periodicidade anual.',
  },
});
})();

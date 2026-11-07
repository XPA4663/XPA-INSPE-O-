/* ======================= MÓDULO: INSPEÇÃO DE GRUPO GERADOR ======================= */
(function(){
const TIPOS={
 GMG:{nome:'Grupo motor-gerador', grupo:'', icone:'🔋',
  campos:[['pot','Potência (kVA)'],['potkw','Potência (kW)'],['un','Tensão nominal (V)','','380'],['freq','Frequência (Hz)','','60'],['rpm','Rotação (rpm)','','1800'],
          ['regime','Regime',['Emergência (standby)','Prime','Contínuo']],['comb','Combustível',['Diesel','Gás natural','Biodiesel','Outro']],['isol','Classe de isolação',['H','F','B']],
          ['motor','Motor diesel (fabricante / modelo)'],['altern','Alternador (fabricante / modelo)'],['horim','Horímetro (h)'],['vbat','Tensão nominal das baterias (Vcc)',['24','12']],['p_oleo_ref','Pressão mínima de óleo do fabricante (bar)']],
  items:[
   ['oleo','Motor: nível e estado do óleo lubrificante','Fabricante','B'],
   ['vaz','Motor: vazamentos de óleo, combustível ou líquido de arrefecimento','Fabricante','B'],
   ['filtros','Motor: filtros de óleo, combustível e ar (estado / troca)','Fabricante','C'],
   ['arref','Arrefecimento: nível e aditivo, mangueiras, radiador, bomba','Fabricante','B'],
   ['correias','Correias: estado e tensão','Fabricante','B'],
   ['preaq','Pré-aquecimento do líquido de arrefecimento funcionando','NBR ISO 8528','B'],
   ['escape','Escapamento, silencioso, flexível e isolamento térmico','NR-10 / NBR ISO 8528','B'],
   ['coxins','Coxins, fixação e vibração','Fabricante','C'],
   ['tanque','Tanque de combustível: nível, água/sedimentos, respiro, válvulas','Fabricante','B'],
   ['bat','Baterias de partida: bornes, eletrólito, fixação, carregador','Fabricante','A'],
   ['partida','Motor de partida e alternador de carga das baterias','Fabricante','B'],
   ['estator','Alternador: estado geral e limpeza dos enrolamentos','IEEE 43','B'],
   ['rolam','Alternador: rolamentos, ruído e temperatura','Fabricante','B'],
   ['avr','Regulador de tensão (AVR) e excitatriz / escovas e anéis','Fabricante','B'],
   ['caixa','Caixa de terminais: apertos, isoladores, identificação','NBR 5410','B'],
   ['heater','Resistência de aquecimento anticondensação','Fabricante','C'],
   ['painel','Painel de comando: alarmes, horímetro, instrumentos, iluminação','NBR ISO 8528','B'],
   ['prot','Proteções parametrizadas (sobrevelocidade, baixa pressão, alta temperatura, sub/sobretensão, sobrecorrente)','NBR ISO 8528 / NBR 5410','A'],
   ['auto','Teste de partida automática por simulação de falta de rede','NBR 5410 / NBR ISO 8528','A'],
   ['qta','QTA / USCA: contatores, intertravamento elétrico e mecânico','NBR 5410 / NBR IEC 60947-6-1','A'],
   ['emerg','Parada de emergência e sinalização','NR-12 / NR-10','A'],
   ['aterr','Aterramento da carcaça e do neutro','NBR 5410','A'],
   ['cabos','Cabos de força, terminais e eletrodutos','NBR 5410','B'],
   ['vent','Ventilação da sala: entrada e saída de ar, venezianas, dutos','Fabricante','B'],
   ['sala','Sala: sinalização, extintor, contenção de óleo, acesso','NR-10 / NR-23','B'],
   ['doc','Documentação: manual, plano de manutenção, registros de testes','NR-10','C'],
  ],
  meds:[
   {g:'Isolamento do estator (MΩ, fase – massa)', f:[['ri_r','Fase R'],['ri_s','Fase S'],['ri_t','Fase T'],['dar','DAR (R60s / R30s)'],['ip','Índice de polarização (R10min / R1min)'],['ri_temp','Temperatura do enrolamento no ensaio (°C)']], note:'IEEE 43: mínimo 5 MΩ (< 1 kV) ou 100 MΩ (≥ 1 kV) corrigido a 40 °C; IP ≥ 2,0 (classes B, F, H); DAR ≥ 1,25.'},
   {g:'Isolamento do rotor / campo e excitatriz (MΩ)', f:[['ri_rot','Rotor / campo – massa'],['ri_exc','Excitatriz – massa']], note:'Referência: ≥ 5 MΩ (IEEE 43).'},
   {g:'Resistência ôhmica do estator (mΩ)', f:[['ro_r','Fase R'],['ro_s','Fase S'],['ro_t','Fase T']], note:'Desvio entre fases ≤ 2 %; até 3 % atenção.'},
   {g:'Teste de funcionamento em carga', f:[['carga','Carga aplicada (kW)'],['v_rs','Tensão R – S (V)'],['v_st','Tensão S – T (V)'],['v_tr','Tensão T – R (V)'],['i_r','Corrente R (A)'],['i_s','Corrente S (A)'],['i_t','Corrente T (A)'],['hz','Frequência (Hz)'],['fp','Fator de potência'],['p_oleo','Pressão de óleo (bar)'],['t_agua','Temperatura da água (°C)'],['v_bat','Tensão das baterias (Vcc)'],['t_part','Tempo de partida (s)'],['t_transf','Tempo de transferência (s)']], note:'Tensão ±5 % da nominal; frequência ±1 %; desequilíbrio de tensão ≤ 2 % e de corrente ≤ 10 %; água ≤ 95 °C; partida ≤ 10 s e transferência ≤ 15 s (NBR 5410 – serviços de segurança); carga de teste ≥ 30 % da nominal para evitar carbonização.'},
  ]},
};
function avaliar(e,h){
  const m=e.m||{}, d=e.d||{}, out=[]; const v=(k)=>num(m[k]);
  const add=(label,val,unit,ev)=>{ if(val===null) return; out.push({label, val:fmtN(val)+(unit?' '+unit:''), lim:ev?ev.lim:'—', st:ev?ev.st:null}); };
  const volts=num(d.un); const lim=limRImaq(volts);
  [['ri_r','RI estator R'],['ri_s','RI estator S'],['ri_t','RI estator T']].forEach(([k,l])=>add(l,v(k),'MΩ',evMin(v(k),lim,'MΩ')));
  const dar=v('dar'); if(dar!==null) add('DAR',dar,'',{st:dar>=1.25?'ok':dar>=1?'att':'nc',lim:'≥ 1,25'});
  const ip=v('ip'); if(ip!==null){ const min=d.isol==='B'||d.isol==='F'||d.isol==='H'?2:1.5; add('Índice de polarização',ip,'',{st:ip>=min?'ok':ip>=1?'att':'nc',lim:'≥ '+fmtN(min)}); }
  [['ri_rot','RI rotor / campo'],['ri_exc','RI excitatriz']].forEach(([k,l])=>add(l,v(k),'MΩ',evMin(v(k),5,'MΩ')));
  const ro=desvioPct([v('ro_r'),v('ro_s'),v('ro_t')]); if(ro!==null) add('Desvio da resist. ôhmica entre fases',ro,'%',{st:ro<=2?'ok':ro<=3?'att':'nc',lim:'≤ 2 %'});
  const vs=[v('v_rs'),v('v_st'),v('v_tr')], vv=vs.filter(x=>x!==null);
  if(vv.length&&volts){ const avg=vv.reduce((a,b)=>a+b,0)/vv.length; const p=Math.abs(avg-volts)/volts*100; add('Desvio da tensão média ('+fmtN(avg)+' V)',p,'%',{st:p<=5?'ok':p<=10?'att':'nc',lim:'≤ 5 %'}); }
  const dv=desequilibrio(vs); if(dv!==null) add('Desequilíbrio de tensão',dv,'%',{st:dv<=2?'ok':dv<=3?'att':'nc',lim:'≤ 2 %'});
  const is=[v('i_r'),v('i_s'),v('i_t')]; const di=desequilibrio(is); if(di!==null) add('Desequilíbrio de corrente',di,'%',{st:di<=10?'ok':di<=20?'att':'nc',lim:'≤ 10 %'});
  const inom=(num(d.pot)&&volts)?num(d.pot)*1000/(Math.sqrt(3)*volts):null; const im=is.filter(x=>x!==null);
  if(inom&&im.length){ const c=Math.max(...im)/inom*100; add('Corrente máxima / nominal ('+fmtN(Math.round(inom))+' A)',c,'%',{st:c<=100?'ok':c<=110?'att':'nc',lim:'≤ 100 %'}); }
  const hz=v('hz'), fn=num(d.freq)||60; if(hz!==null) add('Frequência',hz,'Hz',evFaixa(hz,fn*0.99,fn*1.01,'Hz'));
  const fp=v('fp'); if(fp!==null) add('Fator de potência',fp,'',{st:fp>=0.8?'ok':fp>=0.7?'att':'nc',lim:'≥ 0,80'});
  const po=v('p_oleo'), pref=num(d.p_oleo_ref); if(po!==null) add('Pressão de óleo',po,'bar',pref!==null?evMin(po,pref,'bar'):{st:po>=2?'ok':po>=1.5?'att':'nc',lim:'≥ 2 bar'});
  const ta=v('t_agua'); if(ta!==null) add('Temperatura da água',ta,'°C',{st:ta<=95?'ok':ta<=100?'att':'nc',lim:'≤ 95 °C'});
  const vb=v('v_bat'), vbn=num(d.vbat)||24; if(vb!==null) add('Tensão das baterias',vb,'Vcc',evFaixa(vb,vbn*1.05,vbn*1.2,'Vcc'));
  const tp=v('t_part'); if(tp!==null) add('Tempo de partida',tp,'s',{st:tp<=10?'ok':tp<=15?'att':'nc',lim:'≤ 10 s'});
  const tt=v('t_transf'); if(tt!==null) add('Tempo de transferência',tt,'s',{st:tt<=15?'ok':tt<=30?'att':'nc',lim:'≤ 15 s'});
  const cg=v('carga'), pk=num(d.potkw); if(cg!==null&&pk){ const p=cg/pk*100; add('Carga de teste / nominal',p,'%',{st:p>=30?'ok':p>=15?'att':'nc',lim:'≥ 30 %'}); }
  return out;
}
const NORMAS_G=[
  ['ABNT NBR ISO 8528', 'Grupos geradores de corrente alternada acionados por motores alternativos de combustão interna'],
  ['ABNT NBR 5410', 'Instalações elétricas de baixa tensão – serviços de segurança e fontes de alimentação'],
  ['ABNT NBR IEC 60034', 'Máquinas elétricas girantes – características e ensaios'],
  ['IEEE 43', 'Prática recomendada para ensaio de resistência de isolamento de máquinas girantes (IP e DAR)'],
  ['ABNT NBR IEC 60947-6-1', 'Equipamentos de comutação de transferência automática'],
  ['ANSI/NETA MTS', 'Especificação para ensaios de manutenção de equipamentos e sistemas elétricos'],
  ['NR-10 / NR-12 / NR-23', 'Segurança em eletricidade, máquinas e proteção contra incêndio'],
  ['Manuais dos fabricantes', 'Motor diesel, alternador, controlador e QTA'],
];
const CRIT_G=[
  ['Isolamento do estator','≥ 5 MΩ (< 1 kV) ou ≥ 100 MΩ (≥ 1 kV), corrigido a 40 °C; IP ≥ 2,0 e DAR ≥ 1,25 (IEEE 43).'],
  ['Isolamento do rotor / excitatriz','≥ 5 MΩ.'],
  ['Resistência ôhmica','Desvio entre fases ≤ 2 %.'],
  ['Tensão e frequência em carga','Tensão ±5 % da nominal; frequência ±1 %; desequilíbrio de tensão ≤ 2 % e de corrente ≤ 10 %.'],
  ['Motor','Pressão de óleo ≥ mínimo do fabricante (padrão 2 bar); água ≤ 95 °C; baterias entre 1,05 e 1,20 × nominal.'],
  ['Partida e transferência','Partida ≤ 10 s; transferência ≤ 15 s (NBR 5410 – interrupção média para serviços de segurança).'],
  ['Carga de teste','≥ 30 % da potência nominal (evita carbonização / wet stacking).'],
];
function jobFields(h){
  return `<div class="sec">Dados da inspeção</div>
  <div class="card hdr"><div class="grid">
    ${field('numero','Nº do relatório',h,'text','Ex.: RT-26-001')}
    ${field('data','Data',h,'date')}
    ${field('cliente','Cliente',h)}
    ${field('local','Local / unidade',h)}
    ${sel('servico','Tipo de serviço',h,['Inspeção e ensaios','Manutenção preventiva','Teste em carga','Comissionamento'])}
    ${field('os','Ordem de serviço / contrato',h)}
    ${field('equipe','Equipe executante',h,'text','Nomes dos técnicos')}
    ${field('acompanhante','Acompanhante do cliente',h)}
    ${field('resp','Responsável técnico',h)}
  </div></div>
  <div class="sec">Condições e instrumentos</div>
  <div class="card hdr"><div class="grid">
    ${field('clima','Condição climática',h,'text','Ex.: tempo seco')}
    ${field('tamb','Temperatura ambiente (°C)',h,'text','',DEC)}
    ${field('umid','Umidade relativa (%)',h,'text','',DEC)}
  </div>${field('instrumentos','Instrumentos utilizados (modelo, série, calibração)',h,'textarea','Ex.: Megôhmetro 5 kV; micro-ohmímetro; alicate wattímetro; banco de carga resistivo 100 kW')}
  ${field('obs','Observações gerais',h,'textarea')}</div>`;
}
criarModuloChecklist({
  k:'gerador', nome:'Inspeção de grupo gerador', curto:'Gerador', icone:'🔋',
  desc:'Motor, alternador, QTA e sala – checklist, isolamento (IP/DAR), resistência ôhmica e teste em carga.',
  TIPOS, TIPOS_ORD:['GMG'], avaliar, itemNome:'grupo gerador', itemNomePl:'grupos geradores', hTitulo:'local', lblLocal:'Localização (sala / pátio)',
  novoH:()=>({servico:'Inspeção e ensaios', equipe:'', acompanhante:'', os:'', clima:'', tamb:'', umid:'', instrumentos:''}), jobFields,
  capaRows:(h,n)=>[['CLIENTE',h.cliente],['LOCAL',h.local],['SERVIÇO',h.servico],['DATA',fmtDate(h.data)],['GRUPOS GERADORES',String(n)],['EMISSÃO',fmtDate(today())]],
  identRows:(h,n)=>[['Relatório Nº',h.numero],['Cliente',h.cliente],['Local / unidade',h.local],['Tipo de serviço',h.servico],['Ordem de serviço / contrato',h.os],['Data',fmtDate(h.data)],['Equipe executante',h.equipe],['Acompanhante do cliente',h.acompanhante],['Responsável técnico',h.resp],['Grupos geradores inspecionados',String(n)],['Data de emissão',fmtDate(today())]],
  condRows:(h)=>[['Condição climática',h.clima],['Temperatura ambiente',h.tamb?h.tamb+' °C':''],['Umidade relativa',h.umid?h.umid+' %':''],['Instrumentos utilizados',h.instrumentos]],
  phDiag:'Ex.: troca de óleo e filtros; baterias com 23,1 V – substituídas; AVR ajustado para 380 V',
  phRec:'Ex.: substituir mangueira superior do radiador; repetir teste em carga em 6 meses',
  assinLinha:(h)=>h.equipe?`Equipe executante: ${h.equipe}`:'',
  tx:{ dadosSec:'Dados da inspeção', antes:'Antes da intervenção', depois:'Depois da intervenção',
    titulo:'Relatório de Inspeção de Grupo Gerador', arquivo:'Relatorio_Grupo_Gerador', capa1:'Inspeção e Ensaios', capa2:'Grupo Motor-Gerador', xlsTitulo:'INSPEÇÃO DE GRUPO GERADOR',
    condSec:'Condições da inspeção e instrumentos', normas:NORMAS_G, criterios:CRIT_G,
    objetivo:['Este relatório apresenta o resultado da inspeção e dos ensaios realizados no(s) grupo(s) motor-gerador indicado(s), abrangendo o motor de combustão, o alternador, o sistema de comando e transferência automática (QTA/USCA), as baterias e a instalação da sala. O objetivo é verificar as condições de operação e de partida automática, identificar não conformidades e recomendar as ações para garantir a disponibilidade da fonte de emergência.',
      'Foram aplicados um checklist de inspeção visual e funcional, os ensaios de resistência de isolamento (com índice de polarização e DAR) e de resistência ôhmica dos enrolamentos, e o teste de funcionamento em carga com registro de tensão, corrente, frequência, pressão de óleo, temperatura e tempos de partida e transferência. Cada item foi classificado como Conforme, Atenção, Não conforme ou Não se aplica, com severidade A, B ou C para as não conformidades.'],
    metodologia:['Análise de risco e bloqueio do grupo (modo manual / parada) antes das intervenções; aplicação das medidas de controle da NR-10 e da NR-12.',
      'Inspeção visual e funcional do motor, do alternador, do painel de comando, do QTA e da sala, com verificação de níveis, vazamentos, apertos e estado dos componentes.',
      'Ensaio de resistência de isolamento do estator e do rotor com megôhmetro (tensão de ensaio conforme a classe de tensão), leitura em 30 s, 60 s, 1 min e 10 min para cálculo de DAR e IP, com o AVR e os componentes eletrônicos desconectados.',
      'Medição da resistência ôhmica dos enrolamentos com micro-ohmímetro e comparação entre fases.',
      'Teste de partida automática por simulação de falta de rede e teste em carga (carga real ou banco de carga), com registro das grandezas elétricas e dos parâmetros do motor em regime.'],
    limitacoes:'Os valores de isolamento dependem da temperatura e da umidade e devem ser comparados ao histórico da máquina. Ensaios internos ao motor (compressão, injeção) e análise de óleo não fazem parte deste escopo, salvo indicação em contrário.',
  },
});
})();

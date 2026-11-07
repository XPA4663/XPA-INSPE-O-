/* ======================= MÓDULO: INSPEÇÃO DE MOTORES ELÉTRICOS ======================= */
(function(){
const TIPOS={
 MIT:{nome:'Motor de indução trifásico', grupo:'', icone:'⚙️',
  campos:[['pot','Potência (cv)'],['potkw','Potência (kW)'],['un','Tensão nominal (V)','','380'],['in','Corrente nominal (A)'],['rpm','Rotação nominal (rpm)'],['fs','Fator de serviço','','1,15'],
          ['isol','Classe de isolação',['F','H','B']],['ipg','Grau de proteção (IP)','','IP55'],['carcaca','Carcaça (IEC)'],['rolam','Rolamentos (dianteiro / traseiro)'],
          ['acion','Acionamento',['Partida direta','Estrela-triângulo','Soft-starter','Inversor de frequência','Chave compensadora']],['carga_ac','Carga acionada (bomba, ventilador, compressor…)'],['rele_aj','Ajuste do relé térmico / proteção (A)'],['montagem','Montagem',['Horizontal','Vertical','Flangeado']]],
  items:[
   ['base','Base, chumbadores e fixação','NBR 17094 / Fabricante','B'],
   ['acopl','Acoplamento, alinhamento e proteção do acoplamento','NR-12','B'],
   ['vent','Ventilação: tampa defletora, ventilador e aletas limpas','Fabricante','C'],
   ['ruido','Ruído e vibração anormais','ISO 20816-1','B'],
   ['temp','Temperatura da carcaça (toque / termômetro)','Fabricante','B'],
   ['rolamento','Rolamentos: lubrificação, ruído, folga, vazamento de graxa','Fabricante','B'],
   ['umid','Umidade, óleo ou contaminação sobre o motor','NBR 17094','C'],
   ['caixa','Caixa de ligação: apertos, isolação, prensa-cabos, vedação','NBR 5410','B'],
   ['aterr','Aterramento da carcaça e da caixa de ligação','NBR 5410','A'],
   ['cabos','Cabos de alimentação: seção, estado, identificação','NBR 5410','B'],
   ['prot','Proteção contra sobrecarga ajustada à corrente nominal','NBR 5410','A'],
   ['manobra','Contator / disjuntor / fusíveis: estado e dimensionamento','NBR 5410','B'],
   ['inversor','Inversor / soft-starter: parâmetros, ventilação, alarmes','Fabricante','B'],
   ['sensores','Sensores de temperatura (PT100 / termistor) e de vibração','Fabricante','C'],
   ['comando','Botoeiras, sinalização e parada de emergência','NR-12','A'],
   ['rotacao','Sentido de rotação e funcionamento em vazio/carga','Fabricante','B'],
   ['placa','Placa de identificação legível','NBR 17094','C'],
  ],
  meds:[
   {g:'Resistência de isolamento (MΩ)', f:[['ri_fm','Enrolamento – massa'],['dar','DAR (R60s / R30s)'],['ip','Índice de polarização (R10min / R1min)'],['ri_temp','Temperatura do enrolamento no ensaio (°C)']], note:'IEEE 43: mínimo 5 MΩ (< 1 kV) ou 100 MΩ (≥ 1 kV) a 40 °C; IP ≥ 2,0 (classes B, F, H); DAR ≥ 1,25.'},
   {g:'Resistência ôhmica entre terminais (mΩ)', f:[['ro_rs','R – S'],['ro_st','S – T'],['ro_tr','T – R']], note:'Desvio entre fases ≤ 2 %; até 3 % atenção.'},
   {g:'Operação em carga', f:[['v_rs','Tensão R – S (V)'],['v_st','Tensão S – T (V)'],['v_tr','Tensão T – R (V)'],['i_r','Corrente R (A)'],['i_s','Corrente S (A)'],['i_t','Corrente T (A)'],['rpm_med','Rotação medida (rpm)'],['t_carc','Temperatura da carcaça (°C)'],['t_mancal','Temperatura do mancal (°C)'],['vib','Vibração (mm/s RMS)']], note:'Tensão ±5 %; desequilíbrio de tensão ≤ 2 % e de corrente ≤ 5 % (NEMA MG-1); corrente ≤ nominal; carcaça ≤ 90 °C; mancal ≤ 80 °C; vibração ≤ 2,8 mm/s (ISO 20816-1, zona A/B).'},
  ]},
};
function avaliar(e,h){
  const m=e.m||{}, d=e.d||{}, out=[]; const v=(k)=>num(m[k]);
  const add=(label,val,unit,ev)=>{ if(val===null) return; out.push({label, val:fmtN(val)+(unit?' '+unit:''), lim:ev?ev.lim:'—', st:ev?ev.st:null}); };
  const volts=num(d.un), inom=num(d.in);
  const ri=v('ri_fm'); if(ri!==null) add('RI enrolamento – massa',ri,'MΩ',evMin(ri,limRImaq(volts),'MΩ'));
  const dar=v('dar'); if(dar!==null) add('DAR',dar,'',{st:dar>=1.25?'ok':dar>=1?'att':'nc',lim:'≥ 1,25'});
  const ip=v('ip'); if(ip!==null){ const min=['B','F','H'].includes(d.isol)?2:1.5; add('Índice de polarização',ip,'',{st:ip>=min?'ok':ip>=1?'att':'nc',lim:'≥ '+fmtN(min)}); }
  const ro=desvioPct([v('ro_rs'),v('ro_st'),v('ro_tr')]); if(ro!==null) add('Desvio da resist. ôhmica entre fases',ro,'%',{st:ro<=2?'ok':ro<=3?'att':'nc',lim:'≤ 2 %'});
  const vs=[v('v_rs'),v('v_st'),v('v_tr')], vv=vs.filter(x=>x!==null);
  if(vv.length&&volts){ const avg=vv.reduce((a,b)=>a+b,0)/vv.length; const p=Math.abs(avg-volts)/volts*100; add('Desvio da tensão média ('+fmtN(avg)+' V)',p,'%',{st:p<=5?'ok':p<=10?'att':'nc',lim:'≤ 5 %'}); }
  const dv=desequilibrio(vs); if(dv!==null) add('Desequilíbrio de tensão',dv,'%',{st:dv<=2?'ok':dv<=3?'att':'nc',lim:'≤ 2 %'});
  const is=[v('i_r'),v('i_s'),v('i_t')], im=is.filter(x=>x!==null);
  const di=desequilibrio(is); if(di!==null) add('Desequilíbrio de corrente',di,'%',{st:di<=5?'ok':di<=10?'att':'nc',lim:'≤ 5 %'});
  if(inom&&im.length){ const fs=num(d.fs)||1; const c=Math.max(...im)/inom*100; add('Corrente máxima / nominal',c,'%',{st:c<=100?'ok':c<=fs*100?'att':'nc',lim:'≤ 100 %'}); }
  const ra=num(d.rele_aj); if(ra!==null&&inom) add('Ajuste do relé / proteção',ra,'A',{st:ra<=inom?'ok':ra<=inom*1.15?'att':'nc',lim:'≤ '+fmtN(inom)+' A'});
  const rpm=v('rpm_med'), rn=num(d.rpm); if(rpm!==null&&rn){ const sync=rn>2700?3600:rn>1350?1800:rn>900?1200:900; const slip=(sync-rpm)/sync*100; add('Escorregamento ('+fmtN(rpm)+' rpm)',slip,'%',{st:rpm>=rn*0.985&&rpm<=sync?'ok':rpm>=rn*0.97?'att':'nc',lim:'rpm ≥ '+fmtN(Math.round(rn*0.985))}); }
  const tc=v('t_carc'); if(tc!==null) add('Temperatura da carcaça',tc,'°C',{st:tc<=90?'ok':tc<=105?'att':'nc',lim:'≤ 90 °C'});
  const tm=v('t_mancal'); if(tm!==null) add('Temperatura do mancal',tm,'°C',{st:tm<=80?'ok':tm<=95?'att':'nc',lim:'≤ 80 °C'});
  const vb=v('vib'); if(vb!==null) add('Vibração',vb,'mm/s',{st:vb<=2.8?'ok':vb<=4.5?'att':'nc',lim:'≤ 2,8 mm/s'});
  return out;
}
const NORMAS_M=[
  ['ABNT NBR 17094', 'Máquinas elétricas girantes – motores de indução – requisitos'],
  ['ABNT NBR IEC 60034', 'Máquinas elétricas girantes – características nominais e ensaios'],
  ['IEEE 43', 'Ensaio de resistência de isolamento de máquinas girantes (IP e DAR)'],
  ['ISO 20816-1 (ex-10816)', 'Avaliação da vibração de máquinas – critérios gerais'],
  ['NEMA MG-1', 'Motores e geradores – desequilíbrio de tensão e redução de potência'],
  ['ABNT NBR 5410', 'Instalações elétricas de baixa tensão – proteção de motores'],
  ['NR-10 / NR-12', 'Segurança em eletricidade e em máquinas e equipamentos'],
];
const CRIT_M=[
  ['Isolamento','≥ 5 MΩ (< 1 kV) ou ≥ 100 MΩ (≥ 1 kV) a 40 °C; IP ≥ 2,0; DAR ≥ 1,25 (IEEE 43).'],
  ['Resistência ôhmica','Desvio entre fases ≤ 2 %.'],
  ['Alimentação','Tensão ±5 % da nominal; desequilíbrio de tensão ≤ 2 %; de corrente ≤ 5 % (NEMA MG-1).'],
  ['Carregamento','Corrente ≤ nominal; entre In e In × FS atenção; acima: não conforme. Relé térmico ≤ In.'],
  ['Temperaturas','Carcaça ≤ 90 °C; mancal ≤ 80 °C.'],
  ['Vibração','≤ 2,8 mm/s RMS (zona A/B); 2,8–4,5 atenção (zona C); > 4,5 não conforme (zona D) – ISO 20816-1.'],
];
function jobFields(h){
  return `<div class="sec">Dados da inspeção</div>
  <div class="card hdr"><div class="grid">
    ${field('numero','Nº do relatório',h,'text','Ex.: RT-26-001')}
    ${field('data','Data',h,'date')}
    ${field('cliente','Cliente',h)}
    ${field('local','Local / unidade / setor',h)}
    ${sel('servico','Tipo de serviço',h,['Inspeção e ensaios','Manutenção preventiva','Diagnóstico de falha','Recebimento / comissionamento'])}
    ${field('os','Ordem de serviço / contrato',h)}
    ${field('equipe','Equipe executante',h,'text','Nomes dos técnicos')}
    ${field('acompanhante','Acompanhante do cliente',h)}
    ${field('resp','Responsável técnico',h)}
  </div></div>
  <div class="sec">Condições e instrumentos</div>
  <div class="card hdr"><div class="grid">
    ${field('tamb','Temperatura ambiente (°C)',h,'text','',DEC)}
    ${field('umid','Umidade relativa (%)',h,'text','',DEC)}
  </div>${field('instrumentos','Instrumentos utilizados (modelo, série, calibração)',h,'textarea','Ex.: Megôhmetro 1 kV; micro-ohmímetro; alicate amperímetro; medidor de vibração; termômetro IR; tacômetro')}
  ${field('obs','Observações gerais',h,'textarea')}</div>`;
}
criarModuloChecklist({
  k:'motores', nome:'Inspeção de motores elétricos', curto:'Motores', icone:'⚙️',
  desc:'Motores de indução – checklist mecânico/elétrico, isolamento (IP/DAR), ôhmica, corrente, temperatura e vibração.',
  TIPOS, TIPOS_ORD:['MIT'], avaliar, itemNome:'motor', itemNomePl:'motores', hTitulo:'local', lblLocal:'Localização / equipamento acionado',
  novoH:()=>({servico:'Inspeção e ensaios', equipe:'', acompanhante:'', os:'', tamb:'', umid:'', instrumentos:''}), jobFields,
  capaRows:(h,n)=>[['CLIENTE',h.cliente],['LOCAL',h.local],['SERVIÇO',h.servico],['DATA',fmtDate(h.data)],['MOTORES',String(n)],['EMISSÃO',fmtDate(today())]],
  identRows:(h,n)=>[['Relatório Nº',h.numero],['Cliente',h.cliente],['Local / unidade',h.local],['Tipo de serviço',h.servico],['Ordem de serviço / contrato',h.os],['Data',fmtDate(h.data)],['Equipe executante',h.equipe],['Acompanhante do cliente',h.acompanhante],['Responsável técnico',h.resp],['Motores inspecionados',String(n)],['Data de emissão',fmtDate(today())]],
  condRows:(h)=>[['Temperatura ambiente',h.tamb?h.tamb+' °C':''],['Umidade relativa',h.umid?h.umid+' %':''],['Instrumentos utilizados',h.instrumentos]],
  phDiag:'Ex.: rolamento traseiro com ruído; relé térmico ajustado acima da In – corrigido para 28 A',
  phRec:'Ex.: substituir rolamentos 6309/6208 na próxima parada; realinhar acoplamento',
  assinLinha:(h)=>h.equipe?`Equipe executante: ${h.equipe}`:'',
  tx:{ dadosSec:'Dados da inspeção', antes:'Antes da intervenção', depois:'Depois da intervenção',
    titulo:'Relatório de Inspeção de Motores Elétricos', arquivo:'Relatorio_Motores', capa1:'Inspeção e Ensaios', capa2:'Motores Elétricos', xlsTitulo:'INSPEÇÃO DE MOTORES ELÉTRICOS',
    condSec:'Condições da inspeção e instrumentos', normas:NORMAS_M, criterios:CRIT_M,
    objetivo:['Este relatório apresenta o resultado da inspeção e dos ensaios realizados nos motores elétricos indicados, abrangendo as condições mecânicas (fixação, acoplamento, rolamentos, vibração), elétricas (isolamento, resistência ôhmica, alimentação, proteção) e de operação em carga. O objetivo é identificar desvios que comprometam a confiabilidade ou a vida útil dos motores e recomendar as ações de manutenção.',
      'Cada item do checklist foi classificado como Conforme, Atenção, Não conforme ou Não se aplica, com severidade A, B ou C para as não conformidades; as medições foram comparadas aos limites de referência indicados.'],
    metodologia:['Análise de risco, bloqueio e etiquetagem (NR-10 / NR-12) para os ensaios com o motor desenergizado; medidas em operação realizadas com os quadros fechados ou com EPI adequado.',
      'Ensaio de resistência de isolamento com megôhmetro (500 V para motores até 1 kV), com leituras em 30 s, 60 s e 10 min para DAR e IP; inversores e soft-starters desconectados do ensaio.',
      'Medição da resistência ôhmica entre terminais com micro-ohmímetro; medição de tensão e corrente por fase, rotação, temperaturas de carcaça e mancais e vibração global em operação.',
      'Verificação dos ajustes de proteção contra a corrente nominal de placa e registro fotográfico.'],
    limitacoes:'Valores de isolamento dependem da temperatura e da umidade e devem ser comparados ao histórico. A medição de vibração global não substitui a análise espectral; ensaios de surto entre espiras e análise de corrente (MCSA) não fazem parte deste escopo, salvo indicação.',
  },
});
})();

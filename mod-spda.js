/* ======================= MÓDULO: LAUDO DE SPDA (NBR 5419) ======================= */
(function(){
const TIPOS={
 EST:{nome:'Estrutura protegida', grupo:'', icone:'🏢',
  campos:[['tipoest','Tipo de estrutura',['Edificação','Galpão industrial','Torre / mastro','Tanque / silo','Subestação','Outra']],['altura','Altura (m)'],['area','Área da cobertura (m²)'],
          ['nivel','Nível de proteção (NP)',['III','IV','II','I']],['metodo','Método de captação',['Gaiola de Faraday (malha)','Franklin (ângulo de proteção)','Esfera rolante','Estrutural (componentes naturais)','Misto']],
          ['ndesc','Nº de descidas'],['espac','Espaçamento médio entre descidas (m)'],['projeto','Projeto / laudo anterior disponível',['Não','Sim']],['anoinst','Ano de instalação do SPDA']],
  items:[
   ['cap_est','Captação: captores, mastros e condutores – fixação, corrosão, emendas','NBR 5419-3','A'],
   ['cap_cob','Captação: cobertura de toda a área (malha, ângulo ou esfera rolante conforme o NP)','NBR 5419-3','A'],
   ['cap_nat','Captação: elementos metálicos do topo conectados (antenas, caixas d\'água, exaustores, telhas metálicas)','NBR 5419-3','B'],
   ['cap_sec','Captação: seção e material dos condutores conforme Tabela 6 da NBR 5419-3','NBR 5419-3','B'],
   ['des_qtd','Descidas: quantidade e espaçamento conforme o nível de proteção','NBR 5419-3','B'],
   ['des_est','Descidas: fixação, corrosão, emendas e trajeto (sem laços)','NBR 5419-3','B'],
   ['des_med','Descidas: conexões de medição / caixas de inspeção acessíveis','NBR 5419-3','C'],
   ['des_mec','Descidas: proteção mecânica até 2,5 m do solo','NBR 5419-3','B'],
   ['des_nat','Descidas naturais (armaduras/pilares metálicos) com continuidade comprovada','NBR 5419-3','A'],
   ['at_ele','Aterramento: eletrodos / anel – estado, corrosão, profundidade','NBR 5419-3','B'],
   ['at_con','Aterramento: conexões (solda exotérmica / conectores) protegidas','NBR 5419-3','B'],
   ['at_int','Aterramento: interligação com o aterramento da instalação elétrica e de telecomunicações','NBR 5419-3 / NBR 5410','A'],
   ['at_cx','Aterramento: caixas de inspeção identificadas e acessíveis','NBR 5419-3','C'],
   ['eq_bep','Equipotencialização: BEP/barra principal e ligação das massas e tubulações metálicas','NBR 5419-3 / NBR 5410','A'],
   ['eq_dps','DPS classe I/II na entrada e nos quadros de distribuição (MPS)','NBR 5419-4 / NBR 5410','B'],
   ['eq_dpsest','DPS: estado, sinalizador, condutores curtos e proteção de retaguarda','NBR 5419-4','B'],
   ['eq_tel','Linhas de telecomunicação / dados protegidas (DPS, equipotencialização)','NBR 5419-4','C'],
   ['eq_toque','Medidas contra tensões de toque e passo em áreas acessíveis','NBR 5419-3','C'],
   ['doc_proj','Documentação: projeto, ART e laudos anteriores','NBR 5419-3','B'],
   ['doc_reg','Registros de inspeções periódicas (anual / semestral)','NBR 5419-3','C'],
   ['doc_sin','Sinalização e segurança de acesso à cobertura','NR-35 / NR-10','C'],
  ],
  meds:[
   {g:'Resistência de aterramento (Ω) – por ponto de medição', f:[['r1','Ponto 1'],['r2','Ponto 2'],['r3','Ponto 3'],['r4','Ponto 4'],['r5','Ponto 5'],['r6','Ponto 6']], note:'Método da queda de potencial (terrômetro). Referência: ≤ 10 Ω (NBR 5419-3); o critério determinante é a equipotencialização.'},
   {g:'Continuidade elétrica (Ω)', f:[['c_cap','Captação ↔ descidas (maior valor)'],['c_desc','Descidas ↔ aterramento (maior valor)'],['c_arm','Armaduras / componentes naturais (maior valor)']], note:'Continuidade ≤ 1 Ω; componentes naturais (armaduras) ≤ 0,2 Ω (NBR 5419-3).'},
   {g:'Proteção contra surtos', f:[['n_dps','DPS instalados (quantidade)'],['n_dpsnc','DPS com sinalização de fim de vida (quantidade)']], note:'Qualquer DPS com fim de vida: não conforme.'},
  ]},
};
function avaliar(e,h){
  const m=e.m||{}, out=[]; const v=(k)=>num(m[k]);
  const add=(label,val,unit,ev)=>{ if(val===null) return; out.push({label, val:fmtN(val)+(unit?' '+unit:''), lim:ev?ev.lim:'—', st:ev?ev.st:null}); };
  ['r1','r2','r3','r4','r5','r6'].forEach((k,i)=>{ const x=v(k); if(x!==null) add('Resistência de aterramento – ponto '+(i+1),x,'Ω',{st:x<=10?'ok':x<=20?'att':'nc',lim:'≤ 10 Ω'}); });
  [['c_cap','Continuidade captação ↔ descidas'],['c_desc','Continuidade descidas ↔ aterramento']].forEach(([k,l])=>{ const x=v(k); if(x!==null) add(l,x,'Ω',{st:x<=1?'ok':x<=2?'att':'nc',lim:'≤ 1 Ω'}); });
  const ca=v('c_arm'); if(ca!==null) add('Continuidade de componentes naturais',ca,'Ω',{st:ca<=0.2?'ok':ca<=1?'att':'nc',lim:'≤ 0,2 Ω'});
  const nd=v('n_dpsnc'); if(nd!==null) add('DPS com fim de vida',nd,'',{st:nd===0?'ok':'nc',lim:'0'});
  return out;
}
const NORMAS_S=[
  ['ABNT NBR 5419-1', 'Proteção contra descargas atmosféricas – Princípios gerais'],
  ['ABNT NBR 5419-2', 'Gerenciamento de risco'],
  ['ABNT NBR 5419-3', 'Danos físicos a estruturas e perigos à vida – SPDA externo e interno, inspeção e manutenção'],
  ['ABNT NBR 5419-4', 'Sistemas elétricos e eletrônicos internos na estrutura – MPS / DPS'],
  ['ABNT NBR 5410', 'Instalações elétricas de baixa tensão – aterramento, equipotencialização e DPS'],
  ['ABNT NBR 15749', 'Medição de resistência de aterramento e de potenciais na superfície do solo'],
  ['NR-10 / NR-35', 'Segurança em eletricidade e trabalho em altura'],
];
const CRIT_S=[
  ['Resistência de aterramento','≤ 10 Ω recomendado (NBR 5419-3); 10–20 Ω atenção; > 20 Ω não conforme, salvo justificativa de projeto.'],
  ['Continuidade','≤ 1 Ω entre captação, descidas e aterramento; ≤ 0,2 Ω para componentes naturais (armaduras).'],
  ['Captação e descidas','Conforme o nível de proteção: malha 20×20 m / 15×15 / 10×10 / 5×5 m e descidas a cada 20 / 15 / 10 / 10 m para NP IV / III / II / I.'],
  ['DPS','Presentes na entrada (classe I ou I+II) e nos quadros (classe II); sem sinalização de fim de vida.'],
  ['Periodicidade','Inspeção visual anual; inspeção completa com medições a cada 1 ano (estruturas com risco de explosão ou ambientes agressivos) ou 3 anos (demais) – NBR 5419-3.'],
];
function jobFields(h){
  return `<div class="sec">Dados do laudo</div>
  <div class="card hdr"><div class="grid">
    ${field('numero','Nº do laudo',h,'text','Ex.: LT-26-001')}
    ${field('data','Data da inspeção',h,'date')}
    ${field('cliente','Cliente',h)}
    ${field('local','Endereço / unidade',h)}
    ${sel('tipoinsp','Tipo de inspeção',h,['Periódica completa (com medições)','Visual anual','Inicial / aceitação','Após reforma ou descarga'])}
    ${field('os','Ordem de serviço / contrato',h)}
    ${field('equipe','Equipe executante',h,'text','Nomes dos técnicos')}
    ${field('acompanhante','Acompanhante do cliente',h)}
    ${field('resp','Responsável técnico',h)}
    ${field('art','ART nº',h)}
  </div></div>
  <div class="sec">Condições e instrumentos</div>
  <div class="card hdr"><div class="grid">
    ${field('clima','Condição climática / umidade do solo',h,'text','Ex.: tempo seco há 5 dias, solo seco')}
    ${field('tamb','Temperatura ambiente (°C)',h,'text','',DEC)}
  </div>${field('instrumentos','Instrumentos utilizados (terrômetro, micro-ohmímetro – modelo, série, calibração)',h,'textarea')}
  ${field('obs','Observações gerais',h,'textarea')}</div>`;
}
criarModuloChecklist({
  k:'spda', nome:'Laudo de SPDA', curto:'SPDA', icone:'🌩️',
  desc:'NBR 5419 – captação, descidas, aterramento, equipotencialização e DPS; medições de resistência e continuidade.',
  TIPOS, TIPOS_ORD:['EST'], avaliar, itemNome:'estrutura', itemNomePl:'estruturas', hTitulo:'local', lblLocal:'Identificação / endereço da estrutura',
  novoH:()=>({tipoinsp:'Periódica completa (com medições)', equipe:'', acompanhante:'', os:'', art:'', clima:'', tamb:'', instrumentos:''}), jobFields,
  capaRows:(h,n)=>[['CLIENTE',h.cliente],['LOCAL',h.local],['TIPO DE INSPEÇÃO',h.tipoinsp],['DATA DA INSPEÇÃO',fmtDate(h.data)],['ESTRUTURAS',String(n)],['EMISSÃO',fmtDate(today())]],
  identRows:(h,n)=>[['Laudo Nº',h.numero],['Cliente',h.cliente],['Endereço / unidade',h.local],['Tipo de inspeção',h.tipoinsp],['Ordem de serviço / contrato',h.os],['Data da inspeção',fmtDate(h.data)],['Equipe executante',h.equipe],['Acompanhante do cliente',h.acompanhante],['Responsável técnico',h.resp],['ART',h.art],['Estruturas inspecionadas',String(n)],['Data de emissão',fmtDate(today())]],
  condRows:(h)=>[['Condição climática / solo',h.clima],['Temperatura ambiente',h.tamb?h.tamb+' °C':''],['Instrumentos utilizados',h.instrumentos]],
  lblDiag:'Constatações', phDiag:'Ex.: condutor de descida rompido na fachada norte; DPS do QGBT com fim de vida',
  phRec:'Ex.: substituir trecho da descida D3 e refazer conexão de medição; trocar DPS; reinspecionar em 12 meses',
  assinLinha:(h)=>h.art?`ART nº ${h.art}`:'',
  tx:{ dadosSec:'Dados do laudo', antes:'Vista geral', depois:'Detalhe', outras:'Outras fotos (caixas de inspeção, DPS, medições)',
    titulo:'Laudo Técnico de SPDA', arquivo:'Laudo_SPDA', capa1:'Laudo Técnico', capa2:'SPDA – NBR 5419', xlsTitulo:'LAUDO DE SPDA – NBR 5419',
    condSec:'Condições da inspeção e instrumentos', normas:NORMAS_S, criterios:CRIT_S,
    objetivo:['Este laudo apresenta o resultado da inspeção do Sistema de Proteção contra Descargas Atmosféricas (SPDA) e das Medidas de Proteção contra Surtos (MPS) da(s) estrutura(s) indicada(s), conforme a ABNT NBR 5419, com o objetivo de verificar a integridade dos subsistemas de captação, descidas e aterramento, a equipotencialização e os DPS, e atestar as condições de proteção das pessoas e das instalações.',
      'Foram realizadas inspeção visual, verificação documental e, quando aplicável, medições de resistência de aterramento e de continuidade elétrica. Cada item foi classificado como Conforme, Atenção, Não conforme ou Não se aplica, com severidade A, B ou C para as não conformidades.'],
    metodologia:['Análise documental (projeto, ART, laudos e registros anteriores) e definição do nível de proteção adotado.',
      'Inspeção visual da captação, descidas, conexões, caixas de inspeção, aterramento, BEP e DPS, com acesso à cobertura conforme a NR-35.',
      'Medição da resistência de aterramento pelo método da queda de potencial (NBR 15749), com o sistema desconectado quando possível, e medição da continuidade elétrica entre os subsistemas com micro-ohmímetro.',
      'Registro fotográfico das constatações e emissão de parecer com plano de ação.'],
    limitacoes:'A resistência de aterramento varia com a umidade e a temperatura do solo; os valores refletem as condições na data da medição. Trechos embutidos (descidas naturais, anel enterrado) foram avaliados por continuidade e documentação, sem escavação. O gerenciamento de risco (NBR 5419-2) só integra este laudo quando contratado.',
    consideracoes:'Recomenda-se corrigir de imediato as não conformidades de severidade A, programar as de severidade B e manter o programa de inspeções: visual anual e completa com medições conforme a periodicidade da NBR 5419-3 para o tipo de estrutura.',
  },
});
})();

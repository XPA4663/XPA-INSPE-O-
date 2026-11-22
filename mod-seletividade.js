/* ======================= MÓDULO: LEVANTAMENTO PARA ESTUDO DE SELETIVIDADE =======================
   Coleta em campo dos dados necessários ao estudo de curto-circuito, coordenação e seletividade da proteção:
   entrada / concessionária, relés, disjuntores, fusíveis, transformadores, cabos, geradores e motores relevantes.
   Cada item tem os dados de placa / ajustes e um checklist de qualidade do levantamento. Anexos: documentos e ART. */
(function(){
const CURVAS=['IEC Normalmente inversa (NI)','IEC Muito inversa (MI)','IEC Extremamente inversa (EI)','IEC Inversa longa','ANSI Moderadamente inversa','ANSI Muito inversa','ANSI Extremamente inversa','Tempo definido','Não habilitada'];
const DOC=(k)=>[k+'_placa','Dados de placa legíveis e registrados com foto','Levantamento','C'];
const TIPOS={
 ENT:{nome:'Entrada de energia / ponto de entrega', grupo:'MT', icone:'🏛️',
  campos:[['conc','Concessionária'],['un','Tensão de fornecimento (kV)','','13,8'],['icc3','Curto-circuito trifásico no ponto de entrega (kA)'],['icc1','Curto-circuito fase-terra no ponto de entrega (kA)'],
          ['zpos','Impedância de sequência positiva (pu ou Ω)'],['zzero','Impedância de sequência zero (pu ou Ω)'],['base','Base das impedâncias (MVA / kV)'],
          ['protconc','Proteção da concessionária a montante',['Religador','Relé de subestação','Chave fusível','Não informado']],['ajconc','Ajustes da proteção da concessionária (fase / neutro)'],
          ['demanda','Demanda contratada (kW)'],['cabent','Ramal de entrada (cabo, seção, comprimento)']],
  items:[['carta','Carta / parecer de acesso da concessionária com níveis de curto e ajustes obtidos','Concessionária','B'],
         ['icc','Níveis de curto-circuito no ponto de entrega informados por escrito','Concessionária','B'],
         ['ajuste','Ajustes da proteção a montante (religador / relé da concessionária) disponíveis','Concessionária','B'],
         DOC('ent'),['unif','Diagrama unifilar disponível e conferido em campo','NBR 14039','B']],
  meds:[]},
 REL:{nome:'Relé de proteção (MT)', grupo:'MT', icone:'🧮',
  campos:[['funcoes','Funções habilitadas','','50/51, 50N/51N'],['tcf','Relação do TC de fase (A/A)'],['tcn','Relação do TC de neutro / terra (A/A)'],['tcclasse','Classe de exatidão dos TCs (ex.: 10B100)'],['tp','Relação do TP (V/V)'],
          ['p51','51 – partida de fase (A primário)'],['c51','51 – curva',CURVAS],['d51','51 – dial / multiplicador de tempo'],
          ['p50','50 – instantâneo de fase (A primário)'],['t50','50 – temporização (ms)'],
          ['p51n','51N – partida de neutro (A primário)'],['c51n','51N – curva',CURVAS],['d51n','51N – dial / multiplicador de tempo'],
          ['p50n','50N – instantâneo de neutro (A primário)'],['t50n','50N – temporização (ms)'],
          ['outras','Outras funções e ajustes (27, 59, 67, 46, 79, 50BF…)'],['aux','Alimentação auxiliar',['Nobreak','Banco de baterias','Capacitivo (trip)','Autoalimentado','Rede sem backup']],['djassoc','Disjuntor comandado']],
  items:[DOC('rel'),
         ['leitura','Ajustes lidos no relé (display ou software) e registrados com foto','Levantamento','B'],
         ['arquivo','Arquivo de parametrização exportado do relé','Levantamento','C'],
         ['tc','Relação e classe dos TCs conferidas na placa','NBR 6856','B'],
         ['habil','Funções de proteção ativas (sem bloqueio ou desabilitação indevida)','NBR 14039','A'],
         ['auxok','Alimentação auxiliar presente e em bom estado','NBR 14039','A'],
         ['eventos','Registro de eventos / oscilografia verificado','Levantamento','C']],
  meds:[]},
 DJMT:{nome:'Disjuntor de média tensão', grupo:'MT', icone:'⚡',
  campos:[['un','Tensão nominal (kV)'],['in','Corrente nominal (A)'],['icc','Capacidade de interrupção (kA)'],['meio','Meio de extinção',['Vácuo','SF6','Pequeno volume de óleo (PVO)','Grande volume de óleo (GVO)']],
          ['acion','Acionamento',['Motorizado','Manual com mola']],['trip','Bobina de abertura (tensão)'],['relassoc','Relé / proteção associada']],
  items:[DOC('djmt'),['capac','Capacidade de interrupção compatível com o curto-circuito do ponto','NBR IEC 62271-100','A'],
         ['bobina','Bobina de abertura alimentada pelo relé (trip efetivo)','NBR 14039','A']],
  meds:[]},
 FUS:{nome:'Fusível / chave fusível de MT', grupo:'MT', icone:'🧯',
  campos:[['tipo','Tipo de fusível',['HH (limitador)','Expulsão tipo K','Expulsão tipo T','Expulsão tipo H']],['in','Corrente nominal do elo / fusível (A)'],['un','Tensão nominal (kV)'],['icc','Capacidade de interrupção (kA)'],['protege','Equipamento protegido']],
  items:[DOC('fus'),['reserva','Elo / fusível instalado igual ao especificado (conferido na peça)','Levantamento','B'],
         ['capac','Capacidade de interrupção compatível com o curto-circuito do ponto','NBR 14039','A']],
  meds:[]},
 TRF:{nome:'Transformador', grupo:'Transformação', icone:'🔌',
  campos:[['pot','Potência (kVA)'],['up','Tensão primária (kV)'],['us','Tensão secundária (V)'],['z','Impedância Z (%)'],['lig','Ligação','','Dyn1'],
          ['tipo','Tipo',['Óleo mineral','Óleo vegetal','Seco (resina)']],['tap','Tap em uso'],['aterr','Aterramento do neutro BT',['Solidamente aterrado','Resistor','Isolado (IT)']],
          ['protp','Proteção do primário (relé / fusível)'],['prots','Proteção do secundário (disjuntor geral BT)'],['termica','Proteção térmica (26/49/63/71)']],
  items:[DOC('trf'),['zplaca','Impedância percentual lida na placa (não estimada)','Levantamento','B'],
         ['termok','Proteções próprias (temperatura, Buchholz, nível) interligadas ao trip / alarme','NBR 5356','B']],
  meds:[]},
 DJBT:{nome:'Disjuntor de baixa tensão', grupo:'BT', icone:'🔲',
  campos:[['tipo','Tipo',['Caixa moldada','Aberto (power)','Minidisjuntor']],['in','Corrente nominal In (A)'],['icu','Capacidade de interrupção Icu (kA)'],['un','Tensão nominal (V)','','380'],
          ['disparo','Unidade de disparo',['Termomagnética fixa','Termomagnética ajustável','Eletrônica LI','Eletrônica LSI','Eletrônica LSIG']],
          ['ir','Ir – longo retardo (A ou × In)'],['tr','tr – tempo de longo retardo (s)'],['isd','Isd – curto retardo (× Ir)'],['tsd','tsd – tempo de curto retardo (s)'],
          ['ii','Ii – instantâneo (× In)'],['ig','Ig – proteção de terra (A ou × In)'],['tg','tg – tempo de terra (s)'],
          ['circ','Circuito / carga alimentada'],['cabo','Cabo a jusante (seção e comprimento)']],
  items:[DOC('djbt'),['ajustes','Ajustes lidos no disparador e registrados com foto','Levantamento','B'],
         ['capac','Icu compatível com o curto-circuito do ponto','NBR IEC 60947-2','A'],
         ['cabo','Ajuste compatível com a capacidade do cabo a jusante (Ir ≤ Iz)','NBR 5410','A']],
  meds:[]},
 CAB:{nome:'Cabo / alimentador', grupo:'BT', icone:'〰️',
  campos:[['de','De (origem)'],['para','Para (destino)'],['un','Tensão (kV ou V)'],['secao','Seção (mm²)'],['nfase','Condutores por fase'],['material','Material',['Cobre','Alumínio']],
          ['isol','Isolação',['EPR 90 °C','XLPE 90 °C','HEPR 90 °C','PVC 70 °C']],['comp','Comprimento (m)'],['metodo','Método de instalação (NBR 5410 / 14039)']],
  items:[['ident','Seção e quantidade de condutores conferidas no cabo','Levantamento','B'],['comp','Comprimento medido ou estimado em planta','Levantamento','C']],
  meds:[]},
 GER:{nome:'Gerador', grupo:'Fontes e cargas', icone:'🔋',
  campos:[['pot','Potência (kVA)'],['un','Tensão (V)'],['xd2','Reatância subtransitória X"d (%)'],['xd1','Reatância transitória X\'d (%)'],['modo','Operação',['Emergência (transferência aberta)','Rampa / transferência fechada','Paralelo permanente com a rede']],
          ['protg','Proteção do gerador (disjuntor / relé)']],
  items:[DOC('ger'),['reat','Reatâncias obtidas na placa ou na folha de dados do fabricante','Levantamento','B']],
  meds:[]},
 MOT:{nome:'Motor / carga relevante', grupo:'Fontes e cargas', icone:'⚙️',
  campos:[['pot','Potência (cv ou kW)'],['un','Tensão (V)'],['in','Corrente nominal (A)'],['ipin','Ip/In (corrente de partida)'],['tpart','Tempo de partida (s)'],
          ['partida','Tipo de partida',['Direta','Estrela-triângulo','Soft-starter','Inversor de frequência','Chave compensadora']],['protm','Proteção do motor (disjuntor / relé)']],
  items:[DOC('mot'),['partok','Tempo e corrente de partida informados pela operação ou medidos','Levantamento','C']],
  meds:[]},
};
const NORMAS_S=[
  ['ABNT NBR 14039','Instalações elétricas de média tensão – proteção e coordenação'],
  ['ABNT NBR 5410','Instalações elétricas de baixa tensão – proteção contra sobrecorrentes'],
  ['IEEE 242 (Buff Book)','Proteção e coordenação de sistemas industriais e comerciais'],
  ['IEC 60909','Cálculo de correntes de curto-circuito'],
  ['Norma técnica da concessionária','Critérios de proteção da entrada e de coordenação com a rede'],
];
function jobFields(h){
  return `<div class="sec">Dados do levantamento</div>
  <div class="card hdr"><div class="grid">
    ${field('numero','Nº do relatório',h,'text','Ex.: LS-26-001')}
    ${field('data','Data do levantamento',h,'date')}
    ${field('cliente','Cliente',h)}
    ${field('local','Local / unidade',h)}
    ${sel('finalidade','Finalidade do estudo',h,['Estudo novo','Revisão de estudo existente','Ampliação / nova carga','Análise de desligamento indevido','Exigência da concessionária'])}
    ${field('solicitante','Solicitante (nome / cargo)',h)}
    ${field('equipe','Equipe executante',h)}
    ${field('resp','Responsável técnico',h)}
  </div>
  ${field('documentos','Documentos recebidos do cliente',h,'textarea','Ex.: unifilar rev. 3; estudo de seletividade 2019; carta de acesso da concessionária')}
  ${field('pendentes','Informações pendentes (a obter)',h,'textarea','Ex.: níveis de curto da concessionária; folha de dados do gerador')}
  ${field('obs','Observações gerais',h,'textarea')}</div>`;
}
criarModuloChecklist({
  k:'seletividade', nome:'Levantamento para estudo de seletividade', curto:'Seletividade', icone:'📐', anexos:['anexDoc','anexArt'],
  desc:'Coleta em campo para estudo de curto-circuito e seletividade: entrada, relés e ajustes, disjuntores, fusíveis, transformadores, cabos, geradores e motores.',
  TIPOS, TIPOS_ORD:['ENT','REL','DJMT','FUS','TRF','DJBT','CAB','GER','MOT'], comMeds:false,
  grupos:[['MT','Média tensão'],['Transformação','Transformação'],['BT','Baixa tensão'],['Fontes e cargas','Fontes e cargas']],
  itemNome:'equipamento', itemNomePl:'equipamentos', hTitulo:'local', lblLocal:'Localização / painel',
  novoH:()=>({finalidade:'Estudo novo', solicitante:'', equipe:'', documentos:'', pendentes:''}), jobFields,
  capaRows:(h,n)=>[['CLIENTE',h.cliente],['LOCAL',h.local],['FINALIDADE',h.finalidade],['DATA',fmtDate(h.data)],['EQUIPAMENTOS',String(n)],['EMISSÃO',fmtDate(today())]],
  identRows:(h,n)=>[['Relatório Nº',h.numero],['Cliente',h.cliente],['Local / unidade',h.local],['Finalidade do estudo',h.finalidade],['Solicitante',h.solicitante],['Data do levantamento',fmtDate(h.data)],['Equipe executante',h.equipe],['Responsável técnico',h.resp],['Equipamentos levantados',String(n)],['Data de emissão',fmtDate(today())]],
  condRows:(h)=>[['Documentos recebidos',h.documentos],['Informações pendentes',h.pendentes]],
  lblDiag:'Constatação', phDiag:'Ex.: 51N desabilitado; ajuste de fase acima da corrente nominal do transformador',
  phRec:'Ex.: obter carta de acesso com níveis de curto; exportar parametrização do relé',
  assinLinha:(h)=>h.equipe?`Equipe executante: ${h.equipe}`:'',
  tx:{ dadosSec:'Dados do levantamento', antes:'Foto geral / placa', depois:'Ajustes (display, dial)', outras:'Outras fotos',
    titulo:'Levantamento de Dados para Estudo de Seletividade', arquivo:'Levantamento_Seletividade', capa1:'Levantamento para Estudo', capa2:'de Seletividade', xlsTitulo:'LEVANTAMENTO PARA ESTUDO DE SELETIVIDADE',
    condSec:'Documentação e pendências', normas:NORMAS_S, criterios:[],
    objetivo:['Este relatório registra os dados levantados em campo para a elaboração do estudo de curto-circuito, coordenação e seletividade da proteção da instalação: características da entrada de energia, dados de placa e ajustes dos dispositivos de proteção, transformadores, cabos, fontes e cargas relevantes.',
      'Para cada equipamento, o checklist indica a qualidade e a completude das informações obtidas; itens marcados como Atenção ou Não conforme apontam dados faltantes ou condições que já indicam risco à proteção.'],
    metodologia:['Conferência do diagrama unifilar em campo, equipamento por equipamento.',
      'Leitura dos dados de placa e dos ajustes dos relés e disparadores, com registro fotográfico, sem alteração de nenhum ajuste.',
      'Acesso a painéis energizados somente para leitura de display, com as portas fechadas ou com EPI adequado; abertura de compartimentos apenas com o circuito desenergizado, bloqueado e etiquetado (NR-10).',
      'Levantamento junto à concessionária e ao cliente dos níveis de curto-circuito, dos ajustes a montante e dos documentos existentes.'],
    limitacoes:'Este relatório é um levantamento de dados e não contém os cálculos de curto-circuito nem as curvas de coordenação, que fazem parte do estudo de seletividade. Os ajustes foram registrados como encontrados; dados não acessíveis estão listados como pendentes.',
    consideracoes:'Os dados levantados servem de base para o estudo de seletividade, que apresentará os níveis de curto-circuito, os coordenogramas e os ajustes recomendados para cada dispositivo de proteção.',
  },
});
})();

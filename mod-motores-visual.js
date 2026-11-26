/* ======================= MÓDULO: INSPEÇÃO VISUAL DE MOTORES ELÉTRICOS (sem testes; anexo de ART) ======================= */
(function(){
const TIPOS={
 MIT:{nome:'Motor de indução trifásico', grupo:'', icone:'⚙️',
  campos:[['pot','Potência (cv)'],['potkw','Potência (kW)'],['un','Tensão nominal (V)','','380'],['in','Corrente nominal (A)'],['rpm','Rotação nominal (rpm)'],['fs','Fator de serviço','','1,15'],
          ['isol','Classe de isolação',['F','H','B']],['ipg','Grau de proteção (IP)','','IP55'],['carcaca','Carcaça (IEC)'],['rolam','Rolamentos (dianteiro / traseiro)'],
          ['acion','Acionamento',['Partida direta','Estrela-triângulo','Soft-starter','Inversor de frequência','Chave compensadora']],['carga_ac','Carga acionada (bomba, ventilador, compressor…)'],['rele_aj','Ajuste do relé térmico / proteção (A)'],['montagem','Montagem',['Horizontal','Vertical','Flangeado']],['corrosao','Grau de corrosão da pintura (ISO 4628-3)',['Ri 0 – sem corrosão','Ri 1 – pontos isolados','Ri 2 – leve','Ri 3 – moderada','Ri 4 – acentuada','Ri 5 – generalizada']]],
  items:[
   ['base','Base, chumbadores e fixação','NBR 17094 / Fabricante','B'],
   ['acopl','Acoplamento, alinhamento e proteção do acoplamento','NR-12','B'],
   ['vent','Ventilação: tampa defletora, ventilador e aletas limpas','Fabricante','C'],
   ['ruido','Ruído e vibração anormais','ISO 20816-1','B'],
   ['temp','Temperatura da carcaça (toque / termômetro)','Fabricante','B'],
   ['rolamento','Rolamentos: lubrificação, ruído, folga, vazamento de graxa','Fabricante','B'],
   ['umid','Umidade, óleo ou contaminação sobre o motor','NBR 17094','C'],
   ['pintura','Pintura e corrosão: carcaça, tampas, caixa de ligação e base (elevar para B se Ri 3 ou maior)','ISO 12944 / ISO 4628-3','C'],
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
  meds:[]},
};
function avaliar(){ return []; } /* somente inspeção visual: sem medições */
const NORMAS_M=[
  ['ABNT NBR 17094', 'Máquinas elétricas girantes – motores de indução – requisitos'],
  ['ABNT NBR IEC 60034', 'Máquinas elétricas girantes – características nominais'],
  ['ISO 20816-1 (ex-10816)', 'Avaliação da vibração de máquinas – referência para a percepção de vibração anormal'],
  ['ABNT NBR 5410', 'Instalações elétricas de baixa tensão – proteção de motores'],
  ['NR-10 / NR-12', 'Segurança em eletricidade e em máquinas e equipamentos'],
];
const CRIT_M=[
  ['Inspeção visual','Cada item do checklist é verificado por observação direta, com o motor parado e/ou em operação, sem instrumentos de ensaio.'],
  ['Temperatura e vibração','Avaliadas pelo toque, termômetro infravermelho portátil ou percepção de ruído/vibração anormal; valores medidos, quando houver, são apenas indicativos.'],
  ['Proteção','Ajuste do relé térmico comparado à corrente nominal de placa (≤ In).'],
];
function jobFields(h){
  return `<div class="sec">Dados da inspeção</div>
  <div class="card hdr"><div class="grid">
    ${field('numero','Nº do relatório',h,'text','Ex.: RT-26-001')}
    ${field('data','Data',h,'date')}
    ${field('cliente','Cliente',h)}
    ${field('local','Local / unidade / setor',h)}
    ${sel('servico','Tipo de serviço',h,['Inspeção visual','Manutenção preventiva','Diagnóstico de falha','Recebimento / comissionamento'])}
    ${field('os','Ordem de serviço / contrato',h)}
    ${field('equipe','Equipe executante',h,'text','Nomes dos técnicos')}
    ${field('acompanhante','Acompanhante do cliente',h)}
    ${field('resp','Responsável técnico',h)}
  </div></div>
  <div class="sec">Condições e instrumentos</div>
  <div class="card hdr"><div class="grid">
    ${field('tamb','Temperatura ambiente (°C)',h,'text','',DEC)}
    ${field('umid','Umidade relativa (%)',h,'text','',DEC)}
  </div>${field('instrumentos','Recursos utilizados (opcional)',h,'textarea','Ex.: lanterna; termômetro IR portátil; câmera fotográfica')}
  ${field('obs','Observações gerais',h,'textarea')}</div>`;
}
criarModuloChecklist({
  k:'motvisual', nome:'Inspeção visual de motores elétricos', curto:'Motores – visual', icone:'🔍', anexos:['anexArt'],
  desc:'Motores de indução – só inspeção visual, sem testes: checklist mecânico, elétrico, de proteção e de segurança, fotos e anexo da ART.', comMeds:false,
  TIPOS, TIPOS_ORD:['MIT'], avaliar, itemNome:'motor', itemNomePl:'motores', hTitulo:'local', lblLocal:'Localização / equipamento acionado',
  novoH:()=>({servico:'Inspeção visual', equipe:'', acompanhante:'', os:'', tamb:'', umid:'', instrumentos:''}), jobFields,
  capaRows:(h,n)=>[['CLIENTE',h.cliente],['LOCAL',h.local],['SERVIÇO',h.servico],['DATA',fmtDate(h.data)],['MOTORES',String(n)],['EMISSÃO',fmtDate(today())]],
  identRows:(h,n)=>[['Relatório Nº',h.numero],['Cliente',h.cliente],['Local / unidade',h.local],['Tipo de serviço',h.servico],['Ordem de serviço / contrato',h.os],['Data',fmtDate(h.data)],['Equipe executante',h.equipe],['Acompanhante do cliente',h.acompanhante],['Responsável técnico',h.resp],['Motores inspecionados',String(n)],['Data de emissão',fmtDate(today())]],
  condRows:(h)=>[['Temperatura ambiente',h.tamb?h.tamb+' °C':''],['Umidade relativa',h.umid?h.umid+' %':''],['Recursos utilizados',h.instrumentos]],
  phDiag:'Ex.: rolamento traseiro com ruído; relé térmico ajustado acima da In – corrigido para 28 A',
  phRec:'Ex.: substituir rolamentos 6309/6208 na próxima parada; realinhar acoplamento',
  assinLinha:(h)=>h.equipe?`Equipe executante: ${h.equipe}`:'',
  tx:{ dadosSec:'Dados da inspeção', antes:'Antes da intervenção', depois:'Depois da intervenção',
    titulo:'Relatório de Inspeção Visual de Motores Elétricos', arquivo:'Relatorio_Inspecao_Visual_Motores', capa1:'Inspeção Visual', capa2:'Motores Elétricos', xlsTitulo:'INSPEÇÃO VISUAL DE MOTORES ELÉTRICOS',
    condSec:'Condições da inspeção', normas:NORMAS_M, criterios:CRIT_M,
    objetivo:['Este relatório apresenta o resultado da inspeção visual dos motores elétricos indicados, abrangendo as condições mecânicas (fixação, acoplamento, ventilação, rolamentos, ruído e vibração perceptíveis), elétricas (caixa de ligação, cabos, aterramento, dispositivos de manobra e proteção) e de segurança (comandos, sinalização e parada de emergência). O objetivo é identificar desvios que comprometam a segurança, a confiabilidade ou a vida útil dos motores e recomendar as ações de manutenção.',
      'Cada item do checklist foi classificado como Conforme, Atenção, Não conforme ou Não se aplica, com severidade A, B ou C para as não conformidades.'],
    metodologia:['Inspeção visual e sensitiva (ruído, vibração e temperatura perceptíveis) com o motor em operação, a partir de posição segura e com as proteções e tampas fechadas.',
      'Verificações internas (caixa de ligação, apertos, conexões) somente com o circuito desenergizado, bloqueado e etiquetado (NR-10 / NR-12).',
      'Conferência dos dados de placa e do ajuste da proteção contra sobrecarga em relação à corrente nominal.',
      'Registro fotográfico das condições encontradas.'],
    limitacoes:'Esta inspeção é exclusivamente visual: não inclui ensaios elétricos (resistência de isolamento, IP/DAR, resistência ôhmica), medições de tensão e corrente, análise de vibração ou termografia. Problemas internos dos enrolamentos e rolamentos podem não ser detectáveis visualmente; para diagnóstico conclusivo, recomenda-se a inspeção com ensaios.',
  },
});
})();

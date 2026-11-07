/* ======================= MÓDULO: VISITA TÉCNICA ======================= */
(function(){
const TIPOS={
 PT:{nome:'Item visitado / constatação', grupo:'', icone:'📍',
  campos:[['sistema','Sistema',['Subestação / MT','Quadros e painéis BT','Transformadores','Geradores','Motores e acionamentos','Iluminação','SPDA / aterramento','Infraestrutura (eletrodutos, bandejas)','Outro']],['prioridade','Prioridade sugerida',['Média','Alta','Baixa']],['estimativa','Estimativa / escopo sugerido (h, R$ ou descrição curta)']],
  items:[
   ['estado','Estado geral e conservação do item','Boas práticas / fabricante','B'],
   ['seg','Condições de segurança (NR-10: proteção contra contatos, sinalização, acesso)','NR-10','A'],
   ['norma','Atendimento aparente às normas aplicáveis (NBR 5410 / 14039 / 5419)','ABNT','B'],
   ['func','Funcionamento e operação relatados pelo cliente','Cliente','C'],
  ],
  meds:[]},
};
const NORMAS_V=[
  ['ABNT NBR 5410 / NBR 14039', 'Instalações elétricas de baixa e média tensão'],
  ['ABNT NBR 5419', 'Proteção contra descargas atmosféricas'],
  ['NR-10', 'Segurança em instalações e serviços em eletricidade'],
  ['ANSI/NETA MTS', 'Ensaios de manutenção de equipamentos elétricos'],
];
function jobFields(h){
  return `<div class="sec">Dados da visita</div>
  <div class="card hdr"><div class="grid">
    ${field('numero','Nº do relatório',h,'text','Ex.: VT-26-001')}
    ${field('data','Data da visita',h,'date')}
    ${field('cliente','Cliente',h)}
    ${field('local','Endereço / unidade',h)}
    ${field('solicitante','Solicitante (nome / cargo)',h)}
    ${field('contato','Contato (telefone / e-mail)',h)}
    ${sel('motivo','Motivo da visita',h,['Levantamento para proposta','Avaliação de ocorrência / falha','Diagnóstico de instalação','Acompanhamento de serviço','Outro'])}
    ${field('equipe','Técnico(s) XPA',h)}
    ${field('resp','Responsável técnico',h)}
    ${field('horario','Horário (chegada – saída)',h,'text','Ex.: 09:00 – 11:30')}
  </div>${field('objetivo','Objetivo / solicitação do cliente',h,'textarea','Descreva o que o cliente pediu e o escopo da visita')}
  ${field('resumo','Resumo executivo',h,'textarea','Síntese das constatações e dos próximos passos (aparece no início do relatório)')}
  ${field('obs','Observações gerais',h,'textarea')}</div>`;
}
criarModuloChecklist({
  k:'visita', nome:'Visita técnica', curto:'Visita técnica', icone:'🧰',
  desc:'Relatório livre de visita: constatações por item, fotos, prioridade e recomendações / escopo para proposta.',
  TIPOS, TIPOS_ORD:['PT'], comMeds:false, itemNome:'item', itemNomePl:'itens', hTitulo:'motivo', lblLocal:'Localização',
  novoH:()=>({solicitante:'', contato:'', motivo:'Levantamento para proposta', equipe:'', horario:'', objetivo:'', resumo:''}), jobFields,
  capaRows:(h,n)=>[['CLIENTE',h.cliente],['LOCAL',h.local],['MOTIVO',h.motivo],['DATA DA VISITA',fmtDate(h.data)],['ITENS REGISTRADOS',String(n)],['EMISSÃO',fmtDate(today())]],
  identRows:(h,n)=>[['Relatório Nº',h.numero],['Cliente',h.cliente],['Endereço / unidade',h.local],['Solicitante',h.solicitante],['Contato',h.contato],['Motivo da visita',h.motivo],['Data / horário',fmtDate(h.data)+(h.horario?' · '+h.horario:'')],['Técnico(s) XPA',h.equipe],['Responsável técnico',h.resp],['Itens registrados',String(n)],['Data de emissão',fmtDate(today())]],
  condRows:(h)=>[['Objetivo / solicitação',h.objetivo],['Resumo executivo',h.resumo]],
  lblDiag:'Constatação', phDiag:'Descreva o que foi encontrado neste item',
  phRec:'Recomendação e escopo sugerido para a proposta',
  assinLinha:(h)=>h.equipe?`Técnico(s): ${h.equipe}`:'',
  tx:{ dadosSec:'Dados da visita', antes:'Foto geral', depois:'Detalhe', outras:'Outras fotos',
    titulo:'Relatório de Visita Técnica', arquivo:'Relatorio_Visita_Tecnica', capa1:'Relatório de', capa2:'Visita Técnica', xlsTitulo:'RELATÓRIO DE VISITA TÉCNICA',
    condSec:'Objetivo e resumo executivo', normas:NORMAS_V, criterios:[],
    objetivo:['Este relatório registra as constatações da visita técnica realizada nas instalações do cliente, com o objetivo de documentar as condições encontradas, os riscos identificados e as recomendações técnicas, servindo de base para a elaboração de proposta de serviços ou para o planejamento das ações de manutenção.',
      'Cada item visitado foi avaliado quanto ao estado geral, às condições de segurança e ao atendimento aparente às normas, com registro fotográfico e indicação de prioridade.'],
    metodologia:['Reunião inicial com o solicitante para alinhamento do escopo e das expectativas.','Inspeção visual das instalações acompanhada pelo cliente, sem intervenção em partes energizadas e respeitando as distâncias de segurança da NR-10.','Registro fotográfico e classificação das constatações por prioridade, com recomendações e escopo sugerido.'],
    limitacoes:'A visita técnica é uma avaliação visual e preliminar; não inclui ensaios, medições ou abertura de equipamentos, e não substitui laudos técnicos específicos. Estimativas indicadas são preliminares e serão detalhadas em proposta.',
    consideracoes:'A XPA Engenharia coloca-se à disposição para detalhar as recomendações em proposta técnica e comercial, priorizando as constatações de severidade A.',
  },
});
})();

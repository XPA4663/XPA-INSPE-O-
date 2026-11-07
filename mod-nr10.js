/* ======================= MÓDULO: LAUDO / AUDITORIA NR-10 ======================= */
(function(){
const TIPOS={
 INST:{nome:'Instalação / área auditada', grupo:'', icone:'📋',
  campos:[['tipoinst','Tipo',['Estabelecimento (geral)','Subestação','Quadros e painéis BT','Área de processo','Sala elétrica / CCM','Canteiro / obra']],['carga','Carga instalada (kW)'],['tensao','Tensões presentes','','13,8 kV / 380-220 V'],['ntrab','Trabalhadores autorizados (quantidade)'],['sep','Trabalhos em SEP (≥ 1 kV)',['Não','Sim']]],
  items:[
   ['pr_uni','Prontuário: esquemas unifilares atualizados com proteções, aterramento e cargas (10.2.4 a)','NR-10 item 10.2.4','A'],
   ['pr_at','Prontuário: especificação do sistema de aterramento e demais equipamentos de proteção (10.2.4 b)','NR-10 item 10.2.4','B'],
   ['pr_insp','Prontuário: relatórios de inspeções e medições (aterramento, SPDA, isolação) atualizados','NR-10 item 10.2.4','B'],
   ['pr_epi','Prontuário: especificação e controle de EPI/EPC com Certificado de Aprovação (CA)','NR-10 item 10.2.4','B'],
   ['pr_proc','Prontuário: procedimentos e instruções técnicas e administrativas de segurança','NR-10 item 10.2.4 / 10.11','B'],
   ['pr_trein','Prontuário: certificados de treinamento NR-10 básico (40 h) e SEP (40 h) dentro da validade (2 anos)','NR-10 item 10.8','A'],
   ['pr_aso','Prontuário: autorização formal dos trabalhadores e ASO com aptidão','NR-10 item 10.8.1 / 10.8.4','A'],
   ['pr_aud','Prontuário: relatório técnico de auditoria anterior e evidências das correções','NR-10 item 10.2.4 / 10.2.5','C'],
   ['pr_art','Prontuário: ART do responsável e laudos de SPDA e aterramento','NR-10 item 10.2.4','B'],
   ['pr_area','Documentação de áreas classificadas (quando aplicável)','NR-10 item 10.2.4 / 10.9','B'],
   ['mc_des','Medidas de controle: procedimento de desenergização completo (seccionamento, impedimento, constatação, aterramento, proteção, sinalização)','NR-10 item 10.5','A'],
   ['mc_blo','Dispositivos de bloqueio e etiquetagem disponíveis e em uso','NR-10 item 10.5.1 / 10.10','A'],
   ['mc_terra','Aterramento temporário disponível para trabalhos em SEP/MT','NR-10 item 10.5.1','A'],
   ['mc_det','Detectores de tensão adequados às tensões da instalação','NR-10 item 10.5.1','B'],
   ['in_quad','Quadros e painéis fechados, identificados e com barreiras contra contato acidental (IP2X)','NR-10 item 10.3 / NBR 5410','A'],
   ['in_impr','Ausência de improvisos, emendas expostas e condutores sem proteção','NR-10 item 10.3 / NBR 5410','A'],
   ['in_aterr','Aterramento e equipotencialização das massas','NR-10 item 10.2.8 / NBR 5410','A'],
   ['in_dr','Proteção contra choque: DR nos circuitos exigidos, isolação dupla, SELV','NBR 5410 item 5.1.3','B'],
   ['in_dps','SPDA e DPS instalados e inspecionados','NBR 5419 / NBR 5410','B'],
   ['in_sin','Sinalização de segurança: advertência, identificação de circuitos, zonas de risco e controlada','NR-10 item 10.10 / NR-26','B'],
   ['in_acesso','Acesso restrito a salas elétricas e subestações (portas trancadas, identificação)','NR-10 item 10.10','B'],
   ['in_ilum','Iluminação adequada e de emergência nas áreas elétricas','NR-10 item 10.3 / NBR 10898','C'],
   ['in_ext','Extintores adequados (classe C / CO₂) sinalizados e dentro da validade','NR-23','B'],
   ['in_cal','Vestimenta FR e calçado adequados ao risco de arco e choque','NR-10 item 10.2.9','B'],
   ['epi_luv','Luvas isolantes com ensaio periódico em dia e luvas de cobertura','NR-10 item 10.2.9 / NBR 10622','A'],
   ['epi_cap','Capacete classe B, óculos, protetor facial para arco','NR-10 item 10.2.9','B'],
   ['epc_tap','EPC: tapete isolante, bastões, cones, fitas de isolamento de área','NR-10 item 10.2.8','B'],
   ['pt_pt','Permissão de trabalho / ordem de serviço para intervenções em instalações elétricas','NR-10 item 10.11 / 10.7','B'],
   ['pt_ar','Análise de risco e trabalho em equipe (mínimo 2) em SEP e áreas de risco','NR-10 item 10.7 / 10.11','A'],
   ['em_proc','Procedimentos de emergência, primeiros socorros e resgate; trabalhadores treinados','NR-10 item 10.12','B'],
   ['em_desl','Meios de desligamento de emergência conhecidos e acessíveis','NR-10 item 10.12','A'],
  ],
  meds:[
   {g:'Verificações complementares', f:[['r_at','Resistência de aterramento (Ω)'],['dr_ms','Tempo de atuação do DR (ms)'],['dr_ma','Corrente de atuação do DR (mA) – DR de 30 mA'],['n_trein_vencido','Trabalhadores com treinamento vencido (quantidade)']], note:'Aterramento ≤ 10 Ω (referência); DR 30 mA: atuação ≤ 300 ms e entre 15 e 30 mA; nenhum trabalhador com treinamento vencido.'},
  ]},
};
function avaliar(e,h){
  const m=e.m||{}, out=[]; const v=(k)=>num(m[k]);
  const add=(label,val,unit,ev)=>{ if(val===null) return; out.push({label, val:fmtN(val)+(unit?' '+unit:''), lim:ev?ev.lim:'—', st:ev?ev.st:null}); };
  const r=v('r_at'); if(r!==null) add('Resistência de aterramento',r,'Ω',{st:r<=10?'ok':r<=20?'att':'nc',lim:'≤ 10 Ω'});
  const ms=v('dr_ms'); if(ms!==null) add('Tempo de atuação do DR',ms,'ms',{st:ms<=300?'ok':ms<=400?'att':'nc',lim:'≤ 300 ms'});
  const ma=v('dr_ma'); if(ma!==null) add('Corrente de atuação do DR',ma,'mA',evFaixa(ma,15,30,'mA'));
  const nt=v('n_trein_vencido'); if(nt!==null) add('Treinamentos vencidos',nt,'',{st:nt===0?'ok':'nc',lim:'0'});
  return out;
}
const NORMAS_N=[
  ['NR-10', 'Segurança em instalações e serviços em eletricidade (Portaria MTE)'],
  ['NR-06', 'Equipamentos de proteção individual'],
  ['NR-12 / NR-23 / NR-26 / NR-35', 'Máquinas, proteção contra incêndio, sinalização e trabalho em altura'],
  ['ABNT NBR 5410', 'Instalações elétricas de baixa tensão'],
  ['ABNT NBR 14039', 'Instalações elétricas de média tensão'],
  ['ABNT NBR 5419', 'Proteção contra descargas atmosféricas'],
  ['ABNT NBR 10622', 'Luvas isolantes de borracha – ensaios'],
  ['ABNT NBR 16384', 'Segurança em eletricidade – recomendações e orientações para trabalho seguro'],
];
const CRIT_N=[
  ['Prontuário das instalações','Obrigatório para carga instalada > 75 kW (NR-10 item 10.2.3 e 10.2.4); itens ausentes ou desatualizados são não conformidades.'],
  ['Treinamento','NR-10 básico 40 h e SEP 40 h, reciclagem bienal (10.8.8); autorização formal e aptidão médica.'],
  ['Medidas de controle','Desenergização em 6 etapas (10.5.1); EPC/EPI compatíveis com as tensões e com CA válido.'],
  ['Aterramento e DR','Aterramento ≤ 10 Ω (referência); DR 30 mA atuando ≤ 300 ms entre 15 e 30 mA.'],
  ['Severidade','A – risco grave e iminente / exigência legal essencial; B – exigência legal a regularizar; C – melhoria recomendada.'],
];
function jobFields(h){
  return `<div class="sec">Dados do laudo</div>
  <div class="card hdr"><div class="grid">
    ${field('numero','Nº do laudo',h,'text','Ex.: LT-26-001')}
    ${field('data','Data da auditoria',h,'date')}
    ${field('cliente','Cliente / empresa',h)}
    ${field('local','Endereço / unidade',h)}
    ${field('cnpj','CNPJ',h)}
    ${field('atividade','Atividade / CNAE',h)}
    ${field('cargakw','Carga instalada total (kW)',h,'text','',DEC)}
    ${field('os','Ordem de serviço / contrato',h)}
    ${field('equipe','Auditor(es)',h,'text','Nomes')}
    ${field('acompanhante','Acompanhante do cliente (SESMT / responsável)',h)}
    ${field('resp','Responsável técnico',h)}
    ${field('art','ART nº',h)}
  </div>${field('obs','Observações gerais',h,'textarea')}</div>`;
}
criarModuloChecklist({
  k:'nr10', nome:'Laudo / auditoria NR-10', curto:'NR-10', icone:'🦺',
  desc:'Prontuário, medidas de controle, instalações, EPI/EPC, procedimentos e emergência – checklist por área com severidade.',
  TIPOS, TIPOS_ORD:['INST'], avaliar, itemNome:'área auditada', itemNomePl:'áreas auditadas', hTitulo:'local', lblLocal:'Localização / setor',
  novoH:()=>({cnpj:'', atividade:'', cargakw:'', equipe:'', acompanhante:'', os:'', art:''}), jobFields,
  capaRows:(h,n)=>[['CLIENTE',h.cliente],['LOCAL',h.local],['CARGA INSTALADA',h.cargakw?h.cargakw+' kW':''],['DATA DA AUDITORIA',fmtDate(h.data)],['ÁREAS AUDITADAS',String(n)],['EMISSÃO',fmtDate(today())]],
  identRows:(h,n)=>[['Laudo Nº',h.numero],['Cliente / empresa',h.cliente],['CNPJ',h.cnpj],['Atividade / CNAE',h.atividade],['Endereço / unidade',h.local],['Carga instalada',h.cargakw?h.cargakw+' kW':''],['Ordem de serviço / contrato',h.os],['Data da auditoria',fmtDate(h.data)],['Auditor(es)',h.equipe],['Acompanhante do cliente',h.acompanhante],['Responsável técnico',h.resp],['ART',h.art],['Áreas auditadas',String(n)],['Data de emissão',fmtDate(today())]],
  condRows:null,
  lblDiag:'Constatações', phDiag:'Ex.: unifilar desatualizado após ampliação do QD-3; 2 eletricistas com reciclagem vencida',
  phRec:'Ex.: atualizar unifilar e prontuário em 30 dias; reciclar treinamento NR-10 antes de nova intervenção',
  assinLinha:(h)=>h.art?`ART nº ${h.art}`:'',
  tx:{ dadosSec:'Dados do laudo', antes:'Evidência 1', depois:'Evidência 2', outras:'Outras evidências fotográficas',
    titulo:'Laudo Técnico – Conformidade NR-10', arquivo:'Laudo_NR10', capa1:'Laudo Técnico', capa2:'Conformidade NR-10', xlsTitulo:'LAUDO NR-10',
    condSec:'', normas:NORMAS_N, criterios:CRIT_N,
    objetivo:['Este laudo apresenta o resultado da auditoria de conformidade das instalações e dos serviços em eletricidade do estabelecimento indicado em relação à Norma Regulamentadora NR-10, abrangendo o prontuário das instalações elétricas, as medidas de controle, as condições das instalações, os equipamentos de proteção, os procedimentos de trabalho, a habilitação dos trabalhadores e as medidas de emergência.',
      'Cada item foi classificado como Conforme, Atenção, Não conforme ou Não se aplica, com severidade A, B ou C, compondo o plano de ação para regularização. O laudo integra o prontuário das instalações elétricas (NR-10 item 10.2.4) e deve ser revisado anualmente ou após alterações significativas.'],
    metodologia:['Análise documental do prontuário das instalações elétricas e dos registros de treinamento, saúde ocupacional, EPI/EPC e procedimentos.',
      'Inspeção de campo nas subestações, salas elétricas, quadros e áreas de trabalho, acompanhada pelo responsável do cliente, sem intervenção em partes energizadas.',
      'Entrevistas com trabalhadores autorizados sobre procedimentos, bloqueio e emergência.',
      'Classificação das constatações por severidade e emissão do plano de ação com prazos sugeridos.'],
    limitacoes:'O laudo reflete as condições e os documentos apresentados na data da auditoria; não substitui os laudos específicos de aterramento, SPDA e termografia, que devem compor o prontuário. Medições elétricas só integram este laudo quando contratadas.',
    consideracoes:'Recomenda-se regularizar de imediato as não conformidades de severidade A (risco grave e iminente), estabelecer prazos para as de severidade B, manter o prontuário atualizado e repetir a auditoria anualmente.',
  },
});
})();

/* ======================= MÓDULO: PROPOSTAS TÉCNICA E COMERCIAL =======================
   Acesso restrito (config/acl no Firestore), numeração compartilhada, cálculo por homem-hora,
   leitura de proposta antiga (.docx local ou IA), geração em Word (.docx) e PDF no padrão XPA. */
(function(){
'use strict';
const OWNER = 'xavier@xpaengenharia.com.br';          // administrador principal (sempre tem acesso)
const REGIAO = 'southamerica-east1';                   // região da Cloud Function de IA
const HH = [['Engenheiro', 410], ['Eletrotécnico', 270], ['Eletricista', 190], ['Auxiliar técnico', 130]];
const VKM = 3.8;
const RESP = (typeof RESP_PADRAO !== 'undefined') ? RESP_PADRAO : 'Eng. Magidiel Xavier Araújo – CREA 5069271199';

/* ---------- utilidades puras ---------- */
const N = (v) => { if (v === undefined || v === null || String(v).trim() === '') return null; let s = String(v).trim(); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const x = parseFloat(s); return isNaN(x) ? null : x; };
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const brl = (v) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fN = (v) => (v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const pad2 = (v) => { const n = N(v); return n === null ? '' : (Number.isInteger(n) && n < 10 ? '0' + n : fN(n)); };
const linhas = (s) => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
const dataBR = (s) => { if (!s) return ''; const [y, m, d] = s.split('-'); return d + '/' + m + '/' + y; };
const hoje = () => new Date().toISOString().slice(0, 10);
const getP = (o, path) => path.split('.').reduce((a, k) => a == null ? a : a[k], o);
function setP(o, path, v) { const ks = path.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null) a[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; }
const clone = (o) => JSON.parse(JSON.stringify(o));
function extenso(n) {
  const u = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const d = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const c = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ate999 = (x) => { if (x === 0) return ''; if (x === 100) return 'cem'; const p = []; const h = Math.floor(x / 100), r = x % 100; if (h) p.push(c[h]); if (r < 20) { if (r) p.push(u[r]); } else p.push(d[Math.floor(r / 10)] + (r % 10 ? ' e ' + u[r % 10] : '')); return p.join(' e '); };
  const grupo = (x, sing, plur) => x === 0 ? '' : (x === 1 && sing === 'mil' ? 'mil' : ate999(x) + ' ' + (x === 1 ? sing : plur));
  const inteiro = Math.floor(n), cent = Math.round((n - inteiro) * 100);
  const mi = Math.floor(inteiro / 1e6), mil = Math.floor((inteiro % 1e6) / 1000), resto = inteiro % 1000;
  const partes = [grupo(mi, 'milhão', 'milhões'), grupo(mil, 'mil', 'mil'), ate999(resto)].filter(Boolean);
  let s = '';
  partes.forEach((p, i) => { if (!i) s = p; else { const last = i === partes.length - 1 && resto && (resto < 100 || resto % 100 === 0); s += (last ? ' e ' : ', ') + p; } });
  if (!inteiro) s = 'zero';
  s += inteiro === 1 ? ' real' : (mi && !mil && !resto ? ' de reais' : ' reais');
  if (cent) s += ' e ' + ate999(cent) + (cent === 1 ? ' centavo' : ' centavos');
  return s;
}

/* ---------- textos padrão XPA ---------- */
const PADRAO = {
  respXpa: ['Disponibilizar profissionais habilitados, com ASO válido e capacitação em NR-10 Básico, SEP e NR-35;', 'Fornecer ferramentas e instrumentos de ensaio com calibração válida;', 'Fornecer EPIs, EPCs e sinalização da área de trabalho;', 'Fornecer os materiais de limpeza e lubrificação previstos no escopo;', 'Responsabilizar-se pelo deslocamento e pela alimentação da equipe;', 'Executar os serviços conforme NR-10 e NR-35;', 'Emitir relatório técnico e ART.'],
  respCli: ['Aprovar a proposta e programar a data do desligamento com a XPA;', 'Solicitar à concessionária o desligamento da entrada, quando necessário;', 'Realizar a integração de SSMA e liberar o acesso da equipe e dos equipamentos;', 'Executar o desligamento, o bloqueio e o aterramento das instalações, emitir a permissão de trabalho e realizar a reenergização ao final;', 'Informar os dados de placa dos equipamentos e disponibilizar os relatórios e laudos anteriores;', 'Garantir acesso seguro aos equipamentos;', 'Disponibilizar ponto de energia 220 V para os instrumentos de ensaio;', 'Disponibilizar área de apoio, sanitários e água potável;', 'Disponibilizar acompanhante durante a execução dos serviços;', 'Realizar a destinação dos resíduos gerados.'],
  exclBox: '**Não estão sendo considerados nesta proposta:** PTA (plataforma de trabalho aéreo) e TST (técnico de segurança do trabalho) dedicado à atividade.',
  excl: ['Caminhão munck, andaimes e equipamentos de içamento;', 'Tratamento termovácuo, regeneração ou complementação de óleo isolante;', 'Substituição de componentes, peças ou acessórios além do escopo;', 'Intervenção na parte ativa dos transformadores;', 'Ajuste ou parametrização de relés e estudo de seletividade;', 'Coleta, transporte e destinação de resíduos;', 'Equipamentos não listados no item 1;', 'Exames médicos além dos listados no item 10 da Proposta Comercial;', 'Horas de espera e dias adicionais (cobrados conforme a Proposta Comercial);', 'Todo e qualquer item não descrito nesta proposta.'],
};
const MODELOS = {
  'Para-raios': 'Serviços gerais:\nInspeção visual e limpeza das porcelanas / saias poliméricas;\nVerificação e reaperto das conexões de força e de terra;\nVerificação da conexão de aterramento e do contador de descargas (quando existente).\nMedições e ensaios:\nResistência de isolamento.',
  'Transformadores de potência': 'Serviços gerais:\nInspeção visual, limpeza geral e limpeza das buchas;\nVerificação e reaperto das conexões AT, BT e de aterramento;\nVerificação do nível de óleo, de vazamentos, do secador de sílica gel e dos acessórios (quando existentes);\nColeta de amostra de óleo isolante para análises (quando contratadas).\nMedições e ensaios:\nResistência de isolamento;\nRelação de transformação (TTR);\nResistência ôhmica dos enrolamentos.',
  'Transformadores de potencial e de corrente': 'Serviços gerais:\nInspeção visual e limpeza geral;\nVerificação e reaperto das conexões AT e BT;\nVerificação do estado das fiações de comando e reaperto de terminais;\nVerificação do nível de óleo e de vazamentos (quando aplicável).\nMedições e ensaios:\nResistência de isolamento;\nRelação de transformação;\nResistência ôhmica dos enrolamentos.',
  'Isoladores, barramentos, cubículos e painéis': 'Serviços gerais:\nInspeção visual, limpeza geral e reaperto das conexões;\nVerificação de trincas e sinais de fuga nos isoladores;\nVerificação dos barramentos e das estruturas.',
  'Chaves seccionadoras': 'Serviços gerais:\nInspeção visual e limpeza geral, inclusive do painel de comando;\nVerificação e reaperto das conexões de força e comando e do estado das fiações;\nVerificação dos intertravamentos e das bobinas de abertura e fechamento (quando motorizadas);\nInspeção dos contatos principais e auxiliares, das molas e da pressão dos contatos;\nLubrificação das articulações e verificação de parafusos, porcas e arruelas.\nMedições e ensaios:\nResistência de isolamento (chave e isoladores);\nResistência ôhmica dos contatos;\nTestes operacionais de abertura e fechamento (manual/elétrico, local/remoto, quando aplicável).',
  'Disjuntores de média tensão': 'Serviços gerais:\nInspeção visual, limpeza geral e limpeza externa dos polos;\nVerificação e reaperto das conexões de força e comando e do estado das fiações;\nVerificação dos intertravamentos e das bobinas de abertura e fechamento;\nVerificação da existência de vazamentos.\nMedições e ensaios:\nResistência de isolamento;\nResistência ôhmica dos contatos;\nTestes operacionais de abertura e fechamento;\nOscilografia de abertura e fechamento (tempos de operação).',
  'Sistema de proteção e controle': 'Serviços gerais:\nInspeção visual, limpeza geral e reaperto das conexões de comando.\nMedições e ensaios:\nMedição da corrente de partida dos relés de proteção;\nLevantamento da curva característica de tempo inverso;\nBackup dos ajustes dos relés (quando digitais).',
  'Análises do óleo isolante': 'Coleta de uma amostra de óleo de cada transformador de potência, com análises realizadas por laboratório parceiro conforme a tabela abaixo.',
  'Malha de aterramento': 'Medição da resistência de aterramento pelo método da queda de potencial;\nVerificação das conexões e das caixas de inspeção.',
  'Termografia': 'Inspeção termográfica dos painéis e conexões energizadas, com classificação conforme NETA MTS.',
  'Seção em branco': '',
};
const OLEO_TAB = [['Rigidez dielétrica', 'NBR IEC 60156'], ['Teor de água', 'NBR 10710'], ['Tensão interfacial', 'NBR 6234'], ['Índice de neutralização', 'NBR 14248'], ['Fator de perdas dielétricas', 'NBR 12133'], ['Cor', 'NBR 14483'], ['Densidade', 'NBR 7148']];

function novaProposta() {
  return {
    kind: 'proposta', numero: '', rev: '00', data: hoje(), status: 'rascunho',
    cli: { cliente: '', solicitante: '', tel: '', email: '', local: '' },
    obj: { titulo1: 'Manutenção Preventiva', titulo2: '', objeto: '' },
    equip: [], escopo: [],
    etapas: ['Programação e integração', 'Desligamento e liberação', 'Manutenção e ensaios', 'Análises e laudos', 'Relatório técnico e ART'],
    etapasDesc: ['Data da intervenção e integração de SSMA', 'Desligamento, bloqueio e aterramento pela contratante, com PT', 'Limpeza, reaperto, lubrificação e ensaios elétricos', 'Coletas e laudos de laboratório, quando contratados', 'Resultados, não conformidades e recomendações'],
    prazos: { integracao: 'Antes do início dos serviços, em data a combinar. Se exigida em dia separado, será cobrada conforme a Proposta Comercial', execucao: '01 dia de campo, jornada de 10 horas, em período diurno e com condições climáticas favoráveis', laudos: '', relatorio: 'Até 10 dias úteis após a execução dos serviços', mobilizacao: 'Equipe e equipamentos a partir de São Paulo/SP' },
    qualif: 'Profissionais com ASO válido e capacitação em NR-10 Básico, SEP e NR-35.',
    respXpa: PADRAO.respXpa.join('\n'), respCli: PADRAO.respCli.join('\n'), exclBox: PADRAO.exclBox, excl: PADRAO.excl.join('\n'),
    preco: {
      dias: 1, jornada: 10,
      equipe: [
        { funcao: 'Técnico eletrotécnico', qtd: 2, horas: '', vh: 270, ativ: 'Ensaios elétricos, testes e coordenação das frentes', campo: true },
        { funcao: 'Auxiliar técnico', qtd: 4, horas: '', vh: 130, ativ: 'Limpeza, reaperto, lubrificação e apoio aos ensaios', campo: true },
        { funcao: 'Engenheiro eletricista (responsável técnico)', qtd: 1, horas: 8, vh: 410, ativ: 'Planejamento, análise dos resultados, relatório técnico e ART', campo: false },
      ],
      veiculos: 2, kmVeic: 50, vkm: VKM, refPessoas: '', refDias: '', vref: 70, oleoQtd: 0, vOleo: 650, outros: [],
      margem: 20, desconto: 0, exibir: 'global', descGlobal: '',
    },
    cond: { pagDias: 30, garantiaMeses: 12, validadeDias: 30 },
  };
}

/* ---------- cálculo ---------- */
function calc(p) {
  const P = p.preco || {}; const mg = 1 + (N(P.margem) || 0) / 100; const dias = N(P.dias) || 1, jor = N(P.jornada) || 8;
  const L = []; let campo = 0, hEquipe = 0, custo = 0;
  const add = (desc, qtd, un, v0) => { if (!qtd) return; custo += qtd * v0; L.push({ desc, qtd, un, vu: r2(v0 * mg) }); };
  (P.equipe || []).forEach(e => { const q = N(e.qtd) || 0; if (!q || !e.funcao) return; const h = N(e.horas) !== null ? N(e.horas) : dias * jor; const vh = N(e.vh) || 0;
    if (e.campo !== false) { campo += q; hEquipe += q * vh; }
    add(`${e.funcao} (${pad2(q)} × ${fN(h)} h)`, q * h, 'h', vh); });
  const kmT = (N(P.veiculos) || 0) * (N(P.kmVeic) || 0);
  add(`Deslocamento – ${pad2(P.veiculos)} veículo(s), ida e volta (${fN(N(P.kmVeic))} km por veículo)`, kmT, 'km', N(P.vkm) || 0);
  const rp = N(P.refPessoas) !== null ? N(P.refPessoas) : campo, rd = N(P.refDias) !== null ? N(P.refDias) : dias;
  if (N(P.vref)) add(`Refeição da equipe de campo (${pad2(rp)} pessoas × ${pad2(rd)} dia(s))`, rp * rd, 'refeições', N(P.vref));
  if (N(P.oleoQtd)) add('Análises do óleo isolante – físico-química e cromatografia', N(P.oleoQtd), 'amostras', N(P.vOleo) || 0);
  (P.outros || []).forEach(o => { const q = N(o.qtd) || 0; if (q && o.desc) add(o.desc, q, o.un || 'un', N(o.v) || 0); });
  L.forEach((l, i) => { l.item = '1.' + (i + 1); l.total = r2(l.qtd * l.vu); });
  const sub = r2(L.reduce((a, l) => a + l.total, 0)); const dpct = N(P.desconto) || 0; const desc = r2(sub * dpct / 100);
  return { L, sub, dpct, desc, total: r2(sub - desc), custo: r2(custo), horaEquipe: r2(hEquipe * mg), campo, dias, jor, oleo: N(P.oleoQtd) || 0, km: kmT, ref: rp * rd };
}

/* ---------- conteúdo (blocos neutros, renderizados em Word e PDF) ---------- */
const b = {
  band: (title, roman) => ({ t: 'band', title, roman }), kv: (rows) => ({ t: 'kv', rows }), p: (s, o) => ({ t: 'p', s, o: o || {} }),
  bul: (s) => ({ t: 'b', s }), h1: (s, pb) => ({ t: 'h1', s, pb }), h2: (s) => ({ t: 'h2', s }), sp: (h) => ({ t: 'sp', h: h || 120 }),
  grid: (cols, head, rows, align) => ({ t: 'grid', cols, head, rows, align }), box: (s) => ({ t: 'box', s }),
  etapas: (list, descs) => ({ t: 'etapas', list, descs }), sum: (items) => ({ t: 'sum', items }), hh: (items) => ({ t: 'hh', items }),
};
function saudacao(s) {
  const m = String(s || '').trim().match(/^(Sra?\.?)\s+(\S+)/i);
  if (m) return (/^sra/i.test(m[1]) ? 'Prezada Sra. ' : 'Prezado Sr. ') + m[2] + ',';
  const f = String(s || '').trim().split(/\s+/)[0]; return f ? `Prezado(a) ${f},` : 'Prezados Senhores,';
}
function ident(p) {
  const c = p.cli;
  return b.kv([['Proposta Nº', `${p.numero || '—'} · Revisão ${p.rev} · ${dataBR(p.data)}`], ['Cliente (contratante)', `**${c.cliente || 'a informar'}**`], ['Solicitante', c.solicitante || 'a informar'], ['Telefone', c.tel || 'a informar'], ['E-mail', c.email || 'a informar'], ['Local de execução', c.local || 'a informar'], ['Objeto', p.obj.objeto || '—'], ['Elaborado por', RESP], ['Validade', `${p.cond.validadeDias} dias`]]);
}
const assin = () => [b.p('Atenciosamente,', { before: 120, after: 40 }), b.p('**Eng. Magidiel Xavier Araújo**', { after: 0 }), b.p('Responsável técnico – CREA 5069271199', { after: 0, muted: true, size: 17 }), b.p('XPA Engenharia, Manutenção e Comércio Ltda.', { after: 120, muted: true, size: 17 })];
const objMin = (p) => (p.obj.objeto || 'serviços descritos nesta proposta').replace(/^./, ch => ch.toLowerCase());
function equipeTxt(p) { const e = (p.preco.equipe || []).filter(x => N(x.qtd) && x.campo !== false).map(x => `${pad2(x.qtd)} ${x.funcao.toLowerCase()}`); return e.length ? e.join(' + ') + ' em campo, sob responsabilidade do engenheiro eletricista' : 'Conforme item 3'; }

function blocosTecnica(p) {
  const B = []; const n = p.numero || '—';
  B.push(b.band('Proposta Técnica', 'I'), b.sp(140), ident(p), b.sp(140));
  B.push(b.p(saudacao(p.cli.solicitante)));
  B.push(b.p(`Atendendo à solicitação de V.Sa., apresentamos nossa Proposta Técnica para **${objMin(p)}**${p.cli.local ? ' em ' + p.cli.local : ''}. As condições comerciais constam da **Proposta Comercial Nº ${n}**, emitida em documento separado.`));
  B.push(b.p('A XPA Engenharia permanece à disposição para quaisquer esclarecimentos adicionais.'), ...assin());
  B.push(b.h2('Sumário'), b.sum([[1, 'Objeto, local e equipamentos'], [2, 'Escopo de serviços'], [3, 'Prazos e equipe técnica'], [4, 'Responsabilidades da XPA Engenharia'], [5, 'Responsabilidades da contratante'], [6, 'Exclusões']]));
  B.push(b.h1('Visão geral da proposta', true), b.kv([['Cliente', p.cli.cliente || 'a informar'], ['Objeto', p.obj.objeto || '—'], ['Prazo', [p.prazos.execucao, p.prazos.relatorio && 'Relatório: ' + p.prazos.relatorio.replace(/^./, c => c.toLowerCase())].filter(Boolean).join(' · ')], ['Equipe', equipeTxt(p)], ['Condições comerciais', `Conforme Proposta Comercial Nº ${n}`]]));
  B.push(b.sp(160), b.h2('Etapas do serviço'), b.etapas(p.etapas, p.etapasDesc));
  B.push(b.h1('1. Objeto, local e equipamentos', true), b.kv([['Objeto', p.obj.objeto || '—'], ['Local', p.cli.local || 'a informar'], ['Dados dos equipamentos', 'Dados de placa, classe de tensão e últimos relatórios – a serem informados pela contratante antes da mobilização']]));
  if ((p.equip || []).length) {
    const rows = []; let g = null;
    p.equip.forEach(e => { if (e.local && e.local !== g) { g = e.local; rows.push({ cells: [g, '', ''], style: { bold: true, fill: 'BG' } }); } rows.push(['', e.equipamento || '', pad2(e.qtd) || '']); });
    B.push(b.sp(120), b.grid([0.24, 0.65, 0.11], ['Local', 'Equipamento', 'Qtd.'], rows, ['l', 'l', 'c']));
  }
  B.push(b.h1('2. Escopo de serviços'));
  let k = 0; let temRel = false;
  (p.escopo || []).forEach(s => {
    k++; if (/relat[óo]rio/i.test(s.titulo || '')) temRel = true;
    B.push(b.h2(`2.${k} ${s.titulo || 'Serviços'}`));
    linhas(s.texto).forEach(l => { const c = l.replace(/^[➢•\-–*]\s*/, ''); if (/:$/.test(c)) B.push(b.p(`**${c}**`, { after: 40, keepNext: true })); else B.push(b.bul(c)); });
    if (/[óo]leo/i.test(s.titulo || '')) B.push(b.grid([0.7, 0.3], ['Ensaio', 'Norma'], [{ cells: ['Análise físico-química', ''], style: { bold: true, fill: 'BG' } }, ...OLEO_TAB, { cells: ['Análise cromatográfica (gases dissolvidos)', ''], style: { bold: true, fill: 'BG' } }, ['H2, O2, N2, CH4, CO, CO2, C2H4, C2H6 e C2H2', 'NBR 7070'], ['Interpretação dos resultados', 'NBR 7274']]), b.sp(80));
  });
  if (!temRel) { k++; B.push(b.h2(`2.${k} Relatório técnico`), b.p('Relatório no padrão XPA com os serviços executados, os resultados dos ensaios por equipamento, os laudos (quando houver), as não conformidades encontradas e as recomendações, acompanhado de ART.')); }
  const pz = p.prazos; const kvP = [['Integração', pz.integracao], ['Execução', pz.execucao], ['Laudos de laboratório', pz.laudos], ['Relatório técnico e ART', pz.relatorio], ['Mobilização', pz.mobilizacao]].filter(x => x[1]);
  B.push(b.h1('3. Prazos e equipe técnica'), b.kv(kvP), b.sp(120), b.h2('3.1 Equipe técnica'));
  B.push(b.grid([0.3, 0.08, 0.62], ['Função', 'Qtd.', 'Atividades'], (p.preco.equipe || []).filter(e => N(e.qtd) && e.funcao).map(e => [e.funcao, pad2(e.qtd), e.ativ || '']), ['l', 'c', 'l']));
  if (p.qualif) B.push(b.sp(60), b.p(p.qualif, { italic: true, muted: true, size: 17 }));
  B.push(b.h1('4. Responsabilidades da XPA Engenharia'), ...linhas(p.respXpa).map(b.bul));
  B.push(b.h1('5. Responsabilidades da contratante'), ...linhas(p.respCli).map(b.bul));
  B.push(b.h1('6. Exclusões')); if (p.exclBox) B.push(b.box(p.exclBox), b.sp(80));
  B.push(...linhas(p.excl).map(b.bul), b.sp(100), b.p(`As condições comerciais constam da Proposta Comercial Nº ${n}, que integra esta proposta técnica.`, { italic: true, muted: true, size: 17 }));
  return B;
}

function blocosComercial(p) {
  const B = []; const n = p.numero || '—'; const k = calc(p); const cd = p.cond; const tot = 'R$ ' + brl(k.total);
  B.push(b.band('Proposta Comercial', 'II'), b.sp(140), ident(p), b.sp(140));
  B.push(b.p(saudacao(p.cli.solicitante)));
  B.push(b.p(`Atendendo à solicitação de V.Sa., apresentamos nossa Proposta Comercial referente a **${objMin(p)}**, conforme o escopo da **Proposta Técnica Nº ${n}**, emitida em documento separado.${k.dpct ? ` Esta proposta contempla **desconto comercial de ${fN(k.dpct)}%**.` : ''}`));
  B.push(b.p('A XPA Engenharia permanece à disposição para quaisquer esclarecimentos adicionais.'), ...assin());
  B.push(b.h2('Sumário'), b.sum([[1, 'Preços'], [2, 'Tributos'], [3, 'Condições de pagamento'], [4, 'Garantia'], [5, 'Validade e reajuste'], [6, 'Limitação de responsabilidade'], [7, 'Condições de execução'], [8, 'Adiamento, descontinuidade ou cancelamento'], [9, 'Serviços adicionais'], [10, 'Documentação'], [11, 'Seguro de responsabilidade civil'], [12, 'Disposições gerais'], [13, 'Informações cadastrais'], [14, 'Aceite da proposta']]));
  B.push(b.sp(160), b.h2('Visão geral'), b.kv([['Escopo', `Conforme Proposta Técnica Nº ${n}`], ['Investimento', `**${tot}** (tributos inclusos)`], ['Pagamento', `${cd.pagDias} dias da emissão da nota fiscal, emitida após a conclusão dos serviços de campo`], ['Garantia', `${pad2(cd.garantiaMeses)} meses da conclusão dos serviços`], ['Validade', `${cd.validadeDias} dias`], ['Aceite', 'Pedido de compra enviado por e-mail']]));
  B.push(b.h1('1. Preços', true));
  const NAVY = { bold: true, fill: 'NAVY', color: 'FFFFFF' };
  if (p.preco.exibir === 'itens') {
    const rows = [{ cells: ['1', p.obj.objeto || 'Serviços', '', '', ''], style: { bold: true, fill: 'BG' } }, ...k.L.map(l => [l.item, l.desc, `${fN(l.qtd)} ${l.un}`, brl(l.vu), brl(l.total)])];
    if (k.dpct) rows.push({ cells: ['', 'Subtotal', '', '', brl(k.sub)], style: { bold: true } }, { cells: ['', `Desconto comercial (${fN(k.dpct)}%)`, '', '', '– ' + brl(k.desc)], style: { bold: true, color: '1D7A3E' } });
    rows.push({ cells: ['', 'TOTAL GERAL', '', '', tot], style: NAVY });
    B.push(b.grid([0.07, 0.5, 0.15, 0.13, 0.15], ['Item', 'Descrição', 'Qtd.', 'Unit. (R$)', 'Total (R$)'], rows, ['c', 'l', 'c', 'r', 'r']));
  } else {
    const rows = [['1', p.preco.descGlobal || `${p.obj.objeto || 'Serviços'}, conforme Proposta Técnica Nº ${n}`, '01 vb', brl(k.sub)]];
    if (k.dpct) rows.push({ cells: ['', `Desconto comercial (${fN(k.dpct)}%)`, '', '– ' + brl(k.desc)], style: { bold: true, color: '1D7A3E' } });
    rows.push({ cells: ['', 'TOTAL GERAL', '', tot], style: NAVY });
    B.push(b.grid([0.08, 0.62, 0.13, 0.17], ['Item', 'Descrição', 'Qtd.', 'Preço (R$)'], rows, ['c', 'l', 'c', 'r']));
  }
  B.push(b.sp(60), b.p(`Valor total: **${tot} (${extenso(k.total)})**.`, { after: 60 }));
  B.push(b.p(p.preco.exibir === 'itens' ? `Os itens 1.1 a 1.${k.L.length} compõem o preço global e não são faturados ou excluídos isoladamente sem revisão da proposta.` : `Preço global para execução em ${pad2(k.dias)} dia(s) de campo, com jornada de ${fN(k.jor)} horas.`, { italic: true, muted: true, size: 17 }));
  const ad = []; if (k.horaEquipe) ad.push(['A1', 'Hora adicional ou de espera da equipe de campo completa, por atraso na liberação ou extensão da jornada não imputável à XPA', 'hora', brl(k.horaEquipe)]);
  ad.push([`A${ad.length + 1}`, 'Cancelamento ou adiamento com equipe mobilizada', '–', 'Conforme item 8'], [`A${ad.length + 2}`, 'Itens fora do escopo', '–', 'Sob orçamento']);
  B.push(b.h2('1.1 Valores adicionais (somente se ocorrerem)'), b.grid([0.08, 0.62, 0.13, 0.17], ['Item', 'Descrição', 'Unidade', 'Preço (R$)'], ad, ['c', 'l', 'c', 'r']), b.sp(80));
  const inc = ['mão de obra', 'ferramentas e instrumentos calibrados', 'EPIs', 'materiais de limpeza e lubrificação']; if (k.oleo) inc.push('análises de óleo'); if (k.km) inc.push('deslocamento'); if (k.ref) inc.push('alimentação'); inc.push('relatório técnico', 'ART e tributos');
  B.push(b.bul(`**Estão incluídos:** ${inc.slice(0, -1).join(', ')}, ${inc[inc.length - 1]}.`), b.bul(`**Não estão considerados:** itens listados nas exclusões da Proposta Técnica Nº ${n}.`));
  B.push(b.h1('2. Tributos'), b.p('Os preços incluem os tributos incidentes sobre a prestação de serviços (ISS, PIS, COFINS, IRPJ e CSLL). As retenções na fonte serão aplicadas conforme a legislação vigente.'), b.p('Em caso de criação, extinção ou alteração de tributos, alíquotas ou encargos que incidam diretamente sobre o preço, inclusive os decorrentes da Reforma Tributária (CBS e IBS), a XPA Engenharia poderá solicitar a revisão da proposta.'));
  B.push(b.h1('3. Condições de pagamento'), ...['Faturamento integral no primeiro dia útil após a conclusão dos serviços de campo;', `Pagamento em **${cd.pagDias} dias** da emissão da nota fiscal, por depósito em conta corrente;`, 'O faturamento e o pagamento independem da entrega dos laudos e do relatório técnico;', 'O prazo de pagamento não é prorrogado por cadastro em portal, aprovação interna ou trâmites administrativos da contratante;', 'Atrasos implicam multa moratória de 5% sobre o valor em atraso, juros de 1% ao mês pro rata die e correção pela taxa CDI até a efetiva quitação;', 'Em caso de atraso, a XPA Engenharia poderá suspender suas obrigações contratuais, inclusive a entrega do relatório, sem direito a indenização ou penalidade por parte da contratante;', 'A cobrança será efetuada via bancária. Outras formas de pagamento dependem de aprovação prévia.'].map(b.bul));
  B.push(b.h1('4. Garantia'), b.p(`${pad2(cd.garantiaMeses)} meses a contar da conclusão dos serviços, limitada à reexecução dos serviços e à substituição dos materiais fornecidos pela XPA Engenharia, quando a falha for comprovadamente imputável à XPA. A garantia está condicionada à operação dos equipamentos dentro de suas características nominais e à adimplência da contratante.`), b.p('Não estão cobertos:', { after: 40 }), ...['Falhas preexistentes ou ocultas e defeitos em pontos dos equipamentos fora do escopo;', 'Sobrecargas, surtos e descargas atmosféricas;', 'Operação fora das características nominais;', 'Intervenções de terceiros nos equipamentos.'].map(b.bul));
  B.push(b.h1('5. Validade e reajuste'), b.bul(`Validade de ${cd.validadeDias} dias a contar do envio desta proposta;`), b.bul('Sem reajuste dentro do período de validade;'), b.bul('Serviços executados após 90 dias da aprovação poderão ter os preços revisados.'));
  B.push(b.h1('6. Limitação de responsabilidade'), b.p('A responsabilidade civil da XPA Engenharia e de seus prepostos, por danos diretos ou indiretos decorrentes dos serviços, fica limitada a 0,5% do valor do contrato. Ficam excluídos:', { after: 40 }), ...['Lucros cessantes, perdas de produção, paradas e danos indiretos;', 'Danos causados por dolo ou culpa da contratante ou de terceiros;', 'Condições preexistentes nos equipamentos;', 'Danos por ação paulatina de temperatura, umidade, infiltração, vibração, poluição, contaminação ou vazamento.'].map(b.bul));
  B.push(b.h1('7. Condições de execução'), ...[`**Liberação:** as instalações devem estar desligadas e liberadas na data e hora programadas. Atrasos são cobrados ${k.horaEquipe ? 'conforme o item A1' : 'como horas adicionais'} e podem afetar o prazo;`, '**Clima:** serviços em equipamentos ao tempo só são realizados sem chuva e com umidade adequada;', '**Segurança:** a equipe exercerá o direito de recusa sempre que as condições não atenderem à NR-10 ou à NR-35;', '**Condições encontradas:** reparos e substituições identificados em campo dependem de orçamento complementar aprovado por escrito;', '**Aceite dos serviços:** considera-se aceito o relatório sem manifestação da contratante em 5 dias úteis após a entrega.'].map(b.bul));
  B.push(b.h1('8. Adiamento, descontinuidade ou cancelamento'), ...['**Mão de obra:** cancelamento e/ou adiamento por iniciativa da contratante deve ser comunicado com antecedência mínima de **48 horas** antes do início das atividades;', '**Com equipe mobilizada:** serão cobrados os custos de mobilização (deslocamentos, hospedagem e alimentação) e as horas da equipe pelos valores de homem-hora abaixo;', '**Materiais, peças e componentes:** despesas e custos de aquisição repassados à contratante;', '**Remobilização:** custos de transporte, horas e despesas decorrentes repassados à contratante.'].map(b.bul), b.sp(60), b.hh([...HH.map(([f, v]) => [f, `R$ ${brl(v)}/h`]), ['Km por veículo', `R$ ${brl(VKM)}/km`]]));
  B.push(b.h1('9. Serviços adicionais'), b.p('Todo serviço não contemplado nesta proposta, oriundo de correções, modificações de projeto ou alterações de qualquer natureza solicitadas pela contratante, será objeto de aditivo, com custos complementares de horas de trabalho e despesas decorrentes.'));
  B.push(b.h1('10. Documentação'), b.bul('Os profissionais possuem os exames do PCMSO: audiometria, hemograma completo com plaquetas, raio X do tórax, eletrocardiograma, eletroencefalograma, acuidade visual e consulta médica. Outros exames solicitados terão os custos repassados;'), b.bul('Está contemplada a apresentação de cópia simples da documentação dos funcionários e da empresa. Cópias autenticadas terão os custos repassados.'));
  B.push(b.h1('11. Seguro de responsabilidade civil'), b.kv([['Seguradora', 'Allianz Seguros'], ['Ramo', '51 – RC Geral'], ['Segurado', 'XPA Engenharia, Manutenção e Comércio Ltda. – CNPJ 51.927.452/0001-54'], ['Vigência', '22/01/2026 a 22/01/2027'], ['Apólice', 'Disponível mediante solicitação']]));
  B.push(b.h1('12. Disposições gerais')); if (k.oleo) B.push(b.bul('As análises de óleo são realizadas por laboratório parceiro, sob responsabilidade técnica da XPA Engenharia;'));
  B.push(b.bul('Esta proposta prevalece sobre as condições gerais de compra da contratante naquilo em que divergirem;'), b.bul('**Atenção:** a XPA Engenharia não altera dados bancários por e-mail. Em caso de dúvida, confirme pelo telefone (11) 2987-4200;'), b.bul('Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer questões decorrentes desta proposta.'));
  B.push(b.h1('13. Informações cadastrais'), b.kv([['Razão social', 'XPA ENGENHARIA, MANUTENÇÃO E COMÉRCIO LTDA.'], ['Nome fantasia', 'XPA Engenharia'], ['CNPJ', '51.927.452/0001-54'], ['Inscrição estadual', '125.790.664.114'], ['CCM', '7.816.863-5'], ['Endereço', 'Rua Aragão, 538 – Vila Mazzei – São Paulo/SP – CEP 02308-000'], ['Telefones', '(11) 2987-4200 · (11) 99609-4663'], ['E-mail / site', 'comercial@xpaengenharia.com.br · www.xpaengenharia.com.br'], ['Itaú Unibanco', 'Agência 8093 · Conta corrente 99504-4'], ['Santander', 'Agência 0260 · Conta corrente 13007789-5']]));
  B.push(b.h1('14. Aceite da proposta'), b.p(`O aceite se dá pelo pedido de compra emitido pela contratante e enviado por e-mail a comercial@xpaengenharia.com.br, referenciando as Propostas Técnica e Comercial Nº ${n}. O envio do pedido implica concordância com o escopo, as exclusões e as condições aqui descritas. A mobilização será programada após o recebimento do pedido.`));
  return B;
}
const docMeta = (p, kind) => ({ kind, num: p.numero || 'rascunho', rev: p.rev, date: dataBR(p.data), cliente: p.cli.cliente || 'a informar', solicitante: p.cli.solicitante || 'a informar', tel: p.cli.tel || 'a informar', local: p.cli.local || 'a informar', titulo1: p.obj.titulo1 || '', titulo2: p.obj.titulo2 || '', validade: `${p.cond.validadeDias} dias`, short: `${(p.obj.titulo1 + ' ' + p.obj.titulo2).trim()} · ${p.cli.cliente || ''}` });
const nomeArq = (p, kind, ext) => `${p.numero || 'rascunho'}_Rev${p.rev}_Proposta_${kind === 'Proposta Técnica' ? 'Tecnica' : 'Comercial'}_${slug2(p.obj.titulo1 + ' ' + p.obj.titulo2)}_${slug2(p.cli.cliente)}.${ext}`;
const slug2 = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

/* ======================= RENDERIZADOR WORD (docx) ======================= */
function wordDoc(D, meta, blocks, IMGS) {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Header, Footer, AlignmentType, WidthType, ShadingType, BorderStyle, LevelFormat, PageNumber, TabStopType, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, VerticalAlign, TableLayoutType, HeightRule, LineRuleType } = D;
  const NAVY = '0A1733', BAND = '16264D', NAVY2 = '13244A', GOLD = 'F4B400', LIGHT = 'B8C2D6', LINE = 'D5DAE2', BG = 'F3F4F6', INK = '1B2333', MUTED = '6B7385', GOLDTXT = 'B58600';
  const FILL = { BG, NAVY }; const FONT = 'Arial'; const PAGE_W = 11906, PAGE_H = 16838, MX = 1020, CW = PAGE_W - 2 * MX;
  const logo = (branco, w) => new ImageRun({ type: 'png', data: branco ? IMGS.logoBranco : IMGS.logoCor, transformation: { width: w, height: Math.round(w / 2.6) } });
  const r = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 19, color: o.color || INK, bold: o.bold, italics: o.italics, characterSpacing: o.cs });
  const rich = (s, o = {}) => String(s).split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map(x => x.startsWith('**') ? r(x.slice(2, -2), { ...o, bold: true }) : r(x, o));
  const P = (runs, o = {}) => new Paragraph({ children: runs, alignment: o.align || AlignmentType.JUSTIFIED, spacing: { before: o.before ?? 0, after: o.after ?? 80, line: o.line || 276, lineRule: LineRuleType.AUTO }, keepNext: o.keepNext });
  const nb = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }; const noB = { top: nb, bottom: nb, left: nb, right: nb };
  const lb = { style: BorderStyle.SINGLE, size: 4, color: LINE }; const linB = { top: lb, bottom: lb, left: lb, right: lb };
  const cell = (children, w, o = {}) => new TableCell({ children: Array.isArray(children) ? children : [children], width: { size: w, type: WidthType.DXA }, shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined, borders: o.borders || linB, margins: o.margins || { top: 40, bottom: 40, left: 110, right: 110 }, verticalAlign: o.valign || VerticalAlign.TOP });
  const cp = (s, o = {}) => new Paragraph({ children: rich(s, o), alignment: o.align || AlignmentType.LEFT, spacing: { before: 0, after: 0, line: 252 } });
  const table = (cols, rows) => new Table({ width: { size: cols.reduce((a, x) => a + x, 0), type: WidthType.DXA }, columnWidths: cols, rows, layout: TableLayoutType.FIXED });
  const widths = (fr) => { const w = fr.map(f => Math.round(f * CW)); w[w.length - 1] += CW - w.reduce((a, x) => a + x, 0); return w; };
  const AL = { l: AlignmentType.LEFT, c: AlignmentType.CENTER, r: AlignmentType.RIGHT };
  const out = [];
  for (const k of blocks) {
    if (k.t === 'band') { const w1 = 2600, w3 = 900, w2 = CW - w1 - w3; out.push(table([w1, w2, w3], [new TableRow({ height: { value: 620, rule: HeightRule.ATLEAST }, children: [cell(new Paragraph({ children: [logo(true, 118)], spacing: { after: 0 } }), w1, { fill: NAVY, borders: noB, valign: VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 200, right: 80 } }), cell(new Paragraph({ children: [r(k.title, { bold: true, color: 'FFFFFF', size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 0 } }), w2, { fill: NAVY, borders: noB, valign: VerticalAlign.CENTER }), cell(new Paragraph({ children: [r(k.roman, { bold: true, color: NAVY, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 0 } }), w3, { fill: GOLD, borders: noB, valign: VerticalAlign.CENTER })] })])); }
    else if (k.t === 'kv') { const lw = 3200, vw = CW - lw; out.push(table([lw, vw], k.rows.map(([a, v]) => new TableRow({ cantSplit: true, children: [cell(cp(a, { bold: true, size: 17, color: NAVY }), lw, { fill: BG }), cell(cp(v || '', { size: 17 }), vw)] })))); }
    else if (k.t === 'p') { const o = k.o; out.push(P(rich(k.s, { italics: o.italic, color: o.muted ? MUTED : undefined, size: o.size }), { before: o.before, after: o.after, keepNext: o.keepNext })); }
    else if (k.t === 'b') out.push(new Paragraph({ children: rich(k.s), numbering: { reference: 'gold', level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { before: 0, after: 60, line: 276 } }));
    else if (k.t === 'h1') out.push(new Paragraph({ pageBreakBefore: !!k.pb, children: [r(k.s, { bold: true, color: 'FFFFFF', size: 21 })], shading: { type: ShadingType.CLEAR, fill: BAND, color: 'auto' }, border: { top: { style: BorderStyle.SINGLE, size: 1, color: BAND, space: 4 }, bottom: { style: BorderStyle.SINGLE, size: 1, color: BAND, space: 4 }, left: { style: BorderStyle.SINGLE, size: 1, color: BAND, space: 6 }, right: { style: BorderStyle.SINGLE, size: 1, color: BAND, space: 6 } }, spacing: { before: 220, after: 110 }, keepNext: true, keepLines: true, indent: { left: 140, right: 140 } }));
    else if (k.t === 'h2') out.push(P([r(k.s, { bold: true, color: NAVY })], { before: 120, after: 80, keepNext: true, align: AlignmentType.LEFT }));
    else if (k.t === 'sp') out.push(P([r('')], { after: k.h, line: 200 }));
    else if (k.t === 'box') { const bb = { style: BorderStyle.SINGLE, size: 6, color: GOLD }; out.push(table([CW], [new TableRow({ children: [cell(new Paragraph({ children: rich(k.s, { size: 18 }), alignment: AlignmentType.JUSTIFIED, spacing: { after: 0, line: 276 } }), CW, { fill: 'FFF7E0', borders: { top: bb, bottom: bb, left: bb, right: bb }, margins: { top: 100, bottom: 100, left: 160, right: 160 } })] })])); }
    else if (k.t === 'sum') { const half = Math.ceil(k.items.length / 2), wn = 500, wg = 300, wt = (CW - 2 * wn - wg) / 2; const bb = { top: nb, left: nb, right: nb, bottom: lb }; const rows = [];
      for (let i = 0; i < half; i++) { const mk = (it) => it ? [cell(cp(String(it[0]), { bold: true, color: GOLDTXT, size: 18 }), wn, { borders: bb }), cell(cp(it[1], { size: 18 }), wt, { borders: bb })] : [cell(cp(''), wn, { borders: noB }), cell(cp(''), wt, { borders: noB })]; rows.push(new TableRow({ children: [...mk(k.items[2 * i]), cell(cp(''), wg, { borders: noB }), ...mk(k.items[2 * i + 1])] })); }
      out.push(table([wn, wt, wg, wn, wt], rows)); }
    else if (k.t === 'etapas') { const sh = ['5B7DC0', '3F63AB', '2C4E93', '1D3A7A', NAVY]; const n = k.list.length, gap = 80, w = Math.floor((CW - gap * (n - 1)) / n); const cols = [], c1 = [], c2 = []; const z = { top: 0, bottom: 0, left: 0, right: 0 };
      k.list.forEach((t, i) => { cols.push(w); c1.push(cell([new Paragraph({ children: [r(String(i + 1), { bold: true, color: GOLD, size: 22 })], alignment: AlignmentType.CENTER, spacing: { after: 40 } }), new Paragraph({ children: [r(t, { bold: true, color: 'FFFFFF', size: 16 })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 240 } })], w, { fill: sh[i % 5], borders: noB, valign: VerticalAlign.CENTER, margins: { top: 70, bottom: 70, left: 60, right: 60 } }));
        c2.push(cell(new Paragraph({ children: [r((k.descs || [])[i] || '', { size: 15, color: MUTED })], alignment: AlignmentType.CENTER, spacing: { after: 0, line: 240 } }), w, { borders: { top: { style: BorderStyle.SINGLE, size: 12, color: GOLD }, bottom: nb, left: nb, right: nb }, margins: { top: 80, bottom: 40, left: 40, right: 40 } }));
        if (i < n - 1) { cols.push(gap); c1.push(cell(cp(''), gap, { borders: noB, margins: z })); c2.push(cell(cp(''), gap, { borders: noB, margins: z })); } });
      out.push(new Table({ width: { size: cols.reduce((a, x) => a + x, 0), type: WidthType.DXA }, columnWidths: cols, layout: TableLayoutType.FIXED, rows: [new TableRow({ children: c1, height: { value: 760, rule: HeightRule.ATLEAST } }), new TableRow({ children: c2 })] })); }
    else if (k.t === 'grid') { const cols = widths(k.cols); const al = (i) => AL[(k.align || [])[i]] || AlignmentType.LEFT;
      const hdr = new TableRow({ tableHeader: true, children: k.head.map((h, i) => cell(cp(h, { bold: true, color: 'FFFFFF', size: 17, align: al(i) }), cols[i], { fill: NAVY2 })) });
      const body = k.rows.map(row => { const st = row.style || {}; const cs = row.cells || row; return new TableRow({ cantSplit: true, children: cs.map((c, i) => cell(cp(String(c), { size: 17, bold: st.bold, color: st.color, align: al(i) }), cols[i], { fill: FILL[st.fill] || st.fill })) }); });
      out.push(table(cols, [hdr, ...body])); }
    else if (k.t === 'hh') { const w = Math.floor(CW / k.items.length); out.push(table(k.items.map(() => w), [new TableRow({ cantSplit: true, children: k.items.map(([a, v]) => cell([cp(a, { bold: true, size: 16, color: 'FFFFFF', align: AlignmentType.CENTER }), cp(v, { size: 18, bold: true, color: GOLD, align: AlignmentType.CENTER })], w, { fill: NAVY2 })) })])); }
  }
  // capa, cabeçalho, rodapé, contracapa
  const bg = (data, type) => new ImageRun({ type, data, transformation: { width: 794, height: 1123 }, floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 }, verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 }, behindDocument: true, allowOverlap: true, zIndex: 0 } });
  const lw = 2600, vw = CW - lw - 600; const cb = { top: nb, left: nb, right: nb, bottom: { style: BorderStyle.SINGLE, size: 4, color: '2A3A5E' } };
  const capaRows = [['CLIENTE', meta.cliente], ['LOCAL DE EXECUÇÃO', meta.local], ['SOLICITANTE', meta.solicitante], ['TELEFONE', meta.tel], ['DATA', meta.date], ['REVISÃO', meta.rev], ['VALIDADE', meta.validade]].map(([a, v]) => new TableRow({ children: [cell(cp(a, { bold: true, size: 14, color: GOLD, cs: 20 }), lw, { borders: cb, margins: { top: 90, bottom: 90, left: 0, right: 80 } }), cell(cp(v, { size: 18, color: 'FFFFFF' }), vw, { borders: cb, margins: { top: 90, bottom: 90, left: 80, right: 80 } })] }));
  const L = AlignmentType.LEFT, C = AlignmentType.CENTER;
  const capa = [new Paragraph({ children: [bg(IMGS.cover, 'jpg')], spacing: { after: 0 } }), new Paragraph({ children: [logo(true, 270)], spacing: { before: 4300, after: 200 } }), P([r('▬▬▬', { color: GOLD, size: 20 })], { after: 200, align: L }), P([r(`${meta.kind.toUpperCase()} · Nº ${meta.num} · REV. ${meta.rev}`, { size: 17, color: LIGHT, cs: 20 })], { after: 120, align: L }), P([r(meta.titulo1, { bold: true, size: 44, color: 'FFFFFF' })], { after: 0, align: L, line: 264 }), P([r(meta.titulo2, { bold: true, size: 44, color: 'FFFFFF' })], { after: 360, align: L, line: 264 }), table([lw, vw], capaRows), new Paragraph({ children: [r('Responsável técnico: Eng. Magidiel Xavier Araújo · CREA 5069271199', { size: 14, color: LIGHT }), new TextRun({ text: '\t', font: FONT }), r('www.xpaengenharia.com.br · São Paulo · SP', { size: 14, color: GOLD, bold: true })], tabStops: [{ type: TabStopType.RIGHT, position: CW }], spacing: { before: 2600, after: 0 } })];
  const blk = (a, v) => [P([r(a, { bold: true, size: 14, color: GOLD, cs: 40 })], { align: C, after: 60 }), P([r(v, { size: 22, color: 'FFFFFF' })], { align: C, after: 380 })];
  const contra = [new Paragraph({ children: [bg(IMGS.back, 'png')], spacing: { after: 0 } }), new Paragraph({ children: [logo(true, 260)], alignment: C, spacing: { before: 3000, after: 200 } }), P([r('▬▬', { color: GOLD, size: 20 })], { align: C, after: 600 }), ...blk('TELEFONES', '(11) 2987-4200 · (11) 99609-4663 · (11) 91234-4920'), ...blk('E-MAIL', 'comercial@xpaengenharia.com.br'), ...blk('SITE', 'www.xpaengenharia.com.br'), ...blk('ENDEREÇO', 'Rua Aragão, 538 · Vila Mazzei · São Paulo/SP'), P([r('Segurança, confiabilidade e excelência em soluções elétricas.', { italics: true, size: 18, color: LIGHT })], { align: C, before: 200, after: 80 }), P([r('XPA Engenharia, Manutenção e Comércio Ltda.', { size: 14, color: LIGHT })], { align: C })];
  const header = new Header({ children: [new Paragraph({ children: [logo(false, 68), new TextRun({ text: '\t', font: FONT }), r(`${meta.kind.toUpperCase()} · Nº ${meta.num} · REV. ${meta.rev}`, { size: 13, color: MUTED, cs: 10 })], tabStops: [{ type: TabStopType.RIGHT, position: CW }], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } }, spacing: { after: 0 } })] });
  const w1 = 2400, w2 = 3500, w4 = 1100, w3 = CW - w1 - w2 - w4; const pm = { top: 90, bottom: 90, left: 140, right: 140 }; const tb = { top: { style: BorderStyle.SINGLE, size: 12, color: GOLD }, bottom: nb, left: nb, right: nb };
  const footer = new Footer({ children: [new Paragraph({ children: [r('Responsável técnico: Eng. Magidiel Xavier Araújo  ·  CREA 5069271199', { size: 13, color: '8A93A6' }), new TextRun({ text: '\t', font: FONT }), r(`${meta.kind} · ${meta.short}`, { size: 13, color: '8A93A6' })], tabStops: [{ type: TabStopType.RIGHT, position: CW }], spacing: { after: 80 } }),
    table([w1, w2, w3, w4], [new TableRow({ children: [cell(new Paragraph({ children: [logo(true, 92)], spacing: { after: 0 } }), w1, { fill: NAVY, borders: tb, valign: VerticalAlign.CENTER, margins: pm }), cell([cp('www.xpaengenharia.com.br', { size: 13, color: LIGHT }), cp('comercial@xpaengenharia.com.br  ·  (11) 2987-4200', { size: 13, color: LIGHT })], w2, { fill: NAVY, borders: tb, valign: VerticalAlign.CENTER, margins: pm }), cell([cp(`${meta.kind.toUpperCase()} Nº ${meta.num}`, { size: 13, color: LIGHT, align: AlignmentType.RIGHT }), cp(`Revisão ${meta.rev} · ${meta.date}`, { size: 13, color: LIGHT, align: AlignmentType.RIGHT })], w3, { fill: NAVY, borders: tb, valign: VerticalAlign.CENTER, margins: pm }), cell(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, bold: true, size: 17, color: NAVY }), r(' / ', { bold: true, size: 17, color: NAVY }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, bold: true, size: 17, color: NAVY })] }), w4, { fill: GOLD, borders: tb, valign: VerticalAlign.CENTER, margins: pm })] })])] });
  const empty = { headers: { default: new Header({ children: [new Paragraph('')] }) }, footers: { default: new Footer({ children: [new Paragraph('')] }) } };
  const pg = (m) => ({ page: { size: { width: PAGE_W, height: PAGE_H }, margin: m } });
  return new Document({ creator: 'XPA Engenharia', title: `${meta.kind} Nº ${meta.num} – Rev. ${meta.rev}`, styles: { default: { document: { run: { font: FONT, size: 19, color: INK } } } },
    numbering: { config: [{ reference: 'gold', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { run: { color: GOLD, bold: true }, paragraph: { indent: { left: 360, hanging: 240 } } } }] }] },
    sections: [{ properties: pg({ top: 900, bottom: 600, left: MX, right: MX }), ...empty, children: capa }, { properties: pg({ top: 1150, bottom: 1500, left: MX, right: MX, header: 450, footer: 300 }), headers: { default: header }, footers: { default: footer }, children: out }, { properties: pg({ top: 900, bottom: 600, left: MX, right: MX }), ...empty, children: contra }] });
}

/* ======================= RENDERIZADOR PDF (jsPDF + kit do app) ======================= */
async function pdfDoc(p, kind) {
  const meta = docMeta(p, kind);
  const h = { numero: `${meta.num} · REV. ${meta.rev}`, resp: RESP, cliente: meta.cliente };
  const K = pdfKit(h, { rotulo: kind.toUpperCase(), semSumario: true, contraTexto: 'Dúvidas sobre esta proposta? Fale com a XPA Engenharia.' });
  const { doc, W, M } = K; const CWm = W - 2 * M; const INK = [27, 35, 51], MUT = [107, 115, 133], NAVY = [10, 23, 51], NAVY2 = [19, 36, 74], GOLD = [244, 180, 0], BGc = [243, 244, 246];
  const FILLC = { BG: BGc, NAVY };
  const hex = (s) => [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  const plain = (s) => String(s || '').replace(/\*\*/g, '');
  // texto com **negrito** quebrado em linhas
  const layout = (s, width, size, italic) => { const segs = []; String(s).split(/(\*\*[^*]+\*\*)/g).filter(Boolean).forEach(x => { const bold = x.startsWith('**'); (bold ? x.slice(2, -2) : x).split(/(\s+)/).filter(z => z !== '').forEach(w => segs.push({ w, bold })); });
    const lines = [[]]; let cur = 0; doc.setFontSize(size);
    for (const sg of segs) { doc.setFont('helvetica', sg.bold ? 'bold' : (italic ? 'italic' : 'normal')); const ww = doc.getTextWidth(sg.w); const sp = /^\s+$/.test(sg.w);
      if (!sp && cur + ww > width && lines[lines.length - 1].length) { lines.push([]); cur = 0; }
      if (sp && !lines[lines.length - 1].length) continue; lines[lines.length - 1].push({ ...sg, ww }); cur += ww; }
    return lines; };
  const drawLines = (lines, x, y, size, color, italic, lh) => { for (const ln of lines) { y = K.ensure(y, lh); let cx = x; for (const sg of ln) { doc.setFont('helvetica', sg.bold ? 'bold' : (italic ? 'italic' : 'normal')); doc.setFontSize(size); doc.setTextColor(...color); doc.text(sg.w, cx, y + 1); cx += sg.ww; } y += lh; } doc.setTextColor(...INK); return y; };
  const para = (s, y, o = {}) => { const size = o.size ? o.size / 2 : 9; const lh = size * 0.46; const ind = o.indent || 0; y = drawLines(layout(s, CWm - ind, size, o.italic), M + ind, y, size, o.muted ? MUT : INK, o.italic, lh); return y + (o.after !== undefined ? o.after / 40 : 2); };
  const tbl = (opts) => K.tbl(opts);
  let y = K.capa(meta.titulo1, meta.titulo2, [['CLIENTE', meta.cliente], ['LOCAL DE EXECUÇÃO', meta.local], ['SOLICITANTE', meta.solicitante], ['TELEFONE', meta.tel], ['DATA', meta.date], ['REVISÃO', meta.rev], ['VALIDADE', meta.validade]]);
  const blocks = kind === 'Proposta Técnica' ? blocosTecnica(p) : blocosComercial(p);
  for (const k of blocks) {
    if (k.t === 'band') { y = K.ensure(y, 18); doc.setFillColor(...NAVY); doc.rect(M, y, CWm, 13, 'F'); try { doc.addImage(LOGO_BRANCO, 'PNG', M + 3, y + 2.5, 20.8, 8); } catch (e) {} doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255); doc.text(k.title, M + CWm / 2, y + 8.5, { align: 'center' }); doc.setFillColor(...GOLD); doc.rect(M + CWm - 16, y, 16, 13, 'F'); doc.setTextColor(...NAVY); doc.text(k.roman, M + CWm - 8, y + 8.5, { align: 'center' }); doc.setTextColor(...INK); y += 16; }
    else if (k.t === 'kv') { y = tbl({ startY: y, showHead: 'never', body: k.rows.map(([a, v]) => [{ content: a, styles: { fontStyle: 'bold', textColor: NAVY, fillColor: BGc, cellWidth: CWm * 0.32 } }, { content: plain(v), styles: { fontStyle: /^\*\*.*\*\*$/.test(v || '') ? 'bold' : 'normal' } }]) }); }
    else if (k.t === 'p') { if (k.o.before) y += k.o.before / 40; if (k.o.keepNext) y = K.ensure(y, 14); y = para(k.s, y, k.o); }
    else if (k.t === 'b') { y = K.ensure(y, 6); doc.setFillColor(...GOLD); doc.circle(M + 1.5, y, 0.8, 'F'); y = para(k.s, y, { indent: 4, after: 40 }); }
    else if (k.t === 'h1') { if (k.pb) { doc.addPage(); y = 22; } else y = K.ensure(y + 2, 22); y = K.band(k.s, y); }
    else if (k.t === 'h2') { y = K.ensure(y + 1, 14); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...NAVY); doc.text(k.s, M, y + 2); doc.setTextColor(...INK); y += 7; }
    else if (k.t === 'sp') y += k.h / 45;
    else if (k.t === 'box') { const lines = layout(k.s, CWm - 8, 9, false); const hb = lines.length * 4.2 + 5; y = K.ensure(y, hb + 2); doc.setFillColor(255, 247, 224); doc.setDrawColor(...GOLD); doc.setLineWidth(0.4); doc.rect(M, y, CWm, hb, 'FD'); drawLines(lines, M + 4, y + 3.5, 9, INK, false, 4.2); y += hb + 3; }
    else if (k.t === 'sum') { const half = Math.ceil(k.items.length / 2), cw = (CWm - 6) / 2; y = K.ensure(y, half * 7 + 2); for (let i = 0; i < k.items.length; i++) { const col = i % 2, row = Math.floor(i / 2), x = M + col * (cw + 6), yy = y + row * 7; doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(181, 134, 0); doc.text(String(k.items[i][0]), x + 1, yy + 4); doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK); doc.text(k.items[i][1], x + 9, yy + 4); doc.setDrawColor(213, 218, 226); doc.setLineWidth(0.2); doc.line(x, yy + 6, x + cw, yy + 6); } y += half * 7 + 3; }
    else if (k.t === 'etapas') { const n = k.list.length, gap = 1.5, w = (CWm - gap * (n - 1)) / n; const sh = ['5B7DC0', '3F63AB', '2C4E93', '1D3A7A', '0A1733']; y = K.ensure(y, 40);
      k.list.forEach((t, i) => { const x = M + i * (w + gap); doc.setFillColor(...hex(sh[i % 5])); doc.rect(x, y, w, 17, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...GOLD); doc.text(String(i + 1), x + w / 2, y + 5.5, { align: 'center' }); doc.setFontSize(7.5); doc.setTextColor(255); doc.text(doc.splitTextToSize(t, w - 3).slice(0, 3), x + w / 2, y + 9.5, { align: 'center' });
        doc.setFillColor(...GOLD); doc.rect(x, y + 19, w, 0.6, 'F'); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(...MUT); doc.text(doc.splitTextToSize((k.descs || [])[i] || '', w - 2).slice(0, 5), x + w / 2, y + 23, { align: 'center' }); });
      doc.setTextColor(...INK); y += 40; }
    else if (k.t === 'grid') { const al = { l: 'left', c: 'center', r: 'right' }; const colStyles = {}; k.cols.forEach((f, i) => { colStyles[i] = { cellWidth: f * CWm, halign: al[(k.align || [])[i]] || 'left' }; });
      y = tbl({ startY: y, head: [k.head], columnStyles: colStyles, body: k.rows.map(row => { const st = row.style || {}; const cs = row.cells || row; return cs.map(c => ({ content: plain(c), styles: Object.assign({}, st.bold ? { fontStyle: 'bold' } : {}, st.fill ? { fillColor: FILLC[st.fill] || hex(st.fill) } : {}, st.color ? { textColor: hex(st.color) } : {}) })); }), didParseCell: (d) => { if (d.section === 'head') d.cell.styles.halign = colStyles[d.column.index].halign; } }); }
    else if (k.t === 'hh') { const n = k.items.length, w = CWm / n; y = K.ensure(y, 14); k.items.forEach(([a, v], i) => { const x = M + i * w; doc.setFillColor(...NAVY2); doc.rect(x, y, w - 0.4, 11, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(255); doc.text(a, x + w / 2, y + 4.2, { align: 'center' }); doc.setFontSize(8.5); doc.setTextColor(...GOLD); doc.text(v, x + w / 2, y + 8.8, { align: 'center' }); }); doc.setTextColor(...INK); y += 14; }
  }
  return K;
}

/* ======================= LEITURA DE ARQUIVO (.docx local) ======================= */
async function zipEntry(buf, name) {
  const dv = new DataView(buf); let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Arquivo .docx inválido.');
  const n = dv.getUint16(eocd + 10, true); let pos = dv.getUint32(eocd + 16, true); const dec = new TextDecoder();
  for (let i = 0; i < n; i++) {
    const method = dv.getUint16(pos + 10, true), csize = dv.getUint32(pos + 20, true), fnl = dv.getUint16(pos + 28, true), exl = dv.getUint16(pos + 30, true), cml = dv.getUint16(pos + 32, true), lho = dv.getUint32(pos + 42, true);
    const fname = dec.decode(new Uint8Array(buf, pos + 46, fnl));
    if (fname === name) { const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true); const data = new Uint8Array(buf, start, csize);
      if (method === 0) return dec.decode(data);
      const out = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer(); return dec.decode(out); }
    pos += 46 + fnl + exl + cml;
  }
  return null;
}
const ent = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
function docxParas(xml) {
  const out = []; const re = /<w:p[ >][\s\S]*?<\/w:p>/g; let m;
  while ((m = re.exec(xml))) { const px = m[0]; const t = (px.match(/<w:t[ >][^<]*<\/w:t>|<w:t>[^<]*<\/w:t>|<w:tab\/>|<w:br\/>/g) || []).map(x => x.startsWith('<w:t') ? x.replace(/<[^>]+>/g, '') : ' ').join('');
    out.push({ t: ent(t).replace(/\s+/g, ' ').trim(), list: /<w:numPr>/.test(px) }); }
  return out;
}
const TYPO = { 'PORTÊNCIA': 'POTÊNCIA', 'Portência': 'Potência', 'portência': 'potência' };
const frase = (s) => { s = String(s || '').trim(); Object.keys(TYPO).forEach(k => { s = s.split(k).join(TYPO[k]); }); if (s && s === s.toUpperCase()) s = s.toLowerCase().replace(/^./, c => c.toUpperCase()); return s; };
function lerXpa(paras) {
  const T = paras.map(x => x.t); const R = { equipamentos: [], escopo: [], observacoes: [] };
  const isLabel = (s) => /^[A-ZÀ-Ú][A-ZÀ-Ú\-.\s]{1,25}:$/.test(s);
  const isDate = (s) => /^\d{1,2} de [a-zç]+ de \d{4}$/i.test(s);
  const head = (re, from = 0) => { for (let i = from; i < T.length; i++) if (re.test(T[i]) && !/[A-Za-zÀ-ú:)\s]\d+$/.test(T[i])) return i; return -1; };
  const after = (lab) => { const i = T.findIndex(s => s.toUpperCase().replace(/\s/g, '') === lab); if (i < 0) return ''; for (let j = i + 1; j < Math.min(T.length, i + 6); j++) { const s = T[j]; if (!s || isDate(s)) continue; return isLabel(s) ? '' : s; } return ''; };
  R.cliente = after('CLIENTE:'); R.solicitante = after('SOLICITANTE:'); R.telefone = after('TELEFONE:').replace(/^Phone:\s*/i, '').replace(/^\+55\s*/, ''); R.email = after('E-MAIL:');
  const cid = after('CIDADE:'), uf = after('ESTADO:');
  if (/^\+?\d[\d\s()-]{8,}$/.test(R.telefone)) { const d = R.telefone.replace(/\D/g, ''); if (d.length >= 10) R.telefone = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`; }
  if (!R.cliente && R.email) { const dom = R.email.split('@')[1] || ''; const nm = dom.split('.')[0]; if (nm) { R.cliente = nm.charAt(0).toUpperCase() + nm.slice(1); R.observacoes.push(`Nome do cliente não encontrado; usei "${R.cliente}" (do domínio do e-mail). Confirme a razão social.`); } }
  const io = T.findIndex(s => /referente a\s*$/i.test(s) || /referente a/i.test(s)); if (io >= 0) { const m = T[io].match(/referente a\s+(.+)/i); R.objeto = frase(m ? m[1] : (T.slice(io + 1).find(Boolean) || '')); }
  const il = head(/^\s*\d+\.?\s*local\s*:?\s*$/i); if (il >= 0) R.local = T.slice(il + 1).find(Boolean) || '';
  if (!R.local && cid) R.local = cid + (uf ? '/' + uf : '');
  const iq = head(/quantifica[çc][ãa]o/i), ie = head(/^\s*\d+\.?\s*escopo/i);
  if (iq >= 0) { let g = ''; for (let i = iq + 1; i < (ie > iq ? ie : T.length); i++) { const s = T[i]; if (!s) continue;
    if (!paras[i].list && !/^\d/.test(s) && !/[—–]/.test(s)) { g = frase(s); continue; }
    let m, qtd = 1, eq = s; if ((m = s.match(/^(\d+)\s+(.+)$/))) { qtd = +m[1]; eq = m[2]; } else if ((m = s.match(/^(.+?)\s*[—–-]\s*(\d+)\s*unidades?$/i))) { eq = m[1]; qtd = +m[2]; }
    R.equipamentos.push({ local: g, equipamento: eq.replace(/\s*[—–]\s*/g, ' – '), qtd }); } }
  if (ie >= 0) { const fim = head(/^(\d+\.?\s*)?(prazo|integra[çc][ãa]o|equipe t[ée]cnica|responsabilidade|exclus|ii\s+proposta|pre[çc]o|impostos|condi[çc][õo]es de pagamento|garantia)/i, ie + 1); let cur = null;
    const LAB = /^(servi[çc]os gerais|medi[çc][ãa]o e testes|medi[çc][õo]es e (testes|ensaios))\s*:?\s*(.*)$/i;
    const push = (l) => { if (!cur) { cur = { titulo: 'Serviços', itens: [] }; R.escopo.push(cur); } if (l && !cur.itens.includes(l)) cur.itens.push(l); };
    for (let i = ie + 1; i < (fim > 0 ? fim : T.length); i++) { let s = T[i]; if (!s) continue; s = s.replace(/^[➢•\-–]\s*/, '');
      const mh = s.match(/^\d+(\.\d+)+\.?\s+(.+?)\s*:?\s*$/);
      if (mh && !LAB.test(mh[2])) { cur = { titulo: frase(mh[2]).replace(/:$/, ''), itens: [] }; R.escopo.push(cur); continue; }
      const t2 = mh ? mh[2] : s; const ml = t2.match(LAB);
      if (ml) { push(/servi/i.test(ml[1]) ? 'Serviços gerais:' : 'Medições e ensaios:'); if (ml[3]) push(ml[3].replace(/\s*;?\s*$/, ';')); continue; }
      if (cur && /[óo]leo/i.test(cur.titulo) && (/NBR|IEC/.test(s) || /^an[áa]lise .*:$/i.test(s))) continue;
      if (/termo\s*v[áa]cuo/i.test(s)) R.observacoes.push('O escopo original cita tratamento termovácuo, que está nas exclusões padrão. Confira.');
      push(s); } }
  const num = (re, unit) => { const i = head(re); if (i < 0) return null; for (let j = i + 1; j < Math.min(T.length, i + 4); j++) { const m = T[j].match(new RegExp('(\\d+)\\s*' + unit, 'i')); if (m) return +m[1]; } return null; };
  R.pagDias = num(/condi[çc][õo]es de pagamento/i, 'dias'); R.garantiaMeses = num(/garantia/i, 'mes'); R.validadeDias = num(/validade/i, 'dias');
  if (R.objeto && /portência/i.test(T[io] || '')) R.observacoes.push('Corrigi "PORTÊNCIA" para "potência" no objeto.');
  return R;
}
async function lerDocx(file) { const buf = await file.arrayBuffer(); const xml = await zipEntry(buf, 'word/document.xml'); if (!xml) throw new Error('Não encontrei o texto do documento.'); const paras = docxParas(xml); return { paras, texto: paras.map(x => (x.list ? '• ' : '') + x.t).filter(x => x.trim()).join('\n') }; }
function aplicarLeitura(p, R) {
  const c = p.cli; const set = (o, k, v) => { if (v !== undefined && v !== null && String(v).trim() !== '') o[k] = v; };
  set(c, 'cliente', R.cliente); set(c, 'solicitante', R.solicitante); set(c, 'tel', R.telefone); set(c, 'email', R.email); set(c, 'local', R.local);
  if (R.objeto) { p.obj.objeto = R.objeto; const w = R.objeto.split(' '); const cut = Math.min(w.length, Math.max(2, Math.ceil(w.length / 2))); if (!R.titulo1) { p.obj.titulo1 = w.slice(0, cut).join(' ').replace(/^./, x => x.toUpperCase()); p.obj.titulo2 = w.slice(cut).join(' '); } }
  set(p.obj, 'titulo1', R.titulo1); set(p.obj, 'titulo2', R.titulo2);
  if ((R.equipamentos || []).length) p.equip = R.equipamentos.map(e => ({ local: e.local || '', equipamento: e.equipamento || '', qtd: e.qtd || 1 }));
  if ((R.escopo || []).length) p.escopo = R.escopo.map(s => ({ titulo: s.titulo || 'Serviços', texto: (s.itens || []).join('\n') }));
  if ((R.exclusoes || []).length) p.excl = R.exclusoes.join('\n');
  set(p.cond, 'pagDias', R.pagDias); set(p.cond, 'garantiaMeses', R.garantiaMeses); set(p.cond, 'validadeDias', R.validadeDias);
  const trafos = (p.equip || []).filter(e => /transformador/i.test(e.equipamento) && !/potencial|corrente|\bTPs?\b|\bTCs?\b/i.test(e.equipamento)).reduce((a, e) => a + (N(e.qtd) || 0), 0);
  if (trafos && (p.escopo || []).some(s => /[óo]leo/i.test(s.titulo))) p.preco.oleoQtd = trafos;
  return p;
}

/* ======================= exporta para testes (Node) ======================= */
const API = { novaProposta, calc, blocosTecnica, blocosComercial, wordDoc, docMeta, nomeArq, extenso, lerXpa, docxParas, zipEntry, aplicarLeitura, MODELOS };
if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
if (typeof window !== 'undefined') window.XPA_PROPOSTA = API;
if (typeof registrar !== 'function') return;

/* ======================= INTERFACE (app) ======================= */
let ACL = null, PV = 'list', CURP = null, LISTA = [], saveTP = null, ABERTO = new Set(['id']), IMGCACHE = null;
const email = () => ((FBUSER && FBUSER.email) || '').toLowerCase();
const isAdmin = () => !!email() && (email() === OWNER || ((ACL && ACL.admins) || []).includes(email()));
const canProp = () => isAdmin() || (!!email() && ((ACL && ACL.propostas) || []).includes(email()));
async function loadAcl() { if (!DB || !FBUSER) { ACL = { admins: [], propostas: [] }; return; } try { const s = await withTimeout(DB.collection('config').doc('acl').get(), 10000); ACL = s.exists ? s.data() : { admins: [], propostas: [] }; } catch (e) { ACL = ACL || { admins: [], propostas: [] }; } }
function cartaoHome() {
  if (!FBUSER || !DB || $('#propCard')) return; if (!canProp()) return;
  const h2 = document.querySelector('#app h2'); if (!h2) return;
  h2.insertAdjacentHTML('beforebegin', `<div class="card" id="propCard" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between"><div><b style="color:var(--navy)">📑 Propostas técnicas e comerciais</b><div class="note">Acesso restrito · padrão XPA · Word e PDF</div></div><div class="row"><button class="btn gold" id="propAbrir">Abrir</button>${isAdmin() ? '<button class="btn ghost" id="propAdm">Acessos</button>' : ''}</div></div>`);
  $('#propAbrir').onclick = () => { PV = 'list'; go('prop'); }; const a = $('#propAdm'); if (a) a.onclick = () => { PV = 'admin'; go('prop'); };
}
const _vHome = vHome; vHome = function () { _vHome(); if (!FBUSER || !DB) return; if (ACL === null) loadAcl().then(() => { if (VIEW === 'home') cartaoHome(); }); else cartaoHome(); };
const _render = render; render = function () { if (VIEW === 'prop') return vProp(); return _render(); };
function vProp() { if (!FBUSER || !DB) { VIEW = 'home'; return vHome(); } if (ACL === null) { $('#app').innerHTML = '<div class="empty">Verificando acesso...</div>'; loadAcl().then(vProp); return; }
  if (!canProp()) { toast('Seu usuário não tem acesso às propostas.'); VIEW = 'home'; return vHome(); }
  if (PV === 'admin') return isAdmin() ? vAdmin() : (PV = 'list', vLista()); if (PV === 'edit' && CURP) return vEdit(); return vLista(); }
const voltarHome = () => { flush(); CURP = null; VIEW = 'home'; go('home'); };

/* ---------- lista ---------- */
async function vLista() {
  $('#app').innerHTML = `<h2>📑 Propostas</h2><div class="list" id="pl"><div class="empty">Carregando...</div></div><input type="file" id="pImp" accept=".docx,.pdf" style="display:none">`;
  setBar(`<button class="btn ghost" id="pBk">‹ Início</button><button class="btn ghost" id="pArq">📂 A partir de arquivo</button><button class="btn gold" id="pNova">+ Nova</button>`);
  $('#pBk').onclick = voltarHome; $('#pNova').onclick = () => criar(); $('#pArq').onclick = () => $('#pImp').click(); $('#pImp').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) criar(f); };
  try { const s = await withTimeout(DB.collection('propostas').orderBy('updatedAt', 'desc').limit(150).get(), 15000); LISTA = s.docs.map(d => d.data()); }
  catch (e) { $('#pl').innerHTML = `<div class="empty">Não foi possível carregar as propostas (${esc((e && e.code) || 'erro')}). Verifique a internet e as regras do Firestore.</div>`; return; }
  if (VIEW !== 'prop' || PV !== 'list') return;
  $('#pl').innerHTML = LISTA.length ? LISTA.map(x => { const k = calc(x); return `<div class="it" data-id="${esc(x.id)}"><div style="font-size:22px">📑</div><div style="flex:1"><div class="t">${esc(x.cli.cliente || 'Sem cliente')}</div><div class="s">${esc(x.numero || 's/ nº')} · Rev. ${esc(x.rev)} · ${esc(dataBR(x.data))} · ${esc((x.obj.titulo1 + ' ' + x.obj.titulo2).trim())}</div><div class="s">R$ ${brl(k.total)} · ${esc(x.autor || '')}</div></div><span class="pill ${x.status === 'emitida' ? 'p-ok' : 'p-pend'}">${x.status === 'emitida' ? 'Emitida' : 'Rascunho'}</span><span style="color:var(--muted)">›</span></div>`; }).join('') : '<div class="empty">Nenhuma proposta ainda. Toque em <b>+ Nova</b> ou <b>A partir de arquivo</b>.</div>';
  document.querySelectorAll('#pl .it').forEach(e => e.onclick = () => { CURP = clone(LISTA.find(x => x.id === e.dataset.id)); PV = 'edit'; vEdit(); window.scrollTo(0, 0); });
}
async function proximoNumero() {
  const ref = DB.collection('config').doc('contador_propostas'); const yy = String(new Date().getFullYear()).slice(2);
  return DB.runTransaction(async tx => { const s = await tx.get(ref); const d = s.exists ? s.data() : { ano: yy, seq: 58 }; const seq = (String(d.ano) === yy ? (N(d.seq) || 0) : 0) + 1; tx.set(ref, { ano: yy, seq }); return `10_${yy}${String(seq).padStart(3, '0')}`; });
}
async function criar(file, base) {
  const p = base ? clone(base) : novaProposta(); p.id = 'prop_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); p.createdAt = Date.now(); p.autor = email(); p.status = 'rascunho'; p.data = hoje();
  try { p.numero = await withTimeout(proximoNumero(), 12000); } catch (e) { p.numero = ''; toast('Não consegui gerar o número automático. Preencha manualmente.'); }
  if (base) p.rev = '00';
  CURP = p; PV = 'edit'; await salvar(); vEdit();
  if (file) importar(file);
}
async function salvar() { if (!CURP) return; CURP.updatedAt = Date.now(); CURP.editor = email(); try { await withTimeout(DB.collection('propostas').doc(CURP.id).set(clone(CURP)), 20000); status('Proposta salva', 'ok'); } catch (e) { status('Proposta não salva: ' + ((e && e.code) || 'erro'), 'err'); } }
function agendar() { status('Salvando proposta...'); clearTimeout(saveTP); saveTP = setTimeout(salvar, 900); }
function flush() { if (saveTP) { clearTimeout(saveTP); saveTP = null; salvar(); } }

/* ---------- editor ---------- */
const inp = (path, label, o = {}) => { const v = getP(CURP, path); const val = v === undefined || v === null ? '' : v;
  return `<div${o.full ? ' style="grid-column:1/-1"' : ''}><label>${label}</label>${o.area ? `<textarea data-p="${path}" rows="${o.rows || 4}" placeholder="${esc(o.ph || '')}">${esc(val)}</textarea>` : o.opts ? `<select data-p="${path}">${o.opts.map(([k, t]) => `<option value="${k}" ${String(val) === String(k) ? 'selected' : ''}>${t}</option>`).join('')}</select>` : `<input data-p="${path}" ${o.n ? 'data-n="1" inputmode="decimal"' : ''} type="${o.type || 'text'}" value="${esc(val)}" placeholder="${esc(o.ph || '')}">`}</div>`; };
const sec = (id, titulo, html) => `<details class="grp" data-s="${id}" ${ABERTO.has(id) ? 'open' : ''}><summary>${titulo}<span>▾</span></summary><div style="padding:12px">${html}</div></details>`;
function totaisHtml() { const k = calc(CURP); return `<div class="card" style="background:var(--bg);margin:10px 0 0">${k.L.map(l => `<div class="result note"><span>${esc(l.item)} ${esc(l.desc)}</span><b>${brl(l.total)}</b></div>`).join('')}
  <div class="result" style="margin-top:6px"><span>Subtotal (com margem de ${fN(N(CURP.preco.margem) || 0)}%)</span><b>R$ ${brl(k.sub)}</b></div>${k.dpct ? `<div class="result" style="color:#1D7A3E"><span>Desconto (${fN(k.dpct)}%)</span><b>– R$ ${brl(k.desc)}</b></div>` : ''}
  <div class="result" style="font-size:18px;color:var(--navy);margin-top:4px"><span><b>TOTAL</b></span><b>R$ ${brl(k.total)}</b></div><div class="note">Custo sem margem: R$ ${brl(k.custo)} · Hora adicional da equipe (A1): R$ ${brl(k.horaEquipe)}</div></div>`; }
function vEdit() {
  const p = CURP; const P = p.preco;
  const equipRows = (p.equip || []).map((e, i) => `<div class="grid" style="grid-template-columns:1fr 1.6fr 60px 34px;gap:6px;align-items:end">${inp(`equip.${i}.local`, i ? '' : 'Local')}${inp(`equip.${i}.equipamento`, i ? '' : 'Equipamento')}${inp(`equip.${i}.qtd`, i ? '' : 'Qtd.', { n: 1 })}<button class="btn danger" data-del="equip.${i}" style="padding:8px 0">×</button></div>`).join('');
  const escRows = (p.escopo || []).map((s, i) => `<div class="card" style="padding:10px"><div class="row" style="justify-content:space-between"><b class="note">2.${i + 1}</b><div class="row"><button data-up="escopo.${i}" style="padding:4px 9px">↑</button><button class="btn danger" data-del="escopo.${i}" style="padding:4px 9px">Remover</button></div></div>${inp(`escopo.${i}.titulo`, 'Título')}${inp(`escopo.${i}.texto`, 'Itens (um por linha; linha terminada em ":" vira subtítulo)', { area: 1, rows: 6 })}</div>`).join('');
  const eqRows = (P.equipe || []).map((e, i) => `<div class="card" style="padding:10px">${inp(`preco.equipe.${i}.funcao`, 'Função')}<div class="grid" style="grid-template-columns:1fr 1fr 1fr;gap:6px">${inp(`preco.equipe.${i}.qtd`, 'Pessoas', { n: 1 })}${inp(`preco.equipe.${i}.horas`, 'Horas/pessoa', { n: 1, ph: 'auto' })}${inp(`preco.equipe.${i}.vh`, 'R$/hora', { n: 1 })}</div>${inp(`preco.equipe.${i}.ativ`, 'Atividades')}<div class="row" style="justify-content:space-between;margin-top:6px"><label style="margin:0;display:flex;gap:6px;align-items:center;font-weight:normal"><input type="checkbox" data-chk="preco.equipe.${i}.campo" ${e.campo !== false ? 'checked' : ''} style="width:20px;height:20px;-webkit-appearance:checkbox;appearance:auto;accent-color:#0A1733"> Em campo (conta refeição e hora adicional)</label><button class="btn danger" data-del="preco.equipe.${i}" style="padding:4px 9px">×</button></div></div>`).join('');
  const outRows = (P.outros || []).map((o, i) => `<div class="grid" style="grid-template-columns:1.8fr 60px 70px 90px 34px;gap:6px;align-items:end">${inp(`preco.outros.${i}.desc`, i ? '' : 'Descrição')}${inp(`preco.outros.${i}.qtd`, i ? '' : 'Qtd.', { n: 1 })}${inp(`preco.outros.${i}.un`, i ? '' : 'Unid.')}${inp(`preco.outros.${i}.v`, i ? '' : 'R$ unit.', { n: 1 })}<button class="btn danger" data-del="preco.outros.${i}" style="padding:8px 0">×</button></div>`).join('');
  $('#app').innerHTML = `<input type="file" id="pImp" accept=".docx,.pdf" style="display:none"><h2>📑 ${esc(p.numero || 'Proposta sem número')} · Rev. ${esc(p.rev)}</h2>
  <div class="card result"><div><div class="note">${esc(p.cli.cliente || 'Sem cliente')}</div><div style="font-size:20px;font-weight:bold;color:var(--navy)" id="pTopo">R$ ${brl(calc(p).total)}</div></div><div class="row"><button class="btn ghost" id="pArq">📂 Ler arquivo</button><button class="btn gold" id="pGer">Gerar</button></div></div>
  ${sec('id', 'Identificação', `<div class="grid">${inp('numero', 'Nº da proposta')}${inp('rev', 'Revisão')}${inp('data', 'Data', { type: 'date' })}${inp('status', 'Situação', { opts: [['rascunho', 'Rascunho'], ['emitida', 'Emitida']] })}${inp('cli.cliente', 'Cliente (contratante)')}${inp('cli.solicitante', 'Solicitante', { ph: 'Sr. Nome Sobrenome' })}${inp('cli.tel', 'Telefone')}${inp('cli.email', 'E-mail')}${inp('cli.local', 'Local de execução', { full: 1 })}</div>`)}
  ${sec('obj', 'Objeto e equipamentos', `<div class="grid">${inp('obj.titulo1', 'Título – linha 1 (capa)')}${inp('obj.titulo2', 'Título – linha 2 (capa)')}</div>${inp('obj.objeto', 'Objeto (frase completa)', { area: 1, rows: 2 })}<label>Equipamentos</label>${equipRows}<button id="addEq" style="margin-top:6px">+ Equipamento</button>`)}
  ${sec('esc', 'Escopo de serviços', `${escRows}<div class="row"><select id="modSel" style="flex:1">${Object.keys(MODELOS).map(m => `<option>${m}</option>`).join('')}</select><button class="btn" id="addEsc">+ Adicionar seção</button></div>`)}
  ${sec('prz', 'Prazos e etapas', `${inp('prazos.integracao', 'Integração', { area: 1, rows: 2 })}${inp('prazos.execucao', 'Execução', { area: 1, rows: 2 })}${inp('prazos.laudos', 'Laudos de laboratório (deixe vazio se não houver)')}${inp('prazos.relatorio', 'Relatório técnico e ART')}${inp('prazos.mobilizacao', 'Mobilização')}${inp('qualif', 'Qualificação da equipe')}<label>Etapas do serviço (5)</label>${[0, 1, 2, 3, 4].map(i => `<div class="grid">${inp(`etapas.${i}`, '')}${inp(`etapasDesc.${i}`, '')}</div>`).join('')}`)}
  ${sec('resp', 'Responsabilidades e exclusões', `${inp('respXpa', 'Responsabilidades da XPA (uma por linha)', { area: 1, rows: 6 })}${inp('respCli', 'Responsabilidades da contratante (uma por linha)', { area: 1, rows: 8 })}${inp('exclBox', 'Quadro de destaque das exclusões', { area: 1, rows: 2 })}${inp('excl', 'Exclusões (uma por linha)', { area: 1, rows: 8 })}`)}
  ${sec('prc', 'Preço (homem-hora, deslocamento, refeição, análises)', `<div class="grid">${inp('preco.dias', 'Dias de campo', { n: 1 })}${inp('preco.jornada', 'Jornada (h/dia)', { n: 1 })}</div><label>Equipe</label>${eqRows}<button id="addFun">+ Função</button>
    <div class="grid" style="margin-top:8px">${inp('preco.veiculos', 'Veículos', { n: 1 })}${inp('preco.kmVeic', 'Km ida e volta por veículo', { n: 1 })}${inp('preco.vkm', 'R$/km', { n: 1 })}${inp('preco.vref', 'Refeição R$/pessoa/dia', { n: 1 })}${inp('preco.refPessoas', 'Pessoas na refeição', { n: 1, ph: 'auto (equipe de campo)' })}${inp('preco.refDias', 'Dias de refeição', { n: 1, ph: 'auto' })}${inp('preco.oleoQtd', 'Amostras de óleo', { n: 1 })}${inp('preco.vOleo', 'R$ por amostra', { n: 1 })}</div>
    <label>Outros itens</label>${outRows}<button id="addOut">+ Item</button>
    <div class="grid" style="margin-top:8px">${inp('preco.margem', 'Margem (%)', { n: 1 })}${inp('preco.desconto', 'Desconto (%)', { n: 1 })}${inp('preco.exibir', 'Na proposta, mostrar', { opts: [['global', 'Só o valor total'], ['itens', 'Itens com preço unitário']] })}${inp('preco.descGlobal', 'Descrição da linha única (opcional)')}</div><div id="pTot">${totaisHtml()}</div>`)}
  ${sec('cond', 'Condições comerciais', `<div class="grid">${inp('cond.pagDias', 'Pagamento (dias da NF)', { n: 1 })}${inp('cond.garantiaMeses', 'Garantia (meses)', { n: 1 })}${inp('cond.validadeDias', 'Validade (dias)', { n: 1 })}</div>`)}
  <div class="row" style="margin-top:14px"><button class="btn ghost" id="pDup">Duplicar</button><button class="btn ghost" id="pRev">Nova revisão</button><button class="btn danger" id="pDel">Excluir</button></div>`;
  setBar(`<button class="btn ghost" id="pVolta">‹ Propostas</button><button class="btn gold" id="pGer2">📄 Gerar Word / PDF</button>`);
  bindEdit();
}
function bindEdit() {
  const app = $('#app');
  app.querySelectorAll('details.grp').forEach(d => d.addEventListener('toggle', () => { d.open ? ABERTO.add(d.dataset.s) : ABERTO.delete(d.dataset.s); }));
  app.querySelectorAll('[data-p]').forEach(el => { const fn = () => { setP(CURP, el.dataset.p, el.dataset.n ? (el.value.trim() === '' ? '' : (N(el.value) ?? el.value)) : el.value); agendar();
    if (/^preco|^cond/.test(el.dataset.p)) { const t = $('#pTot'); if (t) t.innerHTML = totaisHtml(); } const tp = $('#pTopo'); if (tp) tp.textContent = 'R$ ' + brl(calc(CURP).total); };
    el.oninput = fn; el.onchange = fn; });
  app.querySelectorAll('[data-chk]').forEach(el => el.onchange = () => { setP(CURP, el.dataset.chk, el.checked); agendar(); $('#pTot').innerHTML = totaisHtml(); });
  app.querySelectorAll('[data-del]').forEach(el => el.onclick = () => { const ks = el.dataset.del.split('.'); const i = +ks.pop(); getP(CURP, ks.join('.')).splice(i, 1); agendar(); vEdit(); });
  app.querySelectorAll('[data-up]').forEach(el => el.onclick = () => { const ks = el.dataset.up.split('.'); const i = +ks.pop(); const a = getP(CURP, ks.join('.')); if (i > 0) { [a[i - 1], a[i]] = [a[i], a[i - 1]]; agendar(); vEdit(); } });
  const last = (CURP.equip || []).slice(-1)[0];
  $('#addEq').onclick = () => { (CURP.equip = CURP.equip || []).push({ local: last ? last.local : '', equipamento: '', qtd: 1 }); vEdit(); };
  $('#addEsc').onclick = () => { const m = $('#modSel').value; (CURP.escopo = CURP.escopo || []).push({ titulo: m === 'Seção em branco' ? '' : m, texto: MODELOS[m] || '' }); if (/óleo/i.test(m) && !N(CURP.preco.oleoQtd)) CURP.preco.oleoQtd = 1; agendar(); vEdit(); };
  $('#addFun').onclick = () => { CURP.preco.equipe.push({ funcao: 'Eletricista', qtd: 1, horas: '', vh: 190, ativ: '', campo: true }); agendar(); vEdit(); };
  $('#addOut').onclick = () => { (CURP.preco.outros = CURP.preco.outros || []).push({ desc: '', qtd: 1, un: 'un', v: '' }); vEdit(); };
  $('#pVolta').onclick = () => { flush(); CURP = null; PV = 'list'; vLista(); };
  $('#pGer').onclick = $('#pGer2').onclick = gerarMenu;
  $('#pArq').onclick = () => $('#pImp').click(); $('#pImp').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importar(f); };
  $('#pDup').onclick = () => confirmBox('Criar uma nova proposta (novo número) com o mesmo conteúdo?', async () => { flush(); await criar(null, CURP); toast('Proposta duplicada.'); });
  $('#pRev').onclick = () => confirmBox('Criar a próxima revisão desta proposta (mesmo número)?', async () => { flush(); const n = clone(CURP); n.id = 'prop_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); n.rev = String((parseInt(n.rev, 10) || 0) + 1).padStart(2, '0'); n.status = 'rascunho'; n.data = hoje(); n.createdAt = Date.now(); CURP = n; await salvar(); vEdit(); toast('Revisão ' + n.rev + ' criada.'); });
  $('#pDel').onclick = () => confirmBox('Excluir esta proposta? Essa ação não pode ser desfeita.', async () => { try { await DB.collection('propostas').doc(CURP.id).delete(); } catch (e) { toast('Não foi possível excluir (' + ((e && e.code) || 'erro') + ').'); return; } CURP = null; saveTP && clearTimeout(saveTP); saveTP = null; PV = 'list'; vLista(); });
}

/* ---------- geração ---------- */
function gerarMenu() {
  flush();
  $('#mbox').innerHTML = `<p style="margin-top:0;font-weight:bold;color:var(--navy)">Gerar proposta ${esc(CURP.numero || '')}</p><div style="display:grid;gap:8px">
  <button class="btn gold" data-g="w|Proposta Técnica">📝 Word – Proposta Técnica</button><button class="btn gold" data-g="w|Proposta Comercial">📝 Word – Proposta Comercial</button>
  <button class="btn" data-g="p|Proposta Técnica">📄 PDF – Proposta Técnica</button><button class="btn" data-g="p|Proposta Comercial">📄 PDF – Proposta Comercial</button><button id="gNo">Cancelar</button></div>`;
  $('#modal').classList.add('show'); $('#gNo').onclick = () => $('#modal').classList.remove('show');
  document.querySelectorAll('[data-g]').forEach(bt => bt.onclick = async () => { const [t, kind] = bt.dataset.g.split('|'); $('#modal').classList.remove('show'); toast('Gerando ' + kind + '...');
    try { if (t === 'w') await gerarWord(kind); else await gerarPdf(kind); } catch (e) { console.error(e); toast('Erro ao gerar: ' + ((e && e.message) || e)); } });
}
const bytesDe = (d) => { const s = atob(d.split(',')[1]); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
const imgEl = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
async function canvasBytes(c, type, q) { const bl = await new Promise(r => c.toBlob(r, type, q)); return new Uint8Array(await bl.arrayBuffer()); }
async function imagens() {
  if (IMGCACHE) return IMGCACHE;
  const c = document.createElement('canvas'); c.width = 1654; c.height = 2339; const g = c.getContext('2d'); g.fillStyle = '#0A1733'; g.fillRect(0, 0, c.width, c.height);
  try { const im = await imgEl(COVER_TOP); g.drawImage(im, 0, 0, c.width, c.width * 124.7 / 210); } catch (e) {}
  const cover = await canvasBytes(c, 'image/jpeg', 0.88); g.fillStyle = '#0A1733'; g.fillRect(0, 0, c.width, c.height); const back = await canvasBytes(c, 'image/png');
  IMGCACHE = { cover, back, logoCor: bytesDe(LOGO_COR), logoBranco: bytesDe(LOGO_BRANCO) }; return IMGCACHE;
}
async function gerarWord(kind) {
  if (!window.docx) { try { await loadScript('docx.min.js'); } catch (e) {} } if (!window.docx) { toast('Gerador de Word não carregou. Verifique a conexão.'); return; }
  const blocks = kind === 'Proposta Técnica' ? blocosTecnica(CURP) : blocosComercial(CURP);
  const d = wordDoc(window.docx, docMeta(CURP, kind), blocks, await imagens());
  const blob = await window.docx.Packer.toBlob(d);
  await saveFile(nomeArq(CURP, kind, 'docx'), new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
}
async function gerarPdf(kind) { if (!pdfPronto()) return; const K = await pdfDoc(CURP, kind); await K.finish(kind + ' · ' + (CURP.obj.titulo1 + ' ' + CURP.obj.titulo2).trim(), nomeArq(CURP, kind, 'pdf')); }

/* ---------- importação ---------- */
async function importar(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase(); let local = null, texto = '';
  if (ext === 'docx') { try { const r = await lerDocx(file); texto = r.texto; local = lerXpa(r.paras); } catch (e) { toast('Não consegui ler o .docx: ' + ((e && e.message) || e)); } }
  else if (ext !== 'pdf') { toast('Use um arquivo .docx ou .pdf.'); return; }
  const resumo = local ? `<p class="note" style="margin-top:0">Leitura local encontrou: <b>${esc(local.cliente || 'cliente não identificado')}</b> · ${local.equipamentos.length} equipamento(s) · ${local.escopo.length} seção(ões) de escopo.</p>` : `<p class="note" style="margin-top:0">${ext === 'pdf' ? 'Arquivos PDF são lidos pela IA.' : 'A leitura local não funcionou.'}</p>`;
  $('#mbox').innerHTML = `<p style="margin-top:0;font-weight:bold;color:var(--navy)">Ler ${esc(file.name)}</p>${resumo}<div style="display:grid;gap:8px">${local ? '<button class="btn gold" id="iLoc">Aplicar leitura local</button>' : ''}<button class="btn" id="iIa">🤖 Analisar com IA (Claude)</button><button id="iNo">Cancelar</button></div><p class="note">A leitura substitui cliente, objeto, equipamentos e escopo desta proposta. Os preços não mudam.</p>`;
  $('#modal').classList.add('show'); $('#iNo').onclick = () => $('#modal').classList.remove('show');
  if (local) $('#iLoc').onclick = () => { $('#modal').classList.remove('show'); aplicarLeitura(CURP, local); agendar(); vEdit(); mostrarObs(local.observacoes, 'Leitura local aplicada.'); };
  $('#iIa').onclick = async () => { $('#modal').classList.remove('show'); await analisarIA(file, ext, texto); };
}
function mostrarObs(obs, titulo) { if (!obs || !obs.length) { toast(titulo); return; } $('#mbox').innerHTML = `<p style="margin-top:0;font-weight:bold;color:var(--navy)">${esc(titulo)}</p><p class="note">Pontos para conferir:</p><ul style="font-size:13px;padding-left:18px">${obs.map(o => `<li>${esc(o)}</li>`).join('')}</ul><div class="row" style="justify-content:flex-end"><button class="btn" id="oOk">OK</button></div>`; $('#modal').classList.add('show'); $('#oOk').onclick = () => $('#modal').classList.remove('show'); }
async function analisarIA(file, ext, texto) {
  if (!online()) { toast('A análise por IA precisa de internet.'); return; }
  if (!firebase.functions) { try { await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-functions-compat.js'); } catch (e) {} }
  if (!firebase.functions) { toast('Não foi possível carregar o módulo de IA.'); return; }
  const payload = { nomeArquivo: file.name };
  if (ext === 'pdf') { if (file.size > 8e6) { toast('PDF muito grande (máx. 8 MB).'); return; } const u = new Uint8Array(await file.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); payload.pdfBase64 = btoa(s); }
  else payload.texto = texto.slice(0, 120000);
  $('#mbox').innerHTML = '<p style="margin:0">🤖 Analisando o documento com IA... isso leva de 20 a 60 segundos.</p>'; $('#modal').classList.add('show');
  try { const fn = firebase.app().functions(REGIAO).httpsCallable('analisarProposta', { timeout: 180000 }); const r = await fn(payload); $('#modal').classList.remove('show');
    aplicarLeitura(CURP, r.data || {}); agendar(); vEdit(); mostrarObs((r.data && r.data.observacoes) || [], 'Análise por IA aplicada.'); }
  catch (e) { $('#modal').classList.remove('show'); const c = (e && e.code) || ''; toast(/not-found|internal/.test(c) ? 'A função de IA ainda não foi publicada no Firebase (veja o LEIA-ME).' : 'Falha na análise por IA: ' + ((e && e.message) || c)); }
}

/* ---------- administração de acesso ---------- */
async function vAdmin() {
  $('#app').innerHTML = '<div class="empty">Carregando...</div>'; await loadAcl(); let cont = { ano: String(new Date().getFullYear()).slice(2), seq: 58 };
  try { const s = await DB.collection('config').doc('contador_propostas').get(); if (s.exists) cont = s.data(); } catch (e) {}
  $('#app').innerHTML = `<h2>⚙️ Acessos às propostas</h2><div class="card"><div class="note">Administrador principal: <b>${esc(OWNER)}</b> (sempre tem acesso).</div>
  <label>Administradores (um e-mail por linha) – podem liberar acessos</label><textarea id="aAdm" rows="3">${esc((ACL.admins || []).join('\n'))}</textarea>
  <label>Podem criar e editar propostas (um e-mail por linha)</label><textarea id="aProp" rows="6">${esc((ACL.propostas || []).join('\n'))}</textarea>
  <div class="note" style="margin-top:6px">Os e-mails precisam ser os mesmos do login do app. Quem não estiver nas listas não vê o módulo e o Firestore bloqueia o acesso.</div></div>
  <div class="card"><b style="color:var(--navy)">Numeração</b><div class="grid">${`<div><label>Ano (2 dígitos)</label><input id="aAno" value="${esc(cont.ano)}"></div><div><label>Último número usado</label><input id="aSeq" inputmode="numeric" value="${esc(cont.seq)}"></div>`}</div><div class="note">Próxima proposta: 10_${esc(cont.ano)}${String((N(cont.seq) || 0) + 1).padStart(3, '0')}</div></div>`;
  setBar(`<button class="btn ghost" id="aVolta">‹ Início</button><button class="btn gold" id="aSalvar">Salvar acessos</button>`);
  $('#aVolta').onclick = voltarHome;
  $('#aSalvar').onclick = async () => { const lim = (s) => [...new Set(s.split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(x => /@/.test(x)))];
    const novo = { admins: lim($('#aAdm').value), propostas: lim($('#aProp').value), updatedAt: Date.now(), por: email() };
    try { await DB.collection('config').doc('acl').set(novo); await DB.collection('config').doc('contador_propostas').set({ ano: $('#aAno').value.trim(), seq: N($('#aSeq').value) || 0 }); ACL = novo; toast('Acessos salvos.'); }
    catch (e) { toast('Não foi possível salvar (' + ((e && e.code) || 'erro') + '). Confira as regras do Firestore.'); } };
}
})();

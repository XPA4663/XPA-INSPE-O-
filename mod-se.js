/* ======================= MÓDULOS: MANUTENÇÃO PREVENTIVA E INSPEÇÃO VISUAL DE SUBESTAÇÃO ======================= */
(function(){

/* ======================= RELÉ DE PROTEÇÃO – FUNÇÕES ANSI, PLANILHA DE ENSAIOS E CURVAS ======================= */
const pn=v=>{ if(v===undefined||v===null||String(v).trim()==='') return null; const x=parseFloat(String(v).replace(',','.')); return isNaN(x)?null:x; };
const fx=(v,d=3)=>(v===null||v===undefined||!isFinite(v))?'—':v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const r3=v=>Math.round(v*1000)/1000;
const normAng=a=>((a+180)%360+360)%360-180;
const angDiff=(a,b)=>normAng(a-b);
const pill=(k,l)=>`<span class="pill p-${({ok:'ok',bad:'nc',pend:'pend',na:'pend',warn:'att'}[k]||k)}">${esc(l)}</span>`;
let RE=null, REFRESH=()=>{};
(function(){ if(document.getElementById('ansi-css')) return; const st=document.createElement('style'); st.id='ansi-css'; st.textContent=`
.ansi .chips{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.ansi .chip{display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:9px 10px;border:1.5px solid #D5DAE2;border-radius:9px;background:#fff}
.ansi .chip b{font-size:16px;color:#0A1733}.ansi .chip span{font-size:11.5px;color:#6B7385;line-height:1.25;margin-top:2px}
.ansi .chip.on{background:#0A1733;border-color:#0A1733}.ansi .chip.on b{color:#F4B400}.ansi .chip.on span{color:#D9DEE8}
.ansi .tw{overflow-x:auto;margin-top:8px;border:1px solid #D5DAE2;border-radius:8px}
.ansi table{border-collapse:collapse;width:100%;font-size:13px}
.ansi th{background:#13244A;color:#fff;font-weight:bold;padding:7px 6px;text-align:center;white-space:nowrap;font-size:12px}
.ansi td{border-top:1px solid #D5DAE2;padding:4px 5px;text-align:center;white-space:nowrap}
.ansi td input,.ansi td select{margin:0;padding:6px;text-align:center;min-width:70px;font-size:14px;background:#FFFBEA;width:100%}
.ansi td.c{background:#F0F2F5;font-variant-numeric:tabular-nums}
.ansi td .x{border:0;background:transparent;color:#C62828;padding:4px 6px;font-size:15px}
.ansi .tt{font-weight:bold;color:#0A1733;font-size:13px;margin:14px 0 2px;display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap}
.ansi .seg{display:flex;gap:4px;justify-content:center;grid-template-columns:none;margin:0}
.ansi .seg button{padding:7px 9px;font-size:12px;font-weight:bold;min-width:42px}
.ansi .sm{padding:6px 10px;font-size:13px}
.ansi .chart svg{width:100%;height:auto;display:block;margin-top:10px;background:#fff}
.ansi .sec{display:flex;justify-content:space-between;align-items:center;gap:8px}`; document.head.appendChild(st); })();
/* ======================= CURVAS ======================= */
const CURVES={
 'IEC NI':{n:'IEC Normal Inversa',k:0.14,a:0.02,b:0},'IEC MI':{n:'IEC Muito Inversa',k:13.5,a:1,b:0},
 'IEC EI':{n:'IEC Extremamente Inversa',k:80,a:2,b:0},'IEC LTI':{n:'IEC Inversa Longa',k:120,a:1,b:0},
 'IEEE MI':{n:'IEEE Moderadamente Inversa',k:0.0515,a:0.02,b:0.114},'IEEE VI':{n:'IEEE Muito Inversa',k:19.61,a:2,b:0.491},
 'IEEE EI':{n:'IEEE Extremamente Inversa',k:28.2,a:2,b:0.1217},'DT':{n:'Tempo definido (Dial = t em s)',def:true}
};
function tInv(c,d,M){ if(!(M>1)) return Infinity; const C=CURVES[c]||CURVES['IEC NI']; if(C.def) return d; return d*(C.k/(Math.pow(M,C.a)-1)+C.b); }

/* ======================= FUNÇÕES ANSI ======================= */
const PH3=['A','B','C'];
const YN=['Sim','Não'];
const NAVY='#13244A', ORG='#E85A24', GRN='#2F8F4E';
const dtEl=(kp,kt,u,dir)=>({aj:s=>s[kp],u,dir,tt:(s,x)=>(dir==='down'?x<=s[kp]:x>=s[kp])?s[kt]:Infinity});
const ocEls=(code)=>({[code]:{aj:s=>s.is,u:'A',tt:(s,x)=>tInv(s.c,s.d,x/s.is)}});
const F={};
F['50/51']={nome:'Sobrecorrente de fase',grp:'Corrente',
 set:[['c','Curva 51','curve','IEC NI'],['is','Pickup 51 (A)','n',1],['d','TMS / Dial','n',0.1],['e50','50 habilitado','sel','Sim',YN],['i50','Pickup 50 (A)','n',10],['t50','Tempo 50 (s)','n',0.05]],
 els:{'51':{aj:s=>s.is,u:'A',tt:(s,x)=>tInv(s.c,s.d,x/s.is)},'50':{aj:s=>s.e50==='Sim'?s.i50:NaN,u:'A',tt:(s,x)=>s.e50==='Sim'&&x>=s.i50?s.t50:Infinity}},
 def:s=>({pk:[...PH3.map(p=>({el:'51',ph:p})),...(s.e50==='Sim'?PH3.map(p=>({el:'50',ph:p})):[])],
   tm:[...PH3.flatMap(p=>[2,5,10].map(M=>({el:'51',ph:p,x:r3(M*s.is)}))),...(s.e50==='Sim'?PH3.map(p=>({el:'50',ph:p,x:r3(1.2*s.i50)})):[])]}),
 chart:'tc',curves:s=>[{n:'51/50',col:NAVY,is:s.is,f:x=>Math.min(tInv(s.c,s.d,x/s.is),s.e50==='Sim'&&x>=s.i50?s.t50:Infinity)}]};
F['50N/51N']={nome:'Sobrecorrente de neutro',grp:'Corrente',
 set:[['c','Curva 51N','curve','IEC NI'],['is','Pickup 51N (A)','n',0.3],['d','TMS / Dial','n',0.1],['e50','50N habilitado','sel','Sim',YN],['i50','Pickup 50N (A)','n',3],['t50','Tempo 50N (s)','n',0.05]],
 els:{'51N':{aj:s=>s.is,u:'A',tt:(s,x)=>tInv(s.c,s.d,x/s.is)},'50N':{aj:s=>s.e50==='Sim'?s.i50:NaN,u:'A',tt:(s,x)=>s.e50==='Sim'&&x>=s.i50?s.t50:Infinity}},
 def:s=>({pk:[{el:'51N',ph:'N'},...(s.e50==='Sim'?[{el:'50N',ph:'N'}]:[])],tm:[...[2,5,10].map(M=>({el:'51N',ph:'N',x:r3(M*s.is)})),...(s.e50==='Sim'?[{el:'50N',ph:'N',x:r3(1.2*s.i50)}]:[])]}),
 chart:'tc',curves:s=>[{n:'51N/50N',col:ORG,is:s.is,f:x=>Math.min(tInv(s.c,s.d,x/s.is),s.e50==='Sim'&&x>=s.i50?s.t50:Infinity)}]};
F['27']={nome:'Subtensão',grp:'Tensão',
 set:[['vpu','Pickup (V)','n',92],['t','Tempo (s)','n',2],['ref','Medição','sel','Fase-fase',['Fase-fase','Fase-neutro']],['log','Lógica','sel','Qualquer fase',['Qualquer fase','Todas as fases']]],
 els:{'27':dtEl('vpu','t','V','down')},
 def:s=>({pk:PH3.map(p=>({el:'27',ph:p})),tm:PH3.map(p=>({el:'27',ph:p,x:r3(0.8*s.vpu)})),chk:['Bloqueio com tensão nula / disjuntor aberto (se habilitado)']}),
 note:'Pickup: reduzir a tensão lentamente até atuar. Rearme: elevar até desatuar.'};
F['59']={nome:'Sobretensão',grp:'Tensão',
 set:[['vpu','Pickup (V)','n',127],['t','Tempo (s)','n',1],['ref','Medição','sel','Fase-fase',['Fase-fase','Fase-neutro']]],
 els:{'59':dtEl('vpu','t','V','up')},
 def:s=>({pk:PH3.map(p=>({el:'59',ph:p})),tm:PH3.map(p=>({el:'59',ph:p,x:r3(1.1*s.vpu)}))})};
F['46']={nome:'Sequência negativa de corrente (desequilíbrio)',grp:'Corrente',
 set:[['c','Curva','curve','IEC MI'],['is','Pickup I2 (A)','n',0.2],['d','TMS / Dial','n',0.5]],
 els:{'46':{aj:s=>s.is,u:'A',tt:(s,x)=>tInv(s.c,s.d,x/s.is)}},
 def:s=>({pk:[{el:'46',ph:'I2'}],tm:[2,5,10].map(M=>({el:'46',ph:'I2',x:r3(M*s.is)}))}),
 chart:'tc',curves:s=>[{n:'46',col:GRN,is:s.is,f:x=>tInv(s.c,s.d,x/s.is)}],
 note:'Injeção monofásica: I2 = I aplicada ÷ 3. Informe na planilha o valor de I2.'};
F['47']={nome:'Sequência negativa de tensão / sequência de fases',grp:'Tensão',
 set:[['v2','Pickup V2 (V)','n',10],['t','Tempo (s)','n',1]],
 els:{'47':dtEl('v2','t','V','up')},
 def:s=>({pk:[{el:'47',ph:'V2'}],tm:[{el:'47',ph:'V2',x:r3(1.5*s.v2)}],chk:['Sequência invertida (A-C-B) → atua','Sequência direta (A-B-C) → não atua']}),
 note:'Para tensões equilibradas com sequência invertida, V2 = tensão de fase aplicada.'};
F['32']={nome:'Direcional de potência',grp:'Potência',
 set:[['ppu','Pickup P (W sec.)','n',50],['t','Tempo (s)','n',2],['dir','Sentido de operação','sel','Reversa',['Reversa','Direta']]],
 els:{'32':dtEl('ppu','t','W','up')},
 def:s=>({pk:[{el:'32',ph:'3φ'}],tm:[{el:'32',ph:'3φ',x:r3(1.5*s.ppu)}],chk:['Potência no sentido de operação → atua','Potência no sentido oposto → não atua']})};
const dirAng=[{k:'l1',lab:'Limite 1 (MTA + 90°)'},{k:'l2',lab:'Limite 2 (MTA − 90°)'}];
F['67']={nome:'Sobrecorrente direcional de fase',grp:'Corrente',
 set:[['c','Curva','curve','IEC NI'],['is','Pickup (A)','n',1],['d','TMS / Dial','n',0.1],['mta','Ângulo característico MTA (°)','n',45],['dir','Direção','sel','Frente',['Frente','Reverso']]],
 els:ocEls('67'),
 def:s=>({pk:PH3.map(p=>({el:'67',ph:p})),tm:[2,5,10].map(M=>({el:'67',ph:'A',x:r3(M*s.is)})),ang:dirAng.map(a=>({...a,ph:'A'})),chk:['Corrente no sentido oposto → não atua']}),
 angExp:(s,k)=>normAng(s.mta+(k==='l1'?90:-90)),
 chart:'tc',curves:s=>[{n:'67',col:NAVY,is:s.is,f:x=>tInv(s.c,s.d,x/s.is)}],
 note:'Ensaios de tempo com a corrente no ângulo característico (MTA). Limites: variar o ângulo até a fronteira de operação.'};
F['67N']={nome:'Sobrecorrente direcional de neutro',grp:'Corrente',
 set:[['c','Curva','curve','IEC NI'],['is','Pickup (A)','n',0.3],['d','TMS / Dial','n',0.1],['mta','Ângulo característico MTA (°)','n',-45],['vpol','3V0 mínima de polarização (V)','n',2],['dir','Direção','sel','Frente',['Frente','Reverso']]],
 els:{...ocEls('67N'),'3V0':{aj:s=>s.vpol,u:'V',nt:true,tt:()=>Infinity}},
 def:s=>({pk:[{el:'67N',ph:'N'},{el:'3V0',ph:'Pol.'}],tm:[2,5,10].map(M=>({el:'67N',ph:'N',x:r3(M*s.is)})),ang:dirAng.map(a=>({...a,ph:'N'})),chk:['Corrente no sentido oposto → não atua','Sem tensão de polarização → não atua']}),
 angExp:(s,k)=>normAng(s.mta+(k==='l1'?90:-90)),
 chart:'tc',curves:s=>[{n:'67N',col:ORG,is:s.is,f:x=>tInv(s.c,s.d,x/s.is)}]};
const difEls=h=>({'Id>':{aj:s=>s.idmin,u:'pu',tt:(s,x)=>x>=s.idmin?s.top:Infinity},'Id>>':{aj:s=>s.iinst,u:'pu',tt:(s,x)=>x>=s.iinst?s.top:Infinity},
 ...(h?{'2ª harm.':{aj:s=>s.h2,u:'%',nt:true,tt:()=>Infinity},'5ª harm.':{aj:s=>s.h5,u:'%',nt:true,tt:()=>Infinity}}:{})});
const idop=(s,ir)=>Math.max(s.idmin, ir<=s.knee? s.s1/100*ir : s.s1/100*s.knee + s.s2/100*(ir-s.knee));
F['87T']={nome:'Diferencial de transformador',grp:'Diferencial',
 set:[['idmin','Id mín (pu)','n',0.3],['s1','Inclinação 1 (%)','n',25],['knee','Ponto de quebra Ir (pu)','n',2],['s2','Inclinação 2 (%)','n',50],['iinst','Id>> não restrita (pu)','n',8],['h2','Bloqueio 2ª harmônica (%)','n',15],['h5','Bloqueio 5ª harmônica (%)','n',35],['top','Tempo de operação esperado (s)','n',0.03]],
 els:difEls(true),
 def:s=>({pk:[...PH3.map(p=>({el:'Id>',ph:p})),{el:'Id>>',ph:'A'},{el:'2ª harm.',ph:'A'},{el:'5ª harm.',ph:'A'}],
   tm:[{el:'Id>',ph:'A',x:r3(2*s.idmin)},{el:'Id>>',ph:'A',x:r3(1.2*s.iinst)}],
   dif:[0.5,1,2,3,4,6].map(ir=>({ir,ph:'A'})),chk:['Falta externa (passante) → não atua','Falta interna → atua','Energização com 2ª harmônica acima do ajuste → bloqueia']}),
 chart:'dif',note:'Característica: Id = máx(Id mín; inclinação 1 × Ir) até o ponto de quebra e inclinação 2 acima dele. Confira a definição de Ir do fabricante.'};
F['87G']={nome:'Diferencial de gerador',grp:'Diferencial',
 set:[['idmin','Id mín (pu)','n',0.1],['s1','Inclinação 1 (%)','n',10],['knee','Ponto de quebra Ir (pu)','n',1],['s2','Inclinação 2 (%)','n',40],['iinst','Id>> não restrita (pu)','n',6],['top','Tempo de operação esperado (s)','n',0.03]],
 els:difEls(false),
 def:s=>({pk:[...PH3.map(p=>({el:'Id>',ph:p})),{el:'Id>>',ph:'A'}],tm:[{el:'Id>',ph:'A',x:r3(2*s.idmin)},{el:'Id>>',ph:'A',x:r3(1.2*s.iinst)}],
   dif:[0.5,1,2,3,4,6].map(ir=>({ir,ph:'A'})),chk:['Falta externa → não atua','Falta interna → atua']}),
 chart:'dif'};
F['21']={nome:'Distância (mho)',grp:'Impedância',
 set:[['ang','Ângulo da linha (°)','n',75],['z1','Alcance Z1 (Ω sec.)','n',2],['t1','Tempo Z1 (s)','n',0],['z2','Alcance Z2 (Ω sec.)','n',4],['t2','Tempo Z2 (s)','n',0.4],['z3','Alcance Z3 (Ω sec.)','n',6],['t3','Tempo Z3 (s)','n',1]],
 els:{},
 def:s=>({z:[{zn:'Z1',ph:'A-N',ang:s.ang},{zn:'Z1',ph:'A-B',ang:s.ang},{zn:'Z1',ph:'A-N',ang:s.ang-30},{zn:'Z2',ph:'A-N',ang:s.ang},{zn:'Z3',ph:'A-N',ang:s.ang}],
   chk:['Falta reversa → não atua','Perda de potencial (60 / falha de TP) bloqueia a 21, se habilitado']}),
 chart:'rx',note:'Alcance teórico da mho no ângulo de teste: Z = Zajuste × cos(θ teste − θ linha). Busca de alcance com rampa de impedância.'};
F['37']={nome:'Subcorrente',grp:'Corrente',
 set:[['ipu','Pickup (A)','n',0.5],['t','Tempo (s)','n',5]],
 els:{'37':dtEl('ipu','t','A','down')},
 def:s=>({pk:PH3.map(p=>({el:'37',ph:p})),tm:PH3.map(p=>({el:'37',ph:p,x:r3(0.8*s.ipu)})),chk:['Bloqueio com corrente nula (equipamento parado), se habilitado']})};
const ORDER=['50/51','50N/51N','27','59','46','47','32','67','67N','87T','87G','21','37'];

function setVals(fn,raw){ const s={}; for(const [k,,t,def] of F[fn].set){ const v=raw[k]??def; s[k]=(t==='n')?(pn(v)??NaN):v; } return s; }
function newFunc(fn){ const set={}; for(const [k,,,def] of F[fn].set) set[k]=String(def).replace('.',','); const s=setVals(fn,set);
  const d=F[fn].def(s); return {on:true,set,rows:fillRows(d)}; }
function fillRows(d){ return {pk:(d.pk||[]).map(r=>({...r,med:'',dr:''})),tm:(d.tm||[]).map(r=>({...r,x:fmtIn(r.x),tm:''})),ang:(d.ang||[]).map(r=>({...r,med:''})),
  dif:(d.dif||[]).map(r=>({...r,ir:fmtIn(r.ir),idm:''})),z:(d.z||[]).map(r=>({...r,ang:fmtIn(r.ang),zm:'',tm:''})),chk:(d.chk||[]).map(l=>({lab:l,res:''}))}; }
const fmtIn=v=>String(Math.round(v*1000)/1000).replace('.',',');

/* ======================= AVALIAÇÃO ======================= */
const DEFTOL={tp:'5',tms:'40',pk:'5',ang:'3',z:'5'};
function tolOf(r){ const t=Object.assign({},DEFTOL,r.tol||{}); return {tp:pn(t.tp)??5,tms:pn(t.tms)??40,pk:pn(t.pk)??5,ang:pn(t.ang)??3,z:pn(t.z)??5}; }
const LAB={ok:'Aprovado',bad:'Reprovado',pend:'Pendente',na:'N/A'};
const tOk=(tt,tm,T)=>Math.abs(tm-tt)<=Math.max(T.tp/100*tt,T.tms/1000);
function evPk(fn,s,r,T){ const e=F[fn].els[r.el]; if(!e) return {st:'na'}; const aj=e.aj(s); if(!(aj>0)) return {aj,st:'na',lab:'Desabilitado'};
  const m=pn(r.med); if(m===null) return {aj,st:'pend'}; const err=(m-aj)/aj*100; const dr=pn(r.dr);
  return {aj,err,rr:dr!==null&&m?dr/m:null,u:e.u,st:Math.abs(err)<=T.pk?'ok':'bad'}; }
function evTm(fn,s,r,T){ const e=F[fn].els[r.el]; if(!e) return {st:'na'}; const x=pn(r.x); const aj=e.aj(s);
  const tt=x===null?NaN:e.tt(s,x); const M=x!==null&&aj>0?x/aj:null;
  if(!isFinite(tt)) return {tt,M,st:'na',lab:x===null?'—':'Não opera'}; const m=pn(r.tm); if(m===null) return {tt,M,st:'pend'};
  const err=m-tt; return {tt,M,tm:m,err,pct:tt>0?err/tt*100:null,st:tOk(tt,m,T)?'ok':'bad'}; }
function evAng(fn,s,r,T){ const exp=F[fn].angExp(s,r.k); const m=pn(r.med); if(m===null) return {exp,st:'pend'}; const dev=angDiff(m,exp); return {exp,dev,st:Math.abs(dev)<=T.ang?'ok':'bad'}; }
function evDif(fn,s,r,T){ const ir=pn(r.ir); if(ir===null) return {st:'na'}; const it=idop(s,ir); const m=pn(r.idm); if(m===null) return {it,st:'pend'};
  const err=(m-it)/it*100; return {it,err,st:Math.abs(m-it)<=Math.max(T.pk/100*it,0.02)?'ok':'bad'}; }
function evZ(fn,s,r,T){ const n=r.zn.slice(1); const Zs=s['z'+n], tt=s['t'+n], th=pn(r.ang); if(th===null||!(Zs>0)) return {st:'na'};
  const zt=Zs*Math.cos((th-s.ang)*Math.PI/180); if(!(zt>0)) return {zt,tt,st:'na',lab:'Fora da zona'};
  const zm=pn(r.zm), tm=pn(r.tm); if(zm===null&&tm===null) return {zt,tt,st:'pend'};
  const err=zm!==null?(zm-zt)/zt*100:null; const okz=err===null?null:Math.abs(err)<=T.z; const okt=tm===null?null:tOk(tt,tm,T);
  const st=(okz===false||okt===false)?'bad':(okz===null||okt===null)?'pend':'ok'; return {zt,tt,err,zm,tm,st}; }
function evChk(r){ return {st:r.res==='C'?'ok':r.res==='NC'?'bad':r.res==='NA'?'na':'pend',lab:r.res==='C'?'Conforme':r.res==='NC'?'Não conforme':r.res==='NA'?'N/A':'Pendente'}; }
const EV={pk:evPk,tm:evTm,ang:evAng,dif:evDif,z:evZ};
function funcStats(rl,fn){ const f=rl.funcs[fn], s=setVals(fn,f.set), T=tolOf(rl); const c={ok:0,bad:0,pend:0};
  for(const k of ['pk','tm','ang','dif','z']) for(const r of (f.rows[k]||[])){ const e=EV[k](fn,s,r,T); if(c[e.st]!==undefined) c[e.st]++; }
  for(const r of (f.rows.chk||[])){ const e=evChk(r); if(c[e.st]!==undefined) c[e.st]++; }
  return c; }
/* ======================= GRÁFICOS (SVG) ======================= */
const AX='#5A6478', GR='#E6E9EF', GR2='#C3CAD6';
function svgWrap(inner,W,H){ return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif">${inner}</svg>`; }
function mark(cx,cy,ok,tip){ const c=ok?'#1E7B3A':'#B3261E';
  return ok?`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5" fill="${c}" stroke="#fff" stroke-width="1.5"><title>${esc(tip)}</title></circle>`
  :`<g stroke="${c}" stroke-width="3"><line x1="${cx-5}" y1="${cy-5}" x2="${cx+5}" y2="${cy+5}"/><line x1="${cx-5}" y1="${cy+5}" x2="${cx+5}" y2="${cy-5}"/><title>${esc(tip)}</title></g>`; }
function chartTC(fn,rl){ const f=rl.funcs[fn], s=setVals(fn,f.set), T=tolOf(rl); const curves=F[fn].curves(s).filter(c=>c.is>0);
  if(!curves.length) return '';
  const pts=[]; (f.rows.tm||[]).forEach((r,i)=>{ const e=evTm(fn,s,r,T); const x=pn(r.x); if(e.tm!==undefined&&x>0) pts.push({x,t:e.tm,ok:e.st==='ok',tip:`${r.el}-${r.ph}: ${fx(e.tm)} s`}); });
  const W=900,H=520,L=70,R=20,Tp=20,B=55; const lo=Math.min(...curves.map(c=>c.is));
  let hi=Math.max(...curves.map(c=>c.is*20),...pts.map(p=>p.x*1.5)); if(s.e50==='Sim') hi=Math.max(hi,s.i50*2);
  const xmin=Math.pow(10,Math.floor(Math.log10(lo*0.8))), xmax=Math.pow(10,Math.ceil(Math.log10(hi))); const ymin=0.01,ymax=100;
  const X=v=>L+(Math.log10(v)-Math.log10(xmin))/(Math.log10(xmax)-Math.log10(xmin))*(W-L-R);
  const Y=v=>Tp+(Math.log10(ymax)-Math.log10(v))/(Math.log10(ymax)-Math.log10(ymin))*(H-Tp-B);
  let o=`<rect x="${L}" y="${Tp}" width="${W-L-R}" height="${H-Tp-B}" fill="#fff" stroke="${GR2}"/>`;
  for(let d=Math.round(Math.log10(xmin));d<=Math.round(Math.log10(xmax));d++) for(let m=1;m<10;m++){ const v=m*Math.pow(10,d); if(v<xmin*0.999||v>xmax*1.001) continue;
    o+=`<line x1="${X(v)}" x2="${X(v)}" y1="${Tp}" y2="${H-B}" stroke="${m===1?GR2:GR}"/>`;
    if(m===1||m===2||m===5) o+=`<text x="${X(v)}" y="${H-B+16}" font-size="11" text-anchor="middle" fill="${AX}">${v.toLocaleString('pt-BR')}</text>`; }
  for(let d=-2;d<=2;d++) for(let m=1;m<10;m++){ const v=m*Math.pow(10,d); if(v>ymax*1.001) continue;
    o+=`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${m===1?GR2:GR}"/>`;
    if(m===1||m===2||m===5) o+=`<text x="${L-6}" y="${Y(v)+4}" font-size="11" text-anchor="end" fill="${AX}">${v.toLocaleString('pt-BR')}</text>`; }
  o+=`<text x="${(L+W-R)/2}" y="${H-12}" font-size="12" text-anchor="middle" fill="${NAVY}" font-weight="bold">Corrente secundária aplicada (A)</text>`;
  o+=`<text transform="translate(18 ${(Tp+H-B)/2}) rotate(-90)" font-size="12" text-anchor="middle" fill="${NAVY}" font-weight="bold">Tempo de atuação (s)</text>`;
  o+=`<clipPath id="cp${fn.replace(/\W/g,'')}"><rect x="${L}" y="${Tp}" width="${W-L-R}" height="${H-Tp-B}"/></clipPath><g clip-path="url(#cp${fn.replace(/\W/g,'')})">`;
  const P=a=>a.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  curves.forEach(c=>{ const a=Math.max(xmin,c.is*1.005), b=xmax; const pts2=[],up=[],dn=[];
    for(let i=0;i<=400;i++){ const I=a*Math.pow(b/a,i/400); const t=c.f(I); if(!isFinite(t)) continue; const tol=Math.max(T.tp/100*t,T.tms/1000);
      pts2.push([X(I),Y(Math.max(t,ymin))]); up.push([X(I),Y(Math.min(t+tol,ymax))]); dn.push([X(I),Y(Math.max(t-tol,ymin))]); }
    o+=`<path d="${P(up)}" fill="none" stroke="${c.col}" stroke-opacity=".45" stroke-dasharray="4 3"/><path d="${P(dn)}" fill="none" stroke="${c.col}" stroke-opacity=".45" stroke-dasharray="4 3"/>`;
    o+=`<path d="${P(pts2)}" fill="none" stroke="${c.col}" stroke-width="2.5"/><line x1="${X(c.is)}" x2="${X(c.is)}" y1="${Tp}" y2="${H-B}" stroke="${c.col}" stroke-opacity=".4" stroke-dasharray="2 4"/>`; });
  pts.forEach(p=>o+=mark(X(p.x),Y(Math.max(p.t,ymin)),p.ok,p.tip)); o+='</g>';
  o+=`<text x="${W-R-8}" y="${Tp+18}" font-size="12" text-anchor="end" fill="${curves[0].col}" font-weight="bold">${esc(fn)} · ${esc((CURVES[s.c]||{}).n||'')} · Is ${fx(s.is,2)} A · Dial ${fx(s.d,2)}${s.e50==='Sim'?` · inst. ${fx(s.i50,2)} A / ${fx(s.t50,2)} s`:''}</text>`;
  o+=`<text x="${W-R-8}" y="${Tp+34}" font-size="11" text-anchor="end" fill="${AX}">Tracejado: faixa de tolerância · ● aprovado  ✕ reprovado</text>`;
  return svgWrap(o,W,H); }
function chartDif(fn,rl){ const f=rl.funcs[fn], s=setVals(fn,f.set), T=tolOf(rl); if(!(s.idmin>0)) return '';
  const pts=[]; (f.rows.dif||[]).forEach(r=>{ const e=evDif(fn,s,r,T); const m=pn(r.idm); if(m!==null&&e.it!==undefined) pts.push({x:pn(r.ir),y:m,ok:e.st==='ok',tip:`Ir ${r.ir} pu: Id ${r.idm} pu`}); });
  const W=900,H=480,L=60,R=20,Tp=20,B=50; const xmax=Math.max(6,...pts.map(p=>p.x*1.1)); const ymax=Math.max(idop(s,xmax)*1.3,s.iinst>0&&s.iinst<idop(s,xmax)*3?s.iinst*1.15:0,...pts.map(p=>p.y*1.2),1);
  const X=v=>L+v/xmax*(W-L-R), Y=v=>H-B-v/ymax*(H-Tp-B);
  let o=`<rect x="${L}" y="${Tp}" width="${W-L-R}" height="${H-Tp-B}" fill="#fff" stroke="${GR2}"/>`;
  const sx=xmax<=8?1:2; for(let v=0;v<=xmax+1e-9;v+=sx){ o+=`<line x1="${X(v)}" x2="${X(v)}" y1="${Tp}" y2="${H-B}" stroke="${GR}"/><text x="${X(v)}" y="${H-B+16}" font-size="11" text-anchor="middle" fill="${AX}">${v}</text>`; }
  const sy=ymax<=2?0.25:ymax<=5?0.5:ymax<=10?1:2; for(let v=0;v<=ymax+1e-9;v+=sy){ o+=`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${GR}"/><text x="${L-6}" y="${Y(v)+4}" font-size="11" text-anchor="end" fill="${AX}">${v.toLocaleString('pt-BR')}</text>`; }
  const line=[]; for(let i=0;i<=200;i++){ const ir=xmax*i/200; line.push(`${i?'L':'M'}${X(ir).toFixed(1)} ${Y(idop(s,ir)).toFixed(1)}`); }
  o+=`<path d="${line.join(' ')} L${X(xmax)} ${Tp} L${X(0)} ${Tp} Z" fill="#FBE3E1" fill-opacity=".45"/>`;
  o+=`<path d="${line.join(' ')}" fill="none" stroke="${NAVY}" stroke-width="2.5"/>`;
  if(s.iinst>0&&s.iinst<ymax) o+=`<line x1="${L}" x2="${W-R}" y1="${Y(s.iinst)}" y2="${Y(s.iinst)}" stroke="${ORG}" stroke-width="2" stroke-dasharray="6 4"/><text x="${L+6}" y="${Y(s.iinst)-5}" font-size="11" fill="${ORG}" font-weight="bold">Id>> ${fx(s.iinst,2)} pu</text>`;
  o+=`<line x1="${X(s.knee)}" x2="${X(s.knee)}" y1="${Tp}" y2="${H-B}" stroke="${GR2}" stroke-dasharray="2 4"/>`;
  pts.forEach(p=>o+=mark(X(p.x),Y(p.y),p.ok,p.tip));
  o+=`<text x="${(L+W-R)/2}" y="${H-10}" font-size="12" text-anchor="middle" fill="${NAVY}" font-weight="bold">Corrente de restrição Ir (pu)</text>`;
  o+=`<text transform="translate(16 ${(Tp+H-B)/2}) rotate(-90)" font-size="12" text-anchor="middle" fill="${NAVY}" font-weight="bold">Corrente diferencial Id (pu)</text>`;
  o+=`<text x="${X(xmax*0.03)}" y="${Tp+18}" font-size="12" fill="#B3261E" font-weight="bold">Região de operação</text>`;
  o+=`<text x="${W-R-8}" y="${H-B-10}" font-size="12" text-anchor="end" fill="${NAVY}" font-weight="bold">${esc(fn)} · Id mín ${fx(s.idmin,2)} · k1 ${fx(s.s1,0)} % · quebra ${fx(s.knee,2)} · k2 ${fx(s.s2,0)} %</text>`;
  return svgWrap(o,W,H); }
function chartRX(fn,rl){ const f=rl.funcs[fn], s=setVals(fn,f.set), T=tolOf(rl); const zs=[1,2,3].map(n=>s['z'+n]).filter(z=>z>0); if(!zs.length) return '';
  const zmax=Math.max(...zs); const W=620,H=560,C=[W*0.38,H*0.72]; const sc=(H*0.62)/zmax;
  const X=r=>C[0]+r*sc, Y=x=>C[1]-x*sc; const th=s.ang*Math.PI/180;
  let o=`<rect x="0" y="0" width="${W}" height="${H}" fill="#fff" stroke="${GR2}"/>`;
  const step=zmax<=3?0.5:zmax<=8?1:zmax<=20?2:5;
  for(let v=-Math.ceil(C[0]/sc/step)*step;v<=(W-C[0])/sc;v+=step) o+=`<line x1="${X(v)}" x2="${X(v)}" y1="0" y2="${H}" stroke="${GR}"/>`;
  for(let v=-Math.ceil((H-C[1])/sc/step)*step;v<=C[1]/sc;v+=step) o+=`<line x1="0" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" stroke="${GR}"/>`;
  o+=`<line x1="0" x2="${W}" y1="${C[1]}" y2="${C[1]}" stroke="${AX}"/><line x1="${C[0]}" x2="${C[0]}" y1="0" y2="${H}" stroke="${AX}"/>`;
  o+=`<text x="${W-8}" y="${C[1]-6}" font-size="12" text-anchor="end" fill="${NAVY}" font-weight="bold">R (Ω)</text><text x="${C[0]+6}" y="14" font-size="12" fill="${NAVY}" font-weight="bold">X (Ω)</text>`;
  for(let v=step;v<=zmax*1.2;v+=step){ o+=`<text x="${C[0]-4}" y="${Y(v)+4}" font-size="10" text-anchor="end" fill="${AX}">${v.toLocaleString('pt-BR')}</text>`; }
  const cols=[NAVY,GRN,ORG];
  [1,2,3].forEach((n,i)=>{ const z=s['z'+n]; if(!(z>0)) return; const cx=z/2*Math.cos(th), cy=z/2*Math.sin(th);
    o+=`<circle cx="${X(cx)}" cy="${Y(cy)}" r="${z/2*sc}" fill="${cols[i]}" fill-opacity=".05" stroke="${cols[i]}" stroke-width="2"/>`;
    o+=`<text x="${X(z*Math.cos(th))+6}" y="${Y(z*Math.sin(th))-4}" font-size="12" fill="${cols[i]}" font-weight="bold">Z${n} ${fx(z,2)} Ω · ${fx(s['t'+n],2)} s</text>`; });
  o+=`<line x1="${C[0]}" y1="${C[1]}" x2="${X(zmax*1.15*Math.cos(th))}" y2="${Y(zmax*1.15*Math.sin(th))}" stroke="${AX}" stroke-dasharray="5 4"/>`;
  (f.rows.z||[]).forEach(r=>{ const e=evZ(fn,s,r,T); const zm=pn(r.zm), a=pn(r.ang); if(zm===null||a===null) return; const ar=a*Math.PI/180;
    o+=mark(X(zm*Math.cos(ar)),Y(zm*Math.sin(ar)),e.st!=='bad',`${r.zn} ${r.ph}: ${r.zm} Ω ∠${r.ang}°`); });
  o+=`<text x="10" y="${H-10}" font-size="11" fill="${AX}">Linha a ${fx(s.ang,0)}° · ● aprovado ✕ reprovado</text>`;
  return svgWrap(o,W,H); }
function chartOf(fn,rl){ const k=F[fn].chart; return k==='tc'?chartTC(fn,rl):k==='dif'?chartDif(fn,rl):k==='rx'?chartRX(fn,rl):''; }
function svgToPng(svg,w){ return new Promise(res=>{ const m=svg.match(/viewBox="0 0 (\d+) (\d+)"/); const W0=+m[1],H0=+m[2]; const k=w/W0;
  const img=new Image(); const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  img.onload=()=>{ const c=document.createElement('canvas'); c.width=W0*k; c.height=H0*k; const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url); res({data:c.toDataURL('image/png'),w:W0,h:H0}); };
  img.onerror=()=>{ URL.revokeObjectURL(url); res(null); }; img.src=url; }); }

/* ---------- seções por função ---------- */
const TBL={
 pk:{t:'Partida (pickup) e rearme',cols:['Elemento','Fase','Ajuste','Medido','Erro %','Rearme','Rearme/Pickup','Status',''],add:fn=>({el:Object.keys(F[fn].els)[0],ph:'',med:'',dr:''})},
 tm:{t:'Tempos de atuação',cols:['Elemento','Fase','Aplicado','Múltiplo','t teórico (s)','t medido (s)','Erro (ms)','Erro %','Status',''],add:fn=>({el:Object.keys(F[fn].els).find(k=>!F[fn].els[k].nt),ph:'',x:'',tm:''})},
 ang:{t:'Característica direcional (ângulo)',cols:['Limite','Fase','Esperado (°)','Medido (°)','Desvio (°)','Status']},
 dif:{t:'Característica diferencial (Id × Ir)',cols:['Ir (pu)','Id teórico (pu)','Id medido (pu)','Erro %','Status',''],add:()=>({ir:'',ph:'A',idm:''})},
 z:{t:'Alcance e tempo das zonas',cols:['Zona','Loop','Ângulo (°)','Z teórico (Ω)','Z medido (Ω)','Erro %','t ajuste (s)','t medido (s)','Status',''],add:()=>({zn:'Z1',ph:'A-N',ang:'',zm:'',tm:''})},
 chk:{t:'Verificações funcionais',cols:['Verificação','Resultado','Status']}};
function calc(fn,kind,r,s,T){ // retorna [{html}] para as colunas calculadas, por nome
  if(kind==='pk'){ const e=evPk(fn,s,r,T); return {aj:e.aj>0?fx(e.aj,3)+' '+(F[fn].els[r.el]||{}).u:'—',err:fx(e.err,2),rr:fx(e.rr,3),st:pill(e.st,e.lab||LAB[e.st])}; }
  if(kind==='tm'){ const e=evTm(fn,s,r,T); return {M:fx(e.M,2),tt:isFinite(e.tt)?fx(e.tt):'∞',ems:e.err!==undefined?fx(e.err*1000,0):'—',pct:fx(e.pct,2),st:pill(e.st,e.lab||LAB[e.st])}; }
  if(kind==='ang'){ const e=evAng(fn,s,r,T); return {exp:fx(e.exp,1),dev:fx(e.dev,1),st:pill(e.st,LAB[e.st])}; }
  if(kind==='dif'){ const e=evDif(fn,s,r,T); return {it:fx(e.it,3),err:fx(e.err,2),st:pill(e.st,LAB[e.st])}; }
  if(kind==='z'){ const e=evZ(fn,s,r,T); return {zt:fx(e.zt,3),err:fx(e.err,2),tt:fx(e.tt,3),st:pill(e.st,e.lab||LAB[e.st])}; }
  if(kind==='chk'){ const e=evChk(r); return {st:pill(e.st,e.lab)}; } }
const inp=(f,v)=>`<input data-f="${f}" value="${esc(v)}" ${DEC}>`;
const cc=(n)=>`<td class="c" data-cc="${n}"></td>`;
function rowHTML(fn,kind,r,i){ const X=`<td><button class="x" data-del="${i}" title="Excluir">✕</button></td>`;
  if(kind==='pk') return `<td><select data-f="el">${Object.keys(F[fn].els).map(k=>`<option ${k===r.el?'selected':''}>${esc(k)}</option>`).join('')}</select></td><td><input data-f="ph" value="${esc(r.ph)}" style="min-width:52px"></td>${cc('aj')}<td>${inp('med',r.med)}</td>${cc('err')}<td>${inp('dr',r.dr)}</td>${cc('rr')}<td data-cc="st"></td>${X}`;
  if(kind==='tm') return `<td><select data-f="el">${Object.keys(F[fn].els).filter(k=>!F[fn].els[k].nt||k===r.el).map(k=>`<option ${k===r.el?'selected':''}>${esc(k)}</option>`).join('')}</select></td><td><input data-f="ph" value="${esc(r.ph)}" style="min-width:52px"></td><td>${inp('x',r.x)}</td>${cc('M')}${cc('tt')}<td>${inp('tm',r.tm)}</td>${cc('ems')}${cc('pct')}<td data-cc="st"></td>${X}`;
  if(kind==='ang') return `<td>${esc(r.lab)}</td><td>${esc(r.ph)}</td>${cc('exp')}<td>${inp('med',r.med)}</td>${cc('dev')}<td data-cc="st"></td>`;
  if(kind==='dif') return `<td>${inp('ir',r.ir)}</td>${cc('it')}<td>${inp('idm',r.idm)}</td>${cc('err')}<td data-cc="st"></td>${X}`;
  if(kind==='z') return `<td><select data-f="zn">${['Z1','Z2','Z3'].map(z=>`<option ${z===r.zn?'selected':''}>${z}</option>`).join('')}</select></td><td><input data-f="ph" value="${esc(r.ph)}" style="min-width:60px"></td><td>${inp('ang',r.ang)}</td>${cc('zt')}<td>${inp('zm',r.zm)}</td>${cc('err')}${cc('tt')}<td>${inp('tm',r.tm)}</td><td data-cc="st"></td>${X}`;
  if(kind==='chk') return `<td style="text-align:left;white-space:normal;min-width:200px">${esc(r.lab)}</td><td><div class="seg" style="justify-content:center">${['C','NC','NA'].map(v=>`<button data-v="${v}" class="${r.res===v?'on s-'+v:''}">${v}</button>`).join('')}</div></td><td data-cc="st"></td>`; }
function renderFuncs(){ const r=RE; const box=document.getElementById('ansiFuncs'); if(!box) return; box.innerHTML='';
  ORDER.filter(fn=>r.funcs[fn]&&r.funcs[fn].on).forEach(fn=>{ const f=r.funcs[fn], D=F[fn]; const id='fn-'+fn.replace(/\W/g,'_');
    const sec=document.createElement('div'); sec.id=id;
    let h=`<div class="sec"><span>ANSI ${esc(fn)} · ${esc(D.nome)}</span><span data-fp></span></div><div class="card">`;
    h+=`<div class="tt">Ajustes (valores secundários)</div><div class="grid" data-set>${D.set.map(([k,l,t,,opts])=>t==='curve'?sel(k,l,f.set,Object.keys(CURVES).map(c=>[c,CURVES[c].n])):t==='sel'?sel(k,l,f.set,opts):field(k,l,f.set,'text','',DEC)).join('')}</div>`;
    if(D.note) h+=`<div class="note" style="margin-top:8px">${esc(D.note)}</div>`;
    for(const kind of ['pk','tm','ang','dif','z','chk']){ const rows=f.rows[kind]||[]; if(!rows.length&&!(TBL[kind].add&&((kind==='pk'||kind==='tm')&&Object.keys(D.els).length))) continue;
      h+=`<div class="tt"><span>${TBL[kind].t}</span>${TBL[kind].add?`<button class="btn ghost sm" data-add="${kind}">+ Linha</button>`:''}</div>
      <div class="tw"><table><thead><tr>${TBL[kind].cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody data-kind="${kind}">${rows.map((x,i)=>`<tr data-i="${i}">${rowHTML(fn,kind,x,i)}</tr>`).join('')}</tbody></table></div>`; }
    if(D.chart) h+=`<div class="tt">Gráfico da característica</div><div class="chart" data-chart></div>`;
    h+=`<div class="row" style="margin-top:10px"><button class="btn ghost sm" data-reset>Recalcular pontos padrão</button></div></div>`;
    sec.innerHTML=h; box.appendChild(sec);
    // eventos
    sec.querySelectorAll('[data-set] [data-k]').forEach(el=>{ const fnc=()=>{ f.set[el.dataset.k]=el.value; saveCur(); if(el.tagName==='SELECT') renderFuncsKeep(fn); else refreshFunc(fn); }; el.oninput=fnc; el.onchange=fnc; });
    sec.querySelectorAll('tbody').forEach(tb=>{ const kind=tb.dataset.kind;
      tb.querySelectorAll('tr').forEach(tr=>{ const i=+tr.dataset.i, row=f.rows[kind][i];
        tr.querySelectorAll('[data-f]').forEach(el=>{ const fnc=()=>{ row[el.dataset.f]=el.value; saveCur(); refreshFunc(fn); }; el.oninput=fnc; el.onchange=fnc; });
        tr.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{ row.res=row.res===b.dataset.v?'':b.dataset.v; saveCur(); tr.querySelectorAll('.seg button').forEach(x=>x.className=row.res===x.dataset.v?'on s-'+x.dataset.v:''); refreshFunc(fn); });
        const del=tr.querySelector('[data-del]'); if(del) del.onclick=()=>{ f.rows[kind].splice(i,1); saveCur(); renderFuncsKeep(fn); }; }); });
    sec.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{ const k=b.dataset.add; (f.rows[k]=f.rows[k]||[]).push(TBL[k].add(fn)); saveCur(); renderFuncsKeep(fn); });
    sec.querySelector('[data-reset]').onclick=()=>confirmBox(`Recriar os pontos de ensaio da função ${fn} a partir dos ajustes? As medições digitadas nesta função serão apagadas.`,()=>{ f.rows=fillRows(D.def(setVals(fn,f.set))); saveCur(); renderFuncsKeep(fn); });
    refreshFunc(fn); }); }
function renderFuncsKeep(fn){ const y=window.scrollY; renderFuncs(); window.scrollTo(0,y); REFRESH(); }
function refreshFunc(fn){ const r=RE, f=r.funcs[fn]; const sec=document.getElementById('fn-'+fn.replace(/\W/g,'_')); if(!sec) return;
  const s=setVals(fn,f.set), T=tolOf(r);
  sec.querySelectorAll('tbody').forEach(tb=>{ const kind=tb.dataset.kind; tb.querySelectorAll('tr').forEach(tr=>{ const row=f.rows[kind][+tr.dataset.i]; const c=calc(fn,kind,row,s,T);
    tr.querySelectorAll('[data-cc]').forEach(td=>{ td.innerHTML=c[td.dataset.cc]??'—'; }); }); });
  const ch=sec.querySelector('[data-chart]'); if(ch) ch.innerHTML=chartOf(fn,r)||'<div class="note">Preencha os ajustes para desenhar a curva.</div>';
  const st=funcStats(r,fn); const k=st.bad?'bad':st.pend?'pend':'ok'; sec.querySelector('[data-fp]').innerHTML=pill(k,st.bad?`${st.bad} reprovado(s)`:st.pend?`${st.pend} pendente(s)`:'Aprovado');
  REFRESH(); }


/* ---------- integração com a ficha do equipamento (tipo RP) ---------- */
function ansiOf(e){ e.ansi=e.ansi||{funcs:{},tol:Object.assign({},DEFTOL)}; e.ansi.funcs=e.ansi.funcs||{}; e.ansi.tol=e.ansi.tol||Object.assign({},DEFTOL); return e.ansi; }
const fnsOn=a=>ORDER.filter(fn=>a.funcs[fn]&&a.funcs[fn].on);
const RP_EXT={
  slots:['pdesenho'],
  novo(it,base){ it.pdesenho=[]; it.ansi={funcs:{},tol:Object.assign({},DEFTOL)};
    if(base&&base.ansi){ const a=JSON.parse(JSON.stringify(base.ansi)); Object.values(a.funcs||{}).forEach(f=>{ ['pk','tm','ang','dif','z'].forEach(k=>(f.rows[k]||[]).forEach(x=>{ x.med='';x.dr='';x.tm='';x.idm='';x.zm=''; })); (f.rows.chk||[]).forEach(x=>x.res=''); }); it.ansi=a; } },
  html(e){ const a=ansiOf(e);
    return `<div class="ansi"><div class="sec">Desenho do equipamento sob teste</div>
    <div class="card"><div class="note">Diagrama unifilar/trifilar, esquema de ligação da mala de ensaio ou foto da placa do relé.</div><div class="row">${photoBtns('data-slot="pdesenho"')}</div><div class="thumbs" id="th_pdesenho"></div></div>
    <div class="sec">Funções de proteção habilitadas (ANSI)</div>
    <div class="card"><div class="chips" id="ansiChips">${ORDER.map(fn=>`<button class="chip ${a.funcs[fn]&&a.funcs[fn].on?'on':''}" data-fn="${fn}"><b>${fn}</b><span>${esc(F[fn].nome)}</span></button>`).join('')}</div>
     <div class="note" style="margin-top:8px">Toque para habilitar ou desabilitar. Para cada função habilitada aparecem os ajustes, a planilha de ensaios e o gráfico da característica.</div></div>
    <div class="sec">Tolerâncias de aceitação dos ensaios</div>
    <div class="card" id="ansiTol"><div class="grid">
     ${field('tp','Tempo (%)',a.tol,'text','',DEC)}${field('tms','Tempo mínimo (ms)',a.tol,'text','',DEC)}${field('pk','Pickup / diferencial (%)',a.tol,'text','',DEC)}
     ${field('ang','Ângulo (°)',a.tol,'text','',DEC)}${field('z','Impedância (%)',a.tol,'text','',DEC)}
    </div><div class="note">Tempo aprovado se |t medido − t teórico| ≤ maior entre (% × t teórico) e o mínimo em ms. Os dados do fabricante prevalecem.</div></div>
    <div id="ansiFuncs"></div></div>`; },
  bind(e,refresh){ RE=ansiOf(e); REFRESH=refresh||(()=>{});
    const tol=document.getElementById('ansiTol'); if(tol) bindFields(tol,RE.tol,()=>fnsOn(RE).forEach(refreshFunc));
    document.querySelectorAll('#ansiChips .chip').forEach(b=>b.onclick=()=>{ const fn=b.dataset.fn; if(!RE.funcs[fn]) RE.funcs[fn]=newFunc(fn); else RE.funcs[fn].on=!RE.funcs[fn].on;
      b.classList.toggle('on',RE.funcs[fn].on); saveCur(); renderFuncs(); REFRESH();
      if(RE.funcs[fn].on){ const el=document.getElementById('fn-'+fn.replace(/\W/g,'_')); el&&el.scrollIntoView({behavior:'smooth',block:'start'}); } });
    renderFuncs(); },
  async pdf(K,e,y){ const a=ansiOf(e); const {doc,W,M,INK}=K; const T=tolOf(a); const fns=fnsOn(a);
    const C_OK=C_RES.ok, C_NC=C_RES.nc, C_PD=C_RES.pend;
    const stc=c=>{ if(c.section!=='body') return; const t=String(c.cell.raw??''); if(/^(Aprovado|Conforme)$/.test(t)) c.cell.styles.textColor=C_OK; else if(/^(Reprovado|Não conforme)$/.test(t)) c.cell.styles.textColor=C_NC; else if(/^(Pendente)$/.test(t)) c.cell.styles.textColor=C_PD; if(c.column.index===c.table.columns.length-1) c.cell.styles.fontStyle='bold'; };
    const ST={fontSize:7.4,cellPadding:1.2,lineColor:C_LINE,lineWidth:.2,textColor:INK,halign:'center',valign:'middle'};
    const tb=(head,body)=>K.tbl({startY:y,head:[head],body,styles:ST,headStyles:{fillColor:[19,36,74],textColor:255,halign:'center',fontStyle:'bold'},didParseCell:stc});
    const tit=t=>{ y=K.ensure(y,22); y=K.para(t,y,{bold:true,size:9.5,color:C_NAVY}); };
    const des=(e.pdesenho||[])[0];
    if(des){ y=K.ensure(y,105); tit('Desenho do equipamento sob teste'); await K.foto(des,M,y,W-2*M,92,'Desenho do equipamento sob teste'); y+=100; }
    if(!fns.length) return y;
    tit(`Ensaios por injeção secundária – tolerâncias: tempo ${T.tp} % ou ${T.tms} ms · pickup ${T.pk} % · ângulo ${T.ang}° · impedância ${T.z} %`);
    for(const fn of fns){ const f=a.funcs[fn], D=F[fn], s=setVals(fn,f.set), st=funcStats(a,fn);
      y=K.ensure(y,40); tit(`ANSI ${fn} – ${D.nome}  ·  ${st.bad?st.bad+' reprovado(s)':st.pend?st.pend+' pendente(s)':'aprovado'}`);
      const sp=D.set.map(([k,l,t])=>[l,t==='curve'?(CURVES[f.set[k]]||{}).n:String(f.set[k]??'')]); const kv=[]; for(let i=0;i<sp.length;i+=2) kv.push([sp[i][0],sp[i][1]||'—',(sp[i+1]||[])[0]||'',(sp[i+1]||[])[1]||'']);
      y=K.tbl({startY:y,body:kv,styles:Object.assign({},ST,{halign:'left'}),columnStyles:{0:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:44},2:{fontStyle:'bold',fillColor:C_BG,textColor:C_NAVY,cellWidth:44}}});
      const R=f.rows;
      if((R.pk||[]).length) y=tb(['Partida','Fase','Ajuste','Medido','Erro %','Rearme','Rearme/Pickup','Status'],R.pk.map(x=>{ const v=evPk(fn,s,x,T); return [x.el,x.ph,v.aj>0?fx(v.aj,3)+' '+(D.els[x.el]||{}).u:'—',x.med||'—',fx(v.err,2),x.dr||'—',fx(v.rr,3),v.lab||LAB[v.st]]; }));
      if((R.tm||[]).length) y=tb(['Tempo','Fase','Aplicado','Múltiplo','t teórico (s)','t medido (s)','Erro (ms)','Erro %','Status'],R.tm.map(x=>{ const v=evTm(fn,s,x,T); return [x.el,x.ph,(x.x||'—')+' '+((D.els[x.el]||{}).u||''),fx(v.M,2),isFinite(v.tt)?fx(v.tt):'∞',x.tm||'—',v.err!==undefined?fx(v.err*1000,0):'—',fx(v.pct,2),v.lab||LAB[v.st]]; }));
      if((R.ang||[]).length) y=tb(['Limite direcional','Fase','Esperado (°)','Medido (°)','Desvio (°)','Status'],R.ang.map(x=>{ const v=evAng(fn,s,x,T); return [x.lab,x.ph,fx(v.exp,1),x.med||'—',fx(v.dev,1),LAB[v.st]]; }));
      if((R.dif||[]).length) y=tb(['Ir (pu)','Id teórico (pu)','Id medido (pu)','Erro %','Status'],R.dif.map(x=>{ const v=evDif(fn,s,x,T); return [x.ir,fx(v.it,3),x.idm||'—',fx(v.err,2),LAB[v.st]]; }));
      if((R.z||[]).length) y=tb(['Zona','Loop','Ângulo (°)','Z teórico (Ω)','Z medido (Ω)','Erro %','t ajuste (s)','t medido (s)','Status'],R.z.map(x=>{ const v=evZ(fn,s,x,T); return [x.zn,x.ph,x.ang,fx(v.zt,3),x.zm||'—',fx(v.err,2),fx(v.tt,3),x.tm||'—',v.lab||LAB[v.st]]; }));
      if((R.chk||[]).length) y=tb(['Verificação funcional','Resultado'],R.chk.map(x=>[x.lab,evChk(x).lab]));
      const svg=D.chart?chartOf(fn,a):''; if(svg){ const png=await svgToPng(svg,1400); if(png){ const w=W-2*M, hh=Math.min(D.chart==='rx'?110:95,w*png.h/png.w), ww=hh*png.w/png.h; y=K.ensure(y,hh+6);
        try{ doc.addImage(png.data,'PNG',(W-ww)/2,y,ww,hh); }catch(err){} y+=hh+5; } } }
    return y; },
  excelRows(e){ const a=ansiOf(e), T=tolOf(a), out=[]; const S=v=>v==='ok'?'ok':v==='bad'?'nc':null;
    for(const fn of fnsOn(a)){ const f=a.funcs[fn], D=F[fn], s=setVals(fn,f.set);
      out.push([`ANSI ${fn} – ajustes`,D.set.map(([k,l,t])=>`${l}: ${t==='curve'?(CURVES[f.set[k]]||{}).n:f.set[k]}`).join(' · '),'','',null]);
      (f.rows.pk||[]).forEach(x=>{ const v=evPk(fn,s,x,T); out.push([`ANSI ${fn} – partida ${x.el} ${x.ph}`,x.med||'',v.aj>0?`ajuste ${fx(v.aj,3)} ${(D.els[x.el]||{}).u} ± ${T.pk} %`:'',v.lab||LAB[v.st],S(v.st)]); });
      (f.rows.tm||[]).forEach(x=>{ const v=evTm(fn,s,x,T); out.push([`ANSI ${fn} – tempo ${x.el} ${x.ph} @ ${x.x} ${(D.els[x.el]||{}).u||''}`,x.tm?x.tm+' s':'',isFinite(v.tt)?`${fx(v.tt)} s ± máx(${T.tp} %; ${T.tms} ms)`:'não opera',v.lab||LAB[v.st],S(v.st)]); });
      (f.rows.ang||[]).forEach(x=>{ const v=evAng(fn,s,x,T); out.push([`ANSI ${fn} – ${x.lab}`,x.med?x.med+'°':'',`${fx(v.exp,1)}° ± ${T.ang}°`,LAB[v.st],S(v.st)]); });
      (f.rows.dif||[]).forEach(x=>{ const v=evDif(fn,s,x,T); out.push([`ANSI ${fn} – Id @ Ir ${x.ir} pu`,x.idm?x.idm+' pu':'',`${fx(v.it,3)} pu ± ${T.pk} %`,LAB[v.st],S(v.st)]); });
      (f.rows.z||[]).forEach(x=>{ const v=evZ(fn,s,x,T); out.push([`ANSI ${fn} – ${x.zn} ${x.ph} @ ${x.ang}°`,[x.zm&&x.zm+' Ω',x.tm&&x.tm+' s'].filter(Boolean).join(' / '),`${fx(v.zt,3)} Ω ± ${T.z} % / ${fx(v.tt,3)} s`,v.lab||LAB[v.st],S(v.st)]); });
      (f.rows.chk||[]).forEach(x=>{ const v=evChk(x); out.push([`ANSI ${fn} – ${x.lab}`,v.lab,'',v.lab,S(v.st)]); }); }
    return out; },
};
function avaliarRP(e){ const a=ansiOf(e), out=[];
  for(const fn of fnsOn(a)){ const c=funcStats(a,fn), tot=c.ok+c.bad+c.pend;
    out.push({label:`ANSI ${fn} – ${F[fn].nome}`, val:`${c.ok}/${tot} aprovados`+(c.pend?` · ${c.pend} pendente(s)`:''), lim:'todos os pontos na tolerância', st:c.bad?'nc':(c.pend||!tot)?null:'ok'}); }
  return out; }

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
TIPOS.RP={nome:'Relé de proteção (ensaio por injeção)', grupo:'Proteção', icone:'🎛️', ext:RP_EXT,
  campos:[['circuito','Circuito protegido','','Ex.: Entrada 13,8 kV'],['fw','Firmware'],['vaux','Tensão auxiliar (Vcc)'],['rtc','RTC fase (A/A)'],['rtcn','RTC neutro (A/A)'],['rtp','RTP (V/V)'],['freq','Frequência (Hz)',['60','50']],['estudo','Estudo de seletividade (ref. / revisão)'],['mala','Mala de ensaio (modelo / série)']],
  items:[
   ['fis','Estado físico do relé, caixa e IHM','Fabricante','C'],
   ['fix','Fixação, aterramento e identificação (TAG)','NBR 14039','B'],
   ['vaux','Alimentação auxiliar dentro da faixa do fabricante','Fabricante','A'],
   ['diag','LEDs, display e autodiagnóstico (watchdog) sem alarmes','Fabricante','A'],
   ['hora','Data/hora e sincronismo de tempo','Fabricante','C'],
   ['born','Bornes e fiação apertados, sem sinais de aquecimento','NETA MTS','B'],
   ['tctp','Circuitos de TC (sem abertura) e de TP (fusíveis) – polaridade e aterramento','NBR 14039 / NETA MTS','A'],
   ['ed','Entradas digitais (52a/52b, bloqueios, seletividade lógica)','NETA MTS','B'],
   ['sd','Saídas de trip e alarme','NETA MTS','A'],
   ['trip','Atuação real sobre o disjuntor (trip test)','NETA MTS','A'],
   ['oscilo','Registro de eventos e oscilografia funcionando','Fabricante','C'],
   ['ajust','Ajustes conferidos com o estudo de seletividade vigente','Estudo de proteção','A'],
   ['backup','Arquivo de ajustes salvo (backup) e entregue ao cliente','NR-10 – prontuário','C'],
  ],
  meds:[
   {g:'Teste de trip real (relé + disjuntor)', f:[['t_trip','Tempo total de abertura medido (ms)'],['t_ref','Tempo esperado (ms)']], note:'Tempo medido até 10 % acima do esperado: conforme. Os ensaios das funções ANSI ficam na seção abaixo.'},
  ]};
const TIPOS_ORD=['TR','DJ','SC','PR','TI','BM','QB','RP','PC','AT','CG'];
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
  if(e.tipo==='RP'){
    const t=v('t_trip'), tr=v('t_ref'); if(t!==null) add('Tempo de trip real (relé + disjuntor)',t,'ms',tr!==null?{st:t<=tr*1.1?'ok':t<=tr*1.3?'att':'nc',lim:'≤ '+fmtN(tr*1.1)+' ms'}:null);
    avaliarRP(e).forEach(x=>out.push(x));
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
  ['IEC 60255-151 / IEEE C37.112', 'Relés de proteção – características de sobrecorrente de tempo inverso'],
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
  ['Relés – partida','Erro do pickup em relação ao ajuste ≤ tolerância de partida (padrão 5 %).'],
  ['Relés – tempo','|t medido − t teórico| ≤ maior entre 5 % e 40 ms (curvas IEC 60255-151 / IEEE C37.112 e tempo definido).'],
  ['Relés – direcional e diferencial','67/67N: limites em MTA ± 90° com ± 3°; 87T/87G: Id da característica com ± 5 % ou 0,02 pu; 21: alcance mho ± 5 %.'],
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

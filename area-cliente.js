/* ======================= ÁREA DO CLIENTE (site XPA – Locaweb) =======================
   Publica o PDF gerado pelo app direto na Área do Cliente (banco MySQL da Locaweb),
   na empresa escolhida, com aviso por e-mail opcional.
   - Configuração (endereço da API e chave) fica só neste aparelho (localStorage).
   - Sem internet, o envio entra numa fila (IndexedDB) e sai sozinho quando a conexão voltar.
   Depende de: $, esc, toast, today (index.html) e do modal #modal/#mbox. */
(function(){
const CFG_KEY='xpa_area_cliente', CACHE_EMP='xpa_area_cliente_empresas', URL_PADRAO='https://www.xpaengenharia.com.br/cliente/api.php';
const TIPOS={ensaio:'Relatório de ensaios', manutencao:'Relatório de manutenção', preditiva:'Inspeção preditiva', laudo:'Laudo', estudo:'Estudo técnico', art:'ART', certificado:'Certificado de calibração', outro:'Outro'};
const cfg=()=>{ try{ return JSON.parse(localStorage.getItem(CFG_KEY)||'{}'); }catch(e){ return {}; } };
const setCfg=(c)=>localStorage.setItem(CFG_KEY,JSON.stringify(c));
const empCache=()=>{ try{ return JSON.parse(localStorage.getItem(CACHE_EMP)||'[]'); }catch(e){ return []; } };
const modal=(html)=>{ $('#mbox').innerHTML=html; $('#modal').classList.add('show'); };
const fechar=()=>$('#modal').classList.remove('show');

async function api(acao, opts={}){
  const c=cfg(); if(!c.chave) throw new Error('Configure a chave do aplicativo.');
  const r=await fetch((c.url||URL_PADRAO)+'?acao='+acao,{method:opts.body?'POST':'GET', headers:{'X-XPA-Chave':c.chave}, body:opts.body, cache:'no-store'});
  let j=null; try{ j=await r.json(); }catch(e){}
  if(!r.ok||!j||!j.ok){ const err=new Error((j&&j.erro)||('Erro '+r.status+' no servidor')); err.status=r.status; throw err; }
  return j;
}
async function carregarEmpresas(){
  const j=await api('empresas'); localStorage.setItem(CACHE_EMP,JSON.stringify(j.empresas)); return j.empresas;
}

/* ---------- fila offline (IndexedDB) ---------- */
const DB='xpa_area_cliente_fila';
function idb(){ return new Promise((ok,no)=>{ const q=indexedDB.open(DB,1); q.onupgradeneeded=()=>q.result.createObjectStore('fila',{keyPath:'id'}); q.onsuccess=()=>ok(q.result); q.onerror=()=>no(q.error); }); }
async function filaOp(modo,fn){ const db=await idb(); return new Promise((ok,no)=>{ const t=db.transaction('fila',modo); const st=t.objectStore('fila'); const r=fn(st); t.oncomplete=()=>ok(r&&r.result); t.onerror=()=>no(t.error); }); }
const filaAdd=(it)=>filaOp('readwrite',st=>st.put(it));
const filaDel=(id)=>filaOp('readwrite',st=>st.delete(id));
const filaTodos=()=>filaOp('readonly',st=>st.getAll());

function montarForm(it){ const fd=new FormData();
  ['empresa_id','tipo','titulo','data_servico','equipamento','unidade'].forEach(k=>fd.append(k,it[k]||''));
  fd.append('avisar',it.avisar?'1':'0'); fd.append('id_app',it.id); fd.append('arquivo',it.blob,it.filename); return fd; }
async function enviar(it){ return api('publicar',{body:montarForm(it)}); }

let enviando=false;
async function processarFila(silencioso, forcar){
  if(enviando||!navigator.onLine||!cfg().chave) return; enviando=true;
  try{ const itens=await filaTodos(); let n=0;
    for(const it of itens){
      if(it.erro&&!forcar) continue; /* recusado pelo servidor: só reenvia quando pedido (XPA_AREA_CLIENTE.enviarFila) */
      try{ await enviar(it); await filaDel(it.id); n++; }
      catch(e){
        if(e.status&&e.status>=400&&e.status<500&&e.status!==429){ it.erro=e.message; await filaAdd(it);
          if(!silencioso) toast('Envio da fila recusado: '+e.message);
          if(e.status===401) break; /* chave inválida: parar para não bloquear o IP */ }
        else break; /* sem conexão ou servidor fora: tenta de novo mais tarde */ } }
    if(n&&!silencioso) toast(n+' relatório(s) da fila publicado(s) na Área do Cliente.');
  } catch(e){} finally{ enviando=false; }
}
window.addEventListener('online',()=>processarFila());
setTimeout(()=>processarFila(),5000);
setInterval(()=>processarFila(true),60000);

/* ---------- telas ---------- */
function telaConfig(depois){
  const c=cfg();
  modal(`<p style="margin-top:0;font-weight:bold;color:var(--navy)">Área do Cliente – configurar</p>
  <p class="note" style="margin-top:0">Crie a chave no site: Área do Cliente &gt; Painel XPA &gt; <b>Chaves do app XPA Inspeções</b>. Cada aparelho usa a sua.</p>
  <label class="note">Endereço da API</label><input id="acUrl" value="${esc(c.url||URL_PADRAO)}" style="width:100%;margin-bottom:8px">
  <label class="note">Chave do aplicativo</label><input id="acChave" value="${esc(c.chave||'')}" placeholder="xpa_…" style="width:100%" autocomplete="off">
  <div id="acMsg" class="note" style="min-height:18px;margin-top:6px"></div>
  <div class="row" style="justify-content:flex-end;gap:8px"><button id="acCan">Cancelar</button><button class="btn gold" id="acOk">Salvar e testar</button></div>`);
  $('#acCan').onclick=fechar;
  $('#acOk').onclick=async()=>{ const url=$('#acUrl').value.trim()||URL_PADRAO, chave=$('#acChave').value.trim();
    setCfg({url,chave}); $('#acMsg').textContent='Testando…';
    try{ const j=await api('status'); await carregarEmpresas(); $('#acMsg').textContent='Conectado ('+j.chave+').'; toast('Área do Cliente configurada.'); processarFila(false,true); setTimeout(()=>{ fechar(); if(depois) depois(); },600); }
    catch(e){ $('#acMsg').textContent='Não conectou: '+e.message; } };
}

function tipoPadrao(nome){ const s=(nome||'').toLowerCase();
  if(/termogr|ultrass|preditiv/.test(s)) return 'preditiva';
  if(/laudo|spda|nr-?10/.test(s)) return 'laudo';
  if(/ensaio|vlf|epi|tangente/.test(s)) return 'ensaio';
  if(/estudo/.test(s)) return 'estudo';
  if(/manuten|inspe|gerador|motor|subesta|visita/.test(s)) return 'manutencao';
  return 'outro'; }
const norm=(s)=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function empresaProvavel(lista, cliente){ const c=norm(cliente); if(!c) return '';
  const p=lista.find(e=>norm(e.nome)===c)||lista.find(e=>norm(e.nome).includes(c)||c.includes(norm(e.nome)));
  if(p) return p.id; const w=c.split(' ').filter(x=>x.length>3);
  const q=lista.find(e=>w.some(x=>norm(e.nome).includes(x))); return q?q.id:''; }

async function telaEnviar(filename, blob){
  if(!cfg().chave){ telaConfig(()=>telaEnviar(filename,blob)); return; }
  const info=window.XPA_PDF_INFO||{}; const h=info.h||{};
  let lista=empCache();
  modal(`<p style="margin-top:0;font-weight:bold;color:var(--navy)">Publicar na Área do Cliente</p>
  <p class="note" style="margin-top:0;word-break:break-all">${esc(filename)}</p>
  <label class="note">Empresa cliente</label><select id="acEmp" style="width:100%;margin-bottom:8px"></select>
  <label class="note">Tipo de documento</label><select id="acTipo" style="width:100%;margin-bottom:8px">${Object.entries(TIPOS).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select>
  <label class="note">Título (como o cliente vê)</label><input id="acTit" style="width:100%;margin-bottom:8px">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div><label class="note">Data do serviço</label><input id="acData" type="date" style="width:100%"></div>
    <div><label class="note">Unidade</label><input id="acUni" style="width:100%"></div></div>
  <label class="note">Equipamento / área (opcional)</label><input id="acEq" style="width:100%;margin-bottom:8px">
  <label style="display:flex;gap:8px;align-items:center;font-size:13px"><input type="checkbox" id="acAv" checked> Avisar os usuários da empresa por e-mail</label>
  <div id="acMsg" class="note" style="min-height:18px;margin-top:6px"></div>
  <div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><button id="acCfg">⚙️ Configurar</button>
    <span style="display:flex;gap:8px"><button id="acCan">Cancelar</button><button class="btn gold" id="acOk">🌐 Publicar</button></span></div>`);
  const preencher=()=>{ const sel=$('#acEmp'); const atual=sel.value;
    sel.innerHTML='<option value="">— escolha —</option>'+lista.map(e=>`<option value="${e.id}">${esc(e.nome)}${e.acessos?'':' (sem acessos)'}</option>`).join('');
    sel.value=atual||empresaProvavel(lista,h.cliente)||''; };
  preencher();
  $('#acTipo').value=tipoPadrao((info.titulo||'')+' '+filename);
  $('#acTit').value=[h.numero, info.titulo].filter(Boolean).join(' – ')||filename.replace(/\.pdf$/i,'').replace(/_/g,' ');
  $('#acData').value=/^\d{4}-\d{2}-\d{2}$/.test(h.data||'')?h.data:today();
  $('#acUni').value=h.local||'';
  $('#acCan').onclick=fechar; $('#acCfg').onclick=()=>telaConfig(()=>telaEnviar(filename,blob));
  if(navigator.onLine) carregarEmpresas().then(l=>{ lista=l; preencher(); }).catch(e=>{ if(!lista.length) $('#acMsg').textContent='Não foi possível carregar as empresas: '+e.message; });
  else if(!lista.length) $('#acMsg').textContent='Sem internet e sem lista de empresas salva. Abra esta tela uma vez com internet.';
  $('#acOk').onclick=async()=>{
    const it={ id:'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,8), filename, blob,
      empresa_id:$('#acEmp').value, tipo:$('#acTipo').value, titulo:$('#acTit').value.trim(), data_servico:$('#acData').value,
      equipamento:$('#acEq').value.trim(), unidade:$('#acUni').value.trim(), avisar:$('#acAv').checked, criado:Date.now() };
    if(!it.empresa_id){ $('#acMsg').textContent='Escolha a empresa cliente.'; return; }
    it.empresa_nome=(lista.find(e=>String(e.id)===String(it.empresa_id))||{}).nome||'';
    const b=$('#acOk'); b.disabled=true; b.textContent='Enviando…';
    if(!navigator.onLine){ await filaAdd(it); fechar(); toast('Sem internet: o relatório será publicado quando a conexão voltar.'); return; }
    try{ const j=await enviar(it); fechar(); toast(j.mensagem||'Relatório publicado na Área do Cliente.'); }
    catch(e){ if(!e.status||e.status>=500||e.status===429){ await filaAdd(it); fechar(); toast('Falha de conexão: o envio ficou na fila e será repetido automaticamente.'); }
      else{ b.disabled=false; b.textContent='🌐 Publicar'; $('#acMsg').textContent='Não publicado: '+e.message; } }
  };
}

/* ---------- integra no "Arquivo pronto" de todos os módulos ---------- */
const original=window.saveFile;
if(typeof original==='function'){
  window.saveFile=async function(filename, data){
    const r=await original.apply(this,arguments);
    if(/\.pdf$/i.test(filename)&&$('#modal').classList.contains('show')&&$('#fNo')){
      const blob=data instanceof Blob?data:new Blob([data],{type:'application/pdf'});
      const btn=document.createElement('button'); btn.className='btn'; btn.id='fArea'; btn.textContent='🌐 Publicar na Área do Cliente';
      $('#fNo').parentNode.insertBefore(btn,$('#fNo')); btn.onclick=()=>telaEnviar(filename,blob);
    }
    return r;
  };
}
window.XPA_AREA_CLIENTE={configurar:(depois)=>telaConfig(depois), fila:filaTodos, enviarFila:()=>processarFila(false,true), api, temChave:()=>!!cfg().chave};
})();

// Host bridge only. Animation, interaction, timing and physics live in upstream code.
function mountChaoxingClawd(host) {
  const outer = host.shadowRoot, doc = host.ownerDocument, win = doc.defaultView;
  const panel = outer?.getElementById('panel');
  if (!panel || !chaoxingClawdPanelVisible(host,panel) || outer.getElementById('cx-clawd-host')) return null;
  const anchor = doc.createElement('div');
  anchor.id = 'cx-clawd-host';
  anchor.style.cssText = 'position:absolute;left:16px;right:16px;top:0;height:1px;z-index:8;pointer-events:none;overflow:visible';
  const root = anchor.attachShadow({mode:'open'});
  const surface = doc.createElement('div');
  surface.className = 'cx-clawd-surface clawd-interactive-ready';
  surface.dataset.claudeEnabled = 'on';
  surface.dataset.claudeClawd = 'on';
  surface.dataset.claudeMotion = 'on';
  surface.innerHTML = '<div id="sheld"><div id="send_form" aria-label="Clawd 小精灵"></div><div id="chat" hidden><div class="mes last_mes" is_user="false"><span class="mes_text"></span></div></div></div>';
  const bridgeStyle = doc.createElement('style');
  bridgeStyle.textContent = ':host{display:block;overflow:visible;--cl-clawd-eye:#241d18;--clr-ink:#6f655b;--clawd-pile-ink:#6f655b} .cx-clawd-surface{position:relative;width:100%;height:1px;overflow:visible;pointer-events:none} #sheld{position:relative;height:1px;width:100%;overflow:visible} #send_form{position:relative;width:100%;height:1px;min-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:visible;background:transparent!important;box-shadow:none!important} #send_form>button.clawd-signoff-button.clawd-composer-clawd{position:absolute!important;left:16px!important;right:auto!important;top:auto!important;bottom:0!important;width:48px!important;height:40px!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;pointer-events:auto!important;touch-action:none;cursor:grab;overflow:visible!important} #send_form>button:active{cursor:grabbing} #chat[hidden]{display:none!important} @media(prefers-color-scheme:dark){:host{--clr-ink:#c6bcad;--clawd-pile-ink:#c6bcad}}';
  root.append(bridgeStyle,surface); outer.append(anchor);

  let activeBox = null, disposed = false, frame = 0, lastBusy = false, startedText = '', startedError = '', stopRequested = false, readingHost = null, outputDirty = true, cachedOutput = '', lastOutputNode = null;
  const proxies = new WeakMap(), readingRows = new WeakMap(), listeners = [];
  const output = () => outer.getElementById('output');
  const outputText = () => output()?.textContent || '';
  function writable(node) {
    return node && (node.tagName === 'TEXTAREA' || (node.tagName === 'INPUT' && !/password|checkbox|radio|button|submit|file|hidden|range|number|color/i.test(node.type)))
      && !node.disabled && !node.readOnly && !/key|token|secret|base|url/i.test(node.id || '');
  }
  function boxProxy(node) {
    if (!node) return null;
    if (!proxies.has(node)) proxies.set(node,new Proxy(node,{get(target,key){
      if (key === 'id') return 'send_textarea';
      const value = Reflect.get(target,key,target);return typeof value === 'function'?value.bind(target):value;
    },set(target,key,value){return Reflect.set(target,key,value,target);}}));
    return proxies.get(node);
  }
  function eventView(event) {
    const node = event.composedPath?.()[0] || event.target;
    if (writable(node) && (outer.contains(node) || /answer|content|reply/i.test(node.id || node.name || ''))) activeBox = node;
    const target = node === activeBox ? boxProxy(node) : node;
    return new Proxy(event,{get(e,key){if(key === 'target')return target;const value=Reflect.get(e,key,e);return typeof value==='function'?value.bind(e):value;}});
  }
  function listen(type,fn,capture) {
    const handler=e=>fn(eventView(e));
    doc.addEventListener(type,handler,capture);listeners.push([type,fn,handler,capture]);
  }
  function readingNode(node) {
    return new Proxy(node,{get(target,key){
      if(key==='closest')return selector=>{
        if(selector!=='#chat > .mes')return target.closest(selector);
        const out=output();let row=target;
        while(row&&row.parentElement!==out)row=row.parentElement;
        if(!row||!out)return null;
        if(!readingRows.has(row))readingRows.set(row,new Proxy(row,{get(element,name){
          if(name==='parentElement')return readingHost;
          if(name==='getAttribute')return attr=>attr==='mesid'?String(Array.from(out.children).indexOf(element)):element.getAttribute(attr);
          const value=Reflect.get(element,name,element);return typeof value==='function'?value.bind(element):value;
        }}));
        return readingRows.get(row);
      };
      const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
    }});
  }
  const localQuery = selector => selector === '#send_textarea' ? boxProxy(activeBox) : root.querySelector(selector);
  const documentBridge = new Proxy(doc,{get(target,key){
    if(key==='documentElement'||key==='body')return surface;
    if(key==='head')return root;
    if(key==='activeElement')return boxProxy(activeBox && (outer.activeElement===activeBox || doc.activeElement===activeBox)?activeBox:null);
    if(key==='getElementById')return id=>id==='send_textarea'?boxProxy(activeBox):root.getElementById(id);
    if(key==='querySelector')return localQuery;
    if(key==='querySelectorAll')return selector=>root.querySelectorAll(selector);
    if(key==='elementFromPoint')return (x,y)=>{const node=outer.elementFromPoint?.(x,y)||doc.elementFromPoint(x,y);return node?readingNode(node):null;};
    if(key==='addEventListener')return listen;
    if(key==='removeEventListener')return (type,fn,capture)=>{for(const entry of listeners)if(entry[0]===type&&entry[1]===fn)doc.removeEventListener(type,entry[2],capture);};
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
  let runtime;
  try {runtime = createChaoxingClawdRuntime({hostDocument:documentBridge,hostWindow:win});}
  catch(error) {for(const [type,,handler,capture]of listeners)doc.removeEventListener(type,handler,capture);anchor.remove();throw error;}
  const text = root.querySelector('.mes_text');
  function sync() {
    frame=0;if(disposed)return;
    const visible = chaoxingClawdPanelVisible(host,panel);
    if(!visible){scheduleClawdDiscovery();return;}
    anchor.style.visibility=visible?'visible':'hidden';
    runtime.visible(visible);
    const phase=panel.dataset.phase||'',busy=panel.getAttribute('aria-busy')==='true';
    const message=outer.getElementById('status')?.textContent||'';
    const currentOutputNode=output();
    if(outputDirty||currentOutputNode!==lastOutputNode){cachedOutput=outputText();lastOutputNode=currentOutputNode;outputDirty=false;if(text.textContent!==cachedOutput)text.textContent=cachedOutput;}
    const currentOutput=cachedOutput;
    if(busy&&!lastBusy){startedText=currentOutput;startedError=outer.getElementById('last-error-code')?.textContent.trim()||'';stopRequested=false;runtime.begin();}
    if(!busy&&lastBusy){
      const errorCode=outer.getElementById('last-error-code')?.textContent.trim();
      const stopped=stopRequested||/stopped|cancelled|已停止|已取消|正在停止|正在取消/i.test(phase+' '+message);
      const failed=!stopped&&(/error|failed|失败|出错|异常/i.test(phase+' '+message)||(!!errorCode&&errorCode!==startedError&&currentOutput===startedText));
      runtime.settle(stopped?'stopped':failed?'error':'done',!failed&&!stopped&&currentOutput!==startedText);
    }
    let nextReadingHost=output();
    for(let node=nextReadingHost;node&&node!==panel;node=node.parentElement){
      if(/auto|scroll/.test(win.getComputedStyle(node).overflowY)&&node.scrollHeight>node.clientHeight){nextReadingHost=node;break;}
    }
    if(readingHost!==nextReadingHost){readingHost=nextReadingHost;runtime.readFrom(readingHost);}
    lastBusy=busy;runtime.sync();
  }
  function schedule(){if(!frame&&!disposed)frame=win.requestAnimationFrame(sync);}
  const observer=new win.MutationObserver(records=>{
    if(records.some(record=>!anchor.contains(record.target))){
      const out=output();
      if(!out||records.some(record=>record.target===out||out.contains(record.target)||Array.from(record.removedNodes).includes(out)))outputDirty=true;
      schedule();
    }
  });
  observer.observe(outer,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class','style','aria-busy','data-phase']});
  const captureStop=event=>{const node=event.composedPath?.()[0];if(node?.closest?.('#analysis-stop,#course-stop,#cancel-images,#cancel-model-test'))stopRequested=true;};
  outer.addEventListener('click',captureStop,true);
  const changes=()=>schedule();win.addEventListener('resize',changes);
  const destroy=()=>{if(disposed)return;disposed=true;observer.disconnect();if(frame)win.cancelAnimationFrame(frame);
    outer.removeEventListener('click',captureStop,true);win.removeEventListener('resize',changes);
    runtime.destroy();for(const [type,,handler,capture]of listeners)doc.removeEventListener(type,handler,capture);
    anchor.remove();
  };
  try {sync();}catch(error){destroy();throw error;}
  return {panel,ownerDocument:doc,destroy};
}

// Each userscript instance follows its own assistant panel; it never reads credentials,
// calls model APIs, clicks answers, submits work, or changes the main script's settings.
const mountedClawds = new Map();
const watchedClawdHosts = new Map();
const clawdObservedDocuments = new Set();
const CLAWD_HOST_SELECTOR = '#cx-ai-study-root,#cx-ai-quiz-panel';
let discoveryFrame = 0, clawdDiscoveryActive = false;
function chaoxingClawdPanelVisible(host,panel){
  return host.isConnected&&!host.ownerDocument.hidden&&!panel.hidden&&!host.hidden
    &&host.ownerDocument.defaultView.getComputedStyle(panel).display!=='none'
    &&host.ownerDocument.defaultView.getComputedStyle(host).display!=='none';
}
function watchClawdHost(host){
  const root=host.shadowRoot,panel=root?.getElementById('panel');
  const previous=watchedClawdHosts.get(host);
  if(previous?.root===root&&previous?.panel===panel)return;
  previous?.observer.disconnect();
  if(!root){watchedClawdHosts.delete(host);return;}
  const observer=new MutationObserver(scheduleClawdDiscovery);
  observer.observe(root,{childList:true});
  observer.observe(host,{attributes:true,attributeFilter:['id','hidden','style','class']});
  if(panel)observer.observe(panel,{attributes:true,attributeFilter:['hidden','style','class','aria-busy','data-phase']});
  watchedClawdHosts.set(host,{root,panel,observer});
}
function discoverChaoxingClawd() {
  discoveryFrame=0;
  if(!clawdDiscoveryActive)return;
  const documents=clawdPanelDocuments();observeClawdDocuments(documents);
  const hosts=new Set(documents.flatMap(doc=>[...doc.querySelectorAll(CLAWD_HOST_SELECTOR)]));
  for(const [host,watch]of watchedClawdHosts)if(!hosts.has(host)){watch.observer.disconnect();watchedClawdHosts.delete(host);}
  for(const host of hosts)watchClawdHost(host);
  for(const [host,api]of mountedClawds){
    const panel=host.shadowRoot?.getElementById('panel');
    if(!hosts.has(host)||panel!==api.panel||host.ownerDocument!==api.ownerDocument||!chaoxingClawdPanelVisible(host,panel)){api.destroy();mountedClawds.delete(host);}
  }
  for(const host of hosts){
    const panel=host.shadowRoot?.getElementById('panel');
    if(!mountedClawds.has(host)&&panel&&chaoxingClawdPanelVisible(host,panel)){
      try{const api=mountChaoxingClawd(host);if(api)mountedClawds.set(host,api);}
      catch(error){console.warn('[学习通 Clawd] 小精灵初始化未完成',error);}
    }
  }
}
function scheduleClawdDiscovery(){if(clawdDiscoveryActive&&!discoveryFrame)discoveryFrame=requestAnimationFrame(discoverChaoxingClawd);}
const clawdDiscoveryObserver=new MutationObserver(records=>{
  const related=node=>node.nodeType===1&&(node.matches(CLAWD_HOST_SELECTOR)||node.querySelector(CLAWD_HOST_SELECTOR));
  if(records.some(record=>record.type==='attributes'
    ? related(record.target)||watchedClawdHosts.has(record.target)||['cx-ai-study-root','cx-ai-quiz-panel'].includes(record.oldValue)
    : [...record.addedNodes,...record.removedNodes].some(related)))scheduleClawdDiscovery();
});
function clawdPanelDocuments(){
  // The native question panel is adopted into an accessible ancestor document.
  // Follow that same document chain; never query unrelated windows or cross-origin frames.
  const documents=[],seen=new Set();let doc=document;
  for(let depth=0;doc&&depth<12&&!seen.has(doc);depth++){
    documents.push(doc);seen.add(doc);
    try{const view=doc.defaultView;if(!view||view.parent===view)break;doc=view.parent.document;}catch{break;}
  }
  return documents;
}
function observeClawdDocuments(documents){
  for(const doc of documents)if(doc.documentElement&&!clawdObservedDocuments.has(doc)){
    clawdDiscoveryObserver.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['id'],attributeOldValue:true});
    clawdObservedDocuments.add(doc);
  }
}
function startClawdDiscovery(){
  if(!document.documentElement)return;
  clawdDiscoveryActive=true;
  observeClawdDocuments(clawdPanelDocuments());
  scheduleClawdDiscovery();
}
if(document.documentElement)startClawdDiscovery();
else document.addEventListener('DOMContentLoaded',startClawdDiscovery,{once:true});
window.addEventListener('pagehide',()=>{
  clawdDiscoveryActive=false;
  document.removeEventListener('DOMContentLoaded',startClawdDiscovery);
  clawdDiscoveryObserver.disconnect();clawdObservedDocuments.clear();if(discoveryFrame)cancelAnimationFrame(discoveryFrame);discoveryFrame=0;
  for(const watch of watchedClawdHosts.values())watch.observer.disconnect();watchedClawdHosts.clear();
  for(const api of mountedClawds.values())api.destroy();mountedClawds.clear();
});
window.addEventListener('pageshow',startClawdDiscovery);
document.addEventListener('visibilitychange',()=>{
  if(!clawdDiscoveryActive)return;
  if(document.hidden){for(const [host,api]of mountedClawds)if(api.ownerDocument.hidden){api.destroy();mountedClawds.delete(host);}}
  else scheduleClawdDiscovery();
});

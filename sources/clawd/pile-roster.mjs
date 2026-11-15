// Build-time adaptations of the retained upstream pile. No runtime downloads.
export function withPileRoster(source,swap){
  source=swap(source,"const NAMES = ['cowboy', 'shades', 'wizard'];","let NAMES = wardrobe?.pileNames() || ['cowboy', 'shades', 'wizard'];");
  source=swap(source,'function cells(name, eyes, pose, face) {','function cells(name, eyes, pose, face) {\n    const id=name; name=wardrobe?.pileKind(id)||name;');
  source=source.replaceAll('wardrobe?.hatOverride(name)','wardrobe?.hatOverride(id)').replaceAll('wardrobe?.glassesOverride(name)','wardrobe?.glassesOverride(id)');
  source=swap(source,'wardrobe.decoratePile(c,{name,eyes,pose,face,by})','wardrobe.decoratePile(c,{name:id,eyes,pose,face,by})');
  source=swap(source,"if (k.name === 'wizard') sparkle(k);","if ((wardrobe?.pileKind(k.name)||k.name) === 'wizard') sparkle(k);");
  source=swap(source,'function homeLayout() { const r = width() - EDGE - 60; return { cowboy: { x: r, on: [] }, shades: { x: r + 28, on: [] }, wizard: { x: r + 14, on: [\'cowboy\', \'shades\'] } }; }',`function homeLayout() {
    const r=width()-EDGE-60,b=bounds(),original={cowboy:{x:r,on:[]},shades:{x:r+28,on:[]},wizard:{x:r+14,on:NAMES.includes('cowboy')&&NAMES.includes('shades')?['cowboy','shades']:[]}};
    return Object.fromEntries(NAMES.map((name,index)=>[name,original[name]||{x:clampX(b.min+(b.max-b.min)*(index+.5)/Math.max(1,NAMES.length)),on:[]}]));
  }`);
  const start=source.indexOf('  function load() {'),end=source.indexOf('  /* 大 Clawd',start);
  if(start<0||end<start)throw Error('Pinned pile load anchor changed');
  source=source.slice(0,start)+`  function load() {
    const w=width();if(!w)return null;
    try{
      const saved=JSON.parse(preferencesFor(win).getItem(STORE)||'null');if(!saved||typeof saved!=='object'||Array.isArray(saved))return null;
      const home=homeLayout(),out=Object.fromEntries(NAMES.map(name=>{
        const item=saved[name],present=item&&typeof item==='object'&&!Array.isArray(item);
        return [name,{x:present&&Number.isFinite(item.dx)?clampX(w/2+item.dx):clampX(home[name].x),on:present&&Array.isArray(item.on)?[...new Set(item.on.filter(n=>(NAMES.includes(n)||n==='big')&&n!==name))]:home[name].on}];
      }));
      const reaches=(from,target)=>{const pending=[from],seen=new Set();while(pending.length){const n=pending.pop();if(n===target)return true;if(n==='big'||seen.has(n))continue;seen.add(n);pending.push(...(out[n]?.on||[]));}return false;};
      for(const name of NAMES)out[name].on=out[name].on.filter(n=>!reaches(n,name));
      return out;
    }catch{return null;}
  }
`+source.slice(end);
  source=swap(source,'const later = (k, fn, ms) => { const t = win.setTimeout(() => { timers.delete(t); k.timers.delete(t); fn(); }, ms); timers.add(t); k.timers.add(t); return t; };',
    'const later = (k, fn, ms) => { if(destroyed||k.retired)return 0;const t = win.setTimeout(() => { timers.delete(t); k.timers.delete(t); if(!destroyed&&!k.retired)fn(); }, ms); timers.add(t); k.timers.add(t); return t; };');
  source=swap(source,'function look(k) {','function look(k) {\n    if(destroyed||k.retired)return;\n    const palette=wardrobe?.pilePalette(k.name)||{};k.legEls.forEach((leg,index)=>{leg.style.backgroundColor=(index%2?palette.shade:palette.body)||\'\';});');
  source=swap(source,'function place(k) {','function place(k) {\n    if(destroyed||k.retired)return;');
  source=swap(source,"k.el.addEventListener('pointerdown', e => {","k.el.addEventListener('pointerdown', e => {\n      if(destroyed||k.retired)return;");
  source=swap(source,"k.el.addEventListener('pointermove', e => {","k.el.addEventListener('pointermove', e => {\n      if(destroyed||k.retired)return;");
  source=swap(source,'const up = e => {','const up = e => {\n      if(destroyed||k.retired)return;');
  const runtime=`
  // Change only the mini roster. Existing survivors keep their live position/behaviour.
  function syncRoster(){
    const next=wardrobe?.pileNames()||['cowboy','shades','wizard'];
    if(JSON.stringify(next)===JSON.stringify(NAMES))return;
    if(!pile){NAMES=next;return;}
    const keep=new Set(next),gone=NAMES.filter(name=>!keep.has(name)),added=next.filter(name=>!K[name]);
    const moved=[],oldBigHeight=bigOn?supportTop(bigOn):null,oldBigX=bigOn?K[bigOn].x:null;
    for(const name of gone){
      const k=K[name];if(!k)continue;
      clear(k);endWalk(k);k.retired=true;
      const animations=new Set([k.kick,k.hop,...(k.legAnims||[]),...(k.el.getAnimations?.({subtree:true})||[]),...(k.sh.getAnimations?.()||[])]);
      for(const animation of animations)if(animation){animation.onfinish=null;animation.oncancel=null;animation.cancel?.();}
      k.el.remove();k.sh.remove();
    }
    for(const name of NAMES){
      const k=K[name];if(!keep.has(name)||!k)continue;
      const on=k.on.filter(n=>n==='big'||keep.has(n));
      if(on.length!==k.on.length){const walk=endWalk(k);k.on=on;if(!on.length)moved.push(k);if(walk)arrive(k,()=>doze(k));}
    }
    NAMES=next;for(const name of gone)delete K[name];
    for(const name of added)make(name);
    const home=homeLayout();
    for(const name of added){const k=K[name];k.x=clampX(home[name].x);k.on=[];moved.push(k);}
    // The large Clawd may be sitting on a removed support; lower it using current seats.
    const removedSeat=bigOn&&!keep.has(bigOn);
    if(removedSeat)lowerBig();
    for(const k of moved){const x=nearestFree(k.x,k.name);if(x!==null)k.x=x;}
    if(laid){stackX();for(const name of NAMES)if(K[name].mode!=='held')place(K[name]);}
    if(!removedSeat&&bigOn&&(supportTop(bigOn)!==oldBigHeight||K[bigOn].x!==oldBigX))lowerBig();
    for(const name of added)sleep(K[name],true);
    atHome=false;imgCache.clear();save(true);readQuickReplyRects();
  }
`;
  source=swap(source,'  function ensure() {',runtime+'\n  function ensure() {');
  source=swap(source,'    if (destroyed) return null;','    if (destroyed) return null;\n    syncRoster();');
  return swap(source,'refreshAppearance(){imgCache.clear();for(const k of Object.values(K))look(k);}',
    'refreshAppearance(){if(destroyed)return;syncRoster();imgCache.clear();for(const k of Object.values(K))look(k);}');
}

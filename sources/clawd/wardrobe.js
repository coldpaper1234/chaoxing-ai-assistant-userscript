// Built-in pixel accessories only. No uploads, executable templates or remote assets.
export function createClawdWardrobe({doc,win,root,outer}) {
  const KEY='cx_clawd_wardrobe_v1';
  const targets={big:'大 Clawd',cowboy:'牛仔小 Clawd',shades:'墨镜小 Clawd',wizard:'巫师小 Clawd'};
  const hats={
    default:['原样',null],none:['无帽子',null],
    cowboy:['牛仔帽',['.....aaaaaa.....','....aaaaaaaa....','....bbbbbbbb....','.aaaaaaaaaaaaaa.']],
    wizard:['巫师帽',['..........a.....','.........aaa....','........aaaaa...','.......aawaaaa..','......aaaaaaaa..','....aaaaaaaaaa..','..aaaaaaaaaaaa..']],
    crown:['皇冠',['..a....a....a...','..aa..aaa..aa...','..aaaaaaaaaaa...','..aaawaawaaaa...','..aaaaaaaaaaa...']],
    tophat:['礼帽',['....aaaaaaaa....','....aaaaaaaa....','....aaaaaaaa....','....bbbbbbbb....','..aaaaaaaaaaaa..']],
    beret:['贝雷帽',['.......aa.......','...aaaaaaaaaa...','..aaaaaaaaaaaa..','...aaaaaaaaaa...','....bbbbbbbb....']],
    cap:['棒球帽',['....aaaaaaa.....','...aaaaaaaaa....','..aaaaaaaaaaa...','..bbbbbbbbbbbaaa']],
    party:['派对帽',['.......a........','......aaa.......','.....aawaa......','....aaaaaaa.....','...aawaaaaaa....','..aaaaaaaaaaa...']],
    santa:['圣诞帽',['........ww......','......aaaaaw....','.....aaaaaaa....','....aaaaaaaa....','...aaaaaaaaaa...','..wwwwwwwwwwww..']],
    cat:['猫耳',['..a.........a...','..aa.......aa...','..aba.....aba...','..abaa...aaba...','...aa.....aa....']],
    rabbit:['兔耳',['....aa....aa....','...abaa..aaba...','...abaa..aaba...','...abaa..aaba...','....aa....aa....']],
    flower:['花环',['...b...b...b....','..bab.bab.bab...','...baabaabaa....','..bbbbbbbbbbbb..']],
    headphones:['耳机',['...aaaaaaaaaa...','..aa........aa..','.aa..........aa.','.ab..........ba.','.ab..........ba.']]
  };
  const glasses={default:'原样',none:'无眼镜',sunglasses:'墨镜',round:'圆框眼镜',square:'方框眼镜',monocle:'单片眼镜',star:'星星眼镜'};
  const accessories={none:'无饰品',scarf:'围巾',bow:'领结',tie:'领带',badge:'徽章',heart:'爱心别针',flower:'花朵别针',necklace:'项链',cape:'小披风'};
  const defaults=()=>({schemaVersion:1,revision:0,mode:'default',pets:Object.fromEntries(Object.keys(targets).map(id=>[id,{hat:'default',glasses:'default',accessory:'none',body:'#d97757',hatColor:id==='cowboy'?'#8b5e3c':id==='wizard'?'#5b8fb9':'#d6a43a',accent:id==='shades'?'#1f1d1b':'#ce5261'}]))});
  const clone=value=>JSON.parse(JSON.stringify(value));
  const isColor=value=>typeof value==='string'&&/^#[\da-f]{6}$/i.test(value);
  function validate(value){
    if(value===null||value===undefined)return defaults();
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['schemaVersion','revision','mode','pets'].includes(k))
      ||value.schemaVersion!==1||!Number.isSafeInteger(value.revision)||value.revision<0||!['default','custom'].includes(value.mode)
      ||!value.pets||Object.keys(value.pets).length!==4||Object.keys(value.pets).some(k=>!Object.hasOwn(targets,k)))throw Error('装扮设置格式不兼容，原设置已保留，请更新脚本后再修改');
    for(const id of Object.keys(targets)){
      const p=value.pets[id];
      if(!p||Object.keys(p).length!==6||Object.keys(p).some(k=>!['hat','glasses','accessory','body','hatColor','accent'].includes(k))
        ||!Object.hasOwn(hats,p.hat)||!Object.hasOwn(glasses,p.glasses)||!Object.hasOwn(accessories,p.accessory)
        ||!isColor(p.body)||!isColor(p.hatColor)||!isColor(p.accent))throw Error('装扮设置格式不兼容，原设置已保留，请更新脚本后再修改');
    }
    return clone(value);
  }
  function readRaw(){return typeof GM_getValue==='function'?GM_getValue(KEY,null):JSON.parse(win.localStorage.getItem(KEY)||'null');}
  const token=value=>JSON.stringify(value??null);
  let current=defaults(),invalid='',disposed=false,refresh=()=>{},baseline='null',draft=defaults(),dirty=false,listener=null,writing=false;
  try{current=validate(readRaw());}catch(error){invalid=error.message;}
  const custom=()=>current.mode==='custom';
  const style=id=>current.pets[id];
  const darken=(hex,f=.72)=>'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*f).toString(16).padStart(2,'0')).join('');
  const bodyShade=hex=>hex.toLowerCase()==='#d97757'?'#bf684c':darken(hex,.88);
  const hatName=(id,p)=>p.hat==='default'?(id==='cowboy'?'cowboy':id==='wizard'?'wizard':'none'):p.hat;
  const glassesName=(id,p)=>p.glasses==='default'?(id==='shades'?'sunglasses':'none'):p.glasses;
  function pixels(id,p,eyeY=1){
    const out=[],put=(x,y,c)=>out.push([x,y,c]);
    const grid=(rows,ox,oy,palette)=>rows?.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch!=='.')put(x+ox,y+oy,palette[ch]||ch);}));
    const hat=hatName(id,p),rows=hats[hat]?.[1];
    const standard=defaults().pets[id];
    if(id==='big'||p.hat!=='default'||p.hatColor!==standard.hatColor)
      grid(rows,0,-(rows?.length||0),{a:p.hatColor,b:darken(p.hatColor),w:'#fff2ce'});
    const g=glassesName(id,p),ink=p.accent,glass='#d8ebef',black='#241e24';
    const rectangle=(x,y,w,h,c)=>{for(let a=0;a<w;a++)for(let b=0;b<h;b++)if(!a||a===w-1||!b||b===h-1)put(x+a,y+b,c);};
    if(id==='big'||p.glasses!=='default'||p.accent!==standard.accent){
      if(g==='sunglasses'){grid(['aaaa.aaaa','aaaa.aaaa','.aa...aa.'],3,eyeY,{a:ink});put(7,eyeY,ink);put(8,eyeY,ink);}
      if(g==='round'){grid(['.aa...aa.','a..aaa..a','a..a.a..a','.aa...aa.'],3,eyeY-1,{a:ink});}
      if(g==='square'){rectangle(2,eyeY-1,5,4,ink);rectangle(9,eyeY-1,5,4,ink);put(7,eyeY,ink);put(8,eyeY,ink);}
      if(g==='monocle'){rectangle(9,eyeY-1,5,4,ink);put(13,eyeY+3,ink);put(13,eyeY+4,ink);put(12,eyeY+5,ink);put(10,eyeY,glass);}
      if(g==='star'){grid(['.a....a.','aaa..aaa','.aaaaaa.','aaa..aaa'],3,eyeY-1,{a:ink});}
    }
    const a=p.accessory;
    if(a==='scarf'){grid(['.aaaaaaaaaaaaaa.','....aaa.........','.....aaa........'],0,6,{a:p.accent});}
    if(a==='bow'){grid(['aaa..aaa','aaaaaaaa','aaa..aaa'],4,6,{a:p.accent});put(7,7,darken(p.accent));}
    if(a==='tie'){grid(['.aa.','aaaa','.aa.','.aa.','aaaa','.aa.'],6,5,{a:p.accent});}
    if(a==='badge'){grid(['.a.','aaa','.a.'],10,4,{a:p.accent});put(11,5,'#fff1be');}
    if(a==='heart'){grid(['aa.aa','aaaaa','.aaa.','..a..'],9,3,{a:p.accent});}
    if(a==='flower'){grid(['.a.','aaa','.a.'],10,3,{a:p.accent});put(11,4,'#f4ce65');put(11,6,'#5b9b67');}
    if(a==='necklace'){grid(['a..........a','.a........a.','..aaaaaaaa..','.....aa.....'],2,4,{a:p.accent});}
    if(a==='cape'){grid(['aa............aa','aa............aa','aaa..........aaa','aaa..........aaa'],0,4,{a:p.accent});}
    return out;
  }
  let bigLayer=null,lastBody=null,lastLayerToken='';
  function syncBig(force=false){
    const body=root.querySelector('#send_form > button.clawd-composer-clawd .clr-p-body');
    if(!body)return;
    if(body!==lastBody){bigLayer?.remove();bigLayer=doc.createElement('span');bigLayer.className='cx-clawd-dress-layer';body.append(bigLayer);lastBody=body;lastLayerToken='';}
    const key=JSON.stringify([current.mode,style('big')]);if(!force&&key===lastLayerToken)return;lastLayerToken=key;
    const cells=custom()?pixels('big',style('big'),2):[];
    bigLayer.hidden=!cells.length;bigLayer.style.boxShadow=cells.length?cells.map(([x,y,c])=>(x*3)+'px '+(y*3)+'px 0 '+c).join(','):'none';
  }
  const sheetStyle=doc.createElement('style');sheetStyle.textContent='.cx-clawd-dress-layer{position:absolute;left:var(--cx-clawd-dress-x,0px);top:var(--cx-clawd-dress-y,18px);width:3px;height:3px;pointer-events:none;background:transparent;z-index:6}.cx-clawd-dress-layer[hidden]{display:none!important}';root.append(sheetStyle);
  const menu=doc.createElement('section');menu.className='cx-wardrobe';menu.hidden=true;menu.setAttribute('role','dialog');menu.setAttribute('aria-label','小精灵装扮');
  menu.innerHTML='<header><strong>小精灵装扮</strong><button type="button" data-close>关闭</button></header><label class="cx-line"><input type="checkbox" data-mode>启用自选装扮</label><label>选择小精灵<select data-target></select></label><canvas width="96" height="112" aria-label="装扮预览"></canvas><div class="cx-fields"><label>帽子<select data-hat></select></label><label>眼镜<select data-glasses></select></label><label>饰品<select data-accessory></select></label></div><div class="cx-colors"><label>身体颜色<input type="color" data-body></label><label>帽子颜色<input type="color" data-hatColor></label><label>饰品颜色<input type="color" data-accent></label></div><p class="cx-note">选择后点击应用。关闭不会保存未应用的选择。</p><div class="cx-actions"><button type="button" data-apply>应用装扮</button><button type="button" data-reset-one>这只恢复默认</button><button type="button" data-reset-all>全部恢复默认</button></div><p data-message role="status"></p>';
  const uiStyle=doc.createElement('style');uiStyle.textContent='.cx-wardrobe{position:absolute;right:0;top:10px;width:min(340px,calc(100vw - 40px));max-height:calc(100vh - 124px);overflow:auto;box-sizing:border-box;padding:14px;border:1px solid #d9e2ed;border-radius:10px;background:#fff;color:#26354a;box-shadow:0 10px 32px #18304933;pointer-events:auto;z-index:50;font:13px/1.6 "Microsoft YaHei",sans-serif}.cx-wardrobe[hidden]{display:none!important}.cx-wardrobe header,.cx-line,.cx-actions,.cx-colors{display:flex;gap:8px;align-items:center}.cx-wardrobe header{justify-content:space-between;margin-bottom:8px}.cx-wardrobe label{display:grid;gap:3px;margin:6px 0}.cx-wardrobe .cx-line{display:flex}.cx-wardrobe select{width:100%;padding:6px;border:1px solid #cbd6e2;border-radius:5px;background:#fff;color:#26354a}.cx-wardrobe button{padding:5px 8px;border:1px solid #bfcddd;border-radius:5px;background:#f0f5fc;color:#315fbd;cursor:pointer;font:inherit}.cx-wardrobe button:disabled{opacity:.5;cursor:default}.cx-fields{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.cx-colors{justify-content:space-between}.cx-colors label{flex:1;min-width:0}.cx-colors input{width:100%;height:30px;border:1px solid #cbd6e2;border-radius:4px;padding:2px;background:#fff}.cx-wardrobe canvas{display:block;margin:0 auto;image-rendering:pixelated;background:#f7f9fc;border-radius:8px}.cx-wardrobe .cx-note{font-size:12px;color:#6c7b90}.cx-actions{flex-wrap:wrap}.cx-wardrobe [data-message]{margin:7px 0 0;font-size:12px;overflow-wrap:anywhere}';root.append(uiStyle,menu);
  const entry=doc.createElement('button');entry.type='button';entry.id='cx-clawd-dress-toggle';entry.textContent='装扮';entry.title='小精灵装扮';entry.setAttribute('aria-expanded','false');entry.style.cssText='flex:none;min-width:44px;width:auto;min-height:28px;font-size:12px;padding:4px 6px';
  const el=name=>menu.querySelector('[data-'+name+']');
  const fill=(select,entries)=>{for(const [value,label]of entries){const option=doc.createElement('option');option.value=value;option.textContent=label;select.append(option);}};
  fill(el('target'),Object.entries(targets));fill(el('hat'),Object.entries(hats).map(([k,v])=>[k,v[0]]));fill(el('glasses'),Object.entries(glasses));fill(el('accessory'),Object.entries(accessories));
  const message=text=>{el('message').textContent=text;};
  function preview(){
    let context;try{context=menu.querySelector('canvas').getContext('2d');}catch{return;}if(!context)return;
    context.clearRect(0,0,96,112);
    const id=el('target').value,p=draft.pets[id],shown=draft.mode==='custom'?p:defaults().pets[id];
    const body=[];for(let y=0;y<8;y++)for(let x=2;x<14;x++)body.push([x,y,shown.body]);
    for(const x of [3,5,10,12]){body.push([x,8,shown.body],[x,9,shown.body]);}
    for(const x of [4,11]){body.push([x,2,'#241d18'],[x,3,'#241d18']);}
    // Preview includes each target's original hat/glasses when their choice is "original".
    const sample={...shown,hat:hatName(id,shown),glasses:glassesName(id,shown)};
    for(const [x,y,color]of [...body,...pixels('big',sample,2)]){context.fillStyle=color;context.fillRect(16+x*4,48+y*4,4,4);}
  }
  function fields(){const id=el('target').value,p=draft.pets[id];el('mode').checked=draft.mode==='custom';for(const k of ['hat','glasses','accessory','body','hatColor','accent']){el(k).value=p[k];el(k).disabled=draft.mode!=='custom'||!!invalid;}for(const k of ['apply','reset-one','reset-all'])el(k).disabled=!!invalid;preview();}
  function reload(){try{const raw=readRaw();current=validate(raw);baseline=token(raw);invalid='';}catch(error){invalid=error.message;}draft=clone(current);dirty=false;fields();message(invalid);}
  function save(next,remove=false){
    let attempted=false;
    try{
      if(invalid)throw Error(invalid);
      const raw=readRaw();validate(raw);
      if(token(raw)!==baseline)throw Error('装扮已在其他页面修改，请关闭后重新打开；当前选择尚未保存');
      const value=remove?null:validate({...next,revision:validate(raw).revision+1});
      attempted=true;writing=true;
      if(typeof GM_setValue==='function'){
        if(remove&&typeof GM_deleteValue==='function')GM_deleteValue(KEY);else GM_setValue(KEY,value);
      }else if(remove)win.localStorage.removeItem(KEY);else win.localStorage.setItem(KEY,JSON.stringify(value));
      const stored=readRaw();if(token(stored)!==token(value))throw Error('保存结果已变化，请重新打开确认');
      current=validate(stored);baseline=token(stored);draft=clone(current);dirty=false;refresh();fields();message(remove?'已恢复默认装扮':'装扮已保存');
    }catch(error){
      if(attempted){try{const raw=readRaw();current=validate(raw);baseline=token(raw);refresh();}catch{}}
      message((attempted?'保存未确认，请重新打开核对：':'未应用：')+error.message);
    }finally{writing=false;}
  }
  function placeMenu(){
    const rect=root.host.getBoundingClientRect(),width=Math.min(340,Math.max(160,win.innerWidth-32));
    const left=Math.max(8,Math.min(rect.right-width,win.innerWidth-width-8));
    menu.style.width=width+'px';menu.style.left=(left-rect.left)+'px';menu.style.right='auto';
    const below=Math.max(40,win.innerHeight-rect.top-24),above=Math.max(40,rect.top-24);
    if(below<280&&above>below){menu.style.top='auto';menu.style.bottom='10px';menu.style.maxHeight=above+'px';}
    else{menu.style.top='10px';menu.style.bottom='auto';menu.style.maxHeight=below+'px';}
  }
  const close=()=>{menu.hidden=true;entry.setAttribute('aria-expanded','false');};
  entry.onclick=()=>{if(!menu.hidden){close();return;}reload();menu.hidden=false;placeMenu();entry.setAttribute('aria-expanded','true');el('target').focus();};
  el('close').onclick=close;
  el('mode').onchange=()=>{draft.mode=el('mode').checked?'custom':'default';dirty=true;fields();};
  el('target').onchange=fields;
  for(const k of ['hat','glasses','accessory','body','hatColor','accent'])el(k).onchange=()=>{draft.pets[el('target').value][k]=el(k).value;dirty=true;preview();message('选择尚未应用');};
  el('apply').onclick=()=>save(draft);
  el('reset-one').onclick=()=>{const next=clone(current);next.pets[el('target').value]=defaults().pets[el('target').value];save(next);};
  el('reset-all').onclick=()=>save(defaults(),true);
  const storageChanged=()=>{
    if(disposed||writing)return;
    try{const raw=readRaw();current=validate(raw);invalid='';refresh();if(!menu.hidden){if(dirty)message('其他页面已修改装扮，当前选择未保存；请重新打开');else{baseline=token(raw);draft=clone(current);fields();}}}
    catch(error){invalid=error.message;message(invalid);fields();}
  };
  const localStorageChanged=event=>{if(event.key===KEY)storageChanged();};
  const escape=event=>{if(event.key==='Escape'&&!menu.hidden){close();entry.focus();event.stopPropagation();}};
  menu.addEventListener('keydown',escape);
  return {
    start(onChange){refresh=onChange;(outer.querySelector('.head-actions')||outer.querySelector('.head')||outer).prepend(entry);if(typeof GM_addValueChangeListener==='function')listener=GM_addValueChangeListener(KEY,storageChanged);else win.addEventListener('storage',localStorageChanged);},
    bigPalette(){return custom()?{body:style('big').body,shade:bodyShade(style('big').body)}:{};},
    hatOverride(id){return custom()&&(style(id).hat!=='default'||style(id).hatColor!==defaults().pets[id].hatColor);},
    glassesOverride(id){return custom()&&(style(id).glasses!=='default'||style(id).accent!==defaults().pets[id].accent);},
    decoratePile(base,{name,by,eyes}){
      if(!custom())return base;
      const p=style(name),painted=base.map(([x,y,c])=>[x,y,c==='#'?p.body:c==='s'?bodyShade(p.body):c]);
      return painted.concat(pixels(name,p,1).map(([x,y,c])=>[x,y+by,c]));
    },
    syncBig,
    destroy(){if(disposed)return;disposed=true;if(listener!==null&&typeof GM_removeValueChangeListener==='function')GM_removeValueChangeListener(listener);win.removeEventListener('storage',localStorageChanged);menu.removeEventListener('keydown',escape);bigLayer?.remove();entry.remove();menu.remove();sheetStyle.remove();uiStyle.remove();}
  };
}

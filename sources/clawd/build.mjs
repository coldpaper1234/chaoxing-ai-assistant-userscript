import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {withPileRoster} from './pile-roster.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');
const upstream=read('upstream/index.js').split('\n');
const ranges=[[1420,1467],[1534,1549],[1566,1749],[1792,1799],[1815,2624],[3158,3637],[3648,3741],[3802,3910],[6151,6192]];
const image=upstream.find(line=>line.trimStart().startsWith('const CLAWD_IMAGE ='));
if(!image)throw new Error('Pinned upstream image declaration is missing');
// Fixed line ranges refer to the retained upstream snapshot, never a remote file.
let controller=ranges.map(([lo,hi])=>`\n// Original Claude Web index.js:${lo}-${hi}\n`+upstream.slice(lo-1,hi).join('\n')).join('\n');
controller=controller.replace('const NORMAL_CLAWD_RIG = buildClawdRig();','const NORMAL_CLAWD_RIG = buildClawdRig();\n    let CLAWD_RIG=NORMAL_CLAWD_RIG,halloween=null,halloweenAirborne=false;');
controller=controller.replace('const CLAWD_RIG_STYLE_ID = "claude-clawd-rig-style";','const CLAWD_RIG_STYLE_ID = "cx-clawd-rig-style";');
const swap=(source,before,after)=>{if(source.split(before).length!==2)throw new Error('Pinned wardrobe anchor changed: '+before.slice(0,70));return source.replace(before,after);};
controller=swap(controller,'const NORMAL_CLAWD_RIG = buildClawdRig();','const NORMAL_CLAWD_RIG = buildClawdRig(wardrobe?.bigPalette());');
controller=swap(controller,'win: hostWindow,','win: hostWindow,\n      wardrobe,');
controller=swap(controller,'"setCostume", "ensure",','"setCostume", "refreshAppearance", "ensure",');
function rigWithWardrobe(source){
  source=swap(source,'function buildClawdRig() {','function buildClawdRig(palette = {}) {');
  source=swap(source,"'#': '#d97757',","'#': palette.body || '#d97757',");
  source=swap(source,"'s': '#bf684c',","'s': palette.shade || '#bf684c',");
  return swap(source,'    BMP_CACHE.set(key, v);',`    if(part==='body'){
      const frame=SPR.body[name]||SPR.body.stand,w=Math.max(...frame.rows.map(row=>row.length));
      v+=';--cx-clawd-dress-x:'+Math.round(ORIGIN.body[0]+frame.ox+w/2-8)*PX+'px;--cx-clawd-dress-y:'+(BOX[1]+frame.oy)*PX+'px';
    }
    BMP_CACHE.set(key, v);`);
}
function pileWithWardrobe(source){
  source=source.replaceAll('claude-web-clawd-pile-v3','cx-ai-clawd-pile-v3');
  source=swap(source,'function createClawdPile({ doc, win, big = null })','function createClawdPile({ doc, win, big = null, wardrobe = null })');
  const start=source.indexOf('  function cells(name, eyes, pose, face) {'),end=source.indexOf('  /* 2.0.227',start);
  if(start<0||end<start)throw new Error('Pinned pile cell block changed');
  let cells=source.slice(start,end);
  cells=swap(cells,"if (name === 'cowboy')","if (!wardrobe?.hatOverride(name) && name === 'cowboy')");
  cells=cells.replaceAll("if (name === 'wizard')","if (!wardrobe?.hatOverride(name) && name === 'wizard')");
  cells=swap(cells,"if (name === 'shades')","if (!wardrobe?.glassesOverride(name) && name === 'shades')");
  cells=swap(cells,'    return c;','    return wardrobe?wardrobe.decoratePile(c,{name,eyes,pose,face,by}):c;');
  source=source.slice(0,start)+cells+source.slice(end);
  source=swap(source,'return { setCostume, ensure,','return { setCostume, refreshAppearance(){imgCache.clear();for(const k of Object.values(K))look(k);}, ensure,');
  return withPileRoster(source,swap);
}
const module=(name,returns,transform=s=>s)=>`\nconst {${returns}}=(()=>{\n`+transform(read('upstream/'+name).replace(/^import[^\r\n]*[\r\n]+/gm,'').replace(/\bexport (?=(?:function|const)\b)/g,''))+`\nreturn {${returns}};\n})();\n`;
const modules='\nconst {createClawdWardrobe}=(()=>{\n'+read('wardrobe.js').replace(/^export /gm,'')+'\nreturn {createClawdWardrobe};\n})();\n'
  +module('preferences.js','preferencesFor')+module('clawd-rig.js','buildClawdRig',rigWithWardrobe)
  +module('clawd-pile.js','createClawdPile',pileWithWardrobe)
  +module('clawd-rhythm.js','installClawdRhythm');
const header=`// ==UserScript==
// @name         学习通 AI 助手 · Clawd 小精灵
// @namespace    local.chaoxing.clawd
// @version      0.1.5
// @description  将本机 Claude Web 2.0.161 的普通 Clawd 动作与交互移植到学习通 AI 助手面板
// @author       local adaptation; original Clawd runtime by lulu
// @match        *://*.chaoxing.com/*
// @match        *://*.xuexitong.com/*
// @match        *://*.edu.cn/work/doHomeWorkNew*
// @match        *://*.edu.cn/mooc-ans/work/doHomeWorkNew*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

/* Personal local adaptation. Original source: https://github.com/claudenoshujin/claude-web
 * Retained original source comments and author credits. No runtime downloads.
 * Requires the existing 学习通 AI 助手 userscript. Does not submit or alter answers.
 */
(()=>{'use strict';
`;
const result=header+modules+'\n'+read('runtime-head.js')+'\n'+image+'\n'+controller+'\n'+read('runtime-tail.js')+'\n'+read('adapter.js')+'\n})();\n';
fs.writeFileSync(path.join(dir,'chaoxing-clawd.user.js'),result);
let mainSource=null;
if(process.argv[2]){
  const original=fs.readFileSync(process.argv[2],'utf8');
  const begin='/* CX_CLAWD_EMBEDDED_START */',end='/* CX_CLAWD_EMBEDDED_END */';
  const start=original.indexOf(begin),stop=original.indexOf(end);
  if((start<0)!==(stop<0)||start>=0&&(stop<start||original.indexOf(begin,start+begin.length)>=0||original.slice(stop+end.length).trim()!== '})();'))
    throw new Error('Unexpected embedded Clawd boundaries; refusing to stack or discard code');
  const main=start<0?original:original.slice(0,start);
  const addon=result.replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*/, '');
  fs.writeFileSync(path.join(dir,'chaoxing-ai-assistant-clawd.user.js'),main.trimEnd()+'\n\n'+begin+'\n;(()=>{try{\n'+addon+'\n}catch(error){console.warn("[学习通 Clawd] 小精灵初始化未完成",error);}\n'+end+'\n})();\n');
  mainSource={version:main.match(/^\/\/ @version\s+(\S+)/m)?.[1]||'unknown',sha256:crypto.createHash('sha256').update(main).digest('hex')};
}
fs.writeFileSync(path.join(dir,'provenance.json'),JSON.stringify({
  source:'https://github.com/claudenoshujin/claude-web',version:JSON.parse(read('upstream/manifest.json')).version,
  ranges,mainSource,upstreamFiles:Object.fromEntries(['index.js','clawd-rig.js','clawd-pile.js','clawd-rhythm.js','preferences.js'].map(name=>[name,crypto.createHash('sha256').update(read('upstream/'+name)).digest('hex')])),
  changes:['Document/selector bridge into a private ShadowRoot','Connect begin/end/error/stop to existing assistant DOM state','Namespace the pile storage key','Single rig style constant declaration','Dispose on hide and restore on pageshow','Recognize the relocated quiz panel and rebind its owner document','Built-in wardrobe with per-pet colors and restore-default controls','Editable mini roster with stable IDs and independent outfits','Migrate wardrobe v1 to v2; validate and confirm roster/settings in one record','Dispose removed mini timers/animations and detach missing supports','Versioned cosmetic preference storage; question exports unchanged','Idempotent embedded main-script build','Ordinary Clawd only; no Halloween costume or SillyTavern theme/layout code'],
  review:'Static source review only. No syntax checks, automated tests or browser verification executed.'
},null,2));
console.log('Generated: '+path.join(dir,'chaoxing-clawd.user.js'));

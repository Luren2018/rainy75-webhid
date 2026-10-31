import {ViaKeyboard,VID,PIDS,hex,matches,validateProfile} from './protocol.mjs';
import {saveState} from './save-state.mjs';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const definitions=Object.fromEntries(await Promise.all(['rgb-usb','rgb-wireless','plain-usb','plain-wireless'].map(async n=>[n,await(await fetch(`./definitions/${n}.json`)).json()])));
const codesOld=await(await fetch('./definitions/keycodes-old.json')).json(),codesNew=await(await fetch('./definitions/keycodes-v11.json')).json();
let state={page:'keymap',variant:'rgb',layer:0,selected:0,category:'basic',kb:null,info:null,keymap:[],baseline:[],snapshot:null,busy:false,version:11,lighting:null,lightBaseline:null,lightingAvailable:false,log:[]};
const clone=x=>JSON.parse(JSON.stringify(x));
const labels=[['Esc',...Array.from({length:12},(_,i)=>`F${i+1}`),'PgDn','PgUp'],['`','1','2','3','4','5','6','7','8','9','0','-','=','Backspace','End'],['Tab','Q','W','E','R','T','Y','U','I','O','P','[',']','\\','Home'],['Caps','A','S','D','F','G','H','J','K','L',';','\'','Enter','Del'],['Shift','Z','X','C','V','B','N','M',',','.','/','Shift','↑'],['Ctrl','Win','Alt','Space','Fn','Ctrl','←','↓','→']];
const aliases={KC_ESC:'Esc',KC_ENT:'Enter',KC_BSPC:'Backspace',KC_SPC:'Space',KC_TAB:'Tab',KC_CAPS:'Caps',KC_MINS:'-',KC_EQL:'=',KC_LBRC:'[',KC_RBRC:']',KC_BSLS:'\\',KC_SCLN:';',KC_QUOT:"'",KC_GRV:'`',KC_COMM:',',KC_DOT:'.',KC_SLSH:'/',KC_LCTL:'左 Ctrl',KC_RCTL:'右 Ctrl',KC_LSFT:'左 Shift',KC_RSFT:'右 Shift',KC_LALT:'左 Alt',KC_RALT:'右 Alt',KC_LGUI:'左 Win',KC_RGUI:'右 Win',KC_LEFT:'←',KC_RGHT:'→',KC_UP:'↑',KC_DOWN:'↓',KC_PGUP:'PgUp',KC_PGDN:'PgDn',KC_DEL:'Del',KC_HOME:'Home',KC_END:'End',KC_INS:'Insert',KC_PSCR:'Print',KC_SLCK:'Scroll',KC_PAUS:'Pause',KC_NO:'禁用',KC_TRNS:'透明',KC_MUTE:'静音',KC_VOLU:'音量 +',KC_VOLD:'音量 −',KC_MNXT:'下一曲',KC_MPRV:'上一曲',KC_MSTP:'停止播放',KC_MPLY:'播放 / 暂停',KC_MSEL:'媒体播放器',KC_EJCT:'弹出',KC_CALC:'计算器',KC_MYCM:'此电脑',RGB_TOG:'灯光开关',RGB_MOD:'下一灯效',RGB_RMOD:'上一灯效',RGB_HUI:'色相 +',RGB_HUD:'色相 −',RGB_SAI:'饱和度 +',RGB_SAD:'饱和度 −',RGB_VAI:'亮度 +',RGB_VAD:'亮度 −',RGB_SPI:'速度 +',RGB_SPD:'速度 −'};
const effects=['关闭灯光','波浪','彩云','漩涡','混合彩色','呼吸','常亮','渐灭','涟漪','激光','繁星','花开','穿梭','波浪条','流星','雨滴','扫描','触发彩色','中心扩散'];
const customLabels=['2.4G 模式','三模切换','蓝牙 1','蓝牙 2','蓝牙 3','锁定 Win','Win / Mac','扫描延迟','VIA 模式切换','电量显示','键盘电源'];
const customAllowed=[0,1,2,3,4,5,6,7,9]; // Do not expose mode/protocol switching or power-off as accidental mapping choices.
function codes(){return state.version>=11?codesNew:codesOld;}
function codeLabel(code){
 if(code===65535)return '保留';
 const c=codes();
 for(const [name,value] of Object.entries(c))if(!name.startsWith('_')&&value===code)return aliases[name]||name.replace(/^KC_/,'');
 for(let l=0;l<state.keymap.length;l++){if(code===c._QK_MOMENTARY+l)return `Fn(${l})`;if(code===c._QK_TOGGLE_LAYER+l)return `TG(${l})`;}
 if(code>=c._QK_KB&&code<c._QK_KB+customLabels.length)return customLabels[code-c._QK_KB];
 if(code>=c._QK_MACRO&&code<=c._QK_MACRO_MAX)return `宏 ${code-c._QK_MACRO+1}`;
 if(code>=0x100&&code<=0x1fff){const mods=code>>8;return [...(mods&1?['Ctrl']:[]),...(mods&2?['Shift']:[]),...(mods&4?['Alt']:[]),...(mods&8?['Win']:[]),codeLabel(code&255)].join('+');}
 return hex(code);
}
function layout(){
 const result=[];let y=0;
 const def=definitions[state.variant+'-usb'];
 def.layouts.keymap.slice(0,6).forEach((row,ri)=>{let x=0,w=1,h=1,ki=0;for(const item of row){if(typeof item==='object'){x+=item.x||0;y+=item.y||0;w=item.w??w;h=item.h??h;}else {if(x<16){const [r,c]=item.split(',').map(Number);result.push({row:r,col:c,index:r*16+c,x,y,w,h,label:labels[ri][ki]||item,ri});ki++;}x+=w;w=h=1;}}y+=1;});return result;
}
function preview(){
 const c=codesNew, keys=Array.from({length:4},()=>Array(128).fill(1));
 for(const k of layout()){let name=Object.keys(aliases).find(n=>aliases[n]===k.label)||`KC_${k.label.toUpperCase()}`;let value=c[name]??0;
 if(k.label==='Fn')value=c._QK_MOMENTARY+1;if(k.label==='Shift')value=k.col===0?225:229;if(k.label==='Ctrl')value=k.col===0?224:228;if(k.label==='Win')value=227;if(k.label==='Alt')value=226;keys[0][k.index]=value;keys[2][k.index]=value;}
 state.keymap=keys;state.baseline=clone(keys);state.layer=0;state.selected=0;state.version=11;state.lighting={brightness:7,effect:1,speed:2,hue:0,saturation:255};state.lightBaseline=clone(state.lighting);
}
function changed(){const changes=[];state.keymap.forEach((l,li)=>l.forEach((v,i)=>{if(v!==state.baseline[li]?.[i])changes.push({layer:li,index:i,value:v});}));return changes;}
function lightDirty(){return JSON.stringify(state.lighting)!==JSON.stringify(state.lightBaseline);}
function log(message){state.log.unshift(`${new Date().toLocaleTimeString()}  ${message}`);state.log=state.log.slice(0,80);$('#logs').textContent=state.log.join('\n');}
let toastTimer;function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);log(message);}
function setNotice(text,sub='',type=''){const el=$('#notice');el.className='notice '+type;el.children[1].replaceChildren(document.createTextNode(text));const small=document.createElement('small');small.textContent=sub;el.children[1].append(small);}
function confirmAction(title,message){const d=$('#confirm-dialog');$('#confirm-title').textContent=title;$('#confirm-message').textContent=message;return new Promise(resolve=>{let accepted=false;$('#confirm-yes').onclick=()=>{accepted=true;d.close();};$('#confirm-no').onclick=()=>d.close();d.onclose=()=>resolve(accepted);d.showModal();});}
function renderKeyboard(){
 const el=$('#keyboard');el.replaceChildren();
 for(const k of layout()){const btn=document.createElement('button'),value=state.keymap[state.layer]?.[k.index]??0;btn.className='key'+(k.label.length>1?' modifier':'')+(k.label==='Esc'?' esc':'')+(state.selected===k.index?' selected':'')+(value!==state.baseline[state.layer]?.[k.index]?' changed':'');btn.style.cssText=`left:${k.x/16*100}%;top:${k.y/6.1*100}%;width:${(k.w-.10)/16*100}%;height:${.87/6.1*100}%`;
 btn.textContent=codeLabel(value);btn.title=`${k.label} · ${k.row},${k.col} → ${codeLabel(value)} (${hex(value)})`;btn.setAttribute('aria-label',`${k.label}，矩阵 ${k.row},${k.col}，映射为 ${codeLabel(value)}`);btn.setAttribute('aria-pressed',String(state.selected===k.index));btn.disabled=state.busy;btn.onclick=()=>{state.selected=k.index;renderKeyboard();renderSelection();renderOptions();};el.append(btn);}
 $('#layers').replaceChildren(...state.keymap.map((_,i)=>{const b=document.createElement('button');b.textContent=`L${i}`;b.className=state.layer===i?'active':'';b.disabled=state.busy;b.title=`第 ${i} 层`;b.onclick=()=>{state.layer=i;render();};return b;}));
 $('#layer-hint').textContent=state.layer%2===1?`第 ${state.layer} 层 · Fn 功能层（以固件映射为准）`:`第 ${state.layer} 层 · 点击键帽选择要更改的按键`;
}
function renderSelection(){const key=layout().find(k=>k.index===state.selected),value=state.keymap[state.layer]?.[state.selected]??0;$('#selected-key').textContent=key?.label||'?';$('#selected-meta').textContent=`第 ${state.layer} 层 · 矩阵 ${Math.floor(state.selected/16)},${state.selected%16}`;$('#assigned-key').textContent=codeLabel(value);$('#assigned-code').textContent=hex(value);}
function options(){const c=codes();
 if(state.category==='basic')return Object.entries(c).filter(([n,v])=>n.startsWith('KC_')&&(v<=0x73||v>=0xe0&&v<=0xe7)).map(([n,v])=>({name:aliases[n]||n.slice(3),code:v,search:n}));
 if(state.category==='media')return ['KC_MUTE','KC_VOLU','KC_VOLD','KC_MPLY','KC_MPRV','KC_MNXT','KC_MSTP','KC_MSEL','KC_CALC','KC_MYCM'].filter(n=>c[n]!=null).map(n=>({name:aliases[n],code:c[n],search:n}));
 if(state.category==='layer')return state.keymap.flatMap((_,i)=>[{name:`按住 Fn(${i})`,code:c._QK_MOMENTARY+i},{name:`切换 TG(${i})`,code:c._QK_TOGGLE_LAYER+i}]);
 if(state.category==='custom')return [...customAllowed.filter(i=>i<definitions[state.variant+'-usb'].customKeycodes.length).map(i=>({name:customLabels[i],code:c._QK_KB+i})),...(state.variant==='rgb'?['RGB_TOG','RGB_MOD','RGB_RMOD','RGB_VAI','RGB_VAD','RGB_SPI','RGB_SPD'].filter(n=>c[n]!=null).map(n=>({name:aliases[n],code:c[n]})):[])];
 return [];
}
function assign(value){if(state.busy)return;state.keymap[state.layer][state.selected]=value;render();}
function renderOptions(){
 const shortcut=state.category==='shortcut';$('#shortcut-editor').hidden=!shortcut;$('#key-options').hidden=shortcut;$$('#key-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.category===state.category));
 const query=$('#key-search').value.toLowerCase();$('#key-options').replaceChildren(...options().filter(o=>(o.name+' '+(o.search||'')+' '+hex(o.code)).toLowerCase().includes(query)).map(o=>{const b=document.createElement('button');b.className='key-option'+(o.name.length>4?' wide':'')+(state.keymap[state.layer][state.selected]===o.code?' chosen':'');b.textContent=o.name;b.title=hex(o.code);b.disabled=state.busy;b.onclick=()=>assign(o.code);return b;}));
}
function renderLighting(){const l=state.lighting;if(!l)return;$('#effects').replaceChildren(...effects.map((n,i)=>{const b=document.createElement('button');b.className='effect'+(l.effect===i?' active':'');const s=document.createElement('span');s.textContent=String(i).padStart(2,'0');b.append(s,document.createTextNode(n));b.disabled=state.busy||state.variant==='plain';b.onclick=()=>{state.lighting.effect=i;renderLighting();renderStatus();};return b;}));
 for(const name of ['brightness','speed','hue','saturation']){$('#'+name).value=l[name];$('#'+name).disabled=state.busy||state.variant==='plain';}
 $('#brightness-out').textContent=`${l.brightness} / 9`;$('#speed-out').textContent=`${l.speed} / 4`;$('#hue-out').textContent=Math.round(l.hue/255*360)+'°';$('#saturation-out').textContent=Math.round(l.saturation/255*100)+'%';$('.light-art').style.setProperty('--hue',l.hue/255*360);
 $('#light-read-status').textContent=state.variant==='plain'?'无光版不支持 RGB 灯光':state.lightingAvailable?(lightDirty()?'有待保存的灯光修改':'已读取键盘灯光'):'离线灯光预览';
}
function renderStatus(){const changes=changed(),connected=!!state.kb;
 $('#device-status').className=connected?'connected':'';$('#device-status').lastChild.textContent=connected?`Rainy 75 · ${state.info.productId===0x5088?'2.4G':'USB'}`:' 尚未连接';
 $('#connect').textContent=state.busy?'处理中…':connected?'已连接 ↗':'连接键盘 ↗';$('#mode-pill').textContent=connected?`● ${state.info.transport==='local'?'本地直连':'WebHID'} / VIA ${state.version}`:'○ 离线预览';
 const status=saveState({connected,busy:state.busy,keyChanges:changes.length,lightingDirty:lightDirty(),lightingAvailable:state.lightingAvailable,variant:state.variant});
 $('#save-dot').classList.toggle('dirty',changes.length>0||lightDirty());$('#save-status').textContent=status.message;$('#save-subtitle').textContent=status.hint;
 $('#save').hidden=!connected;$('#save').disabled=status.disabled;$('#save').textContent=status.label;$('#save').title=status.hint;$('#undo').disabled=state.busy||(!changes.length&&!lightDirty());$('#reload').disabled=!connected||state.busy;
 for(const s of ['#connect','#disconnect','#transport','#export-profile','#import-profile','#export-backup','#restore-backup','#assign-shortcut'])$(s).disabled=state.busy;
 $('#variant').disabled=state.busy||connected;$('#disconnect').disabled=state.busy||!connected;$('#export-backup').disabled=state.busy||!state.snapshot;$('#restore-backup').disabled=state.busy||!connected||!state.snapshot;
 $('#profile-info').textContent=`${state.keymap.length} 层 × 128 矩阵位置 · ${state.variant==='rgb'?'RGB':'无光'}版 · ${connected?'真实设备配置':'离线预览配置'}。只导入键位；键位与灯光修改通过页面底部统一保存，宏内容不包含在备份中。`;
 $('#device-details').replaceChildren();for(const [k,v] of [['设备状态',connected?'已连接':'未连接'],['型号',`Rainy 75 ${state.variant==='rgb'?'RGB':'无光'}版（手动选择）`],['连接',connected?(state.info.productId===0x5088?'2.4G 接收器':'USB 有线'):'USB / 2.4G'],['设备标识',connected?`${hex(VID)} : ${hex(state.info.productId)}`:'等待设备'],['VIA 协议',connected?`v${state.version} · ${state.keymap.length} 层`:'等待握手'],['键位保存','逐项块写入 + 回读验证'],['固件更新','不刷写固件']]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;$('#device-details').append(dt,dd);}
 renderLighting();
}
function render(){renderKeyboard();renderSelection();renderOptions();renderStatus();}
const pageLabels={keymap:['01 / KEY MAPPING','每一键，','都由你定义。'],lighting:['02 / LIGHTING','让光，','跟随你的节奏。'],profiles:['03 / PROFILES','好用的习惯，','值得保存。'],test:['04 / KEY TEST','敲一下，','看见每次回应。'],device:['05 / DEVICE','你的键盘，','一目了然。']};
function page(name){state.page=name;$$('.page').forEach(p=>p.hidden=p.id!==`page-${name}`);$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===name));const [k,t,s]=pageLabels[name];$('#page-kicker').textContent=k;$('#page-title').replaceChildren(document.createTextNode(t));const span=document.createElement('span');span.textContent=s;$('#page-title').append(span);}
let sessionToken;
async function localRequest(path,data){if(!sessionToken){const r=await fetch('/api/session');sessionToken=(await r.json()).token;}const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Rainy-Token':sessionToken},body:JSON.stringify(data||{})});const body=await r.json();if(!r.ok)throw Error(body.error||'本地服务不可用');return body;}
class LocalTransport {exchange(packet){return localRequest('report',{packet}).then(r=>r.data);}close(){return localRequest('disconnect');}}
class BrowserTransport {
 constructor(device){this.device=device;this.pending=null;this.queue=Promise.resolve();this.listener=e=>{const bytes=[...new Uint8Array(e.data.buffer,e.data.byteOffset,e.data.byteLength)];if(e.reportId===0&&this.pending&&matches(this.pending.packet,bytes))this.pending.done(null,bytes);};device.addEventListener('inputreport',this.listener);}
 exchange(packet){const task=this.queue.then(()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>done(Error('键盘响应超时，请重新连接')),2200);const done=(err,data)=>{clearTimeout(timer);this.pending=null;err?reject(err):resolve(data);};this.pending={packet,done};const bytes=new Uint8Array(32);bytes.set(packet);this.device.sendReport(0,bytes).catch(done);}));this.queue=task.catch(()=>{});return task;}
 async close(){this.pending?.done(Error('连接已断开'));this.device.removeEventListener('inputreport',this.listener);if(this.device.opened)await this.device.close();}
}
async function closeConnection(){const kb=state.kb;state.kb=null;state.info=null;state.lightingAvailable=false;if(kb)try{await kb.transport.close();}catch{} }
async function connect(){
 if(state.busy)return;
 if((changed().length||lightDirty())&&!await confirmAction('读取键盘配置？','连接会载入设备的真实配置，并放弃当前尚未保存的预览修改。'))return;
 state.busy=true;render();let transport;
 try{
  await closeConnection();let info;
  if($('#transport').value==='webhid'){
   if(!navigator.hid)throw Error('当前浏览器不支持 WebHID，请使用本地直连或桌面 Chrome / Edge。');
   const devices=await navigator.hid.requestDevice({filters:PIDS.map(productId=>({vendorId:VID,productId,usagePage:0xff60,usage:0x61}))});
   if(!devices.length)throw Error('未选择设备');const device=devices[0];await device.open();transport=new BrowserTransport(device);info={productName:device.productName,vendorId:device.vendorId,productId:device.productId,transport:'webhid'};
  }else{info=await localRequest('connect');transport=new LocalTransport();}
  const kb=await new ViaKeyboard(transport).init();const keymap=await kb.readKeymap(p=>{$('#save-status').textContent=`读取键位 ${Math.round(p*100)}%`;});
  state.kb=kb;state.info=info;state.version=kb.version;state.keymap=keymap;state.baseline=clone(keymap);state.layer=0;state.selected=0;
  state.lightingAvailable=false;if(state.variant==='rgb'){try{state.lighting=await kb.readLighting();state.lightBaseline=clone(state.lighting);state.lightingAvailable=true;}catch(e){log('灯光读取未成功：'+e.message);}}
  state.snapshot=makeProfile('连接原始备份');try{localStorage.setItem('rainy75-last-backup',JSON.stringify(state.snapshot));}catch{}
  setNotice('已连接 Rainy 75，你的真实设置已就绪。',`已读取 ${kb.layers} 层键位${state.lightingAvailable?'与 RGB 灯光':''} · 编辑后点击保存才会写入键盘`,'success');toast('设备读取完成，已保留原始键位快照');
 }catch(e){if(transport)try{await transport.close();}catch{}state.kb=null;state.info=null;state.lightingAvailable=false;setNotice('连接未完成',e.message,'error');toast(e.message);}
 finally{state.busy=false;render();}
}
function makeProfile(label='Rainy 75 配置'){return {format:'rainy75-studio/1',keymapReadVersion:2,name:label,variant:state.variant,matrix:{rows:8,cols:16},version:state.version,createdAt:new Date().toISOString(),source:state.kb?'device':'preview',keymap:clone(state.keymap)};}
function download(p,name){const url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function save(){
 if(!state.kb||state.busy)return;const changes=changed();if(!changes.length)return;
 // Make a durable pre-write backup, even after several saves in one connection.
 try{localStorage.setItem('rainy75-before-save',JSON.stringify({...makeProfile('写入前备份'),keymap:clone(state.baseline)}));}catch{download({...makeProfile('写入前备份'),keymap:clone(state.baseline)},'Rainy75-before-save.json');}
 state.busy=true;render();let completed=0;
 try{
  for(const change of changes){const actual=await state.kb.readKey(change.layer,change.index);if(actual!==state.baseline[change.layer][change.index])throw Error(`第 ${change.layer} 层矩阵 ${Math.floor(change.index/16)},${change.index%16} 与读取快照不一致（快照 ${hex(state.baseline[change.layer][change.index])}，当前 ${hex(actual)}），请重新读取；不一定是其他程序修改`);}
  for(const change of changes){await state.kb.writeKey(change.layer,change.index,change.value);state.baseline[change.layer][change.index]=change.value;completed++;$('#save-status').textContent=`写入并校验 ${completed} / ${changes.length}`;}
  toast(`${completed} 个键位已保存，回读校验通过`);setNotice('键位已保存到键盘。',`本次 ${completed} 个修改均已回读核对`,'success');
 }catch(e){setNotice(`保存中断，已确认 ${completed} / ${changes.length} 个修改`,e.message+'；请重新连接读取实际状态。','error');toast('保存中断：'+e.message);await closeConnection();}
 finally{state.busy=false;render();}
}
async function saveLighting(){if(!state.kb||!state.lightingAvailable||state.busy)return;state.busy=true;render();try{state.lighting=await state.kb.writeLighting(clone(state.lighting));state.lightBaseline=clone(state.lighting);toast('灯光参数已回读一致，请核对键盘实际灯光');setNotice('灯光参数已提交；实际灯光仍需核对。','全黑请按 Fn+Backspace；颜色不统一请按 Fn+Enter 切到单色，再调整色相并保存。');}catch(e){setNotice('灯光保存未完成',e.message+'；请重新连接确认实际灯光状态。','error');toast(e.message);await closeConnection();}finally{state.busy=false;render();}}
$$('.nav-item').forEach(b=>b.onclick=()=>page(b.dataset.page));
$$('#key-tabs button').forEach(b=>b.onclick=()=>{state.category=b.dataset.category;renderOptions();});$('#key-search').oninput=renderOptions;
$('#connect').onclick=connect;
if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname)){
 const localOption=$('#transport option[value="local"]');
 localOption.hidden=true;localOption.disabled=true;
 $('#page-device .device-options + p').textContent='默认使用浏览器 WebHID。选择型号后点击页面右上角“连接键盘”，并在桌面 Chrome / Edge 的设备选择框中授权。RGB 与无光版共用设备 ID，请按实际型号选择。';
}
$('#theme').onclick=()=>{document.body.classList.toggle('dark');try{localStorage.setItem('rainy-theme',document.body.classList.contains('dark')?'dark':'light');}catch{}};
try{if(localStorage.getItem('rainy-theme')==='dark')document.body.classList.add('dark');}catch{}
$('#disconnect').onclick=async()=>{if((changed().length||lightDirty())&&!await confirmAction('断开连接？','尚未保存的修改会保留在页面预览中，不会自动写入设备。'))return;await closeConnection();setNotice('已断开连接','可以继续预览；下次连接将重新载入设备配置。');render();};
$('#variant').onchange=()=>{state.variant=$('#variant').value;state.snapshot=null;preview();render();};
$('#save').onclick=async()=>{if(state.busy||!state.kb)return;if(changed().length)await save();if(state.kb&&state.lightingAvailable&&lightDirty())await saveLighting();};$('#reload').onclick=connect;
$('#undo').onclick=()=>{state.keymap=clone(state.baseline);state.lighting=clone(state.lightBaseline);render();toast('已撤销尚未保存的修改');};
for(const n of ['brightness','speed','hue','saturation'])$('#'+n).oninput=e=>{state.lighting[n]=Number(e.target.value);renderStatus();};
for(const hue of [0,21,43,85,128,170,213]){const b=document.createElement('button');b.style.background=`hsl(${hue/255*360} 85% 60%)`;b.title=`色相 ${Math.round(hue/255*360)}°`;b.setAttribute('aria-label',b.title);b.onclick=()=>{if(state.busy||state.variant==='plain')return;state.lighting.hue=hue;state.lighting.saturation=255;renderStatus();};$('#swatches').append(b);}
$('#export-profile').onclick=()=>download(makeProfile(),`Rainy75-${state.kb?'device':'preview'}-${Date.now()}.json`);
$('#export-backup').onclick=()=>{if(state.snapshot)download(state.snapshot,'Rainy75-original-backup.json');};
$('#restore-backup').onclick=()=>{if(state.snapshot){state.keymap=validateProfile(state.snapshot,{variant:state.variant,layers:state.keymap.length});render();toast('原始键位已载入待保存列表');}};
$('#import-profile').onclick=()=>$('#profile-file').click();$('#profile-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>250000)throw Error('配置文件过大');const p=JSON.parse(await file.text()),keymap=validateProfile(p,{variant:state.variant,layers:state.keymap.length});if(p.keymapReadVersion!==2)throw Error('这是旧版读取方式导出的配置，可能包含跨层错误。请重新连接后导出新配置');if(p.version!==state.version)throw Error('配置的 VIA 协议版本不匹配，不能直接导入');state.keymap=keymap;render();toast(`已导入 ${changed().length} 个键位差异，点击保存后才会写入设备`);}catch(err){toast('导入失败：'+err.message);}finally{e.target.value='';}};
for(const [n,v] of Object.entries(codesNew).filter(([n,v])=>n.startsWith('KC_')&&v>=4&&v<=0x73)){const o=document.createElement('option');o.value=v;o.textContent=aliases[n]||n.slice(3);$('#shortcut-key').append(o);}
$('#assign-shortcut').onclick=()=>{const mask=$$('.modifier-row input:checked').reduce((n,e)=>n|Number(e.value),0);if(!mask){toast('请至少选择一个修饰键');return;}assign((mask<<8)|Number($('#shortcut-key').value));};
const tested=new Set(),held=new Set();let repeats=0;function renderTest(){const el=$('#tested-keys');el.replaceChildren(...[...tested].map(code=>{const s=document.createElement('span');s.textContent=code;s.className=held.has(code)?'held':'';return s;}));$('#test-count').textContent=tested.size;$('#test-held').textContent=held.size;$('#test-repeat').textContent=repeats;}
$('#test-surface').onkeydown=e=>{if(e.code==='Tab')return;e.preventDefault();tested.add(e.code);held.add(e.code);if(e.repeat)repeats++;$('#last-key').textContent=e.key===' '?'Space':e.key;$('#test-code').textContent=`${e.code} · keyCode ${e.keyCode}${e.repeat?' · repeat':''}`;renderTest();};$('#test-surface').onkeyup=e=>{if(e.code!=='Tab')e.preventDefault();held.delete(e.code);renderTest();};$('#test-surface').onblur=()=>{held.clear();renderTest();};$('#clear-test').onclick=()=>{tested.clear();held.clear();repeats=0;$('#last-key').textContent='准备好了吗？';$('#test-code').textContent='点击此处开始测试';renderTest();};
window.addEventListener('beforeunload',e=>{if(state.busy||changed().length||lightDirty()){e.preventDefault();e.returnValue='';}});
navigator.hid?.addEventListener('disconnect',async e=>{if(state.kb?.transport.device===e.device){await closeConnection();setNotice('键盘已断开','重新连接后可再次读取。','error');render();}});
preview();render();log('Rainy Studio 已就绪。连接时只读取，不自动写入设置。');

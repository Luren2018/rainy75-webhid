export const VID = 0x320f;
export const PIDS = [0x5055, 0x5088];
export const hex = n => '0x' + n.toString(16).toUpperCase().padStart(4, '0');
export function validatePacket(p) {
  if (!Array.isArray(p) || p.length > 32 || !p.length || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) throw Error('无效的数据包');
  const [cmd,a,b,c] = p;
  if ([1,17,12,13].includes(cmd) && p.length === 1) return;
  if ([18,19].includes(cmd) && p.length === (cmd === 18 ? 4 : 4+c) && c > 0 && c <= 28 && a*256+b+c <= 4096 && c % 2 === 0 && b % 2 === 0) return;
  if (cmd === 8 && a === 3 && b >= 1 && b <= 4 && p.length === 3) return;
  if (cmd === 7 && a === 3 && ((b === 1 && c <= 9) || (b === 2 && c <= 18) || (b === 3 && c <= 4)) && p.length === 4) return;
  if (cmd === 7 && a === 3 && b === 4 && p.length === 5) return;
  if (cmd === 9 && a === 3 && p.length === 2) return;
  throw Error('此操作不在 Rainy 75 支持的指令范围内');
}
export function matches(p, reply) {
  const length = [18,19].includes(p[0]) ? 4 : [7,8].includes(p[0]) ? 3 : p[0] === 9 ? 2 : 1;
  return reply.length === 32 && p.slice(0,length).every((n,i) => n === reply[i]);
}
export function validateProfile(p, {variant,layers}) {
  if (p?.format !== 'rainy75-studio/1' || p.variant !== variant || p.matrix?.rows !== 8 || p.matrix?.cols !== 16 || !Array.isArray(p.keymap) || p.keymap.length !== layers || p.keymap.some(l => !Array.isArray(l) || l.length !== 128 || l.some(n => !Number.isInteger(n) || n<0 || n>65535))) throw Error('配置不匹配：请使用相同 RGB / 无光型号和层数的 Rainy Studio 配置');
  return p.keymap.map(l => [...l]);
}
export class ViaKeyboard {
  constructor(transport) { this.transport=transport; this.layers=0; this.version=0; }
  async command(p) { validatePacket(p); return this.transport.exchange(p); }
  async init() {
    const v = await this.command([1]); this.version=v[1]*256+v[2];
    if (![9,10,11,12].includes(this.version)) throw Error(`暂不支持 VIA 协议 ${this.version}；未发送任何设置指令`);
    const l=await this.command([17]); this.layers=l[1];
    if (this.layers < 1 || this.layers > 16) throw Error('设备返回的层数无效');
    return this;
  }
  async readKeymap(progress=()=>{}) {
    const data=[]; const total=this.layers*256;
    for(let offset=0;offset<total;) {
      // Rainy firmware cannot read through a 256-byte layer boundary.
      const size=Math.min(28,total-offset,256-offset%256), r=await this.command([18,offset>>8,offset&255,size]);
      data.push(...r.slice(4,4+size)); progress(Math.min(1,(offset+size)/total));
      offset+=size;
    }
    return Array.from({length:this.layers},(_,l)=>Array.from({length:128},(_,k)=>data[l*256+k*2]*256+data[l*256+k*2+1]));
  }
  async readKey(layer,index) {
    const offset=(layer*128+index)*2;
    const r=await this.command([18,offset>>8,offset&255,2]); return r[4]*256+r[5];
  }
  async writeKey(layer,index,value) {
    if(!Number.isInteger(layer)||layer<0||layer>=this.layers||!Number.isInteger(index)||index<0||index>=128||!Number.isInteger(value)||value<0||value>65535) throw Error('无效的键位');
    const offset=(layer*128+index)*2;
    await this.command([19,offset>>8,offset&255,2,value>>8,value&255]);
    if(await this.readKey(layer,index)!==value) throw Error(`第 ${layer} 层键位回读不一致；请重新读取设备`);
  }
  async readLighting() {
    const values=[];
    for(let id=1;id<=4;id++) values.push((await this.command([8,3,id])).slice(3,id===4?5:4));
    const [brightness,effect,speed,color]=values;
    if(brightness[0]>9||effect[0]>18||speed[0]>4) throw Error('灯光数据与官方 RGB 定义不一致');
    return {brightness:brightness[0],effect:effect[0],speed:speed[0],hue:color[0],saturation:color[1]};
  }
  async writeLighting(value) {
    const before=await this.readLighting();
    // Do not reselect the effect on color/brightness-only edits. The firmware
    // also has a physical single-color/multicolor state (Fn+Enter).
    const writes=[
      [2,['effect']],[1,['brightness']],[3,['speed']],[4,['hue','saturation']]
    ].filter(([,keys])=>keys.some(key=>before[key]!==value[key]));
    for(const [id,keys] of writes) await this.command([7,3,id,...keys.map(key=>value[key])]);
    const read=await this.readLighting();
    if(Object.keys(read).some(k=>read[k]!==value[k])) throw Error('灯光回读不一致，尚未保存到板载存储');
    if(writes.length) await this.command([9,3]);
    return read;
  }
}

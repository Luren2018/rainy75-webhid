export function saveState({connected,busy,keyChanges,lightingDirty,lightingAvailable,variant}) {
  if(busy)return {disabled:true,label:'正在同步…',message:'正在与键盘同步…',hint:'请等待当前操作完成',action:'none'};
  if(!connected)return {disabled:true,label:'连接后可保存',message:'尚未连接，当前修改只在预览中',hint:'点击页面右上角连接键盘，读取真实设置后即可保存',action:'none'};
  const lights=lightingDirty&&lightingAvailable&&variant==='rgb';
  const parts=[...(keyChanges?[`${keyChanges} 个键位`]:[]),...(lights?['灯光']:[])];
  return {disabled:!parts.length,label:parts.length?'保存修改到键盘 ↗':'没有待保存的修改',message:parts.length?parts.join('及')+'待保存':'所有设置已同步',hint:parts.length?'将保存键位和灯光改动，并回读核对':'先点击键帽选择新功能，或调整灯光后保存',action:'save'};
}

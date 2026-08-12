// ============ 地图 ============
let map=null, mouseTool=null, rangingTool=null;
function initMap(){
  if(typeof AMap==='undefined'){ $('#mapBadge').textContent='地图模式：演示兜底（未配置高德 Key）'; return; }
  try{
    map=new AMap.Map('map',{viewMode:'3D',pitch:45,zoom:12,center:[113.264,23.129]});
    $('#mapFallback').style.display='none';
    $('#mapBadge').textContent='地图模式：高德 JS API v2.0（三维）';
    mouseTool=new AMap.MouseTool(map);
    mouseTool.on('draw',e=>{ toast('已绘制要素，可交给 AI 进一步处理'); });
  }catch(err){ $('#mapBadge').textContent='地图模式：演示兜底（初始化失败）'; }
}

// ============ 地图工具条 ============
document.querySelectorAll('.mt-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    const t=b.dataset.tool;
    document.querySelectorAll('.mt-btn').forEach(x=>x.classList.remove('active'));
    if(t==='zoomIn'){ map?map.zoomIn():toast('演示模式：放大（未接入高德）'); return; }
    if(t==='zoomOut'){ map?map.zoomOut():toast('演示模式：缩小（未接入高德）'); return; }
    if(t==='layer'){ toast('图层管理面板（演示）'); return; }
    b.classList.add('active');
    if(!map){ toast('演示模式：'+b.title+'（未配置高德 Key）'); return; }
    if(t==='point') mouseTool.marker({});
    else if(t==='line') mouseTool.polyline({});
    else if(t==='polygon') mouseTool.polygon({});
    else if(t==='measure'){ rangingTool=new AMap.RangingTool(map); rangingTool.turnOn(); }
    else if(t==='select'){ toast('圈选范围后将回传对话区（演示）'); mouseTool.circle({}); }
  });
});


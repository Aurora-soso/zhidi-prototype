// ============ 地图（Leaflet + OpenStreetMap，免 key 方案） ============
// 演示用，无需注册 / 无需 Key / 无域名白名单限制。
// 后续接入高德时，只需替换 initMap 与工具条部分，外部调用（core.js 中 initMap()）不变。
let map = null, drawMode = null, drawPts = [], drawPreview = null, drawLayer = null, measureLayer = null;

function initMap(){
  if(map){
    if(typeof map.invalidateSize === 'function') map.invalidateSize();
    return map;
  }
  if(typeof L === 'undefined'){
    $('#mapBadge').textContent = '地图模式：加载失败（Leaflet 未引入）';
    return;
  }
  try{
    map = L.map('map', { zoomControl:false }).setView([23.129, 113.264], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19, attribution:'&copy; OpenStreetMap'
    }).addTo(map);
    $('#mapFallback').style.display = 'none';
    $('#mapBadge').textContent = '地图模式：Leaflet + OpenStreetMap（免 key）';
    map.on('click', onMapClick);
    map.on('dblclick', endDraw);
  }catch(err){
    $('#mapBadge').textContent = '地图模式：初始化失败';
  }
}

// 工作台默认可见，脚本加载完成后即初始化；登录流程再次调用时保持幂等。
initMap();

function setActiveBtn(t){
  document.querySelectorAll('.map-tool-action').forEach(x=>x.classList.toggle('active', x.dataset.tool === t));
}

function clearDraw(){
  drawPts = [];
  if(drawPreview){ map.removeLayer(drawPreview); drawPreview = null; }
}

function enterDraw(mode){
  drawMode = mode;
  setActiveBtn(mode);
  if(mode) clearDraw();
  // 绘制模式下禁用双击缩放，避免与「双击结束绘制」冲突
  if(map){ mode ? map.doubleClickZoom.disable() : map.doubleClickZoom.enable(); }
}

function onMapClick(e){
  if(!drawMode) return;
  drawPts.push(e.latlng);

  // 打点：点击即生成 marker
  if(drawMode === 'point'){
    if(!drawLayer) drawLayer = L.layerGroup().addTo(map);
    drawLayer.addLayer(L.marker(e.latlng).bindPopup('已标记位置').openPopup());
    document.dispatchEvent(new CustomEvent('map:annotation-created',{detail:{type:'point'}}));
    enterDraw(null); toast('已标记位置，可交给 AI 处理'); return;
  }

  if(drawMode === 'text'){
    if(!drawLayer) drawLayer = L.layerGroup().addTo(map);
    const label=L.marker(e.latlng,{icon:L.divIcon({className:'map-text-annotation',html:'文字标注',iconSize:[72,24],iconAnchor:[6,12]})});
    drawLayer.addLayer(label);
    document.dispatchEvent(new CustomEvent('map:annotation-created',{detail:{type:'text'}}));
    enterDraw(null);toast('已添加文字标注');return;
  }

  // 测距：点两点，逐段累加，弹出该段距离
  if(drawMode === 'measure'){
    if(drawPts.length < 2) return;
    const a = drawPts[drawPts.length - 2], b = drawPts[drawPts.length - 1];
    const d = map.distance(a, b);
    if(!measureLayer) measureLayer=L.layerGroup().addTo(map);
    measureLayer.addLayer(L.polyline([a, b], { color:'#10B981', weight:3, dashArray:'6,6' }));
    const distanceMarker=L.marker(b).bindPopup('＋ ' + d.toFixed(0) + ' m');
    measureLayer.addLayer(distanceMarker);distanceMarker.openPopup();
    drawPts = []; return;
  }

  // 圈选：点两点，以首点为圆心、两点距离为半径画圆
  if(drawMode === 'select'){
    if(drawPts.length < 2) return;
    const r = map.distance(drawPts[0], drawPts[1]);
    L.circle(drawPts[0], { radius:r, color:'#0EA5E9', weight:2, fillOpacity:.08 }).addTo(map);
    toast('圈选半径 ' + r.toFixed(0) + ' m，可回传对话区');
    enterDraw(null); return;
  }

  // 线 / 面：实时预览，双击结束
  if(drawPreview) map.removeLayer(drawPreview);
  const opt = drawMode === 'line'
    ? { color:'#3B82F6', weight:3 }
    : drawMode === 'measure-area'
      ? { color:'#0EA5E9', weight:2, dashArray:'6,5', fillOpacity:.08 }
      : { color:'#10B981', weight:3, fillOpacity:.12 };
  drawPreview = drawMode === 'line'
    ? L.polyline(drawPts, opt).addTo(map)
    : L.polygon(drawPts, opt).addTo(map);
}

function endDraw(){
  // point / measure / select 不靠双击结束
  if(!drawMode || drawMode === 'point' || drawMode === 'text' || drawMode === 'measure' || drawMode === 'select') return;
  if(drawPts.length >= 2){
    // 去掉双击产生的重复尾点
    if(drawPts[drawPts.length - 1].equals(drawPts[drawPts.length - 2])) drawPts.pop();
    const targetLayer=drawMode==='measure-area'
      ? (measureLayer||(measureLayer=L.layerGroup().addTo(map)))
      : (drawLayer||(drawLayer=L.layerGroup().addTo(map)));
    const opt = drawMode === 'line'
      ? { color:'#3B82F6', weight:3 }
      : drawMode === 'measure-area'
        ? { color:'#0EA5E9', weight:2, dashArray:'6,5', fillOpacity:.08 }
        : { color:'#10B981', weight:3, fillOpacity:.12 };
    if(drawMode === 'line') targetLayer.addLayer(L.polyline(drawPts, opt));
    else targetLayer.addLayer(L.polygon(drawPts, opt));
    if(drawMode === 'measure-area')toast('已完成面积测量（交互原型）');
    else{
      document.dispatchEvent(new CustomEvent('map:annotation-created',{detail:{type:drawMode}}));
      toast(drawMode === 'line' ? '已绘制线标注' : '已绘制面标注，可交给 AI 处理');
    }
  }
  enterDraw(null);
}

window.MapPreviewDrawing={
  enter:enterDraw,
  stop:()=>enterDraw(null),
  getMode:()=>drawMode,
  clear:()=>{if(drawLayer)drawLayer.clearLayers();clearDraw();enterDraw(null);},
  snapshot:()=>drawLayer?drawLayer.getLayers().slice():[],
  restore:layers=>{if(!Array.isArray(layers)||!layers.length)return;if(!drawLayer)drawLayer=L.layerGroup().addTo(map);layers.forEach(layer=>drawLayer.addLayer(layer));},
  removeLast:()=>{if(!drawLayer)return false;const layers=drawLayer.getLayers();if(!layers.length)return false;drawLayer.removeLayer(layers[layers.length-1]);return true;},
  annotationCount:()=>drawLayer?drawLayer.getLayers().length:0
};

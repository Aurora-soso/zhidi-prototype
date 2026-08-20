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
    map.on('contextmenu', onMapContextMenu);
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

  // 测距 / 测面：连续点击实时预览，右键结束显示数值
  if(drawMode === 'measure' || drawMode === 'measure-area'){
    if(drawPreview) map.removeLayer(drawPreview);
    drawPreview = drawMode === 'measure'
      ? L.polyline(drawPts, { color:'#10B981', weight:3, dashArray:'6,6' }).addTo(map)
      : L.polygon(drawPts, { color:'#0EA5E9', weight:2, dashArray:'6,5', fillOpacity:.08 }).addTo(map);
    return;
  }

  // 圈选：点两点，以首点为圆心、两点距离为半径画圆
  if(drawMode === 'select'){
    if(drawPts.length < 2) return;
    const r = map.distance(drawPts[0], drawPts[1]);
    L.circle(drawPts[0], { radius:r, color:'#0EA5E9', weight:2, fillOpacity:.08 }).addTo(map);
    toast('圈选半径 ' + r.toFixed(0) + ' m，可回传对话区');
    enterDraw(null); return;
  }

  // 线 / 面标注：实时预览，双击结束
  if(drawPreview) map.removeLayer(drawPreview);
  const opt = drawMode === 'line'
    ? { color:'#3B82F6', weight:3 }
    : { color:'#10B981', weight:3, fillOpacity:.12 };
  drawPreview = drawMode === 'line'
    ? L.polyline(drawPts, opt).addTo(map)
    : L.polygon(drawPts, opt).addTo(map);
}

function endDraw(){
  // point / measure / measure-area / select 不靠双击结束（测量改用右键结束）
  if(!drawMode || drawMode === 'point' || drawMode === 'text' || drawMode === 'measure' || drawMode === 'measure-area' || drawMode === 'select') return;
  if(drawPts.length >= 2){
    // 去掉双击产生的重复尾点
    if(drawPts[drawPts.length - 1].equals(drawPts[drawPts.length - 2])) drawPts.pop();
    const targetLayer=drawLayer||(drawLayer=L.layerGroup().addTo(map));
    const opt = drawMode === 'line'
      ? { color:'#3B82F6', weight:3 }
      : { color:'#10B981', weight:3, fillOpacity:.12 };
    if(drawMode === 'line') targetLayer.addLayer(L.polyline(drawPts, opt));
    else targetLayer.addLayer(L.polygon(drawPts, opt));
    document.dispatchEvent(new CustomEvent('map:annotation-created',{detail:{type:drawMode}}));
    toast(drawMode === 'line' ? '已绘制线标注' : '已绘制面标注，可交给 AI 处理');
  }
  enterDraw(null);
}

// ============ 测量：右键结束绘制并显示数值 ============
// 右键结束当前测量（测距总长 / 测面面积），在终点或图形上常显结果数值；工具保持激活可继续测下一条。
function onMapContextMenu(e){
  if(!drawMode) return;
  L.DomEvent.preventDefault(e);
  L.DomEvent.stopPropagation(e);
  if(drawMode === 'measure' || drawMode === 'measure-area'){
    finishMeasure();
  }
}

function formatDistance(m){
  if(m < 1000) return m.toFixed(0) + ' m';
  return (m/1000).toFixed(2) + ' km';
}
function formatArea(sqm){
  if(sqm < 10000) return sqm.toFixed(0) + ' ㎡';
  if(sqm < 1000000) return (sqm/10000).toFixed(2) + ' 公顷';
  return (sqm/1000000).toFixed(2) + ' km²';
}
// 球面多边形面积（平方米）：经纬度积分近似，城市级小范围精度足够
function geodesicArea(latlngs){
  const R = 6378137;
  let area = 0;
  const n = latlngs.length;
  for(let i=0;i<n;i++){
    const p1=latlngs[i], p2=latlngs[(i+1)%n];
    const lng1=p1.lng*Math.PI/180, lat1=p1.lat*Math.PI/180;
    const lng2=p2.lng*Math.PI/180, lat2=p2.lat*Math.PI/180;
    area += (lng2-lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs(area * R * R / 2);
}
// 生成测量数值标签（divIcon，常显 tooltip 样式），避免原生 marker 图标干扰图形
function measureLabelIcon(text){
  return L.divIcon({className:'map-measure-label',html:text,iconSize:[0,0],iconAnchor:[0,0]});
}
function finishMeasure(){
  if(drawMode !== 'measure' && drawMode !== 'measure-area') return;
  if(drawPts.length < 2){ clearDraw(); return; }
  if(!measureLayer) measureLayer = L.layerGroup().addTo(map);
  if(drawMode === 'measure'){
    // 测距：逐段累加总长，终点常显总距离
    let total = 0;
    for(let i=1;i<drawPts.length;i++) total += map.distance(drawPts[i-1], drawPts[i]);
    const opt = { color:'#10B981', weight:3, dashArray:'6,6' };
    const line = L.polyline(drawPts, opt);
    measureLayer.addLayer(line);
    const end = drawPts[drawPts.length-1];
    const label = L.marker(end, { icon:measureLabelIcon('↔ ' + formatDistance(total)), interactive:false });
    measureLayer.addLayer(label);
  }else{
    // 测面：计算球面面积，多边形中心常显面积
    const area = geodesicArea(drawPts);
    const opt = { color:'#0EA5E9', weight:2, dashArray:'6,5', fillOpacity:.08 };
    const poly = L.polygon(drawPts, opt);
    measureLayer.addLayer(poly);
    const center = poly.getBounds().getCenter();
    const label = L.marker(center, { icon:measureLabelIcon('△ ' + formatArea(area)), interactive:false });
    measureLayer.addLayer(label);
  }
  clearDraw(); // 清空当前点数组与预览（已完成的图形与数值保留在 measureLayer）
  toast(drawMode === 'measure' ? '测距完成：右键可继续测下一条，再次点击工具退出' : '测面完成：右键可继续测下一块，再次点击工具退出');
}

function clearMeasure(){
  if(measureLayer) measureLayer.clearLayers();
  clearDraw();
  enterDraw(null);
}

window.MapPreviewDrawing={
  enter:enterDraw,
  stop:()=>enterDraw(null),
  getMode:()=>drawMode,
  clear:()=>{if(drawLayer)drawLayer.clearLayers();clearDraw();enterDraw(null);},
  clearMeasure:clearMeasure,
  finishMeasure:finishMeasure,
  snapshot:()=>drawLayer?drawLayer.getLayers().slice():[],
  restore:layers=>{if(!Array.isArray(layers)||!layers.length)return;if(!drawLayer)drawLayer=L.layerGroup().addTo(map);layers.forEach(layer=>drawLayer.addLayer(layer));},
  removeLast:()=>{if(!drawLayer)return false;const layers=drawLayer.getLayers();if(!layers.length)return false;drawLayer.removeLayer(layers[layers.length-1]);return true;},
  annotationCount:()=>drawLayer?drawLayer.getLayers().length:0
};

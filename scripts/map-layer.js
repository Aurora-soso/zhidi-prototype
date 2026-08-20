// 本地矢量图层：选择、模拟加载到 Leaflet，显隐 / 透明度 / 排序管理，以及图例联动。
(function(){
  const button=document.querySelector('.map-toolbar [data-tool="load-local"]'),mask=$('#vectorSelectMask');
  const selectList=$('#vectorSelectList'),panel=$('#vectorLayerPanel'),layerList=$('#vectorLayerList');
  const legend=$('#mapLegend'),legendList=$('#mapLegendList'),legendCount=$('#mapLegendCount');
  const leafletLayers=new Map();
  let selectedLayerId='';

  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}

  // 各图层符号样式（面 / 线）与渲染基础参数，供图层渲染与图例复用。
  const layerStyles={
    building:{kind:'polygon',color:'#7C3AED',weight:2,fillColor:'#A78BFA',fillOpacity:.42},
    road:{kind:'polyline',color:'#F59E0B',weight:6,opacity:.85},
    river:{kind:'polyline',color:'#0EA5E9',weight:8,opacity:.7},
    landuse:{kind:'polygon',color:'#10B981',weight:2,fillColor:'#34D399',fillOpacity:.22},
    poi:{kind:'point',color:'#DC2626',weight:2,fillColor:'#F87171',fillOpacity:.85},
    terrain:{kind:'polygon',color:'#D97706',weight:2,fillColor:'#FBBF24',fillOpacity:.28},
    water:{kind:'polyline',color:'#06B6D4',weight:7,opacity:.7},
    redline:{kind:'polygon',color:'#DB2777',weight:2,fillColor:'#F472B6',fillOpacity:.22},
    control:{kind:'polygon',color:'#2563EB',weight:2,fillColor:'#60A5FA',fillOpacity:.2},
    ortho:{kind:'raster',color:'#64748B',weight:1,fillColor:'#94A3B8',fillOpacity:.15},
    dem:{kind:'raster',color:'#64748B',weight:1,fillColor:'#CBD5E1',fillOpacity:.18}
  };
  // 图例完全由「已加载的矢量图层」驱动（见 renderLegend / renderLegendItem），不再写死标准图例库。
  // 各图层的 legend 样式在 gis-workspace.js 的 scan() 中随图层数据一起定义。

  // 各图层模拟坐标数据（围绕广州中心 [23.132, 113.268]），供 createVisual 渲染 Leaflet 图层。
  const coords={
    building:[[23.138,113.258],[23.140,113.262],[23.137,113.267],[23.134,113.264],[23.136,113.259],
      [23.144,113.272],[23.147,113.276],[23.143,113.280],[23.140,113.277],[23.142,113.273],
      [23.128,113.280],[23.131,113.284],[23.127,113.288],[23.124,113.285],[23.126,113.281]],
    road:[[23.120,113.240],[23.130,113.250],[23.140,113.260],[23.150,113.270],[23.160,113.280],
      [23.125,113.290],[23.135,113.280],[23.145,113.270],[23.155,113.260]],
    river:[[23.110,113.230],[23.118,113.245],[23.126,113.260],[23.134,113.275],[23.142,113.290],[23.150,113.305]],
    landuse:[[23.148,113.248],[23.155,113.255],[23.152,113.265],[23.145,113.260],[23.148,113.250],
      [23.160,113.270],[23.168,113.278],[23.165,113.288],[23.158,113.283],[23.160,113.270],
      [23.118,113.295],[23.125,113.302],[23.122,113.312],[23.115,113.307],[23.118,113.295]],
    poi:[{lat:23.136,lng:113.262},{lat:23.144,lng:113.276},{lat:23.128,lng:113.284},{lat:23.152,lng:113.256},{lat:23.120,lng:113.298}],
    terrain:[[23.125,113.245],[23.132,113.250],[23.128,113.258],[23.121,113.253],[23.125,113.245],
      [23.134,113.242],[23.141,113.248],[23.137,113.255],[23.130,113.249],[23.134,113.242]],
    water:[[23.105,113.235],[23.112,113.248],[23.120,113.260],[23.128,113.272],[23.136,113.284],[23.144,113.296]],
    redline:[[23.150,113.250],[23.158,113.258],[23.154,113.268],[23.146,113.262],[23.150,113.250],
      [23.162,113.272],[23.169,113.280],[23.165,113.290],[23.157,113.284],[23.162,113.272]],
    control:[[23.135,113.270],[23.142,113.278],[23.138,113.286],[23.131,113.280],[23.135,113.270],
      [23.145,113.282],[23.152,113.290],[23.148,113.298],[23.141,113.292],[23.145,113.282]],
    ortho:[[23.095,113.215],[23.175,113.315]],
    dem:[[23.100,113.225],[23.170,113.305]]
  };

  function layerOpacity(layer){const o=Number(layer&&layer.opacity);return Number.isFinite(o)?Math.max(0,Math.min(1,o)):1;}
  function getLayerStyle(layer){
    return layer?.style||layerStyles[layer?.id]||{kind:'polygon',color:'#94A3B8',weight:2,fillColor:'#CBD5E1',fillOpacity:.2};
  }
  function styledOptions(layer){
    const style=getLayerStyle(layer);
    const o=layerOpacity(layer);
    if(style.kind==='polygon')return{color:style.color,weight:style.weight,fillColor:style.fillColor,opacity:o,fillOpacity:(style.fillOpacity??.2)*o};
    if(style.kind==='point')return{color:style.color,weight:style.weight,fillColor:style.fillColor,opacity:o,fillOpacity:(style.fillOpacity??.8)*o};
    return{color:style.color,weight:style.weight,opacity:o};
  }
  // 每个要素一个独立 Leaflet 图层，存入 layerGroup 以支持逐要素高亮与点击事件。
  // featureLayersMap: Map<layerId, L.layerGroup>  存储每层的要素图层组
  // featureIndexMap:  Map<layerId, LeafletLayer[]>  存储每层按序排列的独立要素图层
  const featureLayersMap=new Map();
  const featureIndexMap=new Map();
  function createVisual(layer){
    const style=getLayerStyle(layer);
    const opts=styledOptions(layer);
    const popup=layer.name+' · '+layer.type;
    const group=L.layerGroup();
    const featList=[];
    const pts=coords[layer.id];
    if(!pts||!pts.length)return group;
    if(style&&style.kind==='raster'){
      // 影像/地形（栅格）：渲染覆盖范围矩形（半透明占位，模拟影像底图 / 地形范围）
      const o=layerOpacity(layer);
      const rect=L.rectangle([pts[0],pts[1]],{...opts,fillColor:style.fillColor,fillOpacity:style.fillOpacity,opacity:o}).bindPopup(popup);
      rect._featureIndex=0;featList.push(rect);group.addLayer(rect);
      featureLayersMap.set(layer.id,group);
      featureIndexMap.set(layer.id,featList);
      return group;
    }
    if(style&&style.kind==='point'){
      pts.forEach((point,i)=>{
        const m=L.circleMarker(point,{radius:6,...opts}).bindPopup(popup);
        m._featureIndex=i;featList.push(m);group.addLayer(m);
      });
    }else if(style&&style.kind==='polyline'){
      // 每个坐标点与前一个点连成独立线段（首点自闭合小段）
      pts.forEach((pt,i)=>{
        const prev=i>0?pts[i-1]:pt;
        const seg=L.polyline([prev,pt],{...opts,weight:Math.max(4,(opts.weight||6)-1)}).bindPopup(popup+' #'+(i+1));
        seg._featureIndex=i;featList.push(seg);group.addLayer(seg);
      });
    }else{
      // 面要素：每个坐标点生成一个独立多边形（模拟建筑/地块），尺寸足够大以便点击
      pts.forEach((pt,i)=>{
        const d=0.004+0.0015*(i%4); // 错开避免重叠，基础约 440m + 偏移
        const ring=[
          [pt[0]+d, pt[1]-d*1.4],
          [pt[0]+d*1.2, pt[1]+d*0.6],
          [pt[0]-d*0.4, pt[1]+d*1.2],
          [pt[0]-d*1.4, pt[1]]
        ];
        const poly=L.polygon(ring,{...opts}).bindPopup(popup+' #'+(i+1));
        poly._featureIndex=i;featList.push(poly);group.addLayer(poly);
      });
    }
    featureLayersMap.set(layer.id,group);
    featureIndexMap.set(layer.id,featList);
    // 要素点击 → 广播 map:feature-clicked（供属性表联动）
    // 注意：L.layerGroup 不冒泡子图层事件，必须逐个绑定到每个要素图层上
    featList.forEach(featLayer=>{
      featLayer.on('click',function onFeatClick(e){
        // 阻止冒泡避免重复触发（Leaflet 会同时触发 map click）
        L.DomEvent.stopPropagation(e);
        if(typeof featLayer._featureIndex==='number'){
          document.dispatchEvent(new CustomEvent('map:feature-clicked',{detail:{layerId:layer.id,index:featLayer._featureIndex}}));
        }
      });
    });
    return group;
  }
  function loadedLayers(){return window.GISWorkspace?.getVectorLayers().filter(layer=>layer.loaded)||[];}
  // 选中图层变化后广播，供「查询要素属性」等依赖选中图层的模块刷新
  function notifySelectionChange(){document.dispatchEvent(new CustomEvent('map:layer-select-change',{detail:{id:selectedLayerId}}));}

  function positionSelect(){positionAnchoredPopover(button,mask.querySelector('.vector-select-modal'),'auto');}
  function close(){mask.classList.remove('show');}
  function updateCount(){$('#vectorSelectedCount').textContent=selectList.querySelectorAll('input:checked').length;}

  // 统计目录树中的文件节点数量（含嵌套），用于文件夹行的文件数角标
  function countFiles(nodes){
    let n=0;
    (nodes||[]).forEach(x=>{ if(x.kind==='file')n++; else if(x.kind==='folder')n+=countFiles(x.children); });
    return n;
  }
  // 递归渲染目录树：folder 渲染为可折叠行，file 渲染为带复选框的行（沿用三列 Grid 布局）
  function renderTree(nodes,depth){
    depth=depth||0;
    return (nodes||[]).map(node=>{
      if(node.kind==='folder'){
        const toggle=node.expanded?'▾':'▸';
        const children=`<div class="vector-folder-children${node.expanded?'':' hidden'}">${renderTree(node.children,depth+1)}</div>`;
        return `<div class="vector-folder-row${node.expanded?' expanded':''}" data-folder-row>
          <span class="vector-folder-toggle">${toggle}</span>
          <span class="vector-folder-icon">📂</span>
          <span class="vector-folder-name">${node.name}</span>
          <span class="vector-folder-count">${countFiles(node.children)} 个</span>
        </div>${children}`;
      }
      const indent=depth>0?` style="padding-left:${32+depth*18}px"`:'';
      const checked=node.loaded||node.id==='building'||node.id==='road'?'checked':'';
      return `<label class="vector-select-row"${indent}><span><input type="checkbox" value="${node.id}" ${checked}></span><span class="vector-file-name">${node.fileName}</span><span class="vector-file-type">${node.type}</span></label>`;
    }).join('');
  }
  // 绑定文件夹行的展开/折叠点击（点击文件夹行切换 children 显隐与箭头方向）
  function bindFolderToggles(){
    selectList.querySelectorAll('[data-folder-row]').forEach(row=>{
      row.addEventListener('click',()=>{
        const children=row.nextElementSibling;
        const expand=!row.classList.contains('expanded');
        row.classList.toggle('expanded',expand);
        row.querySelector('.vector-folder-toggle').textContent=expand?'▾':'▸';
        if(children&&children.classList.contains('vector-folder-children'))children.classList.toggle('hidden',!expand);
      });
    });
  }
  function open(){
    if(!window.GISWorkspace?.isReady()){toast('请先选择本地工作空间');return;}
    $('#vectorWorkspacePath').textContent=window.GISWorkspace.getPath();
    selectList.innerHTML=renderTree(window.GISWorkspace.getVectorTree(),0);
    bindFolderToggles();
    updateCount();mask.classList.add('show');requestAnimationFrame(positionSelect);
  }

  // 图例显隐：默认显示，有图层时才可见；由「显示管理」抽屉图例开关 / 图例关闭按钮 控制
  let legendVisible=true;
  function setLegendVisible(visible){
    legendVisible=Boolean(visible);
    if(legendVisible){renderLegend();}else{legend.hidden=true;}
    // 广播状态变化，供抽屉内图例开关等 UI 同步
    document.dispatchEvent(new CustomEvent('map:legend-change',{detail:{visible:legendVisible}}));
    return legendVisible;
  }
  // 图例项完全由图层数据驱动：优先使用图层携带的 legend 样式对象（来自 scan()），
  // 兜底用地图渲染样式 layerStyles + geometryType，保证动态图层（智能体统计结果等）也能正确显示。
  // 制图图例条目（cartoLegendId）支持双击弹出样式修改。
  function renderLegendItem(layer){
    const lg = (layer.legend && typeof layer.legend === 'object') ? layer.legend : null;
    const style = layerStyles[layer.id];
    let geom = lg?.type || style?.kind;
    if(!geom) geom = layer.geometryType==='面' ? 'polygon' : layer.geometryType==='线' ? 'line' : layer.geometryType==='点' ? 'point' : 'polygon';
    const fill = lg?.fill || style?.fillColor || layer.color || '#94A3B8';
    const stroke = lg?.stroke || style?.color || layer.color || '#94A3B8';
    const legendEditorId=layer.legendId||layer.cartoLegendId;
    const legendIdAttr = legendEditorId ? ` data-carto-legend-id="${esc(legendEditorId)}" title="点击修改该图例样式"` : '';
    if(geom==='point'){
      return `<li class="map-legend-item"${legendIdAttr}><span class="map-legend-symbol poi" style="background:${fill};border-color:${stroke};"></span><span class="map-legend-name">${esc(layer.legendName||layer.name)}</span></li>`;
    }
    if(geom==='line'){
      return `<li class="map-legend-item"${legendIdAttr}><span class="map-legend-symbol map-legend-symbol-line" style="border-top-color:${stroke};border-top-style:solid;"></span><span class="map-legend-name">${esc(layer.legendName||layer.name)}</span></li>`;
    }
    return `<li class="map-legend-item"${legendIdAttr}><span class="map-legend-symbol map-legend-symbol-polygon" style="background:${fill};border-color:${stroke};"></span><span class="map-legend-name">${esc(layer.legendName||layer.name)}</span></li>`;
  }
  // 图例只渲染「已加载的矢量图层」（含运行时动态图层）+ 制图图例条目（现状图 / 用户新建）。
  function renderLegend(){
    const loaded=loadedLayers();
    // 制图图例条目包装为类图层对象，复用 renderLegendItem 的面要素符号渲染；cartoLegendId 供双击修改
    const cartoItems=(window.Cartography?.getLegendItems?.()||[]).filter(item=>!item.layerId).map(item=>({
      id:'carto-'+item.id,name:item.name,color:item.color,geometryType:'面',cartoLegendId:item.id,
      legend:{type:'polygon',fill:item.color,stroke:item.borderColor}
    }));
    legendCount.textContent=loaded.length+cartoItems.length;
    legendList.innerHTML=[...loaded,...cartoItems].map(renderLegendItem).join('');
    legend.hidden=false;
  }

  // 单击图例面板中的制图图例条目 → 弹出样式修改弹窗（点击哪个图例，修改哪个图例的样式）
  legendList.addEventListener('click',event=>{
    const row=event.target.closest('li[data-carto-legend-id]');
    if(!row||!row.dataset.cartoLegendId)return;
    event.preventDefault();
    window.Cartography?.openLegendEditor?.(row.dataset.cartoLegendId);
  });

  // 单个图层行（checkbox 显隐 / 符号 / 名称 / 上移下移 / 移除），与旧版结构一致
  function renderLayerRow(layer){
    const symbolStyle=layer.dynamic&&layer.color?` style="background:${layer.color};${layer.geometryType==='面'?`border:1px solid ${layer.legend?.stroke||layer.color};height:12px`:''}"`:'';
    return `<div class="vlp-row ${selectedLayerId===layer.id?'selected':''}" data-layer-select="${esc(layer.id)}">
      <div class="vlp-row-main">
        <input type="checkbox" data-layer-id="${esc(layer.id)}" ${layer.visible?'checked':''} aria-label="显示 ${esc(layer.name)}">
        <span class="vlp-symbol ${esc(layer.id)}"${symbolStyle}></span>
        <span class="vlp-name">${esc(layer.layerName||layer.name)}</span>
        <span class="vlp-order">
          <button type="button" data-layer-move="up" title="上移一层" aria-label="上移 ${esc(layer.name)}">▲</button>
          <button type="button" data-layer-move="down" title="下移一层" aria-label="下移 ${esc(layer.name)}">▼</button>
        </span>
        <button type="button" class="vlp-row-remove" data-layer-remove="${esc(layer.id)}" title="从图层管理器移除" aria-label="移除 ${esc(layer.name)}">×</button>
      </div>
    </div>`;
  }
  // 一个分类父节点（矢量 / 影像地形），默认展开，可点击折叠
  function renderLayerGroup(name,icon,list,emptyHint){
    const children=list.length?list.map(renderLayerRow).join(''):`<div class="vlp-group-empty">${emptyHint}</div>`;
    return `<div class="vlp-group">
      <div class="vlp-group-head" data-group-head>
        <span class="vlp-group-toggle">▾</span>
        <span class="vlp-group-icon">${icon}</span>
        <span class="vlp-group-name">${name}</span>
        <span class="vlp-group-count">${list.length}</span>
      </div>
      <div class="vlp-group-children">${children}</div>
    </div>`;
  }
  function renderPanel(){
    const loaded=loadedLayers();
    $('#vectorLayerCount').textContent=loaded.length;
    if(selectedLayerId&&!loaded.some(layer=>layer.id===selectedLayerId)){selectedLayerId='';notifySelectionChange();}
    const vectors=loaded.filter(layer=>layer.category!=='raster');
    const rasters=loaded.filter(layer=>layer.category==='raster');
    layerList.innerHTML=
      renderLayerGroup('矢量','📐',vectors,'暂无矢量图层')+
      renderLayerGroup('影像','🛰️',rasters,'暂无影像图层');
    renderLegend();
  }
  // 折叠/展开图层分组（矢量 / 影像地形）
  function toggleLayerGroup(head){
    const group=head.closest('.vlp-group');
    if(!group)return;
    const collapse=!group.classList.contains('collapsed');
    group.classList.toggle('collapsed',collapse);
    head.querySelector('.vlp-group-toggle').textContent=collapse?'▸':'▾';
    const children=group.querySelector('.vlp-group-children');
    if(children)children.classList.toggle('hidden',collapse);
  }

  // 数组顺序即图层顺序：先渲染的在下层，后渲染的在上层。
  function applyZOrder(){
    loadedLayers().forEach((layer,index)=>{
      const visual=leafletLayers.get(layer.id);
      if(visual&&typeof map!=='undefined'&&map&&map.hasLayer(visual)){
        // 影像/地形（栅格）始终压底，矢量按加载顺序叠加在上层
        if(layer.category==='raster'&&typeof visual.bringToBack==='function')visual.bringToBack();
        else if(typeof visual.bringToFront==='function')visual.bringToFront();
      }
      const managedElement=layer.managedElementId&&document.getElementById(layer.managedElementId);if(managedElement)managedElement.style.zIndex=String(14+index);
    });
  }

  function load(){
    const selected=new Set([...selectList.querySelectorAll('input:checked')].map(input=>input.value));
    window.GISWorkspace.getVectorLayers().forEach(layer=>{
      if(!selected.has(layer.id))return;
      layer.loaded=true;layer.visible=true;
      let visual=leafletLayers.get(layer.id);
      if(!visual&&typeof L!=='undefined'&&typeof map!=='undefined'&&map){visual=createVisual(layer);leafletLayers.set(layer.id,visual);}
      if(visual&&!map.hasLayer(visual))visual.addTo(map);
    });
    applyZOrder();renderPanel();close();
    if(selected.size&&typeof map!=='undefined'&&map)map.setView([23.132,113.268],12);
    document.dispatchEvent(new CustomEvent('gis:layers-loaded',{detail:{count:selected.size,layers:window.GISWorkspace.getVectorLayers()}}));
    toast('已加载 '+selected.size+' 个图层');
  }

  function moveLayer(dir,id){
    if(!id)return;
    const layers=window.GISWorkspace.getVectorLayers();
    const idx=layers.findIndex(layer=>layer.id===id);if(idx<0)return;
    let target=idx+dir;
    while(target>=0&&target<layers.length&&!layers[target].loaded)target+=dir;
    if(target<0||target>=layers.length)return;
    [layers[idx],layers[target]]=[layers[target],layers[idx]];
    applyZOrder();renderPanel();
    toast('已调整图层顺序');
  }

  button.addEventListener('click',open);
  selectList.addEventListener('change',updateCount);
  $('#vectorSelectClose').addEventListener('click',close);
  $('#vectorSelectCancel').addEventListener('click',close);
  $('#vectorLoadConfirm').addEventListener('click',load);
  mask.addEventListener('click',event=>{if(event.target===mask)close();});
  window.addEventListener('resize',()=>{if(mask.classList.contains('show'))positionSelect();});

  // 显隐
  layerList.addEventListener('change',event=>{
    const input=event.target.closest('[data-layer-id]');if(!input)return;
    const layer=window.GISWorkspace.getVectorLayers().find(item=>item.id===input.dataset.layerId);
    if(!layer)return;
    layer.visible=input.checked;
    const visual=leafletLayers.get(input.dataset.layerId);
    if(visual&&typeof map!=='undefined'&&map){input.checked?visual.addTo(map):map.removeLayer(visual);}
    const managedElement=layer.managedElementId&&document.getElementById(layer.managedElementId);if(managedElement)managedElement.hidden=!input.checked;
    renderPanel();
  });

  // 透明度：input 实时更新样式与数值标签，避免重建 DOM 导致滑块失焦
  layerList.addEventListener('input',event=>{
    const slider=event.target.closest('[data-layer-opacity]');if(!slider)return;
    const layer=window.GISWorkspace.getVectorLayers().find(item=>item.id===slider.dataset.layerOpacity);
    if(!layer)return;
    layer.opacity=Number(slider.value)/100;
    const visual=leafletLayers.get(slider.dataset.layerOpacity);
    if(visual){
      if(layer.dynamic&&typeof visual.eachLayer==='function'){visual.eachLayer(item=>{if(typeof item.setStyle==='function')item.setStyle({opacity:layerOpacity(layer),fillOpacity:.85*layerOpacity(layer)});});}
      else if(typeof visual.setStyle==='function')visual.setStyle(styledOptions(layer));
      else if(typeof visual.eachLayer==='function')visual.eachLayer(item=>item.setStyle?.(styledOptions(layer)));
    }
    const managedElement=layer.managedElementId&&document.getElementById(layer.managedElementId);if(managedElement)managedElement.style.opacity=String(layer.opacity);
    const valueEl=slider.closest('.vlp-row-sub')?.querySelector('.vlp-opacity-value');
    if(valueEl)valueEl.textContent=slider.value+'%';
  });

  // 排序按钮 + 分组折叠 + 行选择
  layerList.addEventListener('click',event=>{
    const groupHead=event.target.closest('[data-group-head]');
    if(groupHead){toggleLayerGroup(groupHead);return;}
    const removeBtn=event.target.closest('[data-layer-remove]');
    if(removeBtn){removeDynamicLayer(removeBtn.dataset.layerRemove);toast('已从图层管理器移除图层');return;}
    const moveBtn=event.target.closest('[data-layer-move]');
    if(moveBtn){moveLayer(moveBtn.dataset.layerMove==='up'?-1:1,moveBtn.closest('[data-layer-select]')?.dataset.layerSelect);return;}
    if(event.target.closest('input,button'))return;
    const row=event.target.closest('[data-layer-select]');if(!row)return;
    selectedLayerId=row.dataset.layerSelect;renderPanel();notifySelectionChange();
  });

  layerList.addEventListener('keydown',event=>{
    if(event.target.closest('input,button'))return;
    const row=event.target.closest('[data-layer-select]');if(!row)return;
    if(event.key==='Enter'||event.key===' '){event.preventDefault();row.click();}
  });

  function setPanelOpen(open){
    renderPanel();panel.classList.toggle('show',open);
    // 注意：不再联动图例。图层管理器与图例管理器由「显示管理」抽屉中的两个独立开关分别控制
    document.dispatchEvent(new CustomEvent('map:layer-panel-change',{detail:{open}}));
    return open;
  }
  $('#vectorLayerPanelClose').addEventListener('click',()=>setPanelOpen(false));
  // 图例右上角关闭按钮：隐藏图例（同时广播 map:legend-change 同步抽屉开关）
  document.querySelector('[data-legend-close]')?.addEventListener('click',()=>setLegendVisible(false));

  // ============ 动态图层（智能体统计结果等运行时生成） ============
  // cfg 支持普通动态图层，也支持「新增图例和图层」生成的 geometry/features/style 数据。
  function registerDynamicLayer(cfg){
    if(!cfg||!cfg.id)return null;
    removeDynamicLayer(cfg.id); // 同 id 先移除，保证幂等
    const layer={
      id:cfg.id,name:cfg.name||cfg.layerName||cfg.id,layerName:cfg.layerName||cfg.name||cfg.id,legendName:cfg.legendName||cfg.name||cfg.id,fileName:cfg.fileName||cfg.id+'.geojson',
      type:cfg.type||'GeoJSON',geometryType:cfg.geometryType||'点',
      legend:cfg.legend||'',color:cfg.color||'#10B981',
      loaded:true,visible:true,opacity:1,dynamic:true,points:cfg.points||[],
      sourceLayerId:cfg.sourceLayerId||'',style:cfg.style||null,features:cfg.features||cfg.editorFeatures||[],legendId:cfg.legendId||'',
      managedElementId:cfg.managedElementId||'',editorFeatures:cfg.editorFeatures||cfg.features||[],featureCount:cfg.featureCount||cfg.features?.length||cfg.editorFeatures?.length||cfg.points?.length||0
    };
    window.GISWorkspace.getVectorLayers().push(layer);
    if(typeof L!=='undefined'&&Array.isArray(layer.features)&&layer.features.some(feature=>feature.geometry)){
      const visual=L.layerGroup(),dFeatList=[],opts=styledOptions(layer);
      layer.features.forEach((feature,i)=>{
        const geometry=feature.geometry;if(!geometry)return;
        const toLatLng=coord=>[coord[1],coord[0]];
        let featureLayer=null;
        if(geometry.type==='Point')featureLayer=L.circleMarker(toLatLng(geometry.coordinates),{radius:layer.style?.radius||6,...opts});
        else if(geometry.type==='LineString')featureLayer=L.polyline(geometry.coordinates.map(toLatLng),opts);
        else if(geometry.type==='Polygon')featureLayer=L.polygon((geometry.coordinates[0]||[]).map(toLatLng),opts);
        if(!featureLayer)return;
        featureLayer._featureIndex=i;featureLayer.bindPopup('<b>'+esc(layer.name)+'</b><br/>'+(feature.properties?.name||feature.properties?.名称||''));
        featureLayer.on('click',ev=>{L.DomEvent.stopPropagation(ev);document.dispatchEvent(new CustomEvent('map:feature-clicked',{detail:{layerId:layer.id,index:i}}));});
        visual.addLayer(featureLayer);dFeatList.push(featureLayer);
      });
      featureLayersMap.set(layer.id,visual);featureIndexMap.set(layer.id,dFeatList);
      leafletLayers.set(layer.id,visual);if(typeof map!=='undefined'&&map)visual.addTo(map);
    }else if(typeof L!=='undefined'&&layer.points.length){
      const visual=L.layerGroup();
      const dFeatList=[];
      layer.points.forEach((p,i)=>{
        const marker=L.circleMarker([p.lat,p.lng],{radius:p.radius||6,color:'#fff',weight:1.2,fillColor:p.color||layer.color,fillOpacity:.85,opacity:.9});
        marker._featureIndex=i;
        marker.bindPopup('<b>'+layer.name+'</b><br/>'+(p.type||''));
        visual.addLayer(marker);dFeatList.push(marker);
      });
      featureLayersMap.set(layer.id,visual);
      featureIndexMap.set(layer.id,dFeatList);
      // 逐要素绑定点击事件（layerGroup 不冒泡子图层事件）
      dFeatList.forEach(marker=>{
        marker.on('click',function onDynFeatClick(ev){
          L.DomEvent.stopPropagation(ev);
          if(typeof marker._featureIndex==='number'){
            document.dispatchEvent(new CustomEvent('map:feature-clicked',{detail:{layerId:layer.id,index:marker._featureIndex}}));
          }
        });
      });
      leafletLayers.set(layer.id,visual);if(typeof map!=='undefined'&&map)visual.addTo(map);
    }
    const managedElement=layer.managedElementId&&document.getElementById(layer.managedElementId);if(managedElement){managedElement.hidden=false;managedElement.style.opacity='1';}
    applyZOrder();renderPanel();
    document.dispatchEvent(new CustomEvent('gis:layers-loaded',{detail:{count:loadedLayers().length,layers:window.GISWorkspace.getVectorLayers()}}));
    return layer;
  }
  function removeDynamicLayer(id){
    const layers=window.GISWorkspace.getVectorLayers();
    const idx=layers.findIndex(item=>item.id===id);
    const layer=idx>=0?layers[idx]:null;
    if(layer?.dynamic)layers.splice(idx,1);else if(layer){layer.loaded=false;layer.visible=false;}
    const visual=leafletLayers.get(id);
    if(visual&&typeof map!=='undefined'&&map&&map.hasLayer(visual))map.removeLayer(visual);
    leafletLayers.delete(id);
    featureLayersMap.delete(id);featureIndexMap.delete(id);
    const managedElement=layer?.managedElementId&&document.getElementById(layer.managedElementId);if(managedElement){if(layer?.dynamic&&managedElement.classList.contains('legend-clone-layer'))managedElement.remove();else managedElement.hidden=true;}
    if(selectedLayerId===id){selectedLayerId='';}
    window.Cartography?.unregisterLayerLegend?.(id);
    renderPanel();
    notifySelectionChange();
    return true;
  }

  function selectLayer(id){
    const layer=loadedLayers().find(item=>item.id===id);if(!layer)return null;
    selectedLayerId=id;renderPanel();notifySelectionChange();return layer;
  }

  function updateEditorFeatures(id,features){
    const layer=window.GISWorkspace.getVectorLayers().find(item=>item.id===id);if(!layer)return false;
    layer.editorFeatures=JSON.parse(JSON.stringify(features||[]));layer.featureCount=layer.editorFeatures.length;renderPanel();return true;
  }

  function getFeatureSnapshot(layerId,index){
    const layer=window.GISWorkspace?.getVectorLayers().find(item=>item.id===layerId);
    const featureLayer=(featureIndexMap.get(layerId)||[])[index];
    if(!layer||!featureLayer||typeof featureLayer.toGeoJSON!=='function')return null;
    const queryFeature=window.MapFeatureQuery?.getFeatures?.(layer)?.[index];
    return {
      layerId,index,sourceFeatureId:queryFeature?.id||`${layerId}-${index+1}`,
      geometry:featureLayer.toGeoJSON().geometry,
      properties:JSON.parse(JSON.stringify(queryFeature?.fields||{}))
    };
  }

  function setFeatureSelected(layerId,index,selected){
    const featureLayer=(featureIndexMap.get(layerId)||[])[index];if(!featureLayer||typeof featureLayer.setStyle!=='function')return false;
    if(selected){
      if(!featureLayer._legendLayerOriginalStyle)featureLayer._legendLayerOriginalStyle={...(featureLayer.options||{})};
      const geometry=window.GISWorkspace?.getVectorLayers().find(item=>item.id===layerId)?.geometryType;
      featureLayer.setStyle(geometry==='点'?{color:'#fff',weight:3,fillColor:'#F97316',fillOpacity:1,radius:9}:{color:'#F97316',weight:4,fillOpacity:.58,opacity:1});
      featureLayer.bringToFront?.();
    }else if(featureLayer._legendLayerOriginalStyle){
      featureLayer.setStyle(featureLayer._legendLayerOriginalStyle);delete featureLayer._legendLayerOriginalStyle;
    }
    return true;
  }

  function updateLegendLayerStyle(id,nextStyle){
    const layer=window.GISWorkspace?.getVectorLayers().find(item=>item.id===id);if(!layer)return 0;
    layer.style={...(layer.style||{}),...nextStyle};
    layer.color=layer.style.fillColor||layer.style.color||layer.color;
    if(layer.legend&&typeof layer.legend==='object'){
      layer.legend.fill=layer.style.fillColor||layer.style.color;layer.legend.stroke=layer.style.color;layer.legend.borderWidth=layer.style.weight;
    }
    const opts=styledOptions(layer),features=featureIndexMap.get(id)||[];
    features.forEach(feature=>{if(typeof feature.setStyle==='function')feature.setStyle(opts);});
    (layer.editorFeatures||[]).forEach(feature=>{feature.fill=layer.style.fillColor||layer.style.color;feature.stroke=layer.style.color;feature.strokeWidth=layer.style.weight;feature.fillOpacity=layer.style.fillOpacity;});
    const managed=layer.managedElementId&&document.getElementById(layer.managedElementId);
    managed?.querySelectorAll('.map-result-feature').forEach(feature=>{feature.style.fill=layer.style.fillColor||layer.style.color;feature.style.fillOpacity=String(layer.style.fillOpacity??1);feature.style.stroke=layer.style.color;feature.style.strokeWidth=String(layer.style.weight||2);});
    renderPanel();applyZOrder();return layer.featureCount||features.length;
  }

  window.MapLayers={
    openPanel:()=>setPanelOpen(true),
    closePanel:()=>setPanelOpen(false),
    togglePanel:()=>setPanelOpen(!panel.classList.contains('show')),
    isOpen:()=>panel.classList.contains('show'),
    isLegendVisible:()=>legendVisible,
    setLegendVisible,
    render:renderPanel,
    getLoaded:()=>loadedLayers(),
    getSelected:()=>window.GISWorkspace?.getVectorLayers().find(layer=>layer.id===selectedLayerId)||null,
    selectLayer,
    updateEditorFeatures,
    getFeatureSnapshot,
    setFeatureSelected,
    updateLegendLayerStyle,
    registerDynamicLayer,
    removeDynamicLayer,
    // 要素级图层操作（供属性表联动高亮使用）
    getFeatureLayers:(layerId)=>featureIndexMap.get(layerId)||[],
    getFeatureLayer:(layerId,index)=>(featureIndexMap.get(layerId)||[])[index]||null,
    getFeatureLayerGroup:(layerId)=>featureLayersMap.get(layerId)||null
  };
  // 制图图例数据变化（新建图例 / 样式修改 / 保存应用）→ 图例管理器实时刷新，无需手动刷新
  document.addEventListener('carto:legend-items-changed',()=>{if(legendVisible)renderLegend();});
  renderLegend();
})();

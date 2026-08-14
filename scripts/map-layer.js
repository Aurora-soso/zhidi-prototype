// 本地矢量图层：选择、模拟加载到 Leaflet，显隐 / 透明度 / 排序管理，以及图例联动。
(function(){
  const button=document.querySelector('.map-toolbar [data-tool="load-local"]'),mask=$('#vectorSelectMask');
  const selectList=$('#vectorSelectList'),panel=$('#vectorLayerPanel'),layerList=$('#vectorLayerList');
  const legend=$('#mapLegend'),legendList=$('#mapLegendList'),legendCount=$('#mapLegendCount');
  const leafletLayers=new Map();
  let selectedLayerId='';

  // 各图层符号样式（面 / 线）与渲染基础参数，供图层渲染与图例复用。
  const layerStyles={
    building:{kind:'polygon',color:'#7C3AED',weight:2,fillColor:'#A78BFA',fillOpacity:.42},
    road:{kind:'polyline',color:'#F59E0B',weight:6,opacity:.85},
    river:{kind:'polyline',color:'#0EA5E9',weight:8,opacity:.7},
    landuse:{kind:'polygon',color:'#10B981',weight:2,fillColor:'#34D399',fillOpacity:.22},
    poi:{kind:'point',color:'#DC2626',weight:2,fillColor:'#F87171',fillOpacity:.85}
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
    poi:[{lat:23.136,lng:113.262},{lat:23.144,lng:113.276},{lat:23.128,lng:113.284},{lat:23.152,lng:113.256},{lat:23.120,lng:113.298}]
  };

  function layerOpacity(layer){const o=Number(layer&&layer.opacity);return Number.isFinite(o)?Math.max(0,Math.min(1,o)):1;}
  function styledOptions(layer){
    const style=layerStyles[layer.id]||{kind:'polygon',color:'#94A3B8',weight:2,fillColor:'#CBD5E1',fillOpacity:.2};
    const o=layerOpacity(layer);
    if(style.kind==='polygon')return{color:style.color,weight:style.weight,fillColor:style.fillColor,opacity:o,fillOpacity:(style.fillOpacity??.2)*o};
    if(style.kind==='point')return{color:style.color,weight:style.weight,fillColor:style.fillColor,opacity:o,fillOpacity:(style.fillOpacity??.8)*o};
    return{color:style.color,weight:style.weight,opacity:o};
  }
  function createVisual(layer){
    const style=layerStyles[layer.id];
    const opts=styledOptions(layer);
    const popup=layer.name+' · '+layer.type;
    if(style&&style.kind==='point')return L.layerGroup(coords[layer.id].map(point=>L.circleMarker(point,{radius:6,...opts}).bindPopup(popup)));
    if(style&&style.kind==='polyline')return L.polyline(coords[layer.id],opts).bindPopup(popup);
    return L.polygon(coords[layer.id],opts).bindPopup(popup);
  }
  function loadedLayers(){return window.GISWorkspace?.getVectorLayers().filter(layer=>layer.loaded)||[];}

  function positionSelect(){positionAnchoredPopover(button,mask.querySelector('.vector-select-modal'),'auto');}
  function close(){mask.classList.remove('show');}
  function updateCount(){$('#vectorSelectedCount').textContent=selectList.querySelectorAll('input:checked').length;}
  function open(){
    if(!window.GISWorkspace?.isReady()){toast('请先选择本地工作空间');return;}
    $('#vectorWorkspacePath').textContent=window.GISWorkspace.getPath();
    selectList.innerHTML=window.GISWorkspace.getVectorLayers().map((layer,index)=>`<label class="vector-select-row"><span><input type="checkbox" value="${layer.id}" ${layer.loaded||index<2?'checked':''}></span><span class="vector-file-name">${layer.fileName}</span><span class="vector-file-type">${layer.type}</span></label>`).join('');
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
    const legendIdAttr = layer.cartoLegendId ? ` data-carto-legend-id="${layer.cartoLegendId}" title="点击修改该图例样式"` : '';
    if(geom==='point'){
      return `<li class="map-legend-item"${legendIdAttr}><span class="map-legend-symbol poi" style="background:${fill};border-color:${stroke};"></span><span class="map-legend-name">${layer.name}</span></li>`;
    }
    if(geom==='line'){
      return `<li class="map-legend-item"${legendIdAttr}><span class="map-legend-symbol map-legend-symbol-line" style="border-top-color:${stroke};border-top-style:solid;"></span><span class="map-legend-name">${layer.name}</span></li>`;
    }
    return `<li class="map-legend-item"${legendIdAttr}><span class="map-legend-symbol map-legend-symbol-polygon" style="background:${fill};border-color:${stroke};"></span><span class="map-legend-name">${layer.name}</span></li>`;
  }
  // 图例只渲染「已加载的矢量图层」（含运行时动态图层）+ 制图图例条目（现状图 / 用户新建）。
  function renderLegend(){
    const loaded=loadedLayers();
    // 制图图例条目包装为类图层对象，复用 renderLegendItem 的面要素符号渲染；cartoLegendId 供双击修改
    const cartoItems=(window.Cartography?.getLegendItems?.()||[]).map(item=>({
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

  function renderPanel(){
    const loaded=loadedLayers();
    $('#vectorLayerCount').textContent=loaded.length;
    if(selectedLayerId&&!loaded.some(layer=>layer.id===selectedLayerId))selectedLayerId='';
    layerList.innerHTML=loaded.map(layer=>{
      const symbolStyle=layer.dynamic&&layer.color?` style="background:${layer.color};${layer.geometryType==='面'?`border:1px solid ${layer.color};height:12px`:''}"`:'';
      return `<div class="vlp-row ${selectedLayerId===layer.id?'selected':''}" data-layer-select="${layer.id}">
        <div class="vlp-row-main">
          <input type="checkbox" data-layer-id="${layer.id}" ${layer.visible?'checked':''} aria-label="显示 ${layer.name}">
          <span class="vlp-symbol ${layer.id}"${symbolStyle}></span>
          <span class="vlp-name">${layer.name}</span>
          <span class="vlp-order">
            <button type="button" data-layer-move="up" title="上移一层" aria-label="上移 ${layer.name}">▲</button>
            <button type="button" data-layer-move="down" title="下移一层" aria-label="下移 ${layer.name}">▼</button>
          </span>
          <button type="button" class="vlp-row-remove" data-layer-remove="${layer.id}" title="从图层管理器移除" aria-label="移除 ${layer.name}">×</button>
        </div>
      </div>`;
    }).join('');
    renderLegend();
  }

  // 数组顺序即图层顺序：先渲染的在下层，后渲染的在上层。
  function applyZOrder(){
    loadedLayers().forEach((layer,index)=>{
      const visual=leafletLayers.get(layer.id);if(visual&&typeof map!=='undefined'&&map&&map.hasLayer(visual)&&typeof visual.bringToFront==='function')visual.bringToFront();
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
    toast('已加载 '+selected.size+' 个矢量图层');
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

  // 排序按钮 + 行选择
  layerList.addEventListener('click',event=>{
    const removeBtn=event.target.closest('[data-layer-remove]');
    if(removeBtn){removeDynamicLayer(removeBtn.dataset.layerRemove);toast('已从图层管理器移除图层');return;}
    const moveBtn=event.target.closest('[data-layer-move]');
    if(moveBtn){moveLayer(moveBtn.dataset.layerMove==='up'?-1:1,moveBtn.closest('[data-layer-select]')?.dataset.layerSelect);return;}
    if(event.target.closest('input,button'))return;
    const row=event.target.closest('[data-layer-select]');if(!row)return;
    selectedLayerId=row.dataset.layerSelect;renderPanel();
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
  // cfg: { id, name, fileName, type, geometryType, legend, color, points, managedElementId, editorFeatures }
  function registerDynamicLayer(cfg){
    if(!cfg||!cfg.id)return null;
    removeDynamicLayer(cfg.id); // 同 id 先移除，保证幂等
    const layer={
      id:cfg.id,name:cfg.name||cfg.id,fileName:cfg.fileName||cfg.id+'.geojson',
      type:cfg.type||'GeoJSON',geometryType:cfg.geometryType||'点',
      legend:cfg.legend||'',color:cfg.color||'#10B981',
      loaded:true,visible:true,opacity:1,dynamic:true,points:cfg.points||[],
      managedElementId:cfg.managedElementId||'',editorFeatures:cfg.editorFeatures||[],featureCount:cfg.featureCount||cfg.editorFeatures?.length||cfg.points?.length||0
    };
    window.GISWorkspace.getVectorLayers().push(layer);
    if(typeof L!=='undefined'&&layer.points.length){
      const visual=L.layerGroup();
      layer.points.forEach(p=>{
        const marker=L.circleMarker([p.lat,p.lng],{radius:p.radius||6,color:'#fff',weight:1.2,fillColor:p.color||layer.color,fillOpacity:.85,opacity:.9});
        marker.bindPopup('<b>'+layer.name+'</b><br/>'+(p.type||''));visual.addLayer(marker);
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
    const managedElement=layer?.managedElementId&&document.getElementById(layer.managedElementId);if(managedElement)managedElement.hidden=true;
    if(selectedLayerId===id)selectedLayerId='';
    renderPanel();
    return true;
  }

  function selectLayer(id){
    const layer=loadedLayers().find(item=>item.id===id);if(!layer)return null;
    selectedLayerId=id;renderPanel();return layer;
  }

  function updateEditorFeatures(id,features){
    const layer=window.GISWorkspace.getVectorLayers().find(item=>item.id===id);if(!layer)return false;
    layer.editorFeatures=JSON.parse(JSON.stringify(features||[]));layer.featureCount=layer.editorFeatures.length;renderPanel();return true;
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
    registerDynamicLayer,
    removeDynamicLayer
  };
  // 制图图例数据变化（新建图例 / 样式修改 / 保存应用）→ 图例管理器实时刷新，无需手动刷新
  document.addEventListener('carto:legend-items-changed',()=>{if(legendVisible)renderLegend();});
  renderLegend();
})();

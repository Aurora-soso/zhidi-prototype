// ============ GIS 智能体结果审阅、手动编辑与图形标注 ============
(function(){
  const mapView=$('#workspaceMapView'),resultLayer=$('#mapResultLayer'),resultSvg=$('#mapResultSvg');
  const graphicsLayer=$('#mapGraphicsLayer'),graphicsSvg=$('#mapGraphicsSvg');
  const resultToolbar=$('#mapResultToolbar'),manualToolbar=$('#mapManualToolbar'),cartoToolbar=$('#mapCartoToolbar');
  const selectionBar=$('#mapSelectionActions'),countEl=$('#mapSelectedCount'),summaryEl=$('#mapSelectionSummary');
  const box=$('#mapBoxSelection');
  const state={
    stage:'workspace',features:[],graphics:[],selectedFeatures:new Set(),selectedGraphics:new Set(),
    tool:'select',dragStart:null,graphicStart:null,manualSnapshot:null,history:[],historyIndex:-1,
    color:'#10B981',strokeColor:'#047857',fillOpacity:.38,strokeWidth:2,graphicColor:'#EF4444',
    editLayer:null,editSource:'result',returnStage:'result',clipboard:[],savedSnapshot:null
  };

  function cloneData(value){return JSON.parse(JSON.stringify(value));}
  function makeFeatures(){
    const features=[];
    for(let i=0;i<37;i++){
      const col=i%8,row=Math.floor(i/8),x=195+col*76+(row%2)*22,y=155+row*78+(i%3)*6,w=42+(i%4)*5,h=34+(i%3)*7;
      features.push({id:'A-'+String(i+1).padStart(3,'0'),type:'商业用地',area:5320+i*137,points:`${x},${y+8} ${x+10},${y} ${x+w},${y+5} ${x+w-4},${y+h} ${x+5},${y+h+3}`});
    }
    return features;
  }
  function makeLayerFeatures(layer){
    if(Array.isArray(layer.editorFeatures)&&layer.editorFeatures.length)return cloneData(layer.editorFeatures);
    return makeFeatures().slice(0,layer.geometryType==='点'?10:layer.geometryType==='线'?14:18).map((feature,index)=>({...feature,id:`${layer.id.toUpperCase()}-${String(index+1).padStart(3,'0')}`,type:layer.name,area:layer.geometryType==='面'?feature.area:0}));
  }
  function closeMenus(){document.querySelectorAll('.map-tool-menu').forEach(menu=>menu.hidden=true);}
  function setStage(stage){
    state.stage=stage;mapView.dataset.mapStage=stage;
    if(stage==='workspace')resultLayer.style.pointerEvents='none';else resultLayer.style.pointerEvents=state.tool==='box-select'||state.tool.startsWith('graphic-')?'auto':'';
    // 四阶段工具栏互斥显隐：workspace(全隐藏) / result / manual-edit / cartography-edit
    const isCarto = stage==='cartography-edit';
    resultToolbar.hidden=stage!=='result';
    manualToolbar.hidden=stage!=='manual-edit';
    cartoToolbar.hidden=!isCarto;  // 仅 cartography-edit 显示制图工具栏
    $('#mapManualNotice').hidden=stage!=='manual-edit';
    selectionBar.querySelector('[data-selection-action="reanalyze"]').hidden=stage!=='result';
    selectionBar.querySelector('[data-selection-action="manual-delete"]').hidden=!(stage==='manual-edit'||isCarto);
    closeMenus();updateSelectionUI();
    document.dispatchEvent(new CustomEvent('map:stage-change',{detail:{stage}}));
  }
  function snapshot(){return {features:cloneData(state.features),graphics:cloneData(state.graphics)};}
  function restore(data){state.features=cloneData(data.features);state.graphics=cloneData(data.graphics);clearSelection(false);renderAll();}
  function resetHistory(){state.history=[snapshot()];state.historyIndex=0;updateHistoryButtons();}
  function pushHistory(){state.history=state.history.slice(0,state.historyIndex+1);state.history.push(snapshot());state.historyIndex++;updateHistoryButtons();}
  function updateHistoryButtons(){$('#mapUndoBtn').disabled=state.historyIndex<=0;$('#mapRedoBtn').disabled=state.historyIndex>=state.history.length-1;}
  function undo(){if(state.historyIndex<=0)return;state.historyIndex--;restore(state.history[state.historyIndex]);updateHistoryButtons();toast('已撤销上一步修改');}
  function redo(){if(state.historyIndex>=state.history.length-1)return;state.historyIndex++;restore(state.history[state.historyIndex]);updateHistoryButtons();toast('已重做修改');}

  function renderFeatures(){
    // 只重建要素层，避免清空整个 SVG（模板元素 .carto-template-element 同挂在 SVG 下，必须保留）
    resultSvg.querySelectorAll('.map-result-feature').forEach(el => el.remove());
    state.features.forEach(feature=>{
      const geometry=state.editLayer?.geometryType||'面',tag=geometry==='点'?'circle':geometry==='线'?'polyline':'polygon',element=document.createElementNS('http://www.w3.org/2000/svg',tag);
      if(geometry==='点'){const[x,y]=feature.points.split(' ')[0].split(',');element.setAttribute('cx',x);element.setAttribute('cy',y);element.setAttribute('r',10);}else element.setAttribute('points',feature.points);
      element.dataset.featureId=feature.id;element.classList.add('map-result-feature',`geometry-${geometry==='点'?'point':geometry==='线'?'line':'polygon'}`);
      if(state.selectedFeatures.has(feature.id))element.classList.add('selected');element.style.fill=feature.fill||state.color;element.style.fillOpacity=feature.fillOpacity??state.fillOpacity;element.style.stroke=feature.stroke||state.strokeColor;element.style.strokeWidth=feature.strokeWidth||state.strokeWidth;
      element.addEventListener('click',event=>{event.stopPropagation();if(state.stage!=='workspace'&&state.tool==='select')toggleFeature(feature.id);});resultSvg.appendChild(element);
    });
    $('#mapResultFeatureCount').textContent=state.features.length;
  }
  function renderGraphics(){
    graphicsSvg.querySelectorAll('.map-graphic').forEach(element=>element.remove());
    state.graphics.forEach(graphic=>{
      let element;
      if(graphic.type==='marker'){element=document.createElementNS('http://www.w3.org/2000/svg','circle');element.setAttribute('cx',graphic.x);element.setAttribute('cy',graphic.y);element.setAttribute('r',10);}
      else if(graphic.type==='text'){element=document.createElementNS('http://www.w3.org/2000/svg','text');element.setAttribute('x',graphic.x);element.setAttribute('y',graphic.y);element.textContent=graphic.text||'重点核查区域';}
      else if(graphic.type==='arrow'){element=document.createElementNS('http://www.w3.org/2000/svg','line');element.setAttribute('x1',graphic.x1);element.setAttribute('y1',graphic.y1);element.setAttribute('x2',graphic.x2);element.setAttribute('y2',graphic.y2);element.setAttribute('marker-end','url(#mapArrowHead)');}
      else if(graphic.type==='polygon'){element=document.createElementNS('http://www.w3.org/2000/svg','polygon');element.setAttribute('points',graphic.points);}
      else{element=document.createElementNS('http://www.w3.org/2000/svg','rect');element.setAttribute('x',graphic.x);element.setAttribute('y',graphic.y);element.setAttribute('width',graphic.width);element.setAttribute('height',graphic.height);}
      element.dataset.graphicId=graphic.id;element.classList.add('map-graphic',`graphic-${graphic.type}`);if(state.selectedGraphics.has(graphic.id))element.classList.add('selected');element.style.stroke=graphic.color||state.graphicColor;
      element.addEventListener('click',event=>{event.stopPropagation();if(state.tool==='select')toggleGraphic(graphic.id);});graphicsSvg.appendChild(element);
    });
  }
  function renderAll(){renderFeatures();renderGraphics();updateSelectionUI();}
  function clearSelection(render=true){state.selectedFeatures.clear();state.selectedGraphics.clear();if(render)renderAll();}
  function toggleFeature(id){state.selectedGraphics.clear();state.selectedFeatures.has(id)?state.selectedFeatures.delete(id):state.selectedFeatures.add(id);window.Cartography?.clearTemplateSelection?.();renderAll();}
  function toggleGraphic(id){state.selectedFeatures.clear();state.selectedGraphics.has(id)?state.selectedGraphics.delete(id):state.selectedGraphics.add(id);renderAll();}
  function selectedFeatures(){return state.features.filter(item=>state.selectedFeatures.has(item.id));}
  function selectedGraphics(){return state.graphics.filter(item=>state.selectedGraphics.has(item.id));}
  function updateEditControls(){
    if(state.stage!=='manual-edit')return;
    const hasSelection=state.selectedFeatures.size>0,geometry=state.editLayer?.geometryType||'面';
    manualToolbar.querySelectorAll('[data-requires-selection]').forEach(button=>button.disabled=!hasSelection);
    const pasteButton=$('#mapPasteFeatureBtn');if(pasteButton)pasteButton.disabled=!state.clipboard.length;
    // 按几何类型禁用：旋转/缩放/分割/裁剪/节点 仅线、面可用；点要素仅保留基础操作
    manualToolbar.querySelectorAll('[data-geometry-types]').forEach(button=>{
      const types=button.dataset.geometryTypes.split(',');
      button.disabled=!hasSelection||!types.includes(geometry);
    });
    const geometryToggle=manualToolbar.querySelector('[data-map-menu-toggle="edit-geometry"]');if(geometryToggle)geometryToggle.disabled=geometry==='点';
  }
  function updateSelectionUI(){
    const graphicsCount=state.selectedGraphics.size,featuresCount=state.selectedFeatures.size;
    const externalFeaturesCount=window.LegendLayerCreator?.getLeafletSelectionCount?.()||0;
    // 模板要素选中（与图块/图形选择同等的选择态展示）
    const tplSel=window.Cartography?.getSelectedTemplateElement?.();
    const tplCount=tplSel?1:0;
    const total=graphicsCount+featuresCount+tplCount+externalFeaturesCount;selectionBar.hidden=total===0;
    countEl.textContent=total;
    if(tplCount&&!graphicsCount&&!featuresCount){
      summaryEl.firstChild.textContent='已选择 ';summaryEl.lastChild.textContent=`模板要素「${tplSel.label}」`;
    }else if(externalFeaturesCount&&!graphicsCount&&!featuresCount&&!tplCount){
      summaryEl.firstChild.textContent='已选择 ';summaryEl.lastChild.textContent=' 个地图对象';
    }else{
      summaryEl.firstChild.textContent='已选择 ';summaryEl.lastChild.textContent=graphicsCount?' 个图形':' 个要素';
    }
    updateEditControls();
  }
  function setTool(tool){
    if(tool==='clear-selection'){clearSelection();return;}
    state.tool=tool;resultLayer.classList.toggle('box-selecting',tool==='box-select');graphicsLayer.classList.toggle('drawing',tool.startsWith('graphic-'));resultLayer.style.pointerEvents=tool==='box-select'||tool.startsWith('graphic-')?'auto':'';
    document.querySelectorAll('[data-result-tool],[data-manual-tool],[data-graphic-tool]').forEach(button=>button.classList.toggle('active',button.dataset.resultTool===tool||button.dataset.manualTool===tool||('graphic-'+button.dataset.graphicTool)===tool));closeMenus();
  }
  function deleteFeatures(){if(state.stage!=='manual-edit'&&state.stage!=='cartography-edit'){toast('请先进入编辑模式');return;}if(!state.selectedFeatures.size){toast('请先选择结果要素');return;}const count=state.selectedFeatures.size;state.features=state.features.filter(item=>!state.selectedFeatures.has(item.id));clearSelection(false);pushHistory();renderAll();toast('已删除 '+count+' 个结果要素');}
  function deleteGraphics(){if(!state.selectedGraphics.size){toast('请先选择图形');return;}const count=state.selectedGraphics.size;state.graphics=state.graphics.filter(item=>!state.selectedGraphics.has(item.id));clearSelection(false);if(state.stage==='manual-edit')pushHistory();renderAll();toast('已删除 '+count+' 个图形');}
  function addPolygon(){const id='A-'+String(Date.now()).slice(-4),offset=state.features.length%5*14;state.features.push({id,type:'商业用地',area:6180,points:`410,280 ${470+offset},265 ${510+offset},320 445,345`});pushHistory();renderAll();toast('已新增 1 个面要素');}
  function mergeFeatures(){const chosen=selectedFeatures();if(chosen.length<2){toast('请至少选择 2 个要素');return;}const merged={...chosen[0],id:'A-M'+String(Date.now()).slice(-3),area:chosen.reduce((sum,item)=>sum+item.area,0)};state.features=state.features.filter(item=>!state.selectedFeatures.has(item.id));state.features.push(merged);clearSelection(false);pushHistory();renderAll();toast('已合并 '+chosen.length+' 个要素');}
  function moveFeature(){if(!state.selectedFeatures.size){toast('请先选择结果要素');return;}state.selectedFeatures.forEach(id=>{const feature=state.features.find(item=>item.id===id);feature.points=feature.points.split(' ').map(pair=>{const [x,y]=pair.split(',').map(Number);return `${x+12},${y-8}`;}).join(' ');});pushHistory();renderAll();toast('已移动选中要素');}
  function vertexEdit(){if(!state.selectedFeatures.size){toast('请先选择结果要素');return;}const feature=selectedFeatures()[0],pairs=feature.points.split(' ');const [x,y]=pairs[1].split(',').map(Number);pairs[1]=`${x+12},${y-10}`;feature.points=pairs.join(' ');pushHistory();renderAll();toast('已调整边界节点');}

  function transformFeatures(kind){
    if(!state.selectedFeatures.size){toast('请先选择对象');return;}
    state.selectedFeatures.forEach(id=>{const feature=state.features.find(item=>item.id===id),pairs=feature.points.split(' ').map(pair=>pair.split(',').map(Number));const cx=pairs.reduce((sum,p)=>sum+p[0],0)/pairs.length,cy=pairs.reduce((sum,p)=>sum+p[1],0)/pairs.length;
      feature.points=pairs.map(([x,y])=>{if(kind==='rotate')return`${cx-(y-cy)},${cy+(x-cx)}`;if(kind==='scale')return`${cx+(x-cx)*1.12},${cy+(y-cy)*1.12}`;return`${x},${y}`;}).join(' ');
    });pushHistory();renderAll();toast(kind==='rotate'?'已旋转选中对象':'已缩放选中对象');
  }
  function copyFeatures(){if(!state.selectedFeatures.size)return;state.clipboard=cloneData(selectedFeatures());updateEditControls();toast(`已复制 ${state.clipboard.length} 个对象`);}
  function pasteFeatures(){if(!state.clipboard.length)return;const pasted=state.clipboard.map((item,index)=>({...item,id:`${item.id}-C${Date.now().toString().slice(-3)}${index}`,points:item.points.split(' ').map(pair=>{const[x,y]=pair.split(',').map(Number);return`${x+20},${y+20}`;}).join(' ')}));state.features.push(...pasted);clearSelection(false);pasted.forEach(item=>state.selectedFeatures.add(item.id));pushHistory();renderAll();toast(`已粘贴 ${pasted.length} 个对象`);}
  function splitFeature(){const chosen=selectedFeatures()[0];if(!chosen)return;const copy={...cloneData(chosen),id:`${chosen.id}-S`,points:chosen.points.split(' ').map(pair=>{const[x,y]=pair.split(',').map(Number);return`${x+16},${y+10}`;}).join(' ')};state.features.push(copy);pushHistory();renderAll();toast('已完成分割（交互原型）');}
  function clipFeature(){if(!state.selectedFeatures.size)return;selectedFeatures().forEach(feature=>{feature.points=feature.points.split(' ').map((pair,index)=>{const[x,y]=pair.split(',').map(Number);return`${x+(index%2?5:-3)},${y+4}`;}).join(' ');});pushHistory();renderAll();toast('已完成裁剪（交互原型）');}

  function updateEditIdentity(){
    const layer=state.editLayer||{name:'商业用地筛选结果',geometryType:'面'};
    $('#mapEditingLayerName').textContent=layer.name;$('#mapEditingGeometryType').textContent=layer.geometryType;$('#mapManualNoticeLayer').textContent=layer.name;updateEditControls();
  }
  function startLayerEdit(layer){
    switchWorkspace('map');state.editSource=layer.id==='agent-result'?'result-layer':'layer';state.returnStage='workspace';state.editLayer={...layer};state.features=makeLayerFeatures(layer);state.graphics=[];state.clipboard=[];state.manualSnapshot=snapshot();state.savedSnapshot=snapshot();resetHistory();clearSelection(false);setTool('select');resultLayer.hidden=false;graphicsLayer.hidden=true;renderAll();setStage('manual-edit');updateEditIdentity();window.MapLayers?.closePanel();$('#mapBadge').textContent=`正在编辑图层 · ${layer.name}（${layer.geometryType}）`;toast(`已进入“${layer.name}”编辑模式`);
  }

  function enterManualEdit(){state.editSource='result';state.returnStage='result';state.editLayer={id:'agent-result',name:'商业用地筛选结果',geometryType:'面'};state.manualSnapshot=snapshot();state.savedSnapshot=snapshot();state.clipboard=[];resetHistory();clearSelection();setTool('select');setStage('manual-edit');updateEditIdentity();toast('已进入结果图层编辑模式');}
  // 制图模式 → 手动编辑（返回时回到制图工具栏）
  function enterCartographyManualEdit(){
    const mapData=window.Cartography?.getState?.().currentMap;
    if(!mapData){toast('当前无制图数据');return;}
    state.editSource='cartography';
    state.returnStage='cartography-edit';   // ← 关键：退出后回制图模式
    state.editLayer={id:mapData.id,name:mapData.name,geometryType:'面'};
    // 保留已编辑的要素（制图模式下可能已标注/删除/改样式）
    state.manualSnapshot=snapshot();
    state.savedSnapshot=snapshot();
    state.clipboard=[];
    resetHistory();
    clearSelection(false);
    setTool('select');
    graphicsLayer.hidden=false;   // 编辑期间显示图形标注层
    renderAll();
    setStage('manual-edit');
    updateEditIdentity();
    toast(`已进入手动编辑 · ${mapData.name}（按几何类型提供编辑能力）`);
  }
  function saveLayerEdit(){state.savedSnapshot=snapshot();if(state.editLayer?.id)window.MapLayers?.updateEditorFeatures?.(state.editLayer.id,state.features);toast(`已保存“${state.editLayer?.name||'当前图层'}”的编辑（模拟）`);document.dispatchEvent(new CustomEvent('map:layer-edit-saved',{detail:{layer:state.editLayer,featureCount:state.features.length}}));}
  function exitLayerEdit(){const layerName=state.editLayer?.name||'当前图层',keepManagedResult=state.editLayer?.id==='agent-result'&&window.MapLayers?.getLoaded?.().some(layer=>layer.id==='agent-result'&&layer.visible);clearSelection();setTool('select');state.history=[];state.historyIndex=-1;
    if(state.returnStage==='result'){setStage('result');resultLayer.hidden=false;graphicsLayer.hidden=false;$('#mapBadge').textContent='Agent 结果审阅 · 商业用地筛选结果';}
    else if(state.returnStage==='cartography-edit'){
      // 手动编辑退出 → 返回制图模式工具栏
      const mapData=window.Cartography?.getState?.().currentMap;
      setStage('cartography-edit');
      resultLayer.hidden=false;
      graphicsLayer.hidden=false;   // 制图模式标注层可见
      if(mapData){
        $('#mapCartoMapName').textContent=mapData.name;
        $('#mapCartoFeatureCount').textContent=(mapData.features?.length||0)+' 个要素';
        $('#mapBadge').textContent=`制图模式 · ${mapData.name}`;
      }else{$('#mapBadge').textContent='制图模式';}
    }
    else{setStage('workspace');resultLayer.hidden=!keepManagedResult;graphicsLayer.hidden=true;$('#mapBadge').textContent='地图模式：Leaflet + OpenStreetMap（免 key）';window.MapLayers?.openPanel();}
    toast(`已退出“${layerName}”编辑模式`);
  }
  function finishManualEdit(){saveLayerEdit();const detail={featureCount:state.features.length,graphicCount:state.graphics.length};exitLayerEdit();document.dispatchEvent(new CustomEvent('map:manual-edit-finished',{detail}));}
  function cancelManualEdit(){if(state.manualSnapshot)restore(state.manualSnapshot);exitLayerEdit();toast('已放弃本轮编辑');}

  // ============ 制图模式（cartography-edit） ============
  function enterCartographyEdit(mapData){
    switchWorkspace('map');
    state.editSource='cartography';
    state.returnStage='workspace';
    state.editLayer={id:mapData.id,name:mapData.name,geometryType:'面'};
    state.features=mapData.features||[];
    state.graphics=[];
    state.clipboard=[];
    state.manualSnapshot=snapshot();
    state.savedSnapshot=snapshot();
    resetHistory();
    clearSelection(false);
    setTool('select');
    resultLayer.hidden=false;
    graphicsLayer.hidden=false;   // 制图模式支持点/线/面/文字标注，标注层需可见
    renderAll();
    setStage('cartography-edit');  // ← 关键：切换到制图工具栏
    // 更新制图工具栏摘要
    $('#mapCartoMapName').textContent=mapData.name||'现状用地图';
    $('#mapCartoFeatureCount').textContent=(mapData.features?.length||0)+' 个要素';
    $('#mapBadge').textContent=`制图模式 · ${mapData.name||'现状用地图'}`;
    setCartoPrimaryButton('confirm');  // 主操作复位为「确认」（模板尚未应用）
    // 加载现状图后自动打开「图层管理器」+「图例管理器」，让用户立即看到图层与图例信息
    try {
      window.MapLayers?.openPanel?.();
      window.MapLayers?.setLegendVisible?.(true);
    } catch (err) {
      console.warn('[cartography] 打开图层/图例管理器失败', err);
      toast('图层管理面板初始化异常，可手动打开');
    }
    toast(`已进入制图编辑模式 · ${mapData.features?.length||0} 个地块`);
  }
  function exitCartographyEdit(){
    const mapName=state.editLayer?.name||'现状用地图';
    clearSelection();
    setTool('select');
    state.history=[];
    state.historyIndex=-1;
    setStage('workspace');
    resultLayer.hidden=true;
    graphicsLayer.hidden=true;
    // 清除模板
    window.Cartography?.clearTemplate();
    $('#mapBadge').textContent='地图模式：Leaflet + OpenStreetMap（免 key）';
    window.MapLayers?.openPanel();
    toast(`已退出制图模式`);
  }
  function saveCartographyEdit(){
    state.savedSnapshot=snapshot();
    // 保存后恢复工具栏初始状态：清选择、关菜单、工具回默认
    closeMenus();
    clearSelection(false);
    setTool('select');
    const mapName=state.editLayer?.name||'现状用地图';
    toast(`已保存「${mapName}」的编辑，工具栏已恢复初始状态`);
    document.dispatchEvent(new CustomEvent('map:cartography-saved',{
      detail:{layer:state.editLayer,featureCount:state.features.length}
    }));
  }
  // 制图模式唯一主操作「确认」：保存当前成果 → 智能体向用户询问模板来源
  function confirmCartography(){
    saveCartographyEdit();
    const cmap=window.Cartography?.getState?.().currentMap;
    if(!cmap){toast('当前无制图数据');return;}
    if(typeof promptTemplateSource==='function'){
      promptTemplateSource(cmap);
    }else{
      window.Cartography?.showTemplateLibrary?.();
    }
  }
  // 主操作按钮切换：模板出现前「确认」（询问模板）→ 模板应用后「导出」（导出成果）
  function setCartoPrimaryButton(mode){
    const btn=cartoToolbar?.querySelector('#mapCartoPrimaryBtn');
    if(!btn)return;
    if(mode==='export'){
      btn.dataset.cartoTool='export';
      btn.textContent='导出';
    }else{
      btn.dataset.cartoTool='confirm';
      btn.textContent='确认';
    }
  }

  function showResults(){
    switchWorkspace('map');
    const resultFeatures=makeFeatures(),resultConfig={id:'agent-result',name:'商业用地筛选结果',fileName:'商业用地筛选结果.geojson',type:'Agent 结果',geometryType:'面',legend:'福田区面积大于 5000㎡的商业用地',color:'#10B981',managedElementId:'mapResultLayer',editorFeatures:resultFeatures,featureCount:resultFeatures.length};
    const result=window.MapLayers?.registerDynamicLayer?.(resultConfig)||resultConfig;
    window.MapLayers?.selectLayer?.(result.id);startLayerEdit(result);
    if(typeof map!=='undefined'&&map){map.setView([23.129,113.264],13);if(typeof map.invalidateSize==='function')map.invalidateSize();}
    $('#mapBadge').textContent='正在编辑结果图层 · 商业用地筛选结果（面）';
  }
  function locateResults(){switchWorkspace('map');if(typeof map!=='undefined'&&map)map.setView([23.129,113.264],13);resultLayer.classList.add('result-pulse');setTimeout(()=>resultLayer.classList.remove('result-pulse'),700);}
  function contextForSelection(){
    // 模板要素优先：选中模板要素后可通过「询问AI」加入上下文进行修改
    const tplSel=window.Cartography?.getSelectedTemplateElement?.();
    if(tplSel)return{type:'template-element',count:1,label:tplSel.label,elementType:tplSel.type,templateIdx:tplSel.idx,element:{...tplSel.element}};
    if(state.selectedFeatures.size)return{type:'map-features',count:state.selectedFeatures.size,layerName:'商业用地筛选结果',featureIds:[...state.selectedFeatures]};
    const externalContext=window.LegendLayerCreator?.getContextForAI?.();
    if(externalContext)return externalContext;
    if(state.selectedGraphics.size){const selected=selectedGraphics();return{type:selected.length===1?'map-graphic':'map-graphics',count:selected.length,graphicType:selected[0]?.type,graphicIds:selected.map(item=>item.id),label:selected[0]?.text||'地图标注区域'};}
    return null;
  }
  function askAI(prefill){const context=contextForSelection();if(!context){toast('请先选择地图对象');return;}setSelectedContext(context);if(prefill)$('#chatText').value=prefill;$('#chatText').focus();toast(context.type==='map-features'?`已引用地图要素 · ${context.count} 个`:context.type==='template-element'?`已引用模板要素「${context.label}」`:'已引用地图标注区域');}
  function saveResult(){toast('结果已保存到当前工作空间（模拟）');}

  function svgPoint(event){const rect=resultLayer.getBoundingClientRect();return{x:(event.clientX-rect.left)/rect.width*1000,y:(event.clientY-rect.top)/rect.height*700};}
  function addGraphic(type,start,end){
    const id='G-'+String(state.graphics.length+1).padStart(3,'0'),graphic={id,type,color:state.graphicColor};
    if(type==='marker'||type==='text'){graphic.x=end.x;graphic.y=end.y;if(type==='text')graphic.text='重点核查区域';}
    else if(type==='arrow'){Object.assign(graphic,{x1:start.x,y1:start.y,x2:end.x,y2:end.y});}
    else if(type==='polygon'){graphic.points=`${start.x},${start.y} ${end.x},${start.y} ${end.x},${end.y} ${start.x+25},${end.y+20}`;}
    else Object.assign(graphic,{x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),width:Math.max(24,Math.abs(end.x-start.x)),height:Math.max(24,Math.abs(end.y-start.y))});
    state.graphics.push(graphic);if(state.stage==='manual-edit')pushHistory();renderGraphics();setTool('select');toast('已添加'+({marker:'点标记',text:'文字标注',arrow:'箭头',polygon:'多边形',rectangle:'矩形'}[type]||'图形'));
  }
  // 清除所有图形标记（制图模式标注菜单「清除所有标记」）
  function clearAllGraphics(){
    if(!state.graphics.length){toast('当前没有标记');return;}
    const count=state.graphics.length;
    const cleared=cloneData(state.graphics);
    state.graphics=[];
    state.selectedGraphics.clear();
    pushHistory();
    renderGraphics();
    updateSelectionUI();
    toast(`已清除全部 ${count} 个标记`);
    // 广播事件，供对话等其他模块感知
    document.dispatchEvent(new CustomEvent('map:graphics-cleared',{detail:{count}}));
    // 供撤销使用：暂存到 history 已足够（undo 会恢复）
  }

  document.addEventListener('click',event=>{
    const toggle=event.target.closest('[data-map-menu-toggle]');if(toggle){event.stopPropagation();const menu=document.querySelector(`[data-map-menu="${toggle.dataset.mapMenuToggle}"]`),willOpen=menu.hidden;closeMenus();menu.hidden=!willOpen;return;}
    if(!event.target.closest('.map-tool-menu-wrap'))closeMenus();
  });
  resultToolbar.addEventListener('click',event=>{
    const tool=event.target.closest('[data-result-tool]')?.dataset.resultTool,graphic=event.target.closest('[data-graphic-tool]')?.dataset.graphicTool;if(graphic){setTool('graphic-'+graphic);return;}if(!tool)return;
    if(tool==='manual-edit')enterManualEdit();else if(tool==='save')saveResult();else setTool(tool);
  });
  manualToolbar.addEventListener('click',event=>{
    const tool=event.target.closest('[data-manual-tool]')?.dataset.manualTool,graphic=event.target.closest('[data-graphic-tool]')?.dataset.graphicTool;if(graphic){setTool('graphic-'+graphic);return;}if(!tool)return;
    const actions={'move-feature':moveFeature,'delete-feature':deleteFeatures,'copy-feature':copyFeatures,'paste-feature':pasteFeatures,'rotate-feature':()=>transformFeatures('rotate'),'scale-feature':()=>transformFeatures('scale'),'vertex-edit':vertexEdit,'split-feature':splitFeature,'clip-feature':clipFeature,undo,redo,'save-edit':saveLayerEdit,'exit-edit':exitLayerEdit};
    actions[tool]?actions[tool]():setTool(tool);
  });
  // 制图工具栏事件
  if(cartoToolbar){
    cartoToolbar.addEventListener('click',event=>{
      const cartoTool=event.target.closest('[data-carto-tool]')?.dataset.cartoTool;
      const graphic=event.target.closest('[data-graphic-tool]')?.dataset.graphicTool;
      const graphicAction=event.target.closest('[data-graphic-action]')?.dataset.graphicAction;
      if(graphicAction){ // 标注菜单动作：清除所有标记
        if(graphicAction==='clear-all')clearAllGraphics();
        return;
      }
      if(graphic){setTool('graphic-'+graphic);return;}
      if(!cartoTool)return;
      switch(cartoTool){
        case 'select-all':
          state.features.forEach(f=>state.selectedFeatures.add(f.id));
          renderAll();toast(`已全选 ${state.features.length} 个要素`);
          break;
        case 'manual-edit':
          enterCartographyManualEdit();break;
        case 'confirm':
          // 主操作-确认：智能体向用户询问模板来源
          confirmCartography();break;
        case 'export':
          // 主操作-导出：模板应用后打开导出面板
          window.Cartography?.showExportPanel?.();break;
        default:
          setTool(cartoTool);
      }
    });
  }
  selectionBar.addEventListener('click',event=>{const action=event.target.closest('[data-selection-action]')?.dataset.selectionAction;if(action==='ask-ai')askAI();if(action==='reanalyze')askAI('请重新分析选中区域，检查是否存在遗漏或误判。');if(action==='manual-delete')state.selectedGraphics.size?deleteGraphics():deleteFeatures();});
  // 选择元素栏支持拖动移动：按住非按钮区域拖拽，松手固定位置
  {
    let barDrag = null;
    const moveBar = event => {
      if (!barDrag) return;
      selectionBar.style.left = (barDrag.origLeft + event.clientX - barDrag.startX) + 'px';
      selectionBar.style.top = (barDrag.origTop + event.clientY - barDrag.startY) + 'px';
    };
    selectionBar.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = selectionBar.getBoundingClientRect();
      const parent = selectionBar.offsetParent || document.body;
      const pRect = parent.getBoundingClientRect();
      // 由 bottom 居中定位切换为 left/top 固定定位，支持自由拖动
      selectionBar.style.left = (rect.left - pRect.left) + 'px';
      selectionBar.style.top = (rect.top - pRect.top) + 'px';
      selectionBar.style.bottom = 'auto';
      selectionBar.style.transform = 'none';
      selectionBar.classList.add('dragging');
      barDrag = { startX: event.clientX, startY: event.clientY, origLeft: rect.left - pRect.left, origTop: rect.top - pRect.top };
      try { selectionBar.setPointerCapture(event.pointerId); } catch (e) {}
    });
    selectionBar.addEventListener('pointermove', moveBar);
    const endBarDrag = () => { barDrag = null; selectionBar.classList.remove('dragging'); };
    selectionBar.addEventListener('pointerup', endBarDrag);
    selectionBar.addEventListener('pointercancel', endBarDrag);
  }

  resultLayer.addEventListener('pointerdown',event=>{
    if(state.tool==='box-select'){const rect=resultLayer.getBoundingClientRect();state.dragStart={x:event.clientX-rect.left,y:event.clientY-rect.top};box.hidden=false;box.style.left=state.dragStart.x+'px';box.style.top=state.dragStart.y+'px';box.style.width='0';box.style.height='0';resultLayer.setPointerCapture(event.pointerId);return;}
    if(state.tool.startsWith('graphic-')){state.graphicStart=svgPoint(event);resultLayer.setPointerCapture(event.pointerId);}
  });
  resultLayer.addEventListener('pointermove',event=>{if(!state.dragStart)return;const rect=resultLayer.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;box.style.left=Math.min(x,state.dragStart.x)+'px';box.style.top=Math.min(y,state.dragStart.y)+'px';box.style.width=Math.abs(x-state.dragStart.x)+'px';box.style.height=Math.abs(y-state.dragStart.y)+'px';});
  resultLayer.addEventListener('pointerup',event=>{
    if(state.dragStart){const selectRect=box.getBoundingClientRect();clearSelection(false);resultSvg.querySelectorAll('.map-result-feature').forEach(feature=>{const r=feature.getBoundingClientRect();if(r.left<selectRect.right&&r.right>selectRect.left&&r.top<selectRect.bottom&&r.bottom>selectRect.top)state.selectedFeatures.add(feature.dataset.featureId);});state.dragStart=null;box.hidden=true;renderAll();toast('已选择 '+state.selectedFeatures.size+' 个要素');return;}
    if(state.graphicStart){const type=state.tool.replace('graphic-',''),end=svgPoint(event);addGraphic(type,state.graphicStart,end);state.graphicStart=null;}
  });
  resultLayer.addEventListener('click',event=>{if(state.tool==='select'&&event.target===resultLayer){clearSelection(false);window.Cartography?.clearTemplateSelection?.();updateSelectionUI();}});
  // 模板要素选中：与图块要素选择逻辑一致 —— 清掉图块/图形选择，由选择元素栏展示选中态
  document.addEventListener('carto:template-element-selected',()=>{
    clearSelection(false);
    updateSelectionUI();
  });

  // 供图例管理使用：读取选中要素 ID / 将样式应用到指定要素
  function getSelectedFeatureIds(){return [...state.selectedFeatures];}
  function getLegendLayerSelection(){
    if(!state.selectedFeatures.size||!state.editLayer)return null;
    return {layer:{...state.editLayer},features:cloneData(selectedFeatures())};
  }
  function applyStyleToFeatures(ids,style){
    const set=new Set(ids||[]);if(!set.size)return 0;
    let count=0;
    state.features.forEach(f=>{if(set.has(f.id)){Object.assign(f,style);count++;}});
    if(count){renderAll();pushHistory();}
    return count;
  }

  window.MapResultInteraction={showResults,locateResults,clearSelection,enterManualEdit,enterCartographyManualEdit,startLayerEdit,saveLayerEdit,exitLayerEdit,finishManualEdit,cancelManualEdit,enterCartographyEdit,exitCartographyEdit,saveCartographyEdit,confirmCartography,setCartoPrimaryButton,getSelectedFeatureIds,getLegendLayerSelection,refreshSelectionUI:updateSelectionUI,applyStyleToFeatures,undo,redo,getState:()=>({stage:state.stage,editLayer:state.editLayer,featureCount:state.features.length,graphicCount:state.graphics.length,selectedFeatureCount:state.selectedFeatures.size,selectedGraphicCount:state.selectedGraphics.size,tool:state.tool,canUndo:state.historyIndex>0,canRedo:state.historyIndex>=0&&state.historyIndex<state.history.length-1})};
  setStage('workspace');
})();

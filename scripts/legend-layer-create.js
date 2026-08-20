// 从同一图层的选中对象创建新图层与图例（前端交互原型）。
(function(){
  'use strict';

  const palette=['#3B82F6','#F97316','#22C55E','#A855F7','#EF4444','#06B6D4','#EAB308','#EC4899'];
  const selectedLeafletFeatures=new Map();
  const menu=$('#mapObjectContextMenu'),menuItem=$('#createLegendLayerMenuItem'),menuHint=$('#createLegendLayerMenuHint');
  const mask=$('#createLegendLayerMask'),nameInput=$('#createLegendLayerName'),errorEl=$('#createLegendLayerError');
  let dialogSelection=null;

  function clone(value){return JSON.parse(JSON.stringify(value));}
  function layerById(id){return window.MapLayers?.getLoaded?.().find(layer=>layer.id===id)||null;}
  function keyOf(layerId,index){return `${layerId}:${index}`;}
  function getLeafletSelectionCount(){return selectedLeafletFeatures.size;}

  function toggleLeafletFeature(layerId,index){
    const layer=layerById(layerId);if(!layer||layer.category==='raster')return;
    const key=keyOf(layerId,index);
    if(selectedLeafletFeatures.has(key)){
      window.MapLayers?.setFeatureSelected?.(layerId,index,false);selectedLeafletFeatures.delete(key);
    }else{
      const snapshot=window.MapLayers?.getFeatureSnapshot?.(layerId,index);if(!snapshot)return;
      selectedLeafletFeatures.set(key,{layer,snapshot});window.MapLayers?.setFeatureSelected?.(layerId,index,true);
    }
    window.MapResultInteraction?.refreshSelectionUI?.();
  }

  function clearLeafletSelection(){
    selectedLeafletFeatures.forEach(({snapshot})=>window.MapLayers?.setFeatureSelected?.(snapshot.layerId,snapshot.index,false));
    selectedLeafletFeatures.clear();window.MapResultInteraction?.refreshSelectionUI?.();
  }

  function getSvgSelection(){
    const selection=window.MapResultInteraction?.getLegendLayerSelection?.();
    if(!selection?.features?.length)return [];
    return selection.features.map(feature=>({
      layer:selection.layer,
      snapshot:{layerId:selection.layer.id,sourceFeatureId:feature.id,points:feature.points,properties:feature}
    }));
  }

  function getCurrentSelection(){return [...selectedLeafletFeatures.values(),...getSvgSelection()];}
  function getContextForAI(){
    if(!selectedLeafletFeatures.size)return null;
    const values=[...selectedLeafletFeatures.values()],layers=[...new Set(values.map(item=>item.layer.name))];
    return {type:'map-features',count:values.length,layerName:layers.join('、'),featureIds:values.map(item=>item.snapshot.sourceFeatureId)};
  }

  function selectionInfo(){
    const items=getCurrentSelection(),layerIds=[...new Set(items.map(item=>item.layer.id))];
    return {items,layerIds,valid:items.length>0&&layerIds.length===1,sourceLayer:layerIds.length===1?(items[0]?.layer||layerById(layerIds[0])):null};
  }

  function closeMenu(){menu.hidden=true;}
  function openMenu(clientX,clientY){
    const info=selectionInfo();if(!info.items.length)return;
    const disabled=!info.valid;menuItem.setAttribute('aria-disabled',String(disabled));menuItem.title=disabled?'仅支持选择同一图层中的对象':'新增图例和图层';menuHint.hidden=!disabled;
    menu.hidden=false;menu.style.left='0px';menu.style.top='0px';
    const rect=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(clientX,window.innerWidth-rect.width-8))+'px';menu.style.top=Math.max(8,Math.min(clientY,window.innerHeight-rect.height-8))+'px';
  }

  function showError(message){errorEl.textContent=message;errorEl.hidden=false;nameInput.classList.add('invalid');nameInput.setAttribute('aria-invalid','true');nameInput.focus();}
  function clearError(){errorEl.hidden=true;errorEl.textContent='';nameInput.classList.remove('invalid');nameInput.removeAttribute('aria-invalid');}
  function closeDialog(){mask.classList.remove('show');dialogSelection=null;clearError();}
  function openDialog(){
    const info=selectionInfo();closeMenu();
    if(!info.valid){if(info.items.length)toast('仅支持选择同一图层中的对象');return;}
    dialogSelection=info;$('#createLegendLayerSource').textContent=info.sourceLayer?.name||'当前图层';$('#createLegendLayerCount').textContent=info.items.length;
    nameInput.value='';clearError();mask.classList.add('show');setTimeout(()=>nameInput.focus(),40);
  }

  function colorUsage(color){
    return window.MapLayers?.getLoaded?.().filter(layer=>String(layer.legend?.fill||layer.style?.fillColor||layer.color).toUpperCase()===color).length||0;
  }
  function nextColor(){return palette.map(color=>({color,count:colorUsage(color)})).sort((a,b)=>a.count-b.count||palette.indexOf(a.color)-palette.indexOf(b.color))[0].color;}
  function geometryKind(type){return type==='点'?'point':type==='线'?'line':'polygon';}
  function generateLegendStyle(geometryType){
    const color=nextColor(),kind=geometryKind(geometryType);
    if(kind==='point')return{kind,color,weight:2,fillColor:color,fillOpacity:.9,radius:6};
    if(kind==='line')return{kind:'polyline',color,weight:3,opacity:1};
    return{kind,color,weight:2,fillColor:color,fillOpacity:.38};
  }

  function cleanProperties(raw){
    const source=raw&&typeof raw==='object'?clone(raw):{},properties={};
    Object.keys(source).forEach(key=>{
      if(/^(id|fid|oid|objectid|featureid)$/i.test(key)||['points','geometry','fill','stroke','strokeWidth','fillOpacity'].includes(key))return;
      properties[key]=source[key];
    });
    return properties;
  }
  function cloneSelectedFeatures(items,layerId){
    const stamp=Date.now().toString(36);
    return items.map((item,index)=>({
      id:`${layerId}-feature-${stamp}-${index+1}`,
      sourceFeatureId:item.snapshot.sourceFeatureId,
      geometry:item.snapshot.geometry?clone(item.snapshot.geometry):undefined,
      points:item.snapshot.points,
      properties:cleanProperties(item.snapshot.properties)
    }));
  }

  function renderSvgCloneLayer(id,features,geometryType,style){
    if(!features.some(feature=>feature.points))return '';
    const host=$('#workspaceMapView'),layer=document.createElement('div'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    layer.id=`${id}-overlay`;layer.className='map-result-layer legend-clone-layer';svg.setAttribute('viewBox','0 0 1000 700');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
    features.forEach(feature=>{
      if(!feature.points)return;
      const tag=geometryType==='点'?'circle':geometryType==='线'?'polyline':'polygon',element=document.createElementNS('http://www.w3.org/2000/svg',tag);
      if(geometryType==='点'){const [x,y]=feature.points.split(' ')[0].split(',');element.setAttribute('cx',x);element.setAttribute('cy',y);element.setAttribute('r',String(style.radius||10));}
      else element.setAttribute('points',feature.points);
      element.classList.add('map-result-feature',`geometry-${geometryType==='点'?'point':geometryType==='线'?'line':'polygon'}`);element.style.fill=style.fillColor||style.color;element.style.fillOpacity=String(style.fillOpacity??1);element.style.stroke=style.color;element.style.strokeWidth=String(style.weight||2);svg.appendChild(element);
    });
    layer.appendChild(svg);host.appendChild(layer);return layer.id;
  }

  function createNewLayer(name,info){
    const source=info.sourceLayer,layerId=`legend-layer-${Date.now().toString(36)}`,legendId=`legend-${layerId}`;
    const style=generateLegendStyle(source.geometryType),features=cloneSelectedFeatures(info.items,layerId),managedElementId=renderSvgCloneLayer(layerId,features,source.geometryType,style);
    const legend={id:legendId,name,type:geometryKind(source.geometryType),fill:style.fillColor||style.color,stroke:style.color,borderWidth:style.weight};
    const layer=window.MapLayers?.registerDynamicLayer?.({
      id:layerId,name,layerName:name,legendName:name,geometryType:source.geometryType,sourceLayerId:source.id,
      type:'复制图层',fileName:name+'.geojson',style,legend,legendId,color:style.fillColor||style.color,
      features,editorFeatures:features,featureCount:features.length,managedElementId
    });
    if(!layer)return null;
    window.Cartography?.registerLayerLegend?.({id:legendId,layerId,name,color:legend.fill,borderColor:legend.stroke,borderWidth:legend.borderWidth,featureIds:features.map(feature=>feature.id)});
    return layer;
  }

  function confirmCreate(){
    if(!dialogSelection?.valid)return;
    const name=nameInput.value.trim();
    if(!name){showError('请输入名称');return;}
    if(window.MapLayers?.getLoaded?.().some(layer=>(layer.layerName||layer.name).trim()===name)){showError('已存在同名图层，请修改名称');return;}
    const layer=createNewLayer(name,dialogSelection);if(!layer){showError('创建失败，请稍后重试');return;}
    const count=dialogSelection.items.length;closeDialog();clearLeafletSelection();window.MapResultInteraction?.clearSelection?.();
    window.MapLayers?.selectLayer?.(layer.id);window.MapLayers?.openPanel?.();window.MapLayers?.setLegendVisible?.(true);
    toast(`已创建「${name}」，共复制 ${count} 个对象`);
  }

  document.addEventListener('map:feature-clicked',event=>{const detail=event.detail||{};if(detail.layerId!=null&&Number.isInteger(Number(detail.index)))toggleLeafletFeature(detail.layerId,Number(detail.index));});
  if(typeof map!=='undefined'&&map)map.on('contextmenu',event=>{if(!getCurrentSelection().length)return;L.DomEvent.preventDefault(event);openMenu(event.originalEvent?.clientX||0,event.originalEvent?.clientY||0);});
  $('#mapResultLayer')?.addEventListener('contextmenu',event=>{if(!getCurrentSelection().length)return;event.preventDefault();event.stopPropagation();openMenu(event.clientX,event.clientY);});
  menuItem.addEventListener('click',()=>{if(menuItem.getAttribute('aria-disabled')==='true'){toast('仅支持选择同一图层中的对象');return;}openDialog();});
  menuItem.addEventListener('mouseenter',()=>{if(menuItem.getAttribute('aria-disabled')==='true')menuHint.hidden=false;});
  document.addEventListener('click',event=>{if(!event.target.closest('#mapObjectContextMenu'))closeMenu();});
  window.addEventListener('resize',closeMenu);
  $('#createLegendLayerClose').addEventListener('click',closeDialog);$('#createLegendLayerCancel').addEventListener('click',closeDialog);$('#createLegendLayerConfirm').addEventListener('click',confirmCreate);
  mask.addEventListener('click',event=>{if(event.target===mask)closeDialog();});
  nameInput.addEventListener('input',clearError);nameInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();confirmCreate();}else if(event.key==='Escape')closeDialog();});

  window.LegendLayerCreator={getLeafletSelectionCount,getContextForAI,clearLeafletSelection,getSelection:selectionInfo,openDialog};
})();

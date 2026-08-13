// 本地矢量图层：选择、模拟加载到 Leaflet、显隐管理。
(function(){
  const button=document.querySelector('.mt-btn[data-tool="layer"]'),mask=$('#vectorSelectMask');
  const selectList=$('#vectorSelectList'),panel=$('#vectorLayerPanel'),layerList=$('#vectorLayerList');
  const leafletLayers=new Map();
  const geometry={
    building:()=>L.polygon([[23.151,113.232],[23.151,113.247],[23.142,113.247],[23.142,113.232]],{color:'#7C3AED',weight:2,fillColor:'#A78BFA',fillOpacity:.42}),
    road:()=>L.polyline([[23.105,113.205],[23.119,113.238],[23.132,113.276],[23.154,113.318]],{color:'#F59E0B',weight:6,opacity:.85}),
    river:()=>L.polyline([[23.172,113.216],[23.148,113.252],[23.123,113.285],[23.094,113.322]],{color:'#0EA5E9',weight:8,opacity:.7}),
    landuse:()=>L.polygon([[23.177,113.266],[23.164,113.315],[23.126,113.326],[23.111,113.283],[23.135,113.255]],{color:'#10B981',weight:2,fillColor:'#34D399',fillOpacity:.22})
  };
  function positionSelect(){positionAnchoredPopover(button,mask.querySelector('.vector-select-modal'),'auto');}
  function close(){mask.classList.remove('show');}
  function updateCount(){$('#vectorSelectedCount').textContent=selectList.querySelectorAll('input:checked').length;}
  function open(){
    if(!window.GISWorkspace?.isReady()){toast('请先选择本地工作空间');return;}
    $('#vectorWorkspacePath').textContent=window.GISWorkspace.getPath();
    selectList.innerHTML=window.GISWorkspace.getVectorLayers().map((layer,index)=>`<label class="vector-select-row"><span><input type="checkbox" value="${layer.id}" ${layer.loaded||index<2?'checked':''}></span><span class="vector-file-name">${layer.fileName}</span><span class="vector-file-type">${layer.type}</span></label>`).join('');
    updateCount();mask.classList.add('show');requestAnimationFrame(positionSelect);
  }
  function renderPanel(){
    const loaded=window.GISWorkspace.getVectorLayers().filter(layer=>layer.loaded);
    $('#vectorLayerCount').textContent=loaded.length;panel.classList.toggle('show',loaded.length>0);
    layerList.innerHTML=loaded.map(layer=>`<label class="vlp-row"><input type="checkbox" data-layer-id="${layer.id}" ${layer.visible?'checked':''}><span class="vlp-symbol ${layer.id}"></span><span class="vlp-name">${layer.name}</span></label>`).join('');
  }
  function load(){
    const selected=new Set([...selectList.querySelectorAll('input:checked')].map(input=>input.value));
    window.GISWorkspace.getVectorLayers().forEach(layer=>{
      if(!selected.has(layer.id))return;
      layer.loaded=true;layer.visible=true;
      let visual=leafletLayers.get(layer.id);
      if(!visual&&typeof L!=='undefined'&&typeof map!=='undefined'&&map){visual=geometry[layer.id]().bindPopup(layer.name+' · '+layer.type);leafletLayers.set(layer.id,visual);}
      if(visual&&!map.hasLayer(visual))visual.addTo(map);
    });
    renderPanel();close();
    if(selected.size&&typeof map!=='undefined'&&map)map.setView([23.132,113.268],12);
    toast('已加载 '+selected.size+' 个矢量图层');
  }
  button.addEventListener('click',open);selectList.addEventListener('change',updateCount);
  $('#vectorSelectClose').addEventListener('click',close);$('#vectorSelectCancel').addEventListener('click',close);$('#vectorLoadConfirm').addEventListener('click',load);
  mask.addEventListener('click',event=>{if(event.target===mask)close();});
  window.addEventListener('resize',()=>{if(mask.classList.contains('show'))positionSelect();});
  layerList.addEventListener('change',event=>{
    const input=event.target.closest('[data-layer-id]');if(!input)return;
    const layer=window.GISWorkspace.getVectorLayers().find(item=>item.id===input.dataset.layerId),visual=leafletLayers.get(input.dataset.layerId);
    if(!layer||!visual||typeof map==='undefined'||!map)return;
    layer.visible=input.checked;input.checked?visual.addTo(map):map.removeLayer(visual);
  });
})();

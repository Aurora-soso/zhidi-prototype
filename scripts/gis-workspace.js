// GIS 本地工作空间模拟：维护项目空间、目录路径与扫描到的矢量文件。
// 「项目空间」=「GIS 工作空间」：选择项目空间后，扫描该空间矢量数据并作为对话上下文。
(function(){
  const button=$('#ciWorkspace'), mask=$('#workspaceFolderMask');
  const vectorButton=document.querySelector('.map-toolbar [data-tool="load-local"]');
  const state={workspacePath:'',vectorLayers:[],selectedSpace:null};

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

  function scan(path){
    // 每个图层自带「图例样式」字段（legend），图例完全由加载的图层驱动，不再写死。
    // legend.type: polygon(面) / line(线) / point(点)；颜色与地图渲染样式(layerStyles)保持一致。
    return [
      {id:'building',name:'建筑',fileName:'建筑.shp',type:'Shapefile',geometryType:'面',path:path+'建筑.shp',loaded:false,visible:true,opacity:1,legend:{type:'polygon',fill:'#A78BFA',stroke:'#7C3AED'}},
      {id:'road',name:'道路',fileName:'道路.shp',type:'Shapefile',geometryType:'线',path:path+'道路.shp',loaded:false,visible:true,opacity:1,legend:{type:'line',stroke:'#F59E0B'}},
      {id:'river',name:'河流',fileName:'河流.geojson',type:'GeoJSON',geometryType:'线',path:path+'河流.geojson',loaded:false,visible:true,opacity:1,legend:{type:'line',stroke:'#0EA5E9'}},
      {id:'landuse',name:'土地利用',fileName:'土地利用.gpkg',type:'GeoPackage',geometryType:'面',path:path+'土地利用.gpkg',loaded:false,visible:true,opacity:1,legend:{type:'polygon',fill:'#34D399',stroke:'#10B981'}},
      {id:'poi',name:'监测点',fileName:'监测点.geojson',type:'GeoJSON',geometryType:'点',path:path+'监测点.geojson',loaded:false,visible:true,opacity:1,legend:{type:'point',fill:'#F87171',stroke:'#DC2626'}}
    ];
  }

  // 渲染项目空间列表（数据来自 conversation-manager 的 workspaces）
  function renderSpaceList(){
    const wrap=$('#gisSpaceList');
    if(!wrap) return;
    const workspaces=(window.ConversationManager&&ConversationManager.getWorkspaces())||[];
    const locked=Boolean(window.ConversationManager&&ConversationManager.isCurrentConversationLocked());
    state.selectedSpace=null;
    const tip=locked?'<div class="gis-space-lock-tip">🔒 当前对话已锁定工作空间，无法切换</div>':'';
    wrap.innerHTML = tip + workspaces.map(ws=>
      '<div class="gis-space-item'+(locked?' locked':'')+'" data-id="'+ws.id+'">'+
        '<span class="gsi-icon">📁</span>'+
        '<div class="gsi-info"><div class="gsi-name">'+esc(ws.name)+'</div><div class="gsi-path">'+esc(ws.path)+'</div></div>'+
        '<span class="gsi-check">'+(locked?'🔒':'＋')+'</span>'+
      '</div>'
    ).join('');
    if(!locked){
      wrap.querySelectorAll('.gis-space-item').forEach(item=>{
        item.addEventListener('click',()=>selectSpace(item.dataset.id));
      });
    }
  }

  function selectSpace(id){
    const ws=(window.ConversationManager&&ConversationManager.getWorkspaces()).find(w=>w.id===id);
    if(!ws) return;
    state.selectedSpace={id:ws.id,name:ws.name,path:ws.path};
    document.querySelectorAll('.gis-space-item').forEach(it=>it.classList.toggle('selected', it.dataset.id===id));
    document.querySelectorAll('.gis-space-item .gsi-check').forEach(ch=>ch.textContent='＋');
    const check=document.querySelector('.gis-space-item[data-id="'+id+'"] .gsi-check');
    if(check) check.textContent='✓';
    $('#workspacePathInput').value=ws.path;
    const preview=$('#gisFolderPreview');
    if(preview) preview.innerHTML='<span>📁</span><div><b>'+esc(ws.name)+'</b><small>'+esc(ws.path)+'</small></div>';
  }

  function open(){
    // 锁定状态入口拦截：
    //   场景A 当前对话已发首条消息（messageCount > 0）→ 工作空间锁定，
    //         仅弹出锁定提示，不打开空间选择弹窗；
    //   场景B 当前对话未发消息（messageCount === 0）→ 可自由切换，正常打开；
    //   场景C 无当前对话（currentConversation === null）→ 未锁定，正常打开。
    if(window.ConversationManager && ConversationManager.isCurrentConversationLocked()){
      if(typeof toast==='function') toast('🔒 当前对话已锁定工作空间，无法切换');
      return;
    }
    renderSpaceList();
    mask.classList.add('show');
  }
  function close(){mask.classList.remove('show');}
  function confirm(){
    const sel=state.selectedSpace;
    if(sel && window.ConversationManager){
      // 同步设置当前对话的工作空间；若已锁定（发过首条消息）则拒绝并保持弹窗
      const ok=ConversationManager.setCurrentWorkspace(sel.id);
      if(!ok) return;
    }
    state.workspacePath=$('#workspacePathInput').value||'E:/GIS/project/';
    state.vectorLayers=scan(state.workspacePath);
    vectorButton.classList.remove('disabled');
    vectorButton.setAttribute('aria-disabled','false');
    vectorButton.disabled=false;
    vectorButton.title='加载矢量数据';
    close();
    if(!sel){
      // 自定义路径（未选中项目空间）：直接显示路径
      button.innerHTML='<span class="cp-check">🗂️</span><span class="ci-workspace-path">'+esc(state.workspacePath)+'</span>';
      button.title=state.workspacePath;
    }
    document.dispatchEvent(new CustomEvent('gis:workspace-ready',{detail:state}));
    toast('已扫描到 '+state.vectorLayers.length+' 个矢量数据文件');
  }
  button.addEventListener('click',open);
  $('#workspaceFolderClose').addEventListener('click',close);
  $('#workspaceFolderCancel').addEventListener('click',close);
  $('#workspaceFolderConfirm').addEventListener('click',confirm);
  mask.addEventListener('click',event=>{if(event.target===mask)close();});
  window.GISWorkspace={getPath:()=>state.workspacePath,getVectorLayers:()=>state.vectorLayers,isReady:()=>Boolean(state.workspacePath)};
})();

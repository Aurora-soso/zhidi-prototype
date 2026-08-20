// GIS 本地工作空间模拟：维护项目空间、目录路径与扫描到的矢量文件。
// 「项目空间」=「GIS 工作空间」：选择项目空间后，扫描该空间矢量数据并作为对话上下文。
(function(){
  const button=$('#ciWorkspace'), mask=$('#workspaceFolderMask');
  const vectorButton=document.querySelector('.map-toolbar [data-tool="load-local"]');
  const state={workspacePath:'',vectorLayers:[],vectorTree:[],selectedSpace:null};

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

  function scan(path){
    // 返回「目录树」结构（供矢量选择弹窗按层级展示）：
    //   kind: 'file'  → 空间文件叶子节点（shapefile/geojson/gpkg/gdb 等）
    //   kind: 'folder'→ 子目录节点，可逐级展开/折叠，children 嵌套下层节点
    // 非空间文件（pdf/md/svg 等）在此阶段已被筛除，不进入树。
    // 每个文件节点自带「图例样式」字段（legend），图例完全由加载的图层驱动，不再写死。
    // legend.type: polygon(面) / line(线) / point(点)；颜色与地图渲染样式(layerStyles)保持一致。
    function mk(id,name,fileName,type,geometryType,legend,category){
      return {kind:'file',id:id,name:name,fileName:fileName,type:type,geometryType:geometryType,category:category||'vector',path:path+fileName,loaded:false,visible:true,opacity:1,legend:legend};
    }
    return [
      mk('building','建筑','建筑.shp','Shapefile','面',{type:'polygon',fill:'#A78BFA',stroke:'#7C3AED'}),
      mk('road','道路','道路.shp','Shapefile','线',{type:'line',stroke:'#F59E0B'}),
      mk('river','河流','河流.geojson','GeoJSON','线',{type:'line',stroke:'#0EA5E9'}),
      mk('landuse','土地利用','土地利用.gpkg','GeoPackage','面',{type:'polygon',fill:'#34D399',stroke:'#10B981'}),
      mk('poi','监测点','监测点.geojson','GeoJSON','点',{type:'point',fill:'#F87171',stroke:'#DC2626'}),
      {
        kind:'folder',name:'基础地理数据',expanded:false,
        children:[
          mk('terrain','地形','地形.shp','Shapefile','面',{type:'polygon',fill:'#FBBF24',stroke:'#D97706'}),
          mk('water','水系','水系.geojson','GeoJSON','线',{type:'line',stroke:'#06B6D4'})
        ]
      },
      {
        kind:'folder',name:'专项规划',expanded:false,
        children:[
          mk('redline','用地红线','用地红线.shp','Shapefile','面',{type:'polygon',fill:'#F472B6',stroke:'#DB2777'}),
          mk('control','控规单元','控规单元.gdb','FileGDB','面',{type:'polygon',fill:'#60A5FA',stroke:'#2563EB'})
        ]
      },
      {
        kind:'folder',name:'影像地形',expanded:false,
        children:[
          mk('ortho','正射影像','正射影像.tif','GeoTIFF','影像',{type:'polygon',fill:'#94A3B8',stroke:'#64748B'},'raster'),
          mk('dem','DEM高程','DEM高程.tif','GeoTIFF','地形',{type:'polygon',fill:'#CBD5E1',stroke:'#64748B'},'raster')
        ]
      }
    ];
  }

  // 将目录树扁平化为「文件节点」数组，供图层加载/图例/图层面板等沿用旧逻辑
  function flattenTree(nodes,out){
    out=out||[];
    (nodes||[]).forEach(n=>{
      if(n.kind==='file')out.push(n);
      else if(n.kind==='folder'&&n.children)flattenTree(n.children,out);
    });
    return out;
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
    state.vectorTree=scan(state.workspacePath);
    state.vectorLayers=flattenTree(state.vectorTree);
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
  window.GISWorkspace={getPath:()=>state.workspacePath,getVectorLayers:()=>state.vectorLayers,getVectorTree:()=>state.vectorTree,isReady:()=>Boolean(state.workspacePath)};
})();

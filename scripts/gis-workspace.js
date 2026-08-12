// GIS 本地工作空间模拟：维护目录路径与扫描到的矢量文件。
(function(){
  const button=$('#ciWorkspace'), mask=$('#workspaceFolderMask');
  const vectorButton=document.querySelector('.mt-btn[data-tool="layer"]');
  const state={workspacePath:'',vectorLayers:[]};

  function scan(path){
    return [
      {id:'building',name:'建筑',fileName:'建筑.shp',type:'Shapefile',path:path+'建筑.shp',loaded:false,visible:true},
      {id:'road',name:'道路',fileName:'道路.shp',type:'Shapefile',path:path+'道路.shp',loaded:false,visible:true},
      {id:'river',name:'河流',fileName:'河流.geojson',type:'GeoJSON',path:path+'河流.geojson',loaded:false,visible:true},
      {id:'landuse',name:'土地利用',fileName:'土地利用.gpkg',type:'GeoPackage',path:path+'土地利用.gpkg',loaded:false,visible:true}
    ];
  }
  function open(){mask.classList.add('show');}
  function close(){mask.classList.remove('show');}
  function confirm(){
    state.workspacePath=$('#workspacePathInput').value||'E:/GIS/project/';
    state.vectorLayers=scan(state.workspacePath);
    button.innerHTML='<span class="cp-check">🗂️</span><span class="ci-workspace-path">'+state.workspacePath+'</span>';
    button.title=state.workspacePath;
    vectorButton.classList.remove('disabled');
    vectorButton.setAttribute('aria-disabled','false');
    vectorButton.title='加载矢量数据（'+state.vectorLayers.length+'）';
    vectorButton.querySelector('.mt-vector-label').textContent='加载矢量数据('+state.vectorLayers.length+')';
    close();
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

// 地图预览态工具栏：常驻快捷工具、互斥工具抽屉与独立图层管理面板。
(function(){
  const toolbar=document.querySelector('.map-toolbar');
  const actions=[...document.querySelectorAll('[data-tool]')].filter(item=>item.closest('.map-toolbar'));
  const drawerToggles=[...document.querySelectorAll('[data-map-drawer-toggle]')];
  const drawers=[...document.querySelectorAll('[data-map-drawer]')];
  const clearConfirm=$('#mapClearConfirm'),undoToast=$('#mapAnnotationUndoToast');
  let activeTool='',activeDrawer='',annotationCount=0,clearedSnapshot=[],undoTimer=null;

  function actionFor(tool){return document.querySelector(`.map-toolbar [data-tool="${tool}"]`);}
  function setEnabled(tool,enabled,title){
    const action=actionFor(tool);if(!action)return;
    action.disabled=!enabled;action.classList.toggle('disabled',!enabled);
    action.setAttribute('aria-disabled',String(!enabled));if(title)action.title=title;
  }
  function setActive(tool){
    actions.forEach(action=>{
      if(action.dataset.tool==='layer-manager')return;
      action.classList.toggle('active',action.dataset.tool===tool);
    });
    activeTool=tool||'';
  }
  function closeDrawers(){
    drawers.forEach(drawer=>drawer.hidden=true);
    drawerToggles.forEach(toggle=>{
      toggle.classList.remove('active');toggle.setAttribute('aria-expanded','false');
      // layer-manager 按钮同时承载 aria-pressed（表示显示管理抽屉开合）
      if(toggle.dataset.mapDrawerToggle==='layer-manager')toggle.setAttribute('aria-pressed','false');
    });
    activeDrawer='';
  }
  function toggleDrawer(name){
    const shouldClose=activeDrawer===name;
    closeDrawers();
    if(shouldClose)return;
    const drawer=document.querySelector(`[data-map-drawer="${name}"]`);
    const toggle=document.querySelector(`[data-map-drawer-toggle="${name}"]`);
    if(!drawer||!toggle)return;
    drawer.hidden=false;toggle.classList.add('active');toggle.setAttribute('aria-expanded','true');activeDrawer=name;
    if(name==='layer-manager'){
      // 显示管理抽屉打开：回填两个开关的真实状态，并同步按钮 aria-pressed
      syncLayerManagerSwitches();
      toggle.setAttribute('aria-pressed','true');
    }
    // 自定义内容注入：打开时执行抽屉注册的 onOpen 回调（如动态渲染内容）
    const onOpen=drawer._onOpen;if(typeof onOpen==='function')onOpen(drawer);
  }
  function pulse(action){
    action.classList.add('active');window.setTimeout(()=>action.classList.remove('active'),240);
  }
  function startDrawing(mode,tool,message){
    if(!window.MapPreviewDrawing)return;
    if(activeTool===tool){window.MapPreviewDrawing.stop();setActive('');toast('已退出当前工具');return;}
    window.MapPreviewDrawing.enter(mode);setActive(tool);toast(message);
  }
  function updateDataState(){
    const hasLayers=(window.MapLayers?.getLoaded().length||0)>0;
    setEnabled('fit-data',hasLayers,hasLayers?'缩放至数据范围':'加载数据后可用');
    setEnabled('query-feature',hasLayers,hasLayers?'查询要素属性':'加载数据后可用');
  }
  function updateAnnotationState(){
    annotationCount=window.MapPreviewDrawing?.annotationCount?.()??annotationCount;
    const hasAnnotations=annotationCount>0;
    setEnabled('annotation-edit',hasAnnotations,hasAnnotations?'编辑标注':'添加标注后可用');
    setEnabled('annotation-delete-selected',hasAnnotations,hasAnnotations?'删除最近选择的标注':'添加标注后可用');
    setEnabled('annotation-clear-all',hasAnnotations,hasAnnotations?`清空全部 ${annotationCount} 个标注`:'暂无可清空的标注');
  }
  function showClearConfirm(){
    $('#mapClearAnnotationCount').textContent=annotationCount;clearConfirm.hidden=false;
    requestAnimationFrame(()=>clearConfirm.classList.add('show'));
  }
  function hideClearConfirm(){clearConfirm.classList.remove('show');window.setTimeout(()=>clearConfirm.hidden=true,140);}
  function hideUndo(){undoToast.hidden=true;if(undoTimer)window.clearTimeout(undoTimer);undoTimer=null;clearedSnapshot=[];}
  function confirmClear(){
    clearedSnapshot=window.MapPreviewDrawing?.snapshot?.()||[];
    const cleared=clearedSnapshot.length;window.MapPreviewDrawing?.clear();setActive('');annotationCount=0;updateAnnotationState();hideClearConfirm();
    $('#mapClearedAnnotationCount').textContent=cleared;undoToast.hidden=false;
    if(undoTimer)window.clearTimeout(undoTimer);undoTimer=window.setTimeout(hideUndo,6000);
  }
  function undoClear(){
    window.MapPreviewDrawing?.restore?.(clearedSnapshot);annotationCount=clearedSnapshot.length;updateAnnotationState();hideUndo();toast(`已恢复 ${annotationCount} 个标注`);
  }

  drawerToggles.forEach(toggle=>toggle.addEventListener('click',()=>toggleDrawer(toggle.dataset.mapDrawerToggle)));
  actions.forEach(action=>action.addEventListener('click',()=>{
    if(action.disabled||action.getAttribute('aria-disabled')==='true')return;
    const tool=action.dataset.tool;
    if(tool==='load-local')return;
    if(tool==='layer-manager'){return;} // 由 data-map-drawer-toggle 抽屉机制接管
    if(tool==='zoom-in'||tool==='zoom-out'){
      if(typeof map!=='undefined'&&map)(tool==='zoom-in'?map.zoomIn():map.zoomOut());pulse(action);return;
    }
    if(tool==='fit-data'){
      if(typeof map!=='undefined'&&map)map.setView([23.132,113.268],12);pulse(action);toast('已定位到全部数据范围');return;
    }
    if(tool==='query-feature'){
      if(activeTool===tool){setActive('');toast('已退出属性查询');}else{window.MapPreviewDrawing?.stop();setActive(tool);toast('属性查询已开启：请点选地图要素');}return;
    }
    if(tool==='measure-distance'){startDrawing('measure',tool,'距离测量已开启：请在地图中依次点击两个点');return;}
    if(tool==='measure-area'){startDrawing('measure-area',tool,'面积测量已开启：绘制范围后双击结束');return;}
    if(tool==='annotation-point'){startDrawing('point',tool,'点标注已开启：请点击地图位置');return;}
    if(tool==='annotation-line'){startDrawing('line',tool,'线标注已开启：连续点击，双击结束');return;}
    if(tool==='annotation-polygon'){startDrawing('polygon',tool,'面标注已开启：连续点击，双击结束');return;}
    if(tool==='annotation-text'){startDrawing('text',tool,'文字标注已开启：点击地图放置文字');return;}
    if(tool==='annotation-edit'){setActive(tool);toast('标注编辑已开启：请选择地图标注');return;}
    if(tool==='annotation-delete-selected'){
      if(window.MapPreviewDrawing?.removeLast?.()){annotationCount-=1;updateAnnotationState();toast('已删除选中标注');}return;
    }
    if(tool==='annotation-clear-all'){showClearConfirm();}
  }));

  document.querySelectorAll('[data-clear-action]').forEach(button=>button.addEventListener('click',()=>{
    const action=button.dataset.clearAction;if(action==='cancel')hideClearConfirm();if(action==='confirm')confirmClear();if(action==='undo')undoClear();
  }));
  clearConfirm.addEventListener('click',event=>{if(event.target===clearConfirm)hideClearConfirm();});

  // ============ 显示管理抽屉（图层管理器 / 图例管理器 独立开关） ============
  // 交互与样式完全复用标注工具抽屉：data-map-drawer="layer-manager" + map-tool-drawer-wrap 结构
  const lmmLayers=$('#lmmToggleLayers'),lmmLegend=$('#lmmToggleLegend');
  // 抽屉打开时，从 MapLayers 读取当前状态回填两个开关
  function syncLayerManagerSwitches(){
    if(!lmmLayers||!lmmLegend)return;
    lmmLayers.checked=Boolean(window.MapLayers?.isOpen?.());
    lmmLegend.checked=Boolean(window.MapLayers?.isLegendVisible?.());
  }
  // 开关切换 → 即时更新对应管理器可见状态
  lmmLayers.addEventListener('change',()=>{
    if(lmmLayers.checked)window.MapLayers?.openPanel();
    else window.MapLayers?.closePanel();
  });
  lmmLegend.addEventListener('change',()=>{
    window.MapLayers?.setLegendVisible?.(lmmLegend.checked);
  });

  // ============ 抽屉动态内容 API（data-map-drawer 实例标识 + 自定义内容注入） ============
  // setContent(name, html)：向指定抽屉的内容容器注入任意内容
  function setDrawerContent(name,html){
    const drawer=document.querySelector(`[data-map-drawer="${name}"]`);if(!drawer)return false;
    let content=drawer.querySelector('[data-drawer-content]');
    if(!content){content=document.createElement('div');content.className='map-tool-drawer-content';content.dataset.drawerContent='';drawer.appendChild(content);}
    content.innerHTML=html||'';return true;
  }
  // registerOnOpen(name, fn)：抽屉每次打开时触发（动态渲染 / 状态刷新）
  function registerDrawerOnOpen(name,fn){
    const drawer=document.querySelector(`[data-map-drawer="${name}"]`);if(!drawer)return false;
    drawer._onOpen=typeof fn==='function'?fn:null;return true;
  }
  // 供外部调用：open/close/isOpen/setContent/registerOnOpen
  window.MapToolDrawer={
    open:(name)=>{toggleDrawer(name);return window.MapToolDrawer.isOpen(name);},
    close:(name)=>{if(activeDrawer===name)closeDrawers();return !window.MapToolDrawer.isOpen(name);},
    closeAll:closeDrawers,
    isOpen:(name)=>activeDrawer===name,
    setContent:setDrawerContent,
    registerOnOpen:registerDrawerOnOpen
  };
  // 显示管理抽屉打开时回填开关状态
  registerDrawerOnOpen('layer-manager',syncLayerManagerSwitches);

  document.addEventListener('gis:workspace-ready',()=>setEnabled('load-local',true,'加载本地空间文件'));
  document.addEventListener('gis:layers-loaded',()=>{
    updateDataState();window.MapLayers?.openPanel();
    if(activeDrawer==='layer-manager')syncLayerManagerSwitches(); // 抽屉打开时同步开关状态
  });
  document.addEventListener('map:annotation-created',()=>{annotationCount+=1;updateAnnotationState();setActive('');});
  document.addEventListener('map:layer-panel-change',event=>{
    // 面板开合不再直接驱动按钮状态，仅在显示管理抽屉打开时回填开关
    if(activeDrawer==='layer-manager')syncLayerManagerSwitches();
  });
  document.addEventListener('map:legend-change',event=>{
    // 图例显隐变化（抽屉开关 / 图例关闭按钮）→ 同步抽屉内图例开关
    if(activeDrawer==='layer-manager')syncLayerManagerSwitches();
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(!clearConfirm.hidden){hideClearConfirm();return;}
    if(activeTool){window.MapPreviewDrawing?.stop();setActive('');return;}
    closeDrawers();
  });
  toolbar?.addEventListener('keydown',event=>{
    const buttons=[...toolbar.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement);if(index<0)return;
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();buttons[(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();
    }
  });
  updateDataState();updateAnnotationState();
})();

// ============ 对话 ============
const chatBody=$('#chatBody'); const sendBtn=$('#sendBtn'); const stopBtn=$('#stopBtn');
let typingEl=null, stopped=false;
// ============ 气泡元信息（消耗时间 / 消耗 Token） ============
// 说明：本原型无真实后端 usage 字段，故「消耗时间」用 performance.now 真实测量「发起请求→收到响应」耗时，
// 「Token」依据文本长度估算（中文字符≈1 token，其余≈4 字符/token）。接入真实 API 时仅需把 estimateTokens
// 替换为响应 usage 字段（如 data.usage.total_tokens），并把 elapsedSinceRequest 替换为服务端耗时即可。
let reqStartTime = 0;
function estimateTokens(text){
  if(!text) return 0;
  const s = String(text).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const cjk = (s.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) || []).length;
  const other = s.length - cjk;
  return Math.max(1, Math.round(cjk + other / 4));
}
function beginRequest(){ reqStartTime = performance.now(); }
function elapsedSinceRequest(){ return Math.max(0, Math.round(performance.now() - reqStartTime)); }
function formatTime(ms){ return ms < 1000 ? (ms + 'ms') : ((ms / 1000).toFixed(2) + 's'); }
function attachBubbleMeta(bubble, meta){
  if(!bubble || bubble.querySelector('.bubble-meta')) return;
  const el = document.createElement('div');
  el.className = 'bubble-meta';
  el.innerHTML = '<span>⏱ ' + formatTime(meta.timeMs) + '</span><span>' + meta.tokens + ' tokens</span>';
  bubble.appendChild(el);
}
function addBubble(role,text){
  const d=document.createElement('div'); d.className='bubble '+role;
  d.innerHTML=`<div class="av">${role==='ai'?'AI':'我'}</div><div class="txt">${text}</div>`;
  chatBody.appendChild(d); chatBody.scrollTop=chatBody.scrollHeight;
  // role 为 ai 时，把当前智能体名称一并记录，便于导出时标注发送者
  const agent = role==='ai' && typeof currentAgent!=='undefined' && currentAgent ? currentAgent.name : null;
  if(window.ConversationManager) window.ConversationManager.recordMessage(role, text, agent);
  // 元信息：仅 AI 回复显示「消耗时间 + Token」；用户消息只标记本轮请求开始，不显示元信息
  if(role==='ai'){
    attachBubbleMeta(d, { timeMs: elapsedSinceRequest(), tokens: estimateTokens(text) });
  } else {
    beginRequest();
  }
  return d;
}
function isGISDemoRequest(q){
  return q.includes('福田') && q.includes('5000') && q.includes('商业用地');
}
function isStatisticsRequest(q){
  // 统计类请求：统计 + 设施/个数/数量，或 设施 + 统计/数量
  return /统计.*(设施|个数|数量)|(设施|要素).*(统计|数量)/.test(q);
}
function isDocumentGenerationRequest(q){
  return /(生成|起草|撰写|写一份|帮我写)/.test(q) && /(通知|请示|通报|函|报告|纪要|批复|公文)/.test(q);
}
function appendDocumentProgress(){
  const bubble=document.createElement('div');bubble.className='bubble ai document-progress-message';
  bubble.innerHTML='<div class="av">AI</div><div class="txt"><div class="document-progress"><b>正在生成公文……</b><span data-document-step="0">◌ 分析公文类型</span><span data-document-step="1">○ 组织正文结构</span><span data-document-step="2">○ 校正文种格式与语体</span></div></div>';
  chatBody.appendChild(bubble);chatBody.scrollTop=chatBody.scrollHeight;return bubble;
}
function addDocumentResultMessage(artifact){
  const bubble=document.createElement('div');bubble.className='bubble ai';
  bubble.innerHTML='<div class="av">AI</div><div class="txt">公文已生成，并已在内容工作区打开。<div class="document-result-card"><div class="document-result-card-main"><span class="document-result-card-icon">W</span><span class="document-result-card-info"><b></b><small>工作通知 · 约 860 字 · Word 文档</small></span></div><button type="button">打开文档</button></div></div>';
  bubble.querySelector('.document-result-card-info b').textContent=artifact.fileName;bubble.querySelector('button').addEventListener('click',()=>window.DocumentArtifactViewer?.openDocument(artifact));chatBody.appendChild(bubble);chatBody.scrollTop=chatBody.scrollHeight;
  attachBubbleMeta(bubble, { timeMs: elapsedSinceRequest(), tokens: estimateTokens(bubble.textContent) });
}
function runDocumentGeneration(q){
  stopped=false;stopBtn.style.display='inline-block';sendBtn.style.display='none';const progress=appendDocumentProgress();let step=0;
  const advance=()=>{
    if(stopped){progress.remove();stopBtn.style.display='none';sendBtn.style.display='inline-block';return;}
    progress.querySelectorAll('[data-document-step]').forEach((item,index)=>{item.classList.toggle('done',index<=step);item.textContent=(index<=step?'✓ ':index===step+1?'◌ ':'○ ')+['分析公文类型','组织正文结构','校正文种格式与语体'][index];});step++;
    if(step<3){setTimeout(advance,380);return;}
    setTimeout(()=>{if(stopped){progress.remove();stopBtn.style.display='none';sendBtn.style.display='inline-block';return;}const artifact=window.DocumentArtifactViewer?.generateDocument(q);if(artifact)addDocumentResultMessage(artifact);stopBtn.style.display='none';sendBtn.style.display='inline-block';},320);
  };setTimeout(advance,320);
}
function runDocumentRevision(q){
  stopped=false;stopBtn.style.display='inline-block';sendBtn.style.display='none';const waiting=addBubble('ai','正在根据建议修改选中文段……');waiting.classList.add('typing');
  const started=window.DocumentArtifactViewer?.applySuggestion(q,success=>{waiting.remove();addBubble('ai',success?'已根据建议完成修改，并保持了全文的公文语体和格式。':'未能定位选中的文段，请重新选择后再试。');stopBtn.style.display='none';sendBtn.style.display='inline-block';});
  if(!started){waiting.remove();addBubble('ai','请先在文档中选择需要修改的文段或文字。');stopBtn.style.display='none';sendBtn.style.display='inline-block';}
}
function appendGISStatus(){
  const bubble=document.createElement('div');bubble.className='bubble ai gis-progress-message';
  bubble.innerHTML='<div class="av">AI</div><div class="txt"><div class="gis-status"><div class="gis-status-title">正在分析空间数据……</div><div class="gis-status-step running" data-gis-step="0"><span class="step-mark">◌</span>属性筛选</div><div class="gis-status-step" data-gis-step="1"><span class="step-mark">○</span>空间分析</div><div class="gis-status-step" data-gis-step="2"><span class="step-mark">○</span>生成矢量图层</div></div></div>';
  chatBody.appendChild(bubble);chatBody.scrollTop=chatBody.scrollHeight;return bubble;
}
function completeGISStep(bubble,index){
  bubble.querySelectorAll('.gis-status-step').forEach((step,i)=>{
    step.classList.toggle('done',i<=index);step.classList.toggle('running',i===index+1);
    step.querySelector('.step-mark').textContent=i<=index?'✓':i===index+1?'◌':'○';
  });
}
function addGISResultMessage(){
  const bubble=document.createElement('div');bubble.className='bubble ai';
  bubble.innerHTML='<div class="av">AI</div><div class="txt">已完成筛选，共找到 37 个商业用地地块。<div class="gis-result-layer-note"><strong>图层说明：</strong>筛选结果已作为独立的“商业用地筛选结果”图层自动加载到图层管理器，并已设为当前选中图层。现在可直接在该图层上进行编辑；退出编辑后仍可在图层管理面板中统一进行可见性切换、排序、透明度调整和删除。</div><div class="gis-result-card"><div class="gis-result-card-main"><div class="gis-result-card-title">商业用地筛选结果</div><div class="gis-result-card-meta"><span>37 个要素</span><span>Polygon</span><span>已加载到图层管理</span><span>当前正在编辑</span></div></div><button type="button" data-gis-result-action="locate">定位到当前编辑图层</button></div></div>';
  chatBody.appendChild(bubble);chatBody.scrollTop=chatBody.scrollHeight;
  bubble.querySelector('[data-gis-result-action="locate"]').addEventListener('click',()=>window.MapResultInteraction?.locateResults());
  attachBubbleMeta(bubble, { timeMs: elapsedSinceRequest(), tokens: estimateTokens(bubble.textContent) });
}
function runGISDemo(){
  stopped=false;stopBtn.style.display='inline-block';sendBtn.style.display='none';
  const status=appendGISStatus();let step=0;
  const advance=()=>{
    if(stopped){status.remove();stopBtn.style.display='none';sendBtn.style.display='inline-block';return;}
    completeGISStep(status,step);step++;
    if(step<3){setTimeout(advance,420);return;}
    setTimeout(()=>{
      if(stopped){status.remove();stopBtn.style.display='none';sendBtn.style.display='inline-block';return;}
      window.MapResultInteraction?.showResults();addGISResultMessage();
      stopBtn.style.display='none';sendBtn.style.display='inline-block';
    },360);
  };
  setTimeout(advance,380);
}
// ============ 统计请求（统计成都市不同类型设施的个数） ============
function appendStatisticsStatus(){
  const bubble=document.createElement('div');bubble.className='bubble ai stats-progress-message';
  bubble.innerHTML='<div class="av">AI</div><div class="txt"><div class="stats-status"><div class="stats-status-title">正在查询空间数据……</div><div class="stats-status-step running" data-stats-step="0"><span class="step-mark">◌</span>连接空间数据库</div><div class="stats-status-step" data-stats-step="1"><span class="step-mark">○</span>分类统计设施要素</div><div class="stats-status-step" data-stats-step="2"><span class="step-mark">○</span>生成统计结果</div></div></div>';
  chatBody.appendChild(bubble);chatBody.scrollTop=chatBody.scrollHeight;return bubble;
}
function completeStatsStep(bubble,index){
  bubble.querySelectorAll('.stats-status-step').forEach((step,i)=>{
    step.classList.toggle('done',i<=index);step.classList.toggle('running',i===index+1);
    step.querySelector('.step-mark').textContent=i<=index?'✓':i===index+1?'◌':'○';
  });
}
function addStatisticsResultMessage(){
  const bubble=document.createElement('div');bubble.className='bubble ai';
  bubble.innerHTML='<div class="av">AI</div><div class="txt"></div>';
  chatBody.appendChild(bubble);chatBody.scrollTop=chatBody.scrollHeight;
  if(window.StatisticsRenderer){
    // 完整统计结果卡片（引言 / 可折叠表格 / 数据来源 / 三个操作按钮 / 图表区）
    window.StatisticsRenderer.renderResult(bubble.querySelector('.txt'));
  }else{
    bubble.querySelector('.txt').textContent='已完成成都市设施分类统计（渲染组件未加载）。';
  }
  attachBubbleMeta(bubble, { timeMs: elapsedSinceRequest(), tokens: estimateTokens(bubble.textContent) });
}
function runStatistics(){
  stopped=false;stopBtn.style.display='inline-block';sendBtn.style.display='none';
  const status=appendStatisticsStatus();let step=0;
  const advance=()=>{
    if(stopped){status.remove();stopBtn.style.display='none';sendBtn.style.display='inline-block';return;}
    completeStatsStep(status,step);step++;
    if(step<3){setTimeout(advance,430);return;}
    setTimeout(()=>{
      if(stopped){status.remove();stopBtn.style.display='none';sendBtn.style.display='inline-block';return;}
      addStatisticsResultMessage();
      stopBtn.style.display='none';sendBtn.style.display='inline-block';
    },380);
  };
  setTimeout(advance,400);
}

// ============ 制图请求（现状用地图 / 规划图等） ============
function isCartographyRequest(q){
  return /(现状用地图|规划用地图|三线|制图|生成.*图).*(PNG|矢量|成果)/.test(q)
    || /基于当前图层.*(生成|绘制|输出)/.test(q)
    || /请.*生成.*图/.test(q);
}
function appendCartoStatus(){
  const bubble=document.createElement('div');bubble.className='bubble ai carto-progress-message';
  bubble.innerHTML='<div class="av">AI</div><div class="txt"><div class="carto-status"><div class="carto-status-title">正在生成《现状用地图》……</div><div class="carto-status-step running" data-carto-step="0"><span class="step-mark">◌</span>识别当前图层与用地类型</div><div class="carto-status-step" data-carto-step="1"><span class="step-mark">○</span>分类统计各地类面积与占比</div><div class="carto-status-step" data-carto-step="2"><span class="step-mark">○</span>生成《现状用地图》成果</div></div></div>';
  chatBody.appendChild(bubble);chatBody.scrollTop=chatBody.scrollHeight;return bubble;
}
function completeCartoStep(bubble,index){
  bubble.querySelectorAll('.carto-status-step').forEach((step,i)=>{
    step.classList.toggle('done',i<=index);step.classList.toggle('running',i===index+1);
    step.querySelector('.step-mark').textContent=i<=index?'✓':i===index+1?'◌':'○';
  });
}
/** 构建统计摘要表格 HTML */
function buildCartoStatsHTML(mapData){
  if(!mapData?.categories) return '';
  let rows=mapData.categories.map(c=>
    `<tr><td><span class="carto-stats-color-swatch" style="background:${c.color};border-color:${c.strokeColor}"></span>${c.name}</td>`+
    `<td>${c.area.toFixed(1)} ${mapData.unit}</td>`+
    `<td>${(c.ratio*100).toFixed(1)}%</td>`+
    `<td>${c.featureCount} 个</td></tr>`
  ).join('');
  return `<table class="carto-stats-table"><thead><tr><th>用地类型</th><th>面积</th><th>占比</th><th>地块数</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function addCartographyResultMessage(mapData){
  const bubble=document.createElement('div');bubble.className='bubble ai';
  const statsHTML=buildCartoStatsHTML(mapData);
  bubble.innerHTML=`<div class="av">AI</div><div class="txt">
    已完成《${mapData.name||'现状用地图'}》的生成，共 ${mapData.features?.length||0} 个地块，总面积 ${mapData.totalArea?.toFixed(1)||'-'} ${mapData.unit||'公顷'}。
    <div class="carto-layer-note"><strong>图层说明：</strong>已将结果作为独立新图层加载至地图并默认选中，可在图层管理中统一操作。当前已进入<strong>制图编辑模式</strong>——您可先在地图上选择、标注或手动编辑，完成后点击地图工具栏的<strong>「确认」</strong>按钮，我将引导您指定制图模板。</div>
    ${statsHTML}
    <div class="carto-result-card"><div class="carto-result-card-main"><span class="carto-result-card-icon">🗺️</span><span class="carto-result-card-info"><b>${mapData.name||'现状用地图'}</b><small>${mapData.features?.length||0} 个要素 · Polygon · 可编辑</small></span></div><div class="carto-result-actions"><button type="button" data-carto-action="locate">定位到图层</button></div></div></div>`;
  chatBody.appendChild(bubble);chatBody.scrollTop=chatBody.scrollHeight;
  // 绑定卡片按钮事件（模板/导出环节统一由「确认」按钮引导）
  bubble.querySelector('[data-carto-action="locate"]')?.addEventListener('click',()=>window.MapResultInteraction?.locateResults?.());
  attachBubbleMeta(bubble, { timeMs: elapsedSinceRequest(), tokens: estimateTokens(bubble.textContent) });
}
function runCartography(){
  stopped=false;stopBtn.style.display='inline-block';sendBtn.style.display='none';
  templateSourcePending=false;  // 新请求重置模板来源等待状态
  cartographyReady=false;       // 新请求重置导出就绪状态
  const status=appendCartoStatus();let step=0;
  // 获取来源图层（优先从工作空间取 landuse 图层）
  const sourceLayer=(window.GISWorkspace?.getVectorLayers?.()||[]).find(l=>l.id==='landuse')||null;
  const advance=()=>{
    if(stopped){status.remove();stopBtn.style.display='none';sendBtn.style.display='inline-block';return;}
    completeCartoStep(status,step);step++;
    if(step<3){setTimeout(advance,450);return;}
    setTimeout(()=>{
      if(stopped){status.remove();stopBtn.style.display='none';sendBtn.style.display='inline-block';return;}
      // 1. 生成数据
      const mapData=window.Cartography?.generateLandUseMap(sourceLayer);
      if(!mapData){status.remove();addBubble('ai','制图数据生成失败（模块未加载）。');stopBtn.style.display='none';sendBtn.style.display='inline-block';return;}
      // 2. 注册为动态图层（面要素）
      const layerConfig={
        id:mapData.id,name:mapData.name,fileName:mapData.id+'.geojson',
        type:'制图成果',geometryType:'面',
        legend:`${mapData.categories.length} 类用地 · 总面积 ${mapData.totalArea.toFixed(1)} ${mapData.unit}`,
        color:'#10B981',
        editorFeatures:mapData.features,
        featureCount:mapData.features.length
      };
      window.MapLayers?.registerDynamicLayer(layerConfig);
      // 2.1 图层管理器默认选中该新图层（高亮 + 图例联动）
      window.MapLayers?.selectLayer?.(mapData.id);
      // 3. 更新模板图例
      window.Cartography?.updateTemplateLegend(mapData);
      // 4. 进入制图编辑模式
      window.MapResultInteraction?.enterCartographyEdit(mapData);
      // 5. 发送结果消息（提示用户编辑确认后进入模板环节）
      addCartographyResultMessage(mapData);
      // 6. 不自动询问模板：等待用户在地图上确认后（「确认」按钮）再引导模板来源
      stopBtn.style.display='none';sendBtn.style.display='inline-block';
    },380);
  };
  setTimeout(advance,420);
}

// ============ 模板来源选择（暂停等待交互） ============
// 状态：等待用户选择模板来源时置 true，防止重复触发
let templateSourcePending=false;
/**
 * 在对话中渲染「模板来源选择」卡片，暂停流程等待用户选择
 * @param {Object} mapData 当前用地图数据
 */
function promptTemplateSource(mapData){
  if(templateSourcePending)return;
  templateSourcePending=true;
  const bubble=document.createElement('div');bubble.className='bubble ai carto-source-message';
  bubble.innerHTML=`<div class="av">AI</div><div class="txt">
    <div class="carto-template-prompt">
      <div class="carto-prompt-title">🖼️ 请指定制图模板</div>
      <div class="carto-prompt-desc">《${mapData.name||'现状用地图'}》已生成并进入制图模式。套用模板前，请先选择模板来源：</div>
      <div class="carto-source-options">
        <button type="button" class="carto-source-option" data-carto-source="upload">
          <span class="carto-source-icon">📁</span>
          <span class="carto-source-text"><b>上传本地文件 / 指定路径</b><small>使用您本地的模板文件作为参考</small></span>
          <span class="carto-source-arrow">›</span>
        </button>
        <button type="button" class="carto-source-option" data-carto-source="library">
          <span class="carto-source-icon">📚</span>
          <span class="carto-source-text"><b>从官方模板库选择</b><small>浏览 / 搜索官方资源库中的制图模板</small></span>
          <span class="carto-source-arrow">›</span>
        </button>
      </div>
      <div class="carto-prompt-hint">您也可以直接在输入框回复「上传模板」或「模板库」快速指定。</div>
    </div></div>`;
  chatBody.appendChild(bubble);chatBody.scrollTop=chatBody.scrollHeight;

  // 绑定来源选项点击
  bubble.querySelector('[data-carto-source="upload"]').addEventListener('click',()=>{
    window.Cartography?.showUploadPanel?.();
  });
  bubble.querySelector('[data-carto-source="library"]').addEventListener('click',()=>{
    window.Cartography?.showTemplateLibrary?.();
  });
  return bubble;
}

/**
 * 模板添加成功后的确认与流程继续
 * @param {Object} template 已添加的模板（含 name/source/sourceType）
 */
function confirmTemplateAdded(template){
  if(!template)return;
  const mapData=window.Cartography?.getState?.().currentMap;
  const sourceLabel=template.sourceType==='upload'
    ? `本地文件「${template.name}」`
    : `官方模板库「${template.name}」`;
  // 确认消息
  addBubble('ai',`✓ 已添加模板${sourceLabel}，正在将其应用到《${mapData?.name||'现状用地图'}》图层……`);
  // 渲染模板到地图
  setTimeout(()=>{
    if(template.sourceType==='library'){
      window.Cartography?.renderTemplate(template, mapData);
      window.Cartography?.updateTemplateLegend(mapData);
      addBubble('ai',`模板「${template.name}」已应用到地图，可在图中预览效果。如需调整位置，可在图层上直接编辑。当前成果已就绪，如需导出 PNG 或矢量文件，回复「导出」即可。`);
    }else{
      // 本地上传模板：无内置 elements，渲染简化图框占位
      const simpleTpl={
        id:template.id,name:template.name,desc:template.desc,thumbnail:'📁',
        elements:[
          { type:'frame',x:10,y:10,width:980,height:680 },
          { type:'title',x:500,y:668,text:'{mapTitle}',align:'center' },
          { type:'legend',x:900,y:30,width:85,height:180 },
          { type:'northArrow',x:940,y:240,size:30 },
        ]
      };
      window.Cartography?.renderTemplate(simpleTpl, mapData);
      window.Cartography?.updateTemplateLegend(mapData);
      addBubble('ai',`本地模板「${template.name}」已加载并应用（已解析为简化图框，完整版式在正式版中支持）。可在图中预览并调整。当前成果已就绪，如需导出 PNG 或矢量文件，回复「导出」即可。`);
    }
    templateSourcePending=false;
    cartographyReady=true;   // 制图成果就绪：支持对话导出指令
    // 模板已应用：右上角主按钮由「确认」切换为「导出」
    window.MapResultInteraction?.setCartoPrimaryButton?.('export');
    addBubble('ai','模板已应用，右上角按钮已变为「导出」。点击即可导出 PNG 图片或可编辑矢量成果。');
  },600);
}
// 注册模板添加回调：模板面板确认添加 → 本函数继续制图流程
if(window.Cartography?.setTemplateAddedHandler){
  window.Cartography.setTemplateAddedHandler(confirmTemplateAdded);
}

// 制图成果就绪状态（模板应用后可对话导出）
let cartographyReady=false;

// ============ 模板元素点选 → 智能体修改 ============
// 选中提示统一由「选择元素栏」（map-selection-actions）展示，不再以 AI 回复提示。
// 监听模板元素拖拽移动：对话确认已移动
document.addEventListener('carto:template-element-moved', event=>{
  const {label}=event.detail||{};
  if(!label)return;
  addBubble('ai',`已将【${label}】移动到新位置。可继续拖拽或描述其他修改；满意后回复「导出」即可导出图片。`);
});

// 颜色映射 + 位置映射（1000×700 画布坐标系）
const TEMPLATE_COLOR_MAP={红:'#DC2626',蓝:'#2563EB',绿:'#16A34A',黑:'#111827',白:'#FFFFFF',橙:'#F59E0B',紫:'#7C3AED',灰:'#6B7280',黄:'#FACC15',金:'#D97706'};
const TEMPLATE_POS_MAP={
  '左上角':{x:30,y:40},'右上角':{x:930,y:40},'左下角':{x:30,y:640},'右下角':{x:930,y:640},
  '左上':{x:30,y:40},'右上':{x:930,y:40},'左下':{x:30,y:640},'右下':{x:930,y:640},
  '顶部':{y:40},'上方':{y:40},'底部':{y:640},'下方':{y:640},
  '左侧':{x:30},'右侧':{x:930},'中间':{x:500,y:350},'中心':{x:500,y:350},
};
/**
 * 解析针对选中模板元素的修改指令
 * @param {Object} sel { idx, type, label, element }
 * @param {string} q 用户输入
 * @returns {{changes:Object,description:string}|null}
 */
function applyTemplateEditCommand(sel,q){
  const type=sel.type,el=sel.element||{},changes={};
  let desc=[];
  // 1. 位置移动
  for(const key of Object.keys(TEMPLATE_POS_MAP)){
    if(q.includes(key)){Object.assign(changes,TEMPLATE_POS_MAP[key]);desc.push('移动至'+key);break;}
  }
  // 2. 文字内容（标题 / 文字注记）
  if(type==='title'||type==='textBlock'){
    const quoted=q.match(/[“"『「]([^"”』」]{1,30})[”"』」]/);
    if(quoted&&!/图框|指北针|图例|比例尺|移到/.test(quoted[1])){changes.text=quoted[1];desc.push(`文字改为「${quoted[1]}」`);}
  }
  // 3. 字号
  if(/放大|大一点|大些|加大/.test(q)){changes.fontSize=(el.fontSize||12)+4;desc.push('字号加大');}
  else if(/缩小|小一点|小些|减小/.test(q)){changes.fontSize=Math.max(8,(el.fontSize||12)-4);desc.push('字号缩小');}
  // 4. 颜色（按元素类型）
  for(const c of Object.keys(TEMPLATE_COLOR_MAP)){
    if(q.includes(c+'色')||q.includes('改成'+c)||q.includes('变'+c)){
      if(type==='title'||type==='textBlock'){changes.fill=TEMPLATE_COLOR_MAP[c];desc.push('颜色改为'+c+'色');}
      else if(type==='frame'||type==='innerFrame'){changes.stroke=TEMPLATE_COLOR_MAP[c];desc.push('边框改为'+c+'色');}
      else if(type==='northArrow'){changes.fill=TEMPLATE_COLOR_MAP[c];desc.push('指北针改为'+c+'色');}
      break;
    }
  }
  // 5. 加粗（文字类）
  if(/加粗|粗一点/.test(q)&&(type==='title'||type==='textBlock')){changes.bold=true;desc.push('已加粗');}
  // 6. 比例尺加长 / 缩短
  if(type==='scaleBar'){
    if(/加长|更长|长一点/.test(q)){changes.width=(el.width||100)+40;desc.push('比例尺加长');}
    else if(/缩短|更短|短一点/.test(q)){changes.width=Math.max(60,(el.width||100)-40);desc.push('比例尺缩短');}
  }
  // 7. 指北针大小
  if(type==='northArrow'){
    if(/大一点|放大|加大/.test(q)&&!desc.length){changes.size=(el.size||24)+8;desc.push('指北针加大');}
    else if(/小一点|缩小/.test(q)&&!desc.length){changes.size=Math.max(14,(el.size||24)-8);desc.push('指北针缩小');}
  }
  if(!Object.keys(changes).length)return null;
  return {changes,description:desc.join('、')};
}

function aiReply(q){
  // 模板元素修改：优先取地图上选中的模板要素，其次取「询问AI」加入上下文的模板要素
  let tplSel=window.Cartography?.getSelectedTemplateElement?.();
  const tplCtx=window.workspaceState?.selectedContext;
  if(!tplSel&&tplCtx?.type==='template-element'){
    tplSel={idx:tplCtx.templateIdx,type:tplCtx.elementType,label:tplCtx.label,element:tplCtx.element||{}};
  }
  if(tplSel){
    const result=applyTemplateEditCommand(tplSel,q);
    if(result){
      window.Cartography?.updateTemplateElement?.(tplSel.idx,result.changes);
      addBubble('ai',`已修改【${tplSel.label}】：${result.description}。可在图中预览效果，继续点选元素或描述修改；满意后回复「导出」即可导出图片。`);
      return;
    }
    if(/修改|调整|改|移动|设置|换/.test(q)){
      addBubble('ai',`暂未理解针对【${tplSel.label}】的修改指令。可尝试：改变标题文字（"把标题改为《xxx》"）、移到某个角落（"指北针移到右上角"）、调整字号（"标题放大"）、更换颜色（"图框边框改成蓝色"）。`);
      return;
    }
  }
  // 制图成果就绪：回复「导出」打开导出面板（PNG / 矢量）
  if(cartographyReady&&/导出|下载|PNG/.test(q)){
    addBubble('ai','好的，为您打开成果导出面板（支持 PNG 图片与 GeoJSON 可编辑矢量两种格式）。');
    window.Cartography?.showExportPanel?.();
    return;
  }
  // 模板来源等待期间：支持直接回复文字快速指定来源
  if(templateSourcePending){
    if(/上传|本地|路径|文件/.test(q)){addBubble('ai','好的，为您打开本地模板上传面板。');window.Cartography?.showUploadPanel?.();return;}
    if(/模板库|官方/.test(q)){addBubble('ai','好的，为您打开官方模板库。');window.Cartography?.showTemplateLibrary?.();return;}
  }
  if(isDocumentGenerationRequest(q)){runDocumentGeneration(q);return;}
  if(isGISDemoRequest(q)){runGISDemo();return;}
  if(isStatisticsRequest(q)){runStatistics();return;}
  if(isCartographyRequest(q)){runCartography();return;}
  if(window.workspaceState?.selectedContext?.type==='document-text'){runDocumentRevision(q);return;}
  stopped=false; stopBtn.style.display='inline-block'; sendBtn.style.display='none';
  typingEl=document.createElement('div'); typingEl.className='bubble ai typing';
  typingEl.innerHTML=`<div class="av">AI</div><div class="txt"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
  chatBody.appendChild(typingEl); chatBody.scrollTop=chatBody.scrollHeight;
  setTimeout(()=>{
    if(stopped){ typingEl.remove(); stopBtn.style.display='none'; sendBtn.style.display='inline-block'; return; }
    const selectedContext=window.workspaceState?.selectedContext;
    const mapContext=selectedContext?.type==='map-features'?selectedContext:null;
    const graphicContext=/^map-graphic/.test(selectedContext?.type||'')?selectedContext:null;
    const reply = mapContext&&q.includes('重新分析')?'已根据选中区域重新执行空间分析，当前未发现新增遗漏地块（模拟）。'
      : graphicContext&&/重新分析|分析/.test(q)?'已根据地图标注范围重新分析，该区域包含 6 个待复核地块（模拟）。'
      : mapContext&&q.includes('导出')?`已整理选中的 ${mapContext.count} 个地块，已生成独立导出任务（模拟）。`
      : q.includes('合规')?'已圈选范围：该地块 82% 位于城镇开发边界内，叠加上传的"生态红线"图层后，西南角约 3.6 公顷触及缓冲带，建议调整布局或办理占补平衡。'
      : q.includes('面积')?'A 地块投影面积测算为 12.48 公顷（187.2 亩），周长 1.62 km。'
      : q.includes('图层')?'已叠加"生态红线""永久基本农田"图层，可在左侧图层管理调整透明度。'
      : q.includes('图')?'正在生成《用地用海规划图》，预计 8 秒后输出至资源库。'
      : '收到。我可以先在地图上圈选目标范围，再做进一步分析——你可以点工具栏的 ⭕ 圈选，或直接描述需求。';
    typingEl.remove();
    addBubble('ai',reply);
    stopBtn.style.display='none'; sendBtn.style.display='inline-block';
  },1400);
}
function send(){
  const v=$('#chatText').value.trim(); if(!v) return;
  const CM=window.ConversationManager;
  if(CM && !CM.getCurrentConversation()) CM.createConversation();
  const cur=CM && CM.getCurrentConversation();
  const isFirst=cur && cur.messageCount===0;
  const ref = chatFileRefName ? '📎 引用文件：'+chatFileRefName+'\n' : '';
  addBubble('user', ref+v); $('#chatText').value='';
  if(isFirst && CM) CM.renameConversation(cur.id, CM.generateConversationTitle(v));
  qcActiveLabel=null; renderQcTag(); renderQuickCommands();   // 发送后解绑快捷指令
  aiReply(v);
}
sendBtn.addEventListener('click',send);

// ============ 文件引用标签（知识库 / 预览弹窗「添加到对话」联动） ============
const CHAT_FILE_REF_KEY = 'zhidi.chatFileRef';   // 持久化：刷新 / 会话切换后仍有效
let chatFileRefName = '';   // 当前对话上下文引用的文件
function setChatFileRef(name){
  chatFileRefName = name || '';
  try{
    if(chatFileRefName) localStorage.setItem(CHAT_FILE_REF_KEY, chatFileRefName);
    else localStorage.removeItem(CHAT_FILE_REF_KEY);
  }catch(e){ /* localStorage 不可用时仅保留内存态 */ }
  const tag = $('#fileRefTag');
  if(!tag) return;
  if(chatFileRefName){
    tag.style.display = 'inline-flex';
    tag.querySelector('.qc-tag-name').textContent = '📎 '+chatFileRefName;
  } else {
    tag.style.display = 'none';
    tag.querySelector('.qc-tag-name').textContent = '';
  }
}
window.setChatFileRef = setChatFileRef;
$('#fileRefTag').querySelector('.qc-tag-x').addEventListener('click', ()=> setChatFileRef(''));
// 从 localStorage 恢复上次会话的文件引用（刷新后依然有效）
function restoreChatFileRef(){
  try{
    const saved = localStorage.getItem(CHAT_FILE_REF_KEY);
    if(saved) setChatFileRef(saved);
  }catch(e){}
}
window.restoreChatFileRef = restoreChatFileRef;
restoreChatFileRef();
function renderDocumentContextTag(){
  const context=window.workspaceState?.selectedContext,tag=$('#documentContextTag');
  if(!tag)return;if(context?.type==='document-text'){
    tag.hidden=false;$('#documentContextTitle').textContent=context.selectionMode==='paragraph'?'已引用选中文段':'已引用选中文字';$('#documentContextExcerpt').textContent='“'+context.text.replace(/\s+/g,' ').slice(0,54)+(context.text.length>54?'…':'')+'”';
  }else if(context?.type==='map-features'){
    tag.hidden=false;$('#documentContextTitle').textContent='已引用地图要素 · '+context.count+' 个';$('#documentContextExcerpt').textContent=context.layerName;
  }else if(/^map-graphic/.test(context?.type||'')){
    tag.hidden=false;$('#documentContextTitle').textContent='已引用地图标注区域';$('#documentContextExcerpt').textContent=context.label||context.graphicType||'图形标注';
  }else if(context?.type==='template-element'){
    // 模板要素引用：与文档/图块要素一致，以 document-context-tag 形式展示
    tag.hidden=false;$('#documentContextTitle').textContent=`已引用模板要素「${context.label}」`;$('#documentContextExcerpt').textContent='可输入修改指令（改文字 / 移位 / 换色 / 缩放），或直接拖动调整';
  }else{tag.hidden=true;$('#documentContextExcerpt').textContent='';}
}
document.addEventListener('workspace:context-change',renderDocumentContextTag);
$('#documentContextClose').addEventListener('click',()=>clearSelectedContext());
renderDocumentContextTag();
document.addEventListener('map:manual-edit-finished',event=>{
  addBubble('ai',`已完成手动修订，当前结果包含 ${event.detail.featureCount} 个地块和 ${event.detail.graphicCount} 个图形标注。`);
});
$('#chatText').addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } });
stopBtn.addEventListener('click',()=>{ stopped=true; });
$('#chNew').addEventListener('click',()=>{ if(window.ConversationManager) window.ConversationManager.createConversation(); });
chatBody.addEventListener('click',e=>{
  const q=e.target.closest('.quick .q');
  if(!q) return;
  addBubble('user',q.textContent);
  aiReply(q.textContent);
});

// ============ 对话区智能体信息栏 ============
// 当前对话智能体（对话区信息栏展示对象）
// 完整配置（提示词、可调度智能体等）由 agents.js 加载时与切换时补全
let currentAgent={id:'zhidi',name:'致地AI助手',icon:'🤖',cat:'平台默认',desc:'致地AI 默认空间智能体（Buddy），直接处理基础 GIS 任务，并可调度数据处理、数据查询、制图、统计分析四大专业智能体。',tools:3,kb:2};
$('#aibSwitchBtn').addEventListener('click',()=>{
  // 浮层打开时遮罩覆盖按钮，此处仅处理「打开」；再次点击按钮位置会命中遮罩 → 关闭（等效 toggle）
  if($('#asMask').classList.contains('show')) closeSwitchPopup();
  else openSwitchPopup();
});
$('#aibEditBtn').addEventListener('click',editCurrentAgent);
function editCurrentAgent(){
  openAgentEditPage();
}

// ============ 快捷指令填充（输入框上方） ============
// 三层映射数据：分类 → 子任务 → 提示词模板
const quickCommandData = {
  '制图': [
    { label:'现状用地图',   template:'请基于当前图层生成《现状用地图》，标注各地类面积与占比，输出 PNG 与可编辑矢量两份成果。' },
    { label:'规划用地图',   template:'请生成《规划用地图》，按国土空间规划分区配色，并叠加城镇开发边界与生态保护红线。' },
    { label:'三线划定图',   template:'请绘制永久基本农田、生态保护红线、城镇开发边界“三线”叠加图，标注冲突区域。' },
    { label:'遥感影像底图', template:'请调用最新遥感影像生成研究区影像底图，分辨率不低于 2 米，附获取时间说明。' },
  ],
  '公文': [
    { label:'规划请示', template:'请起草《关于××国土空间规划方案的请示》，说明编制依据、主要内容与提请审议事项。' },
    { label:'审查批复', template:'请生成《关于××规划的批复》，列明同意事项、约束性条件与执行要求。' },
    { label:'情况说明', template:'请撰写《关于××地块规划情况的说明》，附规划合规性与红线核对结论。' },
    { label:'会议纪要', template:'请整理规划评审会会议纪要，包含参会单位、主要意见与会议决议。' },
  ],
  '分析': [
    { label:'合规性分析',   template:'请对目标地块做规划合规性分析，核对开发边界、生态红线与永久基本农田，给出明确结论。' },
    { label:'用地适宜性',   template:'请开展用地适宜性评价，综合高程、坡度与生态敏感性给出分级与限制条件。' },
    { label:'规模测算',     template:'请测算规划建设用地规模，按人均指标校核是否符合上级下达上限要求。' },
  ],
  '报告': [
    { label:'现状调研报告', template:'请生成《现状调研报告》，包含区位、用地、交通、生态四个章节。' },
    { label:'规划文本',     template:'请编写规划文本，按总则、目标、用地布局、支撑系统四部分组织内容。' },
    { label:'专项论证',     template:'请撰写专项论证报告，聚焦交通影响评价或环境影响评价之一并展开。' },
  ],
};
let qcLevel='cat';        // 'cat' 全部分类列表；'sub' 某分类下的子任务
let qcActiveCat=null;     // 当前展开的分类（sub 视图下有效）
let qcActiveLabel=null;   // 当前已应用的子任务标签（单活跃模型）

// 两级递进渲染：cat 视图仅显示分类，sub 视图展开该分类的子任务
function renderQuickCommands(){
  if(qcLevel==='cat'){
    $('#qcCats').style.display='flex';
    $('#qcSub').style.display='none';
    renderQcCats();
  }else{
    $('#qcCats').style.display='none';
    $('#qcSub').style.display='block';
    renderQcSubView();
  }
}
function renderQcCats(){
  const wrap=$('#qcCats'); wrap.innerHTML='';
  Object.keys(quickCommandData).forEach(cat=>{
    const b=document.createElement('button');
    b.className='qc-cat'; b.type='button'; b.textContent=cat;   // 仅显示分类名称
    b.onclick=()=>{ qcLevel='sub'; qcActiveCat=cat; renderQuickCommands(); };   // 点击分类 → 展开下一级
    wrap.appendChild(b);
  });
}
function renderQcSubView(){
  const head=$('#qcSubHead');
  head.style.display='none';   // 去掉返回按钮，子任务视图只呈现子任务标签
  head.innerHTML='';
  const wrap=$('#qcSubtasks'); wrap.innerHTML='';
  quickCommandData[qcActiveCat].forEach(st=>{
    const b=document.createElement('button');
    b.className='qc-sub'+(st.label===qcActiveLabel?' active':'');
    b.type='button'; b.textContent=st.label;
    b.onclick=()=>applyQuickCommand(st.label);
    wrap.appendChild(b);
  });
}
function applyQuickCommand(label){
  const st=quickCommandData[qcActiveCat].find(x=>x.label===label);
  if(!st) return;
  if(qcActiveLabel===label){ clearQuickTag(); return; }   // 再次点击同一子任务 → 取消
  qcActiveLabel=label;
  $('#chatText').value=st.template;          // 动作B：填充对应提示词模板
  qcLevel='cat';                             // 选中任一子任务后自动返回分类列表
  renderQcTag(); renderQuickCommands();
}
function renderQcTag(){
  const tag=$('#qcTag');
  if(qcActiveLabel){
    tag.style.display='inline-flex';
    tag.querySelector('.qc-tag-name').textContent='@'+qcActiveLabel;   // 动作A：@标签名
  }else{
    tag.style.display='none';
  }
}
// 移除 Tag：因 Tag 与模板为一对一绑定，移除时同步清空 textarea（逻辑明确、可预测）
function clearQuickTag(){
  qcActiveLabel=null;
  $('#chatText').value='';
  renderQcTag(); renderQuickCommands();
}
$('#qcTagX').addEventListener('click',clearQuickTag);
renderQuickCommands(); renderQcTag();

// ============ 切换智能体弹窗（双模块独立无限滚动） ============
const SWITCH_PAGE = 6;
// 弹窗专用数据源（与智能体中心相互独立）
// 延迟构建：需等待 agents.js（四大专业智能体真实配置）加载完成
const switchData = { mine:null, square:null };
function getSwitchData(module){
  if(!switchData[module]){
    switchData[module] = buildSwitchAgents(module, module==='mine' ? 23 : 27);
  }
  return switchData[module];
}
// 两个模块各自独立的分页状态
const switchPageState = {
  mine:   { page:0, loading:false, hasMore:true },
  square: { page:0, loading:false, hasMore:true },
};
function buildSwitchAgents(module, total){
  const arr = [];
  const icons = ['🏙️','🌿','✅','🛰️','📊','⛰️','🌾','🔥','💡','🗺️','🧭','🏗️'];
  const cats  = ['规划类','分析类','审查类','数据类','其他'];
  for(let i=1;i<=total;i++){
    if(module==='mine'){
      if(i===1){
        arr.push({id:'zhidi',name:'致地AI助手',icon:'🤖',iconBg:'#E0F2FE',iconColor:'#0EA5E9',status:'published',cat:'平台默认',desc:'致地AI 默认空间智能体（Buddy），直接处理基础 GIS 任务，并可调度数据处理、数据查询、制图、统计分析四大专业智能体。',tools:3,kb:2});
      }else if(i>=2 && i<=5 && typeof zhidiSpecialAgents!=='undefined'){
        // 四大专业智能体（真实配置，切换后携带完整提示词）
        const s=zhidiSpecialAgents[i-2];
        arr.push({id:s.id,name:s.name,icon:s.icon,iconBg:s.iconBg,iconColor:s.iconColor,status:s.status,cat:s.cat,desc:s.desc,tools:s.tools,kb:s.kb});
      }else{
        const n=i-5;
        arr.push({id:'m'+n,name:'我的智能体 '+n,icon:icons[n%icons.length],iconBg:'#ECFDF5',iconColor:'#10B981',status:(n%5===0?'draft':(n%7===0?'offline':'published')),cat:cats[n%cats.length],desc:'你配置的智能体「我的智能体 '+n+'」，内置空间分析工具与专属知识库。',tools:(n*3)%20,kb:(n*2)%12});
      }
    }else{
      arr.push({id:'q'+i,name:'广场智能体 '+i,icon:icons[(i+3)%icons.length],iconBg:'#EFF6FF',iconColor:'#3B82F6',cat:cats[i%cats.length],desc:'广场中由团队发布的公开智能体 #'+i+'，开箱即用。',publisher:'团队'+(i%9+1),usage:i*53,rating:(4+(i%10)/10).toFixed(1)});
    }
  }
  return arr;
}
function switchItemHTML(a, isMine){
  const sel = a.id===currentAgent.id;
  const sub = isMine ? (a.cat+' · 🧰'+a.tools+' 📚'+a.kb) : ('发布者：'+a.publisher+' · ⭐'+a.rating);
  const badge = isMine ? `<span class="a-status ${a.status}">${(statusText[a.status])||a.status}</span>` : '';
  return `<div class="sw-item${sel?' selected':''}" data-id="${a.id}" data-mod="${isMine?'mine':'square'}">
    <div class="sw-av" style="background:${a.iconBg};color:${a.iconColor}">${a.icon}</div>
    <div class="sw-info"><div class="sw-name">${a.name}${badge}</div><div class="sw-sub">${sub}</div></div>
    <div class="sw-check">${sel?'✓':'＋'}</div>
  </div>`;
}
function loadSwitchMore(module){
  const st = switchPageState[module];
  if(st.loading || !st.hasMore) return;
  st.loading = true;
  const cap = module==='mine' ? 'Mine' : 'Square';
  const foot = $('#asFoot'+cap);
  foot.innerHTML = '<span class="sw-loading"><span class="sw-spin"></span>加载中…</span>';
  setTimeout(()=>{
    const data = getSwitchData(module);
    const start = st.page * SWITCH_PAGE;
    const slice = data.slice(start, start+SWITCH_PAGE);
    const list = $('#asList'+cap);
    list.insertAdjacentHTML('beforeend', slice.map(a=>switchItemHTML(a, module==='mine')).join(''));
    bindSwitchItems(list);
    st.page++; st.hasMore = st.page * SWITCH_PAGE < data.length; st.loading = false;
    foot.innerHTML = st.hasMore ? '<span class="sw-hint">下拉加载更多</span>' : '<span class="sw-nomore">— 没有更多了 —</span>';
    markSwitchSelected();
    if($('#asMask').classList.contains('show')) positionSwitchPop();
  }, 550);
}
function bindSwitchItems(list){
  list.querySelectorAll('.sw-item').forEach(el=>{
    if(el._bound) return; el._bound = true;
    el.addEventListener('click', ()=> switchCurrentAgent(el.dataset.id, el.dataset.mod));
  });
}
function markSwitchSelected(){
  document.querySelectorAll('.sw-item').forEach(el=>{
    const sel = el.dataset.id === currentAgent.id;
    el.classList.toggle('selected', sel);
    const chk = el.querySelector('.sw-check'); if(chk) chk.textContent = sel ? '✓' : '＋';
  });
}
function switchCurrentAgent(id, mod){
  const a = getSwitchData(mod).find(x=>x.id===id); if(!a) return;
  currentAgent = { id:a.id, name:a.name, icon:a.icon, cat:a.cat, desc:a.desc };
  // 确保编辑页所需结构，并为默认智能体初始化示例配置
  if(typeof ensureAgentEditState==='function') ensureAgentEditState();
  if(typeof initCurrentAgentConfig==='function') initCurrentAgentConfig();
  $('#aibAvatar').textContent = a.icon;
  $('#aibNameText').textContent = a.name;
  closeSwitchPopup(); toast('已切换至「'+a.name+'」'); markSwitchSelected();
}
function openSwitchPopup(){
  $('#asMask').classList.add('show');
  positionSwitchPop();
  // 首次打开时各自加载首屏（维持各自独立分页）
  ['mine','square'].forEach(m=>{ const st=switchPageState[m]; if(st.page===0 && !st.loading) loadSwitchMore(m); });
}
// 浮层定位：默认在按钮左上方弹出（浮层右下角贴按钮左上角）
// 左侧空间不足 → 水平贴近按钮左缘；上方空间不足 → 移到按钮下方并翻转箭头
function positionSwitchPop(){
  positionAnchoredPopover($('#aibSwitchBtn'),$('#asPop'),'above');
}
function closeSwitchPopup(){ $('#asMask').classList.remove('show'); }
$('#asClose').addEventListener('click', closeSwitchPopup);
$('#asMask').addEventListener('click', e=>{ if(e.target.id==='asMask') closeSwitchPopup(); });
// 浮层打开时：Esc 关闭 / 窗口尺寸变化重定位
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeSwitchPopup(); });
window.addEventListener('resize', ()=>{ if($('#asMask').classList.contains('show')) positionSwitchPop(); });
// 标签页切换（两个模块各自保留独立数据源与分页状态）
document.querySelectorAll('.sp-tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.sp-tab').forEach(x=>x.classList.remove('active'));
    tab.classList.add('active');
    const m = tab.dataset.mod;
    document.querySelectorAll('.sp-panel').forEach(p=>p.classList.toggle('show', p.dataset.mod===m));
    if($('#asMask').classList.contains('show')) positionSwitchPop();
  });
});
// 两个模块的无限滚动独立绑定
[['Mine','mine'],['Square','square']].forEach(([cap,mod])=>{
  const list = $('#asList'+cap);
  list.addEventListener('scroll', ()=>{
    if(list.scrollTop + list.clientHeight >= list.scrollHeight - 40) loadSwitchMore(mod);
  });
});

// ============ 大模型选择弹窗 ============
// 官方内置大模型（模拟数据）
const officialModels = [
  {id:'hy3',     name:'Hy3',               desc:'致地自研空间推理模型，擅长国土空间分析、制图与规划问答。', badge:'默认'},
  {id:'ds-v4',   name:'deepseek-v4-flash', desc:'通用高性能对话模型，响应快、成本低，适合批量空间查询。'},
  {id:'qwen',    name:'Qwen3.6-27b',       desc:'通义千问大模型，中文理解强、长文本友好，适合规划文档撰写。'},
  {id:'glm',     name:'GLM-5',             desc:'智谱大模型，逻辑推理与代码能力突出，适合规则与脚本生成。'},
  {id:'gpt',     name:'GPT-4o-mini',       desc:'OpenAI 轻量模型，多语言与工具调用均衡，适合国际化场景。'},
  {id:'claude',  name:'Claude-3.7-sonnet', desc:'Anthropic 模型，长文档处理与严谨写作见长，适合审查报告。'},
  {id:'gemini',  name:'Gemini-2.5-flash',  desc:'Google 模型，多模态与超长上下文，适合图文混合分析。'},
];
// 用户自定义大模型（初始为空 → 展示空状态）
let customModels = [];
let currentModelId = 'hy3';   // 当前选中的官方/自定义模型
let modelAuto = false;        // Auto 模式开关

function modelName(id){
  const m = officialModels.find(x=>x.id===id) || customModels.find(x=>x.id===id);
  return m ? m.name : 'Hy3';
}
function modelItemHTML(m, isCustom){
  const sel = !modelAuto && m.id===currentModelId;
  const badge = m.badge ? `<span class="mi-badge">${m.badge}</span>` : '';
  const tag = isCustom ? `<span class="mi-badge" style="background:#64748B;">自定义</span>` : '';
  return `<div class="model-item${sel?' selected':''}" data-id="${m.id}" data-custom="${isCustom?1:0}">
    <div class="mi-radio"></div>
    <div class="mi-info">
      <div class="mi-name">${m.name}${badge}${tag}</div>
    </div>
  </div>`;
}
function renderModelOfficial(){
  $('#modelOfficialList').innerHTML = officialModels.map(m=>modelItemHTML(m,false)).join('');
  bindModelItems($('#modelOfficialList'));
}
function renderModelCustom(){
  const wrap=$('#modelCustomList'), empty=$('#modelCustomEmpty');
  if(customModels.length===0){ wrap.innerHTML=''; empty.style.display='block'; }
  else{ empty.style.display='none'; wrap.innerHTML = customModels.map(m=>modelItemHTML(m,true)).join(''); bindModelItems(wrap); }
}
function bindModelItems(list){
  list.querySelectorAll('.model-item').forEach(el=>{
    if(el._bound) return; el._bound=true;
    el.addEventListener('click', ()=> selectModel(el.dataset.id, el.dataset.custom==='1'));
  });
}
function updateCiModelLabel(){
  $('#ciModel').innerHTML =
    `<span class="cm-dot" style="background:${modelAuto?'var(--hl)':'var(--sub)'}"></span>`+
    `${modelAuto?'Auto':modelName(currentModelId)}<span class="cm-arrow">▾</span>`;
}
function selectModel(id, isCustom){
  currentModelId=id; modelAuto=false;
  $('#modelAuto').checked=false;
  updateCiModelLabel(); renderModelOfficial(); renderModelCustom();
  closeModelPopup(); toast('已切换至「'+modelName(id)+'」');
}
$('#modelAuto').addEventListener('change', e=>{
  modelAuto=e.target.checked;
  updateCiModelLabel(); renderModelOfficial(); renderModelCustom();
  if(modelAuto) toast('已开启 Auto 模式，将自动选择最优模型');
});
function positionModelPopup(){ positionAnchoredPopover($('#ciModel'),$('#modelPop'),'above'); }
function openModelPopup(){ renderModelOfficial(); renderModelCustom(); $('#modelMask').classList.add('show'); requestAnimationFrame(positionModelPopup); }
function closeModelPopup(){ $('#modelMask').classList.remove('show'); }
$('#ciModel').addEventListener('click', openModelPopup);
$('#modelClose').addEventListener('click', closeModelPopup);
$('#modelMask').addEventListener('click', e=>{ if(e.target.id==='modelMask') closeModelPopup(); });
window.addEventListener('resize',()=>{if($('#modelMask').classList.contains('show'))positionModelPopup();});

// ============ 添加模型弹窗（统一入口） ============
let mcEditingId = null;  // null=新增模式, 否则为编辑目标 id

const PROVIDER_NAMES = {
  'tencent-cloud': '腾讯云 Token Plan',
  'openai':       'OpenAI',
  'tongyi':       '通义千问',
  'zhipu':        '智谱 GLM',
  'anthropic':    'Anthropic',
  'google':       'Google',
  'custom':       '自建 / 其他兼容',
};

function openMcModal(editId){
  mcEditingId = editId || null;
  const mask=$('#mcModalMask');
  // 重置或回填表单
  if(mcEditingId){
    const m = customModels.find(x=>x.id===mcEditingId);
    if(m){ $('#mcModalProvider').value=m.provider||''; $('#mcModalApiKey').value=m.apiKey||''; $('#mcModalModelName').value=m.modelName||'Auto'; }
    $('#mcModalSave').textContent='保存';
  } else {
    $('#mcModalProvider').value=''; $('#mcModalApiKey').value=''; $('#mcModalModelName').value='Auto';
    $('#mcModalSave').textContent='保存';
  }
  $('#mcModalApiKey').type='password';
  mask.classList.add('show');
}
function closeMcModal(){ $('#mcModalMask').classList.remove('show'); mcEditingId=null; }

// API Key 显隐切换
$('#mcEyeBtn').addEventListener('click', ()=>{
  const inp=$('#mcModalApiKey');
  inp.type = inp.type==='password' ? 'text' : 'password';
});

// 弹窗关闭
$('#mcModalClose').addEventListener('click', closeMcModal);
$('#mcModalCancel').addEventListener('click', closeMcModal);
$('#mcModalMask').addEventListener('click', e=>{ if(e.target.id==='mcModalMask') closeMcModal(); });

// 弹窗保存
$('#mcModalSave').addEventListener('click', ()=>{
  const provider=$('#mcModalProvider').value;
  if(!provider){ toast('请选择提供商'); return; }
  const apiKey=$('#mcModalApiKey').value.trim();
  if(!apiKey){ toast('请输入 API Key'); return; }
  const modelName=$('#mcModalModelName').value;
  const displayName = modelName==='Auto' ? 'Auto' : modelName;

  const data = {
    provider,
    apiKey,
    modelName: displayName,
    name: `${PROVIDER_NAMES[provider]||provider} / ${displayName}`,
    desc: `${PROVIDER_NAMES[provider]||provider} / ${displayName}（个人版）`,
  };

  if(mcEditingId){
    // 编辑模式
    const idx = customModels.findIndex(x=>x.id===mcEditingId);
    if(idx>=0){ customModels[idx]={...customModels[idx], ...data}; }
    toast('模型已更新');
  } else {
    // 新增模式
    customModels.push({id:'c'+Date.now(), ...data});
    toast('已添加自定义模型「'+data.name+'」');
  }
  saveCustomModels();
  renderMcSavedList();
  renderModelCustom(); updateCiModelLabel();
  closeMcModal();
});

// 模块三：model-foot → 打开配置页
$('#modelConfigBtn').addEventListener('click', ()=>{ closeModelPopup(); switchPage('model-config'); });
// 配置页：返回
$('#mcBackBtn').addEventListener('click', ()=> switchPage('workbench'));
// 配置页：添加模型按钮 → 弹出弹窗
$('#mcAddModelBtn').addEventListener('click', ()=> openMcModal());

// ============ 已保存模型列表渲染 & CRUD ============
function saveCustomModels(){
  try{ localStorage.setItem('wb_custom_models', JSON.stringify(customModels)); }catch(e){}
}
function loadCustomModels(){
  try{ const raw=localStorage.getItem('wb_custom_models'); if(raw) customModels=JSON.parse(raw); }catch(e){}
}

function renderMcSavedList(){
  const list=$('#mcSavedList'), empty=$('#mcEmptyState');
  if(customModels.length===0){
    list.innerHTML=''; empty.style.display='';
    return;
  }
  empty.style.display='none';
  list.innerHTML = customModels.map(m => `
    <div class="mc-saved-item" data-id="${m.id}">
      <div class="mc-saved-icon">☁</div>
      <div class="mc-saved-info">
        <div class="mc-saved-name">${m.name}</div>
        <div class="mc-saved-desc">${m.desc}</div>
      </div>
      <div class="mc-saved-actions">
        <button class="mc-action-btn edit" title="编辑">✎</button>
        <button class="mc-action-btn delete" title="删除">🗑</button>
      </div>
    </div>`).join('');

  // 绑定编辑/删除事件
  list.querySelectorAll('.mc-saved-item').forEach(el=>{
    el.querySelector('.edit').addEventListener('click', (e)=>{
      e.stopPropagation(); openMcModal(el.closest('.mc-saved-item').dataset.id);
    });
    el.querySelector('.delete').addEventListener('click', (e)=>{
      e.stopPropagation();
      const id=el.closest('.mc-saved-item').dataset.id;
      customModels = customModels.filter(x=>x.id!==id);
      saveCustomModels();
      renderMcSavedList(); renderModelCustom(); updateCiModelLabel();
      toast('已删除该模型');
    });
  });
}

// 进入配置页时刷新列表
const _origSwitchPage = typeof switchPage !== 'undefined' ? switchPage : function(n){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const target=document.getElementById('page-'+n); if(target) target.classList.add('active');
};
// 用 Monkey-patch 方式注入刷新逻辑
window.switchPage = function(name){
  _origSwitchPage(name);
  if(name==='model-config'){ loadCustomModels(); renderMcSavedList(); }
};

// 初始化
loadCustomModels();
renderModelOfficial(); renderModelCustom(); updateCiModelLabel();

// ============ 对话区 + 弹出菜单 ============
const ciMenu=$('#ciMenu'), ciMask=$('#ciMenuMask');
function openCiMenu(){ ciMenu.classList.add('show'); ciMask.classList.add('show'); }
function closeCiMenu(){ ciMenu.classList.remove('show'); ciMask.classList.remove('show'); }
// 对话区全屏切换
let chatFsMode=false;
function toggleChatFullscreen(){
  const rp=$('#rightPanel'), ro=$('#reopenTab');
  chatFsMode=!chatFsMode;
  if(chatFsMode){
    rp.style.position='fixed';rp.style.inset='0';rp.style.zIndex='500';rp.style.borderRadius='0';
    rp.style.width='100%';rp.style.height='100%';
    if(ro) ro.style.display='none';
    $('#chFullscreen').textContent='⏻';
  } else {
    rp.style.position='';rp.style.inset='';rp.style.zIndex='';rp.style.borderRadius='';
    rp.style.width='';rp.style.height='';
    if(ro) ro.style.display='';
    $('#chFullscreen').textContent='⛶';
  }
}

$('#chFullscreen').addEventListener('click',toggleChatFullscreen);
$('#ciPlusBtn').addEventListener('click',e=>{ e.stopPropagation(); openCiMenu(); });
$('#ciMenuClose').addEventListener('click',closeCiMenu);
ciMask.addEventListener('click',closeCiMenu);
ciMenu.addEventListener('click',event=>{
  const item=event.target.closest('[data-menu-action]');
  if(!item) return;
  const actions={
    'add-file':()=>toast('添加文件（演示）'),
    'reference-file':()=>toast('引用对话中的文件（演示）'),
    'switch-mode':()=>toast('模式切换（演示）'),
    'open-agent':()=>{ switchPage('agent'); closeCiMenu(); },
    'open-skills':()=>toast('技能中心（演示）'),
    'open-connectors':()=>toast('连接器管理（演示）')
  };
  actions[item.dataset.menuAction]?.();
});
document.addEventListener('click',e=>{ if(!ciMenu.contains(e.target)&&!$('#ciPlusBtn').contains(e.target)) closeCiMenu(); });
// 终止按钮默认隐藏
stopBtn.style.display='none';

// ============ 自动化验证钩子（URL hash 含 autostats 时自动执行统计流程） ============
if(location.hash.includes('autostats')){
  setTimeout(()=>{ $('#chatText').value='统计成都市不同类型设施的个数'; send(); }, 600);
  setTimeout(()=>{ document.querySelector('[data-stats-action="chart"]')?.click(); }, 4800);
  setTimeout(()=>{ document.querySelector('[data-stats-action="layer"]')?.click(); }, 7200);
  setTimeout(()=>{ document.querySelector('[data-tool="layer-manager"]')?.click(); }, 8600); // 打开显示管理抽屉
  setTimeout(()=>{
    const layers=document.getElementById('lmmToggleLayers'),legend=document.getElementById('lmmToggleLegend'),drawer=document.querySelector('[data-map-drawer="layer-manager"]');
    document.body.setAttribute('data-lmm-state', JSON.stringify({layersChecked:layers?.checked,legendChecked:legend?.checked,drawerOpen:!drawer?.hidden,panelOpen:window.MapLayers?.isOpen?.(),legendVisible:window.MapLayers?.isLegendVisible?.()}));
  }, 9000);
  if(location.hash.includes('legend-off')){
    setTimeout(()=>{ const el=document.getElementById('lmmToggleLegend'); if(el&&el.checked) el.click(); }, 9800); // 关闭图例开关
  }
  if(location.hash.includes('lmm-close')){
    setTimeout(()=>{ window.MapToolDrawer?.close('layer-manager'); }, 9800); // 通过 API 关闭显示管理抽屉
    setTimeout(()=>{ const drawer=document.querySelector('[data-map-drawer="layer-manager"]'),btn=document.querySelector('[data-tool="layer-manager"]'); document.body.setAttribute('data-lmm-state', JSON.stringify({drawerOpen:!drawer?.hidden,pressed:btn?.getAttribute('aria-pressed'),expanded:btn?.getAttribute('aria-expanded')})); }, 10100);
  }
  if(location.hash.includes('legend-independent')){
    // 独立性验证：图例开关 OFF 后，反复切换图层开关，图例开关/图例可见性必须保持不变
    setTimeout(()=>{ const el=document.getElementById('lmmToggleLegend'); if(el&&el.checked) el.click(); }, 9000);  // 图例 OFF
    setTimeout(()=>{ document.getElementById('lmmToggleLayers')?.click(); }, 9400);  // 图层面板 开→关
    setTimeout(()=>{ document.getElementById('lmmToggleLayers')?.click(); }, 9600);  // 图层面板 关→开
    setTimeout(()=>{
      const layers=document.getElementById('lmmToggleLayers'),legend=document.getElementById('lmmToggleLegend');
      document.body.setAttribute('data-lmm-state', JSON.stringify({layersChecked:layers?.checked,legendChecked:legend?.checked,panelOpen:window.MapLayers?.isOpen?.(),legendVisible:window.MapLayers?.isLegendVisible?.()}));
    }, 9900);
  }
  if(location.hash.includes('legend-close')){
    // 图例右上角关闭按钮：点击后图例隐藏，且抽屉内图例开关同步为 OFF
    setTimeout(()=>{ document.querySelector('[data-legend-close]')?.click(); }, 9000);
    setTimeout(()=>{
      const legendEl=document.getElementById('mapLegend'),legend=document.getElementById('lmmToggleLegend');
      document.body.setAttribute('data-lmm-state', JSON.stringify({legendHidden:legendEl?.hidden,legendChecked:legend?.checked,legendVisible:window.MapLayers?.isLegendVisible?.()}));
    }, 9400);
  }
}

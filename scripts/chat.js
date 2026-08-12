// ============ 对话 ============
const chatBody=$('#chatBody'); const sendBtn=$('#sendBtn'); const stopBtn=$('#stopBtn');
let typingEl=null, stopped=false;
function addBubble(role,text){
  const d=document.createElement('div'); d.className='bubble '+role;
  d.innerHTML=`<div class="av">${role==='ai'?'AI':'我'}</div><div class="txt">${text}</div>`;
  chatBody.appendChild(d); chatBody.scrollTop=chatBody.scrollHeight; return d;
}
function aiReply(q){
  stopped=false; stopBtn.style.display='inline-block'; sendBtn.style.display='none';
  typingEl=document.createElement('div'); typingEl.className='bubble ai typing';
  typingEl.innerHTML=`<div class="av">AI</div><div class="txt"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
  chatBody.appendChild(typingEl); chatBody.scrollTop=chatBody.scrollHeight;
  setTimeout(()=>{
    if(stopped){ typingEl.remove(); stopBtn.style.display='none'; sendBtn.style.display='inline-block'; return; }
    const reply = q.includes('合规')?'已圈选范围：该地块 82% 位于城镇开发边界内，叠加上传的"生态红线"图层后，西南角约 3.6 公顷触及缓冲带，建议调整布局或办理占补平衡。'
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
  addBubble('user',v); $('#chatText').value='';
  qcActiveLabel=null; renderQcTag(); renderQcSubtasks();   // 发送后解绑快捷指令
  aiReply(v);
}
sendBtn.addEventListener('click',send);
$('#chatText').addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } });
stopBtn.addEventListener('click',()=>{ stopped=true; });
$('#chNew').addEventListener('click',()=>{ chatBody.innerHTML='<div class="bubble ai"><div class="av">AI</div><div class="txt">已开启新对话，有什么可以帮你的？</div></div>'; toast('新建对话'); });
document.querySelectorAll('.quick .q').forEach(q=>q.addEventListener('click',()=>{ addBubble('user',q.textContent); aiReply(q.textContent); }));

// ============ 对话区智能体信息栏 ============
// 当前对话智能体（对话区信息栏展示对象）
let currentAgent={id:'zhidi',name:'致地AI助手',icon:'🤖',cat:'平台默认',desc:'致地AI 空间智能体，提供空间分析、制图、数据查询与报告生成能力。',tools:25,kb:2};
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
  const tag=$('#qcTag'), box=document.querySelector('#chatInput .box');
  if(qcActiveLabel){
    tag.style.display='inline-flex';
    tag.querySelector('.qc-tag-name').textContent='@'+qcActiveLabel;   // 动作A：@标签名
    box.classList.add('has-tag');
  }else{
    tag.style.display='none';
    box.classList.remove('has-tag');
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
const switchData = {
  mine:   buildSwitchAgents('mine', 19),   // 19 条 → 4 页（6+6+6+1）
  square: buildSwitchAgents('square', 27), // 27 条 → 5 页（6+6+6+6+3）
};
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
        arr.push({id:'zhidi',name:'致地AI助手',icon:'🤖',iconBg:'#E0F2FE',iconColor:'#0EA5E9',status:'published',cat:'平台默认',desc:'致地AI 空间智能体，提供空间分析、制图、数据查询与报告生成能力。',tools:25,kb:2});
      }else{
        const n=i-1;
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
    const data = switchData[module];
    const start = st.page * SWITCH_PAGE;
    const slice = data.slice(start, start+SWITCH_PAGE);
    const list = $('#asList'+cap);
    list.insertAdjacentHTML('beforeend', slice.map(a=>switchItemHTML(a, module==='mine')).join(''));
    bindSwitchItems(list);
    st.page++; st.hasMore = st.page * SWITCH_PAGE < data.length; st.loading = false;
    foot.innerHTML = st.hasMore ? '<span class="sw-hint">下拉加载更多</span>' : '<span class="sw-nomore">— 没有更多了 —</span>';
    markSwitchSelected();
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
  const a = switchData[mod].find(x=>x.id===id); if(!a) return;
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
  const btn=$('#aibSwitchBtn'), pop=$('#asPop');
  const r=btn.getBoundingClientRect();
  const vw=window.innerWidth, vh=window.innerHeight;
  // 同一帧内隐藏测量实际尺寸，避免闪烁
  pop.style.visibility='hidden';
  const popW=pop.offsetWidth, popH=pop.offsetHeight;
  pop.style.visibility='';
  // 水平：优先浮层右边缘贴按钮左边缘；左侧不够则贴近按钮左缘并兜底视口边界
  let left;
  if(r.left - popW - 10 >= 8) left = r.left - popW - 10;
  else left = Math.min(Math.max(8, r.left), Math.max(8, vw - popW - 8));
  pop.style.left = left + 'px';
  // 垂直：优先浮层底部贴按钮顶部（左上侧）；上方空间不足则移到按钮下方
  // 无论哪种方向都钳制在视口内（矮窗口下浮层底部不溢出）
  pop.classList.remove('pop-above','pop-below');
  const clampY = y => Math.max(8, Math.min(y, vh - popH - 8));
  if(r.top - popH - 10 >= 8){
    pop.style.top = clampY(r.top - popH - 10) + 'px';
    pop.classList.add('pop-above');
  }else{
    pop.style.top = clampY(r.bottom + 10) + 'px';
    pop.classList.add('pop-below');
  }
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
      <div class="mi-desc">${m.desc}</div>
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
function openModelPopup(){ renderModelOfficial(); renderModelCustom(); $('#modelMask').classList.add('show'); }
function closeModelPopup(){ $('#modelMask').classList.remove('show'); }
$('#ciModel').addEventListener('click', openModelPopup);
$('#modelClose').addEventListener('click', closeModelPopup);
$('#modelMask').addEventListener('click', e=>{ if(e.target.id==='modelMask') closeModelPopup(); });

// 模块三：添加自定义模型（跳转独立配置页）
$('#modelConfigBtn').addEventListener('click', ()=>{ closeModelPopup(); switchPage('model-config'); });
// 大模型配置页：保存 / 返回
$('#mcBackBtn').addEventListener('click', ()=> switchPage('workbench'));
$('#mcCancelBtn').addEventListener('click', ()=> switchPage('workbench'));
$('#mcSaveBtn').addEventListener('click', ()=>{
  const name=$('#mcName').value.trim(); if(!name){ toast('请填写模型名称'); return; }
  const provider=$('#mcProvider').value;
  const desc=$('#mcDesc').value.trim() || ('用户自定义配置的大模型（'+provider+'）。');
  customModels.push({id:'c'+Date.now(), name, desc});
  $('#mcName').value=''; $('#mcEndpoint').value=''; $('#mcKey').value=''; $('#mcDesc').value='';
  switchPage('workbench'); toast('已添加自定义模型「'+name+'」');
});
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

// ============ 任务进度抽屉 ============
let drawerTasks=[
  {id:1,name:'紫金片区拆解_500m*650m',icon:'📐',iconBg:'#DBEAFE',iconColor:'#3B82F6',status:'running',progress:42,time:'更新于 12:04:58'},
  {id:2,name:'AI规划助手_正射影像_2024',icon:'🤖',iconBg:'#FEF3C7',iconColor:'#D97706',status:'running',progress:68,time:'运行中 · 1.3s'},
  {id:3,name:'批量导入_清表数据.xlsx',icon:'✅',iconBg:'#D1FAE5',iconColor:'#10B981',status:'done',progress:100,time:'完成 · 耗时 12.4s / 文件 123.4 KB'}
];
function renderTaskDrawer(){
  const body=$('#tdBody');
  if(!body)return;
  body.innerHTML=drawerTasks.map(t=>{
    const pct=t.progress+'%';
    const color=t.status==='done'?'var(--main)':t.status==='error'?'#EF4444':'var(--sub)';
    const statusText=t.status==='done'?'已完成':t.status==='running'?'进行中':'等待中';
    return '<div class="td-item">'+
      '<div class="td-item-icon" style="background:'+t.iconBg+';color:'+t.iconColor+'">'+t.icon+'</div>'+
      '<div class="td-item-info">'+
        '<div class="td-item-name">'+t.name+'</div>'+
        '<div class="td-item-meta">'+statusText+' · '+t.time+'</div>'+
      '</div>'+
      '<div class="td-item-progress"><div class="td-item-progress-fill" style="width:'+pct+';background:'+color+'"></div></div>'+
      '<span class="td-item-pct" style="color:'+color+'">'+pct+'</span>'+
    '</div>';
  }).join('');
  const running=drawerTasks.filter(t=>t.status==='running').length;
  const cntEl=document.getElementById('tdCount');
  if(cntEl) cntEl.textContent=running+' 进行中';
}
function toggleTaskDrawer(){
  const d=$('#taskDrawer');
  if(!d)return;
  d.classList.toggle('collapsed');
  d.classList.toggle('expanded');
  if(d.classList.contains('expanded'))renderTaskDrawer();
}
function refreshTaskDrawer(){
  drawerTasks.forEach(t=>{
    if(t.status==='running'&&t.progress<95){
      t.progress=Math.min(95,t.progress+Math.floor(Math.random()*8));
    }
  });
  renderTaskDrawer();
  toast('任务进度已刷新');
}
renderTaskDrawer();
$('#taskDrawerToggle').addEventListener('click',toggleTaskDrawer);
$('#taskDrawerRefresh').addEventListener('click',event=>{ event.stopPropagation(); refreshTaskDrawer(); });
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


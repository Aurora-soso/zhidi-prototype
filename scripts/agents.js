// ============ 智能体中心 ============
const agentCats=['全部','规划类','分析类','审查类','数据类','其他'];
// 我的智能体
let myAgents=[
  {id:'a1',name:'国土空间规划助手',icon:'🏙️',iconBg:'#E0F2FE',iconColor:'#0EA5E9',status:'published',cat:'规划类',desc:'面向国土空间规划的智能问答与方案生成助手，内置规划法规库与用地标准。',tools:12,kb:3},
  {id:'a2',name:'生态修复顾问',icon:'🌿',iconBg:'#ECFDF5',iconColor:'#10B981',status:'published',cat:'规划类',desc:'基于生态本底数据的修复方案推荐与成效评估，支持退化识别与措施匹配。',tools:8,kb:2},
  {id:'a3',name:'用地合规审查官',icon:'✅',iconBg:'#FEF3C7',iconColor:'#D97706',status:'draft',cat:'审查类',desc:'自动比对用地红线、用途管制要求与准入清单，输出合规结论与整改建议。',tools:6,kb:1},
  {id:'a4',name:'遥感影像解译师',icon:'🛰️',iconBg:'#EFF6FF',iconColor:'#3B82F6',status:'offline',cat:'分析类',desc:'自动提取建设用地、植被、水体等地物，输出矢量图斑与统计报表。',tools:5,kb:4},
];
// 智能体广场
let squareAgents=[
  {id:'s1',name:'遥感影像解译',icon:'🛰️',iconBg:'#EFF6FF',iconColor:'#3B82F6',cat:'分析类',desc:'自动提取建设用地、植被、水体等地物，输出矢量图斑。',publisher:'研发团队',usage:1280,rating:4.8},
  {id:'s2',name:'用地合规性检查',icon:'✅',iconBg:'#FEF3C7',iconColor:'#D97706',cat:'审查类',desc:'比对用地红线与用途管制，秒级输出合规结论。',publisher:'规划一所',usage:932,rating:4.7},
  {id:'s3',name:'规划方案生成器',icon:'🏙️',iconBg:'#E0F2FE',iconColor:'#0EA5E9',cat:'规划类',desc:'依据上位规划与现状数据，生成用地布局草案。',publisher:'国地规划',usage:2104,rating:4.9},
  {id:'s4',name:'统计出图助手',icon:'📊',iconBg:'#F0FDF4',iconColor:'#16A34A',cat:'数据类',desc:'一键将属性表转为专题图与图表，支持导出。',publisher:'数据组',usage:1556,rating:4.6},
  {id:'s5',name:'坡度地形分析',icon:'⛰️',iconBg:'#F5F3FF',iconColor:'#8B5CF6',cat:'分析类',desc:'基于 DEM 计算坡度坡向，识别适宜建设区域。',publisher:'测绘中心',usage:718,rating:4.5},
  {id:'s6',name:'耕地保护巡查',icon:'🌾',iconBg:'#FEFCE8',iconColor:'#CA8A04',cat:'审查类',desc:'识别耕地非农化、非粮化图斑并推送整改清单。',publisher:'耕保处',usage:644,rating:4.4},
  {id:'s7',name:'人口热力洞察',icon:'🔥',iconBg:'#FFF1F2',iconColor:'#E11D48',cat:'数据类',desc:'融合多源数据刻画人口时空分布与职住特征。',publisher:'研发团队',usage:889,rating:4.3},
  {id:'s8',name:'通用问答助手',icon:'💡',iconBg:'#ECFEFF',iconColor:'#06B6D4',cat:'其他',desc:'面向空间业务的通用知识问答与文档摘要。',publisher:'平台',usage:3301,rating:4.7},
];
const statusText={published:'已发布',draft:'草稿',offline:'已下架'};

function agentCardHTML(a,isMine){
  const acts = isMine
    ? `<button class="ac-btn" onclick="openAgentDetail('${a.id}','mine')">详情</button>
       <button class="ac-btn blue" onclick="tryAgent('${a.id}')">试用</button>
       <button class="ac-btn" onclick="editAgent('${a.id}')">编辑</button>
       ${a.status==='published'
          ? `<button class="ac-btn" onclick="togglePublish('${a.id}')">下架</button>`
          : `<button class="ac-btn primary" onclick="togglePublish('${a.id}')">发布</button>`}
       <button class="ac-btn danger" onclick="deleteAgent('${a.id}')">删除</button>`
    : `<button class="ac-btn primary" onclick="useSquare('${a.id}')">调用</button>
       <button class="ac-btn" onclick="openAgentDetail('${a.id}','square')">详情</button>`;
  return `<div class="agent-card">
    <div class="ac-top">
      <div class="ac-icon" style="background:${a.iconBg};color:${a.iconColor}">${a.icon}</div>
      <div class="ac-title">
        <div class="ac-name">${a.name}<span class="a-status ${a.status}">${statusText[a.status]}</span></div>
        <div class="ac-pub">${isMine?('配置 · '+a.cat):('发布者：'+a.publisher)}</div>
      </div>
    </div>
    <div class="ac-desc">${a.desc}</div>
    <div class="ac-meta">
      ${isMine
        ? `<span class="m">🧰 ${a.tools} 工具</span><span class="m">📚 ${a.kb} 知识库</span>`
        : `<span class="m">📞 ${a.usage} 次调用</span><span class="m">⭐ ${a.rating}</span><span class="m">🏷️ ${a.cat}</span>`}
    </div>
    <div class="ac-acts">${acts}</div>
  </div>`;
}
function renderMine(kw=''){
  kw=kw.trim().toLowerCase();
  const list=myAgents.filter(a=>!kw || a.name.toLowerCase().includes(kw) || a.desc.toLowerCase().includes(kw) || a.cat.toLowerCase().includes(kw));
  $('#mineGrid').innerHTML = list.length
    ? list.map(a=>agentCardHTML(a,true)).join('')
    : `<div class="empty-tip">没有匹配的智能体，换个关键词试试～</div>`;
}
function renderSquare(kw='',cat='全部'){
  kw=kw.trim().toLowerCase();
  const list=squareAgents.filter(a=>(cat==='全部'||a.cat===cat) && (!kw || a.name.toLowerCase().includes(kw) || a.desc.toLowerCase().includes(kw) || a.publisher.toLowerCase().includes(kw)));
  $('#squareGrid').innerHTML = list.length
    ? list.map(a=>agentCardHTML(a,false)).join('')
    : `<div class="empty-tip">广场中没有匹配的智能体</div>`;
}
// 分类标签
$('#squareTags').innerHTML=agentCats.map((c,i)=>`<span class="tag ${i===0?'active':''}" data-cat="${c}">${c}</span>`).join('');
let curSquareCat='全部';
document.querySelectorAll('#squareTags .tag').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('#squareTags .tag').forEach(x=>x.classList.remove('active'));
    t.classList.add('active'); curSquareCat=t.dataset.cat;
    renderSquare($('#squareSearch').value,curSquareCat);
  });
});
// Tab 切换
document.querySelectorAll('.agent-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.agent-tab').forEach(x=>x.classList.remove('active'));
    tab.classList.add('active');
    const m=tab.dataset.mod;
    $('#modMine').classList.toggle('show',m==='mine');
    $('#modSquare').classList.toggle('show',m==='square');
  });
});
$('#mineSearch').addEventListener('input',e=>renderMine(e.target.value));
$('#squareSearch').addEventListener('input',e=>renderSquare(e.target.value,curSquareCat));
$('#newAgentBtn').addEventListener('click',()=>{
  const a={id:'a'+Date.now(),name:'新建智能体',icon:'🤖',iconBg:'#ECFDF5',iconColor:'#10B981',status:'draft',cat:'规划类',desc:'请编辑该智能体的描述、工具集与知识库。',tools:0,kb:0};
  myAgents.unshift(a); renderMine($('#mineSearch').value);
  toast('已新建智能体（草稿）'); editAgent(a.id);
});
function togglePublish(id){
  const a=myAgents.find(x=>x.id===id); if(!a) return;
  if(a.status==='published'){ a.status='offline'; toast(`「${a.name}」已下架`); }
  else { a.status='published'; toast(`「${a.name}」已发布`); }
  renderMine($('#mineSearch').value);
}
function deleteAgent(id){
  const a=myAgents.find(x=>x.id===id); if(!a) return;
  if(!confirm(`确认删除智能体「${a.name}」？此操作不可恢复。`)) return;
  myAgents=myAgents.filter(x=>x.id!==id); renderMine($('#mineSearch').value); toast('已删除');
}
function tryAgent(id){
  const a=[...myAgents,...squareAgents].find(x=>x.id===id); if(!a) return;
  switchPage('workbench');
  addBubble('user',`试用智能体：${a.name}`);
  aiReply(`已加载「${a.name}」。${a.desc.slice(0,30)}…你可直接描述任务，或在地图上圈选范围让我处理。`);
}
function useSquare(id){
  const a=squareAgents.find(x=>x.id===id); if(!a) return;
  toast(`已调用「${a.name}」，正在为你准备…`);
  switchPage('workbench');
  addBubble('user',`调用智能体：${a.name}`);
  aiReply(`已接入「${a.name}」（发布者：${a.publisher}）。请描述需求，我将调用其能力与工具集为你处理。`);
}
// 详情 / 编辑模态
function openModal(html){ $('#modalBox').innerHTML=html; $('#modalMask').classList.add('show'); }
function closeModal(){ $('#modalMask').classList.remove('show'); }
$('#modalMask').addEventListener('click',e=>{ if(e.target.id==='modalMask') closeModal(); });
function openAgentDetail(id,type){
  const a=(type==='mine'?myAgents:squareAgents).find(x=>x.id===id); if(!a) return;
  const rows=type==='mine'
    ? `<div class="detail-row"><span class="dl">状态</span><span class="dv"><span class="a-status ${a.status}">${statusText[a.status]}</span></span></div>
       <div class="detail-row"><span class="dl">分类</span><span class="dv">${a.cat}</span></div>
       <div class="detail-row"><span class="dl">工具数量</span><span class="dv">${a.tools}</span></div>
       <div class="detail-row"><span class="dl">知识库</span><span class="dv">${a.kb}</span></div>`
    : `<div class="detail-row"><span class="dl">发布者</span><span class="dv">${a.publisher}</span></div>
       <div class="detail-row"><span class="dl">分类</span><span class="dv">${a.cat}</span></div>
       <div class="detail-row"><span class="dl">累计调用</span><span class="dv">${a.usage}</span></div>
       <div class="detail-row"><span class="dl">评分</span><span class="dv">⭐ ${a.rating}</span></div>`;
  const editBtn = type==='mine'
    ? `<button class="mbtn primary" onclick="agentAction('${type}','${a.id}','edit')">编辑</button>`
    : '';
  const actBtn = `<button class="mbtn ${type==='mine'?'':'blue'}" onclick="agentAction('${type}','${a.id}','${type==='mine'?'try':'use'}')">${type==='mine'?'试用':'调用'}</button>`;
  openModal(`
    <div class="modal-head"><h3>${a.icon} ${a.name}</h3><span class="x" onclick="closeModal()">✕</span></div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--t-body);line-height:1.7;margin:0 0 16px;">${a.desc}</p>
      ${rows}
    </div>
    <div class="modal-foot">
      ${editBtn}
      ${actBtn}
      <button class="mbtn" onclick="closeModal()">关闭</button>
    </div>`);
}
function agentAction(type,id,act){
  if(act==='edit') editAgent(id);
  else if(act==='try') tryAgent(id);
  else if(act==='use') useSquare(id);
}
function editAgent(id){
  const a=myAgents.find(x=>x.id===id); if(!a) return;
  openModal(`
    <div class="modal-head"><h3>编辑智能体</h3><span class="x" onclick="closeModal()">✕</span></div>
    <div class="modal-body">
      <div class="field"><label>名称</label><input id="eaName" value="${a.name}" /></div>
      <div class="field"><label>图标 Emoji</label><input id="eaIcon" value="${a.icon}" /></div>
      <div class="field"><label>分类</label><select id="eaCat">${agentCats.filter(c=>c!=='全部').map(c=>`<option ${c===a.cat?'selected':''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label>描述</label><textarea id="eaDesc">${a.desc}</textarea></div>
      <div class="field"><label>工具数量</label><input id="eaTools" type="number" value="${a.tools}" /></div>
      <div class="field"><label>知识库数量</label><input id="eaKb" type="number" value="${a.kb}" /></div>
    </div>
    <div class="modal-foot">
      <button class="mbtn" onclick="closeModal()">取消</button>
      <button class="mbtn primary" onclick="saveAgent('${a.id}')">保存</button>
    </div>`);
}
function saveAgent(id){
  const a=myAgents.find(x=>x.id===id); if(!a) return;
  a.name=$('#eaName').value.trim()||a.name;
  a.icon=$('#eaIcon').value.trim()||a.icon;
  a.cat=$('#eaCat').value;
  a.desc=$('#eaDesc').value.trim()||a.desc;
  a.tools=parseInt($('#eaTools').value)||0;
  a.kb=parseInt($('#eaKb').value)||0;
  renderMine($('#mineSearch').value); closeModal(); toast('已保存修改');
}

// ============ 智能体编辑页（子智能体 + 原子工具） ============
// 候选子智能体池（编辑页专用）
const candidateSubAgents=[
  {id:'sub-1',name:'用地审查员',icon:'✅',desc:'自动核对用地红线、用途管制与准入清单。'},
  {id:'sub-2',name:'遥感解译师',icon:'🛰️',desc:'提取建设用地、植被、水体等地物图斑。'},
  {id:'sub-3',name:'规划方案师',icon:'🏙️',desc:'依据上位规划生成用地布局草案。'},
  {id:'sub-4',name:'生态评估员',icon:'🌿',desc:'评估生态本底与修复成效。'},
  {id:'sub-5',name:'统计制图员',icon:'📊',desc:'将属性表转为专题图与统计图表。'},
  {id:'sub-6',name:'地形分析员',icon:'⛰️',desc:'基于 DEM 计算坡度坡向与适宜性。'},
];
// 候选原子工具池从 toolGroupsData 抽取
function getCandidateAtomTools(){
  const arr=[];
  toolGroupsData.forEach(g=>{
    g.tools.forEach(t=>{
      arr.push({name:t.name, icon:t.icon, color:t.color, desc:t.desc, group:g.label});
    });
  });
  return arr;
}
// 默认参数模板
const defaultToolParams={
  '缓冲区分析':[{key:'distance',value:'500',type:'number',desc:'缓冲距离（米）'},{key:'segments',value:'8',type:'number',desc:'分段数'}],
  '叠置分析':[{key:'tolerance',value:'0.01',type:'number',desc:'容差'}],
  '坐标转换':[{key:'targetCRS',value:'CGCS2000',type:'string',desc:'目标坐标系'}],
  '数据裁剪':[{key:'clipLayer',value:'',type:'string',desc:'裁剪图层名'}],
  '遥感图斑':[{key:'confidence',value:'0.75',type:'number',desc:'置信度阈值'}],
  '建筑合规提取':[{key:'minArea',value:'10',type:'number',desc:'最小面积（㎡）'}],
};
function getDefaultParams(toolName){
  return (defaultToolParams[toolName]||[]).map(p=>({...p}));
}

// 确保 currentAgent 具备编辑页所需结构
function ensureAgentEditState(){
  if(!currentAgent.subAgents) currentAgent.subAgents=[];
  if(!currentAgent.atomTools) currentAgent.atomTools=[];
}

let agentEditDraft=null;
function renderAgentEdit(){
  ensureAgentEditState();
  // 进入编辑页时打一份草稿，取消可回退
  agentEditDraft=JSON.parse(JSON.stringify(currentAgent));
  const a=currentAgent;
  $('#aeeName').value=a.name||'';
  $('#aeeIcon').value=a.icon||'🤖';
  $('#aeeCat').innerHTML=agentCats.filter(c=>c!=='全部').map(c=>`<option ${c===a.cat?'selected':''}>${c}</option>`).join('');
  $('#aeeDesc').value=a.desc||'';
  renderSubList();
  renderToolList();
}

function renderSubList(){
  const list=$('#aeeSubList'); const empty=$('#aeeSubEmpty');
  const subs=currentAgent.subAgents||[];
  $('#aeeSubCount').textContent=subs.length;
  empty.classList.toggle('show', subs.length===0);
  if(subs.length===0){ list.innerHTML=''; return; }
  list.innerHTML=subs.map((s,i)=>`
    <div class="aee-item" draggable="true" data-idx="${i}">
      <span class="aee-drag">⋮⋮</span>
      <div class="aee-item-ic" style="background:#ECFDF5;color:#10B981">${s.icon||'🧩'}</div>
      <div class="aee-item-info">
        <div class="aee-item-name">${s.name}</div>
        <div class="aee-item-desc">${s.desc||''}</div>
      </div>
      <div class="aee-item-actions">
        <button class="aee-item-btn up" title="上移" data-action="up" data-idx="${i}">↑</button>
        <button class="aee-item-btn down" title="下移" data-action="down" data-idx="${i}">↓</button>
        <button class="aee-item-btn" title="移除" data-action="remove" data-idx="${i}">✕</button>
      </div>
    </div>
  `).join('');
  bindSubListEvents();
}
function bindSubListEvents(){
  const list=$('#aeeSubList');
  list.querySelectorAll('[data-action]').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const idx=parseInt(btn.dataset.idx);
      if(btn.dataset.action==='up') moveSubAgent(idx,-1);
      else if(btn.dataset.action==='down') moveSubAgent(idx,1);
      else if(btn.dataset.action==='remove') removeSubAgent(idx);
    });
  });
  // 拖拽排序
  let dragIdx=null;
  list.querySelectorAll('.aee-item').forEach(item=>{
    item.addEventListener('dragstart',e=>{ dragIdx=parseInt(item.dataset.idx); item.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
    item.addEventListener('dragend',e=>{ item.classList.remove('dragging'); list.querySelectorAll('.aee-item').forEach(x=>x.style.borderBottom=''); });
    item.addEventListener('dragover',e=>{
      e.preventDefault();
      const targetIdx=parseInt(item.dataset.idx);
      if(targetIdx===dragIdx) return;
      item.style.borderBottom='2px solid var(--main)';
    });
    item.addEventListener('dragleave',e=>{ item.style.borderBottom=''; });
    item.addEventListener('drop',e=>{
      e.preventDefault();
      const targetIdx=parseInt(item.dataset.idx);
      item.style.borderBottom='';
      if(dragIdx===null || targetIdx===dragIdx) return;
      const subs=currentAgent.subAgents;
      const [moved]=subs.splice(dragIdx,1);
      subs.splice(targetIdx,0,moved);
      renderSubList(); toast('已调整顺序');
    });
  });
}
function moveSubAgent(idx,dir){
  const subs=currentAgent.subAgents; const newIdx=idx+dir;
  if(newIdx<0 || newIdx>=subs.length) return;
  [subs[idx],subs[newIdx]]=[subs[newIdx],subs[idx]];
  renderSubList();
}
function removeSubAgent(idx){
  const s=currentAgent.subAgents[idx]; if(!s) return;
  currentAgent.subAgents.splice(idx,1); renderSubList(); toast(`已移除「${s.name}」`);
}
function addSubAgent(id){
  const c=candidateSubAgents.find(x=>x.id===id); if(!c) return;
  currentAgent.subAgents.push({...c}); renderSubList(); toast(`已添加「${c.name}」`);
}
function openSubPicker(){
  const used=new Set((currentAgent.subAgents||[]).map(s=>s.id));
  const items=candidateSubAgents.filter(c=>!used.has(c.id));
  openPicker({
    title:'添加子智能体',
    items:items.map(c=>({id:c.id,name:c.name,desc:c.desc,icon:c.icon,iconBg:'#ECFDF5',iconColor:'#10B981'})),
    onSelect:id=>addSubAgent(id)
  });
}

function renderToolList(){
  const list=$('#aeeToolList'); const empty=$('#aeeToolEmpty');
  const tools=currentAgent.atomTools||[];
  $('#aeeToolCount').textContent=tools.length;
  empty.classList.toggle('show', tools.length===0);
  if(tools.length===0){ list.innerHTML=''; return; }
  list.innerHTML=tools.map((t,i)=>{
    const colorMap={purple:['#F5F3FF','#8B5CF6'],blue:['#EFF6FF','#0EA5E9'],green:['#ECFDF5','#10B981'],amber:['#FFFBEB','#F59E0B']};
    const [bg,color]=colorMap[t.color]||['#F8FAFC','#64748B'];
    const params=(t.params||[]).map((p,j)=>`
      <div class="aee-param">
        <input placeholder="参数名" value="${p.key}" data-field="key" data-ti="${i}" data-pi="${j}" />
        <select data-field="type" data-ti="${i}" data-pi="${j}">
          <option value="string" ${p.type==='string'?'selected':''}>字符串</option>
          <option value="number" ${p.type==='number'?'selected':''}>数字</option>
          <option value="boolean" ${p.type==='boolean'?'selected':''}>布尔</option>
        </select>
        <input placeholder="参数值" value="${p.value}" data-field="value" data-ti="${i}" data-pi="${j}" />
        <button class="aee-param-rm" data-action="rm-param" data-ti="${i}" data-pi="${j}" title="删除参数">✕</button>
      </div>
    `).join('');
    return `
    <div class="aee-tool" data-idx="${i}">
      <div class="aee-tool-head">
        <div class="aee-tool-ic" style="background:${bg};color:${color}">${t.icon||'🔧'}</div>
        <div class="aee-tool-info">
          <div class="aee-tool-name">${t.name}</div>
          <div class="aee-tool-desc">${t.desc||''}</div>
        </div>
        <button class="aee-tool-rm" data-action="rm-tool" data-idx="${i}" title="移除工具">✕</button>
      </div>
      <div class="aee-params-title">参数配置</div>
      <div class="aee-params">${params}</div>
      <button class="aee-add-param" data-action="add-param" data-idx="${i}">＋ 添加参数</button>
    </div>`;
  }).join('');
  bindToolListEvents();
}
function bindToolListEvents(){
  const list=$('#aeeToolList');
  list.querySelectorAll('[data-action]').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      if(btn.dataset.action==='rm-tool') removeAtomTool(parseInt(btn.dataset.idx));
      else if(btn.dataset.action==='add-param') addToolParam(parseInt(btn.dataset.idx));
      else if(btn.dataset.action==='rm-param') removeToolParam(parseInt(btn.dataset.ti),parseInt(btn.dataset.pi));
    });
  });
  list.querySelectorAll('.aee-param input, .aee-param select').forEach(el=>{
    el.addEventListener('input',e=>{
      const ti=parseInt(el.dataset.ti); const pi=parseInt(el.dataset.pi);
      const field=el.dataset.field;
      updateToolParam(ti,pi,field,el.value);
    });
  });
}
function addAtomTool(toolName){
  const pool=getCandidateAtomTools();
  const t=pool.find(x=>x.name===toolName); if(!t) return;
  currentAgent.atomTools.push({
    name:t.name, icon:t.icon, color:t.color, desc:t.desc,
    params:getDefaultParams(t.name)
  });
  renderToolList(); toast(`已添加「${t.name}」`);
}
function removeAtomTool(idx){
  const t=currentAgent.atomTools[idx]; if(!t) return;
  currentAgent.atomTools.splice(idx,1); renderToolList(); toast(`已移除「${t.name}」`);
}
function addToolParam(toolIdx){
  const t=currentAgent.atomTools[toolIdx]; if(!t) return;
  if(!t.params) t.params=[];
  t.params.push({key:'',value:'',type:'string',desc:''});
  renderToolList();
}
function removeToolParam(toolIdx,paramIdx){
  const t=currentAgent.atomTools[toolIdx]; if(!t||!t.params) return;
  t.params.splice(paramIdx,1); renderToolList();
}
function updateToolParam(toolIdx,paramIdx,field,value){
  const t=currentAgent.atomTools[toolIdx]; if(!t||!t.params) return;
  t.params[paramIdx][field]=value;
}
function openToolPicker(){
  const used=new Set((currentAgent.atomTools||[]).map(t=>t.name));
  const items=getCandidateAtomTools().filter(t=>!used.has(t.name));
  openPicker({
    title:'添加原子工具',
    items:items.map(t=>{
      const colorMap={purple:['#F5F3FF','#8B5CF6'],blue:['#EFF6FF','#0EA5E9'],green:['#ECFDF5','#10B981'],amber:['#FFFBEB','#F59E0B']};
      const [bg,color]=colorMap[t.color]||['#F8FAFC','#64748B'];
      return {id:t.name,name:t.name,desc:t.desc+' · '+t.group,icon:t.icon,iconBg:bg,iconColor:color};
    }),
    onSelect:id=>addAtomTool(id)
  });
}

// 通用选择弹窗
function openPicker({title,items,onSelect}){
  const mask=document.createElement('div'); mask.className='aee-picker-mask';
  const searchId='aeePickerSearch_'+Date.now();
  mask.innerHTML=`
    <div class="aee-picker">
      <div class="aee-picker-head"><h3>${title}</h3><button class="aee-picker-close">✕</button></div>
      <div class="aee-picker-search"><input id="${searchId}" placeholder="搜索…" /></div>
      <div class="aee-picker-body"></div>
      <div class="aee-picker-foot"><button class="aee-btn ghost picker-cancel">取消</button></div>
    </div>`;
  document.body.appendChild(mask);
  const body=mask.querySelector('.aee-picker-body');
  function render(filter=''){
    const q=filter.trim().toLowerCase();
    const list=items.filter(it=>!q || it.name.toLowerCase().includes(q) || (it.desc||'').toLowerCase().includes(q));
    body.innerHTML=list.length
      ? list.map(it=>`
        <div class="aee-picker-item" data-id="${it.id}">
          <div class="pi-ic" style="background:${it.iconBg};color:${it.iconColor}">${it.icon}</div>
          <div class="pi-info"><div class="pi-name">${it.name}</div><div class="pi-desc">${it.desc||''}</div></div>
        </div>`).join('')
      : '<div class="empty-tip">无匹配项</div>';
    body.querySelectorAll('.aee-picker-item').forEach(el=>{
      el.addEventListener('click',()=>{ onSelect(el.dataset.id); close(); });
    });
  }
  function close(){ mask.classList.remove('show'); setTimeout(()=>mask.remove(),180); }
  mask.querySelector('.aee-picker-close').addEventListener('click',close);
  mask.querySelector('.picker-cancel').addEventListener('click',close);
  mask.addEventListener('click',e=>{ if(e.target===mask) close(); });
  $('#'+searchId).addEventListener('input',e=>render(e.target.value));
  render();
  requestAnimationFrame(()=>mask.classList.add('show'));
}

// 保存 / 取消 / 返回
function saveAgentEdit(){
  const a=currentAgent;
  a.name=$('#aeeName').value.trim()||a.name;
  a.icon=$('#aeeIcon').value.trim()||a.icon;
  a.cat=$('#aeeCat').value;
  a.desc=$('#aeeDesc').value.trim()||a.desc;
  a.tools=(a.atomTools||[]).length;
  // 同步到工作台的展示
  $('#aibNameText').textContent=a.name;
  $('#aibAvatar').textContent=a.icon;
  // 如果当前智能体在 switchData.mine 中，也同步一份
  const sa=switchData.mine.find(x=>x.id===a.id);
  if(sa){ sa.name=a.name; sa.icon=a.icon; sa.cat=a.cat; sa.desc=a.desc; sa.tools=a.tools; }
  backToWorkbench(); toast('已保存智能体配置');
}
function cancelAgentEdit(){
  if(agentEditDraft){
    Object.assign(currentAgent,JSON.parse(JSON.stringify(agentEditDraft)));
    agentEditDraft=null;
  }
  backToWorkbench();
}
function backToWorkbench(){ switchPage('workbench'); }

// 绑定编辑页事件
$('#aeeBackBtn').addEventListener('click',cancelAgentEdit);
$('#aeeCancelBtn').addEventListener('click',cancelAgentEdit);
$('#aeeSaveBtn').addEventListener('click',saveAgentEdit);
$('#aeeAddSubBtn').addEventListener('click',openSubPicker);
$('#aeeAddToolBtn').addEventListener('click',openToolPicker);

// 初始化默认当前智能体的子智能体/原子工具（仅针对默认助手 zhidi）
function initCurrentAgentConfig(){
  ensureAgentEditState();
  if(currentAgent.id!=='zhidi') return;
  if(currentAgent.subAgents.length===0){
    currentAgent.subAgents=[
      {...candidateSubAgents[0]},{...candidateSubAgents[2]}
    ];
  }
  if(currentAgent.atomTools.length===0){
    currentAgent.atomTools=[
      {name:'缓冲区分析',icon:'🎯',color:'blue',desc:'为点、线、面要素创建指定距离的缓冲区',params:getDefaultParams('缓冲区分析')},
      {name:'遥感图斑',icon:'🛰️',color:'purple',desc:'自动识别遥感影像中的地物图斑',params:getDefaultParams('遥感图斑')},
      {name:'坐标转换',icon:'🔄',color:'green',desc:'支持主流坐标系互转',params:getDefaultParams('坐标转换')},
    ];
    currentAgent.tools=currentAgent.atomTools.length;
  }
}
initCurrentAgentConfig();


// ============ 任务进度监控页面 ============
const taskData = [
  {id:1, name:'AI地物分类 - 鹤壁识别建筑获取', cat:'AI引擎', status:'running', progress:67, pctText:'67%', eta:'~3分钟', start:'2024-08-01 10:23', icon:'🏗️', iconBg:'#8B5CF6', sessionId:1},
  {id:2, name:'左滩廊道分析 - 土壤侵蚀模拟', cat:'空间分析', status:'running', progress:34, pctText:'34%', eta:'~12分钟', start:'2024-08-01 09:45', icon:'📐', iconBg:'#0EA5E9', sessionId:2},
  {id:3, name:'影像正射纠正 - 2024Z卫影像集', cat:'影像处理', status:'done', progress:100, pctText:'已完成', eta:'—', start:'2024-07-31 14:20', end:'2024-07-31 14:48', icon:'🛰️', iconBg:'#10B981', sessionId:3},
  {id:4, name:'用地合规审查 - 企业地块违规研判', cat:'地理编码', status:'queued', progress:0, pctText:'排队中', eta:'等待…', start:'—', icon:'✅', iconBg:'#F59E0B', sessionId:4},
  {id:5, name:'DEM高程分析 - 山体坡度', cat:'地形分析', status:'failed', progress:72, pctText:'失败', eta:'—', start:'2024-07-30 16:10', failMsg:'输入数据格式不兼容', icon:'⛰️', iconBg:'#EF4444', sessionId:5},
];

let taskStatsData={running:3, queued:8, done:156, failed:2};

function renderTaskStats(){
  $('#taskStats').innerHTML=`
    <div class="stat-card"><div class="sc-icon blue">🔄</div><div><div class="sc-num">${taskStatsData.running}</div><div class="sc-label">运行中</div></div></div>
    <div class="stat-card"><div class="sc-icon amber">⏳</div><div><div class="sc-num">${taskStatsData.queued}</div><div class="sc-label">排队中</div></div></div>
    <div class="stat-card"><div class="sc-icon green">✓</div><div><div class="sc-num">${taskStatsData.done}</div><div class="sc-label">已完成</div></div></div>
    <div class="stat-card"><div class="sc-icon red">✕</div><div><div class="sc-num">${taskStatsData.failed}</div><div class="sc-label">失败</div></div></div>`;
}

function renderTaskTable(data){
  const c=$('#taskTableBody');
  if(!data.length){ c.innerHTML='<div style="color:#52525B;text-align:center;padding:40px;">无任务数据</div>'; return; }
  c.innerHTML=data.map(t=>{
    const stMap={running:'running', queued:'queued', done:'done', failed:'failed'};
    const stLabel={running:'运行中', queued:'排队中', done:'已完成', failed:'失败'};
    const barColor={running:'blue', queued:'amber', done:'green', failed:'red'};
    return `<div class="task-row">
      <input class="tr-check" type="checkbox" />
      <div class="tr-name">
        <div class="tn-icon" style="background:${t.iconBg}20;color:${t.iconBg}">${t.icon}</div>
        <div><div class="tn-text">${t.name}</div><div class="tn-sub">${t.start}</div></div>
      </div>
      <div class="tr-cat">${t.cat}</div>
      <div><span class="tr-status ${stMap[t.status]}"><span class="st-dot"></span> ${stLabel[t.status]}</span></div>
      <div class="tr-progress">
        <div class="tp-bar"><div class="tp-fill ${barColor[t.status]}" style="width:${t.progress}%"></div></div>
        <span class="tp-pct">${t.pctText}</span>
      </div>
      <div class="tr-time">${t.failMsg?`<span style="color:#F87171">${t.failMsg}</span>`:t.eta}</div>
      <div class="tr-acts">
        <div class="tr-act" title="查看详情">👁</div>
        <div class="tr-act" title="关联会话" onclick="jumpToSession(${t.sessionId})">💬</div>
        <div class="tr-act" title="更多">⋯</div>
      </div>
    </div>`;
  }).join('');
}

function jumpToSession(sid){ switchPage('sess'); toast(`已跳转到关联会话`); }

function filterTasks(){
  const q=($('#taskSearchInput').value||'').trim().toLowerCase();
  const activeTab=document.querySelector('.task-tab.active')?.dataset.status||'all';
  let filtered=[...taskData];
  if(activeTab!=='all') filtered=filtered.filter(t=>t.status===activeTab);
  if(q) filtered=filtered.filter(t=>t.name.toLowerCase().includes(q));
  renderTaskTable(filtered);
}

// Tab 切换
document.querySelectorAll('.task-tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.task-tab').forEach(x=>x.classList.remove('active'));
    tab.classList.add('active');
    filterTasks();
  });
});
const taskSearchInput=$('#taskSearchInput');
if(taskSearchInput) taskSearchInput.addEventListener('input', filterTasks);

// 模拟实时进度更新
let taskTimer=null;
function refreshTasks(){
  taskData.forEach(t=>{
    if(t.status==='running'&&t.progress<100){
      t.progress=Math.min(100, t.progress+Math.floor(Math.random()*5)+1);
      t.pctText=t.progress+'%';
      if(t.progress>=100){ t.status='done'; t.pctText='已完成'; t.eta='—'; taskStatsData.running--; taskStatsData.done++; }
    }
  });
  renderTaskStats();
  filterTasks();
  toast('任务状态已刷新');
}

// 当前结构未接入独立任务页，因此不覆盖全局 switchPage。
// 后续恢复任务页时，应在 core.js 的页面注册表中显式接入并在离开页面时清理 taskTimer。


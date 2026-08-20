// ============ 知识库管理 ============
const kbCategories = [
  {id:'new', icon:'➕', name:'新建主题', count:0, isNew:true},
  {id:'law', icon:'⚖️', name:'法律法规', count:12},
  {id:'doc', icon:'📄', name:'党中央国务院文件', count:8},
  {id:'equip', icon:'🏗️', name:'自然资源装备', count:5},
  {id:'plan', icon:'📐', name:'国土空间规划', count:15},
  {id:'land-expro', icon:'🏘️', name:'土地征收', count:6},
  {id:'construct', icon:'🏢', name:'建设用地', count:9},
  {id:'protect', icon:'🌾', name:'耕地保护', count:11},
  {id:'rural', icon:'🏡', name:'农村用地', count:4},
  {id:'integrate', icon:'🔗', name:'土地综合整治', count:7},
  {id:'eco', icon:'🌿', name:'生态修复', count:10},
  {id:'geo', icon:'⛏️', name:'地质矿产管理', count:6},
  {id:'enforce', icon:'🛡️', name:'自然资源执法', count:8},
  {id:'estate', icon:'📋', name:'不动产登记', count:5},
  {id:'mine-plan', icon:'📁', name:'矿产资源规划M01', count:3},
  {id:'test', icon:'🧪', name:'测试', count:2},
  {id:'fusion', icon:'🔬', name:'知识库融合测试', count:1},
  {id:'company', icon:'💾', name:'公司版数据库', count:4},
  {id:'api', icon:'🔌', name:'数据接口', count:3},
  {id:'consult', icon:'📂', name:'全疆土地综合管…咨询中心', count:2},
];

// 知识库数据（按分类组织）
const kbItemsByCat = {
  law: [
    {icon:'📄',name:'CS',time:'2025-05-11 17:12:19',files:13},
    {icon:'📄',name:'湛江自然资源局',time:'2025-04-02 16:36:53',files:8},
    {icon:'📄',name:'1',time:'2026-03-20 17:23:51',files:5},
    {icon:'📄',name:'测试',time:'2025-12-04 16:57:34',files:12},
    {icon:'📄',name:'test',time:'2025-11-28 12:00:01',files:36},
    {icon:'📄',name:'中华人民共和国法律汇编',time:'2025-09-11 11:40:49',files:5},
    {icon:'📄',name:'咸阳测试',time:'2025-08-18 17:49:55',files:6},
    {icon:'📄',name:'测试湖南批量2',time:'2025-08-10 15:46:41',files:51},
    {icon:'📄',name:'测试湖南批量',time:'2025-08-05 10:45:56',files:63},
    {icon:'📄',name:'test融合',time:'2025-07-01 10:51:32',files:2},
    {icon:'📄',name:'土地利用管理',time:'2025-04-03 16:33:50',files:0},
    {icon:'📄',name:'自然资源常用法律法规',time:'2025-04-03 15:59:01',files:0},
    {icon:'📄',name:'民法典',time:'2025-03-25 15:56:59',files:0},
    {icon:'📄',name:'自然自然部令',time:'2025-03-24 15:36:59',files:0},
  ],
  plan: [
    {icon:'📄',name:'国土空间总体规划（市级）',time:'2026-06-15 10:30:00',files:24},
    {icon:'📄',name:'详细规划编制指南',time:'2026-05-20 14:22:10',files:18},
    {icon:'📄',name:'城镇开发边界划定规范',time:'2026-04-10 09:15:33',files:31},
    {icon:'📄',name:'村庄规划技术要点',time:'2026-03-05 16:40:00',files:15},
    {icon:'📄',name:'双评价技术规程',time:'2026-02-18 11:20:45',files:42},
    {icon:'📄',name:'三区三线划定成果',time:'2026-01-10 08:55:12',files:8},
    {icon:'📄',name:'规划用地用海分类指南',time:'2025-12-20 15:30:00',files:6},
  ],
  protect: [
    {icon:'📄',name:'永久基本农田保护红线',time:'2026-07-01 09:00:00',files:16},
    {icon:'📄',name:'耕地占补平衡管理办法',time:'2026-06-18 14:30:00',files:11},
    {icon:'📄',name:'高标准农田建设标准',time:'2026-05-25 10:15:20',files:9},
    {icon:'📄',name:'耕地用途管制政策汇编',time:'2026-04-12 16:45:00',files:22},
    {icon:'📄',name:'土地复垦方案审查要点',time:'2026-03-08 11:20:00',files:7},
  ],
  land_expro: [
    {icon:'📄',name:'土地征收程序规范',time:'2026-06-28 09:30:00',files:14},
    {icon:'📄',name:'征地补偿标准（广东省）',time:'2026-05-15 13:20:00',files:8},
    {icon:'📄',name:'征收风险评估指引',time:'2026-04-05 10:00:00',files:5},
  ],
  eco: [
    {icon:'📄',name:'山水林田湖草沙一体化修复',time:'2026-07-10 14:00:00',files:19},
    {icon:'📄',name:'矿山生态修复技术规范',time:'2026-06-01 09:45:00',files:12},
    {icon:'📄',name:'海岸带生态保护修复',time:'2026-05-12 16:30:00',files:7},
  ],
};

// 热门搜索标签
const hotTags = ['人工智能','全国土地综合整治','湖南','人工智能智','1','国土空间规划城市体检评估底图','土地','国土空间规划'];

// 更新通知
const noticeList = [
  {title:'公路工程项目建设用地指标（建标〔2011〕124号）',date:'2026-07-01',valid:'一直有效'},
  {title:'"三区三线"耕地保护目标图斑区间统计情况0723-2',date:'2026-07-08',valid:'1年'},
  {title:'《自然资源部 国家林业和草原局关于做好自然保护区范围及功能分区优化调整前期有关工作的函》（自然资函〔2020〕71号）',date:'',valid:'一直有效'},
];

let currentKbCat = null; // 当前查看的分类
let currentKbCatName = ''; // 当前分类名称

// 渲染分类卡片网格
function renderKbGrid(filterText){
  const q = (filterText||'').toLowerCase();
  const filtered = q ? kbCategories.filter(c => c.name.toLowerCase().includes(q)) : kbCategories;
  $('#kbGrid').innerHTML = filtered.map(c =>
    `<div class="kg-card ${c.isNew?'new-kg':''}" data-cat="${c.id}">
      <div class="kg-icon">${c.icon}</div>
      <div class="kg-name">${c.name}</div>${c.count?`<div class="kg-count">${c.count} 项</div>`:''}
    </div>`
  ).join('');
}

// 渲染热门标签
function renderHotTags(){
  $('#kbHotTags').innerHTML = hotTags.map(t => `<span class="kb-tag" onclick="this.classList.toggle('active');renderKbGrid(this.textContent)">${t}</span>`).join('');
}

// 渲染更新通知
function renderNoticeList(){
  $('#kbNoticeList').innerHTML = noticeList.map(n =>
    `<div class="kbr-item" onclick="toast('查看通知详情（演示）')">
      <div class="kr-title">${n.title}</div>
      <div class="kr-meta">${n.date?`发布时间：${n.date}`:''}${n.valid?`<span>有效期：${n.valid}</span>`:''}</div>
    </div>`
  ).join('');
}

// 打开分类详情页
function openKbCat(id, name){
  currentKbCat = id;
  currentKbCatName = name;
  $('#kbCurrCat').textContent = name;
  $('#kbHome').style.display = 'none';
  $('#kbFilePage').style.display = 'none';
  $('#kbDetail').style.display = 'flex';
  renderKbDetail();
}
window.openKbCategory = openKbCat;

// 返回主页
function showKbHome(){
  currentKbCat = null;
  currentKbCatName = '';
  $('#kbDetail').style.display = 'none';
  $('#kbFilePage').style.display = 'none';
  $('#kbHome').style.display = 'flex';
}
window.showKbHome = showKbHome;

// 返回分类详情页
function showKbDetail(){
  $('#kbFilePage').style.display = 'none';
  $('#kbDetail').style.display = 'flex';
}
window.showKbDetail = showKbDetail;

// 渲染分类内知识库列表
function renderKbDetail(filterText){
  let items = kbItemsByCat[currentKbCat] || [];
  const q = (filterText||'').toLowerCase();
  if(q) items = items.filter(i => i.name.toLowerCase().includes(q));
  $('#kbdGrid').innerHTML = items.length ? items.map((item,idx) =>
    `<div class="kbc-card" data-idx="${idx}">
      <div class="kbc-head"><div class="kbc-icon">${item.icon}</div><div class="kbc-name" title="${item.name}">${item.name}</div></div>
      <div class="kbc-meta"><span>更新时间：${item.time}</span><span>文件数：${item.files}条</span></div>
      <div class="kbc-acts">
        <div class="kbc-act" title="调用/查看" onclick="event.stopPropagation();toast('调用「'+$(this).closest('.kbc-card').querySelector('.kbc-name').textContent+'」')">✏️</div>
        <div class="kbc-act del" title="删除" onclick="event.stopPropagation();if(confirm('确认删除？')){toast('已删除（演示）')}">🗑️</div>
      </div>
    </div>`
  ).join('') : '<div style="grid-column:1/-1;padding:48px;text-align:center;color:var(--t-ph);font-size:14px;">该分类暂无知识库</div>';

  // 点卡片主体进入文件列表页（L3）
  $('#kbdGrid').querySelectorAll('.kbc-card').forEach(card=>{
    card.addEventListener('click', ()=>{
      const name = card.querySelector('.kbc-name').textContent;
      openKbFilePage(name, currentKbCatName);
    });
  });

  // 分页信息
  $('#kbPagination').innerHTML = `<span class="kb-pg-info">${items.length}条/页</span>`;
}

// ============ 知识库文件列表页（L3：点击知识库卡片进入） ============
let currentKbId = null;       // 当前知识库标识（用 name）
let currentKbName = '';
const kbFileState = { q:'', status:'all', page:1, pageSize:10, selected:new Set() };

// 模拟文件数据：按知识库 name 索引（每条含 PDF 预览 Mock 字段）
const kbFilesByKb = {
  'CS': Array.from({length:13},(_,i)=>{
    const n = 10 - i;
    return {
      id:'cs-'+i,
      name:`数据库跨库查询流程 - 副本 (${n})`,
      createTime:'2026-05-11 17:12:'+(19-i).toString().padStart(2,'0'),
      scope:'', pubTime:'', valid:'长期有效', status:'done',
      fileSize: (2.4 + i * 0.3).toFixed(1) + ' MB',
      pages: 6 + i,
      previewUrl:'assets/demo/sample.pdf'
    };
  }).concat([
    // 演示：无效 PDF 地址，用于检查加载失败状态与「重新加载」
    {id:'cs-bad', name:'演示-失效链接文件.pdf', createTime:'2026-05-11 17:00:00', scope:'', pubTime:'', valid:'—', status:'error',
      fileSize:'1.0 MB', pages:0, previewUrl:'assets/demo/not-exist.pdf'}
  ]),
  '湛江自然资源局':[
    {id:'zj-1',name:'湛江市国土空间总体规划（2021-2035年）',createTime:'2026-04-02 16:36:53',scope:'湛江市',pubTime:'',valid:'长期有效',status:'done',fileSize:'18.6 MB',pages:132,previewUrl:'assets/demo/sample.pdf'},
    {id:'zj-2',name:'湛江市生态保护红线划定成果',createTime:'2026-04-02 16:30:12',scope:'湛江市',pubTime:'',valid:'长期有效',status:'done',fileSize:'8.2 MB',pages:45,previewUrl:'assets/demo/sample.pdf'},
    {id:'zj-3',name:'湛江市耕地保护目标责任书',createTime:'2026-04-01 09:15:33',scope:'湛江市',pubTime:'',valid:'3年',status:'pending',fileSize:'2.1 MB',pages:18,previewUrl:'assets/demo/sample.pdf'},
  ],
  '中华人民共和国法律汇编':[
    {id:'law-1',name:'土地管理法（2019修正）',createTime:'2025-09-11 11:40:49',scope:'全国',pubTime:'2019-08-26',valid:'长期有效',status:'done',fileSize:'3.4 MB',pages:28,previewUrl:'assets/demo/sample.pdf'},
    {id:'law-2',name:'城乡规划法',createTime:'2025-09-11 11:35:22',scope:'全国',pubTime:'2007-10-28',valid:'长期有效',status:'done',fileSize:'2.8 MB',pages:22,previewUrl:'assets/demo/sample.pdf'},
  ]
};

function kbFileStatusText(s){ return s==='done'?'解析完成':s==='pending'?'解析中':s==='error'?'解析失败':'未知'; }
function statusClass(s){ return s==='done'?'done':s==='pending'?'pending':'error'; }

function openKbFilePage(kbName, catName){
  currentKbId = kbName;
  currentKbName = kbName;
  kbFileState.q = ''; kbFileState.status='all'; kbFileState.page=1; kbFileState.selected.clear();
  $('#kbFileCurrKb').textContent = kbName;
  $('#kbFileCatLink').textContent = catName || currentKbCatName || '分类';
  $('#kbDetail').style.display = 'none';
  $('#kbFilePage').style.display = 'flex';
  $('#kbFileSearchInput').value = '';
  renderKbFileList();
}
window.openKbFilePage = openKbFilePage;

function renderKbFileList(){
  let files = kbFilesByKb[currentKbId] || [];
  const q = kbFileState.q.toLowerCase();
  if(q) files = files.filter(f => f.name.toLowerCase().includes(q));
  if(kbFileState.status !== 'all') files = files.filter(f => f.status === kbFileState.status);

  const total = files.length;
  const {pageSize} = kbFileState;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  kbFileState.page = Math.min(kbFileState.page, totalPages);
  const start = (kbFileState.page - 1) * pageSize;
  const pageFiles = files.slice(start, start + pageSize);

  const tbody = $('#kbFileTbody');
  tbody.innerHTML = pageFiles.length ? pageFiles.map((f, idx) => {
    const globalIdx = start + idx + 1;
    const checked = kbFileState.selected.has(f.id) ? 'checked' : '';
    return `<tr data-id="${f.id}">
      <td class="kbf-col-check"><input type="checkbox" class="kb-file-check" ${checked}></td>
      <td class="kbf-col-no">${globalIdx}</td>
      <td class="kbf-col-name"><span class="file-ic">📄</span><span title="${f.name}">${f.name}</span></td>
      <td>${f.scope || '-'}</td>
      <td>${f.pubTime || '-'}</td>
      <td>${f.valid || '-'}</td>
      <td class="kbf-col-ops">
        <span class="file-op" data-act="preview">预览</span>
        <span class="file-op primary" data-act="add-chat">添加到对话</span>
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="7" style="text-align:center;padding:48px;color:var(--t-ph);">暂无文件</td></tr>`;

  // 同步全选 checkbox
  $('#kbFileSelectAll').checked = pageFiles.length > 0 && pageFiles.every(f => kbFileState.selected.has(f.id));

  bindKbFileRowEvents();
  renderKbFilePagination(total, totalPages);
}

function renderKbFilePagination(total, totalPages){
  const {page, pageSize} = kbFileState;
  $('#kbFilePagination').innerHTML =
    `<span class="kbf-pg-info">共 ${total} 条</span>`+
    `<select id="kbFilePageSize">`+
      [10,20,50].map(s=>`<option value="${s}" ${s===pageSize?'selected':''}>${s}条/页</option>`).join('')+
    `</select>`+
    `<button class="kbf-pg-btn ${page<=1?'disabled':''}" data-pg="prev">上一页</button>`+
    Array.from({length:totalPages},(_,i)=>i+1).map(p=>
      `<button class="kbf-pg-btn ${p===page?'active':''}" data-pg="${p}">${p}</button>`
    ).join('')+
    `<button class="kbf-pg-btn ${page>=totalPages?'disabled':''}" data-pg="next">下一页</button>`+
    `<span>前往</span><input type="number" class="kbf-pg-input" id="kbFileGoPage" min="1" max="${totalPages}" value="${page}"><span>页</span>`;

  $('#kbFilePageSize').addEventListener('change', e=>{
    kbFileState.pageSize = parseInt(e.target.value,10);
    kbFileState.page = 1;
    renderKbFileList();
  });
  $('#kbFilePagination').querySelectorAll('[data-pg]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(btn.classList.contains('disabled')) return;
      const pg = btn.dataset.pg;
      if(pg==='prev') kbFileState.page--;
      else if(pg==='next') kbFileState.page++;
      else kbFileState.page = parseInt(pg,10);
      renderKbFileList();
    });
  });
  $('#kbFileGoPage').addEventListener('change', e=>{
    const p = parseInt(e.target.value,10);
    if(p>=1 && p<=totalPages){ kbFileState.page = p; renderKbFileList(); }
  });
}

function bindKbFileRowEvents(){
  // 行内复选框
  $('#kbFileTbody').querySelectorAll('.kb-file-check').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      const tr = cb.closest('tr');
      const id = tr.dataset.id;
      if(cb.checked) kbFileState.selected.add(id);
      else kbFileState.selected.delete(id);
      renderKbFileList();
    });
  });
  // 行内操作
  $('#kbFileTbody').querySelectorAll('.file-op').forEach(op=>{
    op.addEventListener('click', ()=>{
      const tr = op.closest('tr');
      const id = tr.dataset.id;
      const name = tr.querySelector('.kbf-col-name span[title]').textContent;
      const act = op.dataset.act;
      if(act==='preview'){
        if(typeof openPdfPreview==='function') openPdfPreview(id);
        else toast('预览「'+name+'」');
      }
      else if(act==='add-chat'){
        // 跳转工作台，并将选中文件作为当前对话上下文
        if(typeof switchPage==='function') switchPage('workbench');
        if(typeof setChatFileRef==='function') setChatFileRef(name);
        addBubble('user','📎 引用文件：'+name);
        addBubble('ai','已将「'+name+'」作为当前对话上下文。你可以直接提问，我会结合该文件内容回答。');
        toast('已将文件添加到对话');
      }
    });
  });
}

function bindKbFileGlobalEvents(){
  $('#kbFileHomeLink').addEventListener('click', showKbHome);
  $('#kbFileCatLink').addEventListener('click', showKbDetail);
  $('#kbFileSearchInput').addEventListener('input', e=>{ kbFileState.q=e.target.value; kbFileState.page=1; renderKbFileList(); });
  $('#kbFileSearchBtn').addEventListener('click', ()=>{ kbFileState.q=$('#kbFileSearchInput').value; kbFileState.page=1; renderKbFileList(); });
  $('#kbFileSelectAll').addEventListener('change', e=>{
    const files = kbFilesByKb[currentKbId] || [];
    const q = kbFileState.q.toLowerCase();
    const filtered = files.filter(f => f.name.toLowerCase().includes(q) && (kbFileState.status==='all' || f.status===kbFileState.status));
    const start = (kbFileState.page-1)*kbFileState.pageSize;
    const pageFiles = filtered.slice(start, start+kbFileState.pageSize);
    pageFiles.forEach(f => e.target.checked ? kbFileState.selected.add(f.id) : kbFileState.selected.delete(f.id));
    renderKbFileList();
  });
}

// 知识库主页搜索
$('#kbSearchInput').addEventListener('input', function(){ renderKbGrid(this.value); });
// 详情页搜索
$('#kbdSearchInput').addEventListener('input', function(){ renderKbDetail(this.value); });

// 详情页筛选按钮
document.querySelectorAll('.kbd-action-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.kbd-action-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    toast(`排序：${btn.textContent}（演示）`);
  });
});

// 初始化知识库页面
renderHotTags();
renderKbGrid();
renderNoticeList();
// 分类卡片点击：事件委托（替代内联 onclick，避免转义陷阱；重渲染后依然有效）
$('#kbGrid').addEventListener('click', e=>{
  const card = e.target.closest('.kg-card');
  if(!card) return;
  const c = kbCategories.find(x=>x.id===card.dataset.cat);
  if(!c) return;
  if(c.isNew){ toast('新建主题（演示）'); return; }
  openKbCategory(c.id, c.name);
});
$('#kbAdvancedSearch').addEventListener('click', ()=>toast('高级检索（演示）'));
$('#kbHomeLink').addEventListener('click', showKbHome);
bindKbFileGlobalEvents();


// ============ 工具中心：数据 + 渲染 ============
const toolCategories = [
  {key:'all', name:'全部工具', ic:'📦', count:0},
  {key:'ai', name:'AI智能翻译', ic:'🤖', count:3},
  {key:'spatial', name:'空间分析', ic:'📐', count:4},
  {key:'data', name:'数据处理', ic:'⚙️', count:3},
  {key:'convert', name:'坐标转换', ic:'🔄', count:2},
  {key:'check', name:'合规检查', ic:'✅', count:1},
  {key:'measure', name:'测量量算', ic:'📏', count:2},
  {key:'edit', name:'要素编辑', ic:'✏️', count:1},
];

const toolGroupsData = [
  {
    key:'remote', label:'遥感影像', dotClass:'ai',
    tools:[
      {name:'建筑合规提取', desc:'基于深度学习自动提取卫星影像中的建筑轮廓，支持多种格式输出', icon:'🏗️', color:'purple', views:'4.2k次使用', stars:'1.8k收藏', badge:'hot', type:'skill',
        functions:['自动识别影像中的建筑轮廓并矢量化','支持多种坐标系与输出格式','可批量处理大范围影像'],
        inputs:[{name:'影像文件',type:'file',desc:'卫星/航拍影像（tif/jpg/png）'},{name:'置信度阈值',type:'number',desc:'提取敏感度，取值范围 0~1'}],
        outputs:[{name:'建筑轮廓',type:'GeoJSON',desc:'建筑多边形矢量数据'},{name:'统计报告',type:'text',desc:'数量与总面积汇总'}]},
      {name:'遥感图斑', desc:'自动识别遥感影像中的地物图斑，生成矢量数据，支持多类地物分类', icon:'🛰️', color:'purple', views:'3.7k次使用', stars:'1.5k收藏', type:'skill',
        functions:['多类地物图斑自动分割','生成矢量图斑边界','支持耕地/林地/建设用地分类'],
        inputs:[{name:'遥感影像',type:'file',desc:'多波段遥感影像'},{name:'地物类别',type:'enum',desc:'需要识别的地物类型'}],
        outputs:[{name:'图斑矢量',type:'GeoJSON',desc:'分类后的图斑边界'},{name:'分类统计',type:'table',desc:'各地类面积占比'}]},
      {name:'土地租用分类', desc:'AI 自动对土地用途进行分类，支持耕地、林地、建设用地等类别识别', icon:'🗺️', color:'purple', views:'1.2k次使用', stars:'923收藏', type:'skill',
        functions:['按用地性质自动分类','识别违规占用与用途变更','输出用地分类专题图'],
        inputs:[{name:'用地数据',type:'file',desc:'现状用地矢量或影像'}],
        outputs:[{name:'分类结果',type:'GeoJSON',desc:'带用地类型的地块'},{name:'变更清单',type:'table',desc:'用途变更明细'}]},
      {name:'变化检测', desc:'对比时序遥感影像，自动识别地表变化区域，生成变化报告', icon:'🔍', color:'purple', views:'2.0k次使用', stars:'900收藏', badge:'new', type:'skill',
        functions:['双时相影像比对','提取变化区域轮廓','生成变化检测报告'],
        inputs:[{name:'前时相影像',type:'file',desc:'历史影像'},{name:'后时相影像',type:'file',desc:'最新影像'}],
        outputs:[{name:'变化区域',type:'GeoJSON',desc:'变化范围矢量'},{name:'变化报告',type:'text',desc:'变化类型与面积'}]},
    ]
  },
  {
    key:'spatial', label:'空间分析', dotClass:'spatial',
    tools:[
      {name:'缓冲区分析', desc:'为点、线、面要素创建指定距离的缓冲区，支持多级缓冲叠加', icon:'🎯', color:'blue', views:'5.1k次使用', stars:'3.1k收藏', type:'skill',
        functions:['按距离生成缓冲区','支持多级同心缓冲','缓冲结果可用于叠加分析'],
        inputs:[{name:'源要素',type:'GeoJSON',desc:'点/线/面要素'},{name:'缓冲距离',type:'number',desc:'单位：米'}],
        outputs:[{name:'缓冲面',type:'GeoJSON',desc:'缓冲区多边形'}]},
      {name:'叠置分析', desc:'多图层空间叠置运算，支持相交、合并、擦除等多种空间关系', icon:'📚', color:'blue', views:'3.8k次使用', stars:'2.1k收藏', badge:'new', type:'skill',
        functions:['图层相交/合并/擦除','属性字段自动继承','支持多图层级联'],
        inputs:[{name:'图层A',type:'GeoJSON',desc:'输入图层'},{name:'图层B',type:'GeoJSON',desc:'叠加图层'},{name:'叠加方式',type:'enum',desc:'intersect/union/erase'}],
        outputs:[{name:'结果图层',type:'GeoJSON',desc:'叠加后要素'}]},
      {name:'网络分析', desc:'基于路网数据的最短路径、服务范围、可达性分析', icon:'🔗', color:'blue', views:'2.6k次使用', stars:'800收藏', type:'skill',
        functions:['最短路径计算','服务区/可达范围','OD 成本矩阵'],
        inputs:[{name:'路网',type:'GeoJSON',desc:'带拓扑的路网'},{name:'起点/终点',type:'GeoJSON',desc:'站点或坐标'}],
        outputs:[{name:'路径',type:'GeoJSON',desc:'最优路线'},{name:'成本矩阵',type:'table',desc:'通行成本'}]},
      {name:'视域分析', desc:'计算观察点的可视范围，适用于选址评估与景观规划', icon:'👁️', color:'blue', views:'1.5k次使用', stars:'700收藏', type:'skill',
        functions:['观察点可视域计算','通视性判定','结合 DEM 高程'],
        inputs:[{name:'DEM',type:'file',desc:'数字高程模型'},{name:'观察点',type:'GeoJSON',desc:'观测位置'}],
        outputs:[{name:'可视域',type:'GeoJSON',desc:'可见范围多边形'}]},
    ]
  },
  {
    key:'data', label:'数据处理', dotClass:'data',
    tools:[
      {name:'坐标转换', desc:'支持WGS84、CGCS2000、KML、GDB等主流坐标系互转', icon:'🔄', color:'green', views:'8.3k次使用', stars:'4.2k收藏', type:'skill',
        functions:['多坐标系互转','批量坐标点转换','支持文件级转换'],
        inputs:[{name:'源坐标',type:'coordinate',desc:'经纬度/平面坐标'},{name:'目标坐标系',type:'enum',desc:'CGCS2000/WGS84 等'}],
        outputs:[{name:'转换后坐标',type:'coordinate',desc:'目标系坐标'}]},
      {name:'坐标转换GEO', desc:'WGS84、BJ02、GCJ02、CGCS2000等多源坐标批量转换', icon:'🌐', color:'green', views:'4.5k次使用', stars:'2.0k收藏', type:'skill',
        functions:['多源坐标批量互转','GCJ02 偏移纠偏','支持大量点云'],
        inputs:[{name:'坐标集',type:'file',desc:'含坐标的 csv/geojson'},{name:'目标系',type:'enum',desc:'目标坐标系'}],
        outputs:[{name:'结果集',type:'file',desc:'转换后坐标文件'}]},
      {name:'数据裁剪', desc:'按范围/行政区划/自定义多边形裁剪矢量与栅格数据集', icon:'✂️', color:'green', views:'3.2k次使用', stars:'1.4k收藏', type:'skill',
        functions:['按任意范围裁剪','保留属性完整性','矢量/栅格通用'],
        inputs:[{name:'数据集',type:'file',desc:'待裁剪矢量/栅格'},{name:'裁剪范围',type:'GeoJSON',desc:'裁剪多边形'}],
        outputs:[{name:'裁剪结果',type:'file',desc:'裁剪后数据'}]},
      {name:'属性表处理', desc:'字段计算、属性筛选、统计汇总、表格导出等常用操作', icon:'📋', color:'green', views:'2.8k次使用', stars:'1.1k收藏', type:'skill',
        functions:['字段计算与新增','条件筛选','统计汇总与导出'],
        inputs:[{name:'属性表',type:'table',desc:'要素属性数据'}],
        outputs:[{name:'处理结果',type:'table',desc:'计算/筛选后表格'}]},
    ]
  }
];

// 已添加原子工具列表（管理面板与管理弹窗共用此数据源）
// source 表示工具来源：square=从原子工具广场获取，mine=用户上传/接入/自定义。
let atomTools = [
  {id:'a1', name:'建筑合规提取 Skill', type:'skill', source:'square', time:'2026-08-01 14:32', enabled:true},
  {id:'a2', name:'遥感图斑识别 Skill', type:'skill', source:'square', time:'2026-08-02 09:15', enabled:true},
  {id:'a3', name:'高德地图 MCP',       type:'mcp', source:'mine', time:'2026-08-03 16:48', configStatus:'ok', enabled:true,
    configJson:'{\n  "mcpServers": {\n    "amap": {\n      "command": "npx",\n      "args": ["-y", "@amap/mcp-server"],\n      "env": { "AMAP_KEY": "your_key" }\n    }\n  }\n}'},
  {id:'a4', name:'坐标转换 Skill',     type:'skill', source:'square', time:'2026-08-05 11:20', enabled:false},
  {id:'a5', name:'土地租用分类 Skill', type:'skill', source:'square', time:'2026-08-06 18:03', enabled:true},
  {id:'a6', name:'PostGIS 数据库连接 MCP', type:'mcp', source:'mine', time:'2026-08-07 10:55', configStatus:'fail', enabled:false,
    configJson:'{\n  "mcpServers": {\n    "postgis": {\n      "url": "http://localhost:3000/mcp",\n      "transport": "streamable-http"\n    }\n  }\n}'},
  {id:'a7', name:'变化检测 Skill',     type:'skill', source:'square', time:'2026-08-08 20:41', enabled:true},
  {id:'a8', name:'自定义翻译 Skill',   type:'skill', source:'mine', time:'2026-08-09 11:20', enabled:true},
  {id:'a9', name:'本地文件服务 MCP',    type:'mcp', source:'mine', time:'2026-08-10 09:00', configStatus:'ok', enabled:true,
    configJson:'{\n  "mcpServers": {\n    "local-fs": {\n      "command": "npx",\n      "args": ["-y", "@local/fs-mcp"]\n    }\n  }\n}'},
];

// 卡片是否已加入我的列表（按名称匹配，兼容带 " Skill" 后缀的条目）
function isAtomAdded(name){
  return atomTools.some(x => x.name === name || x.name.startsWith(name + ' '));
}
// 将工具加入我的列表（默认注册为 Skill 类型）
function addToolToMyList(name){
  if(isAtomAdded(name)) return;
  const d = new Date(), p = n => String(n).padStart(2,'0');
  atomTools.push({
    id: 'c' + Date.now() + Math.floor(Math.random()*1000),
    name, type:'skill', source:'square',
    time: `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`,
    enabled:true
  });
}

// 渲染左侧分类导航（已移除）

// 渲染分组卡片
function renderToolGroups(groups){
  const container=$('#toolGroupsContainer');
  if(!groups.length){ container.innerHTML='<div style="color:var(--t-ph);padding:40px;text-align:center;">没有匹配的工具</div>'; return; }
  container.innerHTML=groups.map(g=>`
    <div class="tool-group-title">
      <span class="tgt-dot ${g.dotClass}"></span>
      ${g.label}
      <span class="tgt-count">${g.tools.length}</span>
    </div>
    <div class="tool-cards-grid">
      ${g.tools.map(t=>`
        <div class="tool-card-new" data-tool="${t.name}">
          ${t.badge?`<div class="tc-badge ${t.badge}"><span>${t.badge==='hot'?'HOT':'NEW'}</span></div>`:''}
          <div class="tcn-body">
            <div class="tcn-icon ${t.color}">${t.icon}</div>
            <div class="tcn-info">
              <div class="tcn-name">${t.name}</div>
              <div class="tcn-desc">${t.desc}</div>
            </div>
          </div>
          <div class="tcn-meta">
            <span class="tcn-stat">👁 ${t.views}</span>
            <span class="tcn-stat">⭐ ${t.stars}</span>
            <button class="tcn-add ${isAtomAdded(t.name)?'added':''}" data-tool="${t.name}">${isAtomAdded(t.name)?'✓ 已添加':'＋ 添加'}</button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
  // 绑定添加 / 已添加 按钮
  container.querySelectorAll('.tcn-add').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const name = btn.dataset.tool;
      if(isAtomAdded(name)){
        // 已添加：跳转管理面板统一管理
        openManagePopup();
        return;
      }
      addToolToMyList(name);
      btn.textContent = '✓ 已添加';
      btn.classList.add('added');
      toast(`已添加「${name}」到我的原子工具`);
    });
  });
  // 绑定卡片点击 → 进入详情页（忽略按钮自身点击，按钮已 stopPropagation）
  container.querySelectorAll('.tool-card-new').forEach(card=>{
    card.addEventListener('click', (e)=>{
      if(e.target.closest('.tcn-add')) return;
      openToolDetail(card.dataset.tool);
    });
  });
}

// 工具广场检索状态：关键词、业务类型和工具类型组合生效。
let toolBusinessFilter = 'all';
let toolTypeFilter = 'all';

function applyToolFilters(){
  const keyword = $('#toolSearchInput').value.trim().toLowerCase();
  const groups = toolGroupsData
    .filter(group => toolBusinessFilter === 'all' || group.key === toolBusinessFilter)
    .map(group => ({
      ...group,
      tools: group.tools.filter(tool => {
        const keywordOk = !keyword
          || tool.name.toLowerCase().includes(keyword)
          || tool.desc.toLowerCase().includes(keyword);
        const typeOk = toolTypeFilter === 'all' || tool.type === toolTypeFilter;
        return keywordOk && typeOk;
      })
    }))
    .filter(group => group.tools.length > 0);
  renderToolGroups(groups);
}

// 同步工具广场卡片状态：管理面板增删/变更后调用，
// 让卡片「已添加 / 添加」按钮按最新 atomTools 回写（仅对广场来源的工具生效）
function syncToolCards(){
  applyToolFilters();
}

// 搜索
$('#toolSearchInput').addEventListener('input', applyToolFilters);

// 业务类型筛选
$('#toolBusinessFilters').addEventListener('click', event=>{
  const tag=event.target.closest('[data-business]');
  if(!tag) return;
  toolBusinessFilter=tag.dataset.business;
  $('#toolBusinessFilters').querySelectorAll('.tf-tag').forEach(item=>item.classList.toggle('active',item===tag));
  applyToolFilters();
});

// 工具类型筛选
$('#toolTypeFilters').addEventListener('click', event=>{
  const tag=event.target.closest('[data-type]');
  if(!tag) return;
  toolTypeFilter=tag.dataset.type;
  $('#toolTypeFilters').querySelectorAll('.tf-tag').forEach(item=>item.classList.toggle('active',item===tag));
  applyToolFilters();
});

// 初始化工具页
applyToolFilters();

// ============ 上传原子工具弹窗 ============
const upMask = $('#uploadMask');
const upPop = $('#uploadPop');

function openUploadPopup(){
  upMask.classList.add('show');
}
function closeUploadPopup(){
  upMask.classList.remove('show');
}

// 打开弹窗
$('#btnUploadAtom').addEventListener('click', openUploadPopup);

// 关闭：遮罩点击 + 关闭按钮 + 取消按钮
$('#uploadClose').addEventListener('click', closeUploadPopup);
upMask.addEventListener('click', e => { if(e.target===upMask) closeUploadPopup(); });
$('#upCancelBtn').addEventListener('click', closeUploadPopup);
$('#upCancelMcpBtn').addEventListener('click', closeUploadPopup);

// Tab 切换
document.querySelectorAll('.up-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.up-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.up-panel').forEach(p => p.classList.remove('show'));
    tab.classList.add('active');
    const panel = $('#upPanel' + (tab.dataset.tab==='skill'?'Skill':'Mcp'));
    if(panel) panel.classList.add('show');
  });
});

// Skill 拖放区点击 → 触发文件选择
$('#upDropzone').addEventListener('click', () => {
  $('#upSelectFileBtn').click();
});

// 选择文件上传（演示）
$('#upSelectFileBtn').addEventListener('click', () => {
  toast('选择 Skill 文件上传（演示）');
});

// 保存 MCP 配置（演示）
$('#upSaveMcpBtn').addEventListener('click', () => {
  const json = $('#upMcpJson').value.trim();
  if(!json){ toast('请填写 mcp.json 配置内容'); return; }
  try{ JSON.parse(json); }
  catch(e){ toast('JSON 格式有误，请检查'); return; }
  toast('MCP 配置已保存（演示）');
  closeUploadPopup();
});

// ============ 管理原子工具弹窗 ============
const mgMask = $('#manageMask');
const mgList = $('#mgList');
let mgKeyword = '';
let mgSource = 'all';
let mgType = 'all';
let mgStatus = 'all';

function renderManageList(){
  const kw = mgKeyword.trim().toLowerCase();
  const rows = atomTools.filter(t => {
    const sourceOk = mgSource === 'all' || t.source === mgSource;
    const typeOk = mgType === 'all' || t.type === mgType;
    const statusOk = mgStatus === 'all'
      || (mgStatus === 'enabled' && t.enabled !== false)
      || (mgStatus === 'disabled' && t.enabled === false);
    // 关键词搜索
    const typeLabel = t.type === 'skill' ? 'skill' : 'mcp';
    const sourceLabel = t.source === 'mine' ? '我的工具' : '广场工具';
    const kwOk = !kw
      || t.name.toLowerCase().includes(kw)
      || typeLabel.includes(kw)
      || sourceLabel.includes(kw);
    return sourceOk && typeOk && statusOk && kwOk;
  });
  $('#mgTotal').textContent = rows.length;
  if(!rows.length){
    mgList.innerHTML = `<div class="mg-empty">没有符合当前筛选条件的原子工具</div>`;
  } else {
    mgList.innerHTML = rows.map(t => {
      const enabled = t.enabled !== false;
      // 管理列表已单独展示工具类型，名称中不重复显示 Skill / MCP 后缀。
      const displayName = t.name.replace(/\s+(Skill|MCP)$/i, '');
      const configDot = t.type === 'mcp'
        ? `<span class="mg-config-dot ${t.configStatus}" title="${t.configStatus==='ok'?'MCP 配置成功':'MCP 配置失败'}" aria-label="${t.configStatus==='ok'?'MCP 配置成功':'MCP 配置失败'}"></span>`
        : '';
      let actions;
      if(t.type === 'skill'){
        const on = enabled;
        actions = `
          <button class="mg-act toggle ${on?'on':'off'}" data-id="${t.id}">${on?'禁用':'启用'}</button>
          <button class="mg-act del" data-id="${t.id}">删除</button>`;
      } else {
        const on = enabled;
        actions = `
          <button class="mg-act edit" data-id="${t.id}">编辑</button>
          <button class="mg-act toggle ${on?'on':'off'}" data-id="${t.id}">${on?'禁用':'启用'}</button>
          <button class="mg-act del" data-id="${t.id}">删除</button>`;
      }
      return `
      <div class="mg-row" data-id="${t.id}">
        <label class="mg-cell-check-wrap"><input type="checkbox" class="mg-row-check" data-id="${t.id}" /></label>
        <div class="mg-cell-name" title="${displayName}"><span>${displayName}</span>${configDot}</div>
        <div class="mg-cell-type"><span class="mg-tag ${t.type}">${t.type==='skill'?'Skill':'MCP'}</span></div>
        <div class="mg-cell-actions">${actions}</div>
      </div>`;
    }).join('');
  }
  syncBatchUI();
}

// 同步批量删除按钮状态
function syncBatchUI(){
  const checks = mgList.querySelectorAll('.mg-row-check');
  const checked = mgList.querySelectorAll('.mg-row-check:checked');
  $('#mgSelCount').textContent = checked.length;
  $('#mgDisCount').textContent = checked.length;
  $('#mgBatchDelete').disabled = checked.length === 0;
  $('#mgBatchDisable').disabled = checked.length === 0;
  $('#mgCheckAll').checked = checks.length > 0 && checked.length === checks.length;
  // 行高亮
  mgList.querySelectorAll('.mg-row').forEach(row=>{
    const cb = row.querySelector('.mg-row-check');
    row.classList.toggle('selected', cb && cb.checked);
  });
}

function openManagePopup(){
  mgSource = 'all';
  mgKeyword = '';
  mgType = 'all';
  mgStatus = 'all';
  $('#mgSearchInput').value = '';
  $('#mgTabs').querySelectorAll('.mg-tab').forEach(x => x.classList.toggle('active', x.dataset.source === 'all'));
  $('#mgTypeFilters').querySelectorAll('.mg-filter').forEach(x => x.classList.toggle('active', x.dataset.type === 'all'));
  $('#mgStatusFilters').querySelectorAll('.mg-filter').forEach(x => x.classList.toggle('active', x.dataset.status === 'all'));
  renderManageList();
  mgMask.classList.add('show');
}
function closeManagePopup(){
  mgMask.classList.remove('show');
}

// 打开 / 关闭
$('#btnManageAtom').addEventListener('click', openManagePopup);
$('#manageClose').addEventListener('click', closeManagePopup);
$('#mgCloseBtn').addEventListener('click', closeManagePopup);
mgMask.addEventListener('click', e => { if(e.target===mgMask) closeManagePopup(); });

// 一级 Tab：按工具来源管理
$('#mgTabs').addEventListener('click', e => {
  const tab = e.target.closest('.mg-tab');
  if(!tab) return;
  mgSource = tab.dataset.source;
  $('#mgTabs').querySelectorAll('.mg-tab').forEach(x => x.classList.toggle('active', x === tab));
  renderManageList();
});

// 二级筛选：工具类型
$('#mgTypeFilters').addEventListener('click', e => {
  const filter = e.target.closest('.mg-filter');
  if(!filter) return;
  mgType = filter.dataset.type;
  $('#mgTypeFilters').querySelectorAll('.mg-filter').forEach(x => x.classList.toggle('active', x === filter));
  renderManageList();
});

// 二级筛选：启用状态
$('#mgStatusFilters').addEventListener('click', e => {
  const filter = e.target.closest('.mg-filter');
  if(!filter) return;
  mgStatus = filter.dataset.status;
  $('#mgStatusFilters').querySelectorAll('.mg-filter').forEach(x => x.classList.toggle('active', x === filter));
  renderManageList();
});

// 搜索
$('#mgSearchInput').addEventListener('input', function(){
  mgKeyword = this.value;
  renderManageList();
});

// 全选 / 取消全选
$('#mgCheckAll').addEventListener('change', function(){
  mgList.querySelectorAll('.mg-row-check').forEach(cb => cb.checked = this.checked);
  syncBatchUI();
});

// 行内勾选（事件委托）
mgList.addEventListener('change', e => {
  if(e.target.classList.contains('mg-row-check')) syncBatchUI();
});

// 编辑 / 启用禁用 / 删除（事件委托）
mgList.addEventListener('click', e => {
  const tg = e.target.closest('.mg-act.toggle');
  if(tg){
    const t = atomTools.find(x=>x.id===tg.dataset.id);
    if(!t) return;
    t.enabled = !t.enabled;
    toast(`「${t.name}」已${t.enabled?'启用':'禁用'}`);
    renderManageList();
    return;
  }
  const ed = e.target.closest('.mg-act.edit');
  const dl = e.target.closest('.mg-act.del');
  if(ed){
    const t = atomTools.find(x=>x.id===ed.dataset.id);
    if(t && t.type === 'mcp') openMcpConfig(t.id);
    else if(t) toast(`编辑「${t.name}」（演示）`);
  } else if(dl){
    if(dl.dataset.confirm === '1'){
      const t = atomTools.find(x=>x.id===dl.dataset.id);
      atomTools = atomTools.filter(x=>x.id!==dl.dataset.id);
      toast(`已删除「${t.name}」`);
      renderManageList();
      syncToolCards();
    } else {
      dl.dataset.confirm = '1';
      const orig = dl.textContent;
      dl.textContent = '确认删除?';
      dl.classList.add('confirming');
      setTimeout(() => {
        if(dl.dataset.confirm === '1'){ dl.dataset.confirm = '0'; dl.textContent = orig; dl.classList.remove('confirming'); }
      }, 3000);
    }
  }
});

// 批量删除
$('#mgBatchDelete').addEventListener('click', () => {
  const ids = [...mgList.querySelectorAll('.mg-row-check:checked')].map(cb=>cb.dataset.id);
  if(!ids.length) return;
  atomTools = atomTools.filter(x=>!ids.includes(x.id));
  toast(`已批量删除 ${ids.length} 个原子工具`);
  renderManageList();
  syncToolCards();
});

// 批量禁用（Skill / MCP 统一将 enabled 置为 false）
$('#mgBatchDisable').addEventListener('click', () => {
  const ids = [...mgList.querySelectorAll('.mg-row-check:checked')].map(cb=>cb.dataset.id);
  if(!ids.length) return;
  let n = 0;
  atomTools.forEach(x => { if(ids.includes(x.id) && x.enabled !== false){ x.enabled = false; n++; } });
  toast(`已批量禁用 ${n} 个原子工具`);
  renderManageList();
});

/* ============ MCP 配置弹窗 ============ */
const mccMask = $('#mcpConfigMask');
const mccJson = $('#mccJson');
const mccMsg = $('#mccMsg');
let mccEditId = null;

function openMcpConfig(id){
  const t = atomTools.find(x=>x.id===id);
  if(!t) return;
  mccEditId = id;
  $('#mccTitle').textContent = `配置 ${t.name}`;
  mccJson.value = t.configJson || '';
  mccMsg.textContent = '';
  mccMsg.className = 'mcc-msg';
  mccMask.classList.add('show');
}
function closeMcpConfig(){
  mccMask.classList.remove('show');
  mccEditId = null;
}
function validateMcpJson(){
  const raw = mccJson.value.trim();
  if(!raw){ mccMsg.textContent = '配置内容为空'; mccMsg.className = 'mcc-msg err'; return false; }
  try{
    const obj = JSON.parse(raw);
    if(typeof obj !== 'object' || obj === null || Array.isArray(obj)){
      mccMsg.textContent = 'JSON 格式正确，但根节点应为对象'; mccMsg.className = 'mcc-msg err'; return false;
    }
    mccMsg.textContent = '✓ JSON 格式校验通过'; mccMsg.className = 'mcc-msg ok'; return true;
  }catch(err){
    mccMsg.textContent = '✕ JSON 解析失败：' + err.message; mccMsg.className = 'mcc-msg err'; return false;
  }
}
$('#mccClose').addEventListener('click', closeMcpConfig);
$('#mccValidate').addEventListener('click', validateMcpJson);
mccMask.addEventListener('click', e => { if(e.target===mccMask) closeMcpConfig(); });
$('#mccSave').addEventListener('click', () => {
  if(!validateMcpJson()) return;
  const t = atomTools.find(x=>x.id===mccEditId);
  if(t){ t.configJson = mccJson.value; toast(`已保存「${t.name}」的 MCP 配置`); }
  closeMcpConfig();
});

// ============ 原子工具详情页（独立页面） ============
const tdName=$('#tdName');
const tdIcon=$('#tdIcon');
const tdHeadSub=$('#tdHeadSub');
const tdIntro=$('#tdIntro');
const tdFuncs=$('#tdFuncs');
const tdTypeBadge=$('#tdTypeBadge');
const tdInputs=$('#tdInputs');
const tdOutputs=$('#tdOutputs');
const tdStatus=$('#tdStatus');
const tdAddBtn=$('#tdAddBtn');
const tdCallBtn=$('#tdCallBtn');
let tdCurrent=null;

function findTool(name){
  for(const g of toolGroupsData){
    const t=g.tools.find(x=>x.name===name);
    if(t) return {tool:t, biz:g.label};
  }
  return null;
}
function ioRows(rows){
  if(!rows||!rows.length) return '<div class="td-io-empty">未定义</div>';
  return rows.map(r=>`
    <div class="td-io-row">
      <div class="td-io-name">${r.name}<span class="td-io-type">${r.type}</span></div>
      <div class="td-io-desc">${r.desc||''}</div>
    </div>`).join('');
}
function openToolDetail(name){
  const r=findTool(name);
  if(!r) return;
  const t=r.tool, biz=r.biz;
  tdCurrent=t;
  tdName.textContent=t.name;
  tdIcon.textContent=t.icon||'🧰';
  tdIcon.className='td-icon '+(t.color||'');
  tdHeadSub.textContent=(t.views||'')+(t.stars?' · '+t.stars:'');
  tdIntro.textContent=t.desc||'';
  tdFuncs.innerHTML=(t.functions||[]).map(f=>`<li>${f}</li>`).join('');
  const isMcp=t.type==='mcp';
  // 类型标签：skill/mcp 标签 + 业务类型标签
  tdTypeBadge.innerHTML=`<span class="td-tag ${t.type}">${isMcp?'MCP':'Skill'}</span><span class="td-tag biz">${biz}</span>`;
  tdInputs.innerHTML=ioRows(t.inputs);
  tdOutputs.innerHTML=ioRows(t.outputs);
  const added=isAtomAdded(t.name);
  const entry=atomTools.find(x=>x.name===t.name||x.name.startsWith(t.name+' '));
  const enabled=entry?entry.enabled:false;
  tdStatus.innerHTML=`
    <span class="td-pill ${added?'on':'off'}">${added?'✓ 已添加':'＋ 未添加'}</span>
    <span class="td-pill ${added&&enabled?'on':'off'}">${added&&enabled?'✓ 已启用':'⨯ 未启用'}</span>`;
  tdAddBtn.textContent=added?'已添加 · 管理':'＋ 添加到我的工具';
  switchPage('tool-detail');
}
function closeToolDetail(){ tdCurrent=null; switchPage('tools'); }

$('#tdBack').addEventListener('click', closeToolDetail);
$('#tdClose').addEventListener('click', closeToolDetail);

tdAddBtn.addEventListener('click', ()=>{
  if(!tdCurrent) return;
  if(isAtomAdded(tdCurrent.name)){
    closeToolDetail();
    openManagePopup();
  } else {
    addToolToMyList(tdCurrent.name);
    toast(`已添加「${tdCurrent.name}」到我的原子工具`);
    syncToolCards();
    closeToolDetail();
  }
});

tdCallBtn.addEventListener('click', ()=>{
  if(!tdCurrent) return;
  closeToolDetail();
  try{
    if(typeof switchPage==='function') switchPage('workbench');
    const ci=$('#chatText');
    if(ci){ ci.value=(ci.value?ci.value+' ':'')+'@'+tdCurrent.name; ci.focus(); }
  }catch(err){ toast('已为你打开工作台（演示）'); }
});

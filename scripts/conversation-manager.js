// ============ 历史对话管理：任务 + 空间（文件树） ============
// 职责：
//   - 历史数据管理（单一真源 conversations[]，任务/空间仅为展示分类）
//   - 创建 Conversation（默认任务 / 空间任务）
//   - workspace 绑定与 currentWorkspace 同步
//   - 历史栏 UI 渲染（统一文件树：空间=可折叠文件夹，任务=时间分组根节点）
//   - localStorage 持久化（模拟后端）
//
// 数据模型：
//   Workspace:   { id, name, path, createdAt, updatedAt, conversations:[] }
//   Conversation:{ id, title, type:'task'|'workspace', workspaceId, workspaceName,
//                  createdAt, updatedAt, lastMessage, messageCount, messages:[] }
//   messages:    [{ role:'user'|'ai', text, ts, agent }]  // ts:时间戳(ms) | agent:智能体名称(role==='ai'时记录)
(function(){
  const LS_KEY = 'zhidi.conversationState';

  const state = {
    currentConversation: null,   // conversation id
    currentWorkspace: null,      // workspace id
    conversations: [],           // 单一真源
    workspaces: [],
  };

  const quickBubblesHTML = '<div class="quick"><div class="q">统计成都市不同类型设施的个数</div><div class="q">帮我筛选福田区面积大于5000㎡的商业用地</div><div class="q">写一份国土空间规划工作函</div></div>';

  // 历史栏 UI 态
  let searchQuery = '';
  const expandedSpaces = new Set();   // 展开的空间文件夹 id 集合
  const expandedTopGroups = new Set(['task']);  // 展开的顶级分组 ('task'|'space')，默认任务展开、空间折叠

  // ============ 工具 ============
  const uid = (prefix) => prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  const now = () => Date.now();
  function escapeHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => (
      {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
    ));
  }
  function pad(n){ return String(n).padStart(2, '0'); }
  function fmtTime(ts){
    const d = new Date(ts), nd = new Date();
    if(d.toDateString() === nd.toDateString()) return pad(d.getHours()) + ':' + pad(d.getMinutes());
    const yest = new Date(nd); yest.setDate(nd.getDate() - 1);
    if(d.toDateString() === yest.toDateString()) return '昨天';
    return (d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function dayBucket(ts){
    const d = new Date(ts), nd = new Date();
    if(d.toDateString() === nd.toDateString()) return 'today';
    const yest = new Date(nd); yest.setDate(nd.getDate() - 1);
    if(d.toDateString() === yest.toDateString()) return 'yesterday';
    return 'earlier';
  }

  // ============ 模拟 AI 标题生成 ============
  const TITLE_RULES = [
    [/商业用地|用地筛选|筛选.*地块/, '商业用地筛选'],
    [/人口|人口统计|人口分布/, '人口统计分析'],
    [/热岛/, '城市热岛分析'],
    [/道路|缓冲区|路网/, '道路缓冲区计算'],
    [/遥感|影像|卫片|正射/, '遥感影像处理'],
    [/土地.*利用|利用.*分析/, '土地利用分析'],
    [/专题图|制图|出图|用地图/, '专题图制作'],
    [/合规|红线|审查/, '合规性分析'],
    [/面积|测算|规模/, '面积测算'],
    [/城市更新|更新方案/, '城市更新方案分析'],
    [/生态|承载力/, '生态评估'],
  ];
  function generateConversationTitle(firstMsg){
    const q = String(firstMsg || '').trim();
    for(const [re, title] of TITLE_RULES){ if(re.test(q)) return title; }
    if(q) return q.length > 12 ? q.slice(0, 12) + '…' : q;
    return '新任务';
  }

  // ============ 持久化 ============
  function persist(){
    try{
      localStorage.setItem(LS_KEY, JSON.stringify({
        currentConversation: state.currentConversation,
        currentWorkspace: state.currentWorkspace,
        conversations: state.conversations,
        workspaces: state.workspaces,
      }));
    }catch(e){ /* localStorage 不可用时仅保留内存态 */ }
  }
  function load(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(!raw) return false;
      const d = JSON.parse(raw);
      if(Array.isArray(d.conversations)) state.conversations = d.conversations;
      if(Array.isArray(d.workspaces)) state.workspaces = d.workspaces;
      state.currentConversation = d.currentConversation || null;
      state.currentWorkspace = d.currentWorkspace || null;
      return true;
    }catch(e){ return false; }
  }

  // ============ seed 数据（首次无缓存时） ============
  function seed(){
    const t = now(), h = 3600 * 1000, day = 24 * h;
    state.workspaces = [
      { id:'space-sz', name:'深圳规划项目', path:'E:/GIS项目/深圳规划', createdAt: t - 20*day, updatedAt: t - 2*h, conversations:[] },
      { id:'space-ns', name:'南山更新项目', path:'E:/GIS项目/南山更新', createdAt: t - 12*day, updatedAt: t - 3*day, conversations:[] },
    ];
    const mk = (id, title, type, workspaceId, workspaceName, updatedAt, messages) => {
      // 回填 ts：按消息顺序递增，保证种子数据可按时间排序与展示
      const seeded = messages.map((m, i) => ({ ...m, ts: updatedAt - (messages.length - i) * 60000 }));
      return {
        id, title, type, workspaceId, workspaceName,
        createdAt: updatedAt - 2*h, updatedAt, lastMessage: messages[messages.length-1].text,
        messageCount: messages.length, messages: seeded,
      };
    };
    const tasks = [
      mk('task-futian', '福田区商业用地筛选', 'task', null, '', t - 1*h, [
        { role:'user', text:'帮我筛选福田区 5000 平米以上的商业用地' },
        { role:'ai', text:'已完成筛选，共找到 37 个商业用地地块。' },
      ]),
      mk('task-pop', '深圳人口统计分析', 'task', null, '', t - 3*h, [
        { role:'user', text:'统计深圳各区人口分布情况' },
        { role:'ai', text:'已生成深圳各区人口分布统计，宝安区人口最多。' },
      ]),
      mk('task-rs', '遥感影像处理', 'task', null, '', t - 1*day - 2*h, [
        { role:'user', text:'对这批遥感影像做正射纠正' },
        { role:'ai', text:'已完成影像正射纠正，共处理 12 景影像。' },
      ]),
      mk('task-heat', '城市热岛分析', 'task', null, '', t - 2*day - 5*h, [
        { role:'user', text:'做一下城市热岛效应监测' },
        { role:'ai', text:'已输出热岛强度分级图，核心城区热岛效应显著。' },
      ]),
    ];
    const szConvs = [
      mk('conv-sz-1', '福田商业用地筛选', 'workspace', 'space-sz', '深圳规划项目', t - 40*60*1000, [
        { role:'user', text:'在这个项目里筛一下福田的商业用地' },
        { role:'ai', text:'已结合项目矢量数据完成筛选。' },
      ]),
      mk('conv-sz-2', '道路分析', 'workspace', 'space-sz', '深圳规划项目', t - 6*h, [
        { role:'user', text:'做道路缓冲区计算' },
        { role:'ai', text:'已生成道路 500 米缓冲区。' },
      ]),
      mk('conv-sz-3', '土地利用分析', 'workspace', 'space-sz', '深圳规划项目', t - 1*day, [
        { role:'user', text:'分析当前土地利用结构' },
        { role:'ai', text:'建设用地占比约 42%，耕地占比约 30%。' },
      ]),
    ];
    const nsConvs = [
      mk('conv-ns-1', '城市更新方案分析', 'workspace', 'space-ns', '南山更新项目', t - 3*day, [
        { role:'user', text:'分析南山片区的城市更新方案' },
        { role:'ai', text:'已梳理 5 个更新单元的可实施性。' },
      ]),
    ];
    state.conversations = tasks.concat(szConvs, nsConvs);
    state.workspaces[0].conversations = szConvs.map(c => c.id);
    state.workspaces[1].conversations = nsConvs.map(c => c.id);
    state.currentConversation = null;
    state.currentWorkspace = null;
  }

  // ============ 气泡构建（复用 chat.js 同款结构，静默模式不记录） ============
  function buildBubble(role, text){
    const d = document.createElement('div');
    d.className = 'bubble ' + role;
    const av = role === 'ai' ? 'AI' : '我';
    d.innerHTML = `<div class="av">${av}</div><div class="txt"></div>`;
    d.querySelector('.txt').textContent = text;
    return d;
  }
  function resetChatToNew(){
    const body = $('#chatBody');
    if(body) body.innerHTML = '<div class="bubble ai"><div class="av">AI</div><div class="txt">已开启新对话，有什么可以帮你的？</div></div>' + quickBubblesHTML;
  }
  function restoreChat(c){
    const body = $('#chatBody');
    if(!body) return;
    body.innerHTML = '';
    if(c && Array.isArray(c.messages) && c.messages.length){
      c.messages.forEach(m => body.appendChild(buildBubble(m.role, m.text)));
    } else {
      resetChatToNew();
    }
    body.scrollTop = body.scrollHeight;
  }

  // ============ 工作空间指示器 ============
  function syncWorkspaceIndicator(){
    const btn = $('#ciWorkspace');
    if(!btn) return;
    const ws = state.workspaces.find(w => w.id === state.currentWorkspace);
    if(ws){
      btn.innerHTML = '<span class="cp-check">🗂️</span><span class="ci-workspace-path">' + escapeHtml(ws.name) + '</span>';
      btn.title = ws.path;
    } else {
      btn.innerHTML = '<span class="cp-check">🗂️</span>工作空间';
      btn.title = '选择项目空间';
    }
  }

  // ============ 创建 ============
  // 「＋ 新建对话」（#sbNewChatBtn / #chNew）：固定创建无工作空间任务，不关联任何空间
  function createConversation(){
    return createTaskConversation();
  }
  function createTaskConversation(){
    const c = {
      id: uid('task'), title: '新任务', type: 'task',
      workspaceId: null, workspaceName: '',
      createdAt: now(), updatedAt: now(), lastMessage: '', messageCount: 0, messages: [],
    };
    state.conversations.unshift(c);
    state.currentConversation = c.id;
    state.currentWorkspace = null;
    resetChatToNew(); syncWorkspaceIndicator();
    persist(); renderAll();
    if(typeof switchPage === 'function') switchPage('workbench');
    return c;
  }
  function createWorkspaceConversation(workspaceId){
    const ws = state.workspaces.find(w => w.id === workspaceId);
    if(!ws) return createTaskConversation();
    const c = {
      id: uid('conv'), title: '新对话', type: 'workspace',
      workspaceId: ws.id, workspaceName: ws.name,
      createdAt: now(), updatedAt: now(), lastMessage: '', messageCount: 0, messages: [],
    };
    state.conversations.unshift(c);
    if(!ws.conversations.includes(c.id)) ws.conversations.unshift(c.id);
    ws.updatedAt = now();
    state.currentConversation = c.id;
    state.currentWorkspace = ws.id;
    expandedSpaces.add(ws.id);
    expandedTopGroups.add('space');  // 新建空间对话后展开「空间」顶级分组，便于看到新对话
    resetChatToNew(); syncWorkspaceIndicator();
    persist(); renderAll();
    if(typeof switchPage === 'function') switchPage('workbench');
    return c;
  }

  // ============ 切换 ============
  function switchConversation(id){
    const c = state.conversations.find(x => x.id === id);
    if(!c) return;
    state.currentConversation = id;
    if(c.type === 'workspace' && c.workspaceId){
      state.currentWorkspace = c.workspaceId;
      expandedSpaces.add(c.workspaceId);
      expandedTopGroups.add('space');  // 切到空间对话时展开「空间」分组定位当前条目
    } else {
      state.currentWorkspace = null;
    }
    restoreChat(c); syncWorkspaceIndicator();
    persist(); renderAll();
    if(typeof switchPage === 'function') switchPage('workbench');
  }

  // ============ 重命名 / 删除 ============
  function renameConversation(id, title){
    const c = state.conversations.find(x => x.id === id);
    if(!c) return;
    c.title = String(title || c.title).trim() || c.title;
    c.updatedAt = now();
    persist(); renderTree();
  }
  function deleteConversation(id){
    const idx = state.conversations.findIndex(x => x.id === id);
    if(idx < 0) return;
    const c = state.conversations[idx];
    // 仅从空间引用中移除，不删除 Workspace，不触碰任何本地文件
    state.workspaces.forEach(ws => {
      const i = ws.conversations.indexOf(id);
      if(i >= 0) ws.conversations.splice(i, 1);
    });
    state.conversations.splice(idx, 1);
    if(state.currentConversation === id){
      state.currentConversation = null;
      state.currentWorkspace = null;
      resetChatToNew(); syncWorkspaceIndicator();
    }
    persist(); renderAll();
  }

  // ============ 置顶（仅任务对话） ============
  // pinnedAt 为置顶时间戳：非空表示已置顶；置顶之间按置顶时间倒序（最近置顶最靠前）
  function togglePin(id){
    const c = state.conversations.find(x => x.id === id);
    if(!c || c.type !== 'task') return;
    if(c.pinnedAt){
      c.pinnedAt = null;
      if(typeof toast === 'function') toast('📌 已取消置顶');
    } else {
      c.pinnedAt = now();
      if(typeof toast === 'function') toast('📌 已置顶');
    }
    persist(); renderTree();
  }

  // ============ 消息记录（由 chat.js 的 addBubble 调用） ============
  function recordMessage(role, text, agent){
    const c = state.conversations.find(x => x.id === state.currentConversation);
    if(!c) return;
    c.messages.push({ role, text, ts: now(), agent: agent || null });
    c.messageCount = c.messages.length;
    c.updatedAt = now();
    c.lastMessage = text;
    // 空间对话同步空间更新时间
    if(c.workspaceId){
      const ws = state.workspaces.find(w => w.id === c.workspaceId);
      if(ws) ws.updatedAt = now();
    }
    persist(); renderTree();
  }

  // ============ 当前空间设置（含锁定规则） ============
  // 锁定规则：当前对话已发送首条消息（messageCount > 0）后，工作空间不可再更改。
  function isCurrentConversationLocked(){
    const c = state.conversations.find(x => x.id === state.currentConversation);
    return !!(c && c.messageCount > 0);
  }
  // 切换/修改当前对话所属工作空间（发首条消息前允许，之后锁定）。返回是否成功。
  function setCurrentWorkspace(workspaceId){
    const cur = state.conversations.find(x => x.id === state.currentConversation);
    if(cur && cur.messageCount > 0){
      if(typeof toast === 'function') toast('🔒 当前对话已锁定工作空间，无法切换');
      return false;
    }
    const ws = state.workspaces.find(w => w.id === workspaceId);
    if(cur){
      // 从原空间引用中移除
      if(cur.workspaceId){
        const oldWs = state.workspaces.find(w => w.id === cur.workspaceId);
        if(oldWs){ const i = oldWs.conversations.indexOf(cur.id); if(i >= 0) oldWs.conversations.splice(i, 1); }
      }
      // 归入目标空间（workspaceId 为空则退回任务）
      if(ws){
        cur.type = 'workspace';
        cur.workspaceId = ws.id;
        cur.workspaceName = ws.name;
        if(!ws.conversations.includes(cur.id)) ws.conversations.unshift(cur.id);
        ws.updatedAt = now();
      } else {
        cur.type = 'task';
        cur.workspaceId = null;
        cur.workspaceName = '';
      }
      cur.updatedAt = now();
    }
    state.currentWorkspace = ws ? ws.id : null;
    syncWorkspaceIndicator();
    persist(); renderAll();
    return true;
  }

  // ============ 渲染（文件树结构） ============
  // 树结构：
  //   ▾ 📋 任务（顶级分组，默认展开，可折叠）
  //       📄 任务对话1  📄 任务对话2 …
  //   ▸ 🗂️ 空间（顶级分组，默认折叠，可折叠）
  //       ▾ 📁 工作空间A（文件夹，可折叠，显示计数）
  //           📄 空间对话1  📄 空间对话2 …
  //       ▸ 📁 工作空间B …

  function filterTasks(){
    let list = state.conversations.filter(c => c.type === 'task');
    if(searchQuery){
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q));
    }
    // 置顶排序：置顶在前（置顶之间按置顶时间倒序），未置顶保持原有顺序（稳定排序）
    list.sort((a, b) => {
      const ap = a.pinnedAt ? 1 : 0, bp = b.pinnedAt ? 1 : 0;
      if(ap !== bp) return bp - ap;
      if(ap) return (b.pinnedAt - a.pinnedAt);
      return 0;
    });
    return list;
  }

  function convItemHTML(c, indent){
    const active = c.id === state.currentConversation;
    const pinned = !!c.pinnedAt;
    const pad = indent ? ' style="padding-left:' + indent + 'px"' : '';
    const pinBtn = c.type === 'task'
      ? '<button class="conv-item-pin' + (pinned ? ' pinned' : '') + '" data-id="' + c.id + '" title="' + (pinned ? '取消置顶' : '置顶') + '">📌</button>'
      : '';
    return '<div class="conv-item' + (active ? ' active' : '') + (pinned ? ' pinned' : '') + '" data-id="' + c.id + '"' + pad + '>' +
      '<span class="conv-item-icon">📄</span>' +
      '<span class="conv-item-title">' + escapeHtml(c.title) + '</span>' +
      '<span class="conv-item-meta">' + fmtTime(c.updatedAt) + '</span>' +
      pinBtn +
      '<button class="conv-item-more" data-id="' + c.id + '" title="更多操作">⋯</button>' +
    '</div>';
  }

  /** 渲染空间文件夹节点（第二级，含子对话第三级） */
  function renderWorkspaceNode(ws, searching){
    const open = searching ? true : expandedSpaces.has(ws.id);  // 搜索时自动展开
    let convs = (ws.conversations || []).map(id => state.conversations.find(c => c.id === id)).filter(Boolean);
    if(searching){
      const q = searchQuery.toLowerCase();
      convs = convs.filter(c => c.title.toLowerCase().includes(q));
    }
    if(searching && !convs.length) return '';  // 搜索时无匹配的空间文件夹整体隐藏

    let html = '<div class="tree-node tree-folder" data-space="' + ws.id + '">' +
      '<div class="tree-head" data-space="' + ws.id + '">' +
        '<span class="tree-caret">' + (open ? '▾' : '▸') + '</span>' +
        '<span class="tree-icon">📁</span>' +
        '<span class="tree-label" title="' + escapeHtml(ws.path) + '">' + escapeHtml(ws.name) + '</span>' +
        '<button class="tree-add-btn" data-space="' + ws.id + '" title="在此空间新建对话">＋</button>' +
      '</div>';

    if(open){
      html += '<div class="tree-children">';
      if(convs.length){
        html += convs.map(c => convItemHTML(c, 20)).join('');
      } else {
        html += '<div class="conv-empty" style="padding-left:20px">暂无对话，点击「＋」新建</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  /** 渲染顶级分组（任务 / 空间），含展开态 */
  function renderTopGroup(key, label, icon, childrenHtml){
    const open = expandedTopGroups.has(key);

    let html = '<div class="tree-node tree-top-group" data-topgroup="' + key + '">' +
      '<div class="tree-top-head" data-topgroup="' + key + '">' +
        '<span class="tree-caret">' + (open ? '▾' : '▸') + '</span>' +
        '<span class="tree-icon">' + icon + '</span>' +
        '<span class="tree-label">' + label + '</span>' +
      '</div>';

    if(open && childrenHtml){
      html += '<div class="tree-top-children">' + childrenHtml + '</div>';
    }
    html += '</div>';
    return html;
  }

  /** 统一文件树渲染入口 */
  function renderTree(){
    const wrap = $('#convList');
    if(!wrap) return;
    const searching = !!searchQuery;

    let html = '';

    // ── 顶级分组 1：任务（叶子直接展示，默认展开） ──
    const tasks = filterTasks();
    const taskLeaves = tasks.map(c => convItemHTML(c, 20)).join('');
    if(tasks.length){
      html += renderTopGroup('task', '任务', '📋', taskLeaves);
    }

    // ── 顶级分组 2：空间（内含可折叠文件夹） ──
    const sortedSpaces = [...state.workspaces].sort((a, b) => b.updatedAt - a.updatedAt);
    const spaceFolders = sortedSpaces.map(ws => renderWorkspaceNode(ws, searching)).join('');
    if(spaceFolders){
      html += renderTopGroup('space', '空间', '🗂️', spaceFolders);
    }

    // ── 空状态 ──
    if(!html){
      html = '<div class="conv-empty">暂无对话<br><span style="font-size:11px;color:var(--t-ph)">点击上方「＋ 新建对话」开始</span></div>';
    }

    wrap.innerHTML = html;
  }

  function renderAll(){
    renderTree(); syncWorkspaceIndicator();
  }

  // ============ 右键/更多菜单 ============
  let menuEl = null;
  function closeConvMenu(){
    if(menuEl){ menuEl.remove(); menuEl = null; }
  }
  // 打开对话上下文菜单：x/y 为弹出位置（右键坐标或按钮锚点），自动夹紧在视口内
  function openConvMenu(id, x, y){
    closeConvMenu();
    menuEl = document.createElement('div');
    menuEl.className = 'conv-menu';
    menuEl.innerHTML =
      '<div class="conv-menu-item" data-action="open-folder">📂 打开文件夹</div>' +
      '<div class="conv-menu-item" data-action="rename">✏️ 重命名</div>' +
      '<div class="conv-menu-item" data-action="share">🔗 分享任务</div>' +
      '<div class="conv-menu-item danger" data-action="delete">🗑 删除任务</div>';
    menuEl.addEventListener('click', e => {
      const act = e.target.closest('[data-action]');
      if(!act) return;
      const action = act.dataset.action;
      if(action === 'open-folder') openFolderFlow(id);
      else if(action === 'rename') renameFlow(id);
      else if(action === 'share') shareFlow(id);
      else if(action === 'delete') deleteFlow(id);
      closeConvMenu();
    });
    document.body.appendChild(menuEl);
    const mw = menuEl.offsetWidth, mh = menuEl.offsetHeight;
    menuEl.style.left = Math.max(8, Math.min(x, window.innerWidth - mw - 8)) + 'px';
    menuEl.style.top = Math.max(8, Math.min(y, window.innerHeight - mh - 8)) + 'px';
    setTimeout(() => document.addEventListener('click', closeConvMenu, { once:true }), 0);
  }
  // 打开文件夹：定位对话所在目录（空间对话 → 项目空间路径；任务对话 → 默认任务目录）
  function openFolderFlow(id){
    const c = state.conversations.find(x => x.id === id);
    if(!c) return;
    let path = '';
    if(c.type === 'workspace' && c.workspaceId){
      const ws = state.workspaces.find(w => w.id === c.workspaceId);
      if(ws) path = ws.path;
    }
    if(!path) path = 'E:/GIS任务/' + c.title;
    if(typeof toast === 'function') toast('📂 已定位对话所在文件夹：' + path);
  }
  function renameFlow(id){
    const c = state.conversations.find(x => x.id === id);
    if(!c) return;
    const title = window.prompt('重命名对话', c.title);
    if(title && title.trim()) renameConversation(id, title.trim());
  }
  // 完整日期时间格式化（供导出文件标注，区别于列表用的短格式）
  function fmtDateTime(ts){
    if(!ts) return '';
    const d = new Date(ts);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
      + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  // 分享任务：将对话完整导出为 Markdown 文件
  // 满足：①按时间排序并标注发送者(用户/智能体名) ②分轮次 ③保留原文/格式/链接 ④标准语法通用阅读器可打开
  function exportConversationMarkdown(id){
    const c = state.conversations.find(x => x.id === id);
    if(!c){ if(typeof toast === 'function') toast('未找到该对话'); return; }
    const msgs = Array.isArray(c.messages) ? c.messages : [];
    if(!msgs.length){ if(typeof toast === 'function') toast('该对话暂无消息，无法导出'); return; }

    // ① 按时间顺序排序（无 ts 时用原始下标兜底，保证稳定）
    const ordered = msgs
      .map((m, i) => ({ m, i }))
      .sort((a, b) => ((a.m.ts || 0) - (b.m.ts || 0)) || (a.i - b.i))
      .map(x => x.m);

    // ② 分轮次：每条 user 消息开启新一轮，其后 ai 消息归入同一轮
    const rounds = [];
    let cur = null;
    ordered.forEach(m => {
      if(m.role === 'user'){ cur = { user: [], ai: [] }; rounds.push(cur); cur.user.push(m); }
      else { if(!cur){ cur = { user: [], ai: [] }; rounds.push(cur); } cur.ai.push(m); }
    });

    // ③ 组装标准 Markdown（原文逐字输出，保留格式与链接）
    const L = [];
    L.push('# 致地对话分享 · ' + c.title);
    L.push('');
    const typeLabel = c.type === 'workspace' ? '空间对话' : '任务对话';
    L.push('> **对话类型**：' + typeLabel + (c.workspaceName ? '（所属空间：' + c.workspaceName + '）' : ''));
    L.push('> **创建时间**：' + (fmtDateTime(c.createdAt) || '—'));
    L.push('> **更新时间**：' + (fmtDateTime(c.updatedAt) || '—'));
    L.push('> **导出时间**：' + fmtDateTime(now()));
    L.push('> **消息条数**：' + msgs.length + ' 条');
    L.push('');
    L.push('---');
    L.push('');
    rounds.forEach((r, idx) => {
      L.push('## 第 ' + (idx + 1) + ' 轮');
      L.push('');
      r.user.forEach(m => {
        L.push('**👤 用户**' + (m.ts ? ' · ' + fmtDateTime(m.ts) : ''));
        L.push('');
        L.push(m.text || '');
        L.push('');
      });
      r.ai.forEach(m => {
        const agentName = (m.role === 'ai' && m.agent) ? m.agent : '致地AI助手';
        L.push('**🤖 ' + agentName + '**' + (m.ts ? ' · ' + fmtDateTime(m.ts) : ''));
        L.push('');
        L.push(m.text || '');
        L.push('');
      });
    });
    const md = L.join('\n');

    // ④ 触发浏览器下载（text/markdown，任意 Markdown 阅读器可打开）
    const safeTitle = (c.title || '对话').replace(/[\\/:*?"<>|\n\r]+/g, '_').slice(0, 60);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = safeTitle + '.md';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if(typeof toast === 'function') toast('✅ 已导出对话 Markdown：' + safeTitle + '.md');
  }
  function shareFlow(id){
    exportConversationMarkdown(id);
  }
  function deleteFlow(id){
    const c = state.conversations.find(x => x.id === id);
    if(!c) return;
    if(window.confirm('删除任务「' + c.title + '」？该操作不可撤销，仅删除该对话，不影响工作空间与本地文件。')){
      deleteConversation(id);
      if(typeof toast === 'function') toast('已删除任务');
    }
  }

  // ============ 事件绑定 ============
  function toggleSpace(spaceId){
    if(expandedSpaces.has(spaceId)) expandedSpaces.delete(spaceId);
    else expandedSpaces.add(spaceId);
    renderTree();
  }
  function toggleTopGroup(groupKey){
    if(expandedTopGroups.has(groupKey)) expandedTopGroups.delete(groupKey);
    else expandedTopGroups.add(groupKey);
    renderTree();
  }
  function bindUI(){
    // 入口1：顶部「＋ 新建对话」
    const newBtn = $('#sbNewChatBtn');
    if(newBtn) newBtn.addEventListener('click', () => createConversation());
    // 搜索
    const search = $('#convSearchInput');
    if(search) search.addEventListener('input', e => { searchQuery = e.target.value.trim(); renderTree(); });
    // 树列表委托（统一处理顶级分组/文件夹/条目/更多按钮）
    const list = $('#convList');
    if(list) list.addEventListener('click', e => {
      // 顶级分组头（任务/空间 展开/折叠）
      const topHead = e.target.closest('.tree-top-head[data-topgroup]');
      if(topHead){ toggleTopGroup(topHead.dataset.topgroup); return; }
      // 空间内新建对话按钮
      const addBtn = e.target.closest('.tree-add-btn');
      if(addBtn){ e.stopPropagation(); createWorkspaceConversation(addBtn.dataset.space); return; }
      // 工作空间文件夹头（展开/折叠）
      const spaceHead = e.target.closest('.tree-head[data-space]');
      if(spaceHead){ toggleSpace(spaceHead.dataset.space); return; }
      // 更多操作按钮（⋯）：在按钮下方弹出上下文菜单
      const more = e.target.closest('.conv-item-more');
      if(more){
        e.stopPropagation();
        const r = more.getBoundingClientRect();
        openConvMenu(more.dataset.id, r.left, r.bottom);
        return;
      }
      // 置顶/取消置顶按钮
      const pinBtn = e.target.closest('.conv-item-pin');
      if(pinBtn){ e.stopPropagation(); togglePin(pinBtn.dataset.id); return; }
      // 对话条目点击
      const item = e.target.closest('.conv-item');
      if(item) switchConversation(item.dataset.id);
    });
    // 右键菜单：在对话条目上点击右键时弹出上下文菜单（阻止浏览器默认菜单）
    if(list) list.addEventListener('contextmenu', e => {
      const item = e.target.closest('.conv-item');
      if(!item) return;
      e.preventDefault();
      openConvMenu(item.dataset.id, e.clientX, e.clientY);
    });
    // 工作空间选择（#ciWorkspace 弹窗）由 gis-workspace.js 直接调用 setCurrentWorkspace 同步处理锁定结果，
    // 故此处不再监听事件，避免双重处理。
  }

  // ============ 初始化 ============
  function init(){
    if(!load()){ seed(); persist(); }
    // 默认展开状态：任务顶级分组展开，空间顶级分组折叠、空间文件夹全部折叠
    // （expandedTopGroups 已默认含 'task'，expandedSpaces 为空集合，无需额外处理）
    // 有恢复的当前会话才重绘聊天区；否则保留初始欢迎语与快捷问题
    const cur = state.conversations.find(c => c.id === state.currentConversation);
    if(cur) restoreChat(cur);
    renderAll(); bindUI();
  }

  // ============ 暴露 ============
  const api = {
    state,
    createConversation,
    createWorkspaceConversation,
    switchConversation,
    renameConversation,
    deleteConversation,
    togglePin,
    generateConversationTitle,
    recordMessage,
    setCurrentWorkspace,
    isCurrentConversationLocked,
    getCurrentConversation: () => state.conversations.find(c => c.id === state.currentConversation) || null,
    getWorkspaces: () => state.workspaces,
    renderTree,
    renderAll,
  };
  window.ConversationManager = api;
  window.conversationState = state;
  window.createConversation = createConversation;
  window.createWorkspaceConversation = createWorkspaceConversation;
  window.switchConversation = switchConversation;
  window.renameConversation = renameConversation;
  window.deleteConversation = deleteConversation;
  window.togglePin = togglePin;
  window.generateConversationTitle = generateConversationTitle;

  init();
})();

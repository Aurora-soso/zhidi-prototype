// ============ 用户下拉卡片 ============
const ud = $('#userDropdown');
function closeUserDropdown(){ ud.classList.remove('show'); }
window.closeUserDropdown = closeUserDropdown;

// 点击头像/用户名 → 切换下拉
$('#userAvatarBtn').addEventListener('click', (e)=>{ e.stopPropagation(); ud.classList.toggle('show'); });
$('#userNameBtn').addEventListener('click', (e)=>{ e.stopPropagation(); ud.classList.toggle('show'); });

// 点击设置图标 → 进设置页
$('#settingsBtn').addEventListener('click', ()=>{ switchPage('settings'); closeUserDropdown(); });

// 点击通知图标 → 进通知页
$('#notifBtn').addEventListener('click', ()=>{ switchPage('notif'); closeUserDropdown(); });

// 用户卡片内的静态操作统一在本模块绑定，避免结构文件承载交互脚本。
ud.addEventListener('click', (event)=>{
  const actionTarget=event.target.closest('[data-action]');
  const themeTarget=event.target.closest('[data-theme-choice]');
  if(!actionTarget && !themeTarget) return;
  event.stopPropagation();

  if(themeTarget){
    themeTarget.parentElement.querySelectorAll('.dr-opt').forEach(option=>option.classList.remove('active'));
    themeTarget.classList.add('active');
    const theme=themeTarget.dataset.themeChoice;
    document.body.setAttribute('data-theme', theme);
    toast(`已切换为${theme==='light'?'浅色':'深色'}外观`);
    return;
  }

  const actions={
    'open-notifications':()=>{ switchPage('notif'); closeUserDropdown(); },
    'upgrade-plan':()=>toast('升级会员（演示）'),
    'open-settings':()=>{ switchPage('settings'); closeUserDropdown(); },
    'appearance-menu':()=>{},
    'help-feedback':()=>toast('帮助与反馈（演示）'),
    'check-updates':()=>toast('当前已是最新版本 v1.0.0'),
    'logout':()=>{ if(confirm('确认退出登录？')) location.reload(); }
  };
  actions[actionTarget.dataset.action]?.();
});

// 点击外部关闭下拉
document.addEventListener('click', (e)=>{
  if(!e.target.closest('.sb-user-bar')) closeUserDropdown();
});

// ============ 通知页数据 ============
const notifData = [
  {unread:true, title:'系统更新通知', text:'致地AI 客户端已更新至 v1.2.0，新增知识库智能检索功能，优化地图渲染性能。点击查看完整更新日志。', tag:'系统', time:'10分钟前'},
  {unread:true, title:'任务执行完成', text:'「全国人口分布分析」任务已完成，共处理 3,247 条数据，耗时 4分32秒。结果已保存至资源库。', tag:'任务', time:'25分钟前'},
  {unread:false, title:'知识库更新提醒', text:'「法律法规」分类下新增 3 条政策文件，包括《自然资源部关于做好...》。', tag:'知识库', time:'1小时前'},
  {unread:true, title:'@你 被提及', text:'协作成员 张三 在会话「长三角土地利用变化」中 @了你：「请帮忙确认一下这个区域的用地类型」', tag:'@我的', time:'2小时前'},
  {unread:false, title:'账户积分变动', text:'每日签到获得 +100 通用积分，当前余额：3,244.04', tag:'系统', time:'3小时前'},
  {unread:false, title:'模型调用额度', text:'本月 deepseek-v4-flash 已调用 1,247 次，剩余配额 8,753 次（月度上限 10,000）', tag:'系统', time:'昨天 18:30'},
  {unread:true, title:'安全登录提醒', text:'检测到新设备登录：Windows PC / Chrome / 广东深圳，如非本人操作请立即修改密码。', tag:'安全', time:'昨天 14:20'},
  {unread:false, title:'智能体发布成功', text:'你的智能体「国土空间规划助手」已通过审核并正式发布至广场，当前已有 12 次调用。', tag:'智能体', time:'昨天 09:15'},
];

function renderNotifList(){
  $('#notifList').innerHTML = notifData.map(n =>
    `<div class="nf-item ${n.unread?'unread':''}" onclick="this.classList.remove('unread');toast('查看通知详情（演示）')">
      ${n.unread?'<div class="nf-dot"></div>':'<div style="width:10px;flex-shrink:0"></div>'}
      <div class="nf-body">
        <div class="nf-title">${n.title}</div>
        <div class="nf-text">${n.text}</div>
        <div class="nf-meta"><span>${n.tag}</span><span>通知中心</span></div>
      </div>
      <div class="nf-time">${n.time}</div>
    </div>`
  ).join('');
}
renderNotifList();

// 通知 Tab 切换
document.querySelectorAll('.nf-tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.nf-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    const ft = tab.textContent;
    if(ft==='未读'){
      $('#notifList').innerHTML = notifData.filter(n=>n.unread).map(n =>
        `<div class="nf-item unread" onclick="this.classList.remove('unread');toast('查看通知详情')">
          <div class="nf-dot"></div><div class="nf-body"><div class="nf-title">${n.title}</div><div class="nf-text">${n.text}</div><div class="nf-meta"><span>${n.tag}</span><span>通知中心</span></div></div><div class="nf-time">${n.time}</div></div>`
      ).join('') || '<div style="padding:48px;text-align:center;color:var(--t-ph);">暂无未读通知 🎉</div>';
    } else if(ft==='@我的'){
      $('#notifList').innerHTML = notifData.filter(n=>n.tag==='@我的').map(n =>
        `<div class="nf-item ${n.unread?'unread':''}" onclick="this.classList.remove('unread');toast('查看通知详情')">
          ${n.unread?'<div class="nf-dot"></div>':'<div style="width:10px;flex-shrink:0"></div>'}
          <div class="nf-body"><div class="nf-title">${n.title}</div><div class="nf-text">${n.text}</div><div class="nf-meta"><span>${n.tag}</span></div></div><div class="nf-time">${n.time}</div></div>`
      ).join('');
    } else if(ft==='系统'){
      $('#notifList').innerHTML = notifData.filter(n=>['系统','安全','任务'].includes(n.tag)).map(n =>
        `<div class="nf-item ${n.unread?'unread':''}" onclick="this.classList.remove('unread');toast('查看通知详情')">
          ${n.unread?'<div class="nf-dot"></div>':'<div style="width:10px;flex-shrink:0"></div>'}
          <div class="nf-body"><div class="nf-title">${n.title}</div><div class="nf-text">${n.text}</div><div class="nf-meta"><span>${n.tag}</span></div></div><div class="nf-time">${n.time}</div></div>`
      ).join('');
    } else {
      renderNotifList();
    }
  });
});

// 设置侧栏切换
document.querySelectorAll('.ss-item').forEach(item=>{
  item.addEventListener('click', ()=>{
    document.querySelectorAll('.ss-item').forEach(x=>x.classList.remove('active'));
    item.classList.add('active');
    toast(`切换到：${item.textContent.trim()}（演示）`);
  });
});

$('#twoFactorToggle').addEventListener('click', function(){ this.classList.toggle('on'); });
$('#markAllReadButton').addEventListener('click', ()=>toast('全部已读（演示）'));

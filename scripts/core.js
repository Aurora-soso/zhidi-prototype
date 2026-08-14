// ============ 工具函数 ============
const $ = s => document.querySelector(s);
const toast = (m) => { const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2200); };
const refreshMapSize = () => {
  if(typeof map === 'undefined' || !map) return;
  if(typeof map.invalidateSize === 'function') map.invalidateSize();
  else if(typeof map.resize === 'function') map.resize();
};

// 将浮层依附到触发按钮上方或下方，并限制在当前视口内。
function positionAnchoredPopover(anchor, pop, placement='auto'){
  if(!anchor || !pop) return;
  const gap=10, edge=8, anchorRect=anchor.getBoundingClientRect();
  pop.style.visibility='hidden';
  const popWidth=pop.offsetWidth, popHeight=pop.offsetHeight;
  const spaceAbove=anchorRect.top-edge-gap;
  const spaceBelow=window.innerHeight-anchorRect.bottom-edge-gap;
  const placeAbove=placement==='above' || (placement==='auto' && spaceAbove>=popHeight && spaceAbove>=spaceBelow);
  const availableHeight=Math.max(160,placeAbove?spaceAbove:spaceBelow);
  pop.style.maxHeight=availableHeight+'px';
  const measuredHeight=Math.min(popHeight,availableHeight);
  const left=Math.max(edge,Math.min(anchorRect.right-popWidth,window.innerWidth-popWidth-edge));
  const top=placeAbove?Math.max(edge,anchorRect.top-measuredHeight-gap):Math.min(window.innerHeight-measuredHeight-edge,anchorRect.bottom+gap);
  pop.style.left=left+'px';pop.style.top=top+'px';
  pop.style.setProperty('--anchor-x',Math.max(16,Math.min(popWidth-16,anchorRect.left+anchorRect.width/2-left))+'px');
  pop.classList.toggle('pop-above',placeAbove);pop.classList.toggle('pop-below',!placeAbove);
  pop.style.visibility='';
}

// ============ 登录 Tab 切换 ============
$('.tabs').addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b) return;
  document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  const isPhone = b.dataset.tab==='phone';
  $('#form-pwd').style.display = isPhone?'none':'block';
  $('#form-phone').style.display = isPhone?'block':'none';
});
let cdTimer=null;
$('#getCode').addEventListener('click', ()=>{
  const phone=$('#phone').value.trim();
  if(!phone){ $('#err-code').textContent='请先输入手机号'; return; }
  $('#err-code').textContent='';
  let n=60; const btn=$('#getCode'); btn.disabled=true; btn.textContent=n+'s';
  cdTimer=setInterval(()=>{ n--; if(n<=0){clearInterval(cdTimer);btn.disabled=false;btn.textContent='获取验证码';} else btn.textContent=n+'s'; },1000);
  toast('验证码已发送（演示）');
});
$('#loginBtn').addEventListener('click', ()=>{
  if(!$('#agree').checked){ toast('请先勾选记住我或确认登录'); return; }
  const active=document.querySelector('.tabs button.active').dataset.tab;
  if(active==='phone'){
    if(!$('#phone').value.trim()||!$('#code').value.trim()){ $('#err-code').textContent='手机号与验证码均不能为空'; return; }
  } else {
    if(!$('#acc2').value.trim()||!$('#pwd').value.trim()){ $('#err-pwd').textContent='邮箱/用户名与密码均不能为空'; return; }
  }
  $('#login').style.display='none';
  $('#workbench').style.display='flex';
  initMap();
});

// ============ 左侧导航：切换主页面 ============
const pages=['workbench','tools','agent','agent-edit','agent-detail','res','settings','notif','tool-detail','model-config'];
function switchPage(p){
  pages.forEach(x=>$('#page-'+x).classList.toggle('active', x===p));
  document.querySelectorAll('.sb-nav-item').forEach(n=>n.classList.toggle('active', n.dataset.page===p));
  if(p==='workbench') refreshMapSize();
}
function openAgentEditPage(){
  // 优先复用新建/编辑表单（四模块），否则仅切换页面
  if(typeof openAgentForm==='function'){
    const cur = (typeof currentAgent!=='undefined' && currentAgent) ? currentAgent : null;
    openAgentForm('edit', cur?cur.id:null, cur);
  } else {
    switchPage('agent-edit');
  }
}
document.querySelectorAll('.sb-nav-item').forEach(item=>{
  item.addEventListener('click', ()=>switchPage(item.dataset.page));
});

// 收缩/展开（SVG 图标旋转）
$('#sbToggle').addEventListener('click', ()=>{
  const sb=$('#sidebar');
  const isCollapsing=!sb.classList.contains('collapsed');
  sb.classList.toggle('collapsed');
  if(!isCollapsing){
    // 展开时恢复默认宽度
    sb.style.flexBasis='260px';
    sb.style.minWidth='260px';
    setTimeout(refreshMapSize,300);
  } else {
    refreshMapSize();
  }
});

// ============ 拖拽调整左右栏宽度 ============
function makeResizable(handleId, targetSelector, direction, minW, maxW){
  const handle=$(handleId);
  if(!handle) return;
  let dragging=false, startX=0, startW=0;
  handle.addEventListener('mousedown', e=>{
    dragging=true; handle.classList.add('dragging'); startX=e.clientX;
    const target=$(targetSelector);
    startW=target.offsetWidth;
    document.body.style.cursor='col-resize';
    document.body.style.userSelect='none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e=>{
    if(!dragging) return;
    const dx=e.clientX-startX;
    let newW=direction==='left'?startW+dx:startW-dx;
    newW=Math.max(minW, Math.min(maxW, newW));
    const target=$(targetSelector);
    target.style.flexBasis=newW+'px';
    target.style.minWidth=newW+'px';
    refreshMapSize();
  });
  document.addEventListener('mouseup', ()=>{
    if(!dragging) return;
    dragging=false; handle.classList.remove('dragging');
    document.body.style.cursor='';
    document.body.style.userSelect='';
    refreshMapSize();
  });
}
// 左侧栏拖拽：260px ~ 420px
makeResizable('resizeLeft','#sidebar','left',180,480);
// 右侧对话面板拖拽：280px ~ 560px
makeResizable('resizeRight','#rightPanel','right',220,600);

// 侧栏会话操作已迁移至 scripts/conversation-manager.js：
//   - 「＋ 新建对话」→ window.createConversation()
//   - 历史列表点击 / 右键菜单 → switchConversation / rename / delete
// 此处不再对静态 .sess-item 绑定（历史栏已改为数据驱动渲染）。

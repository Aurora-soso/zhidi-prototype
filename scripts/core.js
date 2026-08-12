// ============ 工具函数 ============
const $ = s => document.querySelector(s);
const toast = (m) => { const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2200); };

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
const pages=['workbench','tools','agent','agent-edit','res','settings','notif','tool-detail','model-config'];
function switchPage(p){
  pages.forEach(x=>$('#page-'+x).classList.toggle('active', x===p));
  document.querySelectorAll('.sb-nav-item').forEach(n=>n.classList.toggle('active', n.dataset.page===p));
  if(p==='workbench' && map){ try{ map.resize(); }catch(e){} }
}
function openAgentEditPage(){
  switchPage('agent-edit');
  if(typeof renderAgentEdit==='function') renderAgentEdit();
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
    if(map) setTimeout(()=>map.resize(),300);
  } else {
    if(map) map.resize();
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
    if(map) map.resize();
  });
  document.addEventListener('mouseup', ()=>{
    if(!dragging) return;
    dragging=false; handle.classList.remove('dragging');
    document.body.style.cursor='';
    document.body.style.userSelect='';
    if(map) map.resize();
  });
}
// 左侧栏拖拽：260px ~ 420px
makeResizable('resizeLeft','#sidebar','left',180,480);
// 右侧对话面板拖拽：280px ~ 560px
makeResizable('resizeRight','#rightPanel','right',220,600);

// 侧栏会话操作（常驻，初始化时绑定一次）
$('#sbNewChatBtn').addEventListener('click', ()=>{
  switchPage('workbench');
  chatBody.innerHTML='<div class="bubble ai"><div class="av">AI</div><div class="txt">已开启新对话，有什么可以帮你的？</div></div>';
  toast('新建对话');
});
document.querySelectorAll('.sess-item').forEach(si=>{
  si.addEventListener('click', ()=>{ switchPage('workbench'); addBubble('user',si.textContent); aiReply(si.textContent); });
});


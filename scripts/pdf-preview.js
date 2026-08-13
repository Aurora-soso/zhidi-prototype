// ============ 站内 PDF 预览原型 ============
// 数据读取 / 预览地址获取统一封装：
// 当前返回 Mock 数据；后续接入云端时只替换 getResourceList() 与 getPdfPreviewUrl()，不重写预览组件。

// 资源列表（Mock：拍平官方资源库数据，previewUrl 暂指本地演示 PDF）
function getResourceList(){
  const out = [];
  if(typeof kbFilesByKb === 'undefined') return out;
  Object.keys(kbFilesByKb).forEach(kbName => {
    kbFilesByKb[kbName].forEach(f => {
      out.push({
        id: f.id,
        name: f.name,
        kbName: kbName,
        fileSize: f.fileSize || '—',
        pages: f.pages || 0,
        updateTime: f.createTime || '',
        previewUrl: f.previewUrl || 'assets/demo/sample.pdf'
      });
    });
  });
  return out;
}

// 预览地址获取：后续替换为「后端预览接口 → 有时效签名 URL」
function getPdfPreviewUrl(resourceId){
  const r = getResourceList().find(x => x.id === resourceId);
  return r ? r.previewUrl : 'assets/demo/sample.pdf';
}

// base64 解码为 Uint8Array（供 PDF.js data 参数）
function decodeBase64(b64){
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
// Mock 阶段：演示 PDF 走内嵌 base64（file:// 双击可预览，不依赖网络/服务器）；
// 其余地址（含无效地址，用于错误状态演示）仍走 URL 请求。
function pdfSourceFor(url){
  if(url === 'assets/demo/sample.pdf' && typeof SAMPLE_PDF_BASE64 !== 'undefined'){
    return { data: decodeBase64(SAMPLE_PDF_BASE64) };
  }
  return { url };
}

// ---------- 预览弹层状态 ----------
let pdfDoc = null;          // 当前 PDF 文档
let pdfCurPage = 1;         // 当前页码
let pdfScale = 1;           // 缩放
let pdfRotation = 0;        // 旋转角度
let pdfCurRes = null;       // 当前预览资源
let pdfLoadTimer = null;    // 模拟加载定时器
let pdfDestroyed = true;    // 预览是否已销毁（关闭后停止缩略图/渲染链）

function openPdfPreview(resourceId){
  const res = getResourceList().find(x => x.id === resourceId);
  if(!res){ toast('未找到该资源'); return; }
  pdfCurRes = res;
  pdfDestroyed = false;
  // 顶部信息（动态取当前记录，不写死）
  $('#pdfTitle').textContent = res.name;
  $('#pdfSub').innerHTML =
    `<span>来源：${res.kbName || '官方资源库'}</span>` +
    `<span>大小：${res.fileSize || '—'}</span>` +
    `<span>更新时间：${res.updateTime || '—'}</span>`;
  // 重置状态
  pdfDoc = null; pdfCurPage = 1; pdfScale = 1; pdfRotation = 0;
  $('#pdfPageInfo').textContent = '— / ' + (res.pages || '—');
  $('#pdfZoomLevel').textContent = '100%';
  $('#pdfThumbs').innerHTML = '';
  $('#pdfCanvas').width = 0; $('#pdfCanvas').height = 0;
  $('#pdfMask').classList.add('show');
  setPdfLoading(true);
  loadPdfDocument(getPdfPreviewUrl(resourceId));
}

function closePdfPreview(){
  $('#pdfMask').classList.remove('show');
  pdfDestroyed = true;   // 停止缩略图/渲染链，避免 destroy 后 getPage 报错
  if(pdfLoadTimer) clearTimeout(pdfLoadTimer);
  if(pdfDoc){ try{ pdfDoc.destroy(); }catch(e){} }
  pdfDoc = null; pdfCurRes = null;
}
window.openPdfPreview = openPdfPreview;
window.closePdfPreview = closePdfPreview;

function setPdfLoading(on){
  $('#pdfLoading').style.display = on ? 'flex' : 'none';
  $('#pdfError').style.display = 'none';
}
function showPdfError(msg){
  $('#pdfLoading').style.display = 'none';
  $('#pdfErrorMsg').textContent = msg;
  $('#pdfError').style.display = 'flex';
  $('#pdfPageInfo').textContent = '— / —';
  $('#pdfThumbs').innerHTML = '';
}

function pdfErrorMessage(err){
  const msg = (err && err.message) ? String(err.message) : String(err || '');
  if(/Failed to fetch|NetworkError|not allowed|Access|CORS|file:/i.test(msg))
    return '加载失败：无法访问文件（file:// 下浏览器会拦截，请用本地服务器打开，或稍后重试）';
  if(/404|not found|missing/i.test(msg))
    return '文件不存在或链接已失效';
  if(/password|Permission|Forbidden/i.test(msg))
    return '无访问权限';
  if(/InvalidPDF|format|signature/i.test(msg))
    return '文件格式不支持预览，或签名 URL 已过期';
  return '加载失败：' + msg;
}

// 加载文档：800ms 模拟真实请求 → PDF.js 渲染
function loadPdfDocument(url){
  if(pdfLoadTimer) clearTimeout(pdfLoadTimer);
  pdfLoadTimer = setTimeout(() => {
    if(typeof pdfjsLib === 'undefined'){
      showPdfError('PDF 引擎未加载（需要网络加载 PDF.js，请检查网络后重试）');
      return;
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      pdfjsLib.GlobalWorkerOptions.workerSrc ||
      'assets/vendor/pdf.worker.min.js';
    // disableWorker：主线程渲染，file:// 双击打开也能预览（不依赖 Worker / 网络）
    pdfjsLib.getDocument(Object.assign({ disableWorker: true }, pdfSourceFor(url))).promise.then(pdf => {
      pdfDoc = pdf;
      $('#pdfPageInfo').textContent = '1 / ' + pdf.numPages;
      renderPdfPage(1);
      renderPdfThumbs(pdf);
      setPdfLoading(false);
    }).catch(err => {
      console.error('PDF load error:', err);
      showPdfError(pdfErrorMessage(err));
    });
  }, 800);
}

// ---------- 页面渲染 ----------
function renderPdfPage(pageNum){
  if(!pdfDoc) return;
  pdfDoc.getPage(pageNum).then(page => {
    if(pdfDestroyed) return;
    const vp = page.getViewport({ scale: pdfScale, rotation: pdfRotation });
    const canvas = $('#pdfCanvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(vp.width * dpr);
    canvas.height = Math.floor(vp.height * dpr);
    canvas.style.width = vp.width + 'px';
    canvas.style.height = vp.height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, vp.width, vp.height);
    page.render({ canvasContext: ctx, viewport: vp }).promise.then(() => {
      document.querySelectorAll('#pdfThumbs .pdf-thumb').forEach(t =>
        t.classList.toggle('active', parseInt(t.dataset.pg, 10) === pageNum));
    }).catch(() => {});
  });
}

// 缩略图（逐页渲染，点击跳页）
function renderPdfThumbs(pdf){
  const box = $('#pdfThumbs');
  box.innerHTML = '';
  const load = (i) => {
    if(i > pdf.numPages || pdfDestroyed) return;
    pdf.getPage(i).then(page => {
      if(pdfDestroyed) return;
      const vp = page.getViewport({ scale: 0.18 });
      const c = document.createElement('canvas');
      c.className = 'pdf-thumb' + (i === 1 ? ' active' : '');
      c.dataset.pg = i;
      c.width = vp.width; c.height = vp.height;
      page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise.then(() => {
        if(pdfDestroyed) return;
        box.appendChild(c);
        load(i + 1);
      }).catch(() => { if(!pdfDestroyed) load(i + 1); });
    }).catch(() => { if(!pdfDestroyed) load(i + 1); });
  };
  load(1);
}

// ---------- 工具栏 ----------
function pdfGoPage(n){
  if(!pdfDoc) return;
  if(n < 1) n = 1;
  if(n > pdfDoc.numPages) n = pdfDoc.numPages;
  if(n === pdfCurPage && pdfDoc) return;
  pdfCurPage = n;
  $('#pdfPageInfo').textContent = n + ' / ' + pdfDoc.numPages;
  renderPdfPage(n);
}
function pdfZoom(delta){
  pdfScale = Math.min(3, Math.max(0.5, +(pdfScale + delta).toFixed(2)));
  $('#pdfZoomLevel').textContent = Math.round(pdfScale * 100) + '%';
  renderPdfPage(pdfCurPage);
}
function pdfRotate(){
  pdfRotation = (pdfRotation + 90) % 360;
  renderPdfPage(pdfCurPage);
}

// ---------- 事件绑定 ----------
$('#pdfClose').addEventListener('click', closePdfPreview);
$('#pdfMask').addEventListener('click', e => { if(e.target.id === 'pdfMask') closePdfPreview(); });
$('#pdfPrev').addEventListener('click', () => pdfGoPage(pdfCurPage - 1));
$('#pdfNext').addEventListener('click', () => pdfGoPage(pdfCurPage + 1));
$('#pdfZoomIn').addEventListener('click', () => pdfZoom(0.25));
$('#pdfZoomOut').addEventListener('click', () => pdfZoom(-0.25));
$('#pdfRotate').addEventListener('click', pdfRotate);
$('#pdfRetry').addEventListener('click', () => {
  if(!pdfCurRes) return;
  setPdfLoading(true);
  loadPdfDocument(getPdfPreviewUrl(pdfCurRes.id));
});
$('#pdfFullscreen').addEventListener('click', () => {
  const wrap = $('#pdfCanvasWrap');
  if(document.fullscreenElement){ document.exitFullscreen(); }
  else if(wrap.requestFullscreen){ wrap.requestFullscreen(); }
  else toast('当前浏览器不支持全屏');
});
// 预览弹窗「添加到对话」：跳转工作台 + 文件注入对话上下文（持久化）+ 异常处理
function addPdfToChat(){
  if(!pdfCurRes){ toast('未找到当前文件，无法添加'); return; }
  const name = pdfCurRes.name;
  try{
    // 1. 跳转工作台（仅切换视图，对话上下文不中断）
    if(typeof switchPage !== 'function') throw new Error('无法跳转工作台');
    switchPage('workbench');
    // 2. 注入文件引用（setChatFileRef 内部持久化到 localStorage）
    if(typeof setChatFileRef !== 'function') throw new Error('文件引用功能不可用');
    setChatFileRef(name);
    // 3. 对话区反馈：用户消息 + AI 确认
    if(typeof addBubble === 'function') addBubble('user', '📎 引用文件：'+name);
    if(typeof addBubble === 'function') addBubble('ai', '已将「'+name+'」作为当前对话上下文。你可以直接提问，我会结合该文件内容回答。');
    // 4. 关闭预览弹层
    closePdfPreview();
    toast('文件已添加到对话');
  }catch(err){
    console.error('添加到对话失败:', err);
    // 异常处理：弹层保持打开 → 可重试（再次点击）或取消（✕ 关闭）
    toast('添加失败：'+((err && err.message) || '未知错误')+'，可重试或取消');
  }
}
window.addPdfToChat = addPdfToChat;
$('#pdfAddChat').addEventListener('click', addPdfToChat);
// 缩略图点击跳页
$('#pdfThumbs').addEventListener('click', e => {
  const t = e.target.closest('.pdf-thumb'); if(!t) return;
  pdfGoPage(parseInt(t.dataset.pg, 10));
});
// Esc 关闭
document.addEventListener('keydown', e => { if(e.key === 'Escape') closePdfPreview(); });

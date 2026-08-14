// ============ 智能体统计结果渲染器（表格 / 图表 / 图层 / 导出） ============
// 依赖：ECharts（window.echarts）、SheetJS（window.XLSX）、Leaflet（window.L）
// 对外暴露：window.StatisticsRenderer = { renderResult, showChart, showOnMap, exportExcel, getData }
(function(){
  'use strict';

  // ---------- 模拟数据：成都市不同类型设施统计 ----------
  const FACILITY_STATS = {
    title: '成都市设施分类统计',
    source: 'spaceeqa.成都市',
    sourceNote: '空间数据库 · 设施要素分类汇总',
    columns: ['序号', '设施类型', '设施个数'],
    rows: [
      [1, '生活服务设施', 610030],
      [2, '交通服务设施', 184794],
      [3, '医疗卫生设施', 51670],
      [4, '教育设施', 35072],
      [5, '娱乐设施', 20222],
      [6, '体育设施', 7230],
      [7, '文化设施', 2969],
    ],
    // 每类设施：展示色 + 图表短名（长名称在窄图表中会拥挤）
    categories: [
      { name: '生活服务设施', short: '生活服务', color: '#EF4444' },
      { name: '交通服务设施', short: '交通服务', color: '#F97316' },
      { name: '医疗卫生设施', short: '医疗卫生', color: '#F59E0B' },
      { name: '教育设施',     short: '教育',     color: '#10B981' },
      { name: '娱乐设施',     short: '娱乐',     color: '#06B6D4' },
      { name: '体育设施',     short: '体育',     color: '#3B82F6' },
      { name: '文化设施',     short: '文化',     color: '#8B5CF6' },
    ]
  };

  // 地图基准：成都市中心 + 散布范围（度）
  const CD_CENTER = [30.657, 104.066];
  const CD_SPAN = 0.36;
  // 每类设施在地图上渲染的点位数（按统计数量占比分配的采样，控制总量 ~150）
  const POINT_WEIGHTS = [45, 26, 16, 13, 10, 8, 7];

  let chartInstance = null;      // 当前对话内 ECharts 实例
  let registeredLayerId = null; // 已注册的动态统计图层 id

  // ---------- 工具 ----------
  function mulberry32(seed){
    let a = seed >>> 0;
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function esc(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function toast(msg){
    if(typeof window.toast === 'function') window.toast(msg);
  }

  // ---------- 表格 HTML ----------
  function buildTableHTML(){
    const head = FACILITY_STATS.columns.map(c => `<th>${esc(c)}</th>`).join('');
    const body = FACILITY_STATS.rows.map(r => `
      <tr>
        <td>${r[0]}</td>
        <td class="type-cell">${esc(r[1])}</td>
        <td class="num-cell">${Number(r[2]).toLocaleString()}</td>
      </tr>`).join('');
    return `<table class="stats-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }

  // ---------- 主渲染：完整统计结果卡片 ----------
  function renderResult(txtEl){
    const data = FACILITY_STATS;
    const total = data.rows.reduce((s, r) => s + r[2], 0);

    txtEl.innerHTML = `
      <div class="stats-intro">已完成成都市设施分类统计，共 <b>${data.rows.length}</b> 类设施、合计 <b>${total.toLocaleString()}</b> 个。</div>
      <div class="stats-result">
        <div class="stats-result-body">
          <div class="stats-analysis" data-stats-analysis>
            <button type="button" class="stats-analysis-header" data-stats-toggle="analysis">
              <span class="caret open">▶</span>分析过程
              <span class="tag">已展开</span>
            </button>
            <div class="stats-analysis-body">
              ${buildTableHTML()}
            </div>
          </div>

          <div class="stats-source">
            <span class="db-ic">🗄</span>
            <div>
              <span class="src-label">数据来源</span>
              <span class="src-name">📦 ${esc(data.source)}</span>
            </div>
            <span class="src-extra">${data.rows.length} 类 · ${total.toLocaleString()} 个</span>
          </div>

          <div class="stats-actions">
            <button type="button" class="stats-btn primary" data-stats-action="chart"><span class="sb-ic">📊</span>生成统计图</button>
            <button type="button" class="stats-btn" data-stats-action="layer"><span class="sb-ic">🗺️</span>查看图层</button>
            <button type="button" class="stats-btn" data-stats-action="export"><span class="sb-ic">⬇️</span>导出统计结果</button>
          </div>

          <div class="stats-chart" data-stats-chart>
            <div class="stats-chart-head">
              <span class="auto-tag">自动推荐</span>
              <select data-stats-chart-type aria-label="图表类型">
                <option value="bar" selected>柱状图</option>
                <option value="line">折线图</option>
                <option value="pie">饼图</option>
                <option value="scatter">散点图</option>
                <option value="radar">雷达图</option>
              </select>
              <span class="stats-chart-tip">根据文本结果生成统计图</span>
            </div>
            <div class="stats-chart-container" data-stats-chart-container></div>
          </div>
        </div>
      </div>`;

    // 分析过程：折叠 / 展开
    const header = txtEl.querySelector('[data-stats-toggle="analysis"]');
    header.addEventListener('click', () => {
      const body = txtEl.querySelector('.stats-analysis-body');
      const caret = header.querySelector('.caret');
      const tag = header.querySelector('.tag');
      const collapsed = body.classList.toggle('collapsed');
      caret.classList.toggle('open', !collapsed);
      tag.textContent = collapsed ? '已折叠' : '已展开';
      // 折叠后若图表展开，让 ECharts 重新计算尺寸
      if(!collapsed && chartInstance) setTimeout(() => chartInstance.resize(), 60);
    });

    // 三个操作按钮
    txtEl.querySelector('[data-stats-action="chart"]').addEventListener('click', () => {
      toggleChart(txtEl);
    });
    txtEl.querySelector('[data-stats-action="layer"]').addEventListener('click', () => {
      showOnMap();
    });
    txtEl.querySelector('[data-stats-action="export"]').addEventListener('click', () => {
      exportExcel();
    });

    // 图表类型切换
    const typeSel = txtEl.querySelector('[data-stats-chart-type]');
    typeSel.addEventListener('change', () => {
      renderChart(txtEl, typeSel.value);
    });
  }

  // ---------- 图表 ----------
  function chartNames(){
    return FACILITY_STATS.categories.map(c => c.short);
  }
  function chartValues(){
    return FACILITY_STATS.rows.map(r => r[2]);
  }
  function chartColors(){
    return FACILITY_STATS.categories.map(c => c.color);
  }

  function buildOption(type){
    const names = chartNames();
    const values = chartValues();
    const colors = chartColors();
    const fmt = v => Number(v).toLocaleString();
    const baseTooltip = {
      trigger: 'axis',
      backgroundColor: 'rgba(15,23,42,.88)',
      borderWidth: 0,
      textStyle: { color: '#fff', fontSize: 11 },
      axisPointer: { type: 'shadow' }
    };
    const axisCommon = {
      axisLine: { lineStyle: { color: '#CBD5E1' } },
      axisLabel: { color: '#64748B', fontSize: 10 },
      splitLine: { lineStyle: { color: '#F1F5F9' } }
    };

    switch(type){
      case 'bar':
        return {
          tooltip: { ...baseTooltip, formatter: p => `${p[0].name}<br/><b style="color:#10B981">${fmt(p[0].value)}</b> 个` },
          grid: { left: 44, right: 12, top: 16, bottom: 40 },
          xAxis: { type: 'category', data: names, ...axisCommon, axisLabel: { color: '#64748B', fontSize: 10, interval: 0, rotate: 30 } },
          yAxis: { type: 'value', ...axisCommon, axisLabel: { color: '#64748B', fontSize: 9 } },
          series: [{
            type: 'bar', data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [4,4,0,0] } })),
            barWidth: '58%', label: { show: true, position: 'top', fontSize: 9, color: '#64748B', formatter: p => fmt(p.value) }
          }]
        };
      case 'line':
        return {
          tooltip: { ...baseTooltip, formatter: p => `${p[0].name}<br/><b style="color:#06B6D4">${fmt(p[0].value)}</b> 个` },
          grid: { left: 44, right: 12, top: 16, bottom: 40 },
          xAxis: { type: 'category', data: names, ...axisCommon, axisLabel: { color: '#64748B', fontSize: 10, interval: 0, rotate: 30 } },
          yAxis: { type: 'value', ...axisCommon, axisLabel: { color: '#64748B', fontSize: 9 } },
          series: [{
            type: 'line', data: values, smooth: true, symbol: 'circle', symbolSize: 6,
            lineStyle: { color: '#06B6D4', width: 2.5 },
            itemStyle: { color: '#06B6D4' },
            areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(6,182,212,.28)' }, { offset: 1, color: 'rgba(6,182,212,.02)' }] } },
            label: { show: true, fontSize: 9, color: '#64748B', formatter: p => fmt(p.value) }
          }]
        };
      case 'pie':
        return {
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(15,23,42,.88)', borderWidth: 0,
            textStyle: { color: '#fff', fontSize: 11 },
            formatter: p => `${p.name}<br/><b style="color:#fff">${fmt(p.value)}</b> 个（${p.percent}%）`
          },
          legend: { bottom: 0, textStyle: { color: '#64748B', fontSize: 9 }, itemWidth: 10, itemHeight: 10 },
          series: [{
            type: 'pie', radius: ['32%', '64%'], center: ['50%', '42%'],
            itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
            label: { show: false },
            data: FACILITY_STATS.categories.map((c, i) => ({ name: c.name, value: values[i], itemStyle: { color: colors[i] } }))
          }]
        };
      case 'scatter':
        return {
          tooltip: { ...baseTooltip, formatter: p => `${names[p[0].dataIndex]}<br/><b style="color:#8B5CF6">${fmt(p[0].value[1])}</b> 个` },
          grid: { left: 44, right: 12, top: 16, bottom: 40 },
          xAxis: { type: 'category', data: names, ...axisCommon, axisLabel: { color: '#64748B', fontSize: 10, interval: 0, rotate: 30 } },
          yAxis: { type: 'value', ...axisCommon, axisLabel: { color: '#64748B', fontSize: 9 } },
          series: [{
            type: 'scatter', symbolSize: v => Math.max(8, Math.min(26, Math.sqrt(v) / 4)),
            data: values.map((v, i) => ({ value: [names[i], v], itemStyle: { color: colors[i], opacity: .85, borderColor: '#fff', borderWidth: 1 } })),
            label: { show: true, position: 'top', fontSize: 9, color: '#64748B', formatter: p => fmt(p.value[1]) }
          }]
        };
      case 'radar':
        return {
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(15,23,42,.88)', borderWidth: 0,
            textStyle: { color: '#fff', fontSize: 11 },
            formatter: p => `${p.name}<br/><b style="color:#10B981">${fmt(p.value[0])}</b> 个`
          },
          radar: {
            indicator: names.map((n, i) => ({ name: n, max: Math.ceil(Math.max(...values) / 100000) * 100000 })),
            radius: '64%', center: ['50%', '52%'],
            axisName: { color: '#475569', fontSize: 10 },
            splitArea: { areaStyle: { color: ['rgba(16,185,129,.04)', 'rgba(16,185,129,.09)'] } },
            splitLine: { lineStyle: { color: '#E2E8F0' } },
            axisLine: { lineStyle: { color: '#E2E8F0' } }
          },
          series: [{
            type: 'radar',
            data: [{ value: values, name: FACILITY_STATS.title, lineStyle: { color: '#10B981', width: 2 }, itemStyle: { color: '#10B981' }, areaStyle: { color: 'rgba(16,185,129,.18)' } }]
          }]
        };
      default:
        return {};
    }
  }

  function renderChart(txtEl, type){
    const container = txtEl.querySelector('[data-stats-chart-container]');
    if(!container) return;
    if(typeof window.echarts === 'undefined'){
      container.innerHTML = `<div class="stats-hint"><span class="em">⚠️</span>图表库未加载（ECharts CDN 不可用），请检查网络后刷新页面。</div>`;
      return;
    }
    if(!chartInstance){
      chartInstance = window.echarts.init(container);
      window.addEventListener('resize', () => chartInstance && chartInstance.resize());
    }
    chartInstance.setOption(buildOption(type), true);
    setTimeout(() => chartInstance && chartInstance.resize(), 80);
  }

  function toggleChart(txtEl){
    const chartBox = txtEl.querySelector('[data-stats-chart]');
    const btn = txtEl.querySelector('[data-stats-action="chart"]');
    const show = !chartBox.classList.contains('show');
    chartBox.classList.toggle('show', show);
    btn.innerHTML = show ? '<span class="sb-ic">📈</span>收起图表' : '<span class="sb-ic">📊</span>生成统计图';
    if(show){
      const sel = txtEl.querySelector('[data-stats-chart-type]');
      renderChart(txtEl, sel ? sel.value : 'bar');
    } else if(chartInstance){
      chartInstance.dispose(); chartInstance = null;
    }
  }

  // ---------- 地图图层 ----------
  function generatePoints(){
    const rnd = mulberry32(20260814);
    const points = [];
    FACILITY_STATS.categories.forEach((cat, ci) => {
      const n = POINT_WEIGHTS[ci] || 8;
      for(let i = 0; i < n; i++){
        // 按类型做小范围聚集，模拟设施分布；类型间中心略微错开
        const cx = CD_CENTER[1] + (ci - 3) * 0.012;
        const cy = CD_CENTER[0] + (ci % 2 === 0 ? 0.008 : -0.008);
        const lat = cy + (rnd() - 0.5) * CD_SPAN;
        const lng = cx + (rnd() - 0.5) * CD_SPAN * 1.25;
        points.push({ lat, lng, type: cat.name, color: cat.color, radius: 5 + Math.round(rnd() * 3) });
      }
    });
    return points;
  }

  function showOnMap(){
    if(typeof window.switchWorkspace === 'function') window.switchWorkspace('map');
    if(typeof window.MapLayers === 'undefined'){
      toast('图层管理组件未就绪');
      return;
    }
    // 重复点击：先移除旧动态图层再重建
    if(registeredLayerId) window.MapLayers.removeDynamicLayer(registeredLayerId);

    const layerId = 'stat-facility-chengdu';
    const points = generatePoints();
    window.MapLayers.registerDynamicLayer({
      id: layerId,
      name: '成都市设施统计',
      fileName: '成都市设施统计.geojson',
      type: 'GeoJSON',
      geometryType: '点',
      legend: '7 类设施 · 按类型着色',
      color: '#10B981',
      points
    });
    registeredLayerId = layerId;

    // 飞到成都范围
    if(typeof map !== 'undefined' && map){
      map.setView(CD_CENTER, 9);
      setTimeout(() => { if(map && typeof map.invalidateSize === 'function') map.invalidateSize(); }, 80);
    }
    // 打开图层管理器面板（图层已新建并加载）
    window.MapLayers.openPanel();
    toast('已在地图中渲染设施标注，并新建图层「成都市设施统计」');
  }

  // ---------- Excel 导出 ----------
  function exportExcel(){
    if(typeof window.XLSX === 'undefined'){
      toast('导出组件未加载（SheetJS CDN 不可用）');
      return;
    }
    const data = [FACILITY_STATS.columns, ...FACILITY_STATS.rows];
    const ws = window.XLSX.utils.aoa_to_sheet(data);
    // 列宽优化
    ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 14 }];
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, '成都市设施统计');
    window.XLSX.writeFile(wb, '成都市设施统计.xlsx');
    toast('已导出统计结果：成都市设施统计.xlsx');
  }

  // ---------- 对外 API ----------
  window.StatisticsRenderer = {
    renderResult,
    showChart: (txtEl, type) => { toggleChart(txtEl); if(type) txtEl.querySelector('[data-stats-chart-type]').value = type; },
    showOnMap,
    exportExcel,
    getData: () => FACILITY_STATS
  };
})();

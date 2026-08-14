// ============ 制图智能体核心模块 ============
// 职责：用地图数据模型 / 生成 / 模板管理 / 导出 / 状态机
(function(){
  'use strict';

  // ── 状态 ─────────────────────────────────────────────
  const state = {
    stage: 'idle',              // idle | analyzing | layer-ready | editing | template | fine-tune | export
    currentMap: null,            // 当前用地图数据（LandUseMapData）
    activeTemplate: null,        // 当前套用的模板（MapTemplate）
    templateElements: [],        // 已渲染的模板 DOM 元素引用
    sourceLayerId: null,         // 来源图层 ID
  };

  // ── 用地图数据模型 ─────────────────────────────────────
  /**
   * @typedef {Object} LandUseCategory
   * @property {string} code - 分类代码
   * @property {string} name - 分类名称
   * @property {string} color - 填充色（hex）
   * @property {number} area - 面积（公顷）
   * @property {number} ratio - 占比（0~1）
   * @property {number} featureCount - 要素数量
   */
  /**
   * @typedef {Object} LandUseFeature
   * @property {string} id - 要素 ID
   * @property {string} categoryCode - 所属分类代码
   * @property {string} categoryName - 分类名称
   * @property {number} area - 面积
   * @property {string} points - SVG polygon points 字符串
   * @property {string} [fill] - 覆盖填充色
   * @property {number} [fillOpacity] - 覆盖透明度
   * @property {string} [stroke] - 覆盖边框色
   * @property {number} [strokeWidth] - 覆盖边框宽
   */
  /**
   * @typedef {Object} LandUseMapData
   * @property {string} id - 图层唯一 ID
   * @property {string} name - 图层名称
   * @property {number} createdAt - 生成时间戳
   * @property {string} sourceLayerId - 来源图层 ID
   * @property {LandUseCategory[]} categories - 地类列表
   * @property {LandUseFeature[]} features - 要素列表
   * @property {number} totalArea - 总面积（公顷）
   * @property {string} unit - 面积单位
   */

  // ── 内置地类方案（模拟数据） ────────────────────────────
  const DEFAULT_CATEGORIES = [
    { code: '01', name: '耕地',    color: '#FFFACD', strokeColor: '#DAA520', area: 1256.8, ratio: 0.28 },
    { code: '02', name: '林地',    color: '#228B22', strokeColor: '#006400', area: 892.3,  ratio: 0.20 },
    { code: '03', name: '建设用地', color: '#FF6B6B', strokeColor: '#DC143C', area: 756.2,  ratio: 0.17 },
    { code: '04', name: '水域',    color: '#87CEEB', strokeColor: '#4682B4', area: 445.6,  ratio: 0.10 },
    { code: '05', name: '未利用地', color: '#D3D3D3', strokeColor: '#A9A9A9', area: 1123.4, ratio: 0.25 },
  ];

  // ── 生成模拟用地图要素 ──────────────────────────────────
  /**
   * 为指定分类生成一组 SVG polygon 要素
   * @param {LandUseCategory} cat
   * @param {number} startIndex 起始索引（用于 ID 和位置偏移）
   * @param {number} count 生成数量
   * @returns {LandUseFeature[]}
   */
  function generateFeaturesForCategory(cat, startIndex, count) {
    const features = [];
    for (let i = 0; i < count; i++) {
      const idx = startIndex + i;
      const col = idx % 9;
      const row = Math.floor(idx / 9);
      // 每个分类有不同的空间分布特征
      const colOffset = (cat.code.charCodeAt(1) - '0'.charCodeAt(0)) * 18;  // 不同分类错开
      const rowOffset = Math.floor(cat.code.charCodeAt(1) - '0'.charCodeAt(0)) * 12;
      const x = 175 + col * 72 + colOffset + (row % 2) * 20 + (i % 4) * 5;
      const y = 130 + row * 65 + rowOffset + (i % 3) * 8;
      const w = 38 + (i % 5) * 8 + (cat.code === '03' ? 15 : 0);  // 建设地块稍大
      const h = 30 + (i % 3) * 10 + (cat.code === '02' ? 12 : 0);   // 林地稍长
      // 简单多边形（带随机扰动模拟真实地块）
      const pts = [
        `${x},${y + 4}`,
        `${x + 8},${y}`,
        `${x + w},${y + 3}`,
        `${x + w - 3},${y + h}`,
        `${x + 6},${y + h + 3}`,
      ];
      features.push({
        id: `LU-${cat.code}-${String(idx + 1).padStart(3, '0')}`,
        categoryCode: cat.code,
        categoryName: cat.name,
        area: +(cat.area / count * (0.7 + Math.random() * 0.6)).toFixed(1),
        points: pts.join(' '),
        fill: cat.color,
        fillOpacity: 0.55,
        stroke: cat.strokeColor,
        strokeWidth: 1.5,
      });
    }
    return features;
  }

  // ── 核心生成函数 ─────────────────────────────────────────
  /**
   * 基于来源图层生成现状用地图数据
   * @param {Object} [sourceLayer] 来源图层信息（可选，用于上下文）
   * @returns {LandUseMapData}
   */
  function generateLandUseMap(sourceLayer) {
    const timestamp = Date.now();
    const mapId = `landuse-${timestamp}`;

    // 为每个分类生成要素
    const categoryFeatureCounts = [45, 32, 28, 15, 38];  // 各分类要素数
    let allFeatures = [];
    let globalIdx = 0;

    const categories = DEFAULT_CATEGORIES.map((cat, idx) => {
      const count = categoryFeatureCounts[idx];
      const feats = generateFeaturesForCategory(cat, globalIdx, count);
      allFeatures = allFeatures.concat(feats);
      globalIdx += count;
      return { ...cat, featureCount: count };
    });

    const totalArea = categories.reduce((sum, c) => sum + c.area, 0);

    const mapData = {
      id: mapId,
      name: sourceLayer ? `现状用地图（基于${sourceLayer.name}）` : '现状用地图',
      createdAt: timestamp,
      sourceLayerId: sourceLayer?.id || null,
      categories: categories,
      features: allFeatures,
      totalArea: totalArea,
      unit: '公顷',
    };

    state.currentMap = mapData;
    state.stage = 'layer-ready';

    return mapData;
  }

  // ── 进度步骤定义 ─────────────────────────────────────────
  const ANALYSIS_STEPS = [
    { key: 'recognize', label: '识别当前图层与用地类型' },
    { key: 'classify',  label: '分类统计各地类面积与占比' },
    { key: 'generate', label: '生成《现状用地图》成果' },
  ];

  // ── 模板系统 ─────────────────────────────────────────────
  /**
   * @typedef {Object} TemplateElement
   * @property {string} type - 元素类型：frame/innerFrame/title/legend/northArrow/scaleBar/textBlock
   * @property {number} x - X 位置（百分比或绝对值）
   * @property {number} y - Y 位置
   * @property {number} [width] - 宽度
   * @property {number} [height] - 高度
   * @property {string} [text] - 文本内容（支持 {mapTitle} 等变量）
   * @property {string} [align] - 对齐方式
   */
  /**
   * @typedef {Object} MapTemplate
   * @property {string} id - 模板 ID
   * @property {string} name - 模板名称
   * @property {string} desc - 描述
   * @property {string} thumbnail - 缩略图 emoji
   * @property {string} category - 分类：标准图框 / 专题模板 / 报告版式
   * @property {string[]} tags - 搜索标签
   * @property {TemplateElement[]} elements - 模板元素数组
   */

  /** @type {MapTemplate[]} 官方模板库 */
  const BUILTIN_TEMPLATES = [
    {
      id: 'a3-landscape',
      name: '标准 A3 横版',
      desc: '标准制图图框，含内图廓、坐标网、图例、指北针、比例尺',
      thumbnail: '📐',
      category: '标准图框',
      tags: ['A3','横版','标准','图框','制图','通用'],
      elements: [
        { type: 'frame',       x: 10, y: 10, width: 980, height: 680 },
        { type: 'innerFrame',  x: 20, y: 20, width: 960, height: 640 },
        { type: 'title',       x: 500, y: 668, text: '{mapTitle}', align: 'center' },
        { type: 'legend',      x: 900, y: 30,  width: 85, height: 180 },
        { type: 'northArrow',  x: 940, y: 240, size: 30 },
        { type: 'scaleBar',    x: 480, y: 670, width: 120 },
        { type: 'textBlock',   x: 25, y: 668, text: '制图单位：{org}', align: 'left', fontSize: 10 },
        { type: 'textBlock',   x: 850, y: 668, text: '日期：{date}', align: 'left', fontSize: 10 },
      ],
    },
    {
      id: 'a4-portrait',
      name: '标准 A4 竖版',
      desc: '竖版布局，适合报告插图',
      thumbnail: '📄',
      category: '标准图框',
      tags: ['A4','竖版','标准','报告','插图'],
      elements: [
        { type: 'frame',       x: 40, y: 10, width: 520, height: 720 },
        { type: 'innerFrame',  x: 48, y: 18, width: 504, height: 660 },
        { type: 'title',       x: 300, y: 708, text: '{mapTitle}', align: 'center' },
        { type: 'legend',      x: 500, y: 30,  width: 55, height: 160 },
        { type: 'northArrow',  x: 528, y: 210, size: 22 },
        { type: 'scaleBar',    x: 260, y: 710, width: 80 },
      ],
    },
    {
      id: 'a2-landscape',
      name: '标准 A2 横版',
      desc: '大幅面标准图框，坐标网+接图表，适合分区成果图',
      thumbnail: '🗺️',
      category: '标准图框',
      tags: ['A2','横版','大幅面','坐标网','接图表'],
      elements: [
        { type: 'frame',       x: 5, y: 5, width: 990, height: 690 },
        { type: 'innerFrame',  x: 14, y: 14, width: 972, height: 672 },
        { type: 'title',       x: 500, y: 678, text: '{mapTitle}', align: 'center', fontSize: 15 },
        { type: 'legend',      x: 895, y: 22,  width: 90, height: 200 },
        { type: 'northArrow',  x: 940, y: 245, size: 32 },
        { type: 'scaleBar',    x: 430, y: 680, width: 150 },
        { type: 'textBlock',   x: 20, y: 678, text: '制图单位：{org}', align: 'left', fontSize: 10 },
        { type: 'textBlock',   x: 830, y: 678, text: '日期：{date}', align: 'left', fontSize: 10 },
      ],
    },
    {
      id: 'cad-style',
      name: 'CAD 制图风',
      desc: '类 CAD 黑白线框风格，适合技术审查',
      thumbnail: '📏',
      category: '标准图框',
      tags: ['CAD','线框','黑白','技术','审查'],
      elements: [
        { type: 'frame',       x: 15, y: 15, width: 970, height: 670 },
        { type: 'innerFrame',  x: 22, y: 22, width: 956, height: 656 },
        { type: 'title',       x: 500, y: 660, text: '{mapTitle}', align: 'center' },
        { type: 'legend',      x: 900, y: 30,  width: 80, height: 170 },
        { type: 'northArrow',  x: 938, y: 220, size: 26 },
        { type: 'scaleBar',    x: 460, y: 662, width: 110 },
        { type: 'textBlock',   x: 22, y: 660, text: '图纸编号：{source}', align: 'left', fontSize: 9 },
      ],
    },
    {
      id: 'three-lines',
      name: '三线划定专题图',
      desc: '预置三线图例配色，含冲突区标注位',
      thumbnail: '🚦',
      category: '专题模板',
      tags: ['三线','永久基本农田','生态红线','城镇开发边界','专题'],
      elements: [
        { type: 'frame',       x: 10, y: 10, width: 980, height: 680 },
        { type: 'innerFrame',  x: 20, y: 20, width: 960, height: 640 },
        { type: 'title',       x: 500, y: 668, text: '{mapTitle}', align: 'center' },
        { type: 'legend',      x: 900, y: 30,  width: 85, height: 210 },
        { type: 'northArrow',  x: 940, y: 260, size: 30 },
        { type: 'scaleBar',    x: 480, y: 670, width: 120 },
      ],
    },
    {
      id: 'landuse-theme',
      name: '用地分类专题图',
      desc: '按用地分类配色方案排布图例，适合现状图',
      thumbnail: '🌈',
      category: '专题模板',
      tags: ['用地','现状','分类','专题','图例'],
      elements: [
        { type: 'frame',       x: 12, y: 12, width: 976, height: 676 },
        { type: 'title',       x: 500, y: 665, text: '{mapTitle}', align: 'center', fontSize: 14 },
        { type: 'legend',      x: 905, y: 28,  width: 80, height: 200 },
        { type: 'northArrow',  x: 942, y: 250, size: 28 },
        { type: 'scaleBar',    x: 470, y: 667, width: 120 },
        { type: 'textBlock',   x: 20, y: 665, text: '数据来源：{source}', align: 'left', fontSize: 9 },
      ],
    },
    {
      id: 'monitoring',
      name: '监测预警图',
      desc: '红色警示配色，标注区预留，适合预警成果',
      thumbnail: '⚠️',
      category: '专题模板',
      tags: ['监测','预警','警示','标注'],
      elements: [
        { type: 'frame',       x: 10, y: 10, width: 980, height: 680 },
        { type: 'title',       x: 500, y: 668, text: '{mapTitle}', align: 'center', fill: '#DC2626' },
        { type: 'legend',      x: 900, y: 30,  width: 85, height: 180 },
        { type: 'northArrow',  x: 940, y: 235, size: 30 },
        { type: 'scaleBar',    x: 480, y: 670, width: 120 },
      ],
    },
    {
      id: 'report-a4',
      name: '报告插图版',
      desc: '顶部标题+底部注释，适合嵌入调研报告',
      thumbnail: '📑',
      category: '报告版式',
      tags: ['报告','插图','A4','注释','调研'],
      elements: [
        { type: 'textBlock',  x: 30, y: 25, text: '{mapTitle}', align: 'left', fontSize: 18, bold: true },
        { type: 'innerFrame', x: 20, y: 45, width: 960, height: 600 },
        { type: 'legend',     x: 890, y: 60, width: 80, height: 180 },
        { type: 'northArrow', x: 930, y: 260, size: 26 },
        { type: 'scaleBar',   x: 430, y: 660, width: 120 },
        { type: 'textBlock',  x: 20, y: 660, text: '数据来源：{source} · 制图单位：{org} · {date}', align: 'left', fontSize: 9 },
      ],
    },
    {
      id: 'presentation',
      name: '汇报展示版',
      desc: '大标题+醒目图例，适合 PPT 截图嵌入',
      thumbnail: '🎯',
      category: '报告版式',
      tags: ['汇报','PPT','展示','大标题'],
      elements: [
        { type: 'textBlock',  x: 20, y: 15, text: '{mapTitle}', align: 'left', fontSize: 22, bold: true },
        { type: 'innerFrame', x: 20, y: 50, width: 960, height: 600 },
        { type: 'legend',     x: 880, y: 60, width: 90, height: 200 },
        { type: 'northArrow', x: 930, y: 280, size: 28 },
        { type: 'scaleBar',   x: 440, y: 665, width: 120 },
        { type: 'textBlock',  x: 20, y: 665, text: '数据来源：{source} · 单位：{unit}', align: 'left', fontSize: 9 },
      ],
    },
    {
      id: 'minimal',
      name: '简洁无框版',
      desc: '仅保留图例和指北针，适合快速预览',
      thumbnail: '✨',
      category: '报告版式',
      tags: ['简洁','无框','快速','预览'],
      elements: [
        { type: 'legend',     x: 920, y: 20,  width: 70, height: 150 },
        { type: 'northArrow', x: 952, y: 190, size: 24 },
        { type: 'scaleBar',   x: 450, y: 685, width: 100 },
      ],
    },
  ];

  /** 官方模板库分类 */
  const TEMPLATE_CATEGORIES = ['全部', '标准图框', '专题模板', '报告版式'];

  /**
   * 搜索模板库（按名称 / 标签 / 分类模糊匹配）
   * @param {string} keyword
   * @param {string} category
   * @returns {MapTemplate[]}
   */
  function searchTemplates(keyword = '', category = '全部') {
    const kw = (keyword || '').trim().toLowerCase();
    return BUILTIN_TEMPLATES.filter(t => {
      if (category !== '全部' && t.category !== category) return false;
      if (!kw) return true;
      const haystack = [t.name, t.desc, t.category, ...(t.tags || [])].join(' ').toLowerCase();
      return haystack.includes(kw);
    });
  }

  // ── 模板渲染 ─────────────────────────────────────────────
  /**
   * 将模板渲染为 SVG 元素叠加到结果图层上
   * @param {MapTemplate} template
   * @param {LandUseMapData} mapData
   * @returns {SVGElement[]} 渲染出的 SVG 元素数组
   */
  function renderTemplate(template, mapData) {
    const container = $('#mapResultSvg');
    if (!container) return [];

    // 清除旧模板
    clearTemplate();
    state.selectedTemplateIdx = null;

    const rendered = [];
    const vars = {
      mapTitle: mapData?.name || '现状用地图',
      org: '致地AI制图',
      date: new Date().toLocaleDateString('zh-CN'),
      source: mapData?.sourceLayerId || '智能分析',
      unit: mapData?.unit || '公顷',
    };
    state.templateVars = vars;   // 供后续元素修改重建使用

    template.elements.forEach((el, idx) => {
      const svgEl = createTemplateSVGElement(el, vars);
      if (svgEl) {
        svgEl.dataset.templateElement = el.type;
        svgEl.dataset.templateIdx = String(idx);
        svgEl.classList.add('carto-template-element');
        container.appendChild(svgEl);
        rendered.push(svgEl);
      }
    });

    state.activeTemplate = template;
    state.templateElements = rendered;
    state.stage = 'template';
    bindTemplateSelection(rendered);
    return rendered;
  }

  /** 模板元素交互：点击选中 → 让智能体修改；选中后拖拽 → 直接移动；标题/文字/比例尺双击 → 直接编辑 */
  function bindTemplateSelection(rendered) {
    rendered.forEach((svgEl, idx) => {
      // tooltip 提示
      const type = state.activeTemplate.elements[idx]?.type;
      const label = TEMPLATE_ELEMENT_LABELS[type] || '模板元素';
      const tip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      tip.textContent = `${label}：点击让智能体修改 · 拖动可移动${type === 'title' || type === 'textBlock' || type === 'scaleBar' ? ' · 双击直接编辑' : ''}`;
      svgEl.appendChild(tip);

      svgEl.addEventListener('click', event => {
        event.stopPropagation();
        // 拖拽刚结束时抑制 click 派发，避免重复触发 AI 引导
        if (justDragged) { justDragged = false; return; }
        selectTemplateElement(idx);
      });

      // 标题 / 文字注记 / 比例尺：双击直接修改内容
      if (type === 'title' || type === 'textBlock' || type === 'scaleBar') {
        svgEl.addEventListener('dblclick', event => {
          event.stopPropagation();
          event.preventDefault();
          openInlineEditor(idx);
        });
      }

      bindTemplateDrag(svgEl, idx);
    });
  }

  /** 双击编辑弹窗：直接修改标题 / 文字注记 / 比例尺内容 */
  function openInlineEditor(idx) {
    const element = state.activeTemplate?.elements?.[idx];
    if (!element) return;
    const label = TEMPLATE_ELEMENT_LABELS[element.type] || '模板元素';
    const input = $('#cartoInlineEditInput');
    if (!input) return;
    // 预填当前内容（标题变量已替换为实际文字）
    let current = element.text || '';
    if (element.type === 'title' && !current) current = state.currentMap?.name || '现状用地图';
    input.value = current;
    $('#cartoInlineEditTitle').textContent = `修改${label}`;
    $('#cartoInlineEditHint').textContent = element.type === 'scaleBar' ? '输入比例尺文字，如：0    1    2 km' : '输入新内容，如：福田区现状用地图';
    inlineEditIndex = idx;
    const mask = $('#cartoInlineEditMask');
    mask.classList.add('show');
    requestAnimationFrame(() => input.focus());
  }
  function confirmInlineEditor() {
    const idx = inlineEditIndex;
    if (idx === null) return;
    const value = $('#cartoInlineEditInput')?.value.trim();
    if (!value) { toast('内容不能为空'); return; }
    const label = TEMPLATE_ELEMENT_LABELS[state.activeTemplate?.elements?.[idx]?.type] || '模板元素';
    updateTemplateElement(idx, { text: value });
    closeInlineEditor();
    toast(`已修改${label}为「${value}」`);
  }
  function closeInlineEditor() {
    $('#cartoInlineEditMask')?.classList.remove('show');
    inlineEditIndex = null;
  }

  // 拖拽状态
  let dragState = null;       // { idx, startX, startY, origX, origY }
  let justDragged = false;    // 标记刚完成拖拽（抑制后续 click 事件派发）
  let inlineEditIndex = null; // 双击编辑弹窗当前目标元素索引

  function bindTemplateDrag(svgEl, idx) {
    svgEl.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.stopPropagation();
      event.preventDefault();
      // 视觉选中 + 广播选中事件（由选择元素栏展示选中状态，无需 AI 回复）
      selectTemplateElement(idx);
      const el = state.activeTemplate?.elements?.[idx];
      if (!el) return;
      dragState = { idx, startX: event.clientX, startY: event.clientY, origX: el.x || 0, origY: el.y || 0 };
      try { svgEl.setPointerCapture(event.pointerId); } catch (e) {}
      svgEl.classList.add('template-dragging');
    });
    svgEl.addEventListener('pointermove', event => {
      if (!dragState || dragState.idx !== idx) return;
      const rect = $('#mapResultSvg').getBoundingClientRect();
      const dx = (event.clientX - dragState.startX) / rect.width * 1000;
      const dy = (event.clientY - dragState.startY) / rect.height * 700;
      applyDragPreview(idx, dragState.origX + dx, dragState.origY + dy);
    });
    svgEl.addEventListener('pointerup', event => {
      if (!dragState || dragState.idx !== idx) return;
      const rect = $('#mapResultSvg').getBoundingClientRect();
      const dx = (event.clientX - dragState.startX) / rect.width * 1000;
      const dy = (event.clientY - dragState.startY) / rect.height * 700;
      const moved = Math.abs(dx) > 1 || Math.abs(dy) > 1;
      dragState = null;
      svgEl.classList.remove('template-dragging');
      if (moved) {
        justDragged = true;
        const newX = Math.round((state.activeTemplate.elements[idx]?.x || 0) + dx);
        const newY = Math.round((state.activeTemplate.elements[idx]?.y || 0) + dy);
        // 提交配置 + 重渲染
        updateTemplateElement(idx, { x: newX, y: newY });
        const label = TEMPLATE_ELEMENT_LABELS[state.activeTemplate.elements[idx]?.type] || '模板元素';
        document.dispatchEvent(new CustomEvent('carto:template-element-moved', {
          detail: { idx, type: state.activeTemplate.elements[idx]?.type, label, x: newX, y: newY }
        }));
      }
    });
    svgEl.addEventListener('pointercancel', () => {
      dragState = null;
      svgEl.classList.remove('template-dragging');
    });
  }

  /** 拖拽中的实时预览（g 元素用 translate，其余直接改 x/y） */
  function applyDragPreview(idx, x, y) {
    const svgEl = state.templateElements[idx];
    if (!svgEl) return;
    const el = state.activeTemplate?.elements?.[idx];
    if (!el) return;
    if (el.type === 'legend' || el.type === 'northArrow' || el.type === 'scaleBar') {
      const dx = x - (el.x || 0), dy = y - (el.y || 0);
      svgEl.setAttribute('transform', `translate(${dx.toFixed(1)},${dy.toFixed(1)})`);
    } else {
      svgEl.setAttribute('x', String(x.toFixed(1)));
      svgEl.setAttribute('y', String(y.toFixed(1)));
    }
  }

  /** 视觉选中（高亮切换），不派发事件 */
  function setSelectionVisual(idx) {
    if (!state.templateElements[idx]) return;
    state.templateElements.forEach((el, i) => el.classList.toggle('template-selected', i === idx));
    state.selectedTemplateIdx = idx;
  }

  function selectTemplateElement(idx) {
    setSelectionVisual(idx);
    const element = state.activeTemplate?.elements?.[idx] || null;
    if (element) {
      const label = TEMPLATE_ELEMENT_LABELS[element.type] || element.type;
      // 广播选中事件：由 map-interaction 在选择元素栏展示选中状态
      document.dispatchEvent(new CustomEvent('carto:template-element-selected', {
        detail: { idx, type: element.type, label, element: { ...element } }
      }));
    }
  }
  function clearTemplateSelection() {
    state.selectedTemplateIdx = null;
    dragState = null;
    state.templateElements.forEach(el => el.classList.remove('template-selected'));
  }

  /**
   * 修改模板元素（智能体修改指令执行入口）
   * @param {number} idx 元素索引
   * @param {Object} changes 修改项：{ x, y, text, fontSize, fill, stroke, strokeWidth, size, bold }
   * @returns {boolean}
   */
  function updateTemplateElement(idx, changes) {
    if (!state.activeTemplate) return false;
    const elements = state.activeTemplate.elements;
    if (!elements[idx] || !changes) return false;

    // 合并修改到配置
    Object.assign(elements[idx], changes);
    const container = $('#mapResultSvg');
    const oldEl = state.templateElements[idx];
    const newEl = createTemplateSVGElement(elements[idx], state.templateVars || {});
    if (newEl) {
      newEl.dataset.templateElement = elements[idx].type;
      newEl.dataset.templateIdx = String(idx);
      newEl.classList.add('carto-template-element');
      if (oldEl?.nextSibling) container.insertBefore(newEl, oldEl.nextSibling);
      else container.appendChild(newEl);
      state.templateElements[idx] = newEl;
      // 重新绑定完整交互（点击选中 + 拖拽移动 + 双击编辑 + tooltip）
      const label = TEMPLATE_ELEMENT_LABELS[elements[idx].type] || '模板元素';
      const tip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      tip.textContent = `${label}：点击让智能体修改 · 拖动可移动${elements[idx].type === 'title' || elements[idx].type === 'textBlock' || elements[idx].type === 'scaleBar' ? ' · 双击直接编辑' : ''}`;
      newEl.appendChild(tip);
      newEl.addEventListener('click', event => {
        event.stopPropagation();
        if (justDragged) { justDragged = false; return; }
        selectTemplateElement(idx);
      });
      if (elements[idx].type === 'title' || elements[idx].type === 'textBlock' || elements[idx].type === 'scaleBar') {
        newEl.addEventListener('dblclick', event => {
          event.stopPropagation();
          event.preventDefault();
          openInlineEditor(idx);
        });
      }
      bindTemplateDrag(newEl, idx);
    }
    if (oldEl) oldEl.remove();

    // 图例：重建后需重新渲染图例条目
    if (elements[idx].type === 'legend') renderLegendSVG(state.legendItems);
    // 保持选中态
    state.templateElements[idx]?.classList.add('template-selected');
    return true;
  }

  /** 模板元素类型 → 中文名 */
  const TEMPLATE_ELEMENT_LABELS = {
    frame: '图框', innerFrame: '内图廓', title: '图片标题',
    legend: '图例', northArrow: '指北针', scaleBar: '比例尺', textBlock: '文字注记',
  };

  /**
   * 创建单个模板元素的 SVG 节点
   */
  function createTemplateSVGElement(el, vars) {
    const ns = 'http://www.w3.org/2000/svg';
    let text = (el.text || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] || '');

    switch (el.type) {
      case 'frame': {
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', el.x); rect.setAttribute('y', el.y);
        rect.setAttribute('width', el.width); rect.setAttribute('height', el.height);
        rect.setAttribute('fill', 'none'); rect.setAttribute('stroke', '#334155');
        rect.setAttribute('stroke-width', '2.5'); return rect;
      }
      case 'innerFrame': {
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', el.x); rect.setAttribute('y', el.y);
        rect.setAttribute('width', el.width); rect.setAttribute('height', el.height);
        rect.setAttribute('fill', 'none'); rect.setAttribute('stroke', '#94A3B8');
        rect.setAttribute('stroke-width', '0.8');
        rect.setAttribute('stroke-dasharray', '8,4'); return rect;
      }
      case 'title':
      case 'textBlock': {
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('x', el.x); t.setAttribute('y', el.y);
        if (el.align === 'center') t.setAttribute('text-anchor', 'middle');
        t.setAttribute('fill', el.fill || '#1E293B');
        t.setAttribute('font-size', (el.fontSize || 12) + 'px');
        if (el.bold) t.setAttribute('font-weight', 'bold');
        t.setAttribute('font-family', '-apple-system, "Microsoft YaHei", sans-serif');
        t.textContent = text; return t;
      }
      case 'legend': {
        const g = document.createElementNS(ns, 'g');
        g.classList.add('carto-template-legend');
        // 图例背景
        const bg = document.createElementNS(ns, 'rect');
        bg.setAttribute('x', el.x - 6); bg.setAttribute('y', el.y - 6);
        bg.setAttribute('width', el.width + 12); bg.setAttribute('height', el.height + 12);
        bg.setAttribute('fill', 'rgba(255,255,255,.88)');
        bg.setAttribute('stroke', '#CBD5E1'); bg.setAttribute('stroke-width', '0.6');
        bg.setAttribute('rx', '4'); g.appendChild(bg);
        // 图例标题
        const title = document.createElementNS(ns, 'text');
        title.setAttribute('x', el.x); title.setAttribute('y', el.y + 4);
        title.setAttribute('font-size', '11px'); title.setAttribute('font-weight', 'bold');
        title.setAttribute('fill', '#334155'); title.textContent = '图例'; g.appendChild(title);
        // 动态填充地类条目（延迟到有数据时更新）
        g.dataset.legendX = el.x; g.dataset.legendY = el.y + 18;
        return g;
      }
      case 'northArrow': {
        const g = document.createElementNS(ns, 'g');
        g.classList.add('carto-template-north');
        const size = el.size || 24;
        // 三角形指北针
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', `M${el.x},${el.y - size} L${el.x - size * 0.35},${el.y + size * 0.3} L${el.x},${el.y + size * 0.1} L${el.x + size * 0.35},${el.y + size * 0.3} Z`);
        path.setAttribute('fill', '#DC2626'); g.appendChild(path);
        // N 标记
        const nLabel = document.createElementNS(ns, 'text');
        nLabel.setAttribute('x', el.x); nLabel.setAttribute('y', el.y - size - 4);
        nLabel.setAttribute('text-anchor', 'middle'); nLabel.setAttribute('font-size', '10px');
        nLabel.setAttribute('font-weight', 'bold'); nLabel.setAttribute('fill', '#DC2626');
        nLabel.textContent = 'N'; g.appendChild(nLabel);
        return g;
      }
      case 'scaleBar': {
        const g = document.createElementNS(ns, 'g');
        g.classList.add('carto-template-scale');
        // 主线
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', el.x); line.setAttribute('y1', el.y);
        line.setAttribute('x2', el.x + el.width); line.setAttribute('y2', el.y);
        line.setAttribute('stroke', '#334155'); line.setAttribute('stroke-width', '2'); g.appendChild(line);
        // 刻度
        for (let i = 0; i <= 4; i++) {
          const tick = document.createElementNS(ns, 'line');
          const tx = el.x + (el.width / 4) * i;
          tick.setAttribute('x1', tx); tick.setAttribute('y1', el.y);
          tick.setAttribute('x2', tx); tick.setAttribute('y2', el.y + (i % 2 === 0 ? 6 : 4));
          tick.setAttribute('stroke', '#334155'); tick.setAttribute('stroke-width', '1.2'); g.appendChild(tick);
        }
        // 文字（支持双击修改：el.text 优先，默认 '0    1    2 km'）
        const label = document.createElementNS(ns, 'text');
        label.setAttribute('x', el.x + el.width / 2); label.setAttribute('y', el.y + 16);
        label.setAttribute('text-anchor', 'middle'); label.setAttribute('font-size', '9px');
        label.setAttribute('fill', '#475569'); label.textContent = el.text || '0    1    2 km'; g.appendChild(label);
        return g;
      }
      default:
        return null;
    }
  }

  /** 更新模板中的动态图例内容 */
  // ── 图例数据模型与渲染 ────────────────────────────────
  // legendItems: [{ id, name, color, borderColor, borderWidth, featureIds[] }]
  function initLegendItems(mapData) {
    if (!mapData) return [];
    state.legendItems = (mapData.categories || []).map(c => {
      const ids = (mapData.features || []).filter(f => f.categoryCode === c.code).map(f => f.id);
      return {
        id: 'leg-' + c.code,
        name: c.name,
        color: c.color,
        borderColor: c.strokeColor || '#334155',
        borderWidth: 1,
        featureIds: ids,
      };
    });
    return state.legendItems;
  }
  function getLegendItems() { return state.legendItems || []; }

  /** 图例数据变更广播：通知图例管理器等模块实时刷新（无需手动刷新） */
  function emitLegendChanged() {
    document.dispatchEvent(new CustomEvent('carto:legend-items-changed', {
      detail: { items: getLegendItems() }
    }));
  }

  /** 将图例条目渲染到地图上的图例框（模板图例 SVG 组） */
  function renderLegendSVG(items) {
    const legendGroup = $('#mapResultSvg .carto-template-legend');
    if (!legendGroup) return;
    legendGroup.querySelectorAll('.carto-legend-item').forEach(el => el.remove());
    const baseX = Number(legendGroup.dataset.legendX) || 0;
    const baseY = Number(legendGroup.dataset.legendY) || 0;
    const ns = 'http://www.w3.org/2000/svg';
    (items || []).forEach((item, idx) => {
      const cy = baseY + idx * 22;
      const itemG = document.createElementNS(ns, 'g');
      itemG.classList.add('carto-legend-item');
      itemG.dataset.legendId = item.id;
      const box = document.createElementNS(ns, 'rect');
      box.setAttribute('x', baseX); box.setAttribute('y', cy - 8);
      box.setAttribute('width', 14); box.setAttribute('height', 10);
      box.setAttribute('fill', item.color);
      box.setAttribute('stroke', item.borderColor);
      box.setAttribute('stroke-width', item.borderWidth || 1);
      itemG.appendChild(box);
      const name = document.createElementNS(ns, 'text');
      name.setAttribute('x', baseX + 18); name.setAttribute('y', cy + 1);
      name.setAttribute('font-size', '9px'); name.setAttribute('fill', '#334155');
      name.textContent = item.name; itemG.appendChild(name);
      legendGroup.appendChild(itemG);
    });
  }

  function updateTemplateLegend(mapData) {
    if (state.legendItems && state.legendItems.length) { renderLegendSVG(state.legendItems); }
    else if (mapData) { renderLegendSVG(initLegendItems(mapData)); }
  }

  // ── 图例管理面板 ──────────────────────────────────────
  const LEGEND_COLORS = ['#FFFACD', '#228B22', '#FF6B6B', '#87CEEB', '#D3D3D3', '#F4A261', '#9C89B8', '#F9C74F', '#90BE6D', '#43AA8B'];
  const LEGEND_BORDER_WIDTHS = [1, 1.5, 2, 2.5];
  let legendExpandedId = null;   // 当前展开编辑的图例条目

  function showLegendPanel() {
    const mask = $('#cartoLegendMask');
    if (!mask) return;
    if (!state.legendItems || !state.legendItems.length) initLegendItems(state.currentMap);
    renderLegendList();
    mask.classList.add('show');
  }
  /**
   * 双击图例面板中的图例条目 → 打开图例管理弹窗并展开该条目编辑样式
   * @param {string} legendId 制图图例条目 ID（cartoLegendId）
   */
  function openLegendEditor(legendId) {
    if (!legendId) { showLegendPanel(); return; }
    const exists = getLegendItems().some(item => item.id === legendId);
    if (!exists) {
      toast('该图例由图层样式驱动，暂不支持在此修改');
      return;
    }
    legendExpandedId = legendId;   // 展开目标条目，直接进入样式编辑
    showLegendPanel();
  }
  function closeLegendPanel() {
    $('#cartoLegendMask')?.classList.remove('show');
    legendExpandedId = null;
  }

  function renderLegendList() {
    const list = $('#cartoLegendList');
    if (!list) return;
    const items = getLegendItems();
    list.innerHTML = items.map(item => {
      const expanded = legendExpandedId === item.id;
      return `<div class="carto-legend-item-row ${expanded ? 'expanded' : ''}" data-legend-id="${item.id}">
        <div class="carto-legend-item-main">
          <span class="carto-legend-swatch" style="background:${item.color};border-color:${item.borderColor}"></span>
          <span class="carto-legend-name">${item.name}</span>
          <span class="carto-legend-count">${item.featureIds.length} 块</span>
          <button type="button" class="carto-legend-edit-btn">${expanded ? '收起' : '编辑'}</button>
        </div>
        ${expanded ? `<div class="carto-legend-edit">
          <div class="carto-legend-edit-label">填充颜色</div>
          <div class="carto-legend-swatches">${LEGEND_COLORS.map(c => `<button type="button" class="carto-legend-color ${c === item.color ? 'active' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}</div>
          <div class="carto-legend-edit-label">边框颜色 / 粗细</div>
          <div class="carto-legend-border-row">
            <input type="color" class="carto-legend-border-color" value="${item.borderColor}">
            <select class="carto-legend-border-width">${LEGEND_BORDER_WIDTHS.map(w => `<option value="${w}" ${w === item.borderWidth ? 'selected' : ''}>${w}px</option>`).join('')}</select>
          </div>
          <button type="button" class="carto-legend-apply" data-legend-apply="${item.id}">应用样式到该类</button>
        </div>` : ''}
      </div>`;
    }).join('');

    // 展开 / 收起
    list.querySelectorAll('.carto-legend-edit-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.closest('[data-legend-id]').dataset.legendId;
        legendExpandedId = legendExpandedId === id ? null : id;
        renderLegendList();
      });
    });
    // 色板选择（暂存）
    list.querySelectorAll('.carto-legend-color').forEach(sw => {
      sw.addEventListener('click', () => {
        const row = sw.closest('[data-legend-id]'), id = row.dataset.legendId;
        const item = getLegendItems().find(i => i.id === id); if (!item) return;
        row.querySelectorAll('.carto-legend-color').forEach(x => x.classList.remove('active'));
        sw.classList.add('active');
        item._pendingColor = sw.dataset.color;
      });
    });
    // 边框颜色
    list.querySelectorAll('.carto-legend-border-color').forEach(inp => {
      inp.addEventListener('input', () => {
        const id = inp.closest('[data-legend-id]').dataset.legendId;
        const item = getLegendItems().find(i => i.id === id); if (item) item._pendingBorderColor = inp.value;
      });
    });
    // 边框粗细
    list.querySelectorAll('.carto-legend-border-width').forEach(sel => {
      sel.addEventListener('change', () => {
        const id = sel.closest('[data-legend-id]').dataset.legendId;
        const item = getLegendItems().find(i => i.id === id); if (item) item._pendingBorderWidth = Number(sel.value);
      });
    });
    // 应用样式
    list.querySelectorAll('[data-legend-apply]').forEach(btn => {
      btn.addEventListener('click', () => applyLegendStyle(btn.dataset.legendApply));
    });
  }

  /** 应用图例样式到该类要素 + 图例框 */
  function applyLegendStyle(legendId) {
    const item = getLegendItems().find(i => i.id === legendId);
    if (!item) return;
    // 提交暂存的修改
    if (item._pendingColor !== undefined) item.color = item._pendingColor;
    if (item._pendingBorderColor !== undefined) item.borderColor = item._pendingBorderColor;
    if (item._pendingBorderWidth !== undefined) item.borderWidth = item._pendingBorderWidth;
    delete item._pendingColor; delete item._pendingBorderColor; delete item._pendingBorderWidth;

    // 应用到要素（fill/stroke/strokeWidth 与渲染属性一致）
    const style = { fill: item.color, stroke: item.borderColor, strokeWidth: item.borderWidth };
    const count = item.featureIds.length
      ? (window.MapResultInteraction?.applyStyleToFeatures?.(item.featureIds, style) || 0)
      : 0;
    renderLegendSVG(getLegendItems());
    renderLegendList();
    emitLegendChanged();   // 通知图例管理器实时刷新
    toast(count ? `已更新「${item.name}」样式 · 影响 ${count} 个图块` : `已更新图例「${item.name}」样式`);
  }

  /**
   * 从选中图块 + 指定样式创建新图例（样式管理面板「应用到选中对象并创建新图例」调用）
   * @param {Object} opts { name, color, borderColor, borderWidth, featureIds }
   * @returns {boolean} 是否创建成功
   */
  function createLegendFromStyle(opts) {
    const ids = opts?.featureIds && opts.featureIds.length
      ? opts.featureIds
      : (window.MapResultInteraction?.getSelectedFeatureIds?.() || []);
    if (!ids.length) { toast('请先在地图上选择图块'); return false; }
    const name = (opts?.name || '').trim();
    if (!name) { toast('请输入图例名称'); return false; }
    const color = opts?.color || '#10B981';
    const borderColor = opts?.borderColor || '#334155';
    const borderWidth = opts?.borderWidth || 1;

    // 确保图例数据已初始化（手动编辑场景可能先于图例面板打开）
    if (!state.legendItems) state.legendItems = initLegendItems(state.currentMap) || [];

    const item = { id: 'leg-' + Date.now(), name, color, borderColor, borderWidth, featureIds: ids };
    state.legendItems.push(item);
    // 将新样式应用到选中图块
    window.MapResultInteraction?.applyStyleToFeatures?.(ids, { fill: color, stroke: borderColor, strokeWidth: borderWidth });
    renderLegendSVG(state.legendItems);
    renderLegendList();
    emitLegendChanged();   // 自动刷新图例管理器中的列表（无需手动刷新）
    toast(`已建立新图例「${name}」并添加到图例框`);
    return true;
  }

  /**
   * 图例管理面板「保存并应用」：提交所有暂存（pending）的图例样式修改到对应图块，
   * 并保存应用到图例框；若存在选中元素，同步应用其当前样式。
   */
  function saveApplyLegendEdits() {
    const items = getLegendItems();
    let applied = 0;
    items.forEach(item => {
      const hasPending = item._pendingColor !== undefined
        || item._pendingBorderColor !== undefined
        || item._pendingBorderWidth !== undefined;
      if (!hasPending) return;
      if (item._pendingColor !== undefined) item.color = item._pendingColor;
      if (item._pendingBorderColor !== undefined) item.borderColor = item._pendingBorderColor;
      if (item._pendingBorderWidth !== undefined) item.borderWidth = item._pendingBorderWidth;
      delete item._pendingColor; delete item._pendingBorderColor; delete item._pendingBorderWidth;
      const style = { fill: item.color, stroke: item.borderColor, strokeWidth: item.borderWidth };
      if (item.featureIds.length) window.MapResultInteraction?.applyStyleToFeatures?.(item.featureIds, style);
      applied++;
    });
    // 选中元素同步：若选中元素属于某图例条目，将条目样式应用到选中元素
    const selectedIds = window.MapResultInteraction?.getSelectedFeatureIds?.() || [];
    if (selectedIds.length) {
      items.forEach(item => {
        const hit = item.featureIds.filter(id => selectedIds.includes(id));
        if (hit.length) window.MapResultInteraction?.applyStyleToFeatures?.(hit, { fill: item.color, stroke: item.borderColor, strokeWidth: item.borderWidth });
      });
    }
    renderLegendSVG(items);
    renderLegendList();
    emitLegendChanged();   // 通知图例管理器实时刷新
    if (applied) {
      closeLegendPanel();  // 应用成功：自动关闭图例管理弹窗
      toast(`已保存并应用 ${applied} 项图例样式修改`);
    } else {
      toast('当前没有待保存的样式修改');
    }
  }

  /** 清除已渲染的模板 */
  function clearTemplate() {
    state.templateElements.forEach(el => el.remove());
    state.templateElements = [];
    state.activeTemplate = null;
  }

  // ── 导出功能 ─────────────────────────────────────────────
  /**
   * 导出当前制图视图（要素层 + 模板层）为 PNG 图片
   * 方案：克隆结果 SVG（补白底 + 显式尺寸）→ Image 加载 → Canvas 渲染 → 下载
   * @param {Object} [options] { filename, scale, quality }
   */
  function exportPNG(options) {
    const opts = Object.assign({ filename: '现状用地图.png', scale: 2, quality: 0.92 }, options);
    const svgEl = $('#mapResultSvg');
    if (!svgEl) { toast('无可导出的制图内容'); return; }

    // 1. 克隆 SVG 并固定尺寸（原 SVG 尺寸由 CSS 控制，独立文档需显式 width/height）
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('width', '1000');
    clone.setAttribute('height', '700');
    clone.setAttribute('viewBox', '0 0 1000 700');
    clone.removeAttribute('preserveAspectRatio');

    // 2. 白底作为首个子元素
    const ns = 'http://www.w3.org/2000/svg';
    const bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('x', '0'); bg.setAttribute('y', '0');
    bg.setAttribute('width', '1000'); bg.setAttribute('height', '700');
    bg.setAttribute('fill', '#FFFFFF');
    clone.insertBefore(bg, clone.firstChild);

    // 2.1 合并图形标注层（用户添加的点/箭头/文字/矩形等）及箭头 marker
    const graphicsSvg = $('#mapGraphicsSvg');
    if (graphicsSvg) {
      const arrowHead = graphicsSvg.querySelector('#mapArrowHead');
      if (arrowHead) {
        let defs = clone.querySelector('defs');
        if (!defs) {
          defs = document.createElementNS(ns, 'defs');
          clone.insertBefore(defs, bg.nextSibling);
        }
        defs.appendChild(arrowHead.cloneNode(true));
      }
      graphicsSvg.querySelectorAll('.map-graphic').forEach(g => {
        clone.appendChild(g.cloneNode(true));
      });
    }

    // 3. 序列化为 SVG Blob
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }));

    // 4. Image → Canvas → PNG 下载
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round((img.naturalWidth || 1000) * opts.scale);
      canvas.height = Math.round((img.naturalHeight || 700) * opts.scale);
      const ctx = canvas.getContext('2d');
      // 先铺白底（未缩放坐标系，使用 canvas 像素尺寸）
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob(function(pngBlob) {
        if (!pngBlob) { toast('PNG 导出失败'); return; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(pngBlob);
        a.download = opts.filename;
        a.click();
        URL.revokeObjectURL(a.href);
        toast(`已导出 PNG：${opts.filename}`);
      }, 'image/png', opts.quality);
    };
    img.onerror = function() {
      URL.revokeObjectURL(url);
      toast('PNG 导出失败：SVG 解析错误');
    };
    img.src = url;
  }

  /**
   * 导出当前用地图要素为 GeoJSON（可编辑矢量成果）
   */
  function exportGeoJSON(options) {
    if (!state.currentMap) { toast('无可用地图数据'); return; }
    const baseName = (state.currentMap.name || '现状用地图').replace(/[\\/:*?"<>|]/g, '_');
    const opts = Object.assign({ filename: baseName + '.geojson' }, options);

    const geojson = {
      type: 'FeatureCollection',
      name: state.currentMap.name,
      crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::4490' } },
      features: state.currentMap.features.map(f => ({
        type: 'Feature',
        id: f.id,
        properties: {
          id: f.id,
          categoryCode: f.categoryCode,
          categoryName: f.categoryName,
          area: f.area,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [f.points.split(' ').map(pair => {
            const [x, y] = pair.split(',').map(Number);
            // SVG 坐标 → 经纬度（模拟转换）
            return [113.2 + (x / 1000) * 0.15, 23.08 + (y / 700) * 0.12];
          })],
        },
      })),
    };

    const str = JSON.stringify(geojson, null, 2);
    const blob = new Blob([str], { type: 'application/geo+json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = opts.filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`已导出 GeoJSON：${opts.filename}`);
  }

  // ── 官方模板库 UI（可浏览 / 搜索 / 分类筛选） ─────────
  let selectedTemplateId = null;
  let libraryKeyword = '';
  let libraryCategory = '全部';

  function showTemplateLibrary() {
    const mask = $('#cartoTemplateMask');
    if (!mask) return;
    // 渲染分类标签
    const catWrap = $('#cartoCatFilters');
    if (catWrap) {
      catWrap.innerHTML = TEMPLATE_CATEGORIES.map(cat =>
        `<button type="button" class="carto-cat-filter ${cat === libraryCategory ? 'active' : ''}" data-carto-cat="${cat}">${cat}</button>`
      ).join('');
      catWrap.querySelectorAll('.carto-cat-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          libraryCategory = btn.dataset.cartoCat;
          renderLibraryGrid();
        });
      });
    }
    // 渲染搜索框
    const searchInput = $('#cartoLibSearch');
    if (searchInput) searchInput.value = libraryKeyword;
    // 渲染列表
    renderLibraryGrid();
    mask.classList.add('show');
  }

  function renderLibraryGrid() {
    const grid = $('#cartoTemplateGrid');
    if (!grid) return;
    const results = searchTemplates(libraryKeyword, libraryCategory);
    const countEl = $('#cartoLibCount');
    if (countEl) countEl.textContent = results.length;
    if (!results.length) {
      grid.innerHTML = '<div class="carto-lib-empty">未找到匹配的模板，请尝试其他关键词或分类。</div>';
      return;
    }
    grid.innerHTML = results.map(t => `
      <div class="carto-template-item ${selectedTemplateId === t.id ? 'selected' : ''}" data-template-id="${t.id}">
        <div class="carto-template-thumb">${t.thumbnail}</div>
        <div class="carto-template-name">${t.name}<span class="carto-template-cat">${t.category}</span></div>
        <div class="carto-template-desc">${t.desc}</div>
      </div>
    `).join('');
    // 绑定选择事件
    grid.querySelectorAll('.carto-template-item').forEach(item => {
      item.addEventListener('click', () => {
        grid.querySelectorAll('.carto-template-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        selectedTemplateId = item.dataset.templateId;
      });
    });
  }

  function closeTemplateLibrary() {
    $('#cartoTemplateMask')?.classList.remove('show');
  }
  function confirmTemplateLibrary() {
    if (!selectedTemplateId) { toast('请先选择模板'); return; }
    const tpl = BUILTIN_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (!tpl) return;
    closeTemplateLibrary();
    // 触发添加确认 → chat.js 继续流程
    notifyTemplateAdded({ ...tpl, sourceType: 'library' });
  }

  // 兼容旧调用名
  function showTemplateSelector(){ showTemplateLibrary(); }
  function closeTemplateSelector(){ closeTemplateLibrary(); }
  function confirmTemplate(){ confirmTemplateLibrary(); }

  // ── 模板添加确认回调（事件驱动 → chat.js 继续） ────────
  let templateAddedHandler = null;
  function setTemplateAddedHandler(fn){ templateAddedHandler = fn; }
  function notifyTemplateAdded(template){
    if (templateAddedHandler) templateAddedHandler(template);
    // 同时派发事件，供其他模块监听
    document.dispatchEvent(new CustomEvent('carto:template-added', { detail: { template } }));
  }

  // ── 上传 / 指定本地路径面板 UI ─────────────────────────
  const TEMPLATE_EXTENSIONS = ['svg','dwg','dxf','geojson','json','zip','ai','pdf','dwt','dws'];
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  let uploadMode = 'file';         // file | path
  let pendingFile = null;          // 已选中的 File 对象

  function showUploadPanel() {
    const mask = $('#cartoUploadMask');
    if (!mask) return;
    resetUploadPanel();
    mask.classList.add('show');
  }
  function closeUploadPanel() {
    $('#cartoUploadMask')?.classList.remove('show');
    resetUploadPanel();
  }
  function resetUploadPanel() {
    uploadMode = 'file';
    pendingFile = null;
    $('#cartoFileInput') && ($('#cartoFileInput').value = '');
    $('#cartoFileInfo')?.setAttribute('hidden', '');
    $('#cartoFileValid')?.setAttribute('hidden', '');
    $('#cartoPathValid')?.setAttribute('hidden', '');
    $('#cartoPathInput') && ($('#cartoPathInput').value = '');
    $('#cartoUploadConfirm')?.setAttribute('disabled', '');
    document.querySelectorAll('[data-upload-tab]').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.uploadTab === 'file');
    });
    document.querySelectorAll('[data-upload-pane]').forEach(pane => {
      pane.hidden = pane.dataset.uploadPane !== 'file';
    });
  }
  function switchUploadTab(mode) {
    uploadMode = mode;
    document.querySelectorAll('[data-upload-tab]').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.uploadTab === mode);
    });
    document.querySelectorAll('[data-upload-pane]').forEach(pane => {
      pane.hidden = pane.dataset.uploadPane !== mode;
    });
    updateUploadConfirmState();
  }
  function updateUploadConfirmState() {
    const confirmBtn = $('#cartoUploadConfirm');
    if (!confirmBtn) return;
    const ready = uploadMode === 'file' ? !!pendingFile : !!($('#cartoPathInput')?.value.trim());
    if (ready) confirmBtn.removeAttribute('disabled');
    else confirmBtn.setAttribute('disabled', '');
  }

  /**
   * 校验模板文件
   * @param {File} file
   * @returns {{ok:boolean, reason?:string}}
   */
  function validateTemplateFile(file) {
    if (!file) return { ok: false, reason: '未选择文件' };
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!TEMPLATE_EXTENSIONS.includes(ext)) {
      return { ok: false, reason: `不支持的文件格式 .${ext}，请选择 ${TEMPLATE_EXTENSIONS.join(' / ')} 格式` };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { ok: false, reason: `文件大小 ${(file.size/1024/1024).toFixed(1)}MB 超过 20MB 上限` };
    }
    return { ok: true };
  }

  /**
   * 校验本地路径
   * @param {string} path
   * @returns {{ok:boolean, reason?:string, name?:string, ext?:string}}
   */
  function validateTemplatePath(path) {
    const p = (path || '').trim();
    if (!p) return { ok: false, reason: '路径不能为空' };
    // Windows 绝对路径：C:\... 或 C:/...；macOS/Linux 绝对路径：/...
    const isWinAbs = /^[a-zA-Z]:[\\/]/.test(p) || /^\\\\/.test(p);
    const isUnixAbs = /^\//.test(p);
    if (!isWinAbs && !isUnixAbs) {
      return { ok: false, reason: '请输入绝对路径（如 D:\\模板\\a3.svg 或 /home/user/template.dwg）' };
    }
    const name = p.split(/[\\/]/).pop() || '';
    if (!name || name === p) return { ok: false, reason: '无法识别文件名' };
    if (name.includes('.')) {
      const ext = name.split('.').pop().toLowerCase();
      if (!TEMPLATE_EXTENSIONS.includes(ext)) {
        return { ok: false, reason: `不支持的文件格式 .${ext}，请选择 ${TEMPLATE_EXTENSIONS.join(' / ')} 格式` };
      }
      return { ok: true, name, ext };
    }
    return { ok: false, reason: '模板文件需带扩展名（如 .svg / .dwg / .dxf）' };
  }

  function handleFileSelected(file) {
    pendingFile = file;
    const info = $('#cartoFileInfo'), validEl = $('#cartoFileValid');
    info?.removeAttribute('hidden');
    if (file) {
      $('#cartoFileName').textContent = file.name;
      $('#cartoFileSize').textContent = (file.size/1024).toFixed(1) + ' KB';
      // 校验
      const result = validateTemplateFile(file);
      if (validEl) {
        validEl.hidden = false;
        validEl.className = 'carto-file-valid ' + (result.ok ? 'ok' : 'fail');
        validEl.innerHTML = result.ok
          ? '✓ 文件有效，可添加为模板'
          : '✗ ' + result.reason;
      }
      const removeBtn = $('#cartoFileRemove');
      if (removeBtn) removeBtn.style.display = result.ok ? 'inline-flex' : 'none';
    }
    updateUploadConfirmState();
  }

  function confirmUpload() {
    let templateInfo = null;
    if (uploadMode === 'file') {
      if (!pendingFile) { toast('请先选择模板文件'); return; }
      const result = validateTemplateFile(pendingFile);
      if (!result.ok) { toast(result.reason); return; }
      templateInfo = {
        id: 'upload-' + Date.now(),
        name: pendingFile.name.replace(/\.[^.]+$/, ''),
        desc: `本地文件 · ${(pendingFile.size/1024).toFixed(1)} KB`,
        thumbnail: '📁',
        sourceType: 'upload',
        sourcePath: pendingFile.name,
        elements: [],  // 原型中本地模板渲染为简化图框
      };
    } else {
      const path = $('#cartoPathInput')?.value.trim() || '';
      const result = validateTemplatePath(path);
      if (!result.ok) {
        const validEl = $('#cartoPathValid');
        if (validEl) {
          validEl.hidden = false;
          validEl.className = 'carto-file-valid fail';
          validEl.innerHTML = '✗ ' + result.reason;
        }
        toast(result.reason);
        return;
      }
      templateInfo = {
        id: 'path-' + Date.now(),
        name: result.name.replace(/\.[^.]+$/, ''),
        desc: `本地路径 · ${path}`,
        thumbnail: '📂',
        sourceType: 'upload',
        sourcePath: path,
        elements: [],
      };
    }
    closeUploadPanel();
    // 通知 chat.js 继续流程
    notifyTemplateAdded(templateInfo);
  }

  // ── 导出面板 UI ─────────────────────────────────────────
  let exportFormat = 'png';
  function showExportPanel() {
    const mask = $('#cartoExportMask');
    if (!mask) return;
    mask.classList.add('show');

    // 重置格式选择
    mask.querySelectorAll('.carto-format-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.format === exportFormat);
    });
  }
  function closeExportPanel() {
    $('#cartoExportMask')?.classList.remove('show');
  }
  function executeExport() {
    closeExportPanel();
    const scale = Number($('#cartoExportScale')?.value || 2);
    // 文件名带地图名，双格式成果命名一致
    const baseName = (state.currentMap?.name || '现状用地图').replace(/[\\/:*?"<>|]/g, '_');
    if (exportFormat === 'png') {
      exportPNG({ scale, filename: baseName + '.png' });
    } else {
      exportGeoJSON({ filename: baseName + '.geojson' });
    }
  }

  // ── 初始化弹窗事件绑定（DOM Ready 后执行） ────────────
  function initUI() {
    // 官方模板库
    $('#cartoTemplateClose')?.addEventListener('click', closeTemplateLibrary);
    $('#cartoTemplateCancel')?.addEventListener('click', closeTemplateLibrary);
    $('#cartoTemplateConfirm')?.addEventListener('click', confirmTemplateLibrary);
    $('#cartoTemplateMask')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeTemplateLibrary();
    });
    // 模板库搜索
    $('#cartoLibSearch')?.addEventListener('input', e => {
      libraryKeyword = e.target.value;
      renderLibraryGrid();
    });

    // 上传面板
    $('#cartoUploadClose')?.addEventListener('click', closeUploadPanel);
    $('#cartoUploadCancel')?.addEventListener('click', closeUploadPanel);
    $('#cartoUploadMask')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeUploadPanel();
    });
    document.querySelectorAll('[data-upload-tab]').forEach(tab => {
      tab.addEventListener('click', () => switchUploadTab(tab.dataset.uploadTab));
    });
    // 文件选择
    $('#cartoDropzone')?.addEventListener('click', () => $('#cartoFileInput')?.click());
    $('#cartoFileInput')?.addEventListener('change', e => {
      const file = e.target.files?.[0] || null;
      handleFileSelected(file);
    });
    $('#cartoFileRemove')?.addEventListener('click', () => {
      pendingFile = null;
      $('#cartoFileInput') && ($('#cartoFileInput').value = '');
      $('#cartoFileInfo')?.setAttribute('hidden', '');
      $('#cartoFileValid')?.setAttribute('hidden', '');
      updateUploadConfirmState();
    });
    // 拖拽支持
    const dropzone = $('#cartoDropzone');
    if (dropzone) {
      ['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, e => {
        e.preventDefault(); dropzone.classList.add('dragover');
      }));
      ['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, e => {
        e.preventDefault(); dropzone.classList.remove('dragover');
      }));
      dropzone.addEventListener('drop', e => {
        const file = e.dataTransfer?.files?.[0] || null;
        if (file) handleFileSelected(file);
      });
    }
    // 路径输入
    $('#cartoPathInput')?.addEventListener('input', () => {
      $('#cartoPathValid')?.setAttribute('hidden', '');
      updateUploadConfirmState();
    });
    $('#cartoUploadConfirm')?.addEventListener('click', confirmUpload);

    // 导出面板
    $('#cartoExportClose')?.addEventListener('click', closeExportPanel);
    $('#cartoExportCancel')?.addEventListener('click', closeExportPanel);
    $('#cartoExportDownload')?.addEventListener('click', executeExport);
    $('#cartoExportMask')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeExportPanel();
    });

    // 格式切换
    document.querySelectorAll('.carto-format-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.carto-format-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        exportFormat = opt.dataset.format;
      });
    });

    // 图例管理面板
    $('#cartoLegendClose')?.addEventListener('click', closeLegendPanel);
    $('#cartoLegendMask')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeLegendPanel();
    });
    $('#cartoLegendSaveApply')?.addEventListener('click', saveApplyLegendEdits);

    // 模板元素双击编辑弹窗（标题 / 文字注记 / 比例尺）
    $('#cartoInlineEditClose')?.addEventListener('click', closeInlineEditor);
    $('#cartoInlineEditCancel')?.addEventListener('click', closeInlineEditor);
    $('#cartoInlineEditConfirm')?.addEventListener('click', confirmInlineEditor);
    $('#cartoInlineEditMask')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeInlineEditor();
    });
    $('#cartoInlineEditInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); confirmInlineEditor(); }
      else if (e.key === 'Escape') { e.preventDefault(); closeInlineEditor(); }
    });
  }

  // DOM Ready 时初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }

  // ── 公共 API ─────────────────────────────────────────────
  window.Cartography = {
    // 状态查询
    getState: () => ({ ...state, currentMap: state.currentMap ? { ...state.currentMap } : null }),
    getStage: () => state.stage,

    // 核心
    generateLandUseMap,
    getAnalysisSteps: () => [...ANALYSIS_STEPS],

    // 官方模板库（可搜索 / 分类筛选）
    getTemplates: () => [...BUILTIN_TEMPLATES],
    getTemplate: (id) => BUILTIN_TEMPLATES.find(t => t.id === id) || null,
    searchTemplates,
    getTemplateCategories: () => [...TEMPLATE_CATEGORIES],
    showTemplateLibrary,
    closeTemplateLibrary,
    // 兼容旧名称（工具栏按钮等仍引用）
    showTemplateSelector,
    closeTemplateSelector,

    // 上传 / 指定本地路径
    showUploadPanel,
    closeUploadPanel,
    validateTemplateFile,
    validateTemplatePath,

    // 模板渲染
    renderTemplate,
    updateTemplateLegend,
    clearTemplate,

    // 模板元素点选与修改（智能体对话修改入口）
    selectTemplateElement,
    clearTemplateSelection,
    updateTemplateElement,
    openInlineEditor,
    confirmInlineEditor,
    closeInlineEditor,
    getSelectedTemplateElement: () => {
      const idx = state.selectedTemplateIdx;
      if (idx === null || !state.activeTemplate?.elements?.[idx]) return null;
      return { idx, type: state.activeTemplate.elements[idx].type, label: TEMPLATE_ELEMENT_LABELS[state.activeTemplate.elements[idx].type] || state.activeTemplate.elements[idx].type, element: { ...state.activeTemplate.elements[idx] } };
    },
    getTemplateElementLabels: () => ({ ...TEMPLATE_ELEMENT_LABELS }),

    // 图例管理
    initLegendItems,
    getLegendItems,
    emitLegendChanged,
    renderLegendSVG,
    showLegendPanel,
    closeLegendPanel,
    openLegendEditor,
    applyLegendStyle,
    createLegendFromStyle,
    saveApplyLegendEdits,

    // 模板添加确认（chat.js 注册回调以继续流程）
    setTemplateAddedHandler,
    notifyTemplateAdded,

    // 导出
    exportPNG,
    exportGeoJSON,
    showExportPanel,
    closeExportPanel,

    // 状态切换
    setStage: (newStage) => { state.stage = newStage; },

    // 工具：从 chat.js 调用的入口
    runCartographyFlow: function(sourceLayer) {
      return new Promise(resolve => {
        const mapData = generateLandUseMap(sourceLayer);
        resolve(mapData);
      });
    },
  };

})();

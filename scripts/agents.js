// ============ 智能体中心 ============
const agentCats=['全部','规划类','分析类','审查类','数据类','其他'];

// 智能体默认值工厂
function createAgentDefaults(overrides={}){
  return {
    id:'a'+Date.now()+Math.floor(Math.random()*1000),
    name:'新建智能体',
    icon:'🤖',
    iconBg:'#ECFDF5',
    iconColor:'#10B981',
    status:'draft',
    cat:'规划类',
    desc:'',
    tools:0, kb:0,
    avatarUrl:'',
    tags:[],
    promptTemplate:'custom',
    prompt:'',
    callableAgentIds:[],
    atomToolNames:[],
    openingGreeting:'',
    exampleQuestions:[],
    inputPlaceholder:'',
    ...overrides
  };
}

// ============ 平台内置智能体（默认智能体 + 四大 L1 专业智能体） ============
// 提示词依据《致地AI客户端产品立项策划方案》L1 基础功能层四大能力编写
const DEFAULT_AGENT_ID='zhidi';

// 默认通用智能体：直接处理基础 GIS 任务，并调度四大专业智能体
const defaultAgentDef={
  id:'zhidi',name:'致地AI助手',icon:'🤖',iconBg:'#E0F2FE',iconColor:'#0EA5E9',status:'published',cat:'平台默认',
  desc:'致地AI 默认空间智能体（Buddy），直接处理基础 GIS 任务，并可调度数据处理、数据查询、制图、统计分析四大专业智能体。',
  tools:3,kb:2,
  author:'致地平台', source:'平台内置', version:'v3.0.0', updateDate:'2026-08-20',
  model:'Hy3（空间推理）',
  promptTemplate:'buddy',
  prompt:
`# 角色
你是「致地AI助手」，致地AI客户端默认的空间智能体（Buddy），面向自然资源与国土空间规划场景。你以地图为核心画布，用自然语言陪伴用户完成 GIS 任务：简单任务直接处理，专业任务调度四大专业智能体端到端完成。

# 能力
- 基础 GIS 任务：地图定位与浏览引导、图层加载与显隐管理、要素信息识别、长度面积量测、地理编码与坐标解析
- 意图识别与条件补全：识别用户的数据处理、数据查询、制图、统计分析意图；条件不足时多轮追问（空间范围、图层、坐标系、时间、指标口径、输出格式）
- 知识问答：回答 GIS 基础概念、行业法规与标准类问题，附知识库出处

# 智能体调度
可调度以下专业智能体，调度前先向用户说明将执行的任务步骤：
- 数据处理智能体：多源数据导入、十余种格式转换、坐标系识别与转换、质量检查、建库与更新
- 数据查询智能体：数据资源检索、属性与空间条件查询、知识库问答
- 制图智能体：专题图生成、制图规范配置、多图层叠加成图、批量出图
- 统计分析智能体：统计方法选择、空间分析、可视化图表、分析报告
调度规则：
1. 单一明确的专业任务 → 直接派发对应智能体
2. 复合任务（如“查数据并出图”）→ 拆解为多步，按“数据查询 → 数据处理 → 制图/统计分析”顺序编排执行
3. 多步执行时逐步展示进度，完成后汇总全部成果（图层、图表、文档）并给出下一步建议
4. 任务归属不明确时先与用户确认，避免误调度；用户否定调度方案时改为直接处理

# 输出要求
- 中文回复，语气亲切简洁，像伙伴而不是说明书
- 涉及空间范围和位置的结果，优先通过地图可视化呈现
- 成果以图层、图表、文档卡片交付，说明数据来源与处理过程
- 不确定或数据缺失时如实告知，不编造数据与结论`,
  callableAgentIds:['zhidi-data','zhidi-query','zhidi-map','zhidi-stats'],
  atomToolNames:['坐标转换','缓冲区分析','高德地图 MCP'],
  kbItems:['通用GIS知识库','自然资源政策法规库'],
  workflow:'意图识别 → 条件补全 → 直接处理 / 调度专业智能体 → 成果汇总',
  abilityDesc:'该智能体可以完成以下基础 GIS 任务并调度专业智能体：',
  abilityList:['地图操作与要素查询（定位、量测、图层管理）','意图识别与多轮条件补全','调度数据处理智能体：格式转换、坐标转换、质检建库','调度数据查询智能体：数据检索、属性与空间查询','调度制图智能体：专题图生成与规范成图','调度统计分析智能体：统计方法选择、图表与分析报告','行业法规与标准知识问答'],
  openingGreeting:'你好，我是致地AI助手，你的空间智能 Buddy。基础 GIS 任务直接交给我，专业任务我会调度数据处理、数据查询、制图、统计分析四位专业智能体帮你完成。',
  exampleQuestions:['把工作空间数据转到 CGCS2000','查一下成都市青羊区各类公共服务设施数量','制作一张土地利用现状专题图','分析各地块面积分布并生成图表'],
  inputPlaceholder:'描述任务，或让 Buddy 调度专业智能体…'
};

// 四大专业智能体（L1 基础能力）：可被默认智能体调度，也可独立使用
const zhidiSpecialAgents=[
  {id:'zhidi-data',name:'数据处理智能体',icon:'🗃️',iconBg:'#ECFDF5',iconColor:'#10B981',status:'published',cat:'平台默认',
    desc:'自然语言驱动多源数据导入、十余种格式转换、坐标系自动识别与转换、质量检查与建库更新，让数据准备不再耗时。',
    tools:4,kb:2,
    author:'致地平台', source:'平台内置', version:'v2.0.0', updateDate:'2026-08-20',
    model:'Hy3（空间推理）',
    promptTemplate:'dataproc',
    prompt:
`# 角色
你是「数据处理智能体」，致地AI 的 L1 基础能力智能体，目标是让数据准备不再耗时。你承接多源空间数据的导入、转换、质检与建库任务，把专业 GIS 数据处理能力变成一句话的事。

# 能力
- 多源数据导入：识别并读取 SHP、GDB、DWG/DXF、TIFF/IMG、OSGB、FBX、OBJ、IFC、LAS、3DTiles 等格式
- 格式转换：十余种格式互转，如 OSGB→3DTiles、DWG/DXF→GeoJSON、TIFF/IMG→TMS/XYZ 服务、LAS→3DTiles、SHP→3DTiles
- 坐标系处理：自动识别源坐标系，按需转换至 WGS84、CGCS2000 等目标坐标系（支持七参数/四参数转换）
- 质量检查：按时空基准、数据格式、精度、粒度、生产、元数据六类内容检查二维/三维数据，输出问题清单
- 建库与更新：按规范自动生成数据库结构，执行要素裁剪、合并、属性更新与成果联动

# 工作流
1. 接收数据与需求，确认输入格式、源坐标系与目标成果
2. 自动识别数据格式与坐标系，向用户报告识别结果
3. 执行转换/质检/建库操作，处理异常（拓扑错误、属性缺失、坐标系不明）并说明处理方式
4. 返回成果文件、图层或数据库，并附处理说明

# 输出要求
- 转换前报告识别到的源格式与坐标系，转换后报告目标格式、坐标信息与要素数量
- 质检结果逐项列出问题类型、所在位置与整改建议，区分错误与警告
- 本地大数据与涉密数据在本地完成处理，不上传云端
- 无法识别的格式或坐标系时主动追问，不猜测执行`,
    atomToolNames:['坐标转换','坐标转换GEO','数据裁剪','属性表处理'],
    kbItems:['GIS基础规范库','数据质检标准库'],
    workflow:'接收数据 → 识别格式与坐标系 → 转换/质检/建库 → 返回成果说明',
    abilityDesc:'该智能体可以完成以下数据处理任务：',
    abilityList:['多源数据导入：SHP、GDB、DWG/DXF、TIFF/IMG、OSGB 等','十余种格式互转：OSGB→3DTiles、DWG→GeoJSON、TIFF→TMS 等','坐标系自动识别与转换（CGCS2000、WGS84 等）','二维/三维数据质量检查与问题清单输出','按规范建库与要素更新'],
    openingGreeting:'你好，我是数据处理智能体。多源数据导入、格式转换、坐标转换、质检建库，一句话即可完成数据准备。',
    exampleQuestions:['把这个 SHP 数据转成 CGCS2000','将 OSGB 倾斜摄影转为 3DTiles','检查这批数据的质量并输出质检报告'],
    inputPlaceholder:'描述数据处理需求，如“转为 CGCS2000”…'
  },
  {id:'zhidi-query',name:'数据查询智能体',icon:'🔍',iconBg:'#EFF6FF',iconColor:'#3B82F6',status:'published',cat:'平台默认',
    desc:'用对话方式检索空间数据库、数据资源库与行业知识库，支持属性与空间条件查询，让数据触手可及。',
    tools:3,kb:2,
    author:'致地平台', source:'平台内置', version:'v2.0.0', updateDate:'2026-08-20',
    model:'Hy3（空间推理）',
    promptTemplate:'query',
    prompt:
`# 角色
你是「数据查询智能体」，致地AI 的 L1 基础能力智能体，目标是让数据触手可及。你用对话方式检索空间数据库、数据资源库与行业知识库，把数据获取从数小时缩短到数秒。

# 能力
- 数据集检索：根据自然语言从数据资源库匹配数据集，说明来源、坐标系、比例尺与更新时间
- 属性查询：按字段条件筛选要素，如“福田区面积大于 5000㎡ 的商业用地”
- 空间查询：点选、框选、多边形圈选，以及缓冲区、叠加范围内的要素检索
- 知识库问答：基于行业知识库回答法规、标准、规范类问题，引用条文出处
- 结果输出：表格/要素清单呈现，支持一键加载到地图定位查看与导出

# 工作流
1. 解析查询意图，明确目标数据、空间范围与筛选条件
2. 匹配数据源或知识库；多个候选时列出供用户选择
3. 组装查询条件，条件缺失或歧义时多轮追问补全
4. 返回结果集、数据说明与地图定位

# 输出要求
- 明确标注数据来源、图层名称、坐标系、统计口径与更新时间
- 结果以表格或要素清单呈现，数量较大时先给统计摘要再给明细
- 无法精确匹配时给出相近数据集或追问补全条件，不编造数据
- 知识问答必须给出知识库出处，无法回答时如实说明`,
    atomToolNames:['PostGIS 数据库连接 MCP','高德地图 MCP','属性表处理'],
    kbItems:['自然资源数据资源目录','通用GIS知识库'],
    workflow:'解析查询意图 → 匹配数据源 → 组装查询条件 → 返回结果集与定位',
    abilityDesc:'该智能体可以完成以下数据查询任务：',
    abilityList:['自然语言数据集检索与数据说明','属性条件查询与字段筛选','点选、框选、圈选等空间查询','知识库法规标准问答（附出处）','查询结果表格呈现与地图定位'],
    openingGreeting:'你好，我是数据查询智能体。告诉我你要找什么数据，我来检索空间数据库与知识库。',
    exampleQuestions:['查询福田区面积大于 5000㎡ 的商业用地','长三角各市的人口密度数据','永久基本农田划定有什么政策要求？'],
    inputPlaceholder:'描述要查找的数据或问题…'
  },
  {id:'zhidi-map',name:'制图智能体',icon:'🗺️',iconBg:'#FEF3C7',iconColor:'#D97706',status:'published',cat:'平台默认',
    desc:'自然语言驱动专题图生成、制图规范配置、多图层叠加成图与批量出图，让地图制作像说话一样简单。',
    tools:3,kb:2,
    author:'致地平台', source:'平台内置', version:'v2.0.0', updateDate:'2026-08-20',
    model:'Hy3（空间推理）',
    promptTemplate:'carto',
    prompt:
`# 角色
你是「制图智能体」，致地AI 的 L1 基础能力智能体，目标是让地图制作像说话一样简单。你把自然语言制图需求转化为符合行业制图标准的图件成果。

# 能力
- 专题图生成：分级设色图、分类符号图、热力图、统计地图，如“全国各省 GDP 分级设色图”
- 制图规范：按国土空间规划制图标准配置图名图号、图例、比例尺、指北针、色彩方案与注记字体
- 多图层叠加：生态保护红线、永久基本农田、城镇开发边界等多图层叠加成图，支持冲突区域标注
- 批量出图：按标准分幅或报批模板批量输出 PNG/PDF/DWG 成果，自动排版图面注记，避免编号重叠
- 底图与三维：遥感影像底图、地形底图、三维场景搭建与 WebGL 预览发布

# 工作流
1. 解析制图需求，确认主题、空间范围、数据图层、风格与输出格式
2. 选择底图与专题数据，必要时先请求数据查询智能体提供数据
3. 配置符号化方案与制图要素，按规范生成样图
4. 渲染成图并交付，支持用户圈选范围或提出修改意见后重新出图

# 输出要求
- 制图前确认主题、范围与风格；制图后说明图层构成、配色依据与数据时点
- 图面要素完整：图名、图例、比例尺、指北针、数据来源与密级说明
- 批量出图报告成功数量、失败清单与原因
- 修改意见以增量方式应用，不整图重做，保持已确认内容不变`,
    atomToolNames:['遥感图斑','土地租用分类','坐标转换'],
    kbItems:['GIS基础规范库','国土空间规划制图标准'],
    workflow:'解析制图需求 → 选择底图与数据 → 符号化与要素配置 → 渲染输出',
    abilityDesc:'该智能体可以完成以下制图任务：',
    abilityList:['分级设色、分类符号、热力图等专题图生成','按制图标准配置图名、图例、比例尺、指北针','三线等多图层叠加成图与冲突标注','按分幅/模板批量出图（PNG/PDF/DWG）','遥感影像/地形底图与三维场景搭建'],
    openingGreeting:'你好，我是制图智能体。说一句“制作一张现状用地图”，规范图件即刻呈现。',
    exampleQuestions:['制作一张全国各省 GDP 分级设色图','按报批模板批量输出地块现状图','生成三线划定叠加图'],
    inputPlaceholder:'描述制图需求，如“制作一张现状用地图”…'
  },
  {id:'zhidi-stats',name:'统计分析智能体',icon:'📊',iconBg:'#F5F3FF',iconColor:'#7C3AED',status:'published',cat:'平台默认',
    desc:'自动选择统计方法，完成统计计算、空间分析与可视化图表，输出数据、图表、结论一体化的分析成果。',
    tools:4,kb:2,
    author:'致地平台', source:'平台内置', version:'v2.0.0', updateDate:'2026-08-20',
    model:'Hy3（空间推理）',
    promptTemplate:'stats',
    prompt:
`# 角色
你是「统计分析智能体」，致地AI 的 L1 基础能力智能体，目标是让数据洞察即时呈现。你自动选择统计方法，完成计算、可视化与结论解读，输出数据、图表、结论一体化的分析成果。

# 能力
- 统计方法选择：根据数据特征与问题目标自动选择描述统计、分组汇总、比率分析、相关分析、趋势分析等方法
- 空间统计分析：缓冲区、叠加、邻近、密度、热点/空间聚集分析，如“全国空气质量的空间聚集特征”
- 可视化图表：柱状图、饼图、折线图、雷达图、组合图，图表与地图联动展示
- 分析报告：生成含数据说明、图表解读、结论与建议的文字报告

# 工作流
1. 明确分析目标、数据范围与统计口径
2. 自动选择统计方法并向用户说明选择理由
3. 执行计算，处理缺失值与异常值并说明处理方式
4. 生成可视化图表与地图联动结果
5. 输出分析报告与下一步分析建议

# 输出要求
- 说明所选统计方法及理由，标注样本量、数据口径与时间范围
- 数字保留合理精度，同比/环比注明基期
- 结论以要点呈现，与图表对应，不做超出数据支撑的推断
- 数据不足时说明缺口并建议补充方向，不用估算冒充真实统计`,
    atomToolNames:['缓冲区分析','叠置分析','属性表处理','PostGIS 数据库连接 MCP'],
    kbItems:['人口统计样本','自然资源评价指标库'],
    workflow:'明确分析目标 → 自动选择统计方法 → 执行计算 → 可视化与报告输出',
    abilityDesc:'该智能体可以完成以下统计分析任务：',
    abilityList:['自动选择统计方法（描述统计、分组汇总、相关分析等）','缓冲区、叠加、密度、热点等空间统计分析','柱状图、饼图、折线图等可视化图表生成','数据分析报告与结论解读'],
    openingGreeting:'你好，我是统计分析智能体。我会自动选择统计方法，生成图表与解读报告。',
    exampleQuestions:['统计成都市不同类型设施的个数','分析各地块面积的分布特征','分析全国空气质量的空间聚集特征'],
    inputPlaceholder:'描述统计分析目标，如“统计各地块面积分布”…'
  }
];

// 页面加载时为默认智能体补全提示词与可调度智能体配置
//（currentAgent 定义于 chat.js 且先于本脚本加载，此处按完整定义升级，保证工作台「编辑」可见全部配置）
if(typeof currentAgent!=='undefined' && currentAgent && currentAgent.id===DEFAULT_AGENT_ID){
  currentAgent=Object.assign({}, currentAgent, JSON.parse(JSON.stringify(defaultAgentDef)));
}

// 我的智能体
let myAgents=[
  ...zhidiSpecialAgents,
  {id:'a1',name:'国土空间规划助手',icon:'🏙️',iconBg:'#E0F2FE',iconColor:'#0EA5E9',status:'published',cat:'规划类',
    desc:'面向国土空间规划的智能问答与方案生成助手，内置规划法规库与用地标准。',
    tools:12,kb:3,
    author:'规划一所 · 张工', source:'自制', version:'v2.3.1', updateDate:'2026-07-31',
    abilityDesc:'该智能体可以完成以下国土空间规划相关任务：',
    abilityList:['用地合规性自动审查','规划方案草案生成','上位规划要点抽取','用地分类与统计'],
    model:'Hy3（空间推理）',
    atomToolNames:['缓冲区分析','叠置分析','坐标转换','坡度地形分析'],
    kbItems:['国土空间规划（市级）','规划用地用海分类指南','三区三线划定成果'],
    workflow:'规划任务识别 → 上位规划检索 → 用地合规核对 → 方案生成',
    tags:['规划','方案生成']},
  {id:'a2',name:'生态修复顾问',icon:'🌿',iconBg:'#ECFDF5',iconColor:'#10B981',status:'published',cat:'规划类',
    desc:'基于生态本底数据的修复方案推荐与成效评估，支持退化识别与措施匹配。',
    tools:8,kb:2,
    author:'生态组 · 王工', source:'自制', version:'v1.5.0', updateDate:'2026-06-20',
    abilityDesc:'该智能体可以完成以下生态修复相关任务：',
    abilityList:['生态本底诊断','修复措施智能推荐','修复成效评估','退化图斑识别'],
    model:'Hy3（空间推理）',
    atomToolNames:['缓冲区分析','视域分析','变化检测'],
    kbItems:['山水林田湖草沙一体化修复','矿山生态修复技术规范'],
    workflow:'本底诊断 → → 措施匹配 → → 成效评估',
    tags:['生态','修复']},
  {id:'a3',name:'用地合规审查官',icon:'✅',iconBg:'#FEF3C7',iconColor:'#D97706',status:'draft',cat:'审查类',
    desc:'自动比对用地红线、用途管制要求与准入清单，输出合规结论与整改建议。',tools:6,kb:1},
  {id:'a4',name:'遥感影像解译师',icon:'🛰️',iconBg:'#EFF6FF',iconColor:'#3B82F6',status:'offline',cat:'分析类',
    desc:'自动提取建设用地、植被、水体等地物，输出矢量图斑与统计报表。',tools:5,kb:4},
].map(a=>createAgentDefaults(a));

// 智能体广场
let squareAgents=[
  {id:'s1',name:'遥感影像解译',icon:'🛰️',iconBg:'#EFF6FF',iconColor:'#3B82F6',cat:'分析类',
    desc:'自动提取建设用地、植被、水体等地物，输出矢量图斑。',publisher:'研发团队', usage:21280, rating:4.8,
    source:'官方', version:'v3.2.0', updateDate:'2026-08-01',
    abilityDesc:'该智能体可以完成以下遥感解译任务：',
    abilityList:['建设用地自动提取','植被覆盖分类','水体边界识别','变化检测'],
    model:'GPT-4 多模态',
    tools:'建筑合规提取、遥感图斑',
    knowledge:'GIS基础规范库、遥感影像样本集',
    workflow:'影像预处理 → 地物识别 → 矢量化 → 分类统计',
    favorites:5640, reviewCount:128, ratingDist:{5:78,4:15,3:5,2:1,1:1}},
  {id:'s2',name:'用地合规性检查',icon:'✅',iconBg:'#FEF3C7',iconColor:'#D97706',cat:'审查类',
    desc:'比对用地红线与用途管制，秒级输出合规结论。',publisher:'规划一所',usage:9320,rating:4.7,
    source:'官方', version:'v2.1.4', updateDate:'2026-07-15',
    abilityDesc:'该智能体可以完成以下合规审查任务：',
    abilityList:['用地红线比对','用途管制核查','准入清单匹配','整改建议生成'],
    model:'Hy3（空间推理）',
    tools:'缓冲区分析、坐标转换',
    knowledge:'国土空间规划法规库',
    workflow:'输入用地 → 比对规则 → 输出结论',
    favorites:3210, reviewCount:86, ratingDist:{5:72,4:20,3:5,2:2,1:1}},
  {id:'s3',name:'规划方案生成器',icon:'🏙️',iconBg:'#E0F2FE',iconColor:'#0EA5E9',cat:'规划类',
    desc:'依据上位规划与现状数据，生成用地布局草案。',publisher:'国地规划',usage:21040,rating:4.9,
    source:'官方', version:'v4.0.0', updateDate:'2026-07-25',
    abilityDesc:'该智能体可以完成以下规划方案任务：',
    abilityList:['上位规划要点抽取','用地布局草案生成','指标核算与校核','规划文本生成'],
    model:'GPT-4',
    tools:'缓冲区分析、叠置分析、坐标转换',
    knowledge:'国土空间规划（市级）',
    workflow:'需求解析 → 数据叠加 → 布局生成 → 指标核算',
    favorites:8120, reviewCount:215, ratingDist:{5:82,4:12,3:4,2:1,1:1}},
  {id:'s4',name:'统计出图助手',icon:'📊',iconBg:'#F0FDF4',iconColor:'#16A34A',cat:'数据类',
    desc:'一键将属性表转为专题图与图表，支持导出。',publisher:'数据组',usage:15560,rating:4.6,
    source:'团队', version:'v1.8.0', updateDate:'2026-06-30',
    abilityDesc:'该智能体可以完成以下统计制图任务：',
    abilityList:['属性表转专题图','分类统计图表','批量制图导出','多图层叠加'],
    model:'Hy3',
    tools:'坐标转换、空间查询',
    knowledge:'GIS基础规范库',
    workflow:'读取属性 → 选择图表 → 渲染输出',
    favorites:2870, reviewCount:64, ratingDist:{5:70,4:20,3:7,2:2,1:1}},
  {id:'s5',name:'坡度地形分析',icon:'⛰️',iconBg:'#F5F3FF',iconColor:'#8B5CF6',cat:'分析类',
    desc:'基于 DEM 计算坡度坡向，识别适宜建设区域。',publisher:'测绘中心',usage:7180,rating:4.5,
    source:'团队', version:'v2.0.0', updateDate:'2026-05-10',
    abilityDesc:'该智能体可以完成以下地形分析任务：',
    abilityList:['DEM坡度坡向计算','适宜性分级','建设区域识别','地形剖面分析'],
    model:'Hy3',
    tools:'视域分析、空间查询',
    knowledge:'DEM样本库',
    workflow:'加载DEM → 计算坡度 → 分级输出',
    favorites:1640, reviewCount:38, ratingDist:{5:65,4:22,3:8,2:3,1:2}},
  {id:'s6',name:'耕地保护巡查',icon:'🌾',iconBg:'#FEFCE8',iconColor:'#CA8A04',cat:'审查类',
    desc:'识别耕地非农化、非粮化图斑并推送整改清单。',publisher:'耕保处',usage:6440,rating:4.4,
    source:'官方', version:'v1.2.5', updateDate:'2026-04-28',
    abilityDesc:'该智能体可以完成以下耕地保护任务：',
    abilityList:['耕地非农化识别','耕地非粮化识别','整改清单生成','巡查报告输出'],
    model:'Hy3',
    tools:'变化检测、遥感图斑',
    knowledge:'耕地保护法规库',
    workflow:'影像比对 → 图斑提取 → 清单输出',
    favorites:1320, reviewCount:32, ratingDist:{5:60,4:25,3:10,2:3,1:2}},
  {id:'s7',name:'人口热力洞察',icon:'🔥',iconBg:'#FFF1F2',iconColor:'#E11D48',cat:'数据类',
    desc:'融合多源数据刻画人口时空分布与职住特征。',publisher:'研发团队',usage:8890,rating:4.3,
    source:'团队', version:'v1.5.0', updateDate:'2026-05-20',
    abilityDesc:'该智能体可以完成以下人口分析任务：',
    abilityList:['人口时空分布','职住特征刻画','热力图渲染','趋势预测'],
    model:'Hy3',
    tools:'空间查询、坐标转换',
    knowledge:'人口统计样本',
    workflow:'加载数据 → 分布计算 → 可视化输出',
    favorites:1180, reviewCount:28, ratingDist:{5:55,4:28,3:12,2:3,1:2}},
  {id:'s8',name:'通用问答助手',icon:'💡',iconBg:'#ECFEFF',iconColor:'#06B6D4',cat:'其他',
    desc:'面向空间业务的通用知识问答与文档摘要。',publisher:'平台',usage:33010,rating:4.7,
    source:'官方', version:'v5.0.0', updateDate:'2026-08-05',
    abilityDesc:'该智能体可以完成以下通用问答任务：',
    abilityList:['空间业务知识问答','规划文档摘要','法规条文检索','要点提炼'],
    model:'GPT-4',
    tools:'—',
    knowledge:'通用GIS知识库',
    workflow:'问题解析 → 知识检索 → 答案生成',
    favorites:12480, reviewCount:312, ratingDist:{5:75,4:18,3:5,2:1,1:1}},
];

// 我收藏的智能体（初始示例：从智能体广场收藏 2 个）
let favoriteAgents = [
  JSON.parse(JSON.stringify(squareAgents[0])),  // s1 遥感影像解译
  JSON.parse(JSON.stringify(squareAgents[2])),  // s3 规划方案生成器
];

const statusText={published:'已发布',draft:'草稿',offline:'已下架'};

function agentCardHTML(a, source){
  // source: 'mine'（我创建的）|'favorite'（我收藏的）|'square'（广场）
  const isMine = source === 'mine';
  const isFav = source === 'favorite';
  let acts;
  if(isMine){
    acts = `<button class="ac-btn" data-act="edit">编辑</button>
            <button class="ac-btn ${a.status==='published'?'':'primary'}" data-act="publish">${a.status==='published'?'下架':'发布'}</button>
            <button class="ac-btn blue" data-act="use">使用</button>
            <button class="ac-btn danger" data-act="del">删除</button>`;
  } else if(isFav){
    acts = `<button class="ac-btn primary" data-act="use-square">使用</button>
            <button class="ac-btn" data-act="detail">详情</button>
            <button class="ac-btn danger" data-act="unfav">取消收藏</button>`;
  } else { // square
    acts = `<button class="ac-btn primary" data-act="use-square">调用</button>
            <button class="ac-btn" data-act="detail">详情</button>`;
  }
  const favBadge = (source==='square' && isFavorited(a.id)) ? '<div class="ac-fav" title="已收藏">⭐</div>' : '';
  const statusHtml = isMine ? `<span class="a-status ${a.status}">${statusText[a.status]}</span>` : '';
  const pubHtml = isMine ? ('配置 · '+a.cat) : (isFav ? ('来自广场 · '+(a.publisher||'')) : ('发布者：'+(a.publisher||'')));
  const metaHtml = isMine
    ? `<span class="m">🧰 ${a.tools||0} 工具</span><span class="m">📚 ${a.kb||0} 知识库</span>`
    : `<span class="m">📞 ${formatNum(a.usage||0)} 调用</span><span class="m">⭐ ${a.rating||'—'}</span><span class="m">🏷️ ${a.cat}</span>`;
  return `<div class="agent-card" data-id="${a.id}" data-source="${source}">
    ${favBadge}
    <div class="ac-top">
      <div class="ac-icon" style="background:${a.iconBg};color:${a.iconColor}">${a.icon}</div>
      <div class="ac-title">
        <div class="ac-name">${a.name}${statusHtml}</div>
        <div class="ac-pub">${pubHtml}</div>
      </div>
    </div>
    <div class="ac-desc">${a.desc||''}</div>
    <div class="ac-meta">${metaHtml}</div>
    <div class="ac-acts">${acts}</div>
  </div>`;
}
function renderMine(kw=''){
  kw=kw.trim().toLowerCase();
  // 我创建的
  const created = myAgents.filter(a=>!kw || a.name.toLowerCase().includes(kw) || (a.desc||'').toLowerCase().includes(kw) || a.cat.toLowerCase().includes(kw) || (a.tags||[]).some(t=>t.toLowerCase().includes(kw)));
  $('#myCreatedCount').textContent = created.length;
  $('#mineCreatedGrid').innerHTML = created.length
    ? created.map(a=>agentCardHTML(a,'mine')).join('')
    : '<div class="agent-empty">还没有创建智能体，<a id="goCreateAgent">＋ 新建一个</a></div>';
  // 我收藏的
  const fav = favoriteAgents.filter(a=>!kw || a.name.toLowerCase().includes(kw) || (a.desc||'').toLowerCase().includes(kw) || (a.publisher||'').toLowerCase().includes(kw));
  $('#myFavoriteCount').textContent = fav.length;
  $('#mineFavoriteGrid').innerHTML = fav.map(a=>agentCardHTML(a,'favorite')).join('');
  $('#mineFavoriteEmpty').style.display = fav.length ? 'none' : 'block';
}
function renderSquare(kw='',cat='全部'){
  kw=kw.trim().toLowerCase();
  const list=squareAgents.filter(a=>(cat==='全部'||a.cat===cat) && (!kw || a.name.toLowerCase().includes(kw) || a.desc.toLowerCase().includes(kw) || a.publisher.toLowerCase().includes(kw)));
  $('#squareGrid').innerHTML = list.length
    ? list.map(a=>agentCardHTML(a,'square')).join('')
    : `<div class="empty-tip">广场中没有匹配的智能体</div>`;
}
// 分类标签
$('#squareTags').innerHTML=agentCats.map((c,i)=>`<span class="tag ${i===0?'active':''}" data-cat="${c}">${c}</span>`).join('');
let curSquareCat='全部';
document.querySelectorAll('#squareTags .tag').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('#squareTags .tag').forEach(x=>x.classList.remove('active'));
    t.classList.add('active'); curSquareCat=t.dataset.cat;
    renderSquare($('#squareSearch').value,curSquareCat);
  });
});
// Tab 切换：默认激活「智能体广场」
document.querySelectorAll('.agent-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.agent-tab').forEach(x=>x.classList.remove('active'));
    tab.classList.add('active');
    const m=tab.dataset.mod;
    $('#modMine').classList.toggle('show',m==='mine');
    $('#modSquare').classList.toggle('show',m==='square');
  });
});
$('#mineSearch').addEventListener('input',e=>renderMine(e.target.value));
$('#squareSearch').addEventListener('input',e=>renderSquare(e.target.value,curSquareCat));
$('#newAgentBtn').addEventListener('click',()=>openAgentForm('create'));

function togglePublish(id){
  const a=myAgents.find(x=>x.id===id); if(!a) return;
  if(a.status==='published'){ a.status='offline'; toast(`「${a.name}」已下架`); }
  else { a.status='published'; toast(`「${a.name}」已发布`); }
  renderMine($('#mineSearch').value);
}
function deleteAgent(id){
  const a=myAgents.find(x=>x.id===id); if(!a) return;
  if(!confirm(`确认删除智能体「${a.name}」？此操作不可恢复。`)) return;
  myAgents=myAgents.filter(x=>x.id!==id); renderMine($('#mineSearch').value); toast('已删除');
}
function useAgent(id){
  const a=myAgents.find(x=>x.id===id); if(!a) return;
  if(typeof switchPage==='function') switchPage('workbench');
  if(typeof setCurrentAgent==='function') setCurrentAgent(a);
  else {
    // 保留完整配置（提示词、可调度智能体等），供工作台「编辑」直接使用
    currentAgent=Object.assign({}, a);
    $('#aibAvatar').textContent=a.icon;
    $('#aibNameText').textContent=a.name;
  }
  addBubble('user',`使用智能体：${a.name}`);
  aiReply(`已切换至「${a.name}」。${a.desc.slice(0,30)}…你可直接描述任务，或在地图上圈选范围让我处理。`);
}
function useSquare(id){
  const a=squareAgents.find(x=>x.id===id); if(!a) return;
  if(typeof switchPage==='function') switchPage('workbench');
  if(typeof setCurrentAgent==='function') setCurrentAgent(a);
  else {
    // 保留完整配置（提示词、可调度智能体等），供工作台「编辑」直接使用
    currentAgent=Object.assign({}, a);
    $('#aibAvatar').textContent=a.icon;
    $('#aibNameText').textContent=a.name;
  }
  addBubble('user',`调用智能体：${a.name}`);
  aiReply(`已接入「${a.name}」（发布者：${a.publisher}）。请描述需求，我将调用其能力与工具集为你处理。`);
}

// ============ 通用工具函数 ============
function formatNum(n){
  if(n>=10000) return (n/10000).toFixed(1)+'w';
  if(n>=1000) return (n/1000).toFixed(1)+'k';
  return n+'';
}
function renderToolsField(a){
  if(a.atomToolNames && a.atomToolNames.length) return a.atomToolNames.join('、');
  if(typeof a.tools==='number') return a.tools+' 个原子工具';
  if(typeof a.tools==='string' && a.tools) return a.tools;
  return '—';
}
function renderKbField(a){
  if(a.kbItems && a.kbItems.length) return a.kbItems.join('、');
  if(typeof a.kb==='number') return a.kb+' 个知识库';
  if(typeof a.knowledge==='string' && a.knowledge) return a.knowledge;
  return '—';
}

// ============ 收藏机制 ============
function isFavorited(id){
  return favoriteAgents.some(x=>x.id===id);
}
function toggleFavorite(id){
  if(isFavorited(id)){
    favoriteAgents = favoriteAgents.filter(x=>x.id!==id);
    toast('已取消收藏');
  } else {
    const src = squareAgents.find(x=>x.id===id);
    if(src){ favoriteAgents.unshift(JSON.parse(JSON.stringify(src))); toast('已收藏到「我收藏的」'); }
    else { toast('收藏失败：未在广场找到'); return; }
  }
  renderSquare($('#squareSearch').value, curSquareCat);
  renderMine($('#mineSearch').value);
  if($('#addFavBtn')) $('#addFavBtn').textContent = isFavorited(id) ? '⭐ 已收藏' : '⭐ 收藏';
}
function unfavoriteAgent(id){
  favoriteAgents = favoriteAgents.filter(x=>x.id!==id);
  toast('已取消收藏');
  renderMine($('#mineSearch').value);
  if($('#addFavBtn') && $('#addBody').dataset.id===id){
    $('#addFavBtn').textContent = '⭐ 收藏';
  }
}
function copyAndCreateAgent(id, source){
  const src = source==='mine' ? myAgents.find(x=>x.id===id) : (squareAgents.find(x=>x.id===id) || favoriteAgents.find(x=>x.id===id));
  if(!src){ toast('复制失败'); return; }
  openAgentForm('create', null, src);
}

// ============ 详情页（跳转至独立 page） ============
function openAgentDetailPage(id, source){
  switchPage('agent-detail');
  renderAgentDetailPage(id, source);
}
function renderAgentDetailPage(id, source){
  let a;
  if(source==='mine') a = myAgents.find(x=>x.id===id);
  else if(source==='favorite') a = favoriteAgents.find(x=>x.id===id);
  else a = squareAgents.find(x=>x.id===id);
  if(!a){ $('#addBody').innerHTML = '<div class="agent-empty">未找到该智能体</div>'; return; }

  const isMineSource = source==='mine';
  const fav = isFavorited(id);

  const metaParts = [];
  if(a.author)     metaParts.push(`<span><b>作者</b>${a.author}</span>`);
  if(a.source)     metaParts.push(`<span><b>来源</b>${a.source}</span>`);
  if(a.publisher)  metaParts.push(`<span><b>发布者</b>${a.publisher}</span>`);
  if(a.version)    metaParts.push(`<span><b>版本</b>${a.version}</span>`);
  if(a.updateDate) metaParts.push(`<span><b>更新</b>${a.updateDate}</span>`);

  const abilityList = a.abilityList || [];

  const statsHtml = isMineSource ? '' : `
    <div class="add-card">
      <div class="add-card-head"><span class="add-card-ic">📊</span><h3>使用数量</h3></div>
      <div class="add-stats">
        <div class="add-stat"><div class="add-stat-num">${formatNum(a.usage||0)}</div><div class="add-stat-label">调用次数</div></div>
        <div class="add-stat"><div class="add-stat-num">${formatNum(a.favorites||0)}</div><div class="add-stat-label">收藏数量</div></div>
        <div class="add-stat"><div class="add-stat-num">${a.rating||'—'}</div><div class="add-stat-label">评分</div></div>
        <div class="add-stat"><div class="add-stat-num">${a.reviewCount||0}条</div><div class="add-stat-label">用户评价</div></div>
      </div>
    </div>
    <div class="add-card">
      <div class="add-card-head"><span class="add-card-ic">⭐</span><h3>评分分布</h3></div>
      <div class="add-rating">
        ${[5,4,3,2,1].map(star=>{
          const pct = (a.ratingDist && a.ratingDist[star]) || 0;
          return `<div class="add-rating-row">
            <span class="add-rating-label">★${star}</span>
            <div class="add-rating-bar"><div class="add-rating-fill" style="width:${pct}%"></div></div>
            <span class="add-rating-pct">${pct}%</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  const actionsHtml = isMineSource
    ? `<button class="add-btn" id="addUseBtn"><span class="ai">▶</span> 开始使用</button>
       <button class="add-btn outline" id="addEditBtn">编辑</button>`
    : `<button class="add-btn outline orange" id="addFavBtn">${fav?'⭐ 已收藏':'⭐ 收藏'}</button>
       <button class="add-btn outline" id="addCopyBtn">复制创建</button>
       <button class="add-btn" id="addUseBtn"><span class="ai">▶</span> 开始使用</button>`;

  $('#addBody').dataset.id = id;
  $('#addBody').dataset.source = source;
  $('#addBody').innerHTML = `
    <div class="add-card add-card-base">
      <div class="add-base">
        <div class="add-base-left">
          <div class="add-avatar" style="background:${a.iconBg};color:${a.iconColor}">${a.icon}</div>
        </div>
        <div class="add-base-right">
          <h2 class="add-name">${a.name}</h2>
          <p class="add-desc">${a.desc||''}</p>
          <div class="add-meta">${metaParts.join('<span class="dot">·</span>')}</div>
        </div>
      </div>
    </div>
    <div class="add-card">
      <div class="add-card-head"><span class="add-card-ic">📝</span><h3>能力说明</h3></div>
      <div class="add-ability">
        <p class="add-ability-intro">${a.abilityDesc||'该智能体提供以下能力：'}</p>
        <ul class="add-ability-list">${abilityList.map(it=>`<li>${it}</li>`).join('')}</ul>
      </div>
    </div>
    <div class="add-card">
      <div class="add-card-head"><span class="add-card-ic">🧩</span><h3>能力组成</h3></div>
      <dl class="add-comp-dl">
        <dt>模型</dt><dd>${a.model||'—'}</dd>
        <dt>工具</dt><dd>${renderToolsField(a)}</dd>
        <dt>知识</dt><dd>${renderKbField(a)}</dd>
        <dt>工作流</dt><dd>${a.workflow||'—'}</dd>
      </dl>
    </div>
    ${a.prompt ? `
    <div class="add-card">
      <div class="add-card-head"><span class="add-card-ic">⌨️</span><h3>系统提示词</h3></div>
      <pre class="add-prompt">${a.prompt}</pre>
    </div>` : ''}
    ${statsHtml}
    <div class="add-actions">${actionsHtml}</div>
  `;
  bindDetailActions();
}
function bindDetailActions(){
  const id = $('#addBody').dataset.id;
  const source = $('#addBody').dataset.source;
  const useBtn = $('#addUseBtn');
  if(useBtn) useBtn.addEventListener('click', ()=>{ source==='mine' ? useAgent(id) : useSquare(id); });
  const editBtn = $('#addEditBtn');
  if(editBtn) editBtn.addEventListener('click', ()=> editAgent(id));
  const favBtn = $('#addFavBtn');
  if(favBtn) favBtn.addEventListener('click', ()=> toggleFavorite(id));
  const copyBtn = $('#addCopyBtn');
  if(copyBtn) copyBtn.addEventListener('click', ()=> copyAndCreateAgent(id, source));
}
function editAgent(id){
  openAgentForm('edit', id);
}
window.openAgentDetailPage = openAgentDetailPage;
window.toggleFavorite = toggleFavorite;
window.unfavoriteAgent = unfavoriteAgent;
window.copyAndCreateAgent = copyAndCreateAgent;
window.isFavorited = isFavorited;

// ============ 通用 modal（保留以备复用） ============
function openModal(html){ $('#modalBox').innerHTML=html; $('#modalMask').classList.add('show'); }
function closeModal(){ $('#modalMask').classList.remove('show'); }
$('#modalMask').addEventListener('click',e=>{ if(e.target.id==='modalMask') closeModal(); });
window.editAgent=editAgent;

// ============ 智能体新建/编辑表单（四模块） ============
let agentFormMode='create';
let agentFormDraft=null;
let agentFormEditing=false;    // 进入表单是否为「编辑」意图（决定页面标题，与保存分支解耦）
let agentEditPrevPage='agent'; // 进入编辑页前的页面（返回按钮做历史回退的目标页）
// 页面 id → 中文名（返回按钮 tooltip 用）
const PAGE_LABEL_MAP={ workbench:'工作台', tools:'工具中心', agent:'智能体中心', 'agent-detail':'智能体详情', res:'资源库', settings:'设置', notif:'通知' };

function openAgentForm(mode, id, preset=null){
  agentFormMode=mode;
  agentFormEditing=(mode==='edit');
  // 记录进入编辑页之前的页面（返回按钮据此回退），需在 switchPage 前读取
  agentEditPrevPage=(typeof pages!=='undefined' && pages.find(p=>$('#page-'+p).classList.contains('active'))) || 'workbench';
  // 返回按钮标题随目标页联动，避免 tooltip 与实际去向不一致
  const backBtn=$('#aeeBackBtn');
  if(backBtn) backBtn.title='返回'+(PAGE_LABEL_MAP[agentEditPrevPage]||'上一页');
  if(mode==='edit'){
    const src=myAgents.find(x=>x.id===id);
    if(!src){
      // 当前智能体不在「我的智能体」列表中（如默认助手 / 广场智能体）
      // → 复用新建表单，预填其信息，保存后作为新智能体沉淀到「我的智能体」
      agentFormMode='create';
      agentFormDraft=createAgentDefaults(stripAgentId(preset && typeof preset==='object' ? preset : currentAgent));
    } else {
      agentFormDraft=createAgentDefaults(JSON.parse(JSON.stringify(src)));
    }
  }else{
    if(preset && typeof preset==='object'){
      agentFormDraft=createAgentDefaults(stripAgentId(preset));
    } else {
      agentFormDraft=createAgentDefaults({name:'新建智能体'});
    }
  }
  switchPage('agent-edit');
  renderAgentForm();
}
// 去除 id / status，克隆为可重新保存的新草稿
function stripAgentId(a){
  if(!a || typeof a!=='object') return {name:'新建智能体'};
  const {id, status, ...rest}=a;
  return Object.assign({}, rest, {name:rest.name||'新建智能体', status:'draft'});
}
window.openAgentForm=openAgentForm;

function renderAgentForm(){
  const a=agentFormDraft;
  // 页面标题：编辑意图 → 「编辑」+ 被编辑智能体实际名称（取自草稿真实名称，非硬编码）
  $('#aeePageTitle').textContent=agentFormEditing ? ('编辑'+(a.name||'智能体')) : '新建智能体';
  $('#aeeTitleIcon').textContent=a.icon||'🤖';
  $('#aeeName').value=a.name||'';
  $('#aeeNameCount').textContent=($('#aeeName').value.length)+'/100';
  $('#aeeDesc').value=a.desc||'';
  $('#aeeDescCount').textContent=($('#aeeDesc').value.length)+'/500';
  $('#aeePromptTemplate').value=a.promptTemplate||'custom';
  $('#aeePrompt').value=a.prompt||'';
  $('#aeeOpening').value=a.openingGreeting||'';
  $('#aeeInputPlaceholder').value=a.inputPlaceholder||'';

  const preview=$('#aeeAvatarPreview');
  if(a.avatarUrl){ preview.innerHTML=`<img src="${a.avatarUrl}" alt="avatar">`; }
  else { preview.innerHTML=''; preview.textContent=a.icon||'🤖'; }

  renderTags();
  renderPickedAgents();
  renderPickedTools();
  renderExamples();
  bindAgentFormEvents();
}

function renderTags(){
  const list=$('#aeeTagsList');
  const tags=agentFormDraft.tags||[];
  list.innerHTML=tags.map((t,i)=>`<span class="aee-tag">${t}<span class="x" data-idx="${i}">✕</span></span>`).join('');
  list.querySelectorAll('.x').forEach(x=>{
    x.addEventListener('click',()=>{ agentFormDraft.tags.splice(parseInt(x.dataset.idx),1); renderTags(); });
  });
  const sel=$('#aeeTagInput');
  if(sel && sel.tagName==='SELECT'){ sel.value=tags[0]||'全部'; }
}

// ============ 能力配置：表单选择器模式 ============
function getPickedAgentById(id){
  return myAgents.find(x=>x.id===id) || squareAgents.find(x=>x.id===id);
}
// 原子工具图标：优先匹配工具中心数据（按名称），缺失时按类型兜底
function getToolIconInfo(name){
  const base = name.replace(/\s+(Skill|MCP)$/i,'');
  const colorMap={purple:['#F5F3FF','#8B5CF6'],blue:['#EFF6FF','#0EA5E9'],green:['#ECFDF5','#10B981'],amber:['#FFFBEB','#F59E0B']};
  if(typeof toolGroupsData!=='undefined'){
    for(const g of toolGroupsData){
      for(const t of g.tools){
        if(t.name===name || t.name===base){
          const [bg,color]=colorMap[t.color]||['#F8FAFC','#64748B'];
          return {icon:t.icon, bg, color, group:g.label};
        }
      }
    }
  }
  const isMcp=/\sMCP$/i.test(name);
  return {icon:isMcp?'🔌':'🧰', bg:'#F8FAFC', color:'#64748B', group:isMcp?'MCP':'Skill'};
}
// 已配置标签行：智能体
function renderPickedAgents(){
  const row=$('#aeePickedAgents');
  const ids=agentFormDraft.callableAgentIds||[];
  if(!ids.length){ row.innerHTML='<span class="cap-pick-empty">暂未配置智能体</span>'; return; }
  row.innerHTML=ids.map(id=>{
    const a=getPickedAgentById(id);
    if(!a) return '';
    return `<span class="cap-pick-tag">
      <span class="cpt-ic" style="background:${a.iconBg};color:${a.iconColor}">${a.icon}</span>
      <span class="cpt-name">${a.name}</span>
      <span class="cpt-x" data-rid="${id}" title="移除">✕</span>
    </span>`;
  }).join('');
  row.querySelectorAll('.cpt-x').forEach(x=>{
    x.addEventListener('click',()=>{
      agentFormDraft.callableAgentIds=agentFormDraft.callableAgentIds.filter(i=>i!==x.dataset.rid);
      renderPickedAgents();
    });
  });
}
// 已配置标签行：原子工具
function renderPickedTools(){
  const row=$('#aeePickedTools');
  const names=agentFormDraft.atomToolNames||[];
  if(!names.length){ row.innerHTML='<span class="cap-pick-empty">暂未配置原子工具</span>'; return; }
  row.innerHTML=names.map(nm=>{
    const info=getToolIconInfo(nm);
    return `<span class="cap-pick-tag">
      <span class="cpt-ic" style="background:${info.bg};color:${info.color}">${info.icon}</span>
      <span class="cpt-name">${nm}</span>
      <span class="cpt-x" data-rid="${nm}" title="移除">✕</span>
    </span>`;
  }).join('');
  row.querySelectorAll('.cpt-x').forEach(x=>{
    x.addEventListener('click',()=>{
      agentFormDraft.atomToolNames=agentFormDraft.atomToolNames.filter(n=>n!==x.dataset.rid);
      renderPickedTools();
    });
  });
}

// ============ 选择智能体弹窗 ============
let pickerAgentTab='mine';
let pickerAgentCat='';       // ''=全部，否则为业务分类 cat
let pickerTempIds=[];

// 渲染快捷检索标签栏（按业务分类）
function renderAgentCatChips(){
  const wrap=$('#capAgentCats');
  const cats=[...new Set([...myAgents,...squareAgents].map(a=>a.cat).filter(Boolean))];
  const chips=['',...cats].map(c=>`
    <button class="cap-cat-chip${pickerAgentCat===c?' active':''}" data-cat="${c}" type="button">${c===''?'全部':c}</button>
  `).join('');
  wrap.innerHTML=chips;
  wrap.querySelectorAll('.cap-cat-chip').forEach(ch=>{
    ch.addEventListener('click',()=>{
      pickerAgentCat=ch.dataset.cat;
      wrap.querySelectorAll('.cap-cat-chip').forEach(x=>x.classList.toggle('active',x===ch));
      renderAgentPickerList();
    });
  });
}

function openAgentPicker(){
  pickerTempIds=[...(agentFormDraft.callableAgentIds||[])];
  pickerAgentTab='mine';
  pickerAgentCat='';
  document.querySelectorAll('#capAgentTabs .cap-tab').forEach(t=>t.classList.toggle('active',t.dataset.src==='mine'));
  $('#capAgentSearch').value='';
  $('#capAgentMask').classList.add('show');
  renderAgentCatChips();
  renderAgentPickerList();
}
function renderAgentPickerList(){
  const q=($('#capAgentSearch').value||'').trim().toLowerCase();
  const src = pickerAgentTab==='mine' ? myAgents : squareAgents;
  const list=src.filter(a=>
    (!q || a.name.toLowerCase().includes(q) || (a.desc||'').toLowerCase().includes(q) || a.cat.toLowerCase().includes(q)) &&
    (!pickerAgentCat || a.cat===pickerAgentCat)
  );
  const wrap=$('#capAgentList');
  wrap.innerHTML=list.length ? list.map(a=>{
    const checked=pickerTempIds.includes(a.id)?'checked':'';
    const isMine=pickerAgentTab==='mine';
    return `<label class="cap-item">
      <input type="checkbox" ${checked} data-id="${a.id}">
      <span class="cpi-ic" style="background:${a.iconBg};color:${a.iconColor}">${a.icon}</span>
      <span class="cpi-info">
        <span class="cpi-name">${a.name}</span>
        <span class="cpi-desc">${isMine?('配置 · '+a.cat):('发布者：'+(a.publisher||'')+' · '+a.cat)}</span>
      </span>
    </label>`;
  }).join('') : '<div class="cap-pick-none">没有匹配的智能体</div>';
  wrap.querySelectorAll('input[type=checkbox]').forEach(cb=>{
    cb.addEventListener('change',()=>{
      const id=cb.dataset.id;
      if(cb.checked && !pickerTempIds.includes(id)) pickerTempIds.push(id);
      else pickerTempIds=pickerTempIds.filter(x=>x!==id);
      $('#capAgentCount').textContent='已选 '+pickerTempIds.length+' 项';
    });
  });
  $('#capAgentCount').textContent='已选 '+pickerTempIds.length+' 项';
}
function confirmAgentPicker(){
  agentFormDraft.callableAgentIds=pickerTempIds;
  $('#capAgentMask').classList.remove('show');
  renderPickedAgents();
  toast('已更新智能体配置');
}

// ============ 选择原子工具弹窗 ============
let pickerTempTools=[];
let pickerToolCat='';        // ''=全部，否则为工具分组

// 渲染快捷检索标签栏（按工具分组）
function renderToolCatChips(){
  const wrap=$('#capToolCats');
  const tools=getEnabledAtomTools();
  const groups=[...new Set(tools.map(t=>getToolIconInfo(t.name).group).filter(Boolean))];
  const chips=['',...groups].map(g=>`
    <button class="cap-cat-chip${pickerToolCat===g?' active':''}" data-cat="${g}" type="button">${g===''?'全部':g}</button>
  `).join('');
  wrap.innerHTML=chips;
  wrap.querySelectorAll('.cap-cat-chip').forEach(ch=>{
    ch.addEventListener('click',()=>{
      pickerToolCat=ch.dataset.cat;
      wrap.querySelectorAll('.cap-cat-chip').forEach(x=>x.classList.toggle('active',x===ch));
      renderToolPickerList();
    });
  });
}

function openToolPicker(){
  pickerTempTools=[...(agentFormDraft.atomToolNames||[])];
  pickerToolCat='';
  $('#capToolSearch').value='';
  $('#capToolMask').classList.add('show');
  renderToolCatChips();
  renderToolPickerList();
}
// 已添加且启用的原子工具（复用「原子工具中心」数据源，禁止另造）
function getEnabledAtomTools(){
  if(typeof atomTools==='undefined') return [];
  return atomTools.filter(t=>t.enabled!==false).map(t=>({name:t.name, type:t.type}));
}
function renderToolPickerList(){
  const q=($('#capToolSearch').value||'').trim().toLowerCase();
  const tools=getEnabledAtomTools().filter(t=>
    (!q || t.name.toLowerCase().includes(q)) &&
    (!pickerToolCat || getToolIconInfo(t.name).group===pickerToolCat)
  );
  const wrap=$('#capToolList');
  wrap.innerHTML=tools.length ? tools.map(t=>{
    const checked=pickerTempTools.includes(t.name)?'checked':'';
    const info=getToolIconInfo(t.name);
    return `<label class="cap-item">
      <input type="checkbox" ${checked} data-name="${t.name}">
      <span class="cpi-ic" style="background:${info.bg};color:${info.color}">${info.icon}</span>
      <span class="cpi-info">
        <span class="cpi-name">${t.name}</span>
        <span class="cpi-desc">${info.group} · 已添加</span>
      </span>
    </label>`;
  }).join('') : '<div class="cap-pick-none">没有匹配的原子工具</div>';
  wrap.querySelectorAll('input[type=checkbox]').forEach(cb=>{
    cb.addEventListener('change',()=>{
      const nm=cb.dataset.name;
      if(cb.checked && !pickerTempTools.includes(nm)) pickerTempTools.push(nm);
      else pickerTempTools=pickerTempTools.filter(x=>x!==nm);
      $('#capToolCount').textContent='已选 '+pickerTempTools.length+' 项';
    });
  });
  $('#capToolCount').textContent='已选 '+pickerTempTools.length+' 项';
}
function confirmToolPicker(){
  agentFormDraft.atomToolNames=pickerTempTools;
  $('#capToolMask').classList.remove('show');
  renderPickedTools();
  toast('已更新原子工具配置');
}

function renderExamples(){
  const container=$('#aeeExamples');
  const examples=agentFormDraft.exampleQuestions||[];
  container.innerHTML=examples.map((q,i)=>`
    <div class="aee-example-row">
      <span class="no">${i+1}.</span>
      <input value="${q}" data-idx="${i}" placeholder="请输入推荐问题">
      <button class="rm" data-idx="${i}">🗑</button>
    </div>
  `).join('');
  container.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('input',()=>{ agentFormDraft.exampleQuestions[parseInt(inp.dataset.idx)]=inp.value; });
  });
  container.querySelectorAll('.rm').forEach(btn=>{
    btn.addEventListener('click',()=>{ agentFormDraft.exampleQuestions.splice(parseInt(btn.dataset.idx),1); renderExamples(); });
  });
}

function bindAgentFormEvents(){
  // 头像上传
  $('#aeeAvatarUpload').addEventListener('click',()=>$('#aeeAvatarInput').click());
  $('#aeeAvatarInput').addEventListener('change',e=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{ agentFormDraft.avatarUrl=ev.target.result; renderAgentForm(); };
    reader.readAsDataURL(file);
  });

  // 名称 / 描述字数
  $('#aeeName').addEventListener('input',e=>{
    agentFormDraft.name=e.target.value;
    $('#aeeNameCount').textContent=e.target.value.length+'/100';
  });
  $('#aeeDesc').addEventListener('input',e=>{
    agentFormDraft.desc=e.target.value;
    $('#aeeDescCount').textContent=e.target.value.length+'/500';
  });

  // 标签（单选分类下拉）
  $('#aeeTagInput').addEventListener('change',e=>{
    const cat=e.target.options[e.target.selectedIndex].dataset.cat;
    agentFormDraft.tags = (cat==='全部') ? [] : [cat];
    renderTags();
  });

  // 提示词
  $('#aeePromptTemplate').addEventListener('change',e=>{ agentFormDraft.promptTemplate=e.target.value; });
  $('#aeePrompt').addEventListener('input',e=>{ agentFormDraft.prompt=e.target.value; });
  $('#aeeFullscreenPrompt').addEventListener('click',()=>toast('全屏编辑（演示）'));

  // 对话设置
  $('#aeeOpening').addEventListener('input',e=>{ agentFormDraft.openingGreeting=e.target.value; });
  $('#aeeInputPlaceholder').addEventListener('input',e=>{ agentFormDraft.inputPlaceholder=e.target.value; });
  $('#aeeAddExample').addEventListener('click',()=>{ agentFormDraft.exampleQuestions.push(''); renderExamples(); });
}

function saveAgentForm(){
  const a=agentFormDraft;
  a.name=$('#aeeName').value.trim()||a.name;
  if(!a.name || a.name==='新建智能体'){ toast('请输入智能体名称'); return; }
  a.desc=$('#aeeDesc').value.trim();
  a.promptTemplate=$('#aeePromptTemplate').value;
  a.prompt=$('#aeePrompt').value;
  a.openingGreeting=$('#aeeOpening').value;
  a.inputPlaceholder=$('#aeeInputPlaceholder').value;
  a.tools=a.atomToolNames.length;

  if(agentFormMode==='create'){
    myAgents.unshift(a);
    toast('已创建智能体「'+a.name+'」');
  }else{
    const idx=myAgents.findIndex(x=>x.id===a.id);
    if(idx>=0) myAgents[idx]=a;
    toast('已保存智能体「'+a.name+'」');
  }

  // 如果编辑的是当前工作台正在使用的智能体，同步更新信息栏
  if(currentAgent && currentAgent.id===a.id){
    currentAgent.name=a.name; currentAgent.icon=a.icon||'🤖'; currentAgent.cat=a.cat; currentAgent.desc=a.desc;
    $('#aibNameText').textContent=a.name;
    $('#aibAvatar').textContent=a.icon||'🤖';
  }

  // 保存成功后自动返回进入编辑页之前的页面（浏览器式历史回退），并刷新目标页数据
  leaveAgentForm(true);
}
function cancelAgentForm(){ agentFormDraft=null; backToAgentCenter(); }
function backToAgentCenter(){
  switchPage('agent');
  // 返回「我的智能体」Tab
  document.querySelectorAll('.agent-tab').forEach(x=>x.classList.remove('active'));
  document.querySelector('.agent-tab[data-mod="mine"]').classList.add('active');
  $('#modMine').classList.add('show');
  $('#modSquare').classList.remove('show');
}

// 离开编辑页：回退到进入编辑页之前的页面（浏览器式历史回退）
// needRefresh=true：保存成功后调用，刷新目标页数据；false：返回按钮调用，仅切换页面
function leaveAgentForm(needRefresh){
  agentFormDraft=null;
  const target=agentEditPrevPage || 'agent';
  switchPage(target);
  if(!needRefresh) return;
  if(target==='agent'){
    // 回到智能体中心 → 切到「我的智能体」Tab 并刷新列表
    document.querySelectorAll('.agent-tab').forEach(x=>x.classList.remove('active'));
    document.querySelector('.agent-tab[data-mod="mine"]').classList.add('active');
    $('#modMine').classList.add('show');
    $('#modSquare').classList.remove('show');
    renderMine($('#mineSearch').value);
  } else if(target==='agent-detail'){
    // 回到详情页 → 重新渲染被编辑智能体的详情
    const d=$('#addBody');
    if(d && d.dataset.id){
      const src=myAgents.find(x=>x.id===d.dataset.id);
      if(src) renderAgentDetailPage(d.dataset.id, d.dataset.source || 'mine');
    }
  }
  // target==='workbench'：若编辑的是当前智能体，信息栏已在 saveAgentForm 内同步，无需额外处理
}

// 表单页按钮绑定
// 返回按钮：浏览器式历史回退 → 回到进入编辑页之前的页面
function backFromAgentForm(){
  leaveAgentForm(false);
}
$('#aeeBackBtn').addEventListener('click',backFromAgentForm);
$('#aeeCancelBtn').addEventListener('click',cancelAgentForm);
$('#aeeSaveBtn').addEventListener('click',saveAgentForm);

// ============ 原子工具候选池 ============
function getCandidateAtomTools(){
  const arr=[];
  if(typeof toolGroupsData==='undefined') return arr;
  toolGroupsData.forEach(g=>{
    g.tools.forEach(t=>{
      arr.push({name:t.name, icon:t.icon, color:t.color, desc:t.desc, group:g.label});
    });
  });
  return arr;
}

// ============ 兼容旧调用：工作台编辑按钮 ============
function ensureAgentEditState(){
  if(!currentAgent) return;
  if(!currentAgent.callableAgentIds) currentAgent.callableAgentIds=[];
  if(!currentAgent.atomToolNames) currentAgent.atomToolNames=[];
}
function initCurrentAgentConfig(){
  // 切换智能体时按 id 加载完整定义（默认智能体 / 我的智能体），补全提示词与能力配置
  if(!currentAgent) return;
  const full = currentAgent.id===DEFAULT_AGENT_ID ? defaultAgentDef
    : myAgents.find(x=>x.id===currentAgent.id) || squareAgents.find(x=>x.id===currentAgent.id);
  if(full) currentAgent=Object.assign({}, JSON.parse(JSON.stringify(full)));
}

// 智能体卡片事件委托：按钮区执行操作，空白区进入详情
function handleAgentCardClick(e){
  const card = e.target.closest('.agent-card'); if(!card) return;
  const id = card.dataset.id, source = card.dataset.source;
  const btn = e.target.closest('[data-act]');
  if(btn){
    const act = btn.dataset.act;
    if(act==='edit') editAgent(id);
    else if(act==='publish') togglePublish(id);
    else if(act==='use') useAgent(id);
    else if(act==='del') deleteAgent(id);
    else if(act==='use-square') useSquare(id);
    else if(act==='detail') openAgentDetailPage(id, source);
    else if(act==='unfav') unfavoriteAgent(id);
    return;
  }
  openAgentDetailPage(id, source);
}
$('#mineCreatedGrid').addEventListener('click', handleAgentCardClick);
$('#mineFavoriteGrid').addEventListener('click', handleAgentCardClick);
$('#squareGrid').addEventListener('click', handleAgentCardClick);

// 详情页返回智能体中心
$('#addBackBtn').addEventListener('click', ()=> switchPage('agent'));

// 我的智能体空状态链接：去广场 / 新建智能体
document.addEventListener('click', e=>{
  if(e.target && e.target.id==='goSquareLink'){
    document.querySelectorAll('.agent-tab').forEach(x=>x.classList.remove('active'));
    document.querySelector('.agent-tab[data-mod="square"]').classList.add('active');
    $('#modMine').classList.remove('show'); $('#modSquare').classList.add('show');
  } else if(e.target && e.target.id==='goCreateAgent'){
    openAgentForm('create');
  }
});

// ============ 能力配置弹窗交互绑定 ============
$('#aeePickAgentsBtn').addEventListener('click', openAgentPicker);
$('#aeePickToolsBtn').addEventListener('click', openToolPicker);
document.querySelectorAll('#capAgentTabs .cap-tab').forEach(t=>{
  t.addEventListener('click',()=>{
    pickerAgentTab=t.dataset.src;
    pickerAgentCat='';
    document.querySelectorAll('#capAgentTabs .cap-tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    $('#capAgentSearch').value='';
    renderAgentCatChips();
    renderAgentPickerList();
  });
});
$('#capAgentSearch').addEventListener('input', renderAgentPickerList);
$('#capToolSearch').addEventListener('input', renderToolPickerList);
$('#capAgentConfirm').addEventListener('click', confirmAgentPicker);
$('#capToolConfirm').addEventListener('click', confirmToolPicker);
// 关闭（取消不保存）
document.querySelectorAll('.aee-picker-mask [data-close]').forEach(el=>{
  el.addEventListener('click',()=>el.closest('.aee-picker-mask').classList.remove('show'));
});
document.querySelectorAll('.aee-picker-mask').forEach(m=>{
  m.addEventListener('click',e=>{ if(e.target===m) m.classList.remove('show'); });
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ $('#capAgentMask').classList.remove('show'); $('#capToolMask').classList.remove('show'); }
});

// 初始化渲染
renderMine();
renderSquare();

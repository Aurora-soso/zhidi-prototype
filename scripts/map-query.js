// 地图工具栏「查询要素属性」：ArcGIS 风格属性表 + 表格-地图双向联动 + 双击属性编辑。
// 行 = 要素，列 = 字段，横向滚动，底部显示记录数。
// 联动：选中表格行 → 地图要素高亮；点击地图要素 → 表格滚动定位到对应行。
// 编辑：双击可编辑字段进入行内编辑；只读字段（面积/长度/编号等）视觉标识且禁用编辑。
(function(){
  const tablePanel=$('#mapAttributeTable');
  const titleEl=$('#matTitle');
  const footEl=$('#matFoot');
  const theadEl=$('#matThead');
  const tbodyEl=$('#matTbody');
  const featureCache=new Map();
  let active=false;
  let selectedRows=new Set();
  let highlightedRowIdx=-1;       // 当前地图高亮对应的行号（-1=无）
  let highlightedLayer=null;      // 当前高亮的 Leaflet 图层引用

  // ============ 只读字段判定 ============
  // 系统内置 / 计算衍生字段不可编辑：含「面积」「长度」「编号」「id」「ID」或纯数字编号值
  const READ_ONLY_PATTERNS=[/面积/,/长度/,/周长/,/编号/,/^(id|ID|FID|OID|OBJECTID|序号)$/i];
  function isReadOnlyField(fieldName){
    return READ_ONLY_PATTERNS.some(p=>p.test(fieldName));
  }

  function escapeHtml(value){
    return String(value==null?'':value).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function pad(n){return String(n).padStart(2,'0');}

  // ============ 要素属性示例数据（按图层 id 生成，确定性、可缓存） ============
  const COUNT={building:15,road:9,river:6,landuse:15,poi:5};
  const GENERATORS={
    building:(i)=>({
      id:'JZ-'+pad(i+1),name:'建筑'+pad(i+1),
      fields:{
        '编号':'JZ-'+pad(i+1),
        '名称':'建筑'+pad(i+1),
        '用地类型':['居住用地','商业用地','公共管理与公共服务用地','工业用地','物流仓储用地'][i%5],
        '楼层数':3+(i%18),
        '建筑面积(㎡)':(600+i*143).toLocaleString('zh-CN'),
        '结构形式':['框架结构','剪力墙结构','砖混结构','钢结构'][i%4],
        '建成年份':1998+(i%27),
        '权属单位':['广州市城市规划勘测设计研究院','华南理工大学','广东国地规划科技股份有限公司','天河区住房和建设局','黄埔区土地开发中心'][i%5]
      }
    }),
    road:(i)=>({
      id:'DL-'+pad(i+1),name:['黄埔大道','中山大道','广园快速路','科韵路','车陂路','大观路','珠吉路','汇彩路','奥体南路'][i],
      fields:{
        '编号':'DL-'+pad(i+1),
        '道路名称':['黄埔大道','中山大道','广园快速路','科韵路','车陂路','大观路','珠吉路','汇彩路','奥体南路'][i],
        '道路等级':['快速路','主干路','次干路','支路'][i%4],
        '车道数':2+(i%6),
        '路面类型':['沥青混凝土','水泥混凝土'][i%2],
        '长度(m)':(800+i*210).toLocaleString('zh-CN'),
        '起讫点':'K'+(i*1.2).toFixed(1)+'～K'+(i*1.2+0.8).toFixed(1)+'段'
      }
    }),
    river:(i)=>({
      id:'HL-'+pad(i+1),name:['车陂涌','深涌','乌涌','南岗河','金洲涌','文涌'][i],
      fields:{
        '编号':'HL-'+pad(i+1),
        '河流名称':['车陂涌','深涌','乌涌','南岗河','金洲涌','文涌'][i],
        '所属流域':['珠江三角洲','流溪河流域','东江北干流'][i%3],
        '平均宽度(m)':12+i*4,
        '水质类别':['Ⅱ类','Ⅲ类','Ⅳ类','Ⅴ类'][i%4],
        '管理单位':['广州市河涌管理处','黄埔区水务局','天河区水务局'][i%3]
      }
    }),
    landuse:(i)=>({
      id:'TD-'+pad(i+1),name:['一类居住用地','二类居住用地','商业服务业设施用地','高等院校用地','公园绿地','防护绿地','工业用地','物流仓储用地','城市道路用地','公用设施用地','水域','农林用地','行政办公用地','文化设施用地','科研用地'][i],
      fields:{
        '编号':'TD-'+pad(i+1),
        '地类名':['一类居住用地','二类居住用地','商业服务业设施用地','高等院校用地','公园绿地','防护绿地','工业用地','物流仓储用地','城市道路用地','公用设施用地','水域','农林用地','行政办公用地','文化设施用地','科研用地'][i],
        '地类编码':['R1','R2','B','A31','G1','G2','M','W','S1','U','E1','E2','A1','A2','A35'][i],
        '面积(㎡)':(1200+i*360).toLocaleString('zh-CN'),
        '权属单位':['天河区','黄埔区','海珠区','番禺区','白云区'][i%5]+'城市更新局',
        '规划用途':['居住','商业','公共服务','绿地','工业'][i%5],
        '现状用途':['空地','建成区','待开发','低效用地'][i%4]
      }
    }),
    poi:(i)=>({
      id:'JC-'+pad(i+1),name:['天河监测点','黄埔监测点','海珠监测点','番禺监测点','白云监测点'][i],
      fields:{
        '编号':'JC-'+pad(i+1),
        '监测点名':['天河监测点','黄埔监测点','海珠监测点','番禺监测点','白云监测点'][i],
        '监测类型':['空气质量','水质','噪声','土壤','地下水'][i],
        '监测因子':['PM2.5 / PM10','COD / 氨氮','等效声级','重金属','水位埋深'][i],
        '运行状态':['正常','正常','正常','维护中','正常'][i],
        '负责人':['张工','李工','王工','陈工','刘工'][i]
      }
    })
  };
  function genericFeature(i){
    return {id:'F-'+pad(i+1),name:'要素'+pad(i+1),fields:{'编号':'F-'+pad(i+1),'名称':'要素'+pad(i+1),'备注':'示例属性'+(i+1)}};
  }
  function generate(layer){
    const gen=GENERATORS[layer.id];
    const count=COUNT[layer.id]||10;
    const list=[];
    for(let i=0;i<count;i++) list.push(gen?gen(i):genericFeature(i));
    return list;
  }
  function normalizeEditorFeatures(layer){
    return (layer.editorFeatures||[]).map(ef=>{
      const id=ef.id||('F-'+Math.random().toString(36).slice(2,6));
      let fields={},name='';
      if(ef.properties&&typeof ef.properties==='object'){
        fields=ef.properties;name=ef.properties.name||ef.properties.名称||ef.type||ef.id||id;
      }else{
        const exclude=new Set(['points','geometry','id']);
        fields={};
        Object.keys(ef).forEach(k=>{if(!exclude.has(k))fields[k]=ef[k];});
        name=ef.name||ef.type||ef.id||id;
      }
      return {id,name:String(name),fields};
    });
  }
  function getFeatures(layer){
    if(!layer)return [];
    if(layer.dynamic&&Array.isArray(layer.editorFeatures)&&layer.editorFeatures.length)return normalizeEditorFeatures(layer);
    if(featureCache.has(layer.id))return featureCache.get(layer.id);
    const feats=generate(layer);featureCache.set(layer.id,feats);return feats;
  }
  function getFieldNames(features){
    const names=[];
    const seen=new Set();
    features.forEach(f=>{
      if(!f.fields)return;
      Object.keys(f.fields).forEach(k=>{if(!seen.has(k)){seen.add(k);names.push(k);}});
    });
    return names;
  }

  // ============ 地图要素高亮（表格行 → 地图） ============
  const HIGHLIGHT_STYLE={
    polygon:{color:'#F97316',weight:4,fillColor:'#FED7AA',fillOpacity:.55,opacity:1},
    polyline:{color:'#F97316',weight:7,opacity:1},
    point:{color:'#fff',weight:2.5,fillColor:'#F97316',fillOpacity:1,radius:9}
  };
  // 缓存原始样式，以便清除高亮时恢复
  const originalStyleCache=new Map(); // key: layer._leaflet_id → {original options}

  function clearMapHighlight(){
    if(!highlightedLayer)return;
    // 恢复原始样式
    const cached=originalStyleCache.get(highlightedLayer._leaflet_id);
    if(cached&&typeof highlightedLayer.setStyle==='function'){
      try{highlightedLayer.setStyle(cached);}catch(e){/* ignore */}
    }
    // 移除弹跳动画 class
    try{
      const elem=highlightedLayer.getElement?highlightedLayer.getElement():null;
      if(elem)elem.classList.remove('mat-feat-highlight');
    }catch(e){/* ignore */}
    highlightedLayer=null;
  }

  function highlightMapFeature(layerId,index){
    clearMapHighlight();
    const featLayer=window.MapLayers?.getFeatureLayer?.(layerId,index);
    if(!featLayer)return;
    // 缓存当前实际样式（从图层 options 读取，而非配置默认值）
    const opts=featLayer.options||{};
    originalStyleCache.set(featLayer._leaflet_id,{...opts});

    // 应用高亮样式
    const hStyle=style?.kind==='point'?HIGHLIGHT_STYLE.point:style?.kind==='polyline'?HIGHLIGHT_STYLE.polyline:HIGHLIGHT_STYLE.polygon;
    if(typeof featLayer.setStyle==='function'){
      try{featLayer.setStyle(hStyle);}catch(e){/* ignore */}
    }
    // 弹跳动画（通过 DOM 元素添加 CSS 动画）
    try{
      const elem=featLayer.getElement?featLayer.getElement():null;
      if(elem){elem.classList.add('mat-feat-highlight');
        // 动画结束后移除 class（让弹跳只播一次）
        setTimeout(()=>elem.classList.remove('mat-feat-highlight'),700);
      }
    }catch(e){/* ignore */}

    // 将高亮图层的 layerGroup 置顶
    const group=window.MapLayers?.getFeatureLayerGroup?.(layerId);
    if(group&&typeof group.bringToFront==='function'){
      try{group.bringToFront();}catch(e){/* ignore */}
    }
    highlightedLayer=featLayer;

    // 如果地图可用，平移到该要素位置
    if(typeof map!=='undefined'&&map&&featLayer.getLatLng){
      try{
        const center=featLayer.getLatLng();
        if(center)map.panTo(center,{animate:true,duration:.35});
      }catch(e){
        // getBounds fallback
        try{
          const bounds=featLayer.getBounds();
          if(bounds)map.fitBounds(bounds,{padding:[60,60],maxZoom:15,animate:true,duration:.35});
        }catch(e2){/* ignore */}
      }
    }else if(typeof map!=='undefined'&&map&&featLayer.getBounds){
      try{
        const bounds=featLayer.getBounds();
        if(bounds)map.fitBounds(bounds,{padding:[60,60],maxZoom:15,animate:true,duration:.35});
      }catch(e){/* ignore */}
    }
  }

  // ============ 表格滚动定位（地图 → 表格） ============
  function scrollToRow(idx){
    if(!tbodyEl||idx<0)return;
    const row=tbodyEl.querySelector('tr[data-row-idx="'+idx+'"]');
    if(!row)return;
    // 先移除旧的高亮行样式
    tbodyEl.querySelectorAll('tr.mat-scroll-target').forEach(r=>r.classList.remove('mat-scroll-target'));
    // 标记新目标行
    row.classList.add('mat-scroll-target');
    // 滚动到可视区域
    row.scrollIntoView({behavior:'smooth',block:'center'});
    // 闪烁效果：短暂添加再移除
    setTimeout(()=>row.classList.add('mat-scroll-flash'),100);
    setTimeout(()=>{
      row.classList.remove('mat-scroll-flash');
      row.classList.remove('mat-scroll-target');
    },1400);
    highlightedRowIdx=idx;
  }

  // ============ 渲染 ============
  function updateFoot(layer,total){
    if(!footEl)return;
    if(!layer){footEl.textContent='未选中图层';return;}
    footEl.textContent=escapeHtml(layer.name)+(layer.geometryType?' · '+layer.geometryType:'')+' · 共 '+total+' 条记录'+(selectedRows.size?' · 已选择 '+selectedRows.size+' 条':'');
  }

  function render(){
    if(!theadEl||!tbodyEl||!titleEl)return;
    // 清除地图高亮
    clearMapHighlight();
    highlightedRowIdx=-1;
    selectedRows.clear();

    const layer=window.MapLayers&&window.MapLayers.getSelected();
    if(!layer){
      titleEl.textContent='属性表';
      theadEl.innerHTML='<tr><th scope="col">#</th></tr>';
      tbodyEl.innerHTML='<tr><td class="mat-empty" colspan="99">请在左侧 <b>图层管理器</b> 中选中一个图层，再点击「查询要素属性」查看其全部要素。</td></tr>';
      updateFoot(null,0);return;
    }
    const features=getFeatures(layer);
    titleEl.textContent=escapeHtml(layer.name)+(layer.geometryType?' · '+layer.geometryType:'')+' · 属性表';
    if(!features.length){
      theadEl.innerHTML='<tr><th scope="col">#</th></tr>';
      tbodyEl.innerHTML='<tr><td class="mat-empty" colspan="99">图层「'+escapeHtml(layer.name)+'」当前没有可查询的要素。</td></tr>';
      updateFoot(layer,0);return;
    }
    const fields=getFieldNames(features);
    theadEl.innerHTML='<tr><th scope="col">#</th>'+fields.map(f=>{
      const ro=isReadOnlyField(f);
      const cls=ro?'mat-ro-col':'mat-editable-col';
      const icon=ro?'<span class="mat-ro-icon" title="\u53EA\u8BFB\u5B57\u6BB5">\u2699</span>':'<span class="mat-editable-icon" title="\u53EF\u7F16\u8F91\u5B57\u6BB5">\u270E</span>';
      const title=ro?' title="\u53EA\u8BFB\uFF08\u7CFB\u7EDF\u5B57\u6BB5\uFF09"':' title="\u53EF\u7F16\u8F91\u5B57\u6BB5\uFF08\u53CC\u51FB\u7F16\u8F91\uFF09"';
      return `<th scope="col" class="${cls}"${title}>${escapeHtml(f)} ${icon}</th>`;
    }).join('')+'</tr>';
    tbodyEl.innerHTML=features.map((feat,idx)=>{
      return `<tr data-row-idx="${idx}"><td>${idx+1}</td>`+fields.map(f=>{
        const ro=isReadOnlyField(f);
        const val=feat.fields[f];
        const cls=ro?'mat-readonly':'mat-editable';
        const badge=ro?'<span class="mat-ro-badge">\u2699</span>':'<span class="mat-edit-badge">\u270E</span>';
        const title=ro?` title="\u53EA\u8BFB \u2014 ${escapeHtml(f)}"`:` title="\u53CC\u51FB\u7F16\u8F91 ${escapeHtml(f)}"`;
        return `<td class="${cls}" data-field="${escapeHtml(f)}" data-row-idx="${idx}"${title}>${escapeHtml(val)} ${badge}</td>`;
      }).join('')+'</tr>';
    }).join('');
    updateFoot(layer,features.length);

    // 重新绑定编辑事件（每次 render 后 DOM 已重建）
    bindEditEvents();
  }

  // ============ 双击行内编辑 ============
  let editingCell=null;   // 当前正在编辑的 td 元素
  let editingInput=null;  // 当前 input 元素

  function commitEdit(save){
    if(!editingCell||!editingInput){
      cancelEdit();return;
    }
    if(save){
      const newVal=editingInput.value.trim();
      const field=editingCell.dataset.field;
      const rowIdx=Number(editingCell.dataset.rowIdx)||0;
      const layer=window.MapLayers&&window.MapLayers.getSelected();
      const features=layer?getFeatures(layer):[];
      const feat=features[rowIdx];
      if(feat&&field&&Object.prototype.hasOwnProperty.call(feat.fields,field)){
      feat.fields[field]=newVal; // 写回数据模型
      // 更新单元格显示（保留可编辑徽章）
      editingCell.innerHTML=escapeHtml(newVal)+' <span class="mat-edit-badge">\u270E</span>';
        // 底部状态提示
        toast('已保存：'+escapeHtml(field)+' = '+escapeHtml(newVal));
      }
    }
    editingCell.classList.remove('mat-editing');
    editingCell=null;editingInput=null;
  }

  function cancelEdit(){
    if(editingCell){
      // 恢复原始文本
      const field=editingCell.dataset.field;
      const rowIdx=Number(editingCell.dataset.rowIdx)||0;
      const layer=window.MapLayers&&window.MapLayers.getSelected();
      const features=layer?getFeatures(layer):[];
      const feat=features[rowIdx];
    const origVal=feat&&field?feat.fields[field]:'';
    editingCell.innerHTML=escapeHtml(origVal)+' <span class="mat-edit-badge">\u270E</span>';
      editingCell.classList.remove('mat-editing');
    }
    editingCell=null;editingInput=null;
  }

  function startEdit(td){
    if(!td||td.classList.contains('mat-readonly'))return; // 只读字段拒绝编辑
    if(editingCell&&editingCell!==td){commitEdit(true);} // 提交上一个
    if(editingCell===td)return; // 正在编辑此格

    const currentText=(td.textContent||'').replace(/⛒/g,'').trim();
    td.classList.add('mat-editing');

    const input=document.createElement('input');
    input.type='text';
    input.className='mat-edit-input';
    input.value=currentText;
    input.setAttribute('aria-label','编辑 '+(td.dataset.field||''));
    td.innerHTML='';
    td.appendChild(input);
    input.focus();
    input.select();

    editingCell=td;editingInput=input;

    // 绑定本次编辑的确认/取消
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){e.preventDefault();commitEdit(true);}
      else if(e.key==='Escape'){e.preventDefault();cancelEdit();}
    });
    input.addEventListener('blur',()=>{setTimeout(()=>commitEdit(true),50);}); // 延迟避免立即触发
  }

  function bindEditEvents(){
    if(!tbodyEl)return;
    // 双击编辑
    tbodyEl.addEventListener('dblclick',event=>{
      const td=event.target.closest('td[data-field]');
      if(!td)return;
      event.preventDefault();
      event.stopPropagation();
      startEdit(td);
    });
    // 单击仍保持行选中逻辑（在 click 事件中处理）
  }

  // ============ 进入 / 退出 ============
  function enter(){
    active=true;
    if(tablePanel)tablePanel.hidden=false;
    render();
  }
  function exit(){
    active=false;selectedRows.clear();
    cancelEdit(); // 退出时取消正在进行的编辑
    clearMapHighlight();
    highlightedRowIdx=-1;
    if(tablePanel)tablePanel.hidden=true;
    const btn=document.querySelector('.map-toolbar [data-tool="query-feature"]');
    if(btn)btn.classList.remove('active');
  }
  function isActive(){return active;}

  // ============ 事件绑定 ============

  // 行单击 → 选中/取消 + 地图高亮联动
  if(tbodyEl){
    tbodyEl.addEventListener('click',event=>{
      const row=event.target.closest('tr[data-row-idx]');if(!row)return;
      // 如果点击的是编辑中的 input，不触发行选中
      if(event.target.closest('.mat-edit-input'))return;
      const idx=Number(row.dataset.rowIdx);
      if(selectedRows.has(idx)){selectedRows.delete(idx);row.classList.remove('selected');clearMapHighlight();}
      else{selectedRows.add(idx);row.classList.add('selected');
        // 联动：高亮地图上对应的要素
        const layer=window.MapLayers&&window.MapLayers.getSelected();
        if(layer)highlightMapFeature(layer.id,idx);
      }
      const layer=window.MapLayers&&window.MapLayers.getSelected();
      const features=layer?getFeatures(layer):[];
      updateFoot(layer,features.length);
    });
  }

  // 切换选中图层 → 若查询模式开启则刷新表格
  document.addEventListener('map:layer-select-change',()=>{if(active)render();});
  // 数据加载完成（可能改变可选图层集合）→ 若查询模式开启则刷新
  document.addEventListener('gis:layers-loaded',()=>{if(active)render();});

  // 地图要素点击 → 表格滚动定位（反向联动）
  document.addEventListener('map:feature-clicked',event=>{
    if(!active)return;
    const d=event.detail||{};
    const layer=window.MapLayers&&window.MapLayers.getSelected();
    if(!layer||d.layerId!==layer.id)return; // 不是当前选中图层的要素，忽略
    scrollToRow(d.index);
    // 同时选中该行
    selectedRows.add(d.index);
    const row=tbodyEl?.querySelector('tr[data-row-idx="'+d.index+'"]');
    if(row)row.classList.add('selected');
    const features=layer?getFeatures(layer):[];
    updateFoot(layer,features.length);
  });

  // 关闭按钮
  $('#matClose')?.addEventListener('click',()=>{if(active)exit();});
  // ============ 「添加字段」弹窗 ============
  const addFieldMask=$('#matAddFieldMask'),addFieldInput=$('#matAddFieldInput');
  function openAddField(){
    if(!active){toast('请先打开属性表');return;}
    const layer=window.MapLayers&&window.MapLayers.getSelected();
    if(!layer){toast('请先在左侧图层管理器选中图层');return;}
    const features=getFeatures(layer);
    if(!features.length){toast('当前图层没有要素');return;}
    addFieldMask?.classList.add('show');
    if(addFieldInput){addFieldInput.value='';}
    setTimeout(()=>addFieldInput?.focus(),50);
  }
  function closeAddField(){addFieldMask?.classList.remove('show');}
  function confirmAddField(){
    const layer=window.MapLayers&&window.MapLayers.getSelected();
    if(!layer){toast('请先选中图层');closeAddField();return;}
    const features=getFeatures(layer);
    const name=String(addFieldInput?.value||'').trim();
    if(!name){toast('字段名不能为空');addFieldInput?.focus();return;}
    if(features.some(f=>Object.prototype.hasOwnProperty.call(f.fields,name))){toast('字段「'+name+'」已存在');addFieldInput?.focus();return;}
    features.forEach(f=>{f.fields[name]='';});
    closeAddField();
    render();
    toast('已添加字段「'+name+'」，双击单元格可编辑其值');
  }
  $('#matAddField')?.addEventListener('click',openAddField);
  $('#matAddFieldClose')?.addEventListener('click',closeAddField);
  $('#matAddFieldCancel')?.addEventListener('click',closeAddField);
  $('#matAddFieldConfirm')?.addEventListener('click',confirmAddField);
  addFieldInput?.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();confirmAddField();}
    else if(e.key==='Escape'){e.preventDefault();closeAddField();}
  });
  addFieldMask?.addEventListener('click',e=>{if(e.target===addFieldMask)closeAddField();});

  window.MapFeatureQuery={enter,exit,isActive,render,getFeatures,isReadOnlyField};
})();

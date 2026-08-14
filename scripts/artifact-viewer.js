// ============ 公文 Artifact 预览、选择与局部修改 ============
(function(){
  const stage=$('#documentStage'),paper=$('#documentPaper'),content=$('#documentContent');
  const toolbar=$('#documentSelectionToolbar'),formatPanel=$('#documentFormatPanel');
  const state={artifact:null,selection:null,undo:null,updating:false};

  function createNoticeArtifact(title){
    return {
      id:'document-notice-001',type:'document',fileName:'自然资源管理工作通知.docx',folderPath:'E:/工作文档/自然资源管理/',documentType:'工作通知',title:title||'关于进一步加强自然资源管理工作的通知',
      sections:[
        {id:'recipient',role:'recipient',text:'各区自然资源主管部门、各有关单位：',format:{}},
        {id:'intro',role:'paragraph',text:'为深入贯彻落实自然资源管理有关要求，进一步提升自然资源管理工作的规范化、精细化水平，切实维护自然资源开发利用秩序，现就有关事项通知如下。',format:{}},
        {id:'heading-1',role:'heading',text:'一、提高思想认识，压实管理责任',format:{}},
        {id:'body-1',role:'paragraph',text:'各单位要充分认识加强自然资源管理工作的重要意义，严格落实主体责任，健全主要负责同志统筹协调、分管负责同志具体推进、业务部门协同落实的工作机制，确保各项任务落到实处。',format:{}},
        {id:'heading-2',role:'heading',text:'二、强化日常监管，规范资源利用',format:{}},
        {id:'body-2',role:'paragraph',text:'要完善自然资源动态巡查制度，加强重点区域、重点项目和关键环节监管，及时发现并妥善处置违法违规问题。严格执行国土空间规划和用途管制要求，持续提升资源节约集约利用水平。',format:{}},
        {id:'heading-3',role:'heading',text:'三、加强协同联动，提升工作质效',format:{}},
        {id:'body-3',role:'paragraph',text:'各单位要加强信息共享和业务协同，建立问题会商、线索移交和联合处置机制。对工作推进中遇到的重要情况，应及时报告并提出处理建议，形成上下联动、横向协同的管理合力。',format:{}},
        {id:'heading-4',role:'heading',text:'四、严格监督检查，确保任务落实',format:{}},
        {id:'body-4',role:'paragraph',text:'市级主管部门将适时开展专项检查，对责任落实不到位、工作推进不力的单位予以通报。各单位应结合实际制定具体措施，并于本通知印发之日起十五个工作日内报送落实方案。',format:{}},
        {id:'signature',role:'signature',text:'深圳市自然资源主管部门',format:{}},
        {id:'date',role:'date',text:'2026年8月13日',format:{}}
      ]
    };
  }

  function sectionClass(section){
    const f=section.format||{};return ['document-section','role-'+section.role,f.bold?'format-bold':'',f.heading?'format-heading':'',f.center?'format-center':'',f.indent===false?'no-indent':''].filter(Boolean).join(' ');
  }
  function renderSection(section){
    const element=document.createElement(section.role==='heading'?'h3':'p');element.className=sectionClass(section);element.dataset.sectionId=section.id;element.tabIndex=0;element.textContent=section.text;return element;
  }
  function renderDocument(){
    content.innerHTML='';const title=document.createElement('h1');title.className='document-title';title.textContent=state.artifact.title;content.appendChild(title);
    state.artifact.sections.forEach(section=>content.appendChild(renderSection(section)));
    $('#documentEmpty').hidden=true;content.hidden=false;$('#documentFileName').textContent=state.artifact.fileName;$('#documentSaveStatus').textContent='已保存 · Word 文档';
  }
  function openDocument(artifact){
    state.artifact=artifact||state.artifact||createNoticeArtifact();workspaceState.currentArtifact=state.artifact;openArtifact(state.artifact);renderDocument();clearSelection(false);stage.scrollTop=0;return state.artifact;
  }
  function generateDocument(request){
    let title='关于进一步加强自然资源管理工作的通知';
    if(request.includes('耕地'))title='关于进一步加强耕地保护工作的通知';
    if(request.includes('巡查'))title='关于开展自然资源执法巡查工作的通知';
    state.artifact=createNoticeArtifact(title);return openDocument(state.artifact);
  }

  function getSection(id){return state.artifact?.sections.find(section=>section.id===id);}
  function getSectionElement(id){return content.querySelector(`[data-section-id="${id}"]`);}
  function selectionContext(){
    if(!state.selection||!state.artifact)return null;const section=getSection(state.selection.sectionId);if(!section)return null;
    return {type:'document-text',artifactId:state.artifact.id,artifact:state.artifact.fileName,sectionId:section.id,selectionMode:state.selection.mode,text:state.selection.text,startOffset:state.selection.startOffset,endOffset:state.selection.endOffset,sourceText:section.text};
  }
  function positionToolbar(rect){
    toolbar.hidden=false;const own=toolbar.getBoundingClientRect(),edge=8;
    const left=Math.max(edge,Math.min(rect.left+rect.width/2-own.width/2,window.innerWidth-own.width-edge));
    const top=Math.max(64,rect.top-own.height-9);toolbar.style.left=left+'px';toolbar.style.top=top+'px';
  }
  function selectParagraph(element){
    if(!state.artifact||state.updating)return;const section=getSection(element.dataset.sectionId);if(!section)return;
    content.querySelectorAll('.document-section.selected').forEach(item=>item.classList.remove('selected'));element.classList.add('selected');
    state.selection={sectionId:section.id,mode:'paragraph',text:section.text,startOffset:0,endOffset:section.text.length};$('#documentSelectionLabel').textContent='已选择文段';positionToolbar(element.getBoundingClientRect());
  }
  function selectTextRange(){
    const selection=window.getSelection();if(!selection||selection.isCollapsed||!selection.rangeCount)return false;
    const range=selection.getRangeAt(0),startEl=(range.startContainer.nodeType===3?range.startContainer.parentElement:range.startContainer).closest?.('.document-section'),endEl=(range.endContainer.nodeType===3?range.endContainer.parentElement:range.endContainer).closest?.('.document-section');
    if(!startEl||startEl!==endEl||!content.contains(startEl)){toast('请在同一文段内选择需要修改的文字');return false;}
    const before=document.createRange();before.selectNodeContents(startEl);before.setEnd(range.startContainer,range.startOffset);const startOffset=before.toString().length,text=range.toString();
    content.querySelectorAll('.document-section.selected').forEach(item=>item.classList.remove('selected'));startEl.classList.add('selected');state.selection={sectionId:startEl.dataset.sectionId,mode:'text-range',text,startOffset,endOffset:startOffset+text.length};
    $('#documentSelectionLabel').textContent='已选择文字';positionToolbar(range.getBoundingClientRect());return true;
  }
  function caretAtPoint(x,y){
    if(document.caretPositionFromPoint){const position=document.caretPositionFromPoint(x,y);return position&&{node:position.offsetNode,offset:position.offset};}
    if(document.caretRangeFromPoint){const range=document.caretRangeFromPoint(x,y);return range&&{node:range.startContainer,offset:range.startOffset};}
    return null;
  }
  function createRangeFromPoints(start,end){
    const a=caretAtPoint(start.x,start.y),b=caretAtPoint(end.x,end.y);if(!a||!b)return false;
    const aSection=(a.node.nodeType===3?a.node.parentElement:a.node).closest?.('.document-section'),bSection=(b.node.nodeType===3?b.node.parentElement:b.node).closest?.('.document-section');if(!aSection||aSection!==bSection)return false;
    const range=document.createRange();try{range.setStart(a.node,a.offset);range.setEnd(b.node,b.offset);}catch(error){return false;}
    if(range.collapsed){try{range.setStart(b.node,b.offset);range.setEnd(a.node,a.offset);}catch(error){return false;}}
    if(range.collapsed)return false;const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);return selectTextRange();
  }
  function clearSelection(clearContext=true){
    state.selection=null;toolbar.hidden=true;formatPanel.hidden=true;content.querySelectorAll('.document-section.selected').forEach(item=>item.classList.remove('selected'));window.getSelection()?.removeAllRanges();if(clearContext&&workspaceState.selectedContext?.type==='document-text')clearSelectedContext();
  }
  function askAI(){const context=selectionContext();if(!context)return;setSelectedContext(context);$('#chatText').focus();toast(context.selectionMode==='paragraph'?'已引用选中文段':'已引用选中文字');}

  function revisedText(section,suggestion,context){
    const original=context.selectionMode==='text-range'?context.text:section.text;
    if(/缩短|精简|简洁/.test(suggestion))return original.replace(/进一步|切实|持续|充分|严格/g,'').replace(/，并/g,'，').slice(0,Math.max(18,Math.round(original.length*.68)))+'。';
    if(/时间|时限|期限/.test(suggestion))return original.replace(/[。；]$/,'')+'，并于十个工作日内完成相关工作，按期报送落实情况。';
    if(/责任|落实/.test(suggestion))return original.replace(/[。；]$/,'')+'。各责任单位要明确主要负责人、具体责任人和完成时限，实行任务清单化、责任具体化管理。';
    if(/监督|检查|通报|整改/.test(suggestion))return original.replace(/[。；]$/,'')+'。对检查发现的问题实行清单管理、限期整改和跟踪销号，整改情况纳入年度考核并适时通报。';
    if(/补充/.test(suggestion))return original.replace(/[。；]$/,'')+'，进一步明确工作标准、责任分工和落实要求，确保各项任务有序推进。';
    if(/正式|严谨|润色|措辞|改写|优化/.test(suggestion))return '各有关单位应当严格依照自然资源管理相关规定，全面落实工作责任，健全协同推进机制，切实提升自然资源管理工作的制度化、规范化和精细化水平。';
    return '各有关单位要坚持依法依规、规范有序的工作原则，结合实际细化工作措施，明确责任分工，确保有关要求落实到位。';
  }
  function formatFromSuggestion(section,suggestion){
    const format={...(section.format||{})};if(/加粗/.test(suggestion))format.bold=true;if(/标题/.test(suggestion))format.heading=true;if(/居中/.test(suggestion))format.center=true;if(/取消.*缩进/.test(suggestion))format.indent=false;if(/首行缩进/.test(suggestion))format.indent=true;return format;
  }
  function updateSectionElement(section){
    const old=getSectionElement(section.id),replacement=renderSection(section);old.replaceWith(replacement);return replacement;
  }
  function applySuggestion(suggestion,done){
    const context=workspaceState.selectedContext?.type==='document-text'?workspaceState.selectedContext:selectionContext();const section=context&&getSection(context.sectionId);
    if(!section||state.updating){done?.(false);return false;}state.updating=true;const element=getSectionElement(section.id);element.classList.add('updating');$('#documentSaveStatus').textContent='正在修改…';
    state.undo={sectionId:section.id,text:section.text,format:{...(section.format||{})}};
    setTimeout(()=>{
      const formatOnly=/加粗|标题|居中|缩进/.test(suggestion)&&!/措辞|补充|改写|润色|缩短|精简/.test(suggestion);
      if(!formatOnly){const next=revisedText(section,suggestion,context);section.text=context.selectionMode==='text-range'?section.text.slice(0,context.startOffset)+next+section.text.slice(context.endOffset):next;}
      section.format=formatFromSuggestion(section,suggestion);const updated=updateSectionElement(section);updated.classList.add('updated');updated.scrollIntoView({block:'center',behavior:'smooth'});$('#documentUndo').disabled=false;$('#documentSaveStatus').textContent='已保存 · 刚刚修改';state.updating=false;clearSelection(false);clearSelectedContext();setTimeout(()=>updated.classList.remove('updated'),1600);done?.(true);
    },760);return true;
  }
  function undo(){
    if(!state.undo)return;const section=getSection(state.undo.sectionId);if(!section)return;section.text=state.undo.text;section.format={...state.undo.format};const element=updateSectionElement(section);element.classList.add('updated');state.undo=null;$('#documentUndo').disabled=true;$('#documentSaveStatus').textContent='已撤销上次修改';clearSelectedContext();
  }
  function quickAction(action){
    if(action==='ask-ai'){askAI();return;}if(action==='format'){formatPanel.hidden=!formatPanel.hidden;return;}
    const prompts={polish:'请润色这段文字，使表达更正式严谨',rewrite:'请改写这段文字并保持公文语体',shorten:'请缩短这段文字，保留核心意思',supplement:'请补充责任分工和落实要求'};askAI();$('#chatText').value=prompts[action]||'';$('#chatText').focus();
  }

  let paragraphSelectTimer=null;
  content.addEventListener('click',event=>{const section=event.target.closest('.document-section');if(!section)return;clearTimeout(paragraphSelectTimer);paragraphSelectTimer=setTimeout(()=>{if(!selectTextRange())selectParagraph(section);},220);});
  content.addEventListener('dblclick',()=>{clearTimeout(paragraphSelectTimer);requestAnimationFrame(selectTextRange);});
  let textDragStart=null;
  content.addEventListener('pointerdown',event=>{if(event.button===0&&event.target.closest('.document-section'))textDragStart={x:event.clientX,y:event.clientY};});
  content.addEventListener('mouseup',event=>requestAnimationFrame(()=>{if(selectTextRange()){textDragStart=null;return;}if(textDragStart&&Math.hypot(event.clientX-textDragStart.x,event.clientY-textDragStart.y)>5)createRangeFromPoints(textDragStart,{x:event.clientX,y:event.clientY});textDragStart=null;}));
  content.addEventListener('keyup',event=>{if(event.key==='Enter'){const section=event.target.closest('.document-section');if(section)selectParagraph(section);}});
  toolbar.addEventListener('click',event=>{const action=event.target.closest('[data-document-action]')?.dataset.documentAction;if(action)quickAction(action);});
  formatPanel.addEventListener('click',event=>{const action=event.target.closest('[data-document-format]')?.dataset.documentFormat;if(!action)return;const prompts={bold:'把这段加粗',heading:'把这段改成小标题并加粗',center:'让这段居中',indent:'为这段设置首行缩进'};askAI();applySuggestion(prompts[action]);formatPanel.hidden=true;});
  $('#documentFormatClose').addEventListener('click',()=>formatPanel.hidden=true);$('#documentFitWidth').addEventListener('click',()=>{paper.className='document-paper fit-width';$('#documentFitWidth').classList.add('active');$('#documentActualSize').classList.remove('active');});
  $('#documentActualSize').addEventListener('click',()=>{paper.className='document-paper actual-size';$('#documentActualSize').classList.add('active');$('#documentFitWidth').classList.remove('active');});
  $('#documentUndo').addEventListener('click',undo);$('#documentBackMap').addEventListener('click',()=>switchWorkspace('map'));
  $('#documentOpenFolder').addEventListener('click',()=>{
    const folder=state.artifact?.folderPath||'';
    if(!folder){toast('当前文档尚未关联文件夹');return;}
    // 桌面端宿主可通过 window.openLocalFolder(path) 桥接真实打开资源管理器
    if(typeof window.openLocalFolder==='function'){window.openLocalFolder(folder);return;}
    toast('已打开文件夹：'+folder);
  });stage.addEventListener('scroll',()=>{toolbar.hidden=true;});window.addEventListener('resize',()=>{toolbar.hidden=true;});
  document.addEventListener('click',event=>{if(workspaceState.mode==='document'&&!content.contains(event.target)&&!toolbar.contains(event.target)&&!formatPanel.contains(event.target)&&!event.target.closest('.document-context-tag'))toolbar.hidden=true;});

  window.DocumentArtifactViewer={createNoticeArtifact,generateDocument,openDocument,applySuggestion,undo,getState:()=>({artifact:state.artifact,selection:state.selection,canUndo:Boolean(state.undo),updating:state.updating})};
})();

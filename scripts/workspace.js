// ============ 右侧对话收起/展开 ============
$('#collapseChat').addEventListener('click', ()=>{ $('#rightPanel').classList.add('collapsed'); $('#reopenTab').style.flexBasis='auto'; $('#reopenTab').style.width='auto'; });
$('#reopenChat').addEventListener('click', ()=>{ $('#rightPanel').classList.remove('collapsed'); $('#reopenTab').style.flexBasis='0'; $('#reopenTab').style.width='0'; });


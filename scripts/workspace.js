// ============ 右侧对话收起/展开 ============
$('#collapseChat').addEventListener('click', ()=>{ $('#rightPanel').classList.add('collapsed'); $('#reopenTab').style.flexBasis='auto'; $('#reopenTab').style.width='auto'; });
$('#reopenChat').addEventListener('click', ()=>{ $('#rightPanel').classList.remove('collapsed'); $('#reopenTab').style.flexBasis='0'; $('#reopenTab').style.width='0'; });

// ============ 统一内容工作区 ============
const workspaceState = {
  mode: 'map',
  currentArtifact: null,
  selectedContext: null
};

function switchWorkspace(mode){
  const target = document.querySelector(`[data-workspace-mode="${mode}"]`);
  if(!target) return false;

  document.querySelectorAll('.workspace-view').forEach(view=>{
    const active = view === target;
    view.classList.toggle('active', active);
    view.hidden = !active;
  });
  workspaceState.mode = mode;

  if(mode === 'map' && typeof map !== 'undefined' && map){
    requestAnimationFrame(()=>{
      if(typeof map.invalidateSize === 'function') map.invalidateSize();
    });
  }
  document.dispatchEvent(new CustomEvent('workspace:change', { detail:{ mode } }));
  return true;
}

function openArtifact(artifact){
  workspaceState.currentArtifact = artifact || null;
  if(!artifact || !artifact.type) return switchWorkspace('map');
  const mode = artifact.type === 'document' ? 'document' : artifact.type;
  return switchWorkspace(mode);
}

function setSelectedContext(context){
  workspaceState.selectedContext = context || null;
  document.dispatchEvent(new CustomEvent('workspace:context-change', { detail:{ context:workspaceState.selectedContext } }));
}

function clearSelectedContext(){
  setSelectedContext(null);
}

window.workspaceState = workspaceState;
window.switchWorkspace = switchWorkspace;
window.openArtifact = openArtifact;
window.setSelectedContext = setSelectedContext;
window.clearSelectedContext = clearSelectedContext;

switchWorkspace('map');

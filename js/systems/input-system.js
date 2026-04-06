// ═══════════════════════════════════════════════════════
// input-system.js — Thin tap router & context menu
// Delegates to mode-specific handlers in mode-*.js
// ═══════════════════════════════════════════════════════

const GameSceneInputSystem = {
  hideContextMenu(){
    const menu=document.getElementById('context-menu');
    if(menu) menu.style.display='none';
  },

  showContextMenu(x, y, options){
    const menu=document.getElementById('context-menu');
    if(!menu) return;
    menu.innerHTML='';
    for(const opt of options){
      const item=document.createElement('div');
      item.style.cssText='padding:6px 10px;cursor:pointer;color:#c9a84c;transition:all 0.15s;';
      item.textContent=opt.label;
      item.onmouseenter=()=>item.style.backgroundColor='rgba(200,180,100,0.15)';
      item.onmouseleave=()=>item.style.backgroundColor='';
      item.onclick=()=>{ this.hideContextMenu(); opt.action(); };
      menu.appendChild(item);
    }
    menu.style.left=x+'px';
    menu.style.top=y+'px';
    menu.style.display='block';
  },

  initInputHandlers(){
    document.addEventListener('click', (e) => {
      const menu=document.getElementById('context-menu');
      if(menu && menu.style.display==='block' && !menu.contains(e.target)){
        this.hideContextMenu();
      }
    }, { passive: true });
  },

  onTap(ptr){
    // Block input if any popup is showing
    if(document.getElementById('context-menu')?.style.display==='block') return;
    if(document.getElementById('enemy-stat-popup')?.style.display==='block') return;

    if(this.diceWaiting){ this._handleDiceDismiss(); return; }
    if(this.isMoving){ this.cancelCurrentMove(); return; }
    this.hideContextMenu();
    const tx=Math.floor(ptr.worldX/S), ty=Math.floor(ptr.worldY/S);
    if(tx<0||ty<0||tx>=COLS||ty>=ROWS) return;
    const enemy=this.enemies.find(e=>e.alive&&e.tx===tx&&e.ty===ty);

    // Delegate to active mode handler
    if(this.mode===MODE.COMBAT){ this.onTapCombat(tx,ty,enemy); return; }
    if(this.mode===MODE.EXPLORE_TB){ this.onTapExploreTB(tx,ty,enemy,ptr); return; }
    this.onTapExplore(tx,ty,enemy,ptr);
  },
};

Object.assign(GameScene.prototype, GameSceneInputSystem);

// Input handler system for game interactions and context menus
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
    // Close context menu on outside click
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
    const hasDoor=this.isDoorTile(tx,ty);
    
    if(this.mode===MODE.COMBAT){ this.onTapCombat(tx,ty,enemy); return; }
    if(this.mode===MODE.EXPLORE_TB){
      if(this._exploreTBEnemyPhase){ this.showStatus('Enemy phase in progress...'); return; }
      if(enemy&&hasDoor){
        this.showContextMenu(ptr.screenX, ptr.screenY, [
          { label: '⚔ Engage', action: ()=>this.onTapEnemy(enemy) },
          { label: '🚪 Toggle', action: ()=>this.toggleExploreTBDoor(tx,ty) },
        ]);
        return;
      }
      if(enemy){ this.onTapEnemy(enemy); return; }
      if(hasDoor){
        const adj=Math.abs(this.playerTile.x-tx)+Math.abs(this.playerTile.y-ty)===1;
        if(!adj){ this.showStatus('Move next to the door to interact.'); return; }
        this.toggleDoor(tx,ty);
        this.endExploreTurnBasedPlayerTurn();
        return;
      }
      if(this.isWallTile(tx,ty)) return;
      if(this._exploreTBMovesRemaining<=0){ this.showStatus('No movement left this turn.'); return; }
      if(this.enemies.some(e=>e.alive&&e.tx===tx&&e.ty===ty)){ this.showStatus('Cannot move onto an enemy tile.'); return; }
      const blk=(x,y)=>this.isWallTile(x,y)||(this.isDoorTile(x,y)&&!this.isDoorPassable(x,y))||this.enemies.some(e=>e.alive&&e.tx===x&&e.ty===y);
      const path=bfs(this.playerTile.x,this.playerTile.y,tx,ty,blk);
      if(!path.length){ this.showStatus('Cannot reach that tile.'); return; }
      const step=path[0];
      this.setDestination(step.x,step.y,()=>this.endExploreTurnBasedPlayerTurn());
      return;
    }
    if(enemy&&hasDoor){
      this.showContextMenu(ptr.screenX, ptr.screenY, [
        { label: '⚔ Engage', action: ()=>this.onTapEnemy(enemy) },
        { label: '🚪 Toggle', action: ()=>this.toggleExploreDoor(tx,ty) },
      ]);
      return;
    }
    if(enemy){ this.onTapEnemy(enemy); return; }
    if(hasDoor){
      const adj=Math.abs(this.playerTile.x-tx)+Math.abs(this.playerTile.y-ty)===1;
      if(!adj){ this.showStatus('Move next to the door to interact.'); return; }
      this.toggleExploreDoor(tx,ty);
      return;
    }
    if(this.isWallTile(tx,ty)) return;
    const pop=document.getElementById('enemy-stat-popup'); if(pop) pop.style.display='none';
    this._statPopupEnemy=null;
    this.setDestination(tx,ty);
  },

  toggleExploreDoor(x,y){
    this.toggleDoor(x,y);
  },

  toggleExploreTBDoor(x,y){
    this.toggleDoor(x,y);
    this.endExploreTurnBasedPlayerTurn();
  },
};

Object.assign(GameScene.prototype, GameSceneInputSystem);

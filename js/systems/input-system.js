// ═══════════════════════════════════════════════════════
// input-system.js — Thin tap router & context menu
// Delegates to mode-specific handlers in mode-*.js
// ═══════════════════════════════════════════════════════

const GameSceneInputSystem = {
  _ctxMenuOpenedAt: 0,

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
      item.style.cssText='padding:8px 12px;cursor:pointer;color:#c9a84c;transition:all 0.15s;border-radius:3px;';
      item.textContent=opt.label;
      item.onmouseenter=()=>item.style.backgroundColor='rgba(200,180,100,0.15)';
      item.onmouseleave=()=>item.style.backgroundColor='';
      item.onclick=(e)=>{ e.stopPropagation(); this.hideContextMenu(); opt.action(); };
      menu.appendChild(item);
    }
    // Clamp to viewport
    menu.style.left='0px'; menu.style.top='0px'; menu.style.display='block';
    const mw=menu.offsetWidth, mh=menu.offsetHeight;
    const vw=window.innerWidth, vh=window.innerHeight;
    const cx=Math.min(x, vw - mw - 4), cy=Math.min(y, vh - mh - 4);
    menu.style.left=Math.max(0,cx)+'px';
    menu.style.top=Math.max(0,cy)+'px';
    this._ctxMenuOpenedAt=Date.now();
  },

  initInputHandlers(){
    document.addEventListener('click', (e) => {
      const menu=document.getElementById('context-menu');
      if(menu && menu.style.display==='block' && !menu.contains(e.target)){
        // Ignore clicks within 300ms of opening (same click that triggered the menu)
        if(Date.now()-this._ctxMenuOpenedAt<300) return;
        this.hideContextMenu();
      }
    }, { passive: true });
  },

  onTap(ptr){
    // Dismiss popups on tap — context menu blocks, enemy popup just closes
    const ctx=document.getElementById('context-menu');
    if(ctx?.style.display==='block'){ ctx.style.display='none'; return; }
    const esp=document.getElementById('enemy-stat-popup');
    if(esp?.style.display==='block'){ esp.style.display='none'; this._statPopupEnemy=null; }

    if(this.diceWaiting){ this._handleDiceDismiss(); return; }
    // In combat: allow redirecting/attacking while moving (cancel current move, proceed)
    // In explore: cancel current move on any tap
    if(this.isMoving){
      if(this.mode===MODE.COMBAT){
        this.cancelCurrentMove();
        // Fall through to process the tap as combat input
      } else {
        this.cancelCurrentMove();
        return;
      }
    }
    this.hideContextMenu();
    const tx=Math.floor(ptr.worldX/S), ty=Math.floor(ptr.worldY/S);
    if(tx<0||ty<0||tx>=COLS||ty>=ROWS) return;
    let enemy=this.enemies.find(e=>e.alive&&e.tx===tx&&e.ty===ty);

    // Delegate to active mode handler
    if(this.mode===MODE.COMBAT){ this.onTapCombat(tx,ty,enemy,ptr); return; }
    this.onTapExplore(tx,ty,enemy,ptr);
  },

  // ── Hold-to-move (BG3-style) ──────────────────────────
  // Pointer held >200ms on walkable ground → character walks toward cursor.
  _holdMoveThreshold: 200,
  _holdMoveActive: false,
  _holdWorldX: 0,
  _holdWorldY: 0,
  _holdTimer: null,

  _onHzPointerDown(ptr){
    if(ptr.button!==0) return;
    // Don't fire tap/hold during two-finger touch pan
    if(this._touchPanning) return;
    // Fire tap immediately (pathfind / interact / dismiss)
    this.onTap(ptr);
    // Start hold-to-move timer (explore-realtime only)
    if(this._holdTimer){ this._holdTimer.remove(); this._holdTimer=null; }
    this._holdWorldX=ptr.worldX;
    this._holdWorldY=ptr.worldY;
    this._holdTimer=this.time.delayedCall(this._holdMoveThreshold,()=>{
      this._holdTimer=null;
      if(!this.isExploreMode()||this.mode===MODE.COMBAT) return;
      this._holdMoveActive=true;
      // Truncate existing path so update loop takes over after current step
      if(this.movePath.length>0){ this.movePath=[]; this.clearPathDots(); }
    });
  },

  _onHzPointerMove(ptr){
    if(!this._holdMoveActive) return;
    this._holdWorldX=ptr.worldX;
    this._holdWorldY=ptr.worldY;
  },

  _onHzPointerUp(){
    if(this._holdTimer){ this._holdTimer.remove(); this._holdTimer=null; }
    this._holdMoveActive=false;
  },
};

Object.assign(GameScene.prototype, GameSceneInputSystem);

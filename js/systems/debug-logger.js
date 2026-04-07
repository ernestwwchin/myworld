// Debug logger system — Captures game events and sends to backend for analysis
const GameSceneDebugLogger = {
  initDebugLogger(){
    this.debugEvents = [];
    this.maxDebugEvents = 500;
    this.debugEnabled = true;
    this.debugAutoSendInterval = 5 * 60 * 1000; // 5 minutes
    this.debugAutoSendThreshold = 100; // Send if 100+ events

    // Auto-send periodically
    this._debugAutoSendTimer = setInterval(() => this.autoSendDebugLogs(), this.debugAutoSendInterval);

    // Send on page unload
    window.addEventListener('beforeunload', () => this.sendDebugLogs());
  },

  logEvent(category, action, data = {}){
    if(!this.debugEnabled) return;
    const event = {
      timestamp: Date.now(),
      category,
      action,
      data,
      gameState: {
        mode: this.mode,
        playerPos: this.playerTile ? { x: this.playerTile.x, y: this.playerTile.y } : null,
        playerHP: this.playerHP,
        enemies: this.enemies?.length || 0,
      }
    };
    this.debugEvents.push(event);
    if(this.debugEvents.length > this.maxDebugEvents) this.debugEvents.shift();

    // Log to console for important events
    if(category === 'COMBAT'){
      const style = 'color: #e74c3c; font-weight: bold;';
      console.log(`%c[${category}] ${action}`, style, data);
    }

    // Auto-send if threshold reached
    if(this.debugEvents.length >= this.debugAutoSendThreshold){
      this.autoSendDebugLogs();
    }
  },

  async autoSendDebugLogs(){
    if(!this.debugEvents.length || !this.debugEnabled) return;
    try {
      await fetch('/_debug/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: this.debugEvents,
          sessionDuration: Date.now() - (this.sessionStartTime || Date.now()),
          finalState: {
            mode: this.mode,
            playerHP: this.playerHP,
            enemies: this.enemies?.length || 0,
          }
        })
      });
      // Don't clear on auto-send, accumulate for manual review
    } catch(err){
      console.error('[DebugLogger] Failed to auto-send logs:', err);
    }
  },

  async sendDebugLogs(){
    if(!this.debugEvents.length) return;
    try {
      const response = await fetch('/_debug/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: this.debugEvents,
          sessionDuration: Date.now() - (this.sessionStartTime || Date.now()),
          finalState: {
            mode: this.mode,
            playerHP: this.playerHP,
            enemies: this.enemies?.length || 0,
          }
        })
      });
      if(response.ok) {
        this.showStatus('✓ Debug logs sent');
        console.log('[DebugLogger] Sent', this.debugEvents.length, 'events');
      }
      return await response.json();
    } catch(err){
      console.error('[DebugLogger] Failed to send logs:', err);
    }
  },

  clearDebugLogs(){
    this.debugEvents = [];
  },

  stopDebugLogger(){
    if(this._debugAutoSendTimer) clearInterval(this._debugAutoSendTimer);
    if(this._debugSSE) this._debugSSE.close();
  },

  // ═══════════════════════════════════════════════════════
  // REMOTE DEBUG BRIDGE
  // Connects to backend SSE channel, receives commands,
  // executes them, and posts results back.
  // ═══════════════════════════════════════════════════════

  initDebugBridge(){
    if(this._debugSSE) return;
    const sse = new EventSource('/_debug/channel');
    this._debugSSE = sse;

    sse.onmessage = async (e) => {
      try {
        const msg = JSON.parse(e.data);
        if(msg.type === 'connected'){
          console.log('[DebugBridge] Connected to backend');
          return;
        }
        if(msg.type === 'exec'){
          const result = await this._execDebugCmd(msg.cmd, msg.args || {});
          fetch('/_debug/response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: msg.id, result })
          }).catch(err => console.error('[DebugBridge] Failed to post result:', err));
        }
      } catch(err){
        console.error('[DebugBridge] Message error:', err);
        if(e.data){
          try {
            const msg = JSON.parse(e.data);
            if(msg.id){
              fetch('/_debug/response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: msg.id, error: String(err) })
              }).catch(() => {});
            }
          } catch(_) {}
        }
      }
    };

    sse.onerror = () => {
      console.warn('[DebugBridge] SSE connection lost, will reconnect...');
    };
  },

  async _execDebugCmd(cmd, args){
    switch(cmd){
      // ── Read State ──
      case 'getState':
        return {
          mode: this.mode,
          playerTile: this.playerTile,
          playerHP: this.playerHP,
          playerMaxHP: this.playerMaxHP,
          playerAP: this.playerAP,
          playerMoves: this.playerMoves,
          playerHidden: this.playerHidden,
          playerLevel: this.pStats?.level,
          diceWaiting: this.diceWaiting,
          isMoving: this.isMoving,
          _movingToAttack: this._movingToAttack,
          turnIndex: this.turnIndex,
          combatGroup: this.combatGroup?.map(e => ({
            type: e.type, hp: e.hp, maxHp: e.maxHp, alive: e.alive,
            tx: e.tx, ty: e.ty, inCombat: e.inCombat
          })),
          enemies: this.enemies?.map(e => ({
            type: e.type, hp: e.hp, maxHp: e.maxHp, alive: e.alive,
            tx: e.tx, ty: e.ty, inCombat: e.inCombat
          }))
        };

      case 'getLogs':
        return {
          count: this.debugEvents?.length || 0,
          events: (this.debugEvents || []).slice(-(args.limit || 50))
        };

      case 'getFlags':
        return typeof Flags !== 'undefined' ? Flags.serialize() : {};

      case 'setFlag':
        if(typeof Flags !== 'undefined' && args.key){
          Flags.set(args.key, args.value);
          return { ok: true, key: args.key, value: Flags.get(args.key) };
        }
        return { error: 'Flags not available or missing key' };

      // ── Actions ──
      case 'move':
        if(args.x != null && args.y != null){
          this.setDestination(args.x, args.y);
          return { ok: true, target: { x: args.x, y: args.y } };
        }
        return { error: 'Missing x/y' };

      case 'runEvent':
        if(typeof EventRunner !== 'undefined' && args.id){
          EventRunner.onEvent(args.id, args.data);
          return { ok: true, eventId: args.id };
        }
        return { error: 'EventRunner not available or missing id' };

      case 'startDialog':
        if(typeof DialogRunner !== 'undefined' && args.id){
          DialogRunner.start(args.id);
          return { ok: true, dialogId: args.id };
        }
        return { error: 'DialogRunner not available or missing id' };

      case 'endTurn':
        this.endPlayerTurn();
        return { ok: true };

      case 'attack':
        if(args.enemyIndex != null){
          const enemy = this.enemies?.[args.enemyIndex];
          if(enemy?.alive){ this.playerAttackEnemy(enemy); return { ok: true }; }
          return { error: 'Enemy not found or dead' };
        }
        return { error: 'Missing enemyIndex' };

      case 'tap':
        if(args.x != null && args.y != null){
          const fakePtr = { worldX: args.x * S + S / 2, worldY: args.y * S + S / 2 };
          this.onTap(fakePtr);
          return { ok: true, tile: { x: args.x, y: args.y }, mode: this.mode };
        }
        return { error: 'Missing x/y tile coordinates' };

      case 'tapEnemy':
        if(args.enemyIndex != null){
          const e = this.enemies?.[args.enemyIndex];
          if(!e?.alive) return { error: 'Enemy not found or dead' };
          const fakePtr = { worldX: e.tx * S + S / 2, worldY: e.ty * S + S / 2 };
          this.onTap(fakePtr);
          return { ok: true, enemy: e.type, tile: { x: e.tx, y: e.ty } };
        }
        return { error: 'Missing enemyIndex' };

      case 'dismissDice':
        this._handleDiceDismiss();
        return { ok: true };

      case 'screenshot': {
        const canvas = document.querySelector('canvas');
        if(!canvas) return { error: 'No canvas found' };
        return { dataUrl: canvas.toDataURL('image/png') };
      }

      // ── Evaluate expression (dangerous — debug only) ──
      case 'eval':
        if(!args.expr) return { error: 'Missing expr' };
        try {
          const scene = this;
          const fn = new Function('scene', 'Flags', 'EventRunner', 'DialogRunner',
            `return (${args.expr})`);
          const val = fn(scene,
            typeof Flags !== 'undefined' ? Flags : null,
            typeof EventRunner !== 'undefined' ? EventRunner : null,
            typeof DialogRunner !== 'undefined' ? DialogRunner : null);
          return { value: typeof val === 'object' ? JSON.parse(JSON.stringify(val)) : val };
        } catch(e){
          return { error: e.message };
        }

      default:
        return { error: `Unknown command: ${cmd}` };
    }
  }
};

Object.assign(GameScene.prototype, GameSceneDebugLogger);

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
  }
};

Object.assign(GameScene.prototype, GameSceneDebugLogger);

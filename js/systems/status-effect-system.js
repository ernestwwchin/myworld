// ═══════════════════════════════════════════════════════
// status-effect-system.js — Status effects mixin for GameScene
// Effect management, status processing, explore ticker
// Damage application is in damage-system.js
// ═══════════════════════════════════════════════════════

Object.assign(GameScene.prototype, {

  actorEffects(actor){
    if(actor==='player') return this.playerEffects;
    if(!actor.effects) actor.effects=[];
    return actor.effects;
  },

  removeEffect(actor,index){
    const fx=this.actorEffects(actor);
    if(index<0||index>=fx.length) return null;
    return fx.splice(index,1)[0]||null;
  },

  // applyDamageToActor, applyHealToActor — implemented in damage-system.js

  processStatusEffectsForActor(actor,trigger,ctx={}){
    const fx=this.actorEffects(actor);
    if(!fx||!fx.length) return {skipTurn:false,acted:false};
    const t=String(trigger||'').toLowerCase();
    const out={skipTurn:false,acted:false};
    const tickMs=Math.max(200,Number(STATUS_RULES?.exploreTickMs||1000));

    for(let i=fx.length-1;i>=0;i--){
      const e=fx[i];
      const trg=String(e.trigger||'turn_start').toLowerCase();
      if(trg!==t&&trg!=='any') continue;

      if(t==='time_tick'){
        const gate=Math.max(200,Number(e.tickMs||tickMs));
        e.elapsedMs=(Number(e.elapsedMs)||0)+Number(ctx.deltaMs||tickMs);
        if(e.elapsedMs<gate) continue;
        e.elapsedMs=0;
      }

      const id=String(e.id||e.type||'effect').toLowerCase();
      const base=(STATUS_DEFS&&STATUS_DEFS[id])?STATUS_DEFS[id]:{};
      const onTrigger={...(base.onTrigger||{}),...(e.onTrigger||{})};

      if(onTrigger.damageDice||e.damageDice){
        const spec=e.damageDice||onTrigger.damageDice||STATUS_RULES?.defaultPoisonDamageDice||[1,4,0];
        const dr=dnd.rollDamageSpec(spec,false);
        const col=onTrigger.damageColor?'#'+Number(onTrigger.damageColor).toString(16).padStart(6,'0'):'#8bc34a';
        this.applyDamageToActor(actor,dr.total,col,`${this.actorLabel(actor)} takes ${id} damage.`);
        this.showStatus(`${this.actorLabel(actor)} suffers ${id} (${this.formatDamageBreakdown(dr)}).`);
        out.acted=true;
      }

      const saveCfg=onTrigger.removeOnSave||e.removeOnSave;
      if(saveCfg&&t==='turn_start'){
        const stat=String(saveCfg.stat||e.wakeStat||'wis').toLowerCase();
        const mod=actor==='player'?dnd.mod(this.pStats[stat]||10):dnd.mod(actor?.stats?.[stat]||10);
        const dc=Number(saveCfg.dc||e.wakeDc||STATUS_RULES?.sleepWakeDc||12);
        const roll=dnd.roll(1,20)+mod;
        if(roll>=dc){
          this.removeEffect(actor,i);
          this.showStatus(`${this.actorLabel(actor)} is no longer ${id}.`);
          continue;
        }
      }

      if(onTrigger.skipTurn===true&&t==='turn_start'){
        out.skipTurn=true;
        out.acted=true;
        this.showStatus(`${this.actorLabel(actor)} is affected by ${id} and skips the turn.`);
      }

      if(Number.isFinite(e.duration)){
        e.duration=Math.max(0,Number(e.duration)-1);
        if(e.duration<=0){
          this.removeEffect(actor,i);
          this.showStatus(`${this.actorLabel(actor)} is no longer ${id}.`);
        }
      }
    }
    return out;
  },

  endEnemyTurn(enemy){
    if(enemy&&enemy.alive) this.processStatusEffectsForActor(enemy,'turn_end');
    this.advanceEnemyTurn();
  },

  startExploreStatusTicker(){
    const tickMs=Math.max(250,Number(STATUS_RULES?.exploreTickMs||1000));
    this.time.addEvent({delay:tickMs,loop:true,callback:()=>{
      if(!this.isExploreMode()) return;
      this.processStatusEffectsForActor('player','time_tick',{deltaMs:tickMs});
      for(const e of this.enemies){
        if(!e.alive||e.inCombat) continue;
        this.processStatusEffectsForActor(e,'time_tick',{deltaMs:tickMs});
      }
    }});
  },

});

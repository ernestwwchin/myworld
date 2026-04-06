// ═══════════════════════════════════════════════════════
// damage-system.js — Damage & healing mixin for GameScene
// Generic HP reduction/restoration, death handling,
// HP bar updates, float text
// ═══════════════════════════════════════════════════════

Object.assign(GameScene.prototype, {

  applyDamageToActor(actor,dmg,color='#e74c3c',label=''){
    const n=Math.max(1,Math.floor(Number(dmg)||0));
    if(actor==='player'){
      this.playerHP=Math.max(0,this.playerHP-n);
      this.spawnFloat(this.player.x,this.player.y-12,`-${n}`,color);
      this.updateHUD();
      if(this.playerHP<=0) this.showStatus(label||'You have been defeated...');
      return;
    }
    if(!actor||!actor.alive) return;
    actor.hp=Math.max(0,actor.hp-n);
    this.spawnFloat(actor.tx*S+S/2,actor.ty*S-10,`-${n}`,color);
    const ratio=Math.max(0,actor.hp/Math.max(1,actor.maxHp||actor.hp||1));
    if(actor.hpFg){
      actor.hpFg.setDisplaySize((S-8)*ratio,5);
      if(ratio<0.4) actor.hpFg.setFillStyle(0xe67e22);
      if(ratio<0.15) actor.hpFg.setFillStyle(0xe74c3c);
    }
    if(actor.hp<=0){
      actor.alive=false;
      actor.inCombat=false;
      this.tweens.add({targets:[actor.img,actor.hpBg,actor.hpFg,actor.lbl,actor.sightRing],alpha:0,duration:420,onComplete:()=>{
        [actor.img,actor.hpBg,actor.hpFg,actor.lbl,actor.sightRing,actor.fa].forEach(o=>{ if(o&&o.destroy) o.destroy(); });
      }});
      if(actor.fa) this.tweens.add({targets:actor.fa,alpha:0,duration:240});
      this.showStatus(label||`${actor.type} collapses.`);
    }
  },

  applyHealToActor(actor,amount,color='#2ecc71',label=''){
    const n=Math.max(1,Math.floor(Number(amount)||0));
    if(actor==='player'){
      const prev=this.playerHP;
      this.playerHP=Math.min(this.playerMaxHP,this.playerHP+n);
      const healed=this.playerHP-prev;
      if(healed>0) this.spawnFloat(this.player.x,this.player.y-12,`+${healed}`,color);
      this.updateHUD();
      if(label) this.showStatus(label);
      return;
    }
    if(!actor||!actor.alive) return;
    const max=Math.max(1,actor.maxHp||actor.hp||1);
    const prev=actor.hp;
    actor.hp=Math.min(max,actor.hp+n);
    const healed=actor.hp-prev;
    if(healed>0) this.spawnFloat(actor.tx*S+S/2,actor.ty*S-10,`+${healed}`,color);
    const ratio=Math.max(0,actor.hp/max);
    if(actor.hpFg){
      actor.hpFg.setDisplaySize((S-8)*ratio,5);
      if(ratio>=0.4) actor.hpFg.setFillStyle(0x2ecc71);
      else if(ratio>=0.15) actor.hpFg.setFillStyle(0xe67e22);
      else actor.hpFg.setFillStyle(0xe74c3c);
    }
  },

});

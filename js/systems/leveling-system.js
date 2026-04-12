// ═══════════════════════════════════════════════════════
// leveling-system.js — Level up, ASI, XP progression
// Extracted from game.js
// ═══════════════════════════════════════════════════════

Object.assign(GameScene.prototype, {

  checkLevelUp(){
    const p=this.pStats;
    let leveled=false;
    while(p.level<20&&p.xp>=DND_XP[p.level]){
      p.level++; leveled=true;
      p.profBonus=dnd.profBonus(p.level);
      const hr=Math.floor(Math.random()*p.hitDie)+1;
      const hg=Math.max(1,hr+dnd.mod(p.con));
      p.maxHP+=hg; this.playerMaxHP=p.maxHP; this.playerHP=this.playerMaxHP;
      if(FIGHTER_FEATURES[p.level]) for(const f of FIGHTER_FEATURES[p.level]) p.features.push(f);
      if(ASI_LEVELS.has(p.level)){ p.asiPending++; this.showASIPanel(); }
      if(p.level===5||p.level===11) this.spawnFloat(this.player.x,this.player.y-50,'EXTRA ATTACK!','#f39c12');
      this.spawnFloat(this.player.x,this.player.y-30,`LEVEL ${p.level}!`,'#9b59b6');
      this.showStatus(`Level Up! Now level ${p.level}! HP+${hg}`);
    }
    if(leveled) this.updateHUD();
    this.updateStatsPanel();
  },

  showASIPanel(){
    if(this.ui) return this.ui.showASIPanel();
  },

  applyASI(s1,s2){
    const p=this.pStats; if(p.asiPending<=0) return;
    p[s1]=Math.min(20,p[s1]+1); p[s2]=Math.min(20,p[s2]+1); p.asiPending--;
    const norm=dnd.normalizeDamageSpec(p.damageFormula||'1d4');
    norm.bonus=dnd.mod(p.str);
    p.damageFormula=dnd.damageSpecToString(norm);
    const panel=document.getElementById('asi-panel'); if(panel) panel.style.display='none';
    this.spawnFloat(this.player.x,this.player.y-40,`${s1.toUpperCase()}+1 ${s2.toUpperCase()}+1`,'#2ecc71');
    this.updateStatsPanel();
  },

});

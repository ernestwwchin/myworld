const GameSceneInitiativeSystem = {
  rollInitiativeOrder(combatGroup, surprisedEnemies = new Set()) {
    // BG3/DnD-style reminder:
    // 1) Everyone rolls initiative at combat start.
    // 2) Order is highest total first (roll + DEX modifier).
    // 3) Surprise does NOT change initiative score; it only skips that actor's first turn.
    const playerDexMod = dnd.mod(this.pStats?.dex || 10);
    const playerRoll = dnd.roll(1, 20);
    const entries = [{
      id: 'player',
      roll: playerRoll,
      mod: playerDexMod,
      init: playerRoll + playerDexMod,
      surprised: false,
    }];

    for (const e of combatGroup) {
      const dexMod = dnd.mod(e?.stats?.dex || 10);
      const roll = dnd.roll(1, 20);
      entries.push({
        id: 'enemy',
        enemy: e,
        roll,
        mod: dexMod,
        init: roll + dexMod,
        surprised: surprisedEnemies.has(e),
      });
    }

    entries.sort((a, b) => {
      if (b.init !== a.init) return b.init - a.init;
      if (b.mod !== a.mod) return b.mod - a.mod;
      // Deterministic tie-break bias keeps UX stable in small fights.
      if (a.id === 'player' && b.id !== 'player') return -1;
      if (b.id === 'player' && a.id !== 'player') return 1;
      return Math.random() - 0.5;
    });

    return entries;
  }
};

Object.assign(GameScene.prototype, GameSceneInitiativeSystem);

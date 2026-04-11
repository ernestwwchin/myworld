// ═══════════════════════════════════════════════════════
// inventory-system.js — Inventory, loot, equip, use-item
// Extracted from game.js
// ═══════════════════════════════════════════════════════

Object.assign(GameScene.prototype, {

  _getItemMaxStack(item){
    if(!item) return 1;
    const def=(typeof ITEM_DEFS!=='undefined'&&item.id)?ITEM_DEFS[item.id]:null;
    const explicit=Number(item.maxStack??def?.maxStack);
    if(Number.isFinite(explicit)&&explicit>0) return Math.floor(explicit);

    // Type defaults keep inventory practical without forcing every item to declare maxStack.
    if(item.type==='weapon'||item.type==='armor') return 1;
    if(item.type==='consumable') return 20;
    if(item.type==='gem') return 50;
    if(item.type==='misc') return 99;
    return 1;
  },

  _isStackableItem(item){
    if(!item) return false;
    if(typeof item.stackable==='boolean') return item.stackable;
    return this._getItemMaxStack(item)>1;
  },

  addItemToInventory(item,qty=1){
    if(!item) return null;
    if(!Array.isArray(this.pStats.inventory)) this.pStats.inventory=[];
    const inv=this.pStats.inventory;
    const addQty=Math.max(1,Math.floor(Number(qty||item.qty||1)));
    const isStackable=this._isStackableItem(item);
    const maxStack=this._getItemMaxStack(item);
    let firstResult=null;

    if(!isStackable||maxStack<=1){
      for(let i=0;i<addQty;i++){
        const entry={...item};
        delete entry.qty;
        inv.push(entry);
        if(!firstResult) firstResult=entry;
      }
      return firstResult;
    }

    let remaining=addQty;

    // Fill existing partial stacks first.
    for(const existing of inv){
      if(!existing||existing.id!==item.id||!this._isStackableItem(existing)) continue;
      const current=Math.max(1,Math.floor(Number(existing.qty||1)));
      const room=maxStack-current;
      if(room<=0) continue;
      const move=Math.min(room,remaining);
      existing.qty=current+move;
      remaining-=move;
      if(!firstResult) firstResult=existing;
      if(remaining<=0) return firstResult;
    }

    // Create new stacks for overflow.
    while(remaining>0){
      const stackQty=Math.min(maxStack,remaining);
      const entry={...item,qty:stackQty,maxStack};
      inv.push(entry);
      remaining-=stackQty;
      if(!firstResult) firstResult=entry;
    }

    return firstResult;
  },

  handleEnemyDefeatLoot(enemy){
    if(!enemy||enemy._lootDropped) return {gold:0,items:[]};
    enemy._lootDropped=true;

    const tables=(window._MAP_META&&window._MAP_META.lootTables)||{};
    const table=enemy.lootTable?tables[enemy.lootTable]:null;
    const fixedGold=Number(enemy.gold||0);
    const fixedItems=Array.isArray(enemy.loot)?enemy.loot:[];

    const resolved=(typeof ChestEntity!=='undefined'&&typeof ChestEntity.resolveTableLoot==='function')
      ? ChestEntity.resolveTableLoot(fixedGold,fixedItems,table)
      : { gold: fixedGold, items: fixedItems.map(i=>({ ...i })) };

    if(!resolved.gold&&(!resolved.items||!resolved.items.length)) return resolved;

    const drops=[];
    if(resolved.gold>0){
      this.pStats.gold=(this.pStats.gold||0)+resolved.gold;
      drops.push(`+${resolved.gold} gold`);
      { const _ew=this.enemyWorldPos(enemy); this.spawnFloat(_ew.x,_ew.y-S/2-20,`+${resolved.gold}g`,'#f0c060'); }
    }

    for(const item of (resolved.items||[])){
      this.addItemToInventory(item,Number(item.qty||1));
      drops.push(`${item.icon?item.icon+' ':''}${item.name||item.id||'item'}`);
    }

    if(drops.length){
      const msg=`Looted ${enemy.displayName||enemy.type}: ${drops.join(', ')}`;
      if(typeof CombatLog!=='undefined') CombatLog.log(msg,'loot','system');
      this.showStatus(msg);
      if(typeof SidePanel!=='undefined'&&SidePanel._activeTab==='inventory') SidePanel.refresh();
      if(typeof Hotbar!=='undefined') Hotbar.refreshItems();
      this.updateHUD();
    }
    return resolved;
  },

  useItem(item){
    if(!item) return;
    const inv=this.pStats.inventory;
    if(!Array.isArray(inv)) return;
    const idx=inv.indexOf(item);
    if(idx<0) return;

    // Look up the canonical item definition; fall back to inline item data
    const def=ITEM_DEFS[item.id]||item;
    const onUse=def.onUse;

    // useAbility: hand off to the ability system for targeted effects
    if(onUse?.useAbility){
      if(typeof this.selectAction==='function') this.selectAction(onUse.useAbility);
      if(Number(item.qty||1)>1) item.qty=Math.max(1,Number(item.qty||1)-1);
      else inv.splice(idx,1);
      if(typeof SidePanel!=='undefined') SidePanel.refresh();
      if(typeof Hotbar!=='undefined') Hotbar.refreshItems();
      return;
    }

    const effects=onUse?.effects||[];

    // Legacy fallback: inline heal field (no ITEM_DEF)
    if(!effects.length&&item.heal){
      effects.push({type:'heal',amount:item.heal});
    }

    if(!effects.length){
      this.showStatus(`${item.name||item.id} can't be used right now.`);
      return;
    }

    let consumed=onUse?.consumeOnUse!==false;
    let didSomething=false;

    for(const fx of effects){
      switch(fx.type){
        case 'heal':{
          const healed=dnd.rollDamageSpec(fx.amount||'1d4',false).total;
          this.playerHP=Math.min(this.playerMaxHP,this.playerHP+healed);
          this.showStatus(`${item.icon||''} ${item.name||item.id}: restored ${healed} HP!`);
          if(typeof CombatLog!=='undefined') CombatLog.log(`${item.icon||''}${item.name||item.id}: +${healed} HP`,'player');
          didSomething=true;
          break;
        }
        case 'removeStatus':{
          const efx=this.playerEffects;
          const i=efx.findIndex(e=>(e.id||e.type)===fx.statusId);
          if(i>=0){
            efx.splice(i,1);
            this.showStatus(`${item.name||item.id}: ${fx.statusId} cured!`);
          } else {
            this.showStatus(`${item.name||item.id}: you aren't ${fx.statusId}.`);
          }
          didSomething=true;
          break;
        }
        case 'applyStatus':{
          const base=STATUS_DEFS[fx.statusId]||{};
          this.playerEffects.push({
            id: fx.statusId,
            type: fx.statusId,
            duration: fx.duration??base.duration??3,
            trigger: fx.trigger||base.trigger||'turn_end',
            ...(base.onTrigger?{onTrigger:base.onTrigger}:{}),
          });
          this.showStatus(`${item.name||item.id}: ${fx.statusId} applied!`);
          didSomething=true;
          break;
        }
        case 'modifyStat':{
          const stat=fx.stat;
          if(!stat) break;
          const prev=this.pStats[stat]??0;
          this.pStats[stat]=prev+fx.bonus;
          // Track for later removal
          if(!this.pStats._statMods) this.pStats._statMods=[];
          const turns=fx.duration??10;
          this.pStats._statMods.push({stat,bonus:fx.bonus,turnsLeft:turns});
          this.showStatus(`${item.name||item.id}: ${stat.toUpperCase()} ${fx.bonus>=0?'+':''}${fx.bonus} for ${turns} turns.`);
          didSomething=true;
          break;
        }
        case 'log':{
          if(typeof CombatLog!=='undefined') CombatLog.log(fx.message||'','system');
          break;
        }
      }
    }

    if(consumed&&didSomething){
      if(Number(item.qty||1)>1) item.qty=Math.max(1,Number(item.qty||1)-1);
      else inv.splice(idx,1);
    }

    this.updateHUD();
    if(typeof SidePanel!=='undefined') SidePanel.refresh();
    if(typeof Hotbar!=='undefined') Hotbar.refreshItems();
  },

  /** Tick down modifyStat durations — call at turn start/end */
  tickStatMods(){
    const mods=this.pStats._statMods;
    if(!Array.isArray(mods)||!mods.length) return;
    for(let i=mods.length-1;i>=0;i--){
      const m=mods[i];
      m.turnsLeft--;
      if(m.turnsLeft<=0){
        this.pStats[m.stat]=(this.pStats[m.stat]||0)-m.bonus;
        this.showStatus(`${m.stat.toUpperCase()} bonus expired.`);
        mods.splice(i,1);
      }
    }
  },

  equipItem(item){
    if(!item) return;
    const inv=this.pStats.inventory;
    if(!Array.isArray(inv)||!inv.includes(item)) return;

    if(item.type==='weapon'&&item.weaponId){
      // Return previously equipped weapon to inventory
      const old=this.pStats.equippedWeapon;
      if(old) inv.push(old);
      // Remove new item from inventory and put it in the weapon slot
      inv.splice(inv.indexOf(item),1);
      this.pStats.equippedWeapon=item;
      this.pStats.weaponId=item.weaponId;
      const weapon=WEAPON_DEFS[item.weaponId];
      if(weapon){
        this.pStats.damageFormula=dnd.damageSpecToString(weapon.damageDice);
        this.pStats.atkRange=weapon.range||1;
      }
      this.showStatus(`Equipped ${item.name||item.id}.`);
    } else if(item.type==='armor'&&item.acBonus){
      // Return old armor to inventory
      const old=this.pStats.equippedArmor;
      if(old) inv.push(old);
      // Remove new armor from inventory and put it in the armor slot
      inv.splice(inv.indexOf(item),1);
      this.pStats.equippedArmor=item;
      this.pStats.ac=(this.pStats.baseAC||10)+item.acBonus;
      this.showStatus(`Equipped ${item.name||item.id} (+${item.acBonus} AC).`);
    } else {
      this.showStatus(`Can't equip ${item.name||item.id}.`);
    }

    if(typeof SidePanel!=='undefined') SidePanel.refresh();
    if(typeof Hotbar!=='undefined') Hotbar.refreshItems();
  },

  dropItem(item){
    if(!item) return;
    const inv=this.pStats.inventory;
    if(!Array.isArray(inv)) return;
    const idx=inv.indexOf(item);
    if(idx<0) return;
    if(Number(item.qty||1)>1){
      item.qty=Math.max(1,Number(item.qty||1)-1);
      this.showStatus(`Dropped 1x ${item.name||item.id}.`);
    } else {
      inv.splice(idx,1);
      this.showStatus(`Dropped ${item.name||item.id}.`);
    }
    if(typeof SidePanel!=='undefined') SidePanel.refresh();
    if(typeof Hotbar!=='undefined') Hotbar.refreshItems();
  },

});

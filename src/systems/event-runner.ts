import { dnd, MODE } from '@/config';
import { withCombatLog } from '@/helpers';
import type { GameScene } from '@/game';

type EventStep = {
  do?: string;
  label?: string;
  if?: EventCondition;
  [key: string]: unknown;
};

type EventCondition =
  | { all: EventCondition[] }
  | { any: EventCondition[] }
  | { not: EventCondition }
  | { flag: string; eq?: unknown }
  | { hidden: boolean }
  | { mode: string }
  | { hp_below: number }
  | { hp_above: number }
  | { level_min: number }
  | { playerAt: [number, number] }
  | { playerNear: [number, number, number] }
  | { enemyAlive: string }
  | { enemyDead: string }
  | { doorClosed: [number, number] }
  | { doorOpen: [number, number] }
  | { skillCheck: { skill: string; dc: number } };

type EventDef = {
  id?: string;
  once?: boolean;
  trigger?: { tile?: { x: number; y: number }; event?: string; if?: EventCondition };
  steps?: EventStep[];
};

type StepResult = { goto: string } | undefined;

export const EventRunner = {
  _events: [] as EventDef[],
  _firedOnce: {} as Record<number, boolean>,
  _running: false,
  _scene: null as GameScene | null,
  _forcedD20: undefined as number | undefined,
  _originalRoll: null as ((n: number, d: number) => number) | null,

  init(scene: GameScene, eventDefs: EventDef[]): void {
    this._scene = scene;
    this._events = eventDefs || [];
    this._firedOnce = {};
    this._running = false;
    console.log(`[EventRunner] Loaded ${this._events.length} events`);
  },

  clear(): void {
    this._events = [];
    this._firedOnce = {};
    this._running = false;
  },

  onPlayerTile(x: number, y: number): void {
    for (let i = 0; i < this._events.length; i++) {
      const evt = this._events[i];
      if (!evt.trigger?.tile) continue;
      if (evt.trigger.tile.x !== x || evt.trigger.tile.y !== y) continue;
      this._tryFire(i, evt);
    }
  },

  onEvent(eventName: string, data?: unknown): void {
    for (let i = 0; i < this._events.length; i++) {
      const evt = this._events[i];
      if (evt.trigger?.event !== eventName) continue;
      this._tryFire(i, evt, data);
    }
  },

  fireById(eventId: string): void {
    for (let i = 0; i < this._events.length; i++) {
      if (this._events[i].id === eventId) {
        this._tryFire(i, this._events[i]);
        return;
      }
    }
    console.warn(`[EventRunner] Event not found: ${eventId}`);
  },

  async _tryFire(index: number, evt: EventDef, data?: unknown): Promise<void> {
    const once = evt.once !== false;
    if (once && this._firedOnce[index]) return;
    if (evt.trigger?.if && !this.evalCondition(evt.trigger.if)) return;
    if (once) this._firedOnce[index] = true;
    await this.executeSteps(evt.steps || [], data);
  },

  evalCondition(cond: EventCondition | null | undefined): boolean {
    if (!cond || typeof cond !== 'object') return true;
    const s = this._scene;
    const w = window as unknown as { Flags?: { is: (k: string) => boolean; eq: (k: string, v: unknown) => boolean; get: (k: string) => unknown } };
    const Flags = w.Flags;

    if ('all' in cond) return (cond as { all: EventCondition[] }).all.every(c => this.evalCondition(c));
    if ('any' in cond) return (cond as { any: EventCondition[] }).any.some(c => this.evalCondition(c));
    if ('not' in cond) return !this.evalCondition((cond as { not: EventCondition }).not);

    if ('flag' in cond) {
      const fc = cond as { flag: string; eq?: unknown };
      if ('eq' in fc) return Flags?.eq(fc.flag, fc.eq) ?? false;
      return Flags?.is(fc.flag) ?? false;
    }

    if ('hidden' in cond) return (!!s?.playerHidden) === (cond as { hidden: boolean }).hidden;
    if ('mode' in cond) return s?.mode === (cond as { mode: string }).mode;
    if ('hp_below' in cond) return (s?.playerHP || 0) < (cond as { hp_below: number }).hp_below;
    if ('hp_above' in cond) return (s?.playerHP || 0) > (cond as { hp_above: number }).hp_above;
    if ('level_min' in cond) return ((s?.pStats as { level?: number })?.level || 1) >= (cond as { level_min: number }).level_min;

    if ('playerAt' in cond) {
      const [ex, ey] = (cond as { playerAt: [number, number] }).playerAt;
      return s?.playerTile?.x === ex && s?.playerTile?.y === ey;
    }
    if ('playerNear' in cond) {
      const [ex, ey, range] = (cond as { playerNear: [number, number, number] }).playerNear;
      const dx = Math.abs((s?.playerTile?.x || 0) - ex);
      const dy = Math.abs((s?.playerTile?.y || 0) - ey);
      return dx + dy <= range;
    }
    if ('enemyAlive' in cond) {
      return s?.enemies?.some(e => e.alive && e.type === (cond as { enemyAlive: string }).enemyAlive) ?? false;
    }
    if ('enemyDead' in cond) {
      return s?.enemies?.some(e => !e.alive && e.type === (cond as { enemyDead: string }).enemyDead) ?? false;
    }
    if ('doorClosed' in cond) {
      const [dx, dy] = (cond as { doorClosed: [number, number] }).doorClosed;
      const ents = (s as unknown as { getEntitiesAt?: (x: number, y: number) => Array<{ getType?: () => string; open?: boolean }> })?.getEntitiesAt?.(dx, dy) || [];
      return ents.some(e => e.getType?.() === 'door' && !e.open);
    }
    if ('doorOpen' in cond) {
      const [dx, dy] = (cond as { doorOpen: [number, number] }).doorOpen;
      const ents = (s as unknown as { getEntitiesAt?: (x: number, y: number) => Array<{ getType?: () => string; open?: boolean }> })?.getEntitiesAt?.(dx, dy) || [];
      return ents.some(e => e.getType?.() === 'door' && e.open);
    }
    if ('skillCheck' in cond) {
      const { skill, dc } = (cond as { skillCheck: { skill: string; dc: number } }).skillCheck;
      const result = dnd.skillCheck(skill, s?.pStats as unknown as Record<string, unknown>, dc);
      return result.success;
    }

    console.warn('[EventRunner] Unknown condition:', cond);
    return true;
  },

  async executeSteps(steps: EventStep[], data?: unknown): Promise<void> {
    if (this._running) {
      console.warn('[EventRunner] Already running, queuing skipped');
      return;
    }
    this._running = true;

    try {
      const labels: Record<string, number> = {};
      steps.forEach((step, i) => { if (step.label) labels[step.label] = i; });

      let i = 0;
      while (i < steps.length) {
        const step = steps[i];
        if (step.label && !step.do) { i++; continue; }
        if (step.if && !this.evalCondition(step.if as EventCondition)) { i++; continue; }

        const result = await this._execAction(step, data);
        if (result?.goto && result.goto in labels) {
          i = labels[result.goto];
          continue;
        }
        i++;
      }
    } catch (err) {
      console.error('[EventRunner] Step error:', err);
    } finally {
      this._running = false;
    }
  },

  async _execAction(step: EventStep, _data?: unknown): Promise<StepResult> {
    const s = this._scene;
    const action = step.do;
    if (!action) return;

    type SceneExt = GameScene & {
      playerAttackEnemy?: (e: unknown) => void;
      enterCombat?: (targets: unknown[]) => void;
      exitCombat?: (reason: string) => void;
      endPlayerTurn?: () => void;
      spawnEnemy?: (creature: unknown, x: number, y: number, opts: unknown) => void;
      getEntitiesAt?: (x: number, y: number) => Array<{ getType?: () => string; open?: boolean; _updateEntitySprite?: () => void }>;
      _executeEntityAction?: (e: unknown, action: string) => void;
      _updateEntitySprite?: (e: unknown) => void;
      showEventText?: (speaker: string, text: string) => void;
    };
    const se = s as SceneExt | null;

    switch (action) {
      case 'move': {
        const S = (window as unknown as { S?: number }).S || 16;
        se?.onTap?.({ worldX: (step.x as number) * S + S / 2, worldY: (step.y as number) * S + S / 2 } as import('phaser').Input.Pointer);
        await this._wait(100);
        break;
      }
      case 'waitIdle': {
        const timeout = (step.timeout as number) || 5000;
        const start = Date.now();
        while (s?.isMoving && Date.now() - start < timeout) await this._wait(50);
        await this._wait(200);
        break;
      }
      case 'wait':
        await this._wait((step.ms as number) || 500);
        break;
      case 'waitMode': {
        const timeout = (step.timeout as number) || 8000;
        const start = Date.now();
        while (s?.mode !== step.mode && Date.now() - start < timeout) await this._wait(100);
        break;
      }
      case 'attack': {
        const target = step.target === 'nearest'
          ? s?.enemies?.filter(e => e.alive).sort((a, b) =>
              (Math.abs(a.tx - (s.playerTile?.x ?? 0)) + Math.abs(a.ty - (s.playerTile?.y ?? 0))) -
              (Math.abs(b.tx - (s.playerTile?.x ?? 0)) + Math.abs(b.ty - (s.playerTile?.y ?? 0)))
            )[0]
          : s?.enemies?.find(e => e.alive && e.tx === step.x && e.ty === step.y);
        if (target && se?.playerAttackEnemy) se.playerAttackEnemy(target);
        await this._wait(500);
        break;
      }
      case 'selectAction':
        s?.selectAction?.((step.action as string) || 'attack');
        await this._wait(200);
        break;
      case 'endTurn':
        se?.endPlayerTurn?.();
        await this._wait(1000);
        break;
      case 'flee':
        if (s?.mode === MODE.COMBAT) se?.exitCombat?.('flee');
        await this._wait(500);
        break;
      case 'enterCombat': {
        const targets = s?.enemies?.filter(e => e.alive) || [];
        if (targets.length) se?.enterCombat?.(targets);
        await this._wait(500);
        break;
      }
      case 'hide':
        if (s?.mode === MODE.COMBAT) s?.tryHideAction?.();
        else s?.tryHideInExplore?.();
        await this._wait(500);
        break;
      case 'dismiss':
        if (s?.diceWaiting) s?._handleDiceDismiss?.();
        await this._wait(200);
        break;
      case 'forceD20': {
        const forced = step.value as number;
        this._originalRoll = this._originalRoll || dnd.roll;
        const orig = this._originalRoll;
        dnd.roll = (n: number, d: number) => (n === 1 && d === 20 ? forced : orig(n, d));
        break;
      }
      case 'restoreD20':
        if (this._originalRoll) {
          dnd.roll = this._originalRoll;
          this._originalRoll = null;
        }
        break;
      case 'interact': {
        const ents = se?.getEntitiesAt?.(step.x as number, step.y as number) || [];
        if (ents.length) se?._executeEntityAction?.(ents[0], (step.action as string) || 'interact');
        await this._wait(500);
        break;
      }
      case 'openDoor':
      case 'unlockDoor': {
        const ents = se?.getEntitiesAt?.(step.x as number, step.y as number) || [];
        const door = ents.find(e => e.getType?.() === 'door');
        if (door) { door.open = true; se?._updateEntitySprite?.(door); }
        await this._wait(300);
        break;
      }
      case 'lockDoor': {
        const ents = se?.getEntitiesAt?.(step.x as number, step.y as number) || [];
        const door = ents.find(e => e.getType?.() === 'door');
        if (door) { door.open = false; se?._updateEntitySprite?.(door); }
        await this._wait(300);
        break;
      }
      case 'spawn':
        se?.spawnEnemy?.(step.creature, step.x as number, step.y as number, step);
        await this._wait(300);
        break;
      case 'setFlag': {
        const w = window as unknown as { Flags?: { set: (k: string, v: unknown) => void } };
        for (const [k, v] of Object.entries(step)) {
          if (k === 'do' || k === 'if') continue;
          w.Flags?.set(k, v);
        }
        break;
      }
      case 'incrementFlag': {
        const w = window as unknown as { Flags?: { increment: (k: string, a: number) => void } };
        w.Flags?.increment(step.key as string, step.amount as number);
        break;
      }
      case 'decrementFlag': {
        const w = window as unknown as { Flags?: { decrement: (k: string, a: number) => void } };
        w.Flags?.decrement(step.key as string, step.amount as number);
        break;
      }
      case 'toggleFlag': {
        const w = window as unknown as { Flags?: { toggle: (k: string) => void } };
        w.Flags?.toggle(step.key as string);
        break;
      }
      case 'dialog': {
        const w = window as unknown as { DialogRunner?: { start: (id: string) => Promise<void> } };
        if (w.DialogRunner) await w.DialogRunner.start(step.id as string);
        break;
      }
      case 'say':
        this._showSay(step.speaker as string | undefined, step.text as string);
        await this._wait((step.duration as number) || 2000);
        break;
      case 'branch':
        if (step.if && this.evalCondition(step.if as EventCondition)) {
          return { goto: step.goto as string };
        }
        break;
      case 'goto':
        return { goto: step.label as string };
      case 'triggerEvent':
        this._running = false;
        this.fireById(step.id as string);
        break;
      case 'log':
        console.log(`[Event] ${(step.text as string) || (step.msg as string) || ''}`);
        break;
      case 'assert':
        this._evalAssert(step);
        break;
      case 'custom': {
        const w = window as unknown as Record<string, unknown>;
        if (step.fn && typeof w[step.fn as string] === 'function') {
          await (w[step.fn as string] as (s: GameScene | null, step: EventStep) => Promise<void>)(s, step);
        }
        break;
      }
      default:
        console.warn(`[EventRunner] Unknown action: ${action}`);
    }
  },

  _wait(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  },

  _showSay(speaker: string | undefined, text: string): void {
    const label = speaker ? `${speaker}: ${text}` : text;
    console.log(`[Event] 💬 ${label}`);
    const s = this._scene;
    if ((s as unknown as { showEventText?: (sp: string, t: string) => void })?.showEventText) {
      (s as unknown as { showEventText: (sp: string, t: string) => void }).showEventText(speaker || '', text);
    } else {
      withCombatLog(cl => (cl as { log: (m: string, t: string) => void }).log(label, 'info'));
    }
  },

  _evalAssert(step: EventStep): void {
    const s = this._scene;
    let passed = true;
    let detail = '';
    const w = window as unknown as { Flags?: { is: (k: string) => boolean; get: (k: string) => unknown }; AutoPlay?: { running: boolean; assert: (m: string, p: boolean, d: string) => void } };
    const Flags = w.Flags;

    if (step.playerAt) {
      const [ex, ey] = step.playerAt as [number, number];
      passed = s?.playerTile?.x === ex && s?.playerTile?.y === ey;
      detail = `expected (${ex},${ey}) got (${s?.playerTile?.x},${s?.playerTile?.y})`;
    } else if (step.mode) {
      passed = s?.mode === step.mode;
      detail = `expected ${step.mode as string} got ${s?.mode}`;
    } else if ('hidden' in step) {
      passed = (!!s?.playerHidden) === step.hidden;
      detail = `hidden=${s?.playerHidden}`;
    } else if (step.flag) {
      passed = (Flags?.is(step.flag as string) ?? false) === (step.eq !== undefined ? step.eq : true);
      detail = `${step.flag as string}=${Flags?.get(step.flag as string)}`;
    } else if (step.enemyDead) {
      passed = s?.enemies?.some(e => !e.alive && e.type === step.enemyDead) ?? false;
      detail = `${step.enemyDead as string} dead check`;
    }

    const msg = (step.msg as string) || (step.do as string);
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} [Assert] ${msg} — ${detail}`);

    if (w.AutoPlay?.running) {
      w.AutoPlay.assert(msg, passed, detail);
    }
  },
};

(window as unknown as { EventRunner: typeof EventRunner }).EventRunner = EventRunner;

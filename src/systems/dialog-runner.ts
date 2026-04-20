import { dnd } from '@/config';
import { withCombatLog } from '@/helpers';
import { EventRunner } from '@/systems/event-runner';
import type { GameScene } from '@/game';

type DialogChoice = {
  label: string;
  if?: unknown;
  check?: { skill: string; dc: number };
  pass?: string;
  fail?: string;
  next?: string;
  actions?: Array<Record<string, unknown>>;
};

type DialogNode = {
  speaker?: string;
  text?: string;
  choices?: DialogChoice[];
  actions?: Array<Record<string, unknown>>;
  next?: string;
};

export const DialogRunner = {
  _dialogs: {} as Record<string, DialogNode>,
  _scene: null as GameScene | null,
  _active: false,

  init(scene: GameScene, dialogDefs: Record<string, DialogNode>): void {
    this._scene = scene;
    this._dialogs = dialogDefs || {};
    this._active = false;
    console.log(`[DialogRunner] Loaded ${Object.keys(this._dialogs).length} dialogs`);
  },

  clear(): void {
    this._dialogs = {};
    this._active = false;
    this._hideUI();
  },

  async start(dialogId: string): Promise<void> {
    if (this._active) {
      console.warn('[DialogRunner] Already in dialog');
      return;
    }
    let node: DialogNode | undefined = this._dialogs[dialogId];
    if (!node) {
      console.warn(`[DialogRunner] Dialog not found: ${dialogId}`);
      return;
    }

    this._active = true;

    try {
      while (node) {
        this._showNode(node);
        const choices = this._getAvailableChoices(node);

        let chosen: DialogChoice | null = null;
        if (choices.length > 0) {
          chosen = await this._waitForChoice(choices);
        } else {
          await this._waitForDismiss();
        }

        if (node.actions) {
          await EventRunner.executeSteps(node.actions as Array<Record<string, unknown>>);
        }

        let nextId: string | null = node.next || null;

        if (chosen) {
          if (chosen.check) {
            const result = dnd.skillCheck(chosen.check.skill, this._scene?.pStats as unknown as Record<string, unknown>, chosen.check.dc);
            this._showSkillResult(chosen.check.skill, result);
            await this._wait(1500);
            nextId = result.success ? (chosen.pass ?? null) : (chosen.fail ?? null);
          } else {
            nextId = chosen.next || null;
          }

          if (chosen.actions) {
            await EventRunner.executeSteps(chosen.actions as Array<Record<string, unknown>>);
          }
        }

        node = nextId ? this._dialogs[nextId] : undefined;
      }
    } finally {
      this._active = false;
      this._hideUI();
    }
  },

  _getAvailableChoices(node: DialogNode): DialogChoice[] {
    if (!node.choices) return [];
    return node.choices.filter(c => {
      if (!c.if) return true;
      return EventRunner.evalCondition(c.if as Parameters<typeof EventRunner.evalCondition>[0]);
    });
  },

  _showNode(node: DialogNode): void {
    const speaker = node.speaker || '';
    const text = node.text || '';
    console.log(`[Dialog] ${speaker ? speaker + ': ' : ''}${text}`);
    withCombatLog(cl => (cl as { log: (m: string, t: string, s: string) => void }).log(`${speaker ? speaker + ': ' : ''}${text}`, 'info', 'dialog'));

    let el = document.getElementById('dialog-box');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dialog-box';
      el.style.cssText = `position:fixed;bottom:60px;left:50%;transform:translateX(-50%);
        width:90%;max-width:500px;background:rgba(10,10,15,0.95);border:1px solid #c9a84c;
        border-radius:8px;padding:16px;color:#f0e6c8;font-family:'Courier New',monospace;
        font-size:13px;z-index:900;`;
      document.body.appendChild(el);
    }
    el.style.display = 'block';

    let html = '';
    if (speaker) html += `<div style="color:#c9a84c;font-weight:bold;margin-bottom:6px;">${speaker}</div>`;
    html += `<div style="margin-bottom:12px;line-height:1.5;">${text}</div>`;
    html += `<div id="dialog-choices"></div>`;
    el.innerHTML = html;
  },

  _showSkillResult(skill: string, result: { success: boolean; roll: number; mod: number; total: number }): void {
    const icon = result.success ? '✅' : '❌';
    const el = document.getElementById('dialog-box');
    if (el) {
      const div = document.createElement('div');
      div.style.cssText = 'color:#7fc8f8;font-size:11px;margin-top:8px;';
      div.textContent = `${icon} ${skill} check: ${result.roll} + ${result.mod} = ${result.total}`;
      el.appendChild(div);
    }
  },

  _waitForChoice(choices: DialogChoice[]): Promise<DialogChoice | null> {
    return new Promise(resolve => {
      const container = document.getElementById('dialog-choices');
      if (!container) { resolve(null); return; }

      choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.style.cssText = `display:block;width:100%;text-align:left;padding:8px 12px;
          margin-top:4px;background:rgba(41,128,185,0.15);border:1px solid rgba(41,128,185,0.4);
          color:#7fc8f8;border-radius:4px;cursor:pointer;font-family:'Courier New',monospace;
          font-size:12px;`;
        btn.textContent = `${i + 1}. ${choice.label}`;
        btn.onmouseenter = () => (btn.style.background = 'rgba(41,128,185,0.35)');
        btn.onmouseleave = () => (btn.style.background = 'rgba(41,128,185,0.15)');
        btn.onclick = () => resolve(choice);
        container.appendChild(btn);
      });
    });
  },

  _waitForDismiss(): Promise<void> {
    return new Promise(resolve => {
      const el = document.getElementById('dialog-box');
      if (!el) { resolve(); return; }
      const hint = document.createElement('div');
      hint.style.cssText = 'color:#666;font-size:10px;margin-top:8px;text-align:center;';
      hint.textContent = '(click to continue)';
      el.appendChild(hint);
      el.onclick = () => { el.onclick = null; resolve(); };
    });
  },

  _hideUI(): void {
    const el = document.getElementById('dialog-box');
    if (el) el.style.display = 'none';
  },

  _wait(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  },
};

(window as unknown as { DialogRunner: typeof DialogRunner }).DialogRunner = DialogRunner;

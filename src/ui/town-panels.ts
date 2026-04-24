import { PLAYER_STATS, ITEM_DEFS, QUEST_DEFS } from '@/config';
import type { GameScene } from '@/game';

function createOverlay(id: string): HTMLDivElement {
  let el = document.getElementById(id) as HTMLDivElement | null;
  if (el) { el.innerHTML = ''; el.style.display = 'flex'; return el; }
  el = document.createElement('div');
  el.id = id;
  Object.assign(el.style, {
    position: 'fixed', inset: '0', zIndex: '9000',
    display: 'flex', flexDirection: 'column',
    background: 'rgba(0,0,0,0.92)', color: '#f0e6c8',
    fontFamily: 'monospace', fontSize: '14px',
    overflowY: 'auto', padding: '12px',
    touchAction: 'pan-y',
  });
  document.body.appendChild(el);
  return el;
}

function closeBtn(panel: HTMLDivElement, onClose?: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = '✕ Close';
  Object.assign(btn.style, {
    alignSelf: 'flex-end', padding: '10px 20px', marginBottom: '8px',
    background: '#444', color: '#f0e6c8', border: '1px solid #666',
    borderRadius: '6px', fontSize: '16px', cursor: 'pointer',
    minHeight: '44px',
  });
  btn.onclick = () => { panel.style.display = 'none'; onClose?.(); };
  return btn;
}

function heading(text: string): HTMLHeadingElement {
  const h = document.createElement('h2');
  h.textContent = text;
  Object.assign(h.style, { margin: '0 0 8px', fontSize: '18px', color: '#f0c060' });
  return h;
}

function itemRow(
  name: string,
  qty: number,
  actionLabel: string,
  onAction: () => void,
  disabled = false,
): HTMLDivElement {
  const row = document.createElement('div');
  Object.assign(row.style, {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px', margin: '2px 0', background: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
  });
  const label = document.createElement('span');
  label.textContent = qty > 1 ? `${name} ×${qty}` : name;
  const btn = document.createElement('button');
  btn.textContent = actionLabel;
  btn.disabled = disabled;
  Object.assign(btn.style, {
    padding: '8px 16px', background: disabled ? '#333' : '#2a6e3f',
    color: disabled ? '#666' : '#fff', border: 'none', borderRadius: '4px',
    fontSize: '14px', cursor: disabled ? 'default' : 'pointer',
    minHeight: '40px',
  });
  btn.onclick = disabled ? null : onAction;
  row.appendChild(label);
  row.appendChild(btn);
  return row;
}

function goldDisplay(): HTMLDivElement {
  const d = document.createElement('div');
  d.textContent = `💰 ${PLAYER_STATS.gold ?? 0} gold`;
  Object.assign(d.style, { fontSize: '16px', margin: '4px 0 12px', color: '#f0c060' });
  return d;
}

// ── Stash Panel ──

type InvItem = { id: string; qty: number; [k: string]: unknown };

export function showStashPanel(scene: GameScene): void {
  const panel = createOverlay('stash-panel');
  const inv = (PLAYER_STATS.inventory || []) as InvItem[];
  const stash = (PLAYER_STATS.stash || []) as InvItem[];

  const render = () => {
    panel.innerHTML = '';
    panel.appendChild(closeBtn(panel));
    panel.appendChild(heading('🗄️ Stash'));
    panel.appendChild(goldDisplay());

    const carried = document.createElement('div');
    carried.appendChild(heading('Carried'));
    if (inv.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No items carried.';
      empty.style.color = '#888';
      carried.appendChild(empty);
    }
    for (const item of inv) {
      const def = ITEM_DEFS[item.id] || {};
      const name = (def as { name?: string }).name || item.id;
      carried.appendChild(itemRow(name, item.qty || 1, '→ Stash', () => {
        const idx = inv.indexOf(item);
        if (idx >= 0) inv.splice(idx, 1);
        const existing = stash.find((s: { id: string }) => s.id === item.id);
        if (existing) existing.qty = (existing.qty || 1) + (item.qty || 1);
        else stash.push({ ...item });
        render();
        scene.showStatus(`Deposited ${name}.`);
      }));
    }
    panel.appendChild(carried);

    const stored = document.createElement('div');
    stored.style.marginTop = '16px';
    stored.appendChild(heading('Stashed'));
    if (stash.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'Stash is empty.';
      empty.style.color = '#888';
      stored.appendChild(empty);
    }
    for (const item of stash) {
      const def = ITEM_DEFS[item.id] || {};
      const name = (def as { name?: string }).name || item.id;
      stored.appendChild(itemRow(name, item.qty || 1, '← Take', () => {
        const idx = stash.indexOf(item);
        if (idx >= 0) stash.splice(idx, 1);
        const existing = inv.find((s: { id: string }) => s.id === item.id);
        if (existing) existing.qty = (existing.qty || 1) + (item.qty || 1);
        else inv.push({ ...item });
        render();
        scene.showStatus(`Withdrew ${name}.`);
      }));
    }
    panel.appendChild(stored);

    const actions = document.createElement('div');
    Object.assign(actions.style, { display: 'flex', gap: '8px', marginTop: '16px' });
    const depositAll = document.createElement('button');
    depositAll.textContent = '⬅ Deposit All';
    Object.assign(depositAll.style, {
      flex: '1', padding: '12px', background: '#3a5a3a', color: '#fff',
      border: 'none', borderRadius: '6px', fontSize: '16px', minHeight: '48px',
    });
    depositAll.onclick = () => {
      for (const item of [...inv]) {
        const existing = stash.find((s: { id: string }) => s.id === item.id);
        if (existing) existing.qty = (existing.qty || 1) + (item.qty || 1);
        else stash.push({ ...item });
      }
      inv.length = 0;
      render();
      scene.showStatus('Deposited all items to stash.');
    };
    const withdrawAll = document.createElement('button');
    withdrawAll.textContent = '➡ Withdraw All';
    Object.assign(withdrawAll.style, {
      flex: '1', padding: '12px', background: '#3a3a5a', color: '#fff',
      border: 'none', borderRadius: '6px', fontSize: '16px', minHeight: '48px',
    });
    withdrawAll.onclick = () => {
      for (const item of [...stash]) {
        const existing = inv.find((s: { id: string }) => s.id === item.id);
        if (existing) existing.qty = (existing.qty || 1) + (item.qty || 1);
        else inv.push({ ...item });
      }
      stash.length = 0;
      render();
      scene.showStatus('Withdrew all items from stash.');
    };
    actions.appendChild(depositAll);
    actions.appendChild(withdrawAll);
    panel.appendChild(actions);
  };

  render();
}

// ── Shop Panel ──

export interface ShopItem {
  id: string;
  price: number;
  stock?: number;
}

const DEFAULT_SHOP: ShopItem[] = [
  { id: 'potion_heal', price: 25, stock: 5 },
  { id: 'potion_heal_greater', price: 75, stock: 3 },
  { id: 'antidote', price: 15, stock: 5 },
  { id: 'torch', price: 5, stock: 10 },
  { id: 'rope', price: 10, stock: 3 },
];

let shopStock: ShopItem[] | null = null;

export function resetShopStock(): void {
  shopStock = null;
}

export function showShopPanel(scene: GameScene): void {
  if (!shopStock) shopStock = DEFAULT_SHOP.map(s => ({ ...s }));
  const panel = createOverlay('shop-panel');

  const render = () => {
    panel.innerHTML = '';
    panel.appendChild(closeBtn(panel));
    panel.appendChild(heading('🧰 Quartermaster'));
    panel.appendChild(goldDisplay());

    for (const item of shopStock!) {
      const def = ITEM_DEFS[item.id] || {};
      const name = (def as { name?: string }).name || item.id;
      const soldOut = (item.stock ?? Infinity) <= 0;
      const cantAfford = (PLAYER_STATS.gold ?? 0) < item.price;
      const label = soldOut ? 'Sold Out' : `Buy (${item.price}g)`;
      panel.appendChild(itemRow(name, item.stock ?? 99, label, () => {
        if (soldOut || cantAfford) return;
        PLAYER_STATS.gold = (PLAYER_STATS.gold ?? 0) - item.price;
        if (item.stock !== undefined) item.stock--;
        const inv = (PLAYER_STATS.inventory || []) as InvItem[];
        const existing = inv.find((i: InvItem) => i.id === item.id);
        if (existing) existing.qty = (existing.qty || 1) + 1;
        else inv.push({ id: item.id, qty: 1 });
        render();
        scene.showStatus(`Bought ${name} for ${item.price} gold.`);
      }, soldOut || cantAfford));
    }
  };

  render();
}

// ── Job Selector Panel ──

interface JobDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  ac: number;
  maxHP: number;
  hitDie: number;
  weaponId: string;
  damageFormula: string;
  atkRange: number;
  profBonus: number;
  savingThrows: string[];
  skillProficiencies: string[];
  expertiseSkills: string[];
  features: string[];
  sneakAttackDice: number;
  gold: number;
}

const JOB_DEFS: JobDef[] = [
  {
    id: 'fighter',
    name: 'Fighter',
    icon: '⚔️',
    description: 'Heavy armor, high HP, extra attacks. Str-based melee brawler.',
    stats: { str: 18, dex: 13, con: 16, int: 10, wis: 12, cha: 10 },
    ac: 17, maxHP: 100, hitDie: 10,
    weaponId: 'longsword', damageFormula: '1d8+7', atkRange: 1,
    profBonus: 4,
    savingThrows: ['str', 'con'],
    skillProficiencies: ['athletics', 'perception', 'intimidation', 'survival'],
    expertiseSkills: [],
    features: ['Second Wind', 'Action Surge', 'Extra Attack (×3)', 'Indomitable'],
    sneakAttackDice: 0,
    gold: 500,
  },
  {
    id: 'rogue',
    name: 'Rogue',
    icon: '🗡️',
    description: 'Sneak attack, high Dex, evasion. Strikes from the shadows.',
    stats: { str: 10, dex: 20, con: 14, int: 14, wis: 13, cha: 12 },
    ac: 16, maxHP: 80, hitDie: 8,
    weaponId: 'shortsword', damageFormula: '1d6+8', atkRange: 1,
    profBonus: 4,
    savingThrows: ['dex', 'int'],
    skillProficiencies: ['stealth', 'sleightOfHand', 'acrobatics', 'investigation', 'perception', 'deception'],
    expertiseSkills: ['stealth', 'sleightOfHand'],
    features: ['Sneak Attack (5d6)', 'Cunning Action', 'Evasion', 'Uncanny Dodge', 'Reliable Talent'],
    sneakAttackDice: 5,
    gold: 400,
  },
  {
    id: 'wizard',
    name: 'Wizard',
    icon: '🧙',
    description: 'Arcane spells, high Int, fragile but powerful. Knowledge is power.',
    stats: { str: 8, dex: 14, con: 13, int: 20, wis: 15, cha: 12 },
    ac: 13, maxHP: 70, hitDie: 6,
    weaponId: 'quarterstaff', damageFormula: '1d6+2', atkRange: 1,
    profBonus: 4,
    savingThrows: ['int', 'wis'],
    skillProficiencies: ['arcana', 'history', 'investigation', 'insight'],
    expertiseSkills: ['arcana'],
    features: ['Spellcasting (Int)', 'Arcane Recovery', 'Spell Mastery', 'Signature Spell'],
    sneakAttackDice: 0,
    gold: 350,
  },
  {
    id: 'cleric',
    name: 'Cleric',
    icon: '✨',
    description: 'Divine magic, healing, and radiant damage. The backbone of any party.',
    stats: { str: 14, dex: 10, con: 16, int: 12, wis: 20, cha: 14 },
    ac: 16, maxHP: 90, hitDie: 8,
    weaponId: 'mace', damageFormula: '1d6+5', atkRange: 1,
    profBonus: 4,
    savingThrows: ['wis', 'cha'],
    skillProficiencies: ['medicine', 'religion', 'insight', 'persuasion'],
    expertiseSkills: [],
    features: ['Divine Domain: Life', 'Channel Divinity', 'Divine Strike', 'Blessed Healer'],
    sneakAttackDice: 0,
    gold: 450,
  },
];

export function showJobSelectorPanel(scene: GameScene): void {
  const panel = createOverlay('job-selector-panel');

  const render = () => {
    panel.innerHTML = '';
    panel.appendChild(closeBtn(panel));
    panel.appendChild(heading('⚡ Power Shrine — Choose Your Class'));

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Become Level 10. Choose your path.';
    Object.assign(subtitle.style, { margin: '0 0 16px', color: '#aaa', fontSize: '13px' });
    panel.appendChild(subtitle);

    for (const job of JOB_DEFS) {
      const card = document.createElement('div');
      Object.assign(card.style, {
        display: 'flex', flexDirection: 'column', gap: '4px',
        padding: '12px', margin: '8px 0',
        background: 'rgba(255,255,255,0.06)', borderRadius: '8px',
        border: '1px solid #444', cursor: 'pointer',
      });

      const cardHeader = document.createElement('div');
      Object.assign(cardHeader.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });

      const nameSpan = document.createElement('span');
      nameSpan.textContent = `${job.icon} ${job.name}`;
      Object.assign(nameSpan.style, { fontSize: '18px', fontWeight: 'bold', color: '#f0c060' });

      const statsSpan = document.createElement('span');
      statsSpan.textContent = `AC ${job.ac}  HP ${job.maxHP}`;
      Object.assign(statsSpan.style, { fontSize: '13px', color: '#aaa' });

      cardHeader.appendChild(nameSpan);
      cardHeader.appendChild(statsSpan);

      const desc = document.createElement('p');
      desc.textContent = job.description;
      Object.assign(desc.style, { margin: '4px 0', fontSize: '13px', color: '#ccc' });

      const featList = document.createElement('p');
      featList.textContent = job.features.join(' · ');
      Object.assign(featList.style, { margin: '4px 0', fontSize: '12px', color: '#888', fontStyle: 'italic' });

      const selectBtn = document.createElement('button');
      selectBtn.textContent = `Choose ${job.name}`;
      Object.assign(selectBtn.style, {
        marginTop: '8px', padding: '12px', background: '#2a5a8a',
        color: '#fff', border: 'none', borderRadius: '6px',
        fontSize: '16px', cursor: 'pointer', minHeight: '48px',
        fontWeight: 'bold',
      });

      selectBtn.onclick = () => {
        applyJobToPlayer(job, scene);
        panel.style.display = 'none';
      };

      card.appendChild(cardHeader);
      card.appendChild(desc);
      card.appendChild(featList);
      card.appendChild(selectBtn);
      panel.appendChild(card);
    }
  };

  render();
}

function applyJobToPlayer(job: JobDef, scene: GameScene): void {
  PLAYER_STATS.name = job.name;
  PLAYER_STATS.class = job.name;
  PLAYER_STATS.level = 10;
  PLAYER_STATS.xp = 0;

  PLAYER_STATS.str = job.stats.str;
  PLAYER_STATS.dex = job.stats.dex;
  PLAYER_STATS.con = job.stats.con;
  PLAYER_STATS.int = job.stats.int;
  PLAYER_STATS.wis = job.stats.wis;
  PLAYER_STATS.cha = job.stats.cha;

  PLAYER_STATS.ac = job.ac;
  PLAYER_STATS.baseAC = job.ac;
  PLAYER_STATS.maxHP = job.maxHP;
  PLAYER_STATS.currentHP = job.maxHP;
  PLAYER_STATS.hitDie = job.hitDie;
  PLAYER_STATS.weaponId = job.weaponId;
  PLAYER_STATS.damageFormula = job.damageFormula;
  PLAYER_STATS.atkRange = job.atkRange;
  PLAYER_STATS.profBonus = job.profBonus;
  PLAYER_STATS.sneakAttackDice = job.sneakAttackDice;
  PLAYER_STATS.gold = (PLAYER_STATS.gold ?? 0) + job.gold;
  PLAYER_STATS.features = [...job.features];
  PLAYER_STATS.savingThrows = new Set(job.savingThrows);
  PLAYER_STATS.skillProficiencies = new Set(job.skillProficiencies);
  PLAYER_STATS.expertiseSkills = new Set(job.expertiseSkills);

  const s = scene as unknown as { playerHP: number; playerMaxHP: number };
  s.playerHP = job.maxHP;
  s.playerMaxHP = job.maxHP;
  scene.updateHUD?.();
  scene.showStatus?.(`⚡ ${job.icon} You are now a Level 10 ${job.name}! +${job.gold} gold!`);
}

// ── Quest Board Panel ──

export function showQuestBoardPanel(_scene: GameScene): void {
  const panel = createOverlay('quest-board-panel');

  const render = () => {
    panel.innerHTML = '';
    panel.appendChild(closeBtn(panel));
    panel.appendChild(heading('📋 Quest Board'));

    const quests = Object.values(QUEST_DEFS);
    if (!quests.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No quests available.';
      empty.style.color = '#888';
      panel.appendChild(empty);
      return;
    }

    const accepted = (PLAYER_STATS as Record<string, unknown>).acceptedQuests as string[] | undefined ?? [];
    const typeColors: Record<string, string> = { main: '#f0c060', side: '#7ec8e3', bounty: '#e88' };
    const typeLabels: Record<string, string> = { main: 'MAIN', side: 'SIDE', bounty: 'BOUNTY' };

    for (const quest of quests) {
      const isAccepted = accepted.includes(quest.id);
      const card = document.createElement('div');
      Object.assign(card.style, {
        padding: '12px', margin: '8px 0',
        background: isAccepted ? 'rgba(80,140,80,0.15)' : 'rgba(255,255,255,0.05)',
        borderRadius: '8px', border: `1px solid ${isAccepted ? '#4a8a4a' : '#444'}`,
      });

      const cardHeader = document.createElement('div');
      Object.assign(cardHeader.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' });

      const titleSpan = document.createElement('span');
      titleSpan.textContent = `${quest.icon || '📋'} ${quest.title}`;
      Object.assign(titleSpan.style, { fontSize: '16px', fontWeight: 'bold', color: '#f0e6c8' });

      const typeBadge = document.createElement('span');
      typeBadge.textContent = typeLabels[quest.type || 'side'] || 'QUEST';
      Object.assign(typeBadge.style, {
        fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
        background: typeColors[quest.type || 'side'] || '#666',
        color: '#000', fontWeight: 'bold',
      });

      cardHeader.appendChild(titleSpan);
      cardHeader.appendChild(typeBadge);

      const desc = document.createElement('p');
      desc.textContent = String(quest.description || '');
      Object.assign(desc.style, { margin: '4px 0 8px', fontSize: '13px', color: '#bbb', lineHeight: '1.4' });

      const objList = document.createElement('ul');
      Object.assign(objList.style, { margin: '0 0 8px', paddingLeft: '16px', fontSize: '13px', color: '#aaa' });
      for (const obj of (quest.objectives || [])) {
        const li = document.createElement('li');
        li.textContent = obj.label;
        objList.appendChild(li);
      }

      const rewardDiv = document.createElement('div');
      const r = quest.reward || {};
      const parts: string[] = [];
      if (r.gold) parts.push(`${r.gold}g`);
      if (r.xp) parts.push(`${r.xp} XP`);
      if (r.items?.length) parts.push(r.items.join(', '));
      rewardDiv.textContent = parts.length ? `Reward: ${parts.join(' · ')}` : '';
      Object.assign(rewardDiv.style, { fontSize: '12px', color: '#f0c060', marginBottom: '8px' });

      const actionBtn = document.createElement('button');
      if (isAccepted) {
        actionBtn.textContent = '✓ Accepted';
        actionBtn.disabled = true;
        Object.assign(actionBtn.style, {
          padding: '8px 16px', background: '#2a5a2a', color: '#6c6',
          border: 'none', borderRadius: '4px', fontSize: '14px', minHeight: '40px',
        });
      } else {
        actionBtn.textContent = 'Accept Quest';
        Object.assign(actionBtn.style, {
          padding: '8px 16px', background: '#2a5a8a', color: '#fff',
          border: 'none', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', minHeight: '40px',
        });
        actionBtn.onclick = () => {
          if (!(PLAYER_STATS as Record<string, unknown>).acceptedQuests) {
            (PLAYER_STATS as Record<string, unknown>).acceptedQuests = [];
          }
          ((PLAYER_STATS as Record<string, unknown>).acceptedQuests as string[]).push(quest.id);
          render();
        };
      }

      card.appendChild(cardHeader);
      card.appendChild(desc);
      if (quest.objectives?.length) card.appendChild(objList);
      if (rewardDiv.textContent) card.appendChild(rewardDiv);
      card.appendChild(actionBtn);
      panel.appendChild(card);
    }
  };

  render();
}

// ── Run Summary Panel ──

export function showRunSummary(summary: Record<string, unknown>): void {
  const panel = createOverlay('run-summary-panel');
  const outcome = String(summary.outcome || 'extract');
  const titles: Record<string, string> = {
    victory: '⚔️ VICTORY!',
    death: '💀 DEFEATED',
    extract: '🏃 EXTRACTED',
  };
  const colors: Record<string, string> = {
    victory: '#f0c060',
    death: '#e74c3c',
    extract: '#3498db',
  };

  panel.appendChild(closeBtn(panel));

  const title = document.createElement('h1');
  title.textContent = titles[outcome] || 'Run Complete';
  Object.assign(title.style, {
    fontSize: '28px', textAlign: 'center', margin: '20px 0 8px',
    color: colors[outcome] || '#f0e6c8',
  });
  panel.appendChild(title);

  const desc = document.createElement('p');
  desc.textContent = String(summary.summary || '');
  Object.assign(desc.style, { textAlign: 'center', margin: '0 0 20px', color: '#ccc', fontSize: '14px' });
  panel.appendChild(desc);

  const stats = [
    ['Floors cleared', String(summary.depth || 0)],
    ['Gold reward', outcome === 'victory' ? `+${summary.rewardGold || 0}` : '—'],
    ['Gold lost', (summary.lostGold as number) > 0 ? `-${summary.lostGold}` : '—'],
    ['Items banked', String((summary.bankedItems as number) || 0)],
    ['Items lost', String((summary.lostItems as number) || 0)],
  ];

  for (const [label, value] of stats) {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex', justifyContent: 'space-between',
      padding: '8px 12px', margin: '2px 0',
      background: 'rgba(255,255,255,0.05)', borderRadius: '4px',
    });
    const lbl = document.createElement('span');
    lbl.textContent = label;
    const val = document.createElement('span');
    val.textContent = value;
    val.style.color = '#f0c060';
    row.appendChild(lbl);
    row.appendChild(val);
    panel.appendChild(row);
  }
}

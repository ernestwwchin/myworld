import { PLAYER_STATS, ITEM_DEFS } from '@/config';
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

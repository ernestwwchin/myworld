export const U = {
  el(id: string): HTMLElement | null {
    return document.getElementById(id);
  },
  text(id: string, value: unknown): HTMLElement | null {
    const node = this.el(id);
    if (!node) return null;
    node.textContent = String(value);
    return node;
  },
  html(id: string, value: unknown): HTMLElement | null {
    const node = this.el(id);
    if (!node) return null;
    node.innerHTML = String(value);
    return node;
  },
  show(id: string, display = 'block'): HTMLElement | null {
    const node = this.el(id);
    if (!node) return null;
    node.style.display = display;
    return node;
  },
  hide(id: string): HTMLElement | null {
    const node = this.el(id);
    if (!node) return null;
    node.style.display = 'none';
    return node;
  },
  addClass(id: string, cls: string): HTMLElement | null {
    const node = this.el(id);
    if (!node) return null;
    node.classList.add(cls);
    return node;
  },
  removeClass(id: string, cls: string): HTMLElement | null {
    const node = this.el(id);
    if (!node) return null;
    node.classList.remove(cls);
    return node;
  },
  toggleClass(id: string, cls: string, force?: boolean): HTMLElement | null {
    const node = this.el(id);
    if (!node) return null;
    if (force === undefined) node.classList.toggle(cls);
    else node.classList.toggle(cls, !!force);
    return node;
  },
  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  },
  pct(numerator: number, denominator: number): number {
    if (!denominator) return 0;
    return (numerator / denominator) * 100;
  },
};

if (typeof window !== 'undefined') {
  (window as unknown as { U: typeof U }).U = U;
}

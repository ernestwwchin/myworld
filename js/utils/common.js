// Common reusable utility helpers used across gameplay and UI layers.
(function initCommonUtils(global) {
  const U = {
    el(id) {
      return document.getElementById(id);
    },
    text(id, value) {
      const node = this.el(id);
      if (!node) return null;
      node.textContent = String(value);
      return node;
    },
    html(id, value) {
      const node = this.el(id);
      if (!node) return null;
      node.innerHTML = String(value);
      return node;
    },
    show(id, display = 'block') {
      const node = this.el(id);
      if (!node) return null;
      node.style.display = display;
      return node;
    },
    hide(id) {
      const node = this.el(id);
      if (!node) return null;
      node.style.display = 'none';
      return node;
    },
    addClass(id, cls) {
      const node = this.el(id);
      if (!node) return null;
      node.classList.add(cls);
      return node;
    },
    removeClass(id, cls) {
      const node = this.el(id);
      if (!node) return null;
      node.classList.remove(cls);
      return node;
    },
    toggleClass(id, cls, force) {
      const node = this.el(id);
      if (!node) return null;
      if (force === undefined) node.classList.toggle(cls);
      else node.classList.toggle(cls, !!force);
      return node;
    },
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },
    pct(numerator, denominator) {
      if (!denominator) return 0;
      return (numerator / denominator) * 100;
    },
  };

  global.U = U;
})(window);

// Renderers for devices and common visuals

import { Status, getStatusColor } from './schema.js';
import { State } from './state.js';

export function initRenderers(stage) {
  const domById = new Map();

  function createDeviceGroup(el) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('device');
    g.setAttribute('data-id', el.id);
    g.setAttribute('data-type', el.type);
    // Body depends on type
    const body = document.createElementNS(g.namespaceURI, 'rect');
    body.setAttribute('class', 'body');
    body.setAttribute('rx', Math.min(10, el.h / 2));
    body.setAttribute('ry', Math.min(10, el.h / 2));

    // Extra visuals
    let extra = null;
    if (el.type === 'AGV' || el.type === 'RGV') {
      extra = document.createElementNS(g.namespaceURI, 'path');
      extra.setAttribute('class', 'extra');
    } else if (el.type === 'ProductionLine') {
      extra = document.createElementNS(g.namespaceURI, 'path');
      extra.setAttribute('class', 'extra');
    } else if (el.type === 'StackerCrane') {
      extra = document.createElementNS(g.namespaceURI, 'line');
      extra.setAttribute('class', 'extra');
    }

    const label = document.createElementNS(g.namespaceURI, 'text');
    label.setAttribute('class', 'label');
    label.setAttribute('text-anchor', 'middle');

    g.appendChild(body);
    if (extra) g.appendChild(extra);
    g.appendChild(label);

    // Events for selection
    g.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      State.select(el.id);
    });

    stage.devicesLayer.appendChild(g);
    domById.set(el.id, g);
    return g;
  }

  function updateDeviceGroup(el) {
    let g = domById.get(el.id);
    if (!g) g = createDeviceGroup(el);
    const body = g.querySelector('.body');
    const label = g.querySelector('.label');
    const extra = g.querySelector('.extra');

    // Position/size
    body.setAttribute('x', el.x);
    body.setAttribute('y', el.y);
    body.setAttribute('width', el.w);
    body.setAttribute('height', el.h);

    // Appearance by status
    const fill = getStatusColor(el.status || Status.normal);
    body.setAttribute('fill', fill);
    body.setAttribute('stroke', '#0b1020');

    // Label
    label.textContent = el.name || el.type;
    label.setAttribute('x', el.x + el.w / 2);
    label.setAttribute('y', el.y + el.h / 2 + 4);

    // Per-type extra shape
    if (extra) {
      if (el.type === 'AGV') {
        // Direction arrow
        const cx = el.x + el.w * 0.75;
        const cy = el.y + el.h / 2;
        const a = Math.min(el.h / 2, 8);
        extra.setAttribute('d', `M ${cx - a} ${cy - a} L ${cx + a} ${cy} L ${cx - a} ${cy + a} Z`);
        extra.setAttribute('fill', '#0b1020');
      } else if (el.type === 'RGV') {
        const cx = el.x + el.w / 2;
        const cy = el.y + el.h / 2;
        const r = Math.min(el.h, el.w) / 3;
        extra.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`);
        extra.setAttribute('fill', '#0b1020');
      } else if (el.type === 'ProductionLine') {
        const x = el.x, y = el.y, w = el.w, h = el.h;
        const stripeY1 = y + h * 0.35;
        const stripeY2 = y + h * 0.65;
        extra.setAttribute('d', `M ${x + 6} ${stripeY1} L ${x + w - 6} ${stripeY1} M ${x + 6} ${stripeY2} L ${x + w - 6} ${stripeY2}`);
        extra.setAttribute('stroke', '#0b1020');
        extra.setAttribute('stroke-width', '2');
        extra.setAttribute('fill', 'none');
      } else if (el.type === 'StackerCrane') {
        extra.setAttribute('x1', el.x + el.w / 2);
        extra.setAttribute('x2', el.x + el.w / 2);
        extra.setAttribute('y1', el.y + 4);
        extra.setAttribute('y2', el.y + el.h - 4);
        extra.setAttribute('stroke', '#0b1020');
        extra.setAttribute('stroke-width', '2');
      }
    }

    // Rotation
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    g.setAttribute('transform', `rotate(${el.r || 0}, ${cx}, ${cy})`);

    // Classes
    g.classList.toggle('selected', State.getState().selection === el.id);
    g.classList.toggle('offline', el.status === 'offline');
    g.classList.toggle('fault', el.status === 'fault');
    g.classList.toggle('blocked', el.status === 'blocked');

    // Z-index ordering will be handled globally
  }

  function ensureOrder() {
    const s = State.getState();
    const ordered = [...s.elements].sort((a, b) => (a.z || 0) - (b.z || 0));
    for (const el of ordered) {
      const g = domById.get(el.id);
      if (g && g.parentNode === stage.devicesLayer) stage.devicesLayer.appendChild(g);
    }
  }

  function renderAll() {
    const s = State.getState();
    // Remove DOM for elements that no longer exist
    const ids = new Set(s.elements.map(e => e.id));
    for (const [id, g] of domById.entries()) {
      if (!ids.has(id)) {
        g.remove();
        domById.delete(id);
      }
    }
    // Update or create
    for (const el of s.elements) updateDeviceGroup(el);
    ensureOrder();
  }

  // Subscribe to state changes
  State.subscribe((reason) => {
    if (reason === 'elements' || reason === 'selection' || reason === 'deserialize' || reason === 'replace') {
      renderAll();
    }
  });

  return {
    renderAll,
    domById,
  };
}

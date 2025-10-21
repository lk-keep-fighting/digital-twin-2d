// Properties panel for selected element

import { State } from './state.js';
import { DeviceTypes, Status } from './schema.js';

export function initProperties(panelEl) {
  const content = panelEl.querySelector('#properties-content');

  function field(label, inputEl) {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const l = document.createElement('label');
    l.textContent = label;
    wrap.appendChild(l);
    wrap.appendChild(inputEl);
    return wrap;
  }

  function render() {
    const s = State.getState();
    content.innerHTML = '';
    if (!s.selection) {
      const p = document.createElement('div');
      p.className = 'hint';
      p.textContent = 'Select an element to edit its properties.';
      content.appendChild(p);
      return;
    }
    const el = s.elements.find(e => e.id === s.selection);
    if (!el) return;

    // Type/Name
    const typeText = document.createElement('div');
    typeText.textContent = el.type;
    content.appendChild(field('Type', typeText));

    const nameInput = document.createElement('input');
    nameInput.value = el.name || '';
    nameInput.addEventListener('change', () => {
      State.updateElement(el.id, { name: nameInput.value });
    });
    content.appendChild(field('Name', nameInput));

    // Position/Size/Rotation
    const xInput = document.createElement('input'); xInput.type = 'number'; xInput.value = el.x;
    xInput.addEventListener('change', () => State.updateElement(el.id, { x: parseFloat(xInput.value) }));
    content.appendChild(field('X', xInput));

    const yInput = document.createElement('input'); yInput.type = 'number'; yInput.value = el.y;
    yInput.addEventListener('change', () => State.updateElement(el.id, { y: parseFloat(yInput.value) }));
    content.appendChild(field('Y', yInput));

    const wInput = document.createElement('input'); wInput.type = 'number'; wInput.value = el.w;
    wInput.addEventListener('change', () => State.updateElement(el.id, { w: Math.max(1, parseFloat(wInput.value)) }));
    content.appendChild(field('Width', wInput));

    const hInput = document.createElement('input'); hInput.type = 'number'; hInput.value = el.h;
    hInput.addEventListener('change', () => State.updateElement(el.id, { h: Math.max(1, parseFloat(hInput.value)) }));
    content.appendChild(field('Height', hInput));

    const rInput = document.createElement('input'); rInput.type = 'number'; rInput.value = el.r || 0;
    rInput.addEventListener('change', () => State.updateElement(el.id, { r: parseFloat(rInput.value) }));
    content.appendChild(field('Rotation', rInput));

    const zInput = document.createElement('input'); zInput.type = 'number'; zInput.value = el.z || 0;
    zInput.addEventListener('change', () => State.reorderElement(el.id, parseInt(zInput.value || 0, 10)));
    content.appendChild(field('Z-Index', zInput));

    // Status select
    const statusSel = document.createElement('select');
    for (const k of Object.keys(Status)) {
      const opt = document.createElement('option');
      opt.value = k; opt.textContent = k; if ((el.status || 'normal') === k) opt.selected = true; statusSel.appendChild(opt);
    }
    statusSel.addEventListener('change', () => State.updateElement(el.id, { status: statusSel.value }));
    content.appendChild(field('Status', statusSel));

    // Route if AGV
    if (el.type === DeviceTypes.AGV) {
      const routeSel = document.createElement('select');
      const none = document.createElement('option'); none.value = ''; none.textContent = '(none)'; routeSel.appendChild(none);
      for (const r of s.routes) {
        const opt = document.createElement('option');
        opt.value = r.id; opt.textContent = r.name; if (el.routeId === r.id) opt.selected = true; routeSel.appendChild(opt);
      }
      routeSel.addEventListener('change', () => State.updateElement(el.id, { routeId: routeSel.value || null }));
      content.appendChild(field('Route', routeSel));
    }
  }

  State.subscribe((reason) => {
    if (['selection', 'elements', 'routes', 'deserialize'].includes(reason)) render();
  });

  render();

  return { render };
}

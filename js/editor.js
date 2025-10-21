// Editor: selection, drag, resize, rotate, z-index helpers

import { State } from './state.js';

export function initEditor(stage) {
  const svg = stage.svg;
  const overlay = stage.overlayLayer;

  // Selection visuals
  const selGroup = document.createElementNS(svg.namespaceURI, 'g');
  const selRect = document.createElementNS(svg.namespaceURI, 'rect');
  selRect.setAttribute('class', 'selection-box');
  selGroup.appendChild(selRect);

  const handles = {};
  const handlePositions = ['nw', 'ne', 'sw', 'se'];
  for (const pos of handlePositions) {
    const h = document.createElementNS(svg.namespaceURI, 'rect');
    h.setAttribute('class', 'handle resize');
    h.setAttribute('data-pos', pos);
    h.setAttribute('width', '8');
    h.setAttribute('height', '8');
    h.style.cursor = `${pos}-resize`;
    selGroup.appendChild(h);
    handles[pos] = h;
  }
  const rotateHandle = document.createElementNS(svg.namespaceURI, 'circle');
  rotateHandle.setAttribute('class', 'handle rotate');
  rotateHandle.setAttribute('r', '6');
  selGroup.appendChild(rotateHandle);

  overlay.appendChild(selGroup);

  let interaction = null; // { type: 'drag'|'resize'|'rotate', id, start, init }

  function gridSnap(v) {
    const s = State.getState();
    if (!s.settings.snapToGrid) return v;
    const g = s.settings.gridSize || 20;
    return Math.round(v / g) * g;
  }

  function updateSelectionVisual() {
    const s = State.getState();
    const id = s.selection;
    if (!id) {
      selGroup.setAttribute('display', 'none');
      return;
    }
    const el = s.elements.find(e => e.id === id);
    if (!el) {
      selGroup.setAttribute('display', 'none');
      return;
    }
    selGroup.setAttribute('display', 'block');
    const x = el.x, y = el.y, w = el.w, h = el.h;
    selRect.setAttribute('x', x);
    selRect.setAttribute('y', y);
    selRect.setAttribute('width', w);
    selRect.setAttribute('height', h);

    const hw = 8, hh = 8;
    handles.nw.setAttribute('x', x - hw / 2);
    handles.nw.setAttribute('y', y - hh / 2);
    handles.ne.setAttribute('x', x + w - hw / 2);
    handles.ne.setAttribute('y', y - hh / 2);
    handles.sw.setAttribute('x', x - hw / 2);
    handles.sw.setAttribute('y', y + h - hh / 2);
    handles.se.setAttribute('x', x + w - hw / 2);
    handles.se.setAttribute('y', y + h - hh / 2);

    const rx = x + w / 2;
    const ry = y - 16;
    rotateHandle.setAttribute('cx', rx);
    rotateHandle.setAttribute('cy', ry);
  }

  function onPointerDown(e) {
    // Click on empty space clears selection unless in route mode
    const s = State.getState();
    if (s.mode === 'route') return; // routes module handles it
    if (e.target.closest('.handle')) return; // handled separately
    const deviceG = e.target.closest('.device');
    if (deviceG) {
      const id = deviceG.getAttribute('data-id');
      State.select(id);
      if (e.button === 0) {
        const el = State.getState().elements.find(x => x.id === id);
        if (!el) return;
        const wp = stage.toWorldPoint(e.clientX, e.clientY);
        interaction = {
          type: 'drag', id,
          start: { x: wp.x, y: wp.y },
          init: { x: el.x, y: el.y },
        };
        svg.setPointerCapture(e.pointerId || 1);
      }
    } else {
      if (e.button === 0) State.clearSelection();
    }
  }

  function onPointerMove(e) {
    if (!interaction) return;
    const s = State.getState();
    const el = s.elements.find(x => x.id === interaction.id);
    if (!el) return;
    const wp = stage.toWorldPoint(e.clientX, e.clientY);
    if (interaction.type === 'drag') {
      const dx = wp.x - interaction.start.x;
      const dy = wp.y - interaction.start.y;
      const nx = gridSnap(interaction.init.x + dx);
      const ny = gridSnap(interaction.init.y + dy);
      State.updateElement(el.id, { x: nx, y: ny }, false);
      updateSelectionVisual();
    } else if (interaction.type === 'resize') {
      const pos = interaction.pos;
      let { x, y, w, h } = interaction.init;
      const min = 10;
      if (pos.includes('n')) {
        const ny = gridSnap(wp.y);
        h = Math.max(min, (y + h) - ny);
        y = (y + h) - h; // keep consistent
        y = gridSnap(ny);
        h = Math.max(min, (interaction.init.y + interaction.init.h) - y);
      }
      if (pos.includes('s')) {
        const nh = gridSnap(wp.y) - y;
        h = Math.max(min, nh);
      }
      if (pos.includes('w')) {
        const nx = gridSnap(wp.x);
        w = Math.max(min, (x + w) - nx);
        x = gridSnap(nx);
        w = Math.max(min, (interaction.init.x + interaction.init.w) - x);
      }
      if (pos.includes('e')) {
        const nw = gridSnap(wp.x) - x;
        w = Math.max(min, nw);
      }
      State.updateElement(el.id, { x, y, w, h }, false);
      updateSelectionVisual();
    } else if (interaction.type === 'rotate') {
      const cx = interaction.center.x;
      const cy = interaction.center.y;
      const ang = Math.atan2(wp.y - cy, wp.x - cx) * 180 / Math.PI;
      let r = ang - interaction.startAngle;
      // snap to 15 deg
      r = Math.round(r / 15) * 15;
      State.updateElement(el.id, { r }, false);
      updateSelectionVisual();
    }
  }

  function onPointerUp(e) {
    if (interaction) {
      // push history
      State.updateElement(interaction.id, {}, true);
      interaction = null;
    }
  }

  function onHandleDown(e) {
    const s = State.getState();
    const id = s.selection;
    if (!id) return;
    const el = s.elements.find(x => x.id === id);
    if (!el) return;
    e.stopPropagation();
    const target = e.target;
    if (target.classList.contains('resize')) {
      interaction = {
        type: 'resize', id,
        pos: target.getAttribute('data-pos'),
        init: { x: el.x, y: el.y, w: el.w, h: el.h },
      };
    } else if (target.classList.contains('rotate')) {
      const center = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
      const wp = stage.toWorldPoint(e.clientX, e.clientY);
      const startAngle = Math.atan2(wp.y - center.y, wp.x - center.x) * 180 / Math.PI - (el.r || 0);
      interaction = { type: 'rotate', id, center, startAngle };
    }
    svg.setPointerCapture(e.pointerId || 1);
  }

  // z-index actions
  function bringToFront() {
    const s = State.getState();
    const id = s.selection; if (!id) return;
    const maxZ = s.elements.reduce((m, e) => Math.max(m, e.z || 0), 0) + 1;
    State.reorderElement(id, maxZ, true);
  }
  function sendToBack() {
    const s = State.getState();
    const id = s.selection; if (!id) return;
    const minZ = s.elements.reduce((m, e) => Math.min(m, e.z || 0), 0) - 1;
    State.reorderElement(id, minZ, true);
  }

  // Events
  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);
  selGroup.addEventListener('pointerdown', onHandleDown);

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); State.undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); State.redo(); }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const id = State.getState().selection; if (id) State.removeElement(id);
    }
  });

  // Selection updates
  State.subscribe((reason) => {
    if (reason === 'selection' || reason === 'elements' || reason === 'deserialize') {
      updateSelectionVisual();
    }
  });

  return {
    bringToFront,
    sendToBack,
    updateSelectionVisual,
  };
}

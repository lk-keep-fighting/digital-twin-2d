// Mock realtime simulator (2 Hz) with normalizer

import { State } from './state.js';

const TICK_MS = 500; // 2 Hz

let interval = null;

function normalizeStatus(status) {
  const valid = ['normal', 'offline', 'fault', 'blocked'];
  return valid.includes(status) ? status : 'normal';
}

function tick() {
  const s = State.getState();
  // Update statuses randomly
  for (const el of s.elements) {
    el.status = normalizeStatus(el.status);
    if (!el.meta) el.meta = {};
    if (el.meta.statusTTL && el.meta.statusTTL > 0) {
      el.meta.statusTTL -= 1;
      if (el.meta.statusTTL === 0) el.status = 'normal';
    } else {
      // Chance to trigger event
      const rnd = Math.random();
      if (rnd < 0.01) { el.status = 'offline'; el.meta.statusTTL = 6; }
      else if (rnd < 0.018) { el.status = 'fault'; el.meta.statusTTL = 4; }
      else if (rnd < 0.026) { el.status = 'blocked'; el.meta.statusTTL = 3; }
    }
  }

  // Move AGVs along routes
  for (const el of s.elements) {
    if (el.type === 'AGV' && el.routeId) {
      const route = s.routes.find(r => r.id === el.routeId);
      if (!route || route.points.length < 2) continue;
      const speed = 100; // units per second
      const dt = TICK_MS / 1000;
      let idx = el.meta.routeIdx || 0;
      let t = el.meta.t || 0;
      const from = route.points[idx % route.points.length];
      const to = route.points[(idx + 1) % route.points.length];
      const dx = to.x - from.x; const dy = to.y - from.y;
      const dist = Math.hypot(dx, dy) || 1;
      const step = speed * dt / dist;
      t += step;
      if (t >= 1) { t = t - 1; idx = (idx + 1) % route.points.length; }
      const nx = from.x + dx * t;
      const ny = from.y + dy * t;
      State.updateElement(el.id, { x: nx - el.w / 2, y: ny - el.h / 2, meta: { ...el.meta, routeIdx: idx, t } }, false);
    }
  }

  // Batch complete; updates already notified via State.updateElement without history
}

function start() {
  if (interval) return;
  interval = setInterval(tick, TICK_MS);
  State.getState().realtime.running = true;
}

function stop() {
  if (!interval) return;
  clearInterval(interval);
  interval = null;
  State.getState().realtime.running = false;
}

export const Realtime = { start, stop };

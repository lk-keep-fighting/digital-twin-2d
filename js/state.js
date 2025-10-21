// Central application state store with undo/redo and subscriptions

const MAX_HISTORY = 100;

const initialSettings = {
  gridSize: 20,
  snapToGrid: true,
  showGrid: true,
};

const internal = {
  listeners: new Set(),
  history: [],
  future: [],
  idCounter: 1,
  suppressHistory: false,
};

const state = {
  settings: { ...initialSettings },
  elements: [], // { id, type, name, x, y, w, h, r, z, status, routeId, meta }
  routes: [], // { id, name, points:[{x,y}], closed }
  selection: null, // selected element id or null (single-select)
  mode: 'select', // 'select' | 'route'
  realtime: { running: false },
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function genId(prefix = 'el') {
  const id = `${prefix}_${internal.idCounter++}`;
  return id;
}

function subscribe(fn) {
  internal.listeners.add(fn);
  return () => internal.listeners.delete(fn);
}

function notify(reason = 'update') {
  for (const fn of internal.listeners) fn(reason, getState());
}

function getState() {
  return state;
}

function replaceState(newState, pushHistory = true) {
  if (pushHistory) pushHistorySnapshot('replace');
  Object.assign(state, deepClone(newState));
  notify('replace');
}

function setSettings(patch) {
  Object.assign(state.settings, patch);
  notify('settings');
}

function addElement(el, pushHist = true) {
  if (!el.id) el.id = genId(el.type?.toLowerCase() || 'el');
  if (typeof el.z !== 'number') el.z = state.elements.length;
  state.elements.push(el);
  if (pushHist) pushHistorySnapshot(`add:${el.id}`);
  notify('elements');
  return el.id;
}

function updateElement(id, patch, pushHist = true) {
  const el = state.elements.find(e => e.id === id);
  if (!el) return;
  Object.assign(el, patch);
  if (pushHist) pushHistorySnapshot(`update:${id}`);
  notify('elements');
}

function removeElement(id, pushHist = true) {
  const idx = state.elements.findIndex(e => e.id === id);
  if (idx === -1) return;
  const el = state.elements[idx];
  state.elements.splice(idx, 1);
  if (state.selection === id) state.selection = null;
  if (pushHist) pushHistorySnapshot(`remove:${id}`);
  notify('elements');
  return el;
}

function reorderElement(id, newZ, pushHist = true) {
  const el = state.elements.find(e => e.id === id);
  if (!el) return;
  el.z = newZ;
  if (pushHist) pushHistorySnapshot(`reorder:${id}`);
  notify('elements');
}

function select(id) {
  state.selection = id;
  notify('selection');
}

function clearSelection() {
  state.selection = null;
  notify('selection');
}

function addRoute(route, pushHist = true) {
  if (!route.id) route.id = genId('route');
  state.routes.push(route);
  if (pushHist) pushHistorySnapshot(`route-add:${route.id}`);
  notify('routes');
  return route.id;
}

function updateRoute(id, patch, pushHist = true) {
  const r = state.routes.find(r => r.id === id);
  if (!r) return;
  Object.assign(r, patch);
  if (pushHist) pushHistorySnapshot(`route-update:${id}`);
  notify('routes');
}

function removeRoute(id, pushHist = true) {
  const idx = state.routes.findIndex(r => r.id === id);
  if (idx === -1) return;
  state.routes.splice(idx, 1);
  if (pushHist) pushHistorySnapshot(`route-remove:${id}`);
  notify('routes');
}

function setMode(mode) {
  state.mode = mode;
  notify('mode');
}

function pushHistorySnapshot(label = '') {
  if (internal.suppressHistory) return;
  const snapshot = deepClone({
    settings: state.settings,
    elements: state.elements,
    routes: state.routes,
    selection: state.selection,
    mode: state.mode,
  });
  internal.history.push({ label, snapshot });
  if (internal.history.length > MAX_HISTORY) internal.history.shift();
  internal.future.length = 0; // clear redo stack
}

function undo() {
  if (internal.history.length === 0) return;
  const current = deepClone({
    settings: state.settings,
    elements: state.elements,
    routes: state.routes,
    selection: state.selection,
    mode: state.mode,
  });
  internal.future.push({ label: 'redo', snapshot: current });
  const { snapshot } = internal.history.pop();
  internal.suppressHistory = true;
  replaceState(snapshot, false);
  internal.suppressHistory = false;
}

function redo() {
  if (internal.future.length === 0) return;
  const current = deepClone({
    settings: state.settings,
    elements: state.elements,
    routes: state.routes,
    selection: state.selection,
    mode: state.mode,
  });
  internal.history.push({ label: 'undo', snapshot: current });
  const { snapshot } = internal.future.pop();
  internal.suppressHistory = true;
  replaceState(snapshot, false);
  internal.suppressHistory = false;
}

function serialize() {
  return deepClone({
    settings: state.settings,
    elements: state.elements,
    routes: state.routes,
  });
}

function deserialize(data) {
  internal.idCounter = 1;
  replaceState({
    settings: { ...initialSettings, ...(data.settings || {}) },
    elements: (data.elements || []).map(e => ({
      id: e.id || genId((e.type || 'el').toLowerCase()),
      type: e.type || 'Unknown',
      name: e.name || e.id || 'Unnamed',
      x: e.x || 0,
      y: e.y || 0,
      w: e.w || 40,
      h: e.h || 40,
      r: e.r || 0,
      z: typeof e.z === 'number' ? e.z : 0,
      status: e.status || 'normal',
      routeId: e.routeId || null,
      meta: e.meta || {},
    })),
    routes: (data.routes || []).map(r => ({
      id: r.id || genId('route'),
      name: r.name || r.id || 'Route',
      points: (r.points || []).map(p => ({ x: p.x || 0, y: p.y || 0 })),
      closed: !!r.closed,
    })),
    selection: null,
    mode: 'select',
    realtime: { running: false },
  }, false);
  // Normalize z order if missing
  state.elements.forEach((e, i) => { if (typeof e.z !== 'number') e.z = i; });
  notify('deserialize');
}

export const State = {
  subscribe,
  getState,
  setSettings,
  addElement,
  updateElement,
  removeElement,
  reorderElement,
  select,
  clearSelection,
  addRoute,
  updateRoute,
  removeRoute,
  setMode,
  undo,
  redo,
  serialize,
  deserialize,
  genId,
};

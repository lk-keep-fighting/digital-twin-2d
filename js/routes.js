// Routes editor: polyline editing for AGV paths

import { State } from './state.js';

export function initRoutes(stage) {
  const layer = stage.routesLayer;
  const svg = stage.svg;
  const routeDomById = new Map();
  let editing = false;
  let activeRouteId = null;
  let dragInfo = null; // { routeId, index }

  function createRouteGroup(route) {
    const g = document.createElementNS(svg.namespaceURI, 'g');
    g.setAttribute('data-route-id', route.id);

    const poly = document.createElementNS(svg.namespaceURI, 'polyline');
    poly.setAttribute('class', 'route');
    g.appendChild(poly);

    const vertices = document.createElementNS(svg.namespaceURI, 'g');
    vertices.setAttribute('class', 'vertices');
    g.appendChild(vertices);

    layer.appendChild(g);
    routeDomById.set(route.id, g);
    return g;
  }

  function updateRouteGroup(route) {
    let g = routeDomById.get(route.id);
    if (!g) g = createRouteGroup(route);
    const poly = g.querySelector('polyline');
    const vertices = g.querySelector('.vertices');
    const pointsStr = route.points.map(p => `${p.x},${p.y}`).join(' ');
    poly.setAttribute('points', pointsStr);
    g.classList.toggle('selected', activeRouteId === route.id);

    // Update vertices
    vertices.innerHTML = '';
    route.points.forEach((p, idx) => {
      const c = document.createElementNS(svg.namespaceURI, 'circle');
      c.setAttribute('class', 'vertex');
      c.setAttribute('cx', p.x);
      c.setAttribute('cy', p.y);
      c.setAttribute('r', '4');
      c.setAttribute('data-index', idx);
      c.addEventListener('pointerdown', (e) => {
        if (!editing) return;
        e.stopPropagation();
        dragInfo = { routeId: route.id, index: idx };
        svg.setPointerCapture(e.pointerId || 1);
      });
      vertices.appendChild(c);
    });
  }

  function renderAll() {
    const s = State.getState();
    const ids = new Set(s.routes.map(r => r.id));
    for (const [id, g] of routeDomById.entries()) {
      if (!ids.has(id)) { g.remove(); routeDomById.delete(id); }
    }
    for (const r of s.routes) updateRouteGroup(r);
  }

  function toggleEditing(on) {
    editing = on;
    layer.style.pointerEvents = on ? 'auto' : 'none';
  }

  function onPointerDown(e) {
    const s = State.getState();
    if (s.mode !== 'route') return;
    if (!editing) toggleEditing(true);
    const wp = stage.toWorldPoint(e.clientX, e.clientY);

    // If no active route, start new
    if (!activeRouteId) {
      activeRouteId = State.addRoute({ name: `Route ${State.getState().routes.length + 1}`, points: [] }, true);
    }
    const route = State.getState().routes.find(r => r.id === activeRouteId);
    route.points.push({ x: wp.x, y: wp.y });
    // push to history so points can be undone step-by-step
    State.updateRoute(route.id, { points: route.points }, true);
    renderAll();
  }

  function onPointerMove(e) {
    if (!editing) return;
    if (dragInfo) {
      const { routeId, index } = dragInfo;
      const r = State.getState().routes.find(x => x.id === routeId);
      if (!r) return;
      const wp = stage.toWorldPoint(e.clientX, e.clientY);
      r.points[index] = { x: wp.x, y: wp.y };
      State.updateRoute(routeId, { points: r.points }, false);
      renderAll();
    }
  }

  function onPointerUp(e) {
    if (dragInfo) {
      // commit
      State.updateRoute(dragInfo.routeId, {}, true);
      dragInfo = null;
    }
  }

  function finishRoute() {
    activeRouteId = null;
  }

  // Double click to finish route
  svg.addEventListener('dblclick', (e) => {
    if (State.getState().mode === 'route') finishRoute();
  });

  // Subscribe
  State.subscribe((reason) => {
    if (reason === 'routes' || reason === 'deserialize') renderAll();
  });

  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);

  return {
    toggleEditing,
    renderAll,
  };
}

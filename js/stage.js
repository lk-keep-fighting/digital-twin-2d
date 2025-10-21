// Stage: SVG creation, layers, pan/zoom, grid and utilities

import { State } from './state.js';

export function initStage(containerEl) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('tabindex', '0');
  svg.style.outline = 'none';

  // defs for grid
  const defs = document.createElementNS(svg.namespaceURI, 'defs');
  const gridPattern = document.createElementNS(svg.namespaceURI, 'pattern');
  gridPattern.setAttribute('id', 'grid-pattern');
  gridPattern.setAttribute('patternUnits', 'userSpaceOnUse');
  gridPattern.setAttribute('width', '20');
  gridPattern.setAttribute('height', '20');
  const gridPath = document.createElementNS(svg.namespaceURI, 'path');
  gridPath.setAttribute('d', 'M 20 0 L 0 0 0 20');
  gridPath.setAttribute('class', 'grid-line');
  gridPattern.appendChild(gridPath);
  const gridPatternMajor = document.createElementNS(svg.namespaceURI, 'pattern');
  gridPatternMajor.setAttribute('id', 'grid-pattern-major');
  gridPatternMajor.setAttribute('patternUnits', 'userSpaceOnUse');
  gridPatternMajor.setAttribute('width', '100');
  gridPatternMajor.setAttribute('height', '100');
  const gridPathMajor = document.createElementNS(svg.namespaceURI, 'path');
  gridPathMajor.setAttribute('d', 'M 100 0 L 0 0 0 100');
  gridPathMajor.setAttribute('class', 'grid-line major');
  gridPatternMajor.appendChild(gridPathMajor);
  defs.appendChild(gridPattern);
  defs.appendChild(gridPatternMajor);
  svg.appendChild(defs);

  // Background rect to capture events
  const background = document.createElementNS(svg.namespaceURI, 'rect');
  background.setAttribute('x', '-50000');
  background.setAttribute('y', '-50000');
  background.setAttribute('width', '100000');
  background.setAttribute('height', '100000');
  background.setAttribute('fill', 'url(#grid-pattern)');

  const backgroundMajor = document.createElementNS(svg.namespaceURI, 'rect');
  backgroundMajor.setAttribute('x', '-50000');
  backgroundMajor.setAttribute('y', '-50000');
  backgroundMajor.setAttribute('width', '100000');
  backgroundMajor.setAttribute('height', '100000');
  backgroundMajor.setAttribute('fill', 'url(#grid-pattern-major)');
  backgroundMajor.setAttribute('opacity', '0.6');

  const viewport = document.createElementNS(svg.namespaceURI, 'g');
  viewport.setAttribute('id', 'viewport');

  const gridLayer = document.createElementNS(svg.namespaceURI, 'g');
  gridLayer.setAttribute('id', 'grid-layer');
  const routesLayer = document.createElementNS(svg.namespaceURI, 'g');
  routesLayer.setAttribute('id', 'routes-layer');
  const devicesLayer = document.createElementNS(svg.namespaceURI, 'g');
  devicesLayer.setAttribute('id', 'devices-layer');
  const overlayLayer = document.createElementNS(svg.namespaceURI, 'g');
  overlayLayer.setAttribute('id', 'overlay-layer');

  viewport.appendChild(gridLayer);
  viewport.appendChild(routesLayer);
  viewport.appendChild(devicesLayer);
  viewport.appendChild(overlayLayer);

  svg.appendChild(background);
  svg.appendChild(backgroundMajor);
  svg.appendChild(viewport);

  containerEl.innerHTML = '';
  containerEl.appendChild(svg);

  // Pan/zoom state
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let panning = false;
  let lastPoint = null;
  let spaceKey = false;

  function applyTransform() {
    viewport.setAttribute('transform', `translate(${translateX},${translateY}) scale(${scale})`);
  }

  function toWorldPoint(clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const inv = viewport.getScreenCTM().inverse();
    const res = pt.matrixTransform(inv);
    return { x: res.x, y: res.y };
  }

  function setScaleAround(point, newScale) {
    newScale = Math.max(0.2, Math.min(4, newScale));
    const s = newScale / scale;
    translateX = point.x - s * (point.x - translateX);
    translateY = point.y - s * (point.y - translateY);
    scale = newScale;
    applyTransform();
  }

  function onWheel(e) {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY);
    const factor = e.ctrlKey || e.metaKey ? 0.05 : 0.1;
    const m = toWorldPoint(e.clientX, e.clientY);
    setScaleAround(m, scale * (1 + delta * factor));
  }

  function onPointerDown(e) {
    if (e.button === 1 || e.button === 2 || spaceKey) {
      panning = true;
      lastPoint = { x: e.clientX, y: e.clientY };
      svg.setPointerCapture(e.pointerId || 1);
    }
  }

  function onPointerMove(e) {
    if (panning && lastPoint) {
      const dx = e.clientX - lastPoint.x;
      const dy = e.clientY - lastPoint.y;
      translateX += dx / scale;
      translateY += dy / scale;
      lastPoint = { x: e.clientX, y: e.clientY };
      applyTransform();
    }
  }

  function onPointerUp(e) {
    panning = false;
    lastPoint = null;
  }

  function onKeyDown(e) {
    if (e.code === 'Space') spaceKey = true;
  }

  function onKeyUp(e) {
    if (e.code === 'Space') spaceKey = false;
  }

  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);
  svg.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // React to grid visibility changes
  State.subscribe((reason, s) => {
    if (reason === 'settings' || reason === 'deserialize') {
      const show = !!s.settings.showGrid;
      background.setAttribute('display', show ? 'block' : 'none');
      backgroundMajor.setAttribute('display', show ? 'block' : 'none');
    }
  });

  // Initialize
  applyTransform();

  return {
    svg,
    viewport,
    gridLayer,
    routesLayer,
    devicesLayer,
    overlayLayer,
    toWorldPoint,
    getTransform: () => ({ scale, translateX, translateY }),
    setTransform: (tx, ty, sc) => { translateX = tx; translateY = ty; scale = sc; applyTransform(); },
  };
}

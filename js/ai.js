// AI operation DSL stub with preview + confirm apply

import { State } from './state.js';
import { createElement, DeviceTypes } from './schema.js';

const typeMap = {
  agv: DeviceTypes.AGV,
  rgv: DeviceTypes.RGV,
  productionline: DeviceTypes.ProductionLine,
  line: DeviceTypes.ProductionLine,
  stackercrane: DeviceTypes.StackerCrane,
  crane: DeviceTypes.StackerCrane,
  flatwarehouse: DeviceTypes.FlatWarehouse,
  warehouse: DeviceTypes.FlatWarehouse,
};

export function initAI(stage) {
  const overlay = stage.overlayLayer;
  const previewLayer = document.createElementNS(stage.svg.namespaceURI, 'g');
  previewLayer.setAttribute('id', 'ai-preview');
  overlay.appendChild(previewLayer);

  let lastAction = null;

  function parse(input) {
    if (!input || !input.trim()) return null;
    const [cmd, ...restArr] = input.trim().split(/\s+/);
    const rest = restArr.join(' ');
    if (!cmd) return null;
    const op = cmd.toLowerCase();

    function parseKV(str) {
      const obj = {};
      const re = /(\w+)=([^\s]+)/g;
      let m;
      while ((m = re.exec(str))) {
        const k = m[1].toLowerCase();
        let v = m[2];
        if (!isNaN(parseFloat(v))) v = parseFloat(v);
        obj[k] = v;
      }
      return obj;
    }

    if (op === 'add') {
      const [typeToken, ...kvArr] = restArr;
      if (!typeToken) return null;
      const type = typeMap[typeToken.toLowerCase()] || typeToken;
      const kv = parseKV(kvArr.join(' '));
      return { op: 'add', type, props: kv };
    }
    if (op === 'move' || op === 'set' || op === 'delete' || op === 'connect') {
      const target = restArr[0];
      const kv = parseKV(rest.replace(target, ''));
      return { op, target, props: kv, targetB: restArr[1] };
    }
    return null;
  }

  function findByIdOrName(idOrName) {
    const s = State.getState();
    return s.elements.find(e => e.id === idOrName || (e.name && e.name.toString() === idOrName));
  }

  function clearPreview() {
    previewLayer.innerHTML = '';
  }

  function preview(action) {
    clearPreview();
    lastAction = action;
    if (!action) return;
    if (action.op === 'add') {
      const el = createElement(action.type, action.props);
      const rect = document.createElementNS(stage.svg.namespaceURI, 'rect');
      rect.setAttribute('x', el.x);
      rect.setAttribute('y', el.y);
      rect.setAttribute('width', el.w);
      rect.setAttribute('height', el.h);
      rect.setAttribute('fill', 'rgba(37,99,235,0.2)');
      rect.setAttribute('stroke', '#2563eb');
      rect.setAttribute('stroke-dasharray', '4 2');
      previewLayer.appendChild(rect);
    } else if (action.op === 'move') {
      const target = findByIdOrName(action.target);
      if (!target) return;
      const x = action.props.x ?? target.x;
      const y = action.props.y ?? target.y;
      const rect = document.createElementNS(stage.svg.namespaceURI, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', target.w);
      rect.setAttribute('height', target.h);
      rect.setAttribute('fill', 'rgba(16,185,129,0.2)');
      rect.setAttribute('stroke', '#10b981');
      rect.setAttribute('stroke-dasharray', '4 2');
      previewLayer.appendChild(rect);
    } else if (action.op === 'delete') {
      const target = findByIdOrName(action.target);
      if (!target) return;
      const rect = document.createElementNS(stage.svg.namespaceURI, 'rect');
      rect.setAttribute('x', target.x);
      rect.setAttribute('y', target.y);
      rect.setAttribute('width', target.w);
      rect.setAttribute('height', target.h);
      rect.setAttribute('fill', 'rgba(239,68,68,0.2)');
      rect.setAttribute('stroke', '#ef4444');
      rect.setAttribute('stroke-dasharray', '4 2');
      previewLayer.appendChild(rect);
    }
  }

  function apply(action) {
    if (!action) return false;
    if (action.op === 'add') {
      const el = createElement(action.type, action.props);
      State.addElement(el, true);
      return true;
    }
    if (action.op === 'move') {
      const target = findByIdOrName(action.target);
      if (!target) { alert('Target not found'); return false; }
      const patch = {};
      if (typeof action.props.x === 'number') patch.x = action.props.x;
      if (typeof action.props.y === 'number') patch.y = action.props.y;
      State.updateElement(target.id, patch, true);
      return true;
    }
    if (action.op === 'set') {
      const target = findByIdOrName(action.target);
      if (!target) { alert('Target not found'); return false; }
      const patch = { ...action.props };
      if (patch.type) delete patch.type;
      State.updateElement(target.id, patch, true);
      return true;
    }
    if (action.op === 'delete') {
      const target = findByIdOrName(action.target);
      if (!target) { alert('Target not found'); return false; }
      State.removeElement(target.id, true);
      return true;
    }
    if (action.op === 'connect') {
      const a = findByIdOrName(action.target);
      const b = findByIdOrName(action.targetB);
      if (!a || !b) { alert('Invalid connect targets'); return false; }
      const meta = { ...(a.meta || {}), connectedTo: b.id };
      State.updateElement(a.id, { meta }, true);
      return true;
    }
    return false;
  }

  return { parse, preview, apply, clearPreview };
}

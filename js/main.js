import { initStage } from './stage.js';
import { initRenderers } from './renderers.js';
import { initEditor } from './editor.js';
import { initRoutes } from './routes.js';
import { initProperties } from './properties.js';
import { Persistence } from './persistence.js';
import { Realtime } from './realtime.js';
import { initAI } from './ai.js';
import { initAlerts } from './alerts.js';
import { State } from './state.js';
import { createElement, DeviceTypes } from './schema.js';

function setupUI() {
  const stageContainer = document.getElementById('stage');
  const stage = initStage(stageContainer);
  const renderers = initRenderers(stage);
  const editor = initEditor(stage);
  const routes = initRoutes(stage);
  const properties = initProperties(document.getElementById('properties'));
  const alerts = initAlerts(document.getElementById('alerts-list'));
  const ai = initAI(stage);

  // Persistence
  Persistence.setupAutosave();
  const loaded = Persistence.loadFromLocalStorage();
  if (!loaded) {
    // Seed with a small default layout
    const els = [];
    let x = 100, y = 100;
    for (let i = 0; i < 10; i++) {
      els.push(createElement(DeviceTypes.ProductionLine, { x, y, name: `Line ${i+1}` }));
      y += 80;
    }
    for (let i = 0; i < 20; i++) {
      els.push(createElement(DeviceTypes.AGV, { x: 400 + (i%5)*60, y: 100 + Math.floor(i/5)*40, name: `A${i+1}` }));
    }
    for (let i = 0; i < 10; i++) {
      els.push(createElement(DeviceTypes.StackerCrane, { x: 800, y: 80 + i*60, name: `SC${i+1}` }));
    }
    for (let i = 0; i < 4; i++) {
      els.push(createElement(DeviceTypes.FlatWarehouse, { x: 1000 + (i%2)*260, y: 80 + Math.floor(i/2)*200, name: `FW${i+1}` }));
    }
    State.deserialize({ elements: els, routes: [] });
  }

  // Toolbar bindings
  const $ = (id) => document.getElementById(id);

  $('btn-new').addEventListener('click', () => {
    if (confirm('Clear current layout?')) {
      State.deserialize({ elements: [], routes: [] });
    }
  });

  const fileInput = $('file-input');
  $('btn-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) Persistence.importFromFile(file);
    fileInput.value = '';
  });

  $('btn-export').addEventListener('click', () => Persistence.exportJSON());
  $('btn-load-sample').addEventListener('click', () => Persistence.loadSample());

  $('btn-undo').addEventListener('click', () => State.undo());
  $('btn-redo').addEventListener('click', () => State.redo());

  const btnRoutes = $('btn-routes');
  const chkGrid = $('chk-grid');
  const chkSnap = $('chk-snap');
  btnRoutes.addEventListener('click', () => {
    const mode = State.getState().mode === 'route' ? 'select' : 'route';
    State.setMode(mode);
    btnRoutes.classList.toggle('active', mode === 'route');
  });
  chkGrid.addEventListener('change', () => State.setSettings({ showGrid: chkGrid.checked }));
  chkSnap.addEventListener('change', () => State.setSettings({ snapToGrid: chkSnap.checked }));
  // reflect settings in UI after deserialize
  State.subscribe((reason, s) => {
    if (reason === 'deserialize') {
      chkGrid.checked = !!s.settings.showGrid;
      chkSnap.checked = !!s.settings.snapToGrid;
      btnRoutes.classList.toggle('active', s.mode === 'route');
    }
  });

  $('btn-front').addEventListener('click', () => editor.bringToFront());
  $('btn-back').addEventListener('click', () => editor.sendToBack());

  $('btn-rt-start').addEventListener('click', () => Realtime.start());
  $('btn-rt-stop').addEventListener('click', () => Realtime.stop());

  // AI DSL
  const aiInput = $('ai-input');
  $('btn-ai-preview').addEventListener('click', () => {
    const action = ai.parse(aiInput.value);
    ai.preview(action);
  });
  $('btn-ai-apply').addEventListener('click', () => {
    const action = ai.parse(aiInput.value);
    if (ai.apply(action)) ai.clearPreview();
  });

  // Expose for debugging
  window.DT = { stage, renderers, editor, routes, properties, alerts, ai, State };
}

window.addEventListener('DOMContentLoaded', setupUI);

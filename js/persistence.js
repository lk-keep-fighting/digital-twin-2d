// Persistence: import/export JSON + localStorage autosave

import { State } from './state.js';

const STORAGE_KEY = 'digital_twin_layout_v1';

function saveToLocalStorage() {
  try {
    const data = State.serialize();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Autosave failed', err);
  }
}

function loadFromLocalStorage() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return false;
    const data = JSON.parse(s);
    State.deserialize(data);
    return true;
  } catch (err) {
    console.warn('Load failed', err);
    return false;
  }
}

function exportJSON() {
  const data = State.serialize();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'layout.export.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      State.deserialize(data);
    } catch (e) {
      alert('Invalid JSON');
    }
  };
  reader.readAsText(file);
}

async function loadSample() {
  try {
    const res = await fetch('./data/layout.sample.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    State.deserialize(data);
  } catch (e) {
    alert('Failed to load sample. If you are opening index.html directly from the filesystem, please serve the folder via a static server due to browser security.');
  }
}

function setupAutosave() {
  let timer = null;
  State.subscribe(() => {
    clearTimeout(timer);
    timer = setTimeout(saveToLocalStorage, 300);
  });
}

export const Persistence = {
  saveToLocalStorage,
  loadFromLocalStorage,
  exportJSON,
  importFromFile,
  loadSample,
  setupAutosave,
};

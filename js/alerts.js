// Alerts: basic list and highlighting

import { State } from './state.js';

export function initAlerts(listEl) {
  function render() {
    const s = State.getState();
    const alerts = s.elements
      .filter(e => e.status && e.status !== 'normal')
      .map(e => ({ id: e.id, name: e.name || e.id, status: e.status }));

    listEl.innerHTML = '';
    for (const a of alerts) {
      const chip = document.createElement('span');
      chip.className = `alert ${a.status}`;
      chip.textContent = `${a.status.toUpperCase()}: ${a.name}`;
      chip.title = a.id;
      chip.addEventListener('click', () => State.select(a.id));
      listEl.appendChild(chip);
    }
  }

  State.subscribe((reason) => {
    if (['elements', 'deserialize'].includes(reason)) render();
  });

  render();
  return { render };
}

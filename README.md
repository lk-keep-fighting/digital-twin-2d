Digital Twin 2D MVP (HTML + CSS + JS + SVG)

Overview
- Zero-dependency, static, client-side MVP.
- SVG stage with pan/zoom, grid + snapping, layers.
- Device types: ProductionLine, AGV, RGV, StackerCrane, FlatWarehouse.
- Selection, drag, resize, rotate, z-index.
- AGV route polyline editor.
- Import/Export JSON + localStorage autosave.
- Mock realtime simulator (2 Hz) with simple status changes and AGV movement.
- AI operation DSL stub (add/move/set/connect/delete) with preview + apply.
- Basic alerts (offline/fault/blocked) listing + highlighting.
- Undo/Redo via toolbar or Ctrl+Z/Ctrl+Y.

Run
1) Open index.html directly in a modern browser OR serve the folder via a static file server.
   - For loading the sample layout via the "Load Sample" button, browsers may block file:// fetch. In that case, please serve the folder:
     - Python 3: `python3 -m http.server 8080` and open http://localhost:8080
     - Node (if installed): `npx serve .`
2) Interact with the toolbar:
   - New / Import / Export / Load Sample
   - Undo / Redo
   - Routes edit mode toggle (click to add points, drag vertices, double-click to finish)
   - Grid and Snap toggles
   - Bring Front / Send Back
   - Start RT / Stop RT (mock realtime)
   - AI DSL: Enter statements like:
     - `add agv x=100 y=200 name=A1`
     - `move A1 x=300 y=300`
     - `set A1 status=fault`
     - `delete A1`
     - `connect A1 Line1` (stores a simple meta.connectedTo)

Acceptance checklist
- Open index.html (or served statically) to run.
- Load /data/layout.sample.json via the "Load Sample" button (requires running via http:// due to browser security if not using a server).
- Smooth interaction with ~300 elements. This MVP is optimized enough to handle hundreds of elements with requestAnimationFrame-friendly state updates and minimal DOM churn.
- Realtime updates reflected on stage. AGVs assigned a route will move along it; random status updates trigger alerts and highlighting.
- AI DSL sample: try `add agv x=100 y=200 name=A1` -> Preview then Apply.
- Undo/Redo works (toolbar or Ctrl+Z/Ctrl+Y).

Project structure
- index.html
- styles.css
- js/
  - main.js: bootstraps modules, toolbar wiring
  - state.js: centralized store, undo/redo, serialization
  - schema.js: device types, defaults, status colors, element factory
  - stage.js: SVG stage, layers, pan/zoom, grid
  - renderers.js: draw/update device visuals
  - editor.js: selection, drag, resize, rotate, z-index
  - routes.js: AGV route polyline editor
  - properties.js: properties panel (right side)
  - persistence.js: import/export, localStorage autosave, sample loader
  - realtime.js: 2 Hz simulator (status + AGV motion)
  - ai.js: simple DSL parser + preview/apply
  - alerts.js: list + highlight alerts
- data/
  - layout.sample.json

Notes
- This is an MVP: interactions are simplified (single selection, axis-aligned resize with rotated elements kept simple, etc.).
- All code is vanilla ES modules without external dependencies.
- The layout auto-saves to localStorage on change.

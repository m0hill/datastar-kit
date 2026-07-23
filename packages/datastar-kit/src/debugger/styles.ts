/** Shadow DOM styles for the debugger element. */
export const debuggerStyles = `
:host {
  display: block;
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 2147483647;
  color-scheme: dark;
  --dsk-bg: #000;
  --dsk-surface: #0c0c0c;
  --dsk-surface-2: #161616;
  --dsk-border: #1f1f1f;
  --dsk-border-strong: #333;
  --dsk-text: #ededed;
  --dsk-muted: #7d7d7d;
  --dsk-faint: #565656;
  --dsk-add: #5fb46a;
  --dsk-blue: #7aa2f7;
  --dsk-red: #f0666f;
  --dsk-mono: "SFMono-Regular", ui-monospace, "JetBrains Mono", Consolas, "Liberation Mono", monospace;
  font: 12px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
:host * { box-sizing: border-box; }
:host [hidden] { display: none !important; }
:host details {
  width: min(92vw, 33rem);
  max-height: min(74vh, 38rem);
  overflow: auto;
  border: 1px solid var(--dsk-border);
  border-radius: 0.75rem;
  background: var(--dsk-bg);
  color: var(--dsk-text);
  box-shadow: 0 24px 70px -16px rgb(0 0 0 / 85%);
}
:host details:not([open]) { width: auto; }
:host summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  cursor: pointer;
  padding: 0.8rem 1rem;
  list-style: none;
  user-select: none;
  transition: background 0.12s ease;
}
:host summary:hover { background: var(--dsk-surface); }
:host summary::-webkit-details-marker { display: none; }
:host .dsk-debug-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--dsk-text);
}
:host .dsk-debug-pill:first-of-type { margin-left: auto; }
:host .dsk-debug-pill {
  color: var(--dsk-muted);
  font-size: 11px;
  font-family: var(--dsk-mono);
  font-variant-numeric: tabular-nums;
}
:host .dsk-debug-pill[data-kind="warn"] {
  color: var(--dsk-red);
  font-weight: 600;
}
:host .dsk-debug-body {
  display: grid;
  gap: 1.1rem;
  padding: 1rem;
  border-top: 1px solid var(--dsk-border);
}
:host .dsk-debug-controls {
  display: flex;
  gap: 0.45rem;
  align-items: stretch;
}
:host .dsk-debug-controls input { flex: 1 1 auto; min-width: 0; }
:host .dsk-debug-tabs {
  display: flex;
  gap: 0.3rem;
  align-items: center;
  padding: 0.3rem;
  border: 1px solid var(--dsk-border);
  border-radius: 0.6rem;
  background: var(--dsk-surface);
}
:host input,
:host button {
  border: 1px solid var(--dsk-border);
  border-radius: 0.5rem;
  background: var(--dsk-surface);
  color: var(--dsk-text);
  font: inherit;
  padding: 0.45rem 0.65rem;
  transition: border-color 0.12s ease, background 0.12s ease, color 0.12s ease;
}
:host input { flex: 1 1 12rem; background: var(--dsk-surface-2); }
:host input::placeholder { color: var(--dsk-faint); }
:host input:focus-visible {
  outline: none;
  border-color: var(--dsk-border-strong);
}
:host .dsk-debug-controls button {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  padding: 0;
  color: var(--dsk-muted);
  background: var(--dsk-surface-2);
}
:host .dsk-debug-controls button:hover {
  color: var(--dsk-text);
  border-color: var(--dsk-border-strong);
  background: #1f1f1f;
}
:host .dsk-debug-controls button svg { display: block; }
:host .dsk-debug-tabs button {
  flex: 1;
  cursor: pointer;
  font-weight: 600;
  border-color: transparent;
  background: transparent;
  color: var(--dsk-muted);
}
:host .dsk-debug-tabs button:hover:not([aria-selected]:not([aria-selected="false"])) {
  color: var(--dsk-text);
}
:host .dsk-debug-tabs button[aria-selected]:not([aria-selected="false"]) {
  background: var(--dsk-surface-2);
  color: #fff;
}
:host .dsk-debug-controls button[aria-pressed]:not([aria-pressed="false"]) {
  border-color: var(--dsk-border-strong);
  background: var(--dsk-surface-2);
  color: var(--dsk-text);
}
:host .dsk-debug-panel { display: grid; gap: 0.6rem; }
:host h3 {
  margin: 0;
  color: var(--dsk-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
:host pre {
  max-height: 18rem;
  overflow: auto;
  margin: 0;
  border: 1px solid var(--dsk-border);
  border-radius: 0.5rem;
  background: var(--dsk-surface-2);
  color: var(--dsk-text);
  padding: 0.75rem 0.85rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: 11px/1.6 var(--dsk-mono);
}
:host .dsk-debug-events {
  display: grid;
  gap: 0.45rem;
}
:host .dsk-debug-event {
  position: static;
  width: auto;
  max-height: none;
  overflow: hidden;
  border: 1px solid var(--dsk-border);
  border-radius: 0.5rem;
  background: var(--dsk-surface-2);
  box-shadow: none;
}
:host .dsk-debug-event[open] { border-color: var(--dsk-border-strong); }
:host .dsk-debug-event summary {
  flex-wrap: nowrap;
  min-width: 0;
  padding: 0.55rem 0.7rem;
  border: 0;
  font-weight: 500;
  gap: 0.6rem;
  font-family: var(--dsk-mono);
  font-size: 11px;
}
:host .dsk-debug-event summary:hover { background: #1f1f1f; }
:host .dsk-debug-event[open] summary { border-bottom: 1px solid var(--dsk-border); }
:host .dsk-debug-event pre {
  max-height: 14rem;
  border: 0;
  border-radius: 0;
  background: var(--dsk-bg);
}
:host .dsk-debug-event pre[data-content="html"] { color: #d5d5d5; }
:host .dsk-debug-divider { border-top: 1px solid var(--dsk-border); }
:host .dsk-debug-time {
  flex: 0 0 auto;
  color: var(--dsk-faint);
  font-variant-numeric: tabular-nums;
}
:host .dsk-debug-source {
  flex: 1 1 auto;
  min-width: 0;
  margin-left: auto;
  overflow: hidden;
  color: var(--dsk-muted);
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}
:host .dsk-debug-empty {
  margin: 0;
  padding: 1.75rem 0.75rem;
  text-align: center;
  color: var(--dsk-faint);
}
:host .dsk-debug-kind { flex: 0 0 auto; font-weight: 600; }
:host .dsk-debug-kind[data-kind="signal"] { color: var(--dsk-add); }
:host .dsk-debug-kind[data-kind="fetch"] { color: var(--dsk-blue); }
:host .dsk-debug-timeline { display: grid; gap: 0.7rem; }
:host .dsk-slider { display: grid; gap: 0.6rem; padding: 0.35rem 0; }
:host .dsk-timeline-range {
  width: 100%;
  padding: 0;
  accent-color: var(--dsk-blue);
  cursor: pointer;
}
:host .dsk-timeline-range:disabled { cursor: default; opacity: 0.5; }
:host .dsk-debug-controls button.dsk-debug-live { color: var(--dsk-red); }
:host .dsk-debug-controls button.dsk-debug-live:hover { color: var(--dsk-red); }
:host .dsk-debug-timeline-status {
  margin: 0;
  font: 11px/1.5 var(--dsk-mono);
  font-variant-numeric: tabular-nums;
  color: var(--dsk-muted);
}
:host ::-webkit-scrollbar { width: 9px; height: 9px; }
:host ::-webkit-scrollbar-thumb {
  background: #262626;
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
:host ::-webkit-scrollbar-thumb:hover { background: #383838; background-clip: padding-box; }
:host ::-webkit-scrollbar-track { background: transparent; }
`

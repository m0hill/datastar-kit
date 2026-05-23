import type { HtmlChild } from "datastar-kit"

export const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

export const pageHead = [
  <meta name="viewport" content="width=device-width, initial-scale=1" />,
  <script type="module" src={DATASTAR_RUNTIME} />,
  <style>{`
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f7f9; color: #1f2328; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    button, input, textarea, select { font: inherit; }
    button { border: 0; border-radius: 6px; background: #24292f; color: white; padding: 0.55rem 0.8rem; cursor: pointer; }
    button.secondary { background: #eef1f4; color: #24292f; }
    input, textarea, select { width: 100%; border: 1px solid #d7dce1; border-radius: 6px; padding: 0.55rem 0.65rem; background: white; }
    textarea { min-height: 5rem; resize: vertical; }
    label { display: grid; gap: 0.35rem; color: #57606a; font-size: 0.85rem; font-weight: 600; }
    small.error { color: #c93c37; min-height: 1rem; }
    a { color: inherit; }
    .auth { min-height: 100vh; display: grid; place-items: center; padding: 2rem; }
    .auth-panel { width: min(420px, 100%); background: white; border: 1px solid #d7dce1; border-radius: 8px; padding: 1.25rem; display: grid; gap: 1rem; box-shadow: 0 10px 24px rgb(31 35 40 / 8%); }
    .auth-panel h1 { margin: 0; font-size: 1.4rem; }
    .auth-panel form, .stack { display: grid; gap: 0.85rem; }
    .shell { min-height: 100vh; display: grid; grid-template-columns: 250px 1fr 360px; }
    .sidebar { background: #20242a; color: white; padding: 1rem; display: grid; align-content: start; gap: 1rem; }
    .sidebar h1 { margin: 0; font-size: 1.1rem; }
    .sidebar form { display: grid; gap: 0.6rem; }
    .sidebar input, .sidebar textarea { background: #2b3038; border-color: #424a55; color: white; }
    .main { padding: 1rem; overflow: auto; }
    .toolbar { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin-bottom: 1rem; }
    .toolbar h2 { margin: 0; font-size: 1.35rem; }
    .board { display: grid; grid-template-columns: repeat(5, minmax(190px, 1fr)); gap: 0.75rem; align-items: start; }
    .column { display: grid; gap: 0.5rem; }
    .column h3 { margin: 0; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0; color: #57606a; }
    .issue-card { display: grid; gap: 0.45rem; background: white; border: 1px solid #d7dce1; border-radius: 8px; padding: 0.75rem; text-align: left; color: #24292f; box-shadow: 0 1px 2px rgb(31 35 40 / 5%); }
    .issue-card button { text-align: left; padding: 0; color: inherit; background: transparent; }
    .meta { display: flex; flex-wrap: wrap; gap: 0.35rem; color: #57606a; font-size: 0.78rem; }
    .pill { border: 1px solid #d7dce1; border-radius: 999px; padding: 0.1rem 0.45rem; background: #f6f7f9; }
    .panel { border-left: 1px solid #d7dce1; background: white; padding: 1rem; overflow: auto; }
    .panel h2, .panel h3 { margin-top: 0; }
    .issue-form { background: white; border: 1px solid #d7dce1; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .comment { border-top: 1px solid #eef1f4; padding: 0.75rem 0; }
    @media (max-width: 980px) { .shell { grid-template-columns: 1fr; } .sidebar, .panel { border: 0; } .board { grid-template-columns: 1fr; } }
  `}</style>
]

export const Empty = (props: { children: HtmlChild }) => <p class="meta">{props.children}</p>

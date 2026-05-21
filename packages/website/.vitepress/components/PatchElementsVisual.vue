<script setup lang="ts">
import { computed, ref } from "vue"

type PatchMode =
  | "outer"
  | "inner"
  | "replace"
  | "prepend"
  | "append"
  | "before"
  | "after"
  | "remove"

interface DomLine {
  readonly text: string
  readonly depth: number
  readonly tone?: "target" | "payload" | "muted" | "changed"
  readonly badge?: string
}

interface ModeInfo {
  readonly mode: PatchMode
  readonly title: string
  readonly summary: string
  readonly selector: string
  readonly payloadLines: readonly string[]
  readonly resultLines: readonly DomLine[]
  readonly useWhen: string
  readonly remember: string
  readonly code: string
}

const beforeLines: readonly DomLine[] = [
  { depth: 0, text: '<main id="app">', tone: "muted" },
  { depth: 1, text: '<nav id="filters">...</nav>', tone: "muted" },
  { depth: 1, text: '<section id="target" class="panel">', tone: "target", badge: "matched target" },
  { depth: 2, text: "<h2>Current view</h2>" },
  { depth: 2, text: "<p>Rendered on page load.</p>" },
  { depth: 1, text: "</section>", tone: "target" },
  { depth: 1, text: '<footer id="status">Idle</footer>', tone: "muted" },
  { depth: 0, text: "</main>", tone: "muted" }
]

const sameIdPayload = [
  '<section id="target" class="panel is-live">',
  "  <h2>Server view</h2>",
  "  <p>Fresh HTML from the handler.</p>",
  "</section>"
] as const

const childrenPayload = [
  "<h2>Server view</h2>",
  "<p>Only the children are patched.</p>"
] as const

const siblingPayload = [
  '<aside id="notice" class="notice">',
  "  <p>Saved by the server.</p>",
  "</aside>"
] as const

const replacementPayload = [
  '<article id="replacement" class="panel">',
  "  <h2>Replacement node</h2>",
  "  <p>The old target is discarded.</p>",
  "</article>"
] as const

const modes: Record<PatchMode, ModeInfo> = {
  outer: {
    mode: "outer",
    title: "Morph the matched element itself",
    summary: "The default mode. Datastar matches the returned top-level element by id and morphs the existing element.",
    selector: "No selector needed when the payload has a stable top-level id.",
    payloadLines: sameIdPayload,
    resultLines: [
      { depth: 0, text: '<main id="app">', tone: "muted" },
      { depth: 1, text: '<nav id="filters">...</nav>', tone: "muted" },
      { depth: 1, text: '<section id="target" class="panel is-live">', tone: "changed", badge: "morphed target" },
      { depth: 2, text: "<h2>Server view</h2>", tone: "payload" },
      { depth: 2, text: "<p>Fresh HTML from the handler.</p>", tone: "payload" },
      { depth: 1, text: "</section>", tone: "changed" },
      { depth: 1, text: '<footer id="status">Idle</footer>', tone: "muted" },
      { depth: 0, text: "</main>", tone: "muted" }
    ],
    useWhen: "Ordinary component refreshes, live stream snapshots, and reconnect-safe current-state rendering.",
    remember: "This is the mode to reach for first. Keep ids stable on top-level patch boundaries.",
    code: "reply.patch(<Panel />)"
  },
  inner: {
    mode: "inner",
    title: "Morph only the target's children",
    summary: "The selected element stays in place, including its outer tag and attributes. Its children are patched.",
    selector: 'Selector required: data: selector #target',
    payloadLines: childrenPayload,
    resultLines: [
      { depth: 0, text: '<main id="app">', tone: "muted" },
      { depth: 1, text: '<nav id="filters">...</nav>', tone: "muted" },
      { depth: 1, text: '<section id="target" class="panel">', tone: "target", badge: "outer shell kept" },
      { depth: 2, text: "<h2>Server view</h2>", tone: "payload" },
      { depth: 2, text: "<p>Only the children are patched.</p>", tone: "payload" },
      { depth: 1, text: "</section>", tone: "target" },
      { depth: 1, text: '<footer id="status">Idle</footer>', tone: "muted" },
      { depth: 0, text: "</main>", tone: "muted" }
    ],
    useWhen: "A layout slot, modal slot, or panel frame should remain while its contents change.",
    remember: "The payload should be the children you want inside the selected target, not the target itself.",
    code: 'reply.patch(<PanelBody />, { selector: "#target", mode: "inner" })'
  },
  replace: {
    mode: "replace",
    title: "Replace the selected element",
    summary: "The selected element is removed and the payload is inserted in the same position without morphing.",
    selector: 'Selector used here: data: selector #target',
    payloadLines: replacementPayload,
    resultLines: [
      { depth: 0, text: '<main id="app">', tone: "muted" },
      { depth: 1, text: '<nav id="filters">...</nav>', tone: "muted" },
      { depth: 1, text: '<article id="replacement" class="panel">', tone: "payload", badge: "new element" },
      { depth: 2, text: "<h2>Replacement node</h2>", tone: "payload" },
      { depth: 2, text: "<p>The old target is discarded.</p>", tone: "payload" },
      { depth: 1, text: "</article>", tone: "payload" },
      { depth: 1, text: '<footer id="status">Idle</footer>', tone: "muted" },
      { depth: 0, text: "</main>", tone: "muted" }
    ],
    useWhen: "You intentionally want a hard swap instead of a morph.",
    remember: "State preserved by morphing is not the goal here. Prefer outer for normal updates.",
    code: 'reply.patch(<Replacement />, { selector: "#target", mode: "replace" })'
  },
  prepend: {
    mode: "prepend",
    title: "Insert as the first child",
    summary: "The selected target remains. The payload becomes the first child inside it.",
    selector: 'Selector required: data: selector #target',
    payloadLines: siblingPayload,
    resultLines: [
      { depth: 0, text: '<main id="app">', tone: "muted" },
      { depth: 1, text: '<nav id="filters">...</nav>', tone: "muted" },
      { depth: 1, text: '<section id="target" class="panel">', tone: "target", badge: "container kept" },
      { depth: 2, text: '<aside id="notice" class="notice">', tone: "payload", badge: "first child" },
      { depth: 3, text: "<p>Saved by the server.</p>", tone: "payload" },
      { depth: 2, text: "</aside>", tone: "payload" },
      { depth: 2, text: "<h2>Current view</h2>" },
      { depth: 2, text: "<p>Rendered on page load.</p>" },
      { depth: 1, text: "</section>", tone: "target" },
      { depth: 1, text: '<footer id="status">Idle</footer>', tone: "muted" },
      { depth: 0, text: "</main>", tone: "muted" }
    ],
    useWhen: "Newest-first feeds, alerts, or list rows should appear before existing children.",
    remember: "Target a container. The payload is inserted inside that container.",
    code: 'reply.patch(<Notice />, { selector: "#target", mode: "prepend" })'
  },
  append: {
    mode: "append",
    title: "Insert as the last child",
    summary: "The selected target remains. The payload becomes the last child inside it.",
    selector: 'Selector required: data: selector #target',
    payloadLines: siblingPayload,
    resultLines: [
      { depth: 0, text: '<main id="app">', tone: "muted" },
      { depth: 1, text: '<nav id="filters">...</nav>', tone: "muted" },
      { depth: 1, text: '<section id="target" class="panel">', tone: "target", badge: "container kept" },
      { depth: 2, text: "<h2>Current view</h2>" },
      { depth: 2, text: "<p>Rendered on page load.</p>" },
      { depth: 2, text: '<aside id="notice" class="notice">', tone: "payload", badge: "last child" },
      { depth: 3, text: "<p>Saved by the server.</p>", tone: "payload" },
      { depth: 2, text: "</aside>", tone: "payload" },
      { depth: 1, text: "</section>", tone: "target" },
      { depth: 1, text: '<footer id="status">Idle</footer>', tone: "muted" },
      { depth: 0, text: "</main>", tone: "muted" }
    ],
    useWhen: "Adding rows to a list, messages to a thread, or details to an existing region.",
    remember: "Target the parent container, not the item that should come before the new payload.",
    code: 'reply.patch(<TodoItem todo={todo} />, { selector: "#todos", mode: "append" })'
  },
  before: {
    mode: "before",
    title: "Insert before the target",
    summary: "The payload is inserted as a sibling immediately before the selected target.",
    selector: 'Selector required: data: selector #target',
    payloadLines: siblingPayload,
    resultLines: [
      { depth: 0, text: '<main id="app">', tone: "muted" },
      { depth: 1, text: '<nav id="filters">...</nav>', tone: "muted" },
      { depth: 1, text: '<aside id="notice" class="notice">', tone: "payload", badge: "sibling before" },
      { depth: 2, text: "<p>Saved by the server.</p>", tone: "payload" },
      { depth: 1, text: "</aside>", tone: "payload" },
      { depth: 1, text: '<section id="target" class="panel">', tone: "target" },
      { depth: 2, text: "<h2>Current view</h2>" },
      { depth: 2, text: "<p>Rendered on page load.</p>" },
      { depth: 1, text: "</section>", tone: "target" },
      { depth: 1, text: '<footer id="status">Idle</footer>', tone: "muted" },
      { depth: 0, text: "</main>", tone: "muted" }
    ],
    useWhen: "A banner, validation summary, or marker belongs directly before a known element.",
    remember: "The payload is a sibling of the target, not a child.",
    code: 'reply.patch(<Notice />, { selector: "#target", mode: "before" })'
  },
  after: {
    mode: "after",
    title: "Insert after the target",
    summary: "The payload is inserted as a sibling immediately after the selected target.",
    selector: 'Selector required: data: selector #target',
    payloadLines: siblingPayload,
    resultLines: [
      { depth: 0, text: '<main id="app">', tone: "muted" },
      { depth: 1, text: '<nav id="filters">...</nav>', tone: "muted" },
      { depth: 1, text: '<section id="target" class="panel">', tone: "target" },
      { depth: 2, text: "<h2>Current view</h2>" },
      { depth: 2, text: "<p>Rendered on page load.</p>" },
      { depth: 1, text: "</section>", tone: "target" },
      { depth: 1, text: '<aside id="notice" class="notice">', tone: "payload", badge: "sibling after" },
      { depth: 2, text: "<p>Saved by the server.</p>", tone: "payload" },
      { depth: 1, text: "</aside>", tone: "payload" },
      { depth: 1, text: '<footer id="status">Idle</footer>', tone: "muted" },
      { depth: 0, text: "</main>", tone: "muted" }
    ],
    useWhen: "An inline detail, message, or validation text belongs directly after a known element.",
    remember: "The target stays where it is. The payload is a following sibling.",
    code: 'reply.patch(<Notice />, { selector: "#target", mode: "after" })'
  },
  remove: {
    mode: "remove",
    title: "Delete the selected target",
    summary: "The selected element is removed from the DOM. Datastar Kit omits the elements payload for this mode.",
    selector: 'Selector required: data: selector #target',
    payloadLines: [],
    resultLines: [
      { depth: 0, text: '<main id="app">', tone: "muted" },
      { depth: 1, text: '<nav id="filters">...</nav>', tone: "muted" },
      { depth: 1, text: '<footer id="status">Idle</footer>', tone: "muted" },
      { depth: 0, text: "</main>", tone: "muted" }
    ],
    useWhen: "Clearing empty states, dismissing toast elements, or removing stale rows.",
    remember: "Send a selector and mode remove. Do not send placeholder HTML just to delete a node.",
    code: 'reply.patch("", { selector: "#target", mode: "remove" })'
  }
}

const modeOrder: readonly PatchMode[] = ["outer", "inner", "replace", "prepend", "append", "before", "after", "remove"]
const activeModeName = ref<PatchMode>("outer")
const activeMode = computed(() => modes[activeModeName.value])

const eventLines = computed(() => {
  const lines = ["event: datastar-patch-elements"]

  if (activeModeName.value !== "outer") {
    lines.push("data: selector #target")
    lines.push(`data: mode ${activeModeName.value}`)
  }

  if (activeModeName.value === "remove") {
    return lines
  }

  for (const line of activeMode.value.payloadLines) {
    lines.push(`data: elements ${line}`)
  }

  return lines
})
</script>

<template>
  <div class="patch-visual">
    <section class="patch-flow" aria-labelledby="patch-flow-title">
      <div class="patch-flow__heading">
        <p class="patch-eyebrow">Browser update path</p>
        <h2 id="patch-flow-title">From action to DOM patch</h2>
      </div>

      <div class="flow-grid">
        <article class="flow-step">
          <span class="flow-step__number">1</span>
          <h3>User event</h3>
          <p>A Datastar attribute runs an action such as <code>@post('/save')</code>.</p>
        </article>

        <article class="flow-step">
          <span class="flow-step__number">2</span>
          <h3>Server render</h3>
          <p>The handler reads inputs, changes backend state, and renders HTML.</p>
        </article>

        <article class="flow-step">
          <span class="flow-step__number">3</span>
          <h3>SSE event</h3>
          <p><code>reply.patch(...)</code> frames the HTML as <code>datastar-patch-elements</code>.</p>
        </article>

        <article class="flow-step">
          <span class="flow-step__number">4</span>
          <h3>DOM operation</h3>
          <p>Datastar finds the target and applies the selected patch mode.</p>
        </article>
      </div>
    </section>

    <section class="mode-lab" aria-labelledby="mode-lab-title">
      <div class="mode-lab__intro">
        <div>
          <p class="patch-eyebrow">Patch mode explorer</p>
          <h2 id="mode-lab-title">Select a mode to see the exact target, payload, and result</h2>
        </div>
        <p>
          The same starting DOM is used for every mode. The yellow line is the matched target. The green lines are
          server-rendered payload inserted or morphed by Datastar.
        </p>
      </div>

      <div class="mode-tabs" role="tablist" aria-label="Patch elements modes">
        <button
          v-for="mode in modeOrder"
          :key="mode"
          type="button"
          class="mode-tab"
          :class="{ 'mode-tab--active': activeModeName === mode }"
          :aria-selected="activeModeName === mode"
          :aria-controls="`patch-mode-${mode}`"
          role="tab"
          @click="activeModeName = mode"
        >
          {{ mode }}
        </button>
      </div>

      <div :id="`patch-mode-${activeMode.mode}`" class="mode-summary" role="tabpanel">
        <div>
          <p class="patch-eyebrow">mode: {{ activeMode.mode }}</p>
          <h3>{{ activeMode.title }}</h3>
          <p>{{ activeMode.summary }}</p>
        </div>
        <div class="mode-contracts" aria-label="Mode contract">
          <span>{{ activeMode.selector }}</span>
          <span v-if="activeMode.mode === 'remove'">No elements payload is sent.</span>
          <span v-else>Payload is parsed as HTML elements.</span>
        </div>
      </div>

      <div class="patch-workbench">
        <article class="visual-panel">
          <div class="visual-panel__header">
            <span>Before</span>
            <strong>Browser DOM</strong>
          </div>
          <div class="dom-tree" aria-label="DOM before patch">
            <div
              v-for="(line, index) in beforeLines"
              :key="`before-${index}`"
              class="dom-line"
              :class="line.tone ? `dom-line--${line.tone}` : undefined"
              :style="{ paddingLeft: `${line.depth * 18 + 10}px` }"
            >
              <code>{{ line.text }}</code>
              <span v-if="line.badge" class="dom-badge">{{ line.badge }}</span>
            </div>
          </div>
        </article>

        <article class="visual-panel visual-panel--event">
          <div class="visual-panel__header">
            <span>Patch</span>
            <strong>SSE event</strong>
          </div>
          <pre class="event-preview"><code>{{ eventLines.join("\n") }}</code></pre>
          <div class="payload-preview">
            <span>Datastar Kit</span>
            <code>{{ activeMode.code }}</code>
          </div>
        </article>

        <article class="visual-panel">
          <div class="visual-panel__header">
            <span>After</span>
            <strong>Updated DOM</strong>
          </div>
          <div class="dom-tree" aria-label="DOM after patch">
            <div
              v-for="(line, index) in activeMode.resultLines"
              :key="`${activeMode.mode}-${index}`"
              class="dom-line"
              :class="line.tone ? `dom-line--${line.tone}` : undefined"
              :style="{ paddingLeft: `${line.depth * 18 + 10}px` }"
            >
              <code>{{ line.text }}</code>
              <span v-if="line.badge" class="dom-badge">{{ line.badge }}</span>
            </div>
          </div>
        </article>
      </div>

      <div class="mode-notes">
        <div>
          <span>Use when</span>
          <p>{{ activeMode.useWhen }}</p>
        </div>
        <div>
          <span>Remember</span>
          <p>{{ activeMode.remember }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.patch-visual {
  --patch-accent: #0f766e;
  --patch-accent-strong: #115e59;
  --patch-target: #c2410c;
  --patch-payload: #15803d;
  --patch-changed: #6d28d9;
  --patch-panel: var(--vp-c-bg-soft);
  --patch-line: var(--vp-c-divider);
  display: grid;
  gap: 24px;
  margin: 28px 0;
}

.patch-flow,
.mode-lab {
  border: 1px solid var(--patch-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
  box-shadow: 0 16px 42px rgb(15 23 42 / 8%);
}

.patch-flow {
  padding: 18px;
}

.patch-flow__heading,
.mode-lab__intro {
  display: grid;
  gap: 8px;
}

.patch-flow h2,
.mode-lab h2,
.mode-summary h3 {
  margin: 0;
  line-height: 1.2;
}

.patch-flow p,
.mode-lab p {
  margin: 0;
}

.patch-eyebrow {
  color: var(--patch-accent-strong);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.flow-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.flow-step {
  min-height: 148px;
  border: 1px solid var(--patch-line);
  border-radius: 8px;
  background: var(--patch-panel);
  padding: 14px;
}

.flow-step__number {
  display: inline-grid;
  width: 28px;
  height: 28px;
  margin-bottom: 16px;
  place-items: center;
  border-radius: 999px;
  background: var(--patch-accent);
  color: white;
  font-size: 13px;
  font-weight: 700;
}

.flow-step h3 {
  margin: 0 0 8px;
  font-size: 16px;
}

.flow-step p {
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.55;
}

.mode-lab {
  overflow: hidden;
}

.mode-lab__intro {
  grid-template-columns: minmax(0, 1.2fr) minmax(240px, 0.8fr);
  padding: 20px;
  border-bottom: 1px solid var(--patch-line);
  background: color-mix(in srgb, var(--patch-accent) 5%, var(--vp-c-bg));
}

.mode-lab__intro > p {
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.6;
}

.mode-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 20px 0;
}

.mode-tab {
  min-height: 36px;
  border: 1px solid var(--patch-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 650;
  padding: 7px 11px;
}

.mode-tab:hover {
  border-color: var(--patch-accent);
}

.mode-tab--active {
  border-color: var(--patch-accent);
  background: var(--patch-accent);
  color: white;
}

.mode-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.52fr);
  gap: 18px;
  padding: 18px 20px;
  align-items: start;
}

.mode-summary p {
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.mode-contracts {
  display: grid;
  gap: 8px;
}

.mode-contracts span,
.payload-preview,
.mode-notes div {
  border: 1px solid var(--patch-line);
  border-radius: 8px;
  background: var(--patch-panel);
}

.mode-contracts span {
  display: block;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.45;
  padding: 10px 12px;
}

.patch-workbench {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 0 20px 20px;
}

.visual-panel {
  min-width: 0;
  border: 1px solid var(--patch-line);
  border-radius: 8px;
  background: var(--patch-panel);
  overflow: hidden;
}

.visual-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--patch-line);
  background: var(--vp-c-bg);
  padding: 10px 12px;
}

.visual-panel__header span {
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.visual-panel__header strong {
  font-size: 13px;
}

.dom-tree {
  display: grid;
  gap: 6px;
  padding: 12px;
}

.dom-line {
  display: flex;
  min-height: 32px;
  min-width: 0;
  align-items: center;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--patch-line) 70%, transparent);
  border-left: 4px solid transparent;
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 12px;
  line-height: 1.35;
}

.dom-line code {
  overflow-x: auto;
  white-space: nowrap;
}

.dom-line--muted {
  color: var(--vp-c-text-2);
}

.dom-line--target {
  border-left-color: var(--patch-target);
  background: color-mix(in srgb, var(--patch-target) 9%, var(--vp-c-bg));
}

.dom-line--payload {
  border-left-color: var(--patch-payload);
  background: color-mix(in srgb, var(--patch-payload) 9%, var(--vp-c-bg));
}

.dom-line--changed {
  border-left-color: var(--patch-changed);
  background: color-mix(in srgb, var(--patch-changed) 9%, var(--vp-c-bg));
}

.dom-badge {
  flex: none;
  border-radius: 999px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
}

.event-preview {
  min-height: 156px;
  margin: 0;
  border-radius: 0;
  background: #111827;
  color: #f8fafc;
  overflow-x: auto;
  padding: 14px;
  white-space: pre;
}

.event-preview code {
  color: inherit;
}

.payload-preview {
  display: grid;
  gap: 6px;
  margin: 12px;
  padding: 12px;
}

.payload-preview span,
.mode-notes span {
  color: var(--patch-accent-strong);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.payload-preview code {
  overflow-wrap: anywhere;
  white-space: normal;
}

.mode-notes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 0 20px 20px;
}

.mode-notes div {
  padding: 14px;
}

.mode-notes p {
  margin-top: 6px;
  color: var(--vp-c-text-2);
  line-height: 1.55;
}

@media (max-width: 960px) {
  .flow-grid,
  .patch-workbench,
  .mode-lab__intro,
  .mode-summary,
  .mode-notes {
    grid-template-columns: 1fr;
  }

  .flow-step {
    min-height: auto;
  }
}

@media (max-width: 520px) {
  .flow-grid {
    grid-template-columns: 1fr;
  }

  .patch-flow,
  .mode-lab__intro,
  .mode-summary,
  .patch-workbench,
  .mode-notes {
    padding-left: 12px;
    padding-right: 12px;
  }

  .mode-tabs {
    padding-left: 12px;
    padding-right: 12px;
  }

  .mode-tab {
    flex: 1 1 96px;
  }
}
</style>

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
  readonly note?: string
}

type DiffKind = "context" | "remove" | "add"

interface DomDiffLine extends DomLine {
  readonly kind: DiffKind
  readonly oldNumber?: number
  readonly newNumber?: number
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

const isSameDomLine = (left: DomLine, right: DomLine): boolean =>
  left.text === right.text && left.depth === right.depth

const buildDomDiff = (before: readonly DomLine[], after: readonly DomLine[]): readonly DomDiffLine[] => {
  const scores: number[][] = Array.from({ length: before.length + 1 }, () => Array(after.length + 1).fill(0))

  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      scores[i][j] = isSameDomLine(before[i], after[j])
        ? scores[i + 1][j + 1] + 1
        : Math.max(scores[i + 1][j], scores[i][j + 1])
    }
  }

  const diff: DomDiffLine[] = []
  let oldIndex = 0
  let newIndex = 0
  let oldNumber = 1
  let newNumber = 1

  while (oldIndex < before.length || newIndex < after.length) {
    if (
      oldIndex < before.length &&
      newIndex < after.length &&
      isSameDomLine(before[oldIndex], after[newIndex])
    ) {
      diff.push({
        ...before[oldIndex],
        kind: "context",
        oldNumber,
        newNumber
      })
      oldIndex += 1
      newIndex += 1
      oldNumber += 1
      newNumber += 1
      continue
    }

    if (
      oldIndex < before.length &&
      (newIndex >= after.length || scores[oldIndex + 1][newIndex] >= scores[oldIndex][newIndex + 1])
    ) {
      diff.push({
        ...before[oldIndex],
        kind: "remove",
        oldNumber
      })
      oldIndex += 1
      oldNumber += 1
      continue
    }

    diff.push({
      ...after[newIndex],
      kind: "add",
      newNumber
    })
    newIndex += 1
    newNumber += 1
  }

  return diff
}

const beforeLines: readonly DomLine[] = [
  { depth: 0, text: '<main id="app">', tone: "muted" },
  { depth: 1, text: '<nav id="filters">...</nav>', tone: "muted" },
  { depth: 1, text: '<section id="target" class="panel">', tone: "target", note: "matched target" },
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
      { depth: 1, text: '<section id="target" class="panel is-live">', tone: "changed", note: "morphed target" },
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
      { depth: 1, text: '<section id="target" class="panel">', tone: "target", note: "outer shell kept" },
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
      { depth: 1, text: '<article id="replacement" class="panel">', tone: "payload", note: "new element" },
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
      { depth: 1, text: '<section id="target" class="panel">', tone: "target", note: "container kept" },
      { depth: 2, text: '<aside id="notice" class="notice">', tone: "payload", note: "first child" },
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
      { depth: 1, text: '<section id="target" class="panel">', tone: "target", note: "container kept" },
      { depth: 2, text: "<h2>Current view</h2>" },
      { depth: 2, text: "<p>Rendered on page load.</p>" },
      { depth: 2, text: '<aside id="notice" class="notice">', tone: "payload", note: "last child" },
      { depth: 3, text: "<p>Saved by the server.</p>", tone: "payload" },
      { depth: 2, text: "</aside>", tone: "payload" },
      { depth: 1, text: "</section>", tone: "target" },
      { depth: 1, text: '<footer id="status">Idle</footer>', tone: "muted" },
      { depth: 0, text: "</main>", tone: "muted" }
    ],
    useWhen: "Adding rows to a list, messages to a thread, or details to an existing region.",
    remember: "Target the parent container, not the item that should come before the new payload.",
    code: 'reply.patch(<Notice />, { selector: "#target", mode: "append" })'
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
      { depth: 1, text: '<aside id="notice" class="notice">', tone: "payload", note: "sibling before" },
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
      { depth: 1, text: '<aside id="notice" class="notice">', tone: "payload", note: "sibling after" },
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
const domDiffLines = computed(() => buildDomDiff(beforeLines, activeMode.value.resultLines))

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
          The same starting DOM is used for every mode. Red rows leave the document, green rows enter it, and neutral
          rows are unchanged context around the patch.
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

        <article class="visual-panel visual-panel--diff">
          <div class="visual-panel__header">
            <span>DOM change</span>
            <strong>mode: {{ activeMode.mode }}</strong>
          </div>
          <div class="diff-table" aria-label="DOM diff after patch">
            <div
              v-for="(line, index) in domDiffLines"
              :key="`${activeMode.mode}-diff-${index}`"
              class="diff-row"
              :class="`diff-row--${line.kind}`"
            >
              <span class="diff-line-number">{{ line.oldNumber ?? '' }}</span>
              <span class="diff-line-number">{{ line.newNumber ?? '' }}</span>
              <span class="diff-marker">{{ line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' ' }}</span>
              <code class="diff-code" :style="{ paddingLeft: `${line.depth * 18}px` }">{{ line.text }}</code>
              <span v-if="line.note" class="diff-note">{{ line.note }}</span>
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
  --patch-accent: var(--vp-c-brand-1);
  --patch-accent-strong: var(--vp-c-brand-2);
  --patch-target: var(--vp-c-danger-1);
  --patch-payload: var(--vp-c-green-1);
  --patch-changed: var(--vp-c-purple-1);
  --patch-panel: var(--vp-c-bg-soft);
  --patch-line: var(--vp-c-divider);
  display: grid;
  gap: 24px;
  margin: 28px 0;
  font-family: var(--vp-font-family-base);
}

.patch-flow,
.mode-lab {
  border: 1px solid var(--patch-line);
  border-radius: 12px;
  background: var(--vp-c-bg);
}

.patch-flow {
  padding: 24px;
}

.patch-flow__heading,
.mode-lab__intro {
  display: grid;
  gap: 6px;
}

.patch-flow h2,
.mode-lab h2,
.mode-summary h3 {
  margin: 0;
  line-height: 1.25;
  font-weight: 600;
}

.patch-flow p,
.mode-lab p {
  margin: 0;
}

.patch-eyebrow {
  color: var(--patch-accent);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.flow-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.flow-step {
  border: 1px solid var(--patch-line);
  border-radius: 10px;
  background: var(--patch-panel);
  padding: 18px;
}

.flow-step__number {
  display: inline-flex;
  width: 28px;
  height: 28px;
  margin-bottom: 14px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--patch-accent);
  font-size: 13px;
  font-weight: 700;
}

.flow-step h3 {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
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
  padding: 24px;
  border-bottom: 1px solid var(--patch-line);
  background: var(--vp-c-bg-soft);
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
  padding: 20px 24px 0;
}

.mode-tab {
  min-height: 34px;
  border: 1px solid var(--patch-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.mode-tab:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.mode-tab--active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.mode-tab--active:hover {
  color: #fff;
}

.mode-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.52fr);
  gap: 20px;
  padding: 20px 24px;
  align-items: start;
}

.mode-summary p {
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.mode-contracts {
  display: grid;
  gap: 10px;
}

.mode-contracts span,
.payload-preview,
.mode-notes div {
  border: 1px solid var(--patch-line);
  border-radius: 10px;
  background: var(--patch-panel);
}

.mode-contracts span {
  display: block;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.5;
  padding: 10px 14px;
}

.patch-workbench {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  padding: 0 24px 24px;
}

.visual-panel {
  min-width: 0;
  border: 1px solid var(--patch-line);
  border-radius: 10px;
  background: var(--patch-panel);
  overflow: hidden;
}

.visual-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--patch-line);
  background: var(--vp-c-bg-alt);
  padding: 12px 16px;
}

.visual-panel__header span {
  color: var(--vp-c-text-2);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.visual-panel__header strong {
  font-size: 13px;
  font-weight: 600;
}

.diff-table {
  display: grid;
  overflow-x: auto;
  padding: 8px 0;
}

.diff-row {
  display: grid;
  grid-template-columns: 42px 42px 24px minmax(0, 1fr) auto;
  align-items: center;
  min-height: 30px;
  border-left: 3px solid transparent;
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.35;
}

.diff-row--context {
  color: var(--vp-c-text-2);
}

.diff-row--remove {
  border-left-color: var(--vp-c-danger-1);
  background: color-mix(in srgb, var(--vp-c-danger-1) 15%, var(--vp-c-bg));
}

.diff-row--add {
  border-left-color: var(--vp-c-green-1);
  background: color-mix(in srgb, var(--vp-c-green-1) 15%, var(--vp-c-bg));
}

.diff-line-number {
  height: 100%;
  border-right: 1px solid color-mix(in srgb, var(--patch-line) 72%, transparent);
  background: color-mix(in srgb, var(--vp-c-bg-soft) 80%, transparent);
  color: var(--vp-c-text-3);
  font-size: 12px;
  line-height: 30px;
  text-align: right;
  user-select: none;
  padding: 0 8px;
}

.diff-row--remove .diff-line-number {
  background: color-mix(in srgb, var(--vp-c-danger-1) 10%, var(--vp-c-bg));
}

.diff-row--add .diff-line-number {
  background: color-mix(in srgb, var(--vp-c-green-1) 10%, var(--vp-c-bg));
}

.diff-marker {
  color: var(--vp-c-text-3);
  font-weight: 800;
  text-align: center;
  user-select: none;
}

.diff-row--remove .diff-marker {
  color: var(--vp-c-danger-1);
}

.diff-row--add .diff-marker {
  color: var(--vp-c-green-1);
}

.diff-code {
  min-width: 0;
  overflow: hidden;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  text-overflow: ellipsis;
  white-space: pre;
}

.diff-note {
  justify-self: end;
  margin-right: 14px;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-base);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.diff-row--remove .diff-note {
  color: var(--vp-c-danger-1);
}

.diff-row--add .diff-note {
  color: var(--vp-c-green-1);
}

.event-preview {
  min-height: 120px;
  margin: 0;
  border-radius: 0;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  overflow-x: auto;
  padding: 16px;
  white-space: pre;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.6;
  border-bottom: 1px solid var(--patch-line);
}

.event-preview code {
  color: inherit;
  font-family: inherit;
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
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.payload-preview code {
  overflow-wrap: anywhere;
  white-space: normal;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-1);
}

.mode-notes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 0 24px 24px;
}

.mode-notes div {
  padding: 16px;
}

.mode-notes p {
  margin-top: 6px;
  color: var(--vp-c-text-2);
  line-height: 1.55;
}

@media (max-width: 960px) {
  .flow-grid,
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
    padding-left: 16px;
    padding-right: 16px;
  }

  .mode-tabs {
    padding-left: 16px;
    padding-right: 16px;
  }

  .mode-tab {
    flex: 1 1 96px;
  }
}
</style>

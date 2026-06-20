import type { HtmlChild } from "datastar-kit"

const RAMP = " ·:;+=*#@▓█"

const COLS = 168
const ROWS = 46
const ASPECT = 2.1

type Blob = { x: number; y: number; r: number; w: number }

const BLOBS: ReadonlyArray<Blob> = [
  { x: 0.15, y: 0.32, r: 0.34, w: 1.0 },
  { x: 0.8, y: 0.66, r: 0.4, w: 0.95 },
  { x: 0.58, y: 0.1, r: 0.22, w: 0.55 },
  { x: 0.93, y: 0.2, r: 0.26, w: 0.7 }
]

const sample = (u: number, v: number): number => {
  let value = 0
  for (const blob of BLOBS) {
    const dx = (u - blob.x) * ASPECT
    const dy = v - blob.y
    const d2 = dx * dx + dy * dy
    value += blob.w * Math.exp(-d2 / (2 * blob.r * blob.r))
  }
  value += 0.06 * Math.sin(u * 7 + v * 3)
  value += 0.05 * Math.sin(v * 9 - u * 2)
  return value
}

const buildArt = (): string => {
  const values: number[] = []
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const s = sample(x / (COLS - 1), y / (ROWS - 1))
      values.push(s)
      if (s < min) min = s
      if (s > max) max = s
    }
  }

  const span = max - min || 1
  const lastGlyph = RAMP.length - 1
  let out = ""
  let col = 0
  for (const value of values) {
    const t = (value - min) / span
    const idx = Math.min(lastGlyph, Math.max(0, Math.round(t * lastGlyph)))
    out += RAMP.charAt(idx)
    col += 1
    if (col === COLS) {
      out += "\n"
      col = 0
    }
  }
  return out
}

const ASCII_ART = buildArt()

export const AsciiBackdrop = (): HtmlChild => (
  <pre
    class="ascii-backdrop"
    aria-hidden="true"
  >
    {ASCII_ART}
  </pre>
)

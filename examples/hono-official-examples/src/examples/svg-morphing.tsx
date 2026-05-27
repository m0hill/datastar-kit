import { ds, event, reply } from "datastar-kit"
import { examplePage } from "../layout.js"
import { randomInt, sleep } from "../helpers.js"
import type { ExampleModule } from "../types.js"

const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"] as const

const color = () => colors[randomInt(0, colors.length - 1)] ?? colors[0]

const ColorSvg = ({ fill = "#ef4444" }: { readonly fill?: string }) => (
  <svg id="circle-demo" viewBox="0 0 100 100" class="morph-svg">
    <circle cx="50" cy="50" r="38" fill={fill}></circle>
  </svg>
)

const SizeSvg = ({ radius = 32 }: { readonly radius?: number }) => (
  <svg id="size-demo" viewBox="0 0 100 100" class="morph-svg">
    <circle cx="50" cy="50" r={radius} fill="#22c55e"></circle>
  </svg>
)

const ShapeSvg = ({ variant = 0 }: { readonly variant?: number }) => (
  <svg id="shape-demo" viewBox="0 0 100 100" class="morph-svg">
    {variant % 3 === 0 ? (
      <circle cx="50" cy="50" r="34" fill="#3b82f6"></circle>
    ) : variant % 3 === 1 ? (
      <rect x="22" y="22" width="56" height="56" rx="8" fill="#8b5cf6"></rect>
    ) : (
      <polygon points="50,15 85,82 15,82" fill="#f97316"></polygon>
    )}
  </svg>
)

const MultiSvg = () => (
  <svg id="multi-demo" viewBox="0 0 100 100" class="morph-svg">
    <circle cx="30" cy="30" r={randomInt(10, 24)} fill={color()}></circle>
    <circle cx="70" cy="30" r={randomInt(10, 24)} fill={color()}></circle>
    <circle cx="50" cy="70" r={randomInt(10, 24)} fill={color()}></circle>
  </svg>
)

const SvgMorphingDemo = () => (
  <div class="grid morph-grid">
    <section class="subdemo">
      <ColorSvg />
      <button class="info" {...ds.on("click", ds.get("/examples/svg_morphing/circle_color"))}>
        Change Color
      </button>
    </section>
    <section class="subdemo">
      <SizeSvg />
      <button class="info" {...ds.on("click", ds.get("/examples/svg_morphing/circle_size"))}>
        Change Size
      </button>
    </section>
    <section class="subdemo">
      <ShapeSvg />
      <button class="info" {...ds.on("click", ds.get("/examples/svg_morphing/shape_transform"))}>
        Change Shape
      </button>
    </section>
    <section class="subdemo">
      <MultiSvg />
      <button class="info" {...ds.on("click", ds.get("/examples/svg_morphing/multiple_elements"))}>
        Change Multiple
      </button>
    </section>
    <section class="subdemo">
      <svg id="animated-demo" viewBox="0 0 100 100" class="morph-svg">
        <circle cx="50" cy="50" r="24" fill="#16a34a"></circle>
      </svg>
      <button class="success" {...ds.on("click", ds.get("/examples/svg_morphing/animated_morph"))}>
        Animate Morph
      </button>
    </section>
  </div>
)

export const svgMorphingExample: ExampleModule = {
  slug: "svg_morphing",
  title: "SVG Morphing",
  summary: "Patches stable SVG ids so Datastar morphs vector elements in place.",
  source: "https://data-star.dev/examples/svg_morphing",
  register(app) {
    app.get("/examples/svg_morphing", () =>
      examplePage({
        title: "SVG Morphing",
        slug: "svg_morphing",
        summary: this.summary,
        source: this.source,
        children: <SvgMorphingDemo />
      })
    )

    app.get("/examples/svg_morphing/circle_color", () => reply.patch(<ColorSvg fill={color()} />))
    app.get("/examples/svg_morphing/circle_size", () =>
      reply.patch(<SizeSvg radius={randomInt(15, 45)} />)
    )
    app.get("/examples/svg_morphing/shape_transform", () =>
      reply.patch(<ShapeSvg variant={randomInt(0, 10)} />)
    )
    app.get("/examples/svg_morphing/multiple_elements", () => reply.patch(<MultiSvg />))
    app.get("/examples/svg_morphing/animated_morph", () =>
      reply.stream(
        (async function* () {
          for (const [radius, fill] of [
            [28, "#ef4444"],
            [42, "#f97316"],
            [34, "#eab308"],
            [22, "#22c55e"]
          ] as const) {
            yield event.patch(
              <svg id="animated-demo" viewBox="0 0 100 100" class="morph-svg">
                <circle cx="50" cy="50" r={radius} fill={fill}></circle>
              </svg>
            )
            await sleep(400)
          }
        })()
      )
    )
  }
}

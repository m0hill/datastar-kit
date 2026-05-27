import type { ExampleModule } from "./types.js"
import { activeSearchExample } from "./examples/active-search.js"
import { animationsExample } from "./examples/animations.js"
import { badAppleExample } from "./examples/bad-apple.js"
import { bulkUpdateExample } from "./examples/bulk-update.js"

export const examples: readonly ExampleModule[] = [
  activeSearchExample,
  animationsExample,
  badAppleExample,
  bulkUpdateExample
]

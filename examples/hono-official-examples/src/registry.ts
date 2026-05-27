import type { ExampleModule } from "./types.js"
import { activeSearchExample } from "./examples/active-search.js"
import { animationsExample } from "./examples/animations.js"
import { badAppleExample } from "./examples/bad-apple.js"
import { bulkUpdateExample } from "./examples/bulk-update.js"
import { clickToEditExample } from "./examples/click-to-edit.js"
import { clickToLoadExample } from "./examples/click-to-load.js"
import { customEventExample } from "./examples/custom-event.js"
import { customPluginExample } from "./examples/custom-plugin.js"
import { dbmonExample } from "./examples/dbmon.js"

export const examples: readonly ExampleModule[] = [
  activeSearchExample,
  animationsExample,
  badAppleExample,
  bulkUpdateExample,
  clickToEditExample,
  clickToLoadExample,
  customEventExample,
  customPluginExample,
  dbmonExample
]

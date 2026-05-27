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
import { deleteRowExample } from "./examples/delete-row.js"
import { editRowExample } from "./examples/edit-row.js"
import { eventBubblingExample } from "./examples/event-bubbling.js"
import { fileUploadExample } from "./examples/file-upload.js"
import { formDataExample } from "./examples/form-data.js"
import { infiniteScrollExample } from "./examples/infinite-scroll.js"
import { inlineValidationExample } from "./examples/inline-validation.js"
import { lazyLoadExample } from "./examples/lazy-load.js"
import { lazyTabsExample } from "./examples/lazy-tabs.js"

export const examples: readonly ExampleModule[] = [
  activeSearchExample,
  animationsExample,
  badAppleExample,
  bulkUpdateExample,
  clickToEditExample,
  clickToLoadExample,
  customEventExample,
  customPluginExample,
  dbmonExample,
  deleteRowExample,
  editRowExample,
  eventBubblingExample,
  fileUploadExample,
  formDataExample,
  infiniteScrollExample,
  inlineValidationExample,
  lazyLoadExample,
  lazyTabsExample
]

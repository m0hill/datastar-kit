import { ds } from "datastar-kit"
import type { User } from "../db/schema.js"
import type { Workspace } from "../features/linear-service.js"
import { appState } from "./state.js"
import { Board, IssueComposer, Sidebar } from "./workspace.js"
import { IssuePanel } from "./issue.js"

export const AppShell = (props: { user: User; workspace: Workspace }) => (
  <main class="min-h-screen grid grid-cols-1 lg:grid-cols-[260px_1fr_340px] bg-bg" {...appState.attrs()}>
    <div class="hidden lg:flex">
      <Sidebar user={props.user} workspace={props.workspace} />
    </div>
    <section class="p-5 lg:px-7 overflow-auto min-w-0">
      <div
        {...ds.onIntersect(ds.get("/app/live"), { once: true })}
        class="absolute w-px h-px overflow-hidden"
      ></div>
      <IssueComposer workspace={props.workspace} />
      <Board workspace={props.workspace} />
    </section>
    <IssuePanel detail={null} />
  </main>
)

import { ds } from "datastar-kit"
import type { User } from "../db/schema.js"
import type { Workspace } from "../features/linear-service.js"
import { appState } from "./state.js"
import { Board, IssueComposer, Sidebar } from "./workspace.js"
import { IssuePanel } from "./issue.js"

export const AppShell = (props: { user: User; workspace: Workspace }) => (
  <main class="shell" {...appState.attrs()}>
    <Sidebar user={props.user} workspace={props.workspace} />
    <section class="main">
      <div
        {...ds.onIntersect(ds.get("/app/live"), { once: true })}
        style="position:absolute;width:1px;height:1px;overflow:hidden"
      ></div>
      <IssueComposer workspace={props.workspace} />
      <Board workspace={props.workspace} />
    </section>
    <IssuePanel detail={null} />
  </main>
)

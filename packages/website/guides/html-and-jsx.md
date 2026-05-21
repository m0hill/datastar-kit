# HTML and JSX

Datastar Kit renders HTML on the server. The built-in HTML layer is intentionally small: HTML nodes, escaping, explicit unsafe HTML, prop merging, fragment rendering through child arrays, and the backing model for the JSX runtime.

## JSX setup

Use TypeScript's automatic JSX runtime:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "datastar-kit"
  }
}
```

Then write server-side view functions:

```tsx
import { ds, renderToString } from 'datastar-kit'

const view = <button type="button" {...ds.on('click', ds.post('/save'))}>Save</button>
const html = renderToString(view)
```

JSX here is a server rendering convenience, not a browser component lifecycle or virtual DOM runtime. Components should be plain synchronous view functions: load data in the handler or route loader, then pass the data into JSX.

## Layouts and nested views

Layouts are ordinary JSX functions. Put shared shell markup, navigation, scripts, and stable patch targets in a layout, then pass the page body through `children`.

```tsx
import { reply, type HtmlChild } from 'datastar-kit'

interface AppLayoutProps {
  title: string
  children?: HtmlChild
}

const AppLayout = (props: AppLayoutProps) => (
  <div id="app">
    <header>
      <a href="/">Acme</a>
      <nav>
        <a href="/projects">Projects</a>
        <a href="/settings">Settings</a>
      </nav>
    </header>

    <main id="page">
      <h1>{props.title}</h1>
      {props.children}
    </main>
  </div>
)

const ProjectsPage = (props: { projects: Project[] }) => (
  <AppLayout title="Projects">
    <ProjectList projects={props.projects} />
  </AppLayout>
)

return reply.page(<ProjectsPage projects={projects} />, {
  title: 'Projects',
  head: <script type="module" src={DATASTAR_CDN} />
})
```

Datastar Kit does not need a framework-owned layout system for this. Your router or handler chooses which page function to call, and page functions choose their own layouts.

## Named layout slots

Use normal props when a layout needs named regions such as a sidebar, toolbar, breadcrumbs, or actions. Slot props should use `HtmlChild` because they receive already-built server-rendered nodes.

```tsx
import type { HtmlChild } from 'datastar-kit'

interface DashboardLayoutProps {
  title: string
  sidebar?: HtmlChild
  toolbar?: HtmlChild
  children?: HtmlChild
}

const DashboardLayout = (props: DashboardLayoutProps) => (
  <main id="dashboard">
    <aside id="sidebar">{props.sidebar}</aside>

    <section id="dashboard-main">
      <header>
        <h1>{props.title}</h1>
        <div class="toolbar">{props.toolbar}</div>
      </header>

      <div id="dashboard-content">{props.children}</div>
    </section>
  </main>
)

const DashboardPage = (props: DashboardData) => (
  <DashboardLayout
    title="Dashboard"
    sidebar={<Sidebar user={props.user} />}
    toolbar={<DashboardToolbar />}
  >
    <ProjectList projects={props.projects} />
  </DashboardLayout>
)
```

The `id` attributes in the layout are useful patch boundaries. A Datastar action can update just the current content region without re-rendering the full page shell:

```tsx
return reply.patch(
  <ProjectList projects={projects} />,
  { selector: '#dashboard-content', mode: 'inner' }
)
```

For ordinary component replacement, prefer returning an element with a stable top-level `id` and omit `selector`. Use explicit selectors for container operations such as `inner`, `append`, `prepend`, or `remove`. See [Patch elements](patch-elements.md) for a guide to each mode.

## Loading data before rendering

Keep data loading outside JSX components. This keeps rendering deterministic, avoids hidden database calls during serialization, and lets handlers control errors, auth, parallelism, and cancellation.

```tsx
async function loadDashboard(request: Request) {
  const user = await requireUser(request)

  const [projects, notifications] = await Promise.all([
    db.projects.forUser(user.id),
    db.notifications.forUser(user.id)
  ])

  return { user, projects, notifications }
}

export async function dashboardRoute(request: Request): Promise<Response> {
  const data = await loadDashboard(request)
  return reply.page(
    <DashboardLayout title="Dashboard" sidebar={<Sidebar user={data.user} />}>
      <ProjectList projects={data.projects} />
      <Notifications items={data.notifications} />
    </DashboardLayout>,
    { title: 'Dashboard' }
  )
}
```

Avoid async JSX components:

```tsx
// Avoid: hides I/O inside rendering and would require async HTML serialization.
const Dashboard = async () => <main>{await loadSomething()}</main>
```

If one region is slow or live, render a shell first and patch that region through a Datastar action or stream:

```tsx
const DashboardShell = () => (
  <DashboardLayout title="Dashboard">
    <section id="stats" {...ds.init(ds.get('/dashboard/stats'))}>
      Loading stats...
    </section>
  </DashboardLayout>
)

export async function statsRoute(): Promise<Response> {
  const stats = await loadStats()
  return reply.patch(<StatsPanel stats={stats} />)
}
```

This keeps the core model simple: handlers load data, synchronous JSX renders HTML, and Datastar patches update deferred or changing regions.

For a complete small app using these patterns with Bun and Elysia, see `examples/elysia-layout` in the repository.

## Escaping and trust boundaries

Text and attribute values are escaped by default. Use `unsafeHtml(renderedHtml)` only for HTML that has already crossed your app's trust boundary, such as sanitized output or trusted renderer output.

```tsx
import { unsafeHtml } from 'datastar-kit'

const trusted = unsafeHtml('<strong>Already sanitized</strong>')
```

## Low-level HTML helpers

JSX is the primary authoring path. Low-level helpers are useful for tests, code generation, and non-JSX environments:

```ts
import { ds, h, mergeProps, renderToString } from 'datastar-kit'

const view = h(
  'button',
  mergeProps({ type: 'button' }, ds.on('click', ds.post('/save'))),
  'Save'
)

const html = renderToString(view)
```

Next: [Signals](signals.md). Related: [Actions and responses](actions-and-responses.md), [Security](security.md).

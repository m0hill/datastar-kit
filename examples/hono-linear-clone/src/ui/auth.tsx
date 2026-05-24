import { ds } from "datastar-kit"
import { authState } from "./state.js"

const ErrorText = (props: { path: Parameters<typeof ds.text>[0] }) => (
  <small class="text-danger text-[13px] font-medium min-h-[1rem]" {...ds.text(props.path)}></small>
)

export const LoginPage = () => (
  <main class="min-h-screen grid place-items-center p-6 bg-bg" {...authState.attrs()}>
    <section class="w-full max-w-[360px] bg-surface border border-border p-8 flex flex-col gap-5">
      <div>
        <h1 class="text-xl font-bold text-fg tracking-tight">Sign in</h1>
        <p class="text-fg-muted text-[13px] mt-1">Welcome back to your workspace</p>
      </div>
      <form class="flex flex-col gap-4" {...ds.on("submit", ds.post("/login"), { prevent: true })}>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Username
          <input
            class="w-full text-sm placeholder:text-fg-muted/50"
            autocomplete="username"
            placeholder="Enter username"
            {...ds.bind(authState.$.username)}
          />
          <ErrorText path={authState.$.errors.username} />
        </label>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Password
          <input
            class="w-full text-sm placeholder:text-fg-muted/50"
            type="password"
            autocomplete="current-password"
            placeholder="Enter password"
            {...ds.bind(authState.$.password)}
          />
          <ErrorText path={authState.$.errors.password} />
        </label>
        <ErrorText path={authState.$.errors.form} />
        <button type="submit" class="primary mt-1">Sign in</button>
      </form>
      <a href="/signup" class="text-fg-secondary text-[13px] font-medium hover:text-fg hover:underline transition-colors">
        Create an account
      </a>
    </section>
  </main>
)

export const SignupPage = () => (
  <main class="min-h-screen grid place-items-center p-6 bg-bg" {...authState.attrs()}>
    <section class="w-full max-w-[360px] bg-surface border border-border p-8 flex flex-col gap-5">
      <div>
        <h1 class="text-xl font-bold text-fg tracking-tight">Create account</h1>
        <p class="text-fg-muted text-[13px] mt-1">Get started with your new workspace</p>
      </div>
      <form class="flex flex-col gap-4" {...ds.on("submit", ds.post("/signup"), { prevent: true })}>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Name
          <input
            class="w-full text-sm placeholder:text-fg-muted/50"
            autocomplete="name"
            placeholder="Your name"
            {...ds.bind(authState.$.name)}
          />
          <ErrorText path={authState.$.errors.name} />
        </label>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Username
          <input
            class="w-full text-sm placeholder:text-fg-muted/50"
            autocomplete="username"
            placeholder="Choose a username"
            {...ds.bind(authState.$.username)}
          />
          <ErrorText path={authState.$.errors.username} />
        </label>
        <label class="flex flex-col gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fg-muted">
          Password
          <input
            class="w-full text-sm placeholder:text-fg-muted/50"
            type="password"
            autocomplete="new-password"
            placeholder="Create a password"
            {...ds.bind(authState.$.password)}
          />
          <ErrorText path={authState.$.errors.password} />
        </label>
        <ErrorText path={authState.$.errors.form} />
        <button type="submit" class="primary mt-1">Create account</button>
      </form>
      <a href="/login" class="text-fg-secondary text-[13px] font-medium hover:text-fg hover:underline transition-colors">
        Sign in instead
      </a>
    </section>
  </main>
)

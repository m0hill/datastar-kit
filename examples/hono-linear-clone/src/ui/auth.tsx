import { ds } from "datastar-kit"
import { authState } from "./state.js"

const ErrorText = (props: { path: Parameters<typeof ds.text>[0] }) => (
  <small class="error" {...ds.text(props.path)}></small>
)

export const LoginPage = () => (
  <main class="auth" {...authState.attrs()}>
    <section class="auth-panel">
      <h1>Sign in</h1>
      <form {...ds.on("submit", ds.post("/login"), { prevent: true })}>
        <label>
          Username
          <input autocomplete="username" {...ds.bind(authState.$.username)} />
          <ErrorText path={authState.$.errors.username} />
        </label>
        <label>
          Password
          <input
            type="password"
            autocomplete="current-password"
            {...ds.bind(authState.$.password)}
          />
          <ErrorText path={authState.$.errors.password} />
        </label>
        <ErrorText path={authState.$.errors.form} />
        <button type="submit">Sign in</button>
      </form>
      <a href="/signup">Create an account</a>
    </section>
  </main>
)

export const SignupPage = () => (
  <main class="auth" {...authState.attrs()}>
    <section class="auth-panel">
      <h1>Create account</h1>
      <form {...ds.on("submit", ds.post("/signup"), { prevent: true })}>
        <label>
          Name
          <input autocomplete="name" {...ds.bind(authState.$.name)} />
          <ErrorText path={authState.$.errors.name} />
        </label>
        <label>
          Username
          <input autocomplete="username" {...ds.bind(authState.$.username)} />
          <ErrorText path={authState.$.errors.username} />
        </label>
        <label>
          Password
          <input type="password" autocomplete="new-password" {...ds.bind(authState.$.password)} />
          <ErrorText path={authState.$.errors.password} />
        </label>
        <ErrorText path={authState.$.errors.form} />
        <button type="submit">Create account</button>
      </form>
      <a href="/login">Sign in instead</a>
    </section>
  </main>
)

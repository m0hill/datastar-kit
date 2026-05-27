import { ds, event, reply } from "datastar-kit"
import { examplePage } from "../layout.js"
import { readSignals } from "../helpers.js"
import type { ExampleModule } from "../types.js"

interface SignupSignals extends Record<string, unknown> {
  readonly email?: string
  readonly firstName?: string
  readonly lastName?: string
}

const defaults = {
  email: "",
  firstName: "",
  lastName: "",
  errors: {
    email: "",
    firstName: "",
    lastName: ""
  }
}

const validate = (signals: SignupSignals) => ({
  email: signals.email === "test@test.com" ? "" : "Use test@test.com.",
  firstName:
    typeof signals.firstName === "string" && signals.firstName.trim().length > 0
      ? ""
      : "First name is required.",
  lastName:
    typeof signals.lastName === "string" && signals.lastName.trim().length > 0
      ? ""
      : "Last name is required."
})

const ValidationMessage = ({ path }: { readonly path: string }) => (
  <small class="field-error" style="display:none" {...ds.show(ds.expr(`$errors.${path}`))} {...ds.text(ds.expr(`$errors.${path}`))}></small>
)

export const inlineValidationExample: ExampleModule = {
  slug: "inline_validation",
  title: "Inline Validation",
  summary: "Posts signal state for validation while the form is being edited.",
  source: "https://data-star.dev/examples/inline_validation",
  register(app) {
    app.get("/examples/inline_validation", () =>
      examplePage({
        title: "Inline Validation",
        slug: "inline_validation",
        summary: this.summary,
        source: this.source,
        children: (
          <div id="inline-validation-demo" class="stack" {...ds.dataSignals(defaults)}>
            <label>
              Email Address
              <input
                type="email"
                required
                aria-describedby="email-info"
                {...ds.bind("email")}
                {...ds.on("keydown", ds.post("/examples/inline_validation/validate"), {
                  debounce: "500ms"
                })}
              />
            </label>
            <p id="email-info" class="muted">
              The only valid email address is "test@test.com".
            </p>
            <ValidationMessage path="email" />
            <label>
              First Name
              <input
                type="text"
                required
                {...ds.bind("firstName")}
                {...ds.on("keydown", ds.post("/examples/inline_validation/validate"), {
                  debounce: "500ms"
                })}
              />
            </label>
            <ValidationMessage path="firstName" />
            <label>
              Last Name
              <input
                type="text"
                required
                {...ds.bind("lastName")}
                {...ds.on("keydown", ds.post("/examples/inline_validation/validate"), {
                  debounce: "500ms"
                })}
              />
            </label>
            <ValidationMessage path="lastName" />
            <button class="success" {...ds.on("click", ds.post("/examples/inline_validation"))}>
              Sign Up
            </button>
            <output id="inline-validation-result"></output>
          </div>
        )
      })
    )

    app.post("/examples/inline_validation/validate", async (c) => {
      const signals = await readSignals<SignupSignals>(c.req.raw)
      return reply.signals({ errors: validate(signals) })
    })

    app.post("/examples/inline_validation", async (c) => {
      const signals = await readSignals<SignupSignals>(c.req.raw)
      const errors = validate(signals)
      const hasErrors = Object.values(errors).some(Boolean)
      return reply.stream([
        event.signals({ errors }),
        event.patch(
          <output id="inline-validation-result" class={hasErrors ? "field-error" : "success-text"}>
            {hasErrors ? "Please fix the form." : "Signed up successfully."}
          </output>
        )
      ])
    })
  }
}

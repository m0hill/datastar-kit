import { Hono } from "hono"
import { event, reply, read, state as createState, mod, post } from "datastar-kit"
import { z } from "zod"
import { ExampleLayout, pageHead } from "../layout.js"

const schema = z.object({
  email: z
    .email("Enter a valid email address.")
    .refine((email) => email === "test@test.com", "Use test@test.com."),
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required.")
})

const state = createState({
  email: "",
  firstName: "",
  lastName: "",
  errors: {
    email: "",
    firstName: "",
    lastName: ""
  }
})

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Inline Validation"
      slug="inline_validation"
      summary="Posts signal state for validation while the form is being edited."
      source="https://data-star.dev/examples/inline_validation"
    >
      <div
        id="inline-validation-demo"
        class="stack"
        data-signals={mod(state.defaults, { ifMissing: true })}
      >
        <label>
          Email Address
          <input
            type="email"
            required
            aria-describedby="email-info"
            data-bind={"email"}
            data-on:keydown={mod(post("/examples/inline_validation/validate"), {
              debounce: "500ms"
            })}
          />
        </label>
        <p id="email-info" class="muted">
          The only valid email address is "test@test.com".
        </p>
        <small
          class="field-error"
          style="display:none"
          data-show={state.$.errors.email}
          data-text={state.$.errors.email}
        ></small>
        <label>
          First Name
          <input
            type="text"
            required
            data-bind={"firstName"}
            data-on:keydown={mod(post("/examples/inline_validation/validate"), {
              debounce: "500ms"
            })}
          />
        </label>
        <small
          class="field-error"
          style="display:none"
          data-show={state.$.errors.firstName}
          data-text={state.$.errors.firstName}
        ></small>
        <label>
          Last Name
          <input
            type="text"
            required
            data-bind={"lastName"}
            data-on:keydown={mod(post("/examples/inline_validation/validate"), {
              debounce: "500ms"
            })}
          />
        </label>
        <small
          class="field-error"
          style="display:none"
          data-show={state.$.errors.lastName}
          data-text={state.$.errors.lastName}
        ></small>
        <button class="success" data-on:click={post("/examples/inline_validation")}>
          Sign Up
        </button>
        <output id="inline-validation-result"></output>
      </div>
    </ExampleLayout>,
    {
      title: "Inline Validation - Datastar Kit",
      head: pageHead()
    }
  )
)

example.post("/validate", async (c) => {
  const result = schema.safeParse(await read.signals(c.req.raw))

  if (result.success) {
    return reply.signals(state.reset(result.data))
  }

  const { fieldErrors } = z.flattenError(result.error)
  return reply.signals(
    state.patch({
      errors: {
        email: fieldErrors.email?.[0] ?? "",
        firstName: fieldErrors.firstName?.[0] ?? "",
        lastName: fieldErrors.lastName?.[0] ?? ""
      }
    })
  )
})

example.post("/", async (c) => {
  const result = schema.safeParse(await read.signals(c.req.raw))

  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error)
    return reply.stream([
      event.signals(
        state.patch({
          errors: {
            email: fieldErrors.email?.[0] ?? "",
            firstName: fieldErrors.firstName?.[0] ?? "",
            lastName: fieldErrors.lastName?.[0] ?? ""
          }
        })
      ),
      event.patch(
        <output id="inline-validation-result" class="field-error">
          Please fix the form.
        </output>
      )
    ])
  }

  return reply.stream([
    event.signals(state.reset()),
    event.patch(
      <output id="inline-validation-result" class="success-text">
        Signed up successfully.
      </output>
    )
  ])
})

import { ds, event, reply } from "datastar-kit"
import { examplePage } from "../layout.js"
import { readSignals } from "../helpers.js"
import type { ExampleModule } from "../types.js"

interface Contact extends Record<string, string> {
  readonly firstName: string
  readonly lastName: string
  readonly email: string
}

const originalContact: Contact = {
  firstName: "John",
  lastName: "Doe",
  email: "joe@blow.com"
}

let contact: Contact = { ...originalContact }

const clean = (value: unknown, fallback: string): string => {
  const input = typeof value === "string" ? value.trim() : fallback
  return input.replace(/heck|dang/gi, "****") || fallback
}

const ContactView = () => (
  <div id="click-to-edit-demo" class="stack" {...ds.dataSignals(contact, { ifMissing: true })}>
    <div class="contact-card">
      <p>
        <strong>First Name:</strong> {contact.firstName}
      </p>
      <p>
        <strong>Last Name:</strong> {contact.lastName}
      </p>
      <p>
        <strong>Email:</strong> {contact.email}
      </p>
    </div>
    <div role="group">
      <button
        class="info"
        {...ds.indicator("_fetching")}
        {...ds.dataAttr("disabled", ds.expr("$_fetching"))}
        {...ds.on("click", ds.get("/examples/click_to_edit/edit"))}
      >
        Edit
      </button>
      <button
        class="warning"
        {...ds.indicator("_fetching")}
        {...ds.dataAttr("disabled", ds.expr("$_fetching"))}
        {...ds.on("click", ds.patch("/examples/click_to_edit/reset"))}
      >
        Reset
      </button>
    </div>
  </div>
)

const ContactForm = () => (
  <div id="click-to-edit-demo" class="stack" {...ds.dataSignals(contact)}>
    <div class="grid">
      <label>
        First Name
        <input
          type="text"
          {...ds.bind("firstName")}
          {...ds.dataAttr("disabled", ds.expr("$_fetching"))}
        />
      </label>
      <label>
        Last Name
        <input
          type="text"
          {...ds.bind("lastName")}
          {...ds.dataAttr("disabled", ds.expr("$_fetching"))}
        />
      </label>
      <label>
        Email
        <input
          type="email"
          {...ds.bind("email")}
          {...ds.dataAttr("disabled", ds.expr("$_fetching"))}
        />
      </label>
    </div>
    <div role="group">
      <button
        class="success"
        {...ds.indicator("_fetching")}
        {...ds.dataAttr("disabled", ds.expr("$_fetching"))}
        {...ds.on("click", ds.put("/examples/click_to_edit"))}
      >
        Save
      </button>
      <button
        class="error"
        {...ds.indicator("_fetching")}
        {...ds.dataAttr("disabled", ds.expr("$_fetching"))}
        {...ds.on("click", ds.get("/examples/click_to_edit/cancel"))}
      >
        Cancel
      </button>
    </div>
  </div>
)

export const clickToEditExample: ExampleModule = {
  slug: "click_to_edit",
  title: "Click To Edit",
  summary: "Swaps a read-only record for an edit form and saves the signal payload server-side.",
  source: "https://data-star.dev/examples/click_to_edit",
  register(app) {
    app.get("/examples/click_to_edit", () =>
      examplePage({
        title: "Click To Edit",
        slug: "click_to_edit",
        summary: this.summary,
        source: this.source,
        children: <ContactView />
      })
    )

    app.get("/examples/click_to_edit/edit", () => reply.patch(<ContactForm />))
    app.get("/examples/click_to_edit/cancel", () => reply.patch(<ContactView />))

    app.patch("/examples/click_to_edit/reset", () => {
      contact = { ...originalContact }
      return reply.stream([event.signals(contact), event.patch(<ContactView />)])
    })

    app.put("/examples/click_to_edit", async (c) => {
      const signals = await readSignals<Partial<Contact>>(c.req.raw)
      contact = {
        firstName: clean(signals.firstName, contact.firstName),
        lastName: clean(signals.lastName, contact.lastName),
        email: clean(signals.email, contact.email)
      }

      return reply.stream([event.signals(contact), event.patch(<ContactView />)])
    })
  }
}

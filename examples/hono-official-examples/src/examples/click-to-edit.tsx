import { Hono } from "hono"
import { ds, event, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"
import { readSignals } from "../helpers.js"

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

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Click To Edit"
      slug="click_to_edit"
      summary="Swaps a read-only record for an edit form and saves the signal payload server-side."
      source="https://data-star.dev/examples/click_to_edit"
    >
      <ContactView />
    </ExampleLayout>,
    {
      title: "Click To Edit - Datastar Kit",
      head: pageHead()
    }
  )
)

example.get("/edit", () => reply.patch(<ContactForm />))
example.get("/cancel", () => reply.patch(<ContactView />))

example.patch("/reset", () => {
  contact = { ...originalContact }
  return reply.stream([event.signals(contact), event.patch(<ContactView />)])
})

example.put("/", async (c) => {
  const signals = await readSignals<Partial<Contact>>(c.req.raw)
  contact = {
    firstName: clean(signals.firstName, contact.firstName),
    lastName: clean(signals.lastName, contact.lastName),
    email: clean(signals.email, contact.email)
  }

  return reply.stream([event.signals(contact), event.patch(<ContactView />)])
})

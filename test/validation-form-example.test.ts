import { describe, expect, it } from "vitest"
import { handle } from "../examples/validation-form.js"

describe("validation form example", () => {
  it("renders input and validation signals without trusting them as durable state", async () => {
    const response = await handle(new Request("http://localhost/"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('data-signals__ifmissing="{&quot;name&quot;: &quot;&quot;, &quot;email&quot;: &quot;&quot;, &quot;_validation&quot;: {&quot;form&quot;: &quot;&quot;, &quot;name&quot;: &quot;&quot;, &quot;email&quot;: &quot;&quot;}}"')
    expect(html).toContain('data-text="$_validation.email"')
  })

  it("returns 200 validation patches for recoverable form errors", async () => {
    const response = await handle(new Request("http://localhost/contact", {
      method: "POST",
      body: JSON.stringify({ name: "", email: "bad" })
    }))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(
      'event: datastar-patch-signals\ndata: signals {"_validation":{"form":"Please fix the highlighted fields","name":"Name is required","email":"Email must contain @"}}\n\n'
    )
  })

  it("returns success patches for valid form submissions", async () => {
    const response = await handle(new Request("http://localhost/contact", {
      method: "POST",
      body: JSON.stringify({ name: "Ada", email: "ada@example.com" })
    }))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(
      'event: datastar-patch-signals\ndata: signals {"_validation":{"form":null,"name":null,"email":null}}\n\n' +
      'event: datastar-patch-elements\ndata: selector #contact-result\ndata: elements <div id="contact-result" role="status">Saved Ada &lt;ada@example.com&gt;</div>\n\n'
    )
  })

  it("maps malformed signal payloads to explicit decode errors", async () => {
    const response = await handle(new Request("http://localhost/contact", {
      method: "POST",
      body: JSON.stringify({ name: 1, email: "ada@example.com" })
    }))

    expect(response.status).toBe(400)
    expect(await response.text()).toBe("Invalid request input")
  })

  it("returns a normal 404 response for unknown routes", async () => {
    const response = await handle(new Request("http://localhost/missing"))

    expect(response.status).toBe(404)
    expect(await response.text()).toBe("Not Found")
  })
})

import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { describe, expect, it } from "vitest"
import {
  ActionError,
  actionErrorResponse,
  clearValidationSignalPayload,
  FormValidationError,
  validationSignalPayload,
  validationSignalsResponse,
  validationSummaryResponse
} from "../src/validation.js"

describe("validation and error UX helpers", () => {
  it("maps field validation issues to scoped validation signals", async () => {
    const error = new FormValidationError([
      { field: "email", message: "Email is invalid" },
      { field: "name", message: "Name is required" }
    ], "Please fix the form")

    expect(validationSignalPayload(error)).toEqual({
      _validation: {
        form: "Please fix the form",
        email: "Email is invalid",
        name: "Name is required"
      }
    })

    const response = HttpServerResponse.toWeb(validationSignalsResponse(error))
    expect(response.status).toBe(200)
    expect(await response.text()).toBe(
      'event: datastar-patch-signals\ndata: signals {"_validation":{"form":"Please fix the form","email":"Email is invalid","name":"Name is required"}}\n\n'
    )
  })

  it("can clear validation signals with null removal semantics", () => {
    expect(clearValidationSignalPayload("name", "email")).toEqual({
      _validation: { form: null, name: null, email: null }
    })
  })

  it("renders validation summaries and domain action errors as 200 Datastar patches", async () => {
    const validation = new FormValidationError([{ field: "email", message: "Email is invalid" }])
    const validationResponse = HttpServerResponse.toWeb(validationSummaryResponse(validation))
    expect(await validationResponse.text()).toContain('event: datastar-patch-elements')
    expect(await HttpServerResponse.toWeb(actionErrorResponse(new ActionError("Cannot delete the last owner"))).text()).toBe(
      'event: datastar-patch-elements\ndata: selector #action-error\ndata: elements <div id="action-error" role="alert">Cannot delete the last owner</div>\n\n'
    )
  })
})

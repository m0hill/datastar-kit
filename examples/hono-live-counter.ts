import { Hono } from "hono"
import { makeLiveCounter } from "./live-counter.js"

export const makeHonoLiveCounter = () => {
  const liveCounter = makeLiveCounter()
  const app = new Hono()

  app.get("/", () => liveCounter.page())
  app.post("/increment", () => liveCounter.increment())
  app.get("/live", () => liveCounter.live())

  return {
    app,
    handle: (request: Request): Response | Promise<Response> => app.fetch(request),
    shutdown: liveCounter.shutdown,
    currentCount: liveCounter.currentCount
  }
}

const defaultCounter = makeHonoLiveCounter()

export const app = defaultCounter.app
export const handle = (request: Request): Response | Promise<Response> => defaultCounter.handle(request)
export const shutdown = (): void => defaultCounter.shutdown()
export const currentCount = (): number => defaultCounter.currentCount()

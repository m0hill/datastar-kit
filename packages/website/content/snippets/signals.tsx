const signup = state({ email: "", error: "", joined: false })

const SignupInput = z.object({ email: z.email("Enter a valid email") })

const SignupForm = () => (
  <form
    data-signals={mod(signup.defaults, { ifMissing: true })}
    data-on:submit={mod(post("/signup"), { prevent: true })}
  >
    <input data-bind={signup.refs.email} />
    <small data-text={signup.refs.error} />
    <button type="submit">Join</button>
    <p data-show={signup.refs.joined}>You're on the list.</p>
  </form>
)

app.post("/signup", async (c) => {
  const result = await read.validate(c.req.raw, SignupInput)
  if (result.issues) {
    return reply.signals(signup.patch({ error: result.issues[0]?.message ?? "" }))
  }

  await db.subscribers.insert(result.value.email)
  return reply.signals(signup.patch({ email: "", error: "", joined: true }))
})

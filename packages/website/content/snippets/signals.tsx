const todo = state({ draft: "", filter: "all" })

const Composer = () => (
  <form data-on:submit={mod(post("/todos"), { prevent: true })}>
    <input data-bind={todo.refs.draft} />
    <button type="submit">Add</button>
  </form>
)

app.post("/todos", async (c) => {
  const signals = TodoSignals.parse(await read.signals(c.req.raw))
  await db.insert(signals.draft)
  return reply.stream([
    event.patch(<TodoList items={await db.list()} />),
    event.signals(todo.patch({ draft: "" }))
  ])
})

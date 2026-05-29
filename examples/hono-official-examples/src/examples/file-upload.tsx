import { Hono } from "hono"
import { ds, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"
import { readSignals } from "../helpers.js"

interface UploadedFile extends Record<string, string> {
  readonly name: string
  readonly mime: string
  readonly contents: string
}

const UploadResult = ({ files = [] }: { readonly files?: readonly UploadedFile[] }) => (
  <div id="file-upload-result" class="event-output">
    {files.length === 0 ? (
      <span>No files uploaded yet.</span>
    ) : (
      <ul>
        {files.map((file) => (
          <li>
            <strong>{file.name}</strong> ({file.mime}, {Math.round((file.contents.length * 3) / 4)}{" "}
            bytes)
          </li>
        ))}
      </ul>
    )}
  </div>
)

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="File Upload"
      slug="file_upload"
      summary="Binds file inputs into Datastar signals and posts the encoded file list."
      source="https://data-star.dev/examples/file_upload"
    >
      <div class="stack" {...ds.dataSignals({ files: [] }, { ifMissing: true })}>
        <label>
          <span>Pick anything less than 1 MiB</span>
          <input type="file" multiple {...ds.bind("files")} />
        </label>
        <button
          class="warning"
          {...ds.dataAttr("disabled", ds.expr("!$files.length"))}
          {...ds.on("click", ds.expr("$files.length && @post('/examples/file_upload')"))}
        >
          Submit
        </button>
        <UploadResult />
      </div>
    </ExampleLayout>,
    {
      title: "File Upload - Datastar Kit",
      head: pageHead()
    }
  )
)

example.post("/", async (c) => {
  const { files = [] } = await readSignals<{ files?: UploadedFile[] }>(c.req.raw)
  return reply.patch(<UploadResult files={files} />)
})

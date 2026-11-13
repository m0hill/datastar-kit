const rows = ["a", "b"]

export const nestingNegativeFixture = (
  <main>
    <p>
      <div />
    </p>
    <p>
      <span>
        <ul />
      </span>
    </p>
    <p>{rows.length > 0 && <section />}</p>
    <a href="/">
      <span>
        <a href="/x" />
      </span>
    </a>
    <form>
      <div>
        <form />
      </div>
    </form>
    <button>
      <button />
    </button>
    <ul>
      <li>
        <div>
          <li />
        </div>
      </li>
    </ul>
    <h1>
      <h2 />
    </h1>
    <table>
      <tr />
    </table>
    <table>
      {rows.map((row) => (
        <tr>
          <td>{row}</td>
        </tr>
      ))}
    </table>
    <table>
      <tbody>
        <td />
      </tbody>
    </table>
    <table>
      <div />
    </table>
    <table>
      <tbody>
        <tr>text</tr>
      </tbody>
    </table>
    <table>
      <colgroup>text</colgroup>
    </table>
  </main>
)

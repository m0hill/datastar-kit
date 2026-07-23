import { signal } from "datastar-kit"

const count = signal<number>("count")

export const negativeFixture = (
  <main>
    <div aria-labl="misspelled" />
    <div data-shwo={count} />
    <div data-state={count} />
    <div data-on />
    <div data-show:foo={count} />
    <button data-on:click__wat={count} />
    <button data-on:click__ifmissing={count} />
    <my-widget
      aria-labl="misspelled"
      data-shwo={count}
    />
    <div
      // @ts-expect-error intentional id value error
      id={42}
      data-shwo={count}
    />
    <div custom-attr="value" />
  </main>
)

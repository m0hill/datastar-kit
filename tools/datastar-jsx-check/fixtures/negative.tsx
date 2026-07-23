import { js, signal } from "datastar-kit"

const count = signal<number>("count")
const customObject = { id: 1 }
const payload = customObject
const variableProps = { "custom-object": customObject }
const computedName = "custom-expression" as const
const dynamicName: string = "custom-object"

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
    <div custom-object={{ id: 1 }} />
    <div custom-expression={js`$count`} />
    <my-widget payload={{ id: 1 }} />
    <svg payload={{ id: 1 }} />
    <div {...variableProps} />
    <my-widget {...{ payload }} />
    <div {...{ [computedName]: js`$count` }} />
    <div {...{ [dynamicName]: customObject }} />
    <div {...{ ...variableProps }} />
    <div custom-attr="value" />
  </main>
)

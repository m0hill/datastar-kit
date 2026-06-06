### `data-json-signals`

Sets the text content of an element to a reactive JSON stringified version of signals. Useful when troubleshooting an issue.

```html
<!-- Display all signals -->
<pre data-json-signals></pre>
```

You can optionally provide a filter object to include or exclude specific signals using regular expressions.

```html
<!-- Only show signals that include "user" in their path -->
<pre data-json-signals="{include: /user/}"></pre>

<!-- Show all signals except those ending in "temp" -->
<pre data-json-signals="{exclude: /temp$/}"></pre>

<!-- Combine include and exclude filters -->
<pre data-json-signals="{include: /^app/, exclude: /password/}"></pre>
```

#### Modifiers

Modifiers allow you to modify the output format.

- `__terse` – Outputs a more compact JSON format without extra whitespace. Useful for displaying filtered data inline.

```html
<!-- Display filtered signals in a compact format -->
<pre data-json-signals__terse="{include: /counter/}"></pre>
```

## Attribute Evaluation Order

Elements are evaluated by walking the DOM in a depth-first manner, and attributes are applied in the order they appear in the element. This is important in some cases, such as when using `data-indicator` with a fetch request initiated in a `data-init` attribute, in which the indicator signal must be created before the fetch request is initialized.

```html
<div
  data-indicator:fetching
  data-init="@get('/endpoint')"
></div>
```

Data attributes are evaluated and applied on page load (after Datastar has initialized), and are reapplied after any DOM patches that add, remove, or change them. Note that morphing elements preserves existing attributes unless they are explicitly changed in the DOM, meaning they will only be reapplied if the attribute itself is changed.

## Attribute Casing

According to the HTML spec, all `data-*` attributes (not Datastar the framework, but any time a data attribute appears in the DOM) are case-insensitive. When Datastar processes these attributes, hyphenated names are automatically converted to camel case by removing hyphens and uppercasing the letter following each hyphen.

Datastar handles casing of data attribute key suffixes containing hyphens in two ways:

- The keys used in attributes that define signals (`data-bind:*`, `data-signals:*`, `data-computed:*`, etc.), are converted to camel case (the recommended casing for signals) by removing hyphens and uppercasing the letter following each hyphen. For example, `data-signals:my-signal` defines a signal named `mySignal`, and you would use the signal in a Datastar expression as `$mySignal`.

- The keys suffixes used by all other attributes are, by default, converted to kebab case. For example, `data-class:text-blue-700` adds or removes the class `text-blue-700`, and `data-on:rocket-launched` would react to the event named `rocket-launched`.

You can use the `__case` modifier to convert between `camelCase`, `kebab-case`, `snake_case`, and `PascalCase`, or alternatively use object syntax when available.

For example, if listening for an event called `widgetLoaded`, you would use `data-on:widget-loaded__case.camel`.

## Datastar Expressions

Datastar expressions used in `data-*` attributes parse signals, converting all dollar signs followed by valid signal name characters into their corresponding signal values. Expressions support standard JavaScript syntax, including operators, function calls, ternary expressions, and object and array literals.

A variable `el` is available in every Datastar expression, representing the element that the attribute exists on.

```html
<div
  id="bar"
  data-text="$foo + el.id"
></div>
```

Read more about Datastar expressions in the guide.

## Error Handling

Datastar has built-in error handling and reporting for runtime errors. When a data attribute is used incorrectly, for example `data-text-foo`, the following error message is logged to the browser console.

```html
Uncaught datastar runtime error: textKeyNotAllowed More info:
https://data-star.dev/errors/key_not_allowed?metadata=%7B%22plugin%22%3A%7B%22name%22%3A%22text%22%2C%22type%22%3A%22attribute%22%7D%2C%22element%22%3A%7B%22id%22%3A%22%22%2C%22tag%22%3A%22DIV%22%7D%2C%22expression%22%3A%7B%22rawKey%22%3A%22textFoo%22%2C%22key%22%3A%22foo%22%2C%22value%22%3A%22%22%2C%22fnContent%22%3A%22%22%7D%7D
Context: { "plugin": { "name": "text", "type": "attribute" }, "element": { "id": "", "tag": "DIV" },
"expression": { "rawKey": "textFoo", "key": "foo", "value": "", "fnContent": "" } }
```

The “More info” link takes you directly to a context-aware error page that explains the error and provides correct sample usage. See the error page for the example above, and all available error messages in the sidebar menu.

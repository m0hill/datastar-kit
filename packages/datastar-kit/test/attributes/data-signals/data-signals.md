### `data-signals`

Patches (adds, updates or removes) one or more signals into the existing signals. Values defined later in the DOM tree override those defined earlier.
```html
<div data-signals:foo="1"></div>
```

Signals can be nested using dot-notation.
```html
<div data-signals:foo.bar="1"></div>
```

The `data-signals` attribute can also be used to patch multiple signals using a set of key-value pairs, where the keys represent signal names and the values represent expressions.
```html
<div data-signals="{foo: {bar: 1, baz: 2}}"></div>
```

The value above is written in JavaScript object notation, but JSON, which is a subset and which most templating languages have built-in support for, is also allowed.

Setting a signal’s value to `null` or `undefined` removes the signal.
```html
<div data-signals="{foo: null}"></div>
```

Keys used in `data-signals:*` are converted to camel case, so the signal name `mySignal` must be written as `data-signals:my-signal` or `data-signals="{mySignal: 1}"`.

Signals beginning with an underscore are _not_ included in requests to the backend by default. You can opt to include them by modifying the value of the `filterSignals` option.

Signal names cannot begin with nor contain a double underscore (`__`), due to its use as a modifier delimiter.

#### Modifiers

Modifiers allow you to modify behavior when patching signals using a key.

- `__case` – Converts the casing of the signal name.

- `.camel` – Camel case: `mySignal` (default)

- `.kebab` – Kebab case: `my-signal`

- `.snake` – Snake case: `my_signal`

- `.pascal` – Pascal case: `MySignal`

- `__ifmissing` – Only patches signals if their keys do not already exist. This is useful for setting defaults without overwriting existing values.
```html
<div data-signals:my-signal__case.kebab="1"
     data-signals:foo__ifmissing="1"
></div>
```

## Attribute Evaluation Order

Elements are evaluated by walking the DOM in a depth-first manner, and attributes are applied in the order they appear in the element. This is important in some cases, such as when using `data-indicator` with a fetch request initiated in a `data-init` attribute, in which the indicator signal must be created before the fetch request is initialized.
```html
<div data-indicator:fetching data-init="@get('/endpoint')"></div>
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
<div id="bar" data-text="$foo + el.id"></div>
```

Read more about Datastar expressions in the guide.


## Error Handling

Datastar has built-in error handling and reporting for runtime errors. When a data attribute is used incorrectly, for example `data-text-foo`, the following error message is logged to the browser console.
```html
Uncaught datastar runtime error: textKeyNotAllowed
More info: https://data-star.dev/errors/key_not_allowed?metadata=%7B%22plugin%22%3A%7B%22name%22%3A%22text%22%2C%22type%22%3A%22attribute%22%7D%2C%22element%22%3A%7B%22id%22%3A%22%22%2C%22tag%22%3A%22DIV%22%7D%2C%22expression%22%3A%7B%22rawKey%22%3A%22textFoo%22%2C%22key%22%3A%22foo%22%2C%22value%22%3A%22%22%2C%22fnContent%22%3A%22%22%7D%7D
Context: {
    "plugin": {
        "name": "text",
        "type": "attribute"
    },
    "element": {
        "id": "",
        "tag": "DIV"
    },
    "expression": {
        "rawKey": "textFoo",
        "key": "foo",
        "value": "",
        "fnContent": ""
    }
}
```

The “More info” link takes you directly to a context-aware error page that explains the error and provides correct sample usage. See the error page for the example above, and all available error messages in the sidebar menu.

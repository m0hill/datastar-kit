### `data-bind`

Creates a signal (if one doesn’t already exist) and sets up two-way data binding between it and an element’s current bound state. When the signal changes, Datastar writes that value to the element. When one of the bind events fires, Datastar reads the element’s current bound property/value and writes that back to the signal.

The `data-bind` attribute can be placed on any HTML element on which data can be input or choices selected (`input`, `select`, `textarea` elements, and web components). Native elements use their built-in bind semantics automatically. Generic custom elements default to binding through `value` and listening on `change`.

`data-bind` does **not** inspect the event payload. It only uses the configured event as a signal to re-read the element’s current bound property/value. If you need to pull data from `event` itself, use `data-on:*` instead.
```html
<input data-bind:foo />
```

The signal name can be specified in the key (as above), or in the value (as below). This can be useful depending on the templating language you are using.
```html
<input data-bind="foo" />
```

Attribute casing rules apply to the signal name.
```html
<!-- Both of these create the signal `$fooBar` -->
<input data-bind:foo-bar />
<input data-bind="fooBar" />
```

The initial value of the signal is set to the value of the element, unless a signal has already been defined. So in the example below, `$fooBar` is set to `baz`.
```html
<input data-bind:foo-bar value="baz" />
```

Whereas in the example below, `$fooBar` inherits the value `fizz` of the predefined signal.
```html
<div data-signals:foo-bar="'fizz'">
    <input data-bind:foo-bar value="baz" />
</div>
```

#### Predefined Signal Types

When you predefine a signal, its **type** is preserved during binding. Whenever the element’s value changes, the signal value is automatically converted to match the original type.

For example, in the code below, `$fooBar` is set to the **number** `10` (not the string `"10"`) when the option is selected.
```html
<div data-signals:foo-bar="0">
    <select data-bind:foo-bar>
        <option value="10">10</option>
    </select>
</div>
```

In the same way, you can assign multiple input values to a single signal by predefining it as an **array**. In the example below, `$fooBar` becomes `["fizz", "baz"]` when both checkboxes are checked, and `["", ""]` when neither is checked.
```html
<div data-signals:foo-bar="[]">
    <input data-bind:foo-bar type="checkbox" value="fizz" />
    <input data-bind:foo-bar type="checkbox" value="baz" />
</div>
```

#### File Uploads

Input fields of type `file` will automatically encode file contents in base64. This means that a form is not required.
```html
<input type="file" data-bind:files multiple />
```

The resulting signal is in the format `{ name: string, contents: string, mime: string }[]`. See the file upload example.

If you want files to be uploaded to the server, rather than be converted to signals, use a form and with `multipart/form-data` in the `enctype` attribute. See the backend actions reference.

#### Modifiers

Modifiers allow you to modify behavior when binding signals using a key.

- `__case` – Converts the casing of the signal name.

- `.camel` – Camel case: `mySignal` (default)

- `.kebab` – Kebab case: `my-signal`

- `.snake` – Snake case: `my_signal`

- `.pascal` – Pascal case: `MySignal`

- `__prop` – Binds to a specific property instead of the default binding. Must _not_ be a read-only property.

- Example: `data-bind:is-checked__prop.checked`

- `__event` – Defines which events sync the element property back to the signal.

- Example: `data-bind:query__event.input.change`

Native form controls use their built-in binding semantics automatically. Generic custom elements default to `value` and `change`. Use `__prop` and `__event` when a custom element’s live state is stored somewhere else.
```html
<my-toggle data-bind:is-checked__prop.checked__event.change></my-toggle>
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

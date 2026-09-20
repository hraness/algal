# Intentionally invalid source

These fixtures demonstrate compiler diagnostics. They are not runnable programs
and are kept outside the positive source-example discovery directory.

`unknown-binding/main.algal` imports `helpers/draft.algal`, whose `emial`
binding is deliberately misspelled. Inspect the file, expression, and import
origin without making an executor call:

```sh
bun cli.ts check examples/source/errors/unknown-binding/main.algal --diagnostic-format text
```

The command is expected to fail. Change `emial` to `email` to repair the example.

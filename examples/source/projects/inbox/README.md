# One helper, one bounded inbox

`draft.algal` is a one-call helper with explicit email and tone inputs.
`inbox.algal` imports it locally, calls it once for a preview, then applies it
to at most three emails. Its static allowance is four executor attempts:
one preview plus three possible child applications. The runtime consumes
only the attempts that execute.

The scripted fixture has three emails and four recorded answers. The empty
fixture still makes the preview, but `each` returns `[]` without executing a
child. Replies retain input order; the current runtime executes `each` items
sequentially. Scripted text demonstrates composition and replay, not a live
provider's quality or knowledge of an account.

From the repository root:

```sh
bun cli.ts check examples/source/projects/inbox/inbox.algal
bun cli.ts compile examples/source/projects/inbox/inbox.algal --bundle-out inbox.bundle.json
bun cli.ts run examples/source/projects/inbox/inbox.algal \
  --args examples/source/projects/inbox/inbox.args.json \
  --responses examples/source/projects/inbox/inbox.responses.json > inbox.receipt.json
bun cli.ts verify inbox.receipt.json examples/source/projects/inbox/inbox.algal
```

The source loader resolves the imported file and the CLI retains the compiled
child closure. A root manifest alone does not contain its child. The bundle
carries the complete digest-addressed closure for execution by either runtime.

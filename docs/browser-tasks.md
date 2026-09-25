# Keep tasks while changing the application

**Preview.** [Open the task workspace](https://algal.computer/tasks/) to keep a
task list in your browser and change its sorting, grouping, or reopening rules.
You can add categories to existing tasks through a checked data migration.
The application runs without an account or application server.

## Start with your tasks

Add a title and priority, then save the task. You can edit a task, mark it done,
or reopen it when the current workflow allows reopening. Filters and search
change the list you see without changing task facts.

Drafts are separate from tasks. Save a draft to keep unfinished text, filter,
search, and focus intent across a browser restart. Saving a draft does not submit
a task or add a step to application history. Only saved drafts are restored
when you reopen the workspace.

Each workspace has its own URL and saved data. Creating a workspace preserves
the previous one. Keep its URL or use Back to return.

## Change how the application works

Choose a new order, grouping, or reopening rule and preview it. The application
runs its view program against the saved tasks and checks that the proposed
workflow preserves their facts and filter results. You can inspect the result
before applying it. Previewing a change leaves the current task list and
workflow in place.

The first data format has titles, priorities, and open/done status. Version 2
adds categories. Applying that upgrade runs a migration program that assigns
`inbox` to existing tasks while preserving their IDs, titles, priorities, and
status. You can then edit their categories. The application keeps the original
data and migration record in its history. Downgrading the data format is refused.

These checks establish compatibility and data preservation. You choose whether
the workflow suits your work; the application does not measure productivity.
This task workspace makes owner-directed changes and does not invoke a language
model. The separate [Grow workspace](browser-grow.md) offers experimental local
WebGPU inference for a marketing component.

## Keep unfinished work through a change

A workflow or task change can make a saved draft stale. The editor keeps its
text and asks you to review and rebase it against the current application before
submission. Another tab cannot silently overwrite a newer saved draft or apply
a task command against an older state.

Once a task or workflow operation's preparation is saved, an interrupted
publication keeps that operation and its prepared records. Recovery publishes
that saved operation once. Missing or corrupt records stop recovery instead of
reconstructing the missing history. A failure before preparation finishes leaves
the current tasks unchanged; unfinished draft writes are retried separately.

## Work offline and move your data

Save the workspace for offline use before disconnecting. Once its code, fonts,
and evaluator are cached, you can reopen the page, change tasks, save drafts,
preview workflow changes, and apply the category migration offline. This cache
is separate from the Grow workspace's cache. Other website routes may require
a connection.

Export saves tasks and applied application history in a replayable file.
Drafts and unapplied workflow proposals stay in the original workspace and are
excluded from that file. Import checks the file and opens a new workspace with
a fresh application identity. It preserves the original workspace.

Browser storage can be cleared or evicted. Keep an export for tasks you want to
retain elsewhere. If ordinary opening fails, recovery export saves raw records
for diagnosis; it does not assert that those records form a valid application.

## Status and limits

Each application holds at most 32 tasks, 128 history states, and 16 saved
workflow evaluations. State changes consume
history capacity; drafts are stored separately. Quota limits can stop writes
earlier. Limits fail without silently deleting saved data. Larger histories can
take several seconds to verify before an edit is saved.

Saved workflow evaluations add verification work to every change. While the
saved history and evaluations together fit the transfer limits below, each
check of the history against its saved operations also checks every saved
evaluation, from freshly read records, in the same replay. Past those limits,
each evaluation gets its own replay. In one instrumented in-memory run with 16
tasks and 16 saved evaluations, saving an edit replayed the history 6 times
and read stored records 5,451 times; checking each evaluation with its own
replay took 22 replays and 11,893 reads. These counts measure verification
work, not how long an edit takes in a browser.

Task transfers have a limit of 1,024 records and 8 MiB. Imported application
ancestry is limited to eight generations. An export proves content consistency
and replay of the included programs, not who authored the records.

IndexedDB stores application data, Web Locks coordinate tabs, and the shared
Rust expression evaluator runs as WebAssembly. A secure browser context and
those storage APIs are required. The browser renderer and application checks
remain trusted software; the editable workflow cannot replace them.

See [local triage](local-triage.md) for the same task model in a local Bun host,
Dioxus desktop interface, and Ratatui terminal interface.

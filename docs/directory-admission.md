# Filesystem enumeration bounds

Bun and native use separate physical-entry and admitted-record limits. Every
directory entry counts before extension, type or configuration filtering;
ignored files, orphan directories and retained lock markers spend the same
physical budget as matched records. These iterators omit `.` and `..`.

| Scan | Physical entries | Admitted records |
| --- | ---: | ---: |
| Mailbox namespace, for listing and new-mailbox admission | 2,064 | 1,024 configurations |
| `runs`, `slots` and `manifests` CLI listing | 4,096 per namespace | At most the physical limit |
| CLI `--modules` directory | 4,096 | 512 matching `*.algal.json` filenames |

The mailbox physical allowance is twice its logical capacity plus 16 residue
entries. Store listings use the existing module-directory physical allowance.
These limits bound consumer work even when no entry becomes an admitted
record. Module filenames count separately even when their manifest content
deduplicates to one CAS object.

Entry admission stops with `BUDGET_EXHAUSTED` at the first entry beyond the
physical limit. Both CLIs collect bounded path lists and sort them before reading
records; an overfull module directory fails before loading a module. The
separate 512-module limit applies while loading that sorted list, so records
loaded before a logical-count or content failure remain installed. Loading
modules is not an atomic import.

Native traversal uses Rust `read_dir`; its underlying libc/filesystem behavior
is an environmental assumption, not a proved allocation bound. For example,
Apple libc can cache a whole union directory during `opendir`. Bun 1.3.14 implements
`node:fs.opendir` by first calling `readdir` and retaining the entire returned
array, so the Bun counters do **not** bound this initial enumeration or
allocation. Its `Bun.Glob.scan` also collects matches before yielding. A
qualified streaming primitive remains required to close that Bun resource
admission gap; the present bound tests establish consumer admission and
retained-record limits, not a memory bound on Bun's directory implementation.
The [implementation decision and qualification plan](formal-verification-evidence/directory-enumeration-decision.md)
records the rejected built-in alternatives and the platform gates for a guarded
enumeration primitive. No experimental FFI or runtime compiler is activated.

A missing optional listing namespace is empty. A non-directory or other IO
failure does not become an empty listing. Listing retains its existing behavior
of reporting an individual unreadable record as an error row. Scans never
remove lock markers, orphan directories or other recovery evidence to make
space. Mailbox creation retains its existing custody and logical capacity
checks; see [mailbox admission](../spec/v1/mailbox.md).
Error propagation covers errors reported by the iterator. Some libc
implementations treat a directory deleted during enumeration as EOF; these tests
do not establish a complete snapshot under concurrent namespace mutation.

These are per-call scan limits, not quotas on the whole CAS store or a claim
that every filesystem path is now bounded. Existing message-directory and
host-state limits still apply. Interrupted-process inner residue is a separate
admission surface.

Individual `runs` and `manifests` listing records admit at most 67,108,864
bytes; slot records admit at most 262,144 bytes. Both CLIs require a regular
file, use bounded reads and reject invalid UTF-8. A FIFO or oversized record
becomes an error row without blocking or preventing other rows from being
listed. Explicit input symlinks retain the reader's regular-file target policy.

Regression cases in `src/directory-admission.test.ts` and
`crates/algal/tests/directory_admission.rs` exercise bound−1, bound and bound+1
with mixed files, orphans, valid records and retained owner evidence, plus the
distinct module filename limit and missing-versus-invalid namespace behavior.

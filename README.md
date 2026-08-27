# Delonix for VS Code

Manifest support for the [Delonix Engine](https://github.com/angolardevops/delonix-runtime)
— a daemonless, rootless-first container and microVM engine.

## What it does

**Validation and completion.** Manifests are checked against the schema the
engine itself publishes, so the editor and `delonix stack apply` agree on what
is valid. The schema is fetched live from the engine's site, which means it
tracks `main` without this extension having to be re-released.

Applies to `delonix-manifest.yaml`, `*.delonix.yaml`, and anything under a
`delonix/` directory.

**Templates.** A snippet per Kind (`dlx-pod`, `dlx-volume`, …), generated from
the engine's own Kind registry rather than written by hand.

**Highlighting** for `VMfile` and `Delonixfile`.

**A resource tree** in its own activity-bar view: containers, pods, virtual
machines, networks and volumes. Start, stop, restart, follow logs, open a shell
(`exec -it`) or a VM console, describe into an editor tab, and remove — each verb
offered only where the engine actually has it, so a pod never shows a *Start* it
does not implement and a VM never shows *Follow logs*.

`Stack plan` and `Stack apply` appear in the editor title bar for a manifest, and
run in a terminal so you watch the plan instead of waiting for a toast.

**Removal always asks first**, in a modal, naming what it is about to remove. The
tree points at whatever host the editor runs on, and that is routinely a machine
with real workloads.

### The tree does not pretend to be live

It refreshes when you ask it to, and after a command this extension ran. The
engine is **daemonless** — there is no event stream to subscribe to — so a "live"
tree could only be a poll wearing a costume. A stale row that admits it is stale
is honest; one that looks live and is thirty seconds old is not, and it is the
second kind that gets acted on.

`delonix.autoRefresh` turns polling on if you want it, and its own description
says that is what it is. It is `0` by default.

## Install

| where | how |
|---|---|
| VS Code | search *Delonix* in the Marketplace |
| VSCodium, Cursor, Windsurf, Antigravity | search *Delonix* (Open VSX) |
| offline, or any of the above | grab the `.vsix` from [Releases](https://github.com/angolardevops/delonix-vscode/releases) and `code --install-extension delonix-<version>.vsix` |

The engine's `install.sh` also installs it into every VS Code-family editor it
finds, unless you pass `--no-editor-plugin`.

## What it does NOT do

**No Dev Containers integration**, and the reason is measured rather than
assumed. That extension drives a Docker daemon, and `delonix serve docker-api`
answers 14 routes while refusing 12 — among them `exec` and `attach`, which need
HTTP hijacking the engine has decided not to implement. The gap is not a missing
afternoon of work; it is a design boundary. Check it yourself:

```
delonix serve docker-api --help
```

**No live state**, for the reason above — and no Kubernetes cluster view. A
`delonix cluster` is a procedure over remote hosts rather than a local registry,
so there is no list to read the way there is for a container; giving it a row
would mean inventing state the engine does not keep.

**`stack ls` is not in the tree**, because it takes a manifest rather than
answering from a registry: a stack is a file you point at, not a thing the engine
enumerates. `Stack plan`/`Stack apply` sit on the manifest instead, which is
where the file already is.

## Development

```bash
npm install
npm run typecheck           # tsc --noEmit
npm run build               # esbuild bundle into dist/
scripts/gen-snippets.py     # regenerate the snippets from the local `delonix`
scripts/sync-syntax.sh      # regenerate the VMfile grammar
npx @vscode/vsce package    # build the .vsix
```

The tree's data path can be exercised **without an editor**: the bundle takes
`vscode` as an external, so a stub module plus a real `delonix` on `DLX_BIN`
drives `getChildren` end to end — which is how the failure path (engine not
found) was checked, and not only the happy one.

Both generators read the installed engine, so a Kind added upstream shows up
here by re-running them — not by hand-editing a list.

Apache-2.0.

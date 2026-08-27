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

**No cluster/stack/pod tree view yet.** The commands exist in the CLI and the
extension does not wrap them. Wrapping a CLI in buttons is easy to do badly —
the Kubernetes extension is useful because it reflects live state, and doing
that honestly here means watching the engine, not shelling out on a timer.

## Development

```bash
scripts/gen-snippets.py     # regenerate the snippets from the local `delonix`
scripts/sync-syntax.sh      # regenerate the VMfile grammar
npx @vscode/vsce package    # build the .vsix
```

Both generators read the installed engine, so a Kind added upstream shows up
here by re-running them — not by hand-editing a list.

Apache-2.0.

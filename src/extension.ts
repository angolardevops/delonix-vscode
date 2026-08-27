import * as vscode from "vscode";
import { DelonixTree, Node } from "./tree";
import { run, bin, CliError } from "./cli";

export function activate(ctx: vscode.ExtensionContext) {
  const tree = new DelonixTree();
  ctx.subscriptions.push(tree);
  ctx.subscriptions.push(vscode.window.registerTreeDataProvider("delonixResources", tree));
  tree.applyAutoRefresh();
  ctx.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("delonix.autoRefresh")) tree.applyAutoRefresh();
    }),
  );

  const cmd = (id: string, fn: (n: Node) => unknown) =>
    ctx.subscriptions.push(vscode.commands.registerCommand(id, fn));

  cmd("delonix.refresh", () => tree.refresh());

  // A verb that CHANGES something reports what the engine said and then
  // refreshes — the tree is only ever as fresh as the last question asked.
  const act = async (n: Node, args: string[], done: string) => {
    try {
      await run(args);
      vscode.window.setStatusBarMessage(`delonix: ${done}`, 4000);
    } catch (e) {
      const msg = e instanceof CliError ? e.message : String(e);
      vscode.window.showErrorMessage(`delonix: ${msg}`);
    } finally {
      tree.refresh();
    }
  };

  cmd("delonix.start", (n) => n.ref && act(n, [group(n), "start", n.ref], `${n.ref} started`));
  cmd("delonix.stop", (n) => n.ref && act(n, [group(n), "stop", n.ref], `${n.ref} stopped`));
  cmd("delonix.restart", (n) => n.ref && act(n, ["container", "restart", n.ref], `${n.ref} restarted`));

  // REMOVAL ASKS FIRST, and names what it is about to remove. This runs against
  // whatever host the editor is pointed at, which is routinely a machine with
  // real workloads on it; a one-click `rm` in a tree is exactly how the wrong
  // row gets deleted. `modal` so it cannot be dismissed by looking away.
  cmd("delonix.remove", async (n) => {
    if (!n.ref || !n.kind) return;
    const yes = await vscode.window.showWarningMessage(
      `Remove ${n.kind} "${n.ref}"?`,
      { modal: true, detail: "This cannot be undone." },
      "Remove",
    );
    if (yes === "Remove") await act(n, [group(n), "rm", n.ref], `${n.ref} removed`);
  });

  // Logs and exec need a real TTY: `logs -f` follows and `exec -it` is
  // interactive. Capturing them into an output channel would give a buffer that
  // never ends and a shell that cannot be typed into.
  cmd("delonix.logs", (n) => {
    if (!n.ref) return;
    term(`delonix: logs ${n.ref}`, [group(n), "logs", "-f", n.ref]);
  });
  cmd("delonix.exec", (n) => {
    if (!n.ref) return;
    term(`delonix: ${n.ref}`, ["container", "exec", "-it", n.ref, "/bin/sh"]);
  });
  cmd("delonix.console", (n) => {
    if (!n.ref) return;
    term(`delonix: console ${n.ref}`, ["vm", "console", n.ref]);
  });

  cmd("delonix.describe", async (n) => {
    if (!n.ref || !n.kind) return;
    try {
      const out = await run([group(n), "describe", n.ref]);
      const doc = await vscode.workspace.openTextDocument({ content: out, language: "yaml" });
      await vscode.window.showTextDocument(doc, { preview: true });
    } catch (e) {
      const msg = e instanceof CliError ? e.message : String(e);
      vscode.window.showErrorMessage(`delonix: ${msg}`);
    }
  });

  cmd("delonix.apply", async () => {
    const doc = vscode.window.activeTextEditor?.document;
    if (!doc) {
      vscode.window.showWarningMessage("delonix: open a manifest first.");
      return;
    }
    await doc.save();
    term("delonix: stack apply", ["stack", "apply", "-f", doc.uri.fsPath]);
  });

  cmd("delonix.plan", async () => {
    const doc = vscode.window.activeTextEditor?.document;
    if (!doc) {
      vscode.window.showWarningMessage("delonix: open a manifest first.");
      return;
    }
    await doc.save();
    term("delonix: stack plan", ["stack", "plan", "-f", doc.uri.fsPath]);
  });
}

/** The CLI group that owns a node's Kind — `volumes` is plural, the rest are not. */
function group(n: Node): string {
  return n.kind === "volume" ? "volumes" : (n.kind ?? "container");
}

function term(name: string, args: string[]): void {
  const t = vscode.window.createTerminal({ name, shellPath: bin(), shellArgs: args });
  t.show();
}

export function deactivate() {}

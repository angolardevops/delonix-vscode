import * as vscode from "vscode";
import { listJson, CliError } from "./cli";

type Kind = "container" | "pod" | "vm" | "network" | "volume";

interface Container { id: string; name: string; image: string; status: string; ports: string; }
interface Pod { name: string; running: number; total: number; ip?: string; status: string; }
interface Vm { name: string; status: string; ip?: string; backend?: string; vcpus?: number; memory?: string; }
interface Network { name: string; driver: string; bridge?: string; subnet?: string; }
interface Volume { name: string; driver: string; mountpoint: string; }

/** A group header, a resource, or the line explaining why a group is empty. */
export class Node extends vscode.TreeItem {
  constructor(
    label: string,
    collapsible: vscode.TreeItemCollapsibleState,
    readonly kind?: Kind,
    readonly ref?: string,
    readonly running?: boolean,
  ) {
    super(label, collapsible);
  }
}

const GROUPS: { kind: Kind; label: string; args: string[] }[] = [
  { kind: "container", label: "Containers", args: ["container", "ls", "-a"] },
  { kind: "pod", label: "Pods", args: ["pod", "ls"] },
  { kind: "vm", label: "Virtual machines", args: ["vm", "ls"] },
  { kind: "network", label: "Networks", args: ["network", "ls"] },
  { kind: "volume", label: "Volumes", args: ["volumes", "ls"] },
];

/**
 * The tree refreshes when ASKED — on the refresh button, and after a command
 * this extension itself ran. There is no timer pretending to be live.
 *
 * The engine is daemonless: there is no event stream to subscribe to, so a
 * "live" tree could only be a poll wearing a costume. A stale row that says it
 * is stale is honest; one that looks live and is thirty seconds old is not, and
 * it is the second kind that gets acted on. Whoever wants polling can turn on
 * `delonix.autoRefresh`, which says in its own description that it is polling.
 */
export class DelonixTree implements vscode.TreeDataProvider<Node> {
  private readonly _changed = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this._changed.event;
  private timer?: NodeJS.Timeout;

  refresh(): void {
    this._changed.fire(undefined);
  }

  /** Polling is opt-in and re-read on every settings change, never latched. */
  applyAutoRefresh(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    const secs = vscode.workspace.getConfiguration("delonix").get<number>("autoRefresh") ?? 0;
    if (secs > 0) this.timer = setInterval(() => this.refresh(), secs * 1000);
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
  }

  getTreeItem(n: Node): vscode.TreeItem {
    return n;
  }

  async getChildren(parent?: Node): Promise<Node[]> {
    if (!parent) {
      return GROUPS.map(
        (g) => new Node(g.label, vscode.TreeItemCollapsibleState.Collapsed, g.kind),
      );
    }
    const group = GROUPS.find((g) => g.kind === parent.kind);
    if (!group || parent.ref) return [];
    try {
      switch (group.kind) {
        case "container":
          return (await listJson<Container>(group.args)).map(containerNode);
        case "pod":
          return (await listJson<Pod>(group.args)).map(podNode);
        case "vm":
          return (await listJson<Vm>(group.args)).map(vmNode);
        case "network":
          return (await listJson<Network>(group.args)).map(networkNode);
        case "volume":
          return (await listJson<Volume>(group.args)).map(volumeNode);
      }
    } catch (e) {
      // The reason belongs in the tree, not only in a toast that has already
      // faded. `delonix` missing from PATH and "the engine refused" look the
      // same from an empty group, and they need different fixes.
      const why = e instanceof CliError ? e.message : String(e);
      const n = new Node(why, vscode.TreeItemCollapsibleState.None);
      n.iconPath = new vscode.ThemeIcon("warning");
      n.tooltip = "delonix could not be asked. Check `delonix.path`.";
      return [n];
    }
    return [];
  }
}

/** `Up 3 minutes` / `Exited (0)` — the engine's own word, never re-derived. */
function isUp(status: string): boolean {
  return /^up\b/i.test(status.trim());
}

function containerNode(c: Container): Node {
  const up = isUp(c.status);
  const n = new Node(c.name || c.id, vscode.TreeItemCollapsibleState.None, "container", c.name || c.id, up);
  n.description = c.status;
  n.tooltip = new vscode.MarkdownString(
    [`**${c.name}**`, "", `- image: \`${c.image}\``, `- id: \`${c.id}\``,
     `- status: ${c.status}`, c.ports ? `- ports: \`${c.ports}\`` : ""].filter(Boolean).join("\n"),
  );
  n.contextValue = up ? "container.running" : "container.stopped";
  n.iconPath = new vscode.ThemeIcon(up ? "vm-running" : "vm-outline");
  return n;
}

function podNode(p: Pod): Node {
  const up = p.running > 0;
  const n = new Node(p.name, vscode.TreeItemCollapsibleState.None, "pod", p.name, up);
  n.description = `${p.running}/${p.total}${p.ip ? ` · ${p.ip}` : ""}`;
  n.tooltip = `${p.status}${p.ip ? ` — ${p.ip}` : ""}`;
  n.contextValue = up ? "pod.running" : "pod.stopped";
  n.iconPath = new vscode.ThemeIcon(up ? "layers-active" : "layers");
  return n;
}

function vmNode(v: Vm): Node {
  const up = /running/i.test(v.status);
  const n = new Node(v.name, vscode.TreeItemCollapsibleState.None, "vm", v.name, up);
  n.description = [v.status, v.ip].filter(Boolean).join(" · ");
  n.tooltip = new vscode.MarkdownString(
    [`**${v.name}**`, "", `- status: ${v.status}`, v.ip ? `- ip: \`${v.ip}\`` : "",
     v.backend ? `- backend: ${v.backend}` : "",
     v.vcpus ? `- ${v.vcpus} vCPU · ${v.memory}` : ""].filter(Boolean).join("\n"),
  );
  n.contextValue = up ? "vm.running" : "vm.stopped";
  n.iconPath = new vscode.ThemeIcon(up ? "server-process" : "server");
  return n;
}

function networkNode(x: Network): Node {
  const n = new Node(x.name, vscode.TreeItemCollapsibleState.None, "network", x.name);
  n.description = [x.driver, x.subnet].filter(Boolean).join(" · ");
  n.tooltip = x.bridge ? `bridge ${x.bridge}` : x.driver;
  n.contextValue = "network";
  n.iconPath = new vscode.ThemeIcon("type-hierarchy");
  return n;
}

function volumeNode(x: Volume): Node {
  const n = new Node(x.name, vscode.TreeItemCollapsibleState.None, "volume", x.name);
  n.description = x.driver;
  n.tooltip = x.mountpoint;
  n.contextValue = "volume";
  n.iconPath = new vscode.ThemeIcon("database");
  return n;
}

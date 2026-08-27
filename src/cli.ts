import { execFile } from "child_process";
import * as vscode from "vscode";

/** Where the engine lives. A setting, because `delonix` is not always on PATH. */
export function bin(): string {
  return vscode.workspace.getConfiguration("delonix").get<string>("path") || "delonix";
}

export class CliError extends Error {
  constructor(message: string, readonly code: number) {
    super(message);
  }
}

/**
 * Runs the engine and returns stdout.
 *
 * The engine classifies its failures (4 = no such resource, 5 = conflict,
 * 69 = unavailable, …) and writes a sentence on stderr. Both are carried
 * through: swallowing either would turn "that pod is gone" into a red toast
 * saying "command failed", which is the message that helps nobody.
 */
export function run(args: string[], timeoutMs = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(bin(), args, { timeout: timeoutMs, maxBuffer: 16 << 20 }, (err, stdout, stderr) => {
      if (!err) return resolve(stdout);
      // ENOENT here is not a missing FILE, it is the missing TOOL — and
      // "spawn … ENOENT" sends the reader looking for a path. The engine's own
      // notes carry this lesson for the same mistake made in Rust; the fix is
      // the same: name the tool, and name the setting that points at it.
      if ((err as any).code === "ENOENT") {
        return reject(
          new CliError(
            `\`${bin()}\` was not found. Install the engine, or set \`delonix.path\`.`,
            127,
          ),
        );
      }
      const code = typeof (err as any).code === "number" ? (err as any).code : 1;
      const said = (stderr || "").trim() || (err as any).message || "";
      reject(new CliError(said.replace(/^error\s+/, ""), code));
    });
  });
}

/** A list command that speaks JSON (ADR-0005). Never throws on an empty list. */
export async function listJson<T>(args: string[]): Promise<T[]> {
  const out = await run([...args, "-o", "json"]);
  const t = out.trim();
  if (!t) return [];
  const parsed = JSON.parse(t);
  return Array.isArray(parsed) ? parsed : [parsed];
}

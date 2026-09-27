import os from "node:os";
import path from "node:path";

/**
 * Expands leading tilde (~) in file paths to the user's home directory.
 */
export function expandHomeDir(filepath: string): string {
  if (!filepath) {
    return filepath;
  }

  if (filepath === "~") {
    return os.homedir();
  }

  if (filepath.startsWith("~/") || filepath.startsWith("~\\")) {
    return path.join(os.homedir(), filepath.slice(2));
  }

  return filepath;
}

/**
 * Shortens an absolute path to use tilde (~) if within user's home directory.
 */
export function collapseHomeDir(filepath: string): string {
  const home = os.homedir();
  if (filepath === home) {
    return "~";
  }
  if (filepath.startsWith(home + path.sep)) {
    return `~${filepath.slice(home.length)}`;
  }
  return filepath;
}

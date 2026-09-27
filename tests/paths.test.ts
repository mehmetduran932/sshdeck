import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { collapseHomeDir, expandHomeDir } from "../src/utils/paths.js";
import {
  getDefaultConfigDir,
  getDefaultConfigPath,
  resolveConfigPath,
} from "../src/config/config.paths.js";

describe("paths utility", () => {
  it("expands leading tilde to user home directory", () => {
    const home = os.homedir();
    expect(expandHomeDir("~")).toBe(home);
    expect(expandHomeDir("~/.ssh/id_ed25519")).toBe(path.join(home, ".ssh", "id_ed25519"));
    expect(expandHomeDir("/var/log")).toBe("/var/log");
  });

  it("collapses home directory to tilde", () => {
    const home = os.homedir();
    expect(collapseHomeDir(home)).toBe("~");
    expect(collapseHomeDir(path.join(home, ".sshdeck"))).toBe("~/.sshdeck");
    expect(collapseHomeDir("/tmp/other")).toBe("/tmp/other");
  });

  it("resolves default config paths", () => {
    const defaultDir = getDefaultConfigDir();
    const defaultPath = getDefaultConfigPath();

    expect(defaultDir).toContain(".sshdeck");
    expect(defaultPath).toBe(path.join(defaultDir, "config.json"));
  });

  it("resolves custom config path", () => {
    const custom = resolveConfigPath("~/custom-deck/config.json");
    expect(custom).toBe(path.join(os.homedir(), "custom-deck", "config.json"));
  });
});

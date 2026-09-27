import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findCommand } from "../src/commands/find.command.js";
import { removeCommand } from "../src/commands/remove.command.js";
import type { PromptChoice, ServerPrompts } from "../src/commands/server-prompts.js";
import { addCommand, editCommand } from "../src/commands/server-wizard.command.js";
import { ConfigService } from "../src/config/config.service.js";
import { ServerService } from "../src/server/server.service.js";
import { logger } from "../src/utils/logger.js";

class StubPrompts implements ServerPrompts {
  constructor(
    private readonly inputs: string[] = [],
    private readonly selections: string[] = [],
    private readonly confirmations: boolean[] = []
  ) {}

  async input(_message: string, _initial?: string): Promise<string> {
    return this.inputs.shift() ?? "";
  }

  async select(_message: string, _choices: PromptChoice[], _initial?: string): Promise<string> {
    return this.selections.shift() ?? "agent";
  }

  async confirm(_message: string, _initial?: boolean): Promise<boolean> {
    return this.confirmations.shift() ?? false;
  }
}

describe("server management commands", () => {
  let tempDir: string;
  let configService: ConfigService;
  let serverService: ServerService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sshdeck-commands-test-"));
    configService = new ConfigService(path.join(tempDir, "config.json"));
    await configService.save({
      version: 1,
      servers: [
        {
          tag: "prod",
          name: "Production",
          host: "192.168.1.10",
          port: 22,
          username: "root",
          auth: { type: "agent" },
        },
      ],
    });
    serverService = new ServerService(configService);
    vi.spyOn(logger, "log").mockImplementation(() => {});
    vi.spyOn(logger, "success").mockImplementation(() => {});
    vi.spyOn(logger, "info").mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("adds a key-authenticated server through the wizard", async () => {
    const prompts = new StubPrompts(
      ["stage", "Staging", "10.0.0.2", "2222", "deploy", "preprod", "Preview host", "~/.ssh/stage"],
      ["key"]
    );
    await addCommand(serverService, prompts);
    await expect(serverService.requireServerByTag("stage")).resolves.toMatchObject({
      name: "Staging",
      port: 2222,
      auth: { type: "key", keyPath: "~/.ssh/stage" },
    });
  });

  it("edits an existing server and can switch it to a password secret reference", async () => {
    const prompts = new StubPrompts(
      ["production", "Production API", "192.168.1.11", "22", "admin", "", "", "production-admin"],
      ["password"]
    );
    await editCommand("prod", serverService, prompts);
    await expect(serverService.requireServerByTag("production")).resolves.toMatchObject({
      host: "192.168.1.11",
      username: "admin",
      auth: { type: "password", secretRef: "production-admin" },
    });
  });

  it("only removes after confirmation unless forced", async () => {
    await removeCommand("prod", false, serverService, new StubPrompts([], [], [false]));
    await expect(serverService.requireServerByTag("prod")).resolves.toBeDefined();
    await removeCommand("prod", true, serverService, new StubPrompts());
    await expect(serverService.getServerByTag("prod")).resolves.toBeUndefined();
  });

  it("prints matching servers for find", async () => {
    await findCommand("production", serverService);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("prod"));
  });
});

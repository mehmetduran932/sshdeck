import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigService } from "../src/config/config.service.js";
import { ServerService } from "../src/server/server.service.js";
import { SSHService } from "../src/ssh/ssh.service.js";
import { createProgram } from "../src/cli.js";
import { logger } from "../src/utils/logger.js";
import type { NativeSSHService } from "../src/ssh/native-ssh.service.js";

describe("CLI integration", () => {
  let tempDir: string;
  let configPath: string;
  let configService: ConfigService;
  let serverService: ServerService;
  let sshService: SSHService;
  let connectedServerTag: string | null = null;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sshdeck-cli-test-"));
    configPath = path.join(tempDir, "config.json");
    configService = new ConfigService(configPath);
    await configService.save({
      version: 1,
      servers: [
        {
          tag: "prod",
          name: "Production API",
          host: "192.168.1.92",
          port: 22,
          username: "root",
          group: "production",
          auth: { type: "key", keyPath: "~/.ssh/id_ed25519" },
        },
        {
          tag: "dev",
          name: "Dev Box",
          host: "10.0.0.10",
          port: 22,
          username: "developer",
          group: "development",
          auth: { type: "agent" },
        },
      ],
    });

    serverService = new ServerService(configService);
    connectedServerTag = null;

    const mockNativeSSH = {
      connect: async (server: { tag: string }) => {
        connectedServerTag = server.tag;
        return 0;
      },
      buildSSHArgs: () => [],
    } as unknown as NativeSSHService;

    sshService = new SSHService(mockNativeSSH);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("lists all servers with formatted output", async () => {
    const logSpy = vi.spyOn(logger, "log").mockImplementation(() => {});
    const program = createProgram(configService, serverService, sshService);
    program.exitOverride();

    await program.parseAsync(["node", "sshdeck", "list"]);

    expect(logSpy).toHaveBeenCalled();
    const calls = logSpy.mock.calls.map((c) => c[0]);
    expect(calls.some((msg) => typeof msg === "string" && msg.includes("TAG"))).toBe(true);
    expect(calls.some((msg) => typeof msg === "string" && msg.includes("prod"))).toBe(true);
    expect(calls.some((msg) => typeof msg === "string" && msg.includes("dev"))).toBe(true);
  });

  it("filters servers by group in list command", async () => {
    const logSpy = vi.spyOn(logger, "log").mockImplementation(() => {});
    const program = createProgram(configService, serverService, sshService);
    program.exitOverride();

    await program.parseAsync(["node", "sshdeck", "ls", "production"]);

    const calls = logSpy.mock.calls.map((c) => c[0]);
    expect(calls.some((msg) => typeof msg === "string" && msg.includes("prod"))).toBe(true);
    expect(calls.some((msg) => typeof msg === "string" && msg.includes("dev"))).toBe(false);
  });

  it("connects directly using sshdeck <tag>", async () => {
    const program = createProgram(configService, serverService, sshService);
    program.exitOverride();

    await program.parseAsync(["node", "sshdeck", "prod"]);

    expect(connectedServerTag).toBe("prod");
  });

  it("connects using sshdeck connect <tag>", async () => {
    const program = createProgram(configService, serverService, sshService);
    program.exitOverride();

    await program.parseAsync(["node", "sshdeck", "connect", "dev"]);

    expect(connectedServerTag).toBe("dev");
  });

  it("connects using short alias sshdeck c <tag>", async () => {
    const program = createProgram(configService, serverService, sshService);
    program.exitOverride();

    await program.parseAsync(["node", "sshdeck", "c", "prod"]);

    expect(connectedServerTag).toBe("prod");
  });
});

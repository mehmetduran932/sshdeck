import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setPasswordCommand, type SecretPrompt } from "../src/commands/credentials.command.js";
import { ConfigService } from "../src/config/config.service.js";
import { MemoryCredentialStore } from "../src/credentials/memory-credential-store.js";
import { ServerService } from "../src/server/server.service.js";
import { logger } from "../src/utils/logger.js";

describe("MemoryCredentialStore", () => {
  it("saves, retrieves, and deletes secrets", async () => {
    const store = new MemoryCredentialStore();

    expect(await store.getSecret("ref-1")).toBeNull();

    await store.saveSecret("ref-1", "super-secret-password");
    expect(await store.getSecret("ref-1")).toBe("super-secret-password");

    await store.deleteSecret("ref-1");
    expect(await store.getSecret("ref-1")).toBeNull();
  });
});

describe("setPasswordCommand", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
    vi.restoreAllMocks();
  });

  it("stores a password outside the configuration file", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sshdeck-credential-command-test-"));
    const configService = new ConfigService(path.join(tempDir, "config.json"));
    await configService.save({
      version: 1,
      servers: [
        {
          tag: "server",
          name: "Server",
          host: "192.0.2.10",
          port: 22,
          username: "root",
          auth: { type: "password", secretRef: "sshdeck:server" },
        },
      ],
    });
    const serverService = new ServerService(configService);
    const credentialStore = new MemoryCredentialStore();
    const prompt: SecretPrompt = { requestPassword: async () => "stored-only-in-keychain" };
    vi.spyOn(logger, "success").mockImplementation(() => {});

    await setPasswordCommand("server", serverService, credentialStore, prompt);

    await expect(credentialStore.getSecret("sshdeck:server")).resolves.toBe(
      "stored-only-in-keychain"
    );
    await expect(fs.readFile(path.join(tempDir, "config.json"), "utf-8")).resolves.not.toContain(
      "stored-only-in-keychain"
    );
  });
});

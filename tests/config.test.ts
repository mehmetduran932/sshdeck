import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigSchema, formatConfigValidationErrors } from "../src/config/config.schema.js";
import { ConfigService } from "../src/config/config.service.js";
import type { AppConfig } from "../src/config/config.types.js";
import { InvalidConfigError } from "../src/utils/errors.js";

describe("ConfigSchema", () => {
  it("validates a valid configuration with key, agent, and password auth", () => {
    const validConfig: AppConfig = {
      version: 1,
      servers: [
        {
          tag: "prod",
          name: "Production Server",
          host: "192.168.1.100",
          port: 22,
          username: "root",
          group: "production",
          description: "Main production server",
          auth: {
            type: "key",
            keyPath: "~/.ssh/id_ed25519",
          },
        },
        {
          tag: "staging",
          name: "Staging Server",
          host: "192.168.1.101",
          port: 2222,
          username: "deploy",
          auth: {
            type: "agent",
          },
        },
        {
          tag: "db",
          name: "Database Server",
          host: "10.0.0.5",
          port: 22,
          username: "postgres",
          auth: {
            type: "password",
            secretRef: "db-postgres-secret",
          },
        },
      ],
    };

    const result = ConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it("rejects configuration with duplicate tags (case-insensitive)", () => {
    const config = {
      version: 1,
      servers: [
        {
          tag: "web",
          name: "Web 1",
          host: "1.1.1.1",
          port: 22,
          username: "root",
          auth: { type: "agent" },
        },
        {
          tag: "WEB",
          name: "Web 2",
          host: "1.1.1.2",
          port: 22,
          username: "root",
          auth: { type: "agent" },
        },
      ],
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatConfigValidationErrors(result.error);
      expect(formatted.some((msg) => msg.includes("Duplicate tag"))).toBe(true);
    }
  });

  it("rejects configuration with invalid port and missing fields", () => {
    const config = {
      version: 1,
      servers: [
        {
          tag: "invalid-port",
          name: "Invalid",
          host: "1.1.1.1",
          port: 99999, // out of range
          username: "root",
          auth: { type: "agent" },
        },
      ],
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatConfigValidationErrors(result.error);
      expect(formatted.some((msg) => msg.includes("between 1 and 65535"))).toBe(true);
    }
  });

  it("rejects plain text password in config", () => {
    const config = {
      version: 1,
      servers: [
        {
          tag: "insecure",
          name: "Insecure Server",
          host: "1.1.1.1",
          port: 22,
          username: "root",
          password: "plain-text-password", // not allowed!
          auth: { type: "agent" },
        },
      ],
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe("ConfigService", () => {
  let tempDir: string;
  let configPath: string;
  let service: ConfigService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sshdeck-test-"));
    configPath = path.join(tempDir, "config.json");
    service = new ConfigService(configPath);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("returns default empty config when file does not exist", async () => {
    const config = await service.load();
    expect(config.version).toBe(1);
    expect(config.servers).toEqual([]);
  });

  it("saves and loads configuration successfully", async () => {
    const sampleConfig: AppConfig = {
      version: 1,
      servers: [
        {
          tag: "prod",
          name: "Production",
          host: "10.0.0.1",
          port: 22,
          username: "admin",
          group: "infra",
          auth: {
            type: "key",
            keyPath: "~/.ssh/id_rsa",
          },
        },
      ],
    };

    await service.save(sampleConfig);
    const loaded = await service.load();
    expect(loaded.servers).toHaveLength(1);
    expect(loaded.servers[0]?.tag).toBe("prod");
  });

  it("creates a configuration README without replacing it on later saves", async () => {
    await service.save({ version: 1, servers: [] });
    const readmePath = path.join(tempDir, "README.md");
    await expect(fs.readFile(readmePath, "utf-8")).resolves.toContain("SSHDeck configuration");

    await fs.writeFile(readmePath, "custom guidance\n", "utf-8");
    await service.save({ version: 1, servers: [] });
    await expect(fs.readFile(readmePath, "utf-8")).resolves.toBe("custom guidance\n");
  });

  it("initializes a safe example server when creating the config file", async () => {
    await service.ensureConfigFile();
    await expect(service.load()).resolves.toMatchObject({
      servers: [
        {
          tag: "example",
          host: "192.0.2.10",
          auth: { type: "key", keyPath: "~/.ssh/id_ed25519" },
        },
      ],
    });
  });

  it("throws InvalidConfigError on malformed JSON", async () => {
    await fs.writeFile(configPath, "{ malformed json ...", "utf-8");
    await expect(service.load()).rejects.toThrow(InvalidConfigError);
  });
});

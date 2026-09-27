import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigService } from "../src/config/config.service.js";
import { ServerService } from "../src/server/server.service.js";
import type { ServerConfig } from "../src/config/config.types.js";
import { DuplicateTagError, ServerNotFoundError } from "../src/utils/errors.js";

describe("ServerService", () => {
  let tempDir: string;
  let configPath: string;
  let configService: ConfigService;
  let serverService: ServerService;

  const mockServers: ServerConfig[] = [
    {
      tag: "prod",
      name: "Production API",
      host: "192.168.1.50",
      port: 22,
      username: "root",
      group: "production",
      description: "Main API node",
      auth: { type: "key", keyPath: "~/.ssh/id_ed25519" },
    },
    {
      tag: "dev",
      name: "Development Sandbox",
      host: "10.0.0.15",
      port: 2222,
      username: "ubuntu",
      group: "development",
      description: "Dev test box",
      auth: { type: "agent" },
    },
    {
      tag: "db",
      name: "PostgreSQL Primary",
      host: "10.0.0.20",
      port: 5432,
      username: "postgres",
      group: "production",
      auth: { type: "password", secretRef: "db-secret" },
    },
  ];

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sshdeck-server-test-"));
    configPath = path.join(tempDir, "config.json");
    configService = new ConfigService(configPath);
    await configService.save({
      version: 1,
      servers: [...mockServers],
    });
    serverService = new ServerService(configService);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("lookup", () => {
    it("finds server by exact tag", async () => {
      const server = await serverService.getServerByTag("prod");
      expect(server).toBeDefined();
      expect(server?.name).toBe("Production API");
    });

    it("finds server case-insensitively", async () => {
      const server = await serverService.getServerByTag("PROD");
      expect(server).toBeDefined();
      expect(server?.tag).toBe("prod");
    });

    it("returns undefined for non-existent tag", async () => {
      const server = await serverService.getServerByTag("nonexistent");
      expect(server).toBeUndefined();
    });

    it("throws ServerNotFoundError on requireServerByTag if missing", async () => {
      await expect(serverService.requireServerByTag("missing")).rejects.toThrow(
        ServerNotFoundError
      );
    });
  });

  describe("listServers", () => {
    it("returns all servers when no group filter is given", async () => {
      const list = await serverService.listServers();
      expect(list).toHaveLength(3);
    });

    it("filters servers by group name case-insensitively", async () => {
      const list = await serverService.listServers("Production");
      expect(list).toHaveLength(2);
      expect(list.map((s) => s.tag)).toEqual(["prod", "db"]);
    });

    it("returns empty array for non-matching group", async () => {
      const list = await serverService.listServers("nonexistent-group");
      expect(list).toEqual([]);
    });
  });

  describe("addServer", () => {
    it("adds a new server successfully", async () => {
      const newServer: ServerConfig = {
        tag: "worker",
        name: "Background Worker",
        host: "10.0.0.30",
        port: 22,
        username: "worker",
        auth: { type: "agent" },
      };

      await serverService.addServer(newServer);
      const retrieved = await serverService.getServerByTag("worker");
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Background Worker");
    });

    it("rejects duplicate tag with DuplicateTagError", async () => {
      const duplicate: ServerConfig = {
        tag: "PROD", // already exists as "prod"
        name: "Another Prod",
        host: "1.2.3.4",
        port: 22,
        username: "root",
        auth: { type: "agent" },
      };

      await expect(serverService.addServer(duplicate)).rejects.toThrow(DuplicateTagError);
    });
  });

  describe("updateServer", () => {
    it("updates server details successfully", async () => {
      const updated: ServerConfig = {
        ...mockServers[0]!,
        name: "Updated Production API",
      };

      await serverService.updateServer("prod", updated);
      const server = await serverService.requireServerByTag("prod");
      expect(server.name).toBe("Updated Production API");
    });

    it("rejects renaming to an existing tag", async () => {
      const conflict: ServerConfig = {
        ...mockServers[0]!,
        tag: "dev", // dev already exists
      };

      await expect(serverService.updateServer("prod", conflict)).rejects.toThrow(DuplicateTagError);
    });
  });

  describe("removeServer", () => {
    it("removes server and returns removed configuration", async () => {
      const removed = await serverService.removeServer("dev");
      expect(removed.tag).toBe("dev");

      const list = await serverService.listServers();
      expect(list).toHaveLength(2);
      expect(await serverService.getServerByTag("dev")).toBeUndefined();
    });

    it("throws ServerNotFoundError when removing non-existent server", async () => {
      await expect(serverService.removeServer("ghost")).rejects.toThrow(ServerNotFoundError);
    });
  });

  describe("findServers", () => {
    it("searches across name, host, and description", async () => {
      const byName = await serverService.findServers("Production");
      expect(byName).toHaveLength(2);

      const byHost = await serverService.findServers("192.168");
      expect(byHost).toHaveLength(1);
      expect(byHost[0]?.tag).toBe("prod");

      const byDesc = await serverService.findServers("test box");
      expect(byDesc).toHaveLength(1);
      expect(byDesc[0]?.tag).toBe("dev");
    });
  });
});

import EventEmitter from "node:events";
import type { ChildProcess, SpawnOptions } from "node:child_process";
import { describe, expect, it } from "vitest";
import { NativeSSHService } from "../src/ssh/native-ssh.service.js";
import { SSHService } from "../src/ssh/ssh.service.js";
import type { SSHProcessSpawner } from "../src/ssh/ssh.types.js";
import type { ServerConfig } from "../src/config/config.types.js";
import { SSHConnectionError } from "../src/utils/errors.js";
import { expandHomeDir } from "../src/utils/paths.js";

describe("NativeSSHService", () => {
  const keyServer: ServerConfig = {
    tag: "prod",
    name: "Production Server",
    host: "192.168.1.100",
    port: 22,
    username: "deploy",
    auth: {
      type: "key",
      keyPath: "~/.ssh/id_ed25519",
    },
  };

  const agentServer: ServerConfig = {
    tag: "bastion",
    name: "Bastion Host",
    host: "jump.example.com",
    port: 2200,
    username: "jumpuser",
    auth: {
      type: "agent",
    },
  };

  const passwordServer: ServerConfig = {
    tag: "legacy",
    name: "Legacy Server",
    host: "10.0.0.1",
    port: 22,
    username: "admin",
    auth: {
      type: "password",
      secretRef: "legacy-pass",
    },
  };

  describe("buildSSHArgs", () => {
    const service = new NativeSSHService();

    it("generates correct arguments for key authentication", () => {
      const args = service.buildSSHArgs(keyServer);
      const expectedKeyPath = expandHomeDir("~/.ssh/id_ed25519");

      expect(args).toEqual(["-i", expectedKeyPath, "-p", "22", "deploy@192.168.1.100"]);
    });

    it("generates correct arguments for agent authentication", () => {
      const args = service.buildSSHArgs(agentServer);

      expect(args).toEqual(["-p", "2200", "jumpuser@jump.example.com"]);
    });

    it("never includes StrictHostKeyChecking=no", () => {
      const keyArgs = service.buildSSHArgs(keyServer);
      const agentArgs = service.buildSSHArgs(agentServer);

      expect(keyArgs.join(" ")).not.toContain("StrictHostKeyChecking=no");
      expect(agentArgs.join(" ")).not.toContain("StrictHostKeyChecking=no");
    });

    it("throws SSHConnectionError when attempting native connection with password auth", () => {
      expect(() => service.buildSSHArgs(passwordServer)).toThrow(SSHConnectionError);
    });
  });

  describe("connect with mock spawner", () => {
    it("spawns ssh with stdio: 'inherit' and resolves exit code", async () => {
      let capturedCommand = "";
      let capturedArgs: string[] = [];
      let capturedOptions: SpawnOptions = {};

      const mockSpawner: SSHProcessSpawner = {
        spawn: (command, args, options) => {
          capturedCommand = command;
          capturedArgs = args;
          capturedOptions = options;

          const emitter = new EventEmitter() as ChildProcess;
          setTimeout(() => {
            emitter.emit("close", 0);
          }, 10);
          return emitter;
        },
      };

      const service = new NativeSSHService(mockSpawner);
      const exitCode = await service.connect(keyServer);

      expect(capturedCommand).toBe("ssh");
      expect(capturedArgs).toEqual([
        "-i",
        expandHomeDir("~/.ssh/id_ed25519"),
        "-p",
        "22",
        "deploy@192.168.1.100",
      ]);
      expect(capturedOptions.stdio).toBe("inherit");
      expect(exitCode).toBe(0);
    });

    it("throws helpful error when ssh executable is missing (ENOENT)", async () => {
      const mockSpawner: SSHProcessSpawner = {
        spawn: () => {
          const emitter = new EventEmitter() as ChildProcess;
          setTimeout(() => {
            const err: NodeJS.ErrnoException = new Error("spawn ssh ENOENT");
            err.code = "ENOENT";
            emitter.emit("error", err);
          }, 10);
          return emitter;
        },
      };

      const service = new NativeSSHService(mockSpawner);
      await expect(service.connect(keyServer)).rejects.toThrow(
        /OpenSSH 'ssh' executable was not found/
      );
    });
  });
});

describe("SSHService", () => {
  it("routes key and agent servers to native SSH", async () => {
    let called = false;
    const mockNativeSSH = {
      connect: async () => {
        called = true;
        return 0;
      },
      buildSSHArgs: () => [],
    } as unknown as NativeSSHService;

    const router = new SSHService(mockNativeSSH);
    await router.connect({
      tag: "test",
      name: "Test",
      host: "localhost",
      port: 22,
      username: "user",
      auth: { type: "agent" },
    });

    expect(called).toBe(true);
  });
});

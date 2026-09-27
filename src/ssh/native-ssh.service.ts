import { spawn as defaultSpawn } from "node:child_process";
import type { ServerConfig } from "../config/config.types.js";
import { SSHConnectionError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { expandHomeDir } from "../utils/paths.js";
import type { SSHProcessSpawner } from "./ssh.types.js";

const defaultSpawner: SSHProcessSpawner = {
  spawn: (command, args, options) => defaultSpawn(command, args, options),
};

export class NativeSSHService {
  constructor(private spawner: SSHProcessSpawner = defaultSpawner) {}

  /**
   * Builds the command-line arguments for native OpenSSH.
   * Host key verification is never disabled.
   */
  buildSSHArgs(server: ServerConfig): string[] {
    const args: string[] = [];

    if (server.auth.type === "key") {
      const resolvedKeyPath = expandHomeDir(server.auth.keyPath);
      args.push("-i", resolvedKeyPath);
    } else if (server.auth.type === "agent") {
      // SSH Agent authentication uses standard OpenSSH agent forwarding / agent identities
    } else if (server.auth.type === "password") {
      throw new SSHConnectionError(
        `Server "${server.name}" uses stored password authentication. Password SSH runner is required.`
      );
    }

    // Port argument
    args.push("-p", server.port.toString());

    // Destination USER@HOST
    args.push(`${server.username}@${server.host}`);

    return args;
  }

  /**
   * Connects to the server by spawning native OpenSSH with stdio: "inherit".
   */
  async connect(server: ServerConfig): Promise<number> {
    const args = this.buildSSHArgs(server);

    logger.log(`Connecting to ${server.name} (${server.username}@${server.host})...`);
    logger.debug(`Executing: ssh ${args.join(" ")}`);

    return new Promise<number>((resolve, reject) => {
      try {
        const child = this.spawner.spawn("ssh", args, {
          stdio: "inherit",
        });

        child.on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "ENOENT") {
            reject(
              new SSHConnectionError(
                "OpenSSH 'ssh' executable was not found. Please ensure OpenSSH is installed and available in your PATH."
              )
            );
          } else {
            reject(new SSHConnectionError(`Failed to launch ssh process: ${err.message}`));
          }
        });

        child.on("close", (code) => {
          resolve(code ?? 0);
        });
      } catch (err) {
        reject(
          new SSHConnectionError(
            `Failed to start SSH session: ${err instanceof Error ? err.message : String(err)}`
          )
        );
      }
    });
  }
}

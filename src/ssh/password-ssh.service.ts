import { Client, type ClientChannel } from "ssh2";
import type { ServerConfig } from "../config/config.types.js";
import type { CredentialStore } from "../credentials/credential-store.js";
import { CredentialStoreError, SSHConnectionError } from "../utils/errors.js";

export class PasswordSSHService {
  constructor(private readonly credentialStore: CredentialStore) {}

  async connect(server: ServerConfig): Promise<number> {
    if (server.auth.type !== "password") {
      throw new SSHConnectionError(
        `Server "${server.tag}" is not configured for password authentication.`
      );
    }
    const password = await this.credentialStore.getSecret(server.auth.secretRef);
    if (!password) {
      throw new CredentialStoreError(
        `No password is stored for "${server.tag}". Run 'sshdeck credentials set ${server.tag}'.`
      );
    }

    return new Promise((resolve, reject) => {
      const client = new Client();
      let settled = false;
      const fail = (): void => {
        if (settled) return;
        settled = true;
        reject(new SSHConnectionError(`Unable to connect to ${server.username}@${server.host}.`));
      };
      client.once("error", fail);
      client.on("ready", () => {
        client.shell(
          {
            term: process.env.TERM || "xterm-256color",
            cols: process.stdout.columns || 80,
            rows: process.stdout.rows || 24,
          },
          (error, stream) => {
            if (error || !stream) return fail();
            this.attachTerminal(stream, () => {
              if (!settled) {
                settled = true;
                client.end();
                resolve(0);
              }
            });
          }
        );
      });
      client.connect({ host: server.host, port: server.port, username: server.username, password });
    });
  }

  private attachTerminal(stream: ClientChannel, onClose: () => void): void {
    const stdin = process.stdin;
    const wasRaw = stdin.isTTY && stdin.isRaw;
    const onInput = (data: Buffer): void => {
      stream.write(data);
    };
    const onOutput = (data: Buffer): void => {
      process.stdout.write(data);
    };
    const onResize = (): void =>
      stream.setWindow(process.stdout.rows || 24, process.stdout.columns || 80, 0, 0);
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onInput);
    stream.on("data", onOutput);
    let closed = false;
    const closeTerminal = (): void => {
      if (closed) return;
      closed = true;
      stdin.off("data", onInput);
      stdin.pause();
      stream.off("data", onOutput);
      process.stdout.off("resize", onResize);
      if (stdin.isTTY) stdin.setRawMode(Boolean(wasRaw));
      onClose();
    };
    stream.once("close", closeTerminal);
    stream.once("end", closeTerminal);
    stream.once("exit", closeTerminal);
    process.stdout.on("resize", onResize);
  }
}

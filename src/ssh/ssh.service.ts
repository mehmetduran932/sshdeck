import type { ServerConfig } from "../config/config.types.js";
import { NativeSSHService } from "./native-ssh.service.js";
import { SSHConnectionError } from "../utils/errors.js";

export class SSHService {
  constructor(private nativeSSHService: NativeSSHService = new NativeSSHService()) {}

  /**
   * Connects to the given server using the appropriate authentication backend.
   */
  async connect(server: ServerConfig): Promise<number> {
    switch (server.auth.type) {
      case "key":
      case "agent":
        return this.nativeSSHService.connect(server);
      case "password":
        // Password authentication will be handled by password SSH runner (ssh2)
        throw new SSHConnectionError(
          `Password authentication for server "${server.name}" requires the password runner module.`
        );
      default: {
        const _exhaustiveCheck: never = server.auth;
        throw new SSHConnectionError(
          `Unsupported authentication type: ${JSON.stringify(_exhaustiveCheck)}`
        );
      }
    }
  }
}

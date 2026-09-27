import type { ServerConfig } from "../config/config.types.js";
import { NativeSSHService } from "./native-ssh.service.js";
import { PasswordSSHService } from "./password-ssh.service.js";

export class SSHService {
  constructor(
    private nativeSSHService: NativeSSHService = new NativeSSHService(),
    private passwordSSHService?: PasswordSSHService
  ) {}

  /**
   * Connects to the given server using the appropriate authentication backend.
   */
  async connect(server: ServerConfig): Promise<number> {
    switch (server.auth.type) {
      case "key":
      case "agent":
        return this.nativeSSHService.connect(server);
      case "password":
        if (!this.passwordSSHService) throw new Error("Password SSH service is not configured.");
        return this.passwordSSHService.connect(server);
    }
  }
}

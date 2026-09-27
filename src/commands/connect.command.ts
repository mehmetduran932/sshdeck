import type { ServerService } from "../server/server.service.js";
import type { SSHService } from "../ssh/ssh.service.js";

export async function connectCommand(
  tag: string,
  serverService: ServerService,
  sshService: SSHService
): Promise<number> {
  const server = await serverService.requireServerByTag(tag);
  return sshService.connect(server);
}

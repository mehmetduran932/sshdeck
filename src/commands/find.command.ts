import type { ServerService } from "../server/server.service.js";
import { printServerTable } from "./list.command.js";
import { logger } from "../utils/logger.js";

export async function findCommand(query: string, serverService: ServerService): Promise<void> {
  const servers = await serverService.findServers(query);
  if (servers.length === 0) {
    logger.log(`No servers found matching "${query}".`);
    return;
  }
  printServerTable(servers);
}

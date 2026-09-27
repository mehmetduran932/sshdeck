import pc from "picocolors";
import type { ServerConfig } from "../config/config.types.js";
import type { ServerService } from "../server/server.service.js";
import { logger } from "../utils/logger.js";

export async function listCommand(
  groupFilter: string | undefined,
  serverService: ServerService
): Promise<void> {
  const servers = await serverService.listServers(groupFilter);

  if (servers.length === 0) {
    if (groupFilter) {
      logger.log(`No servers found in group "${groupFilter}".`);
    } else {
      logger.log(`No servers configured yet. Run 'sshdeck add' to add a server.`);
    }
    return;
  }

  printServerTable(servers);
}

export function printServerTable(servers: ServerConfig[]): void {
  const headers = {
    tag: "TAG",
    name: "NAME",
    host: "HOST",
    user: "USER",
    group: "GROUP",
  };

  // Compute maximum width for each column
  let maxTag = headers.tag.length;
  let maxName = headers.name.length;
  let maxHost = headers.host.length;
  let maxUser = headers.user.length;
  let maxGroup = headers.group.length;

  for (const s of servers) {
    if (s.tag.length > maxTag) maxTag = s.tag.length;
    if (s.name.length > maxName) maxName = s.name.length;
    if (s.host.length > maxHost) maxHost = s.host.length;
    if (s.username.length > maxUser) maxUser = s.username.length;
    const groupStr = s.group ?? "-";
    if (groupStr.length > maxGroup) maxGroup = groupStr.length;
  }

  // Padding
  const pad = 3;
  const colTag = maxTag + pad;
  const colName = maxName + pad;
  const colHost = maxHost + pad;
  const colUser = maxUser + pad;

  // Header line
  const headerLine =
    pc.bold(headers.tag.padEnd(colTag)) +
    pc.bold(headers.name.padEnd(colName)) +
    pc.bold(headers.host.padEnd(colHost)) +
    pc.bold(headers.user.padEnd(colUser)) +
    pc.bold(headers.group);

  logger.log(headerLine);

  // Rows
  for (const s of servers) {
    const tag = pc.cyan(s.tag.padEnd(colTag));
    const name = s.name.padEnd(colName);
    const host = s.host.padEnd(colHost);
    const user = s.username.padEnd(colUser);
    const group = s.group ? pc.dim(s.group) : pc.dim("-");

    logger.log(`${tag}${name}${host}${user}${group}`);
  }
}

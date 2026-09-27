import type { ServerService } from "../server/server.service.js";
import { logger } from "../utils/logger.js";
import { type ServerPrompts, systemPrompts } from "./server-prompts.js";

export async function removeCommand(
  tag: string,
  force: boolean,
  serverService: ServerService,
  prompts: ServerPrompts = systemPrompts
): Promise<void> {
  const server = await serverService.requireServerByTag(tag);
  const approved =
    force ||
    (await prompts.confirm(
      `Remove server "${server.tag}" (${server.username}@${server.host})?`,
      false
    ));

  if (!approved) {
    logger.info("Removal cancelled.");
    return;
  }

  await serverService.removeServer(tag);
  logger.success(`Removed server "${server.tag}".`);
}

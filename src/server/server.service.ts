import type { ConfigService } from "../config/config.service.js";
import type { ServerConfig } from "../config/config.types.js";
import { DuplicateTagError, ServerNotFoundError } from "../utils/errors.js";

export class ServerService {
  constructor(private configService: ConfigService) {}

  /**
   * Retrieves a server by tag (case-insensitive).
   */
  async getServerByTag(tag: string): Promise<ServerConfig | undefined> {
    const config = await this.configService.load();
    const normalizedTag = tag.trim().toLowerCase();
    return config.servers.find((server) => server.tag.toLowerCase() === normalizedTag);
  }

  /**
   * Retrieves a server by tag, throwing ServerNotFoundError if not found.
   */
  async requireServerByTag(tag: string): Promise<ServerConfig> {
    const server = await this.getServerByTag(tag);
    if (!server) {
      throw new ServerNotFoundError(tag);
    }
    return server;
  }

  /**
   * Lists all configured servers, optionally filtering by group name.
   */
  async listServers(groupFilter?: string): Promise<ServerConfig[]> {
    const config = await this.configService.load();
    if (!groupFilter) {
      return config.servers;
    }
    const normalizedGroup = groupFilter.trim().toLowerCase();
    return config.servers.filter((server) => server.group?.toLowerCase() === normalizedGroup);
  }

  /**
   * Adds a new server to the configuration.
   */
  async addServer(newServer: ServerConfig): Promise<void> {
    const config = await this.configService.load();
    const normalizedTag = newServer.tag.trim().toLowerCase();

    const exists = config.servers.some((server) => server.tag.toLowerCase() === normalizedTag);
    if (exists) {
      throw new DuplicateTagError(newServer.tag);
    }

    config.servers.push(newServer);
    await this.configService.save(config);
  }

  /**
   * Updates an existing server by original tag.
   */
  async updateServer(originalTag: string, updatedServer: ServerConfig): Promise<void> {
    const config = await this.configService.load();
    const normalizedOrigTag = originalTag.trim().toLowerCase();
    const index = config.servers.findIndex((s) => s.tag.toLowerCase() === normalizedOrigTag);

    if (index === -1) {
      throw new ServerNotFoundError(originalTag);
    }

    // If tag changed, ensure new tag does not conflict with another server
    const normalizedNewTag = updatedServer.tag.trim().toLowerCase();
    if (normalizedNewTag !== normalizedOrigTag) {
      const conflict = config.servers.some(
        (s, i) => i !== index && s.tag.toLowerCase() === normalizedNewTag
      );
      if (conflict) {
        throw new DuplicateTagError(updatedServer.tag);
      }
    }

    config.servers[index] = updatedServer;
    await this.configService.save(config);
  }

  /**
   * Removes a server by tag and returns the removed server definition.
   */
  async removeServer(tag: string): Promise<ServerConfig> {
    const config = await this.configService.load();
    const normalizedTag = tag.trim().toLowerCase();
    const index = config.servers.findIndex((s) => s.tag.toLowerCase() === normalizedTag);

    if (index === -1) {
      throw new ServerNotFoundError(tag);
    }

    const [removed] = config.servers.splice(index, 1);
    await this.configService.save(config);
    return removed!;
  }

  /**
   * Searches servers across tag, name, host, username, group, and description.
   */
  async findServers(query: string): Promise<ServerConfig[]> {
    const config = await this.configService.load();
    const q = query.trim().toLowerCase();

    return config.servers.filter((s) => {
      return (
        s.tag.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.host.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        (s.group && s.group.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
      );
    });
  }
}

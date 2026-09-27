import fs from "node:fs/promises";
import path from "node:path";
import {
  CURRENT_CONFIG_VERSION,
  POSIX_DIR_PERMISSIONS,
  POSIX_FILE_PERMISSIONS,
} from "../constants/app.constants.js";
import { resolveConfigPath } from "./config.paths.js";
import { ConfigSchema, formatConfigValidationErrors } from "./config.schema.js";
import type { AppConfig } from "./config.types.js";
import { InvalidConfigError } from "../utils/errors.js";

export class ConfigService {
  private configPath: string;

  constructor(customPath?: string) {
    this.configPath = resolveConfigPath(customPath);
  }

  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Loads and validates the configuration from disk.
   * Returns a default empty configuration if the file does not exist.
   */
  async load(): Promise<AppConfig> {
    let rawContent: string;
    try {
      rawContent = await fs.readFile(this.configPath, "utf-8");
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          version: CURRENT_CONFIG_VERSION,
          servers: [],
        };
      }
      throw err;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InvalidConfigError(`Failed to parse configuration JSON at ${this.configPath}:`, [
        `- ${message}`,
      ]);
    }

    const validationResult = ConfigSchema.safeParse(parsed);
    if (!validationResult.success) {
      const details = formatConfigValidationErrors(validationResult.error);
      throw new InvalidConfigError("Invalid SSHDeck configuration.", details);
    }

    return validationResult.data;
  }

  /**
   * Saves the configuration to disk and enforces strict file permissions.
   */
  async save(config: AppConfig): Promise<void> {
    const validationResult = ConfigSchema.safeParse(config);
    if (!validationResult.success) {
      const details = formatConfigValidationErrors(validationResult.error);
      throw new InvalidConfigError("Cannot save invalid configuration.", details);
    }

    const dirPath = path.dirname(this.configPath);
    await fs.mkdir(dirPath, { recursive: true });

    // Set POSIX directory permissions 700 (rwx------)
    if (process.platform !== "win32") {
      try {
        await fs.chmod(dirPath, POSIX_DIR_PERMISSIONS);
      } catch {
        // Ignore chmod errors on filesystems that don't support it
      }
    }

    const content = JSON.stringify(validationResult.data, null, 2) + "\n";
    await fs.writeFile(this.configPath, content, { encoding: "utf-8" });

    await this.ensureConfigReadme(dirPath);

    // Set POSIX file permissions 600 (rw-------)
    if (process.platform !== "win32") {
      try {
        await fs.chmod(this.configPath, POSIX_FILE_PERMISSIONS);
      } catch {
        // Ignore chmod errors on filesystems that don't support it
      }
    }
  }

  /**
   * Ensures the configuration file exists on disk, initializing with default if absent.
   */
  async ensureConfigFile(): Promise<void> {
    try {
      await fs.access(this.configPath);
    } catch {
      await this.save({
        version: CURRENT_CONFIG_VERSION,
        servers: [],
      });
    }
  }

  private async ensureConfigReadme(dirPath: string): Promise<void> {
    const readmePath = path.join(dirPath, "README.md");
    try {
      await fs.access(readmePath);
      return;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }

    const content = [
      "# SSHDeck configuration",
      "",
      "Add and edit servers with `sshdeck add` and `sshdeck edit <tag>`.",
      "",
      "`config.json` stores server metadata only. Never put passwords or private keys in it.",
      "",
      "The file is managed and validated by SSHDeck. You may also edit it manually when SSHDeck is not running.",
      "",
    ].join("\n");
    await fs.writeFile(readmePath, content, { encoding: "utf-8" });
  }
}

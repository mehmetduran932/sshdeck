import os from "node:os";
import path from "node:path";
import { CONFIG_DIR_NAME, CONFIG_FILE_NAME } from "../constants/app.constants.js";
import { expandHomeDir } from "../utils/paths.js";

/**
 * Returns the default configuration directory path. Windows uses C:\\sshdeck;
 * macOS and Linux use ~/.sshdeck.
 * Can be overridden by SSHDECK_CONFIG_DIR environment variable.
 */
export function getDefaultConfigDir(): string {
  if (process.env.SSHDECK_CONFIG_DIR) {
    return path.resolve(expandHomeDir(process.env.SSHDECK_CONFIG_DIR));
  }
  if (process.platform === "win32") {
    return "C:\\sshdeck";
  }
  return path.join(os.homedir(), CONFIG_DIR_NAME);
}

/**
 * Returns the default configuration file path.
 * Can be overridden by SSHDECK_CONFIG_PATH environment variable.
 */
export function getDefaultConfigPath(): string {
  if (process.env.SSHDECK_CONFIG_PATH) {
    return path.resolve(expandHomeDir(process.env.SSHDECK_CONFIG_PATH));
  }
  return path.join(getDefaultConfigDir(), CONFIG_FILE_NAME);
}

/**
 * Resolves a given config file path or falls back to default.
 */
export function resolveConfigPath(customPath?: string): string {
  if (customPath) {
    return path.resolve(expandHomeDir(customPath));
  }
  return getDefaultConfigPath();
}

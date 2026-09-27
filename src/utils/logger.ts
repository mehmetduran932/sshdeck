import pc from "picocolors";

export interface LoggerOptions {
  verbose?: boolean;
}

export class Logger {
  private verboseEnabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.verboseEnabled =
      Boolean(options.verbose) ||
      process.env.SSHDECK_DEBUG === "1" ||
      process.env.DEBUG === "sshdeck";
  }

  setVerbose(verbose: boolean): void {
    this.verboseEnabled = verbose;
  }

  isVerbose(): boolean {
    return this.verboseEnabled;
  }

  log(message: string): void {
    console.log(message);
  }

  info(message: string): void {
    console.log(pc.cyan("ℹ ") + message);
  }

  success(message: string): void {
    console.log(pc.green("✓ ") + message);
  }

  warn(message: string): void {
    console.warn(pc.yellow("! ") + message);
  }

  error(message: string, error?: unknown): void {
    console.error(pc.red("✗ ") + message);
    if (this.verboseEnabled && error instanceof Error && error.stack) {
      console.error(pc.dim(error.stack));
    }
  }

  debug(message: string): void {
    if (this.verboseEnabled) {
      console.log(pc.dim(`[DEBUG] ${message}`));
    }
  }
}

export const logger = new Logger();

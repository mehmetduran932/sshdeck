#!/usr/bin/env node

import { createRequire } from "node:module";
import { Command } from "commander";
import { ConfigService } from "./config/config.service.js";
import { ServerService } from "./server/server.service.js";
import { SSHService } from "./ssh/ssh.service.js";
import { connectCommand } from "./commands/connect.command.js";
import { listCommand } from "./commands/list.command.js";
import { addCommand, editCommand } from "./commands/server-wizard.command.js";
import { removeCommand } from "./commands/remove.command.js";
import { findCommand } from "./commands/find.command.js";
import { logger } from "./utils/logger.js";
import { SSHDeckError, SSHConnectionError } from "./utils/errors.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string; description: string };

export function createProgram(
  configService = new ConfigService(),
  serverService = new ServerService(configService),
  sshService = new SSHService()
): Command {
  const program = new Command();

  program
    .name("sshdeck")
    .description("Fast SSH connection manager.")
    .version(pkg.version, "-v, --version", "Output the current version")
    .option("--verbose", "Enable verbose debug output")
    .hook("preAction", (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.verbose) {
        logger.setVerbose(true);
      }
    });

  // Direct connection or default action
  program.argument("[tag]", "Server tag to connect to").action(async (tag: string | undefined) => {
    if (!tag) {
      program.outputHelp();
      return;
    }
    try {
      const exitCode = await connectCommand(tag, serverService, sshService);
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    } catch (err) {
      handleCliError(err);
    }
  });

  // Connect command (sshdeck connect <tag> / sshdeck c <tag>)
  program
    .command("connect <tag>")
    .alias("c")
    .description("Connect to a server")
    .action(async (tag: string) => {
      try {
        const exitCode = await connectCommand(tag, serverService, sshService);
        if (exitCode !== 0) {
          process.exit(exitCode);
        }
      } catch (err) {
        handleCliError(err);
      }
    });

  // List command (sshdeck list / sshdeck ls [group])
  program
    .command("list [group]")
    .alias("ls")
    .description("List servers")
    .action(async (group?: string) => {
      try {
        await listCommand(group, serverService);
      } catch (err) {
        handleCliError(err);
      }
    });

  program
    .command("add")
    .description("Add a server")
    .action(async () => {
      try {
        await addCommand(serverService);
      } catch (err) {
        handleCliError(err);
      }
    });

  program
    .command("edit <tag>")
    .description("Edit a server")
    .action(async (tag: string) => {
      try {
        await editCommand(tag, serverService);
      } catch (err) {
        handleCliError(err);
      }
    });

  program
    .command("remove <tag>")
    .alias("rm")
    .description("Remove a server")
    .option("-f, --force", "Remove without confirmation")
    .action(async (tag: string, options: { force?: boolean }) => {
      try {
        await removeCommand(tag, Boolean(options.force), serverService);
      } catch (err) {
        handleCliError(err);
      }
    });

  program
    .command("find <query>")
    .description("Search servers")
    .action(async (query: string) => {
      try {
        await findCommand(query, serverService);
      } catch (err) {
        handleCliError(err);
      }
    });

  program
    .command("import <file>")
    .description("Import configuration")
    .action(() => {
      logger.info("The 'import' command will be available in the next release phase.");
    });

  program
    .command("export")
    .description("Export configuration")
    .action(() => {
      logger.info("The 'export' command will be available in the next release phase.");
    });

  program
    .command("doctor")
    .description("Diagnose SSHDeck setup")
    .action(() => {
      logger.info("The 'doctor' diagnostics command will be available in the next release phase.");
    });

  program
    .command("config [action]")
    .description("Show configuration information")
    .action(() => {
      logger.log(`Config file:\n${configService.getConfigPath()}`);
    });

  return program;
}

function handleCliError(err: unknown): never {
  if (err instanceof SSHDeckError) {
    logger.error(err.message);
    if (err instanceof SSHConnectionError && typeof err.exitCode === "number") {
      process.exit(err.exitCode);
    }
    process.exit(1);
  }

  const message = err instanceof Error ? err.message : String(err);
  logger.error(`An unexpected error occurred: ${message}`, err);
  process.exit(1);
}

// Execute when invoked directly
if (
  (process.argv[1] && process.argv[1].endsWith("cli.js")) ||
  process.argv[1]?.endsWith("cli.ts")
) {
  const program = createProgram();
  program.parse(process.argv);
}

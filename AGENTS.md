# AGENTS.md - Multi-Agent Development Guide for SSHDeck

Welcome AI Agent! This document contains the operational context, constraints, and architecture needed to continue development on SSHDeck seamlessly.

---

## High-Level Vision
SSHDeck is a fast, tag-based SSH connection manager written in TypeScript for Node.js.
Command: `sshdeck <tag>` (or alias `sd <tag>`).

---

## Critical Invariants

1. **Security & Secrets**:
   - `config.json` stores metadata and `secretRef` strings only.
   - Real passwords live in the OS credential store (macOS Keychain, Windows Credential Manager, Linux Secret Service).
   - Never log passwords or private keys.
   - Never inject `StrictHostKeyChecking=no` into OpenSSH arguments.
2. **Terminal Preservation**:
   - Key and agent SSH sessions spawn system `ssh` with `{ stdio: "inherit" }` so that full interactive TTY tools (`nano`, `vim`, `htop`, `tmux`, password prompts) function normally.
3. **Configuration Storage**:
   - Default: `~/.sshdeck/config.json`.
   - On POSIX, directory permissions are `0700` and file permissions are `0600`.
   - Always validate with Zod (`ConfigSchema`) on load and save.
   - Handle environment variable overrides `SSHDECK_CONFIG_PATH` and `SSHDECK_CONFIG_DIR` (used in tests).
4. **Error Handling**:
   - Throw domain errors (`ServerNotFoundError`, `DuplicateTagError`, `InvalidConfigError`, `SSHConnectionError`).
   - Clean, friendly CLI output without raw stack traces unless `--verbose` is provided.

---

## Roadmap & Implementation Phases

Refer to [CURRENT_STATE.md](file:///Users/mehmetduran/mehmet-dev/ssh-deck/CURRENT_STATE.md) for live status.

1. **Phase 1: Foundation (COMPLETED)**
   - TypeScript setup, tsup, Vitest, ESLint, Prettier.
   - Zod configuration schema and `ConfigService`.
   - `ServerService` lookup and CRUD.
   - Native SSH execution with `stdio: inherit`.
   - CLI commands: `sshdeck <tag>`, `sshdeck connect <tag>`, `sshdeck list [group]`.
   - Unit tests and test mocks.

2. **Phase 2: Interactive Commands & Credentials**
   - Interactive `sshdeck add` (Inquirer / @inquirer/prompts).
   - Interactive `sshdeck edit <tag>`.
   - `sshdeck remove <tag>` / `sshdeck rm <tag>` with `--force`.
   - `sshdeck find <query>` search.
   - `SystemCredentialStore` implementation using `@keytar` or `node-keytar` / OS-keychain native bindings.
   - Stored-password SSH connection using `ssh2` with PTY and window resize forwarding.

3. **Phase 3: Utility & Diagnostics**
   - `sshdeck import <file>` (`--overwrite` option).
   - `sshdeck export [--output file]` (never exports passwords, only `secretRef`).
   - `sshdeck doctor` diagnostics check.
   - `sshdeck config` and `sshdeck config path`.

4. **Phase 4: Distribution & Packaging**
   - Standalone binary builds (`pkg` / Node SEA / Bun compile) for Linux x64, macOS x64/arm64, Windows x64.
   - Install scripts: `scripts/install.sh` and `scripts/install.ps1`.
   - GitHub Actions CI / Release workflow.

---

## Verifying Code

Before committing or ending your turn, run:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

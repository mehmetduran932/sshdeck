# Current State

## Current Version
`0.1.0` (MVP Foundation Phase Complete)

## Implemented
- **Project Infrastructure**: TypeScript 5 (NodeNext, strict mode), ESLint 9 (flat config), Prettier, Vitest, tsup bundler.
- **Config Architecture**:
  - Zod schemas (`ConfigSchema`, `ServerSchema`, `AuthConfigSchema`) with custom formatters for clean, non-stacktrace error reports.
  - Safe path resolution for `~/.sshdeck/config.json` via `os.homedir()` with `SSHDECK_CONFIG_PATH` and `SSHDECK_CONFIG_DIR` environment overrides.
  - Automatic directory and file permission enforcement (`0700` and `0600` on POSIX systems).
- **Domain Services**:
  - `ConfigService`: Loading, validation, and atomic writing of configuration.
  - `ServerService`: Case-insensitive tag lookup, CRUD operations, duplicate tag prevention, group filtering, and multi-field search.
  - `NativeSSHService`: Command argument builder and OpenSSH spawner with `stdio: "inherit"` preserving full interactive TTY features (`vim`, `htop`, ANSI colors, signals).
  - `SSHService`: Facade routing between native OpenSSH (key/agent) and future password runner.
  - `CredentialStore`: Interface and `MemoryCredentialStore` implementation.
- **CLI Commands**:
  - `sshdeck <tag>` / `sd <tag>`: Direct fast connection.
  - `sshdeck connect <tag>` / `sshdeck c <tag>`: Explicit connection.
  - `sshdeck list [group]` / `sshdeck ls [group]`: Formatted table view with dynamic column sizing and group filtering.
  - `--verbose` / `SSHDECK_DEBUG=1` toggle.
  - Global error handler with domain error formatting.
- **Test Suite**:
  - 38 passing unit and integration tests across 6 suites covering schemas, validation, paths, server CRUD, OpenSSH command building, and CLI invocation.

## In Progress
- Interactive CLI server management is complete; OS-level Credential Store and password transport remain.

## Remaining
- **Phase 2**:
  - `SystemCredentialStore` integration (macOS Keychain, Windows Credential Manager, Linux Secret Service).
  - Password SSH runner using `ssh2` with PTY and terminal resize forwarding.
- **Phase 3**:
  - `sshdeck import <file>` (`--overwrite`).
  - `sshdeck export [--output file]`.
  - `sshdeck doctor` environment diagnostics.
  - `sshdeck config [path]`.
- **Phase 4**:
  - Standalone binary packaging (x64 / arm64).
  - Installer scripts with PATH and configuration initialization are implemented; release artifacts remain.
  - GitHub Actions CI/CD workflows for PRs and releases.
  - Architecture and security deep-dive docs (`docs/architecture.md`, `docs/security.md`, etc.).

## Important Decisions
- **`stdio: "inherit"` for Native SSH**: Ensures full terminal compatibility with vim, nano, htop, tmux, and interactive sudo prompts. No artificial TUI wraps around the SSH process.
- **Tag Lookup Case-Insensitive**: Server tags are matched case-insensitively for user convenience while preserving original case in config. Duplicate tags differing only in case are rejected.
- **Strict Zod Parsing**: Rejects plain text passwords in `config.json` at parse time.
- **Single-file ESM Bundling**: Used `tsup` to produce standalone executable ESM artifacts in `dist/` with shebang.

## Known Issues
- None in the implemented foundation.

## Next Recommended Task
- Implement the OS-level `SystemCredentialStore`, then password SSH transport with PTY and resize forwarding.

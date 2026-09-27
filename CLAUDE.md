# CLAUDE.md - SSHDeck Developer & Agent Guide

## Project Purpose
**SSHDeck** is a fast, tag-based, cross-platform SSH connection manager for developers and system administrators.
It enables connecting to configured SSH servers using short tags (e.g. `sshdeck prod`, `sd 92`) instead of long native SSH commands. It operates completely locally with native OpenSSH and secure OS-backed credential storage.

---

## Architectural Principles & Boundaries

1. **Lightweight & CLI-focused**: Avoid bloated frameworks or heavy terminal UI overlays.
2. **Native OpenSSH First**: Native OpenSSH handles key and agent authentication with `stdio: "inherit"`. Interactive tools like `vim`, `htop`, `tmux`, `sudo`, and terminal resize must work natively.
3. **Secure Credential Isolation**: Passwords must never be saved in `config.json`. Password authentication uses `secretRef` pointers to OS-level secure storage (Keychain, Credential Manager, Secret Service).
4. **Offline & Privacy-First**: 100% local operation. Zero telemetry, zero analytics, zero external network dependencies.
5. **Robust Cross-Platform Support**: macOS, Linux, and Windows. Path resolution uses `os.homedir()` and normalized separators.

---

## Non-Negotiable Security Rules

> [!CAUTION]
> **Strict Security Invariants:**
> 1. **NEVER store SSH passwords in `config.json`**. Stored passwords must always be kept in OS-level credential storage via `CredentialStore`.
> 2. **NEVER log secrets, passwords, private key contents, or decrypted credentials** to stdout, stderr, or log files.
> 3. **NEVER disable SSH host key verification by default** (`StrictHostKeyChecking=no` must never be injected). Respect system `known_hosts`.
> 4. **NEVER replace, override, or alias the operating system's native `ssh` command**. SSHDeck binary names are `sshdeck` and `sd`.

---

## Project Structure & Key Files

```text
sshdeck/
├── src/
│   ├── cli.ts                         # Commander.js entry point and CLI definitions
│   ├── index.ts                       # Public API export
│   ├── commands/
│   │   ├── connect.command.ts         # Direct connection & connect command handler
│   │   └── list.command.ts            # Server table listing and group filtering
│   ├── config/
│   │   ├── config.types.ts            # AppConfig, ServerConfig, AuthConfig types
│   │   ├── config.schema.ts           # Zod validation schemas and error formatters
│   │   ├── config.paths.ts            # Platform-independent ~/.sshdeck/config.json resolution
│   │   └── config.service.ts          # Config persistence, JSON validation & POSIX permissions
│   ├── server/
│   │   └── server.service.ts          # Server lookup, CRUD, group filter, and search
│   ├── ssh/
│   │   ├── ssh.types.ts               # SSHProcessSpawner interface & execution types
│   │   ├── native-ssh.service.ts      # OpenSSH argument builder & stdio:inherit spawner
│   │   └── ssh.service.ts             # Authentication routing (native vs password)
│   ├── credentials/
│   │   ├── credential-store.ts        # CredentialStore interface abstraction
│   │   └── memory-credential-store.ts # In-memory reference/test store
│   ├── utils/
│   │   ├── errors.ts                  # Domain error classes (ServerNotFound, etc.)
│   │   ├── logger.ts                  # Minimalist logger with debug/verbose support
│   │   └── paths.ts                   # Tilde expansion and path normalization
│   └── constants/
│       └── app.constants.ts           # App name, file permissions, and defaults
├── tests/                             # Vitest unit & integration test suites
├── tsup.config.ts                     # Bundler config for single-file ESM distribution
├── vitest.config.ts                   # Vitest configuration
├── eslint.config.js                   # ESLint flat configuration
└── package.json
```

---

## Commands & Workflow

All development commands require Node.js 18+ (Node 22 recommended):

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Lint check / fix
npm run lint
npm run lint:fix

# Formatting
npm run format:check
npm run format

# Build bundle
npm run build

# Run local development CLI
npm run dev -- <tag>
npm run dev -- list
```

---

## Coding Conventions

- **Strict TypeScript**: `"strict": true`, no `any` types allowed. Use explicit types for public methods and return signatures.
- **Dependency Injection**: Accept services and spawners through constructors or function arguments to enable clean unit testing.
- **Pure Logic & Testability**: Keep command argument generation pure and testable without relying on external system state.
- **Domain Errors**: Use specific domain errors (`ServerNotFoundError`, `DuplicateTagError`, `InvalidConfigError`, `SSHConnectionError`) rather than generic `Error`.
- **Clean CLI Output**: Do not dump stack traces on common user errors unless `--verbose` or `SSHDECK_DEBUG=1` is enabled.

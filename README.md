# SSHDeck

> Fast, tag-based SSH connection manager for Windows, macOS and Linux.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

---

## Overview

**SSHDeck** is a lightweight, cross-platform CLI tool built for developers, DevOps engineers, and system administrators who frequently connect to multiple remote servers. Instead of remembering IP addresses, ports, usernames, and identity file paths, SSHDeck allows you to connect instantly using short memorable tags or aliases.

```bash
# Connect to production instantly
sshdeck prod

# Or using the short alias
sd 92
```

---

## Why SSHDeck?

- ⚡ **Zero Friction**: The shortest path is the primary path. Run `sshdeck <tag>` and get handed off to your server immediately.
- 💻 **Native Terminal Experience**: Uses your native OpenSSH backend with `stdio: inherit`. Interactive full-screen tools like `vim`, `nano`, `htop`, `tmux`, `sudo` password prompts, ANSI colors, and terminal resize work seamlessly.
- 🔒 **Zero Plain-Text Passwords**: Passwords are never saved in `config.json`. Password references (`secretRef`) map to OS-native secure credential stores (macOS Keychain, Windows Credential Manager, Linux Secret Service).
- 🛡️ **Host Key Verification Preserved**: Never bypasses `known_hosts` or forces `StrictHostKeyChecking=no`.
- 📁 **Human-Readable Configuration**: Managed via a clean, validated JSON file (`~/.sshdeck/config.json`).
- 🌐 **100% Offline & Private**: Zero telemetry, zero analytics, zero external cloud dependencies.

---

## Installation

### Via npm

```bash
npm install -g sshdeck
```

### Standalone Binary (Coming Soon)

Download the standalone executable for your operating system and architecture from GitHub Releases:

- **macOS**: `sshdeck-macos-arm64` / `sshdeck-macos-x64`
- **Linux**: `sshdeck-linux-x64`
- **Windows**: `sshdeck-windows-x64.exe`

One-line installation via curl (macOS / Linux):
```bash
curl -fsSL https://raw.githubusercontent.com/sshdeck/sshdeck/main/scripts/install.sh | bash
```

Or PowerShell (Windows):
```powershell
irm https://raw.githubusercontent.com/sshdeck/sshdeck/main/scripts/install.ps1 | iex
```

The installers add their binary directory to your user `PATH`, install both
`sshdeck` and its `sd` shorthand, and initialize an empty metadata-only config
without overwriting an existing file. On Windows this is
`C:\sshdeck\config.json`; on macOS/Linux it is `~/.sshdeck/config.json`. Each
configuration folder includes a `README.md` with the editing guidance. No
environment variable setup is required; `SSHDECK_CONFIG_PATH` and
`SSHDECK_CONFIG_DIR` remain available for custom locations.

---

## Quick Start

### 1. Configure a Server

Servers are defined in `~/.sshdeck/config.json`. You can create or edit this file directly:

For the easiest setup, run `sshdeck add`, choose **Password**, and enter the password once when asked. SSHDeck creates the credential reference automatically and saves the password in your operating system's secure credential store.

```json
{
  "version": 1,
  "servers": [
    {
      "tag": "prod",
      "name": "Production API",
      "host": "203.0.113.10",
      "port": 22,
      "username": "root",
      "group": "production",
      "description": "Main API cluster node",
      "auth": {
        "type": "key",
      "keyPath": "~/.ssh/your_private_key"
      }
    },
    {
      "tag": "dev",
      "name": "Development Sandbox",
      "host": "198.51.100.20",
      "port": 22,
      "username": "ubuntu",
      "group": "development",
      "auth": {
        "type": "agent"
      }
    }
  ]
}
```

### 2. List Configured Servers

```bash
sshdeck list
# or
sshdeck ls
```

Output:
```text
TAG        NAME                HOST              USER       GROUP
prod       Production API      203.0.113.10      root       production
dev        Development Sandbox 198.51.100.20     ubuntu     development
```

### 3. Connect

```bash
sshdeck prod
```

SSHDeck prints a minimal connection banner and immediately hands terminal control to OpenSSH:
```text
Connecting to Production API (root@203.0.113.10)...
```

---

## Commands

| Command | Alias | Description |
| :--- | :--- | :--- |
| `sshdeck <tag>` | `sd <tag>` | Directly connect to a server by tag |
| `sshdeck connect <tag>` | `sshdeck c <tag>` | Explicit connect command |
| `sshdeck list [group]` | `sshdeck ls [group]` | List all servers (optionally filtered by group) |
| `sshdeck add` | | Interactively register a new server |
| `sshdeck edit <tag>` | | Interactively modify an existing server |
| `sshdeck remove <tag> [--force]` | `sshdeck rm <tag>` | Remove a server, with confirmation by default |
| `sshdeck find <query>` | | Search servers by name, tag, host, user, group, or description |
| `sshdeck import <file>` | | Import configuration from JSON *(Phase 3)* |
| `sshdeck export` | | Export safe configuration metadata *(Phase 3)* |
| `sshdeck doctor` | | Run environment and diagnostic checks *(Phase 3)* |
| `sshdeck config [path]` | | Display config file path and status |
| `sshdeck --help` | `-h` | Display command help |
| `sshdeck --version` | `-v` | Display version |

---

## Authentication Modes

### 1. SSH Key Authentication

Specifies a private identity key on your local machine:

```json
{
  "auth": {
    "type": "key",
    "keyPath": "~/.ssh/your_private_key"
  }
}
```

Tilde (`~`) paths are automatically expanded to your home directory across all platforms.

### 2. SSH Agent Authentication

Leverages your local SSH agent session (e.g. `ssh-agent`, 1Password, or YubiKey agent):

```json
{
  "auth": {
    "type": "agent"
  }
}
```

### 3. Password Authentication

Passwords must **never** be written to `config.json`. Instead, a `secretRef` key points to the operating system's credential store:

```json
{
  "auth": {
    "type": "password",
    "secretRef": "prod-db-root"
  }
}
```

---

## Server Groups

Organize your servers into functional groups (e.g. `production`, `development`, `database`). You can filter by group directly:

```bash
sshdeck ls production
```

---

## Configuration Details

Configuration is stored at:
- **Default Path**: `C:\sshdeck\config.json` on Windows; `~/.sshdeck/config.json` on macOS/Linux.
- **Permissions**: Directory `0700` (`rwx------`), file `0600` (`rw-------`) on POSIX filesystems.
- **Environment Overrides**:
  - `SSHDECK_CONFIG_PATH`: Custom path to `config.json`.
  - `SSHDECK_CONFIG_DIR`: Custom configuration directory.
  - `SSHDECK_DEBUG=1` or `sshdeck --verbose`: Enables verbose debug logging.

---

## Security Invariants

1. **Host Verification**: SSHDeck honors your existing OpenSSH `known_hosts` configuration. It does not disable strict host checking.
2. **Credential Safety**: Plain-text passwords inside `config.json` are rejected by schema validation. Secrets are stored in OS keychain facilities.
3. **No Process Hijacking**: SSHDeck never overrides or modifies your system's native `/usr/bin/ssh` binary.

---

## Development

```bash
# Clone the repository
git clone https://github.com/sshdeck/sshdeck.git
cd sshdeck

# Install dependencies (requires Node.js 18+)
npm install

# Run unit and integration tests
npm test

# Check code formatting & linting
npm run lint
npm run format:check

# Type checking
npm run typecheck

# Build distribution bundle
npm run build
```

---

## License

MIT License. See [LICENSE](file:///Users/mehmetduran/mehmet-dev/ssh-deck/LICENSE) for details.

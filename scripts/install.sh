#!/usr/bin/env sh
# Installs SSHDeck and makes its commands available in future shell sessions.
set -eu

REPOSITORY="sshdeck/sshdeck"
VERSION="${SSHDECK_VERSION:-latest}"
BIN_DIR="${SSHDECK_BIN_DIR:-$HOME/.local/bin}"

case "$(uname -s)" in
  Darwin) OS="macos" ;;
  Linux) OS="linux" ;;
  *) echo "SSHDeck does not provide a standalone build for $(uname -s)." >&2; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64|amd64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) echo "SSHDeck does not provide a build for $(uname -m)." >&2; exit 1 ;;
esac

if [ "$VERSION" = "latest" ]; then
  DOWNLOAD_URL="https://github.com/$REPOSITORY/releases/latest/download/sshdeck-$OS-$ARCH"
else
  DOWNLOAD_URL="https://github.com/$REPOSITORY/releases/download/$VERSION/sshdeck-$OS-$ARCH"
fi

command -v curl >/dev/null 2>&1 || {
  echo "curl is required to install SSHDeck." >&2
  exit 1
}

mkdir -p "$BIN_DIR"
TEMP_FILE="${TMPDIR:-/tmp}/sshdeck-install-$$"
trap 'rm -f "$TEMP_FILE"' EXIT HUP INT TERM
curl -fsSL "$DOWNLOAD_URL" -o "$TEMP_FILE"
install -m 755 "$TEMP_FILE" "$BIN_DIR/sshdeck"
ln -sfn "sshdeck" "$BIN_DIR/sd"

# Initialize an empty metadata-only configuration without replacing existing servers.
if [ -n "${SSHDECK_CONFIG_PATH:-}" ]; then
  CONFIG_PATH="$SSHDECK_CONFIG_PATH"
elif [ -n "${SSHDECK_CONFIG_DIR:-}" ]; then
  CONFIG_PATH="$SSHDECK_CONFIG_DIR/config.json"
else
  CONFIG_PATH="$HOME/.sshdeck/config.json"
fi
CONFIG_DIR=$(dirname "$CONFIG_PATH")
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR" 2>/dev/null || true
if [ ! -e "$CONFIG_PATH" ]; then
  printf '{\n  "version": 1,\n  "servers": []\n}\n' > "$CONFIG_PATH"
fi
chmod 600 "$CONFIG_PATH" 2>/dev/null || true
CONFIG_README="$CONFIG_DIR/README.md"
if [ ! -e "$CONFIG_README" ]; then
  printf '%s\n' \
    '# SSHDeck configuration' \
    '' \
    'Add and edit servers with `sshdeck add` and `sshdeck edit <tag>`.' \
    '' \
    '`config.json` stores server metadata only. Never put passwords or private keys in it.' \
    '' \
    'The file is managed and validated by SSHDeck. You may also edit it manually when SSHDeck is not running.' \
    > "$CONFIG_README"
fi

case ":${PATH}:" in
  *":$BIN_DIR:"*) PATH_READY=true ;;
  *) PATH_READY=false ;;
esac

if [ "$PATH_READY" = false ]; then
  if [ -n "${ZDOTDIR:-}" ]; then
    PROFILE="$ZDOTDIR/.zshrc"
  elif [ "${SHELL:-}" = "/bin/zsh" ]; then
    PROFILE="$HOME/.zshrc"
  elif [ "${SHELL:-}" = "/bin/bash" ]; then
    PROFILE="$HOME/.bashrc"
  else
    PROFILE="$HOME/.profile"
  fi

  PATH_LINE="export PATH=\"$BIN_DIR:\$PATH\" # Added by SSHDeck installer"
  if [ ! -f "$PROFILE" ] || ! grep -Fqx "$PATH_LINE" "$PROFILE"; then
    printf '\n%s\n' "$PATH_LINE" >> "$PROFILE"
  fi
  echo "Added $BIN_DIR to PATH in $PROFILE. Open a new terminal, or run:"
  echo "  export PATH=\"$BIN_DIR:\$PATH\""
fi

echo "SSHDeck installed: $BIN_DIR/sshdeck"
echo "Configuration file: $CONFIG_PATH"
echo "Configuration guide: $CONFIG_README"
echo "Use 'sshdeck --help' or the short alias 'sd --help'."

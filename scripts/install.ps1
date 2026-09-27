[CmdletBinding()]
param(
    [string]$Version = $(if ($env:SSHDECK_VERSION) { $env:SSHDECK_VERSION } else { "latest" }),
    [string]$BinDir = $(if ($env:SSHDECK_BIN_DIR) { $env:SSHDECK_BIN_DIR } else { Join-Path $env:LOCALAPPDATA "Programs\SSHDeck\bin" })
)

$ErrorActionPreference = "Stop"
$repository = "sshdeck/sshdeck"
$architecture = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { throw "SSHDeck requires 64-bit Windows." }
$asset = "sshdeck-windows-$architecture.exe"
$downloadUrl = if ($Version -eq "latest") {
    "https://github.com/$repository/releases/latest/download/$asset"
} else {
    "https://github.com/$repository/releases/download/$Version/$asset"
}

New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
$binaryPath = Join-Path $BinDir "sshdeck.exe"
Invoke-WebRequest -Uri $downloadUrl -OutFile $binaryPath

# Keep the short command as a CMD shim, which works in PowerShell and cmd.exe.
$aliasPath = Join-Path $BinDir "sd.cmd"
Set-Content -Path $aliasPath -Value "@`"%~dp0sshdeck.exe`" %*" -NoNewline

# Initialize an empty metadata-only configuration without replacing existing servers.
if ($env:SSHDECK_CONFIG_PATH) {
    $configPath = $env:SSHDECK_CONFIG_PATH
} elseif ($env:SSHDECK_CONFIG_DIR) {
    $configPath = Join-Path $env:SSHDECK_CONFIG_DIR "config.json"
} else {
    $configPath = "C:\sshdeck\config.json"
}
$configDir = Split-Path -Parent $configPath
New-Item -ItemType Directory -Path $configDir -Force | Out-Null
if (-not (Test-Path -LiteralPath $configPath)) {
    Set-Content -Path $configPath -Value "{`n  `"version`": 1,`n  `"servers`": []`n}" -NoNewline
}
$configReadme = Join-Path $configDir "README.md"
if (-not (Test-Path -LiteralPath $configReadme)) {
    Set-Content -Path $configReadme -Value @"
# SSHDeck configuration

Add and edit servers with ``sshdeck add`` and ``sshdeck edit <tag>``.

``config.json`` stores server metadata only. Never put passwords or private keys in it.

The file is managed and validated by SSHDeck. You may also edit it manually when SSHDeck is not running.
"@ -NoNewline
}

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathEntries = @($userPath -split ';' | Where-Object { $_ })
if ($pathEntries -notcontains $BinDir) {
    $updatedPath = @($pathEntries + $BinDir) -join ';'
    [Environment]::SetEnvironmentVariable("Path", $updatedPath, "User")
}

if (($env:Path -split ';') -notcontains $BinDir) {
    $env:Path = "$BinDir;$env:Path"
}

Write-Host "SSHDeck installed: $binaryPath"
Write-Host "Configuration file: $configPath"
Write-Host "Configuration guide: $configReadme"
Write-Host "Added $BinDir to your user PATH. Restart your terminal to use sshdeck or sd."

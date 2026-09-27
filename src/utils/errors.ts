export class SSHDeckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SSHDeckError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ServerNotFoundError extends SSHDeckError {
  public readonly tag: string;

  constructor(tag: string) {
    super(`Server not found: ${tag}\n\nRun:\n  sshdeck ls`);
    this.name = "ServerNotFoundError";
    this.tag = tag;
  }
}

export class DuplicateTagError extends SSHDeckError {
  public readonly tag: string;

  constructor(tag: string) {
    super(`A server with tag "${tag}" already exists.`);
    this.name = "DuplicateTagError";
    this.tag = tag;
  }
}

export class InvalidConfigError extends SSHDeckError {
  public readonly details: string[];

  constructor(message: string, details: string[] = []) {
    const formatted = details.length > 0 ? `${message}\n\n${details.join("\n")}` : message;
    super(formatted);
    this.name = "InvalidConfigError";
    this.details = details;
  }
}

export class CredentialStoreError extends SSHDeckError {
  constructor(message: string) {
    super(message);
    this.name = "CredentialStoreError";
  }
}

export class SSHConnectionError extends SSHDeckError {
  public readonly exitCode?: number | null;

  constructor(message: string, exitCode?: number | null) {
    super(message);
    this.name = "SSHConnectionError";
    this.exitCode = exitCode;
  }
}

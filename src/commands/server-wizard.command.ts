import type { AuthConfig, ServerConfig } from "../config/config.types.js";
import type { CredentialStore } from "../credentials/credential-store.js";
import { SystemCredentialStore } from "../credentials/system-credential-store.js";
import type { ServerService } from "../server/server.service.js";
import { CredentialStoreError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { type SecretPrompt, systemSecretPrompt } from "./credentials.command.js";
import { type ServerPrompts, systemPrompts } from "./server-prompts.js";

const tagPattern = /^[a-zA-Z0-9_-]+$/;

export async function addCommand(
  serverService: ServerService,
  prompts: ServerPrompts = systemPrompts,
  credentialStore: CredentialStore = new SystemCredentialStore(),
  secretPrompt: SecretPrompt = systemSecretPrompt
): Promise<void> {
  const { server, needsPassword } = await promptForServer(prompts);
  await serverService.addServer(server);
  if (needsPassword && server.auth.type === "password") {
    await savePassword(server, credentialStore, secretPrompt);
  }
  logger.success(`Added server "${server.tag}".`);
}

export async function editCommand(
  tag: string,
  serverService: ServerService,
  prompts: ServerPrompts = systemPrompts,
  credentialStore: CredentialStore = new SystemCredentialStore(),
  secretPrompt: SecretPrompt = systemSecretPrompt
): Promise<void> {
  const existing = await serverService.requireServerByTag(tag);
  const { server, needsPassword } = await promptForServer(prompts, existing);
  await serverService.updateServer(tag, server);
  if (needsPassword && server.auth.type === "password") {
    await savePassword(server, credentialStore, secretPrompt);
  }
  logger.success(`Updated server "${server.tag}".`);
}

async function promptForServer(
  prompts: ServerPrompts,
  existing?: ServerConfig
): Promise<{ server: ServerConfig; needsPassword: boolean }> {
  const tag = (await prompts.input("Tag", existing?.tag, validateTag)).trim();
  const name = (await prompts.input("Name", existing?.name, required("Name"))).trim();
  const host = (await prompts.input("Host", existing?.host, required("Host"))).trim();
  const portText = await prompts.input("Port", String(existing?.port ?? 22), validatePort);
  const username = (
    await prompts.input("Username", existing?.username, required("Username"))
  ).trim();
  const group = optional(await prompts.input("Group (optional)", existing?.group));
  const description = optional(
    await prompts.input("Description (optional)", existing?.description)
  );
  const { auth, needsPassword } = await promptForAuth(prompts, tag, existing?.auth);

  return {
    server: {
      tag,
      name,
      host,
      port: Number(portText),
      username,
      ...(group ? { group } : {}),
      ...(description ? { description } : {}),
      auth,
    },
    needsPassword,
  };
}

async function promptForAuth(
  prompts: ServerPrompts,
  tag: string,
  existing?: AuthConfig
): Promise<{ auth: AuthConfig; needsPassword: boolean }> {
  const type = await prompts.select(
    "Authentication method",
    [
      { name: "SSH key", value: "key" },
      { name: "SSH agent", value: "agent" },
      { name: "Password (stored in OS credential store)", value: "password" },
    ],
    existing?.type ?? "key"
  );

  if (type === "key") {
    const initial = existing?.type === "key" ? existing.keyPath : "~/.ssh/id_ed25519";
    return {
      auth: {
        type,
        keyPath: (
          await prompts.input("Private key path", initial, required("Private key path"))
        ).trim(),
      },
      needsPassword: false,
    };
  }
  if (type === "password") {
    return {
      auth: {
        type,
        secretRef: existing?.type === "password" ? existing.secretRef : createSecretRef(tag),
      },
      needsPassword: existing?.type !== "password",
    };
  }
  return { auth: { type: "agent" }, needsPassword: false };
}

function createSecretRef(tag: string): string {
  return `sshdeck:${tag.toLowerCase()}`;
}

async function savePassword(
  server: ServerConfig,
  credentialStore: CredentialStore,
  prompt: SecretPrompt
): Promise<void> {
  if (server.auth.type !== "password") return;
  const secret = await prompt.requestPassword(`Password for ${server.username}@${server.host}`);
  if (!secret) throw new CredentialStoreError("Password cannot be empty.");
  await credentialStore.saveSecret(server.auth.secretRef, secret);
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function required(label: string): (value: string) => boolean | string {
  return (value) => (value.trim() ? true : `${label} is required`);
}

function validateTag(value: string): boolean | string {
  if (!value.trim()) return "Tag is required";
  return tagPattern.test(value.trim()) || "Use only letters, numbers, hyphens, and underscores";
}

function validatePort(value: string): boolean | string {
  const port = Number(value);
  return (
    (Number.isInteger(port) && port >= 1 && port <= 65535) || "Enter an integer between 1 and 65535"
  );
}

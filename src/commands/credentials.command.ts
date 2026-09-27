import { password } from "@inquirer/prompts";
import type { CredentialStore } from "../credentials/credential-store.js";
import type { ServerService } from "../server/server.service.js";
import { CredentialStoreError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export interface SecretPrompt {
  requestPassword(message: string): Promise<string>;
}

export const systemSecretPrompt: SecretPrompt = {
  requestPassword: (message) => password({ message, mask: "•" }),
};

export async function setPasswordCommand(
  tag: string,
  serverService: ServerService,
  credentialStore: CredentialStore,
  prompt: SecretPrompt = systemSecretPrompt
): Promise<void> {
  const server = await serverService.requireServerByTag(tag);
  if (server.auth.type !== "password") {
    throw new CredentialStoreError(
      `Server "${server.tag}" is not configured for password authentication. Run 'sshdeck edit ${server.tag}' and choose password authentication first.`
    );
  }

  const secret = await prompt.requestPassword(`Password for ${server.username}@${server.host}`);
  if (!secret) {
    throw new CredentialStoreError("Password cannot be empty.");
  }

  await credentialStore.saveSecret(server.auth.secretRef, secret);
  logger.success(`Password for "${server.tag}" was saved in the system credential store.`);
}

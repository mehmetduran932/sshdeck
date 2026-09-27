import type { CredentialStore } from "./credential-store.js";

export class MemoryCredentialStore implements CredentialStore {
  private secrets = new Map<string, string>();

  async saveSecret(id: string, value: string): Promise<void> {
    this.secrets.set(id, value);
  }

  async getSecret(id: string): Promise<string | null> {
    return this.secrets.get(id) ?? null;
  }

  async deleteSecret(id: string): Promise<void> {
    this.secrets.delete(id);
  }

  clear(): void {
    this.secrets.clear();
  }
}

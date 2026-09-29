import keytar from "keytar";
import { CredentialStoreError } from "../utils/errors.js";
import type { CredentialStore } from "./credential-store.js";

const DEFAULT_SERVICE_NAME = "SSHDeck";

/** Stores credentials in the operating system's protected credential store. */
export class SystemCredentialStore implements CredentialStore {
  constructor(private readonly serviceName = DEFAULT_SERVICE_NAME) {}

  async saveSecret(id: string, value: string): Promise<void> {
    try {
      await keytar.setPassword(this.serviceName, id, value);
    } catch {
      throw new CredentialStoreError("Unable to save the password in the system credential store.");
    }
  }

  async getSecret(id: string): Promise<string | null> {
    try {
      return await keytar.getPassword(this.serviceName, id);
    } catch {
      throw new CredentialStoreError(
        "Unable to read the password from the system credential store."
      );
    }
  }

  async deleteSecret(id: string): Promise<void> {
    try {
      await keytar.deletePassword(this.serviceName, id);
    } catch {
      throw new CredentialStoreError(
        "Unable to remove the password from the system credential store."
      );
    }
  }
}

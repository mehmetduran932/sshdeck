export interface CredentialStore {
  /**
   * Securely saves a secret value for the given identifier.
   */
  saveSecret(id: string, value: string): Promise<void>;

  /**
   * Retrieves a secret value for the given identifier. Returns null if not found.
   */
  getSecret(id: string): Promise<string | null>;

  /**
   * Deletes a secret value for the given identifier.
   */
  deleteSecret(id: string): Promise<void>;
}

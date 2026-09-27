import { describe, expect, it } from "vitest";
import { MemoryCredentialStore } from "../src/credentials/memory-credential-store.js";

describe("MemoryCredentialStore", () => {
  it("saves, retrieves, and deletes secrets", async () => {
    const store = new MemoryCredentialStore();

    expect(await store.getSecret("ref-1")).toBeNull();

    await store.saveSecret("ref-1", "super-secret-password");
    expect(await store.getSecret("ref-1")).toBe("super-secret-password");

    await store.deleteSecret("ref-1");
    expect(await store.getSecret("ref-1")).toBeNull();
  });
});

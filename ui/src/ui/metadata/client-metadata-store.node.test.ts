import { describe, expect, it } from "vitest";
import {
  CLIENT_METADATA_SCHEMA_VERSION,
  LocalStorageClientMetadataStore,
} from "./client-metadata-store.ts";

class MemoryStorage {
  private readonly map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

describe("LocalStorageClientMetadataStore", () => {
  it("writes versioned envelope payloads", () => {
    const storage = new MemoryStorage();
    const store = new LocalStorageClientMetadataStore(storage);
    const now = Date.now();

    store.set("project-x", {
      pinned: true,
      bookmarked: true,
      tags: ["alpha", "beta"],
      updatedAt: now,
    });

    const raw = storage.getItem("openclaw.ui.metadata.v1");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? "{}") as { version: number; sessions: unknown };
    expect(parsed.version).toBe(CLIENT_METADATA_SCHEMA_VERSION);
    expect(parsed.sessions).toHaveProperty("project-x");
  });

  it("reads legacy snapshot payloads without envelope", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "openclaw.ui.metadata.v1",
      JSON.stringify({
        "project-x": {
          pinned: true,
          tags: ["alpha"],
          updatedAt: 123,
        },
      }),
    );

    const store = new LocalStorageClientMetadataStore(storage);
    const snapshot = store.list();
    expect(snapshot["project-x"]?.pinned).toBe(true);
    expect(snapshot["project-x"]?.tags).toEqual(["alpha"]);
  });

  it("returns empty snapshot for unsupported future versions", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "openclaw.ui.metadata.v1",
      JSON.stringify({
        version: 99,
        sessions: {
          "project-x": {
            pinned: true,
            updatedAt: 123,
          },
        },
      }),
    );

    const store = new LocalStorageClientMetadataStore(storage);
    expect(store.list()).toEqual({});
  });
});

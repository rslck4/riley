export type SessionMetadata = {
  tags?: string[];
  pinned?: boolean;
  bookmarked?: boolean;
  updatedAt: number;
};

export type ClientMetadataSnapshot = Record<string, SessionMetadata>;

export interface ClientMetadataStore {
  list(): ClientMetadataSnapshot;
  get(sessionKey: string): SessionMetadata | null;
  set(sessionKey: string, next: SessionMetadata): void;
  delete(sessionKey: string): void;
  clear(): void;
}

const STORAGE_KEY = "openclaw.ui.metadata.v1";

function normalizeSnapshot(input: unknown): ClientMetadataSnapshot {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  const snapshot: ClientMetadataSnapshot = {};
  for (const [sessionKey, value] of Object.entries(input)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }
    const record = value as Record<string, unknown>;
    const tags = Array.isArray(record.tags)
      ? record.tags.map((item) => String(item).trim()).filter(Boolean)
      : undefined;
    const pinned = typeof record.pinned === "boolean" ? record.pinned : undefined;
    const bookmarked = typeof record.bookmarked === "boolean" ? record.bookmarked : undefined;
    const updatedAt =
      typeof record.updatedAt === "number" && Number.isFinite(record.updatedAt)
        ? record.updatedAt
        : Date.now();
    snapshot[sessionKey] = { tags, pinned, bookmarked, updatedAt };
  }
  return snapshot;
}

export class InMemoryClientMetadataStore implements ClientMetadataStore {
  private state: ClientMetadataSnapshot;

  constructor(initial: ClientMetadataSnapshot = {}) {
    this.state = { ...initial };
  }

  list(): ClientMetadataSnapshot {
    return { ...this.state };
  }

  get(sessionKey: string): SessionMetadata | null {
    return this.state[sessionKey] ?? null;
  }

  set(sessionKey: string, next: SessionMetadata): void {
    this.state = { ...this.state, [sessionKey]: { ...next } };
  }

  delete(sessionKey: string): void {
    const next = { ...this.state };
    delete next[sessionKey];
    this.state = next;
  }

  clear(): void {
    this.state = {};
  }
}

export class LocalStorageClientMetadataStore implements ClientMetadataStore {
  constructor(
    private readonly storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = localStorage,
  ) {}

  list(): ClientMetadataSnapshot {
    return this.read();
  }

  get(sessionKey: string): SessionMetadata | null {
    const snapshot = this.read();
    return snapshot[sessionKey] ?? null;
  }

  set(sessionKey: string, next: SessionMetadata): void {
    const snapshot = this.read();
    snapshot[sessionKey] = { ...next };
    this.write(snapshot);
  }

  delete(sessionKey: string): void {
    const snapshot = this.read();
    delete snapshot[sessionKey];
    this.write(snapshot);
  }

  clear(): void {
    this.storage.removeItem(STORAGE_KEY);
  }

  private read(): ClientMetadataSnapshot {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    try {
      return normalizeSnapshot(JSON.parse(raw));
    } catch {
      return {};
    }
  }

  private write(snapshot: ClientMetadataSnapshot): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }
}

export type SessionMetadata = {
  tags?: string[];
  pinned?: boolean;
  bookmarked?: boolean;
  updatedAt: number;
};

export type ClientMetadataSnapshot = Record<string, SessionMetadata>;
export const CLIENT_METADATA_SCHEMA_VERSION = 1;

type ClientMetadataEnvelopeV1 = {
  version: typeof CLIENT_METADATA_SCHEMA_VERSION;
  sessions: ClientMetadataSnapshot;
};

type ClientMetadataEnvelope = ClientMetadataEnvelopeV1;

export interface ClientMetadataStore {
  list(): ClientMetadataSnapshot;
  get(sessionKey: string): SessionMetadata | null;
  set(sessionKey: string, next: SessionMetadata): void;
  delete(sessionKey: string): void;
  clear(): void;
}

const STORAGE_KEY = "openclaw.ui.metadata.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function migrateSnapshot(fromVersion: number, payload: unknown): ClientMetadataSnapshot | null {
  // Stub for forward compatibility. Add future migrations as versions evolve.
  if (fromVersion === CLIENT_METADATA_SCHEMA_VERSION) {
    return normalizeSnapshot(payload);
  }
  return null;
}

function normalizeSnapshot(input: unknown): ClientMetadataSnapshot {
  if (!isRecord(input)) {
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

function readEnvelope(input: unknown): ClientMetadataEnvelope | null {
  if (!isRecord(input)) {
    return null;
  }
  if (typeof input.version !== "number" || !Number.isFinite(input.version)) {
    return null;
  }
  const migrated = migrateSnapshot(input.version, input.sessions);
  if (!migrated) {
    return null;
  }
  return {
    version: CLIENT_METADATA_SCHEMA_VERSION,
    sessions: migrated,
  };
}

function asEnvelope(snapshot: ClientMetadataSnapshot): ClientMetadataEnvelope {
  return {
    version: CLIENT_METADATA_SCHEMA_VERSION,
    sessions: snapshot,
  };
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
      const parsed = JSON.parse(raw);
      const envelope = readEnvelope(parsed);
      if (envelope) {
        return envelope.sessions;
      }
      // Legacy support: plain snapshot payload (pre-versioned envelope).
      return normalizeSnapshot(parsed);
    } catch {
      return {};
    }
  }

  private write(snapshot: ClientMetadataSnapshot): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(asEnvelope(snapshot)));
  }
}

# Phase 4 Metadata Store Scaffolding

This note captures the first Phase 4 implementation scaffold for session metadata
without introducing backend coupling.

## Scope in this scaffold

- Add a UI-side `ClientMetadataStore` abstraction in
  `/Users/scott/Projects/riley/ui/src/ui/metadata/client-metadata-store.ts`.
- Provide two implementations:
  - `InMemoryClientMetadataStore` for deterministic tests/dev wiring.
  - `LocalStorageClientMetadataStore` for local-first persistence experiments.
- No runtime integration yet (no feature behavior changes).

## Why this exists

Phase 4 requires a persistence decision:

1. Local-first only
2. Gateway-backed
3. Hybrid with migration

The abstraction lets us wire metadata features behind a stable UI interface
before selecting the final persistence backend.

## Contract safety

- No gateway RPC changes.
- No deep-link/basePath changes.
- No existing chat/session behavior changes.

## Follow-up

After decision issue resolution, wire this abstraction into concrete UI features
(pins/tags/bookmarks) behind PR-shaped slices and required gate coverage.

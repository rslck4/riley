import { describe, expect, it } from "vitest";
import type { SessionsListResult } from "./types.ts";
import { groupSessionOptions, resolveSessionDisplayName } from "./app-render.helpers.ts";

type SessionRow = SessionsListResult["sessions"][number];

function row(overrides: Partial<SessionRow> & { key: string }): SessionRow {
  return { kind: "direct", updatedAt: 0, ...overrides };
}

describe("resolveSessionDisplayName", () => {
  it("returns key when no row is provided", () => {
    expect(resolveSessionDisplayName("agent:main:main")).toBe("agent:main:main");
  });

  it("returns key when row has no label or displayName", () => {
    expect(resolveSessionDisplayName("agent:main:main", row({ key: "agent:main:main" }))).toBe(
      "agent:main:main",
    );
  });

  it("returns key when displayName matches key", () => {
    expect(resolveSessionDisplayName("mykey", row({ key: "mykey", displayName: "mykey" }))).toBe(
      "mykey",
    );
  });

  it("returns key when label matches key", () => {
    expect(resolveSessionDisplayName("mykey", row({ key: "mykey", label: "mykey" }))).toBe("mykey");
  });

  it("uses displayName prominently when available", () => {
    expect(
      resolveSessionDisplayName(
        "discord:123:456",
        row({ key: "discord:123:456", displayName: "My Chat" }),
      ),
    ).toBe("My Chat (discord:123:456)");
  });

  it("falls back to label when displayName is absent", () => {
    expect(
      resolveSessionDisplayName(
        "discord:123:456",
        row({ key: "discord:123:456", label: "General" }),
      ),
    ).toBe("General (discord:123:456)");
  });

  it("prefers displayName over label when both are present", () => {
    expect(
      resolveSessionDisplayName(
        "discord:123:456",
        row({ key: "discord:123:456", displayName: "My Chat", label: "General" }),
      ),
    ).toBe("My Chat (discord:123:456)");
  });

  it("ignores whitespace-only displayName", () => {
    expect(
      resolveSessionDisplayName(
        "discord:123:456",
        row({ key: "discord:123:456", displayName: "   ", label: "General" }),
      ),
    ).toBe("General (discord:123:456)");
  });

  it("ignores whitespace-only label", () => {
    expect(
      resolveSessionDisplayName("discord:123:456", row({ key: "discord:123:456", label: "   " })),
    ).toBe("discord:123:456");
  });

  it("trims displayName and label", () => {
    expect(resolveSessionDisplayName("k", row({ key: "k", displayName: "  My Chat  " }))).toBe(
      "My Chat (k)",
    );
  });
});

describe("groupSessionOptions", () => {
  it("returns groups in stable order and skips empty groups", () => {
    const grouped = groupSessionOptions([
      { key: "group-1", displayName: "Group 1", group: "group" },
      { key: "main", displayName: "Main", group: "main" },
      { key: "direct-1", displayName: "Direct 1", group: "direct" },
      { key: "unknown-1", displayName: "Unknown 1", group: "unknown" },
    ]);

    expect(grouped.map((group) => group.id)).toEqual(["main", "direct", "group", "unknown"]);
    expect(grouped[0]?.entries.map((entry) => entry.key)).toEqual(["main"]);
    expect(grouped[1]?.entries.map((entry) => entry.key)).toEqual(["direct-1"]);
    expect(grouped[2]?.entries.map((entry) => entry.key)).toEqual(["group-1"]);
    expect(grouped[3]?.entries.map((entry) => entry.key)).toEqual(["unknown-1"]);
  });
});

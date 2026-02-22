import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionsListResult } from "./types.ts";
import { OpenClawApp } from "./app.ts";
import "../styles.css";

// oxlint-disable-next-line typescript/unbound-method
const originalConnect = OpenClawApp.prototype.connect;

function mountApp(pathname: string) {
  window.history.replaceState({}, "", pathname);
  const app = document.createElement("openclaw-app") as OpenClawApp;
  document.body.append(app);
  return app;
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

beforeEach(() => {
  OpenClawApp.prototype.connect = () => {
    // no-op: avoid real gateway WS connections in browser tests
  };
  window.__OPENCLAW_CONTROL_UI_BASE_PATH__ = undefined;
  localStorage.clear();
  document.body.innerHTML = "";
});

afterEach(() => {
  OpenClawApp.prototype.connect = originalConnect;
  window.__OPENCLAW_CONTROL_UI_BASE_PATH__ = undefined;
  localStorage.clear();
  document.body.innerHTML = "";
});

describe("control UI routing", () => {
  it("hydrates the tab from the location", async () => {
    const app = mountApp("/sessions");
    await app.updateComplete;

    expect(app.tab).toBe("sessions");
    expect(window.location.pathname).toBe("/sessions");
  });

  it("respects /ui base paths", async () => {
    const app = mountApp("/ui/cron");
    await app.updateComplete;

    expect(app.basePath).toBe("/ui");
    expect(app.tab).toBe("cron");
    expect(window.location.pathname).toBe("/ui/cron");
  });

  it("infers nested base paths", async () => {
    const app = mountApp("/apps/openclaw/cron");
    await app.updateComplete;

    expect(app.basePath).toBe("/apps/openclaw");
    expect(app.tab).toBe("cron");
    expect(window.location.pathname).toBe("/apps/openclaw/cron");
  });

  it("honors explicit base path overrides", async () => {
    window.__OPENCLAW_CONTROL_UI_BASE_PATH__ = "/openclaw";
    const app = mountApp("/openclaw/sessions");
    await app.updateComplete;

    expect(app.basePath).toBe("/openclaw");
    expect(app.tab).toBe("sessions");
    expect(window.location.pathname).toBe("/openclaw/sessions");
  });

  it("updates the URL when clicking nav items", async () => {
    const app = mountApp("/chat");
    await app.updateComplete;

    const link = app.querySelector<HTMLAnchorElement>('a.nav-item[href="/channels"]');
    expect(link).not.toBeNull();
    link?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));

    await app.updateComplete;
    expect(app.tab).toBe("channels");
    expect(window.location.pathname).toBe("/channels");
  });

  it("keeps chat and nav usable on narrow viewports", async () => {
    const app = mountApp("/chat");
    await app.updateComplete;

    expect(window.matchMedia("(max-width: 768px)").matches).toBe(true);

    const split = app.querySelector(".chat-split-container");
    expect(split).not.toBeNull();
    if (split) {
      expect(getComputedStyle(split).position).not.toBe("fixed");
    }

    const chatMain = app.querySelector(".chat-main");
    expect(chatMain).not.toBeNull();
    if (chatMain) {
      expect(getComputedStyle(chatMain).display).not.toBe("none");
    }

    if (split) {
      split.classList.add("chat-split-container--open");
      await app.updateComplete;
      expect(getComputedStyle(split).position).toBe("fixed");
    }
    if (chatMain) {
      expect(getComputedStyle(chatMain).display).toBe("none");
    }
  });

  it("auto-scrolls chat history to the latest message", async () => {
    const app = mountApp("/chat");
    await app.updateComplete;

    const initialContainer: HTMLElement | null = app.querySelector(".chat-thread");
    expect(initialContainer).not.toBeNull();
    if (!initialContainer) {
      return;
    }
    initialContainer.style.maxHeight = "180px";
    initialContainer.style.overflow = "auto";

    app.chatMessages = Array.from({ length: 60 }, (_, index) => ({
      role: "assistant",
      content: `Line ${index} - ${"x".repeat(200)}`,
      timestamp: Date.now() + index,
    }));

    await app.updateComplete;
    for (let i = 0; i < 6; i++) {
      await nextFrame();
    }

    const container = app.querySelector(".chat-thread");
    expect(container).not.toBeNull();
    if (!container) {
      return;
    }
    const maxScroll = container.scrollHeight - container.clientHeight;
    expect(maxScroll).toBeGreaterThan(0);
    for (let i = 0; i < 10; i++) {
      if (container.scrollTop === maxScroll) {
        break;
      }
      await nextFrame();
    }
    expect(container.scrollTop).toBe(maxScroll);
  });

  it("hydrates token from URL params and strips it", async () => {
    const app = mountApp("/ui/overview?token=abc123");
    await app.updateComplete;

    expect(app.settings.token).toBe("abc123");
    expect(window.location.pathname).toBe("/ui/overview");
    expect(window.location.search).toBe("");
  });

  it("strips password URL params without importing them", async () => {
    const app = mountApp("/ui/overview?password=sekret");
    await app.updateComplete;

    expect(app.password).toBe("");
    expect(window.location.pathname).toBe("/ui/overview");
    expect(window.location.search).toBe("");
  });

  it("hydrates token from URL params even when settings already set", async () => {
    localStorage.setItem(
      "openclaw.control.settings.v1",
      JSON.stringify({ token: "existing-token" }),
    );
    const app = mountApp("/ui/overview?token=abc123");
    await app.updateComplete;

    expect(app.settings.token).toBe("abc123");
    expect(window.location.pathname).toBe("/ui/overview");
    expect(window.location.search).toBe("");
  });

  it("hydrates token from URL hash and strips it", async () => {
    const app = mountApp("/ui/overview#token=abc123");
    await app.updateComplete;

    expect(app.settings.token).toBe("abc123");
    expect(window.location.pathname).toBe("/ui/overview");
    expect(window.location.hash).toBe("");
  });

  it("defaults root landing to chat and restores last active session", async () => {
    localStorage.setItem(
      "openclaw.control.settings.v1",
      JSON.stringify({
        sessionKey: "main",
        lastActiveSessionKey: "project-x",
      }),
    );

    const app = mountApp("/");
    await app.updateComplete;

    expect(app.tab).toBe("chat");
    expect(app.sessionKey).toBe("project-x");
    expect(window.location.pathname).toBe("/chat");
    expect(window.location.search).toBe("?session=project-x");
  });

  it("keeps explicit session query over last active fallback", async () => {
    localStorage.setItem(
      "openclaw.control.settings.v1",
      JSON.stringify({
        sessionKey: "main",
        lastActiveSessionKey: "project-x",
      }),
    );

    const app = mountApp("/chat?session=explicit-y");
    await app.updateComplete;

    expect(app.tab).toBe("chat");
    expect(app.sessionKey).toBe("explicit-y");
    expect(window.location.pathname).toBe("/chat");
    expect(window.location.search).toBe("?session=explicit-y");
  });

  it("marks deep-linked session row active in chat navigator", async () => {
    const app = mountApp("/chat?session=explicit-y");
    await app.updateComplete;

    const encoded = encodeURIComponent("explicit-y");
    const row = app.querySelector<HTMLButtonElement>(`[data-testid="session-row-${encoded}"]`);
    expect(row).not.toBeNull();
    expect(row?.getAttribute("aria-current")).toBe("page");
  });

  it("updates ?session when selecting a chat navigator session row", async () => {
    const app = mountApp("/chat?session=main");
    await app.updateComplete;

    app.sessionsResult = {
      ts: Date.now(),
      path: "~/.openclaw/sessions.json",
      count: 2,
      defaults: { model: null, contextTokens: null },
      sessions: [
        { key: "main", kind: "direct", updatedAt: Date.now() },
        { key: "explicit-y", kind: "direct", updatedAt: Date.now() },
      ],
    };
    await app.updateComplete;

    const encoded = encodeURIComponent("explicit-y");
    const row = app.querySelector<HTMLButtonElement>(`[data-testid="session-row-${encoded}"]`);
    expect(row).not.toBeNull();
    row?.click();

    await app.updateComplete;
    expect(app.sessionKey).toBe("explicit-y");
    expect(window.location.search).toBe("?session=explicit-y");
  });

  it("renders chat navigator session groups from existing metadata", async () => {
    const app = mountApp("/chat?session=main");
    await app.updateComplete;

    app.sessionsResult = {
      ts: Date.now(),
      path: "~/.openclaw/sessions.json",
      count: 3,
      defaults: { model: null, contextTokens: null },
      sessions: [
        { key: "main", kind: "direct", updatedAt: Date.now() },
        { key: "team-room", kind: "group", updatedAt: Date.now() },
        { key: "global-feed", kind: "global", updatedAt: Date.now() },
      ],
    };
    await app.updateComplete;

    expect(app.querySelector('[data-testid="session-group-main"]')).not.toBeNull();
    expect(app.querySelector('[data-testid="session-group-group"]')).not.toBeNull();
    expect(app.querySelector('[data-testid="session-group-global"]')).not.toBeNull();
  });

  it("filters chat navigator sessions locally and supports Enter/Escape keyboard flow", async () => {
    const app = mountApp("/chat?session=main");
    await app.updateComplete;

    app.sessionsResult = {
      ts: Date.now(),
      path: "~/.openclaw/sessions.json",
      count: 2,
      defaults: { model: null, contextTokens: null },
      sessions: [
        { key: "main", kind: "direct", updatedAt: Date.now() },
        { key: "project-x", kind: "direct", updatedAt: Date.now() },
      ],
    };
    await app.updateComplete;

    const filter = app.querySelector<HTMLInputElement>('[data-testid="chat-navigator-filter"]');
    expect(filter).not.toBeNull();
    filter!.value = "project";
    filter!.dispatchEvent(new Event("input", { bubbles: true }));
    await app.updateComplete;

    const projectRow = app.querySelector<HTMLButtonElement>(
      `[data-testid="session-row-${encodeURIComponent("project-x")}"]`,
    );
    expect(projectRow).not.toBeNull();

    filter!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await app.updateComplete;
    expect(app.sessionKey).toBe("project-x");
    expect(window.location.search).toBe("?session=project-x");

    filter!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await app.updateComplete;
    expect(filter!.value).toBe("");
    expect(app.chatNavigatorQuery).toBe("");
  });

  it("focuses session filter via global search shortcuts in chat", async () => {
    const app = mountApp("/chat?session=main");
    await app.updateComplete;

    const filter = app.querySelector<HTMLInputElement>('[data-testid="chat-navigator-filter"]');
    expect(filter).not.toBeNull();

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(filter);

    filter?.blur();
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.activeElement).toBe(filter);
  });
  it("supports rename/delete chat navigator actions via existing session RPCs", async () => {
    const app = mountApp("/chat?session=project-x");
    await app.updateComplete;

    const requests: Array<{ method: string; params: Record<string, unknown> }> = [];
    let sessions: SessionsListResult["sessions"] = [
      { key: "main", kind: "direct", updatedAt: Date.now() },
      { key: "project-x", kind: "direct", updatedAt: Date.now() },
    ];

    app.connected = true;
    app.client = {
      request: async (method: string, params: Record<string, unknown>) => {
        requests.push({ method, params });
        if (method === "sessions.patch") {
          return { ok: true };
        }
        if (method === "sessions.delete") {
          sessions = sessions.filter((session) => session.key !== params.key);
          return { ok: true };
        }
        if (method === "sessions.list") {
          return {
            ts: Date.now(),
            path: "~/.openclaw/sessions.json",
            count: sessions.length,
            defaults: { model: null, contextTokens: null },
            sessions,
          };
        }
        return undefined;
      },
    } as OpenClawApp["client"];

    app.sessionsResult = {
      ts: Date.now(),
      path: "~/.openclaw/sessions.json",
      count: sessions.length,
      defaults: { model: null, contextTokens: null },
      sessions,
    };
    await app.updateComplete;

    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Project X");
    const renameButton = app.querySelector<HTMLButtonElement>(
      `[data-testid="session-rename-${encodeURIComponent("project-x")}"]`,
    );
    expect(renameButton).not.toBeNull();
    renameButton?.click();
    await Promise.resolve();
    await app.updateComplete;
    promptSpy.mockRestore();

    expect(requests.some((request) => request.method === "sessions.patch")).toBe(true);

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const deleteButton = app.querySelector<HTMLButtonElement>(
      `[data-testid="session-delete-${encodeURIComponent("project-x")}"]`,
    );
    expect(deleteButton).not.toBeNull();
    deleteButton?.click();
    await Promise.resolve();
    await app.updateComplete;
    confirmSpy.mockRestore();

    expect(requests.some((request) => request.method === "sessions.delete")).toBe(true);
    expect(app.sessionKey).toBe("main");
    expect(window.location.search).toBe("?session=main");
  });

  it("renders inspector skeleton tabs and toggles panels in chat sidebar", async () => {
    const app = mountApp("/chat?session=main");
    await app.updateComplete;

    app.sidebarOpen = true;
    app.sidebarContent = "tool output";
    app.inspectorTab = "tools";
    await app.updateComplete;
    expect(app.querySelector('[data-testid="inspector-tools-panel"]')).not.toBeNull();
    expect(
      app
        .querySelector('[data-testid="inspector-tools-markdown"]')
        ?.textContent?.includes("tool output"),
    ).toBe(true);

    const detailsTab = app.querySelector<HTMLButtonElement>(
      '[data-testid="inspector-tab-details"]',
    );
    expect(detailsTab).not.toBeNull();
    detailsTab?.click();
    await app.updateComplete;

    expect(app.inspectorTab).toBe("details");
    expect(app.querySelector('[data-testid="inspector-details-panel"]')).not.toBeNull();

    const debugTab = app.querySelector<HTMLButtonElement>('[data-testid="inspector-tab-debug"]');
    expect(debugTab).not.toBeNull();
    debugTab?.click();
    await app.updateComplete;

    expect(app.inspectorTab).toBe("debug");
    expect(app.querySelector('[data-testid="inspector-debug-panel"]')).not.toBeNull();
  });

  it("shows details tab session key matching deep-link session", async () => {
    const app = mountApp("/chat?session=explicit-y");
    await app.updateComplete;

    app.sidebarOpen = true;
    app.inspectorTab = "details";
    app.sessionsResult = {
      ts: Date.now(),
      path: "~/.openclaw/sessions.json",
      count: 2,
      defaults: { model: null, contextTokens: null },
      sessions: [
        {
          key: "main",
          kind: "direct",
          updatedAt: Date.now(),
          surface: "local",
          modelProvider: "openai",
          model: "gpt-4.1-mini",
        },
        {
          key: "explicit-y",
          kind: "direct",
          updatedAt: Date.now(),
          surface: "discord",
          modelProvider: "openai",
          model: "gpt-4.1-mini",
        },
      ],
    };
    await app.updateComplete;

    const keyNode = app.querySelector('[data-testid="inspector-details-session-key"]');
    expect(keyNode?.textContent?.trim()).toBe("explicit-y");
  });

  it("shows workspace context chips in chat header", async () => {
    const app = mountApp("/chat?session=explicit-y");
    await app.updateComplete;

    const context = app.querySelector('[data-testid="workspace-context"]');
    expect(context).not.toBeNull();
    const agentChip = app.querySelector('[data-testid="workspace-context-agent"]');
    const sessionChip = app.querySelector('[data-testid="workspace-context-session"]');
    expect(agentChip?.textContent?.includes("Agent:")).toBe(true);
    expect(sessionChip?.textContent?.trim()).toBe("Session: explicit-y");
  });

  it("shows toast feedback after copying session key from details tab", async () => {
    const app = mountApp("/chat?session=main");
    await app.updateComplete;

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    app.sidebarOpen = true;
    app.inspectorTab = "details";
    await app.updateComplete;

    const copyButton = app.querySelector<HTMLButtonElement>(
      '[data-testid="inspector-details-copy-session-key"]',
    );
    expect(copyButton).not.toBeNull();
    copyButton?.click();
    await Promise.resolve();
    await app.updateComplete;

    expect(writeText).toHaveBeenCalledWith("main");
    const toast = app.querySelector('[data-testid="shell-toast"]');
    expect(toast?.textContent?.includes("Session key copied")).toBe(true);
  });
});

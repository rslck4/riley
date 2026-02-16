import { html, nothing } from "lit";
import { repeat } from "lit/directives/repeat.js";
import type { AppViewState } from "./app-view-state.ts";
import type { ThemeTransitionContext } from "./theme-transition.ts";
import type { ThemeMode } from "./theme.ts";
import type { SessionOriginGroup, SessionsListResult } from "./types.ts";
import { refreshChat, refreshChatAvatar } from "./app-chat.ts";
import { syncUrlWithSessionKey } from "./app-settings.ts";
import { OpenClawApp } from "./app.ts";
import { ChatState, loadChatHistory } from "./controllers/chat.ts";
import { deleteSession, patchSession } from "./controllers/sessions.ts";
import { icons } from "./icons.ts";
import { iconForTab, pathForTab, titleForTab, type Tab } from "./navigation.ts";

export function renderTab(state: AppViewState, tab: Tab) {
  const href = pathForTab(tab, state.basePath);
  const title = titleForTab(tab);
  return html`
    <a
      href=${href}
      class="nav-item ${state.tab === tab ? "active" : ""}"
      @click=${(event: MouseEvent) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        state.setTab(tab);
      }}
      title=${title}
      aria-label=${title}
      data-testid=${`secondary-nav-${tab}`}
    >
      <span class="nav-item__icon" aria-hidden="true">${icons[iconForTab(tab)]}</span>
      <span class="nav-item__text">${title}</span>
    </a>
  `;
}

export function selectChatSession(state: AppViewState, next: string) {
  if (!next) {
    return;
  }
  state.sessionKey = next;
  state.chatMessage = "";
  state.chatAttachments = [];
  state.chatStream = null;
  (state as unknown as OpenClawApp).chatStreamStartedAt = null;
  state.chatRunId = null;
  state.chatQueue = [];
  (state as unknown as OpenClawApp).resetToolStream();
  (state as unknown as OpenClawApp).resetChatScroll();
  state.applySettings({
    ...state.settings,
    sessionKey: next,
    lastActiveSessionKey: next,
  });
  syncUrlWithSessionKey(
    state as unknown as Parameters<typeof syncUrlWithSessionKey>[0],
    next,
    true,
  );
  void state.loadAssistantIdentity();
  void loadChatHistory(state as unknown as ChatState);
  void refreshChatAvatar(state as unknown as Parameters<typeof refreshChatAvatar>[0]);
}

export function renderChatControls(state: AppViewState) {
  const mainSessionKey = resolveMainSessionKey(state.hello, state.sessionsResult);
  const sessionOptions = resolveSessionOptions(
    state.sessionKey,
    state.sessionsResult,
    mainSessionKey,
  );
  const disableThinkingToggle = state.onboarding;
  const disableFocusToggle = state.onboarding;
  const showThinking = state.onboarding ? false : state.settings.chatShowThinking;
  const focusActive = state.onboarding ? true : state.settings.chatFocusMode;
  // Refresh icon
  const refreshIcon = html`
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
      <path d="M21 3v5h-5"></path>
    </svg>
  `;
  const focusIcon = html`
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M4 7V4h3"></path>
      <path d="M20 7V4h-3"></path>
      <path d="M4 17v3h3"></path>
      <path d="M20 17v3h-3"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `;
  return html`
    <div class="chat-controls">
      <label class="field chat-controls__session">
        <select
          .value=${state.sessionKey}
          ?disabled=${!state.connected}
          @change=${(e: Event) => {
            const next = (e.target as HTMLSelectElement).value;
            selectChatSession(state, next);
          }}
        >
          ${repeat(
            sessionOptions,
            (entry) => entry.key,
            (entry) =>
              html`<option value=${entry.key}>
                ${entry.displayName ?? entry.key}
              </option>`,
          )}
        </select>
      </label>
      <button
        class="btn btn--sm btn--icon"
        ?disabled=${state.chatLoading || !state.connected}
        @click=${async () => {
          const app = state as unknown as OpenClawApp;
          app.chatManualRefreshInFlight = true;
          app.chatNewMessagesBelow = false;
          await app.updateComplete;
          app.resetToolStream();
          try {
            await refreshChat(state as unknown as Parameters<typeof refreshChat>[0], {
              scheduleScroll: false,
            });
            app.scrollToBottom({ smooth: true });
          } finally {
            requestAnimationFrame(() => {
              app.chatManualRefreshInFlight = false;
              app.chatNewMessagesBelow = false;
            });
          }
        }}
        title="Refresh chat data"
      >
        ${refreshIcon}
      </button>
      <span class="chat-controls__separator">|</span>
      <button
        class="btn btn--sm btn--icon ${showThinking ? "active" : ""}"
        ?disabled=${disableThinkingToggle}
        @click=${() => {
          if (disableThinkingToggle) {
            return;
          }
          state.applySettings({
            ...state.settings,
            chatShowThinking: !state.settings.chatShowThinking,
          });
        }}
        aria-pressed=${showThinking}
        title=${
          disableThinkingToggle
            ? "Disabled during onboarding"
            : "Toggle assistant thinking/working output"
        }
      >
        ${icons.brain}
      </button>
      <button
        class="btn btn--sm btn--icon ${focusActive ? "active" : ""}"
        ?disabled=${disableFocusToggle}
        @click=${() => {
          if (disableFocusToggle) {
            return;
          }
          state.applySettings({
            ...state.settings,
            chatFocusMode: !state.settings.chatFocusMode,
          });
        }}
        aria-pressed=${focusActive}
        title=${
          disableFocusToggle
            ? "Disabled during onboarding"
            : "Toggle focus mode (hide sidebar + page header)"
        }
      >
        ${focusIcon}
      </button>
    </div>
  `;
}

export function renderChatNavigator(state: AppViewState) {
  const mainSessionKey = resolveMainSessionKey(state.hello, state.sessionsResult);
  const allSessionOptions = resolveSessionOptions(
    state.sessionKey,
    state.sessionsResult,
    mainSessionKey,
  );
  const sessionOptions = filterSessionOptions(allSessionOptions, state.chatNavigatorQuery);
  const groupedSessionOptions = groupSessionOptions(sessionOptions);
  const firstSessionKey = sessionOptions[0]?.key;
  return html`
    <div class="nav-group" data-testid="chat-navigator-group">
      <div class="nav-label nav-label--static">
        <span class="nav-label__text">Sessions</span>
      </div>
      <label class="field field--search">
        <input
          type="search"
          class="search-input"
          placeholder="Filter sessions"
          aria-label="Filter sessions"
          data-testid="chat-navigator-filter"
          .value=${state.chatNavigatorQuery}
          @input=${(event: Event) => {
            state.chatNavigatorQuery = (event.target as HTMLInputElement).value;
          }}
          @keydown=${(event: KeyboardEvent) => {
            if (event.key === "Escape") {
              event.preventDefault();
              state.chatNavigatorQuery = "";
              (event.target as HTMLInputElement).value = "";
              return;
            }
            if (event.key === "Enter" && firstSessionKey) {
              event.preventDefault();
              selectChatSession(state, firstSessionKey);
            }
          }}
        />
      </label>
      ${
        sessionOptions.length === 0
          ? html`
              <div class="nav-group__items" aria-label="Filtered sessions">
                <div class="status-line">No sessions match this filter.</div>
              </div>
            `
          : nothing
      }
      ${groupedSessionOptions.map(
        (group) => html`
        <div
          class="chat-navigator-group"
          data-testid=${`session-group-${group.id}`}
          aria-label=${`${group.label} sessions`}
        >
          <div class="nav-label nav-label--static">
            <span class="nav-label__text">${group.label}</span>
          </div>
          <div class="nav-group__items" aria-label=${`${group.label} sessions`}>
            ${group.entries.map((entry) => {
              const selected = entry.key === state.sessionKey;
              return html`
                <div class="chat-session-row">
                  <button
                    class="nav-item ${selected ? "active" : ""}"
                    type="button"
                    aria-current=${selected ? "page" : "false"}
                    data-testid=${`session-row-${encodeURIComponent(entry.key)}`}
                    @click=${() => selectChatSession(state, entry.key)}
                  >
                    <span class="nav-item__icon" aria-hidden="true">${icons.fileText}</span>
                    <span class="nav-item__text">${entry.displayName ?? entry.key}</span>
                  </button>
                  <div class="chat-session-row__actions">
                    <button
                      class="btn btn--sm"
                      type="button"
                      aria-label=${`Rename session ${entry.key}`}
                      data-testid=${`session-rename-${encodeURIComponent(entry.key)}`}
                      @click=${(event: MouseEvent) => {
                        event.stopPropagation();
                        void renameChatSession(state, entry.key);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      class="btn btn--sm"
                      type="button"
                      aria-label=${`Delete session ${entry.key}`}
                      data-testid=${`session-delete-${encodeURIComponent(entry.key)}`}
                      ?disabled=${entry.group === "main" || state.sessionsLoading}
                      @click=${(event: MouseEvent) => {
                        event.stopPropagation();
                        void removeChatSession(state, entry.key);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
      `,
      )}
    </div>
  `;
}

type SessionDefaultsSnapshot = {
  mainSessionKey?: string;
  mainKey?: string;
};

function resolveMainSessionKey(
  hello: AppViewState["hello"],
  sessions: SessionsListResult | null,
): string | null {
  const snapshot = hello?.snapshot as { sessionDefaults?: SessionDefaultsSnapshot } | undefined;
  const mainSessionKey = snapshot?.sessionDefaults?.mainSessionKey?.trim();
  if (mainSessionKey) {
    return mainSessionKey;
  }
  const mainKey = snapshot?.sessionDefaults?.mainKey?.trim();
  if (mainKey) {
    return mainKey;
  }
  if (sessions?.sessions?.some((row) => row.key === "main")) {
    return "main";
  }
  return null;
}

export function resolveSessionDisplayName(
  key: string,
  row?: SessionsListResult["sessions"][number],
) {
  const displayName = row?.displayName?.trim() || "";
  const label = row?.label?.trim() || "";
  if (displayName && displayName !== key) {
    return `${displayName} (${key})`;
  }
  if (label && label !== key) {
    return `${label} (${key})`;
  }
  return key;
}

function resolveSessionOptions(
  sessionKey: string,
  sessions: SessionsListResult | null,
  mainSessionKey?: string | null,
) {
  const seen = new Set<string>();
  const options: Array<{ key: string; displayName?: string; group: SessionOriginGroup }> = [];

  const resolvedMain = mainSessionKey && sessions?.sessions?.find((s) => s.key === mainSessionKey);
  const resolvedCurrent = sessions?.sessions?.find((s) => s.key === sessionKey);

  // Add main session key first
  if (mainSessionKey) {
    seen.add(mainSessionKey);
    options.push({
      key: mainSessionKey,
      displayName: resolveSessionDisplayName(mainSessionKey, resolvedMain || undefined),
      group: "main",
    });
  }

  // Add current session key next
  if (!seen.has(sessionKey)) {
    seen.add(sessionKey);
    options.push({
      key: sessionKey,
      displayName: resolveSessionDisplayName(sessionKey, resolvedCurrent),
      group: resolveSessionOriginGroup(sessionKey, resolvedCurrent, mainSessionKey),
    });
  }

  // Add sessions from the result
  if (sessions?.sessions) {
    for (const s of sessions.sessions) {
      if (!seen.has(s.key)) {
        seen.add(s.key);
        options.push({
          key: s.key,
          displayName: resolveSessionDisplayName(s.key, s),
          group: resolveSessionOriginGroup(s.key, s, mainSessionKey),
        });
      }
    }
  }

  return options;
}

function resolveSessionOriginGroup(
  key: string,
  row?: SessionsListResult["sessions"][number],
  mainSessionKey?: string | null,
): SessionOriginGroup {
  if (mainSessionKey && key === mainSessionKey) {
    return "main";
  }
  if (!row) {
    return "direct";
  }
  if (row.kind === "group" || row.kind === "global" || row.kind === "unknown") {
    return row.kind;
  }
  return "direct";
}

export function groupSessionOptions(
  options: Array<{ key: string; displayName?: string; group: SessionOriginGroup }>,
) {
  const groupOrder: SessionOriginGroup[] = ["main", "direct", "group", "global", "unknown"];
  const labels: Record<SessionOriginGroup, string> = {
    main: "Primary",
    direct: "Direct",
    group: "Group",
    global: "Global",
    unknown: "Other",
  };
  return groupOrder
    .map((groupId) => ({
      id: groupId,
      label: labels[groupId],
      entries: options.filter((option) => option.group === groupId),
    }))
    .filter((group) => group.entries.length > 0);
}

export function filterSessionOptions(
  options: Array<{ key: string; displayName?: string; group: SessionOriginGroup }>,
  query: string,
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return options;
  }
  return options.filter((option) => {
    const key = option.key.toLowerCase();
    const displayName = option.displayName?.toLowerCase() ?? "";
    return key.includes(normalized) || displayName.includes(normalized);
  });
}

async function renameChatSession(state: AppViewState, key: string) {
  const label = window.prompt(`Rename session "${key}"`, "")?.trim();
  if (label === undefined) {
    return;
  }
  await patchSession(state as unknown as Parameters<typeof patchSession>[0], key, {
    label: label.length ? label : null,
  });
}

async function removeChatSession(state: AppViewState, key: string) {
  const deletingCurrent = state.sessionKey === key;
  await deleteSession(state as unknown as Parameters<typeof deleteSession>[0], key);
  if (!deletingCurrent || state.sessionKey !== key) {
    return;
  }
  const mainSessionKey = resolveMainSessionKey(state.hello, state.sessionsResult);
  const firstAvailable = state.sessionsResult?.sessions.find((row) => row.key !== key)?.key;
  const fallback =
    (mainSessionKey && mainSessionKey !== key ? mainSessionKey : null) ?? firstAvailable;
  if (fallback) {
    selectChatSession(state, fallback);
  }
}

const THEME_ORDER: ThemeMode[] = ["system", "light", "dark"];

export function renderThemeToggle(state: AppViewState) {
  const index = Math.max(0, THEME_ORDER.indexOf(state.theme));
  const applyTheme = (next: ThemeMode) => (event: MouseEvent) => {
    const element = event.currentTarget as HTMLElement;
    const context: ThemeTransitionContext = { element };
    if (event.clientX || event.clientY) {
      context.pointerClientX = event.clientX;
      context.pointerClientY = event.clientY;
    }
    state.setTheme(next, context);
  };

  return html`
    <div class="theme-toggle" style="--theme-index: ${index};">
      <div class="theme-toggle__track" role="group" aria-label="Theme">
        <span class="theme-toggle__indicator"></span>
        <button
          class="theme-toggle__button ${state.theme === "system" ? "active" : ""}"
          @click=${applyTheme("system")}
          aria-pressed=${state.theme === "system"}
          aria-label="System theme"
          title="System"
        >
          ${renderMonitorIcon()}
        </button>
        <button
          class="theme-toggle__button ${state.theme === "light" ? "active" : ""}"
          @click=${applyTheme("light")}
          aria-pressed=${state.theme === "light"}
          aria-label="Light theme"
          title="Light"
        >
          ${renderSunIcon()}
        </button>
        <button
          class="theme-toggle__button ${state.theme === "dark" ? "active" : ""}"
          @click=${applyTheme("dark")}
          aria-pressed=${state.theme === "dark"}
          aria-label="Dark theme"
          title="Dark"
        >
          ${renderMoonIcon()}
        </button>
      </div>
    </div>
  `;
}

function renderSunIcon() {
  return html`
    <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2"></path>
      <path d="M12 20v2"></path>
      <path d="m4.93 4.93 1.41 1.41"></path>
      <path d="m17.66 17.66 1.41 1.41"></path>
      <path d="M2 12h2"></path>
      <path d="M20 12h2"></path>
      <path d="m6.34 17.66-1.41 1.41"></path>
      <path d="m19.07 4.93-1.41 1.41"></path>
    </svg>
  `;
}

function renderMoonIcon() {
  return html`
    <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"
      ></path>
    </svg>
  `;
}

function renderMonitorIcon() {
  return html`
    <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="20" height="14" x="2" y="3" rx="2"></rect>
      <line x1="8" x2="16" y1="21" y2="21"></line>
      <line x1="12" x2="12" y1="17" y2="21"></line>
    </svg>
  `;
}

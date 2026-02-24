import { describe, expect, it, vi } from "vitest";
import {
  abortChatRun,
  handleChatEvent,
  sendChatMessage,
  type ChatEventPayload,
  type ChatState,
} from "./chat.ts";

function createState(overrides: Partial<ChatState> = {}): ChatState {
  return {
    client: null,
    connected: true,
    sessionKey: "main",
    chatLoading: false,
    chatMessages: [],
    chatThinkingLevel: null,
    chatSending: false,
    chatMessage: "",
    chatAttachments: [],
    chatRunId: null,
    chatStream: null,
    chatStreamStartedAt: null,
    lastError: null,
    ...overrides,
  };
}

describe("chat controller", () => {
  it("sendChatMessage appends user message and requests chat.send", async () => {
    const request = vi.fn(async () => ({}));
    const state = createState({
      client: {
        request,
      } as unknown as ChatState["client"],
    });

    const runId = await sendChatMessage(state, "hello world");
    expect(runId).toBeTypeOf("string");
    expect(state.chatMessages.length).toBe(1);
    expect(request).toHaveBeenCalledWith(
      "chat.send",
      expect.objectContaining({
        sessionKey: "main",
        message: "hello world",
        deliver: false,
      }),
    );
  });

  it("handleChatEvent manages delta/final state transitions deterministically", () => {
    const state = createState({
      chatRunId: "run-1",
      chatStream: "",
      chatStreamStartedAt: 123,
    });

    const delta1: ChatEventPayload = {
      runId: "run-1",
      sessionKey: "main",
      state: "delta",
      message: { content: [{ type: "text", text: "hel" }] },
    };
    const delta2: ChatEventPayload = {
      runId: "run-1",
      sessionKey: "main",
      state: "delta",
      message: { content: [{ type: "text", text: "hello" }] },
    };
    const final: ChatEventPayload = {
      runId: "run-1",
      sessionKey: "main",
      state: "final",
    };

    expect(handleChatEvent(state, delta1)).toBe("delta");
    expect(state.chatStream).toBe("hel");
    expect(handleChatEvent(state, delta2)).toBe("delta");
    expect(state.chatStream).toBe("hello");
    expect(handleChatEvent(state, final)).toBe("final");
    expect(state.chatStream).toBeNull();
    expect(state.chatRunId).toBeNull();
    expect(state.chatStreamStartedAt).toBeNull();
  });

  it("abortChatRun uses current runId when available", async () => {
    const request = vi.fn(async () => ({}));
    const state = createState({
      chatRunId: "run-123",
      client: {
        request,
      } as unknown as ChatState["client"],
    });

    const ok = await abortChatRun(state);
    expect(ok).toBe(true);
    expect(request).toHaveBeenCalledWith("chat.abort", {
      sessionKey: "main",
      runId: "run-123",
    });
  });
});

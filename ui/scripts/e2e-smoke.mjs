import process from "node:process";
import { chromium } from "playwright";

const token = (process.env.E2E_AUTH_TOKEN ?? "").trim();
if (!token) {
  console.error("Missing E2E_AUTH_TOKEN for UI smoke test.");
  process.exit(1);
}

const baseUrl = (process.env.E2E_UI_BASE_URL ?? "http://127.0.0.1:18789/").trim();
const gatewayUrl = (process.env.E2E_GATEWAY_URL ?? "ws://127.0.0.1:18789").trim();

const defaults = {
  gatewayUrl,
  token,
  sessionKey: "main",
  lastActiveSessionKey: "main",
  theme: "system",
  chatFocusMode: false,
  chatShowThinking: true,
  splitRatio: 0.6,
  navCollapsed: false,
  navGroupsCollapsed: {},
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
await context.addInitScript((settings) => {
  localStorage.setItem("openclaw.control.settings.v1", JSON.stringify(settings));
}, defaults);

const page = await context.newPage();

async function requestGateway(method, params = {}) {
  return await page.evaluate(
    async ({ method, params }) => {
      const app = document.querySelector("openclaw-app");
      if (!app || !("client" in app) || !app.client) {
        throw new Error("openclaw-app client is not ready");
      }
      return await app.client.request(method, params);
    },
    { method, params },
  );
}

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

  await page.getByText("Health").waitFor({ timeout: 20_000 });
  await page.getByText("OK").waitFor({ timeout: 20_000 });

  const sessionsLink = page.getByRole("link", { name: "Sessions" });
  await sessionsLink.click();
  await page.waitForURL(/\/sessions$/);

  const chatLink = page.getByRole("link", { name: "Chat" });
  await chatLink.click();
  await page.waitForURL(/\/(chat)?$/);
  await page.getByLabel("Sessions").waitFor({ timeout: 20_000 });

  const chatInput = page.getByLabel("Message");
  const chatSendButton = page.getByRole("button", { name: /^Send$/ });
  const seededMessage = `smoke-seed-${Date.now()}`;
  await chatInput.fill(seededMessage);
  await chatSendButton.click();
  await page.getByText(seededMessage).waitFor({ timeout: 20_000 });

  await chatInput.fill(`smoke-abort-${Date.now()}`);
  await chatSendButton.click();
  const abortRes = await requestGateway("chat.abort", { sessionKey: "main" });
  if (!abortRes || abortRes.ok !== true) {
    throw new Error("chat.abort failed in smoke run");
  }
  const healthRes = await requestGateway("health", {});
  if (!healthRes || typeof healthRes !== "object") {
    throw new Error("health RPC failed after chat flow");
  }
  await page.getByRole("button", { name: /Send|Queue/ }).waitFor({ timeout: 20_000 });

  // Mobile sanity: shell should still render and nav can be toggled.
  await page.setViewportSize({ width: 390, height: 844 });
  const collapseButton = page.getByRole("button", { name: /collapse sidebar|expand sidebar/i });
  await collapseButton.click();
  await page.getByRole("button", { name: /collapse sidebar|expand sidebar/i }).waitFor({
    timeout: 10_000,
  });

  console.log("UI smoke passed: connect/auth, chat send/abort, navigation, and mobile sanity.");
} finally {
  await context.close();
  await browser.close();
}

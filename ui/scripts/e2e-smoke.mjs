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

  // Mobile sanity: shell should still render and nav can be toggled.
  await page.setViewportSize({ width: 390, height: 844 });
  const collapseButton = page.getByRole("button", { name: /collapse sidebar|expand sidebar/i });
  await collapseButton.click();
  await page.getByRole("button", { name: /collapse sidebar|expand sidebar/i }).waitFor({
    timeout: 10_000,
  });

  console.log("UI smoke passed: connect/auth, navigation, and mobile sanity.");
} finally {
  await context.close();
  await browser.close();
}

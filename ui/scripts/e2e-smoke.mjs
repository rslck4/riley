import process from "node:process";
import { chromium } from "playwright";

const token = (process.env.E2E_AUTH_TOKEN ?? "").trim();
if (!token) {
  console.error("Missing E2E_AUTH_TOKEN for UI smoke test.");
  process.exit(1);
}

const baseUrl = (process.env.E2E_UI_BASE_URL ?? "http://127.0.0.1:18789/").trim();
const gatewayUrl = (process.env.E2E_GATEWAY_URL ?? "ws://127.0.0.1:18789").trim();
const entryUrl = new URL(baseUrl);
entryUrl.searchParams.set("session", "main");

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
let createdCronJobId = null;
const tempSessionKey = `smoke-rc-${Date.now()}`;

async function requestGateway(rpcMethod, rpcParams = {}) {
  return await page.evaluate(
    async ({ methodName, methodParams }) => {
      const app = document.querySelector("openclaw-app");
      if (!app || !("client" in app) || !app.client) {
        throw new Error("openclaw-app client is not ready");
      }
      return await app.client.request(methodName, methodParams);
    },
    { methodName: rpcMethod, methodParams: rpcParams },
  );
}

async function waitForCondition(predicate, timeoutMs = 20_000, intervalMs = 500) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await predicate();
    if (value) {
      return value;
    }
    await page.waitForTimeout(intervalMs);
  }
  return null;
}

try {
  await page.goto(entryUrl.toString(), { waitUntil: "domcontentloaded" });

  await page.getByText("Health").waitFor({ timeout: 20_000 });
  await page.getByText("OK").waitFor({ timeout: 20_000 });

  const sessionsLink = page.getByRole("link", { name: "Sessions" });
  await sessionsLink.click();
  await page.waitForURL(/\/sessions$/);

  const chatLink = page.getByRole("link", { name: "Chat" });
  await chatLink.click();
  await page.waitForURL(/\/(chat)?(?:\?.*)?$/);
  const currentUrl = new URL(page.url());
  if (currentUrl.searchParams.get("session") !== "main") {
    throw new Error("deep-link session query was not preserved for chat view");
  }
  await page.getByLabel("Sessions").waitFor({ timeout: 20_000 });
  const activeSessionRow = page.getByTestId("session-row-main");
  await activeSessionRow.waitFor({ timeout: 20_000 });
  const activeSessionCurrent = await activeSessionRow.getAttribute("aria-current");
  if (activeSessionCurrent !== "page") {
    throw new Error("chat navigator did not mark session-row-main as active");
  }
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

  // Sessions patch/delete contract flow via deterministic temp session lifecycle.
  await requestGateway("chat.send", {
    sessionKey: tempSessionKey,
    message: `smoke-temp-${Date.now()}`,
    deliver: false,
    idempotencyKey: `smoke-temp-${Date.now()}`,
  });
  const listedTempSession = await waitForCondition(async () => {
    const sessionsRes = await requestGateway("sessions.list", {
      includeGlobal: true,
      includeUnknown: true,
      limit: 300,
    });
    const sessions = Array.isArray(sessionsRes?.sessions) ? sessionsRes.sessions : [];
    return sessions.find((session) => session.key === tempSessionKey) ?? null;
  });
  if (!listedTempSession) {
    throw new Error("temporary smoke session did not appear in sessions.list");
  }
  const patchedLabel = `Smoke ${tempSessionKey}`;
  await requestGateway("sessions.patch", { key: tempSessionKey, label: patchedLabel });
  const patchedSession = await waitForCondition(async () => {
    const sessionsRes = await requestGateway("sessions.list", {
      includeGlobal: true,
      includeUnknown: true,
      limit: 300,
    });
    const sessions = Array.isArray(sessionsRes?.sessions) ? sessionsRes.sessions : [];
    return sessions.find(
      (session) => session.key === tempSessionKey && session.label === patchedLabel,
    )
      ? true
      : null;
  });
  if (!patchedSession) {
    throw new Error("sessions.patch label was not reflected in sessions.list");
  }
  await requestGateway("sessions.delete", { key: tempSessionKey, deleteTranscript: true });
  const deletedSession = await waitForCondition(async () => {
    const sessionsRes = await requestGateway("sessions.list", {
      includeGlobal: true,
      includeUnknown: true,
      limit: 300,
    });
    const sessions = Array.isArray(sessionsRes?.sessions) ? sessionsRes.sessions : [];
    return sessions.some((session) => session.key === tempSessionKey) ? null : true;
  });
  if (!deletedSession) {
    throw new Error("sessions.delete did not remove temporary session");
  }

  // Inspector details tab should reflect the active deep-link session.
  await page.evaluate(() => {
    const app = document.querySelector("openclaw-app");
    if (!app) {
      throw new Error("openclaw-app missing while opening inspector");
    }
    app.sidebarOpen = true;
    app.sidebarContent = "e2e inspector seed";
  });
  await page.getByTestId("inspector-tab-tools").waitFor({ timeout: 20_000 });
  await page.getByTestId("inspector-tools-panel").waitFor({ timeout: 20_000 });
  await page.getByTestId("inspector-tools-markdown").waitFor({ timeout: 20_000 });
  const toolsText = await page.getByTestId("inspector-tools-markdown").textContent();
  if (!(toolsText ?? "").includes("e2e inspector seed")) {
    throw new Error("inspector tools tab did not render seeded tool output");
  }
  await page.getByTestId("inspector-tab-details").click();
  await page.getByTestId("inspector-details-panel").waitFor({ timeout: 20_000 });
  const detailsSessionKey = await page.getByTestId("inspector-details-session-key").textContent();
  if ((detailsSessionKey ?? "").trim() !== "main") {
    throw new Error("inspector details session key did not match active ?session");
  }

  // Ops route sanity: cron/logs/config views should be reachable via shell navigation.
  await page.getByTestId("primary-nav-cron").click();
  await page.waitForURL(/\/cron$/);
  await page.getByTestId("active-view-cron").waitFor({ timeout: 20_000 });
  // Cron run -> chat linkage: add temp job, run once, and verify run log session key.
  const cronJobName = `smoke-cron-${Date.now()}`;
  await requestGateway("cron.add", {
    name: cronJobName,
    enabled: true,
    schedule: { kind: "every", everyMs: 86_400_000 },
    sessionTarget: "isolated",
    wakeMode: "now",
    payload: { kind: "agentTurn", message: "smoke cron linkage" },
    delivery: { mode: "none" },
  });
  const cronJob = await waitForCondition(async () => {
    const listRes = await requestGateway("cron.list", { includeDisabled: true });
    const jobs = Array.isArray(listRes?.jobs) ? listRes.jobs : [];
    return jobs.find((job) => job.name === cronJobName) ?? null;
  });
  if (!cronJob?.id) {
    throw new Error("cron.add job not found in cron.list");
  }
  createdCronJobId = cronJob.id;
  await requestGateway("cron.run", { id: cronJob.id, mode: "force" });
  const cronRun = await waitForCondition(async () => {
    const runsRes = await requestGateway("cron.runs", { id: cronJob.id, limit: 20 });
    const runs = Array.isArray(runsRes?.entries) ? runsRes.entries : [];
    return runs.find((entry) => typeof entry.sessionKey === "string" && entry.sessionKey.length > 0)
      ? true
      : null;
  });
  if (!cronRun) {
    throw new Error("cron run log did not produce sessionKey linkage");
  }

  await page.getByTestId("primary-nav-logs").click();
  await page.waitForURL(/\/logs$/);
  await page.getByTestId("active-view-logs").waitFor({ timeout: 20_000 });
  // Logs tail/filter sanity.
  await requestGateway("logs.tail", { limit: 100, level: "info" });
  const logsFilter = page.getByTestId("logs-filter-input");
  await logsFilter.fill("smoke-filter-token");
  if ((await logsFilter.inputValue()) !== "smoke-filter-token") {
    throw new Error("logs filter input did not accept typed value");
  }

  await page.getByTestId("primary-nav-config").click();
  await page.waitForURL(/\/config$/);
  await page.getByTestId("active-view-config").waitFor({ timeout: 20_000 });
  // Config safety gate sanity: apply must remain disabled with no unsaved changes.
  const applyButton = page.getByTestId("config-apply-button");
  await applyButton.waitFor({ timeout: 20_000 });
  if (await applyButton.isEnabled()) {
    throw new Error("config apply safety gate failed: Apply should be disabled with no changes");
  }

  // Mobile sanity: shell should still render and nav can be toggled.
  await page.setViewportSize({ width: 390, height: 844 });
  const collapseButton = page.getByRole("button", { name: /collapse sidebar|expand sidebar/i });
  await collapseButton.click();
  await page.getByRole("button", { name: /collapse sidebar|expand sidebar/i }).waitFor({
    timeout: 10_000,
  });

  console.log(
    "UI smoke passed: connect/auth, sessions patch/delete, cron linkage, logs/config, and mobile sanity.",
  );
} finally {
  try {
    if (createdCronJobId) {
      await requestGateway("cron.remove", { id: createdCronJobId });
    }
  } catch {
    // Best-effort cleanup for smoke-created cron job.
  }
  try {
    await requestGateway("sessions.delete", { key: tempSessionKey, deleteTranscript: true });
  } catch {
    // Best-effort cleanup for smoke-created temp session.
  }
  await context.close();
  await browser.close();
}

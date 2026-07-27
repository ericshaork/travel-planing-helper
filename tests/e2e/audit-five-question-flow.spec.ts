import { expect, test } from "@playwright/test";

const FIVE_QUESTION_ANSWERS = [
  "想去杭州，从北京出发",
  "下个月出发，玩 4 天",
  "和家人一起，慢慢走",
  "风景和美食",
  "预算 5000 元",
];

test("audit full five-question flow with network + console capture", async ({
  page,
}) => {
  test.setTimeout(300_000);

  const consoleLog: string[] = [];
  const apiCalls: Array<{ method: string; url: string; status: number; body?: string }> = [];

  page.on("console", (msg) => {
    consoleLog.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    consoleLog.push(`[pageerror] ${err.message}\n${err.stack ?? ""}`);
  });
  page.on("response", async (resp) => {
    const url = resp.url();
    if (!url.includes("/api/")) return;
    const entry: { method: string; url: string; status: number; body?: string } = {
      method: resp.request().method(),
      url: url.replace("http://localhost:3000", ""),
      status: resp.status(),
    };
    if (resp.status() >= 400 || resp.request().method() === "POST") {
      try {
        entry.body = (await resp.text()).slice(0, 1000);
      } catch {}
    }
    apiCalls.push(entry);
  });

  await page.addInitScript(() => {
    Object.defineProperty(window, "process", {
      configurable: true,
      writable: true,
      value: {
        env: { NODE_ENV: "development", WANDERLY_ENABLE_DEV_GUEST_PROJECTS: "" },
        browser: true,
        version: "",
      },
    });
  });

  await page.goto("http://localhost:3000/create?source=ai", {
    waitUntil: "domcontentloaded",
  });

  const chatRoot = page.getByTestId("create-chat-workspace");
  await expect(chatRoot).toBeVisible({ timeout: 15000 });

  for (let i = 0; i < FIVE_QUESTION_ANSWERS.length - 1; i += 1) {
    const composer = page.getByTestId("chat-workspace-composer");
    await expect(composer).toBeVisible({ timeout: 5000 });
    const textarea = composer.locator("textarea");
    await textarea.fill(FIVE_QUESTION_ANSWERS[i]!);
    const send = page.getByTestId("chat-workspace-send-button");
    await send.click();
    const userBubbles = page.locator('[data-testid^="chat-workspace-message-user"]');
    await expect(userBubbles).toHaveCount(i + 1, { timeout: 60000 });
  }

  const lastAnswer = FIVE_QUESTION_ANSWERS[FIVE_QUESTION_ANSWERS.length - 1]!;
  const composer = page.getByTestId("chat-workspace-composer");
  await expect(composer).toBeVisible({ timeout: 5000 });
  const textarea = composer.locator("textarea");
  await textarea.fill(lastAnswer);
  const send = page.getByTestId("chat-workspace-send-button");
  await send.click();

  // Wait briefly to capture generation network calls
  await page.waitForTimeout(60_000);

  const proposalPreview = page.getByTestId("create-proposal-preview");
  const loadingPanel = page.getByTestId("create-generation-loading");
  const firstPlan = page.getByTestId("create-first-plan");
  const phase = (await chatRoot.getAttribute("data-first-generation-phase").catch(() => null)) ?? "missing";
  const loadingVisible = await loadingPanel.isVisible().catch(() => false);
  const previewVisible = await proposalPreview.isVisible().catch(() => false);
  const firstPlanVisible = await firstPlan.isVisible().catch(() => false);

  console.log("--- API CALLS ---");
  for (const c of apiCalls) {
    console.log(`${c.method} ${c.url} → ${c.status}${c.body ? ` body=${c.body}` : ""}`);
  }
  console.log("--- STATE ---");
  console.log("phase:", phase);
  console.log("loadingVisible:", loadingVisible);
  console.log("previewVisible:", previewVisible);
  console.log("firstPlanVisible:", firstPlanVisible);
  console.log("finalUrl:", page.url());
  console.log("--- CONSOLE ---");
  for (const line of consoleLog) console.log(line);
});
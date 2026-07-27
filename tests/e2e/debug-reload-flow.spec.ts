import { expect, test } from "@playwright/test";

const FIVE_QUESTION_ANSWERS = [
  "从北京去杭州",
  "下个月出发，玩 4 天",
  "和家人一起，不想太累",
  "风景和美食",
  "预算 5000 元",
];

test("debug reload flow with network + console capture", async ({ page }) => {
  test.setTimeout(300_000);

  const allCalls: Array<{ method: string; url: string; status: number; body?: string; phase: string }> = [];

  page.on("response", async (resp) => {
    const url = resp.url();
    if (!url.includes("/api/")) return;
    const entry: { method: string; url: string; status: number; body?: string; phase: string } = {
      method: resp.request().method(),
      url: url.replace("http://localhost:3000", ""),
      status: resp.status(),
      phase: "current",
    };
    if (resp.status() >= 400 || resp.request().method() === "POST") {
      try {
        entry.body = (await resp.text()).slice(0, 500);
      } catch {}
    }
    allCalls.push(entry);
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

  for (let i = 0; i < FIVE_QUESTION_ANSWERS.length - 1; i += 1) {
    const answer = FIVE_QUESTION_ANSWERS[i]!;
    const composer = page.getByTestId("chat-workspace-composer");
    await expect(composer).toBeVisible({ timeout: 5000 });
    const textarea = composer.locator("textarea");
    await textarea.fill(answer);
    const send = page.getByTestId("chat-workspace-send-button");
    await send.click();
    const userBubbles = page.locator(
      '[data-testid^="chat-workspace-message-user"]',
    );
    await expect(userBubbles).toHaveCount(i + 1, { timeout: 60000 });
  }

  const lastAnswer = FIVE_QUESTION_ANSWERS[FIVE_QUESTION_ANSWERS.length - 1]!;
  const composer = page.getByTestId("chat-workspace-composer");
  await expect(composer).toBeVisible({ timeout: 5000 });
  const textarea = composer.locator("textarea");
  await textarea.fill(lastAnswer);
  const send = page.getByTestId("chat-workspace-send-button");
  await send.click();

  await page.waitForTimeout(3_000);

  for (const c of allCalls) c.phase = "before-reload";

  await page.reload({ waitUntil: "domcontentloaded" });

  // After reload, wait for first plan OR error OR 120s
  const firstPlan = page.getByTestId("create-first-plan");
  const errorPage = page.getByTestId("create-generation-error");

  const start = Date.now();
  let endState: string = "timeout";
  while (Date.now() - start < 180_000) {
    const fp = await firstPlan.isVisible().catch(() => false);
    if (fp) { endState = "firstPlan"; break; }
    const ep = await errorPage.isVisible().catch(() => false);
    if (ep) { endState = "errorPage"; break; }
    await page.waitForTimeout(2_000);
  }

  for (const c of allCalls) {
    if (c.phase === "current") c.phase = "after-reload";
  }

  console.log(`END_STATE: ${endState}`);
  console.log("=== API CALLS ===");
  for (const c of allCalls) {
    console.log(`[${c.phase}] ${c.method} ${c.url} → ${c.status}${c.body ? ` body=${c.body}` : ""}`);
  }
  expect(endState).toBe("firstPlan");
});

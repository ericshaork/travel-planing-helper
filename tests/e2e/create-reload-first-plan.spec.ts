import { expect, test } from "@playwright/test";

const FIVE_QUESTION_ANSWERS = [
  "从北京去杭州",
  "下个月出发，玩 4 天",
  "和家人一起，不想太累",
  "风景和美食",
  "预算 5000 元",
];

test("reload after Q5 resumes first plan generation", async ({ page }) => {
  test.setTimeout(300_000);

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

  // Send Q1-Q4 and wait for each user bubble to appear
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

  // Send Q5
  const lastAnswer = FIVE_QUESTION_ANSWERS[FIVE_QUESTION_ANSWERS.length - 1]!;
  const composer = page.getByTestId("chat-workspace-composer");
  await expect(composer).toBeVisible({ timeout: 5000 });
  const textarea = composer.locator("textarea");
  await textarea.fill(lastAnswer);
  const send = page.getByTestId("chat-workspace-send-button");
  await send.click();

  // Reload shortly after Q5 to trigger bootstrap auto-regeneration
  // (Q5 sendCreateCopilotMessage responds; before first-time generation completes
  //  server-side the bootstrap will see stored session + flowStage=clarifying +
  //  versions=0 + interviewComplete → trigger regen)
  await page.waitForTimeout(3_000);

  await page.reload({ waitUntil: "domcontentloaded" });

  const firstPlan = page.getByTestId("create-first-plan");
  await expect(firstPlan).toBeVisible({ timeout: 180000 });

  await expect(
    firstPlan.getByTestId("first-plan-adjust-button"),
  ).toBeVisible();
  await expect(
    firstPlan.getByTestId("first-plan-accept-button"),
  ).toBeVisible();
});

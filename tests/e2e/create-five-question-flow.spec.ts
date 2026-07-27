import { expect, test } from "@playwright/test";

const FIVE_QUESTION_ANSWERS = [
  "想去杭州",
  "玩 4 天",
  "两个人一起",
  "希望慢节奏",
  "预算 6000 元",
];

test("create flow auto-generates first plan after five answers", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const consoleErrors: string[] = [];
  const networkLog: string[] = [];
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (resp) => {
    const url = resp.url();
    if (url.includes("/api/")) {
      networkLog.push(
        `${resp.request().method()} ${url.replace("http://localhost:3000", "")} ${resp.status()}`,
      );
    }
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

  // Q5: after sending, the chat workspace is replaced by the loading panel
  const lastAnswer = FIVE_QUESTION_ANSWERS[FIVE_QUESTION_ANSWERS.length - 1]!;
  const composer = page.getByTestId("chat-workspace-composer");
  await expect(composer).toBeVisible({ timeout: 5000 });
  const textarea = composer.locator("textarea");
  await textarea.fill(lastAnswer);
  const send = page.getByTestId("chat-workspace-send-button");
  await send.click();

  // Loading panel should appear automatically after Q5
  const loadingPanel = page.getByTestId("create-generation-loading");
  await expect(loadingPanel).toBeVisible({ timeout: 30000 });
  await expect(loadingPanel).toHaveAttribute("data-context", "first_version");

  // Loading panel should include a watercolor image and journal-style bands
  await expect(loadingPanel.locator("img")).toHaveCount(3, { timeout: 5000 });

  // Proposal preview should appear after generation completes
  const firstPlan = page.getByTestId("create-first-plan");
  await expect(firstPlan).toBeVisible({ timeout: 120000 });

  // First plan page should expose both adjustment and workspace actions
  await expect(
    firstPlan.getByTestId("first-plan-adjust-button"),
  ).toBeVisible();
  await expect(
    firstPlan.getByTestId("first-plan-accept-button"),
  ).toBeVisible();

  const fatal = consoleErrors.filter(
    (err) =>
      err.includes("Illegal invocation") ||
      err.includes("Failed to fetch") ||
      err.includes("TypeError"),
  );
  expect(fatal, `Console errors: ${fatal.join("\n")}`).toEqual([]);
});
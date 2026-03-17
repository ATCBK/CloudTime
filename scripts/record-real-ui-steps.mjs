import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.resolve("D:/Project_building/Vide_video/Cloudo/output");
const RAW_VIDEO_DIR = path.join(OUTPUT_DIR, "steps_raw");
const TARGET_URL = "http://127.0.0.1:5173";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

async function safeClick(locator, timeout = 10000) {
  await locator.first().waitFor({ state: "visible", timeout });
  await locator.first().click();
}

async function clickFirstAvailable(locators, timeout = 10000) {
  for (const locator of locators) {
    if ((await locator.count()) > 0) {
      await safeClick(locator, timeout);
      return;
    }
  }
  throw new Error("No clickable locator available");
}

async function resetState(page) {
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
}

async function withRecordedPage(stepName, routeHash, action) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: RAW_VIDEO_DIR, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  const video = page.video();

  await page.goto(`${TARGET_URL}${routeHash}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await resetState(page);
  await wait(900);

  await action(page);
  await wait(1200);

  await context.close();
  await browser.close();

  const sourcePath = await video.path();
  const targetPath = path.join(OUTPUT_DIR, `${stepName}.webm`);
  fs.copyFileSync(sourcePath, targetPath);
  return targetPath;
}

async function step1CreateTodo(page) {
  await page.waitForSelector(".time-manager-page", { timeout: 30000 });
  const quickCreateButton = page.locator(".time-manager-page .accent-btn");
  if (await quickCreateButton.count()) {
    await safeClick(quickCreateButton);
  } else {
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent("cloudo:focusQuickCreate")),
    );
  }
  await page.waitForSelector(".tm-create-popup-card", { timeout: 10000 });
  await page
    .locator(".time-manager-page .todo-create-form input")
    .first()
    .fill("Launch campaign assets");
  await page
    .locator(".time-manager-page .todo-create-form select")
    .first()
    .selectOption({ index: 0 });
  await page
    .locator(".time-manager-page .todo-create-form input[type='number']")
    .first()
    .fill("90");
  await page
    .locator(".time-manager-page .todo-create-form textarea")
    .first()
    .fill("Finalize launch brief and align design + copy.");
  await safeClick(page.locator(".tm-create-popup-actions .tiny-btn").last());
}

async function setupTodo(page) {
  const quickCreateButton = page.locator(".time-manager-page .accent-btn");
  if (await quickCreateButton.count()) {
    await safeClick(quickCreateButton);
  } else {
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent("cloudo:focusQuickCreate")),
    );
  }
  await page.waitForSelector(".tm-create-popup-card", { timeout: 10000 });
  await page
    .locator(".time-manager-page .todo-create-form input")
    .first()
    .fill("Sync roadmap");
  await page
    .locator(".time-manager-page .todo-create-form select")
    .first()
    .selectOption({ index: 0 });
  await page
    .locator(".time-manager-page .todo-create-form input[type='number']")
    .first()
    .fill("60");
  await safeClick(page.locator(".tm-create-popup-actions .tiny-btn").last());
  await wait(600);
}

async function step2TimelineDrag(page) {
  await page.waitForSelector(".time-manager-page", { timeout: 30000 });
  await setupTodo(page);

  const todoCard = page.locator(".time-manager-page .todo-card").first();
  const timeline = page.locator(".time-manager-page .timeline").first();
  await todoCard.waitFor({ state: "visible", timeout: 12000 });
  await timeline.waitFor({ state: "visible", timeout: 12000 });
  await todoCard.dragTo(timeline, { targetPosition: { x: 480, y: 360 } });
  await wait(700);

  const moveHandle = page
    .locator(".time-manager-page .timeline-card .timeline-side-handle")
    .first();
  const moveBox = await moveHandle.boundingBox();
  if (moveBox) {
    await page.mouse.move(
      moveBox.x + moveBox.width / 2,
      moveBox.y + moveBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      moveBox.x + moveBox.width / 2,
      moveBox.y + moveBox.height / 2 + 90,
      { steps: 18 },
    );
    await page.mouse.up();
  }
  await wait(500);

  const bottomResize = page
    .locator(".time-manager-page .timeline-card .timeline-resize-handle.bottom")
    .first();
  const bottomBox = await bottomResize.boundingBox();
  if (bottomBox) {
    await page.mouse.move(
      bottomBox.x + bottomBox.width / 2,
      bottomBox.y + bottomBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      bottomBox.x + bottomBox.width / 2,
      bottomBox.y + bottomBox.height / 2 + 90,
      { steps: 14 },
    );
    await page.mouse.up();
  }
  await wait(500);

  const topResize = page
    .locator(".time-manager-page .timeline-card .timeline-resize-handle.top")
    .first();
  const topBox = await topResize.boundingBox();
  if (topBox) {
    await page.mouse.move(topBox.x + topBox.width / 2, topBox.y + topBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      topBox.x + topBox.width / 2,
      topBox.y + topBox.height / 2 - 55,
      { steps: 14 },
    );
    await page.mouse.up();
  }
}

async function step3DayWeekMonth(page) {
  await page.waitForSelector(".time-manager-page", { timeout: 30000 });
  const chips = page.locator(".time-manager-page .tm-view-switcher .chip");
  await safeClick(chips.nth(1));
  await wait(700);
  await safeClick(chips.nth(2));
  await wait(800);
  const monthDateBtn = page
    .locator(".time-manager-page .month-grid .month-date-btn")
    .nth(15);
  await safeClick(monthDateBtn);
}

async function step4Notes(page) {
  await page.waitForSelector(".sidebar", { timeout: 20000 });
  await safeClick(page.locator(".sidebar .nav-link[data-social='notes']"));
  await page.waitForSelector(".notes-page", { timeout: 20000 });
  await wait(600);

  await safeClick(page.locator(".notes-page .tree-toolbar .icon-btn[title='新建文件夹']"));
  await wait(400);
  await safeClick(page.locator(".notes-page .tree-container .tree-row").first());
  await wait(250);
  await safeClick(page.locator(".notes-page .tree-toolbar .icon-btn[title='新建文件']"));
  await wait(600);

  const editor = page.locator(".notes-page .wysiwyg-editor");
  await editor.waitFor({ state: "visible", timeout: 12000 });
  await editor.click();
  await page.keyboard.type("Q1 Launch Plan");
  await page.keyboard.press("Enter");
  await page.keyboard.type(
    "This release aligns planning and notes into one focused workflow.",
  );
  await page.keyboard.press("Enter");
  await page.keyboard.type("Key Decisions:");
  await page.keyboard.press("Enter");
  await page.keyboard.type("- Timeline lock by Monday");
  await page.keyboard.press("Enter");
  await page.keyboard.type("- Notes review in preview mode");
  await wait(600);

  await safeClick(page.locator(".notes-page .editor-toolbar .icon-btn[title='预览模式']"));
  await wait(800);
  await safeClick(page.locator(".notes-page .editor-toolbar .icon-btn[title='编辑模式']"));
  await wait(500);

  const commentInput = page.locator(".notes-page .comment-compose textarea");
  await commentInput.fill(
    "Looks good. Please keep the headline concise for keynote delivery.",
  );
  await safeClick(page.locator(".notes-page .comment-compose .tiny-btn"));
}

async function step5Settings(page) {
  await page.waitForSelector(".sidebar", { timeout: 20000 });
  await safeClick(page.locator(".sidebar .nav-link[data-social='settings']"));
  await page.waitForSelector(".settings-page", { timeout: 20000 });
  await wait(500);

  await page.selectOption("#theme-mode", "dark");
  await wait(400);
  await page.selectOption("#theme-mode", "light");
  await wait(400);

  await page.$eval("#opacity", (el) => {
    el.value = "86";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await wait(350);
  await page.$eval("#quick-panel-opacity", (el) => {
    el.value = "78";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await wait(350);

  await page.fill("#quick-panel-hotkey", "Alt+Q");
  await page.fill("#quick-create-hotkey", "Alt+Shift+N");
  await safeClick(page.locator(".settings-hotkey-actions .accent-btn"));
}

async function run() {
  ensureDir(RAW_VIDEO_DIR);

  const outputs = [];
  outputs.push(
    await withRecordedPage("step1-time-create", "#/time", step1CreateTodo),
  );
  outputs.push(
    await withRecordedPage("step2-time-drag-resize", "#/time", step2TimelineDrag),
  );
  outputs.push(
    await withRecordedPage("step3-time-views", "#/time", step3DayWeekMonth),
  );
  outputs.push(await withRecordedPage("step4-notes-flow", "#/time", step4Notes));
  outputs.push(await withRecordedPage("step5-settings-flow", "#/time", step5Settings));

  console.log("Recorded step videos:");
  for (const file of outputs) console.log(file);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.resolve("D:/Project_building/Vide_video/Cloudo/output");
const RAW_VIDEO_DIR = path.join(OUTPUT_DIR, "raw_ui");
const TARGET_URL = "http://127.0.0.1:5173/#/time";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function safeClick(locator, timeout = 8000) {
  await locator.first().waitFor({ state: "visible", timeout });
  await locator.first().click();
}

async function run() {
  fs.mkdirSync(RAW_VIDEO_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: RAW_VIDEO_DIR, size: { width: 1920, height: 1080 } }
  });
  const page = await context.newPage();
  const video = page.video();

  await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".time-manager-page", { timeout: 30000 });

  // Reset local state for deterministic capture.
  await page.evaluate(() => {
    window.localStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".time-manager-page", { timeout: 30000 });
  await wait(700);

  // 1) Create todo from real page.
  const quickCreateButton = page.locator(".time-manager-page .accent-btn");
  if (await quickCreateButton.count()) {
    await safeClick(quickCreateButton);
  } else {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("cloudo:focusQuickCreate"));
    });
  }
  await page.waitForSelector(".tm-create-popup-card", { timeout: 10000 });
  await page.locator(".time-manager-page .todo-create-form input").first().fill("Launch campaign assets");
  await page.locator(".time-manager-page .todo-create-form select").first().selectOption({ index: 0 });
  await page.locator(".time-manager-page .todo-create-form input[type='number']").first().fill("90");
  await page.locator(".time-manager-page .todo-create-form textarea").first().fill("Finalize launch brief and align design + copy.");
  await safeClick(page.locator(".tm-create-popup-actions .tiny-btn").last());
  await wait(900);

  // 2) Drag todo to timeline + move and resize card.
  const todoCard = page.locator(".time-manager-page .todo-card").first();
  const timeline = page.locator(".time-manager-page .timeline").first();
  await todoCard.waitFor({ state: "visible", timeout: 12000 });
  await timeline.waitFor({ state: "visible", timeout: 12000 });
  await todoCard.dragTo(timeline, { targetPosition: { x: 460, y: 360 } });
  await wait(900);

  const moveHandle = page.locator(".time-manager-page .timeline-card .timeline-side-handle").first();
  const moveBox = await moveHandle.boundingBox();
  if (moveBox) {
    await page.mouse.move(moveBox.x + moveBox.width / 2, moveBox.y + moveBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(moveBox.x + moveBox.width / 2, moveBox.y + moveBox.height / 2 + 80, { steps: 18 });
    await page.mouse.up();
  }
  await wait(600);

  const bottomResize = page.locator(".time-manager-page .timeline-card .timeline-resize-handle.bottom").first();
  const bottomBox = await bottomResize.boundingBox();
  if (bottomBox) {
    await page.mouse.move(bottomBox.x + bottomBox.width / 2, bottomBox.y + bottomBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(bottomBox.x + bottomBox.width / 2, bottomBox.y + bottomBox.height / 2 + 90, { steps: 16 });
    await page.mouse.up();
  }
  await wait(600);

  const topResize = page.locator(".time-manager-page .timeline-card .timeline-resize-handle.top").first();
  const topBox = await topResize.boundingBox();
  if (topBox) {
    await page.mouse.move(topBox.x + topBox.width / 2, topBox.y + topBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(topBox.x + topBox.width / 2, topBox.y + topBox.height / 2 - 55, { steps: 14 });
    await page.mouse.up();
  }
  await wait(900);

  // 3) Day -> Week -> Month -> back to Day through date click.
  const chips = page.locator(".time-manager-page .tm-view-switcher .chip");
  await safeClick(chips.nth(1));
  await wait(800);
  await safeClick(chips.nth(2));
  await wait(900);
  const monthDateBtn = page.locator(".time-manager-page .month-grid .month-date-btn").nth(15);
  await safeClick(monthDateBtn);
  await wait(900);

  // 4) Notes: new folder + file, edit/preview, publish comment.
  await safeClick(page.locator(".sidebar .nav-link[data-social='notes']"));
  await page.waitForSelector(".notes-page", { timeout: 20000 });
  await wait(700);
  await safeClick(page.locator(".notes-page .tree-toolbar .icon-btn[title='新建文件夹']"));
  await wait(500);
  await safeClick(page.locator(".notes-page .tree-toolbar .icon-btn[title='新建文件']"));
  await wait(700);

  const editor = page.locator(".notes-page .wysiwyg-editor");
  await editor.waitFor({ state: "visible", timeout: 12000 });
  await editor.click();
  await page.keyboard.type("Q1 Launch Plan");
  await page.keyboard.press("Enter");
  await page.keyboard.type("This release aligns planning and notes into one focused workflow.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Key Decisions:");
  await page.keyboard.press("Enter");
  await page.keyboard.type("- Timeline lock by Monday");
  await page.keyboard.press("Enter");
  await page.keyboard.type("- Notes review in preview mode");
  await wait(700);

  await safeClick(page.locator(".notes-page .icon-btn[title='预览模式']"));
  await wait(900);
  await safeClick(page.locator(".notes-page .icon-btn[title='编辑模式']"));
  await wait(700);

  const commentInput = page.locator(".notes-page .comment-compose textarea");
  await commentInput.fill("Looks good. Please keep the headline concise for keynote delivery.");
  await safeClick(page.locator(".notes-page .comment-compose .tiny-btn"));
  await wait(900);

  // 5) Settings: theme/opacity/hotkeys/save.
  await safeClick(page.locator(".sidebar .nav-link[data-social='settings']"));
  await page.waitForSelector(".settings-page", { timeout: 20000 });
  await wait(600);

  await page.selectOption("#theme-mode", "dark");
  await wait(500);
  await page.selectOption("#theme-mode", "light");
  await wait(500);

  await page.$eval("#opacity", (el) => {
    el.value = "86";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await wait(400);

  await page.$eval("#quick-panel-opacity", (el) => {
    el.value = "78";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await wait(500);

  await page.fill("#quick-panel-hotkey", "Alt+Q");
  await page.fill("#quick-create-hotkey", "Alt+Shift+N");
  await safeClick(page.locator(".settings-hotkey-actions .accent-btn"));
  await wait(2200);

  await context.close();
  await browser.close();

  const rawPath = await video.path();
  const targetRaw = path.join(OUTPUT_DIR, "cloudo-real-ui-demo-raw.webm");
  fs.copyFileSync(rawPath, targetRaw);
  console.log(targetRaw);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

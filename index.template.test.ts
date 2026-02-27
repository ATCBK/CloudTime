import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("index.html dev template", () => {
  it("uses source entry instead of built asset filenames", () => {
    const htmlPath = path.resolve(process.cwd(), "index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");

    expect(html).toContain('src="/src/main.tsx"');
    expect(html).not.toMatch(/\/assets\/index-[\w-]+\.(js|css)/);
  });
});


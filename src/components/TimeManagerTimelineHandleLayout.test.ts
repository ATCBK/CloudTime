import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pagePath = resolve(__dirname, "./TimeManagerPage.tsx");
const stylesPath = resolve(__dirname, "../styles.css");
const pageSource = readFileSync(pagePath, "utf8");
const stylesSource = readFileSync(stylesPath, "utf8");

function extractRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = stylesSource.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, "m"));
  return match?.[1] ?? "";
}

describe("TimeManager timeline handle layout", () => {
  it("uses left-side move handle instead of top head drag region", () => {
    expect(pageSource).toContain("timeline-side-handle");
    expect(pageSource).not.toContain("timeline-head");
  });

  it("pins move handle on the left side", () => {
    const handleRule = extractRule(".timeline-side-handle");
    expect(handleRule).toContain("left: 0");
    expect(handleRule).toContain("width: 18px");
    expect(handleRule).not.toContain("right: 0");
  });
});

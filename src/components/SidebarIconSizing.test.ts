import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const stylesPath = resolve(__dirname, "../styles.css");
const styles = readFileSync(stylesPath, "utf8");

function extractRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, "m"));
  return match?.[1] ?? "";
}

describe("Sidebar icon sizing", () => {
  it("keeps nav container size fixed while enlarging icon glyphs", () => {
    const navRule = extractRule(".nav-link");
    const navIconRule = extractRule(".nav-link svg");
    const quickIconRule = extractRule(".quick-action-btn svg");

    expect(navRule).toContain("width: 24px");
    expect(navRule).toContain("height: 24px");
    expect(navIconRule).toMatch(/transform:\s*scale\(/);
    expect(quickIconRule).toMatch(/transform:\s*scale\(/);
  });
});


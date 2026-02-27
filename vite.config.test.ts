import { describe, expect, it } from "vitest";
import config from "./vite.config";

describe("vite config for electron packaging", () => {
  it("uses relative base path for file:// loading", () => {
    expect(config.base).toBe("./");
  });
});


import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  it("renders cloud svg brand mark instead of letter C", () => {
    const html = renderToStaticMarkup(<Sidebar activePage="time_manager" onNavigate={() => {}} />);
    expect(html).toContain("brand-cloud");
    expect(html).not.toContain(">C<");
  });
});


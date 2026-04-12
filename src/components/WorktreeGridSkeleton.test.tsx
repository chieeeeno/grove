import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import WorktreeGridSkeleton from "./WorktreeGridSkeleton";

describe("WorktreeGridSkeleton", () => {
  it("4 枚のスケルトンカードをレンダリングする", () => {
    const { container } = render(<WorktreeGridSkeleton />);
    const cards = container.querySelectorAll(".animate-pulse");
    expect(cards).toHaveLength(4);
  });

  it("2カラムグリッドでレンダリングする", () => {
    const { container } = render(<WorktreeGridSkeleton />);
    const grid = container.firstElementChild;
    expect(grid).toHaveClass("grid", "grid-cols-2", "gap-4");
  });
});

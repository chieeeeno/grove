import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import WorktreeCardSkeleton from "./WorktreeCardSkeleton";

describe("WorktreeCardSkeleton", () => {
  it("animate-pulse クラスを持つカードをレンダリングする", () => {
    const { container } = render(<WorktreeCardSkeleton />);
    const card = container.firstElementChild;
    expect(card).toHaveClass("animate-pulse");
  });

  it("WorktreeCard と同じ外枠クラスを持つ", () => {
    const { container } = render(<WorktreeCardSkeleton />);
    const card = container.firstElementChild;
    expect(card).toHaveClass("rounded-xl", "p-4", "bg-card", "border", "border-border");
  });
});

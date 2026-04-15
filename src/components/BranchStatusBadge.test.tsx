import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BranchStatusBadge from "./BranchStatusBadge";

describe("BranchStatusBadge", () => {
  it("primary バッジを表示する", () => {
    render(<BranchStatusBadge status="primary" />);
    expect(screen.getByText("primary")).toBeInTheDocument();
  });

  it("active バッジを表示する", () => {
    render(<BranchStatusBadge status="active" />);
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("merged バッジを表示する", () => {
    render(<BranchStatusBadge status="merged" />);
    expect(screen.getByText("merged")).toBeInTheDocument();
  });

  it("idle は null を返す（DOM ノードなし）", () => {
    const { container } = render(<BranchStatusBadge status="idle" />);
    expect(container.innerHTML).toBe("");
  });

  it("idle + fixedWidth はプレースホルダーを表示する", () => {
    render(<BranchStatusBadge status="idle" fixedWidth />);
    expect(screen.getByText("バッジなし")).toBeInTheDocument();
  });
});

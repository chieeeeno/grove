import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WorktreeGrid from "./WorktreeGrid";
import type { WorktreeInfo } from "../types";

/** テスト用の WorktreeInfo を生成するヘルパー */
function makeWorktree(path: string, overrides: Partial<WorktreeInfo> = {}): WorktreeInfo {
  return {
    path,
    branch: "main",
    isMain: false,
    head: "abc123",
    lastCommitMessage: "test commit",
    lastCommitTime: 1000,
    modifiedCount: 0,
    ...overrides,
  };
}

const noop = vi.fn();

const defaultProps = {
  labels: {},
  worktreeOrder: [],
  repositoryId: "repo-1",
  codeAvailable: true,
  onOpenInEditor: noop,
  onRemove: noop,
  onSaveLabel: noop,
  onReorder: noop,
};

describe("WorktreeGrid", () => {
  const mainWt = makeWorktree("/repo/main", { isMain: true, branch: "main" });
  const featureA = makeWorktree("/repo/feature-a", { branch: "feature-a" });
  const featureB = makeWorktree("/repo/feature-b", { branch: "feature-b" });

  it("worktree カードがレンダリングされる", () => {
    render(<WorktreeGrid {...defaultProps} worktrees={[mainWt, featureA]} />);
    // ラベルとブランチ名が同一文字列で複数表示されるため getAllByText を使用
    expect(screen.getAllByText("main").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("feature-a").length).toBeGreaterThanOrEqual(1);
  });

  it("main worktree が先頭に表示される", () => {
    const { container } = render(
      <WorktreeGrid {...defaultProps} worktrees={[featureA, mainWt, featureB]} />
    );
    // main worktree は "primary" バッジを持つ（WorktreeCard の実装）
    const allText = container.textContent ?? "";
    const mainIndex = allText.indexOf("primary");
    const featureAIndex = allText.indexOf("feature-a");
    expect(mainIndex).toBeLessThan(featureAIndex);
  });

  it("worktreeOrder に基づいた順序でレンダリングされる", () => {
    const { container } = render(
      <WorktreeGrid
        {...defaultProps}
        worktrees={[mainWt, featureA, featureB]}
        worktreeOrder={["/repo/feature-b", "/repo/feature-a"]}
      />
    );
    const allText = container.textContent ?? "";
    const indexB = allText.indexOf("feature-b");
    const indexA = allText.indexOf("feature-a");
    expect(indexB).toBeLessThan(indexA);
  });
});

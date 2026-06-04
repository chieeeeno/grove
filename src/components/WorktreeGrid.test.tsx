import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WorktreeGrid from "./WorktreeGrid";
import { mockWorktree, mockSubWorktree } from "../test/fixtures";

const noop = vi.fn();

const defaultProps = {
  labels: {},
  worktreeOrder: [],
  repositoryId: "repo-1",
  editorAvailable: true,
  terminalAvailable: true,
  dndDisabled: false,
  onOpenInEditor: noop,
  onOpenInTerminal: noop,
  onRemove: noop,
  onSaveLabel: noop,
  onReorder: noop,
};

describe("WorktreeGrid", () => {
  const mainWt = mockWorktree({ path: "/repo/main" });
  const featureA = mockSubWorktree({ path: "/repo/feature-a", branch: "feature-a" });
  const featureB = mockSubWorktree({ path: "/repo/feature-b", branch: "feature-b" });

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

  describe("dndDisabled（絞り込み中の DnD 無効化）", () => {
    it("dndDisabled=false のとき non-main カードは sortable になる", () => {
      const { container } = render(
        <WorktreeGrid
          {...defaultProps}
          worktrees={[mainWt, featureA, featureB]}
          dndDisabled={false}
        />
      );
      // dnd-kit の useSortable は aria-roledescription="sortable" を付与する
      expect(container.querySelectorAll('[aria-roledescription="sortable"]')).toHaveLength(2);
    });

    it("dndDisabled=true のとき sortable 属性を持たない素のカードを描画する", () => {
      const { container } = render(
        <WorktreeGrid
          {...defaultProps}
          worktrees={[mainWt, featureA, featureB]}
          dndDisabled={true}
        />
      );
      expect(container.querySelector('[aria-roledescription="sortable"]')).toBeNull();
      // カード自体は全件描画される（各カードは「パスをコピー」ボタンを 1 つ持つ）
      expect(screen.getAllByLabelText("パスをコピー")).toHaveLength(3);
    });

    it("dndDisabled=true でも worktreeOrder の並び順を尊重する", () => {
      const { container } = render(
        <WorktreeGrid
          {...defaultProps}
          worktrees={[mainWt, featureA, featureB]}
          worktreeOrder={["/repo/feature-b", "/repo/feature-a"]}
          dndDisabled={true}
        />
      );
      const allText = container.textContent ?? "";
      expect(allText.indexOf("feature-b")).toBeLessThan(allText.indexOf("feature-a"));
    });
  });
});

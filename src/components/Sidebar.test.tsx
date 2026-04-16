import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "./Sidebar";

describe("Sidebar", () => {
  const defaultProps = {
    repositories: [
      { id: "r1", name: "repo-alpha", worktreeCount: 2 },
      { id: "r2", name: "repo-beta", worktreeCount: 5 },
    ],
    selectedId: "r1",
    isMetaDown: false,
    onSelectRepository: vi.fn(),
    onAddRepository: vi.fn(),
    onRemoveRepository: vi.fn(),
    onOpenSettings: vi.fn(),
  };

  it("リポジトリ一覧を描画する", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("repo-alpha")).toBeInTheDocument();
    expect(screen.getByText("repo-beta")).toBeInTheDocument();
  });

  it("通常時は worktreeCount バッジを表示する", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("リポジトリクリックで onSelectRepository が呼ばれる", async () => {
    const onSelectRepository = vi.fn();
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} onSelectRepository={onSelectRepository} />);

    await user.click(screen.getByText("repo-beta"));

    expect(onSelectRepository).toHaveBeenCalledWith("r2");
  });

  describe("Cmd キー押下時の番号バッジ", () => {
    it("isMetaDown=true では worktreeCount バッジが ⌘1/⌘2 … に差し替わる", () => {
      render(<Sidebar {...defaultProps} isMetaDown={true} />);

      expect(screen.getByText("⌘1")).toBeInTheDocument();
      expect(screen.getByText("⌘2")).toBeInTheDocument();
      // worktreeCount バッジは出ない
      expect(screen.queryByText("2")).not.toBeInTheDocument();
      expect(screen.queryByText("5")).not.toBeInTheDocument();
    });

    it("10 個目以降のリポジトリは isMetaDown=true でも番号バッジが出ない（worktreeCount のまま）", () => {
      const repos = Array.from({ length: 11 }, (_, i) => ({
        id: `r${i}`,
        name: `repo-${i}`,
        worktreeCount: 100 + i, // 既存バッジと被らない値
      }));

      render(<Sidebar {...defaultProps} repositories={repos} isMetaDown={true} />);

      // 9 番目（index 8）までは ⌘1〜⌘9 が出る
      expect(screen.getByText("⌘1")).toBeInTheDocument();
      expect(screen.getByText("⌘9")).toBeInTheDocument();
      // 10 個目以降は番号なし、worktreeCount が残る
      expect(screen.queryByText("⌘10")).not.toBeInTheDocument();
      expect(screen.getByText("109")).toBeInTheDocument(); // index 9 の worktreeCount
      expect(screen.getByText("110")).toBeInTheDocument(); // index 10 の worktreeCount
    });

    it("isMetaDown=false に戻すと worktreeCount バッジに戻る", () => {
      const { rerender } = render(<Sidebar {...defaultProps} isMetaDown={true} />);
      expect(screen.getByText("⌘1")).toBeInTheDocument();

      rerender(<Sidebar {...defaultProps} isMetaDown={false} />);
      expect(screen.queryByText("⌘1")).not.toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });
});

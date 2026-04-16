import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorktreeCard from "./WorktreeCard";
import { mockWorktree, mockSubWorktree } from "../test/fixtures";
import { useAppStore } from "../stores/appStore";

const noop = vi.fn();

const defaultProps = {
  label: "test-label",
  codeAvailable: true,
  terminalAvailable: true,
  onOpenInEditor: noop,
  onOpenInTerminal: noop,
  onRemove: noop,
  onSaveLabel: noop,
};

describe("WorktreeCard", () => {
  beforeEach(() => {
    useAppStore.setState({
      installedTerminals: [
        { id: "terminal", name: "Terminal", path: "/System/Applications/Utilities/Terminal.app" },
      ],
      selectedTerminal: "",
    });
  });

  describe("Terminal ボタン", () => {
    it("terminalAvailable=true のとき Terminal ボタンが有効", () => {
      render(<WorktreeCard {...defaultProps} worktree={mockWorktree()} terminalAvailable={true} />);
      const btn = screen.getByRole("button", { name: /Terminal/ });
      expect(btn).not.toBeDisabled();
    });

    it("terminalAvailable=false のとき Terminal ボタンが無効化される", () => {
      render(
        <WorktreeCard {...defaultProps} worktree={mockWorktree()} terminalAvailable={false} />
      );
      const btn = screen.getByRole("button", { name: /Terminal/ });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("title", "ターミナルアプリが見つかりません");
    });

    it("Terminal ボタンクリックで onOpenInTerminal が呼ばれる", async () => {
      const onOpenInTerminal = vi.fn();
      const wt = mockSubWorktree({ path: "/repo/feature" });
      render(<WorktreeCard {...defaultProps} worktree={wt} onOpenInTerminal={onOpenInTerminal} />);
      const btn = screen.getByRole("button", { name: /Terminal/ });
      await userEvent.click(btn);
      expect(onOpenInTerminal).toHaveBeenCalledWith("/repo/feature");
    });

    it("terminalAvailable=false のとき Terminal ボタンクリックで onOpenInTerminal が呼ばれない", async () => {
      const onOpenInTerminal = vi.fn();
      render(
        <WorktreeCard
          {...defaultProps}
          worktree={mockWorktree()}
          terminalAvailable={false}
          onOpenInTerminal={onOpenInTerminal}
        />
      );
      const btn = screen.getByRole("button", { name: /Terminal/ });
      await userEvent.click(btn);
      expect(onOpenInTerminal).not.toHaveBeenCalled();
    });

    it("設定中のターミナルアプリ名がボタンラベルに表示される", () => {
      useAppStore.setState({
        installedTerminals: [
          { id: "terminal", name: "Terminal", path: "/System/Applications/Utilities/Terminal.app" },
          { id: "ghostty", name: "Ghostty", path: "/Applications/Ghostty.app" },
        ],
        selectedTerminal: "ghostty",
      });
      render(<WorktreeCard {...defaultProps} worktree={mockWorktree()} />);
      const btn = screen.getByRole("button", { name: /Ghostty/ });
      expect(btn).toBeInTheDocument();
    });
  });

  describe("VS Code ボタン", () => {
    it("codeAvailable=true のとき VS Code ボタンが有効", () => {
      render(<WorktreeCard {...defaultProps} worktree={mockWorktree()} codeAvailable={true} />);
      const btn = screen.getByRole("button", { name: /VS Code/ });
      expect(btn).not.toBeDisabled();
    });

    it("codeAvailable=false のとき VS Code ボタンが無効化される", () => {
      render(<WorktreeCard {...defaultProps} worktree={mockWorktree()} codeAvailable={false} />);
      const btn = screen.getByRole("button", { name: /VS Code/ });
      expect(btn).toBeDisabled();
    });
  });

  describe("ブランチステータスバッジ", () => {
    it("メイン worktree は常に primary バッジを表示する", () => {
      render(<WorktreeCard {...defaultProps} worktree={mockWorktree({ isMain: true })} />);
      expect(screen.getByText("primary")).toBeInTheDocument();
      expect(screen.queryByText("merged")).toBeNull();
      expect(screen.queryByText("active")).toBeNull();
    });

    it("branchStatus=active の非メイン worktree は active バッジを表示する", () => {
      render(
        <WorktreeCard {...defaultProps} worktree={mockSubWorktree({ branchStatus: "active" })} />
      );
      expect(screen.getByText("active")).toBeInTheDocument();
      expect(screen.queryByText("merged")).toBeNull();
    });

    it("branchStatus=merged の非メイン worktree は merged バッジを表示する", () => {
      render(
        <WorktreeCard {...defaultProps} worktree={mockSubWorktree({ branchStatus: "merged" })} />
      );
      expect(screen.getByText("merged")).toBeInTheDocument();
      expect(screen.queryByText("active")).toBeNull();
    });

    it("branchStatus=idle の非メイン worktree はバッジを表示しない", () => {
      render(
        <WorktreeCard {...defaultProps} worktree={mockSubWorktree({ branchStatus: "idle" })} />
      );
      expect(screen.queryByText("active")).toBeNull();
      expect(screen.queryByText("merged")).toBeNull();
      expect(screen.queryByText("idle")).toBeNull();
    });
  });

  describe("ahead/behind 表示（Issue #8）", () => {
    it("upstream 未設定（ahead/behind が null）なら ahead/behind 行を表示しない", () => {
      render(
        <WorktreeCard {...defaultProps} worktree={mockWorktree({ ahead: null, behind: null })} />
      );
      // tooltip 要素もないことで行自体が描画されていないことを確認
      expect(screen.queryByTitle(/upstream から/)).toBeNull();
    });

    it("ahead=3, behind=2 のとき数字と矢印アイコンが表示される", () => {
      render(
        <WorktreeCard {...defaultProps} worktree={mockSubWorktree({ ahead: 3, behind: 2 })} />
      );
      const row = screen.getByTitle("upstream から 3 先行 / 2 遅れ");
      expect(row).toBeInTheDocument();
      expect(row).toHaveTextContent("3");
      expect(row).toHaveTextContent("2");
    });

    it("(0, 0) は行を表示しつつ muted スタイルになる（同期済み）", () => {
      render(
        <WorktreeCard {...defaultProps} worktree={mockSubWorktree({ ahead: 0, behind: 0 })} />
      );
      const row = screen.getByTitle("upstream から 0 先行 / 0 遅れ");
      expect(row).toBeInTheDocument();
      expect(row.className).toContain("text-fg-muted");
      expect(row.className).not.toContain("text-accent-blue");
    });

    it("divergent (ahead>0 or behind>0) は accent-blue で強調される", () => {
      render(
        <WorktreeCard {...defaultProps} worktree={mockSubWorktree({ ahead: 5, behind: 0 })} />
      );
      const row = screen.getByTitle("upstream から 5 先行 / 0 遅れ");
      expect(row.className).toContain("text-accent-blue");
    });
  });

  describe("Remove ボタン", () => {
    it("main worktree では Remove ボタンが表示されない", () => {
      render(<WorktreeCard {...defaultProps} worktree={mockWorktree({ isMain: true })} />);
      expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
    });

    it("non-main worktree では Remove ボタンが表示される", () => {
      render(<WorktreeCard {...defaultProps} worktree={mockSubWorktree()} />);
      expect(screen.getByRole("button", { name: /Remove/ })).toBeInTheDocument();
    });
  });
});

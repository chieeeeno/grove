import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorktreeCard from "./WorktreeCard";
import { mockWorktree, mockSubWorktree } from "../test/fixtures";

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

  describe("マージ状態バッジ", () => {
    it("メイン worktree は常に primary バッジを表示する", () => {
      render(<WorktreeCard {...defaultProps} worktree={mockWorktree({ isMain: true })} />);
      expect(screen.getByText("primary")).toBeInTheDocument();
      expect(screen.queryByText("merged")).toBeNull();
    });

    it("isMerged=true の非メイン worktree は merged バッジを表示する", () => {
      render(<WorktreeCard {...defaultProps} worktree={mockSubWorktree({ isMerged: true })} />);
      expect(screen.getByText("merged")).toBeInTheDocument();
      expect(screen.queryByText("idle")).toBeNull();
    });

    it("isMerged=false の非メイン worktree は idle バッジを表示する", () => {
      render(<WorktreeCard {...defaultProps} worktree={mockSubWorktree({ isMerged: false })} />);
      expect(screen.getByText("idle")).toBeInTheDocument();
      expect(screen.queryByText("merged")).toBeNull();
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

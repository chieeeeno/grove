import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeleteDialog from "./DeleteDialog";
import { createKeyboardEvent } from "../test/keyboardEvent";

describe("DeleteDialog", () => {
  const defaultProps = {
    worktreeName: "feature-abc",
    worktreePath: "/path/to/repo/feature-abc",
    branch: "feature/abc",
    hasUncommitted: false,
    modifiedCount: 0,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it("worktree 名とパスを表示する", () => {
    render(<DeleteDialog {...defaultProps} />);
    expect(screen.getByText("feature-abc")).toBeInTheDocument();
    expect(screen.getByText("/path/to/repo/feature-abc")).toBeInTheDocument();
  });

  it("未コミット変更がある場合に警告バナーが表示される", () => {
    render(<DeleteDialog {...defaultProps} hasUncommitted={true} modifiedCount={3} />);
    expect(screen.getByText(/未コミットの変更が 3 件あります/)).toBeInTheDocument();
  });

  describe("ブランチ削除チェックボックス", () => {
    it("ラベルテキスト「ブランチも一緒に削除する」のクリックでチェック状態がトグルされる", async () => {
      const user = userEvent.setup();
      render(<DeleteDialog {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();

      await user.click(screen.getByText("ブランチも一緒に削除する"));
      expect(checkbox).toBeChecked();

      await user.click(screen.getByText("ブランチも一緒に削除する"));
      expect(checkbox).not.toBeChecked();
    });

    it("ブランチ名テキストのクリックでもチェック状態がトグルされる", async () => {
      const user = userEvent.setup();
      render(<DeleteDialog {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();

      await user.click(screen.getByText("feature/abc"));
      expect(checkbox).toBeChecked();
    });

    it("削除ボタン押下で deleteBranch の値が onConfirm に渡る", async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup();
      render(<DeleteDialog {...defaultProps} onConfirm={onConfirm} />);

      await user.click(screen.getByText("ブランチも一緒に削除する"));
      await user.click(screen.getByRole("button", { name: /削除/ }));

      expect(onConfirm).toHaveBeenCalledWith(true);
    });
  });

  it("worktree 名横のフォルダアイコンが shrink-0 を持つ", () => {
    render(<DeleteDialog {...defaultProps} />);
    // 名前テキストが長くてもアイコンが縮まないよう shrink-0 を付与している (issue #66)
    const nameRow = screen.getByText("feature-abc").parentElement;
    const icon = nameRow?.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveClass("shrink-0");
  });

  it("背景オーバーレイクリックで onCancel が呼ばれる", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<DeleteDialog {...defaultProps} onCancel={onCancel} />);

    const overlay = container.firstElementChild as HTMLElement;
    await user.click(overlay);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  describe("Esc キーで閉じる", () => {
    it("Esc キーで onCancel が呼ばれる", async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup();
      render(<DeleteDialog {...defaultProps} onCancel={onCancel} />);

      await user.keyboard("{Escape}");

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("IME 変換中の Esc では onCancel が呼ばれない", () => {
      const onCancel = vi.fn();
      render(<DeleteDialog {...defaultProps} onCancel={onCancel} />);

      document.dispatchEvent(createKeyboardEvent("keydown", { key: "Escape", isComposing: true }));

      expect(onCancel).not.toHaveBeenCalled();
    });

    it("アンマウント後の Esc では onCancel が呼ばれない", () => {
      const onCancel = vi.fn();
      const { unmount } = render(<DeleteDialog {...defaultProps} onCancel={onCancel} />);

      unmount();

      document.dispatchEvent(createKeyboardEvent("keydown", { key: "Escape" }));

      expect(onCancel).not.toHaveBeenCalled();
    });
  });
});

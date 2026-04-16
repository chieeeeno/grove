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

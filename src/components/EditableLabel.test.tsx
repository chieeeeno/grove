import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditableLabel from "./EditableLabel";

describe("EditableLabel", () => {
  const defaultProps = {
    label: "test-worktree",
    branch: "feature/test",
    isMain: false,
    onSave: vi.fn(),
  };

  describe("Idle モード", () => {
    it("ラベルとブランチ名を表示する", () => {
      render(<EditableLabel {...defaultProps} />);
      expect(screen.getByText("test-worktree")).toBeInTheDocument();
      expect(screen.getByText("feature/test")).toBeInTheDocument();
    });

    it("鉛筆アイコンボタンが表示される", () => {
      render(<EditableLabel {...defaultProps} />);
      expect(screen.getByTitle("ラベルを編集")).toBeInTheDocument();
    });

    it("main worktree の場合は鉛筆アイコンが表示されない", () => {
      render(<EditableLabel {...defaultProps} isMain={true} />);
      expect(screen.queryByTitle("ラベルを編集")).not.toBeInTheDocument();
    });
  });

  describe("Editing モード", () => {
    it("鉛筆アイコンをクリックすると編集モードになる", async () => {
      const user = userEvent.setup();
      render(<EditableLabel {...defaultProps} />);

      await user.click(screen.getByTitle("ラベルを編集"));

      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByTitle("確定 (Cmd+Enter)")).toBeInTheDocument();
      expect(screen.getByTitle("キャンセル (Esc)")).toBeInTheDocument();
    });

    it("確定ボタンで onSave が呼ばれる", async () => {
      const onSave = vi.fn();
      const user = userEvent.setup();
      render(<EditableLabel {...defaultProps} onSave={onSave} />);

      await user.click(screen.getByTitle("ラベルを編集"));
      await user.clear(screen.getByRole("textbox"));
      await user.type(screen.getByRole("textbox"), "新しいラベル");
      await user.click(screen.getByTitle("確定 (Cmd+Enter)"));

      expect(onSave).toHaveBeenCalledWith("新しいラベル");
    });

    it("キャンセルボタンで編集モードを抜ける", async () => {
      const user = userEvent.setup();
      render(<EditableLabel {...defaultProps} />);

      await user.click(screen.getByTitle("ラベルを編集"));
      await user.click(screen.getByTitle("キャンセル (Esc)"));

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("test-worktree")).toBeInTheDocument();
    });

    it("Esc キーでキャンセルできる", async () => {
      const user = userEvent.setup();
      render(<EditableLabel {...defaultProps} />);

      await user.click(screen.getByTitle("ラベルを編集"));
      await user.keyboard("{Escape}");

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("Enter 単独では確定しない（ADR-0008）", async () => {
      const onSave = vi.fn();
      const user = userEvent.setup();
      render(<EditableLabel {...defaultProps} onSave={onSave} />);

      await user.click(screen.getByTitle("ラベルを編集"));
      await user.keyboard("{Enter}");

      // Enter だけでは onSave が呼ばれず、まだ編集中
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("空文字では確定できない", async () => {
      const onSave = vi.fn();
      const user = userEvent.setup();
      render(<EditableLabel {...defaultProps} onSave={onSave} />);

      await user.click(screen.getByTitle("ラベルを編集"));
      await user.clear(screen.getByRole("textbox"));
      await user.click(screen.getByTitle("確定 (Cmd+Enter)"));

      expect(onSave).not.toHaveBeenCalled();
    });
  });
});

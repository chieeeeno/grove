import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorktreeCard from "./WorktreeCard";
import { mockWorktree, mockSubWorktree } from "../test/fixtures";
import { useAppStore } from "../stores/appStore";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import * as toastModule from "../lib/toast";

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  writeText: vi.fn(),
}));

const noop = vi.fn();

const defaultProps = {
  label: "test-label",
  editorAvailable: true,
  terminalAvailable: true,
  onOpenInEditor: noop,
  onOpenInTerminal: noop,
  onRemove: noop,
  onSaveLabel: noop,
};

describe("WorktreeCard", () => {
  beforeEach(() => {
    useAppStore.setState({
      installedEditors: [
        { id: "vscode", name: "VS Code", path: "/Applications/Visual Studio Code.app" },
      ],
      selectedEditor: "vscode",
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

  describe("エディタボタン", () => {
    it("editorAvailable=true のときエディタボタンが有効", () => {
      render(<WorktreeCard {...defaultProps} worktree={mockWorktree()} editorAvailable={true} />);
      const btn = screen.getByRole("button", { name: /VS Code/ });
      expect(btn).not.toBeDisabled();
    });

    it("editorAvailable=false のときエディタボタンが無効化され、ツールチップで理由が示される", () => {
      render(<WorktreeCard {...defaultProps} worktree={mockWorktree()} editorAvailable={false} />);
      const btn = screen.getByRole("button", { name: /VS Code/ });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("title", "VS Code が見つかりません");
    });

    it("選択中のエディタ名がボタンラベルに表示される（Zed）", () => {
      useAppStore.setState({
        installedEditors: [
          { id: "vscode", name: "VS Code", path: "/Applications/Visual Studio Code.app" },
          { id: "zed", name: "Zed", path: "/Applications/Zed.app" },
        ],
        selectedEditor: "zed",
      });
      render(<WorktreeCard {...defaultProps} worktree={mockWorktree()} />);
      const btn = screen.getByRole("button", { name: /Zed/ });
      expect(btn).toBeInTheDocument();
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

  describe("ahead/behind 表示", () => {
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

  describe("Copy ボタン", () => {
    let toastSuccessSpy: ReturnType<typeof vi.spyOn>;
    let toastErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      vi.mocked(writeText).mockReset();
      vi.mocked(writeText).mockResolvedValue();
      toastSuccessSpy = vi.spyOn(toastModule, "toastSuccess").mockImplementation(() => {});
      toastErrorSpy = vi.spyOn(toastModule, "toastError").mockImplementation(() => {});
    });

    afterEach(() => {
      toastSuccessSpy.mockRestore();
      toastErrorSpy.mockRestore();
    });

    it("main worktree でも Copy ボタンが表示される", () => {
      render(<WorktreeCard {...defaultProps} worktree={mockWorktree({ isMain: true })} />);
      expect(screen.getByRole("button", { name: "パスをコピー" })).toBeInTheDocument();
    });

    it("non-main worktree でも Copy ボタンが表示される", () => {
      render(<WorktreeCard {...defaultProps} worktree={mockSubWorktree()} />);
      expect(screen.getByRole("button", { name: "パスをコピー" })).toBeInTheDocument();
    });

    it("クリックで writeText に worktree.path が渡され、toastSuccess が発火する", async () => {
      const wt = mockSubWorktree({ path: "/repo/feature-x" });
      render(<WorktreeCard {...defaultProps} worktree={wt} />);
      const btn = screen.getByRole("button", { name: "パスをコピー" });

      await userEvent.click(btn);

      expect(writeText).toHaveBeenCalledWith("/repo/feature-x");
      expect(toastSuccessSpy).toHaveBeenCalledWith("パスをコピーしました");
      expect(toastErrorSpy).not.toHaveBeenCalled();
    });

    it("コピー成功直後は title が「コピーしました」になり、1.5 秒後に「パスをコピー」に戻る", async () => {
      vi.useFakeTimers();
      try {
        render(<WorktreeCard {...defaultProps} worktree={mockSubWorktree()} />);
        const btn = screen.getByRole("button", { name: "パスをコピー" });

        await act(async () => {
          fireEvent.click(btn);
        });

        expect(btn).toHaveAttribute("title", "コピーしました");

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1500);
        });

        expect(btn).toHaveAttribute("title", "パスをコピー");
      } finally {
        vi.useRealTimers();
      }
    });

    it("連打しても最新クリックを起点に 1.5 秒のフィードバックが維持される", async () => {
      vi.useFakeTimers();
      try {
        render(<WorktreeCard {...defaultProps} worktree={mockSubWorktree()} />);
        const btn = screen.getByRole("button", { name: "パスをコピー" });

        await act(async () => {
          fireEvent.click(btn);
        });

        // 1 秒進めた直後にもう一度クリック → タイマーがリセットされるはず
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        await act(async () => {
          fireEvent.click(btn);
        });

        // 最初のクリックから 1.5 秒（= 1 秒 + 500 ms）経過しても、まだ「コピーしました」のまま
        await act(async () => {
          await vi.advanceTimersByTimeAsync(500);
        });
        expect(btn).toHaveAttribute("title", "コピーしました");

        // 2 回目のクリックから 1.5 秒経過後に元に戻る
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        expect(btn).toHaveAttribute("title", "パスをコピー");
      } finally {
        vi.useRealTimers();
      }
    });

    it("writeText が失敗したら toastError を出し、title は元のまま", async () => {
      vi.mocked(writeText).mockRejectedValueOnce(new Error("permission denied"));
      render(<WorktreeCard {...defaultProps} worktree={mockSubWorktree()} />);
      const btn = screen.getByRole("button", { name: "パスをコピー" });

      await act(async () => {
        fireEvent.click(btn);
      });

      expect(toastErrorSpy).toHaveBeenCalledWith("パスのコピーに失敗しました");
      expect(toastSuccessSpy).not.toHaveBeenCalled();
      expect(btn).toHaveAttribute("title", "パスをコピー");
    });

    it("writeText pending 中の再クリックは無視され、writeText / toastSuccess は 1 回ずつしか呼ばれない", async () => {
      let resolveWrite: (() => void) | undefined;
      vi.mocked(writeText).mockReset();
      vi.mocked(writeText).mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveWrite = resolve;
          })
      );

      render(<WorktreeCard {...defaultProps} worktree={mockSubWorktree({ path: "/repo/x" })} />);
      const btn = screen.getByRole("button", { name: "パスをコピー" });

      // 1 回目: writeText 走行開始（pending のまま）
      await act(async () => {
        fireEvent.click(btn);
      });
      // 2 回目: pending 中の再クリックは破棄される
      await act(async () => {
        fireEvent.click(btn);
      });

      expect(writeText).toHaveBeenCalledTimes(1);
      expect(writeText).toHaveBeenCalledWith("/repo/x");

      // pending を解決して後処理を流す
      await act(async () => {
        resolveWrite?.();
      });

      expect(toastSuccessSpy).toHaveBeenCalledTimes(1);
    });

    it("writeText pending 中に unmount されても setIsCopied / toastSuccess は呼ばれない", async () => {
      let resolveWrite: (() => void) | undefined;
      vi.mocked(writeText).mockReset();
      vi.mocked(writeText).mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveWrite = resolve;
          })
      );

      const { unmount } = render(<WorktreeCard {...defaultProps} worktree={mockSubWorktree()} />);
      const btn = screen.getByRole("button", { name: "パスをコピー" });

      await act(async () => {
        fireEvent.click(btn);
      });

      // unmount → 続けて writeText を resolve
      unmount();
      await act(async () => {
        resolveWrite?.();
      });

      expect(toastSuccessSpy).not.toHaveBeenCalled();
    });
  });
});

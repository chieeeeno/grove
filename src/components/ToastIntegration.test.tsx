import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster, toast } from "sonner";
import { toastRetryableError, toastError } from "../lib/toast";

function TestWrapper({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" duration={2500} />
    </>
  );
}

// jsdom に setPointerCapture / releasePointerCapture がないため、
// Sonner 内部の onPointerDown ハンドラがクラッシュする問題を回避
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

describe("Toast 通知", () => {
  afterEach(() => {
    toast.dismiss();
  });

  it("toast.success でメッセージが表示される", async () => {
    render(<TestWrapper />);

    act(() => {
      toast.success("リポジトリを追加しました");
    });

    expect(await screen.findByText("リポジトリを追加しました")).toBeInTheDocument();
  });

  it("toast.error でエラーメッセージが表示される", async () => {
    render(<TestWrapper />);

    act(() => {
      toast.error("worktree の削除に失敗しました");
    });

    expect(await screen.findByText("worktree の削除に失敗しました")).toBeInTheDocument();
  });

  it("複数のトーストがスタック表示される", async () => {
    render(<TestWrapper />);

    act(() => {
      toast.success("ラベルを保存しました");
      toast.success("設定を保存しました");
    });

    expect(await screen.findByText("ラベルを保存しました")).toBeInTheDocument();
    expect(await screen.findByText("設定を保存しました")).toBeInTheDocument();
  });

  it("toastError でエラーメッセージが表示される", async () => {
    render(<TestWrapper />);

    act(() => {
      toastError("並び替えの保存に失敗しました");
    });

    expect(await screen.findByText("並び替えの保存に失敗しました")).toBeInTheDocument();
  });

  it("toastRetryableError で再試行ボタン付きエラーが表示される", async () => {
    render(<TestWrapper />);

    act(() => {
      toastRetryableError("VS Code の起動に失敗しました", vi.fn());
    });

    expect(await screen.findByText("VS Code の起動に失敗しました")).toBeInTheDocument();
    expect(await screen.findByText("再試行")).toBeInTheDocument();
  });

  it("再試行ボタンをクリックするとコールバックが呼ばれる", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<TestWrapper />);

    act(() => {
      toastRetryableError("エラーが発生しました", onRetry);
    });

    const retryButton = await screen.findByText("再試行");
    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledOnce();
  });
});

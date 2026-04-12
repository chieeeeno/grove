import { describe, it, expect, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Toaster, toast } from "sonner";

function TestWrapper({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" duration={2500} />
    </>
  );
}

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
});

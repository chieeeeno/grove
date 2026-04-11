import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PreflightBanner from "./PreflightBanner";
describe("PreflightBanner", () => {
  it("visible=true のとき警告バナーを表示する", () => {
    render(<PreflightBanner visible={true} />);
    expect(screen.getByText(/code コマンドが見つかりません/)).toBeInTheDocument();
  });

  it("visible=false のとき表示しない", () => {
    render(<PreflightBanner visible={false} />);
    expect(screen.queryByText(/code コマンドが見つかりません/)).not.toBeInTheDocument();
  });

  it("× ボタンで非表示にできる", async () => {
    const user = userEvent.setup();
    render(<PreflightBanner visible={true} />);

    await user.click(screen.getByTitle("閉じる"));

    expect(screen.queryByText(/code コマンドが見つかりません/)).not.toBeInTheDocument();
  });

  it("dismiss 後に visible が false→true と切り替わったら再表示する", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PreflightBanner visible={true} />);

    // 一度閉じる
    await user.click(screen.getByTitle("閉じる"));
    expect(screen.queryByText(/code コマンドが見つかりません/)).not.toBeInTheDocument();

    // 問題が一旦解消
    rerender(<PreflightBanner visible={false} />);
    // 問題が再発
    rerender(<PreflightBanner visible={true} />);

    expect(screen.getByText(/code コマンドが見つかりません/)).toBeInTheDocument();
  });
});

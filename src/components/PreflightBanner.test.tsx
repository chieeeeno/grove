import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PreflightBanner from "./PreflightBanner";

const defaultProps = {
  codeUnavailable: false,
  terminalUnavailable: false,
};

describe("PreflightBanner", () => {
  it("codeUnavailable=true のとき code 警告バナーを表示する", () => {
    render(<PreflightBanner {...defaultProps} codeUnavailable={true} />);
    expect(screen.getByText(/code コマンドが見つかりません/)).toBeInTheDocument();
  });

  it("terminalUnavailable=true のとき Terminal 警告バナーを表示する", () => {
    render(<PreflightBanner {...defaultProps} terminalUnavailable={true} />);
    expect(screen.getByText(/対応するターミナルアプリが見つかりません/)).toBeInTheDocument();
  });

  it("両方 unavailable のとき 2 つのバナーを表示する", () => {
    render(<PreflightBanner codeUnavailable={true} terminalUnavailable={true} />);
    expect(screen.getByText(/code コマンドが見つかりません/)).toBeInTheDocument();
    expect(screen.getByText(/対応するターミナルアプリが見つかりません/)).toBeInTheDocument();
  });

  it("両方 available のとき何も表示しない", () => {
    render(<PreflightBanner {...defaultProps} />);
    expect(screen.queryByText(/code コマンドが見つかりません/)).not.toBeInTheDocument();
    expect(screen.queryByText(/対応するターミナルアプリが見つかりません/)).not.toBeInTheDocument();
  });

  it("× ボタンで個別にバナーを非表示にできる", async () => {
    const user = userEvent.setup();
    render(<PreflightBanner codeUnavailable={true} terminalUnavailable={true} />);

    const closeButtons = screen.getAllByTitle("閉じる");
    // 最初のバナー（code）を閉じる
    await user.click(closeButtons[0]);

    expect(screen.queryByText(/code コマンドが見つかりません/)).not.toBeInTheDocument();
    expect(screen.getByText(/対応するターミナルアプリが見つかりません/)).toBeInTheDocument();
  });

  it("dismiss 後に問題が解消→再発したら再表示する", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PreflightBanner {...defaultProps} codeUnavailable={true} />);

    // 一度閉じる
    await user.click(screen.getByTitle("閉じる"));
    expect(screen.queryByText(/code コマンドが見つかりません/)).not.toBeInTheDocument();

    // 問題が一旦解消
    rerender(<PreflightBanner {...defaultProps} codeUnavailable={false} />);
    // 問題が再発
    rerender(<PreflightBanner {...defaultProps} codeUnavailable={true} />);

    expect(screen.getByText(/code コマンドが見つかりません/)).toBeInTheDocument();
  });
});

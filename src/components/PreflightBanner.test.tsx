import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PreflightBanner from "./PreflightBanner";
import { useAppStore } from "../stores/appStore";

const defaultProps = {
  editorUnavailable: false,
  terminalUnavailable: false,
};

describe("PreflightBanner", () => {
  beforeEach(() => {
    useAppStore.setState({
      installedEditors: [
        { id: "vscode", name: "VS Code", path: "/Applications/Visual Studio Code.app" },
      ],
      selectedEditor: "vscode",
    });
  });

  it("editorUnavailable=true のとき選択中エディタ名を含む警告バナーを表示する", () => {
    render(<PreflightBanner {...defaultProps} editorUnavailable={true} />);
    expect(screen.getByText(/VS Code が見つかりません/)).toBeInTheDocument();
  });

  it("terminalUnavailable=true のとき Terminal 警告バナーを表示する", () => {
    render(<PreflightBanner {...defaultProps} terminalUnavailable={true} />);
    expect(screen.getByText(/対応するターミナルアプリが見つかりません/)).toBeInTheDocument();
  });

  it("両方 unavailable のとき 2 つのバナーを表示する", () => {
    render(<PreflightBanner editorUnavailable={true} terminalUnavailable={true} />);
    expect(screen.getByText(/VS Code が見つかりません/)).toBeInTheDocument();
    expect(screen.getByText(/対応するターミナルアプリが見つかりません/)).toBeInTheDocument();
  });

  it("両方 available のとき何も表示しない", () => {
    render(<PreflightBanner {...defaultProps} />);
    expect(screen.queryByText(/VS Code が見つかりません/)).not.toBeInTheDocument();
    expect(screen.queryByText(/対応するターミナルアプリが見つかりません/)).not.toBeInTheDocument();
  });

  it("選択中エディタを切り替えるとバナーのメッセージも切り替わる", () => {
    useAppStore.setState({
      installedEditors: [{ id: "zed", name: "Zed", path: "/Applications/Zed.app" }],
      selectedEditor: "zed",
    });
    render(<PreflightBanner editorUnavailable={true} terminalUnavailable={false} />);
    expect(screen.getByText(/Zed が見つかりません/)).toBeInTheDocument();
  });

  it("× ボタンで個別にバナーを非表示にできる", async () => {
    const user = userEvent.setup();
    render(<PreflightBanner editorUnavailable={true} terminalUnavailable={true} />);

    const closeButtons = screen.getAllByTitle("閉じる");
    // 最初のバナー（editor）を閉じる
    await user.click(closeButtons[0]);

    expect(screen.queryByText(/VS Code が見つかりません/)).not.toBeInTheDocument();
    expect(screen.getByText(/対応するターミナルアプリが見つかりません/)).toBeInTheDocument();
  });

  it("dismiss 後に問題が解消→再発したら再表示する", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PreflightBanner {...defaultProps} editorUnavailable={true} />);

    // 一度閉じる
    await user.click(screen.getByTitle("閉じる"));
    expect(screen.queryByText(/VS Code が見つかりません/)).not.toBeInTheDocument();

    // 問題が一旦解消
    rerender(<PreflightBanner {...defaultProps} editorUnavailable={false} />);
    // 問題が再発
    rerender(<PreflightBanner {...defaultProps} editorUnavailable={true} />);

    expect(screen.getByText(/VS Code が見つかりません/)).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsDialog from "./SettingsDialog";

describe("SettingsDialog", () => {
  const defaultProps = {
    theme: "dark" as const,
    refreshInterval: 5000,
    onChangeRefreshInterval: vi.fn(),
    onClose: vi.fn(),
  };

  it("ダイアログが表示される", () => {
    render(<SettingsDialog {...defaultProps} />);
    expect(screen.getByText("設定")).toBeInTheDocument();
    expect(screen.getByText("テーマ")).toBeInTheDocument();
    expect(screen.getByText("エディタ")).toBeInTheDocument();
    expect(screen.getByText("自動更新")).toBeInTheDocument();
  });

  it("ダーク テーマがアクティブ状態で表示される", () => {
    render(<SettingsDialog {...defaultProps} theme="dark" />);
    // ダークボタンにアクティブスタイルが適用されている
    const darkLabel = screen.getByText("ダーク");
    expect(darkLabel.closest("div")).toHaveClass("bg-accent");
  });

  it("エディタは VS Code 固定で表示される", () => {
    render(<SettingsDialog {...defaultProps} />);
    expect(screen.getByText("Visual Studio Code")).toBeInTheDocument();
  });

  it("自動更新間隔を変更できる", async () => {
    const onChangeRefreshInterval = vi.fn();
    const user = userEvent.setup();
    render(<SettingsDialog {...defaultProps} onChangeRefreshInterval={onChangeRefreshInterval} />);

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "10000");

    expect(onChangeRefreshInterval).toHaveBeenCalledWith(10000);
  });

  it("× ボタンで onClose が呼ばれる", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<SettingsDialog {...defaultProps} onClose={onClose} />);

    // × ボタンをクリック
    const buttons = screen.getAllByRole("button");
    const closeBtn = buttons.find((btn) => btn.querySelector("svg"));
    if (closeBtn) await user.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("背景オーバーレイクリックで onClose が呼ばれる", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<SettingsDialog {...defaultProps} onClose={onClose} />);

    // 固定オーバーレイ（最初の fixed div）をクリック
    const overlay = container.firstElementChild as HTMLElement;
    await user.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

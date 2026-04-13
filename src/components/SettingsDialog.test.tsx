import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsDialog from "./SettingsDialog";

describe("SettingsDialog", () => {
  const defaultProps = {
    onChangeTheme: vi.fn(),
    refreshInterval: 5000,
    onChangeRefreshInterval: vi.fn(),
    onClose: vi.fn(),
  };

  it("ダイアログが表示される", () => {
    render(<SettingsDialog {...defaultProps} />);
    expect(screen.getByText("設定")).toBeInTheDocument();
    expect(screen.getByText("テーマ")).toBeInTheDocument();
    expect(screen.getByText("自動更新")).toBeInTheDocument();
  });

  it("テーマを変更できる", async () => {
    const onChangeTheme = vi.fn();
    const user = userEvent.setup();
    render(<SettingsDialog {...defaultProps} onChangeTheme={onChangeTheme} />);

    const selects = screen.getAllByRole("combobox");
    // テーマは最初のセレクトボックス
    await user.selectOptions(selects[0], "dark");

    expect(onChangeTheme).toHaveBeenCalledWith("dark");
  });

  it("自動更新間隔を変更できる", async () => {
    const onChangeRefreshInterval = vi.fn();
    const user = userEvent.setup();
    render(<SettingsDialog {...defaultProps} onChangeRefreshInterval={onChangeRefreshInterval} />);

    const selects = screen.getAllByRole("combobox");
    // 自動更新間隔は 2 番目のセレクトボックス
    await user.selectOptions(selects[1], "10000");

    expect(onChangeRefreshInterval).toHaveBeenCalledWith(10000);
  });

  it("× ボタンで onClose が呼ばれる", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<SettingsDialog {...defaultProps} onClose={onClose} />);

    const buttons = screen.getAllByRole("button");
    const closeBtn = buttons.find((btn) => btn.querySelector("svg"));
    if (closeBtn) await user.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("背景オーバーレイクリックで onClose が呼ばれる", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<SettingsDialog {...defaultProps} onClose={onClose} />);

    const overlay = container.firstElementChild as HTMLElement;
    await user.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

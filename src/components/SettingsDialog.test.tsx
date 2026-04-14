import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsDialog from "./SettingsDialog";
import { useAppStore } from "../stores/appStore";

describe("SettingsDialog", () => {
  const defaultProps = {
    onChangeTheme: vi.fn(),
    onChangeRefreshInterval: vi.fn(),
    onChangeTerminal: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    useAppStore.setState({
      installedTerminals: [],
      selectedTerminal: "",
    });
  });

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

  describe("ターミナル選択", () => {
    it("検出済みターミナルがある場合にドロップダウンが表示される", () => {
      useAppStore.setState({
        installedTerminals: [
          {
            id: "terminal",
            name: "Terminal.app",
            path: "/System/Applications/Utilities/Terminal.app",
          },
          { id: "ghostty", name: "Ghostty", path: "/Applications/Ghostty.app" },
        ],
        selectedTerminal: "terminal",
      });
      render(<SettingsDialog {...defaultProps} />);
      expect(screen.getByText("ターミナル")).toBeInTheDocument();
      expect(screen.getByText("Terminal.app")).toBeInTheDocument();
      expect(screen.getByText("Ghostty")).toBeInTheDocument();
    });

    it("検出済みターミナルが 0 件の場合はドロップダウンが表示されない", () => {
      render(<SettingsDialog {...defaultProps} />);
      expect(screen.queryByText("ターミナル")).not.toBeInTheDocument();
    });

    it("ターミナルを変更すると onChangeTerminal が呼ばれる", async () => {
      const onChangeTerminal = vi.fn();
      const user = userEvent.setup();
      useAppStore.setState({
        installedTerminals: [
          {
            id: "terminal",
            name: "Terminal.app",
            path: "/System/Applications/Utilities/Terminal.app",
          },
          { id: "ghostty", name: "Ghostty", path: "/Applications/Ghostty.app" },
        ],
        selectedTerminal: "terminal",
      });
      render(<SettingsDialog {...defaultProps} onChangeTerminal={onChangeTerminal} />);

      const selects = screen.getAllByRole("combobox");
      // ターミナルはテーマの次（2番目）
      await user.selectOptions(selects[1], "ghostty");

      expect(onChangeTerminal).toHaveBeenCalledWith("ghostty");
    });
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StatusHelpPopover from "./StatusHelpPopover";

describe("StatusHelpPopover", () => {
  it("初期状態ではポップオーバーが非表示", () => {
    render(<StatusHelpPopover />);
    expect(screen.queryByText("ステータスの説明")).toBeNull();
  });

  it("アイコンクリックでポップオーバーが表示される", async () => {
    render(<StatusHelpPopover />);
    await userEvent.click(screen.getByRole("button", { name: "ステータスの説明" }));
    expect(screen.getByText("ステータスの説明")).toBeInTheDocument();
  });

  it("ポップオーバー表示中に再クリックで閉じる", async () => {
    render(<StatusHelpPopover />);
    const btn = screen.getByRole("button", { name: "ステータスの説明" });
    await userEvent.click(btn);
    expect(screen.getByText("ステータスの説明")).toBeInTheDocument();

    await userEvent.click(btn);
    expect(screen.queryByText("primary")).toBeNull();
  });

  it("各ステータスの説明テキストが表示される", async () => {
    render(<StatusHelpPopover />);
    await userEvent.click(screen.getByRole("button", { name: "ステータスの説明" }));

    expect(screen.getByText("primary")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("merged")).toBeInTheDocument();
    expect(screen.getByText("バッジなし")).toBeInTheDocument();
    expect(screen.getByText("メインの worktree（リポジトリ本体）")).toBeInTheDocument();
    expect(screen.getByText("独自のコミットがあるブランチ")).toBeInTheDocument();
    expect(screen.getByText("メインブランチにマージ済み")).toBeInTheDocument();
    expect(screen.getByText("分岐直後でまだコミットなし")).toBeInTheDocument();
  });

  it("外側クリックでポップオーバーが閉じる", async () => {
    render(
      <div>
        <StatusHelpPopover />
        <span data-testid="outside">outside</span>
      </div>
    );
    await userEvent.click(screen.getByRole("button", { name: "ステータスの説明" }));
    expect(screen.getByText("primary")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("outside"));
    expect(screen.queryByText("primary")).toBeNull();
  });
});

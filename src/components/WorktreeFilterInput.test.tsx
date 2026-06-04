import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorktreeFilterInput from "./WorktreeFilterInput";
import { useAppStore } from "../stores/appStore";
import { createKeyboardEvent } from "../test/keyboardEvent";

describe("WorktreeFilterInput", () => {
  beforeEach(() => {
    useAppStore.setState({ worktreeFilter: "" });
  });

  it("入力すると store のクエリが更新される（ライブ絞り込み）", async () => {
    const user = userEvent.setup();
    render(<WorktreeFilterInput matchCount={0} totalCount={3} />);

    await user.type(screen.getByPlaceholderText("絞り込み…"), "feat");

    expect(useAppStore.getState().worktreeFilter).toBe("feat");
  });

  it("Escape でクエリがクリアされ、入力欄が blur される", async () => {
    const user = userEvent.setup();
    render(<WorktreeFilterInput matchCount={0} totalCount={3} />);
    const input = screen.getByPlaceholderText("絞り込み…");

    await user.type(input, "feat");
    expect(input).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(useAppStore.getState().worktreeFilter).toBe("");
    expect(input).not.toHaveFocus();
  });

  it("Enter 単独では確定動作が起きない（クエリ・フォーカスを維持）", async () => {
    const user = userEvent.setup();
    render(<WorktreeFilterInput matchCount={1} totalCount={3} />);
    const input = screen.getByPlaceholderText("絞り込み…");

    await user.type(input, "feat");
    await user.keyboard("{Enter}");

    expect(useAppStore.getState().worktreeFilter).toBe("feat");
    expect(input).toHaveFocus();
  });

  it("Cmd+F で入力欄にフォーカスする", () => {
    render(<WorktreeFilterInput matchCount={0} totalCount={3} />);
    const input = screen.getByPlaceholderText("絞り込み…");
    expect(input).not.toHaveFocus();

    act(() => {
      window.dispatchEvent(createKeyboardEvent("keydown", { key: "f", metaKey: true }));
    });

    expect(input).toHaveFocus();
  });

  it("IME 変換中の Cmd+F はフォーカスしない", () => {
    render(<WorktreeFilterInput matchCount={0} totalCount={3} />);
    const input = screen.getByPlaceholderText("絞り込み…");

    act(() => {
      window.dispatchEvent(
        createKeyboardEvent("keydown", { key: "f", metaKey: true, isComposing: true })
      );
    });

    expect(input).not.toHaveFocus();
  });

  it("クエリが非空のとき一致件数（matchCount / totalCount）を表示する", () => {
    useAppStore.setState({ worktreeFilter: "feat" });
    render(<WorktreeFilterInput matchCount={3} totalCount={12} />);

    expect(screen.getByText("3 / 12")).toBeInTheDocument();
  });

  it("クエリが空のときは件数を表示しない", () => {
    render(<WorktreeFilterInput matchCount={3} totalCount={12} />);

    expect(screen.queryByText("3 / 12")).not.toBeInTheDocument();
  });
});

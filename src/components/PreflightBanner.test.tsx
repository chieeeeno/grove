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
});

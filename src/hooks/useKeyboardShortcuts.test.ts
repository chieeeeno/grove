import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  it("Cmd+R で onRefresh が呼ばれる", () => {
    const onRefresh = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onRefresh }));

    const event = new KeyboardEvent("keydown", {
      key: "r",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("R キー単体では onRefresh は呼ばれない", () => {
    const onRefresh = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onRefresh }));

    const event = new KeyboardEvent("keydown", {
      key: "r",
      metaKey: false,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("unmount 後はイベントリスナーが除去される", () => {
    const onRefresh = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onRefresh }));

    unmount();

    const event = new KeyboardEvent("keydown", {
      key: "r",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(onRefresh).not.toHaveBeenCalled();
  });
});

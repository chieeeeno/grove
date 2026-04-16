import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { createKeyboardEvent } from "../test/keyboardEvent";

describe("useKeyboardShortcuts", () => {
  const onSelectRepository = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Cmd+1〜Cmd+9", () => {
    it("Cmd+1 で onSelectRepository(0) が呼ばれる", () => {
      renderHook(() => useKeyboardShortcuts({ onSelectRepository }));

      window.dispatchEvent(createKeyboardEvent("keydown", { key: "1", metaKey: true }));

      expect(onSelectRepository).toHaveBeenCalledWith(0);
    });

    it("Cmd+9 で onSelectRepository(8) が呼ばれる", () => {
      renderHook(() => useKeyboardShortcuts({ onSelectRepository }));

      window.dispatchEvent(createKeyboardEvent("keydown", { key: "9", metaKey: true }));

      expect(onSelectRepository).toHaveBeenCalledWith(8);
    });

    it("Cmd+0 では呼ばれない（範囲外）", () => {
      renderHook(() => useKeyboardShortcuts({ onSelectRepository }));

      window.dispatchEvent(createKeyboardEvent("keydown", { key: "0", metaKey: true }));

      expect(onSelectRepository).not.toHaveBeenCalled();
    });

    it("Cmd なしの 1 キーでは呼ばれない", () => {
      renderHook(() => useKeyboardShortcuts({ onSelectRepository }));

      window.dispatchEvent(createKeyboardEvent("keydown", { key: "1" }));

      expect(onSelectRepository).not.toHaveBeenCalled();
    });

    it("Cmd+Shift+1 では呼ばれない（修飾キー過剰）", () => {
      renderHook(() => useKeyboardShortcuts({ onSelectRepository }));

      window.dispatchEvent(
        createKeyboardEvent("keydown", { key: "1", metaKey: true, shiftKey: true })
      );

      expect(onSelectRepository).not.toHaveBeenCalled();
    });

    it("IME 変換中の Cmd+1 では呼ばれない", () => {
      renderHook(() => useKeyboardShortcuts({ onSelectRepository }));

      window.dispatchEvent(
        createKeyboardEvent("keydown", { key: "1", metaKey: true, isComposing: true })
      );

      expect(onSelectRepository).not.toHaveBeenCalled();
    });

    it("Cmd+1 は preventDefault される", () => {
      renderHook(() => useKeyboardShortcuts({ onSelectRepository }));
      const event = createKeyboardEvent("keydown", { key: "1", metaKey: true, cancelable: true });

      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it("アンマウント後はショートカットが無効", () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts({ onSelectRepository }));

      unmount();
      window.dispatchEvent(createKeyboardEvent("keydown", { key: "1", metaKey: true }));

      expect(onSelectRepository).not.toHaveBeenCalled();
    });
  });

  describe("isMetaDown", () => {
    it("Cmd キー押下中は true、離したら false", () => {
      const { result } = renderHook(() => useKeyboardShortcuts({ onSelectRepository }));

      expect(result.current.isMetaDown).toBe(false);

      act(() => {
        window.dispatchEvent(createKeyboardEvent("keydown", { key: "Meta", metaKey: true }));
      });
      expect(result.current.isMetaDown).toBe(true);

      act(() => {
        window.dispatchEvent(createKeyboardEvent("keyup", { key: "Meta", metaKey: false }));
      });
      expect(result.current.isMetaDown).toBe(false);
    });

    it("window の blur で isMetaDown が false にリセットされる", () => {
      const { result } = renderHook(() => useKeyboardShortcuts({ onSelectRepository }));

      act(() => {
        window.dispatchEvent(createKeyboardEvent("keydown", { key: "Meta", metaKey: true }));
      });
      expect(result.current.isMetaDown).toBe(true);

      act(() => {
        window.dispatchEvent(new Event("blur"));
      });
      expect(result.current.isMetaDown).toBe(false);
    });
  });
});

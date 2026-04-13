import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppStore } from "../stores/appStore";
import { useTheme } from "./useTheme";

/** matchMedia のモック。addEventListener / removeEventListener を追跡する */
function createMatchMediaMock(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches,
    addEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
      listeners.push(handler);
    }),
    removeEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    }),
  };
  return {
    mql,
    listeners,
    mock: vi.fn().mockReturnValue(mql),
  };
}

describe("useTheme", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    // デフォルトでダークモードの matchMedia モックを設定（全テストで matchMedia が必要）
    const { mock } = createMatchMediaMock(true);
    window.matchMedia = mock;
    useAppStore.setState({ theme: "system" });
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    delete document.documentElement.dataset.theme;
  });

  it("theme=dark のとき resolvedTheme が dark になり data-theme が削除される", () => {
    useAppStore.setState({ theme: "dark" });
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe("dark");
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("theme=light のとき resolvedTheme が light になり data-theme=light が設定される", () => {
    useAppStore.setState({ theme: "light" });
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("theme=system で OS がダークのとき dark に解決される", () => {
    const { mock } = createMatchMediaMock(true);
    window.matchMedia = mock;

    useAppStore.setState({ theme: "system" });
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe("dark");
  });

  it("theme=system で OS がライトのとき light に解決される", () => {
    const { mock } = createMatchMediaMock(false);
    window.matchMedia = mock;

    useAppStore.setState({ theme: "system" });
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("theme=system で OS テーマが変わると追従する", () => {
    const { mock, listeners } = createMatchMediaMock(true);
    window.matchMedia = mock;

    useAppStore.setState({ theme: "system" });
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe("dark");

    // OS がライトに変化
    act(() => {
      listeners.forEach((fn) => fn({ matches: false } as MediaQueryListEvent));
    });

    expect(result.current).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("theme を dark → light に変更すると即座に反映される", () => {
    useAppStore.setState({ theme: "dark" });
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe("dark");

    act(() => {
      useAppStore.getState().setTheme("light");
    });

    expect(result.current).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("theme を system から dark に切り替えるとメディアクエリ監視が解除される", () => {
    const { mock, mql } = createMatchMediaMock(true);
    window.matchMedia = mock;

    useAppStore.setState({ theme: "system" });
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe("dark");
    expect(mql.addEventListener).toHaveBeenCalledTimes(1);

    act(() => {
      useAppStore.getState().setTheme("dark");
    });

    expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
  });
});

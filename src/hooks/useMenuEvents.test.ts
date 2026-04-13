import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMenuEvents } from "./useMenuEvents";

// listen が返す unlisten 関数
const mockUnlisten = vi.fn();

// listen のモック: イベント名→コールバックを記録し、unlisten を返す Promise を返す
type EventCallback = (...args: unknown[]) => void;
const listeners = new Map<string, EventCallback>();

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((event: string, callback: EventCallback) => {
    listeners.set(event, callback);
    return Promise.resolve(mockUnlisten);
  }),
}));

describe("useMenuEvents", () => {
  const onRefresh = vi.fn();
  const onOpenSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
  });

  it("menu-refresh イベントで onRefresh が呼ばれる", () => {
    renderHook(() => useMenuEvents({ onRefresh, onOpenSettings }));

    const callback = listeners.get("menu-refresh");
    expect(callback).toBeDefined();

    callback!();
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onOpenSettings).not.toHaveBeenCalled();
  });

  it("menu-settings イベントで onOpenSettings が呼ばれる", () => {
    renderHook(() => useMenuEvents({ onRefresh, onOpenSettings }));

    const callback = listeners.get("menu-settings");
    expect(callback).toBeDefined();

    callback!();
    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("アンマウント時に unlisten が呼ばれる", async () => {
    const { unmount } = renderHook(() => useMenuEvents({ onRefresh, onOpenSettings }));

    unmount();

    // useEffect のクリーンアップは Promise の then で unlisten を呼ぶため、
    // microtask を消化する必要がある
    await vi.waitFor(() => {
      // menu-refresh と menu-settings の 2 つ分
      expect(mockUnlisten).toHaveBeenCalledTimes(2);
    });
  });
});

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
  const onSelectRepository = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
  });

  it("menu-refresh イベントで onRefresh が呼ばれる", () => {
    renderHook(() => useMenuEvents({ onRefresh, onOpenSettings, onSelectRepository }));

    const callback = listeners.get("menu-refresh");
    expect(callback).toBeDefined();

    callback!();
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onOpenSettings).not.toHaveBeenCalled();
    expect(onSelectRepository).not.toHaveBeenCalled();
  });

  it("menu-settings イベントで onOpenSettings が呼ばれる", () => {
    renderHook(() => useMenuEvents({ onRefresh, onOpenSettings, onSelectRepository }));

    const callback = listeners.get("menu-settings");
    expect(callback).toBeDefined();

    callback!();
    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(onRefresh).not.toHaveBeenCalled();
    expect(onSelectRepository).not.toHaveBeenCalled();
  });

  it("menu-select-repository イベントで onSelectRepository が payload インデックス付きで呼ばれる", () => {
    renderHook(() => useMenuEvents({ onRefresh, onOpenSettings, onSelectRepository }));

    const callback = listeners.get("menu-select-repository");
    expect(callback).toBeDefined();

    // Tauri の `listen` コールバックは `Event<T>` を受け取り、payload にインデックスが入る
    callback!({ payload: 0 });
    expect(onSelectRepository).toHaveBeenNthCalledWith(1, 0);

    callback!({ payload: 5 });
    expect(onSelectRepository).toHaveBeenNthCalledWith(2, 5);

    expect(onRefresh).not.toHaveBeenCalled();
    expect(onOpenSettings).not.toHaveBeenCalled();
  });

  it("アンマウント時にすべての unlisten が呼ばれる", async () => {
    const { unmount } = renderHook(() =>
      useMenuEvents({ onRefresh, onOpenSettings, onSelectRepository })
    );

    unmount();

    // useEffect のクリーンアップは Promise の then で unlisten を呼ぶため、
    // microtask を消化する必要がある
    await vi.waitFor(() => {
      // menu-refresh / menu-settings / menu-select-repository の 3 つ分
      expect(mockUnlisten).toHaveBeenCalledTimes(3);
    });
  });
});

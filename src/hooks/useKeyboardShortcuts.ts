import { useEffect } from "react";

/**
 * `useKeyboardShortcuts` が受け取るハンドラのセット。
 */
interface ShortcutHandlers {
  /** Cmd+R が押された時に呼ばれる（ブラウザのリロードは抑制済み） */
  onRefresh: () => void;
}

/**
 * グローバルキーボードショートカットを `window.keydown` に登録する。
 *
 * 現在登録しているショートカット:
 * - **Cmd+R**: リフレッシュ（`onRefresh`）。ブラウザのリロードは `preventDefault` で抑制
 *
 * @param handlers 各ショートカットに対応するコールバック
 *
 * @remarks
 * 依存配列に `onRefresh` を入れているため、`onRefresh` の参照が毎レンダー変わると
 * keydown リスナーが毎回再登録される。親コンポーネント側で `useCallback` により
 * 参照を安定化させて渡すこと。
 */
export function useKeyboardShortcuts({ onRefresh }: ShortcutHandlers): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "r") {
        e.preventDefault();
        onRefresh();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onRefresh]);
}

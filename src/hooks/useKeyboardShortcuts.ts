import { useEffect } from "react";

interface ShortcutHandlers {
  onRefresh: () => void;
}

/**
 * グローバルキーボードショートカットの登録
 * - Cmd+R: リフレッシュ（ブラウザのリロードを防止）
 */
export function useKeyboardShortcuts({ onRefresh }: ShortcutHandlers) {
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

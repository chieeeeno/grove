import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

/**
 * `useMenuEvents` が受け取るハンドラのセット。
 */
interface MenuEventHandlers {
  /** メニュー「表示 > 再読み込み」（Cmd+R）が選択された時に呼ばれる */
  onRefresh: () => void;
  /** メニュー「Grove > 設定...」（Cmd+,）が選択された時に呼ばれる */
  onOpenSettings: () => void;
}

/**
 * Rust 側のメニューバーから emit されるイベントをリッスンし、
 * 対応するコールバックを呼び出す。
 *
 * リッスンするイベント:
 * - **menu-refresh**: 「再読み込み」メニュー項目 → `onRefresh`
 * - **menu-settings**: 「設定...」メニュー項目 → `onOpenSettings`
 *
 * @param handlers 各メニューイベントに対応するコールバック
 *
 * @remarks
 * `onRefresh` / `onOpenSettings` の参照が変わるたびにリスナーが再登録される。
 * 親コンポーネント側で `useCallback` により参照を安定化させて渡すこと。
 */
export function useMenuEvents({ onRefresh, onOpenSettings }: MenuEventHandlers): void {
  useEffect(() => {
    const unlistenRefresh = listen("menu-refresh", () => {
      onRefresh();
    });
    const unlistenSettings = listen("menu-settings", () => {
      onOpenSettings();
    });

    return () => {
      unlistenRefresh.then((f) => f());
      unlistenSettings.then((f) => f());
    };
  }, [onRefresh, onOpenSettings]);
}

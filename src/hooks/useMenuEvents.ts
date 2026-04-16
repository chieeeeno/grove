import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

/** Rust 側 `menu::EVENT_MENU_*` と一致させること */
const EVENT_MENU_REFRESH = "menu-refresh";
const EVENT_MENU_SETTINGS = "menu-settings";
const EVENT_MENU_SELECT_REPOSITORY = "menu-select-repository";

/**
 * `useMenuEvents` が受け取るハンドラのセット。
 */
interface MenuEventHandlers {
  /** メニュー「表示 > 再読み込み」（Cmd+R）が選択された時に呼ばれる */
  onRefresh: () => void;
  /** メニュー「Grove > 設定...」（Cmd+,）が選択された時に呼ばれる */
  onOpenSettings: () => void;
  /**
   * メニュー「リポジトリ > N 番目のリポジトリ」（Cmd+1〜Cmd+9）が選択された時に呼ばれる。
   *
   * @param index - 0-origin のリポジトリインデックス（Cmd+1 → 0, Cmd+9 → 8）。
   *                呼び出し側は `repositories` 配列の範囲外の場合に no-op 扱いすること。
   */
  onSelectRepository: (index: number) => void;
}

/**
 * Rust 側のメニューバーから emit されるイベントをリッスンし、
 * 対応するコールバックを呼び出す。
 *
 * リッスンするイベント:
 * - **menu-refresh**: 「再読み込み」メニュー項目 → `onRefresh`
 * - **menu-settings**: 「設定...」メニュー項目 → `onOpenSettings`
 * - **menu-select-repository**: 「リポジトリ > N 番目のリポジトリ」メニュー項目 →
 *   `onSelectRepository(index)`（`event.payload` に 0-origin インデックスが入る）
 *
 * @param handlers 各メニューイベントに対応するコールバック
 *
 * @remarks
 * ハンドラの参照が変わるたびにリスナーが再登録される。
 * 親コンポーネント側で `useCallback` により参照を安定化させて渡すこと。
 */
export function useMenuEvents({
  onRefresh,
  onOpenSettings,
  onSelectRepository,
}: MenuEventHandlers): void {
  useEffect(() => {
    let active = true;
    let unlistenRefresh: (() => void) | undefined;
    let unlistenSettings: (() => void) | undefined;
    let unlistenSelectRepository: (() => void) | undefined;

    Promise.all([
      listen(EVENT_MENU_REFRESH, () => onRefresh()),
      listen(EVENT_MENU_SETTINGS, () => onOpenSettings()),
      listen<number>(EVENT_MENU_SELECT_REPOSITORY, (event) => onSelectRepository(event.payload)),
    ]).then(([f1, f2, f3]) => {
      if (!active) {
        f1();
        f2();
        f3();
        return;
      }
      unlistenRefresh = f1;
      unlistenSettings = f2;
      unlistenSelectRepository = f3;
    });

    return () => {
      active = false;
      unlistenRefresh?.();
      unlistenSettings?.();
      unlistenSelectRepository?.();
    };
  }, [onRefresh, onOpenSettings, onSelectRepository]);
}

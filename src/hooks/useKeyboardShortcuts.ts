import { useEffect, useState } from "react";

/**
 * Cmd+1〜Cmd+9 で発動可能なリポジトリ最大数。
 * 10 個目以降はショートカットでは切り替えられない。
 */
export const KEYBOARD_SHORTCUT_MAX_REPOSITORY_INDEX = 9;

interface UseKeyboardShortcutsOptions {
  /**
   * Cmd+1〜Cmd+9 が押された時に呼ばれるコールバック。
   *
   * @param index - 0-origin のリポジトリインデックス（Cmd+1 → 0 … Cmd+9 → 8）。
   *                呼び出し側で `repositories` 配列の範囲外時を no-op として扱うこと。
   */
  onSelectRepository: (index: number) => void;
}

interface UseKeyboardShortcutsResult {
  /**
   * メタキー（macOS の Cmd、Windows/Linux の Ctrl）が現在押し下げられているか。
   * サイドバーなどで「ショートカット番号を一時的に表示する」UI に使う。
   */
  isMetaDown: boolean;
}

/**
 * グローバルなキーボードショートカットを登録するフック。
 *
 * 現在の担当:
 * - **Cmd+1〜Cmd+9**: `onSelectRepository(index)` を呼び出し（IME 変換中は除外）。
 *   OS 側に捕捉されないよう `preventDefault` する。
 * - **メタキー押下状態の追跡**: `isMetaDown` を返し、UI の一時表示切替に使わせる。
 *   `window.blur` で強制 false（Cmd+Tab でのウィンドウ離脱時に押しっぱなし状態が残るのを防ぐ）。
 *
 * @param options - ショートカットに紐づくコールバック
 * @returns `isMetaDown` を含む観測可能な状態
 *
 * @remarks
 * リスナーは `window` レベルで登録する。`onSelectRepository` の参照が変わると
 * リスナーが再登録されるため、親コンポーネント側で `useCallback` により
 * 参照を安定化させて渡すこと。
 */
export function useKeyboardShortcuts({
  onSelectRepository,
}: UseKeyboardShortcutsOptions): UseKeyboardShortcutsResult {
  const [isMetaDown, setIsMetaDown] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd キー押下状態の追跡（keydown は押しっぱなしで連続発火するが、同じ値への
      // setState は React が no-op 扱いするため連続発火してもコスト無し）
      if (e.metaKey) setIsMetaDown(true);

      // Cmd+1〜Cmd+9: リポジトリ切り替え
      // - IME 変換中は数字キーが候補選択に使われる可能性があるため除外
      // - 修飾キーは Cmd（metaKey）のみ許可（Cmd+Shift+1 などは別用途のため反応しない）
      if (
        e.metaKey &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.isComposing &&
        /^[1-9]$/.test(e.key)
      ) {
        e.preventDefault();
        onSelectRepository(Number(e.key) - 1);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Cmd キーが離された瞬間、e.metaKey は false になる（他のキーを離した時も同様）
      if (!e.metaKey) setIsMetaDown(false);
    };

    // Cmd+Tab などでウィンドウからフォーカスが外れた場合、keyup を受け取れないため
    // 押しっぱなし状態が残る。blur で明示的にリセットする。
    const handleBlur = () => setIsMetaDown(false);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [onSelectRepository]);

  return { isMetaDown };
}

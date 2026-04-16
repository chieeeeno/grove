import { useEffect, useState } from "react";

/**
 * Cmd+1〜Cmd+9 で切り替え可能なリポジトリ最大数（先頭 9 個）。
 * 10 個目以降はショートカットでは切り替えられない。
 */
export const REPOSITORY_SHORTCUT_COUNT = 9;

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
 * リスナーは `window` レベルで登録する（`blur` イベントが `window` 発火のため、
 * 同一ターゲットに揃えて管理を単純化している）。
 */
export function useKeyboardShortcuts({
  onSelectRepository,
}: UseKeyboardShortcutsOptions): UseKeyboardShortcutsResult {
  const [isMetaDown, setIsMetaDown] = useState(false);

  // Cmd+1〜Cmd+9 のハンドリング。`onSelectRepository` に依存するので deps に含める。
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey) setIsMetaDown(true);

      // IME 変換中は数字キーが候補選択に使われる可能性があるため除外。
      // 余分な修飾キー（Shift/Ctrl/Alt）を伴う場合は別用途のため反応しない。
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

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSelectRepository]);

  // isMetaDown のリセットは onSelectRepository と無関係。独立した effect にして、
  // 親からのコールバック参照変更で keyup/blur リスナーが再登録されないようにする。
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      // Cmd キーが離された瞬間 e.metaKey は false になる（他のキーを離した時も同様）
      if (!e.metaKey) setIsMetaDown(false);
    };
    // Cmd+Tab などでウィンドウのフォーカスが外れると keyup を受け取れないため、
    // blur で明示的にリセットして押しっぱなし状態が残らないようにする。
    const handleBlur = () => setIsMetaDown(false);

    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return { isMetaDown };
}

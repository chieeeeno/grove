import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useAppStore } from "../stores/appStore";

/**
 * `WorktreeFilterInput` の props。
 */
interface WorktreeFilterInputProps {
  /** クエリに一致した worktree 件数（絞り込み後の表示件数） */
  matchCount: number;
  /** 絞り込み対象の worktree 総数 */
  totalCount: number;
}

/**
 * worktree グリッドの絞り込み検索入力。
 *
 * クエリは store（`worktreeFilter`）と双方向に連動し、入力のたびにライブ絞り込みする。
 * `<input>` の ref を自身で所有し、キーボード操作をこのコンポーネント内で完結させる
 * （既存の `useKeyboardShortcuts` は変更しない）:
 * - **Cmd+F**: `window` の keydown を監視し、入力欄にフォーカス + 全選択する
 *   （`preventDefault` でブラウザ標準の検索を抑止。IME 変換中・他修飾キー併用時は無反応）
 * - **Esc**: クエリをクリアして入力欄を blur する
 * - **Enter**: 確定概念がないため意図的に no-op（Enter 単独確定を避ける UX 原則に整合）
 *
 * クエリが非空のときのみ一致件数（例: `3 / 12`）を控えめに表示する。
 *
 * @param props {@link WorktreeFilterInputProps}
 * @returns 検索入力欄（Search アイコン内包）と一致件数表示
 */
export default function WorktreeFilterInput({ matchCount, totalCount }: WorktreeFilterInputProps) {
  const worktreeFilter = useAppStore((s) => s.worktreeFilter);
  const setWorktreeFilter = useAppStore((s) => s.setWorktreeFilter);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+F で入力欄にフォーカス。window レベルで監視し、マウント中のみ有効。
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 余分な修飾キー併用・IME 変換中は別用途のため無反応にする
      if (e.metaKey && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.isComposing && e.key === "f") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /**
   * 入力欄のキー操作。
   * - Esc: クエリをクリアして blur
   *
   * Enter 単独は意図的にハンドリングしない（確定概念がないため no-op）。
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setWorktreeFilter("");
      inputRef.current?.blur();
    }
  };

  const hasQuery = worktreeFilter.trim() !== "";

  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-2.5 text-fg-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={worktreeFilter}
          onChange={(e) => setWorktreeFilter(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="絞り込み…"
          className="w-48 text-[13px] rounded-md pl-8 pr-2.5 py-1.5 outline-none bg-input text-fg border border-border focus:border-accent transition-colors duration-150"
        />
      </div>
      {hasQuery && (
        <span className="text-[11px] text-fg-muted shrink-0 tabular-nums">
          {`${matchCount} / ${totalCount}`}
        </span>
      )}
    </div>
  );
}

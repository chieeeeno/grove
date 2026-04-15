import { useCallback, useEffect, useRef, useState } from "react";
import { HelpCircle, ShieldCheck, GitBranch, GitMerge } from "lucide-react";

/**
 * ステータスバッジの意味を説明するポップオーバー。
 *
 * MainArea ヘッダーに設置し、クリックで吹き出しを開閉する。
 * 各バッジ（primary / active / merged / バッジなし）の意味を
 * 実際のバッジと同じ色・アイコンで表示する。
 */
export default function StatusHelpPopover() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  /** ポップオーバー外クリックで閉じる */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggle}
        className="flex items-center justify-center rounded-md p-2 border-0 outline-none cursor-pointer shrink-0 bg-card hover:bg-card-hover active:bg-accent transition-colors duration-150"
        title="ステータスの説明"
        aria-label="ステータスの説明"
      >
        <HelpCircle size={16} className="text-fg-secondary" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-popover shadow-lg z-50 p-4">
          <p className="text-[12px] font-semibold text-fg mb-3">ステータスの説明</p>
          <ul className="flex flex-col gap-2.5">
            <li className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold w-20 justify-center shrink-0 bg-[#34D39933] text-accent-green">
                <ShieldCheck size={12} />
                primary
              </span>
              <span className="text-[12px] text-fg-secondary">
                メインの worktree（リポジトリ本体）
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold w-20 justify-center shrink-0 bg-[#3B82F633] text-blue-400">
                <GitBranch size={12} />
                active
              </span>
              <span className="text-[12px] text-fg-secondary">独自のコミットがあるブランチ</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold w-20 justify-center shrink-0 bg-[#8B5CF633] text-purple-400">
                <GitMerge size={12} />
                merged
              </span>
              <span className="text-[12px] text-fg-secondary">メインブランチにマージ済み</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[10px] text-fg-muted w-20 text-center shrink-0">
                バッジなし
              </span>
              <span className="text-[12px] text-fg-secondary">分岐直後でまだコミットなし</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

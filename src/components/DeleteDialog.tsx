import { useEffect, useState } from "react";
import { TriangleAlert, CircleAlert, FolderGit2, Trash2 } from "lucide-react";

interface DeleteDialogProps {
  worktreeName: string;
  worktreePath: string;
  branch: string;
  hasUncommitted: boolean;
  modifiedCount: number;
  onConfirm: (deleteBranch: boolean) => void;
  onCancel: () => void;
}

export default function DeleteDialog({
  worktreeName,
  worktreePath,
  branch,
  hasUncommitted,
  modifiedCount,
  onConfirm,
  onCancel,
}: DeleteDialogProps) {
  const [deleteBranch, setDeleteBranch] = useState(false);

  /**
   * Esc キーでダイアログを閉じる（キャンセル扱い）。
   *
   * `document` レベルで listen することで内部要素（チェックボックスや削除ボタン）に
   * フォーカスがあっても反応する。IME 変換中（`isComposing`）は IME 側の挙動を
   * 優先して no-op にする。
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.isComposing) {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
      onClick={onCancel}
    >
      <div
        className="flex flex-col gap-5 rounded-xl p-6 bg-dialog border border-border"
        style={{ width: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg p-2 bg-accent-red/10">
            <TriangleAlert size={20} className="text-accent-red" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[16px] font-semibold text-fg">worktree を削除しますか？</span>
            <span className="text-[12px] text-fg-muted">この操作は元に戻せません</span>
          </div>
        </div>

        {/* 区切り線 */}
        <div className="h-px bg-border" />

        {/* worktree 情報 */}
        <div className="flex flex-col gap-2 rounded-lg px-4 py-3 bg-card">
          <div className="flex items-center gap-2">
            <FolderGit2 size={14} className="text-fg-muted" />
            <span className="text-[14px] font-medium text-fg">{worktreeName}</span>
          </div>
          <span className="text-[11px] text-fg-muted">{worktreePath}</span>
        </div>

        {/* 未コミット警告 */}
        {hasUncommitted && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 bg-accent-yellow/10">
            <CircleAlert size={16} className="text-accent-yellow shrink-0" />
            <span className="text-[12px] font-medium text-accent-yellow">
              未コミットの変更が {modifiedCount} 件あります
            </span>
          </div>
        )}

        {/* 区切り線 */}
        <div className="h-px bg-border" />

        {/* ブランチ削除チェックボックス */}
        <label className="flex items-center gap-2.5 cursor-pointer">
          <div
            className={`flex items-center justify-center rounded shrink-0 w-[18px] h-[18px] border-2 ${
              deleteBranch ? "bg-accent border-accent" : "bg-transparent border-border"
            }`}
            onClick={() => setDeleteBranch(!deleteBranch)}
          >
            {deleteBranch && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] text-fg">ブランチも一緒に削除する</span>
            <span className="text-[11px] text-fg-muted">{branch}</span>
          </div>
        </label>

        {/* アクション */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="flex items-center justify-center rounded-lg px-4 py-2 text-[13px] font-medium cursor-pointer border border-border outline-none bg-transparent text-fg-secondary"
          >
            キャンセル
          </button>
          <button
            onClick={() => onConfirm(deleteBranch)}
            className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium cursor-pointer border-0 outline-none bg-accent-red text-white"
          >
            <Trash2 size={14} />
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

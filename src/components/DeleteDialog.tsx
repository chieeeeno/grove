import { useState } from "react";
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

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onCancel}
    >
      <div
        className="flex flex-col gap-5 rounded-xl p-6"
        style={{
          width: 440,
          backgroundColor: "var(--bg-dialog)",
          border: "1px solid var(--border-default)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-lg p-2"
            style={{ backgroundColor: "#F8717118" }}
          >
            <TriangleAlert size={20} style={{ color: "var(--accent-red)" }} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>
              worktree を削除しますか？
            </span>
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              この操作は元に戻せません
            </span>
          </div>
        </div>

        {/* 区切り線 */}
        <div style={{ height: 1, backgroundColor: "var(--border-default)" }} />

        {/* worktree 情報 */}
        <div
          className="flex flex-col gap-2 rounded-lg px-4 py-3"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <div className="flex items-center gap-2">
            <FolderGit2 size={14} style={{ color: "var(--text-muted)" }} />
            <span className="text-[14px] font-medium" style={{ color: "var(--text-primary)" }}>
              {worktreeName}
            </span>
          </div>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {worktreePath}
          </span>
        </div>

        {/* 未コミット警告 */}
        {hasUncommitted && (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2.5"
            style={{ backgroundColor: "#FBBF2415" }}
          >
            <CircleAlert size={16} style={{ color: "var(--accent-yellow)", flexShrink: 0 }} />
            <span className="text-[12px] font-medium" style={{ color: "var(--accent-yellow)" }}>
              未コミットの変更が {modifiedCount} 件あります
            </span>
          </div>
        )}

        {/* 区切り線 */}
        <div style={{ height: 1, backgroundColor: "var(--border-default)" }} />

        {/* ブランチ削除チェックボックス */}
        <label className="flex items-center gap-2.5 cursor-pointer">
          <div
            className="flex items-center justify-center rounded shrink-0"
            style={{
              width: 18,
              height: 18,
              border: "2px solid var(--border-default)",
              backgroundColor: deleteBranch ? "var(--accent-primary)" : "transparent",
              borderColor: deleteBranch ? "var(--accent-primary)" : "var(--border-default)",
            }}
            onClick={() => setDeleteBranch(!deleteBranch)}
          >
            {deleteBranch && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>
              ブランチも一緒に削除する
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {branch}
            </span>
          </div>
        </label>

        {/* アクション */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="flex items-center justify-center rounded-lg px-4 py-2 text-[13px] font-medium cursor-pointer border outline-none"
            style={{
              backgroundColor: "transparent",
              borderColor: "var(--border-default)",
              color: "var(--text-secondary)",
            }}
          >
            キャンセル
          </button>
          <button
            onClick={() => onConfirm(deleteBranch)}
            className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium cursor-pointer border-0 outline-none"
            style={{ backgroundColor: "var(--accent-red)", color: "#FFFFFF" }}
          >
            <Trash2 size={14} />
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

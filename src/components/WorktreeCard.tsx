import { ShieldCheck, GitCommitHorizontal, FilePen, Code, Trash2 } from "lucide-react";
import type { WorktreeInfo } from "../types";
import { relativeTime } from "../lib/time";

interface WorktreeCardProps {
  worktree: WorktreeInfo;
  label: string;
  onOpenInEditor: () => void;
  onRemove: () => void;
}

export default function WorktreeCard({
  worktree,
  label,
  onOpenInEditor,
  onRemove,
}: WorktreeCardProps) {
  const hasChanges = worktree.modifiedCount > 0;
  const changesColor = hasChanges ? "var(--accent-yellow)" : "var(--text-muted)";

  return (
    <div
      className="flex flex-col gap-3 rounded-xl p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-default)",
      }}
    >
      {/* ヘッダー: ラベル + バッジ */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span
            className="text-[15px] font-semibold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {label}
          </span>
          <span className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
            {worktree.branch}
          </span>
        </div>
        {worktree.isMain ? (
          <span
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
            style={{ backgroundColor: "#34D39933", color: "var(--accent-green)" }}
          >
            <ShieldCheck size={12} />
            primary
          </span>
        ) : (
          <span
            className="flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
            style={{ backgroundColor: "#6B728033", color: "var(--accent-gray)" }}
          >
            idle
          </span>
        )}
      </div>

      {/* 区切り線 */}
      <div style={{ height: 1, backgroundColor: "var(--border-default)" }} />

      {/* コミット情報 + 変更ファイル数 */}
      <div className="flex flex-col gap-2">
        {/* 最終コミット */}
        <div className="flex items-center gap-1.5">
          <GitCommitHorizontal size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <span className="flex-1 text-[12px] truncate" style={{ color: "var(--text-secondary)" }}>
            {worktree.lastCommitMessage || "コミットなし"}
          </span>
          <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>
            {relativeTime(worktree.lastCommitTime)}
          </span>
        </div>

        {/* 変更ファイル数 */}
        <div className="flex items-center gap-1">
          <FilePen size={13} style={{ color: changesColor, flexShrink: 0 }} />
          <span className="text-[11px]" style={{ color: changesColor }}>
            {worktree.modifiedCount} changes
          </span>
        </div>
      </div>

      {/* アクション */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onOpenInEditor}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium cursor-pointer border-0 outline-none"
          style={{ backgroundColor: "var(--accent-primary)", color: "#FFFFFF" }}
        >
          <Code size={14} />
          VS Code
        </button>
        {!worktree.isMain && (
          <button
            onClick={onRemove}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium cursor-pointer border outline-none"
            style={{
              backgroundColor: "transparent",
              borderColor: "var(--border-default)",
              color: "var(--accent-red)",
            }}
          >
            <Trash2 size={14} />
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

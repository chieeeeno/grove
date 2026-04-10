import { useState } from "react";
import { ShieldCheck, GitCommitHorizontal, FilePen, Code, Trash2 } from "lucide-react";
import type { WorktreeInfo } from "../types";
import { relativeTime } from "../lib/time";
import EditableLabel from "./EditableLabel";

interface WorktreeCardProps {
  worktree: WorktreeInfo;
  label: string;
  codeAvailable: boolean;
  onOpenInEditor: () => void;
  onRemove: () => void;
  onSaveLabel: (newLabel: string) => void;
}

export default function WorktreeCard({
  worktree,
  label,
  codeAvailable,
  onOpenInEditor,
  onRemove,
  onSaveLabel,
}: WorktreeCardProps) {
  const [isLabelEditing, setIsLabelEditing] = useState(false);
  const hasChanges = worktree.modifiedCount > 0;

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl p-4 bg-card border transition-colors duration-150
        ${isLabelEditing ? "border-border" : "border-border hover:bg-card-hover hover:border-border-card-hover"}`}
    >
      {/* ヘッダー: ラベル + バッジ */}
      <div className="flex items-center justify-between gap-2">
        <EditableLabel
          label={label}
          branch={worktree.branch}
          isMain={worktree.isMain}
          onSave={onSaveLabel}
          onEditingChange={setIsLabelEditing}
        />
        {!isLabelEditing &&
          (worktree.isMain ? (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 bg-[#34D39933] text-accent-green">
              <ShieldCheck size={12} />
              primary
            </span>
          ) : (
            <span className="flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 bg-[#6B728033] text-accent-gray">
              idle
            </span>
          ))}
      </div>

      {/* 区切り線 */}
      <div className="h-px bg-border" />

      {/* コミット情報 + 変更ファイル数 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <GitCommitHorizontal size={14} className="text-fg-muted shrink-0" />
          <span className="flex-1 text-[12px] truncate text-fg-secondary">
            {worktree.lastCommitMessage || "コミットなし"}
          </span>
          <span className="text-[11px] shrink-0 text-fg-muted">
            {relativeTime(worktree.lastCommitTime)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <FilePen
            size={13}
            className={`shrink-0 ${hasChanges ? "text-accent-yellow" : "text-fg-muted"}`}
          />
          <span className={`text-[11px] ${hasChanges ? "text-accent-yellow" : "text-fg-muted"}`}>
            {worktree.modifiedCount} changes
          </span>
        </div>
      </div>

      {/* アクション */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={codeAvailable ? onOpenInEditor : undefined}
          disabled={!codeAvailable}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-white border-0 outline-none transition-colors duration-150
            ${codeAvailable ? "bg-accent hover:bg-vs-hover active:bg-vs-active cursor-pointer" : "bg-[#4F6EF740] cursor-not-allowed opacity-60"}`}
          title={codeAvailable ? undefined : "code コマンドが必要です"}
        >
          <Code size={14} />
          VS Code
        </button>
        {!worktree.isMain && (
          <button
            onClick={onRemove}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium cursor-pointer border outline-none text-accent-red border-border bg-transparent hover:bg-remove-hover hover:border-accent-red active:bg-accent-red active:text-white transition-colors duration-150"
          >
            <Trash2 size={14} />
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

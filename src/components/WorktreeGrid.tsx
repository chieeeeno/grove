import type { WorktreeInfo } from "../types";
import WorktreeCard from "./WorktreeCard";

interface WorktreeGridProps {
  worktrees: WorktreeInfo[];
  labels: Record<string, string>;
  codeAvailable: boolean;
  onOpenInEditor: (path: string) => void;
  onRemove: (path: string) => void;
  onSaveLabel: (worktreePath: string, newLabel: string) => void;
}

/** worktree のディレクトリ名を取得（ラベル未設定時のデフォルト表示） */
function dirName(path: string): string {
  return path.split("/").pop() ?? path;
}

export default function WorktreeGrid({
  worktrees,
  labels,
  codeAvailable,
  onOpenInEditor,
  onRemove,
  onSaveLabel,
}: WorktreeGridProps) {
  if (worktrees.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ color: "var(--text-muted)" }}
      >
        <p className="text-[14px]">worktree がありません</p>
      </div>
    );
  }

  // main worktree を先頭にソート
  const sorted = [...worktrees].sort((a, b) => {
    if (a.isMain && !b.isMain) return -1;
    if (!a.isMain && b.isMain) return 1;
    return 0;
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      {sorted.map((wt) => (
        <WorktreeCard
          key={wt.path}
          worktree={wt}
          label={labels[wt.path] ?? dirName(wt.path)}
          codeAvailable={codeAvailable}
          onOpenInEditor={() => onOpenInEditor(wt.path)}
          onRemove={() => onRemove(wt.path)}
          onSaveLabel={(newLabel) => onSaveLabel(wt.path, newLabel)}
        />
      ))}
    </div>
  );
}

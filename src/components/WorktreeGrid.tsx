import type { WorktreeInfo } from "../types";
import WorktreeCard from "./WorktreeCard";
import { dirName } from "../lib/path";

interface WorktreeGridProps {
  worktrees: WorktreeInfo[];
  labels: Record<string, string>;
  codeAvailable: boolean;
  onOpenInEditor: (worktreePath: string) => void;
  onRemove: (worktreePath: string) => void;
  onSaveLabel: (worktreePath: string, newLabel: string) => void;
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
          onOpenInEditor={onOpenInEditor}
          onRemove={onRemove}
          onSaveLabel={onSaveLabel}
        />
      ))}
    </div>
  );
}

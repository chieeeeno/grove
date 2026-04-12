import { useMemo } from "react";
import type { WorktreeInfo } from "../types";
import WorktreeCard from "./WorktreeCard";
import { dirName } from "../lib/path";

/** WorktreeGrid / WorktreeGridSkeleton で共有するグリッドレイアウトクラス */
export const WORKTREE_GRID_CLASS = "grid grid-cols-2 gap-4";

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
  // main worktree を先頭にソート（worktrees 参照が維持されれば結果も安定）
  // 呼び出し側（App.tsx）で length > 0 のときだけレンダリングするため、
  // 空配列時の分岐は持たない（空状態は MainArea が描画する）。
  const sorted = useMemo(
    () =>
      [...worktrees].sort((a, b) => {
        if (a.isMain && !b.isMain) return -1;
        if (!a.isMain && b.isMain) return 1;
        return 0;
      }),
    [worktrees]
  );

  return (
    <div className={WORKTREE_GRID_CLASS}>
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

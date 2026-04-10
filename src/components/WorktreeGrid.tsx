import type { WorktreeInfo } from "../types";
import WorktreeCard from "./WorktreeCard";

interface WorktreeGridProps {
  worktrees: WorktreeInfo[];
  labels: Record<string, string>;
  onOpenInEditor: (path: string) => void;
  onRemove: (path: string) => void;
}

/** worktree のディレクトリ名を取得（ラベル未設定時のデフォルト表示） */
function dirName(path: string): string {
  return path.split("/").pop() ?? path;
}

export default function WorktreeGrid({
  worktrees,
  labels,
  onOpenInEditor,
  onRemove,
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

  // main worktree を先頭に、残りを2列に分配
  const sorted = [...worktrees].sort((a, b) => {
    if (a.isMain && !b.isMain) return -1;
    if (!a.isMain && b.isMain) return 1;
    return 0;
  });

  const col1: WorktreeInfo[] = [];
  const col2: WorktreeInfo[] = [];
  sorted.forEach((wt, i) => {
    if (i % 2 === 0) col1.push(wt);
    else col2.push(wt);
  });

  const renderCard = (wt: WorktreeInfo) => (
    <WorktreeCard
      key={wt.path}
      worktree={wt}
      label={labels[wt.path] ?? dirName(wt.path)}
      onOpenInEditor={() => onOpenInEditor(wt.path)}
      onRemove={() => onRemove(wt.path)}
    />
  );

  return (
    <div className="flex gap-4 h-full items-start">
      <div className="flex-1 flex flex-col gap-4">
        {col1.map(renderCard)}
      </div>
      <div className="flex-1 flex flex-col gap-4">
        {col2.map(renderCard)}
      </div>
    </div>
  );
}

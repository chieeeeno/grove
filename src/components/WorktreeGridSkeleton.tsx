import WorktreeCardSkeleton from "./WorktreeCardSkeleton";
import { WORKTREE_GRID_CLASS } from "./WorktreeGrid";

/** worktree データ取得中に表示するスケルトングリッド */
export default function WorktreeGridSkeleton() {
  return (
    <div className={WORKTREE_GRID_CLASS}>
      {Array.from({ length: 4 }, (_, i) => (
        <WorktreeCardSkeleton key={i} />
      ))}
    </div>
  );
}

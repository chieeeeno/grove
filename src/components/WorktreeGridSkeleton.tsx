import WorktreeCardSkeleton from "./WorktreeCardSkeleton";

/** worktree データ取得中に表示するスケルトングリッド */
export default function WorktreeGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: 4 }, (_, i) => (
        <WorktreeCardSkeleton key={i} />
      ))}
    </div>
  );
}

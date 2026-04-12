/** WorktreeCard と同じ形状のスケルトンプレースホルダー */
export default function WorktreeCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl p-4 bg-card border border-border animate-pulse">
      {/* ヘッダー: ラベル + バッジ */}
      <div className="flex items-center justify-between gap-2">
        <div className="h-4 w-32 rounded bg-border" />
        <div className="h-4 w-12 rounded-full bg-border" />
      </div>

      {/* 区切り線 */}
      <div className="h-px bg-border" />

      {/* コミット情報 + 変更ファイル数 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-3.5 rounded bg-border shrink-0" />
          <div className="h-3 flex-1 rounded bg-border" />
          <div className="h-3 w-10 rounded bg-border shrink-0" />
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-border shrink-0" />
          <div className="h-3 w-16 rounded bg-border" />
        </div>
      </div>

      {/* アクション */}
      <div className="flex items-center justify-end gap-2">
        <div className="h-7 w-20 rounded-md bg-border" />
      </div>
    </div>
  );
}

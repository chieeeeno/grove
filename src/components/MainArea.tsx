import { FolderGit2, RefreshCw } from "lucide-react";

// ===== サブコンポーネント =====

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-fg-muted">
      <FolderGit2 size={40} className="text-border" />
      <p className="text-[14px]">リポジトリを選択してください</p>
    </div>
  );
}

function NoRepository() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-fg-muted">
      <FolderGit2 size={40} className="text-border" />
      <p className="text-[14px]">worktree がありません</p>
      <p className="text-[12px]">左サイドバーからリポジトリを追加してください</p>
    </div>
  );
}

// ===== メインコンポーネント =====

interface MainAreaProps {
  selectedRepositoryName?: string | null;
  selectedRepositoryPath?: string | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  children?: React.ReactNode;
}

export default function MainArea({
  selectedRepositoryName = null,
  selectedRepositoryPath = null,
  isRefreshing = false,
  onRefresh = () => {},
  children,
}: MainAreaProps) {
  return (
    <main className="flex-1 flex flex-col gap-5 py-5 px-6 min-w-0 h-full bg-app">
      {selectedRepositoryName ? (
        <>
          {/* ヘッダー */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <FolderGit2 size={20} className="text-accent shrink-0" />
              <span className="text-[20px] font-semibold shrink-0 text-fg">
                {selectedRepositoryName}
              </span>
              {selectedRepositoryPath && (
                <span className="text-[12px] truncate text-fg-muted">{selectedRepositoryPath}</span>
              )}
            </div>

            {/* リフレッシュボタン */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center rounded-md p-2 border-0 outline-none cursor-pointer shrink-0 bg-card hover:bg-card-hover active:bg-accent transition-colors duration-150"
              title="リフレッシュ (Cmd+R)"
            >
              <RefreshCw
                size={16}
                className={`text-fg-secondary ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Worktree グリッド or コンテンツ */}
          <div className="flex-1 overflow-y-auto min-h-0">{children ?? <NoRepository />}</div>
        </>
      ) : (
        <EmptyState />
      )}
    </main>
  );
}

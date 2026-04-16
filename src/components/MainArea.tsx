import { FolderGit2, RefreshCw } from "lucide-react";
import StatusHelpPopover from "./StatusHelpPopover";
import { relativeTime } from "../lib/time";

// ===== サブコンポーネント =====

interface CenteredMessageProps {
  title: string;
  subtitle?: string;
}

/** 中央寄せの案内メッセージ（未選択時・空状態で共用） */
function CenteredMessage({ title, subtitle }: CenteredMessageProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-fg-muted">
      <FolderGit2 size={40} className="text-border" />
      <p className="text-[14px]">{title}</p>
      {subtitle && <p className="text-[12px]">{subtitle}</p>}
    </div>
  );
}

// ===== メインコンポーネント =====

interface MainAreaProps {
  selectedRepositoryName: string | null;
  selectedRepositoryPath: string | null;
  /** 手動リフレッシュ（listWorktrees）実行中フラグ */
  isRefreshing: boolean;
  /**
   * fetch（リモート取得）実行中フラグ。
   * 手動リフレッシュ時 or 初回選択時に一時的に true になる。
   */
  isFetching: boolean;
  /**
   * 選択中リポジトリの最終 fetch 完了時刻（Unix epoch 秒）。
   * `null` はまだ fetch されていない状態（fetch 失敗中 or 未選択）で、ヘッダー表示も省略する
   */
  lastFetchedAt: number | null;
  onRefresh: () => void;
  children?: React.ReactNode;
}

export default function MainArea({
  selectedRepositoryName,
  selectedRepositoryPath,
  isRefreshing,
  isFetching,
  lastFetchedAt,
  onRefresh,
  children,
}: MainAreaProps) {
  const busy = isRefreshing || isFetching;
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

            <div className="flex items-center gap-2 shrink-0">
              {lastFetchedAt !== null && (
                <span
                  className="text-[11px] text-fg-muted shrink-0"
                  title={`最終 fetch: ${new Date(lastFetchedAt * 1000).toLocaleString()}`}
                >
                  Last fetched: {relativeTime(lastFetchedAt) || "たった今"}
                </span>
              )}

              <StatusHelpPopover />

              {/* リフレッシュボタン（fetch + listWorktrees） */}
              <button
                onClick={onRefresh}
                disabled={busy}
                className="flex items-center justify-center rounded-md p-2 border-0 outline-none cursor-pointer shrink-0 bg-card hover:bg-card-hover active:bg-accent transition-colors duration-150"
                title={isFetching ? "fetch 中..." : "リフレッシュ (Cmd+R)"}
              >
                <RefreshCw
                  size={16}
                  className={`text-fg-secondary ${busy ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Worktree グリッド or 空状態 */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {children ?? (
              <CenteredMessage
                title="worktree がありません"
                subtitle="左サイドバーからリポジトリを追加してください"
              />
            )}
          </div>
        </>
      ) : (
        <CenteredMessage title="リポジトリを選択してください" />
      )}
    </main>
  );
}

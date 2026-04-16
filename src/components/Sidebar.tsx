import { Trees, GitBranch, Plus, Settings, X } from "lucide-react";
import { REPOSITORY_SHORTCUT_COUNT } from "../hooks/useKeyboardShortcuts";

// ===== 型 =====

interface RepoItemProps {
  name: string;
  worktreeCount: number;
  isActive: boolean;
  /**
   * 表示すべきショートカット番号（1-origin）。`null` なら通常の worktreeCount バッジを出す。
   * 呼び出し側で「Cmd 押下中」かつ「先頭 9 個以内」の条件を評価して渡す。
   */
  shortcutNumber: number | null;
  onClick: () => void;
  onRemove: () => void;
}

// ===== サブコンポーネント =====

function RepoItem({
  name,
  worktreeCount,
  isActive,
  shortcutNumber,
  onClick,
  onRemove,
}: RepoItemProps) {
  return (
    <div
      className={`group w-full flex items-center gap-2 rounded-md px-2.5 py-2 cursor-pointer transition-colors duration-150
        ${isActive ? "bg-card" : "hover:bg-card-hover"}`}
      onClick={onClick}
    >
      <GitBranch size={16} className={`shrink-0 ${isActive ? "text-accent" : "text-fg-muted"}`} />
      <span
        className={`flex-1 text-[13px] truncate ${isActive ? "text-fg font-medium" : "text-fg-secondary"}`}
      >
        {name}
      </span>
      {/* hover 時に X ボタン、通常時は worktreeCount バッジ（Cmd 押下中は番号バッジに差し替え） */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="hidden group-hover:flex items-center justify-center rounded p-0.5 border-0 outline-none cursor-pointer text-fg-muted hover:bg-card-hover"
        title="登録解除"
      >
        <X size={12} />
      </button>
      {shortcutNumber !== null ? (
        <span
          aria-label={`ショートカット: Cmd+${shortcutNumber}`}
          className={`group-hover:hidden flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums
            ${isActive ? "bg-accent text-fg-inverse" : "bg-border text-fg"}`}
        >
          ⌘{shortcutNumber}
        </span>
      ) : (
        <span
          className={`group-hover:hidden flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none
            ${isActive ? "bg-accent text-fg-inverse" : "bg-border text-fg-secondary"}`}
        >
          {worktreeCount}
        </span>
      )}
    </div>
  );
}

// ===== メインコンポーネント =====

interface SidebarProps {
  repositories: Array<{ id: string; name: string; worktreeCount: number }>;
  selectedId: string | null;
  /** Cmd（macOS）/ Ctrl（他 OS）キーが押し下げ中かどうか。true の間は worktreeCount バッジを番号バッジに差し替える */
  isMetaDown: boolean;
  onSelectRepository: (id: string) => void;
  onAddRepository: () => void;
  onRemoveRepository: (id: string) => void;
  onOpenSettings: () => void;
}

export default function Sidebar({
  repositories,
  selectedId,
  isMetaDown,
  onSelectRepository,
  onAddRepository,
  onRemoveRepository,
  onOpenSettings,
}: SidebarProps) {
  return (
    <aside className="flex flex-col gap-4 py-5 px-4 h-full shrink-0 w-[220px] bg-sidebar border-r border-border">
      {/* ロゴ */}
      <div className="flex items-center gap-2">
        <Trees size={20} className="text-accent-green shrink-0" />
        <span className="text-[18px] font-bold text-fg">Grove</span>
        <span className="text-[11px] text-fg-muted">v0.1.0</span>
      </div>

      {/* 区切り線 */}
      <div className="h-px bg-border" />

      {/* リポジトリラベル */}
      <span className="text-[11px] font-semibold text-fg-muted tracking-wide">リポジトリ</span>

      {/* リポジトリ一覧 */}
      <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto min-h-0">
        {repositories.length === 0 ? (
          <p className="text-[12px] px-2.5 text-fg-muted">リポジトリがありません</p>
        ) : (
          repositories.map((repo, index) => (
            <RepoItem
              key={repo.id}
              name={repo.name}
              worktreeCount={repo.worktreeCount}
              isActive={repo.id === selectedId}
              shortcutNumber={isMetaDown && index < REPOSITORY_SHORTCUT_COUNT ? index + 1 : null}
              onClick={() => onSelectRepository(repo.id)}
              onRemove={() => onRemoveRepository(repo.id)}
            />
          ))
        )}
      </div>

      {/* リポジトリを追加ボタン */}
      <button
        onClick={onAddRepository}
        className="w-full flex items-center gap-1.5 rounded-md px-2.5 py-2 text-left cursor-pointer border border-border bg-transparent text-fg-muted hover:bg-card-hover hover:border-fg-muted transition-colors duration-150 outline-none"
      >
        <Plus size={14} className="shrink-0" />
        <span className="text-[12px]">リポジトリを追加</span>
      </button>

      {/* 設定ボタン */}
      <button
        onClick={onOpenSettings}
        className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left cursor-pointer border-0 bg-transparent text-fg-secondary hover:bg-card-hover transition-colors duration-150 outline-none"
      >
        <Settings size={16} className="text-fg-muted shrink-0" />
        <span className="text-[13px]">設定</span>
      </button>
    </aside>
  );
}

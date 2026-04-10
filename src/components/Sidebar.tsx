import { Trees, GitBranch, Plus, Settings } from "lucide-react";

// ===== 型 =====

interface RepoItemProps {
  name: string;
  worktreeCount: number;
  isActive: boolean;
  onClick: () => void;
}

// ===== サブコンポーネント =====

function RepoItem({ name, worktreeCount, isActive, onClick }: RepoItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left cursor-pointer border-0 outline-none"
      style={{
        backgroundColor: isActive ? "var(--bg-card)" : "transparent",
      }}
    >
      <GitBranch
        size={16}
        style={{ color: isActive ? "var(--accent-primary)" : "var(--text-muted)", flexShrink: 0 }}
      />
      <span
        className="flex-1 text-[13px] truncate"
        style={{
          color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
          fontWeight: isActive ? 500 : 400,
        }}
      >
        {name}
      </span>
      <span
        className="flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
        style={{
          backgroundColor: isActive ? "var(--accent-primary)" : "var(--border-default)",
          color: isActive ? "var(--text-inverse)" : "var(--text-secondary)",
        }}
      >
        {worktreeCount}
      </span>
    </button>
  );
}

// ===== メインコンポーネント =====

interface SidebarProps {
  repositories?: Array<{ id: string; name: string; worktreeCount: number }>;
  selectedId?: string | null;
  onSelectRepository?: (id: string) => void;
  onAddRepository?: () => void;
  onOpenSettings?: () => void;
}

export default function Sidebar({
  repositories = [],
  selectedId = null,
  onSelectRepository = () => {},
  onAddRepository = () => {},
  onOpenSettings = () => {},
}: SidebarProps) {
  return (
    <aside
      className="flex flex-col gap-4 py-5 px-4 h-full shrink-0"
      style={{
        width: 220,
        backgroundColor: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-default)",
      }}
    >
      {/* ロゴ */}
      <div className="flex items-center gap-2">
        <Trees size={20} style={{ color: "var(--accent-green)", flexShrink: 0 }} />
        <span
          className="text-[18px] font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Grove
        </span>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          v0.1.0
        </span>
      </div>

      {/* 区切り線 */}
      <div style={{ height: 1, backgroundColor: "var(--border-default)" }} />

      {/* リポジトリラベル */}
      <span
        className="text-[11px] font-semibold"
        style={{ color: "var(--text-muted)", letterSpacing: "0.5px" }}
      >
        リポジトリ
      </span>

      {/* リポジトリ一覧（残スペースを埋める） */}
      <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto min-h-0">
        {repositories.length === 0 ? (
          <p className="text-[12px] px-2.5" style={{ color: "var(--text-muted)" }}>
            リポジトリがありません
          </p>
        ) : (
          repositories.map((repo) => (
            <RepoItem
              key={repo.id}
              name={repo.name}
              worktreeCount={repo.worktreeCount}
              isActive={repo.id === selectedId}
              onClick={() => onSelectRepository(repo.id)}
            />
          ))
        )}
      </div>

      {/* リポジトリを追加ボタン */}
      <button
        onClick={onAddRepository}
        className="w-full flex items-center gap-1.5 rounded-md px-2.5 py-2 text-left cursor-pointer border outline-none"
        style={{
          backgroundColor: "transparent",
          borderColor: "var(--border-default)",
          color: "var(--text-muted)",
        }}
      >
        <Plus size={14} style={{ flexShrink: 0 }} />
        <span className="text-[12px]">リポジトリを追加</span>
      </button>

      {/* 設定ボタン */}
      <button
        onClick={onOpenSettings}
        className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left cursor-pointer border-0 outline-none"
        style={{ backgroundColor: "transparent", color: "var(--text-secondary)" }}
      >
        <Settings size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <span className="text-[13px]">設定</span>
      </button>
    </aside>
  );
}

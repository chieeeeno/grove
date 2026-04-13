import { X, ChevronDown } from "lucide-react";

const THEME_OPTIONS = [
  { value: "system" as const, label: "システム" },
  { value: "light" as const, label: "ライト" },
  { value: "dark" as const, label: "ダーク" },
];

const REFRESH_OPTIONS = [
  { value: 5000, label: "5 秒" },
  { value: 10000, label: "10 秒" },
  { value: 30000, label: "30 秒" },
];

interface SettingsDialogProps {
  /** 現在のテーマ設定 */
  theme: "system" | "dark" | "light";
  /** テーマ変更ハンドラ */
  onChangeTheme: (theme: "system" | "dark" | "light") => void;
  refreshInterval: number;
  onChangeRefreshInterval: (interval: number) => void;
  onClose: () => void;
}

export default function SettingsDialog({
  theme,
  onChangeTheme,
  refreshInterval,
  onChangeRefreshInterval,
  onClose,
}: SettingsDialogProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col gap-5 rounded-xl p-6 bg-dialog border border-border"
        style={{ width: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <span className="text-[18px] font-semibold text-fg">設定</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-md p-1 border-0 outline-none cursor-pointer bg-transparent text-fg-muted hover:bg-card-hover transition-colors duration-150"
          >
            <X size={18} />
          </button>
        </div>

        {/* 区切り線 */}
        <div className="h-px bg-border" />

        {/* テーマ */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-fg">テーマ</span>
            <span className="text-[12px] text-fg-muted">アプリの外観テーマを選択</span>
          </div>
          <div className="relative">
            <select
              value={theme}
              onChange={(e) => onChangeTheme(e.target.value as "system" | "dark" | "light")}
              className="w-full appearance-none rounded-lg px-3 py-2 text-[13px] text-fg bg-input border border-border outline-none cursor-pointer"
            >
              {THEME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none"
            />
          </div>
        </div>

        {/* TODO: エディタ選択（M1 で複数エディタ対応予定） */}

        {/* 自動更新間隔 */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-fg">自動更新</span>
            <span className="text-[12px] text-fg-muted">worktree の状態を自動的に更新する間隔</span>
          </div>
          <div className="relative">
            <select
              value={refreshInterval}
              onChange={(e) => onChangeRefreshInterval(Number(e.target.value))}
              className="w-full appearance-none rounded-lg px-3 py-2 text-[13px] text-fg bg-input border border-border outline-none cursor-pointer"
            >
              {REFRESH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

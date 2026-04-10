import { Sun, Moon, Monitor, X, ChevronDown } from "lucide-react";

type ThemeOption = "light" | "dark" | "system";

const REFRESH_OPTIONS = [
  { value: 5000, label: "5 秒" },
  { value: 10000, label: "10 秒" },
  { value: 30000, label: "30 秒" },
];

interface SettingsDialogProps {
  theme: ThemeOption;
  refreshInterval: number;
  onChangeRefreshInterval: (interval: number) => void;
  onClose: () => void;
}

function ThemeButton({
  icon: Icon,
  label,
  isActive,
}: {
  icon: typeof Sun;
  label: string;
  isActive: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-lg p-3 flex-1 border transition-colors duration-150
        ${isActive ? "bg-accent border-accent border-2 text-white" : "border-border text-fg-muted cursor-not-allowed opacity-60"}`}
    >
      <Icon size={24} />
      <span className={`text-[12px] ${isActive ? "font-medium" : ""}`}>{label}</span>
    </div>
  );
}

export default function SettingsDialog({
  theme,
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

        {/* テーマ（M0 ではダーク固定、表示のみ） */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-fg">テーマ</span>
            <span className="text-[12px] text-fg-muted">
              アプリの外観を選択します（M2 で対応予定）
            </span>
          </div>
          <div className="flex gap-2">
            <ThemeButton icon={Sun} label="ライト" isActive={theme === "light"} />
            <ThemeButton icon={Moon} label="ダーク" isActive={theme === "dark"} />
            <ThemeButton icon={Monitor} label="システム" isActive={theme === "system"} />
          </div>
        </div>

        {/* 区切り線 */}
        <div className="h-px bg-border" />

        {/* エディタ（M0 では VS Code 固定） */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-fg">エディタ</span>
            <span className="text-[12px] text-fg-muted">worktree を開くエディタを選択します</span>
          </div>
          <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-input border border-border">
            <span className="text-[13px] text-fg">Visual Studio Code</span>
            <ChevronDown size={16} className="text-fg-muted" />
          </div>
        </div>

        {/* 区切り線 */}
        <div className="h-px bg-border" />

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

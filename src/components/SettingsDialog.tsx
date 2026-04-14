import { X, ChevronDown } from "lucide-react";
import { useAppStore, selectEffectiveTerminalId } from "../stores/appStore";

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

/**
 * 設定ダイアログ内のセレクトボックス行。ラベル + 説明 + select + ChevronDown アイコンの
 * 共通レイアウトを提供する。M1 のエディタ選択でも再利用する想定。
 */
function SettingsSelect<T extends string | number>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-fg">{label}</span>
        <span className="text-[12px] text-fg-muted">{description}</span>
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            onChange((typeof value === "number" ? Number(raw) : raw) as T);
          }}
          className="w-full appearance-none rounded-lg px-3 py-2 text-[13px] text-fg bg-input border border-border outline-none cursor-pointer"
        >
          {options.map((opt) => (
            <option key={String(opt.value)} value={opt.value}>
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
  );
}

interface SettingsDialogProps {
  onChangeTheme: (theme: "system" | "dark" | "light") => void;
  onChangeRefreshInterval: (interval: number) => void;
  onChangeTerminal: (terminalId: string) => void;
  onClose: () => void;
}

export default function SettingsDialog({
  onChangeTheme,
  onChangeRefreshInterval,
  onChangeTerminal,
  onClose,
}: SettingsDialogProps) {
  // App レベルでの購読を避け、ダイアログ内部で store を直接購読する
  const theme = useAppStore((s) => s.theme);
  const refreshInterval = useAppStore((s) => s.refreshInterval);
  const installedTerminals = useAppStore((s) => s.installedTerminals);
  const effectiveTerminalId = useAppStore(selectEffectiveTerminalId);

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
        <SettingsSelect
          label="テーマ"
          description="アプリの外観テーマを選択"
          value={theme}
          options={THEME_OPTIONS}
          onChange={onChangeTheme}
        />

        {/* TODO: エディタ選択（M1 で複数エディタ対応予定） */}

        {/* ターミナルアプリ */}
        {installedTerminals.length > 0 && (
          <SettingsSelect
            label="ターミナル"
            description="worktree を開くターミナルアプリを選択"
            value={effectiveTerminalId}
            options={installedTerminals.map((t) => ({ value: t.id, label: t.name }))}
            onChange={onChangeTerminal}
          />
        )}

        {/* 自動更新間隔 */}
        <SettingsSelect
          label="自動更新"
          description="worktree の状態を自動的に更新する間隔"
          value={refreshInterval}
          options={REFRESH_OPTIONS}
          onChange={onChangeRefreshInterval}
        />
      </div>
    </div>
  );
}

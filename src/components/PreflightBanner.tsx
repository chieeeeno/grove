import { useState } from "react";
import { CircleAlert, X } from "lucide-react";

interface PreflightBannerProps {
  visible: boolean;
}

export default function PreflightBanner({ visible }: PreflightBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!visible || dismissed) return null;

  return (
    <div
      className="flex items-center justify-between px-6 py-2.5 shrink-0"
      style={{ backgroundColor: "#FBBF2418" }}
    >
      <div className="flex items-center gap-2.5">
        <CircleAlert size={16} style={{ color: "var(--accent-yellow)", flexShrink: 0 }} />
        <span className="text-[12px] font-medium" style={{ color: "var(--accent-yellow)" }}>
          code コマンドが見つかりません。VS Code で「Shell Command: Install &apos;code&apos; command
          in PATH」を実行してください。
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex items-center justify-center rounded-md p-1 border-0 outline-none cursor-pointer shrink-0"
        style={{ backgroundColor: "transparent", color: "var(--accent-yellow)" }}
        title="閉じる"
      >
        <X size={14} />
      </button>
    </div>
  );
}

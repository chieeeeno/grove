import { memo, useEffect, useState } from "react";
import { CircleAlert, X } from "lucide-react";

interface PreflightBannerProps {
  /** `code` コマンドが利用不可のとき true */
  codeUnavailable: boolean;
  /** Terminal.app が利用不可のとき true */
  terminalUnavailable: boolean;
}

/** 個別バナーの dismiss 状態を管理するキー */
type BannerKey = "code" | "terminal";

const BANNER_MESSAGES: Record<BannerKey, { message: string }> = {
  code: {
    message:
      "code コマンドが見つかりません。VS Code で「Shell Command: Install 'code' command in PATH」を実行してください。",
  },
  terminal: {
    message:
      "対応するターミナルアプリが見つかりません。Terminal.app, Ghostty, iTerm2, Alacritty, Warp, kitty のいずれかをインストールしてください。",
  },
};

/**
 * ADR-0012 に基づく事前警告バナー。
 *
 * `code` コマンドや Terminal.app が利用不可の場合に上部にバナー警告を表示する。
 * 各バナーは個別に dismiss 可能で、問題が解消→再発した場合は再表示される。
 *
 * @param props PreflightBannerProps
 * @returns 警告バナー群、または表示対象がなければ null
 */
function PreflightBanner({ codeUnavailable, terminalUnavailable }: PreflightBannerProps) {
  const [dismissed, setDismissed] = useState<Record<BannerKey, boolean>>({
    code: false,
    terminal: false,
  });

  // 問題が解消したら dismiss 状態をリセット（再発時に再表示するため）
  useEffect(() => {
    if (!codeUnavailable) setDismissed((prev) => (prev.code ? { ...prev, code: false } : prev));
  }, [codeUnavailable]);
  useEffect(() => {
    if (!terminalUnavailable)
      setDismissed((prev) => (prev.terminal ? { ...prev, terminal: false } : prev));
  }, [terminalUnavailable]);

  const flagByKey: Record<BannerKey, boolean> = {
    code: codeUnavailable,
    terminal: terminalUnavailable,
  };

  const visibleBanners = (Object.keys(BANNER_MESSAGES) as BannerKey[]).filter(
    (key) => flagByKey[key] && !dismissed[key]
  );

  if (visibleBanners.length === 0) return null;

  return (
    <>
      {visibleBanners.map((key) => (
        <div
          key={key}
          className="flex items-center justify-between px-6 py-2.5 shrink-0"
          style={{ backgroundColor: "#FBBF2418" }}
        >
          <div className="flex items-center gap-2.5">
            <CircleAlert size={16} style={{ color: "var(--accent-yellow)", flexShrink: 0 }} />
            <span className="text-[12px] font-medium" style={{ color: "var(--accent-yellow)" }}>
              {BANNER_MESSAGES[key].message}
            </span>
          </div>
          <button
            onClick={() => setDismissed((prev) => ({ ...prev, [key]: true }))}
            className="flex items-center justify-center rounded-md p-1 border-0 outline-none cursor-pointer shrink-0"
            style={{ backgroundColor: "transparent", color: "var(--accent-yellow)" }}
            title="閉じる"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </>
  );
}

export default memo(PreflightBanner);

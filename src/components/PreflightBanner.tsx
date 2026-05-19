import { memo, useEffect, useState } from "react";
import { CircleAlert, X } from "lucide-react";
import { useAppStore, selectEffectiveEditorName } from "../stores/appStore";

interface PreflightBannerProps {
  /** 選択中エディタアプリが利用不可のとき true */
  editorUnavailable: boolean;
  /** 対応するターミナルアプリが利用不可のとき true */
  terminalUnavailable: boolean;
}

/** 個別バナーの dismiss 状態を管理するキー */
type BannerKey = "editor" | "terminal";

const TERMINAL_BANNER_MESSAGE =
  "対応するターミナルアプリが見つかりません。Terminal.app, Ghostty, iTerm2, Alacritty, Warp, kitty, cmux のいずれかをインストールしてください。";

/**
 * ADR-0012 に基づく事前警告バナー。
 *
 * 選択中エディタアプリや対応ターミナルアプリが利用不可の場合に上部にバナー警告を表示する。
 * 各バナーは個別に dismiss 可能で、問題が解消→再発した場合は再表示される。
 * エディタ用のメッセージは選択中エディタの表示名を含めて生成する。
 *
 * @param props PreflightBannerProps
 * @returns 警告バナー群、または表示対象がなければ null
 */
function PreflightBanner({ editorUnavailable, terminalUnavailable }: PreflightBannerProps) {
  const editorName = useAppStore(selectEffectiveEditorName);

  const [dismissed, setDismissed] = useState<Record<BannerKey, boolean>>({
    editor: false,
    terminal: false,
  });

  // 問題が解消したら dismiss 状態をリセット（再発時に再表示するため）
  useEffect(() => {
    if (!editorUnavailable)
      setDismissed((prev) => (prev.editor ? { ...prev, editor: false } : prev));
  }, [editorUnavailable]);
  useEffect(() => {
    if (!terminalUnavailable)
      setDismissed((prev) => (prev.terminal ? { ...prev, terminal: false } : prev));
  }, [terminalUnavailable]);

  const messages: Record<BannerKey, string> = {
    editor: `${editorName} が見つかりません。${editorName} をインストールするか、設定で別のエディタを選択してください。`,
    terminal: TERMINAL_BANNER_MESSAGE,
  };

  const flagByKey: Record<BannerKey, boolean> = {
    editor: editorUnavailable,
    terminal: terminalUnavailable,
  };

  const visibleBanners = (Object.keys(messages) as BannerKey[]).filter(
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
              {messages[key]}
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

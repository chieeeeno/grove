import { useEffect, useState } from "react";
import { useAppStore } from "../stores/appStore";
import { setWindowTheme } from "../lib/tauri";

/** OS のダーク/ライト設定を判定するメディアクエリ */
const DARK_MQ = "(prefers-color-scheme: dark)";

/**
 * store の `theme` 設定（`"system"` | `"dark"` | `"light"`）を実際の UI テーマに解決し、
 * `document.documentElement.dataset.theme` への反映と `prefers-color-scheme` の監視を行う。
 *
 * `"system"` の場合は OS の設定に追従し、リアルタイムで切り替わる。
 * Tauri ウィンドウテーマは store の `theme` 値（resolved ではなく）で同期する。
 * `"system"` のとき `set_theme(None)` を呼ぶことで、WebView 内の
 * `prefers-color-scheme` が OS 設定を反映し matchMedia の change イベントが発火する。
 *
 * @returns resolvedTheme — 実際に適用されている `"dark"` | `"light"`
 */
export function useTheme(): "dark" | "light" {
  const theme = useAppStore((s) => s.theme);

  // system モード用: OS のダーク設定を追跡する state
  const [sysDark, setSysDark] = useState(() => window.matchMedia(DARK_MQ).matches);

  // Tauri ウィンドウテーマを store の theme 値で同期
  // "system" → set_theme(None) で OS 追従に戻す（matchMedia が正しく動作するために必要）
  // "dark"/"light" → 固定テーマに設定
  useEffect(() => {
    setWindowTheme(theme).catch((e) => console.error("ウィンドウテーマの同期に失敗:", e));
  }, [theme]);

  // system モード時のみメディアクエリを監視
  useEffect(() => {
    if (theme !== "system") return;

    const mq = window.matchMedia(DARK_MQ);
    setSysDark(mq.matches);

    const handler = (e: MediaQueryListEvent) => {
      setSysDark(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  // resolvedTheme は派生値（useState 不要）
  const resolvedTheme: "dark" | "light" = theme === "system" ? (sysDark ? "dark" : "light") : theme;

  // resolvedTheme を DOM に反映
  useEffect(() => {
    applyThemeToDOM(resolvedTheme);
  }, [resolvedTheme]);

  return resolvedTheme;
}

/**
 * `document.documentElement.dataset.theme` を設定・削除して CSS 変数を切り替える。
 *
 * `:root`（ダーク）がデフォルトで、`[data-theme="light"]` でライトテーマが適用される設計。
 *
 * @param resolved 適用するテーマ（`"dark"` の場合は data-theme 属性を削除）
 */
function applyThemeToDOM(resolved: "dark" | "light"): void {
  if (resolved === "light") {
    document.documentElement.dataset.theme = "light";
  } else {
    delete document.documentElement.dataset.theme;
  }
}

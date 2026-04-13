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
 *
 * @returns resolvedTheme — 実際に適用されている `"dark"` | `"light"`
 */
export function useTheme(): "dark" | "light" {
  const theme = useAppStore((s) => s.theme);

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(() => resolveTheme(theme));

  // theme 設定 or OS 設定の変更時に resolvedTheme を再計算
  useEffect(() => {
    if (theme !== "system") {
      setResolvedTheme(theme);
      return;
    }

    // system モード: 現在値をセットし、変更を監視
    const mq = window.matchMedia(DARK_MQ);
    setResolvedTheme(mq.matches ? "dark" : "light");

    const handler = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  // resolvedTheme を DOM + Tauri ウィンドウに反映
  useEffect(() => {
    applyThemeToDOM(resolvedTheme);
    setWindowTheme(resolvedTheme).catch((e) => console.error("ウィンドウテーマの同期に失敗:", e));
  }, [resolvedTheme]);

  return resolvedTheme;
}

/**
 * theme 設定値を実際のテーマに解決する（初期値計算用）。
 *
 * @param theme store の theme 設定値
 * @returns 解決済みの `"dark"` | `"light"`
 */
function resolveTheme(theme: "system" | "dark" | "light"): "dark" | "light" {
  if (theme !== "system") return theme;
  return window.matchMedia(DARK_MQ).matches ? "dark" : "light";
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

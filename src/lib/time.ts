/**
 * Unix timestamp（秒）を日本語の相対時間表示に変換する。
 *
 * 返却フォーマット:
 * - `0`（未設定センチネル）: 空文字 `""`
 * - 1 分未満: `"たった今"`
 * - 1 時間未満: `"N分前"`
 * - 1 日未満: `"N時間前"`
 * - 1 週間未満: `"N日前"`
 * - それ以上: `"M/D"`（年表記なし。年跨ぎでも M/D のみ）
 *
 * @param timestampSecs Unix epoch 秒。`0` は「コミットなし」等のセンチネルとして扱う
 *                      （Rust 側 `WorktreeInfo.last_commit_time` がコミット未取得時に
 *                      `0` を返す仕様と対応）
 * @returns 上記フォーマットの日本語文字列。センチネル時は空文字
 */
export function relativeTime(timestampSecs: number): string {
  if (timestampSecs === 0) return "";

  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestampSecs;

  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}日前`;

  const d = new Date(timestampSecs * 1000);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

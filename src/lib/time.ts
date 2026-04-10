/** Unix timestamp（秒）を相対時間に変換する */
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

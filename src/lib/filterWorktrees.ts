import type { WorktreeInfo } from "../types";
import { dirName } from "./path";

/**
 * worktree の表示名を解決する。
 *
 * ユーザー設定ラベル（ADR-0008: worktree 絶対パスがキー）があればそれを優先し、
 * 未設定なら末尾ディレクトリ名（`dirName(path)`）をフォールバックとして使う。
 * `WorktreeGrid` のカード見出しと絞り込み判定で同じ表示名を使うために共通化している。
 *
 * @param path 対象 worktree の絶対パス
 * @param labels ラベルマップ（key: worktree 絶対パス、value: ラベル文字列）
 * @returns 表示名（ラベル優先、未設定時は末尾ディレクトリ名）
 */
export function resolveWorktreeDisplayName(path: string, labels: Record<string, string>): string {
  return labels[path] ?? dirName(path);
}

/**
 * worktree 配列をクエリで絞り込む（大文字小文字を区別しない部分一致）。
 *
 * 判定対象は各 worktree の**表示名**（`resolveWorktreeDisplayName` の結果）と
 * **ブランチ名**（`branch`）の両方で、どちらかにクエリが部分一致すれば残す。
 * クエリは前後の空白を `trim` してから判定する。
 *
 * @param worktrees 絞り込み対象の worktree 配列
 * @param query 検索クエリ（前後の空白は無視される）
 * @param labels 表示名解決に使うラベルマップ
 * @returns 一致した worktree のみの新しい配列（非破壊）。ただし `query` の trim 後が
 *   空文字の場合は全件表示として**引数の配列をそのまま（同一参照で）返す**
 *   （`useMemo` 等で参照安定性を保つため）
 */
export function filterWorktrees(
  worktrees: WorktreeInfo[],
  query: string,
  labels: Record<string, string>
): WorktreeInfo[] {
  const normalized = query.trim().toLowerCase();
  if (normalized === "") {
    return worktrees;
  }
  return worktrees.filter((wt) => {
    const displayName = resolveWorktreeDisplayName(wt.path, labels);
    return (
      displayName.toLowerCase().includes(normalized) || wt.branch.toLowerCase().includes(normalized)
    );
  });
}

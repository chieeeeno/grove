import type { WorktreeInfo } from "../types";

/**
 * worktree 配列をユーザー指定の並び順でソートする。
 *
 * - main worktree（`isMain === true`）は常に先頭に配置される（ドラッグ対象外）
 * - `order` 配列に含まれる worktree は配列の順番に従う
 * - `order` に含まれない worktree（新規追加分）は末尾に追加される
 * - `order` に含まれるが `worktrees` に存在しないパス（削除済み）は無視される
 *
 * @param worktrees ソート対象の worktree 配列
 * @param order ユーザーが指定した worktree 絶対パスの配列（表示したい順番）
 * @returns ソート済みの新しい配列（元の配列は変更しない）
 */
export function sortWorktrees(worktrees: WorktreeInfo[], order: string[]): WorktreeInfo[] {
  const main = worktrees.filter((wt) => wt.isMain);
  const rest = worktrees.filter((wt) => !wt.isMain);

  if (order.length === 0) {
    return [...main, ...rest];
  }

  const orderMap = new Map(order.map((path, idx) => [path, idx]));

  const sorted = [...rest].sort((a, b) => {
    const ai = orderMap.get(a.path) ?? Infinity;
    const bi = orderMap.get(b.path) ?? Infinity;
    // 両方 order にない場合は元の相対位置を保持（stable sort）
    if (ai === Infinity && bi === Infinity) return 0;
    return ai - bi;
  });

  return [...main, ...sorted];
}

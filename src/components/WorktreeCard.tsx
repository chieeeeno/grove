import { memo, useCallback, useState } from "react";
import {
  ShieldCheck,
  GitCommitHorizontal,
  GitMerge,
  FilePen,
  Code,
  SquareTerminal,
  Trash2,
} from "lucide-react";
import type { WorktreeInfo } from "../types";
import { relativeTime } from "../lib/time";
import EditableLabel from "./EditableLabel";

/**
 * `WorktreeCard` の props。
 *
 * コールバックは全て「worktree path を引数に取る」形で統一している。
 * 親コンポーネント（WorktreeGrid）で closure をカードごとに作ると props の参照が
 * 毎回変わり `memo` が効かなくなるため、閉包はカード内で `useCallback` 化する。
 */
interface WorktreeCardProps {
  /** 表示対象の worktree 情報 */
  worktree: WorktreeInfo;
  /** ヘッダーに表示するユーザー設定ラベル。未設定時は dirName(path) を渡す */
  label: string;
  /**
   * `code` コマンドが利用可能か（ADR-0012 preflight）。
   * false のとき VS Code ボタンを無効化し、ツールチップで理由を表示する
   */
  codeAvailable: boolean;
  /**
   * ターミナルアプリが利用可能か（ADR-0012 preflight）。
   * false のとき Terminal ボタンを無効化し、ツールチップで理由を表示する
   */
  terminalAvailable: boolean;
  /**
   * 「VS Code で開く」ボタンを押したときに呼ばれる。
   * @param worktreePath 対象 worktree の絶対パス
   */
  onOpenInEditor: (worktreePath: string) => void;
  /**
   * 「Terminal で開く」ボタンを押したときに呼ばれる。
   * @param worktreePath 対象 worktree の絶対パス
   */
  onOpenInTerminal: (worktreePath: string) => void;
  /**
   * 「Remove」ボタンを押したときに呼ばれる（メイン worktree では非表示）。
   * @param worktreePath 削除対象 worktree の絶対パス
   */
  onRemove: (worktreePath: string) => void;
  /**
   * ラベル編集で確定したときに呼ばれる。
   * @param worktreePath 対象 worktree の絶対パス
   * @param newLabel trim 済みの新しいラベル
   */
  onSaveLabel: (worktreePath: string, newLabel: string) => void;
}

/**
 * 単一 worktree を表示するカードコンポーネント。
 *
 * パフォーマンス: `memo` でラップしている（末尾の `export default` 参照）。
 * appStore の `setWorktrees` が差分検出で参照を維持する前提で、ポーリング時に
 * props が不変なら再レンダーを避ける。親側でも `useMemo` で派生値を安定化している。
 */
function WorktreeCard({
  worktree,
  label,
  codeAvailable,
  terminalAvailable,
  onOpenInEditor,
  onOpenInTerminal,
  onRemove,
  onSaveLabel,
}: WorktreeCardProps) {
  const path = worktree.path;
  const handleOpenInEditor = useCallback(() => onOpenInEditor(path), [onOpenInEditor, path]);
  const handleOpenInTerminal = useCallback(() => onOpenInTerminal(path), [onOpenInTerminal, path]);
  const handleRemove = useCallback(() => onRemove(path), [onRemove, path]);
  const handleSaveLabel = useCallback(
    (newLabel: string) => onSaveLabel(path, newLabel),
    [onSaveLabel, path]
  );
  const [isLabelEditing, setIsLabelEditing] = useState(false);
  const hasChanges = worktree.modifiedCount > 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl p-4 bg-card border border-border">
      {/* ヘッダー: ラベル + バッジ */}
      <div className="flex items-center justify-between gap-2">
        <EditableLabel
          label={label}
          branch={worktree.branch}
          isMain={worktree.isMain}
          onSave={handleSaveLabel}
          onEditingChange={setIsLabelEditing}
        />
        {!isLabelEditing &&
          (worktree.isMain ? (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 bg-[#34D39933] text-accent-green">
              <ShieldCheck size={12} />
              primary
            </span>
          ) : worktree.isMerged ? (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 bg-[#8B5CF633] text-purple-400">
              <GitMerge size={12} />
              merged
            </span>
          ) : (
            <span className="flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 bg-[#6B728033] text-accent-gray">
              idle
            </span>
          ))}
      </div>

      {/* 区切り線 */}
      <div className="h-px bg-border" />

      {/* コミット情報 + 変更ファイル数 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <GitCommitHorizontal size={14} className="text-fg-muted shrink-0" />
          <span className="flex-1 text-[12px] truncate text-fg-secondary">
            {worktree.lastCommitMessage || "コミットなし"}
          </span>
          <span className="text-[11px] shrink-0 text-fg-muted">
            {relativeTime(worktree.lastCommitTime)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <FilePen
            size={13}
            className={`shrink-0 ${hasChanges ? "text-accent-yellow" : "text-fg-muted"}`}
          />
          <span className={`text-[11px] ${hasChanges ? "text-accent-yellow" : "text-fg-muted"}`}>
            {worktree.modifiedCount} changes
          </span>
        </div>
      </div>

      {/* アクション */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={codeAvailable ? handleOpenInEditor : undefined}
          disabled={!codeAvailable}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-white border-0 outline-none transition-colors duration-150
            ${codeAvailable ? "bg-accent hover:bg-vs-hover active:bg-vs-active cursor-pointer" : "bg-[#4F6EF740] cursor-not-allowed opacity-60"}`}
          title={codeAvailable ? undefined : "code コマンドが必要です"}
        >
          <Code size={14} />
          VS Code
        </button>
        <button
          onClick={terminalAvailable ? handleOpenInTerminal : undefined}
          disabled={!terminalAvailable}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium border-0 outline-none transition-colors duration-150
            ${terminalAvailable ? "bg-fg-muted/20 text-fg-secondary hover:bg-fg-muted/30 active:bg-fg-muted/40 cursor-pointer" : "bg-fg-muted/10 text-fg-muted cursor-not-allowed opacity-60"}`}
          title={terminalAvailable ? undefined : "ターミナルアプリが見つかりません"}
        >
          <SquareTerminal size={14} />
          Terminal
        </button>
        {!worktree.isMain && (
          <button
            onClick={handleRemove}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium cursor-pointer border outline-none text-accent-red border-border bg-transparent hover:bg-remove-hover hover:border-accent-red active:bg-accent-red active:text-white transition-colors duration-150"
          >
            <Trash2 size={14} />
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// appStore の no-op ガードで worktrees の参照が安定している前提で、
// 1 枚のカードの props が変わらない限り再レンダーしないようにする。
export default memo(WorktreeCard);

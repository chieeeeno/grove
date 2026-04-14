import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { WorktreeInfo } from "../types";
import WorktreeCard from "./WorktreeCard";

/**
 * `SortableWorktreeCard` の props。
 *
 * `WorktreeCard` の全 props に加えて、dnd-kit のソート用 `id` を受け取る。
 */
interface SortableWorktreeCardProps {
  /** dnd-kit の sortable アイテム識別子（worktree の絶対パス） */
  id: string;
  /** 表示対象の worktree 情報 */
  worktree: WorktreeInfo;
  /** ヘッダーに表示するユーザー設定ラベル */
  label: string;
  /** `code` コマンドが利用可能か */
  codeAvailable: boolean;
  /** Terminal.app が利用可能か */
  terminalAvailable: boolean;
  /** 「VS Code で開く」コールバック */
  onOpenInEditor: (worktreePath: string) => void;
  /** 「Terminal で開く」コールバック */
  onOpenInTerminal: (worktreePath: string) => void;
  /** 「Remove」コールバック */
  onRemove: (worktreePath: string) => void;
  /** ラベル保存コールバック */
  onSaveLabel: (worktreePath: string, newLabel: string) => void;
}

/**
 * WorktreeCard を dnd-kit の useSortable でラップする薄いコンポーネント。
 *
 * ドラッグ中は opacity を下げてゴースト効果を出す。
 * WorktreeCard 本体には一切手を加えず、memo() の最適化もそのまま保持する。
 *
 * @param props SortableWorktreeCardProps
 * @returns ドラッグ可能な WorktreeCard
 */
export default function SortableWorktreeCard({
  id,
  worktree,
  label,
  codeAvailable,
  terminalAvailable,
  onOpenInEditor,
  onOpenInTerminal,
  onRemove,
  onSaveLabel,
}: SortableWorktreeCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <WorktreeCard
        worktree={worktree}
        label={label}
        codeAvailable={codeAvailable}
        terminalAvailable={terminalAvailable}
        onOpenInEditor={onOpenInEditor}
        onOpenInTerminal={onOpenInTerminal}
        onRemove={onRemove}
        onSaveLabel={onSaveLabel}
      />
    </div>
  );
}

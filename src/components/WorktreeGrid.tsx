import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { WorktreeInfo } from "../types";
import WorktreeCard from "./WorktreeCard";
import SortableWorktreeCard from "./SortableWorktreeCard";
import { resolveWorktreeDisplayName } from "../lib/filterWorktrees";
import { sortWorktrees } from "../lib/sortWorktrees";

/** WorktreeGrid / WorktreeGridSkeleton で共有するグリッドレイアウトクラス */
export const WORKTREE_GRID_CLASS = "grid grid-cols-2 gap-4";

interface WorktreeGridProps {
  worktrees: WorktreeInfo[];
  labels: Record<string, string>;
  /** 現在のリポジトリの worktree 並び順（パス配列） */
  worktreeOrder: string[];
  /** 対象リポジトリの ID（onReorder に渡す） */
  repositoryId: string;
  editorAvailable: boolean;
  terminalAvailable: boolean;
  /**
   * true のとき DnD（並び替え）を無効化し、素の `WorktreeCard` のみを描画する。
   * 絞り込みクエリが非空の間に true を渡す。並び順自体は `sortWorktrees` で従来通り尊重される。
   */
  dndDisabled: boolean;
  onOpenInEditor: (worktreePath: string) => void;
  onOpenInTerminal: (worktreePath: string) => void;
  onRemove: (worktreePath: string) => void;
  onSaveLabel: (worktreePath: string, newLabel: string) => void;
  /**
   * 並び替え完了時に呼ばれるコールバック。
   * @param repositoryId 対象リポジトリの ID
   * @param newOrder 新しい並び順（non-main worktree のパス配列）
   */
  onReorder: (repositoryId: string, newOrder: string[]) => void;
}

/**
 * worktree カードをグリッド表示し、ドラッグ&ドロップで並び替え可能にするコンポーネント。
 *
 * - main worktree は先頭固定（ドラッグ対象外）
 * - non-main worktree は `worktreeOrder` に基づいてソートされ、DnD で並び替え可能
 * - ドラッグ中は DragOverlay でゴーストカードを表示する
 *
 * @param props WorktreeGridProps
 * @returns worktree グリッド
 */
export default function WorktreeGrid({
  worktrees,
  labels,
  worktreeOrder,
  repositoryId,
  editorAvailable,
  terminalAvailable,
  dndDisabled,
  onOpenInEditor,
  onOpenInTerminal,
  onRemove,
  onSaveLabel,
  onReorder,
}: WorktreeGridProps) {
  const sorted = useMemo(() => sortWorktrees(worktrees, worktreeOrder), [worktrees, worktreeOrder]);

  const mainWorktrees = useMemo(() => sorted.filter((wt) => wt.isMain), [sorted]);
  const nonMainWorktrees = useMemo(() => sorted.filter((wt) => !wt.isMain), [sorted]);
  const nonMainIds = useMemo(() => nonMainWorktrees.map((wt) => wt.path), [nonMainWorktrees]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeWorktree = useMemo(
    () => (activeId ? (nonMainWorktrees.find((wt) => wt.path === activeId) ?? null) : null),
    [activeId, nonMainWorktrees]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = nonMainIds.indexOf(active.id as string);
      const newIndex = nonMainIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(nonMainIds, oldIndex, newIndex);
      onReorder(repositoryId, newOrder);
    },
    [nonMainIds, repositoryId, onReorder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // 絞り込み中（dndDisabled）は DnD 機構を一切使わず、sortWorktrees の並び順のまま
  // 素の WorktreeCard を描画する。main も non-main も同じ扱い。
  if (dndDisabled) {
    return (
      <div className={WORKTREE_GRID_CLASS}>
        {sorted.map((wt) => (
          <WorktreeCard
            key={wt.path}
            worktree={wt}
            label={resolveWorktreeDisplayName(wt.path, labels)}
            editorAvailable={editorAvailable}
            terminalAvailable={terminalAvailable}
            onOpenInEditor={onOpenInEditor}
            onOpenInTerminal={onOpenInTerminal}
            onRemove={onRemove}
            onSaveLabel={onSaveLabel}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={WORKTREE_GRID_CLASS}>
      {/* main worktree: ドラッグ不可、先頭固定 */}
      {mainWorktrees.map((wt) => (
        <WorktreeCard
          key={wt.path}
          worktree={wt}
          label={resolveWorktreeDisplayName(wt.path, labels)}
          editorAvailable={editorAvailable}
          terminalAvailable={terminalAvailable}
          onOpenInEditor={onOpenInEditor}
          onOpenInTerminal={onOpenInTerminal}
          onRemove={onRemove}
          onSaveLabel={onSaveLabel}
        />
      ))}

      {/* non-main worktrees: DnD で並び替え可能 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={nonMainIds} strategy={rectSortingStrategy}>
          {nonMainWorktrees.map((wt) => (
            <SortableWorktreeCard
              key={wt.path}
              id={wt.path}
              worktree={wt}
              label={resolveWorktreeDisplayName(wt.path, labels)}
              editorAvailable={editorAvailable}
              terminalAvailable={terminalAvailable}
              onOpenInEditor={onOpenInEditor}
              onOpenInTerminal={onOpenInTerminal}
              onRemove={onRemove}
              onSaveLabel={onSaveLabel}
            />
          ))}
        </SortableContext>

        <DragOverlay>
          {activeWorktree ? (
            <div className="opacity-80" style={{ cursor: "grabbing" }}>
              <WorktreeCard
                worktree={activeWorktree}
                label={resolveWorktreeDisplayName(activeWorktree.path, labels)}
                editorAvailable={editorAvailable}
                terminalAvailable={terminalAvailable}
                onOpenInEditor={onOpenInEditor}
                onOpenInTerminal={onOpenInTerminal}
                onRemove={onRemove}
                onSaveLabel={onSaveLabel}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

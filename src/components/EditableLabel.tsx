import { useState, useRef, useEffect, useCallback } from "react";
import { Pencil, Check, X } from "lucide-react";

/**
 * `EditableLabel` の props。
 */
interface EditableLabelProps {
  /** 表示中のラベル文字列（編集中はこの値がドラフトの初期値になる） */
  label: string;
  /** サブテキストとして表示するブランチ名 */
  branch: string;
  /** true のとき編集不可（Pencil ボタンを表示しない。メイン worktree はラベル固定） */
  isMain: boolean;
  /**
   * 確定ボタンまたは Cmd+Enter で呼ばれる。trim 後が空文字なら呼ばれない。
   * キャンセル時（Esc / × ボタン）には呼ばれない。
   *
   * @param newLabel trim 済みの新しいラベル文字列
   */
  onSave: (newLabel: string) => void;
  /**
   * 編集モードの開始/終了を親に通知するオプションコールバック。
   * WorktreeCard では編集中にバッジ類を隠すために利用する。
   *
   * @param editing 編集モードに入るとき true、抜けるとき false
   */
  onEditingChange?: (editing: boolean) => void;
}

/**
 * ラベルのインライン編集コンポーネント。
 *
 * Pencil アイコンで編集モードに入り、✓ or Cmd+Enter で確定、× or Esc でキャンセル。
 * Enter 単独は意図的にサポートしない（CLAUDE.md の方針: 誤操作防止のため確定は
 * ボタンまたは Cmd+Enter のみ）。
 */
export default function EditableLabel({
  label,
  branch,
  isMain,
  onSave,
  onEditingChange,
}: EditableLabelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = useCallback(() => {
    setDraft(label);
    setIsEditing(true);
    onEditingChange?.(true);
  }, [label, onEditingChange]);

  const confirm = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed.length > 0) {
      onSave(trimmed);
    }
    setIsEditing(false);
    onEditingChange?.(false);
  }, [draft, onSave, onEditingChange]);

  const cancel = useCallback(() => {
    setDraft(label);
    setIsEditing(false);
    onEditingChange?.(false);
  }, [label, onEditingChange]);

  /**
   * キー入力ハンドラ。
   * - Esc: 編集キャンセル
   * - Cmd+Enter: 確定
   *
   * Enter 単独は意図的にハンドリングしない（CLAUDE.md のプロジェクト方針:
   * 誤操作防止のため Enter 単独での確定は禁止）。将来「Enter で確定」を追加したい
   * 場合は、先に方針の見直しが必要。
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        cancel();
      } else if (e.key === "Enter" && e.metaKey) {
        confirm();
      }
    },
    [cancel, confirm]
  );

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 text-[14px] rounded-md px-2.5 py-1.5 outline-none bg-input text-fg border border-accent"
          />
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={confirm}
              className="flex items-center justify-center rounded-md p-1.5 border-0 outline-none cursor-pointer bg-accent text-white hover:bg-vs-hover active:bg-vs-active transition-colors duration-150"
              title="確定 (Cmd+Enter)"
            >
              <Check size={14} />
            </button>
            <button
              onClick={cancel}
              className="flex items-center justify-center rounded-md p-1.5 border border-border outline-none cursor-pointer bg-transparent text-fg-muted hover:bg-card-hover transition-colors duration-150"
              title="キャンセル (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <span className="text-[11px] truncate text-fg-muted">{branch}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-[15px] font-semibold truncate text-fg">{label}</span>
        <span className="text-[11px] truncate text-fg-muted">{branch}</span>
      </div>
      {!isMain && (
        <button
          onClick={startEditing}
          className="flex items-center justify-center rounded-md p-1 border-0 outline-none cursor-pointer shrink-0 bg-transparent text-fg-muted hover:bg-card-hover active:bg-accent active:text-white transition-colors duration-150"
          title="ラベルを編集"
        >
          <Pencil size={13} />
        </button>
      )}
    </div>
  );
}

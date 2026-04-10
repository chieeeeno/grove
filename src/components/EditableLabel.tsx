import { useState, useRef, useEffect, useCallback } from "react";
import { Pencil, Check, X } from "lucide-react";

interface EditableLabelProps {
  label: string;
  branch: string;
  isMain: boolean;
  onSave: (newLabel: string) => void;
  onEditingChange?: (editing: boolean) => void;
}

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

  // 編集モードに入ったらフォーカス
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        cancel();
      } else if (e.key === "Enter" && e.metaKey) {
        // Cmd+Enter で確定（ADR-0008: Enter 単独では確定しない）
        confirm();
      }
    },
    [cancel, confirm]
  );

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        {/* input + ボタンを同じ行に中央揃え */}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 text-[14px] rounded-md px-2.5 py-1.5 outline-none"
            style={{
              backgroundColor: "var(--bg-input)",
              color: "var(--text-primary)",
              border: "1px solid var(--accent-primary)",
            }}
          />
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={confirm}
              className="flex items-center justify-center rounded-md p-1.5 border-0 outline-none cursor-pointer"
              style={{ backgroundColor: "var(--accent-primary)", color: "#FFFFFF" }}
              title="確定 (Cmd+Enter)"
            >
              <Check size={14} />
            </button>
            <button
              onClick={cancel}
              className="flex items-center justify-center rounded-md p-1.5 border outline-none cursor-pointer"
              style={{
                backgroundColor: "transparent",
                borderColor: "var(--border-default)",
                color: "var(--text-muted)",
              }}
              title="キャンセル (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <span className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
          {branch}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span
          className="text-[15px] font-semibold truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </span>
        <span className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
          {branch}
        </span>
      </div>
      {/* main worktree は編集不可 */}
      {!isMain && (
        <button
          onClick={startEditing}
          className="flex items-center justify-center rounded-md p-1 border-0 outline-none cursor-pointer shrink-0"
          style={{ backgroundColor: "transparent", color: "var(--text-muted)" }}
          title="ラベルを編集"
        >
          <Pencil size={13} />
        </button>
      )}
    </div>
  );
}

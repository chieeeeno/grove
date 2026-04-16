/**
 * テスト用の `KeyboardEvent` 生成ヘルパー。
 *
 * jsdom の `KeyboardEvent` コンストラクタは `key` と修飾キー（`metaKey` 等）は
 * 受け付けるが、`isComposing` は `KeyboardEventInit` で初期化できない（仕様上 read-only）。
 * IME 変換中の挙動をテストする箇所があるため、`isComposing` を指定された場合は
 * `Object.defineProperty` で後付けセットする。
 *
 * @param type - イベント種別（`"keydown"` / `"keyup"`）
 * @param init - `KeyboardEventInit` に加えて、`isComposing` を任意指定可能
 * @returns dispatch 可能な `KeyboardEvent`
 */
export function createKeyboardEvent(
  type: "keydown" | "keyup",
  init: Partial<KeyboardEventInit> & { isComposing?: boolean } = {}
): KeyboardEvent {
  const event = new KeyboardEvent(type, init);
  if (init.isComposing !== undefined) {
    Object.defineProperty(event, "isComposing", { value: init.isComposing });
  }
  return event;
}

/**
 * POSIX パスの末尾ディレクトリ名を取り出す。
 *
 * - 区切り文字は `/` のみ対応（Windows バックスラッシュは非対応）
 * - trailing slash 付き（`/a/b/c/`）のように `pop()` 結果が空になる場合は、
 *   フォールバックとして入力をそのまま返す
 * - Grove は macOS 専用なので実質的に POSIX 前提で問題ない
 *
 * @param path POSIX 絶対パス（末尾スラッシュありでも可）
 * @returns 末尾ディレクトリ名。変換できなかった場合は入力 `path` をそのまま返す
 *
 * @example
 * dirName("/a/b/c")   // → "c"
 * dirName("/a/b/c/")  // → "/a/b/c/"（フォールバック）
 * dirName("foo")      // → "foo"
 */
export function dirName(path: string): string {
  return path.split("/").pop() || path;
}

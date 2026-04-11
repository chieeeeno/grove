/** パスの末尾ディレクトリ名を取り出す（`/a/b/c` → `c`） */
export function dirName(path: string): string {
  return path.split("/").pop() || path;
}

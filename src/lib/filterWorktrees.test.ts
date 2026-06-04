import { describe, it, expect } from "vitest";
import { filterWorktrees, resolveWorktreeDisplayName } from "./filterWorktrees";
import { mockWorktree, mockSubWorktree } from "../test/fixtures";

describe("resolveWorktreeDisplayName", () => {
  it("ラベルが設定されていればラベルを返す", () => {
    const labels = { "/repo/feature-a": "機能A" };
    expect(resolveWorktreeDisplayName("/repo/feature-a", labels)).toBe("機能A");
  });

  it("ラベル未設定なら dirName（末尾ディレクトリ名）を返す", () => {
    expect(resolveWorktreeDisplayName("/repo/feature-a", {})).toBe("feature-a");
  });
});

describe("filterWorktrees", () => {
  const main = mockWorktree({ path: "/repo/main", branch: "main" });
  const featureA = mockSubWorktree({ path: "/repo/feature-login", branch: "feature/login" });
  const featureB = mockSubWorktree({ path: "/repo/bugfix-cache", branch: "bugfix/cache" });
  const all = [main, featureA, featureB];

  it("空クエリのときは元の配列をそのまま（同一参照で）返す", () => {
    expect(filterWorktrees(all, "", {})).toBe(all);
  });

  it("trim 後が空（空白のみ）のクエリも全件（同一参照で）返す", () => {
    expect(filterWorktrees(all, "   ", {})).toBe(all);
  });

  it("表示名（dirName）に部分一致する worktree だけを返す", () => {
    const result = filterWorktrees(all, "login", {});
    expect(result).toEqual([featureA]);
  });

  it("ブランチ名に部分一致する worktree だけを返す", () => {
    const result = filterWorktrees(all, "bugfix", {});
    expect(result).toEqual([featureB]);
  });

  it("大文字小文字を区別せず一致する", () => {
    const result = filterWorktrees(all, "LOGIN", {});
    expect(result).toEqual([featureA]);
  });

  it("クエリ前後の空白は無視して判定する", () => {
    const result = filterWorktrees(all, "  login  ", {});
    expect(result).toEqual([featureA]);
  });

  it("ラベルが設定されている場合はラベルに対して一致する", () => {
    const labels = { "/repo/feature-login": "ログイン画面" };
    const result = filterWorktrees(all, "ログイン", labels);
    expect(result).toEqual([featureA]);
  });

  it("ラベル設定後はディレクトリ名では一致しなくなる（ラベル優先）", () => {
    const labels = { "/repo/feature-login": "ログイン画面" };
    const result = filterWorktrees(all, "login", labels);
    // 表示名はラベルになるが、ブランチ名 "feature/login" は依然一致する
    expect(result).toEqual([featureA]);
  });

  it("一致しないクエリでは空配列を返す", () => {
    expect(filterWorktrees(all, "存在しない", {})).toEqual([]);
  });

  it("元の配列を破壊しない（非破壊）", () => {
    const input = [...all];
    filterWorktrees(input, "login", {});
    expect(input).toEqual(all);
    expect(input).toHaveLength(3);
  });
});

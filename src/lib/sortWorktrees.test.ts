import { describe, it, expect } from "vitest";
import { sortWorktrees } from "./sortWorktrees";
import { mockWorktree, mockSubWorktree } from "../test/fixtures";

describe("sortWorktrees", () => {
  const main = mockWorktree({ path: "/repo/main" });
  const featureA = mockSubWorktree({ path: "/repo/feature-a", branch: "feature-a" });
  const featureB = mockSubWorktree({ path: "/repo/feature-b", branch: "feature-b" });
  const featureC = mockSubWorktree({ path: "/repo/feature-c", branch: "feature-c" });

  it("main worktree が常に先頭に来る", () => {
    const result = sortWorktrees([featureA, main, featureB], []);
    expect(result[0].isMain).toBe(true);
  });

  it("order が空の場合は main 先頭 + 残りは元の順序", () => {
    const result = sortWorktrees([main, featureA, featureB], []);
    expect(result.map((w) => w.path)).toEqual(["/repo/main", "/repo/feature-a", "/repo/feature-b"]);
  });

  it("order 通りにソートされる", () => {
    const order = ["/repo/feature-b", "/repo/feature-a"];
    const result = sortWorktrees([main, featureA, featureB], order);
    expect(result.map((w) => w.path)).toEqual(["/repo/main", "/repo/feature-b", "/repo/feature-a"]);
  });

  it("order に含まれない新規 worktree は末尾に追加される", () => {
    const order = ["/repo/feature-a"];
    const result = sortWorktrees([main, featureA, featureB, featureC], order);
    expect(result.map((w) => w.path)).toEqual([
      "/repo/main",
      "/repo/feature-a",
      "/repo/feature-b",
      "/repo/feature-c",
    ]);
  });

  it("order に含まれるが worktrees に存在しないパスは無視される", () => {
    const order = ["/repo/deleted", "/repo/feature-b", "/repo/feature-a"];
    const result = sortWorktrees([main, featureA, featureB], order);
    expect(result.map((w) => w.path)).toEqual(["/repo/main", "/repo/feature-b", "/repo/feature-a"]);
  });

  it("worktrees が空の場合は空配列を返す", () => {
    const result = sortWorktrees([], ["/repo/feature-a"]);
    expect(result).toEqual([]);
  });

  it("main のみの場合は main だけ返す", () => {
    const result = sortWorktrees([main], ["/repo/feature-a"]);
    expect(result).toEqual([main]);
  });

  it("元の配列を変更しない（非破壊）", () => {
    const original = [main, featureA, featureB];
    const originalCopy = [...original];
    sortWorktrees(original, ["/repo/feature-b", "/repo/feature-a"]);
    expect(original).toEqual(originalCopy);
  });
});

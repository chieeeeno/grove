import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { relativeTime } from "./time";

describe("relativeTime", () => {
  beforeEach(() => {
    // 2026-04-11 00:00:00 UTC に固定
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("timestamp が 0 なら空文字を返す", () => {
    expect(relativeTime(0)).toBe("");
  });

  it("60秒未満なら「たった今」を返す", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(relativeTime(now - 30)).toBe("たった今");
  });

  it("分単位の相対時間を返す", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(relativeTime(now - 300)).toBe("5分前");
  });

  it("時間単位の相対時間を返す", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(relativeTime(now - 7200)).toBe("2時間前");
  });

  it("日単位の相対時間を返す", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(relativeTime(now - 259200)).toBe("3日前");
  });

  it("7日以上は日付フォーマットを返す", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(relativeTime(now - 864000)).toBe("4/1");
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MainArea from "./MainArea";

const noop = vi.fn();

const baseProps = {
  selectedRepositoryName: "test-repo",
  selectedRepositoryPath: "/mock/test-repo",
  isRefreshing: false,
  isFetching: false,
  lastFetchedAt: null as number | null,
  onRefresh: noop,
};

describe("MainArea", () => {
  beforeEach(() => {
    // relativeTime() の挙動を固定するため現在時刻を pin する
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("リポジトリ未選択", () => {
    it("selectedRepositoryName が null のときは案内メッセージのみ表示", () => {
      render(<MainArea {...baseProps} selectedRepositoryName={null} />);
      expect(screen.getByText("リポジトリを選択してください")).toBeInTheDocument();
      // ヘッダー要素（リフレッシュボタン等）は描画されない
      expect(screen.queryByTitle(/リフレッシュ/)).toBeNull();
    });
  });

  describe("Last fetched 表示（Issue #8）", () => {
    it("lastFetchedAt=null のとき『Last fetched:』テキストは表示されない", () => {
      render(<MainArea {...baseProps} lastFetchedAt={null} />);
      expect(screen.queryByText(/Last fetched:/)).toBeNull();
    });

    it("lastFetchedAt が設定されていれば『Last fetched:』が相対時刻付きで表示される", () => {
      // 現在時刻から 120 秒前 = 2 分前
      const fetchedAt = Math.floor(Date.now() / 1000) - 120;
      render(<MainArea {...baseProps} lastFetchedAt={fetchedAt} />);
      expect(screen.getByText(/Last fetched:/)).toHaveTextContent("2分前");
    });

    it("lastFetchedAt が直近（relativeTime が空文字になる 0 扱い境界）は『たった今』にフォールバック", () => {
      // timestampSecs === 0 のときだけ relativeTime は "" を返すが、
      // lastFetchedAt が 0 になるケースは実運用では稀。フォールバック表示を保証する
      render(<MainArea {...baseProps} lastFetchedAt={0} />);
      expect(screen.getByText(/Last fetched:/)).toHaveTextContent("たった今");
    });
  });

  describe("リフレッシュボタンの disabled", () => {
    it("isRefreshing=true のとき disabled + spin アニメーション", () => {
      render(<MainArea {...baseProps} isRefreshing={true} />);
      const btn = screen.getByTitle(/リフレッシュ/);
      expect(btn).toBeDisabled();
      expect(btn.querySelector("svg")?.getAttribute("class")).toContain("animate-spin");
    });

    it("isFetching=true のとき disabled + spin アニメーション + title が『fetch 中...』", () => {
      render(<MainArea {...baseProps} isFetching={true} />);
      const btn = screen.getByTitle("fetch 中...");
      expect(btn).toBeDisabled();
      expect(btn.querySelector("svg")?.getAttribute("class")).toContain("animate-spin");
    });

    it("両方 false のときボタンは有効", () => {
      render(<MainArea {...baseProps} />);
      const btn = screen.getByTitle(/リフレッシュ/);
      expect(btn).not.toBeDisabled();
      expect(btn.querySelector("svg")?.getAttribute("class")).not.toContain("animate-spin");
    });
  });
});

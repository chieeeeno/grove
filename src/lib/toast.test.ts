import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import { toastRetryableError, toastError } from "./toast";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("toast ユーティリティ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("toastError", () => {
    it("toast.error にメッセージを渡す", () => {
      toastError("テストエラー");
      expect(toast.error).toHaveBeenCalledWith("テストエラー");
    });
  });

  describe("toastRetryableError", () => {
    it("toast.error に action 付きオプションを渡す", () => {
      const onRetry = vi.fn();
      toastRetryableError("リトライ可能エラー", onRetry);

      expect(toast.error).toHaveBeenCalledWith("リトライ可能エラー", {
        action: {
          label: "再試行",
          onClick: onRetry,
        },
        duration: 5000,
      });
    });

    it("action.onClick に渡したコールバックが呼び出せる", () => {
      const onRetry = vi.fn();
      toastRetryableError("エラー", onRetry);

      // toast.error に渡された action.onClick を取り出して呼ぶ
      const call = vi.mocked(toast.error).mock.calls[0];
      const options = call[1] as { action: { onClick: () => void } };
      options.action.onClick();

      expect(onRetry).toHaveBeenCalledOnce();
    });
  });
});

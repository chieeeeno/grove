import { toast } from "sonner";

/**
 * リトライ可能なエラーをトースト表示する。
 *
 * Sonner の action オプションで「再試行」ボタンを付与し、ユーザーが即座にリトライ
 * できる導線を提供する。表示時間はリトライ操作に余裕を持たせるため 5 秒に設定。
 *
 * @param message エラーメッセージ（日本語）
 * @param onRetry 再試行ボタン押下時に実行されるコールバック
 */
export function toastRetryableError(message: string, onRetry: () => void): void {
  toast.error(message, {
    action: {
      label: "再試行",
      onClick: onRetry,
    },
    duration: 5000,
  });
}

/**
 * シンプルなエラートースト表示。
 *
 * `toast.error` の薄いラッパー。全エラートーストをこのモジュール経由に統一し、
 * 将来の表示ポリシー変更（duration、スタイル等）を一箇所で制御するための関数。
 *
 * @param message エラーメッセージ（日本語）
 */
export function toastError(message: string): void {
  toast.error(message);
}

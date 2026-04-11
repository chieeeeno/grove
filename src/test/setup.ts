import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { clearMocks } from "@tauri-apps/api/mocks";

/**
 * Grove のテスト環境セットアップ
 *
 * - jest-dom のマッチャーを有効化
 * - 各テスト後に Tauri の IPC モックを自動クリア
 *
 * IPC モックは各テストで `mockIPC()` を呼んでセットする。
 * 詳細は docs/testing-strategy.md を参照。
 */

afterEach(() => {
  clearMocks();
});

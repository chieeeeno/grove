import "@testing-library/jest-dom/vitest";

// Tauri API のモック（テスト環境では Tauri が存在しない）
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-store", () => ({
  Store: vi.fn(),
}));

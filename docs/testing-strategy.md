# Grove テスト戦略

> Grove プロジェクトのテスト方針。新機能実装時はこのドキュメントを参照する。
>
> 最終更新: 2026-04-11

---

## TL;DR（先に結論）

Grove は **3層 + Manual QA** の構成でテストする。E2E 自動化は実施しない。

```
┌─────────────────────────────────────────────┐
│ Layer 1: Rust 単体・統合テスト               │
│ → cargo test + tauri::test::MockRuntime    │
├─────────────────────────────────────────────┤
│ Layer 2: フロントエンド単体・統合テスト       │
│ → Vitest + @tauri-apps/api/mocks (mockIPC) │
├─────────────────────────────────────────────┤
│ Layer 3: Manual QA                          │
│ → docs/qa-checklist.md（リリース前）        │
└─────────────────────────────────────────────┘
```

判断ルール:
- **Rust コマンド** → Layer 1（cargo test）
- **TypeScript 関数・React コンポーネント・フック** → Layer 2（Vitest）
- **ネイティブ機能・統合動作の最終確認** → Layer 3（Manual QA）

E2E 自動化（Playwright / WebdriverIO）は M0 では採用しない。理由は後述。

---

## 1. 背景と前提

### 1.1 Grove の制約

- **macOS only**（ADR-0004）
  - 開発者本人が他 OS の実機を持っていない
  - Phase 2 の Claude Code 連携で OS 別 API 対応を避けたい
- **個人開発**
  - メンテナンスコストを最小化したい
  - 1 人で全てを把握できる構成にしたい
- **継続的なフィードバックループの確保**
  - テストが遅いと書かなくなる
  - flaky テストは継続的開発の天敵

### 1.2 Tauri 公式が提供しているテスト機能

公式ドキュメント（`https://v2.tauri.app/develop/tests/`）で推奨される構成は：

| 機能 | 提供物 | 用途 |
|------|--------|------|
| **mockIPC** | `@tauri-apps/api/mocks` | フロントエンドから IPC をモック |
| **MockRuntime** | `tauri::test::MockRuntime` | Rust 側で webview を起動せずアプリコンテキストを再現 |
| **WebDriver (tauri-driver)** | 別バイナリ | E2E テスト（macOS 非対応） |

これらを組み合わせて、Tauri 公式は「ユニット → 統合 → E2E」の階層を構築することを推奨している。

### 1.3 E2E 自動化が難しい理由

#### 理由 A: tauri-driver は macOS 非対応

Tauri 公式ドキュメントより:
> WebDriver is only supported on Windows and Linux,
> macOS which does not provide a desktop WebDriver client.

macOS には WKWebView の WebDriver サーバーが存在しないため、`tauri-driver` を使った
ネイティブアプリ全体の E2E テストは物理的に不可能。

#### 理由 B: Playwright も Tauri では直接動かない

Tauri は **WebKitGTK (Linux) / WKWebView (macOS)** を WebView として使用している。
一方 Playwright は **Chromium / Firefox / WebKit (Safari ベース)** をサポートするが、
WebKitGTK や WKWebView を直接ドライブする機能はない。

代替案として「Vite dev server (`localhost:1420`) を Playwright のブラウザモードで開く」
方法はあるが、その場合 Tauri API を別途モックする必要があり、結局 `mockIPC` と
重複してしまう。さらに「実際の Tauri アプリ」を検証したことにならず、E2E テストの
価値が薄れる。

#### 理由 C: サードパーティ実装は成熟度不足

`srsholmes/tauri-playwright` のようなサードパーティライブラリも存在するが、
2026 年 4 月時点で広く採用されている事例は少なく、メンテナンス継続性も不明。

### 1.4 結論

**Grove は macOS only である限り、E2E 自動化は採用しない。**

代わりに、以下の3層 + Manual QA で品質を担保する。

---

## 2. Grove のテスト構成（3層 + Manual QA）

### Layer 1: Rust 単体・統合テスト

| 項目 | 内容 |
|------|------|
| **ツール** | `cargo test` + `tauri::test::MockRuntime`（任意） |
| **対象** | Rust 関数・Tauri コマンド |
| **配置** | 各 `.rs` ファイル内の `#[cfg(test)] mod tests { ... }` |
| **実行コマンド** | `cargo test --manifest-path src-tauri/Cargo.toml --lib` |
| **CI** | lefthook の pre-commit で自動実行 |

#### 何をテストするか

- ✅ Tauri コマンドの個別動作（`list_worktrees`, `get_worktree_status` 等）
- ✅ git2 を使った worktree 操作
- ✅ ファイル I/O（一時ディレクトリで実施）
- ✅ エラーハンドリングのパス
- ⚠️ AppHandle を要求するコマンド（`load_config`, `save_config` 等）は
  `MockRuntime` が必要（タスク14-3 で導入検討）

#### テストヘルパー

`worktree.rs` に `create_test_repo()` ヘルパーがある:
```rust
fn create_test_repo() -> (TempDir, Repository) {
    let dir = TempDir::new().unwrap();
    let repo = Repository::init(dir.path()).unwrap();
    // 初期コミットを作成
    // ...
    (dir, repo)
}
```

`tempfile` クレートで一時ディレクトリを作成し、テスト終了時に自動クリーンアップされる。

---

### Layer 2: フロントエンド単体・統合テスト

| 項目 | 内容 |
|------|------|
| **ツール** | Vitest + `@testing-library/react` + `@tauri-apps/api/mocks` |
| **対象** | TypeScript 関数・React コンポーネント・カスタムフック・Zustand store |
| **配置** | 実装ファイルと同階層に `*.test.ts(x)` |
| **実行コマンド** | `pnpm test` / `pnpm test:watch` |
| **CI** | lefthook の pre-commit で自動実行 |

#### 何をテストするか

- ✅ ユーティリティ関数（`relativeTime` 等）
- ✅ Zustand store の actions
- ✅ React コンポーネントの表示・状態遷移
- ✅ カスタムフック（`useAutoRefresh`, `useKeyboardShortcuts` 等）
- ✅ ユーザー操作のフロー（クリック・キー入力・編集モード切替）
- ✅ Tauri IPC 呼び出しのモック（`mockIPC`）

#### モック戦略: 公式 `mockIPC` に統一

Grove では IPC モックに **公式の `@tauri-apps/api/mocks` の `mockIPC`** を使う。
`vi.mock("@tauri-apps/api/core")` のような自作モックは使わない。

理由:
- 公式 API なので Tauri 側のアップデートに追従しやすい
- `mockIPC` は内部で `window.__TAURI_INTERNALS__.invoke` を上書きするため、
  実際のアプリと同じ経路をテストできる
- `vi.spyOn` と組み合わせて呼び出し回数や引数を検証できる
- `clearMocks()` で安全にリセットできる

#### テンプレート

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";
import { invoke } from "@tauri-apps/api/core";

describe("loadConfig", () => {
  beforeEach(() => {
    mockIPC((cmd, args) => {
      if (cmd === "load_config") {
        return {
          repositories: [],
          editor: "vscode",
          theme: "system",
          refreshInterval: 5000,
        };
      }
    });
  });

  afterEach(() => {
    clearMocks();
  });

  it("空の設定を返す", async () => {
    const config = await invoke("load_config");
    expect(config.repositories).toHaveLength(0);
  });
});
```

#### 共通モックデータの管理

繰り返し使うモックデータ（リポジトリ・worktree 等）は `src/test/fixtures.ts` に集約する。

```ts
// src/test/fixtures.ts
export const mockRepository = (overrides = {}) => ({
  id: "repo-1",
  name: "test-repo",
  path: "/mock/test-repo",
  addedAt: "2026-04-10T00:00:00Z",
  ...overrides,
});
```

---

### Layer 3: Manual QA

| 項目 | 内容 |
|------|------|
| **ツール** | 手動操作（actual Grove.app） |
| **対象** | ネイティブ機能・統合動作の最終検証 |
| **配置** | `docs/qa-checklist.md`（約80テストケース） |
| **実行タイミング** | リリース前（M0 完成時 / M1 リリース時） |
| **CI** | なし（手動） |

#### Manual QA でしか検証できないこと

- ネイティブファイル選択ダイアログの操作感
- macOS Dock のアイコン表示
- VS Code の実際の起動と worktree 表示
- Cmd+Tab でのアプリスイッチャー表示
- Finder でのアイコン表示
- 「開発元を確認できません」警告と回避手順
- パフォーマンス（CPU・メモリ・体感速度）
- ウィンドウサイズ・位置の永続化（tauri-plugin-window-state）
- ドラッグ&ドロップ（M1 で実装予定の並び替え機能）
- システムスリープ・復帰時の挙動

#### Manual QA の運用

- **リリース前に1回**だけ実施する関所として運用
- 不具合が見つかったら issue 化 → 修正 → 再実施
- チェック実施履歴を `docs/qa-checklist.md` の末尾に記録

---

## 3. 新機能実装時の判断フロー

新機能を追加する時、どの層でテストを書くか迷ったらこのフローに従う：

```
新機能実装

  ↓

Q1: Rust コードを追加・変更したか？
  ├─ YES → Layer 1 (cargo test) でテストを書く
  └─ NO  → ↓

Q2: TypeScript 関数・コンポーネント・フック・store を追加・変更したか？
  ├─ YES → Layer 2 (Vitest) でテストを書く
  └─ NO  → ↓

Q3: ネイティブ機能（ダイアログ、ファイル I/O、プロセス起動等）を追加・変更したか？
  ├─ YES → Layer 3 (Manual QA のチェック項目に追加) → docs/qa-checklist.md
  └─ NO  → テスト不要（純粋な型定義変更等）
```

### 具体例

| 変更内容 | 書くテスト |
|----------|-----------|
| 新しい Rust コマンドを追加 | Layer 1: 単体テスト + Layer 2: invoke 経由のテスト（mockIPC） |
| 新しい React コンポーネントを追加 | Layer 2: コンポーネントテスト |
| 新しい Zustand store の action を追加 | Layer 2: store テスト |
| 新しいカスタムフックを追加 | Layer 2: フックテスト（renderHook） |
| 新しい設定項目を追加（UI + 永続化） | Layer 1: Rust 側 + Layer 2: フロント側 + Layer 3: Manual QA |
| アイコン変更 | Layer 3: Manual QA のみ |
| 新しいネイティブダイアログ | Layer 3: Manual QA + Layer 2: モックでの呼び出し検証 |

### 「テストを書かない」を選ぶ場面

以下は明示的に「テスト不要」とする：

- 純粋な型定義の追加・変更
- ドキュメント・コメントの修正
- リファクタ（既存テストでカバー済みの場合）
- アイコン・画像・CSS の変更

---

## 4. テストの実行方法

### ローカル実行

```bash
# フロントエンド
pnpm test          # 1回実行
pnpm test:watch    # ウォッチモード

# Rust
cargo test --manifest-path src-tauri/Cargo.toml --lib

# 全部一気に（lefthook 経由）
git commit  # pre-commit hook で自動実行される
```

### CI（pre-commit）

`lefthook.yml` で以下が自動実行される：

| ツール | 対象ファイル | 内容 |
|--------|------------|------|
| `oxlint` | `*.{ts,tsx}` | リント |
| `prettier` | `*.{ts,tsx}` | フォーマット（自動修正） |
| `vitest` | `*.{ts,tsx}` | フロントエンドテスト |
| `rustfmt` | `*.rs` | フォーマット（自動修正） |
| `clippy` | `*.rs` | リント |
| `cargo-test` | `*.rs` | Rust テスト |

テストが失敗すると **commit がブロック** される。

---

## 5. M2 以降の再検討事項

### Windows / Linux 対応時に E2E を再検討

Grove が M2 以降で macOS 以外をサポートする場合、E2E 自動化を再検討する。

選択肢:
- **tauri-driver + WebdriverIO**
  - Windows / Linux 向けの公式推奨経路
  - Tauri 公式ドキュメントに WebdriverIO の例あり
  - 設定が重いが、ネイティブ機能も含めて検証可能
- **CLI ベースの独自フレームワーク**
  - dev.to で「自作した」事例あり
  - メンテコストが見えにくい

ただし、macOS 対応が残っている限り、macOS 側は引き続き Manual QA に頼ることになる。

### Rust 側に MockRuntime を導入

`AppHandle` を要求するコマンド（`load_config`, `save_config`, `load_labels` 等）は
現時点では単体テストできていない。`tauri::test::MockRuntime` を導入することで
これらの統合テストを書けるようになる。

優先度: **任意（M1 で対応してもよい）**

---

## 6. 参考リンク

- [Tauri 2 公式 Testing ガイド](https://v2.tauri.app/develop/tests/)
- [Mock Tauri APIs](https://v2.tauri.app/develop/tests/mocking/)
- [WebDriver | Tauri](https://v2.tauri.app/develop/tests/webdriver/)
- [MockRuntime in tauri::test - Rust](https://docs.rs/tauri/2.0.0/tauri/test/struct.MockRuntime.html)
- [ADR-0004: 対応OSを macOS のみとする](./adr/0004-target-os.md)
- [ADR-0013: リフレッシュ戦略](./adr/0013-refresh-strategy.md)
- [docs/qa-checklist.md](./qa-checklist.md)

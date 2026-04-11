import { useEffect, useCallback, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import Sidebar from "./components/Sidebar";
import MainArea from "./components/MainArea";
import WorktreeGrid from "./components/WorktreeGrid";
import DeleteDialog from "./components/DeleteDialog";
import PreflightBanner from "./components/PreflightBanner";
import SettingsDialog from "./components/SettingsDialog";
import { useAutoRefresh } from "./hooks/useAutoRefresh";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useAppStore } from "./stores/appStore";
import { dirName } from "./lib/path";
import {
  validateRepository,
  loadConfig,
  saveConfig,
  openInEditor,
  loadLabels,
  saveLabel,
  checkBeforeRemove,
  removeWorktree,
  deleteLabel,
  checkCodeCommand,
} from "./lib/tauri";
import type { AppConfig, RepositoryConfig } from "./types";

/**
 * 現在の store 状態から `AppConfig` を組み立てるヘルパー。
 *
 * 設定保存は常にこのヘルパー経由で行う。部分更新時に他のフィールドをハードコード
 * すると保存済み設定を上書きしてしまうため、常に現在の store 全体から組み立てる。
 *
 * @returns 現在の store 状態を反映した `AppConfig`
 */
function buildConfigFromStore(): AppConfig {
  const state = useAppStore.getState();
  return {
    repositories: state.repositories,
    editor: "vscode",
    theme: "system",
    refreshInterval: state.refreshInterval,
  };
}

function App() {
  // 個別セレクタで購読する（引数なしの useAppStore() だと全 state 購読になり、
  // 関係ない変更でも App 全体が再レンダーする）
  const repositories = useAppStore((s) => s.repositories);
  const selectedRepositoryId = useAppStore((s) => s.selectedRepositoryId);
  const worktrees = useAppStore((s) => s.worktrees);
  const labels = useAppStore((s) => s.labels);
  const codeAvailable = useAppStore((s) => s.codeAvailable);
  const isRefreshing = useAppStore((s) => s.isRefreshing);
  const refreshInterval = useAppStore((s) => s.refreshInterval);

  // actions は参照安定なので個別取得でよい
  const addRepository = useAppStore((s) => s.addRepository);
  const removeRepository = useAppStore((s) => s.removeRepository);
  const selectRepository = useAppStore((s) => s.selectRepository);
  const setRepositories = useAppStore((s) => s.setRepositories);
  const setLabel = useAppStore((s) => s.setLabel);
  const setAllLabels = useAppStore((s) => s.setAllLabels);
  const removeLabel = useAppStore((s) => s.removeLabel);
  const removeWorktreeEntry = useAppStore((s) => s.removeWorktreeEntry);
  const setCodeAvailable = useAppStore((s) => s.setCodeAvailable);
  const setRefreshInterval = useAppStore((s) => s.setRefreshInterval);

  // 自動リフレッシュ（ADR-0013: 5秒ポーリング）
  const { refresh } = useAutoRefresh();

  // キーボードショートカット（Cmd+R でリフレッシュ）
  useKeyboardShortcuts({ onRefresh: refresh });

  // ===== 設定変更 =====

  /**
   * 設定ダイアログから自動更新間隔の変更を受けるハンドラ。
   * store の値を更新し、現在の設定全体を永続化する。
   *
   * @param interval 新しいポーリング間隔（ms）
   */
  const handleChangeRefreshInterval = useCallback(
    async (interval: number) => {
      setRefreshInterval(interval);
      await saveConfig(buildConfigFromStore()).catch(console.error);
    },
    [setRefreshInterval]
  );

  // 設定ダイアログの状態
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 削除ダイアログの状態
  const [deleteTarget, setDeleteTarget] = useState<{
    path: string;
    name: string;
    branch: string;
    hasUncommitted: boolean;
    modifiedCount: number;
  } | null>(null);

  // ===== 起動時: config + ラベル読み込み =====
  useEffect(() => {
    loadConfig()
      .then((config) => {
        setRepositories(config.repositories);
        if (config.refreshInterval) {
          setRefreshInterval(config.refreshInterval);
        }
        if (config.repositories.length > 0) {
          selectRepository(config.repositories[0].id);
        }
      })
      .catch(console.error);

    loadLabels().then(setAllLabels).catch(console.error);
    checkCodeCommand().then(setCodeAvailable).catch(console.error);
  }, [setRepositories, selectRepository, setAllLabels, setCodeAvailable, setRefreshInterval]);

  // ===== リポジトリ追加 =====

  /**
   * サイドバー「リポジトリを追加」ボタンから呼ばれる。
   * ネイティブのディレクトリ選択ダイアログを開き、選択されたパスを validate してから
   * store に追加する。既に登録済みのパスだった場合はサイレントに no-op
   * （UI エラーは出さない）。
   *
   * 副作用: 新規追加したリポジトリを選択状態にし、設定を非同期に永続化する。
   * 永続化失敗は `console.error` のみ（M0 では UI フィードバック未実装）。
   */
  const handleAddRepository = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || typeof selected !== "string") return;

    try {
      const info = await validateRepository(selected);
      const current = useAppStore.getState().repositories;
      if (current.some((r) => r.path === info.path)) return;

      const newRepo: RepositoryConfig = {
        id: info.id,
        name: info.name,
        path: info.path,
        addedAt: new Date().toISOString(),
      };

      addRepository(newRepo);
      selectRepository(newRepo.id);
      saveConfig(buildConfigFromStore()).catch((err) => console.error("設定保存に失敗:", err));
    } catch (e) {
      console.error("リポジトリの追加に失敗しました:", e);
    }
  }, [addRepository, selectRepository]);

  // ===== リポジトリ削除 =====

  /**
   * サイドバーのリポジトリ項目「×」ボタンから呼ばれる（登録解除。実体は触らない）。
   * 選択中だったリポジトリを削除した場合は、残りの先頭を自動選択する
   * （残りゼロなら `null` に設定）。設定の永続化は非同期に走らせる（UI を待たせない）。
   *
   * @param id 削除対象のリポジトリ ID
   */
  const handleRemoveRepository = useCallback(
    (id: string) => {
      removeRepository(id);

      if (selectedRepositoryId === id) {
        const remaining = useAppStore.getState().repositories;
        selectRepository(remaining.length > 0 ? remaining[0].id : null);
      }

      saveConfig(buildConfigFromStore()).catch((err) => console.error("設定保存に失敗:", err));
    },
    [selectedRepositoryId, removeRepository, selectRepository]
  );

  // ===== ラベル保存 =====

  /**
   * ラベル編集の確定時に呼ばれる。in-memory の store を即座に更新（楽観更新）してから
   * IPC で永続化する。IPC 失敗時は `console.error` のみで UI は巻き戻さない
   * （M0 の割り切り。失敗例は稀で、次回起動時にストアから読み直される）。
   *
   * @param worktreePath 対象 worktree の絶対パス
   * @param newLabel 新しいラベル文字列
   */
  const handleSaveLabel = useCallback(
    async (worktreePath: string, newLabel: string) => {
      setLabel(worktreePath, newLabel);
      await saveLabel(worktreePath, newLabel).catch(console.error);
    },
    [setLabel]
  );

  /**
   * WorktreeCard の「VS Code で開く」ボタンから呼ばれる。
   * Tauri IPC でパスを渡すだけ。失敗はログに残すのみ（preflight バナーで事前告知済み）。
   *
   * @param worktreePath 開く worktree の絶対パス
   */
  const handleOpenInEditor = useCallback((worktreePath: string) => {
    openInEditor(worktreePath).catch(console.error);
  }, []);

  // ===== worktree 削除（Remove ボタン → 事前チェック → ダイアログ表示） =====

  /**
   * WorktreeCard の削除ボタンから呼ばれる。`check_before_remove` で未コミット
   * 変更の有無などを取得し、その結果を `deleteTarget` state に格納することで
   * 削除確認ダイアログ（DeleteDialog）が開く。
   *
   * @param worktreePath 削除対象 worktree の絶対パス
   */
  const handleRemoveWorktree = useCallback(async (worktreePath: string) => {
    try {
      const check = await checkBeforeRemove(worktreePath);
      setDeleteTarget({
        path: check.path,
        name: dirName(worktreePath),
        branch: check.branch,
        hasUncommitted: check.hasUncommitted,
        modifiedCount: check.modifiedCount,
      });
    } catch (e) {
      console.error("削除前チェック失敗:", e);
    }
  }, []);

  /**
   * 削除確認ダイアログで「削除」を押された時の確定ハンドラ。
   *
   * Rust の `remove_worktree` を呼び、成功したら store からエントリと関連ラベルを
   * 除去する。`force` 引数には `deleteTarget.hasUncommitted` をそのまま渡している
   * （ダイアログ時点で未コミット変更ありの警告を表示済みで、ユーザーが確認した
   * 前提なのでそのまま force 削除する）。
   *
   * 失敗時もダイアログは閉じる（`finally` で `deleteTarget` を null に戻す）。
   *
   * @param deleteBranch ダイアログのチェックボックスの値。true なら worktree に
   *                     紐づくブランチも削除する
   */
  const handleConfirmDelete = useCallback(
    async (deleteBranch: boolean) => {
      if (!deleteTarget || !selectedRepositoryId) return;

      try {
        await removeWorktree(deleteTarget.path, deleteTarget.hasUncommitted, deleteBranch);
        removeWorktreeEntry(selectedRepositoryId, deleteTarget.path);
        removeLabel(deleteTarget.path);
        await deleteLabel(deleteTarget.path).catch(console.error);
      } catch (e) {
        console.error("worktree の削除に失敗:", e);
      } finally {
        setDeleteTarget(null);
      }
    },
    [deleteTarget, selectedRepositoryId, removeWorktreeEntry, removeLabel]
  );

  // ===== 派生値は useMemo 化して、ポーリングで worktrees の参照が維持された時に
  // Sidebar/WorktreeGrid に渡す props の参照も維持する（appStore の no-op ガード
  // を UI 層まで伝播させる）=====
  const selectedRepo = useMemo(
    () => repositories.find((r) => r.id === selectedRepositoryId) ?? null,
    [repositories, selectedRepositoryId]
  );

  const currentWorktrees = useMemo(
    () => (selectedRepo ? (worktrees[selectedRepo.id] ?? []) : []),
    [selectedRepo, worktrees]
  );

  const sidebarRepos = useMemo(
    () =>
      repositories.map((r) => ({
        id: r.id,
        name: r.name,
        worktreeCount: worktrees[r.id]?.length ?? 0,
      })),
    [repositories, worktrees]
  );

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "var(--bg-app)" }}>
      <PreflightBanner visible={!codeAvailable} />
      <div className="flex flex-1 min-h-0">
        <Sidebar
          repositories={sidebarRepos}
          selectedId={selectedRepositoryId}
          onSelectRepository={selectRepository}
          onAddRepository={handleAddRepository}
          onRemoveRepository={handleRemoveRepository}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <MainArea
          selectedRepositoryName={selectedRepo?.name ?? null}
          selectedRepositoryPath={selectedRepo?.path ?? null}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
        >
          {currentWorktrees.length > 0 && (
            <WorktreeGrid
              worktrees={currentWorktrees}
              labels={labels}
              codeAvailable={codeAvailable}
              onOpenInEditor={handleOpenInEditor}
              onRemove={handleRemoveWorktree}
              onSaveLabel={handleSaveLabel}
            />
          )}
        </MainArea>
        {deleteTarget && (
          <DeleteDialog
            worktreeName={deleteTarget.name}
            worktreePath={deleteTarget.path}
            branch={deleteTarget.branch}
            hasUncommitted={deleteTarget.hasUncommitted}
            modifiedCount={deleteTarget.modifiedCount}
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
        {isSettingsOpen && (
          <SettingsDialog
            refreshInterval={refreshInterval}
            onChangeRefreshInterval={handleChangeRefreshInterval}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
        {/* DetailPanel は M0 では非表示（M1 以降で実装） */}
      </div>
    </div>
  );
}

export default App;

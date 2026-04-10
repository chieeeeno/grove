import { useEffect, useCallback, useState } from "react";
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
import {
  validateRepository,
  loadConfig,
  saveConfig,
  listWorktrees,
  openInEditor,
  loadLabels,
  saveLabel,
  checkBeforeRemove,
  removeWorktree,
  deleteLabel,
  checkCodeCommand,
} from "./lib/tauri";
import type { AppConfig, RepositoryConfig } from "./types";

function App() {
  const {
    repositories,
    selectedRepositoryId,
    worktrees,
    labels,
    addRepository,
    removeRepository,
    selectRepository,
    setRepositories,
    setWorktrees,
    setLabel,
    setAllLabels,
    removeLabel,
    removeWorktreeEntry,
    codeAvailable,
    setCodeAvailable,
    isRefreshing,
    refreshInterval,
    setRefreshInterval,
  } = useAppStore();

  // 自動リフレッシュ（ADR-0013: 5秒ポーリング）
  const { refresh } = useAutoRefresh();

  // キーボードショートカット（Cmd+R でリフレッシュ）
  useKeyboardShortcuts({ onRefresh: refresh });

  // ===== 設定変更 =====
  const handleChangeRefreshInterval = useCallback(
    async (interval: number) => {
      setRefreshInterval(interval);
      const config: AppConfig = {
        repositories,
        editor: "vscode",
        theme: "system",
        refreshInterval: interval,
      };
      await saveConfig(config).catch(console.error);
    },
    [repositories, setRefreshInterval]
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

  // ===== 選択中リポジトリの worktree 取得 =====
  useEffect(() => {
    const repo = repositories.find((r) => r.id === selectedRepositoryId);
    if (!repo) return;

    listWorktrees(repo.path)
      .then((wts) => setWorktrees(repo.id, wts))
      .catch(console.error);
  }, [selectedRepositoryId, repositories, setWorktrees]);

  // ===== リポジトリ追加 =====
  const handleAddRepository = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || typeof selected !== "string") return;

    try {
      const info = await validateRepository(selected);
      if (repositories.some((r) => r.path === info.path)) return;

      const newRepo: RepositoryConfig = {
        id: info.id,
        name: info.name,
        path: info.path,
        addedAt: new Date().toISOString(),
      };

      addRepository(newRepo);

      const config: AppConfig = {
        repositories: [...repositories, newRepo],
        editor: "vscode",
        theme: "system",
        refreshInterval: 5000,
      };
      await saveConfig(config);
      selectRepository(newRepo.id);
    } catch (e) {
      console.error("リポジトリの追加に失敗しました:", e);
    }
  }, [repositories, addRepository, selectRepository]);

  // ===== リポジトリ削除 =====
  const handleRemoveRepository = useCallback(
    async (id: string) => {
      removeRepository(id);

      const next = repositories.filter((r) => r.id !== id);
      await saveConfig({
        repositories: next,
        editor: "vscode",
        theme: "system",
        refreshInterval: 5000,
      }).catch(console.error);

      if (selectedRepositoryId === id) {
        selectRepository(next.length > 0 ? next[0].id : null);
      }
    },
    [repositories, selectedRepositoryId, removeRepository, selectRepository]
  );

  // ===== ラベル保存 =====
  const handleSaveLabel = useCallback(
    async (worktreePath: string, newLabel: string) => {
      setLabel(worktreePath, newLabel);
      await saveLabel(worktreePath, newLabel).catch(console.error);
    },
    [setLabel]
  );

  // ===== worktree 削除（Remove ボタン → 事前チェック → ダイアログ表示） =====
  const handleRemoveWorktree = useCallback(async (worktreePath: string) => {
    try {
      const check = await checkBeforeRemove(worktreePath);
      const name = worktreePath.split("/").pop() ?? worktreePath;
      setDeleteTarget({
        path: check.path,
        name,
        branch: check.branch,
        hasUncommitted: check.hasUncommitted,
        modifiedCount: check.modifiedCount,
      });
    } catch (e) {
      console.error("削除前チェック失敗:", e);
    }
  }, []);

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

  // ===== 選択中リポジトリの情報 =====
  const selectedRepo = repositories.find((r) => r.id === selectedRepositoryId) ?? null;
  const currentWorktrees = selectedRepo ? (worktrees[selectedRepo.id] ?? []) : [];

  // ===== サイドバー用リポジトリリスト =====
  const sidebarRepos = repositories.map((r) => ({
    id: r.id,
    name: r.name,
    worktreeCount: worktrees[r.id]?.length ?? 0,
  }));

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
              onOpenInEditor={(path) => openInEditor(path).catch(console.error)}
              onRemove={handleRemoveWorktree}
              onSaveLabel={handleSaveLabel}
            />
          )}
        </MainArea>
        {/* 削除確認ダイアログ */}
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
        {/* 設定ダイアログ */}
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

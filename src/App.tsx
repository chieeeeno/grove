import { useEffect, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import Sidebar from "./components/Sidebar";
import MainArea from "./components/MainArea";
import WorktreeGrid from "./components/WorktreeGrid";
import { useAppStore } from "./stores/appStore";
import {
  validateRepository,
  loadConfig,
  saveConfig,
  listWorktrees,
  openInEditor,
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
  } = useAppStore();

  // ===== 起動時: config 読み込み =====
  useEffect(() => {
    loadConfig()
      .then((config) => {
        setRepositories(config.repositories);
        // 最初のリポジトリを自動選択
        if (config.repositories.length > 0) {
          selectRepository(config.repositories[0].id);
        }
      })
      .catch(console.error);
  }, [setRepositories, selectRepository]);

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

  // ===== リフレッシュ =====
  const handleRefresh = useCallback(async () => {
    const repo = repositories.find((r) => r.id === selectedRepositoryId);
    if (!repo) return;

    try {
      const wts = await listWorktrees(repo.path);
      setWorktrees(repo.id, wts);
    } catch (e) {
      console.error("リフレッシュ失敗:", e);
    }
  }, [selectedRepositoryId, repositories, setWorktrees]);

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
    <div className="flex h-full" style={{ backgroundColor: "var(--bg-app)" }}>
      <Sidebar
        repositories={sidebarRepos}
        selectedId={selectedRepositoryId}
        onSelectRepository={selectRepository}
        onAddRepository={handleAddRepository}
        onRemoveRepository={handleRemoveRepository}
      />
      <MainArea
        selectedRepositoryName={selectedRepo?.name ?? null}
        selectedRepositoryPath={selectedRepo?.path ?? null}
        onRefresh={handleRefresh}
      >
        {currentWorktrees.length > 0 && (
          <WorktreeGrid
            worktrees={currentWorktrees}
            labels={labels}
            onOpenInEditor={(path) => openInEditor(path).catch(console.error)}
            onRemove={() => {}}
          />
        )}
      </MainArea>
      {/* DetailPanel は M0 では非表示（M1 以降で実装） */}
    </div>
  );
}

export default App;

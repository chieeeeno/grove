import { useEffect, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import Sidebar from "./components/Sidebar";
import MainArea from "./components/MainArea";
import { useAppStore } from "./stores/appStore";
import { validateRepository, loadConfig, saveConfig } from "./lib/tauri";
import type { AppConfig, RepositoryConfig } from "./types";

function App() {
  const {
    repositories,
    selectedRepositoryId,
    worktrees,
    addRepository,
    removeRepository,
    selectRepository,
    setRepositories,
  } = useAppStore();

  // ===== 起動時: config 読み込み =====
  useEffect(() => {
    loadConfig()
      .then((config) => setRepositories(config.repositories))
      .catch(console.error);
  }, [setRepositories]);

  // ===== リポジトリ追加 =====
  const handleAddRepository = useCallback(async () => {
    // ディレクトリ選択ダイアログ
    const selected = await open({ directory: true, multiple: false });
    if (!selected || typeof selected !== "string") return;

    try {
      // git リポジトリとして検証
      const info = await validateRepository(selected);

      // 既に登録済みか確認
      if (repositories.some((r) => r.path === info.path)) return;

      const newRepo: RepositoryConfig = {
        id: info.id,
        name: info.name,
        path: info.path,
        addedAt: new Date().toISOString(),
      };

      addRepository(newRepo);

      // store に保存
      const config: AppConfig = {
        repositories: [...repositories, newRepo],
        editor: "vscode",
        theme: "system",
        refreshInterval: 5000,
      };
      await saveConfig(config);

      // 追加したリポジトリを選択
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

      // 選択中だったら選択解除
      if (selectedRepositoryId === id) {
        selectRepository(next.length > 0 ? next[0].id : null);
      }
    },
    [repositories, selectedRepositoryId, removeRepository, selectRepository]
  );

  // ===== 選択中リポジトリの情報 =====
  const selectedRepo = repositories.find((r) => r.id === selectedRepositoryId) ?? null;

  // ===== サイドバー用リポジトリリスト（worktree 数バッジ付き） =====
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
      />
      {/* DetailPanel は M0 では非表示（M1 以降で実装） */}
    </div>
  );
}

export default App;

import { ShieldCheck, GitBranch, GitMerge } from "lucide-react";
import type { WorktreeInfo } from "../types";

/**
 * ブランチステータスを示すバッジ。
 *
 * WorktreeCard とヘルプポップオーバーで共用し、色・アイコン・ラベルの
 * 定義を一元化する。
 *
 * @param status 表示するステータス。`"primary"` はメイン worktree 用
 * @param fixedWidth `true` のとき幅を固定して凡例表示用に揃える
 * @returns idle の場合は `null`（バッジ非表示）
 */

interface BranchStatusBadgeProps {
  /** 表示するステータス */
  status: "primary" | WorktreeInfo["branchStatus"];
  /** true のとき幅を固定して凡例表示用に揃える */
  fixedWidth?: boolean;
}

const badgeConfig = {
  primary: {
    bg: "bg-[#34D39933]",
    text: "text-accent-green",
    icon: ShieldCheck,
    label: "primary",
  },
  active: {
    bg: "bg-[#3B82F633]",
    text: "text-blue-400",
    icon: GitBranch,
    label: "active",
  },
  merged: {
    bg: "bg-[#8B5CF633]",
    text: "text-purple-400",
    icon: GitMerge,
    label: "merged",
  },
} as const;

export default function BranchStatusBadge({ status, fixedWidth }: BranchStatusBadgeProps) {
  if (status === "idle") {
    // fixedWidth 時はレイアウト揃え用のプレースホルダーを返す（ポップオーバー凡例用）
    return fixedWidth ? (
      <span className="text-[10px] text-fg-muted w-20 text-center shrink-0">バッジなし</span>
    ) : null;
  }

  const config = badgeConfig[status];
  const Icon = config.icon;
  const widthClass = fixedWidth ? "w-20 justify-center" : "";

  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${config.bg} ${config.text} ${widthClass}`}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
}

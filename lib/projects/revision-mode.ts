import type { ChatWorkspaceVersion } from "./chat-workspace-client";
import type { TravelProjectMessage } from "./types";
import type {
  RevisionChange,
  RevisionChatHistoryMessage,
  RevisionModificationSuggestion,
} from "./revision-chat/revision-chat-types";
import type { TripPlan } from "../trip/types";

/**
 * Revision Mode 的纯逻辑层：版本选择、每日路线摘要、handoff 数据准备、label 生成。
 *
 * 这里只做数据推导，不发请求、不碰 React 状态、不写 storage。
 * 任何副作用（session 合并、tripPlan 落盘）都由调用方负责。
 */

export type RevisionMode = "chat" | "edit";

/** 进入 Revision Mode 时的默认模式：先聊，不直接进编辑。 */
export const REVISION_DEFAULT_MODE: RevisionMode = "chat";

/** 左侧版本栏至少铺满的条目数（真实版本 + 占位）。 */
export const REVISION_SIDEBAR_MIN_ENTRIES = 3;

/** revision-chat 请求最多携带的历史条数，与 API schema 的 max(20) 对齐。 */
export const REVISION_CHAT_HISTORY_LIMIT = 20;

const REVISION_PLACEHOLDER_ID_PREFIX = "__revision_v";
const EPOCH = new Date(0).toISOString();

export function isRevisionPlaceholderId(id: string) {
  return id.startsWith(REVISION_PLACEHOLDER_ID_PREFIX);
}

export function buildRevisionPlaceholderEntry(
  versionNumber: number,
): ChatWorkspaceVersion {
  return {
    id: `${REVISION_PLACEHOLDER_ID_PREFIX}${versionNumber}_placeholder__`,
    versionNumber,
    versionStatus: "draft",
    createdFrom: null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    title: "待生成",
    destination: "调整后自动生成",
    days: 0,
    isCurrent: false,
  };
}

/**
 * 左侧旅行计划档案列表：真实版本按版本号升序在前，不足 3 条时补占位。
 * 占位条目不可选中，只表达「后面还能继续调整出新版本」。
 */
export function buildRevisionSidebarEntries(
  versions: ChatWorkspaceVersion[],
): ChatWorkspaceVersion[] {
  const realEntries = [...versions].sort(
    (a, b) => a.versionNumber - b.versionNumber,
  );
  const entries = [...realEntries];
  let nextNumber =
    (realEntries[realEntries.length - 1]?.versionNumber ?? 0) + 1;

  while (entries.length < REVISION_SIDEBAR_MIN_ENTRIES) {
    entries.push(buildRevisionPlaceholderEntry(nextNumber));
    nextNumber += 1;
  }

  return entries;
}

/**
 * 解析当前选中的版本：优先 selectedVersionId，其次当前版本，最后回落到最后一个真实版本。
 * 占位条目永远不会被解析成选中项。
 */
export function resolveSelectedVersion(
  entries: ChatWorkspaceVersion[],
  selectedVersionId?: string,
): ChatWorkspaceVersion | null {
  const selectable = entries.filter(
    (entry) => !isRevisionPlaceholderId(entry.id),
  );

  if (selectable.length === 0) {
    return null;
  }

  if (selectedVersionId) {
    const matched = selectable.find((entry) => entry.id === selectedVersionId);
    if (matched) {
      return matched;
    }
  }

  return (
    selectable.find((entry) => entry.isCurrent) ??
    selectable[selectable.length - 1] ??
    null
  );
}

/** 每日路线摘要：`D01 主题`，无主题的天直接跳过。 */
export function buildRevisionDailyOutline(
  tripPlan: TripPlan | null | undefined,
): string[] {
  if (!tripPlan || !Array.isArray(tripPlan.dailyItinerary)) {
    return [];
  }

  return tripPlan.dailyItinerary
    .map((day) => {
      const theme = day?.theme?.trim();
      if (!theme || !day?.day) return "";
      return `D${String(day.day).padStart(2, "0")} ${theme}`;
    })
    .filter((line): line is string => line.length > 0);
}

/** 版本标签，例如 `V1`。 */
export function buildRevisionVersionLabel(versionNumber: number) {
  return `V${versionNumber}`;
}

export function buildRevisionVersionDescription(
  version: Pick<ChatWorkspaceVersion, "createdFrom" | "versionNumber">,
) {
  if (version.createdFrom === "ai_adjust") {
    return "AI调整版本";
  }

  if (version.createdFrom === "manual_edit") {
    return "手动编辑版本";
  }

  if (
    version.createdFrom === "template_import" ||
    version.createdFrom === "import_transform"
  ) {
    return version.versionNumber <= 1 ? "导入初版" : "导入调整版本";
  }

  return version.versionNumber <= 1 ? "初始旅行方案" : "旅行方案版本";
}

export function buildRevisionApplySuccessMessage(versionNumber?: number) {
  if (!versionNumber) {
    return "已生成新版本，你可以继续调整，或者进入旅行工作台查看。";
  }

  return `已生成 ${buildRevisionVersionLabel(versionNumber)} 新版本，你可以继续调整，或者进入旅行工作台查看。`;
}

/** 进入工作台按钮文案，必须点明进入的是哪个版本。 */
export function buildEnterWorkspaceLabel(
  title: string,
  versionNumber: number,
) {
  const resolvedTitle = title.trim() || "当前方案";
  return `进入工作台编辑「${resolvedTitle} ${buildRevisionVersionLabel(versionNumber)}」`;
}

/**
 * 把已有对话转成 revision-chat 的 history，并追加本轮用户输入。
 * 只保留 user / assistant，且总条数不超过 API schema 上限。
 */
export function buildRevisionChatHistory(
  messages: Pick<TravelProjectMessage, "role" | "content">[],
  submittedText: string,
): RevisionChatHistoryMessage[] {
  const trimmed = submittedText.trim();
  const previous = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role as RevisionChatHistoryMessage["role"],
      content: message.content,
    }))
    .filter((message) => message.content.trim().length > 0);

  const history = trimmed
    ? [...previous, { role: "user" as const, content: trimmed }]
    : previous;

  return history.slice(-REVISION_CHAT_HISTORY_LIMIT);
}

function wrapQuotedValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? `「${trimmed}」` : "该安排";
}

export function buildRevisionChangeInstruction(change: RevisionChange): string {
  const dayLabel = `第${change.day}天`;
  const target = wrapQuotedValue(change.target);
  const replacement = wrapQuotedValue(change.replacement);

  switch (change.action) {
    case "replace":
      return `${dayLabel}：将${target}替换为${replacement}。`;
    case "remove":
      return `${dayLabel}：移除${target}。`;
    case "add":
      return change.replacement?.trim()
        ? `${dayLabel}：新增${replacement}，并结合${target}协调当天安排。`
        : `${dayLabel}：新增与${target}相关的安排。`;
    case "modify":
    default:
      return change.replacement?.trim()
        ? `${dayLabel}：将${target}调整为${replacement}。`
        : `${dayLabel}：调整${target}。`;
  }
}

export function buildRevisionModificationRequest(
  suggestion:
    | Pick<RevisionModificationSuggestion, "changes">
    | { changes: RevisionChange[] },
): string {
  const instructions = suggestion.changes.map(buildRevisionChangeInstruction);
  const reasons = suggestion.changes.map(
    (change) => `第${change.day}天：${change.reason.trim()}`,
  );

  return [
    "请基于当前旅行计划进行以下调整：",
    "",
    ...instructions,
    "",
    "调整原因：",
    ...reasons,
  ].join("\n");
}

export interface RevisionWorkspaceHandoff {
  versionId: string;
  versionNumber: number;
  label: string;
  tripPlan: TripPlan | null;
}

/**
 * 进入工作台前需要交接的数据。只描述「要带哪一版过去」，
 * 不创建版本、不修改 tripPlan 内容，落盘由调用方执行。
 */
export function buildRevisionWorkspaceHandoff(
  version: ChatWorkspaceVersion | null,
): RevisionWorkspaceHandoff | null {
  if (!version || isRevisionPlaceholderId(version.id)) {
    return null;
  }

  return {
    versionId: version.id,
    versionNumber: version.versionNumber,
    label: buildEnterWorkspaceLabel(version.title, version.versionNumber),
    tripPlan: version.tripPlan ?? null,
  };
}

import "server-only";

import { createConversationAIProvider } from "../../ai/provider/provider";
import type { AIProvider } from "../../ai/provider/provider-types";
import type { UserPreferenceContext } from "../../ai/user-preference-context";
import { AppError } from "../../utils/errors";
import type { TripPlan, TripRequest } from "../../trip/types";
import type { ProjectService } from "../service";
import { createProjectVersionService } from "../version/version-service";
import type { ProjectVersionService } from "../version/version-service";
import { createConversationContext } from "../conversation/conversation-context";
import {
  revisionChatResponseSchema,
  type RevisionChatHistoryMessage,
  type RevisionChatResponse,
} from "./revision-chat-types";

export const REVISION_CHAT_SYSTEM_PROMPT = `
你正在帮助用户调整当前旅行计划。用户已经拿到一版完整的 tripPlan，这轮只做「针对这一版的讨论与修改建议」。你的任务：
1. 判断用户这次说的是「修改要求」还是「普通咨询」；
2. 只返回一个合法 JSON 对象；禁止 Markdown、代码块、解释文字、"下面是 JSON" 等前后缀；
3. 本轮**绝对不重新生成完整 tripPlan**——你只输出「建议」或「回答」；
4. **必须基于下方给出的当前计划作答**：引用具体的天序号与地点名，禁止脱离当前计划给泛泛建议
   （例如禁止只说「可以适当减少景点」，要说清是第几天、去掉哪个地点、换成什么）。

如果用户提出了具体的修改要求（例如"把大雁塔换掉"、"晚上加个夜市"、"第二天太累了"），返回：
{
  "type": "modification_suggestion",
  "message": "用一两句自然语言解释你打算怎么改，向用户征询确认",
  "changes": [
    {
      "day": <被改动的天序号，从 1 开始>,
      "action": "replace" | "remove" | "add" | "modify",
      "target": "被改动的原地点 / 时段 / 字段（简要中文描述）",
      "replacement": "新地点或新安排（action=replace 或 add 时必填；其他时可省略）",
      "reason": "为什么这么改，尽量引用用户的 interests / travelStyles / mustVisitPlaces / avoidPlaces / 预算"
    }
  ]
}

如果用户只是咨询（例如"这个路线合理吗"、"预算够吗"、"晚上有没有推荐吃的"），返回：
{
  "type": "reply",
  "message": "用一两句自然语言直接回答用户的问题"
}

硬约束：
- 顶层字段必须是上面两种结构之一，禁止把 tripPlan / dailyItinerary 塞回顶层；
- action=replace 或 action=add 时必须给出 replacement；
- 每次最多 3 条 changes，避免一次改得过多；
- avoidPlaces 是硬红线，不允许把用户 avoidPlaces 中的地点当成 replacement；
- 尊重用户的 interests / 同行人 / 预算 / mustVisitPlaces；
- day 必须与当前 tripPlan 的天数范围一致（1 到 tripPlan.days）；
- target 必须是当前计划里真实存在的地点或时段，不要编造计划里没有的地点；
- message 用短句，禁止长段。
`.trim();

/** 带进 prompt 的五问对话条数上限。 */
export const INTERVIEW_TRANSCRIPT_LIMIT = 12;

const SLOT_LABELS = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
} as const;

/**
 * 展开当前版本的完整每日安排。
 *
 * 早期版本每个时段只取第一个地点，导致用户点名的地点（例如排在下午第二位的
 * 大雁塔）对模型不可见，只能给出泛泛建议。这里把每个时段的全部地点都列出。
 */
export function buildRevisionItineraryOutline(tripPlan: TripPlan): string {
  const days = Array.isArray(tripPlan.dailyItinerary)
    ? tripPlan.dailyItinerary
    : [];

  if (days.length === 0) {
    return "  （dailyItinerary 为空）";
  }

  return days
    .map((day) => {
      const header = `- 第 ${day.day} 天｜${day.theme?.trim() || "未命名主题"}`;
      const slotLines = (
        Object.keys(SLOT_LABELS) as (keyof typeof SLOT_LABELS)[]
      )
        .map((slot) => {
          const items = Array.isArray(day[slot]) ? day[slot] : [];
          const places = items
            .map((item) => {
              const name = item?.placeName?.trim();
              if (!name) return "";
              return item?.type ? `${name}（${item.type}）` : name;
            })
            .filter(Boolean);

          if (places.length === 0) {
            return `    ${SLOT_LABELS[slot]}：（未安排）`;
          }

          return `    ${SLOT_LABELS[slot]}：${places.join("、")}`;
        })
        .join("\n");

      return [header, slotLines].join("\n");
    })
    .join("\n");
}

/** 五问阶段的原始对话，作为用户初始旅行想法的补充上下文。 */
export function buildInterviewTranscript(
  messages: RevisionChatHistoryMessage[] | undefined,
): string[] {
  if (!messages || messages.length === 0) {
    return ["用户五问对话：（暂无记录）"];
  }

  return [
    "用户五问对话（创建这份计划时的原始需求，自上而下按时间顺序）：",
    ...messages.map(
      (msg) =>
        `- ${msg.role === "user" ? "用户" : "助手"}：${msg.content.trim()}`,
    ),
  ];
}

interface RevisionChatContextInput {
  tripPlan: TripPlan;
  tripRequest: TripRequest | null;
  versionNumber: number;
  versionId?: string;
  userMessage: string;
  history?: RevisionChatHistoryMessage[];
  interviewMessages?: RevisionChatHistoryMessage[];
  userPreferenceContext?: UserPreferenceContext | null;
}

export function buildRevisionChatUserPrompt(
  input: RevisionChatContextInput,
): string {
  const { tripPlan, tripRequest, versionNumber, userMessage } = input;
  const userPreferenceSummary = input.userPreferenceContext?.summary;
  const historyLines =
    input.history && input.history.length > 0
      ? [
          "最近的对话（自上而下按时间顺序）：",
          ...input.history
            .slice(-10)
            .map(
              (msg) =>
                `- ${msg.role === "user" ? "用户" : "助手"}：${msg.content.trim()}`,
            ),
        ]
      : ["最近的对话：（暂无）"];

  const dailyOutline = buildRevisionItineraryOutline(tripPlan);

  const interests = tripRequest?.interests?.join("、") || "未明确";
  const travelStyles = tripRequest?.travelStyles?.join("、") || "未明确";
  const mustVisit =
    (tripRequest?.mustVisitPlaces ?? []).filter(Boolean).join("、") || "无";
  const avoid =
    (tripRequest?.avoidPlaces ?? []).filter(Boolean).join("、") || "无";
  const budget =
    tripRequest?.budget && tripRequest?.currency
      ? `约 ${tripRequest.budget} ${tripRequest.currency}`
      : "未明确";

  return [
    `你正在帮助用户调整当前旅行计划：第 V${versionNumber} 版${
      input.versionId ? `（versionId：${input.versionId}）` : ""
    }。`,
    "",
    "当前计划：",
    `- 标题：${tripPlan.tripTitle}`,
    `- 目的地：${tripPlan.destination}`,
    `- 天数：${tripPlan.days} 天`,
    tripPlan.summary ? `- 本版摘要：${tripPlan.summary}` : "",
    "- 完整每日安排（这是本轮讨论的唯一依据）：",
    dailyOutline,
    "",
    "用户五问需求（tripRequest）：",
    `- 兴趣：${interests}`,
    `- 出行风格 / 同行人：${travelStyles}`,
    `- 必去（mustVisitPlaces）：${mustVisit}`,
    `- 避免（avoidPlaces，硬红线）：${avoid}`,
    `- 预算：${budget}`,
    "",
    ...(userPreferenceSummary
      ? ["用户长期偏好参考：", userPreferenceSummary, ""]
      : []),
    ...buildInterviewTranscript(input.interviewMessages),
    "",
    ...historyLines,
    "",
    "用户要求：",
    userMessage.trim(),
    "",
    "请只返回一个合法 JSON 对象，type 只能是 modification_suggestion 或 reply。",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export interface RevisionChatService {
  suggestModification(input: {
    projectId: string;
    versionId: string;
    message: string;
    history?: RevisionChatHistoryMessage[];
    userPreferenceContext?: UserPreferenceContext | null;
  }): Promise<RevisionChatResponse>;
}

interface RevisionChatServiceDependencies {
  provider?: AIProvider;
  versionService?: ProjectVersionService;
}

function toProjectNotFound(projectId: string) {
  return new AppError(
    "UNKNOWN_ERROR",
    `Travel project not found: ${projectId}`,
  );
}

function toVersionNotFound(projectId: string, versionId: string) {
  return new AppError(
    "UNKNOWN_ERROR",
    `Travel project version not found: ${projectId}/${versionId}`,
  );
}

export function createRevisionChatService(
  projectService: ProjectService,
  dependencies: RevisionChatServiceDependencies = {},
): RevisionChatService {
  const provider = dependencies.provider ?? createConversationAIProvider();
  const versionService =
    dependencies.versionService ?? createProjectVersionService(projectService);

  return {
    async suggestModification({
      projectId,
      versionId,
      message,
      history,
      userPreferenceContext,
    }) {
      const trimmed = message.trim();
      if (!trimmed) {
        throw new AppError(
          "INVALID_INPUT",
          "Revision chat message cannot be empty.",
        );
      }

      const detail = await projectService.getProject(projectId);
      if (!detail) {
        throw toProjectNotFound(projectId);
      }

      const version = await versionService.getVersion(projectId, versionId);
      if (!version) {
        throw toVersionNotFound(projectId, versionId);
      }

      // 五问阶段的原始对话：解释这份计划「为什么长这样」，缺失时不阻断本轮讨论。
      const projectMessages = await projectService
        .listProjectMessages(projectId, { limit: INTERVIEW_TRANSCRIPT_LIMIT })
        .catch(() => []);
      const interviewMessages: RevisionChatHistoryMessage[] = projectMessages
        .filter(
          (message) =>
            message.role === "user" || message.role === "assistant",
        )
        .filter((message) => message.content.trim().length > 0)
        .slice(-INTERVIEW_TRANSCRIPT_LIMIT)
        .map((message) => ({
          role: message.role as RevisionChatHistoryMessage["role"],
          content: message.content,
        }));

      const context = createConversationContext({
        project: detail.project,
        currentStage:
          detail.project.currentFlowStage ?? "workspace_ready",
        recentMessages: [],
        sources: detail.sources,
        userPreferenceContext: userPreferenceContext ?? null,
      });
      const userPrompt = buildRevisionChatUserPrompt({
        tripPlan: version.tripPlan,
        tripRequest: version.tripRequestSnapshot ?? null,
        versionNumber: version.versionNumber,
        versionId: version.id,
        userMessage: trimmed,
        history,
        interviewMessages,
        userPreferenceContext: userPreferenceContext ?? null,
      });

      const raw = await provider.generateConversationResponse({
        message: trimmed,
        context,
        systemPrompt: REVISION_CHAT_SYSTEM_PROMPT,
        userPrompt,
      });

      const parsed = revisionChatResponseSchema.safeParse(raw);
      if (parsed.success) {
        return parsed.data;
      }

      // Graceful degradation: fall back to a plain reply so the UI never blocks
      // even if the model breaks the JSON shape.
      const fallbackMessage =
        raw && typeof raw === "object" && "message" in raw &&
        typeof (raw as { message?: unknown }).message === "string" &&
        (raw as { message: string }).message.trim().length > 0
          ? (raw as { message: string }).message.trim()
          : "我收到你的想法了，先按当前方案再看看，稍后再具体调整。";

      return {
        type: "reply",
        message: fallbackMessage,
      } satisfies RevisionChatResponse;
    },
  };
}

"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { CreateChatView } from "@/components/create/CreateChatView";
import { ProjectGenerationExperience } from "@/components/trip/ProjectGenerationExperience";
import type { CreateEntrySource, CreateEntryMode } from "@/lib/projects/create-entry";
import {
  generateCreateProposal,
  getCreateCopilotStatusLabel,
  moveCreateProposalToAdjusting,
  restoreCreateCopilotSession,
  sendCreateCopilotMessage,
} from "@/lib/projects/create-copilot-client";
import { submitCreateFlow } from "@/lib/projects/create-flow-client";
import type { GenerationExperienceStatus } from "@/lib/projects/generation-experience";
import { clearProjectSession } from "@/lib/projects/session";
import { buildLoginHref } from "@/lib/trips/save-client";
import type { TravelProjectFlowStage, TravelProjectMessage } from "@/lib/projects/types";
import type { TripPlanDraft } from "@/lib/trip/types";

const EXAMPLES = [
  "7 月从深圳去厦门玩 3 天，预算 2500，喜欢海边、美食和拍照，不想太累。",
  "从广州去成都玩 4 天，喜欢美食和城市漫步，不想去太商业化的景点。",
  "想去杭州玩两天，预算 1500，不想早起，想轻松一点。",
] as const;

const ARCHIVE_QUICK_STARTS = [
  "第二天节奏放慢一点，留出咖啡时间。",
  "多加一些本地小吃，少安排景点。",
  "整体方向可以，把夜里的内容再丰富一些。",
] as const;

const CHAT_MODE_QUICK_STARTS = [
  "想保留档案里的大部分安排。",
  "把第三天换成另一种节奏。",
  "还有几条偏好想加进去。",
] as const;

interface CreateCopilotPanelProps {
  entrySource?: CreateEntrySource;
  archiveSlug?: string;
  mode?: CreateEntryMode;
  initialDraft?: TripPlanDraft | null;
  initialSession?: {
    projectId: string;
    flowStage: TravelProjectFlowStage;
    currentVersionId?: string;
    messages: TravelProjectMessage[];
  };
  skipSessionRestore?: boolean;
  onFlowStageChange?: (project: {
    projectId: string;
    flowStage: TravelProjectFlowStage;
    currentVersionId?: string;
    messages: TravelProjectMessage[];
  }) => void;
}

const QUICK_STARTS = [
  "不知道去哪，但想找一个适合 4 天放松、美食多一点的地方。",
  "想去云南玩 5 天，节奏慢一点，风景和美食都想要。",
  "给我一版适合周末出发的轻松城市旅行。",
] as const;

interface CreateCopilotProposalSummary {
  title: string;
  destination: string;
  daysLabel: string;
  routeSummary: string;
  preferences: string[];
}

interface ConversationViewProps {
  messages: TravelProjectMessage[];
  statusLabel: string;
  errorMessage?: string;
  isSending: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStartOver: () => void;
  onUseClassicFlow: () => void;
  currentStage: TravelProjectFlowStage;
  onAdjustProposal: () => void;
  onGenerateProposal: () => void;
  isGeneratingProposal: boolean;
  proposalSummary?: CreateCopilotProposalSummary | null;
}

const PROPOSAL_PREFERENCE_RULES = [
  { label: "美食", keywords: ["food", "eat", "restaurant", "cafe", "coffee", "美食", "吃"] },
  { label: "风景", keywords: ["nature", "mountain", "forest", "lake", "hike", "自然", "风景", "山"] },
  { label: "城市漫步", keywords: ["city", "walk", "street", "urban", "citywalk", "漫步", "街区", "城市"] },
  { label: "文化体验", keywords: ["culture", "museum", "history", "art", "文化", "历史", "展"] },
  { label: "轻松节奏", keywords: ["relaxed", "slow", "easy", "not rush", "light", "轻松", "不赶", "别太满"] },
] as const;

function createLocalMessage(
  role: TravelProjectMessage["role"],
  content: string,
): TravelProjectMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId: "local",
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function collectMessagesByRole(
  messages: TravelProjectMessage[],
  role: TravelProjectMessage["role"],
) {
  return messages
    .filter((message) => message.role === role)
    .map((message) => message.content.trim())
    .filter(Boolean);
}

function matchDestination(input: string) {
  const chineseMatch = input.match(
    /去([\u4e00-\u9fa5A-Za-z\s]{2,20}?)(?:玩|旅行|旅游|逛|待|住|过|，|。|,|\s)/,
  );
  if (chineseMatch?.[1]) {
    return chineseMatch[1].trim();
  }

  const englishMatch = input.match(
    /to\s+([A-Za-z][A-Za-z\s]{1,30}?)(?:\s+\d+\s*(?:day|days)|[,.]|$)/i,
  );
  if (englishMatch?.[1]) {
    return englishMatch[1].trim();
  }

  return "待确认目的地";
}

function matchDays(input: string) {
  const dayMatch = input.match(/(\d+)\s*(?:day|days|天)/i);
  if (!dayMatch) {
    return "天数待确认";
  }

  return `${dayMatch[1]} 天`;
}

function deriveProposalPreferences(messages: string[]) {
  const normalized = messages.join(" ").toLowerCase();

  const matched = PROPOSAL_PREFERENCE_RULES.filter((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  ).map((rule) => rule.label);

  return matched.length > 0 ? matched : ["偏好待确认"];
}

function deriveProposalSummary(
  messages: TravelProjectMessage[],
  currentStage: TravelProjectFlowStage,
): CreateCopilotProposalSummary | null {
  if (currentStage !== "proposal_ready") {
    return null;
  }

  const userMessages = collectMessagesByRole(messages, "user");
  const assistantMessages = collectMessagesByRole(messages, "assistant");
  const combinedUserText = userMessages.join(" ");
  const destination = matchDestination(combinedUserText);
  const daysLabel = matchDays(combinedUserText);
  const preferences = deriveProposalPreferences(userMessages);
  const latestAssistantMessage =
    assistantMessages[assistantMessages.length - 1] ??
    "我已经整理出一版旅行方向，可以先确认 proposal 再生成完整计划。";

  return {
    title: `${destination} 行程提案`,
    destination,
    daysLabel,
    routeSummary: latestAssistantMessage,
    preferences,
  };
}

function buildQuickReplyOptions(currentStage: TravelProjectFlowStage) {
  switch (currentStage) {
    case "source_received":
    case "source_review":
      return [
        "我想吃得好一点，也想多走走看看。",
        "节奏轻松一点，不要太赶。",
        "我还没想好去哪，先帮我缩小范围。",
      ];
    case "clarifying":
      return [
        "预算大概 6000，玩 5 天。",
        "想看风景、吃本地小店，还想留一点自由活动时间。",
        "不想早起，也不想安排得太满。",
      ];
    case "proposal_adjusting":
      return [
        "第二天放慢一点。",
        "多加一点美食路线。",
        "减少折返和换乘。",
      ];
    case "proposal_ready":
      return [
        "整体方向可以，但再多一点美食。",
        "把节奏再放慢一点。",
        "这版可以，准备生成完整计划。",
      ];
    default:
      return [];
  }
}

export function resolveEmptyStateIntro(
  entrySource: CreateEntrySource | undefined,
) {
  if (entrySource === "explore_archive") {
    return "我已经了解你的旅行档案，我们可以一起调整这份计划。";
  }
  return "从零开始规划旅行。先告诉我你想怎么出去玩，我会只追问必要的信息，然后整理成 proposal 给你确认。";
}

export function resolveEmptyStatePlaceholder(
  entrySource: CreateEntrySource | undefined,
  mode: CreateEntryMode | undefined,
) {
  if (entrySource === "explore_archive" && mode === "chat") {
    return "比如：把第二天的景点再松一点，或者加点夜景。";
  }
  if (entrySource === "explore_archive") {
    return "比如：第二天放慢节奏，多加一些美食。";
  }
  return "比如：想去云南玩 5 天，想多吃点，别排太满。";
}

export function resolveEmptyStateQuickStarts(
  entrySource: CreateEntrySource | undefined,
  mode: CreateEntryMode | undefined,
) {
  if (entrySource === "explore_archive" && mode === "chat") {
    return CHAT_MODE_QUICK_STARTS;
  }
  if (entrySource === "explore_archive") {
    return ARCHIVE_QUICK_STARTS;
  }
  return QUICK_STARTS;
}

export function shouldShowArchiveContext(
  entrySource: CreateEntrySource | undefined,
  initialDraft: TripPlanDraft | null | undefined,
) {
  return entrySource === "explore_archive" && Boolean(initialDraft);
}

export function CreateCopilotConversationView({
  messages,
  statusLabel,
  errorMessage,
  isSending,
  inputValue,
  onInputChange,
  onSubmit,
  onStartOver,
  onUseClassicFlow,
  currentStage,
  onAdjustProposal,
  onGenerateProposal,
  isGeneratingProposal,
  proposalSummary,
}: ConversationViewProps) {
  const showProposalActions = currentStage === "proposal_ready";
  const quickReplies = buildQuickReplyOptions(currentStage);

  return (
    <div className="space-y-3">
      <div className="rounded-[18px] border border-[var(--line)] bg-[var(--paper-bright)] px-3 py-2">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
          当前阶段
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{statusLabel}</p>
      </div>

      {showProposalActions && proposalSummary ? (
        <section className="rounded-[20px] border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-3 shadow-[4px_4px_0_var(--sand)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
            Proposal Ready
          </p>
          <h3 className="mt-1 text-base font-semibold text-[var(--ink)]">
            {proposalSummary.title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-[var(--ink-muted)]">
            <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1">
              目的地：{proposalSummary.destination}
            </span>
            <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1">
              天数：{proposalSummary.daysLabel}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--ink)]">
            {proposalSummary.routeSummary}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {proposalSummary.preferences.map((preference) => (
              <span
                key={preference}
                className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-muted)]"
              >
                {preference}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-[18px] border border-[var(--line)] bg-[var(--paper-bright)] p-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-[16px] px-3 py-2 text-sm leading-6 ${
              message.role === "user"
                ? "ml-auto max-w-[85%] border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-bright)]"
                : "max-w-[92%] border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
            }`}
          >
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">
              {message.role === "user" ? "You" : "Wanderly"}
            </p>
            <p>{message.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        {quickReplies.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => onInputChange(reply)}
                disabled={isSending}
                className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-muted)] disabled:opacity-70"
              >
                {reply}
              </button>
            ))}
          </div>
        ) : null}

        <textarea
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          rows={3}
          disabled={isSending}
          placeholder="继续告诉我你想怎么走，比如预算、节奏、想重点看什么。"
          className="min-h-20 w-full resize-y rounded-[18px] border border-[var(--line-strong)] bg-[var(--paper-bright)] px-3 py-2 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sage-deep)]"
        />

        {errorMessage ? (
          <p className="rounded-[14px] border border-[var(--dusty-rose)] bg-[rgb(196_104_89_/_0.08)] px-3 py-2 text-sm leading-6 text-[var(--dusty-rose)]">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {showProposalActions ? (
              <>
                <button
                  type="button"
                  onClick={onAdjustProposal}
                  disabled={isSending || isGeneratingProposal}
                  className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm font-semibold text-[var(--ink-muted)] disabled:opacity-70"
                >
                  继续调整
                </button>
                <button
                  type="button"
                  onClick={onGenerateProposal}
                  disabled={isSending || isGeneratingProposal}
                  className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-3 py-1.5 text-sm font-semibold text-[var(--paper-bright)] disabled:cursor-wait disabled:opacity-70"
                >
                  {isGeneratingProposal ? "正在生成..." : "生成完整计划"}
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={onUseClassicFlow}
              className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm font-semibold text-[var(--ink-muted)]"
            >
              使用旧补充流程
            </button>
            <button
              type="button"
              onClick={onStartOver}
              className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm font-semibold text-[var(--ink-muted)]"
            >
              重新开始
            </button>
          </div>
          <button
            type="submit"
            disabled={isSending}
            className="min-h-9 rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-1.5 text-sm font-semibold text-[var(--paper-bright)] disabled:cursor-wait disabled:opacity-70"
          >
            {isSending ? "正在发送..." : "发送给 AI"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function CreateCopilotPanel({
  entrySource,
  archiveSlug,
  mode,
  initialDraft,
  initialSession,
  skipSessionRestore = false,
  onFlowStageChange,
}: CreateCopilotPanelProps = {}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<TravelProjectMessage[]>(
    initialSession?.messages ?? [],
  );
  const [projectId, setProjectId] = useState<string | undefined>(
    initialSession?.projectId,
  );
  const [flowStage, setFlowStage] = useState<TravelProjectFlowStage>(
    initialSession?.flowStage ?? "source_received",
  );
  const [isBootstrapping, setIsBootstrapping] = useState(!skipSessionRestore);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [generationStatus, setGenerationStatus] =
    useState<GenerationExperienceStatus | null>(null);
  const [generationErrorMessage, setGenerationErrorMessage] =
    useState<string>();

  const hasConversation = Boolean(projectId && messages.length > 0);
  const statusLabel = useMemo(
    () => getCreateCopilotStatusLabel(flowStage),
    [flowStage],
  );
  const latestUserMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => message.role === "user")
        ?.content ?? "",
    [messages],
  );
  const proposalSummary = useMemo(
    () => deriveProposalSummary(messages, flowStage),
    [flowStage, messages],
  );

  useEffect(() => {
    if (skipSessionRestore) {
      return;
    }

    let active = true;

    async function restore() {
      const restored = await restoreCreateCopilotSession().catch(() => null);

      if (!active) {
        return;
      }

      if (restored?.projectId) {
        setProjectId(restored.projectId);
        setFlowStage(restored.flowStage);
        setMessages(restored.messages);
      }

      setIsBootstrapping(false);
    }

    void restore();

    return () => {
      active = false;
    };
  }, [skipSessionRestore]);

  async function handleStartConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(undefined);

    if (!text.trim()) {
      setErrorMessage("先写一句吧。知道多少写多少。");
      return;
    }

    setIsSending(true);

    try {
      const submittedText = text.trim();
      const result = await submitCreateFlow({
        rawInput: submittedText,
        selectedInterests: [],
        selectedTravelStyles: [],
        entrySource,
        archiveSlug,
      });

      if (!result.projectSession?.projectId) {
        router.push(buildLoginHref("/create"));
        return;
      }

      const nextProjectId = result.projectSession.projectId;
      const nextFlowStage = result.projectSession.flowStage ?? "source_received";
      const nextMessages = [
        createLocalMessage("user", submittedText),
        ...(result.bootstrapReply
          ? [createLocalMessage("assistant", result.bootstrapReply)]
          : []),
      ];
      setProjectId(nextProjectId);
      setFlowStage(nextFlowStage);
      setMessages(nextMessages);
      onFlowStageChange?.({
        projectId: nextProjectId,
        flowStage: nextFlowStage,
        messages: nextMessages,
      });
      setText("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "刚才没接上，先检查一下输入，再试一次。",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendConversationMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(undefined);

    if (!projectId) {
      setErrorMessage("当前还没有创建出对话项目，请重新开始。");
      return;
    }

    if (!text.trim()) {
      setErrorMessage("先写一句，再继续往下聊。");
      return;
    }

    const submittedText = text.trim();
    const userMessage = createLocalMessage("user", submittedText);
    setMessages((current) => [...current, userMessage]);
    setIsSending(true);
    setText("");

    try {
      const result = await sendCreateCopilotMessage(projectId, submittedText);
      const assistantMessage = createLocalMessage("assistant", result.reply);
      const nextMessages = [...messages, userMessage, assistantMessage];
      setFlowStage(result.flowStage);
      setMessages(nextMessages);
      onFlowStageChange?.({
        projectId: result.projectId,
        flowStage: result.flowStage,
        messages: nextMessages,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `${error.message} 你也可以先回到旧补充流程继续。`
          : "这次没接上，你也可以先回到旧补充流程继续。",
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleStartOver() {
    clearProjectSession();
    setProjectId(undefined);
    setFlowStage("source_received");
    setMessages([]);
    setText("");
    setErrorMessage(undefined);
  }

  function handleUseClassicFlow() {
    router.push("/plan");
  }

  function handleCloseGenerationExperience() {
    setGenerationStatus(null);
    setGenerationErrorMessage(undefined);
  }

  async function handleAdjustProposal() {
    if (!projectId) {
      return;
    }

    setErrorMessage(undefined);
    setIsSending(true);

    try {
      const result = await moveCreateProposalToAdjusting(projectId);
      setFlowStage(result.flowStage);
      onFlowStageChange?.({
        projectId: result.projectId,
        flowStage: result.flowStage,
        messages,
      });
      setMessages((current) => [
        ...current,
        createLocalMessage("assistant", "好，我们继续调这版 proposal。你想改哪一部分？"),
      ]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "这版 proposal 暂时没切回可调整状态。",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleGenerateProposal() {
    if (!projectId) {
      return;
    }

    setErrorMessage(undefined);
    setIsGeneratingProposal(true);
    setGenerationErrorMessage(undefined);
    setGenerationStatus("generating");

    try {
      const result = await generateCreateProposal(projectId);
      setFlowStage(result.flowStage);
      setGenerationStatus("success");
      onFlowStageChange?.({
        projectId: result.projectId,
        flowStage: result.flowStage,
        currentVersionId: result.versionId,
        messages,
      });
    } catch (error) {
      setGenerationStatus("error");
      setGenerationErrorMessage(
        error instanceof Error
          ? error.message
          : "完整计划暂时还没生成出来。",
      );
    } finally {
      setIsGeneratingProposal(false);
    }
  }

  if (isBootstrapping) {
    return (
      <div className="rounded-[18px] border border-[var(--line)] bg-[var(--paper-bright)] px-3 py-4 text-sm text-[var(--ink-muted)]">
        正在检查你之前有没有继续中的 AI 规划...
      </div>
    );
  }

  if (hasConversation) {
    if (flowStage === "clarifying") {
      return (
        <CreateChatView
          messages={messages}
          inputValue={text}
          isSending={isSending}
          errorMessage={errorMessage}
          onInputChange={setText}
          onQuickOption={setText}
          onSubmit={handleSendConversationMessage}
        />
      );
    }

    if (generationStatus) {
      return (
        <ProjectGenerationExperience
          status={generationStatus}
          destinationLabel={
            latestUserMessage || messages[0]?.content || "your trip"
          }
          latestUserMessage={latestUserMessage}
          errorMessage={generationErrorMessage}
          onRetry={() => void handleGenerateProposal()}
          onBack={handleCloseGenerationExperience}
        />
      );
    }

    return (
      <CreateCopilotConversationView
        messages={messages}
        statusLabel={statusLabel}
        errorMessage={errorMessage}
        isSending={isSending}
        inputValue={text}
        onInputChange={setText}
        onSubmit={handleSendConversationMessage}
        onStartOver={handleStartOver}
        onUseClassicFlow={handleUseClassicFlow}
        currentStage={flowStage}
        onAdjustProposal={handleAdjustProposal}
        onGenerateProposal={handleGenerateProposal}
        isGeneratingProposal={isGeneratingProposal}
        proposalSummary={proposalSummary}
      />
    );
  }

  const emptyStateIntro = resolveEmptyStateIntro(entrySource);
  const emptyStatePlaceholder = resolveEmptyStatePlaceholder(entrySource, mode);
  const emptyStateQuickStarts = resolveEmptyStateQuickStarts(entrySource, mode);
  const showArchiveContext = shouldShowArchiveContext(entrySource, initialDraft);
  const archiveDestinationLabel = initialDraft?.tripRequestDraft.destinationCity?.trim();
  const archiveDays = initialDraft?.tripRequestDraft.days;

  return (
    <form
      onSubmit={handleStartConversation}
      className="paper-card relative flex min-h-0 flex-col overflow-hidden border border-[var(--line-strong)] bg-[var(--paper)] p-2.5 sm:min-h-0 sm:p-3"
    >
      <div
        aria-hidden="true"
        className="absolute -right-3 -top-3 h-10 w-24 rotate-3 bg-[var(--tape)] opacity-80"
      />

      <div className="relative flex min-h-0 flex-1 flex-col space-y-2">
        {showArchiveContext ? (
          <div
            data-testid="create-entry-archive-context"
            className="rounded-[18px] border border-[var(--line)] bg-[var(--paper-bright)] px-3 py-2"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
              来源
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
              {initialDraft?.tripTitle ?? "Explore 档案"}
            </p>
            {archiveDestinationLabel ? (
              <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
                目的地：{archiveDestinationLabel}
                {typeof archiveDays === "number" ? ` · ${archiveDays} 天` : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-[18px] border border-[var(--line)] bg-[var(--paper-bright)] px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
            Wanderly
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--ink)]">
            {emptyStateIntro}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {emptyStateQuickStarts.map((reply) => (
            <button
              key={reply}
              type="button"
              disabled={isSending}
              onClick={() => setText(reply)}
              className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-muted)] disabled:opacity-70"
            >
              {reply}
            </button>
          ))}
        </div>

        <div className="overflow-hidden border border-[var(--line-strong)] bg-[var(--paper-bright)] shadow-[4px_4px_0_var(--sand)]">
          <textarea
            id="trip-request"
            name="trip-request"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={2000}
            rows={4}
            disabled={isSending}
            placeholder={emptyStatePlaceholder}
            className="min-h-24 w-full resize-y bg-transparent px-3 py-2 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sage-deep)] disabled:cursor-wait"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-[var(--line)] px-3 py-1 text-xs text-[var(--ink-muted)]">
            <span>知道多少写多少</span>
            <span>{text.length}/2000</span>
          </div>
        </div>

        <div className="rounded-[18px] border border-dashed border-[var(--line)] bg-[var(--paper-bright)] px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
            试一句
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                disabled={isSending}
                onClick={() => setText(example)}
                className="rounded-[14px] border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-left text-sm leading-5 text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)] disabled:cursor-wait disabled:opacity-70"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {errorMessage ? (
          <p className="border-l-2 border-[var(--clay)] bg-[var(--clay-soft)] px-2.5 py-1 text-sm leading-5 text-[var(--clay-deep)]">
            {errorMessage}
          </p>
        ) : null}

        <div className="pt-1">
          <div className="flex flex-col gap-2 border-t border-dashed border-[var(--line)] pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-5 text-[var(--ink-muted)]">
              这里会优先进入 Copilot 对话流；只有你主动选择时，才会回到旧补充流程。
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleUseClassicFlow}
                className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm font-semibold text-[var(--ink-muted)]"
              >
                使用旧补充流程
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="min-h-9 rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-1.5 text-sm font-semibold text-[var(--paper-bright)] disabled:cursor-wait disabled:opacity-70"
              >
                {isSending ? "正在开始..." : "开始和 AI 一起规划"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

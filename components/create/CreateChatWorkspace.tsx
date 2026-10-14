"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { JourneyDirectory } from "@/components/create/JourneyDirectory";
import { TripDossier } from "@/components/create/TripDossier";
import {
  GenerationLoadingPage,
} from "@/components/create/GenerationLoadingPage";
import {
  GenerationErrorPage,
} from "@/components/create/GenerationErrorPage";
import {
  FirstPlanPage,
} from "@/components/create/FirstPlanPage";
import { RevisionSuggestionCard } from "@/components/create/RevisionSuggestionCard";
import { RevisionEditModePanel } from "@/components/create/RevisionEditModePanel";
import { sendRevisionChatMessage } from "@/lib/projects/revision-chat/revision-chat-client";
import type {
  RevisionModificationSuggestion,
} from "@/lib/projects/revision-chat/revision-chat-types";
import {
  buildRevisionApplySuccessMessage,
  REVISION_DEFAULT_MODE,
  buildRevisionChatHistory,
  buildRevisionModificationRequest,
  buildRevisionDailyOutline,
  buildRevisionSidebarEntries,
  buildRevisionVersionDescription,
  buildRevisionVersionLabel,
  buildRevisionWorkspaceHandoff,
  isRevisionPlaceholderId,
  resolveSelectedVersion,
  type RevisionMode,
} from "@/lib/projects/revision-mode";
import { applyWorkspaceVersionHandoff } from "@/lib/projects/workspace-context-client";
import {
  buildInitialRequirementsEntry,
  loadChatWorkspaceSnapshot,
  resolveVersionStatusLabel,
  type ChatWorkspaceSnapshot,
  type ChatWorkspaceVersion,
} from "@/lib/projects/chat-workspace-client";
import {
  generateCreateProposal,
  getCreateCopilotStatusLabel,
  moveCreateProposalToAdjusting,
  patchProjectFlowStage,
  persistProjectMessage,
  sendCreateCopilotMessage,
} from "@/lib/projects/create-copilot-client";
import {
  buildInterviewBootstrapPlan,
  submitCreateFlow,
  type CreateFlowFailureReason,
} from "@/lib/projects/create-flow-client";
import type { CreateEntrySource } from "@/lib/projects/create-entry";
import {
  DEVELOPMENT_GUEST_PROJECT_HEADER,
  shouldSendDevelopmentGuestProjectHeader,
} from "@/lib/projects/dev-bypass";
import type { GenerationExperienceStatus } from "@/lib/projects/generation-experience";
import {
  clearProjectSession,
  getProjectSession,
  mergeProjectSession,
} from "@/lib/projects/session";
import type {
  TravelProjectFlowStage,
  TravelProjectMessage,
} from "@/lib/projects/types";
import { buildLoginHref } from "@/lib/trips/save-client";
import { loadTripPlan } from "@/lib/trip/storage";
import type { TripPlan, TripPlanDraft } from "@/lib/trip/types";
import { requestWorkspaceAiModification } from "@/lib/projects/workspace-ai/workspace-ai-client";

const QUICK_STARTS = [
  "不知道去哪，但想找一个适合 4 天放松、美食多一点的地方。",
  "想去云南玩 5 天，节奏慢一点，风景和美食都想要。",
  "给我一版适合周末出发的轻松城市旅行。",
] as const;

const ARCHIVE_QUICK_STARTS = [
  "第二天节奏放慢一点，留出咖啡时间。",
  "多加一些本地小吃，少安排景点。",
  "整体方向可以，把夜里的内容再丰富一些。",
] as const;

const INITIAL_REQUIREMENTS_ID = "__initial_requirements__";

export const FIRST_TIME_INTERVIEW_QUESTIONS = [
  "你已经有想去的目的地，还是只知道大概想怎么旅行？",
  "这次大概什么时候出发，计划玩几天？",
  "这次会和谁一起出发？",
  "旅行里你最想要什么样的体验？比如风景、美食、散步、文化或慢节奏。",
  "预算、交通、住宿，或者其他需要我特别照顾的限制条件有哪些？",
] as const;

export const FIRST_TIME_INTERVIEW_TOTAL = FIRST_TIME_INTERVIEW_QUESTIONS.length;

const FIRST_TIME_TRANSITION_REPLIES = [
  "好的，我记下了。",
  "了解，继续。",
  "明白了。",
  "记下了，还剩最后一个问题。",
  "线索都收齐了，我这就为你整理第一版方案。",
] as const;

function resolveInterviewTransitionReply(answeredStep: number): string {
  const index = Math.min(
    Math.max(answeredStep, 1),
    FIRST_TIME_TRANSITION_REPLIES.length,
  ) - 1;
  return FIRST_TIME_TRANSITION_REPLIES[index];
}

const REVISION_QUICK_CHIPS = [
  { label: "更换景点", starter: "帮我更换某天的景点：" },
  { label: "调整节奏", starter: "整体节奏想再轻松一点，" },
  { label: "增加美食", starter: "多安排一次本地美食：" },
  { label: "修改预算", starter: "预算想调整成 " },
] as const;

function resolveInterviewStep(userMessageCount: number) {
  return Math.min(
    Math.max(userMessageCount + 1, 1),
    FIRST_TIME_INTERVIEW_TOTAL,
  );
}

function resolveInterviewProgressLabel(step: number, isComplete = false) {
  return isComplete
    ? `旅程线索 ${FIRST_TIME_INTERVIEW_TOTAL}/${FIRST_TIME_INTERVIEW_TOTAL} · 已收齐`
    : `旅程线索 ${Math.min(Math.max(step, 1), FIRST_TIME_INTERVIEW_TOTAL)}/${FIRST_TIME_INTERVIEW_TOTAL}`;
}

function resolveInterviewQuestion(step: number) {
  return FIRST_TIME_INTERVIEW_QUESTIONS[
    Math.min(Math.max(step, 1), FIRST_TIME_INTERVIEW_TOTAL) - 1
  ];
}

interface CreateChatWorkspaceProps {
  entrySource?: CreateEntrySource;
  archiveSlug?: string;
  initialDraft?: TripPlanDraft | null;
  initialProjectId?: string;
  initialVersionId?: string;
  forceRevisionMode?: boolean;
  onFirstVersionGenerated?: () => void;
}

type WorkspaceMode = "first-time" | "modification";

type FirstGenerationPhase = "collecting" | "generating" | "generated" | "error";

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

const REVISION_WELCOME_MESSAGE =
  "我已经读取这份旅行计划，可以帮你调整路线、节奏和细节。直接告诉我你想改哪里就好。";

function resolveEmptyStateQuickStarts(
  entrySource: CreateEntrySource | undefined,
) {
  if (entrySource === "explore_archive") {
    return ARCHIVE_QUICK_STARTS;
  }
  return QUICK_STARTS;
}

function resolveMode(flowStage: TravelProjectFlowStage | undefined): WorkspaceMode {
  if (!flowStage) {
    return "first-time";
  }

  if (
    flowStage === "workspace_ready" ||
    flowStage === "proposal_ready" ||
    flowStage === "proposal_adjusting"
  ) {
    return "modification";
  }

  return "first-time";
}

function buildConversationFromMessages(
  messages: TravelProjectMessage[],
) {
  return messages.filter(
    (message) => message.role === "user" || message.role === "assistant",
  );
}

function buildProposalSummary(
  messages: TravelProjectMessage[],
  flowStage: TravelProjectFlowStage,
) {
  if (flowStage !== "proposal_ready") {
    return null;
  }

  const userMessages = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const assistantMessages = messages
    .filter((message) => message.role === "assistant")
    .map((message) => message.content.trim())
    .filter(Boolean);

  const destinationMatch = userMessages.join(" ").match(
    /去([一-龥A-Za-z\s]{2,20}?)(?:玩|旅行|旅游|逛|，|。|\s)/,
  );
  const daysMatch = userMessages.join(" ").match(/(\d+)\s*(?:day|days|天)/i);

  return {
    title: `${destinationMatch?.[1]?.trim() ?? "待确认目的地"} 行程提案`,
    destination: destinationMatch?.[1]?.trim() ?? "待确认目的地",
    daysLabel: daysMatch?.[1] ? `${daysMatch[1]} 天` : "天数待确认",
    routeSummary:
      assistantMessages[assistantMessages.length - 1] ??
      "我已经整理出一版旅行方向，可以先确认 proposal 再生成完整计划。",
  };
}

function SidebarEntry({
  entry,
  isActive,
  onSelect,
  variant = "history",
}: {
  entry: ChatWorkspaceVersion;
  isActive: boolean;
  onSelect: (entry: ChatWorkspaceVersion) => void;
  variant?: "history" | "revision";
}) {
  const isPlaceholder = isRevisionPlaceholderId(entry.id);
  const isRevisionVariant = variant === "revision";
  const resolvedStatusLabel = (() => {
    if (isRevisionVariant && isPlaceholder) return "等待调整";
    if (isRevisionVariant && entry.isCurrent) return "当前方案";
    if (isPlaceholder) return "预留";
    return resolveVersionStatusLabel(entry);
  })();
  const primaryLabel = (() => {
    if (entry.id === INITIAL_REQUIREMENTS_ID) {
      return "序 · 初始需求";
    }
    if (isRevisionVariant) {
      return `V${entry.versionNumber}${isPlaceholder ? " · 等待调整" : ""}`;
    }
    return `第 ${entry.versionNumber} 版${isPlaceholder ? " · 待生成" : ""}`;
  })();

  const displayStatusLabel = isRevisionVariant
    ? isPlaceholder
      ? "待生成"
      : buildRevisionVersionDescription(entry)
    : resolvedStatusLabel;
  const displayPrimaryLabel =
    entry.id === INITIAL_REQUIREMENTS_ID
      ? "第 0 步 · 初始需求"
      : isRevisionVariant
        ? `V${entry.versionNumber}`
        : primaryLabel;

  return (
    <button
      type="button"
      onClick={() => {
        if (!isPlaceholder) {
          onSelect(entry);
        }
      }}
      disabled={isPlaceholder}
      aria-disabled={isPlaceholder}
      data-testid={`chat-workspace-sidebar-entry-${entry.id}`}
      className={`group flex w-full flex-col gap-1 border-l-2 px-3 py-2.5 text-left transition-colors ${
        isPlaceholder
          ? "cursor-not-allowed border-dashed border-[var(--line)] opacity-60"
          : isActive
            ? "border-[var(--clay)] bg-[var(--clay-soft)]/45"
            : "border-transparent hover:border-[var(--line-strong)] hover:bg-[var(--paper)]/65"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-serif text-xs font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
          {displayPrimaryLabel}
        </span>
        <span
          className={`text-[10px] font-medium ${
            isPlaceholder
              ? "text-[var(--ink-faint)]"
              : entry.isCurrent
                ? "text-[var(--sage-deep)]"
                : "text-[var(--ink-faint)]"
          }`}
        >
          {displayStatusLabel}
        </span>
      </div>
      <p className="truncate font-serif text-sm font-semibold text-[var(--ink)]">
        {entry.title}
      </p>
      <p className="truncate text-xs text-[var(--ink-muted)]">
        {entry.destination}
        {entry.days > 0 ? ` · ${entry.days} 天` : ""}
      </p>
    </button>
  );
}

function Sidebar({
  entries,
  activeEntryId,
  onSelectEntry,
  isLoading,
  variant = "history",
  revisionMode,
}: {
  entries: ChatWorkspaceVersion[];
  activeEntryId: string;
  onSelectEntry: (entry: ChatWorkspaceVersion) => void;
  isLoading: boolean;
  variant?: "history" | "revision";
  revisionMode?: RevisionMode;
}) {
  // 两种模式共用版本列表，但语义不同：讨论模式在说「正在聊哪一版」，
  // 编辑模式在说「挑一版带进工作台」。
  const heading =
    variant === "revision" && revisionMode === "edit"
      ? { title: "旅行计划档案", hint: "点一版，右边看它的安排，再带进工作台。" }
      : variant === "revision"
        ? { title: "旅行手札", hint: "正在和 AI 讨论选中的这一版。" }
        : { title: "旅行手札", hint: "每一版，都是我们一起整理出的方向。" };

  return (
    <aside
      data-testid="chat-workspace-sidebar"
      data-sidebar-mode={variant === "revision" ? revisionMode : variant}
      className="flex h-full min-h-0 flex-col border-r border-[var(--line)]/70 bg-[var(--paper)]/35 px-2 py-4 lg:px-3"
    >
      <header className="px-3 pb-4">
        <p className="font-serif text-lg font-semibold text-[var(--ink)]">
          {heading.title}
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
          {heading.hint}
        </p>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto"
        aria-live="polite"
        aria-busy={isLoading}
      >
        {entries.length === 0 ? (
          <p className="px-3 py-2 text-xs text-[var(--ink-muted)]">
            {isLoading ? "正在翻阅手札..." : "还没有保存的版本"}
          </p>
        ) : (
          entries.map((entry) => (
            <SidebarEntry
              key={entry.id}
              entry={entry}
              isActive={entry.id === activeEntryId}
              onSelect={onSelectEntry}
              variant={variant}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function resolveInterviewQuestionTitle(step: number) {
  const titles = [
    "先从目的地开始",
    "再确认出发安排",
    "了解这次的同行人",
    "找到你想要的旅行感觉",
    "最后确认边界和限制",
  ] as const;
  return titles[Math.min(Math.max(step, 1), titles.length) - 1];
}

function resolveInterviewQuestionHint(step: number) {
  const hints = [
    "如果还没有决定，也可以告诉我想体验的旅行类型。",
    "大概时间就可以，暂时不确定也没关系。",
    "一个人、和伴侣、家人或朋友都可以告诉我。",
    "比如风景、美食、散步、文化，或只是想放慢一点。",
    "预算、交通、住宿等条件，知道多少告诉我多少。",
  ] as const;
  return hints[Math.min(Math.max(step, 1), hints.length) - 1];
}

export function resolveBootstrapNotice(
  failure: { reason: CreateFlowFailureReason; message?: string } | null,
  interviewComplete: boolean,
) {
  // 「已登录但接口 401」和「本来就没登录」是两件事，文案必须分开，
  // 否则已登录用户会看到莫名其妙的登录提示。
  if (failure?.reason === "unauthorized") {
    return {
      text:
        failure.message?.trim() ||
        "当前登录状态刚刚失效了，重新登录后就能继续生成方案。",
      showLoginLink: true,
    };
  }

  return {
    text: interviewComplete
      ? "线索都收齐了。生成方案需要先登录，答案已经留在本页，不会丢。"
      : "答案已经留在本页，你可以继续回答。生成方案时再登录也不迟。",
    showLoginLink: interviewComplete,
  };
}

function InterviewProgress({
  step,
  complete,
}: {
  step: number;
  complete: boolean;
}) {
  const currentStep = Math.min(Math.max(step, 1), FIRST_TIME_INTERVIEW_TOTAL);

  return (
    <div
      data-testid="chat-workspace-interview-progress"
      className="flex items-center gap-3 border-b border-[var(--line)]/60 px-1 pb-3"
    >
      <p className="shrink-0 text-xs font-semibold text-[var(--ink-muted)]">
        {resolveInterviewProgressLabel(currentStep, complete)}
      </p>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {FIRST_TIME_INTERVIEW_QUESTIONS.map((_, index) => {
          const nodeNumber = index + 1;
          const isAnswered = complete || nodeNumber < currentStep;
          const isCurrent = !complete && nodeNumber === currentStep;

          return (
            <div key={nodeNumber} className="flex min-w-0 flex-1 items-center gap-1.5">
              <span
                aria-label={`问题 ${nodeNumber}${isAnswered ? "已完成" : isCurrent ? "进行中" : "未开始"}`}
                className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors ${
                  isAnswered
                    ? "bg-[var(--clay)]"
                    : isCurrent
                      ? "border-2 border-[var(--clay)] bg-[var(--paper)]"
                      : "border border-[var(--line-strong)] bg-[var(--paper)]"
                }`}
              />
              {nodeNumber < FIRST_TIME_INTERVIEW_TOTAL ? (
                <span
                  className={`h-px min-w-0 flex-1 ${
                    isAnswered ? "bg-[var(--clay)]/70" : "bg-[var(--line)]"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChatMessageList({
  interviewStep,
  interviewComplete,
  messages,
  isSending,
  errorMessage,
  statusLabel,
  interviewProgressLabel,
  interviewQuestion,
  proposalSummary,
  quickStarts,
  onQuickStart,
}: {
  interviewStep?: number;
  interviewComplete?: boolean;
  messages: TravelProjectMessage[];
  isSending: boolean;
  errorMessage?: string;
  statusLabel: string;
  interviewProgressLabel?: string;
  interviewQuestion?: string;
  proposalSummary: ReturnType<typeof buildProposalSummary>;
  quickStarts: readonly string[];
  onQuickStart: (value: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, isSending, interviewQuestion]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {typeof interviewStep === "number" ? (
        <InterviewProgress
          step={interviewStep}
          complete={Boolean(interviewComplete)}
        />
      ) : null}
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="font-serif text-lg font-semibold text-[var(--ink)]">
            和 Wanderly 一起整理
          </p>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            {interviewProgressLabel ?? statusLabel}
          </p>
        </div>
        <span className="text-[10px] text-[var(--ink-faint)]">
          {messages.length > 0 ? `${messages.length} 条记录` : ""}
        </span>
      </div>

      <div
        ref={listRef}
        data-testid="chat-workspace-message-list"
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-1 py-2 sm:px-4"
      >
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col justify-end gap-4 pb-2">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] font-serif text-xs font-bold text-[var(--paper-bright)]">
                W
              </div>
              <div className="max-w-[min(92%,560px)] text-sm leading-7 text-[var(--ink)]">
                <p className="mb-1 font-serif text-sm font-semibold">Wanderly</p>
                <p>你好，我是 Wanderly。</p>
                <p className="mt-1 text-[var(--ink-muted)]">
                  我会通过 5 个问题了解你的旅行想法，然后生成第一版方案。
                </p>
                {interviewQuestion ? (
                  <div className="mt-5 border-l-2 border-[var(--clay)] pl-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                      问题 {interviewStep ?? 1}
                    </p>
                    <p className="mt-1 font-serif text-lg font-semibold leading-8">
                      {resolveInterviewQuestionTitle(interviewStep ?? 1)}
                    </p>
                    <p className="mt-1 font-serif text-base font-semibold leading-7">
                      {interviewQuestion}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      {resolveInterviewQuestionHint(interviewStep ?? 1)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-[var(--ink-muted)]">
                    五个线索已经收齐，我们可以继续把它整理成第一版旅行方案。
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pl-10">
              {quickStarts.map((quickStart) => (
                <button
                  key={quickStart}
                  type="button"
                  onClick={() => onQuickStart(quickStart)}
                  className="border-b border-dashed border-[var(--line-strong)] pb-0.5 text-left text-[11px] font-semibold text-[var(--ink-muted)] transition-colors hover:border-[var(--clay)] hover:text-[var(--ink)]"
                >
                  {quickStart}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  data-testid={`chat-workspace-message-${message.role}`}
                  className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser ? (
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] font-serif text-xs font-bold text-[var(--paper-bright)]">
                      W
                    </div>
                  ) : null}
                  <div
                    className={`max-w-[min(88%,640px)] text-sm leading-7 ${
                      isUser
                        ? "rounded-2xl rounded-tr-sm bg-[var(--sage-soft)] px-4 py-2.5 text-[var(--ink)]"
                        : "text-[var(--ink)]"
                    }`}
                  >
                    <p className={`mb-1 text-xs font-semibold ${isUser ? "text-right text-[var(--ink-muted)]" : "font-serif text-[var(--ink)]"}`}>
                      {isUser ? "你" : "Wanderly · 你的旅行顾问"}
                    </p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              );
            })}
            {interviewQuestion ? (
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] font-serif text-xs font-bold text-[var(--paper-bright)]">
                  W
                </div>
                <div className="max-w-[min(88%,640px)] text-sm leading-7 text-[var(--ink)]">
                  <p className="mb-1 font-serif text-xs font-semibold text-[var(--ink)]">
                    Wanderly · 下一条线索
                  </p>
                  <p className="font-serif text-base font-semibold">
                    {interviewQuestion}
                  </p>
                </div>
              </div>
            ) : interviewProgressLabel?.includes("已收齐") ? (
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] font-serif text-xs font-bold text-[var(--paper-bright)]">
                  W
                </div>
                <p className="max-w-[min(88%,640px)] text-sm leading-7 text-[var(--ink)]">
                  线索收齐了。接下来可以继续和我聊想法，准备好后再把它整理成第一版旅行计划。
                </p>
              </div>
            ) : null}
          </>
        )}

        {proposalSummary ? (
          <section className="ml-10 border-l-2 border-[var(--clay)] px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              已整理方向
            </p>
            <h3 className="mt-1 font-serif text-base font-semibold text-[var(--ink)]">
              {proposalSummary.title}
            </h3>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ink-muted)]">
              <span>目的地：{proposalSummary.destination}</span>
              <span>天数：{proposalSummary.daysLabel}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--ink)]">
              {proposalSummary.routeSummary}
            </p>
          </section>
        ) : null}

        {isSending ? (
          <div className="flex items-center gap-3 text-xs italic text-[var(--ink-muted)]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)] font-serif text-xs font-bold text-[var(--paper-bright)]">
              W
            </div>
            Wanderly 正在听你说...
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="border-l-2 border-[var(--dusty-rose)] px-3 py-1 text-sm leading-6 text-[var(--dusty-rose)]"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function ChatComposer({
  isFirstTimeMode,
  interviewComplete,
  inputValue,
  onInputChange,
  onSubmit,
  isSending,
  canSend,
  onGenerateNewVersion,
  isGeneratingVersion,
  showGenerateButton,
  onAdjustProposal,
  isAdjusting,
  showAdjustButton,
  isRevisionMode = false,
}: {
  isFirstTimeMode: boolean;
  interviewComplete: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSending: boolean;
  canSend: boolean;
  onGenerateNewVersion: () => void;
  isGeneratingVersion: boolean;
  showGenerateButton: boolean;
  onAdjustProposal: () => void;
  isAdjusting: boolean;
  showAdjustButton: boolean;
  isRevisionMode?: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
      data-testid="chat-workspace-composer"
      className="border-t border-[var(--line)]/70 pt-3"
    >
      <div className="border-b border-[var(--line-strong)] bg-[var(--paper-bright)]/45 px-3 py-2 shadow-[0_2px_0_var(--sand)] focus-within:border-[var(--clay)] sm:px-4">
        <textarea
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          rows={2}
          maxLength={2000}
          disabled={isSending}
          placeholder={
            isRevisionMode
              ? "告诉我想调整哪里……"
              : isFirstTimeMode && !interviewComplete
                ? "请回答上面的问题，知道多少告诉我多少。"
                : "和我说说这次想怎么旅行……"
          }
          className="min-h-14 w-full resize-none bg-transparent px-0.5 py-1 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5">
          <p className="text-[10px] tracking-[0.04em] text-[var(--ink-faint)]">
            Enter 发送 · Shift + Enter 换行
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {showAdjustButton ? (
              <button
                type="button"
                onClick={onAdjustProposal}
                disabled={isSending || isAdjusting}
                className="rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--ink-muted)] hover:bg-[var(--paper)] disabled:opacity-70"
              >
                继续调整提案
              </button>
            ) : null}
            {showGenerateButton ? (
              <button
                type="button"
                onClick={onGenerateNewVersion}
                disabled={isSending || isGeneratingVersion}
                data-testid="chat-workspace-generate-button"
                className="rounded-full bg-[var(--ink)] px-3 py-1.5 text-xs font-semibold text-[var(--paper-bright)] disabled:cursor-wait disabled:opacity-70"
              >
                {isGeneratingVersion ? "正在整理..." : "整理成新版本"}
              </button>
            ) : null}
            <button
              type="submit"
              disabled={isSending || !canSend}
              data-testid="chat-workspace-send-button"
              className="rounded-full bg-[var(--clay)] px-3.5 py-1.5 text-xs font-semibold text-[var(--paper-bright)] disabled:cursor-wait disabled:opacity-60"
            >
              {isSending ? "正在听..." : "发送"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function GenerationExperience({
  status,
  destinationLabel,
  errorMessage,
  onRetry,
  onBack,
}: {
  status: GenerationExperienceStatus;
  destinationLabel?: string;
  errorMessage?: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <section
      data-testid="chat-workspace-generation-experience"
      className="flex min-h-0 flex-1 flex-col justify-center px-4 py-8 sm:px-10"
    >
      <p className="journey-kicker">旅行手札正在展开</p>
      <h3 className="mt-2 font-serif text-2xl font-semibold text-[var(--ink)]">
        {status === "error"
          ? "这一页暂时没整理好"
          : destinationLabel
            ? `正在为 ${destinationLabel} 整理旅程`
            : "正在整理你的旅程"}
      </h3>
      <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--ink-muted)]">
        {status === "error"
          ? errorMessage ?? "刚才生成新版本没成功，可以回到对话继续聊。"
          : "我会把刚才的对话整理成一版可以慢慢翻阅的旅行计划。完成后，它会出现在左侧手札里。"}
      </p>
      {status === "error" ? (
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper-bright)]"
          >
            再整理一次
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--ink-muted)] hover:bg-[var(--paper-bright)]"
          >
            回到对话
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function CreateChatWorkspace({
  entrySource,
  archiveSlug,
  initialDraft,
  initialProjectId,
  initialVersionId,
  forceRevisionMode = false,
}: CreateChatWorkspaceProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [projectId, setProjectId] = useState<string>();
  const [flowStage, setFlowStage] = useState<TravelProjectFlowStage>(
    "source_received",
  );
  const [versions, setVersions] = useState<ChatWorkspaceVersion[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string>(
    INITIAL_REQUIREMENTS_ID,
  );
  const [messages, setMessages] = useState<TravelProjectMessage[]>([]);
  const [interviewStep, setInterviewStep] = useState(1);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingVersion, setIsGeneratingVersion] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [generationStatus, setGenerationStatus] =
    useState<GenerationExperienceStatus | null>(null);
  const [generationErrorMessage, setGenerationErrorMessage] = useState<string>();
  const [firstGenerationPhase, setFirstGenerationPhase] =
    useState<FirstGenerationPhase>("collecting");
  const [firstGenerationError, setFirstGenerationError] = useState<string>();
  const [isRevisionMode, setIsRevisionMode] = useState(false);
  const [currentTripPlan, setCurrentTripPlan] = useState<TripPlan | null>(null);
  const pendingMessagePersistenceRef = useRef<Promise<unknown>[]>([]);
  // 五问收集阶段完全本地：答案只进本地状态，不调任何后端 API。
  // 答完 5 问后显示"生成方案"按钮，点击时才建项目。
  const firstAnswerRef = useRef<string | null>(null);
  const followUpAnswersRef = useRef<string[]>([]);
  const [needsAccountForGeneration, setNeedsAccountForGeneration] =
    useState(false);
  const [bootstrapFailure, setBootstrapFailure] = useState<{
    reason: CreateFlowFailureReason;
    message?: string;
  } | null>(null);
  const [revisionSuggestion, setRevisionSuggestion] =
    useState<RevisionModificationSuggestion | null>(null);
  const [isRevisionSending, setIsRevisionSending] = useState(false);
  const [revisionError, setRevisionError] = useState<string>();
  const [isApplyingRevisionSuggestion, setIsApplyingRevisionSuggestion] =
    useState(false);
  const [revisionApplyError, setRevisionApplyError] = useState<string>();
  const [revisionApplySuccessMessage, setRevisionApplySuccessMessage] =
    useState<string>();
  const [revisionMode, setRevisionMode] =
    useState<RevisionMode>(REVISION_DEFAULT_MODE);
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const [isEnteringWorkspace, setIsEnteringWorkspace] = useState(false);
  const [workspaceHandoffError, setWorkspaceHandoffError] = useState<string>();

  const workspaceMode: WorkspaceMode = useMemo(
    () => resolveMode(flowStage),
    [flowStage],
  );

  const statusLabel = useMemo(
    () => getCreateCopilotStatusLabel(flowStage),
    [flowStage],
  );

  const messageSource = useMemo(
    () => buildConversationFromMessages(messages),
    [messages],
  );

  const proposalSummary = useMemo(
    () => buildProposalSummary(messageSource, flowStage),
    [flowStage, messageSource],
  );

  const showGenerateButton = flowStage === "proposal_ready";
  const showAdjustButton = flowStage === "proposal_ready";

  const sidebarEntries = useMemo<ChatWorkspaceVersion[]>(() => {
    if (versions.length === 0 && workspaceMode === "first-time") {
      return [buildInitialRequirementsEntry()];
    }
    return [buildInitialRequirementsEntry(), ...versions];
  }, [versions, workspaceMode]);

  const revisionSidebarEntries = useMemo<ChatWorkspaceVersion[]>(
    () => buildRevisionSidebarEntries(versions),
    [versions],
  );

  const effectiveSidebarEntries = isRevisionMode
    ? revisionSidebarEntries
    : sidebarEntries;

  const selectedRevisionVersion = useMemo<ChatWorkspaceVersion | null>(
    () => resolveSelectedVersion(revisionSidebarEntries, selectedVersionId),
    [revisionSidebarEntries, selectedVersionId],
  );

  const chatMessages = messageSource;

  const latestUserMessage = useMemo(
    () =>
      [...messageSource]
        .reverse()
        .find((message) => message.role === "user")
        ?.content ?? "",
    [messageSource],
  );

  const refreshSnapshot = useCallback(
    async (targetProjectId: string) => {
      const snapshot = await loadChatWorkspaceSnapshot(targetProjectId);
      return snapshot;
    },
    [],
  );

  // 答完 5 问后，用户点击"生成方案"时才建项目。
  // 失败时显示内联提示，不跳转。
  const createProjectForGeneration = useCallback(async (): Promise<string | null> => {
    const plan = buildInterviewBootstrapPlan(
      firstAnswerRef.current,
      followUpAnswersRef.current,
    );

    if (!plan.rawInput) {
      return null;
    }

    try {
      const result = await submitCreateFlow({
        rawInput: plan.rawInput,
        selectedInterests: [],
        selectedTravelStyles: [],
        entrySource,
        archiveSlug,
      });

      const nextProjectId = result.projectSession?.projectId;
      if (!nextProjectId) {
        setBootstrapFailure({
          reason: result.failureReason ?? "no_auth",
          message: result.failureMessage,
        });
        setNeedsAccountForGeneration(true);
        return null;
      }

      setProjectId(nextProjectId);
      setFlowStage(result.projectSession?.flowStage ?? "source_received");
      setNeedsAccountForGeneration(false);
      setBootstrapFailure(null);

      // 建项目成功后，把 2-5 问的答案补写到项目消息里
      pendingMessagePersistenceRef.current.push(
        ...plan.followUpAnswers.map((content) =>
          persistProjectMessage(nextProjectId, {
            role: "user",
            content,
          }).catch((error: unknown) => {
            console.warn("[create-chat] flush follow-up answer failed", error);
          }),
        ),
      );

      return nextProjectId;
    } catch (error) {
      console.warn("[create-chat] project creation failed", error);
      setBootstrapFailure({
        reason: "no_auth",
        message: error instanceof Error ? error.message : undefined,
      });
      setNeedsAccountForGeneration(true);
      return null;
    }
  }, [archiveSlug, entrySource]);

  const runFirstGeneration = useCallback(
    async (overrideProjectId?: string) => {
      const targetProjectId = overrideProjectId ?? projectId;
      if (!targetProjectId) {
        return;
      }

      setIsGeneratingVersion(true);
      setFirstGenerationError(undefined);
      setGenerationErrorMessage(undefined);

      try {
        const result = await generateCreateProposal(targetProjectId);
        setFlowStage(result.flowStage);
        setCurrentTripPlan(result.tripPlan);

        const snapshot = await refreshSnapshot(targetProjectId);
        if (snapshot) {
          setVersions(snapshot.versions);
          setActiveEntryId(result.versionId ?? INITIAL_REQUIREMENTS_ID);
        } else {
          setActiveEntryId(result.versionId ?? INITIAL_REQUIREMENTS_ID);
        }

        setFirstGenerationPhase("generated");
        setGenerationStatus("success");
      } catch (error) {
        setFirstGenerationError(
          error instanceof Error
            ? error.message
            : "完整计划暂时还没生成出来，可以稍后再试一次。",
        );
        setFirstGenerationPhase("error");
      } finally {
        setIsGeneratingVersion(false);
      }
    },
    [projectId, refreshSnapshot],
  );

  const startFirstGeneration = useCallback(() => {
    setFirstGenerationError(undefined);
    setFirstGenerationPhase("generating");
    void runFirstGeneration();
  }, [runFirstGeneration]);

  const runFirstGenerationRef = useRef(runFirstGeneration);
  useEffect(() => {
    runFirstGenerationRef.current = runFirstGeneration;
  }, [runFirstGeneration]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const stored = getProjectSession();
      const targetProjectId = stored?.projectId ?? initialProjectId;
      const targetVersionId = stored?.versionId ?? initialVersionId;

      if (forceRevisionMode && targetProjectId && targetVersionId) {
        mergeProjectSession({
          projectId: targetProjectId,
          versionId: targetVersionId,
          sourceType: stored?.sourceType ?? "existing_trip",
          flowStage: stored?.flowStage ?? "workspace_ready",
        });
      }

      if (!targetProjectId) {
        if (active) {
          setIsBootstrapping(false);
        }
        return;
      }

      const snapshot: ChatWorkspaceSnapshot | null = await refreshSnapshot(
        targetProjectId,
      );

      if (!active) {
        return;
      }

      if (!snapshot) {
        clearProjectSession();
        setIsBootstrapping(false);
        return;
      }

      setProjectId(snapshot.projectId);
      setFlowStage(snapshot.flowStage);
      setVersions(snapshot.versions);
      const resolvedSelectedVersionId =
        (forceRevisionMode ? targetVersionId : undefined) ??
        snapshot.currentVersionId;
      setActiveEntryId(resolvedSelectedVersionId ?? INITIAL_REQUIREMENTS_ID);

      const restoredTripPlan = loadTripPlan();
      const selectedSnapshotVersion =
        snapshot.versions.find((version) => version.id === resolvedSelectedVersionId) ??
        snapshot.versions.find((version) => version.isCurrent) ??
        snapshot.versions[0];
      setCurrentTripPlan(selectedSnapshotVersion?.tripPlan ?? restoredTripPlan ?? null);

      const headers: Record<string, string> = {};
      if (shouldSendDevelopmentGuestProjectHeader()) {
        headers[DEVELOPMENT_GUEST_PROJECT_HEADER] = "1";
      }

      const messagesResponse = await fetch(
        `/api/projects/${snapshot.projectId}/messages?limit=50`,
        { headers },
      ).catch(() => null);

      if (messagesResponse && messagesResponse.ok && active) {
        const payload = (await messagesResponse.json()) as {
          messages?: TravelProjectMessage[];
        };
        const restoredMessages = payload.messages ?? [];
        const revisionBootMessages =
          forceRevisionMode &&
          !restoredMessages.some(
            (message) =>
              message.role === "assistant" &&
              message.content === REVISION_WELCOME_MESSAGE,
          )
            ? [
                ...restoredMessages,
                createLocalMessage("assistant", REVISION_WELCOME_MESSAGE),
              ]
            : restoredMessages;
        setMessages(revisionBootMessages);
        if (forceRevisionMode) {
          setIsRevisionMode(true);
          setRevisionMode(REVISION_DEFAULT_MODE);
          setSelectedVersionId(resolvedSelectedVersionId);
          setGenerationStatus(null);
          setGenerationErrorMessage(undefined);
          setFirstGenerationError(undefined);
          setFirstGenerationPhase("collecting");
          setRevisionSuggestion(null);
          setWorkspaceHandoffError(undefined);
        } else if (resolveMode(snapshot.flowStage) === "first-time") {
          const restoredUserMessageCount = restoredMessages.filter(
            (message) => message.role === "user",
          ).length;
          const restoredStep = resolveInterviewStep(restoredUserMessageCount);
          setInterviewStep(restoredStep);
          const restoredInterviewComplete =
            restoredUserMessageCount >= FIRST_TIME_INTERVIEW_TOTAL;
          setInterviewComplete(restoredInterviewComplete);
          if (
            restoredInterviewComplete &&
            snapshot.versions.length === 0 &&
            snapshot.flowStage !== "workspace_ready"
          ) {
            setFirstGenerationError(undefined);
            setFirstGenerationPhase("generating");
            void runFirstGenerationRef.current(snapshot.projectId);
          }
        }
      }

      if (active) {
        setIsBootstrapping(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [forceRevisionMode, initialProjectId, initialVersionId, refreshSnapshot]);

  function handleStartConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(undefined);

    const submittedText = text.trim();

    if (!submittedText) {
      setErrorMessage("先写一句吧。知道多少写多少。");
      return;
    }

    // 阶段 A 完全本地：答案只进本地状态，不调任何后端 API。
    firstAnswerRef.current = submittedText;
    followUpAnswersRef.current = [];
    pendingMessagePersistenceRef.current = [];
    setNeedsAccountForGeneration(false);
    setBootstrapFailure(null);
    setMessages([
      createLocalMessage("user", submittedText),
      createLocalMessage("assistant", resolveInterviewTransitionReply(1)),
    ]);
    setVersions([]);
    setActiveEntryId(INITIAL_REQUIREMENTS_ID);
    setInterviewStep(2);
    setInterviewComplete(false);
    setText("");
  }

  async function handleSendConversationMessage(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setErrorMessage(undefined);

    if (!text.trim()) {
      setErrorMessage("先写一句，再继续往下聊。");
      return;
    }

    const submittedText = text.trim();
    const userMessage = createLocalMessage("user", submittedText);

    if (isRevisionMode) {
      const session = getProjectSession();
      // 讨论始终围绕左侧当前选中的那一版，回落到 session 记录的版本。
      const targetVersionId = selectedRevisionVersion?.id ?? session?.versionId;
      if (!projectId || !targetVersionId) {
        setRevisionError("暂时找不到当前方案的版本号，请重新开始。");
        return;
      }

      setText("");
      setRevisionError(undefined);
      setMessages((current) => [...current, userMessage]);
      setIsRevisionSending(true);

      const history = buildRevisionChatHistory(messages, submittedText);

      try {
        const result = await sendRevisionChatMessage({
          projectId,
          versionId: targetVersionId,
          message: submittedText,
          history,
        });

        setRevisionApplyError(undefined);
        setRevisionApplySuccessMessage(undefined);

        if (result.type === "modification_suggestion") {
          setRevisionSuggestion(result);
        } else {
          setRevisionSuggestion(null);
        }

        setMessages((current) => [
          ...current,
          createLocalMessage("assistant", result.message),
        ]);
      } catch (error) {
        setRevisionError(
          error instanceof Error
            ? error.message
            : "AI 修改建议这次没有返回，可以稍后再试。",
        );
      } finally {
        setIsRevisionSending(false);
      }
      return;
    }

    // 五问收集阶段放在 projectId 守卫之前：项目还没建起来也要能继续答题。
    if (workspaceMode === "first-time") {
      const answeredStep = interviewStep;
      const isFifthAnswerSubmit = answeredStep >= FIRST_TIME_INTERVIEW_TOTAL;
      const nextStep = Math.min(answeredStep + 1, FIRST_TIME_INTERVIEW_TOTAL);
      const transitionReply = resolveInterviewTransitionReply(answeredStep);
      const assistantMessage = createLocalMessage("assistant", transitionReply);

      setText("");
      setMessages((current) => [...current, userMessage, assistantMessage]);
      setInterviewStep(nextStep);

      // 2-5 问的答案存到 followUpAnswersRef，等用户点击"生成方案"时再一起建项目
      if (answeredStep >= 2 && answeredStep <= 5) {
        followUpAnswersRef.current.push(submittedText);
      }

      if (isFifthAnswerSubmit) {
        setInterviewComplete(true);
        // 答完 5 问后不自动生成，等用户点击"生成方案"按钮
      }
      return;
    }

    if (!projectId) {
      setErrorMessage("当前还没有创建出对话项目，请重新开始。");
      return;
    }

    setIsSending(true);
    setText("");

    try {
      const result = await sendCreateCopilotMessage(projectId, submittedText);
      const assistantMessage = createLocalMessage("assistant", result.reply);
      setFlowStage(result.flowStage);
      setMessages((current) => [...current, userMessage, assistantMessage]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "这次没接上，再试一次。",
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
    setVersions([]);
    setActiveEntryId(INITIAL_REQUIREMENTS_ID);
    setInterviewStep(1);
    setInterviewComplete(false);
    setText("");
    setErrorMessage(undefined);
    setGenerationStatus(null);
    setFirstGenerationPhase("collecting");
    setFirstGenerationError(undefined);
    setIsRevisionMode(false);
    setCurrentTripPlan(null);
    setRevisionSuggestion(null);
    setRevisionError(undefined);
    setIsRevisionSending(false);
    setRevisionApplyError(undefined);
    setRevisionApplySuccessMessage(undefined);
    setIsApplyingRevisionSuggestion(false);
    setRevisionMode(REVISION_DEFAULT_MODE);
    setSelectedVersionId(undefined);
    setIsEnteringWorkspace(false);
    setWorkspaceHandoffError(undefined);
    pendingMessagePersistenceRef.current = [];
    firstAnswerRef.current = null;
    followUpAnswersRef.current = [];
    setNeedsAccountForGeneration(false);
    setBootstrapFailure(null);
  }

  async function handleGenerateNewVersion() {
    if (!projectId) {
      return;
    }

    setErrorMessage(undefined);
    setIsGeneratingVersion(true);
    setGenerationErrorMessage(undefined);
    setGenerationStatus("generating");

    try {
      const result = await generateCreateProposal(projectId);
      setFlowStage(result.flowStage);

      const snapshot = await refreshSnapshot(projectId);
      if (snapshot) {
        setVersions(snapshot.versions);
        setActiveEntryId(result.versionId ?? INITIAL_REQUIREMENTS_ID);
      } else {
        setActiveEntryId(result.versionId ?? INITIAL_REQUIREMENTS_ID);
      }

      setGenerationStatus("success");
    } catch (error) {
      setGenerationStatus("error");
      setGenerationErrorMessage(
        error instanceof Error
          ? error.message
          : "完整计划暂时还没生成出来。",
      );
    } finally {
      setIsGeneratingVersion(false);
    }
  }

  async function handleAdjustProposal() {
    if (!projectId) {
      return;
    }

    setErrorMessage(undefined);
    setIsAdjusting(true);

    try {
      const result = await moveCreateProposalToAdjusting(projectId);
      setFlowStage(result.flowStage);
      setMessages((current) => [
        ...current,
        createLocalMessage(
          "assistant",
          "好，我们继续调这版 proposal。你想改哪一部分？",
        ),
      ]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "这版 proposal 暂时没切回可调整状态。",
      );
    } finally {
      setIsAdjusting(false);
    }
  }

  function handleSelectEntry(entry: ChatWorkspaceVersion) {
    setActiveEntryId(entry.id);

    // Revision Mode 下选择只切换「看哪一版」，不触碰任何版本数据。
    if (isRevisionMode && !isRevisionPlaceholderId(entry.id)) {
      setSelectedVersionId(entry.id);
      if (entry.tripPlan) {
        setCurrentTripPlan(entry.tripPlan);
      }
      setWorkspaceHandoffError(undefined);
    }
  }

  function handleEnterWorkspace() {
    const handoff = buildRevisionWorkspaceHandoff(selectedRevisionVersion);

    if (!handoff) {
      setWorkspaceHandoffError("先选一版旅行计划，再进入工作台。");
      return;
    }

    setWorkspaceHandoffError(undefined);
    setIsEnteringWorkspace(true);

    const applied = applyWorkspaceVersionHandoff({
      versionId: handoff.versionId,
      tripPlan: handoff.tripPlan,
    });

    if (!applied) {
      setIsEnteringWorkspace(false);
      setWorkspaceHandoffError(
        "暂时没接上这一版的工作台入口，请刷新后再试。",
      );
      return;
    }

    router.push("/workspace");
  }

  async function handleApplyRevisionSuggestion() {
    if (!revisionSuggestion) {
      setRevisionApplyError("先等 AI 给出可以应用的修改建议。");
      return;
    }

    if (!projectId || !selectedRevisionVersion?.id) {
      setRevisionApplyError("暂时找不到当前版本的信息，请刷新后再试。");
      return;
    }

    const modificationRequest =
      buildRevisionModificationRequest(revisionSuggestion);

    setRevisionApplyError(undefined);
    setRevisionApplySuccessMessage(undefined);
    setIsApplyingRevisionSuggestion(true);

    try {
      const result = await requestWorkspaceAiModification({
        projectId,
        versionId: selectedRevisionVersion.id,
        modificationRequest,
      });
      const snapshot = await refreshSnapshot(projectId);

      if (snapshot) {
        setVersions(snapshot.versions);
        setFlowStage(snapshot.flowStage);
        setActiveEntryId(snapshot.currentVersionId ?? result.versionId);
      } else {
        setFlowStage(result.stage);
        setActiveEntryId(result.versionId);
      }

      setCurrentTripPlan(result.tripPlan);
      setSelectedVersionId(result.versionId);
      setRevisionSuggestion(null);
      setWorkspaceHandoffError(undefined);

      const refreshedVersion = snapshot?.versions.find(
        (version) => version.id === result.versionId,
      );
      setCurrentTripPlan(refreshedVersion?.tripPlan ?? result.tripPlan);
      setRevisionApplySuccessMessage(
        buildRevisionApplySuccessMessage(refreshedVersion?.versionNumber),
      );
    } catch (error) {
      setRevisionApplyError(
        error instanceof Error
          ? error.message
          : "应用修改暂时失败，请稍后再试。",
      );
    } finally {
      setIsApplyingRevisionSuggestion(false);
    }
  }

  function handleQuickStart(value: string) {
    setText(value);
  }

  if (isBootstrapping) {
    return (
      <div className="rounded-[18px] border border-[var(--line)] bg-[var(--paper-bright)] px-3 py-4 text-sm text-[var(--ink-muted)]">
        正在检查你之前有没有继续中的 AI 规划...
      </div>
    );
  }

  if (firstGenerationPhase === "generating") {
    return (
      <div
        data-testid="create-chat-workspace"
        data-workspace-mode={workspaceMode}
        data-first-generation-phase={firstGenerationPhase}
        className="relative min-h-[560px]"
      >
        <GenerationLoadingPage
          key="first-version-generating"
          context="first_version"
          destinationLabel={
            latestUserMessage ||
            initialDraft?.tripRequestDraft.destinationCity?.trim() ||
            "这段旅程"
          }
          daysLabel={
            initialDraft?.tripRequestDraft.days
              ? `${initialDraft.tripRequestDraft.days} 天`
              : undefined
          }
        />
      </div>
    );
  }

  if (firstGenerationPhase === "generated") {
    if (!projectId) {
      return null;
    }
    return (
      <div
        data-testid="create-chat-workspace"
        data-workspace-mode={workspaceMode}
        data-first-generation-phase={firstGenerationPhase}
        className="relative min-h-[560px]"
      >
        <FirstPlanPage
          projectId={projectId}
          onAdjust={() => {
            if (!projectId) {
              return;
            }
            setErrorMessage(undefined);
            setGenerationStatus(null);
            setGenerationErrorMessage(undefined);
            setFirstGenerationError(undefined);
            setRevisionSuggestion(null);
            setRevisionError(undefined);
            setIsRevisionSending(false);
            setIsRevisionMode(true);
            // 进入 Revision Mode 默认落在「计划讨论」，选中当前版本。
            setRevisionMode(REVISION_DEFAULT_MODE);
            setSelectedVersionId(
              resolveSelectedVersion(revisionSidebarEntries)?.id,
            );
            setWorkspaceHandoffError(undefined);
            setIsEnteringWorkspace(false);
            setMessages((current) => [
              ...current,
              createLocalMessage(
                "assistant",
                "我已经看过这份旅行计划，可以继续帮你调整。把你想改的地方告诉我，先聊清楚方向就好。",
              ),
            ]);
            setFirstGenerationPhase("collecting");
          }}
        />
      </div>
    );
  }

  if (firstGenerationPhase === "error") {
    return (
      <div
        data-testid="create-chat-workspace"
        data-workspace-mode={workspaceMode}
        data-first-generation-phase={firstGenerationPhase}
        className="relative min-h-[560px]"
      >
        <GenerationErrorPage
          message={firstGenerationError}
          onBack={() => {
            setFirstGenerationError(undefined);
            setFirstGenerationPhase("collecting");
          }}
          onRetry={() => {
            setFirstGenerationError(undefined);
            startFirstGeneration();
          }}
        />
      </div>
    );
  }

  const activeEntry = effectiveSidebarEntries.find(
    (entry) => entry.id === activeEntryId,
  );

  // Revision Mode 顶部信息全部跟随左侧选中的那一版；
  // 只有当选中版本自身缺字段时，才回落到本地 tripPlan。
  const selectedRevisionPlan = selectedRevisionVersion?.tripPlan ?? null;
  const revisionSummary =
    selectedRevisionVersion?.summary?.trim() ||
    selectedRevisionPlan?.summary?.trim();
  const revisionTitle =
    selectedRevisionVersion?.title?.trim() ||
    selectedRevisionPlan?.tripTitle?.trim() ||
    "当前方案";
  const revisionVersionNumber = selectedRevisionVersion?.versionNumber ?? 1;
  const revisionVersionLabel = buildRevisionVersionLabel(revisionVersionNumber);
  const revisionDestination =
    selectedRevisionVersion?.destination?.trim() ||
    currentTripPlan?.destination?.trim() ||
    "";
  const revisionDays =
    selectedRevisionVersion?.days || currentTripPlan?.days || 0;
  const revisionDailyOutline = buildRevisionDailyOutline(selectedRevisionPlan);
  const showArchiveContext =
    !isRevisionMode && entrySource === "explore_archive" && Boolean(initialDraft);
  const archiveDestinationLabel = initialDraft?.tripRequestDraft.destinationCity?.trim();
  const archiveDays = initialDraft?.tripRequestDraft.days;
  const interviewProgressLabel =
    workspaceMode === "first-time"
      ? resolveInterviewProgressLabel(interviewStep, interviewComplete)
      : undefined;
  const interviewQuestion =
    workspaceMode === "first-time" && !interviewComplete
      ? resolveInterviewQuestion(interviewStep)
      : undefined;

  const showThreeColumn = !isRevisionMode && workspaceMode === "first-time";

  return (
    <div
      data-testid="create-chat-workspace"
      data-workspace-mode={workspaceMode}
      data-revision-mode={isRevisionMode ? "on" : "off"}
      className={`grid min-h-[560px] grid-cols-1 gap-0 ${
        showThreeColumn
          ? "md:grid-cols-[minmax(0,200px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,280px)]"
          : isRevisionMode
            ? "h-[calc(100vh-5.5rem)] max-h-[calc(100vh-5.5rem)] overflow-hidden lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]"
            : "lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]"
      } ${
        isRevisionMode
          ? "h-[calc(100vh-5.5rem)] max-h-[calc(100vh-5.5rem)] overflow-hidden"
          : "h-full"
      }`}
    >
      {showThreeColumn ? (
        <JourneyDirectory
          currentStep={interviewStep}
          interviewComplete={interviewComplete}
        />
      ) : (
        <Sidebar
          entries={effectiveSidebarEntries}
          activeEntryId={
            isRevisionMode
              ? selectedRevisionVersion?.id ?? activeEntryId
              : activeEntryId
          }
          onSelectEntry={handleSelectEntry}
          isLoading={false}
          variant={isRevisionMode ? "revision" : "history"}
          revisionMode={isRevisionMode ? revisionMode : undefined}
        />
      )}

      <section
        data-testid="chat-workspace-panel"
        className="flex min-h-0 flex-col gap-3 overflow-hidden bg-[var(--paper)] px-4 py-4 sm:px-6 lg:px-8"
      >
        {showArchiveContext ? (
          <div className="border-l-2 border-[var(--clay)] px-3 py-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
              来自旅行档案
            </p>
            <p className="mt-1 font-serif text-sm font-semibold text-[var(--ink)]">
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

        {isRevisionMode ? (
          <>
            <header
              data-testid="revision-mode-header"
              className="flex flex-col gap-2 border-b border-[var(--line)]/70 pb-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--clay-deep)]">
                  和 Wanderly 一起打磨这份旅行手记
                </p>
                <h1
                  data-testid="revision-mode-title"
                  className="mt-1 font-serif text-xl font-semibold text-[var(--ink)]"
                >
                  正在调整：{revisionTitle} {revisionVersionLabel}
                </h1>
                <p
                  data-testid="revision-mode-subtitle"
                  className="mt-1 text-xs leading-5 text-[var(--ink-muted)]"
                >
                  {revisionMode === "chat"
                    ? "告诉 AI 哪里想改变，它会帮你重新整理这一版旅程。"
                    : "挑一版旅行计划带进工作台，本页只做选择，不会改动内容。"}
                </p>
                {revisionDestination || revisionDays > 0 ? (
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-faint)]">
                    {revisionDestination}
                    {revisionDays > 0 ? ` · ${revisionDays} 天` : ""}
                  </p>
                ) : null}
                {revisionMode === "chat" && revisionSummary ? (
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                    {revisionSummary}
                  </p>
                ) : null}
                {revisionMode === "chat" && revisionDailyOutline.length > 0 ? (
                  <div
                    data-testid="revision-mode-daily-outline"
                    className="mt-2 border-l border-[var(--clay)]/45 pl-2.5"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                      每日路线摘要
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs leading-5 text-[var(--ink-muted)]">
                      {revisionDailyOutline.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <span
                data-testid="revision-mode-badge"
                data-revision-view={revisionMode}
                className="shrink-0 self-start rounded-full border border-[var(--clay)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--clay-deep)]"
              >
                {revisionMode === "chat" ? "AI 调整模式" : "计划编辑模式"}
              </span>
            </header>

            <div
              data-testid="revision-mode-actions"
              className="flex flex-wrap items-center gap-2 border-b border-[var(--line)]/50 pb-3"
            >
              <button
                type="button"
                aria-pressed={revisionMode === "chat"}
                data-testid="revision-action-continue-ai"
                onClick={() => {
                  setRevisionMode("chat");
                  setWorkspaceHandoffError(undefined);
                }}
                className={
                  revisionMode === "chat"
                    ? "cursor-default rounded-full border border-[var(--clay)] bg-[var(--clay-soft)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--clay-deep)]"
                    : "rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-muted)] hover:bg-[var(--paper-bright)]"
                }
              >
                {revisionMode === "chat" ? "继续和 AI 讨论（当前）" : "继续和 AI 讨论"}
              </button>
              <button
                type="button"
                aria-pressed={revisionMode === "edit"}
                data-testid="revision-action-edit-mode"
                onClick={() => {
                  setRevisionMode("edit");
                  setWorkspaceHandoffError(undefined);
                  if (!selectedVersionId && selectedRevisionVersion) {
                    setSelectedVersionId(selectedRevisionVersion.id);
                  }
                }}
                className={
                  revisionMode === "edit"
                    ? "cursor-default rounded-full border border-[var(--clay)] bg-[var(--clay-soft)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--clay-deep)]"
                    : "rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-muted)] hover:bg-[var(--paper-bright)]"
                }
              >
                {revisionMode === "edit" ? "进入计划编辑（当前）" : "进入计划编辑"}
              </button>
            </div>
          </>
        ) : (
          <header className="flex items-end justify-between gap-3 border-b border-[var(--line)]/70 pb-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                {workspaceMode === "first-time" ? "一次见面 · 初始需求" : "继续整理这段旅程"}
              </p>
              <p className="mt-1 font-serif text-[17px] font-semibold text-[var(--ink)]">
                {activeEntry?.title ?? "初始需求"}
              </p>
              {activeEntry?.id !== INITIAL_REQUIREMENTS_ID ? (
                <p className="mt-0.5 text-xs leading-5 text-[var(--ink-muted)]">
                  {activeEntry?.destination}
                  {activeEntry?.days ? ` · ${activeEntry.days} 天` : ""}
                </p>
              ) : null}
            </div>
            <p className="hidden max-w-[200px] text-right text-[11px] leading-5 text-[var(--ink-faint)] sm:block">
              一起把想去的地方，慢慢整理成值得出发的旅程。
            </p>
          </header>
        )}

        {!isRevisionMode && generationStatus ? (
          <GenerationExperience
            status={generationStatus}
            destinationLabel={latestUserMessage || messages[0]?.content}
            errorMessage={generationErrorMessage}
            onRetry={() => void handleGenerateNewVersion()}
            onBack={() => setGenerationStatus(null)}
          />
        ) : isRevisionMode && revisionMode === "edit" ? (
          <RevisionEditModePanel
            selectedVersion={selectedRevisionVersion}
            onBackToChat={() => {
              setRevisionMode("chat");
              setWorkspaceHandoffError(undefined);
            }}
            onEnterWorkspace={handleEnterWorkspace}
            isEnteringWorkspace={isEnteringWorkspace}
            errorMessage={workspaceHandoffError}
          />
        ) : (
          <>
            {isRevisionMode ? (
              <div
                data-testid="revision-initial-thoughts"
                className="shrink-0 border-l border-[var(--line)] pl-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  初始旅行想法
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
                  下面是你最开始告诉 Wanderly 的旅行想法，本次修改都会在这份基础上继续打磨，不会重新创建旅行。
                </p>
              </div>
            ) : null}
            <div
              className={
                isRevisionMode ? "min-h-0 flex-1 overflow-hidden" : undefined
              }
            >
              <ChatMessageList
                messages={chatMessages}
                interviewStep={workspaceMode === "first-time" ? interviewStep : undefined}
                interviewComplete={workspaceMode === "first-time" ? interviewComplete : undefined}
                isSending={isSending || (isRevisionMode && isRevisionSending)}
                statusLabel={statusLabel}
                proposalSummary={proposalSummary}
                errorMessage={
                  isRevisionMode ? revisionError ?? errorMessage : errorMessage
                }
                interviewProgressLabel={interviewProgressLabel}
                interviewQuestion={interviewQuestion}
                quickStarts={resolveEmptyStateQuickStarts(entrySource)}
                onQuickStart={handleQuickStart}
              />
            </div>
            {!isRevisionMode && interviewComplete && firstGenerationPhase === "collecting" ? (
              <div className="flex flex-col gap-2 border-t border-dashed border-[var(--line)]/60 pt-3">
                <p className="text-xs leading-5 text-[var(--ink-muted)]">
                  五问线索都收齐了。点击下方按钮，我会帮你生成第一版旅行方案。
                </p>
                <button
                  type="button"
                  data-testid="generate-plan-button"
                  onClick={async () => {
                    setFirstGenerationError(undefined);
                    setFirstGenerationPhase("generating");

                    const nextProjectId = await createProjectForGeneration();
                    if (!nextProjectId) {
                      setFirstGenerationPhase("error");
                      setFirstGenerationError(
                        bootstrapFailure?.message ??
                          (bootstrapFailure?.reason === "unauthorized"
                            ? "当前登录状态已经失效，请重新登录后再试。"
                            : "暂时还没建起这份旅行计划，请稍后再试一次。"),
                      );
                      return;
                    }

                    try {
                      await patchProjectFlowStage(nextProjectId, "clarifying");
                      setFlowStage("clarifying");
                    } catch (error: unknown) {
                      console.warn(
                        "[create-chat] patch flow stage to clarifying failed",
                        error,
                      );
                    }

                    const pending = pendingMessagePersistenceRef.current;
                    pendingMessagePersistenceRef.current = [];

                    try {
                      await Promise.allSettled(pending);
                      await runFirstGenerationRef.current(nextProjectId);
                    } catch (error) {
                      setFirstGenerationError(
                        error instanceof Error
                          ? error.message
                          : "完整计划暂时还没生成出来，可以稍后再试一次。",
                      );
                      setFirstGenerationPhase("error");
                    }
                  }}
                  className="self-start rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper-bright)] transition-colors hover:bg-[var(--ink)]/90"
                >
                  生成旅行方案
                </button>
              </div>
            ) : null}
            {isRevisionMode && revisionSuggestion ? (
              <RevisionSuggestionCard
                suggestion={revisionSuggestion}
                onApply={() => void handleApplyRevisionSuggestion()}
                onContinueDiscussion={() => {
                  setRevisionSuggestion(null);
                  setRevisionApplyError(undefined);
                  setRevisionApplySuccessMessage(undefined);
                }}
                isApplying={isApplyingRevisionSuggestion}
                applyError={revisionApplyError}
                applySuccessMessage={revisionApplySuccessMessage}
              />
            ) : null}
            {isRevisionMode ? (
              <div
                data-testid="revision-quick-chips"
                className="flex flex-wrap items-center gap-2"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                  试试这些方向
                </span>
                {REVISION_QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    data-testid={`revision-quick-chip-${chip.label}`}
                    onClick={() => setText(chip.starter)}
                    disabled={isRevisionSending}
                    className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-muted)] hover:bg-[var(--paper-bright)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            ) : null}
            {!isRevisionMode && needsAccountForGeneration ? (
              (() => {
                const notice = resolveBootstrapNotice(
                  bootstrapFailure,
                  interviewComplete,
                );

                return (
                  <div
                    data-testid="chat-workspace-account-notice"
                    data-bootstrap-failure={bootstrapFailure?.reason ?? "none"}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-l-2 border-[var(--clay)] bg-[var(--clay-soft)]/25 px-3 py-2"
                  >
                    <p className="min-w-0 flex-1 text-xs leading-5 text-[var(--ink-muted)]">
                      {notice.text}
                    </p>
                    {notice.showLoginLink ? (
                      <Link
                        href={buildLoginHref("/create?source=ai")}
                        className="shrink-0 rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-1 text-xs font-semibold text-[var(--ink-muted)] hover:bg-[var(--paper-bright)]"
                      >
                        登录 / 注册
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setNeedsAccountForGeneration(false);
                        void createProjectForGeneration().then((nextProjectId) => {
                          if (!nextProjectId) {
                            setNeedsAccountForGeneration(true);
                          }
                        });
                      }}
                      className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-[var(--ink-muted)] hover:bg-[var(--paper-bright)]"
                    >
                      再试一次
                    </button>
                  </div>
                );
              })()
            ) : null}
            {!isRevisionMode && interviewComplete && firstGenerationPhase === "collecting" ? null : (
              <ChatComposer
                isFirstTimeMode={workspaceMode === "first-time"}
                interviewComplete={interviewComplete}
                inputValue={text}
                onInputChange={setText}
                onSubmit={
                  isRevisionMode || messages.length > 0
                    ? handleSendConversationMessage
                    : handleStartConversation
                }
                isSending={isSending || (isRevisionMode && isRevisionSending)}
                canSend={Boolean(text.trim())}
                onGenerateNewVersion={() => void handleGenerateNewVersion()}
                isGeneratingVersion={isGeneratingVersion}
                showGenerateButton={showGenerateButton && !isRevisionMode}
                onAdjustProposal={() => void handleAdjustProposal()}
                isAdjusting={isAdjusting}
                showAdjustButton={showAdjustButton && !isRevisionMode}
                isRevisionMode={isRevisionMode}
              />
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleStartOver}
                className="rounded-full px-2 py-1 text-xs text-[var(--ink-faint)] hover:bg-[var(--paper-bright)] hover:text-[var(--ink-muted)]"
              >
                重新开始
              </button>
            </div>
          </>
        )}
      </section>

      {showThreeColumn ? (
        <TripDossier
          messages={chatMessages}
          interviewComplete={interviewComplete}
        />
      ) : null}
    </div>
  );
}


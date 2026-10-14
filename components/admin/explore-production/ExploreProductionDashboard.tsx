"use client";

import { useState } from "react";

import type {
  EditableImageAssetPayload,
  ExploreProductionJob,
  ExploreProductionRequest,
  ImageAssetDetail,
  ImageAssetRecord,
  ImageManifest,
  ImageManifestTask,
  ImagePipelineSummary,
  PipelineExplorePlan,
  ProductionArtifactKind,
  PublishPreflightReport,
  PublishPayloadRecord,
  VisualReviewRecord,
} from "@/lib/admin/explore-production/types";

interface JobDetailResponse {
  ok: true;
  job: ExploreProductionJob;
  plan: PipelineExplorePlan | null;
  imageManifest: ImageManifest | null;
  imagePipelineSummary: ImagePipelineSummary | null;
  imageAssets: ImageAssetDetail[] | null;
  visualReview: VisualReviewRecord | null;
  publishPayload: PublishPayloadRecord | null;
  publishPreflight: PublishPreflightReport | null;
}

type WorkspaceTab = "content" | "images" | "preview" | "publish";

const preferenceOptions = [
  { value: "food", label: "美食" },
  { value: "history", label: "历史" },
  { value: "nature", label: "自然" },
  { value: "citywalk", label: "城市漫步" },
  { value: "photo", label: "拍照" },
  { value: "museum", label: "博物馆" },
  { value: "shopping", label: "逛街" },
  { value: "local_culture", label: "在地文化" },
];

const seasonOptions = [
  { value: "spring", label: "春季" },
  { value: "summer", label: "夏季" },
  { value: "autumn", label: "秋季" },
  { value: "winter", label: "冬季" },
];

const travelerTypeLabels: Record<ExploreProductionRequest["travelerType"], string> = {
  family: "家庭",
  couple: "情侣",
  student: "学生",
  solo: "独旅",
};

const paceLabels: Record<ExploreProductionRequest["pace"], string> = {
  slow: "慢",
  balanced: "均衡",
  dense: "紧凑",
};

const planPaceLabels: Record<string, string> = {
  slow: "慢",
  balanced: "均衡",
  dense: "紧凑",
};

const timeBlockLabels: Record<string, string> = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
};

const imageSlotLabels: Record<ImageManifestTask["image_slot"], string> = {
  explore_cover: "探索卡片封面",
  trip_cover: "行程封面",
  day_cover: "每日封面",
  poi_gallery: "地点图片",
  food_gallery: "美食图片",
  detail_image: "细节图片",
};

const sourcePreferenceLabels: Record<ImageManifestTask["source_preference"], string> = {
  real_first: "优先真实图片",
  mixed: "真实优先，可混合",
  ai_first: "优先 AI 生成",
};

const generationModeLabels: Record<ImageManifestTask["generation_mode"], string> = {
  real_photo: "真实图库",
  hybrid: "混合模式",
  ai_generated: "AI 生成",
};

const artifactKindLabels: Record<ProductionArtifactKind, string> = {
  generation_request: "生成请求",
  explore_plan: "探索页文案",
  content_review: "内容审核",
  image_manifest: "图片需求",
  image_asset: "图片结果",
  visual_review: "图文审核",
  publish_payload: "发布包",
  invalidation_report: "失效报告",
  publish_preflight: "发布前校验",
};

function preferenceLabel(value: string) {
  return preferenceOptions.find((option) => option.value === value)?.label ?? value;
}

const initialRequest: ExploreProductionRequest = {
  city: "杭州",
  days: 3,
  travelerType: "couple",
  budget: "medium",
  pace: "balanced",
  season: "autumn",
  theme: "城市漫步和轻松拍照",
  motivation: "首次到访",
  preferences: ["citywalk", "photo", "food"],
  extraRequirement: "",
};

function statusLabel(status: ExploreProductionJob["status"]) {
  const labels: Record<ExploreProductionJob["status"], string> = {
    draft_requested: "待生成",
    content_generating: "生成中",
    content_review_pending: "待内容审核",
    content_approved: "内容已通过",
    image_manifest_ready: "图片需求已就绪",
    image_fetching: "取图中",
    visual_review_pending: "待图文审核",
    visual_approved: "图文已通过",
    publishing: "发布中",
    published: "已发布",
    rejected: "已退回",
    failed: "失败",
  };

  return labels[status];
}

function contentInvalidationSummary(job: ExploreProductionJob | null) {
  const report = job?.artifacts.find(
    (artifact) => artifact.kind === "invalidation_report",
  );

  if (!report) return "";

  const invalidatedKinds = Array.isArray(report.metadata?.invalidatedKinds)
    ? report.metadata.invalidatedKinds
        .map((kind) =>
          typeof kind === "string"
            ? artifactKindLabels[kind as ProductionArtifactKind] ?? kind
            : "",
        )
        .filter(Boolean)
    : [];
  const invalidatedAt =
    typeof report.metadata?.invalidatedAt === "string"
      ? report.metadata.invalidatedAt
      : report.createdAt;
  const reason =
    typeof report.metadata?.reason === "string" ? report.metadata.reason : "";
  const reasonText =
    reason === "image_assets_edited"
      ? "图片管理更新后，下游产物已失效。"
      : "文案修改后，下游产物已失效。";
  const nextStepText =
    reason === "image_assets_edited"
      ? "请重新通过图文审核，再发布。"
      : "请重新通过内容审核，再生成图片需求和图文预览。";

  return [
    reasonText,
    invalidatedKinds.length > 0
      ? `失效范围：${unique(invalidatedKinds).join("、")}。`
      : "",
    invalidatedAt ? `记录时间：${invalidatedAt}。` : "",
    nextStepText,
  ]
    .filter(Boolean)
    .join(" ");
}

function workspaceForStatus(status: ExploreProductionJob["status"]): WorkspaceTab {
  if (status === "visual_approved" || status === "published" || status === "publishing") {
    return "publish";
  }

  if (status === "visual_review_pending") {
    return "preview";
  }

  if (status === "content_approved" || status === "image_manifest_ready" || status === "image_fetching") {
    return "images";
  }

  return "content";
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const payload = await response.json();

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "请求没有成功。");
  }

  return payload as T;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function linesToList(value: string) {
  return unique(
    value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function listToLines(values: string[]) {
  return values.join("\n");
}

function createStableId(prefix: string, seed: string) {
  return `${prefix}_${seed
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "")}_${Date.now().toString(36)}`;
}

function PlanPublishPreview({
  plan,
  imageAssets,
}: {
  plan: PipelineExplorePlan | null;
  imageAssets?: ImageAssetDetail[] | null;
}) {
  if (!plan) {
    return (
      <section className="rounded-[24px] border border-dashed border-[rgba(150,132,105,0.34)] bg-[rgba(255,253,247,0.82)] p-6 text-sm leading-6 text-[var(--ink-muted)]">
        选择一个任务，或者先生成内容。这里会显示发布前计划预览页。
      </section>
    );
  }

  const usableAssets = (imageAssets ?? []).filter(isManagedUsableImage);
  const coverAsset =
    usableAssets.find((asset) => asset.image_asset.metadata?.admin_use_as_cover) ||
    usableAssets.find((asset) => asset.image_asset.image_slot === "explore_cover") ||
    usableAssets[0];
  const coverPreviewUrl = getPreviewImageUrl(coverAsset);
  const visibleTags = [
    plan.city.name,
    `${plan.days} 天`,
    travelerTypeLabels[plan.trip_type as ExploreProductionRequest["travelerType"]] ??
      plan.trip_type,
    planPaceLabels[plan.pace] ?? plan.pace,
    ...plan.tags.map(preferenceLabel),
  ];
  const poiById = new Map(plan.pois.map((poi) => [poi.id, poi]));
  const foodById = new Map(plan.food.map((food) => [food.id, food]));

  return (
    <section className="rounded-[24px] border border-[rgba(150,132,105,0.2)] bg-[rgba(255,253,247,0.92)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--sage-deep)]">
            Phase E
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">
            计划预览页
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            按探索页阅读顺序预览最终内容。这里使用当前文案和图片管理层中“已通过且未禁用”的图片，不会写入数据库。
          </p>
        </div>
        <span className="rounded-full bg-[rgba(117,132,105,0.12)] px-3 py-1 text-xs font-semibold text-[var(--sage-deep)]">
          可用图片 {usableAssets.length} 张
        </span>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <article className="overflow-hidden rounded-[24px] border border-[rgba(150,132,105,0.18)] bg-white">
            <div className="relative min-h-[22rem]">
              {coverPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverPreviewUrl}
                  alt={`${plan.city.name} ${plan.title} 封面`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[rgba(246,239,225,0.72)] px-6 text-center text-sm text-[var(--ink-muted)]">
                  图片管理层还没有可用封面。发布前请至少通过一张图片。
                </div>
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,24,20,0.02)_0%,rgba(22,24,20,0.16)_42%,rgba(22,24,20,0.68)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-[var(--paper-bright)] sm:p-7">
                <p className="text-xs font-semibold tracking-[0.18em] text-[rgba(255,253,247,0.78)]">
                  旅行档案预览
                </p>
                <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                  {plan.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgba(255,253,247,0.86)]">
                  {plan.summary}
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap gap-2">
                {visibleTags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded-full border border-[rgba(150,132,105,0.18)] bg-[rgba(246,239,225,0.72)] px-3 py-1 text-xs text-[var(--ink-muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[16px] bg-[rgba(246,239,225,0.62)] p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-[var(--sage-deep)]">
                    城市
                  </p>
                  <p className="mt-2 text-lg font-semibold">{plan.city.name}</p>
                </div>
                <div className="rounded-[16px] bg-[rgba(246,239,225,0.62)] p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-[var(--sage-deep)]">
                    天数
                  </p>
                  <p className="mt-2 text-lg font-semibold">{plan.days} 天</p>
                </div>
                <div className="rounded-[16px] bg-[rgba(246,239,225,0.62)] p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-[var(--sage-deep)]">
                    预算
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                    {plan.budget.note}
                  </p>
                </div>
              </div>
            </div>
          </article>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">每日路线</h3>
              <span className="text-xs text-[var(--ink-muted)]">
                {plan.daily_itinerary.length} 天
              </span>
            </div>
            {plan.daily_itinerary.map((day) => (
              <article
                key={day.day}
                className="rounded-[20px] border border-[rgba(150,132,105,0.18)] bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--ink)] px-3 py-1 text-xs font-semibold text-[var(--paper-bright)]">
                    Day {day.day}
                  </span>
                  <h4 className="text-base font-semibold text-[var(--ink)]">
                    {day.title}
                  </h4>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  {day.summary}
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {day.activities.map((activity, activityIndex) => {
                    const refs = [
                      ...activity.poi_refs
                        .map((id) => poiById.get(id)?.name)
                        .filter((name): name is string => Boolean(name)),
                      ...activity.food_refs
                        .map((id) => foodById.get(id)?.name)
                        .filter((name): name is string => Boolean(name)),
                    ];

                    return (
                      <div
                        key={`${day.day}-${activity.time_block}-${activityIndex}`}
                        className="rounded-[14px] bg-[rgba(246,239,225,0.72)] p-3"
                      >
                        <p className="text-xs font-semibold tracking-[0.12em] text-[var(--sage-deep)]">
                          {timeBlockLabels[activity.time_block] ?? activity.time_block}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                          {activity.description}
                        </p>
                        {refs.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {refs.map((ref) => (
                              <span
                                key={ref}
                                className="rounded-full bg-white px-2 py-0.5 text-[11px] text-[var(--ink-muted)]"
                              >
                                {ref}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[20px] border border-[rgba(150,132,105,0.18)] bg-white p-4">
              <h3 className="text-base font-semibold text-[var(--ink)]">地点攻略</h3>
              <div className="mt-3 space-y-3">
                {plan.pois.map((poi) => (
                  <article
                    key={poi.id}
                    className="border-t border-[rgba(150,132,105,0.14)] pt-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        {poi.name}
                      </p>
                      <span className="rounded-full bg-[rgba(117,132,105,0.12)] px-2 py-0.5 text-[11px] text-[var(--sage-deep)]">
                        {poi.district}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
                      {poi.reason}
                    </p>
                  </article>
                ))}
              </div>
            </div>
            <div className="rounded-[20px] border border-[rgba(150,132,105,0.18)] bg-white p-4">
              <h3 className="text-base font-semibold text-[var(--ink)]">美食线索</h3>
              <div className="mt-3 space-y-3">
                {plan.food.map((food) => (
                  <article
                    key={food.id}
                    className="border-t border-[rgba(150,132,105,0.14)] pt-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        {food.name}
                      </p>
                      <span className="rounded-full bg-[rgba(117,132,105,0.12)] px-2 py-0.5 text-[11px] text-[var(--sage-deep)]">
                        {food.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
                      {food.reason}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <article className="overflow-hidden rounded-[22px] border border-[rgba(150,132,105,0.18)] bg-white">
            <div className="relative aspect-[16/10] bg-[rgba(246,239,225,0.72)]">
              {coverPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverPreviewUrl}
                  alt={`${plan.city.name} 探索卡片封面`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,24,20,0.02)_0%,rgba(22,24,20,0.44)_100%)]" />
              <div className="absolute inset-x-4 bottom-4 text-[var(--paper-bright)]">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[rgba(255,253,247,0.8)]">
                  探索卡片预览
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em]">
                  {plan.city.name}
                </h3>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <h3 className="text-base font-semibold tracking-[-0.03em]">
                {plan.title}
              </h3>
              <p className="line-clamp-4 text-xs leading-5 text-[var(--ink-muted)]">
                {plan.summary}
              </p>
              <div className="flex flex-wrap gap-2">
                {visibleTags.slice(1, 5).map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded-full bg-[rgba(223,232,216,0.54)] px-2.5 py-1 text-[11px] text-[var(--sage-deep)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>

          <section className="rounded-[22px] border border-[rgba(150,132,105,0.18)] bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold">已通过图片</h3>
              <span className="text-xs text-[var(--ink-muted)]">
                {usableAssets.length}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {usableAssets.length > 0 ? (
                usableAssets.slice(0, 8).map((asset) => {
                  const previewUrl = getPreviewImageUrl(asset);

                  return (
                    <div
                      key={asset.asset_instance_id}
                      className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 rounded-[14px] bg-[rgba(246,239,225,0.52)] p-2"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden rounded-[10px] bg-white">
                        {previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl}
                            alt={imageAssetTitle(asset)}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 self-center">
                        <p className="truncate text-xs font-semibold text-[var(--ink)]">
                          {imageAssetTitle(asset)}
                        </p>
                        <p className="mt-1 truncate text-[11px] text-[var(--ink-muted)]">
                          {asset.image_asset.image_slot}
                          {asset.image_asset.metadata?.admin_use_as_cover
                            ? " · 封面"
                            : ""}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-[14px] bg-[rgba(246,239,225,0.72)] p-3 text-sm leading-6 text-[var(--ink-muted)]">
                  还没有已通过图片。请先到图片管理里通过至少一张图片。
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function PlanEditor({
  plan,
  disabled,
  canApprove,
  score,
  comment,
  onChange,
  onSave,
  onApprove,
  onScoreChange,
  onCommentChange,
}: {
  plan: PipelineExplorePlan | null;
  disabled: boolean;
  canApprove: boolean;
  score: number;
  comment: string;
  onChange: (plan: PipelineExplorePlan) => void;
  onSave: () => void;
  onApprove: () => void;
  onScoreChange: (score: number) => void;
  onCommentChange: (comment: string) => void;
}) {
  if (!plan) {
    return (
      <section className="rounded-[24px] border border-dashed border-[rgba(150,132,105,0.34)] bg-[rgba(255,253,247,0.82)] p-6 text-sm leading-6 text-[var(--ink-muted)]">
        还没有文案。先点上方“生成文案”，生成后这里会变成可编辑的审核台。
      </section>
    );
  }

  const activePlan = plan;

  function updatePlan(patch: Partial<PipelineExplorePlan>) {
    onChange({ ...activePlan, ...patch });
  }

  function updateDay(
    dayIndex: number,
    updater: (
      day: PipelineExplorePlan["daily_itinerary"][number],
    ) => PipelineExplorePlan["daily_itinerary"][number],
  ) {
    updatePlan({
      daily_itinerary: activePlan.daily_itinerary.map((day, index) =>
        index === dayIndex ? updater(day) : day,
      ),
    });
  }

  function updateActivity(
    dayIndex: number,
    activityIndex: number,
    updater: (
      activity: PipelineExplorePlan["daily_itinerary"][number]["activities"][number],
    ) => PipelineExplorePlan["daily_itinerary"][number]["activities"][number],
  ) {
    updateDay(dayIndex, (day) => ({
      ...day,
      activities: day.activities.map((activity, index) =>
        index === activityIndex ? updater(activity) : activity,
      ),
    }));
  }

  return (
    <section className="space-y-4 rounded-[24px] border border-[rgba(150,132,105,0.2)] bg-[rgba(255,253,247,0.92)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--sage-deep)]">
            Phase A
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">
            文案编辑与内容审核
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            生成后的标题、摘要、路线、地点和美食都可以直接改。保存后再通过内容审核，图片需求会按最新版文案生成。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onSave}
            className="h-10 rounded-full border border-[rgba(150,132,105,0.28)] bg-white px-4 text-sm font-semibold text-[var(--ink)] disabled:opacity-40"
          >
            保存文案
          </button>
          <button
            type="button"
            disabled={disabled || !canApprove}
            onClick={onApprove}
            className="h-10 rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--paper-bright)] disabled:opacity-40"
          >
            通过内容审核
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <label className="block text-sm">
          <span className="font-medium">标题</span>
          <input
            value={activePlan.title}
            onChange={(event) => updatePlan({ title: event.target.value })}
            className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm outline-none focus:border-[var(--sage-deep)]"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Slug</span>
          <input
            value={activePlan.slug}
            onChange={(event) => updatePlan({ slug: event.target.value })}
            className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm outline-none focus:border-[var(--sage-deep)]"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium">摘要</span>
        <textarea
          value={activePlan.summary}
          rows={3}
          onChange={(event) => updatePlan({ summary: event.target.value })}
          className="mt-1 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--sage-deep)]"
        />
      </label>

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">标签（一行一个，也可用逗号分隔）</span>
          <textarea
            value={listToLines(activePlan.tags)}
            rows={4}
            onChange={(event) => updatePlan({ tags: linesToList(event.target.value) })}
            className="mt-1 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--sage-deep)]"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">封面取图提示</span>
          <textarea
            value={activePlan.image_prompt}
            rows={4}
            onChange={(event) => updatePlan({ image_prompt: event.target.value })}
            className="mt-1 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--sage-deep)]"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">每日行程</h3>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              updatePlan({
                days: activePlan.daily_itinerary.length + 1,
                daily_itinerary: [
                  ...activePlan.daily_itinerary,
                  {
                    day: activePlan.daily_itinerary.length + 1,
                    title: `第 ${activePlan.daily_itinerary.length + 1} 天`,
                    summary: "补充这一天的路线节奏。",
                    activities: [
                      {
                        time_block: "morning",
                        description: "上午安排待补充。",
                        poi_refs: [],
                        food_refs: [],
                      },
                    ],
                  },
                ],
              })
            }
            className="rounded-full border border-[rgba(150,132,105,0.28)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            新增一天
          </button>
        </div>

        {activePlan.daily_itinerary.map((day, dayIndex) => (
          <article
            key={day.day}
            className="rounded-[18px] border border-[rgba(150,132,105,0.18)] bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-[var(--ink)] px-3 py-1 text-xs font-semibold text-[var(--paper-bright)]">
                Day {day.day}
              </span>
              <button
                type="button"
                disabled={disabled || activePlan.daily_itinerary.length <= 1}
                onClick={() =>
                  updatePlan({
                    days: Math.max(1, activePlan.daily_itinerary.length - 1),
                    daily_itinerary: activePlan.daily_itinerary
                      .filter((_, index) => index !== dayIndex)
                      .map((item, index) => ({ ...item, day: index + 1 })),
                  })
                }
                className="rounded-full border border-[rgba(150,132,105,0.28)] bg-white px-3 py-1 text-xs disabled:opacity-40"
              >
                删除这天
              </button>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="block text-sm">
                <span className="font-medium">当天标题</span>
                <input
                  value={day.title}
                  onChange={(event) =>
                    updateDay(dayIndex, (current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">当天摘要</span>
                <input
                  value={day.summary}
                  onChange={(event) =>
                    updateDay(dayIndex, (current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm"
                />
              </label>
            </div>

            <div className="mt-3 space-y-3">
              {day.activities.map((activity, activityIndex) => (
                <div
                  key={`${day.day}-${activity.time_block}-${activityIndex}`}
                  className="rounded-[14px] bg-[rgba(246,239,225,0.58)] p-3"
                >
                  <div className="grid gap-3 lg:grid-cols-[8rem_minmax(0,1fr)_11rem_11rem_auto]">
                    <label className="block text-sm">
                      <span className="font-medium">时段</span>
                      <select
                        value={activity.time_block}
                        onChange={(event) =>
                          updateActivity(dayIndex, activityIndex, (current) => ({
                            ...current,
                            time_block: event.target
                              .value as PipelineExplorePlan["daily_itinerary"][number]["activities"][number]["time_block"],
                          }))
                        }
                        className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-2 text-sm"
                      >
                        {Object.entries(timeBlockLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium">活动描述</span>
                      <textarea
                        value={activity.description}
                        rows={2}
                        onChange={(event) =>
                          updateActivity(dayIndex, activityIndex, (current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 py-2 text-sm leading-6"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium">POI refs</span>
                      <input
                        value={activity.poi_refs.join(", ")}
                        onChange={(event) =>
                          updateActivity(dayIndex, activityIndex, (current) => ({
                            ...current,
                            poi_refs: linesToList(event.target.value),
                          }))
                        }
                        className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium">Food refs</span>
                      <input
                        value={activity.food_refs.join(", ")}
                        onChange={(event) =>
                          updateActivity(dayIndex, activityIndex, (current) => ({
                            ...current,
                            food_refs: linesToList(event.target.value),
                          }))
                        }
                        className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={disabled || day.activities.length <= 1}
                      onClick={() =>
                        updateDay(dayIndex, (current) => ({
                          ...current,
                          activities: current.activities.filter(
                            (_, index) => index !== activityIndex,
                          ),
                        }))
                      }
                      className="h-10 self-end rounded-full border border-[rgba(150,132,105,0.28)] bg-white px-3 text-xs disabled:opacity-40"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  updateDay(dayIndex, (current) => ({
                    ...current,
                    activities: [
                      ...current.activities,
                      {
                        time_block: "afternoon",
                        description: "补充一个活动。",
                        poi_refs: [],
                        food_refs: [],
                      },
                    ],
                  }))
                }
                className="rounded-full border border-[rgba(150,132,105,0.28)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                新增活动
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PlanListEditor
          title="POI"
          items={activePlan.pois}
          disabled={disabled}
          onChange={(pois) => updatePlan({ pois })}
          createItem={() => ({
            id: createStableId("poi", activePlan.city.code),
            name: "新地点",
            district: "待补充",
            type: "体验点",
            reason: "补充推荐理由。",
            recommended_duration_minutes: 90,
          })}
          durationField
        />
        <PlanListEditor
          title="美食"
          items={activePlan.food}
          disabled={disabled}
          onChange={(food) => updatePlan({ food })}
          createItem={() => ({
            id: createStableId("food", activePlan.city.code),
            name: "新美食",
            district: "待补充",
            category: "local food",
            reason: "补充推荐理由。",
          })}
        />
      </div>

      <div className="grid gap-3 rounded-[18px] border border-[rgba(150,132,105,0.18)] bg-white p-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <label className="block text-sm">
          <span className="font-medium">内容评分</span>
          <select
            value={score}
            onChange={(event) => onScoreChange(Number(event.target.value))}
            className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-2 text-sm"
          >
            {[5, 4, 3, 2, 1].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">审核备注</span>
          <input
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            placeholder="例如：路线节奏清楚，可以进入图片阶段。"
            className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm"
          />
        </label>
      </div>
    </section>
  );
}

type EditablePlanPoi = PipelineExplorePlan["pois"][number];
type EditablePlanFood = PipelineExplorePlan["food"][number];
type EditablePlanListItem = EditablePlanPoi | EditablePlanFood;

function PlanListEditor<T extends EditablePlanListItem>({
  title,
  items,
  disabled,
  onChange,
  createItem,
  durationField,
}: {
  title: string;
  items: T[];
  disabled: boolean;
  onChange: (items: T[]) => void;
  createItem: () => T;
  durationField?: boolean;
}) {
  function updateItem(index: number, patch: Partial<T>) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  return (
    <section className="rounded-[18px] border border-[rgba(150,132,105,0.18)] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...items, createItem()])}
          className="rounded-full border border-[rgba(150,132,105,0.28)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
        >
          新增
        </button>
      </div>
      <div className="mt-3 space-y-3">
        {items.map((item, index) => {
          const district = "district" in item ? String(item.district ?? "") : "";
          const type = "type" in item ? String(item.type ?? "") : "";
          const category = "category" in item ? String(item.category ?? "") : "";
          const duration =
            "recommended_duration_minutes" in item
              ? Number(item.recommended_duration_minutes ?? 90)
              : 90;

          return (
            <article
              key={item.id}
              className="rounded-[14px] bg-[rgba(246,239,225,0.58)] p-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium">名称</span>
                  <input
                    value={item.name}
                    onChange={(event) => updateItem(index, { name: event.target.value } as Partial<T>)}
                    className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">区域</span>
                  <input
                    value={district}
                    onChange={(event) =>
                      updateItem(
                        index,
                        { district: event.target.value } as unknown as Partial<T>,
                      )
                    }
                    className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">{durationField ? "类型" : "分类"}</span>
                  <input
                    value={durationField ? type : category}
                    onChange={(event) =>
                      updateItem(
                        index,
                        (durationField
                          ? { type: event.target.value }
                          : { category: event.target.value }) as unknown as Partial<T>,
                      )
                    }
                    className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm"
                  />
                </label>
                {durationField ? (
                  <label className="block text-sm">
                    <span className="font-medium">建议停留分钟</span>
                    <input
                      type="number"
                      min={15}
                      value={duration}
                      onChange={(event) =>
                        updateItem(
                          index,
                          {
                            recommended_duration_minutes: Number(event.target.value),
                          } as unknown as Partial<T>,
                        )
                      }
                      className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm"
                    />
                  </label>
                ) : null}
              </div>
              <label className="mt-3 block text-sm">
                <span className="font-medium">推荐理由</span>
                <textarea
                  value={item.reason}
                  rows={2}
                  onChange={(event) => updateItem(index, { reason: event.target.value } as Partial<T>)}
                  className="mt-1 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 py-2 text-sm leading-6"
                />
              </label>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className="mt-3 rounded-full border border-[rgba(150,132,105,0.28)] bg-white px-3 py-1 text-xs disabled:opacity-40"
              >
                删除
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function keywordsToText(keywords: string[]) {
  return keywords.join("\n");
}

function textToKeywords(value: string) {
  return unique(
    value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function ImageDemandEditor({
  manifest,
  disabled,
  onChange,
  onSave,
}: {
  manifest: ImageManifest | null;
  disabled: boolean;
  onChange: (manifest: ImageManifest) => void;
  onSave: () => void;
}) {
  if (!manifest) {
    return null;
  }

  const activeManifest = manifest;

  function updateImage(
    index: number,
    updater: (image: ImageManifestTask) => ImageManifestTask,
  ) {
    onChange({
      ...activeManifest,
      images: activeManifest.images.map((image, imageIndex) =>
        imageIndex === index ? updater(image) : image,
      ),
    });
  }

  return (
    <section className="rounded-[24px] border border-[rgba(150,132,105,0.2)] bg-[rgba(255,253,247,0.9)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--sage-deep)]">
            Phase 2
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">
            图片需求编辑
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            先校对图片槽位、关键词和取图策略。保存后再进入 image-pipeline 取图阶段。
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onSave}
          className="h-10 rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--paper-bright)] disabled:opacity-40"
        >
          保存图片需求
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {activeManifest.images.map((image, index) => (
          <article
            key={image.asset_instance_id}
            className="rounded-[18px] border border-[rgba(150,132,105,0.18)] bg-[rgba(255,253,247,0.82)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="rounded-full bg-[rgba(117,132,105,0.12)] px-2.5 py-1 text-xs font-semibold text-[var(--sage-deep)]">
                  {imageSlotLabels[image.image_slot]}
                </span>
                <h3 className="mt-2 text-base font-semibold text-[var(--ink)]">
                  {image.asset_name}
                </h3>
              </div>
              <p className="text-xs text-[var(--ink-muted)]">
                {image.asset_instance_id}
              </p>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_14rem]">
              <label className="block text-sm">
                <span className="font-medium">图片提示词</span>
                <textarea
                  value={image.prompt}
                  rows={3}
                  onChange={(event) =>
                    updateImage(index, (current) => ({
                      ...current,
                      prompt: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--sage-deep)]"
                />
              </label>

              <label className="block text-sm">
                <span className="font-medium">来源倾向</span>
                <select
                  value={image.source_preference}
                  onChange={(event) =>
                    updateImage(index, (current) => ({
                      ...current,
                      source_preference: event.target
                        .value as ImageManifestTask["source_preference"],
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-2 text-sm"
                >
                  {Object.entries(sourcePreferenceLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="font-medium">执行模式</span>
                <select
                  value={image.generation_mode}
                  onChange={(event) =>
                    updateImage(index, (current) => ({
                      ...current,
                      generation_mode: event.target
                        .value as ImageManifestTask["generation_mode"],
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-2 text-sm"
                >
                  {Object.entries(generationModeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-3 block text-sm">
              <span className="font-medium">搜索关键词（一行一个）</span>
              <textarea
                value={keywordsToText(image.search_keywords)}
                rows={3}
                onChange={(event) =>
                  updateImage(index, (current) => ({
                    ...current,
                    search_keywords: textToKeywords(event.target.value),
                  }))
                }
                className="mt-1 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--sage-deep)]"
              />
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}

function ImagePipelineResultPanel({
  summary,
}: {
  summary: ImagePipelineSummary | null;
}) {
  if (!summary) {
    return null;
  }

  return (
    <section className="rounded-[24px] border border-[rgba(150,132,105,0.2)] bg-[rgba(255,253,247,0.9)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--sage-deep)]">
            Phase 3
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">
            图片管线结果
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            已完成 {summary.completed_count} / {summary.task_count} 个图片槽位。当前使用 mock 图库跑通链路，真实图库 API 接入后会复用这份结果结构。
          </p>
        </div>
        <span className="rounded-full bg-[rgba(117,132,105,0.12)] px-3 py-1 text-xs font-semibold text-[var(--sage-deep)]">
          {summary.manifest_id}
        </span>
      </div>

      <div className="mt-4 rounded-[14px] bg-[rgba(246,239,225,0.72)] px-3 py-2 text-xs leading-5 text-[var(--ink-muted)]">
        运行目录：{summary.run_dir}
      </div>

      <div className="mt-4 grid gap-2">
        {summary.assets.map((asset) => (
          <div
            key={`${asset.asset_instance_id}-${asset.file_path}`}
            className="grid gap-2 rounded-[14px] border border-[rgba(150,132,105,0.16)] bg-white px-3 py-2 text-xs text-[var(--ink-muted)] md:grid-cols-[minmax(0,1fr)_7rem]"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--ink)]">
                {asset.asset_instance_id}
              </p>
              <p className="mt-1 truncate">{asset.file_path}</p>
            </div>
            <span className="self-center rounded-full bg-[rgba(117,132,105,0.12)] px-2.5 py-1 text-center font-semibold text-[var(--sage-deep)]">
              {asset.status === "completed" ? "已完成" : asset.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function imageAssetTitle(asset: ImageAssetDetail) {
  return (
    asset.image_asset.metadata?.title ||
    asset.asset_instance_id ||
    asset.asset_id
  );
}

function getPreviewImageUrl(asset: ImageAssetDetail | undefined) {
  const url =
    asset?.image_asset.metadata?.image_url ||
    asset?.image_asset.selection?.selected_candidate?.image_url;

  return url?.startsWith("http://") || url?.startsWith("https://") ? url : "";
}

type AdminImageReviewStatus = NonNullable<
  ImageAssetRecord["metadata"]
>["admin_review_status"];

const imageReviewStatusLabels: Record<
  NonNullable<AdminImageReviewStatus>,
  string
> = {
  pending: "待审核",
  approved: "已通过",
  needs_edit: "待调整",
  rejected: "已退回",
};

function getImageReviewStatus(asset: ImageAssetDetail): NonNullable<AdminImageReviewStatus> {
  return asset.image_asset.metadata?.admin_review_status ?? "approved";
}

function isManagedUsableImage(asset: ImageAssetDetail) {
  return (
    asset.status === "completed" &&
    asset.image_asset.status === "completed" &&
    !asset.image_asset.metadata?.admin_hidden &&
    getImageReviewStatus(asset) === "approved"
  );
}

function VisualReviewPanel({
  plan,
  manifest,
  imageAssets,
  visualReview,
  disabled,
  canApprove,
  score,
  comment,
  onScoreChange,
  onCommentChange,
  onImageAssetsChange,
  onSaveImageAssets,
  onApprove,
}: {
  plan: PipelineExplorePlan | null;
  manifest: ImageManifest | null;
  imageAssets: ImageAssetDetail[] | null;
  visualReview: VisualReviewRecord | null;
  disabled: boolean;
  canApprove: boolean;
  score: number;
  comment: string;
  onScoreChange: (score: number) => void;
  onCommentChange: (comment: string) => void;
  onImageAssetsChange: (assets: ImageAssetDetail[]) => void;
  onSaveImageAssets: () => void;
  onApprove: () => void;
}) {
  if (!plan || !manifest || !imageAssets || imageAssets.length === 0) {
    return null;
  }

  const editableImageAssets = imageAssets;
  const assetByInstanceId = new Map(
    editableImageAssets.map((asset) => [asset.asset_instance_id, asset]),
  );
  const coverAsset =
    editableImageAssets.find(
      (asset) =>
        asset.image_asset.metadata?.admin_use_as_cover && isManagedUsableImage(asset),
    ) ||
    editableImageAssets.find(
      (asset) =>
        asset.image_asset.image_slot === "explore_cover" &&
        isManagedUsableImage(asset),
    ) || editableImageAssets[0];
  const coverPreviewUrl = getPreviewImageUrl(coverAsset);
  const usableImageCount = editableImageAssets.filter(isManagedUsableImage).length;
  const hiddenImageCount = editableImageAssets.filter(
    (asset) => asset.image_asset.metadata?.admin_hidden,
  ).length;

  function updateImageAsset(
    assetInstanceId: string,
    updater: (asset: ImageAssetDetail) => ImageAssetDetail,
  ) {
    onImageAssetsChange(
      editableImageAssets.map((asset) =>
        asset.asset_instance_id === assetInstanceId ? updater(asset) : asset,
      ),
    );
  }

  function setCoverImage(assetInstanceId: string) {
    onImageAssetsChange(
      editableImageAssets.map((asset) => ({
        ...asset,
        image_asset: {
          ...asset.image_asset,
          metadata: {
            ...(asset.image_asset.metadata ?? {}),
            admin_use_as_cover: asset.asset_instance_id === assetInstanceId,
            admin_hidden:
              asset.asset_instance_id === assetInstanceId
                ? false
                : asset.image_asset.metadata?.admin_hidden,
            admin_review_status:
              asset.asset_instance_id === assetInstanceId
                ? "approved"
                : asset.image_asset.metadata?.admin_review_status ?? "approved",
          },
        },
      })),
    );
  }

  function addManualImageAsset() {
    const assetInstanceId = `manual_${Date.now().toString(36)}`;
    const imageAsset: ImageAssetRecord = {
      asset_id: assetInstanceId,
      asset_instance_id: assetInstanceId,
      image_slot: "detail_image",
      source: "manual_import",
      file_path: "",
      status: "completed",
      metadata: {
        title: "手动导入图片",
        image_url: "",
        license: "manual review required",
        admin_review_status: "pending",
        admin_hidden: false,
      },
      selection: {
        selected_candidate: {
          source: "manual_import",
          candidate_id: assetInstanceId,
          image_url: "",
        },
        rank_score: 1,
        candidate_count: 1,
        rejected_count: 0,
      },
    };

    onImageAssetsChange([
      ...editableImageAssets,
      {
        asset_id: assetInstanceId,
        asset_instance_id: assetInstanceId,
        file_path: "",
        status: "completed",
        image_asset: imageAsset,
      },
    ]);
  }

  return (
    <section className="rounded-[24px] border border-[rgba(150,132,105,0.2)] bg-[rgba(255,253,247,0.92)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--sage-deep)]">
            Phase D
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">
            图片管理与图文审核
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            先管理图片：可设封面、退回、禁用或手动导入 URL。只有“已通过且未禁用”的图片会进入图文审核和发布。
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
            当前可发布图片 {usableImageCount} 张，已禁用 {hiddenImageCount} 张。
          </p>
        </div>
        {visualReview ? (
          <span className="rounded-full bg-[rgba(117,132,105,0.12)] px-3 py-1 text-xs font-semibold text-[var(--sage-deep)]">
            已通过图文审核
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="rounded-[18px] border border-[rgba(150,132,105,0.18)] bg-[rgba(246,239,225,0.72)] p-4">
          {coverPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverPreviewUrl}
              alt={imageAssetTitle(coverAsset)}
              className="aspect-[4/3] w-full rounded-[14px] object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-[14px] border border-dashed border-[rgba(150,132,105,0.32)] bg-[rgba(255,253,247,0.72)] px-4 text-center text-xs leading-5 text-[var(--ink-muted)]">
              {coverAsset.image_asset.file_path}
            </div>
          )}
          <p className="mt-3 text-xs font-semibold text-[var(--sage-deep)]">
            封面资产
          </p>
          <h3 className="mt-1 text-base font-semibold text-[var(--ink)]">
            {imageAssetTitle(coverAsset)}
          </h3>
          <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
            来源：{coverAsset.image_asset.source} · 状态：
            {coverAsset.image_asset.status === "completed"
              ? "已完成"
              : coverAsset.image_asset.status}
            {coverAsset.image_asset.metadata?.admin_use_as_cover ? " · 手动封面" : ""}
          </p>
        </div>

        <div className="rounded-[18px] border border-[rgba(150,132,105,0.18)] bg-white p-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--sage-deep)]">
            待发布预览
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            {plan.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            {plan.summary}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              plan.city.name,
              `${plan.days} 天`,
              planPaceLabels[plan.pace] ?? plan.pace,
              ...plan.tags.map(preferenceLabel),
            ].map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="rounded-full border border-[rgba(150,132,105,0.18)] bg-[rgba(246,239,225,0.72)] px-3 py-1 text-xs text-[var(--ink-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">图片资产管理</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={addManualImageAsset}
            className="rounded-full border border-[rgba(150,132,105,0.28)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            导入图片 URL
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onSaveImageAssets}
            className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-3 py-1.5 text-xs font-semibold text-[var(--paper-bright)] disabled:opacity-40"
          >
            保存图片调整
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {editableImageAssets.map((asset) => {
          const image = assetByInstanceId.get(asset.asset_instance_id)
            ? manifest.images.find(
                (item) => item.asset_instance_id === asset.asset_instance_id,
              )
            : undefined;
          const previewUrl = getPreviewImageUrl(asset);
          const title = imageAssetTitle(asset);
          const reviewStatus = getImageReviewStatus(asset);
          const isHidden = Boolean(asset.image_asset.metadata?.admin_hidden);
          const isCover = Boolean(asset.image_asset.metadata?.admin_use_as_cover);

          return (
            <article
              key={asset.asset_instance_id}
              className={`rounded-[18px] border p-4 ${
                isHidden
                  ? "border-[rgba(150,132,105,0.12)] bg-[rgba(255,253,247,0.55)] opacity-75"
                  : "border-[rgba(150,132,105,0.18)] bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="rounded-full bg-[rgba(117,132,105,0.12)] px-2.5 py-1 text-xs font-semibold text-[var(--sage-deep)]">
                    {imageSlotLabels[
                      (asset.image_asset.image_slot || image?.image_slot) as ImageManifestTask["image_slot"]
                    ] ?? asset.image_asset.image_slot}
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-[var(--ink)]">
                    {image?.asset_name ?? title}
                  </h3>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {isCover ? (
                    <span className="rounded-full bg-[var(--ink)] px-2.5 py-1 text-xs font-semibold text-[var(--paper-bright)]">
                      封面
                    </span>
                  ) : null}
                  {isHidden ? (
                    <span className="rounded-full bg-[rgba(150,132,105,0.12)] px-2.5 py-1 text-xs text-[var(--ink-muted)]">
                      已禁用
                    </span>
                  ) : null}
                  <span className="rounded-full bg-[rgba(246,239,225,0.72)] px-2.5 py-1 text-xs text-[var(--ink-muted)]">
                    {imageReviewStatusLabels[reviewStatus]}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">
                {image?.prompt ?? "手动导入图片，审核时需要确认授权和相关性。"}
              </p>

              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <label className="block text-xs">
                  <span className="font-semibold text-[var(--ink)]">图片审核状态</span>
                  <select
                    value={reviewStatus}
                    onChange={(event) =>
                      updateImageAsset(asset.asset_instance_id, (current) => ({
                        ...current,
                        image_asset: {
                          ...current.image_asset,
                          metadata: {
                            ...(current.image_asset.metadata ?? {}),
                            admin_review_status: event.target
                              .value as NonNullable<AdminImageReviewStatus>,
                            admin_hidden:
                              event.target.value === "approved"
                                ? false
                                : current.image_asset.metadata?.admin_hidden,
                          },
                        },
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-[10px] border border-[rgba(150,132,105,0.24)] bg-white px-2 text-xs"
                  >
                    {Object.entries(imageReviewStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={disabled || isCover}
                  onClick={() => setCoverImage(asset.asset_instance_id)}
                  className="h-9 self-end rounded-full border border-[rgba(150,132,105,0.28)] bg-white px-3 text-xs font-semibold disabled:opacity-40"
                >
                  设为封面
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    updateImageAsset(asset.asset_instance_id, (current) => ({
                      ...current,
                      image_asset: {
                        ...current.image_asset,
                        metadata: {
                          ...(current.image_asset.metadata ?? {}),
                          admin_hidden: !current.image_asset.metadata?.admin_hidden,
                          admin_use_as_cover: current.image_asset.metadata?.admin_hidden
                            ? current.image_asset.metadata?.admin_use_as_cover
                            : false,
                        },
                      },
                    }))
                  }
                  className="h-9 self-end rounded-full border border-[rgba(150,132,105,0.28)] bg-white px-3 text-xs font-semibold disabled:opacity-40"
                >
                  {isHidden ? "启用" : "禁用"}
                </button>
              </div>

              <div className="mt-3 space-y-3 rounded-[14px] bg-[rgba(246,239,225,0.58)] p-3 text-xs leading-5 text-[var(--ink-muted)]">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={image?.asset_name ?? title}
                    className="aspect-[16/9] w-full rounded-[12px] object-cover"
                  />
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center rounded-[12px] border border-dashed border-[rgba(150,132,105,0.32)] bg-white px-4 text-center">
                    粘贴图片 URL 后这里会显示预览
                  </div>
                )}

                <label className="block">
                  <span className="font-semibold text-[var(--ink)]">审核备注</span>
                  <input
                    value={asset.image_asset.metadata?.admin_review_note ?? ""}
                    onChange={(event) =>
                      updateImageAsset(asset.asset_instance_id, (current) => ({
                        ...current,
                        image_asset: {
                          ...current.image_asset,
                          metadata: {
                            ...(current.image_asset.metadata ?? {}),
                            admin_review_note: event.target.value,
                          },
                        },
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-[10px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-xs"
                  />
                </label>
                <label className="block">
                  <span className="font-semibold text-[var(--ink)]">标题</span>
                  <input
                    value={asset.image_asset.metadata?.title ?? ""}
                    onChange={(event) =>
                      updateImageAsset(asset.asset_instance_id, (current) => ({
                        ...current,
                        image_asset: {
                          ...current.image_asset,
                          metadata: {
                            ...(current.image_asset.metadata ?? {}),
                            title: event.target.value,
                          },
                        },
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-[10px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-xs"
                  />
                </label>
                <label className="block">
                  <span className="font-semibold text-[var(--ink)]">图片 URL</span>
                  <input
                    value={
                      asset.image_asset.metadata?.image_url ||
                      asset.image_asset.selection?.selected_candidate?.image_url ||
                      ""
                    }
                    onChange={(event) =>
                      updateImageAsset(asset.asset_instance_id, (current) => ({
                        ...current,
                        status: "completed",
                        image_asset: {
                          ...current.image_asset,
                          status: "completed",
                          file_path: event.target.value,
                          metadata: {
                            ...(current.image_asset.metadata ?? {}),
                            image_url: event.target.value,
                            admin_hidden: false,
                          },
                          selection: {
                            ...(current.image_asset.selection ?? {}),
                            selected_candidate: {
                              ...(current.image_asset.selection?.selected_candidate ?? {}),
                              image_url: event.target.value,
                            },
                          },
                        },
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-[10px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-xs"
                  />
                </label>
                <label className="block">
                  <span className="font-semibold text-[var(--ink)]">来源页</span>
                  <input
                    value={asset.image_asset.metadata?.source_url ?? ""}
                    onChange={(event) =>
                      updateImageAsset(asset.asset_instance_id, (current) => ({
                        ...current,
                        image_asset: {
                          ...current.image_asset,
                          metadata: {
                            ...(current.image_asset.metadata ?? {}),
                            source_url: event.target.value,
                          },
                        },
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-[10px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-xs"
                  />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <span className="font-semibold text-[var(--ink)]">图库来源：</span>
                    {asset.image_asset.source}
                    {asset.image_asset.metadata?.license
                      ? ` · ${asset.image_asset.metadata.license}`
                      : ""}
                  </p>
                  <button
                    type="button"
                    disabled={disabled || editableImageAssets.length <= 1}
                    onClick={() =>
                      onImageAssetsChange(
                        editableImageAssets.filter(
                          (item) => item.asset_instance_id !== asset.asset_instance_id,
                        ),
                      )
                    }
                    className="rounded-full border border-[rgba(150,132,105,0.28)] bg-white px-3 py-1 text-xs disabled:opacity-40"
                  >
                    删除图片
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 rounded-[18px] border border-[rgba(150,132,105,0.18)] bg-white p-4 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
        <label className="block text-sm">
          <span className="font-medium">图文评分</span>
          <select
            value={score}
            onChange={(event) => onScoreChange(Number(event.target.value))}
            className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-2 text-sm"
          >
            {[5, 4, 3, 2, 1].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">图文审核备注</span>
          <input
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            placeholder="例如：封面和 POI 图都可用，可以进入发布。"
            className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={disabled || !canApprove || usableImageCount < 1}
          onClick={onApprove}
          className="h-10 self-end rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--paper-bright)] disabled:opacity-40"
        >
          通过图文审核
        </button>
      </div>

      {usableImageCount < 1 ? (
        <p className="mt-3 rounded-[14px] bg-[rgba(246,239,225,0.72)] px-3 py-2 text-sm leading-6 text-[var(--ink-muted)]">
          还没有可进入发布的图片。请至少把一张图片标为“已通过”，并保持启用状态。
        </p>
      ) : null}

      {visualReview ? (
        <p className="mt-3 rounded-[14px] bg-[rgba(233,239,225,0.62)] px-3 py-2 text-sm text-[var(--sage-deep)]">
          图文审核已通过：{visualReview.approvedAssets.length} 个图片资产可进入发布阶段。
        </p>
      ) : null}
    </section>
  );
}

function PublishPanel({
  payload,
  preflight,
  disabled,
  canPublish,
  onRefreshPreflight,
  onPublish,
}: {
  payload: PublishPayloadRecord | null;
  preflight: PublishPreflightReport | null;
  disabled: boolean;
  canPublish: boolean;
  onRefreshPreflight: () => void;
  onPublish: () => void;
}) {
  const canSubmit = canPublish && (preflight?.passed ?? false);

  return (
    <section className="rounded-[24px] border border-[rgba(150,132,105,0.2)] bg-[rgba(255,253,247,0.92)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--sage-deep)]">
            Phase 5
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">
            发布到探索页
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            发布前先做校验。只有检查项没有失败时，才会生成探索页写库 payload 并写入 Explore 数据表。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onRefreshPreflight}
            className="h-10 rounded-full border border-[rgba(150,132,105,0.28)] bg-white px-4 text-sm font-semibold text-[var(--ink)] disabled:opacity-40"
          >
            刷新校验
          </button>
          <button
            type="button"
            disabled={disabled || !canSubmit}
            onClick={onPublish}
            className="h-10 rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--paper-bright)] disabled:opacity-40"
          >
            发布到探索页
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-[rgba(150,132,105,0.18)] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--sage-deep)]">
              发布前校验
            </p>
            <h3 className="mt-1 text-base font-semibold text-[var(--ink)]">
              {preflight?.passed
                ? "可以发布"
                : preflight
                  ? "还有阻断项"
                  : "还没有校验结果"}
            </h3>
          </div>
          {preflight ? (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                preflight.passed
                  ? "bg-[rgba(117,132,105,0.12)] text-[var(--sage-deep)]"
                  : "bg-[rgba(153,75,54,0.12)] text-[var(--clay-deep)]"
              }`}
            >
              {preflight.blockers.length} 个阻断 / {preflight.warnings.length} 个提醒
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2">
          {preflight ? (
            preflight.checks.map((check) => (
              <div
                key={check.id}
                className="grid gap-2 rounded-[14px] bg-[rgba(246,239,225,0.58)] px-3 py-2 text-sm md:grid-cols-[8rem_5rem_minmax(0,1fr)]"
              >
                <span className="font-semibold text-[var(--ink)]">{check.label}</span>
                <span
                  className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    check.status === "passed"
                      ? "bg-[rgba(117,132,105,0.12)] text-[var(--sage-deep)]"
                      : check.status === "warning"
                        ? "bg-[rgba(204,150,72,0.16)] text-[var(--clay-deep)]"
                        : "bg-[rgba(153,75,54,0.12)] text-[var(--clay-deep)]"
                  }`}
                >
                  {check.status === "passed"
                    ? "通过"
                    : check.status === "warning"
                      ? "提醒"
                      : "失败"}
                </span>
                <span className="text-[var(--ink-muted)]">{check.message}</span>
              </div>
            ))
          ) : (
            <p className="rounded-[14px] bg-[rgba(246,239,225,0.72)] px-3 py-2 text-sm text-[var(--ink-muted)]">
              点击“刷新校验”生成当前任务的发布前检查清单。
            </p>
          )}
        </div>
      </div>

      {payload ? (
        <div className="mt-4 grid gap-3">
          <div className="rounded-[18px] border border-[rgba(150,132,105,0.18)] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-[var(--sage-deep)]">
                  Publish Payload
                </p>
                <h3 className="mt-1 text-base font-semibold text-[var(--ink)]">
                  {payload.exploreTrip.title}
                </h3>
              </div>
              <span className="rounded-full bg-[rgba(117,132,105,0.12)] px-3 py-1 text-xs font-semibold text-[var(--sage-deep)]">
                {payload.status === "published"
                  ? "已发布"
                  : payload.status === "failed"
                    ? "待重试"
                    : "已生成"}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-xs leading-5 text-[var(--ink-muted)] md:grid-cols-2">
              <p>
                <span className="font-semibold text-[var(--ink)]">externalId：</span>
                {payload.exploreTrip.externalId}
              </p>
              <p>
                <span className="font-semibold text-[var(--ink)]">slug：</span>
                {payload.exploreTrip.slug}
              </p>
              <p>
                <span className="font-semibold text-[var(--ink)]">cover：</span>
                {payload.exploreTrip.coverImageUrl ?? "未设置"}
              </p>
              <p>
                <span className="font-semibold text-[var(--ink)]">publishedAt：</span>
                {payload.exploreTrip.publishedAt ?? "未写入"}
              </p>
            </div>
          </div>

          <div className="rounded-[18px] border border-[rgba(150,132,105,0.18)] bg-[rgba(246,239,225,0.72)] p-4 text-sm leading-6 text-[var(--ink-muted)]">
            {payload.database.success ? (
              <p>
                数据库写入成功：
                <span className="font-semibold text-[var(--ink)]">
                  {payload.database.item?.slug}
                </span>
              </p>
            ) : payload.database.attempted ? (
              <p>
                数据库暂时没写进去，发布包已保留：
                {payload.database.error?.message ?? "未知错误"}
              </p>
            ) : (
              <p>发布包已生成，还没有尝试写库。</p>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-[14px] bg-[rgba(246,239,225,0.72)] px-3 py-2 text-sm text-[var(--ink-muted)]">
          等图文审核通过后，就可以从这里发布。
        </p>
      )}
    </section>
  );
}

export function ExploreProductionDashboard({
  initialJobs,
}: {
  initialJobs: ExploreProductionJob[];
}) {
  const [jobs, setJobs] = useState<ExploreProductionJob[]>(initialJobs);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<ExploreProductionJob | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PipelineExplorePlan | null>(null);
  const [selectedImageManifest, setSelectedImageManifest] =
    useState<ImageManifest | null>(null);
  const [selectedImagePipelineSummary, setSelectedImagePipelineSummary] =
    useState<ImagePipelineSummary | null>(null);
  const [selectedImageAssets, setSelectedImageAssets] =
    useState<ImageAssetDetail[] | null>(null);
  const [selectedVisualReview, setSelectedVisualReview] =
    useState<VisualReviewRecord | null>(null);
  const [selectedPublishPayload, setSelectedPublishPayload] =
    useState<PublishPayloadRecord | null>(null);
  const [selectedPublishPreflight, setSelectedPublishPreflight] =
    useState<PublishPreflightReport | null>(null);
  const [request, setRequest] = useState<ExploreProductionRequest>(initialRequest);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [visualScore, setVisualScore] = useState(5);
  const [visualComment, setVisualComment] = useState("");
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceTab>("content");

  async function loadJobs(preferredJobId?: string) {
    const payload = await fetchJson<{ ok: true; jobs: ExploreProductionJob[] }>(
      "/api/admin/explore-production/jobs",
    );
    setJobs(payload.jobs);

    const nextJobId =
      preferredJobId ||
      selectedJobId ||
      payload.jobs[0]?.jobId ||
      "";

    if (nextJobId) {
      await loadJobDetail(nextJobId);
    }
  }

  async function loadJobDetail(jobId: string) {
    const payload = await fetchJson<JobDetailResponse>(
      `/api/admin/explore-production/jobs/${encodeURIComponent(jobId)}`,
    );
    setSelectedJobId(jobId);
    setSelectedJob(payload.job);
    setSelectedPlan(payload.plan);
    setSelectedImageManifest(payload.imageManifest);
    setSelectedImagePipelineSummary(payload.imagePipelineSummary);
    setSelectedImageAssets(payload.imageAssets);
    setSelectedVisualReview(payload.visualReview);
    setSelectedPublishPayload(payload.publishPayload);
    setSelectedPublishPreflight(payload.publishPreflight);
    setActiveWorkspace(workspaceForStatus(payload.job.status));
  }

  function imageAssetsToPayload(
    imageAssets: ImageAssetDetail[],
  ): EditableImageAssetPayload[] {
    return imageAssets.map((asset) => ({
      asset_id: asset.asset_id,
      asset_instance_id: asset.asset_instance_id,
      file_path: asset.file_path,
      status: asset.status,
      image_asset: asset.image_asset,
    }));
  }

  function updateRequest<K extends keyof ExploreProductionRequest>(
    key: K,
    value: ExploreProductionRequest[K],
  ) {
    setRequest((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleCreateJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage("正在创建任务...");

    try {
      const payload = await fetchJson<{ ok: true; job: ExploreProductionJob }>(
        "/api/admin/explore-production/jobs",
        {
          method: "POST",
          body: JSON.stringify(request),
        },
      );

      setMessage("任务已创建，可以开始生成内容。");
      await loadJobs(payload.job.jobId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGenerate() {
    if (!selectedJob) return;

    setIsBusy(true);
    setMessage("正在生成文案...");

    try {
      await fetchJson<{ ok: true; job: ExploreProductionJob }>(
        `/api/admin/explore-production/jobs/${encodeURIComponent(selectedJob.jobId)}/generate`,
        { method: "POST" },
      );
      setMessage("文案已生成，等待内容审核。");
      setActiveWorkspace("content");
      await loadJobs(selectedJob.jobId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      await loadJobs(selectedJob.jobId);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleApproveContent() {
    if (!selectedJob) return;

    setIsBusy(true);
    setMessage("正在通过内容审核，并导出图片需求...");

    try {
      await fetchJson<{ ok: true; job: ExploreProductionJob }>(
        `/api/admin/explore-production/jobs/${encodeURIComponent(selectedJob.jobId)}/approve-content`,
        {
          method: "POST",
          body: JSON.stringify({
            score: reviewScore,
            issues: [],
            comment: reviewComment,
          }),
        },
      );
      setMessage("内容已通过，image manifest 已生成。");
      setActiveWorkspace("images");
      await loadJobs(selectedJob.jobId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSavePlan() {
    if (!selectedJob || !selectedPlan) return;

    setIsBusy(true);
    setMessage("正在保存文案修改...");

    try {
      const payload = await fetchJson<{ ok: true; job: ExploreProductionJob }>(
        `/api/admin/explore-production/jobs/${encodeURIComponent(selectedJob.jobId)}/plan`,
        {
          method: "PUT",
          body: JSON.stringify({
            plan: selectedPlan,
          }),
        },
      );
      setMessage(
        contentInvalidationSummary(payload.job) ||
          "文案修改已保存，等待内容审核。",
      );
      await loadJobs(selectedJob.jobId);
      setActiveWorkspace("content");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveImageManifest() {
    if (!selectedJob || !selectedImageManifest) return;

    setIsBusy(true);
    setMessage("正在保存图片需求...");

    try {
      await fetchJson<{ ok: true; job: ExploreProductionJob }>(
        `/api/admin/explore-production/jobs/${encodeURIComponent(selectedJob.jobId)}/image-manifest`,
        {
          method: "PUT",
          body: JSON.stringify({
            imageManifest: selectedImageManifest,
          }),
        },
      );
      setMessage("图片需求已保存，下一步可以交给 image-pipeline 取图。");
      setActiveWorkspace("images");
      await loadJobs(selectedJob.jobId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRunImagePipeline() {
    if (!selectedJob) return;

    setIsBusy(true);
    setMessage("正在执行 image-pipeline...");

    try {
      await fetchJson<{ ok: true; job: ExploreProductionJob }>(
        `/api/admin/explore-production/jobs/${encodeURIComponent(selectedJob.jobId)}/run-image-pipeline`,
        { method: "POST" },
      );
      setMessage("图片管线已跑完，等待图文审核。");
      setActiveWorkspace("preview");
      await loadJobs(selectedJob.jobId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      await loadJobs(selectedJob.jobId);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveImageAssets() {
    if (!selectedJob || !selectedImageAssets) return;

    setIsBusy(true);
    setMessage("正在保存图片管理...");

    try {
      const payload = await fetchJson<{ ok: true; job: ExploreProductionJob }>(
        `/api/admin/explore-production/jobs/${encodeURIComponent(selectedJob.jobId)}/image-assets`,
        {
          method: "PUT",
          body: JSON.stringify({
            imageAssets: imageAssetsToPayload(selectedImageAssets),
          }),
        },
      );
      setMessage(
        contentInvalidationSummary(payload.job) || "图片管理已保存。",
      );
      setActiveWorkspace("preview");
      await loadJobs(selectedJob.jobId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleApproveVisualReview() {
    if (!selectedJob) return;

    setIsBusy(true);
    setMessage("正在通过图文审核...");

    try {
      await fetchJson<{ ok: true; job: ExploreProductionJob }>(
        `/api/admin/explore-production/jobs/${encodeURIComponent(selectedJob.jobId)}/approve-visual-review`,
        {
          method: "POST",
          body: JSON.stringify({
            score: visualScore,
            issues: [],
            comment: visualComment,
          }),
        },
      );
      setMessage("图文审核已通过，可以进入发布准备阶段。");
      setActiveWorkspace("publish");
      await loadJobs(selectedJob.jobId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePublish() {
    if (!selectedJob) return;

    setIsBusy(true);
    setMessage("正在发布到探索页...");

    try {
      const payload = await fetchJson<{
        ok: true;
        job: ExploreProductionJob;
        publishPayload: PublishPayloadRecord;
      }>(
        `/api/admin/explore-production/jobs/${encodeURIComponent(selectedJob.jobId)}/publish`,
        { method: "POST" },
      );

      setMessage(
        payload.publishPayload.database.success
          ? "已发布到探索页数据库。"
          : "发布包已生成，但数据库暂时没写进去，可以稍后重试。",
      );
      setActiveWorkspace("publish");
      await loadJobs(selectedJob.jobId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      await loadJobs(selectedJob.jobId);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRefreshPreflight() {
    if (!selectedJob) return;

    setIsBusy(true);
    setMessage("正在刷新发布前校验...");

    try {
      const payload = await fetchJson<{
        ok: true;
        preflight: PublishPreflightReport;
      }>(
        `/api/admin/explore-production/jobs/${encodeURIComponent(selectedJob.jobId)}/publish-preflight`,
      );

      setSelectedPublishPreflight(payload.preflight);
      setMessage(
        payload.preflight.passed
          ? "发布前校验通过。"
          : `发布前校验未通过：${payload.preflight.blockers.length} 个阻断项。`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  function togglePreference(preference: string) {
    updateRequest(
      "preferences",
      request.preferences.includes(preference)
        ? request.preferences.filter((item) => item !== preference)
        : unique([...request.preferences, preference]),
    );
  }

  const invalidationNotice = contentInvalidationSummary(selectedJob);

  return (
    <main className="min-h-screen bg-[var(--paper)] px-4 py-6 text-[var(--ink)] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[25rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-[24px] border border-[rgba(150,132,105,0.2)] bg-[rgba(255,253,247,0.9)] p-5 shadow-[0_10px_24px_rgba(90,76,58,0.05)]">
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--sage-deep)]">
              Explore Production
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              内容生产后台
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              Phase 1 先跑通文案生成、内容审核和 image manifest 交接。
            </p>
          </section>

          <form
            onSubmit={handleCreateJob}
            className="space-y-3 rounded-[24px] border border-[rgba(150,132,105,0.2)] bg-[rgba(255,253,247,0.9)] p-5 shadow-[0_10px_24px_rgba(90,76,58,0.05)]"
          >
            <h2 className="text-base font-semibold">新建内容任务</h2>
            <label className="block text-sm">
              <span className="font-medium">城市</span>
              <input
                value={request.city}
                onChange={(event) => updateRequest("city", event.target.value)}
                className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm outline-none focus:border-[var(--sage-deep)]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="font-medium">天数</span>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={request.days}
                  onChange={(event) => updateRequest("days", Number(event.target.value))}
                  className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm outline-none focus:border-[var(--sage-deep)]"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">季节</span>
                <select
                  value={request.season}
                  onChange={(event) => updateRequest("season", event.target.value)}
                  className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-2 text-sm outline-none focus:border-[var(--sage-deep)]"
                >
                  {seasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="block text-sm">
                <span className="font-medium">人群</span>
                <select
                  value={request.travelerType}
                  onChange={(event) =>
                    updateRequest(
                      "travelerType",
                      event.target.value as ExploreProductionRequest["travelerType"],
                    )
                  }
                  className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-2 text-sm outline-none focus:border-[var(--sage-deep)]"
                >
                  <option value="couple">情侣</option>
                  <option value="student">学生</option>
                  <option value="solo">独旅</option>
                  <option value="family">家庭</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium">预算</span>
                <select
                  value={request.budget}
                  onChange={(event) =>
                    updateRequest(
                      "budget",
                      event.target.value as ExploreProductionRequest["budget"],
                    )
                  }
                  className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-2 text-sm outline-none focus:border-[var(--sage-deep)]"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium">节奏</span>
                <select
                  value={request.pace}
                  onChange={(event) =>
                    updateRequest(
                      "pace",
                      event.target.value as ExploreProductionRequest["pace"],
                    )
                  }
                  className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-2 text-sm outline-none focus:border-[var(--sage-deep)]"
                >
                  {Object.entries(paceLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="font-medium">主题</span>
              <input
                value={request.theme}
                onChange={(event) => updateRequest("theme", event.target.value)}
                className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm outline-none focus:border-[var(--sage-deep)]"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">动机</span>
              <input
                value={request.motivation}
                onChange={(event) => updateRequest("motivation", event.target.value)}
                className="mt-1 h-10 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 text-sm outline-none focus:border-[var(--sage-deep)]"
              />
            </label>
            <div>
              <p className="text-sm font-medium">偏好</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {preferenceOptions.map((preference) => (
                  <button
                    key={preference.value}
                    type="button"
                    onClick={() => togglePreference(preference.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      request.preferences.includes(preference.value)
                        ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-bright)]"
                        : "border-[rgba(150,132,105,0.24)] bg-white text-[var(--ink-muted)]"
                    }`}
                  >
                    {preference.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm">
              <span className="font-medium">补充要求</span>
              <textarea
                value={request.extraRequirement}
                onChange={(event) => updateRequest("extraRequirement", event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-[12px] border border-[rgba(150,132,105,0.24)] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--sage-deep)]"
              />
            </label>
            <button
              type="submit"
              disabled={isBusy}
              className="h-11 w-full rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--paper-bright)] disabled:opacity-50"
            >
              创建任务
            </button>
          </form>

          <section className="rounded-[24px] border border-[rgba(150,132,105,0.2)] bg-[rgba(255,253,247,0.9)] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">任务列表</h2>
              <button
                type="button"
                onClick={() => loadJobs().catch((error) => setMessage(error.message))}
                className="rounded-full border border-[rgba(150,132,105,0.24)] px-3 py-1 text-xs"
              >
                刷新
              </button>
            </div>
            <div className="mt-3 max-h-[28rem] space-y-2 overflow-auto pr-1">
              {jobs.length === 0 ? (
                <p className="rounded-[14px] bg-[rgba(246,239,225,0.72)] p-3 text-sm text-[var(--ink-muted)]">
                  还没有任务。
                </p>
              ) : (
                jobs.map((job) => (
                  <button
                    key={job.jobId}
                    type="button"
                    onClick={() =>
                      loadJobDetail(job.jobId).catch((error) => setMessage(error.message))
                    }
                    className={`block w-full rounded-[16px] border p-3 text-left transition ${
                      selectedJobId === job.jobId
                        ? "border-[var(--ink)] bg-[rgba(246,239,225,0.9)]"
                        : "border-[rgba(150,132,105,0.16)] bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{job.request.city}</p>
                      <span className="shrink-0 rounded-full bg-[rgba(117,132,105,0.12)] px-2 py-1 text-[11px] text-[var(--sage-deep)]">
                        {statusLabel(job.status)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[var(--ink-muted)]">
                      {job.request.theme} / {travelerTypeLabels[job.request.travelerType]} / {job.request.days} 天
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          <div className="rounded-[24px] border border-[rgba(150,132,105,0.2)] bg-[rgba(255,253,247,0.9)] p-5 shadow-[0_10px_24px_rgba(90,76,58,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[var(--sage-deep)]">
                  当前任务
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">
                  {selectedJob ? selectedJob.jobId : "未选择任务"}
                </h2>
                {selectedJob ? (
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    状态：{statusLabel(selectedJob.status)}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!selectedJob || isBusy}
                  onClick={handleGenerate}
                  className="h-10 rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--paper-bright)] disabled:opacity-40"
                >
                  生成文案
                </button>
                <button
                  type="button"
                  disabled={
                    !selectedJob ||
                    !["image_manifest_ready", "visual_review_pending"].includes(
                      selectedJob.status,
                    ) ||
                    isBusy
                  }
                  onClick={handleRunImagePipeline}
                  className="h-10 rounded-full border border-[rgba(150,132,105,0.28)] bg-white px-4 text-sm font-semibold text-[var(--ink)] disabled:opacity-40"
                >
                  执行图片管线
                </button>
              </div>
            </div>
            {message ? (
              <p className="mt-4 rounded-[14px] bg-[rgba(246,239,225,0.72)] px-3 py-2 text-sm text-[var(--ink-muted)]">
                {message}
              </p>
            ) : null}
            {invalidationNotice ? (
              <p className="mt-3 rounded-[14px] border border-[rgba(150,132,105,0.22)] bg-[rgba(255,244,218,0.82)] px-3 py-2 text-sm leading-6 text-[var(--ink-muted)]">
                {invalidationNotice}
              </p>
            ) : null}
          </div>

          {selectedJob ? (
            <>
              <section className="rounded-[24px] border border-[rgba(150,132,105,0.2)] bg-[rgba(255,253,247,0.9)] p-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    ["content", "文案"],
                    ["images", "图片需求"],
                    ["preview", "图片管理"],
                    ["publish", "发布"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setActiveWorkspace(value as WorkspaceTab)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        activeWorkspace === value
                          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-bright)]"
                          : "border-[rgba(150,132,105,0.24)] bg-white text-[var(--ink-muted)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {selectedJob.artifacts.map((artifact) => (
                    <div
                      key={`${artifact.kind}-${artifact.path}`}
                      className="rounded-[14px] bg-[rgba(246,239,225,0.72)] px-3 py-2 text-xs text-[var(--ink-muted)]"
                    >
                      <span className="font-semibold text-[var(--ink)]">
                        {artifactKindLabels[artifact.kind]}
                      </span>
                      {artifact.path ? <span> · {artifact.path}</span> : null}
                    </div>
                  ))}
                </div>
              </section>

              {activeWorkspace === "content" ? (
                <PlanEditor
                  plan={selectedPlan}
                  disabled={isBusy}
                  canApprove={selectedJob.status === "content_review_pending"}
                  score={reviewScore}
                  comment={reviewComment}
                  onChange={setSelectedPlan}
                  onSave={handleSavePlan}
                  onApprove={handleApproveContent}
                  onScoreChange={setReviewScore}
                  onCommentChange={setReviewComment}
                />
              ) : null}

              {activeWorkspace === "images" ? (
                <>
                  <ImageDemandEditor
                    manifest={selectedImageManifest}
                    disabled={isBusy}
                    onChange={setSelectedImageManifest}
                    onSave={handleSaveImageManifest}
                  />
                  <ImagePipelineResultPanel summary={selectedImagePipelineSummary} />
                  {!selectedImageManifest ? (
                    <section className="rounded-[24px] border border-dashed border-[rgba(150,132,105,0.34)] bg-[rgba(255,253,247,0.82)] p-6 text-sm leading-6 text-[var(--ink-muted)]">
                      内容审核通过后，这里会出现图片需求编辑器。
                    </section>
                  ) : null}
                </>
              ) : null}

              {activeWorkspace === "preview" ? (
                <>
                  <VisualReviewPanel
                    plan={selectedPlan}
                    manifest={selectedImageManifest}
                    imageAssets={selectedImageAssets}
                    visualReview={selectedVisualReview}
                    disabled={isBusy}
                    canApprove={selectedJob.status === "visual_review_pending"}
                    score={visualScore}
                    comment={visualComment}
                    onScoreChange={setVisualScore}
                    onCommentChange={setVisualComment}
                    onImageAssetsChange={setSelectedImageAssets}
                    onSaveImageAssets={handleSaveImageAssets}
                    onApprove={handleApproveVisualReview}
                  />
                  <PlanPublishPreview
                    plan={selectedPlan}
                    imageAssets={selectedImageAssets}
                  />
                  {!selectedImageAssets ? (
                    <section className="rounded-[24px] border border-dashed border-[rgba(150,132,105,0.34)] bg-[rgba(255,253,247,0.82)] p-6 text-sm leading-6 text-[var(--ink-muted)]">
                      执行图片管线后，这里会显示图片管理和计划预览页。
                    </section>
                  ) : null}
                </>
              ) : null}

              {activeWorkspace === "publish" ? (
                <PublishPanel
                  payload={selectedPublishPayload}
                  preflight={selectedPublishPreflight}
                  disabled={isBusy}
                  canPublish={
                    selectedJob.status === "visual_approved" ||
                    selectedJob.status === "published"
                  }
                  onRefreshPreflight={handleRefreshPreflight}
                  onPublish={handlePublish}
                />
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

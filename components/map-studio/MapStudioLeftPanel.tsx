import {
  getPlaceImageAsset,
  getRegionImageAsset,
} from "@/lib/map-studio/assets";
import type { MapPlace, MapProject, MapRegion } from "@/lib/map-studio/types";
import type { ItineraryItemType, TimeSlotKey, TripRequest } from "@/lib/trip/types";
import type { MissingFieldNotice, NormalizedPlaceDetail } from "@/src/server/data-hub/types";
import type { MapStudioPlaceDetailState, MapStudioRegionDetailState } from "./MapStudio";

import { MapStudioAssetImage } from "./MapStudioAssetImage";

interface MapStudioLeftPanelProps {
  mapProject: MapProject;
  tripRequest: TripRequest | null;
  selectedRegion?: MapRegion;
  hoveredRegion?: MapRegion;
  selectedPlace?: MapPlace;
  regionDetailState: MapStudioRegionDetailState;
  placeDetailState: MapStudioPlaceDetailState;
  visibleRegionPlaces: MapPlace[];
  onPlaceSelect: (placeId: string) => void;
  onAddCandidate: (placeId: string) => void;
  onClearSelection: () => void;
}

function DetailChip({ children }: { children: string }) {
  return (
    <span className="rounded-[4px] border border-[rgba(255,236,190,0.16)] bg-[rgba(255,250,235,0.055)] px-2 py-1 text-[11px] font-semibold text-[rgba(255,250,235,0.72)]">
      {children}
    </span>
  );
}

const SLOT_LABELS: Record<TimeSlotKey, string> = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
};

const ITEM_TYPE_LABELS: Record<ItineraryItemType, string> = {
  attraction: "景点",
  food: "餐饮",
  transport: "交通",
  hotel: "住宿",
  free_time: "自由时间",
  shopping: "购物",
  other: "其他",
};

function getPlaceSourceLabel(place: MapPlace) {
  if (place.sourceType === "plan") {
    return "已在行程中";
  }

  if (place.sourceType === "seed") {
    return "推荐候选";
  }

  if (place.sourceType === "candidate") {
    return "候选清单";
  }

  return "演示占位";
}

function formatConfidenceLabel(confidence?: number | null) {
  if (typeof confidence !== "number") return "待核验";
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.45) return "medium";
  return "low";
}

function formatLastVerifiedAt(value?: string | null) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMissingFieldLabel(fieldName: string) {
  const labels: Record<string, string> = {
    openingHours: "开放时间",
    ticketInfo: "门票",
    intro: "简介",
    imageUrls: "图片",
    address: "地址",
    suggestedRoute: "建议路线",
  };
  return labels[fieldName] ?? fieldName;
}

function formatSourceProviderLabel(provider: string) {
  const labels: Record<string, string> = {
    amap: "高德",
    google_places: "Google Places",
    wikimedia: "Wikimedia",
    osm: "OSM",
    openstreetmap: "OSM",
    wanderly_curated: "Wanderly curated",
  };
  return labels[provider] ?? provider;
}

function mergeMissingFields(
  detail?: NormalizedPlaceDetail,
  place?: MapPlace,
  state?: MapStudioPlaceDetailState,
): MissingFieldNotice[] {
  const merged = [
    ...(detail?.missingFields ?? []),
    ...(place?.missingFields ?? []),
    ...(state?.missingFields ?? []),
  ];
  const seen = new Set<string>();
  return merged.filter((field) => {
    const key = `${field.fieldName}:${field.reason}:${field.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getDetailIntro(detail?: NormalizedPlaceDetail) {
  return detail?.intro?.trim() || "简介暂缺";
}

function getDetailOpeningHours(detail?: NormalizedPlaceDetail) {
  return (
    detail?.openingHours?.weeklyText?.filter(Boolean).join(" / ") ||
    "开放时间暂缺，建议出行前确认"
  );
}

function getDetailTicketInfo(detail?: NormalizedPlaceDetail) {
  return (
    detail?.ticketInfo?.priceText ||
    (detail?.ticketInfo?.status === "free" ? "免费" : null) ||
    "门票信息暂缺，价格可能随时间变化"
  );
}

function PanelActionButton({
  children,
  title,
  disabled = false,
  onClick,
}: {
  children: string;
  title: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-8 rounded-[4px] border px-2.5 text-xs font-semibold transition ${
        disabled
          ? "cursor-not-allowed border-[rgba(255,236,190,0.08)] bg-[rgba(255,250,235,0.025)] text-[rgba(255,250,235,0.34)]"
          : "border-[rgba(244,207,111,0.34)] bg-[rgba(244,207,111,0.1)] text-[rgba(255,250,235,0.82)] hover:bg-[rgba(244,207,111,0.16)]"
      }`}
    >
      {children}
    </button>
  );
}

function RegionDetail({
  region,
  places,
  mode,
  detailState,
  onPlaceSelect,
  onAddCandidate,
  onClearSelection,
}: {
  region: MapRegion;
  places: MapPlace[];
  mode: "selected" | "hovered";
  detailState: MapStudioRegionDetailState;
  onPlaceSelect: (placeId: string) => void;
  onAddCandidate: (placeId: string) => void;
  onClearSelection: () => void;
}) {
  const representativePlace = places[0];
  const representativePlaces = places.slice(0, 5);
  const detail = detailState.regionId === region.id ? detailState.detail : undefined;
  const detailLoading = detailState.regionId === region.id && detailState.status === "loading";
  const detailError = detailState.regionId === region.id && detailState.status === "error" ? detailState.error : undefined;
  const regionMissingFields = mergeMissingFields(undefined, undefined, detailState);
  const regionImageAsset = getRegionImageAsset(region.id);
  const suggestedDuration =
    region.suggestedDuration ??
    (places.length >= 4 ? "0.5 天" : places.length > 0 ? "2-4 小时" : "待补充");

  return (
    <section
      className={`rounded-[8px] border p-3 ${
        mode === "selected"
          ? "border-[rgba(255,217,104,0.58)] bg-[linear-gradient(180deg,rgba(31,24,13,0.72),rgba(5,7,7,0.72))]"
          : "border-[rgba(255,236,190,0.18)] bg-[rgba(255,250,235,0.055)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,236,190,0.52)]">
            {mode === "selected" ? "区域详情" : "悬停预览"}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{region.displayName}</h2>
          <p className="mt-2 text-sm leading-6 text-[rgba(255,250,235,0.68)]">
            {detailLoading ? "正在读取区域资料..." : detail?.intro || region.summary}
          </p>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          className="h-7 w-7 rounded-[4px] border border-[rgba(255,236,190,0.16)] bg-[rgba(0,0,0,0.18)] text-xs font-semibold text-[rgba(255,250,235,0.72)]"
          aria-label="关闭区域详情"
        >
          X
        </button>
      </div>
      <MapStudioAssetImage
        src={regionImageAsset}
        alt={`${region.displayName} 区域图`}
        fallbackLabel={region.shortName ?? region.displayName}
        className="mt-3 h-24 w-full object-cover"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {region.tags.map((tag) => (
          <DetailChip key={tag}>{tag}</DetailChip>
        ))}
      </div>
      <div className="mt-3 grid gap-2 text-xs text-[rgba(255,250,235,0.66)]">
        <div className="rounded-[5px] border border-[rgba(255,236,190,0.1)] bg-[rgba(0,0,0,0.2)] px-2.5 py-2">
          <span className="text-[rgba(255,236,190,0.48)]">适合玩法</span>
          <p className="mt-1 font-semibold text-[rgba(255,250,235,0.78)]">
            {region.bestFor.join(" / ") || "待补充"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <span className="rounded-[5px] border border-[rgba(255,236,190,0.1)] bg-[rgba(0,0,0,0.2)] px-2.5 py-2">
            建议停留<br />
            <strong className="font-semibold text-[#fff4d6]">{suggestedDuration}</strong>
          </span>
          <span className="rounded-[5px] border border-[rgba(255,236,190,0.1)] bg-[rgba(0,0,0,0.2)] px-2.5 py-2">
            区域地点<br />
            <strong className="font-semibold text-[#fff4d6]">{places.length} 个</strong>
          </span>
        </div>
        <div className="rounded-[5px] border border-[rgba(255,236,190,0.1)] bg-[rgba(0,0,0,0.2)] px-2.5 py-2">
          <span className="text-[rgba(255,236,190,0.48)]">玩法风格</span>
          <p className="mt-1 font-semibold text-[rgba(255,250,235,0.78)]">
            {detail?.playStyle || region.bestFor.join(" / ") || "资料暂缺 / 待核验"}
          </p>
        </div>
        <div className="rounded-[5px] border border-[rgba(255,236,190,0.1)] bg-[rgba(0,0,0,0.2)] px-2.5 py-2">
          <span className="text-[rgba(255,236,190,0.48)]">建议路线</span>
          <p className="mt-1 font-semibold text-[rgba(255,250,235,0.78)]">
            {detail?.suggestedRoute || "资料暂缺 / 待核验"}
          </p>
        </div>
        <div>
          <span className="text-[rgba(255,236,190,0.48)]">代表地点</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {representativePlaces.length > 0 ? (
              representativePlaces.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => onPlaceSelect(place.id)}
                    className="rounded-full border border-[rgba(210,165,83,0.28)] bg-[rgba(18,17,14,0.58)] px-2 py-1 text-[11px] font-semibold text-[#fff4d6] hover:border-[rgba(230,185,105,0.72)]"
                  >
                    {place.displayName}
                  </button>
                ))
            ) : (
              <span className="text-[rgba(255,250,235,0.5)]">待补充</span>
            )}
          </div>
        </div>
        <div className="rounded-[5px] border border-[rgba(255,236,190,0.1)] bg-[rgba(0,0,0,0.2)] px-2.5 py-2">
          <span className="text-[rgba(255,236,190,0.48)]">资料来源</span>
          <p className="mt-1 font-semibold text-[rgba(255,250,235,0.78)]">
            {detail?.sourceSummary.map((source) => formatSourceProviderLabel(source.provider)).join(" / ") || "Wanderly curated"}
          </p>
          {detail?.crowdLevel ? (
            <p className="mt-1 text-[rgba(255,250,235,0.56)]">拥挤度：{detail.crowdLevel}</p>
          ) : null}
          {detailError ? (
            <p className="mt-1 text-[rgba(255,200,150,0.78)]">{detailError}</p>
          ) : null}
          {regionMissingFields.length ? (
            <p className="mt-1 text-[rgba(255,200,150,0.72)]">
              暂缺字段：{regionMissingFields.map((field) => getMissingFieldLabel(field.fieldName)).join("、")}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <PanelActionButton
          title="查看区域内地点"
          disabled={!representativePlace}
          onClick={() => {
            if (representativePlace) {
              onPlaceSelect(representativePlace.id);
            }
          }}
        >
          查看地点
        </PanelActionButton>
        <PanelActionButton
          title="将区域代表地点加入候选"
          disabled={
            !representativePlace ||
            representativePlace.isCandidate ||
            representativePlace.sourceType === "plan"
          }
          onClick={() => {
            if (representativePlace) {
              onAddCandidate(representativePlace.id);
            }
          }}
        >
          加入候选
        </PanelActionButton>
        <PanelActionButton title="收起区域详情" onClick={onClearSelection}>
          收起
        </PanelActionButton>
      </div>
    </section>
  );
}

function getRegionName(mapProject: MapProject, regionId: string) {
  return (
    mapProject.regions.find((region) => region.id === regionId)?.displayName ??
    "未分区"
  );
}

function PlaceDetail({
  place,
  regionName,
  detailState,
  onAddCandidate,
}: {
  place: MapPlace;
  regionName: string;
  detailState: MapStudioPlaceDetailState;
  onAddCandidate: (placeId: string) => void;
}) {
  const placeImageAsset = getPlaceImageAsset(place.id);
  const planMeta = place.planMeta;
  const detail = place.dataHubDetail;
  const missingFields = mergeMissingFields(detail, place, detailState);
  const imageCandidate = detail?.imageUrls[0]?.url;
  const imageCount = detail?.imageUrls.length ?? 0;
  const loading = detailState.placeId === place.id && detailState.status === "loading";
  const error = detailState.placeId === place.id && detailState.status === "error"
    ? detailState.error
    : undefined;

  return (
    <section
      className={`rounded-[8px] border p-3 ${
        place.ui.isSelected
          ? "border-[rgba(255,217,104,0.5)] bg-[rgba(255,217,104,0.08)]"
          : "border-[rgba(255,236,190,0.14)] bg-[rgba(7,13,14,0.28)]"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,236,190,0.52)]">
        地点详情
      </p>
      <MapStudioAssetImage
        src={placeImageAsset}
        alt={`${place.displayName} 地点图`}
        fallbackLabel={place.imagePlaceholder}
        className="mt-2 h-20 w-full object-cover"
      />
      {imageCandidate && !placeImageAsset ? (
        <p className="mt-1 truncate text-[10px] text-[rgba(255,250,235,0.42)]">
          图片候选：{imageCandidate}
        </p>
      ) : null}
      <h3 className="mt-1 text-base font-semibold">{place.displayName}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <DetailChip>{place.category}</DetailChip>
        <DetailChip>{regionName}</DetailChip>
        <DetailChip>{getPlaceSourceLabel(place)}</DetailChip>
        {planMeta ? <DetailChip>{`Day ${planMeta.day}`}</DetailChip> : null}
        {planMeta ? <DetailChip>{SLOT_LABELS[planMeta.slot]}</DetailChip> : null}
        {planMeta?.timeLabel ? <DetailChip>{planMeta.timeLabel}</DetailChip> : null}
        {place.isCandidate ? <DetailChip>已在候选清单</DetailChip> : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-[rgba(255,250,235,0.68)]">
        {loading
          ? "正在读取地点资料..."
          : error
            ? place.shortDescription || "地点资料暂时不可用"
            : detail
              ? getDetailIntro(detail)
              : planMeta?.reason || place.shortDescription.slice(0, 34)}
      </p>
      {error ? (
        <div className="mt-2 rounded-[5px] border border-[rgba(255,184,104,0.28)] bg-[rgba(120,58,28,0.18)] px-2.5 py-2 text-xs leading-5 text-[rgba(255,232,204,0.78)]">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="mt-2 rounded-[5px] border border-[rgba(255,236,190,0.1)] bg-[rgba(255,250,235,0.04)] px-2.5 py-2 text-xs text-[rgba(255,250,235,0.62)]">
          正在读取地点资料...
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs text-[rgba(255,250,235,0.62)]">
        <span>所属区域：{regionName}</span>
        <span>
          建议停留：
          {detail?.recommendedDurationMinutes
            ? `${detail.recommendedDurationMinutes} 分钟`
            : place.suggestedDuration}
        </span>
        <span>
          类型：{planMeta ? ITEM_TYPE_LABELS[planMeta.type] : place.category}
        </span>
        <span>状态：{place.sourceStatus}</span>
      </div>
      <div className="mt-3 grid gap-2 rounded-[5px] border border-[rgba(255,236,190,0.1)] bg-[rgba(0,0,0,0.18)] px-2.5 py-2 text-xs leading-5 text-[rgba(255,250,235,0.64)]">
        <p>
          地址：
          <span className="font-semibold text-[#fff4d6]">
            {detail?.place.address || place.planMeta?.address || "地址暂缺"}
          </span>
        </p>
        <p>
          开放时间：
          <span className="font-semibold text-[#fff4d6]">
            {getDetailOpeningHours(detail)}
          </span>
        </p>
        <p>
          门票：
          <span className="font-semibold text-[#fff4d6]">
            {getDetailTicketInfo(detail)}
          </span>
        </p>
        <p>
          图片候选：
          <span className="font-semibold text-[#fff4d6]">
            {imageCount > 0 ? `${imageCount} 张` : "使用占位图"}
          </span>
        </p>
      </div>
      {planMeta ? (
        <div className="mt-3 rounded-[5px] border border-[rgba(255,236,190,0.1)] bg-[rgba(0,0,0,0.18)] px-2.5 py-2 text-xs leading-5 text-[rgba(255,250,235,0.64)]">
          <p>
            来源：<span className="font-semibold text-[#fff4d6]">已在行程中</span>
          </p>
          <p>
            位置：Day {planMeta.day} · {SLOT_LABELS[planMeta.slot]}
            {planMeta.timeLabel ? ` · ${planMeta.timeLabel}` : ""}
          </p>
          <p>理由：{planMeta.reason || "待补充"}</p>
        </div>
      ) : null}
      <div className="mt-3 rounded-[5px] border border-[rgba(255,236,190,0.1)] bg-[rgba(0,0,0,0.18)] px-2.5 py-2 text-xs leading-5 text-[rgba(255,250,235,0.62)]">
        <p>
          数据来源：
          <span className="font-semibold text-[#fff4d6]">
            {detail?.sources.map((source) => formatSourceProviderLabel(source.provider)).join(" / ") ||
              place.source.label ||
              getPlaceSourceLabel(place)}
          </span>
        </p>
        <p>
          更新时间：
          <span className="font-semibold text-[#fff4d6]">
            {formatLastVerifiedAt(detail?.lastVerifiedAt ?? place.lastVerifiedAt)}
          </span>
        </p>
        <p>
          可信度：
          <span className="font-semibold text-[#fff4d6]">
            {formatConfidenceLabel(detail?.confidence ?? place.confidence)}
          </span>
        </p>
        <p>
          暂缺字段：
          <span className="font-semibold text-[#fff4d6]">
            {missingFields.length
              ? missingFields.map((field) => getMissingFieldLabel(field.fieldName)).join("、")
              : "无明显缺失"}
          </span>
        </p>
        {missingFields.length ? (
          <ul className="mt-1 list-disc space-y-1 pl-4 text-[rgba(255,250,235,0.52)]">
            {missingFields.slice(0, 4).map((field) => (
              <li key={`${field.fieldName}-${field.reason}-${field.message}`}>
                {field.message}
              </li>
            ))}
          </ul>
        ) : null}

      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <PanelActionButton
          title="加入候选清单"
          disabled={place.isCandidate || place.sourceType === "plan"}
          onClick={() => onAddCandidate(place.id)}
        >
          +候选
        </PanelActionButton>
        <PanelActionButton title="写入当前 Day" disabled={!place.isCandidate}>
          写入
        </PanelActionButton>
        <PanelActionButton title="替换当前 Day 中的地点" disabled>
          替换
        </PanelActionButton>
        <PanelActionButton title="加入收藏" disabled>
          收藏
        </PanelActionButton>
      </div>
    </section>
  );
}

function PlaceList({
  places,
  selectedPlaceId,
  onPlaceSelect,
}: {
  places: MapPlace[];
  selectedPlaceId?: string;
  onPlaceSelect: (placeId: string) => void;
}) {
  return (
    <section className="rounded-[8px] border border-[rgba(255,236,190,0.12)] bg-[rgba(255,250,235,0.035)] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,236,190,0.48)]">
        区域地点
      </p>
      {places.length > 0 ? (
        <div className="mt-2 grid gap-1.5">
          {places.map((place) => {
            const active = place.id === selectedPlaceId;

            return (
              <button
                key={place.id}
                type="button"
                aria-pressed={active}
                onClick={() => onPlaceSelect(place.id)}
                className={`rounded-[5px] border px-2 py-2 text-left text-xs ${
                  active
                    ? "border-[rgba(255,217,104,0.5)] bg-[rgba(255,217,104,0.12)]"
                    : "border-[rgba(255,236,190,0.1)] bg-[rgba(7,13,14,0.22)] hover:bg-[rgba(255,250,235,0.06)]"
                }`}
              >
                <span className="block font-semibold text-[rgba(255,250,235,0.82)]">
                  {place.displayName}
                </span>
                <span className="mt-0.5 block text-[rgba(255,250,235,0.46)]">
                  {place.category} · {place.suggestedDuration}
                  {place.sourceType === "plan"
                    ? ` · Day ${place.planMeta?.day ?? place.assignedDayId ?? ""} · 行程中`
                    : ""}
                  {place.isCandidate ? " · 候选" : ""}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-[rgba(255,250,235,0.48)]">
          当前区域和类型筛选下没有地点，打开更多类型试试。
        </p>
      )}
    </section>
  );
}

function UnresolvedPlaceList({ mapProject }: { mapProject: MapProject }) {
  if (mapProject.unresolvedPlaces.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[8px] border border-[rgba(255,236,190,0.12)] bg-[rgba(255,250,235,0.035)] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,236,190,0.48)]">
        待定位地点
      </p>
      <div className="mt-2 grid gap-1.5">
        {mapProject.unresolvedPlaces.map((place) => (
          <div
            key={place.id}
            className="rounded-[5px] border border-[rgba(255,236,190,0.1)] bg-[rgba(7,13,14,0.22)] px-2 py-2 text-xs"
          >
            <span className="block font-semibold text-[rgba(255,250,235,0.82)]">
              {place.placeName}
            </span>
            <span className="mt-0.5 block text-[rgba(255,250,235,0.5)]">
              Day {place.day} · {SLOT_LABELS[place.slot]} · 缺少坐标
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MapStudioLeftPanel({
  mapProject,
  tripRequest,
  selectedRegion,
  hoveredRegion,
  selectedPlace,
  regionDetailState,
  placeDetailState,
  visibleRegionPlaces,
  onPlaceSelect,
  onAddCandidate,
  onClearSelection,
}: MapStudioLeftPanelProps) {
  const region = selectedRegion ?? hoveredRegion;
  const place = selectedPlace ?? (region ? undefined : visibleRegionPlaces[0] ?? mapProject.places[0]);
  const regionMode = selectedRegion ? "selected" : "hovered";

  return (
    <aside className="absolute bottom-3 left-3 top-3 z-[5] w-[20rem] overflow-y-auto rounded-[8px] border border-[rgba(219,154,55,0.58)] bg-[rgba(6,8,8,0.88)] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.45)] backdrop-blur-[3px]">
      <div className="mb-3 rounded-[6px] border border-[rgba(255,236,190,0.12)] bg-[rgba(0,0,0,0.24)] p-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,236,190,0.52)]">
          INFO
        </p>
        <h2 className="mt-1 truncate text-lg font-semibold">{mapProject.city}</h2>
        <p className="mt-1 truncate text-xs text-[rgba(255,250,235,0.58)]">
          {tripRequest?.departureCity || "出发地"} → {mapProject.city}
        </p>
      </div>

      <div className="grid gap-2.5">
        {region ? (
          <RegionDetail
            region={region}
            places={visibleRegionPlaces}
            mode={regionMode}
            detailState={regionDetailState}
            onPlaceSelect={onPlaceSelect}
            onAddCandidate={onAddCandidate}
            onClearSelection={onClearSelection}
          />
        ) : (
          <section className="rounded-[8px] border border-dashed border-[rgba(255,236,190,0.16)] bg-[rgba(255,250,235,0.035)] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,236,190,0.46)]">
              区域详情
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgba(255,250,235,0.62)]">
              点击地图上的区域后，这里会显示标签、适合玩法和代表地点。
            </p>
          </section>
        )}
        <PlaceList
          places={visibleRegionPlaces}
          selectedPlaceId={selectedPlace?.id}
          onPlaceSelect={onPlaceSelect}
        />
        <UnresolvedPlaceList mapProject={mapProject} />
        {place ? (
          <PlaceDetail
            place={place}
            regionName={getRegionName(mapProject, place.regionId)}
            detailState={placeDetailState}
            onAddCandidate={onAddCandidate}
          />
        ) : null}
      </div>
    </aside>
  );
}




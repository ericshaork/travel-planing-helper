import type { ReactNode } from "react";

import type {
  AdminPrecision,
  MapEnvironmentLayerKey,
  MapExploreLayerKey,
  MapLayerAvailability,
  MapLayerState,
  MapPrimaryView,
} from "@/lib/map-studio/layer-state";
import { DEFAULT_MAP_LAYER_AVAILABILITY } from "@/lib/map-studio/layer-state";
import type { MapPlaceCategory } from "@/lib/map-studio/types";

export type MapStudioRightDrawerMode = "layers" | "filters";

interface MapStudioRightDrawerProps {
  mode: MapStudioRightDrawerMode | null;
  layerState: MapLayerState;
  layerAvailability?: MapLayerAvailability;
  activeCategoryIds: MapPlaceCategory[];
  onPrimaryViewChange: (view: MapPrimaryView) => void;
  onAdminPrecisionChange: (precision: AdminPrecision) => void;
  onToggleExploreLayer: (layer: MapExploreLayerKey) => void;
  onToggleEnvironmentLayer: (layer: MapEnvironmentLayerKey) => void;
  onToggleCategory: (category: MapPlaceCategory) => void;
  onClose: () => void;
}

const categoryFilters: Array<{
  category: MapPlaceCategory;
  label: string;
  icon: string;
}> = [
  { category: "attraction", label: "景点", icon: "S" },
  { category: "neighborhood", label: "街区", icon: "B" },
  { category: "museum", label: "文化", icon: "C" },
  { category: "nature", label: "自然", icon: "N" },
  { category: "food", label: "餐饮", icon: "F" },
  { category: "shopping", label: "购物", icon: "M" },
  { category: "experience", label: "小众", icon: "E" },
];

const primaryViewOptions: Array<{
  value: MapPrimaryView;
  label: string;
}> = [
  { value: "admin", label: "行政区划" },
  { value: "travel_region", label: "旅行区域" },
  { value: "clean", label: "纯地图" },
];

const adminPrecisionOptions: Array<{
  value: AdminPrecision;
  label: string;
}> = [
  { value: "auto", label: "自动" },
  { value: "province", label: "省级" },
  { value: "prefecture", label: "市级" },
  { value: "county", label: "区县级" },
];

const exploreLayerOptions: Array<{
  value: MapExploreLayerKey;
  label: string;
  icon: string;
  comingSoon?: boolean;
}> = [
  { value: "attractions", label: "景点", icon: "S" },
  { value: "food", label: "美食", icon: "F" },
  { value: "hotels", label: "住宿", icon: "H", comingSoon: true },
  { value: "transportHubs", label: "交通枢纽", icon: "T" },
  { value: "recommendedPlaces", label: "推荐地点", icon: "R" },
  { value: "candidatePlaces", label: "候选地点", icon: "C" },
  { value: "plannedPlaces", label: "行程地点", icon: "P" },
];

const environmentLayerOptions: Array<{
  value: MapEnvironmentLayerKey;
  label: string;
  icon: string;
}> = [
  { value: "traffic", label: "交通图", icon: "T" },
  { value: "weather", label: "天气图", icon: "W" },
  { value: "events", label: "活动赛事", icon: "E" },
];

function ToggleRow({
  active,
  disabled = false,
  icon,
  label,
  meta,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: string;
  label: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      title={disabled ? meta ?? "待接入" : undefined}
      onClick={onClick}
      className={`relative flex min-h-10 items-center justify-between gap-3 rounded-[5px] border px-2.5 text-left text-xs font-black shadow-[inset_0_1px_0_rgba(255,224,147,0.18),inset_0_-7px_12px_rgba(0,0,0,0.36)] transition ${
        active
          ? "border-[#bd8733] bg-[linear-gradient(180deg,rgba(70,58,33,0.92),rgba(22,24,22,0.94))] text-[#fff3d2]"
          : "border-[rgba(133,96,40,0.48)] bg-[linear-gradient(180deg,rgba(40,47,47,0.78),rgba(8,10,10,0.86))] text-[rgba(255,250,235,0.58)]"
      } ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:border-[#d2a044] hover:text-[#fff7df]"
      }`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[3px] rounded-[4px] border border-[rgba(255,224,147,0.08)]"
      />
      <span className="relative z-[1] flex min-w-0 items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] border border-[#7a5a22] bg-[#0c1111] text-[10px] text-[#e0b452]">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate">{label}</span>
          {meta ? (
            <span className="block truncate text-[10px] font-bold text-[rgba(255,250,235,0.42)]">
              {meta}
            </span>
          ) : null}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`relative z-[1] h-2.5 w-2.5 rounded-full border ${
          active
            ? "border-[#ffe19a] bg-[#e0b452] shadow-[0_0_8px_rgba(224,180,82,0.62)]"
            : "border-[rgba(255,236,190,0.28)] bg-[rgba(0,0,0,0.36)]"
        }`}
      />
    </button>
  );
}

function DrawerSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-1.5">
      <h3 className="mt-1 text-[11px] font-black text-[rgba(255,224,147,0.72)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function SegmentedButton({
  active,
  disabled = false,
  label,
  title,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={`min-h-8 rounded-[4px] border px-2 text-xs font-black transition ${
        active
          ? "border-[#d2a044] bg-[rgba(95,72,33,0.72)] text-[#fff3d2]"
          : "border-[rgba(133,96,40,0.4)] bg-[rgba(10,14,14,0.62)] text-[rgba(255,250,235,0.58)]"
      } ${
        disabled
          ? "cursor-not-allowed opacity-45"
          : "hover:border-[#d2a044] hover:text-[#fff7df]"
      }`}
    >
      {label}
    </button>
  );
}

function LayerPanel({
  layerState,
  layerAvailability,
  onPrimaryViewChange,
  onAdminPrecisionChange,
  onToggleExploreLayer,
  onToggleEnvironmentLayer,
}: Pick<
  MapStudioRightDrawerProps,
  | "layerState"
  | "layerAvailability"
  | "onPrimaryViewChange"
  | "onAdminPrecisionChange"
  | "onToggleExploreLayer"
  | "onToggleEnvironmentLayer"
>) {
  const availability = layerAvailability ?? DEFAULT_MAP_LAYER_AVAILABILITY;
  const adminPrecisionDisabled = layerState.primaryView !== "admin";

  return (
    <div className="grid gap-3">
      <DrawerSection title="主视图">
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="主视图">
          {primaryViewOptions.map((option) => (
            <SegmentedButton
              key={option.value}
              active={layerState.primaryView === option.value}
              label={option.label}
              onClick={() => onPrimaryViewChange(option.value)}
            />
          ))}
        </div>
      </DrawerSection>

      <DrawerSection title="行政精度">
        <div
          className="grid grid-cols-4 gap-1.5"
          role="radiogroup"
          aria-label="行政精度"
        >
          {adminPrecisionOptions.map((option) => (
            <SegmentedButton
              key={option.value}
              active={layerState.adminPrecision === option.value}
              disabled={adminPrecisionDisabled}
              label={option.label}
              title={adminPrecisionDisabled ? "仅行政区划主视图可用" : undefined}
              onClick={() => onAdminPrecisionChange(option.value)}
            />
          ))}
        </div>
      </DrawerSection>

      <DrawerSection title="探索内容">
        <div className="grid gap-1.5">
          {exploreLayerOptions.map((option) => {
            const available =
              availability.explore[option.value] && !option.comingSoon;
            return (
              <ToggleRow
                key={option.value}
                active={layerState.explore[option.value]}
                disabled={!available}
                icon={option.icon}
                label={option.label}
                meta={available ? undefined : "待接入"}
                onClick={() => onToggleExploreLayer(option.value)}
              />
            );
          })}
        </div>
      </DrawerSection>

      <DrawerSection title="环境叠加">
        <div className="grid gap-1.5">
          {environmentLayerOptions.map((option) => (
            <ToggleRow
              key={option.value}
              active={layerState.environment[option.value]}
              disabled={!availability.environment[option.value]}
              icon={option.icon}
              label={option.label}
              meta="待接入"
              onClick={() => onToggleEnvironmentLayer(option.value)}
            />
          ))}
        </div>
      </DrawerSection>
    </div>
  );
}

export function MapStudioRightDrawer({
  mode,
  layerState,
  layerAvailability,
  activeCategoryIds,
  onPrimaryViewChange,
  onAdminPrecisionChange,
  onToggleExploreLayer,
  onToggleEnvironmentLayer,
  onToggleCategory,
  onClose,
}: MapStudioRightDrawerProps) {
  if (!mode) {
    return null;
  }

  const title = mode === "layers" ? "图层" : "筛选";
  const eyebrow = mode === "layers" ? "LAYER" : "FILTER";

  return (
    <aside
      aria-label={mode === "layers" ? "图层抽屉" : "筛选抽屉"}
      className="absolute right-20 top-28 z-30 w-64 rounded-l-[8px] rounded-r-[4px] border border-[#8a6428] bg-[linear-gradient(180deg,rgba(22,29,29,0.96),rgba(5,7,7,0.94))] p-2.5 text-[rgba(255,250,235,0.86)] shadow-[inset_0_1px_0_rgba(255,224,147,0.2),inset_0_-14px_28px_rgba(0,0,0,0.42),-12px_12px_28px_rgba(0,0,0,0.38)] backdrop-blur-[3px]"
    >
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-[rgba(255,224,147,0.16)] pb-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[rgba(255,224,147,0.52)]">
            {eyebrow}
          </p>
          <h2 className="text-sm font-black text-[#fff3d2]">{title}</h2>
        </div>
        <button
          type="button"
          aria-label="关闭右侧抽屉"
          onClick={onClose}
          className="h-7 w-7 rounded-[4px] border border-[rgba(255,224,147,0.22)] bg-[rgba(0,0,0,0.28)] text-xs font-black text-[rgba(255,250,235,0.72)] hover:border-[#d2a044] hover:text-[#fff7df]"
        >
          X
        </button>
      </div>

      <div className="grid gap-1.5">
        {mode === "layers"
          ? (
              <LayerPanel
                layerState={layerState}
                layerAvailability={layerAvailability}
                onPrimaryViewChange={onPrimaryViewChange}
                onAdminPrecisionChange={onAdminPrecisionChange}
                onToggleExploreLayer={onToggleExploreLayer}
                onToggleEnvironmentLayer={onToggleEnvironmentLayer}
              />
            )
          : categoryFilters.map((filter) => (
              <ToggleRow
                key={filter.category}
                active={activeCategoryIds.includes(filter.category)}
                icon={filter.icon}
                label={filter.label}
                onClick={() => onToggleCategory(filter.category)}
              />
            ))}
      </div>
    </aside>
  );
}

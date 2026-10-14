import type { WorkspaceMode } from "@/hooks/useTripWorkspaceState";
import {
  mapStudioCoreIcons,
  mapStudioNavIcons,
  mapStudioStatusIcons,
  type MapStudioCoreIconKey,
} from "@/lib/map-studio/assets";
import { buildWorkspaceRouteFromCurrentLocation } from "@/lib/workspace/routes";
import type {
  MapProject,
  MapStudioTool,
} from "@/lib/map-studio/types";
import type { TripPlan, TripRequest } from "@/lib/trip/types";

import { MapStudioTextButton } from "./MapStudioButton";
import type { MapStudioFeedbackKey } from "./MapStudioFeedbackPanel";

interface MapStudioTopBarProps {
  tripPlan: TripPlan;
  tripRequest: TripRequest | null;
  mapProject: MapProject;
  activeTool: MapStudioTool;
  onWorkspaceModeChange: (mode: WorkspaceMode) => void;
  onToolSelect: (tool: MapStudioTool) => void;
  onRouteToggle: () => void;
  onOpenFeedback: (key: MapStudioFeedbackKey) => void;
  workspaceHref?: string;
}

const primaryButtons = [
  { key: "region", label: "区域", iconKey: "region", tooltip: "点击高亮旅行区域" },
  { key: "place", label: "地点", iconKey: "place", tooltip: "显示地点与候选" },
  { key: "route", label: "路线", iconKey: "route", tooltip: "预览 Day 路线" },
  { key: "import", label: "导入", iconKey: "import", tooltip: "Phase 2 路径导入" },
] as const;

const systemButtons = [
  { key: "back", iconSrc: mapStudioNavIcons.back, label: "返回", href: "/explore", tooltip: "返回 Explore" },
  { key: "workspace", iconSrc: mapStudioNavIcons.workspace, label: "工作台", tooltip: "回到 Workspace" },
  { key: "itinerary", iconSrc: mapStudioNavIcons.itinerary, label: "行程", href: "/trips", tooltip: "我的行程" },
  { key: "settings", iconSrc: mapStudioNavIcons.settings, label: "设置", href: "/settings", tooltip: "设置" },
] as const;

function AssetGlyph({
  src,
  className,
}: {
  src: string;
  className: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        backgroundImage: `url(${src})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
      }}
    />
  );
}

function countPlannedItems(tripPlan: TripPlan) {
  return tripPlan.dailyItinerary.reduce(
    (total, day) =>
      total + day.morning.length + day.afternoon.length + day.evening.length,
    0,
  );
}

function resolveBudgetLabel(tripPlan: TripPlan, tripRequest: TripRequest | null) {
  if (typeof tripRequest?.budget === "number" && Number.isFinite(tripRequest.budget)) {
    return `${tripRequest.budget}`;
  }

  const estimate = tripPlan.budgetSummary.totalEstimate.trim();
  if (!estimate || estimate.includes("待")) {
    return "--";
  }

  return estimate.length > 6 ? estimate.slice(0, 6) : estimate;
}

function ResourceCell({
  iconSrc,
  label,
  value,
  title,
  onClick,
}: {
  iconSrc: string;
  label: string;
  value: string;
  title?: string;
  onClick?: () => void;
}) {
  const className =
    "map-studio-resource-cell inline-flex h-9 min-w-[6.35rem] items-center gap-2 border border-[#3d3322] bg-[linear-gradient(180deg,#151817_0%,#050606_100%)] px-2.5 text-[12px] font-bold text-[#f2efe5] shadow-[inset_0_1px_0_rgba(255,224,147,0.18),0_1px_0_rgba(255,224,147,0.18)]";
  const content = (
    <>
      <AssetGlyph
        src={iconSrc}
        className="h-[18px] w-[18px] shrink-0 drop-shadow-[0_0_5px_rgba(218,171,74,0.24)]"
      />
      <span className="text-[#fff4d6] [text-shadow:0_1px_1px_rgba(0,0,0,0.85)]">{label}</span>
      <span className="ml-auto max-w-[3.6rem] truncate text-right text-white">
        {value}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        title={title ?? `${label} ${value}`}
        aria-label={label}
        onClick={onClick}
        className={`${className} pointer-events-auto transition hover:border-[#8a6428] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dca54a]`}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      title={title ?? `${label} ${value}`}
      className={className}
    >
      {content}
    </span>
  );
}

function SystemButton({
  iconSrc,
  label,
  tooltip,
  href,
  onClick,
  testId,
}: {
  iconSrc: string;
  label: string;
  tooltip: string;
  href?: string;
  onClick?: () => void;
  testId?: string;
}) {
  const className =
    "map-studio-nav-button pointer-events-auto flex h-9 min-w-14 items-center justify-center gap-1 rounded-[7px] border border-[#34250f] bg-[radial-gradient(circle_at_50%_24%,#30333a_0%,#090909_72%)] px-2 text-[11px] font-bold text-[#efe8d4] shadow-[inset_0_0_0_1px_rgba(255,211,110,0.2),0_2px_4px_rgba(0,0,0,0.45)] transition hover:border-[#a87522] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dca54a]";

  if (href) {
    return (
      <a
        href={href}
        title={tooltip}
        aria-label={tooltip}
        data-testid={testId}
        onClick={onClick}
        className={className}
      >
        <AssetGlyph src={iconSrc} className="h-[16px] w-[16px] drop-shadow-[0_0_5px_rgba(218,171,74,0.22)]" />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      title={tooltip}
      aria-label={tooltip}
      data-testid={testId}
      onClick={onClick}
      className={className}
    >
      <AssetGlyph src={iconSrc} className="h-[16px] w-[16px] drop-shadow-[0_0_5px_rgba(218,171,74,0.22)]" />
      <span>{label}</span>
    </button>
  );
}

export function MapStudioTopBar({
  tripPlan,
  tripRequest,
  mapProject,
  activeTool,
  onWorkspaceModeChange,
  onToolSelect,
  onRouteToggle,
  onOpenFeedback,
  workspaceHref,
}: MapStudioTopBarProps) {
  const plannedCount = countPlannedItems(tripPlan);
  const routeDensity =
    tripPlan.days > 0 ? `${(plannedCount / tripPlan.days).toFixed(1)}` : "0.0";
  const budgetLabel = resolveBudgetLabel(tripPlan, tripRequest);
  const saveLabel = mapProject.actions.length > 0 ? "待保存" : "保存";
  const routeLayerActive = mapProject.layers.some(
    (layer) => layer.type === "routes" && layer.isVisible,
  );
  const resolvedWorkspaceHref =
    workspaceHref ?? buildWorkspaceRouteFromCurrentLocation();

  return (
    <header className="pointer-events-none absolute inset-x-3 top-3 z-20 h-[86px] overflow-visible bg-transparent text-[#f3ecdd]">
      <div className="grid h-full grid-cols-[76px_minmax(0,1fr)_auto] grid-rows-[42px_42px] gap-x-2 gap-y-1">
        <div className="map-studio-country-badge pointer-events-auto row-span-2 flex items-center justify-center rounded-[8px] border border-[#34250f] bg-[radial-gradient(circle_at_50%_35%,#24302f_0%,#070908_68%)] shadow-[inset_-1px_0_0_rgba(255,220,140,0.12),0_2px_8px_rgba(0,0,0,0.46)]">
          <span className="rounded-[4px] border border-[#63461c] bg-[linear-gradient(180deg,#293331,#0b0d0c)] px-2 py-1 text-sm font-black tracking-[0.12em] text-[#ffe2a2] shadow-[inset_0_1px_0_rgba(255,230,170,0.22)]">
            {mapProject.country.slice(0, 2)}
          </span>
        </div>

        <div className="map-studio-command-rail pointer-events-auto flex min-w-0 items-center overflow-hidden px-1">
          <ResourceCell iconSrc={mapStudioStatusIcons.days} label="天数" value={`${tripPlan.days}`} />
          <ResourceCell
            iconSrc={mapStudioStatusIcons.budget}
            label="预算"
            value={budgetLabel}
            title={tripPlan.budgetSummary.totalEstimate}
            onClick={() => onOpenFeedback("budget")}
          />
          <ResourceCell iconSrc={mapStudioStatusIcons.candidate} label="候选" value={`${mapProject.candidatePlaces.length}`} />
          <ResourceCell iconSrc={mapStudioStatusIcons.planned} label="已排" value={`${plannedCount}`} />
          <ResourceCell iconSrc={mapStudioStatusIcons.density} label="密度" value={routeDensity} />
          <ResourceCell iconSrc={mapStudioStatusIcons.save} label="保存" value={saveLabel} />
          <ResourceCell
            iconSrc={mapStudioStatusIcons.version}
            label="版本"
            value="v2.0"
            onClick={() => onOpenFeedback("version")}
          />
          <ResourceCell iconSrc={mapStudioStatusIcons.city} label="城市" value={mapProject.city || "--"} />
        </div>

        <div className="row-span-2 flex min-w-0 items-start justify-end gap-2 px-1 pt-0">
          <div className="map-studio-nav-rail flex items-start gap-1">
            {systemButtons.map(({ key, ...button }) => (
              <SystemButton
                key={key}
                {...button}
                href={
                  key === "workspace"
                    ? resolvedWorkspaceHref
                    : "href" in button
                      ? button.href
                      : undefined
                }
                testId={`map-studio-nav-${key}`}
                onClick={
                  key === "workspace"
                    ? () => onWorkspaceModeChange("read")
                    : undefined
                }
              />
            ))}
          </div>
          <a
            href="/settings"
            title="用户主页"
            aria-label="用户主页头像"
            className="map-studio-account-medal pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#34250f] bg-[radial-gradient(circle_at_50%_28%,#30333a_0%,#090909_72%)] shadow-[inset_0_0_0_1px_rgba(255,211,110,0.18),0_2px_4px_rgba(0,0,0,0.55)]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#9b762e] bg-[#151817] shadow-[inset_0_1px_0_rgba(255,230,160,0.16)]">
              <AssetGlyph
                src={mapStudioNavIcons.wanderlyLogo}
                className="h-[22px] w-[22px] drop-shadow-[0_0_5px_rgba(218,171,74,0.22)]"
              />
            </span>
          </a>
        </div>

        <div className="map-studio-mode-rail pointer-events-auto flex min-w-0 items-center gap-1 overflow-hidden pl-0 pr-2">
          {primaryButtons.map((button) => {
            const tool =
              button.key === "region"
                ? "region"
                : button.key === "place"
                  ? "place"
                  : undefined;
            const active =
              button.key === "route"
                ? routeLayerActive && activeTool === "route"
                : tool
                    ? activeTool === tool
                    : false;
            const onClick =
              button.key === "route"
                ? onRouteToggle
                : button.key === "import"
                    ? () => onOpenFeedback(button.key)
                  : tool
                    ? () => onToolSelect(tool)
                    : undefined;

            return (
              <MapStudioTextButton
                key={button.label}
                label={button.label}
                iconSrc={mapStudioCoreIcons[button.iconKey as MapStudioCoreIconKey]}
                iconKey={button.iconKey as MapStudioCoreIconKey}
                tooltip={button.tooltip}
                selected={active}
                onClick={onClick}
              />
            );
          })}
        </div>
      </div>
    </header>
  );
}

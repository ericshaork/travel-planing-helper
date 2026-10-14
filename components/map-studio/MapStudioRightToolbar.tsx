import {
  mapStudioToolbarIcons,
  type MapStudioToolbarIconKey,
} from "@/lib/map-studio/assets";

import { MapStudioIconButton } from "./MapStudioButton";
import type { MapStudioFeedbackKey } from "./MapStudioFeedbackPanel";
import type { MapStudioRightDrawerMode } from "./MapStudioRightDrawer";

type RightTool = {
  iconKey: MapStudioToolbarIconKey;
  label: string;
  action?:
    | "reset"
    | "zoom-in"
    | "zoom-out"
    | "recenter"
    | MapStudioRightDrawerMode
    | MapStudioFeedbackKey;
};

const tools: RightTool[] = [
  { iconKey: "zoomIn", label: "放大", action: "zoom-in" },
  { iconKey: "zoomOut", label: "缩小", action: "zoom-out" },
  { iconKey: "locate", label: "定位", action: "recenter" },
  { iconKey: "layers", label: "图层", action: "layers" },
  { iconKey: "filter", label: "筛选", action: "filters" },
  { iconKey: "measure", label: "测距", action: "measure" },
  { iconKey: "boxSelect", label: "框选", action: "box-select" },
  { iconKey: "reset", label: "重置", action: "reset" },
  { iconKey: "help", label: "帮助", action: "help" },
];

interface MapStudioRightToolbarProps {
  activeDrawer: MapStudioRightDrawerMode | null;
  activeFeedback: MapStudioFeedbackKey | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onReset: () => void;
  onToggleDrawer: (drawer: MapStudioRightDrawerMode) => void;
  onOpenFeedback: (key: MapStudioFeedbackKey) => void;
}

export function MapStudioRightToolbar({
  activeDrawer,
  activeFeedback,
  onZoomIn,
  onZoomOut,
  onRecenter,
  onReset,
  onToggleDrawer,
  onOpenFeedback,
}: MapStudioRightToolbarProps) {
  return (
    <aside className="pointer-events-none absolute right-2 top-1/2 z-30 -translate-y-1/2">
      <div className="map-studio-right-rail grid gap-[4px] py-2">
        {tools.map((tool) => {
          const drawerAction =
            tool.action === "layers" || tool.action === "filters"
              ? tool.action
              : null;
          const feedbackAction =
            tool.action === "measure" ||
            tool.action === "box-select" ||
            tool.action === "help"
              ? tool.action
              : null;
          const pressed = drawerAction
            ? activeDrawer === drawerAction
            : feedbackAction
              ? activeFeedback === feedbackAction
              : false;
          const onClick =
            tool.action === "reset"
              ? onReset
              : drawerAction
                ? () => onToggleDrawer(drawerAction)
                : tool.action === "zoom-in"
                  ? onZoomIn
                  : tool.action === "zoom-out"
                    ? onZoomOut
                    : tool.action === "recenter"
                      ? onRecenter
                      : feedbackAction
                        ? () => onOpenFeedback(feedbackAction)
                      : undefined;

          return (
            <MapStudioIconButton
              key={tool.label}
              label={tool.label}
              iconKey={tool.iconKey}
              iconSrc={mapStudioToolbarIcons[tool.iconKey]}
              selected={pressed}
              onClick={onClick}
            />
          );
        })}
      </div>
    </aside>
  );
}

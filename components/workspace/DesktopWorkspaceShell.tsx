"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { getUserSettings } from "@/lib/settings/client";
import type { WorkspacePreferences } from "@/lib/settings/types";

interface DesktopWorkspaceShellProps {
  topBar: ReactNode;
  main: ReactNode;
  inspector: ReactNode;
  compactBlankReadMode?: boolean;
  compactEmptyEditMode?: boolean;
}

const WORKSPACE_SPLIT_RATIO_KEY = "wanderly:workspace-split-ratio";
const DEFAULT_LEFT_RATIO = 55;
const MIN_LEFT_RATIO = 40;
const MAX_LEFT_RATIO = 65;
const MIN_LEFT_WIDTH = 480;
const MIN_RIGHT_WIDTH = 420;
const RESIZER_WIDTH = 12;

export function getDefaultWorkspaceRatioForMapLayout(
  mapLayout: WorkspacePreferences["mapLayout"],
) {
  switch (mapLayout) {
    case "plan_focus":
      return 60;
    case "map_focus":
      return 48;
    case "balanced":
    default:
      return DEFAULT_LEFT_RATIO;
  }
}

export function resolveInitialWorkspaceRatio(input: {
  savedRatio: string | null;
  mapLayout: WorkspacePreferences["mapLayout"];
  containerWidth: number;
}) {
  const parsedSavedRatio =
    input.savedRatio === null ? Number.NaN : Number.parseFloat(input.savedRatio);

  if (Number.isFinite(parsedSavedRatio)) {
    return clampWorkspaceRatio(parsedSavedRatio, input.containerWidth);
  }

  return clampWorkspaceRatio(
    getDefaultWorkspaceRatioForMapLayout(input.mapLayout),
    input.containerWidth,
  );
}

function clampWorkspaceRatio(nextRatio: number, containerWidth: number) {
  const maxRatioByPixels =
    containerWidth > 0
      ? ((containerWidth - MIN_RIGHT_WIDTH - RESIZER_WIDTH) / containerWidth) *
        100
      : MAX_LEFT_RATIO;
  const minRatioByPixels =
    containerWidth > 0
      ? (MIN_LEFT_WIDTH / containerWidth) * 100
      : MIN_LEFT_RATIO;

  return Math.min(
    Math.max(nextRatio, Math.max(MIN_LEFT_RATIO, minRatioByPixels)),
    Math.min(MAX_LEFT_RATIO, maxRatioByPixels),
  );
}

export function DesktopWorkspaceShell({
  topBar,
  main,
  inspector,
  compactBlankReadMode = false,
  compactEmptyEditMode = false,
}: DesktopWorkspaceShellProps) {
  const splitRef = useRef<HTMLDivElement | null>(null);
  const ratioInitializedRef = useRef(false);
  const sessionAdjustedRatioRef = useRef(false);
  const dragStateRef = useRef<{
    containerLeft: number;
    containerWidth: number;
  } | null>(null);
  const [leftRatio, setLeftRatio] = useState(DEFAULT_LEFT_RATIO);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    ratioInitializedRef.current = true;
    const saved = window.localStorage.getItem(WORKSPACE_SPLIT_RATIO_KEY);
    const containerWidth = splitRef.current?.getBoundingClientRect().width ?? 0;

    if (saved) {
      setLeftRatio(
        resolveInitialWorkspaceRatio({
          savedRatio: saved,
          mapLayout: "balanced",
          containerWidth,
        }),
      );
      return;
    }

    let cancelled = false;

    void getUserSettings()
      .then((settings) => {
        if (cancelled || sessionAdjustedRatioRef.current) {
          return;
        }

        const latestContainerWidth =
          splitRef.current?.getBoundingClientRect().width ?? 0;

        setLeftRatio(
          resolveInitialWorkspaceRatio({
            savedRatio: null,
            mapLayout: settings.workspacePreferences.mapLayout,
            containerWidth: latestContainerWidth,
          }),
        );
      })
      .catch(() => {
        // Guests or failed settings fetch keep the layout default.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const dragState = dragStateRef.current;

      if (!dragState) {
        return;
      }

      const relativeX = event.clientX - dragState.containerLeft;
      const nextRatio = (relativeX / dragState.containerWidth) * 100;
      setLeftRatio(clampWorkspaceRatio(nextRatio, dragState.containerWidth));
    }

    function handlePointerUp() {
      setIsDragging(false);
      dragStateRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!ratioInitializedRef.current) {
      return;
    }

    window.localStorage.setItem(WORKSPACE_SPLIT_RATIO_KEY, String(leftRatio));
  }, [leftRatio]);

  function handleResizePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    const container = splitRef.current;

    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();

    dragStateRef.current = {
      containerLeft: rect.left,
      containerWidth: rect.width,
    };
    sessionAdjustedRatioRef.current = true;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  const gridTemplateColumns = useMemo(
    () =>
      `minmax(0, ${leftRatio}%) ${RESIZER_WIDTH}px minmax(0, ${
        100 - leftRatio
      }%)`,
    [leftRatio],
  );
  const compactLeftPane = compactBlankReadMode || compactEmptyEditMode;

  return (
    <section className="hidden min-h-0 flex-1 flex-col overflow-hidden lg:flex">
      <div className="min-w-0 flex-none">{topBar}</div>

      <div
        ref={splitRef}
        data-testid="desktop-workspace-split"
        className={`grid min-h-0 min-w-0 flex-1 ${
          compactLeftPane ? "mt-2 gap-0" : "mt-2.5 gap-0"
        }`}
        style={{ gridTemplateColumns }}
      >
        <div
          className={`min-h-0 min-w-0 overflow-hidden ${
            compactLeftPane ? "pr-0" : "pr-1"
          }`}
        >
          <div
            className={`h-full min-h-0 overflow-x-hidden pr-1 ${
              compactLeftPane ? "overflow-hidden pr-0" : "overflow-y-auto"
            }`}
          >
            {main}
          </div>
        </div>

        <div className="relative flex min-h-0 items-stretch justify-center">
          <button
            type="button"
            aria-label="拖动调整计划和地图宽度"
            title="拖动调整计划和地图宽度"
            onPointerDown={handleResizePointerDown}
            className={`group absolute inset-y-0 left-1/2 z-20 flex w-3 -translate-x-1/2 cursor-col-resize items-center justify-center ${
              isDragging ? "opacity-100" : "opacity-90"
            }`}
          >
            <span
              className={`h-full w-px bg-[var(--line-strong)] transition-colors ${
                isDragging
                  ? "bg-[var(--clay-deep)]"
                  : "group-hover:bg-[var(--clay)]"
              }`}
            />
            <span
              className={`absolute inline-flex h-14 w-2 items-center justify-center rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.92)] shadow-[2px_2px_0_var(--sand-soft)] transition-all ${
                isDragging
                  ? "border-[var(--clay-deep)] bg-[var(--paper-bright)]"
                  : "group-hover:border-[var(--clay)]"
              }`}
            >
              <span className="h-5 w-[2px] rounded-full bg-[var(--clay)]" />
            </span>
          </button>
        </div>

        <div className="min-h-0 min-w-0 overflow-hidden pl-0">
          <div className="relative h-full min-h-0 overflow-hidden lg:sticky lg:top-0">
            {inspector}
          </div>
        </div>
      </div>
    </section>
  );
}

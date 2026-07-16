import Image from "next/image";
import type { ReactNode } from "react";

import { getWorkspaceSidebarAccent } from "@/lib/trip/workspace-visuals";

import { WorkspacePlaceholderNotice } from "./WorkspacePlaceholderNotice";

export type WorkspaceSidebarItemId =
  | "new-trip"
  | "trips"
  | "explore"
  | "saved"
  | "route"
  | "edit"
  | "export"
  | "settings";

interface WorkspaceSidebarEntry {
  id: WorkspaceSidebarItemId;
  title: string;
  subtitle: string;
  icon: ReactNode;
  available: boolean;
}

interface WorkspaceSidebarProps {
  activeItem?: WorkspaceSidebarItemId;
  expandable?: boolean;
  noticeTitle?: string;
  noticeMessage?: string;
  onNewTrip?: () => void;
  onTrips?: () => void;
  onFocusRoute?: () => void;
  onFocusEdit?: () => void;
  onFocusExport?: () => void;
  onPlaceholder?: (item: WorkspaceSidebarItemId) => void;
}

function IconStroke({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="relative z-[1] h-[19px] w-[19px]"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function IconLogo() {
  return (
    <IconStroke>
      <path d="M6 16.5c3-7.6 8-11 12-10-1.2 4.1-4 7.2-8 8.8" />
      <path d="M6 16.5c1.8.3 3.4.2 4.8-.2" />
      <path d="M7.5 19.5 6 16.5l3-1.5" />
    </IconStroke>
  );
}

function IconNewTrip() {
  return (
    <IconStroke>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </IconStroke>
  );
}

function IconTrips() {
  return (
    <IconStroke>
      <path d="M7 8V6.8A1.8 1.8 0 0 1 8.8 5h6.4A1.8 1.8 0 0 1 17 6.8V8" />
      <rect x="4" y="8" width="16" height="11" rx="2.5" />
      <path d="M12 11.5v4" />
    </IconStroke>
  );
}

function IconExplore() {
  return (
    <IconStroke>
      <circle cx="12" cy="12" r="7" />
      <path d="m10 10 5-2-2 5-5 2 2-5Z" />
    </IconStroke>
  );
}

function IconSaved() {
  return (
    <IconStroke>
      <path d="M12 19s-5.8-3.6-5.8-8.2A3.3 3.3 0 0 1 12 8.1a3.3 3.3 0 0 1 5.8 2.7C17.8 15.4 12 19 12 19Z" />
    </IconStroke>
  );
}

function IconRoute() {
  return (
    <IconStroke>
      <circle cx="7" cy="17" r="2.1" />
      <circle cx="17" cy="7" r="2.1" />
      <path d="M8.8 15.5c1.2-2.6 2.8-4.2 6.1-6" />
      <path d="M10.5 7h3" />
    </IconStroke>
  );
}

function IconEdit() {
  return (
    <IconStroke>
      <path d="m5 19 3.2-.7L18 8.5 15.5 6 5.7 15.8 5 19Z" />
      <path d="m14.5 7 2.5 2.5" />
      <path d="M9 19h10" />
    </IconStroke>
  );
}

function IconExport() {
  return (
    <IconStroke>
      <path d="M12 4.5v10" />
      <path d="m8.5 11 3.5 3.5 3.5-3.5" />
      <path d="M5 18.5h14" />
    </IconStroke>
  );
}

function IconSettings() {
  return (
    <IconStroke>
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="M19 12a7.7 7.7 0 0 0-.1-1l2-1.6-2-3.4-2.4.8a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 2.8c-.6.2-1.2.5-1.7 1L5 6 3 9.4 5 11a7.7 7.7 0 0 0 0 2L3 14.6 5 18l2.5-.8c.5.4 1.1.7 1.7 1l.3 2.8h5l.3-2.8c.6-.2 1.2-.5 1.7-1L19 18l2-3.4-2-1.6c.1-.3.1-.7.1-1Z" />
    </IconStroke>
  );
}

const navGroups: Array<{ label: string; entries: WorkspaceSidebarEntry[] }> = [
  {
    label: "开始",
    entries: [
      {
        id: "new-trip",
        title: "新建计划",
        subtitle: "创建",
        icon: <IconNewTrip />,
        available: true,
      },
      {
        id: "trips",
        title: "我的行程",
        subtitle: "历史",
        icon: <IconTrips />,
        available: true,
      },
      {
        id: "explore",
        title: "探索灵感",
        subtitle: "档案馆",
        icon: <IconExplore />,
        available: false,
      },
      {
        id: "saved",
        title: "收藏地点",
        subtitle: "书签",
        icon: <IconSaved />,
        available: false,
      },
    ],
  },
  {
    label: "工作台",
    entries: [
      {
        id: "route",
        title: "路线理解",
        subtitle: "地图联动",
        icon: <IconRoute />,
        available: true,
      },
      {
        id: "edit",
        title: "编辑计划",
        subtitle: "调整行程",
        icon: <IconEdit />,
        available: true,
      },
      {
        id: "export",
        title: "导出",
        subtitle: "带走",
        icon: <IconExport />,
        available: true,
      },
      {
        id: "settings",
        title: "设置",
        subtitle: "稍后",
        icon: <IconSettings />,
        available: false,
      },
    ],
  },
];

function SidebarItemButton({
  entry,
  active,
  expanded,
  onClick,
}: {
  entry: WorkspaceSidebarEntry;
  active: boolean;
  expanded: boolean;
  onClick: () => void;
}) {
  const accentSrc = getWorkspaceSidebarAccent(entry.id);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={entry.title}
      title={entry.title}
      className={`group/item relative flex h-12 w-full items-center gap-3 overflow-hidden rounded-[18px] border border-transparent px-3 text-left transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
        active
          ? "bg-[rgb(255_255_255_/_0.4)] text-[var(--ink)] shadow-[2px_2px_0_var(--sand-soft)]"
          : "bg-transparent text-[var(--ink-muted)] hover:bg-[rgb(255_255_255_/_0.24)] hover:text-[var(--ink)]"
      }`}
    >
      <span
        className={`absolute left-1.5 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full transition-all duration-200 ${
          active ? "bg-[var(--clay-deep)] opacity-100" : "bg-transparent opacity-0"
        }`}
      />

      <span
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl border transition-colors ${
          active
            ? "border-[rgb(122_63_49_/_0.18)] bg-[var(--paper-bright)] text-[var(--clay-deep)]"
            : entry.available
              ? "border-[var(--line)] bg-[rgb(255_255_255_/_0.5)] text-[var(--clay-deep)] group-hover/item:border-[rgb(142_139_127_/_0.7)]"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] group-hover/item:border-[rgb(142_139_127_/_0.7)]"
        }`}
      >
        <span
          className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${
            active
              ? "opacity-40"
              : "opacity-0 group-hover/item:opacity-25"
          }`}
        >
          <Image
            src={accentSrc}
            alt=""
            fill
            aria-hidden
            sizes="36px"
            className="object-cover"
          />
        </span>
        {entry.icon}
      </span>

      <span
        className={`min-w-0 flex-1 ${
          expanded
            ? "translate-x-0 opacity-100 transition-all duration-150"
            : "translate-x-1 opacity-0 transition-all duration-150"
        }`}
      >
        <span className="flex items-center gap-2">
          <span
            className={`block truncate text-sm font-semibold ${
              active ? "text-[var(--ink)]" : ""
            }`}
          >
            {entry.title}
          </span>
          {!entry.available ? (
            <span className="workspace-chip shrink-0 px-1.5 py-0.5 text-[10px]">
              稍后
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-[11px] tracking-[0.12em] text-[var(--ink-muted)]">
          {entry.subtitle}
        </span>
      </span>
    </button>
  );
}

export function WorkspaceSidebar({
  activeItem = "route",
  expandable = true,
  noticeTitle,
  noticeMessage,
  onNewTrip,
  onTrips,
  onFocusRoute,
  onFocusEdit,
  onFocusExport,
  onPlaceholder,
}: WorkspaceSidebarProps) {
  function handleItemClick(item: WorkspaceSidebarItemId) {
    if (item === "new-trip") {
      onNewTrip?.();
      return;
    }

    if (item === "trips") {
      onTrips?.();
      return;
    }

    if (item === "route") {
      onFocusRoute?.();
      return;
    }

    if (item === "edit") {
      onFocusEdit?.();
      return;
    }

    if (item === "export") {
      onFocusExport?.();
      return;
    }

    onPlaceholder?.(item);
  }

  const rootClassName = expandable ? "group/sidebar" : "";
  const expandedContentClassName = expandable
    ? "translate-x-1 opacity-0 transition-all duration-150 group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100"
    : "hidden";
  const showOnExpandClassName = expandable
    ? "hidden group-hover/sidebar:block"
    : "hidden";

  return (
    <aside className={`${rootClassName} relative h-full min-h-0`}>
      <div
        className={`absolute inset-y-0 left-0 z-20 w-[76px] ${
          expandable
            ? "transition-[width] duration-200 ease-out group-hover/sidebar:w-[228px]"
            : ""
        }`}
      >
        <div className="workspace-panel relative flex h-full min-h-0 flex-col overflow-hidden p-3">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-20">
            <Image
              src="/images/ui/background/paper-noise-soft.png"
              alt=""
              fill
              aria-hidden
              sizes="228px"
              className="object-cover object-top"
            />
          </div>

          <div className="relative z-[1] border-b border-dashed border-[var(--line)] pb-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-[var(--sand-soft)] text-[var(--clay-deep)] shadow-[2px_2px_0_var(--sand)]">
                <span className="pointer-events-none absolute inset-0 opacity-25">
                  <Image
                    src="/images/icons/hover/workspace-hover.png"
                    alt=""
                    fill
                    aria-hidden
                    sizes="40px"
                    className="object-cover"
                  />
                </span>
                <IconLogo />
              </div>
              <div className={`min-w-0 ${expandedContentClassName}`}>
                <p className="truncate text-sm font-semibold text-[var(--ink)]">
                  旅行工作台
                </p>
                <p className="truncate text-[11px] tracking-[0.12em] text-[var(--ink-muted)]">
                  编辑你的行程
                </p>
              </div>
            </div>
          </div>

          <nav
            aria-label="Workspace 导航"
            className="relative z-[1] mt-4 flex-1 space-y-4 overflow-y-auto overflow-x-hidden pr-1 no-scrollbar"
          >
            {navGroups.map((group) => (
              <div key={group.label}>
                <p
                  className={`mb-2 px-2 text-[11px] font-semibold tracking-[0.16em] text-[var(--ink-muted)] ${showOnExpandClassName}`}
                >
                  {group.label.toUpperCase()}
                </p>
                <div className="space-y-1.5">
                  {group.entries.map((entry) => (
                    <SidebarItemButton
                      key={entry.id}
                      entry={entry}
                      active={activeItem === entry.id}
                      expanded={expandable}
                      onClick={() => handleItemClick(entry.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="relative z-[1] mt-4 border-t border-dashed border-[var(--line)] pt-3">
            {noticeMessage ? (
              <div className={`mb-3 ${showOnExpandClassName}`}>
                <WorkspacePlaceholderNotice
                  title={noticeTitle}
                  message={noticeMessage}
                />
              </div>
            ) : null}

            <div className="workspace-panel-soft relative flex items-center gap-3 overflow-hidden px-2.5 py-2.5">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--line)] bg-[var(--paper-bright)]">
                <span className="pointer-events-none absolute inset-0 opacity-30">
                  <Image
                    src="/images/ui/button/button-accent-soft.png"
                    alt=""
                    fill
                    aria-hidden
                    sizes="36px"
                    className="object-cover"
                  />
                </span>
                <span className="relative h-3 w-3 rounded-full bg-[var(--sage-deep)]" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--clay-deep)]" />
              </div>
              <div className={`min-w-0 ${expandedContentClassName}`}>
                <p className="truncate text-sm font-semibold text-[var(--ink)]">
                  工作台已就绪
                </p>
                <p className="truncate text-[11px] tracking-[0.1em] text-[var(--ink-muted)]">
                  旅行手帐模式
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

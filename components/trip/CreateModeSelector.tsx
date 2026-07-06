"use client";

import type { ReactNode } from "react";

import type { CreateModeId } from "@/lib/trip/create-modes";
import { CREATE_MODE_OPTIONS } from "@/lib/trip/create-modes";

interface CreateModeSelectorProps {
  selectedMode: CreateModeId;
  onSelect: (modeId: CreateModeId) => void;
}

function ModeIcon({
  children,
  active,
}: {
  children: ReactNode;
  active: boolean;
}) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
        active
          ? "border-[var(--ink)] bg-[var(--paper-bright)] text-[var(--ink)]"
          : "border-[var(--line)] bg-[var(--paper)] text-[var(--clay-deep)]"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[19px] w-[19px]"
        aria-hidden="true"
      >
        {children}
      </svg>
    </div>
  );
}

function renderModeIcon(modeId: CreateModeId, active: boolean) {
  if (modeId === "self-directed") {
    return (
      <ModeIcon active={active}>
        <path d="M12 20s6-3.8 6-9a6 6 0 1 0-12 0c0 5.2 6 9 6 9Z" />
        <circle cx="12" cy="11" r="2.2" />
      </ModeIcon>
    );
  }

  return (
    <ModeIcon active={active}>
      <path d="M12 3.8 13.9 9l5.3.2-4.2 3.2 1.5 5.1-4.5-2.8-4.5 2.8 1.5-5.1-4.2-3.2 5.3-.2L12 3.8Z" />
    </ModeIcon>
  );
}

export function CreateModeSelector({
  selectedMode,
  onSelect,
}: CreateModeSelectorProps) {
  return (
    <section className="space-y-3">
      <div className="max-w-2xl">
        <p className="workspace-kicker">CREATE MODE</p>
        <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
          先选一种开始方式
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
          这一页只决定你怎么起步。先有一版路线，后面再慢慢改；地图慢慢挑则继续作为后续版本入口保留。
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {CREATE_MODE_OPTIONS.map((option) => {
          const active = selectedMode === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`workspace-panel-soft flex min-h-[148px] w-full items-start gap-4 px-4 py-4 text-left transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
                active
                  ? "border-[var(--ink)] bg-[var(--paper-bright)] shadow-[6px_6px_0_var(--sand-soft)]"
                  : "hover:-translate-y-0.5 hover:border-[var(--line-strong)]"
              }`}
            >
              {renderModeIcon(option.id, active)}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-[var(--ink)]">
                    {option.title}
                  </p>
                  <span
                    className={
                      option.available
                        ? "workspace-chip workspace-chip-accent"
                        : "workspace-chip"
                    }
                  >
                    {option.statusLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  {option.description}
                </p>
                <p className="mt-3 text-[11px] font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
                  {option.eyebrow}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

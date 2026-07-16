import {
  hasActiveTripsFilters,
  type TripSourceType,
  type TripStatus,
} from "../../lib/trips/metadata";
import type { SavedTripListItem } from "../../lib/trips/types";

import { SavedTripCard } from "./SavedTripCard";
import { TripsEmptyState } from "./TripsEmptyState";

interface SavedTripsListProps {
  trips: SavedTripListItem[];
  searchValue?: string;
  statusFilter?: TripStatus | "all";
  sourceTypeFilter?: TripSourceType | "all";
  openingTripId?: string | null;
  deletingTripId?: string | null;
  renamingTripId?: string | null;
  confirmingDeleteTripId?: string | null;
  openErrorByTripId?: Record<string, string | undefined>;
  deleteErrorByTripId?: Record<string, string | undefined>;
  renameErrorByTripId?: Record<string, string | undefined>;
  onSearchValueChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  onResetFilters?: () => void;
  onStatusFilterChange?: (value: TripStatus | "all") => void;
  onSourceTypeFilterChange?: (value: TripSourceType | "all") => void;
  onOpenTrip?: (trip: SavedTripListItem) => void | Promise<void>;
  onDeleteTrip?: (trip: SavedTripListItem) => void | Promise<void>;
  onRenameTrip?: (trip: SavedTripListItem, nextTitle: string) => void | Promise<void>;
  onCancelDeleteTrip?: (trip: SavedTripListItem) => void;
}

export function SavedTripsList({
  trips,
  searchValue = "",
  statusFilter = "all",
  sourceTypeFilter = "all",
  openingTripId = null,
  deletingTripId = null,
  renamingTripId = null,
  confirmingDeleteTripId = null,
  openErrorByTripId,
  deleteErrorByTripId,
  renameErrorByTripId,
  onSearchValueChange,
  onSearchSubmit,
  onResetFilters,
  onStatusFilterChange,
  onSourceTypeFilterChange,
  onOpenTrip,
  onDeleteTrip,
  onRenameTrip,
  onCancelDeleteTrip,
}: SavedTripsListProps) {
  const hasFilters = hasActiveTripsFilters({
    search: searchValue,
    status: statusFilter,
    sourceType: sourceTypeFilter,
  });

  return (
    <section className="space-y-4">
      <div className="workspace-panel px-4 py-4 sm:px-5 sm:py-5">
        <div className="relative z-[1] space-y-4">
          <div>
            <p className="workspace-kicker">我的行程管理</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
              搜一搜、筛一筛，再继续打开到 Workspace
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              这里先管标题、状态、来源和最近打开时间，不会改动你原来的 Workspace 恢复逻辑。
            </p>
          </div>

          <form
            className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              onSearchSubmit?.();
            }}
          >
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--ink)]">搜索标题</span>
              <input
                type="search"
                value={searchValue}
                onChange={(event) => onSearchValueChange?.(event.target.value)}
                placeholder="搜索行程标题"
                className="min-h-11 w-full rounded-[18px] border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 text-sm text-[var(--ink)] outline-none focus:border-[var(--clay-deep)]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--ink)]">状态筛选</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  onStatusFilterChange?.(event.target.value as TripStatus | "all")
                }
                className="min-h-11 w-full rounded-[18px] border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 text-sm text-[var(--ink)] outline-none focus:border-[var(--clay-deep)]"
              >
                <option value="all">全部</option>
                <option value="draft">草稿</option>
                <option value="saved">已保存</option>
                <option value="archived">已归档</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--ink)]">来源筛选</span>
              <select
                value={sourceTypeFilter}
                onChange={(event) =>
                  onSourceTypeFilterChange?.(
                    event.target.value as TripSourceType | "all",
                  )
                }
                className="min-h-11 w-full rounded-[18px] border border-[var(--line-strong)] bg-[var(--paper-bright)] px-4 text-sm text-[var(--ink)] outline-none focus:border-[var(--clay-deep)]"
              >
                <option value="all">全部</option>
                <option value="ai_generated">AI 生成</option>
                <option value="blank_manual">空白手搓</option>
                <option value="explore_import">Explore 导入</option>
              </select>
            </label>

            <div className="flex flex-wrap items-end gap-2">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)]"
              >
                搜索
              </button>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={() => onResetFilters?.()}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink-muted)]"
                >
                  清空筛选
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>

      {trips.length === 0 ? (
        hasFilters ? (
          <section className="workspace-panel px-5 py-5 sm:px-6 sm:py-6">
            <div className="relative z-[1] max-w-2xl">
              <p className="workspace-kicker">没有找到匹配行程</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)] sm:text-3xl">
                这组搜索和筛选下还没有结果
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)] sm:text-[15px] sm:leading-7">
                试试换个标题关键词，或者把状态、来源筛选放宽一点。
              </p>
              <button
                type="button"
                onClick={() => onResetFilters?.()}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-semibold text-[var(--ink-muted)]"
              >
                回到全部列表
              </button>
            </div>
          </section>
        ) : (
          <TripsEmptyState />
        )
      ) : (
        trips.map((trip) => (
          <SavedTripCard
            key={trip.id}
            trip={trip}
            isOpening={openingTripId === trip.id}
            isDeleting={deletingTripId === trip.id}
            isRenaming={renamingTripId === trip.id}
            isConfirmingDelete={confirmingDeleteTripId === trip.id}
            openError={openErrorByTripId?.[trip.id] ?? null}
            deleteError={deleteErrorByTripId?.[trip.id] ?? null}
            renameError={renameErrorByTripId?.[trip.id] ?? null}
            onOpen={onOpenTrip}
            onDelete={onDeleteTrip}
            onRename={onRenameTrip}
            onCancelDelete={onCancelDeleteTrip}
          />
        ))
      )}
    </section>
  );
}

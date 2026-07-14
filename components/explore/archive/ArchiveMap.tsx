import type { ArchiveReaderViewModel } from "@/lib/explore/archive-reader";
import { cleanDisplayText } from "@/lib/explore/archive-display";
import { getArchiveRouteIllustrationSlot } from "@/lib/explore/image-resolver";

import { ResolvedImage } from "../ResolvedImage";
import { ArchiveDecorations } from "./ArchiveDecorations";

interface ArchiveMapProps {
  item: ArchiveReaderViewModel;
}

function buildRouteNodes(item: ArchiveReaderViewModel) {
  const placeNodes = item.places.slice(0, 5).map((place) => ({
    id: place.id,
    name: cleanDisplayText(place.name, "路线节点"),
    description: cleanDisplayText(place.reason, "这一段会围绕这里展开。"),
  }));

  if (placeNodes.length > 0) {
    return placeNodes;
  }

  return item.dailyItinerary.slice(0, 4).map((day, index) => ({
    id: `${day.dayNumber}-${index}`,
    name: cleanDisplayText(day.title, `第 ${index + 1} 天`),
    description: cleanDisplayText(day.summary, "创建后会继续补全路线关系。"),
  }));
}

export function ArchiveMap({ item }: ArchiveMapProps) {
  const routeNodes = buildRouteNodes(item);
  const routeIllustrationSlot = getArchiveRouteIllustrationSlot(item);

  return (
    <section className="relative space-y-4 border-t border-[rgba(158,136,110,0.12)] pt-7">
      <ArchiveDecorations variant="route" />
      <div className="max-w-3xl">
        <p className="workspace-kicker">ROUTE RELATION</p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">地点关系</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">
          这里先给你看一版轻量路线关系。创建后可在 Workspace 查看完整地图与路线。
        </p>
      </div>

      {routeNodes.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink-muted)]">
              {routeNodes.map((node, index) => (
                <div key={node.id} className="flex items-center gap-2">
                  <span className="rounded-full border border-[rgba(158,136,110,0.14)] bg-[rgba(255,252,246,0.26)] px-3 py-1.5 text-[13px] font-semibold text-[var(--ink)]">
                    {node.name}
                  </span>
                  {index < routeNodes.length - 1 ? (
                    <span className="text-[var(--ink-faint)]">→</span>
                  ) : null}
                </div>
              ))}
            </div>

            <ol className="grid gap-4 sm:grid-cols-2">
              {routeNodes.map((node, index) => (
                <li
                  key={node.id}
                  className="space-y-2 border-l border-[rgba(158,136,110,0.14)] pl-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[rgba(158,136,110,0.14)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm font-semibold text-[var(--ink)]">{node.name}</p>
                  </div>
                  <p className="text-sm leading-6 text-[var(--ink-muted)]">{node.description}</p>
                </li>
              ))}
            </ol>
          </div>

          {routeIllustrationSlot.sources.length > 0 ? (
            <div className="relative hidden lg:block">
              <ResolvedImage
                sources={routeIllustrationSlot.sources}
                alt={`${item.title} 地点关系预览图`}
                sizes="256px"
                wrapperClassName="relative aspect-[16/10] overflow-hidden rounded-[10px] border border-[rgba(158,136,110,0.1)] bg-[rgba(255,250,241,0.14)] shadow-[0_12px_24px_rgba(88,76,57,0.06)]"
                imageClassName="object-cover"
              />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm leading-7 text-[var(--ink-muted)]">
          这份档案会在创建后根据你的偏好补全路线关系。
        </p>
      )}
    </section>
  );
}

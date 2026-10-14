import type { CandidatePlace, MapProject } from "@/lib/map-studio/types";

interface MapStudioCandidateTrayProps {
  candidates: CandidatePlace[];
  mapProject: MapProject;
  activeDayId?: string;
}

export function MapStudioCandidateTray({
  candidates,
  mapProject,
  activeDayId,
}: MapStudioCandidateTrayProps) {
  function getRegionName(regionId: string) {
    return (
      mapProject.regions.find((region) => region.id === regionId)?.displayName ??
      "未分区"
    );
  }

  return (
    <section className="rounded-[7px] border border-[rgba(255,236,190,0.14)] bg-[rgba(8,13,14,0.58)] p-2">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(255,236,190,0.48)]">
        候选
      </p>
      {candidates.length > 0 ? (
        <div className="grid gap-1.5">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="rounded-[5px] border border-[rgba(255,236,190,0.1)] bg-[rgba(255,250,235,0.035)] px-2 py-1.5 text-xs"
            >
              <p className="font-semibold text-[rgba(255,250,235,0.72)]">
                {candidate.place.displayName}
              </p>
              <p className="mt-0.5 text-[rgba(255,250,235,0.5)]">
                {getRegionName(candidate.regionId)} · {candidate.place.category}
              </p>
              <p className="mt-0.5 text-[rgba(255,250,235,0.46)]">
                {candidate.suggestedDuration} · Day{" "}
                {candidate.targetDayId ?? activeDayId ?? "待定"} ·{" "}
                {candidate.status}
              </p>
              {candidate.conflictHints.length > 0 ? (
                <p className="mt-1 text-[rgba(255,200,150,0.72)]">
                  {candidate.conflictHints.join(" / ")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-5 text-[rgba(255,250,235,0.48)]">
          暂无候选
        </p>
      )}
    </section>
  );
}

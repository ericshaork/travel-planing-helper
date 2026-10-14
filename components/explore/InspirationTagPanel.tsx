"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

import { getInspirationCardImageCandidates } from "@/lib/explore/image-resolver";
import { getInspirationCardAsset } from "@/lib/explore/inspiration-assets";
import type { InspirationFacetKey } from "@/lib/explore/types";

import { ResolvedImage } from "./ResolvedImage";

interface InspirationTagPanelProps {
  title: string;
  categoryKey: InspirationFacetKey;
  options: string[];
  selected: string[];
  onToggle: (label: string) => void;
}

function cardTilt(index: number) {
  const tilts = [-2.2, 1.2, -0.8, 1.8, -1.4, 1.4, -1, 1.7, -1.2, 0.9];
  return tilts[index % tilts.length];
}

export function InspirationTagPanel({
  title,
  categoryKey,
  options,
  selected,
  onToggle,
}: InspirationTagPanelProps) {
  const hasStackedCards = options.every((option) =>
    Boolean(getInspirationCardAsset(categoryKey, option)),
  );

  return (
    <div
      aria-label={`${title}灵感标签`}
      className={hasStackedCards ? "overflow-visible py-1" : "overflow-x-auto py-1"}
    >
      <div
        className={hasStackedCards ? "flex overflow-visible pr-1" : "flex gap-0 overflow-x-auto"}
        data-inspiration-category={categoryKey}
      >
        {options.map((option, index) => {
          const active = selected.includes(option);
          const tilt = cardTilt(index);
          const stackedAsset = getInspirationCardAsset(categoryKey, option);

          if (stackedAsset) {
            const overlap =
              categoryKey === "season"
                ? "clamp(-18px, -1vw, -8px)"
                : "clamp(-34px, -1.8vw, -20px)";
            const cardWidth =
              categoryKey === "season"
                ? "clamp(148px, 10.6vw, 194px)"
                : "clamp(96px, 5.95vw, 124px)";

            return (
              <button
                key={option}
                type="button"
                onClick={() => onToggle(option)}
                aria-pressed={active}
                data-inspiration-card={stackedAsset.slug}
                style={
                  {
                    marginLeft: index === 0 ? 0 : overlap,
                    width: cardWidth,
                    "--base-tilt": `${tilt}deg`,
                    "--selected-x": active ? "8px" : "0px",
                    "--hover-x": "0px",
                    "--hover-y": "0px",
                    "--active-ring": active
                      ? "0 0 0 2px rgba(71, 96, 72, 0.72), 0 14px 24px rgba(83, 70, 51, 0.12)"
                      : "0 8px 18px rgba(83, 70, 51, 0.08)",
                  } as CSSProperties
                }
                className={`group relative h-[5.65rem] shrink-0 cursor-pointer overflow-hidden rounded-[10px] border bg-[var(--paper)] text-left transition-all duration-200 ease-out [box-shadow:var(--active-ring)] [transform:translateX(var(--selected-x))_translateX(var(--hover-x))_translateY(var(--hover-y))_rotate(var(--base-tilt))] hover:z-30 hover:[--base-tilt:0deg] hover:[--hover-x:12px] hover:[--hover-y:-3px] focus-visible:z-30 focus-visible:[--base-tilt:0deg] focus-visible:[--hover-x:12px] focus-visible:[--hover-y:-3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sage-deep)] ${
                  active
                    ? "z-20 border-[rgba(71,96,72,0.58)]"
                    : "border-[rgba(214,205,187,0.82)] hover:border-[rgba(88,69,52,0.34)]"
                }`}
              >
                <Image
                  src={stackedAsset.image}
                  alt=""
                  fill
                  sizes={
                    categoryKey === "season"
                      ? "(min-width: 1024px) 18vw, 50vw"
                      : "(min-width: 1024px) 14vw, 50vw"
                  }
                  className="object-cover transition-[filter,transform] duration-200 ease-out group-hover:scale-[1.02] group-hover:brightness-[1.04] group-hover:saturate-[1.04]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(58,42,30,0.07)_0%,rgba(255,253,247,0.02)_44%,rgba(22,24,20,0.08)_100%)]" />
                <div
                  className={`absolute inset-y-0 left-0 w-7 border-r border-[rgba(76,35,28,0.22)] transition-colors duration-200 ${
                    active ? "bg-[#a94233]" : "bg-[#b95445]"
                  }`}
                >
                  <span
                    className="absolute left-1/2 top-3.5 max-h-[4.35rem] -translate-x-1/2 overflow-hidden text-[0.78rem] font-semibold leading-none tracking-[0.08em] text-[#2f2a22] [text-orientation:upright] [writing-mode:vertical-rl]"
                    style={{
                      fontFamily:
                        '"Ma Shan Zheng", "Long Cang", "STKaiti", "KaiTi", "FangSong", serif',
                    }}
                  >
                    {option}
                  </span>
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,253,247,0.08)_0%,rgba(255,253,247,0)_42%,rgba(58,42,30,0.15)_100%)]" />
                {active ? (
                  <span className="absolute right-1.5 top-1.5 rounded-full border border-[rgba(71,96,72,0.34)] bg-[rgba(244,248,238,0.9)] px-1.5 py-0.5 text-[9px] font-semibold text-[rgb(58,82,59)] shadow-[0_6px_12px_rgba(58,82,59,0.12)]">
                    已选
                  </span>
                ) : null}
              </button>
            );
          }

          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              aria-pressed={active}
              style={{
                marginLeft: index === 0 ? 0 : -16,
                "--card-tilt": `${tilt}deg`,
              } as CSSProperties}
              className={`group relative h-[5.65rem] w-[7.2rem] shrink-0 overflow-hidden rounded-[10px] border px-3 py-2.5 text-left shadow-[0_4px_12px_rgba(83,70,51,0.06)] transition-all duration-200 [transform:rotate(var(--card-tilt))] hover:z-20 hover:[transform:translateY(-0.3rem)_rotate(0deg)] focus-visible:z-20 focus-visible:[transform:translateY(-0.3rem)_rotate(0deg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${
                active
                  ? "z-10 border-[rgba(88,69,52,0.42)] bg-[rgba(255,253,247,0.98)] text-[var(--ink)] ring-1 ring-[rgba(88,69,52,0.14)]"
                  : "border-[rgba(214,205,187,0.86)] bg-[rgba(255,253,247,0.82)] text-[var(--ink-muted)]"
              }`}
            >
              <ResolvedImage
                sources={getInspirationCardImageCandidates(categoryKey)}
                alt=""
                sizes="128px"
                wrapperClassName="absolute inset-0 bg-[var(--paper)]"
                imageClassName="object-cover opacity-35 transition-opacity duration-200 group-hover:opacity-45"
              />
              <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,253,247,0.88)_0%,rgba(255,250,241,0.72)_54%,rgba(223,232,216,0.62)_100%)]" />
              <div className="relative flex h-full flex-col justify-end">
                <span className="text-xs font-semibold leading-5">{option}</span>
                {active ? (
                  <span className="mt-1 w-fit rounded-full bg-[rgba(88,69,52,0.1)] px-2 py-0.5 text-[9px] font-semibold text-current/78">
                    已加入
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

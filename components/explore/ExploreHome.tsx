"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { fetchExploreList } from "@/lib/explore/client";
import { startExploreCreateFlow } from "@/lib/explore/flow";
import { buildTripPlanDraftFromInspiration } from "@/lib/explore/to-trip-draft";
import type { InspirationSelection } from "@/lib/explore/types";

import { CitySearchSection } from "./CitySearchSection";
import { FeaturedSection } from "./FeaturedSection";
import { InspirationDeck } from "./InspirationDeck";

function normalizeCityQuery(value: string) {
  return value.trim().toLowerCase();
}

export function ExploreHome() {
  const router = useRouter();
  const [cityInput, setCityInput] = useState("");
  const [inspirationSelection, setInspirationSelection] =
    useState<InspirationSelection>({});

  function resetFilters() {
    setCityInput("");
    setInspirationSelection({});
  }

  async function handleCitySearch() {
    const normalizedQuery = normalizeCityQuery(cityInput);

    if (!normalizedQuery) {
      return;
    }

    const items = await fetchExploreList({ limit: 50 });
    const matchedItem = items.find((item) => {
      const haystacks = [item.city, item.cityCode, item.slug, item.title].map(
        (value) => value.trim().toLowerCase(),
      );

      return haystacks.some(
        (value) => value === normalizedQuery || value.includes(normalizedQuery),
      );
    });

    if (matchedItem) {
      router.push(`/explore/${matchedItem.slug}`);
    }
  }

  function handleGenerateFromInspiration() {
    const draft = buildTripPlanDraftFromInspiration(inspirationSelection);
    startExploreCreateFlow(draft, router);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <CitySearchSection
        cityQuery={cityInput}
        onCityQueryChange={setCityInput}
        onSearch={handleCitySearch}
        onReset={resetFilters}
      />

      <section className="grid items-stretch gap-4 xl:grid-cols-2">
        <article className="workspace-panel-soft h-full px-5 py-5 sm:px-6">
          <div className="relative z-[1] flex h-full flex-col gap-4">
            <div className="max-w-2xl">
              <p className="workspace-kicker text-[var(--sage-deep)]">
                灵感探索
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
                先从地点、美食、季节和同行开始
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                四个分类直接展开在这里。先翻翻灵感，再决定你要不要继续生成一份自己的旅行计划。
              </p>
            </div>

            <div className="flex-1">
              <InspirationDeck
                selection={inspirationSelection}
                onSelectionChange={setInspirationSelection}
                onGenerate={handleGenerateFromInspiration}
              />
            </div>
          </div>
        </article>

        <article className="workspace-panel-soft h-full overflow-hidden px-5 py-5 sm:px-6">
          <div className="relative z-[1] flex h-full flex-col justify-between gap-5">
            <div>
              <p className="workspace-kicker text-[var(--clay-deep)]">
                AI规划
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
                一句话生成你的私人旅行方案
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
                从模糊想法到可编辑路线，Create 会继续复用现有生成链路，只是把入口做得更像一页旅行手账。
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[24px] border border-[var(--line)] bg-[rgba(255,253,247,0.84)] p-4">
              <div className="absolute inset-0 opacity-70">
                <Image
                  src="/images/archive/template/archive-template-main.png"
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 28vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute right-4 top-4 h-16 w-16 opacity-80">
                <Image
                  src="/images/landing/decoration/routes/02-airplane-route.png"
                  alt=""
                  fill
                  sizes="64px"
                  className="object-contain"
                />
              </div>
              <div className="absolute bottom-4 left-4 h-14 w-14 opacity-85">
                <Image
                  src="/images/landing/decoration/stamps/09-next-stop-ticket.png"
                  alt=""
                  fill
                  sizes="56px"
                  className="object-contain"
                />
              </div>
              <div className="absolute inset-y-8 left-1/2 w-16 -translate-x-1/2 opacity-65">
                <Image
                  src="/images/landing/decoration/routes/12-route-notebook.png"
                  alt=""
                  fill
                  sizes="64px"
                  className="object-contain"
                />
              </div>
              <div className="relative flex min-h-[14rem] items-end rounded-[18px] border border-dashed border-[rgba(134,117,97,0.25)] bg-[rgba(255,253,247,0.38)] p-4">
                <p className="max-w-[12rem] text-sm leading-6 text-[rgba(88,69,52,0.82)]">
                  打开的旅行笔记、路线线条和贴纸感视觉一起出现，让 AI 规划入口不再像一块空白说明卡。
                </p>
              </div>
            </div>

            <div className="rounded-[22px] border border-[var(--line)] bg-[rgba(255,253,247,0.78)] px-4 py-4">
              <p className="text-sm font-semibold text-[var(--ink)]">输入示例</p>
              <div className="mt-3 space-y-2.5 text-sm leading-6 text-[var(--ink-muted)]">
                <p className="rounded-[16px] bg-[rgba(255,253,247,0.92)] px-4 py-3">
                  “帮我规划一个 3 天厦门慢旅行”
                </p>
                <p className="rounded-[16px] bg-[rgba(255,253,247,0.92)] px-4 py-3">
                  “寻找适合情侣的周末城市”
                </p>
                <p className="rounded-[16px] bg-[rgba(255,253,247,0.92)] px-4 py-3">
                  “预算 3000 元的毕业旅行”
                </p>
              </div>

              <div className="mt-4">
                <Link
                  href="/create"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[rgba(255,253,247,0.92)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)]"
                >
                  生成我的旅行
                </Link>
              </div>
            </div>
          </div>
        </article>
      </section>

      <FeaturedSection />
    </div>
  );
}

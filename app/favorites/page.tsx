"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useAuthStatus } from "@/components/auth/useAuthStatus";
import { ExploreCard } from "@/components/explore/ExploreCard";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { listFavoriteArchives } from "@/lib/explore/favorites";
import type { ExploreTripContent, ExploreTripListItem } from "@/lib/explore/types";

function toListItem(item: ExploreTripContent): ExploreTripListItem {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    city: item.city,
    cityCode: item.cityCode,
    region: item.region,
    tripType: item.tripType,
    days: item.days,
    tags: item.tags,
    theme: item.theme,
    pace: item.pace,
    coverImageUrl: item.coverImageUrl,
    archiveIntro: item.archiveIntro,
    featured: item.featured,
    featuredReason: item.featuredReason,
    creatorType: item.creatorType,
    creatorId: item.creatorId,
    creator: item.creator,
    likes: item.likes,
    views: item.views,
    savedCount: item.savedCount,
    terrainTags: item.terrainTags,
    cuisineTags: item.cuisineTags,
    seasonTags: item.seasonTags,
    companionTags: item.companionTags,
    highlights: item.highlights,
  };
}

export default function FavoritesPage() {
  const authState = useAuthStatus();
  const userId = useMemo(
    () => authState.user?.id ?? authState.user?.email ?? "guest",
    [authState.user],
  );
  const items = useMemo(
    () => listFavoriteArchives(userId).map(toListItem),
    [userId],
  );

  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header
        minimal
        overlay={false}
        navItems={[
          { href: "/explore", label: "探索灵感" },
          { href: "/trips", label: "我的行程" },
          { href: "/create", label: "创建旅行", emphasized: true },
          { href: "/favorites", label: "收藏" },
        ]}
      />

      <main className="mx-auto flex w-full max-w-[86rem] flex-1 flex-col px-4 pb-8 pt-2 sm:px-8 sm:pb-16">
        <section className="workspace-panel mb-5 px-5 py-5 sm:px-6 sm:py-6">
          <div className="relative z-[1] max-w-2xl">
            <p className="workspace-kicker">收藏</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
              你收藏下来的旅行档案
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
              先把喜欢的灵感留在这里，之后再导入工作台或继续打开查看。
            </p>
          </div>
        </section>

        {items.length === 0 ? (
          <section className="workspace-panel px-5 py-5 sm:px-6 sm:py-6">
            <div className="relative z-[1] max-w-2xl">
              <p className="workspace-kicker">还没有收藏</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">
                这里还没有收藏的档案
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
                去探索灵感逛逛，看到喜欢的城市档案后点一下收藏。
              </p>
              <Link
                href="/explore"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ink)] bg-[rgba(255,253,247,0.92)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)]"
              >
                回到探索灵感
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-3">
            {items.map((item, index) => (
              <ExploreCard
                key={item.id}
                item={item}
                priorityImage={index < 3}
              />
            ))}
          </section>
        )}
      </main>

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}

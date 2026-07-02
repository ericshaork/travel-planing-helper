"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { AttractionCard } from "@/components/trip/AttractionCard";
import { BudgetSummaryCard } from "@/components/trip/BudgetSummaryCard";
import { DayItineraryCard } from "@/components/trip/DayItineraryCard";
import { ExportActions } from "@/components/trip/ExportActions";
import { HotelAreaAdvice } from "@/components/trip/HotelAreaAdvice";
import { RegenerateBox } from "@/components/trip/RegenerateBox";
import { TransportAdvice } from "@/components/trip/TransportAdvice";
import { TripSummaryCard } from "@/components/trip/TripSummaryCard";
import { WeatherAlertCard } from "@/components/trip/WeatherAlertCard";
import {
  loadTripPlan,
  loadTripRequest,
  saveTripPlan,
} from "@/lib/trip/storage";
import type {
  GenerateTripResponse,
  ItineraryItem,
  TripPlan,
  TripRequest,
} from "@/lib/trip/types";

interface AttractionEntry {
  attraction: ItineraryItem;
  day: number;
}

type ResultPageState = "loading" | "missing" | "ready";

function collectAttractions(tripPlan: TripPlan): AttractionEntry[] {
  const seen = new Set<string>();
  const attractions: AttractionEntry[] = [];

  for (const day of tripPlan.dailyItinerary) {
    const items = [...day.morning, ...day.afternoon, ...day.evening];

    for (const item of items) {
      const key = item.placeName.trim().toLocaleLowerCase();

      if (item.type === "attraction" && !seen.has(key)) {
        seen.add(key);
        attractions.push({ attraction: item, day: day.day });
      }
    }
  }

  return attractions;
}

export default function ResultPage() {
  const [pageState, setPageState] = useState<ResultPageState>("loading");
  const [tripPlan, setTripPlan] = useState<TripPlan>();
  const [tripRequest, setTripRequest] = useState<TripRequest | null>(null);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const savedTripPlan = loadTripPlan();
      const savedTripRequest = loadTripRequest();

      setTripRequest(savedTripRequest);

      if (!savedTripPlan) {
        setPageState("missing");
        return;
      }

      setTripPlan(savedTripPlan);
      setPageState("ready");
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  const attractions = useMemo(
    () => (tripPlan ? collectAttractions(tripPlan) : []),
    [tripPlan],
  );

  function handleRegenerated(response: GenerateTripResponse) {
    const savedTripPlan = saveTripPlan(response.tripPlan);
    setTripPlan(savedTripPlan);
  }

  if (pageState === "loading") {
    return (
      <div className="paper-texture min-h-screen overflow-x-clip text-[var(--ink)]">
        <Header />
        <main className="mx-auto max-w-3xl px-5 py-20 text-center">
          <p className="text-sm font-semibold text-[var(--ink-muted)]">
            正在翻开刚排好的行程...
          </p>
        </main>
      </div>
    );
  }

  if (pageState === "missing" || !tripPlan) {
    return (
      <div className="paper-texture min-h-screen overflow-x-clip text-[var(--ink)]">
        <Header />
        <main className="mx-auto max-w-xl px-5 py-10 sm:py-16">
          <section className="border border-[var(--line-strong)] bg-[var(--paper-bright)] p-7 shadow-[8px_9px_0_var(--sand)]">
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
              这张纸还是空的
            </p>
            <h1 className="mt-3 text-3xl font-semibold">还没有行程结果</h1>
            <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
              可以回上一步补信息再生成。要是想彻底换个目的地，就回首页重新写。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/plan"
                className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
              >
                回上一步补信息
              </Link>
              <Link
                href="/"
                className="border border-[var(--line-strong)] bg-[var(--paper)] px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
              >
                回首页重新写
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="paper-texture min-h-screen overflow-x-clip text-[var(--ink)]">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-4 sm:px-8 sm:pt-8">
        <nav
          aria-label="结果页返回入口"
          className="mb-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold"
        >
          <Link
            href="/plan"
            className="border-b border-[var(--line-strong)] pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
          >
            回上一步看信息
          </Link>
          <Link
            href="/"
            className="border-b border-[var(--line-strong)] pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
          >
            回首页重新写
          </Link>
        </nav>

        <TripSummaryCard tripPlan={tripPlan} />

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <WeatherAlertCard weather={tripPlan.weatherSummary} />
          <BudgetSummaryCard budget={tripPlan.budgetSummary} />
        </div>

        <section aria-labelledby="daily-title" className="mt-14">
          <div className="mb-6 max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
              按天照着走
            </p>
            <h2 id="daily-title" className="mt-2 text-3xl font-semibold">
              每日行程
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              同一天尽量排在相近片区。累了就删一项，别为了打卡把自己赶着走。
            </p>
          </div>
          <div className="space-y-7">
            {tripPlan.dailyItinerary.map((day) => (
              <DayItineraryCard key={day.day} itinerary={day} />
            ))}
          </div>
        </section>

        <section aria-labelledby="attraction-title" className="mt-14">
          <div className="mb-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--sage-deep)]">
              到地方别只看简介
            </p>
            <h2 id="attraction-title" className="mt-2 text-3xl font-semibold">
              景点攻略
            </h2>
          </div>
          {attractions.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {attractions.map(({ attraction, day }) => (
                <AttractionCard
                  key={attraction.placeName}
                  attraction={attraction}
                  day={day}
                />
              ))}
            </div>
          ) : (
            <p className="border-l-2 border-[var(--sand-deep)] bg-[var(--sand-soft)] px-4 py-3 text-sm leading-6 text-[var(--ink-muted)]">
              这版没有单独标成景点的安排，具体走法都放在每日行程里了。
            </p>
          )}
        </section>

        <div className="mt-14">
          <HotelAreaAdvice advice={tripPlan.hotelAreaAdvice} />
        </div>

        <div className="mt-14">
          <TransportAdvice advice={tripPlan.transportAdvice} />
        </div>

        <section
          aria-labelledby="notes-title"
          className="mt-14 grid items-start gap-6 lg:grid-cols-[1fr_0.9fr]"
        >
          <div className="border border-[var(--line-strong)] bg-[var(--paper-bright)] p-5 sm:p-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--clay-deep)]">
              临走前再核实
            </p>
            <h2 id="notes-title" className="mt-2 text-2xl font-semibold">
              注意事项
            </h2>

            {tripPlan.warnings.length > 0 ? (
              <ul className="mt-5 space-y-2 bg-[var(--clay-soft)] px-4 py-3 text-sm leading-6 text-[var(--clay-deep)]">
                {tripPlan.warnings.map((warning) => (
                  <li key={warning}>- {warning}</li>
                ))}
              </ul>
            ) : null}

            {tripPlan.generalTips.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--ink-muted)]">
                {tripPlan.generalTips.map((tip) => (
                  <li key={tip}>- {tip}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="space-y-5">
            <div className="border border-[var(--line-strong)] bg-[var(--paper-bright)] p-5 sm:p-6">
              <ExportActions tripPlan={tripPlan} />
            </div>
            <RegenerateBox
              tripPlan={tripPlan}
              tripRequest={tripRequest}
              onRegenerated={handleRegenerated}
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

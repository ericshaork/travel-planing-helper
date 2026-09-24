"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import type { TripRequest } from "@/lib/trip/types";

const STATUS_MESSAGES = [
  { title: "正在整理你的偏好", detail: "城市、预算和节奏已经放到一张草稿里。" },
  { title: "正在查看目的地的节奏", detail: "当地的热门片区和顺路点正在被拉出来。" },
  { title: "正在安排每天的停留点", detail: "按片区拆分，再留出吃饭和休息的空档。" },
  { title: "正在把想法整理成旅行手帐", detail: "路线排顺后，这趟旅行就慢慢有形状了。" },
] as const;

const TRAVEL_QUOTES = [
  "世界是一本书，不旅行的人只读了一页。",
  "最好的路线，往往是在出发之后慢慢出现。",
  "旅行不是赶路，而是重新认识一个地方。",
  "走得越远，越懂得自己有多渺小。",
  "旅行最重要的不是去哪，而是跟谁一起。",
  "每一次出发，都是在给自己攒故事。",
] as const;

const BACKGROUND_IMAGES = [
  "/images/landing/background/watercolor-bg.png",
  "/images/landing/background/watercolor-green.png",
  "/images/landing/background/watercolor-pink.png",
  "/images/landing/background/watercolor-purple.png",
] as const;

interface GenerateLoadingProps {
  tripRequest: TripRequest;
  isGenerating: boolean;
  errorMessage?: string;
  onBack: () => void;
  onRetry: () => void;
}

export function GenerateLoading({
  tripRequest,
  isGenerating,
  errorMessage,
  onBack,
  onRetry,
}: GenerateLoadingProps) {
  const [statusIndex, setStatusIndex] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const cycleStatus = useCallback(() => {
    setStatusIndex((i) => (i + 1) % STATUS_MESSAGES.length);
  }, []);

  const cycleQuote = useCallback(() => {
    setQuoteIndex((i) => (i + 1) % TRAVEL_QUOTES.length);
  }, []);

  const cycleBg = useCallback(() => {
    setBgIndex((i) => (i + 1) % BACKGROUND_IMAGES.length);
  }, []);

  useEffect(() => {
    if (!isGenerating) return;

    const statusTimer = setInterval(cycleStatus, 4000);
    const quoteTimer = setInterval(cycleQuote, 6000);
    const bgTimer = setInterval(cycleBg, 8000);

    return () => {
      clearInterval(statusTimer);
      clearInterval(quoteTimer);
      clearInterval(bgTimer);
    };
  }, [isGenerating, cycleStatus, cycleQuote, cycleBg]);

  useEffect(() => {
    if (!isGenerating) {
      return;
    }

    const startTime = Date.now();
    const maxDuration = 90000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min(elapsed / maxDuration, 0.95);
      setProgress(nextProgress);
    }, 500);

    return () => clearInterval(interval);
  }, [isGenerating]);

  const currentStatus = errorMessage
    ? STATUS_MESSAGES[STATUS_MESSAGES.length - 1]
    : STATUS_MESSAGES[statusIndex];
  const displayedProgress = isGenerating ? progress : 0;

  return (
    <section className="relative mx-auto min-h-[calc(100vh-5.5rem)] w-full max-w-3xl overflow-hidden px-4 py-4 sm:px-6 sm:py-5">
      {/* Background layer — full bleed */}
      <div className="absolute inset-0 -z-[1]">
        <Image
          src={BACKGROUND_IMAGES[bgIndex]}
          alt=""
          fill
          priority
          className="object-cover opacity-40 transition-opacity duration-[3000ms]"
          aria-hidden="true"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgb(243 238 223 / 85%) 0%, rgb(243 238 223 / 60%) 50%, rgb(243 238 223 / 85%) 100%)",
          }}
        />
      </div>

      {/* Floating travel stickers — with gentle CSS animation */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Image
          src="/images/stickers/travel/compass.png"
          alt=""
          width={48}
          height={48}
          className="sticker-float absolute -right-3 top-6 opacity-20 sm:right-8 sm:top-8"
        />
        <Image
          src="/images/stickers/travel/suitcase.png"
          alt=""
          width={40}
          height={40}
          className="sticker-float absolute bottom-16 left-6 opacity-15 sm:bottom-20 sm:left-12"
        />
        <Image
          src="/images/stickers/travel/folded-map.png"
          alt=""
          width={56}
          height={56}
          className="sticker-float absolute right-8 top-1/3 opacity-10 sm:right-16"
        />
        <Image
          src="/images/stickers/travel/camera.png"
          alt=""
          width={36}
          height={36}
          className="sticker-float absolute bottom-32 right-1/4 opacity-15"
        />
        <Image
          src="/images/stickers/travel/passport.png"
          alt=""
          width={40}
          height={40}
          className="sticker-float absolute left-8 top-1/4 opacity-15 sm:left-14"
        />
      </div>

      {/* Content layer — vertically centered */}
      <div className="flex min-h-[calc(100vh-5.5rem)] flex-col items-center justify-center text-center">
        {/* Top status area */}
        <div className="space-y-2">
          <p className="journey-kicker">
            {errorMessage ? "路线暂停" : "正在诞生"}
          </p>

          <h2 className="journey-title text-lg sm:text-xl">
            {errorMessage
              ? "先别重填，原来的信息还在。"
              : `${tripRequest.destinationCity} 的路线，正在排。`}
          </h2>

          <p className="journey-subtitle mx-auto max-w-md text-sm">
            {errorMessage
              ? currentStatus.detail
              : `${tripRequest.days} 天，预算约 ${tripRequest.budget} ${tripRequest.currency}。`}
          </p>

          {/* Status cycling message */}
          {!errorMessage && isGenerating && (
            <div className="flex justify-center">
              <span className="map-desk-chip">{currentStatus.title}</span>
            </div>
          )}

          {/* Progress bar */}
          {isGenerating && !errorMessage && (
            <div className="mx-auto mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[var(--sand-soft)] sm:max-w-sm">
              <div
                className="h-full rounded-full bg-[var(--clay)] transition-[width] duration-700 ease-out"
                style={{ width: `${displayedProgress * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Bottom: quote + error actions */}
        <div className="mt-auto flex flex-col items-center gap-1.5 pt-3">
          {/* Error / retry area */}
          {errorMessage && (
            <div className="space-y-1.5">
              <p
                role="alert"
                className="border-l-2 border-[var(--clay)] bg-[var(--clay-soft)] px-2.5 py-1 text-sm leading-5 text-[var(--clay-deep)]"
              >
                {errorMessage}
              </p>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-center">
                <button
                  type="button"
                  onClick={onRetry}
                  className="min-h-9 w-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-1.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] sm:w-auto"
                >
                  再试一次
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="min-h-9 border-b border-[var(--ink)] pb-1 text-center text-sm font-semibold text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)] sm:w-auto sm:border-b-0 sm:pb-0"
                >
                  返回继续修改
                </button>
              </div>
            </div>
          )}

          {/* Travel quote carousel */}
          {!errorMessage && (
            <div className="max-w-sm space-y-1">
              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[var(--ink-faint)]">
                旅行手记
              </p>
              <p
                className="text-sm leading-6 text-[var(--ink-muted)] transition-opacity duration-500"
                key={quoteIndex}
              >
                「{TRAVEL_QUOTES[quoteIndex]}」
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { getInspirationCardAsset } from "@/lib/explore/inspiration-assets";
import {
  INSPIRATION_CATEGORY_CONFIG,
  type InspirationOption,
} from "@/lib/explore/inspiration";
import type { InspirationFacetKey, InspirationSelection } from "@/lib/explore/types";

interface InspirationBrowserProps {
  selection: InspirationSelection;
  onToggle: (key: InspirationFacetKey, label: string) => void;
}

const OPTION_BLURBS: Record<InspirationFacetKey, Record<string, string>> = {
  location: {
    海边: "沿海岸线慢慢走，海风会带路。",
    古城: "老城巷子里，藏着最耐走的故事。",
    山谷: "抬头是山，低头是溪，节奏自然慢。",
    草原: "把日程放空，交给风和大片绿色。",
    雨林: "湿气和绿意都很足，适合躲进自然。",
    湖泊: "湖边坐一下午，比赶三个景点值。",
    雪山: "看得见雪的地方，脚步会自动放轻。",
    城市漫步: "不打车不赶路，用脚认识一座城。",
    海岛: "上岛之后，行程表就可以收起来了。",
    江南水乡: "小桥流水慢慢摇，适合散心。",
  },
  food: {
    小吃: "边走边吃，一街一口刚刚好。",
    火锅: "为一顿火锅多留一晚，值得。",
    早茶: "早上留白，从一笼点心开始。",
    面食: "汤头和本地面馆，比攻略更准。",
    米粉: "一碗粉下肚，才算到过这座城。",
    海鲜: "靠海吃海，问店家今天什么最鲜。",
    夜市: "晚上别排景点，去夜市挤一挤。",
    甜品: "留一点胃给甜的，心情会好。",
    茶馆: "找间老茶馆坐下，半日就没了。",
    市集: "跟着菜市场的香味走，不会错。",
  },
  season: {
    春: "花一路开，走路都带风。",
    夏: "往凉快的地方躲，傍晚再出门。",
    秋: "天高色暖，最适合压马路。",
    冬: "冷归冷，温泉和热汤在等你。",
  },
  companion: {
    独游: "一个人，想停就停想走就走。",
    情侣: "节奏放慢一点，多留拍照时间。",
    朋友: "分工找吃的，行程自然热闹。",
    亲子: "一天一个主景点，别贪多。",
    家庭: "老少皆宜的路线，少走台阶。",
    同学: "毕业或散心，预算友好优先。",
    闺蜜: "好看好拍好逛，三好行程。",
    团建: "人多也能走得顺的宽松版本。",
    摄影: "光线好的时段，留给最重要的景。",
    长辈同行: "节奏松、停顿多，舒服最重要。",
  },
};

const STAMP_FONT_FAMILY =
  '"Ma Shan Zheng", "Long Cang", "STKaiti", "KaiTi", "FangSong", serif';

function getRibbonText(option: InspirationOption) {
  const base = option.ribbonLabel?.trim() || option.label.trim();
  return base.length > 4 ? base.slice(0, 3) : base;
}

export function InspirationBrowser({ selection, onToggle }: InspirationBrowserProps) {
  const [activeKey, setActiveKey] = useState<InspirationFacetKey>("location");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollHint, setScrollHint] = useState({
    canLeft: false,
    canRight: false,
    thumbLeft: 0,
    thumbWidth: 1,
  });
  const dragState = useRef({ pointerId: -1, startX: 0, lastX: 0, moved: false });

  const hasOverflow = scrollHint.thumbWidth < 0.999;

  const activeCategory =
    INSPIRATION_CATEGORY_CONFIG.find((category) => category.key === activeKey) ??
    INSPIRATION_CATEGORY_CONFIG[0];

  function updateScrollHint() {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    setScrollHint({
      canLeft: el.scrollLeft > 8,
      canRight: el.scrollLeft < maxScroll - 8,
      thumbLeft: el.scrollWidth > 0 ? el.scrollLeft / el.scrollWidth : 0,
      thumbWidth: el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1,
    });
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ left: 0 });
    updateScrollHint();
  }, [activeKey]);

  function getScrollAmount() {
    const el = scrollRef.current;
    if (!el) {
      return 320;
    }
    const card = el.querySelector<HTMLElement>("[data-inspiration-card]");
    const cardWidth = card?.getBoundingClientRect().width ?? 176;
    return Math.max(cardWidth * 2 + 32, el.clientWidth * 0.75);
  }

  function handleScrollLeft() {
    scrollRef.current?.scrollBy({ left: -getScrollAmount(), behavior: "smooth" });
  }

  function handleScrollRight() {
    scrollRef.current?.scrollBy({ left: getScrollAmount(), behavior: "smooth" });
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    let snapRestoreTimer: ReturnType<typeof setTimeout> | undefined;
    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) {
        return;
      }
      if (
        (event.deltaY > 0 && el.scrollLeft >= maxScroll - 1) ||
        (event.deltaY < 0 && el.scrollLeft <= 0)
      ) {
        return;
      }
      event.preventDefault();
      el.style.scrollSnapType = "none";
      el.scrollBy({ left: event.deltaY, behavior: "instant" });
      if (snapRestoreTimer) {
        clearTimeout(snapRestoreTimer);
      }
      snapRestoreTimer = setTimeout(() => {
        el.style.scrollSnapType = "";
      }, 160);
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      if (snapRestoreTimer) {
        clearTimeout(snapRestoreTimer);
      }
      el.removeEventListener("wheel", handleWheel);
    };
  }, []);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      moved: false,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (drag.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - drag.lastX;
    if (!drag.moved && Math.abs(event.clientX - drag.startX) > 5) {
      drag.moved = true;
      if (scrollRef.current) {
        scrollRef.current.style.scrollSnapType = "none";
      }
    }
    if (drag.moved) {
      scrollRef.current?.scrollBy({ left: -dx, behavior: "instant" });
    }
    drag.lastX = event.clientX;
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragState.current.pointerId !== event.pointerId) {
      return;
    }
    dragState.current.pointerId = -1;
    if (scrollRef.current) {
      scrollRef.current.style.scrollSnapType = "";
    }
  }

  function handleTrackClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!dragState.current.moved) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    dragState.current.moved = false;
  }

  return (
    <div
      className="p-1 sm:p-2"
      style={
        {
          "--inspiration-image-height": "10rem",
          "--inspiration-card-height": "15.5rem",
          "--inspiration-panel-height": "calc(var(--inspiration-card-height) + 1.5rem)",
        } as CSSProperties
      }
    >
      <div className="grid items-stretch gap-3 lg:min-h-[var(--inspiration-panel-height)] lg:grid-cols-[10.5rem_minmax(0,1fr)] lg:gap-4">
        <div
          role="tablist"
          aria-label="灵感分类"
          className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {INSPIRATION_CATEGORY_CONFIG.map((category) => {
            const active = category.key === activeKey;
            const count = selection[category.key]?.length ?? 0;
            return (
              <button
                key={category.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveKey(category.key)}
                className={`inspiration-index-tab lg:w-full ${
                  active ? "inspiration-index-tab--active" : ""
                }`}
              >
                <span>{category.title}</span>
                {count > 0 ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      active
                        ? "bg-[rgba(255,253,247,0.22)] text-[var(--paper-bright)]"
                        : "bg-[rgba(83,107,82,0.12)] text-[var(--sage-deep)]"
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          aria-label={`${activeCategory.title}灵感`}
          className="flex min-w-0 flex-col"
        >
          <div className="relative">
            <div
              ref={scrollRef}
              onScroll={updateScrollHint}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onClickCapture={handleTrackClickCapture}
              className="flex cursor-grab select-none items-stretch gap-4 overflow-x-auto px-1 py-2 scroll-smooth snap-x snap-proximity [-webkit-overflow-scrolling:touch] [scroll-padding-left:0.25rem] [scroll-padding-right:0.25rem] [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
            >
            {activeCategory.options.map((option) => {
              const asset = getInspirationCardAsset(activeKey, option.label);
              const active = (selection[activeKey] ?? []).includes(option.label);
              const blurb = OPTION_BLURBS[activeKey][option.label] ?? "";
              const ribbonText = getRibbonText(option);
              return (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={active}
                  data-inspiration-card=""
                  onClick={() => onToggle(activeKey, option.label)}
                  className={`group relative flex h-[var(--inspiration-card-height)] w-[10.75rem] shrink-0 snap-start flex-col overflow-hidden rounded-[10px] border bg-[var(--paper-bright)] text-left shadow-[0_4px_12px_rgba(83,70,51,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_18px_rgba(83,70,51,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sage-deep)] sm:w-[11.75rem] ${
                    active
                      ? "-translate-y-0.5 border-[rgba(160,124,74,0.5)] shadow-[0_8px_18px_rgba(160,124,74,0.16)] ring-2 ring-[rgba(201,170,120,0.35)]"
                      : "border-[rgba(214,205,187,0.72)]"
                  }`}
                >
                  <div className="relative h-[var(--inspiration-image-height)] shrink-0 overflow-hidden">
                    {asset ? (
                      <Image
                        src={asset.image}
                        alt=""
                        fill
                        draggable={false}
                        sizes="(min-width: 640px) 11.75rem, 10.75rem"
                        className="object-cover saturate-[0.82] sepia-[0.1] transition-[filter,transform] duration-200 group-hover:scale-[1.03] group-hover:saturate-[0.95] group-hover:sepia-[0.04]"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,236,205,0.14)_0%,rgba(255,253,247,0)_46%,rgba(94,66,40,0.14)_100%)]" />
                    <span
                      className={`absolute left-1.5 top-1/2 -translate-y-1/2 rounded-[6px] px-[5px] py-2 font-semibold leading-none [text-orientation:upright] [writing-mode:vertical-rl] shadow-[0_2px_6px_rgba(76,35,28,0.22)] transition-colors duration-200 ${
                        ribbonText.length >= 3
                          ? "text-[9px] tracking-[0.08em]"
                          : "text-[10px] tracking-[0.14em]"
                      } ${
                        active
                          ? "bg-[#96402f] text-[#fff3e8]"
                          : "bg-[rgba(140,74,64,0.52)] text-[rgba(255,243,232,0.9)] group-hover:bg-[rgba(150,80,68,0.72)]"
                      }`}
                      style={{ fontFamily: STAMP_FONT_FAMILY }}
                    >
                      {ribbonText}
                    </span>
                    {active ? (
                      <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full border border-[rgba(160,124,74,0.5)] bg-[rgba(255,250,240,0.92)] px-1.5 py-0.5 text-[9px] font-semibold text-[#7a6244] shadow-[0_4px_10px_rgba(122,98,68,0.18)]">
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                          <path
                            d="M1.5 5.2 4 7.6 8.5 2.6"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        已选
                      </span>
                    ) : null}
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2.5">
                    <p className="truncate text-[0.82rem] font-semibold leading-5 text-[var(--ink)] transition-colors duration-200 group-hover:text-[rgb(31,42,32)]">
                      {option.label}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--ink-muted)]">
                      {blurb}
                    </p>
                  </div>
                </button>
              );
            })}
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-[linear-gradient(270deg,rgba(248,242,230,0.85)_0%,rgba(248,242,230,0)_100%)]"
            />
            {hasOverflow ? (
              <>
                <button
                  type="button"
                  onClick={handleScrollLeft}
                  disabled={!scrollHint.canLeft}
                  aria-label="查看前面的灵感"
                  className="absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(160,124,74,0.45)] bg-[rgba(255,253,247,0.72)] text-[#7a6244] shadow-[0_6px_14px_rgba(83,70,51,0.12)] backdrop-blur-[2px] transition-all duration-200 hover:-translate-x-0.5 hover:bg-[rgba(255,253,247,0.94)] hover:text-[#5d4a33] disabled:pointer-events-none disabled:opacity-35"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M10 3.5 5.5 8 10 12.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleScrollRight}
                  disabled={!scrollHint.canRight}
                  aria-label="查看更多灵感"
                  className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(160,124,74,0.45)] bg-[rgba(255,253,247,0.72)] text-[#7a6244] shadow-[0_6px_14px_rgba(83,70,51,0.12)] backdrop-blur-[2px] transition-all duration-200 hover:translate-x-0.5 hover:bg-[rgba(255,253,247,0.94)] hover:text-[#5d4a33] disabled:pointer-events-none disabled:opacity-35"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M6 3.5 10.5 8 6 12.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </>
            ) : null}
          </div>

          {hasOverflow ? (
            <div
              aria-hidden="true"
              className="relative mt-1.5 h-[3px] rounded-full bg-[rgba(201,170,120,0.2)]"
            >
              <div
                className="absolute inset-y-0 rounded-full bg-[rgba(146,114,70,0.45)]"
                style={{
                  left: `${scrollHint.thumbLeft * 100}%`,
                  width: `${scrollHint.thumbWidth * 100}%`,
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
      <div className="absolute inset-0">
        <Image
          src="/images/landing/hero/hero-main-china-v18.png"
          alt="中国旅行档案风格的首页背景"
          fill
          priority
          className="object-cover object-[72%_center]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(243,238,223,0.995)_0%,rgba(243,238,223,0.96)_16%,rgba(243,238,223,0.84)_31%,rgba(243,238,223,0.42)_47%,rgba(243,238,223,0.12)_62%,rgba(243,238,223,0.02)_78%,rgba(243,238,223,0)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,253,247,0.05)_0%,rgba(255,253,247,0)_42%,rgba(37,40,35,0.06)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(243,238,223,0.9)_0%,rgba(243,238,223,0.82)_52%,rgba(243,238,223,0.58)_100%)] lg:hidden" />
        <div className="absolute left-0 top-0 h-full w-[58%] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_46%)]" />
      </div>

      <div className="absolute left-4 top-5 z-20 w-[9.5rem] sm:left-8 sm:top-6 sm:w-[11.5rem] xl:left-12">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG brand mark triggers a Next/Image aspect-ratio warning here. */}
        <img
          src="/images/brand/logo/logo-horizontal-transparent.svg"
          alt="Wanderly"
          className="block h-auto w-full"
        />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[120rem] flex-col px-4 pb-10 pt-28 sm:px-8 sm:pb-12 sm:pt-32 xl:px-12 xl:pt-36">
        <section className="grid flex-1 items-start pt-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:pt-12">
          <div className="flex max-w-[35rem] flex-col self-stretch pb-10 lg:pb-0">
            <h1
              className="leading-[1.2] tracking-[-0.02em] text-[rgb(47_60_50)]"
              style={{ fontFamily: "var(--font-serif-display)", fontWeight: 600 }}
            >
              <span className="block text-[2.7rem] sm:text-[3.45rem] xl:text-[4.05rem]">
                发现下一段
              </span>
              <span className="mt-2 block text-[2.15rem] sm:mt-3 sm:text-[2.75rem] xl:text-[3.25rem]">
                值得收藏的旅程
              </span>
            </h1>

            <p
              className="mt-8 max-w-[30rem] text-[1.25rem] leading-[1.8] text-[rgba(50,58,48,0.86)] sm:mt-9 sm:text-[1.375rem]"
              style={{ fontFamily: "var(--font-sans-body)" }}
            >
              从灵感到路线，
              <br />
              让每一次出发都成为旅行档案。
            </p>

            <div className="mt-10 sm:mt-12">
              <Link
                href="/explore"
                className="group relative inline-flex w-[85%] max-w-[22.5rem] items-center justify-center transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sage-deep)] sm:w-[21rem] xl:w-[22rem]"
              >
                <Image
                  src="/images/landing/cta-start-journey-bg.png"
                  alt=""
                  width={2005}
                  height={436}
                  priority
                  sizes="(min-width: 1280px) 22rem, (min-width: 640px) 21rem, 85vw"
                  className="h-auto w-full [filter:drop-shadow(0_0_1px_rgba(43,66,47,0.5))_drop-shadow(0_12px_26px_rgba(52,76,54,0.18))] transition-[filter] duration-200 group-hover:[filter:drop-shadow(0_0_1px_rgba(43,66,47,0.68))_drop-shadow(0_18px_34px_rgba(52,76,54,0.26))_brightness(1.03)]"
                />
                <span
                  className="absolute inset-0 flex items-center justify-center pl-[0.2em] text-[1.5rem] font-bold tracking-[0.2em] text-[rgb(47_60_50)] sm:text-[1.625rem]"
                  style={{ fontFamily: "var(--font-sans-body)" }}
                >
                  开启旅程
                </span>
              </Link>
            </div>

            <div className="mt-auto pt-12 sm:pt-14">
              <p
                className="inline-flex items-center rounded-full border border-[rgba(83,107,82,0.26)] bg-[rgba(255,253,247,0.5)] px-4 py-1.5 text-[0.8125rem] tracking-[0.12em] text-[rgba(47,60,50,0.62)] sm:text-[0.875rem]"
                style={{ fontFamily: "var(--font-sans-body)" }}
              >
                地图探索 · 智能规划 · 旅行档案
              </p>
            </div>
          </div>

          <div aria-hidden="true" className="hidden lg:block" />
        </section>
      </main>
    </div>
  );
}

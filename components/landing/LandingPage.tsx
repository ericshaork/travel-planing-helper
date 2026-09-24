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

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[120rem] flex-col px-4 pb-10 pt-24 sm:px-8 sm:pb-12 sm:pt-28 xl:px-12">
        <section className="grid flex-1 items-start pt-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:pt-10">
          <div className="max-w-[32rem] pb-6 lg:pb-0">
            <h1
              className="text-[2.35rem] font-semibold leading-[1.08] tracking-[-0.04em] text-[rgb(47_60_50)] sm:text-[3rem] xl:text-[3.74rem]"
              style={{ fontFamily: "var(--font-serif-display)", fontWeight: 600 }}
            >
              <span className="block">发现下一段旅程</span>
            </h1>

            <p className="mt-5 max-w-[31rem] text-base leading-8 text-[rgba(62,66,58,0.88)] sm:text-lg sm:leading-9">
              从灵感到路线，
              <br />
              让每一次出发都成为值得收藏的旅行档案。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                href="/explore"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[rgba(83,107,82,0.88)] bg-[var(--sage-deep)] px-6 py-3 text-sm font-semibold tracking-[0.04em] text-[var(--paper-bright)] shadow-[0_18px_34px_rgba(52,76,54,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[rgb(72_94_71)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper-bright)] sm:min-h-14 sm:px-7 sm:text-base"
              >
                开始探索
              </Link>
            </div>
          </div>

          <div aria-hidden="true" className="hidden lg:block" />
        </section>
      </main>
    </div>
  );
}

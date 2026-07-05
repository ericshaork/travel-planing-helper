import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { NaturalLanguageInput } from "@/components/trip/NaturalLanguageInput";

export default function HomePage() {
  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-3 pt-2 sm:px-8 sm:pb-16 sm:pt-14">
        <section className="grid flex-1 items-start gap-4 lg:grid-cols-[minmax(0,0.82fr)_minmax(34rem,1.18fr)] lg:gap-14">
          <div className="min-w-0 max-w-xl pt-0.5 lg:pt-10">
            <p className="inline-flex -rotate-1 border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-[var(--sage-deep)] sm:px-3 sm:text-xs sm:tracking-[0.16em]">
              先做一份能走的草稿
            </p>

            <h1 className="mt-3 text-3xl font-semibold leading-[1.12] tracking-[-0.045em] sm:mt-6 sm:text-6xl">
              别查到凌晨了，
              <span className="mt-1 block text-[var(--clay)]">先排一版。</span>
            </h1>

            <p className="mt-2.5 max-w-lg text-sm leading-6 text-[var(--ink-muted)] sm:mt-6 sm:text-lg sm:leading-8">
              把出发地、想去的城市和大概预算写下来。路线、天气和花费，后面一步步补，不用一次想全。
            </p>

            <div className="mt-3 rounded-sm border-l-2 border-[var(--sand-deep)] bg-[var(--paper-bright)] px-3 py-2 text-xs leading-5 text-[var(--ink-muted)] sm:hidden">
              打开就先写一句，输入框和“先排一版”按钮都在首屏。
            </div>

            <div className="mt-9 hidden border-l-2 border-[var(--sand-deep)] pl-4 text-sm leading-7 text-[var(--ink-muted)] lg:block">
              <p className="font-semibold text-[var(--ink)]">会先帮你做什么？</p>
              <p>
                认出城市、天数、预算和偏好，再告诉你还缺什么。这里不会假装知道实时票价。
              </p>
            </div>
          </div>

          <NaturalLanguageInput />
        </section>
      </main>

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}

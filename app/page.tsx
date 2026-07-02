import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { NaturalLanguageInput } from "@/components/trip/NaturalLanguageInput";

export default function HomePage() {
  return (
    <div className="paper-texture min-h-screen overflow-x-clip text-[var(--ink)]">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pt-14">
        <section className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(34rem,1.18fr)] lg:gap-14">
          <div className="min-w-0 max-w-xl pt-2 lg:pt-10">
            <p className="inline-flex -rotate-1 border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-3 py-1 text-xs font-semibold tracking-[0.16em] text-[var(--sage-deep)]">
              先做一份能走的草稿
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.12] tracking-[-0.045em] sm:text-6xl">
              别查到凌晨了，
              <span className="mt-1 block text-[var(--clay)]">先排一版。</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-[var(--ink-muted)] sm:text-lg">
              把出发地、想去的城市和大概预算写下来。路线、天气和花费，
              后面一项项补，不用一次想全。
            </p>

            <div className="mt-9 border-l-2 border-[var(--sand-deep)] pl-4 text-sm leading-7 text-[var(--ink-muted)]">
              <p className="font-semibold text-[var(--ink)]">会先帮你做什么？</p>
              <p>
                认出城市、天数、预算和偏好，再告诉你还缺什么。这里不会假装知道实时票价。
              </p>
            </div>
          </div>

          <NaturalLanguageInput />
        </section>
      </main>

      <Footer />
    </div>
  );
}
